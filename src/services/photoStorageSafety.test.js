import {
  InsufficientPhotoStorageError,
  photoStorageFailureMessage,
  preparePhotoStorage,
} from "./photoStorageSafety";

test("insufficient estimated quota rejects before persistence or writes can begin", async () => {
  const estimate = jest.fn(async () => ({ usage: 95, quota: 100 }));
  const persist = jest.fn(async () => true);

  await expect(preparePhotoStorage(10, {
    navigatorObject: { storage: { estimate, persist } },
    policy: { writeOverheadMultiplier: 1, minimumFreeAfterWriteBytes: 1 },
  })).rejects.toBeInstanceOf(InsufficientPhotoStorageError);
  expect(persist).not.toHaveBeenCalled();
});

test("supported quota and persistence APIs are used best-effort", async () => {
  const persist = jest.fn(async () => true);
  const result = await preparePhotoStorage(10, {
    navigatorObject: { storage: { estimate: async () => ({ usage: 10, quota: 100 }), persist } },
    policy: { writeOverheadMultiplier: 1, minimumFreeAfterWriteBytes: 5 },
  });

  expect(result.estimate).toEqual({ usage: 10, quota: 100, available: 90, required: 15 });
  expect(result.persistent).toBe(true);
  expect(persist).toHaveBeenCalledTimes(1);
});

test("missing, rejected, or malformed browser storage APIs never block a valid save", async () => {
  await expect(preparePhotoStorage(100, { navigatorObject: {} })).resolves.toEqual({
    estimate: null,
    persistent: null,
  });
  await expect(preparePhotoStorage(100, {
    navigatorObject: {
      storage: {
        estimate: jest.fn(async () => { throw new Error("private mode"); }),
        persist: jest.fn(async () => { throw new Error("not permitted"); }),
      },
    },
  })).resolves.toEqual({ estimate: null, persistent: null });
});

test("quota write errors produce recoverable data-preservation guidance", () => {
  const error = new DOMException("full", "QuotaExceededError");
  expect(photoStorageFailureMessage(error, "fallback")).toMatch(/existing Trace data was not changed/i);
});
