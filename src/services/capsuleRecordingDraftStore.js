import { prepareCapsuleMediaFiles } from "./capsuleMedia";
import {
  createTimeCapsuleDraft,
  normalizeCapsuleMediaReference,
  readTimeCapsuleDraft,
  readTimeCapsules,
  timeCapsuleDraftMedia,
  writeTimeCapsuleDraft,
} from "./timeCapsule";

// A stopped take uses the existing draft and media store. The only session-only
// state is a retryable File when either part of the durable save has failed.
export function createCapsuleRecordingDraftStore({
  storage, ensureDatabase, prepareStorage, getMedia, putMedia, deleteMedia, createId,
  onDraftChange = () => {}, onRetryTakeChange = () => {}, onEvict = () => {},
}) {
  const fileIds = new WeakMap();
  const pendingFiles = new WeakMap();
  const stagedIds = new Set();
  let queue = Promise.resolve();
  let retryTake = null;
  let generation = 0;
  let restoring = false;

  function serialized(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  function currentDraft(expectedDraftId, expectedGeneration, rollbackCapsuleId = null) {
    // Only rollback inside an existing queued operation may finish while restore
    // awaits that queue. Backup replacement has not started during this drain.
    const drainingRollback = restoring && rollbackCapsuleId !== null;
    if (restoring && !drainingRollback) throw new Error("Trace is restoring a backup. Wait for the restore to finish before recording.");
    if (expectedGeneration !== generation && !drainingRollback) throw new Error("This recording operation was canceled because the draft changed.");
    const report = readTimeCapsuleDraft(storage);
    if (report.status !== "ok") throw new Error(report.message);
    if (!report.draft || report.draft.id !== expectedDraftId ||
      (rollbackCapsuleId !== null && report.draft.capsuleId !== rollbackCapsuleId)) {
      throw new Error("This recording belongs to a draft that has changed. Return to that draft before retrying.");
    }
    const capsules = readTimeCapsules(storage);
    if (capsules.status !== "ok") throw new Error(capsules.message);
    if (capsules.records.some(({ id }) => id === report.draft.capsuleId)) {
      throw new Error("This Time Capsule is already sealed. The recording was not added.");
    }
    return report.draft;
  }

  function updateDraft(draft, changes) {
    const updated = createTimeCapsuleDraft({ ...draft, ...changes });
    if (!updated) throw new Error("This recording exceeds the capsule attachment limits or is invalid.");
    const saved = writeTimeCapsuleDraft(storage, updated);
    onDraftChange(saved);
    return saved;
  }

  function setRetry(value) {
    retryTake = value;
    onRetryTakeChange(value);
  }

  function clearRetry(id) {
    if (!id || retryTake?.id === id) setRetry(null);
  }

  function owned(record, draft) {
    return record?.capsuleId === draft.capsuleId && record?.capsuleDraftId === draft.id;
  }

  function references() {
    const draftReport = readTimeCapsuleDraft(storage);
    const capsules = readTimeCapsules(storage);
    if (draftReport.status !== "ok" || capsules.status !== "ok") return null;
    return new Set([
      ...timeCapsuleDraftMedia(draftReport.draft).map(({ id }) => id),
      ...capsules.records.flatMap(({ media }) => media.map(({ id }) => id)),
    ]);
  }

  async function removeUnreferenced(database, id, originalDraft) {
    const record = await getMedia(database, id);
    const referenced = references();
    if (record && owned(record, originalDraft) && referenced && !referenced.has(id)) {
      await deleteMedia(database, [id]);
      onEvict(id);
      stagedIds.delete(id);
    }
    if (!record || referenced?.has(id)) stagedIds.delete(id);
  }

  function persistTake(file, { durationMs, stopReason } = {}, expectedDraftId, expectedGeneration = generation) {
    if (!(file instanceof Blob)) return Promise.reject(new Error("This recording has no usable audio to save."));
    let initial;
    try {
      initial = currentDraft(expectedDraftId, expectedGeneration);
      if (!file.size || !Number.isFinite(durationMs) || durationMs <= 0) throw new Error("This recording has no usable audio to save.");
    } catch (error) { return Promise.reject(error); }
    const inFlight = pendingFiles.get(file);
    if (inFlight) return inFlight;
    const knownId = fileIds.get(file);
    const id = knownId || createId();
    if (!knownId && timeCapsuleDraftMedia(initial).some((item) => item.id === id)) {
      return Promise.reject(new Error("Trace could not assign a new recording identity. Existing media was left unchanged."));
    }
    fileIds.set(file, id);
    if (initial.pendingRecording && initial.pendingRecording.id !== id) {
      return Promise.reject(new Error("Keep or discard the existing recording before saving another take."));
    }
    if (retryTake && retryTake.id !== id) {
      return Promise.reject(new Error("Keep or discard the existing unsaved recording before saving another take."));
    }
    setRetry({ draftId: expectedDraftId, id, file, durationMs, stopReason });
    const result = serialized(async () => {
      const draft = currentDraft(expectedDraftId, expectedGeneration);
      if (draft.pendingRecording?.id === id) {
        clearRetry(id);
        return { pendingRecording: draft.pendingRecording };
      }
      if (draft.media.some((item) => item.id === id)) {
        clearRetry(id);
        return { pendingRecording: null, media: draft.media, ok: true };
      }
      if (draft.pendingRecording) throw new Error("Keep or discard the existing recording before saving another take.");
      const [prepared] = await prepareCapsuleMediaFiles([file], draft.media, {
        probe: async () => ({ durationMs }),
      });
      if (prepared.kind !== "audio") throw new Error("This recording format is not supported as audio.");
      const reference = normalizeCapsuleMediaReference({ ...prepared, id });
      currentDraft(expectedDraftId, expectedGeneration);
      await prepareStorage(file.size);
      currentDraft(expectedDraftId, expectedGeneration);
      const database = await ensureDatabase();
      currentDraft(expectedDraftId, expectedGeneration);
      const previous = await getMedia(database, id);
      const capsules = readTimeCapsules(storage);
      if (capsules.status !== "ok" || capsules.records.some(({ media }) => media.some((item) => item.id === id)) ||
        (previous && (!knownId || !owned(previous, draft)))) {
        throw new Error("Trace could not verify ownership of this recording. Existing media was left unchanged.");
      }
      // Recheck after storage/permission awaits, before writing a new blob.
      const beforeWrite = currentDraft(expectedDraftId, expectedGeneration);
      if (beforeWrite.pendingRecording && beforeWrite.pendingRecording.id !== id) {
        throw new Error("Another recording is awaiting review. Keep or discard it first.");
      }
      const record = {
        ...reference, capsuleId: draft.capsuleId, capsuleDraftId: draft.id, blob: file,
      };
      await putMedia(database, [record]);
      stagedIds.add(id);
      try {
        const latest = currentDraft(expectedDraftId, expectedGeneration);
        if (latest.pendingRecording && latest.pendingRecording.id !== id) {
          throw new Error("Another recording is awaiting review. Keep or discard it first.");
        }
        updateDraft(latest, { pendingRecording: reference });
      } catch (error) {
        await removeUnreferenced(database, id, draft).catch(() => {});
        throw error;
      }
      stagedIds.delete(id);
      clearRetry(id);
      return { pendingRecording: reference };
    });
    pendingFiles.set(file, result);
    result.then(() => pendingFiles.delete(file), () => pendingFiles.delete(file));
    return result;
  }

  function keepTake(pendingId, expectedDraftId) {
    const expectedGeneration = generation;
    return serialized(async () => {
      let draft = currentDraft(expectedDraftId, expectedGeneration);
      if (!draft.pendingRecording && draft.media.some(({ id }) => id === pendingId)) {
        clearRetry(pendingId);
        return { ok: true, media: draft.media };
      }
      if (!pendingId || draft.pendingRecording?.id !== pendingId) {
        throw new Error("This recording has changed. Review the current take before keeping it.");
      }
      const database = await ensureDatabase();
      const record = await getMedia(database, pendingId);
      if (!record?.blob || !owned(record, draft)) throw new Error("The pending recording is unavailable. Discard it and record again.");
      draft = currentDraft(expectedDraftId, expectedGeneration);
      if (draft.pendingRecording?.id !== pendingId) throw new Error("This recording changed before it could be kept.");
      const saved = updateDraft(draft, { media: [...draft.media, draft.pendingRecording], pendingRecording: null });
      clearRetry(pendingId);
      return { ok: true, media: saved.media };
    });
  }

  function discardTake(pendingId, expectedDraftId) {
    const expectedGeneration = generation;
    return serialized(async () => {
      let draft = currentDraft(expectedDraftId, expectedGeneration);
      if (!draft.pendingRecording) {
        if (retryTake && retryTake.draftId === expectedDraftId && (!pendingId || retryTake.id === pendingId)) {
          if (stagedIds.has(retryTake.id)) {
            const database = await ensureDatabase();
            currentDraft(expectedDraftId, expectedGeneration);
            await removeUnreferenced(database, retryTake.id, draft);
          }
          clearRetry(pendingId);
        }
        return { ok: true };
      }
      if (draft.pendingRecording.id !== pendingId) throw new Error("This recording changed. Review the current take before discarding it.");
      const pending = draft.pendingRecording;
      const database = await ensureDatabase();
      const record = await getMedia(database, pending.id);
      draft = currentDraft(expectedDraftId, expectedGeneration);
      if (draft.pendingRecording?.id !== pending.id) throw new Error("This recording changed before it could be discarded.");
      // Drop only this draft reference; a shared/retained blob remains owned by
      // its other reference. A failed deletion restores the take for retry.
      updateDraft(draft, { pendingRecording: null });
      try {
        if (record && owned(record, draft)) await removeUnreferenced(database, pending.id, draft);
      } catch (error) {
        try {
          const latest = currentDraft(expectedDraftId, expectedGeneration, draft.capsuleId);
          if (latest.pendingRecording && latest.pendingRecording.id !== pending.id) {
            throw new Error("Another recording is now awaiting review.");
          }
          if (!latest.pendingRecording && !latest.media.some(({ id }) => id === pending.id)) {
            updateDraft(latest, { pendingRecording: pending });
          }
        } catch (rollbackError) {
          throw new Error("Trace could not finish discarding this recording or restore its draft reference. Reload before retrying.");
        }
        throw new Error("Trace could not discard the recording. It is still in your draft; try again.");
      }
      clearRetry(pending.id);
      return { ok: true };
    });
  }

  return {
    persistTake, keepTake, discardTake,
    createTakeWriter(expectedDraftId) {
      const expectedGeneration = generation;
      return (file, metadata) => persistTake(file, metadata, expectedDraftId, expectedGeneration);
    },
    prepareForRestore() {
      restoring = true;
      generation += 1;
      // Drain already-submitted media transactions and their cleanup before the
      // backup snapshots or replaces IndexedDB. Retain retry audio on failure.
      return queue;
    },
    finishRestore() { restoring = false; },
    clearSessionTake() { generation += 1; clearRetry(); return queue; },
  };
}
