import { RUNTIME_KINDS } from "./runtimePlatform";
import {
  createTracePhotoSelectionAdapter,
  createWebPhotoSelectionAdapter,
  PHOTO_SELECTION_ACCEPT,
  PHOTO_SELECTION_RESULT_STATUS,
} from "./photoSelectionAdapter";
import { MediaType, MediaTypeSelection } from "@capacitor/camera";

function webAdapter({ navigatorObject = {} } = {}) {
  return createWebPhotoSelectionAdapter({ windowObject: {}, navigatorObject });
}

test("single-photo selection returns the exact selected File without transforming it", () => {
  const adapter = webAdapter();
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });

  const selection = adapter.acquireImages({
    input: { files: [first] },
    accept: PHOTO_SELECTION_ACCEPT,
    multiple: false,
  });

  expect(selection).toEqual({
    status: PHOTO_SELECTION_RESULT_STATUS.SUCCESS,
    files: [first],
    request: { accept: "image/*", multiple: false, limit: null },
  });
  expect(selection.files[0]).toBe(first);
  expect(first.name).toBe("first.jpg");
  expect(first.type).toBe("image/jpeg");
});

test("multiple-photo selection preserves exact File objects and original order", () => {
  const adapter = webAdapter({ navigatorObject: { userAgent: "iPhone-looking browser text" } });
  const files = [
    new File(["third"], "third.webp", { type: "image/webp" }),
    new File(["first"], "first.jpeg", { type: "image/jpeg" }),
    new File(["second"], "second.png", { type: "image/png" }),
  ];

  const selection = adapter.acquireImages({
    input: { files },
    accept: PHOTO_SELECTION_ACCEPT,
    multiple: true,
  });

  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.SUCCESS);
  expect(selection.files).toEqual(files);
  selection.files.forEach((file, index) => expect(file).toBe(files[index]));
});

test("a supplied selection limit rejects the complete batch instead of truncating it", () => {
  const adapter = webAdapter();
  const files = [
    new File(["one"], "one.jpg"),
    new File(["two"], "two.jpg"),
    new File(["three"], "three.jpg"),
  ];

  const selection = adapter.acquireImages({
    input: { files },
    accept: "image/jpeg,image/png",
    multiple: true,
    limit: 2,
  });

  expect(selection).toMatchObject({
    status: PHOTO_SELECTION_RESULT_STATUS.FAILURE,
    files: [],
    error: expect.any(Error),
  });
  expect(selection.request).toEqual({
    accept: "image/jpeg,image/png",
    multiple: true,
    limit: 2,
  });
});

test("a zero remaining limit is enforced with actionable feedback", () => {
  const selection = webAdapter().acquireImages({
    input: { files: [new File(["one"], "one.jpg")] },
    multiple: true,
    limit: 0,
  });

  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(selection.request.limit).toBe(0);
  expect(selection.error.message).toMatch(/maximum number of photos/i);
});

test.each([
  ["missing selection", null],
  ["empty selection", []],
])("%s is classified as cancellation without an error", (label, files) => {
  const adapter = webAdapter();
  const selection = adapter.acquireImages({ input: { files }, multiple: true });

  expect(selection).toMatchObject({
    status: PHOTO_SELECTION_RESULT_STATUS.CANCELED,
    files: [],
  });
  expect(selection).not.toHaveProperty("error");
});

test("a genuine browser selection read failure is reported without throwing", () => {
  const failure = new Error("picker files unavailable");
  const input = {};
  Object.defineProperty(input, "files", { get: () => { throw failure; } });

  expect(webAdapter().acquireImages({ input, multiple: true })).toMatchObject({
    status: PHOTO_SELECTION_RESULT_STATUS.FAILURE,
    error: failure,
  });
});

test("a missing browser input is a genuine failure", () => {
  expect(webAdapter().acquireImages()).toMatchObject({
    status: PHOTO_SELECTION_RESULT_STATUS.FAILURE,
    error: expect.any(Error),
  });
});

test.each([
  ["iOS", RUNTIME_KINDS.NATIVE_IOS, "ios"],
  ["Android", RUNTIME_KINDS.NATIVE_ANDROID, "android"],
  ["unknown", RUNTIME_KINDS.NATIVE_UNKNOWN, "unknown"],
])("native %s returns unsupported without reading the browser picker", (label, kind, platform) => {
  const filesGetter = jest.fn(() => { throw new Error("browser picker must not be read"); });
  const input = {};
  Object.defineProperty(input, "files", { get: filesGetter });
  const adapter = createWebPhotoSelectionAdapter({
    runtime: { kind, platform, isNative: true, isWeb: false },
    windowObject: { Capacitor: {} },
    navigatorObject: { userAgent: "generic browser" },
  });

  expect(adapter.acquireImages({ input, multiple: true })).toMatchObject({
    status: PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED,
    error: expect.any(Error),
  });
  expect(filesGetter).not.toHaveBeenCalled();
});

