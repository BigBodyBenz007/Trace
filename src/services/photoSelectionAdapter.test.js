import { RUNTIME_KINDS } from "./runtimePlatform";
import {
  createWebPhotoSelectionAdapter,
  PHOTO_SELECTION_ACCEPT,
  PHOTO_SELECTION_RESULT_STATUS,
} from "./photoSelectionAdapter";

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

test("a supplied selection limit is represented without taking validation from the caller", () => {
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

  expect(selection.files).toEqual(files);
  expect(selection.request).toEqual({
    accept: "image/jpeg,image/png",
    multiple: true,
    limit: 2,
  });
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
