import { detectRuntimePlatform } from "./runtimePlatform";

export const PHOTO_SELECTION_ACCEPT = "image/*";

export const PHOTO_SELECTION_RESULT_STATUS = Object.freeze({
  SUCCESS: "success",
  CANCELED: "canceled",
  FAILURE: "failure",
  UNSUPPORTED: "unsupported",
});

function globalWindow() {
  return typeof window === "undefined" ? undefined : window;
}

function globalNavigator() {
  return typeof navigator === "undefined" ? undefined : navigator;
}

function configuredValue(options, key, fallback) {
  return Object.prototype.hasOwnProperty.call(options, key)
    ? options[key]
    : fallback();
}

function result(status, details = {}) {
  return Object.freeze({ status, ...details });
}

function errorWithFallback(error, fallbackMessage) {
  return error instanceof Error ? error : new Error(error?.message || fallbackMessage);
}

function normalizeRequest({ accept, multiple, limit }) {
  return Object.freeze({
    accept: typeof accept === "string" ? accept : PHOTO_SELECTION_ACCEPT,
    multiple: Boolean(multiple),
    limit: Number.isInteger(limit) && limit > 0 ? limit : null,
  });
}

export function createWebPhotoSelectionAdapter(options = {}) {
  function environment() {
    const windowObject = configuredValue(options, "windowObject", globalWindow);
    const navigatorObject = configuredValue(options, "navigatorObject", globalNavigator);
    return {
      runtime: options.runtime || detectRuntimePlatform({ windowObject, navigatorObject }),
    };
  }

  function acquireImages({ input, accept = PHOTO_SELECTION_ACCEPT, multiple = false, limit = null } = {}) {
    const request = normalizeRequest({ accept, multiple, limit });
    if (!environment().runtime?.isWeb) {
      return result(PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED, {
        request,
        error: new Error("Browser photo selection is unavailable in this runtime."),
      });
    }

    try {
      if (!input || typeof input !== "object") {
        throw new Error("The browser photo picker did not provide a file input.");
      }
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        return result(PHOTO_SELECTION_RESULT_STATUS.CANCELED, { files, request });
      }
      return result(PHOTO_SELECTION_RESULT_STATUS.SUCCESS, { files, request });
    } catch (error) {
      return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
        request,
        error: errorWithFallback(error, "Trace could not read the browser photo selection."),
      });
    }
  }

  return Object.freeze({ acquireImages });
}

export const webPhotoSelectionAdapter = createWebPhotoSelectionAdapter();
