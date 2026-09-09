import { decodeBarcodePhoto, loadBarcodePhoto } from "./barcodePhoto";

function harness() {
  const decode = jest.fn(() => { throw Object.assign(new Error(), { name: "NotFoundException" }); });
  class Reader {
    decodeBitmap() {}
    decodeFromCanvas(canvas) { return decode(canvas); }
  }
  const context = {
    fillRect: jest.fn(), translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray([100, 100, 100, 255]) }), putImageData: jest.fn(),
  };
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  const dispose = jest.fn();
  const options = {
    loadImage: jest.fn().mockResolvedValue({ image: { naturalWidth: 4000, naturalHeight: 3000 }, dispose }),
    loadDecoder: jest.fn().mockResolvedValue({
      BrowserMultiFormatOneDReader: Reader,
      BarcodeFormat: { EAN_8: 1, EAN_13: 2, UPC_A: 3, ITF: 4 },
      DecodeHintType: { POSSIBLE_FORMATS: 1, TRY_HARDER: 2 },
    }),
  };
  const result = (value = "5901234123457") => ({ getBarcodeFormat: () => 2, getText: () => value });
  return { options, decode, result, context, dispose };
}

const photo = () => new File(["local image bytes"], "barcode.jpg", { type: "image/jpeg" });
afterEach(() => jest.restoreAllMocks());

test("decodes locally, releases image/canvas, and returns only digits for the shared lookup", async () => {
  const h = harness();
  let canvas;
  h.decode.mockImplementationOnce((value) => { canvas = value; return h.result(); });
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "found", value: "5901234123457" });
  expect(h.dispose).toHaveBeenCalledTimes(1);
  expect(canvas.width).toBe(0);
  expect(canvas.height).toBe(0);
});

test("tries bounded scales, grayscale contrast, and explicit rotations after misses", async () => {
  const h = harness();
  const sizes = [];
  h.decode.mockImplementation((canvas) => {
    sizes.push([canvas.width, canvas.height]);
    if (sizes.length === 15) return h.result();
    throw Object.assign(new Error(), { name: "NotFoundException" });
  });
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toMatchObject({ status: "found" });
  expect(sizes[0]).toEqual([1600, 1200]);
  expect(sizes[2]).toEqual([1200, 1600]);
  expect(sizes[12]).toEqual([2600, 1950]);
  expect(sizes.every(([w, h]) => Math.max(w, h) <= 2600)).toBe(true);
  expect(h.context.putImageData).toHaveBeenCalled();
  expect(h.dispose).toHaveBeenCalledTimes(1);
});

test("returns no barcode after all passes, and preserves invalid decoded digits for shared validation", async () => {
  const h = harness();
  h.decode.mockImplementation(() => { throw Object.assign(new Error(), { name: "e", getKind: () => "NotFoundException" }); });
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "not-found" });
  expect(h.decode).toHaveBeenCalledTimes(36);
  h.decode.mockReturnValue(h.result("1234"));
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "invalid", value: "1234" });
  expect(h.dispose).toHaveBeenCalledTimes(2);
});

test("rejects empty, non-image, SVG, and oversized files before loading", async () => {
  const h = harness();
  for (const file of [null, new File([], "empty.jpg"), new File(["x"], "a.txt", { type: "text/plain" }),
    new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })]) {
    await expect(decodeBarcodePhoto(file, h.options)).resolves.toEqual({ status: "unreadable" });
  }
  await expect(decodeBarcodePhoto({ type: "image/jpeg", size: 26 * 1024 * 1024 }, h.options))
    .resolves.toEqual({ status: "too-large" });
  expect(h.options.loadImage).not.toHaveBeenCalled();
});

test("distinguishes unreadable images from decoder unavailability and releases loaded images", async () => {
  const h = harness();
  h.options.loadImage.mockRejectedValueOnce(new Error("bad HEIC"));
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "unreadable" });
  h.options.loadDecoder.mockRejectedValueOnce(new Error("chunk unavailable"));
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "unavailable" });
  expect(h.dispose).toHaveBeenCalledTimes(1);
});

test("rejects an oversized pixel surface and releases it before loading the decoder", async () => {
  const h = harness();
  h.options.loadImage.mockResolvedValue({ image: { naturalWidth: 12000, naturalHeight: 9000 }, dispose: h.dispose });
  await expect(decodeBarcodePhoto(photo(), h.options)).resolves.toEqual({ status: "too-large" });
  expect(h.options.loadDecoder).not.toHaveBeenCalled();
  expect(h.dispose).toHaveBeenCalledTimes(1);
});

test("cancels between decoding passes and releases resources without returning a result", async () => {
  const h = harness();
  const controller = new AbortController();
  h.decode.mockImplementationOnce(() => {
    controller.abort();
    throw Object.assign(new Error(), { name: "NotFoundException" });
  });
  await expect(decodeBarcodePhoto(photo(), { ...h.options, signal: controller.signal }))
    .rejects.toMatchObject({ name: "AbortError" });
  expect(h.decode).toHaveBeenCalledTimes(1);
  expect(h.dispose).toHaveBeenCalledTimes(1);
});

test("canceling during decoder loading releases the image immediately and ignores the late decoder", async () => {
  const h = harness();
  let resolveDecoder;
  let decoderStarted;
  const started = new Promise((resolve) => { decoderStarted = resolve; });
  h.options.loadDecoder.mockImplementation(() => new Promise((resolve) => {
    resolveDecoder = resolve;
    decoderStarted();
  }));
  const controller = new AbortController();
  const pending = decodeBarcodePhoto(photo(), { ...h.options, signal: controller.signal });
  const canceled = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await started;
  controller.abort();
  expect(h.dispose).toHaveBeenCalledTimes(1);
  resolveDecoder({});
  await canceled;
  expect(h.decode).not.toHaveBeenCalled();
  expect(h.dispose).toHaveBeenCalledTimes(1);
});

test.each(["load", "error", "abort"])("local image %s revokes its object URL", async (outcome) => {
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const NativeImage = global.Image;
  let image;
  global.Image = class {
    constructor() { image = this; this.naturalWidth = 1200; this.naturalHeight = 900; }
  };
  URL.createObjectURL = jest.fn(() => "blob:local-barcode");
  URL.revokeObjectURL = jest.fn();
  const controller = new AbortController();
  try {
    const pending = loadBarcodePhoto(photo(), controller.signal);
    expect(image.src).toBe("blob:local-barcode");
    if (outcome === "load") {
      image.onload();
      const loaded = await pending;
      expect(loaded.image).toBe(image);
      loaded.dispose();
    } else {
      if (outcome === "error") image.onerror();
      else controller.abort();
      await expect(pending).rejects.toThrow();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-barcode");
    expect(image.src).toBe("");
  } finally {
    global.Image = NativeImage;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});
