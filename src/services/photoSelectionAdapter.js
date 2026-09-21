import { Camera, CameraErrorCode, MediaType, MediaTypeSelection } from "@capacitor/camera";
import { detectRuntimePlatform, RUNTIME_KINDS } from "./runtimePlatform";

export const PHOTO_SELECTION_ACCEPT = "image/*";

export const PHOTO_SELECTION_RESULT_STATUS = Object.freeze({
  SUCCESS: "success",
  CANCELED: "canceled",
  FAILURE: "failure",
  PARTIAL: "partial",
  UNSUPPORTED: "unsupported",
});

function globalWindow() {
  return typeof window === "undefined" ? undefined : window;
}

function globalNavigator() {
  return typeof navigator === "undefined" ? undefined : navigator;
}

function globalFetch() {
  return typeof fetch === "undefined" ? undefined : fetch;
}

function globalFile() {
  return typeof File === "undefined" ? undefined : File;
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
    limit: Number.isInteger(limit) && limit >= 0 ? limit : null,
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
      if (request.limit !== null && files.length > request.limit) {
        const allowance = request.limit === 0
          ? "This entry already has the maximum number of photos."
          : `Choose ${request.limit} or fewer photo${request.limit === 1 ? "" : "s"} this time.`;
        return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
          files: [],
          request,
          error: new Error(`${allowance} Remove a photo before adding another.`),
        });
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

function nativeLimitError(limit) {
  const allowance = limit === 0
    ? "This entry already has the maximum number of photos."
    : `Choose ${limit} or fewer photo${limit === 1 ? "" : "s"} this time.`;
  return new Error(`${allowance} Remove a photo before adding another.`);
}

function mimeTypeFromFormat(format) {
  const normalized = String(format || "").trim().toLowerCase().replace(/^\./, "");
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  if (normalized === "heic") return "image/heic";
  if (normalized === "heif") return "image/heif";
  return "";
}

function extensionFromMimeType(mimeType) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  }[mimeType] || "image";
}

