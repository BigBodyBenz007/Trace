import { createCapsuleRecordingDraftStore } from "./capsuleRecordingDraftStore";
import { createTimeCapsuleDraft } from "./timeCapsule";

const pending = { id: "take-1", kind: "audio", name: "Recording.m4a", mimeType: "audio/mp4", bytes: 5, durationMs: 1000 };
const makeDraft = (changes = {}) => createTimeCapsuleDraft({
  id: "draft-1", capsuleId: "capsule-1", form: { name: "Future me", text: "Keep my words", openOn: "2030-09-12" },
  media: [], ...changes,
});
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

function setup(initialDraft = makeDraft(), initialRecords = []) {
  const values = new Map([["timeCapsuleDraft", JSON.stringify(initialDraft)]]);
  const records = new Map(initialRecords.map((record) => [record.id, record]));
  const storage = {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, value)),
  };
  const dependencies = {
    storage, ensureDatabase: jest.fn(async () => records), prepareStorage: jest.fn(async () => {}),
    getMedia: jest.fn(async (database, id) => records.get(id)),
    putMedia: jest.fn(async (database, media) => media.forEach((record) => records.set(record.id, record))),
    deleteMedia: jest.fn(async (database, ids) => ids.forEach((id) => records.delete(id))),
    createId: jest.fn(() => "take-1"), onDraftChange: jest.fn(), onRetryTakeChange: jest.fn(), onEvict: jest.fn(),
  };
  return {
    ...dependencies, values, records, store: createCapsuleRecordingDraftStore(dependencies),
    draft: () => JSON.parse(values.get("timeCapsuleDraft")),
  };
}

const file = () => new File(["audio"], "Recording.m4a", { type: "audio/mp4" });
const ownedRecord = (reference = pending, changes = {}) => ({
  ...reference, capsuleId: "capsule-1", capsuleDraftId: "draft-1", blob: file(), ...changes,
});

test("durably stages once, merges latest text, restores review, and promotes without copying the blob", async () => {
  const context = setup();
  const gate = deferred();
  context.prepareStorage.mockImplementationOnce(() => gate.promise);
  const audio = file();
  const saving = context.store.persistTake(audio, { durationMs: 1000 }, "draft-1");
  expect(context.store.persistTake(audio, { durationMs: 1000 }, "draft-1")).toBe(saving);
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(expect.objectContaining({ file: audio, id: "take-1" }));
  context.values.set("timeCapsuleDraft", JSON.stringify(makeDraft({ form: { name: "Edited", text: "New words", openOn: "2030-09-12" } })));
  gate.resolve();
  await expect(saving).resolves.toEqual({ pendingRecording: pending });
  expect(context.draft()).toMatchObject({ form: { text: "New words" }, media: [], pendingRecording: pending });
  expect(context.putMedia).toHaveBeenCalledTimes(1);
  const originalBlob = context.records.get("take-1").blob;
  const restored = createCapsuleRecordingDraftStore(context);
  await expect(restored.keepTake("take-1", "draft-1")).resolves.toEqual({ ok: true, media: [pending] });
  await expect(restored.keepTake("take-1", "draft-1")).resolves.toEqual({ ok: true, media: [pending] });
  expect(context.records.get("take-1").blob).toBe(originalBlob);
  expect(context.putMedia).toHaveBeenCalledTimes(1);
  expect(context.draft()).not.toHaveProperty("pendingRecording");
});

test("failed draft persistence cleans up its new blob and retries with the same ID and preserved draft", async () => {
  const prior = { ...pending, id: "older-take" };
  const context = setup(makeDraft({ media: [prior] }), [ownedRecord(prior)]);
  const original = context.draft();
  context.storage.setItem.mockImplementationOnce(() => { throw new Error("quota full"); });
  const audio = file();
  await expect(context.store.persistTake(audio, { durationMs: 1000 }, "draft-1")).rejects.toThrow("quota full");
  expect(context.draft()).toEqual(original);
  expect([...context.records.keys()]).toEqual(["older-take"]);
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(expect.objectContaining({ file: audio }));
  await expect(context.store.persistTake(audio, { durationMs: 1000 }, "draft-1")).resolves.toEqual({ pendingRecording: pending });
  expect(context.createId).toHaveBeenCalledTimes(1);
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(null);
});

