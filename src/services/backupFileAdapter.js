import { detectRuntimePlatform } from "./runtimePlatform";

export const TRACE_BACKUP_MIME_TYPE = "application/json";

export const BACKUP_FILE_RESULT_STATUS = Object.freeze({
  READY: "ready",
  SUCCESS: "success",
  CANCELED: "canceled",
  FAILURE: "failure",
  UNSUPPORTED: "unsupported",
});

export const BACKUP_FILE_METHOD = Object.freeze({
  SHARE: "share",
  DOWNLOAD: "download",
  READ: "read",
});

function globalValue(name) {
  if (name === "window") return typeof window === "undefined" ? undefined : window;
  if (name === "navigator") return typeof navigator === "undefined" ? undefined : navigator;
  if (name === "document") return typeof document === "undefined" ? undefined : document;
  if (name === "URL") return typeof URL === "undefined" ? undefined : URL;
  if (name === "File") return typeof File === "undefined" ? undefined : File;
  if (name === "Blob") return typeof Blob === "undefined" ? undefined : Blob;
  if (name === "FileReader") return typeof FileReader === "undefined" ? undefined : FileReader;
  return undefined;
}

function configuredValue(options, key, fallbackName) {
  return Object.prototype.hasOwnProperty.call(options, key)
    ? options[key]
    : globalValue(fallbackName);
}

function errorWithFallback(error, fallbackMessage) {
  return error instanceof Error ? error : new Error(error?.message || fallbackMessage);
}

function fileMetadata(file) {
  return {
    name: typeof file?.name === "string" ? file.name : "",
    type: typeof file?.type === "string" ? file.type : "",
    size: typeof file?.size === "number" ? file.size : null,
    lastModified: typeof file?.lastModified === "number" ? file.lastModified : null,
  };
}

function result(status, method, details = {}) {
  return Object.freeze({ status, method, ...details });
}

