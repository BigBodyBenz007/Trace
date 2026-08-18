export const PHOTO_LOAD_PRIORITY = Object.freeze({
  detail: 0,
  centered: 10,
  nearby: 20,
  visible: 30,
});

export const PHOTO_LOAD_CONCURRENCY = 3;

function normalizedId(value) {
  if (typeof value === "string") return value;
  return value?.id || "";
}

export function createPhotoUrlLoader({
  readPhoto,
  concurrency = PHOTO_LOAD_CONCURRENCY,
  createUrl = (blob) => URL.createObjectURL(blob),
  revokeUrl = (url) => URL.revokeObjectURL(url),
  onCreateUrl = () => {},
  onRevokeUrl = () => {},
  onUnavailable = () => {},
} = {}) {
  const entries = new Map();
  let activeCount = 0;
  let sequence = 0;
  let drainScheduled = false;
  let generation = 0;

  function unavailable(id) {
    return { id, unavailable: true, url: "" };
  }

  function scheduleDrain() {
    if (drainScheduled) return;
    drainScheduled = true;
    Promise.resolve().then(() => {
      drainScheduled = false;
      drain();
    });
  }

  function nextQueuedEntry() {
    return [...entries.values()]
      .filter(({ status }) => status === "queued")
      .sort((first, second) => first.priority - second.priority || first.sequence - second.sequence)[0];
  }

  async function start(entry) {
    entry.status = "loading";
    activeCount += 1;
    const startedGeneration = generation;

    try {
      const photo = await readPhoto(entry.id);
      if (entry.cancelled || startedGeneration !== generation || !photo?.blob) {
        if (!entry.cancelled && startedGeneration === generation) onUnavailable(entry.id);
        entry.status = "unavailable";
        entry.result = unavailable(entry.id);
        entry.resolve(entry.result);
        return;
      }

      const url = createUrl(photo.blob);
      entry.status = "ready";
      entry.result = { id: entry.id, unavailable: false, url };
      onCreateUrl(url);
      entry.resolve(entry.result);
    } catch (error) {
      if (!entry.cancelled && startedGeneration === generation) onUnavailable(entry.id, error);
      entry.status = "unavailable";
      entry.result = unavailable(entry.id);
      entry.resolve(entry.result);
    } finally {
      activeCount -= 1;
      scheduleDrain();
    }
  }

  function drain() {
    while (activeCount < Math.max(1, concurrency)) {
      const entry = nextQueuedEntry();
      if (!entry) return;
      start(entry);
    }
  }

  function load(photo, priority = PHOTO_LOAD_PRIORITY.visible) {
    const id = normalizedId(photo);
    const immediateUrl = typeof photo === "object" ? photo?.url : "";
    if (immediateUrl) {
      return Promise.resolve({ id, unavailable: false, url: immediateUrl });
    }
    if (!id) return Promise.resolve(unavailable(id));

    const existing = entries.get(id);
    if (existing) {
      if (existing.status === "queued" && priority < existing.priority) {
        existing.priority = priority;
        scheduleDrain();
      }
      return existing.promise;
    }

    let resolve;
    const promise = new Promise((complete) => {
      resolve = complete;
    });
    entries.set(id, {
      cancelled: false,
      id,
      priority,
      promise,
      resolve,
      sequence: sequence++,
      status: "queued",
    });
    scheduleDrain();
    return promise;
  }

  function evict(photo) {
    const id = normalizedId(photo);
    const entry = entries.get(id);
    if (!entry) return;
    entry.cancelled = true;
    entries.delete(id);
    if (entry.status === "ready" && entry.result?.url) {
      revokeUrl(entry.result.url);
      onRevokeUrl(entry.result.url);
    } else if (entry.status === "queued") {
      entry.resolve(unavailable(id));
    }
  }

  function dispose() {
    generation += 1;
    entries.forEach((entry) => {
      entry.cancelled = true;
      if (entry.status === "ready" && entry.result?.url) {
        revokeUrl(entry.result.url);
        onRevokeUrl(entry.result.url);
      } else if (entry.status === "queued") {
        entry.resolve(unavailable(entry.id));
      }
    });
    entries.clear();
  }

  return {
    dispose,
    evict,
    load,
  };
}