test("quota and media write failures retain a retryable file without changing saved draft", async () => {
  const context = setup();
  const before = context.draft();
  const audio = file();
  context.prepareStorage.mockRejectedValueOnce(new Error("insufficient storage"));
  await expect(context.store.persistTake(audio, { durationMs: 1000 }, "draft-1")).rejects.toThrow("insufficient storage");
  expect(context.putMedia).not.toHaveBeenCalled();
  context.putMedia.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(context.store.persistTake(audio, { durationMs: 1000 }, "draft-1")).rejects.toThrow("database unavailable");
  expect(context.draft()).toEqual(before);
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(expect.objectContaining({ file: audio }));
  context.ensureDatabase.mockRejectedValueOnce(new Error("database still unavailable"));
  await expect(context.store.discardTake(null, "draft-1")).resolves.toEqual({ ok: true });
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(null);
});

test("attachment limits reject recording persistence without modifying existing media", async () => {
  const media = [1, 2, 3].map((index) => ({ ...pending, id: `audio-${index}` }));
  const context = setup(makeDraft({ media }));
  await expect(context.store.persistTake(file(), { durationMs: 1000 }, "draft-1")).rejects.toThrow(/up to 3 audio/i);
  expect(context.draft().media).toEqual(media);
  expect(context.putMedia).not.toHaveBeenCalled();
});

test("different pending takes, invalid completed audio, and foreign-owned IDs are never overwritten", async () => {
  const context = setup(makeDraft({ pendingRecording: { ...pending, id: "existing-take" } }));
  await expect(context.store.persistTake(file(), { durationMs: 1000 }, "draft-1")).rejects.toThrow(/existing recording/i);
  await expect(context.store.persistTake(file(), { durationMs: 0 }, "draft-1")).rejects.toThrow(/usable audio/i);
  await expect(context.store.persistTake(new File([], "Empty.m4a", { type: "audio/mp4" }), { durationMs: 1000 }, "draft-1")).rejects.toThrow(/usable audio/i);
  const foreign = setup(makeDraft(), [ownedRecord(pending, { capsuleId: "other-capsule", capsuleDraftId: undefined })]);
  await expect(foreign.store.persistTake(file(), { durationMs: 1000 }, "draft-1")).rejects.toThrow(/ownership/i);
  expect(foreign.putMedia).not.toHaveBeenCalled();
  expect(foreign.deleteMedia).not.toHaveBeenCalled();
});

test("discard removes owned pending media once and rolls back a failed deletion without losing text", async () => {
  const context = setup(makeDraft({ pendingRecording: pending }), [ownedRecord()]);
  context.deleteMedia.mockRejectedValueOnce(new Error("busy"));
  await expect(context.store.discardTake("take-1", "draft-1")).rejects.toThrow(/still in your draft/i);
  expect(context.draft()).toMatchObject({ form: { text: "Keep my words" }, pendingRecording: pending });
  expect(context.records.has("take-1")).toBe(true);
  await expect(context.store.discardTake("take-1", "draft-1")).resolves.toEqual({ ok: true });
  await expect(context.store.discardTake("take-1", "draft-1")).resolves.toEqual({ ok: true });
  expect(context.draft()).not.toHaveProperty("pendingRecording");
  expect(context.records.has("take-1")).toBe(false);
  expect(context.onEvict).toHaveBeenCalledTimes(1);
});

test("discard never deletes a retained or foreign-owned blob", async () => {
  const context = setup(makeDraft({ pendingRecording: pending }), [ownedRecord(pending, { capsuleId: "other-capsule", capsuleDraftId: undefined })]);
  context.values.set("timeCapsules", JSON.stringify([{
    schemaVersion: 1, id: "other-capsule", name: "Retained", text: "Message", openOn: "2030-09-12", media: [pending],
    createdAt: "2026-09-12T12:00:00.000Z", updatedAt: "2026-09-12T12:00:00.000Z", sealedAt: "2026-09-12T12:00:00.000Z", openedAt: null,
  }]));
  await expect(context.store.discardTake("take-1", "draft-1")).resolves.toEqual({ ok: true });
  expect(context.records.has("take-1")).toBe(true);
  expect(context.deleteMedia).not.toHaveBeenCalled();
  expect(context.onEvict).not.toHaveBeenCalled();
});