export function createWebBackupFileAdapter(options = {}) {
  function environment() {
    const windowObject = configuredValue(options, "windowObject", "window");
    const navigatorObject = configuredValue(options, "navigatorObject", "navigator");
    return {
      windowObject,
      navigatorObject,
      documentObject: configuredValue(options, "documentObject", "document"),
      urlObject: configuredValue(options, "urlObject", "URL"),
      FileConstructor: configuredValue(options, "FileConstructor", "File"),
      BlobConstructor: configuredValue(options, "BlobConstructor", "Blob"),
      FileReaderConstructor: configuredValue(options, "FileReaderConstructor", "FileReader"),
      runtime: options.runtime || detectRuntimePlatform({ windowObject, navigatorObject }),
    };
  }

  function unsupported(method) {
    return result(BACKUP_FILE_RESULT_STATUS.UNSUPPORTED, method, {
      error: new Error("Browser backup-file operations are unavailable in this runtime."),
    });
  }

  function createExportFile({ contents, filename, mimeType = TRACE_BACKUP_MIME_TYPE }, env) {
    let file;
    if (typeof env.FileConstructor === "function") {
      file = new env.FileConstructor([contents], filename, { type: mimeType });
    } else if (typeof env.BlobConstructor === "function") {
      file = new env.BlobConstructor([contents], { type: mimeType });
    } else {
      throw new Error("This browser cannot create a Trace backup file.");
    }
    if (file.name !== filename) {
      Object.defineProperty(file, "name", { configurable: true, value: filename });
    }
    return file;
  }

  function canShareFile(file, env) {
    if (
      !env.runtime?.isWeb ||
      !env.runtime.capabilities?.webShare ||
      !env.runtime.capabilities?.fileShare ||
      typeof env.navigatorObject?.share !== "function" ||
      typeof env.navigatorObject?.canShare !== "function"
    ) {
      return false;
    }
    try {
      return env.navigatorObject.canShare({ files: [file] }) === true;
    } catch (error) {
      return false;
    }
  }

  function downloadFile(file, env, details = {}) {
    if (!env.runtime?.isWeb) return unsupported(BACKUP_FILE_METHOD.DOWNLOAD);
    let objectUrl;
    let link;
    let deliveryResult;
    try {
      if (
        typeof env.urlObject?.createObjectURL !== "function" ||
        typeof env.urlObject?.revokeObjectURL !== "function" ||
        typeof env.documentObject?.createElement !== "function" ||
        !env.documentObject?.body
      ) {
        throw new Error("This browser cannot download a Trace backup file.");
      }
      objectUrl = env.urlObject.createObjectURL(file);
      link = env.documentObject.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      env.documentObject.body.appendChild(link);
      link.click();
      deliveryResult = result(BACKUP_FILE_RESULT_STATUS.SUCCESS, BACKUP_FILE_METHOD.DOWNLOAD, details);
    } catch (error) {
      deliveryResult = result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.DOWNLOAD, {
        ...details,
        error: errorWithFallback(error, "Trace could not download the backup file."),
      });
    } finally {
      let cleanupError;
      try {
        if (link) link.remove();
      } catch (error) {
        cleanupError = error;
      }
      try {
        if (objectUrl !== undefined) env.urlObject.revokeObjectURL(objectUrl);
      } catch (error) {
        cleanupError ||= error;
      }
      if (cleanupError && deliveryResult?.status === BACKUP_FILE_RESULT_STATUS.SUCCESS) {
        deliveryResult = result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.DOWNLOAD, {
          ...details,
          error: errorWithFallback(cleanupError, "Trace could not clean up the backup download."),
        });
      }
    }
    return deliveryResult;
  }

  function createExportFileResult(descriptor, env, method) {
    try {
      return { file: createExportFile(descriptor, env) };
    } catch (error) {
      return {
        failure: result(BACKUP_FILE_RESULT_STATUS.FAILURE, method, {
          error: errorWithFallback(error, "Trace could not create the backup file."),
        }),
      };
    }
  }

  function prepareExport({ contents, filename, mimeType = TRACE_BACKUP_MIME_TYPE }) {
    const env = environment();
    if (!env.runtime?.isWeb) return unsupported(BACKUP_FILE_METHOD.DOWNLOAD);
    const { file, failure } = createExportFileResult({ contents, filename, mimeType }, env, BACKUP_FILE_METHOD.DOWNLOAD);
    if (failure) return failure;
    if (canShareFile(file, env)) {
      return result(BACKUP_FILE_RESULT_STATUS.READY, BACKUP_FILE_METHOD.SHARE, { file });
    }
    return downloadFile(file, env);
  }

  function downloadExport({ contents, filename, mimeType = TRACE_BACKUP_MIME_TYPE }) {
    const env = environment();
    if (!env.runtime?.isWeb) return unsupported(BACKUP_FILE_METHOD.DOWNLOAD);
    const { file, failure } = createExportFileResult({ contents, filename, mimeType }, env, BACKUP_FILE_METHOD.DOWNLOAD);
    return failure || downloadFile(file, env);
  }

  async function shareExport(file) {
    const env = environment();
    if (!env.runtime?.isWeb) return unsupported(BACKUP_FILE_METHOD.SHARE);
    if (!canShareFile(file, env)) {
      return downloadFile(file, env, { fallbackFrom: BACKUP_FILE_METHOD.SHARE });
    }
    try {
      await env.navigatorObject.share({ files: [file] });
      return result(BACKUP_FILE_RESULT_STATUS.SUCCESS, BACKUP_FILE_METHOD.SHARE);
    } catch (error) {
      if (error?.name === "AbortError") {
        return result(BACKUP_FILE_RESULT_STATUS.CANCELED, BACKUP_FILE_METHOD.SHARE);
      }
      return result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.SHARE, {
        error: errorWithFallback(error, "Trace could not share the backup file."),
      });
    }
  }

  async function readSelectedFile(file) {
    const env = environment();
    if (!env.runtime?.isWeb) return unsupported(BACKUP_FILE_METHOD.READ);
    if (!file) {
      return result(BACKUP_FILE_RESULT_STATUS.CANCELED, BACKUP_FILE_METHOD.READ, {
        reason: "no-file-selected",
      });
    }
    const metadata = fileMetadata(file);
    try {
      if (typeof file.text === "function") {
        const contents = await file.text();
        return result(BACKUP_FILE_RESULT_STATUS.SUCCESS, BACKUP_FILE_METHOD.READ, { contents, file: metadata });
      }
      if (typeof env.FileReaderConstructor !== "function") {
        throw new Error("This browser cannot read the selected backup file.");
      }
      return await new Promise((resolve) => {
        const reader = new env.FileReaderConstructor();
        reader.onload = () => resolve(result(BACKUP_FILE_RESULT_STATUS.SUCCESS, BACKUP_FILE_METHOD.READ, {
          contents: reader.result,
          file: metadata,
        }));
        reader.onerror = () => resolve(result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.READ, {
          error: errorWithFallback(reader.error, "Trace could not read the selected file."),
        }));
        reader.onabort = () => resolve(result(BACKUP_FILE_RESULT_STATUS.CANCELED, BACKUP_FILE_METHOD.READ));
        try {
          reader.readAsText(file);
        } catch (error) {
          resolve(result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.READ, {
            error: errorWithFallback(error, "Trace could not read the selected file."),
          }));
        }
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return result(BACKUP_FILE_RESULT_STATUS.CANCELED, BACKUP_FILE_METHOD.READ);
      }
      return result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.READ, {
        error: errorWithFallback(error, "Trace could not read the selected file."),
      });
    }
  }

  return Object.freeze({ prepareExport, downloadExport, shareExport, readSelectedFile });
}

export const webBackupFileAdapter = createWebBackupFileAdapter();
