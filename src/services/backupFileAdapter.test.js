import {
  BACKUP_FILE_METHOD,
  BACKUP_FILE_RESULT_STATUS,
  createTraceBackupFileAdapter,
  createWebBackupFileAdapter,
  TRACE_BACKUP_MIME_TYPE,
} from "./backupFileAdapter";
import { Directory, Encoding } from "@capacitor/filesystem";

function browserHarness({ navigatorObject = {}, runtime, createAdapter = createWebBackupFileAdapter } = {}) {
  const link = { click: jest.fn(), remove: jest.fn(), href: "", download: "" };
  const documentObject = {
    body: { appendChild: jest.fn() },
    createElement: jest.fn(() => link),
  };
  const urlObject = {
    createObjectURL: jest.fn(() => "blob:trace-backup"),
    revokeObjectURL: jest.fn(),
  };
  const adapter = createAdapter({
    windowObject: {},
    navigatorObject,
    documentObject,
    urlObject,
    ...(runtime ? { runtime } : {}),
  });
  return { adapter, documentObject, link, urlObject };
}

function descriptor(contents = '{"format":"trace-backup"}') {
  return {
    contents,
    filename: "trace-backup-2026-09-02.json",
    mimeType: TRACE_BACKUP_MIME_TYPE,
  };
}

function readBlobText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

test("web export without file-share capability downloads unchanged content, filename, and MIME type", async () => {
  const contents = '{"format":"trace-backup","schemaVersion":5}';
  const { adapter, documentObject, link, urlObject } = browserHarness();

  const delivery = adapter.prepareExport(descriptor(contents));

  expect(delivery).toEqual({ status: BACKUP_FILE_RESULT_STATUS.SUCCESS, method: BACKUP_FILE_METHOD.DOWNLOAD });
  const file = urlObject.createObjectURL.mock.calls[0][0];
  expect(file.name).toBe("trace-backup-2026-09-02.json");
  expect(file.type).toBe("application/json");
  expect(await readBlobText(file)).toBe(contents);
  expect(documentObject.createElement).toHaveBeenCalledWith("a");
  expect(documentObject.body.appendChild).toHaveBeenCalledWith(link);
  expect(link.href).toBe("blob:trace-backup");
  expect(link.download).toBe("trace-backup-2026-09-02.json");
  expect(link.click).toHaveBeenCalledTimes(1);
  expect(link.remove).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledWith("blob:trace-backup");
  expect(documentObject.body.appendChild.mock.invocationCallOrder[0]).toBeLessThan(link.click.mock.invocationCallOrder[0]);
  expect(link.click.mock.invocationCallOrder[0]).toBeLessThan(link.remove.mock.invocationCallOrder[0]);
  expect(link.remove.mock.invocationCallOrder[0]).toBeLessThan(urlObject.revokeObjectURL.mock.invocationCallOrder[0]);
});

test("capability-supported file sharing is selected without user-agent detection", async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  const canShare = jest.fn(() => true);
  const navigatorObject = { userAgent: "generic desktop browser", canShare, share };
  const { adapter, documentObject, urlObject } = browserHarness({ navigatorObject });

  const prepared = adapter.prepareExport(descriptor());
  expect(prepared).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.READY, method: BACKUP_FILE_METHOD.SHARE });
  expect(canShare).toHaveBeenCalledWith({ files: [prepared.file] });
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
  expect(documentObject.createElement).not.toHaveBeenCalled();

  const delivered = await adapter.shareExport(prepared.file);
  expect(delivered).toEqual({ status: BACKUP_FILE_RESULT_STATUS.SUCCESS, method: BACKUP_FILE_METHOD.SHARE });
  expect(share).toHaveBeenCalledWith({ files: [prepared.file] });
});

test("an explicitly requested download remains a download when Web Share is available", () => {
  const canShare = jest.fn(() => true);
  const share = jest.fn();
  const { adapter, link } = browserHarness({ navigatorObject: { canShare, share } });

  expect(adapter.downloadExport(descriptor())).toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.DOWNLOAD,
  });
  expect(canShare).not.toHaveBeenCalled();
  expect(share).not.toHaveBeenCalled();
  expect(link.click).toHaveBeenCalledTimes(1);
});

