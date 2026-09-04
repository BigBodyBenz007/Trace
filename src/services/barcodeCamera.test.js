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
    constructor() {
      reader = this;
    }
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
    loadDecoder: jest.fn().mockResolvedValue({ BrowserMultiFormatOneDReader: Reader, BarcodeFormat }),
  });
  return {
    BarcodeFormat,
    camera,
    getUserMedia,
    get decodeCallback() { return decodeCallback; },
    get reader() { return reader; },
    stopDecoder,
    stopTrack,
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
  expect(harness.reader.possibleFormats).toEqual(["ean8", "ean13", "upca", "itf"]);
  expect(session.devices).toEqual([{ deviceId: "rear-id", label: "Rear camera" }]);
});

test("supports front and explicit device selection", async () => {
  const front = cameraHarness();
  await front.camera.start({ videoElement: {}, facingMode: CAMERA_FACING_MODES.FRONT });
  expect(front.getUserMedia.mock.calls[0][0].video.facingMode).toEqual({ ideal: "user" });

  const selected = cameraHarness();
  await selected.camera.start({ videoElement: {}, deviceId: "camera-2" });
  expect(selected.getUserMedia.mock.calls[0][0].video).toEqual({ deviceId: { exact: "camera-2" } });
});

test("accepts only normalized supported GTIN results and ignores UPC-E", async () => {
  const harness = cameraHarness();
  const onDetected = jest.fn();
  await harness.camera.start({ videoElement: {}, onDetected });

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
