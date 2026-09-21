import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { detectRuntimePlatform, RUNTIME_KINDS } from "./runtimePlatform";

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
    if (!env.runtime?.isWeb && env.runtime?.kind !== RUNTIME_KINDS.NATIVE_IOS) {
      return unsupported(BACKUP_FILE_METHOD.READ);
    }
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

function isSafeNativeBackup({ contents, filename, mimeType } = {}) {
  return (typeof contents?.text === "function" || (typeof contents?.size === "number" && typeof contents?.slice === "function"))
    && typeof filename === "string"
    && /^trace-backup-[A-Za-z0-9-]+\.json$/.test(filename)
    && mimeType === TRACE_BACKUP_MIME_TYPE;
}

function nativeBackupError(stage, error) {
  const action = {
    read: "read the prepared backup",
    write: "write the temporary backup",
    uri: "locate the temporary backup",
    share: "share the backup",
    cleanup: "remove the temporary backup",
  }[stage];
  return new Error(`Trace could not ${action}: ${errorWithFallback(error, "Native file operation failed.").message}`);
}

async function readPreparedBackup(contents, FileReaderConstructor) {
  if (typeof contents.text === "function") return contents.text();
  if (typeof FileReaderConstructor !== "function") {
    throw new Error("This device cannot read the prepared backup file.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReaderConstructor();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("The prepared backup could not be read."));
    reader.onabort = () => reject(new Error("Reading the prepared backup was interrupted."));
    try {
      reader.readAsText(contents, "UTF-8");
    } catch (error) {
      reject(error);
    }
  });
}

export function createTraceBackupFileAdapter(options = {}) {
  const web = createWebBackupFileAdapter(options);
  const filesystem = options.filesystem || Filesystem;
  const nativeShare = options.nativeShare || Share;
  const FileReaderConstructor = configuredValue(options, "FileReaderConstructor", "FileReader");
  let temporarySequence = 0;

  function runtime() {
    return options.runtime || detectRuntimePlatform({
      windowObject: configuredValue(options, "windowObject", "window"),
      navigatorObject: configuredValue(options, "navigatorObject", "navigator"),
    });
  }

  function isNativeIos() {
    const platform = runtime();
    return platform.isNative === true && platform.kind === RUNTIME_KINDS.NATIVE_IOS;
  }

  function unsupportedNative(method) {
    return result(BACKUP_FILE_RESULT_STATUS.UNSUPPORTED, method, {
      native: true,
      error: new Error("Native backup file sharing is currently supported only on iOS."),
    });
  }

  function prepareExport(descriptor) {
    const platform = runtime();
    if (platform.isWeb) return web.prepareExport(descriptor);
    if (platform.kind !== RUNTIME_KINDS.NATIVE_IOS) return unsupportedNative(BACKUP_FILE_METHOD.SHARE);
    if (!isSafeNativeBackup(descriptor)) {
      return result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.SHARE, {
        native: true,
        error: new Error("The prepared Trace backup file has an unsafe name, type, or contents."),
      });
    }
    return result(BACKUP_FILE_RESULT_STATUS.READY, BACKUP_FILE_METHOD.SHARE, {
      native: true,
      file: Object.freeze({
        contents: descriptor.contents,
        filename: descriptor.filename,
        mimeType: descriptor.mimeType,
      }),
    });
  }

  function downloadExport(descriptor) {
    return runtime().isWeb ? web.downloadExport(descriptor) : unsupportedNative(BACKUP_FILE_METHOD.DOWNLOAD);
  }

  async function shareExport(file) {
    const platform = runtime();
    if (platform.isWeb) return web.shareExport(file);
    if (platform.kind !== RUNTIME_KINDS.NATIVE_IOS) return unsupportedNative(BACKUP_FILE_METHOD.SHARE);
    if (!isSafeNativeBackup(file)) {
      return result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.SHARE, {
        native: true,
        error: new Error("The prepared Trace backup file has an unsafe name, type, or contents."),
      });
    }

    const folder = `trace-backup-export-${Date.now()}-${++temporarySequence}`;
    const path = `${folder}/${file.filename}`;
    let writeStarted = false;
    let stage = "read";
    let delivery;
    try {
      const data = await readPreparedBackup(file.contents, FileReaderConstructor);
      if (typeof data !== "string") throw new Error("The backup did not contain UTF-8 text.");
      stage = "write";
      writeStarted = true;
      await filesystem.writeFile({ path, data, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
      stage = "uri";
      const { uri } = await filesystem.getUri({ path, directory: Directory.Cache });
      if (typeof uri !== "string" || !uri.startsWith("file://")) {
        throw new Error("The temporary backup file has no usable file URI.");
      }
      stage = "share";
      await nativeShare.share({ files: [uri], title: "Trace Backup" });
      delivery = result(BACKUP_FILE_RESULT_STATUS.SUCCESS, BACKUP_FILE_METHOD.SHARE, { native: true });
    } catch (error) {
      delivery = stage === "share" && (error?.name === "AbortError" || error?.message === "Share canceled")
        ? result(BACKUP_FILE_RESULT_STATUS.CANCELED, BACKUP_FILE_METHOD.SHARE, { native: true })
        : result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.SHARE, {
          native: true,
          stage,
          error: nativeBackupError(stage, error),
        });
    }

    if (writeStarted) {
      try {
        await filesystem.deleteFile({ path, directory: Directory.Cache });
        await filesystem.rmdir({ path: folder, directory: Directory.Cache });
      } catch (error) {
        if (delivery.status === BACKUP_FILE_RESULT_STATUS.FAILURE) {
          return Object.freeze({ ...delivery, cleanupError: nativeBackupError("cleanup", error) });
        }
        return result(BACKUP_FILE_RESULT_STATUS.FAILURE, BACKUP_FILE_METHOD.SHARE, {
          native: true,
          stage: "cleanup",
          shareStatus: delivery.status,
          error: nativeBackupError("cleanup", error),
        });
      }
    }
    return delivery;
  }

  return Object.freeze({
    isNativeIos,
    prepareExport,
    downloadExport,
    shareExport,
    readSelectedFile: web.readSelectedFile,
  });
}

export const traceBackupFileAdapter = createTraceBackupFileAdapter();