test.each([
  ["missing APIs", {}],
  ["rejected files", { canShare: jest.fn(() => false), share: jest.fn() }],
  ["throwing capability probe", { canShare: jest.fn(() => { throw new Error("probe failed"); }), share: jest.fn() }],
])("%s falls back to a browser download", (label, navigatorObject) => {
  const { adapter, link, urlObject } = browserHarness({ navigatorObject });
  const delivery = adapter.prepareExport(descriptor());

  expect(delivery).toEqual({ status: BACKUP_FILE_RESULT_STATUS.SUCCESS, method: BACKUP_FILE_METHOD.DOWNLOAD });
  expect(link.click).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledTimes(1);
  if (navigatorObject.share) expect(navigatorObject.share).not.toHaveBeenCalled();
});

test("a capability change before sharing falls back to download safely", async () => {
  const canShare = jest.fn()
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(false);
  const share = jest.fn();
  const { adapter, link, urlObject } = browserHarness({ navigatorObject: { canShare, share } });
  const prepared = adapter.prepareExport(descriptor());

  const delivery = await adapter.shareExport(prepared.file);

  expect(delivery).toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.DOWNLOAD,
    fallbackFrom: BACKUP_FILE_METHOD.SHARE,
  });
  expect(share).not.toHaveBeenCalled();
  expect(link.click).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledTimes(1);
});

test("user-cancelled sharing has a distinct non-failure result", async () => {
  const abort = new DOMException("Canceled", "AbortError");
  const share = jest.fn().mockRejectedValue(abort);
  const { adapter, urlObject } = browserHarness({
    navigatorObject: { canShare: jest.fn(() => true), share },
  });
  const prepared = adapter.prepareExport(descriptor());

  await expect(adapter.shareExport(prepared.file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.CANCELED,
    method: BACKUP_FILE_METHOD.SHARE,
  });
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
});

test("a genuine Web Share failure is reported without an implicit download", async () => {
  const failure = new Error("share sheet unavailable");
  const share = jest.fn().mockRejectedValue(failure);
  const { adapter, link, urlObject } = browserHarness({
    navigatorObject: { canShare: jest.fn(() => true), share },
  });
  const prepared = adapter.prepareExport(descriptor());

  const delivery = await adapter.shareExport(prepared.file);

  expect(delivery).toEqual({
    status: BACKUP_FILE_RESULT_STATUS.FAILURE,
    method: BACKUP_FILE_METHOD.SHARE,
    error: failure,
  });
  expect(link.click).not.toHaveBeenCalled();
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
});

test("download failure still removes the temporary anchor and revokes its URL exactly once", () => {
  const { adapter, link, urlObject } = browserHarness();
  link.click.mockImplementation(() => { throw new Error("click failed"); });

  const delivery = adapter.downloadExport(descriptor());

  expect(delivery).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.FAILURE, method: BACKUP_FILE_METHOD.DOWNLOAD });
  expect(delivery.error.message).toBe("click failed");
  expect(link.remove).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledTimes(1);
});

test("object URL cleanup still runs once if temporary-anchor removal fails", () => {
  const { adapter, link, urlObject } = browserHarness();
  link.remove.mockImplementation(() => { throw new Error("remove failed"); });

  const delivery = adapter.downloadExport(descriptor());

  expect(delivery).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.FAILURE, method: BACKUP_FILE_METHOD.DOWNLOAD });
  expect(delivery.error.message).toBe("remove failed");
  expect(link.remove).toHaveBeenCalledTimes(1);
  expect(urlObject.revokeObjectURL).toHaveBeenCalledTimes(1);
});

test("file.text reading returns exact contents and relevant selected-file metadata", async () => {
  const file = {
    name: "selected-trace.json",
    type: "application/json",
    size: 37,
    lastModified: 1788368400000,
    text: jest.fn().mockResolvedValue("exact selected contents\n"),
  };
  const { adapter } = browserHarness();

  await expect(adapter.readSelectedFile(file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.READ,
    contents: "exact selected contents\n",
    file: {
      name: "selected-trace.json",
      type: "application/json",
      size: 37,
      lastModified: 1788368400000,
    },
  });
});

test("FileReader fallback returns exact contents when file.text is unavailable", async () => {
  const file = { name: "legacy.json", type: "application/json", size: 12, lastModified: 1 };
  class SuccessfulReader {
    readAsText(selected) {
      expect(selected).toBe(file);
      this.result = "legacy exact";
      this.onload();
    }
  }
  const adapter = createWebBackupFileAdapter({
    windowObject: {}, navigatorObject: {}, FileReaderConstructor: SuccessfulReader,
  });

  await expect(adapter.readSelectedFile(file)).resolves.toMatchObject({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.READ,
    contents: "legacy exact",
  });
});

