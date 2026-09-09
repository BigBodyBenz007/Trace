import {
  CAMERA_ERROR_CODES,
  CAMERA_FACING_MODES,
  createBrowserBarcodeCamera,
} from "./barcodeCamera";

function cameraHarness() {
  const stopTrack = jest.fn();
  const stopDecoder = jest.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] };
  const getUserMedia = jest.fn().mockResolvedValue(stream);
  const enumerateDevices = jest.fn().mockResolvedValue([
    { kind: "videoinput", deviceId: "rear-id", label: "Rear camera" },
    { kind: "audioinput", deviceId: "microphone", label: "Microphone" },
  ]);
  let decodeCallback;
  let reader;
  class Reader {
    constructor(hints) {
      reader = this;
      this.hints = hints;
    }
    decodeBitmap() {}
    decodeFromCanvas() {}
    decodeFromStream(_stream, _video, callback) {
      decodeCallback = callback;
      return Promise.resolve({ stop: stopDecoder });
    }
  }
  const BarcodeFormat = {
    EAN_8: "ean8",
    EAN_13: "ean13",
    UPC_A: "upca",
    UPC_E: "upce",
    ITF: "itf",
  };
  const camera = createBrowserBarcodeCamera({
    mediaDevices: { getUserMedia, enumerateDevices },
    secureContext: true,
    loadDecoder: jest.fn().mockResolvedValue({ BrowserMultiFormatOneDReader: Reader, BarcodeFormat,
      DecodeHintType: { POSSIBLE_FORMATS: "formats", TRY_HARDER: "harder" } }),
  });
  return {
    BarcodeFormat,
    camera,
    getUserMedia,
    get decodeCallback() { return decodeCallback; },
    get reader() { return reader; },
    stopDecoder,
    stopTrack,
    stream,
  };
}

test("does not request camera access until start and prefers the rear camera", async () => {
  const harness = cameraHarness();
  expect(harness.getUserMedia).not.toHaveBeenCalled();

  const session = await harness.camera.start({ videoElement: {}, onDetected: jest.fn() });
  expect(harness.getUserMedia).toHaveBeenCalledWith({
    audio: false,
    video: expect.objectContaining({ facingMode: { ideal: CAMERA_FACING_MODES.REAR } }),
  });
  expect(harness.reader.hints.get("formats")).toEqual(["ean8", "ean13", "upca", "itf"]);
  expect(harness.reader.hints.get("harder")).toBe(true);
  expect(session.devices).toEqual([{ deviceId: "rear-id", label: "Rear camera" }]);
});

test("supports front and explicit device selection", async () => {
  const front = cameraHarness();
  await front.camera.start({ videoElement: {}, facingMode: CAMERA_FACING_MODES.FRONT });
  expect(front.getUserMedia.mock.calls[0][0].video.facingMode).toEqual({ ideal: "user" });

  const selected = cameraHarness();
  await selected.camera.start({ videoElement: {}, deviceId: "camera-2" });
  expect(selected.getUserMedia.mock.calls[0][0].video).toEqual({
    deviceId: { exact: "camera-2" }, width: { ideal: 1920 }, height: { ideal: 1080 },
  });
});

test("accepts only normalized supported GTIN results and ignores UPC-E", async () => {
  const harness = cameraHarness();
  const onDetected = jest.fn();
  const onDecodeError = jest.fn();
  await harness.camera.start({ videoElement: {}, onDetected, onDecodeError });

  harness.decodeCallback({
    getBarcodeFormat: () => harness.BarcodeFormat.UPC_E,
    getText: () => "01234565",
  });
  harness.decodeCallback({
    getBarcodeFormat: () => harness.BarcodeFormat.EAN_13,
    getText: () => "00012345600012",
  });
  harness.decodeCallback({
    getBarcodeFormat: () => harness.BarcodeFormat.EAN_13,
    getText: () => "1234",
  });
  expect(onDetected).toHaveBeenCalledTimes(1);
  expect(onDetected).toHaveBeenCalledWith("00012345600012");
  expect(onDecodeError).toHaveBeenCalledTimes(1);
  expect(onDecodeError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("not a valid supported GTIN") }));
});

