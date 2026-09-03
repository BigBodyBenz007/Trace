import {
  BACKUP_FILE_METHOD,
  BACKUP_FILE_RESULT_STATUS,
  createWebBackupFileAdapter,
  TRACE_BACKUP_MIME_TYPE,
} from "./backupFileAdapter";

function browserHarness({ navigatorObject = {}, runtime } = {}) {
  const link = { click: jest.fn(), remove: jest.fn(), href: "", download: "" };
  const documentObject = {
    body: { appendChild: jest.fn() },
    createElement: jest.fn(() => link),
  };
  const urlObject = {
    createObjectURL: jest.fn(() => "blob:trace-backup"),
    revokeObjectURL: jest.fn(),
  };
  const adapter = createWebBackupFileAdapter({
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

test("native runtime classification never invokes browser file, share, download, or read APIs", async () => {
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
  await expect(adapter.readSelectedFile({})).resolves.toMatchObject({ status: BACKUP_FILE_RESULT_STATUS.UNSUPPORTED });
  expect(FileConstructor).not.toHaveBeenCalled();
  expect(FileReaderConstructor).not.toHaveBeenCalled();
  expect(navigatorObject.canShare).not.toHaveBeenCalled();
  expect(navigatorObject.share).not.toHaveBeenCalled();
  expect(documentObject.createElement).not.toHaveBeenCalled();
  expect(urlObject.createObjectURL).not.toHaveBeenCalled();
  expect(urlObject.revokeObjectURL).not.toHaveBeenCalled();
});