test("file-read failures are reported distinctly", async () => {
  const failure = new Error("read failed");
  const file = { name: "bad.json", text: jest.fn().mockRejectedValue(failure) };
  const { adapter } = browserHarness();

  await expect(adapter.readSelectedFile(file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.FAILURE,
    method: BACKUP_FILE_METHOD.READ,
    error: failure,
  });
});

test.each([
  ["file.text abort", { name: "aborted.json", text: () => Promise.reject(new DOMException("Canceled", "AbortError")) }, undefined],
  ["FileReader abort", { name: "aborted-legacy.json" }, class AbortedReader { readAsText() { this.onabort(); } }],
])("%s is classified as cancellation", async (label, file, FileReaderConstructor) => {
  const { adapter } = browserHarness();
  const readerAdapter = FileReaderConstructor
    ? createWebBackupFileAdapter({ windowObject: {}, navigatorObject: {}, FileReaderConstructor })
    : adapter;

  await expect(readerAdapter.readSelectedFile(file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.CANCELED,
    method: BACKUP_FILE_METHOD.READ,
  });
});

test("no selected file is a cancellation rather than a read failure", async () => {
  const { adapter } = browserHarness();
  await expect(adapter.readSelectedFile(null)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.CANCELED,
    method: BACKUP_FILE_METHOD.READ,
    reason: "no-file-selected",
  });
});

test.each([
  ["iOS", "native-ios", "ios"],
  ["Android", "native-android", "android"],
  ["unknown", "native-unknown", "unknown"],
])("native %s runtime rejects explicit browser downloads without invoking browser APIs", (label, kind, platform) => {
  const FileConstructor = jest.fn();
  const BlobConstructor = jest.fn();
  const link = { click: jest.fn(), remove: jest.fn() };
  const documentObject = {
    body: { appendChild: jest.fn() },
    createElement: jest.fn(() => link),
  };
  const urlObject = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };
  const navigatorObject = { canShare: jest.fn(), share: jest.fn() };
  const adapter = createWebBackupFileAdapter({
    runtime: {
      kind,
      platform,
      isWeb: false,
      isNative: true,
      capabilities: { webShare: true, fileShare: true },
    },
    windowObject: { Capacitor: {} },
    navigatorObject,
    documentObject,
    urlObject,
    FileConstructor,
    BlobConstructor,
  });

  expect(adapter.downloadExport(descriptor())).toMatchObject({
    status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED,
    method: BACKUP_FILE_METHOD.DOWNLOAD,
  });
  expect(FileConstructor).not.toHaveBeenCalled();
  expect(BlobConstructor).not.toHaveBeenCalled();
  expect(navigatorObject.canShare).not.toHaveBeenCalled();
  expect(navigatorObject.share).not.toHaveBeenCalled();
  expect(documentObject.createElement).not.toHaveBeenCalled();
  expect(documentObject.body.appendChild).not.toHaveBeenCalled();
  expect(link.click).not.toHaveBeenCalled();
  expect(link.remove).not.toHaveBeenCalled();
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
  expect(urlObject.revokeObjectURL).not.toHaveBeenCalled();
});

test("the web-only adapter never invokes browser export APIs in native mode", async () => {
  const FileConstructor = jest.fn();
  const FileReaderConstructor = jest.fn();
  const navigatorObject = { canShare: jest.fn(), share: jest.fn() };
  const documentObject = { body: { appendChild: jest.fn() }, createElement: jest.fn() };
  const urlObject = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };
  const adapter = createWebBackupFileAdapter({
    runtime: { isWeb: false, isNative: true, capabilities: { webShare: true, fileShare: true } },
    windowObject: { Capacitor: {} },
    navigatorObject,
    documentObject,
    urlObject,
    FileConstructor,
    FileReaderConstructor,
  });

  expect(adapter.prepareExport(descriptor())).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  await expect(adapter.shareExport({})).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  expect(FileConstructor).not.toHaveBeenCalled();
  expect(FileReaderConstructor).not.toHaveBeenCalled();
  expect(navigatorObject.canShare).not.toHaveBeenCalled();
  expect(navigatorObject.share).not.toHaveBeenCalled();
  expect(documentObject.createElement).not.toHaveBeenCalled();
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
  expect(urlObject.revokeObjectURL).not.toHaveBeenCalled();
});

