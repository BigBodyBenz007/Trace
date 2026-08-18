import {
  createPhotoUrlLoader,
  PHOTO_LOAD_PRIORITY,
} from "./photoUrlLoader";

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

test("bounds photo reads and starts centered and nearby work before visible work", async () => {
  const reads = new Map();
  const started = [];
  let active = 0;
  let maximumActive = 0;
  const readPhoto = jest.fn((id) => {
    started.push(id);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    const work = deferred();
    reads.set(id, work);
    return work.promise.finally(() => { active -= 1; });
  });
  const loader = createPhotoUrlLoader({
    concurrency: 2,
    createUrl: (blob) => `blob:${blob.name}`,
    readPhoto,
  });

  const visible = loader.load("visible", PHOTO_LOAD_PRIORITY.visible);
  const nearby = loader.load("nearby", PHOTO_LOAD_PRIORITY.nearby);
  const centered = loader.load("centered", PHOTO_LOAD_PRIORITY.centered);
  await Promise.resolve();

  expect(started).toEqual(["centered", "nearby"]);
  expect(maximumActive).toBe(2);

  reads.get("centered").resolve({ blob: { name: "centered" } });
  await centered;
  await Promise.resolve();
  expect(started).toEqual(["centered", "nearby", "visible"]);

  reads.get("nearby").resolve({ blob: { name: "nearby" } });
  reads.get("visible").resolve({ blob: { name: "visible" } });
  await Promise.all([nearby, visible]);
  expect(maximumActive).toBe(2);
});

test("deduplicates reads and object URLs, then revokes each URL exactly once", async () => {
  const readPhoto = jest.fn(async (id) => ({ blob: { id } }));
  const createUrl = jest.fn((blob) => `blob:${blob.id}`);
  const revokeUrl = jest.fn();
  const loader = createPhotoUrlLoader({ createUrl, readPhoto, revokeUrl });

  const first = loader.load("shared-photo", PHOTO_LOAD_PRIORITY.visible);
  const second = loader.load("shared-photo", PHOTO_LOAD_PRIORITY.detail);
  expect(second).toBe(first);
  expect(await first).toEqual({
    id: "shared-photo",
    unavailable: false,
    url: "blob:shared-photo",
  });
  expect(readPhoto).toHaveBeenCalledTimes(1);
  expect(createUrl).toHaveBeenCalledTimes(1);

  loader.evict("shared-photo");
  loader.evict("shared-photo");
  loader.dispose();
  expect(revokeUrl).toHaveBeenCalledTimes(1);
  expect(revokeUrl).toHaveBeenCalledWith("blob:shared-photo");
});

test("keeps a missing photo reference unavailable without creating a URL", async () => {
  const createUrl = jest.fn();
  const onUnavailable = jest.fn();
  const loader = createPhotoUrlLoader({
    createUrl,
    onUnavailable,
    readPhoto: jest.fn(async () => undefined),
  });

  await expect(loader.load("missing-photo")).resolves.toEqual({
    id: "missing-photo",
    unavailable: true,
    url: "",
  });
  expect(createUrl).not.toHaveBeenCalled();
  expect(onUnavailable).toHaveBeenCalledWith("missing-photo");
});