test("stops decoder and all acquired tracks idempotently", async () => {
  const harness = cameraHarness();
  const video = {};
  const session = await harness.camera.start({ videoElement: video });
  session.stop();
  session.stop();
  expect(harness.stopDecoder).toHaveBeenCalledTimes(1);
  expect(harness.stopTrack).toHaveBeenCalledTimes(1);
});

test("ordinary minified decode misses stay quiet and stopped sessions suppress late callbacks", async () => {
  const harness = cameraHarness();
  const onDecodeError = jest.fn();
  const onDetected = jest.fn();
  const session = await harness.camera.start({ videoElement: {}, onDecodeError, onDetected });
  harness.decodeCallback(null, { name: "e", getKind: () => "NotFoundException" });
  expect(onDecodeError).not.toHaveBeenCalled();
  harness.decodeCallback(null, new TypeError("unexpected decoder failure"));
  expect(onDecodeError).toHaveBeenCalledTimes(1);
  session.stop();
  harness.decodeCallback({ getBarcodeFormat: () => harness.BarcodeFormat.EAN_13, getText: () => "5901234123457" });
  harness.decodeCallback(null, new TypeError("late error"));
  expect(onDecodeError).toHaveBeenCalledTimes(1);
  expect(onDetected).not.toHaveBeenCalled();
});

test("reports unsupported, insecure, and denied camera states safely", async () => {
  await expect(createBrowserBarcodeCamera({ mediaDevices: {}, secureContext: true }).start({ videoElement: {} }))
    .rejects.toMatchObject({ code: CAMERA_ERROR_CODES.UNSUPPORTED });
  await expect(createBrowserBarcodeCamera({ mediaDevices: {}, secureContext: false }).start({ videoElement: {} }))
    .rejects.toMatchObject({ code: CAMERA_ERROR_CODES.INSECURE });
  const denied = new Error("private detail");
  denied.name = "NotAllowedError";
  await expect(createBrowserBarcodeCamera({
    mediaDevices: { getUserMedia: jest.fn().mockRejectedValue(denied) },
    secureContext: true,
  }).start({ videoElement: {} })).rejects.toMatchObject({
    code: CAMERA_ERROR_CODES.DENIED,
    message: expect.not.stringContaining("private detail"),
  });
});

test("an abort during startup releases a late stream", async () => {
  let resolveStream;
  const stop = jest.fn();
  const camera = createBrowserBarcodeCamera({
    mediaDevices: {
      getUserMedia: jest.fn(() => new Promise((resolve) => { resolveStream = resolve; })),
    },
    secureContext: true,
  });
  const controller = new AbortController();
  const pending = camera.start({ videoElement: {}, signal: controller.signal });
  controller.abort();
  resolveStream({ getTracks: () => [{ stop }] });
  await expect(pending).rejects.toMatchObject({ code: CAMERA_ERROR_CODES.UNAVAILABLE });
  expect(stop).toHaveBeenCalledTimes(1);
});

test("uses continuous focus when supported and survives optional constraint rejection", async () => {
  const harness = cameraHarness();
  const applyConstraints = jest.fn().mockRejectedValue(new Error("unsupported setting"));
  harness.stream.getVideoTracks = () => [{ getCapabilities: () => ({ focusMode: ["continuous"] }), applyConstraints }];
  const session = await harness.camera.start({ videoElement: {} });
  expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: "continuous" }] });
  expect(session.stop).toEqual(expect.any(Function));
});

test("an already canceled start does not request camera permission", async () => {
  const harness = cameraHarness();
  const controller = new AbortController();
  controller.abort();
  await expect(harness.camera.start({ videoElement: {}, signal: controller.signal })).rejects.toThrow(/canceled/);
  expect(harness.getUserMedia).not.toHaveBeenCalled();
});

test("abort while the decoder loads never attaches or starts a late decoder", async () => {
  let resolveDecoder;
  const stop = jest.fn();
  const Reader = jest.fn();
  const loadDecoder = jest.fn(() => new Promise((resolve) => { resolveDecoder = resolve; }));
  const camera = createBrowserBarcodeCamera({ secureContext: true, loadDecoder,
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) },
  });
  const controller = new AbortController();
  const pending = camera.start({ videoElement: {}, signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  resolveDecoder({ BrowserMultiFormatOneDReader: Reader });
  await expect(pending).rejects.toThrow(/canceled/);
  expect(Reader).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledTimes(1);
});