function nativeHarness(kind = "native-ios", options = {}) {
  const filesystem = {
    writeFile: jest.fn().mockResolvedValue({}),
    getUri: jest.fn().mockResolvedValue({ uri: "file:///trace-cache/trace-backup.json" }),
    deleteFile: jest.fn().mockResolvedValue(),
    rmdir: jest.fn().mockResolvedValue(),
  };
  const nativeShare = { share: jest.fn().mockResolvedValue({ activityType: "save-to-files" }) };
  const adapter = createTraceBackupFileAdapter({
    runtime: { kind, platform: kind.slice("native-".length), isNative: true, isWeb: false },
    filesystem,
    nativeShare,
    ...options,
  });
  return { adapter, filesystem, nativeShare };
}

function nativeDescriptor(contents = '{"format":"trace-backup","name":"café"}') {
  return descriptor({ text: jest.fn().mockResolvedValue(contents) });
}

test("the platform adapter preserves web download and Web Share selection", async () => {
  const { adapter: downloadAdapter, link } = browserHarness({ createAdapter: createTraceBackupFileAdapter });
  expect(downloadAdapter.prepareExport(descriptor())).toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.DOWNLOAD,
  });
  expect(link.click).toHaveBeenCalledTimes(1);

  const share = jest.fn().mockResolvedValue();
  const { adapter: shareAdapter } = browserHarness({
    createAdapter: createTraceBackupFileAdapter,
    navigatorObject: { canShare: jest.fn(() => true), share },
  });
  const prepared = shareAdapter.prepareExport(descriptor());
  expect(prepared.status).toBe(BACKUP_FILE_RESULT_STATUS.READY);
  await expect(shareAdapter.shareExport(prepared.file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.SHARE,
  });
  expect(share).toHaveBeenCalledWith({ files: [prepared.file] });
});

test("native iOS shares the exact UTF-8 archive URI and cleans its isolated cache file", async () => {
  const contents = '{"format":"trace-backup","name":"café"}';
  const { adapter, filesystem, nativeShare } = nativeHarness();
  const prepared = adapter.prepareExport(nativeDescriptor(contents));
  expect(prepared).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.READY, method: BACKUP_FILE_METHOD.SHARE, native: true });

  await expect(adapter.shareExport(prepared.file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.SHARE,
    native: true,
  });
  const written = filesystem.writeFile.mock.calls[0][0];
  expect(written).toMatchObject({
    path: expect.stringMatching(/^trace-backup-export-\d+-\d+\/trace-backup-2026-09-02\.json$/),
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  expect(filesystem.getUri).toHaveBeenCalledWith({ path: written.path, directory: Directory.Cache });
  expect(nativeShare.share).toHaveBeenCalledWith({ files: ["file:///trace-cache/trace-backup.json"], title: "Trace Backup" });
  expect(filesystem.deleteFile).toHaveBeenCalledWith({ path: written.path, directory: Directory.Cache });
  expect(filesystem.rmdir).toHaveBeenCalledWith({ path: written.path.split("/")[0], directory: Directory.Cache });
  expect(nativeShare.share.mock.invocationCallOrder[0]).toBeLessThan(filesystem.deleteFile.mock.invocationCallOrder[0]);
});

test("native iOS reads an archive through FileReader when Blob.text is unavailable", async () => {
  const contents = { size: 25, slice: jest.fn() };
  class ArchiveReader {
    readAsText(selected) {
      expect(selected).toBe(contents);
      this.result = '{"format":"trace-backup"}';
      this.onload();
    }
  }
  const { adapter, filesystem } = nativeHarness("native-ios", { FileReaderConstructor: ArchiveReader });
  const prepared = adapter.prepareExport(descriptor(contents));
  expect(prepared.status).toBe(BACKUP_FILE_RESULT_STATUS.READY);
  await expect(adapter.shareExport(prepared.file)).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.SUCCESS });
  expect(filesystem.writeFile.mock.calls[0][0].data).toBe('{"format":"trace-backup"}');
});

test("native iOS share cancellation is distinct and cleans the temporary file", async () => {
  const { adapter, filesystem, nativeShare } = nativeHarness();
  nativeShare.share.mockRejectedValue(new Error("Share canceled"));
  const prepared = adapter.prepareExport(nativeDescriptor());
  await expect(adapter.shareExport(prepared.file)).resolves.toEqual({
    status: BACKUP_FILE_RESULT_STATUS.CANCELED,
    method: BACKUP_FILE_METHOD.SHARE,
    native: true,
  });
  expect(filesystem.deleteFile).toHaveBeenCalledTimes(1);
  expect(filesystem.rmdir).toHaveBeenCalledTimes(1);
});