function filenameFromMedia(media, index, mimeType) {
  const candidates = [media?.name, media?.uri, media?.webPath];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const withoutQuery = candidate.split(/[?#]/, 1)[0];
    const rawName = withoutQuery.split(/[\\/]/).pop();
    if (!rawName) continue;
    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  }
  return `trace-photo-${index + 1}.${extensionFromMimeType(mimeType)}`;
}

function nativeReadError(error, index) {
  const detail = errorWithFallback(error, "The selected file could not be read.").message;
  return new Error(`Photo ${index + 1} could not be read: ${detail}`);
}

export function createTracePhotoSelectionAdapter(options = {}) {
  const web = createWebPhotoSelectionAdapter(options);
  const camera = options.camera || Camera;
  const fetchFn = configuredValue(options, "fetchFn", globalFetch);
  const FileConstructor = configuredValue(options, "FileConstructor", globalFile);

  function runtime() {
    const windowObject = configuredValue(options, "windowObject", globalWindow);
    const navigatorObject = configuredValue(options, "navigatorObject", globalNavigator);
    return options.runtime || detectRuntimePlatform({ windowObject, navigatorObject });
  }

  function isNativeIos() {
    const platform = runtime();
    return platform.isNative === true && platform.kind === RUNTIME_KINDS.NATIVE_IOS;
  }

  async function mediaResultToFile(media, index) {
    if (media?.type !== MediaType.Photo) {
      throw new Error("The selected item is not a supported photo.");
    }
    const location = media.webPath || media.uri;
    if (typeof location !== "string" || !location) {
      throw new Error("The photo library did not provide a readable file location.");
    }
    if (typeof fetchFn !== "function" || typeof FileConstructor !== "function") {
      throw new Error("This device cannot convert the selected photo into a Trace file.");
    }
    const response = await fetchFn(location);
    if (!response || ("ok" in response && response.ok !== true) || typeof response.blob !== "function") {
      throw new Error("The selected photo file is unavailable.");
    }
    const blob = await response.blob();
    const mimeType = String(blob?.type || "").startsWith("image/")
      ? blob.type
      : mimeTypeFromFormat(media.metadata?.format);
    if (!(blob instanceof Blob) || !mimeType.startsWith("image/")) {
      throw new Error("The selected item is not a supported image file.");
    }
    const createdAt = Date.parse(media.metadata?.creationDate || "");
    return new FileConstructor([blob], filenameFromMedia(media, index, mimeType), {
      type: mimeType,
      ...(Number.isFinite(createdAt) ? { lastModified: createdAt } : {}),
    });
  }

  async function acquireNativeImages(request) {
    if (request.limit === 0) {
      return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
        files: [],
        request,
        error: nativeLimitError(0),
      });
    }

    let selected;
    try {
      selected = await camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: request.multiple,
        ...(request.multiple && request.limit !== null ? { limit: request.limit } : {}),
        includeMetadata: true,
        editable: "no",
      });
    } catch (error) {
      if (error?.code === CameraErrorCode.ChooseMediaCancelled || error?.name === "AbortError") {
        return result(PHOTO_SELECTION_RESULT_STATUS.CANCELED, { files: [], request });
      }
      const message = error?.code === CameraErrorCode.GalleryPermissionDenied
        ? "Trace cannot access the photo library. Allow photo access in iPhone Settings and try again."
        : `Trace could not open the iPhone photo library: ${errorWithFallback(error, "Photo selection failed.").message}`;
      return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
        files: [],
        request,
        error: new Error(message),
      });
    }

    const mediaResults = Array.isArray(selected?.results) ? selected.results : [];
    if (mediaResults.length === 0) {
      return result(PHOTO_SELECTION_RESULT_STATUS.CANCELED, { files: [], request });
    }
    if (request.limit !== null && mediaResults.length > request.limit) {
      return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
        files: [],
        request,
        error: nativeLimitError(request.limit),
      });
    }

    const files = [];
    const failures = [];
    for (let index = 0; index < mediaResults.length; index += 1) {
      try {
        files.push(await mediaResultToFile(mediaResults[index], index));
      } catch (error) {
        failures.push({ index, error: nativeReadError(error, index) });
      }
    }

    if (failures.length === 0) {
      return result(PHOTO_SELECTION_RESULT_STATUS.SUCCESS, { files, request });
    }
    if (files.length > 0) {
      const preparedLabel = `${files.length} selected photo${files.length === 1 ? " was" : "s were"} kept`;
      const failureLabel = `${failures.length} photo${failures.length === 1 ? "" : "s"} could not be read`;
      return result(PHOTO_SELECTION_RESULT_STATUS.PARTIAL, {
        files,
        failures,
        request,
        error: new Error(`${preparedLabel}, but ${failureLabel}. ${failures[0].error.message}`),
      });
    }
    return result(PHOTO_SELECTION_RESULT_STATUS.FAILURE, {
      files: [],
      failures,
      request,
      error: new Error(`Trace could not read the selected photos. ${failures[0].error.message}`),
    });
  }

  function acquireImages({ input, accept = PHOTO_SELECTION_ACCEPT, multiple = false, limit = null } = {}) {
    const request = normalizeRequest({ accept, multiple, limit });
    const platform = runtime();
    if (platform.isWeb) return web.acquireImages({ input, ...request });
    if (platform.kind !== RUNTIME_KINDS.NATIVE_IOS) {
      return result(PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED, {
        files: [],
        request,
        error: new Error("Native photo selection is currently supported only on iOS."),
      });
    }
    if (input) {
      return result(PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED, {
        files: [],
        request,
        error: new Error("Browser file-input photo selection is unavailable in the native app."),
      });
    }
    return acquireNativeImages(request);
  }

  return Object.freeze({ acquireImages, isNativeIos });
}

export const tracePhotoSelectionAdapter = createTracePhotoSelectionAdapter();