function nativeIosAdapter({ camera, fetchFn } = {}) {
  return createTracePhotoSelectionAdapter({
    runtime: { kind: RUNTIME_KINDS.NATIVE_IOS, platform: "ios", isNative: true, isWeb: false },
    camera: camera || { chooseFromGallery: jest.fn() },
    fetchFn: fetchFn || jest.fn(),
    FileConstructor: File,
  });
}

function nativePhoto(name, format = "jpeg") {
  return {
    type: MediaType.Photo,
    uri: `file:///private/photos/${name}`,
    webPath: `capacitor://localhost/_capacitor_file_/private/photos/${name}`,
    metadata: { format, creationDate: "2026-09-20T12:00:00.000Z" },
  };
}

function photoResponse(contents, type) {
  return { ok: true, blob: jest.fn(async () => new Blob([contents], { type })) };
}

test("native iOS chooses photos from the gallery and returns File objects for existing ingestion", async () => {
  const camera = {
    chooseFromGallery: jest.fn().mockResolvedValue({ results: [nativePhoto("IMG_2048.HEIC", "heic")] }),
  };
  const fetchFn = jest.fn().mockResolvedValue(photoResponse("heic-bytes", "image/heic"));
  const adapter = nativeIosAdapter({ camera, fetchFn });

  const selection = await adapter.acquireImages({ multiple: true, limit: 12 });

  expect(adapter.isNativeIos()).toBe(true);
  expect(camera.chooseFromGallery).toHaveBeenCalledWith({
    mediaType: MediaTypeSelection.Photo,
    allowMultipleSelection: true,
    limit: 12,
    includeMetadata: true,
    editable: "no",
  });
  expect(fetchFn).toHaveBeenCalledWith("capacitor://localhost/_capacitor_file_/private/photos/IMG_2048.HEIC");
  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.SUCCESS);
  expect(selection.files[0]).toBeInstanceOf(File);
  expect(selection.files[0].name).toBe("IMG_2048.HEIC");
  expect(selection.files[0].type).toBe("image/heic");
  expect(selection.files[0].lastModified).toBe(Date.parse("2026-09-20T12:00:00.000Z"));
});

test("native iOS preserves the selected order for multiple photos", async () => {
  const camera = {
    chooseFromGallery: jest.fn().mockResolvedValue({
      results: [nativePhoto("third.jpg"), nativePhoto("first.png", "png"), nativePhoto("second.webp", "webp")],
    }),
  };
  const fetchFn = jest.fn()
    .mockResolvedValueOnce(photoResponse("third", "image/jpeg"))
    .mockResolvedValueOnce(photoResponse("first", "image/png"))
    .mockResolvedValueOnce(photoResponse("second", "image/webp"));

  const selection = await nativeIosAdapter({ camera, fetchFn }).acquireImages({ multiple: true, limit: 6 });

  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.SUCCESS);
  expect(selection.files.map((file) => file.name)).toEqual(["third.jpg", "first.png", "second.webp"]);
  expect(fetchFn.mock.calls.map(([path]) => path.split("/").pop())).toEqual(["third.jpg", "first.png", "second.webp"]);
});

test("native iOS cancellation is normal and permission denial is actionable", async () => {
  const canceled = { chooseFromGallery: jest.fn().mockRejectedValue({ code: "OS-PLUG-CAMR-0020" }) };
  await expect(nativeIosAdapter({ camera: canceled }).acquireImages({ multiple: true, limit: 12 })).resolves.toEqual({
    status: PHOTO_SELECTION_RESULT_STATUS.CANCELED,
    files: [],
    request: { accept: "image/*", multiple: true, limit: 12 },
  });

  const denied = { chooseFromGallery: jest.fn().mockRejectedValue({ code: "OS-PLUG-CAMR-0005" }) };
  const denial = await nativeIosAdapter({ camera: denied }).acquireImages({ multiple: true, limit: 12 });
  expect(denial.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(denial.error.message).toMatch(/Allow photo access in iPhone Settings/i);
});

test("native iOS keeps readable photos and reports partial conversion failures", async () => {
  const camera = {
    chooseFromGallery: jest.fn().mockResolvedValue({
      results: [nativePhoto("kept.jpg"), nativePhoto("unreadable.jpg"), nativePhoto("also-kept.png", "png")],
    }),
  };
  const fetchFn = jest.fn()
    .mockResolvedValueOnce(photoResponse("kept", "image/jpeg"))
    .mockRejectedValueOnce(new Error("iCloud file unavailable"))
    .mockResolvedValueOnce(photoResponse("also-kept", "image/png"));

  const selection = await nativeIosAdapter({ camera, fetchFn }).acquireImages({ multiple: true, limit: 12 });

  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.PARTIAL);
  expect(selection.files.map((file) => file.name)).toEqual(["kept.jpg", "also-kept.png"]);
  expect(selection.failures).toHaveLength(1);
  expect(selection.error.message).toMatch(/2 selected photos were kept.*1 photo could not be read/i);
  expect(selection.error.message).toContain("iCloud file unavailable");
});