test.each([
  ["write", (filesystem) => filesystem.writeFile.mockRejectedValue(new Error("disk full"))],
  ["uri", (filesystem) => filesystem.getUri.mockRejectedValue(new Error("URI unavailable"))],
  ["share", (filesystem, nativeShare) => nativeShare.share.mockRejectedValue(new Error("share failed"))],
])("native %s failure is typed, never falls back to download, and attempts cleanup", async (stage, fail) => {
  const { adapter, filesystem, nativeShare } = nativeHarness();
  fail(filesystem, nativeShare);
  const prepared = adapter.prepareExport(nativeDescriptor());
  const delivery = await adapter.shareExport(prepared.file);
  expect(delivery).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.FAILURE, method: BACKUP_FILE_METHOD.SHARE, native: true, stage });
  expect(filesystem.deleteFile).toHaveBeenCalledTimes(1);
  if (stage !== "share") expect(nativeShare.share).not.toHaveBeenCalled();
});

test("cleanup failure is reported without claiming a saved backup", async () => {
  const { adapter, filesystem } = nativeHarness();
  filesystem.deleteFile.mockRejectedValue(new Error("cache locked"));
  const prepared = adapter.prepareExport(nativeDescriptor());
  const delivery = await adapter.shareExport(prepared.file);
  expect(delivery).toMatchObject({
    status: BACKUP_FILE_RESULT_STATUS.FAILURE,
    method: BACKUP_FILE_METHOD.SHARE,
    native: true,
    stage: "cleanup",
    shareStatus: BACKUP_FILE_RESULT_STATUS.SUCCESS,
  });
  expect(delivery.error.message).toContain("cache locked");
});

test("native export rejects unsafe backup names before writing", async () => {
  const { adapter, filesystem, nativeShare } = nativeHarness();
  const unsafe = { ...nativeDescriptor(), filename: "../private.json" };
  expect(adapter.prepareExport(unsafe)).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.FAILURE, native: true });
  await expect(adapter.shareExport(unsafe)).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.FAILURE, native: true });
  expect(filesystem.writeFile).not.toHaveBeenCalled();
  expect(nativeShare.share).not.toHaveBeenCalled();
});

test("a failed write keeps its primary error when partial-file cleanup also fails", async () => {
  const { adapter, filesystem, nativeShare } = nativeHarness();
  filesystem.writeFile.mockRejectedValue(new Error("disk full"));
  filesystem.deleteFile.mockRejectedValue(new Error("partial file locked"));
  const prepared = adapter.prepareExport(nativeDescriptor());
  const delivery = await adapter.shareExport(prepared.file);
  expect(delivery).toMatchObject({
    status: BACKUP_FILE_RESULT_STATUS.FAILURE,
    method: BACKUP_FILE_METHOD.SHARE,
    native: true,
    stage: "write",
  });
  expect(delivery.error.message).toContain("disk full");
  expect(delivery.cleanupError.message).toContain("partial file locked");
  expect(nativeShare.share).not.toHaveBeenCalled();
});

test("native iOS can read a Files-picker File while native exports avoid browser downloads", async () => {
  const { adapter } = nativeHarness();
  const file = { name: "pwa-backup.json", type: "application/json", size: 18, text: jest.fn().mockResolvedValue("PWA backup") };
  await expect(adapter.readSelectedFile(file)).resolves.toMatchObject({
    status: BACKUP_FILE_RESULT_STATUS.SUCCESS,
    method: BACKUP_FILE_METHOD.READ,
    contents: "PWA backup",
    file: { name: "pwa-backup.json" },
  });
  expect(adapter.downloadExport(descriptor())).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
});

test.each(["native-android", "native-unknown"])("%s explicitly rejects export and import", async (kind) => {
  const { adapter, filesystem, nativeShare } = nativeHarness(kind);
  expect(adapter.prepareExport(nativeDescriptor())).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  expect(adapter.downloadExport(descriptor())).toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  await expect(adapter.shareExport(nativeDescriptor())).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  await expect(adapter.readSelectedFile({ text: jest.fn() })).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  expect(filesystem.writeFile).not.toHaveBeenCalled();
  expect(nativeShare.share).not.toHaveBeenCalled();
});