test("clearing a session cancels stale work even when a restored draft has the same ID", async () => {
  const context = setup();
  const gate = deferred();
  context.prepareStorage.mockImplementationOnce(() => gate.promise);
  const saving = context.store.persistTake(file(), { durationMs: 1000 }, "draft-1");
  // Let validation reach the asynchronous quota check.
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  context.store.clearSessionTake();
  context.values.set("timeCapsuleDraft", JSON.stringify(makeDraft({ form: { name: "Restored", text: "Restored words", openOn: "2031-01-01" } })));
  gate.resolve();
  await expect(saving).rejects.toThrow(/canceled/i);
  expect(context.draft()).toMatchObject({ form: { text: "Restored words" }, media: [] });
  expect(context.putMedia).not.toHaveBeenCalled();
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(null);
});

test("a take is not marked durable before IDB completes, and a replaced draft rejects the late result", async () => {
  const context = setup();
  const writing = deferred();
  const entered = deferred();
  context.putMedia.mockImplementationOnce(async (database, records) => {
    entered.resolve();
    await writing.promise;
    records.forEach((record) => context.records.set(record.id, record));
  });
  const saving = context.store.persistTake(file(), { durationMs: 1000 }, "draft-1");
  await entered.promise;
  expect(context.draft()).not.toHaveProperty("pendingRecording");
  expect(context.onDraftChange).not.toHaveBeenCalled();
  context.values.set("timeCapsuleDraft", JSON.stringify(makeDraft({ id: "replacement-draft" })));
  writing.resolve();
  await expect(saving).rejects.toThrow(/draft that has changed/i);
  expect(context.draft().id).toBe("replacement-draft");
  expect(context.records.size).toBe(0);
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(expect.objectContaining({ draftId: "draft-1" }));
});

test("failed Keep or Discard metadata writes preserve the pending blob and original draft", async () => {
  const context = setup(makeDraft({ pendingRecording: pending }), [ownedRecord()]);
  const original = context.draft();
  context.storage.setItem.mockImplementationOnce(() => { throw new Error("storage full"); });
  await expect(context.store.keepTake("take-1", "draft-1")).rejects.toThrow("storage full");
  context.storage.setItem.mockImplementationOnce(() => { throw new Error("storage full"); });
  await expect(context.store.discardTake("take-1", "draft-1")).rejects.toThrow("storage full");
  expect(context.draft()).toEqual(original);
  expect(context.records.has("take-1")).toBe(true);
  expect(context.putMedia).not.toHaveBeenCalled();
  expect(context.deleteMedia).not.toHaveBeenCalled();
});

test("a new draft ID and malformed storage reject stale saves while preserving source data", async () => {
  const context = setup(makeDraft({ id: "new-draft" }));
  await expect(context.store.persistTake(file(), { durationMs: 1000 }, "draft-1")).rejects.toThrow(/draft that has changed/i);
  context.values.set("timeCapsuleDraft", "{bad-json");
  await expect(context.store.discardTake("take-1", "draft-1")).rejects.toThrow(/original stored data was left unchanged/i);
  expect(context.values.get("timeCapsuleDraft")).toBe("{bad-json");
  expect(context.deleteMedia).not.toHaveBeenCalled();
});

test("a writer captured before restore rejects late decoded audio even when the restored draft has the same ID", async () => {
  const context = setup();
  const oldWriter = context.store.createTakeWriter("draft-1");
  await context.store.prepareForRestore();
  await expect(context.store.createTakeWriter("draft-1")(file(), { durationMs: 1000 })).rejects.toThrow(/restoring a backup/i);
  context.values.set("timeCapsuleDraft", JSON.stringify(makeDraft({
    form: { name: "Restored", text: "Restored message", openOn: "2032-01-01" },
  })));
  context.store.finishRestore();
  await expect(oldWriter(file(), { durationMs: 1000 })).rejects.toThrow(/canceled/i);
  expect(context.draft()).toMatchObject({ form: { text: "Restored message" }, media: [] });
  expect(context.putMedia).not.toHaveBeenCalled();
  expect(context.onRetryTakeChange).not.toHaveBeenCalled();
  await expect(context.store.createTakeWriter("draft-1")(file(), { durationMs: 1000 }))
    .resolves.toEqual({ pendingRecording: pending });
  expect(context.draft().form.text).toBe("Restored message");
});