test("native iOS reports a total read failure without returning unusable files", async () => {
  const camera = {
    chooseFromGallery: jest.fn().mockResolvedValue({ results: [nativePhoto("unreadable.jpg")] }),
  };
  const fetchFn = jest.fn().mockRejectedValue(new Error("selected file is not local"));

  const selection = await nativeIosAdapter({ camera, fetchFn }).acquireImages({ multiple: true, limit: 12 });

  expect(selection.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(selection.files).toEqual([]);
  expect(selection.error.message).toMatch(/could not read the selected photos/i);
  expect(selection.error.message).toContain("selected file is not local");
});

test("native iOS reports unsupported media and enforces the remaining photo limit", async () => {
  const camera = {
    chooseFromGallery: jest.fn().mockResolvedValue({ results: [{ ...nativePhoto("clip.mov"), type: MediaType.Video }] }),
  };
  const unsupported = await nativeIosAdapter({ camera }).acquireImages({ multiple: true, limit: 2 });
  expect(unsupported.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(unsupported.error.message).toMatch(/not a supported photo/i);

  const atLimitCamera = { chooseFromGallery: jest.fn() };
  const atLimit = await nativeIosAdapter({ camera: atLimitCamera }).acquireImages({ multiple: true, limit: 0 });
  expect(atLimit.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(atLimit.error.message).toMatch(/maximum number of photos/i);
  expect(atLimitCamera.chooseFromGallery).not.toHaveBeenCalled();

  const ignoredLimitCamera = {
    chooseFromGallery: jest.fn().mockResolvedValue({ results: [nativePhoto("one.jpg"), nativePhoto("two.jpg")] }),
  };
  const ignoredLimitFetch = jest.fn();
  const ignoredLimit = await nativeIosAdapter({ camera: ignoredLimitCamera, fetchFn: ignoredLimitFetch })
    .acquireImages({ multiple: true, limit: 1 });
  expect(ignoredLimit.status).toBe(PHOTO_SELECTION_RESULT_STATUS.FAILURE);
  expect(ignoredLimit.error.message).toMatch(/Choose 1 or fewer photo/i);
  expect(ignoredLimitFetch).not.toHaveBeenCalled();
});

test("the platform adapter preserves the browser file-input path without opening Camera", () => {
  const file = new File(["web"], "web.jpg", { type: "image/jpeg" });
  const camera = { chooseFromGallery: jest.fn() };
  const adapter = createTracePhotoSelectionAdapter({
    runtime: { kind: RUNTIME_KINDS.WEB, platform: "web", isNative: false, isWeb: true },
    camera,
  });

  const selection = adapter.acquireImages({ input: { files: [file] }, multiple: true, limit: 12 });

  expect(selection).toMatchObject({ status: PHOTO_SELECTION_RESULT_STATUS.SUCCESS, files: [file] });
  expect(selection.files[0]).toBe(file);
  expect(camera.chooseFromGallery).not.toHaveBeenCalled();
  expect(adapter.isNativeIos()).toBe(false);
});

test.each([RUNTIME_KINDS.NATIVE_ANDROID, RUNTIME_KINDS.NATIVE_UNKNOWN])(
  "%s remains explicitly unsupported",
  (kind) => {
    const camera = { chooseFromGallery: jest.fn() };
    const adapter = createTracePhotoSelectionAdapter({
      runtime: { kind, platform: kind.replace("native-", ""), isNative: true, isWeb: false },
      camera,
    });
    expect(adapter.acquireImages({ multiple: true, limit: 12 })).toMatchObject({
      status: PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED,
    });
    expect(camera.chooseFromGallery).not.toHaveBeenCalled();
  }
);
