import { MEBIBYTE } from "./photoIngestion";

export const PHOTO_STORAGE_SAFETY_POLICY = Object.freeze({
  writeOverheadMultiplier: 1.15,
  minimumFreeAfterWriteBytes: 5 * MEBIBYTE,
});

export class InsufficientPhotoStorageError extends Error {
  constructor(message) {
    super(message);
    this.name = "InsufficientPhotoStorageError";
    this.code = "insufficient-photo-storage";
  }
}

function defaultNavigator() {
  return typeof navigator === "undefined" ? undefined : navigator;
}

export async function preparePhotoStorage(additionalBytes, {
  navigatorObject = defaultNavigator(),
  policy = PHOTO_STORAGE_SAFETY_POLICY,
} = {}) {
  const requestedBytes = Math.max(0, Number(additionalBytes) || 0);
  const storage = navigatorObject?.storage;
  let estimate = null;

  if (typeof storage?.estimate === "function") {
    try {
      const value = await storage.estimate();
      const usage = Number(value?.usage);
      const quota = Number(value?.quota);
      if (Number.isFinite(usage) && usage >= 0 && Number.isFinite(quota) && quota >= usage) {
        const required = Math.ceil(requestedBytes * policy.writeOverheadMultiplier) + policy.minimumFreeAfterWriteBytes;
        estimate = { usage, quota, available: quota - usage, required };
        if (estimate.available < required) {
          throw new InsufficientPhotoStorageError(
            "This device does not report enough browser storage for these photos. Free device/browser space, remove a photo, or choose smaller photos; your existing Trace data was not changed."
          );
        }
      }
    } catch (error) {
      if (error instanceof InsufficientPhotoStorageError) throw error;
      estimate = null;
    }
  }

  let persistent = null;
  if (typeof storage?.persist === "function") {
    try {
      persistent = await storage.persist();
    } catch (error) {
      persistent = null;
    }
  }
  return { estimate, persistent };
}

export function photoStorageFailureMessage(error, fallbackMessage) {
  if (error instanceof InsufficientPhotoStorageError) return error.message;
  if (error?.name === "QuotaExceededError") {
    return "This device ran out of browser storage while saving photos. Your existing Trace data was not changed. Free space, remove a photo, or choose smaller photos and try again.";
  }
  return fallbackMessage;
}