test("restore preparation drains a submitted media write and cleanup, retaining the retry take if restore fails", async () => {
  const context = setup();
  const entered = deferred();
  const writing = deferred();
  const events = [];
  const audio = file();
  context.putMedia.mockImplementationOnce(async (database, media) => {
    entered.resolve();
    await writing.promise;
    media.forEach((record) => context.records.set(record.id, record));
    events.push("write");
  });
  context.deleteMedia.mockImplementationOnce(async (database, ids) => {
    ids.forEach((id) => context.records.delete(id));
    events.push("cleanup");
  });
  const saving = context.store.createTakeWriter("draft-1")(audio, { durationMs: 1000 });
  await entered.promise;
  const rejected = expect(saving).rejects.toThrow(/restoring a backup/i);
  const drained = context.store.prepareForRestore().then(() => events.push("ready to restore"));
  await Promise.resolve();
  expect(events).toEqual([]);
  writing.resolve();
  await rejected;
  await drained;
  expect(events).toEqual(["write", "cleanup", "ready to restore"]);
  expect(context.records.size).toBe(0);
  expect(context.draft()).not.toHaveProperty("pendingRecording");
  expect(context.onRetryTakeChange).toHaveBeenLastCalledWith(expect.objectContaining({ file: audio }));
  // A failed backup replacement leaves the current draft and retry File usable.
  context.store.finishRestore();
  await expect(context.store.createTakeWriter("draft-1")(audio, { durationMs: 1000 }))
    .resolves.toEqual({ pendingRecording: pending });
  expect(context.createId).toHaveBeenCalledTimes(1);
});

test("a failed pending-take deletion restores its reference before the backup drain finishes", async () => {
  const context = setup(makeDraft({ pendingRecording: pending }), [ownedRecord()]);
  const entered = deferred();
  const deleting = deferred();
  context.deleteMedia.mockImplementationOnce(async () => {
    entered.resolve();
    await deleting.promise;
    throw new Error("media storage busy");
  });
  const discarding = context.store.discardTake(pending.id, "draft-1");
  const rejected = expect(discarding).rejects.toThrow(/still in your draft/i);
  await entered.promise;
  expect(context.draft()).not.toHaveProperty("pendingRecording");
  const drained = context.store.prepareForRestore();
  context.values.set("timeCapsuleDraft", JSON.stringify(makeDraft({
    form: { name: "Edited", text: "Latest words", openOn: "2030-09-12" },
  })));
  deleting.resolve();
  await rejected;
  await drained;
  expect(context.draft()).toMatchObject({ pendingRecording: pending, form: { text: "Latest words" } });
  expect(context.records.get(pending.id)).toMatchObject({ ...pending, capsuleId: "capsule-1", capsuleDraftId: "draft-1" });
  expect(context.records.get(pending.id).blob.size).toBe(pending.bytes);
  expect(context.onEvict).not.toHaveBeenCalled();
  await expect(context.store.keepTake(pending.id, "draft-1")).rejects.toThrow(/restoring a backup/i);
  context.store.finishRestore();
  await expect(context.store.keepTake(pending.id, "draft-1")).resolves.toMatchObject({ ok: true, media: [pending] });
});

test.each([
  ["a different capsule", { capsuleId: "replacement-capsule" }],
  ["a newer pending take", { pendingRecording: { ...pending, id: "newer-take" } }],
])("restore-drain rollback does not overwrite %s", async (label, changes) => {
  const context = setup(makeDraft({ pendingRecording: pending }), [ownedRecord()]);
  const entered = deferred();
  const deleting = deferred();
  context.deleteMedia.mockImplementationOnce(async () => {
    entered.resolve();
    await deleting.promise;
    throw new Error("media storage busy");
  });
  const discarding = context.store.discardTake(pending.id, "draft-1");
  const rejected = expect(discarding).rejects.toThrow(/could not finish discarding/i);
  await entered.promise;
  const drained = context.store.prepareForRestore();
  const replacement = makeDraft(changes);
  context.values.set("timeCapsuleDraft", JSON.stringify(replacement));
  deleting.resolve();
  await rejected;
  await drained;
  expect(context.draft()).toEqual(replacement);
  expect(context.records.has(pending.id)).toBe(true);
  expect(context.onEvict).not.toHaveBeenCalled();
  context.store.finishRestore();
});
