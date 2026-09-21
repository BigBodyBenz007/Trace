import {
  BARCODE_CAMERA_RESULT_STATUS,
  CAMERA_ERROR_CODES,
  CAMERA_FACING_MODES,
  createBrowserBarcodeCamera,
  createNativeIosBarcodeCamera,
  createTraceBarcodeCamera,
} from "./barcodeCamera";
import {
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from "@capacitor/barcode-scanner";
import { RUNTIME_KINDS } from "./runtimePlatform";

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

test("native iOS invokes the plugin with food-barcode options and returns the raw result", async () => {
  const scanner = {
    scanBarcode: jest.fn().mockResolvedValue({ ScanResult: "0001-2345 600012", format: 9 }),
  };
  const camera = createNativeIosBarcodeCamera({ scanner });

  const session = await camera.start({ facingMode: CAMERA_FACING_MODES.REAR });

  expect(scanner.scanBarcode).toHaveBeenCalledWith({
    hint: CapacitorBarcodeScannerTypeHint.ALL,
    cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
    scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
    scanInstructions: "Center the entire food barcode in the frame.",
    scanButton: false,
    cancelButtonAccessibilityLabel: "Cancel barcode scan",
    torchButtonOnAccessibilityLabel: "Turn barcode scanner light off",
    torchButtonOffAccessibilityLabel: "Turn barcode scanner light on",
  });
  expect(session).toMatchObject({
    native: true,
    status: BARCODE_CAMERA_RESULT_STATUS.DETECTED,
    facingMode: CAMERA_FACING_MODES.REAR,
    value: "0001-2345 600012",
    devices: [],
  });
});

test.each([
  [CAMERA_FACING_MODES.REAR, CapacitorBarcodeScannerCameraDirection.BACK],
  [CAMERA_FACING_MODES.FRONT, CapacitorBarcodeScannerCameraDirection.FRONT],
])("native iOS maps %s to the requested plugin camera", async (facingMode, cameraDirection) => {
  const scanner = { scanBarcode: jest.fn().mockResolvedValue({ ScanResult: "00012345600012", format: 9 }) };
  await createNativeIosBarcodeCamera({ scanner }).start({ facingMode });
  expect(scanner.scanBarcode).toHaveBeenCalledWith(expect.objectContaining({ cameraDirection }));
});

test("native iOS cancellation is a normal non-error result", async () => {
  const scanner = {
    scanBarcode: jest.fn().mockRejectedValue({ code: "OS-PLUG-BARC-0006", message: "cancelled" }),
  };
  await expect(createNativeIosBarcodeCamera({ scanner }).start()).resolves.toMatchObject({
    native: true,
    status: BARCODE_CAMERA_RESULT_STATUS.CANCELED,
  });
});

test.each([
  ["OS-PLUG-BARC-0007", CAMERA_ERROR_CODES.DENIED, /iPhone Settings/i],
  ["OS-PLUG-BARC-0004", CAMERA_ERROR_CODES.NOT_FOUND, /rear camera is unavailable/i],
  ["OS-PLUG-BARC-0008", CAMERA_ERROR_CODES.UNAVAILABLE, /configure the native barcode scanner/i],
  ["OS-PLUG-BARC-0013", CAMERA_ERROR_CODES.UNAVAILABLE, /native barcode scanner is unavailable/i],
  ["unexpected-plugin-error", CAMERA_ERROR_CODES.UNAVAILABLE, /could not start the native barcode scanner/i],
])("native iOS maps plugin failure %s clearly", async (code, expectedCode, message) => {
  const scanner = { scanBarcode: jest.fn().mockRejectedValue({ code, message: "private native detail" }) };
  await expect(createNativeIosBarcodeCamera({ scanner }).start()).rejects.toMatchObject({
    code: expectedCode,
    message: expect.stringMatching(message),
  });
});

test.each([
  null,
  {},
  { ScanResult: "", format: 9 },
  { ScanResult: "00012345600012", format: "EAN_13" },
])("native iOS rejects malformed scan result %#", async (scanResult) => {
  const scanner = { scanBarcode: jest.fn().mockResolvedValue(scanResult) };
  await expect(createNativeIosBarcodeCamera({ scanner }).start()).rejects.toMatchObject({
    code: CAMERA_ERROR_CODES.DECODE,
    message: expect.stringMatching(/malformed barcode result/i),
  });
});

test("native iOS prevents simultaneous plugin scans", async () => {
  let finishScan;
  const scanner = {
    scanBarcode: jest.fn(() => new Promise((resolve) => { finishScan = resolve; })),
  };
  const camera = createNativeIosBarcodeCamera({ scanner });
  const first = camera.start();

  await expect(camera.start()).rejects.toMatchObject({ code: CAMERA_ERROR_CODES.BUSY });
  expect(scanner.scanBarcode).toHaveBeenCalledTimes(1);
  finishScan({ ScanResult: "00012345600012", format: 9 });
  await expect(first).resolves.toMatchObject({ status: BARCODE_CAMERA_RESULT_STATUS.DETECTED });
});

test("the platform adapter keeps web live scanning on the existing browser camera", async () => {
  const browserSession = { devices: [], stop: jest.fn() };
  const browserCamera = { start: jest.fn().mockResolvedValue(browserSession) };
  const scanner = { scanBarcode: jest.fn() };
  const camera = createTraceBarcodeCamera({
    runtime: { kind: RUNTIME_KINDS.WEB, platform: "web", isNative: false, isWeb: true },
    browserCamera,
    scanner,
  });
  const request = { facingMode: CAMERA_FACING_MODES.FRONT, videoElement: {} };

  await expect(camera.start(request)).resolves.toBe(browserSession);
  expect(browserCamera.start).toHaveBeenCalledWith(request);
  expect(scanner.scanBarcode).not.toHaveBeenCalled();
  expect(camera.isNativeIos()).toBe(false);
});

test.each([RUNTIME_KINDS.NATIVE_ANDROID, RUNTIME_KINDS.NATIVE_UNKNOWN])(
  "%s remains explicitly unsupported",
  async (kind) => {
    const scanner = { scanBarcode: jest.fn() };
    const camera = createTraceBarcodeCamera({
      runtime: { kind, platform: kind.replace("native-", ""), isNative: true, isWeb: false },
      scanner,
    });
    await expect(camera.start()).rejects.toMatchObject({ code: CAMERA_ERROR_CODES.UNSUPPORTED });
    expect(scanner.scanBarcode).not.toHaveBeenCalled();
  }
);
