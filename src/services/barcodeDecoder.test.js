import * as browser from "@zxing/browser";
import { BinaryBitmap, DecodeHintType, HybridBinarizer, NotFoundException, RGBLuminanceSource } from "@zxing/library";
import { barcodeCanvas, createBarcodeReader, isExpectedDecodeMiss } from "./barcodeDecoder";
import fixture from "./__fixtures__/barcode.json";
import { canonicalGtinKey } from "./productIdentifiers";

const decoder = { ...browser, DecodeHintType };

test("recognizes ordinary decode misses even when production minifies error names", () => {
  const miss = new NotFoundException();
  Object.defineProperty(miss, "name", { value: "e" });
  expect(isExpectedDecodeMiss(miss)).toBe(true);
  expect(isExpectedDecodeMiss(new TypeError("canvas failure"))).toBe(false);
});

test("the real reader limits formats at construction and finds a short off-center barcode", () => {
  const reader = createBarcodeReader(decoder);
  // A short barcode at the edge is outside the old reader's central scan rows.
  const width = 500;
  const height = 400;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  for (let y = 8; y < 20; y += 1) {
    for (let bit = 0; bit < fixture.bars.length; bit += 1) {
      if (fixture.bars[bit] === "1") pixels.fill(0, y * width + 50 + bit * 4, y * width + 54 + bit * 4);
    }
  }
  const bitmap = () => new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)));
  expect(() => new browser.BrowserMultiFormatOneDReader().decodeBitmap(bitmap())).toThrow();
  const result = reader.decodeBitmap(bitmap());
  expect(result.getText()).toBe(fixture.value);
  expect(result.getBarcodeFormat()).toBe(browser.BarcodeFormat.EAN_13);
  // Avoid the broad default set, including Code 128, RSS, and unsupported UPC-E.
  expect(reader.reader.readers.map((internal) => internal.constructor.name)).toEqual(["MultiFormatUPCEANReader", "ITFReader"]);
});

test("explicit canvas rotation swaps non-square dimensions and bounds upscaling", () => {
  const context = { fillRect: jest.fn(), translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn() };
  const spy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  try {
    const canvas = barcodeCanvas({ width: 1200, height: 600 }, { angle: 90, maxSide: 1600 });
    expect([canvas.width, canvas.height]).toEqual([800, 1600]);
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    const small = barcodeCanvas({ width: 200, height: 100 }, { maxSide: 2600 });
    expect([small.width, small.height]).toEqual([400, 200]);
  } finally {
    spy.mockRestore();
  }
});

test("live frames rotate across passes and release transformed canvases even on a miss", () => {
  const decoded = [];
  const contrastAngles = [];
  const context = { fillRect: jest.fn(), translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn(),
    getImageData: () => {
      contrastAngles.push(Math.round(context.rotate.mock.calls.at(-1)[0] * 180 / Math.PI));
      return { data: new Uint8ClampedArray(4) };
    }, putImageData: jest.fn() };
  const spy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  class Reader {
    decodeBitmap() {}
    decodeFromCanvas(canvas) { decoded.push(canvas); throw new Error("miss"); }
  }
  try {
    const reader = createBarcodeReader({ ...decoder, BrowserMultiFormatOneDReader: Reader }, { live: true });
    for (let i = 0; i < 5; i += 1) expect(() => reader.decodeFromCanvas({ width: 1920, height: 1080 })).toThrow("miss");
    expect(context.rotate.mock.calls.map(([angle]) => Math.round(angle * 180 / Math.PI))).toEqual([0, 0, 90, -15, 15]);
    expect(contrastAngles).toEqual([0]);
    expect(decoded.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  } finally {
    spy.mockRestore();
  }
});

test("live decoding uses current video pixels after resolution changes, rather than the stale capture canvas", () => {
  const sizes = [];
  const context = { fillRect: jest.fn(), translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: jest.fn() };
  const spy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  class Reader {
    decodeBitmap() {}
    decodeFromCanvas(canvas) { sizes.push([canvas.width, canvas.height]); }
  }
  try {
    const videoElement = { videoWidth: 360, videoHeight: 600 };
    const reader = createBarcodeReader({ ...decoder, BrowserMultiFormatOneDReader: Reader }, { live: true, videoElement });
    const staleCanvas = { width: 360, height: 600 };
    reader.decodeFromCanvas(staleCanvas);
    videoElement.videoWidth = 900;
    reader.decodeFromCanvas(staleCanvas);
    expect(sizes).toEqual([[720, 1200], [1800, 1200]]);
    expect(context.drawImage.mock.calls.every(([source]) => source === videoElement)).toBe(true);
    expect(staleCanvas.width).toBe(360);
  } finally {
    spy.mockRestore();
  }
});

test.each(["044000045586", "0044000045586", fixture.value])(
  "the real decoder recognizes UPC/EAN bars for %s and preserves canonical lookup identity",
  (value) => {
    const ean = value.padStart(13, "0");
    const left = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
    // UPC-A and its leading-zero EAN-13 representation have identical bars.
    const bars = ean[0] === "0"
      ? "101" + [...ean.slice(1, 7)].map((digit) => left[digit]).join("") + "01010"
        + [...ean.slice(7)].map((digit) => [...left[digit]].map((bit) => bit === "1" ? "0" : "1").join("")).join("") + "101"
      : fixture.bars;
    const width = 500;
    const height = 180;
    const pixels = new Uint8ClampedArray(width * height).fill(255);
    for (let y = 30; y < 150; y += 1) {
      for (let bit = 0; bit < bars.length; bit += 1) {
        if (bars[bit] === "1") pixels.fill(0, y * width + 60 + bit * 4, y * width + 64 + bit * 4);
      }
    }
    const result = createBarcodeReader(decoder).decodeBitmap(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height))));
    expect(canonicalGtinKey(result.getText())).toBe(canonicalGtinKey(value));
    expect(result.getBarcodeFormat()).toBe(ean[0] === "0" ? browser.BarcodeFormat.UPC_A : browser.BarcodeFormat.EAN_13);

    // Real decoder regression: these two gray levels need the existing contrast
    // transform. Live scanning must offer it without rotating a short barcode.
    const muted = pixels.map((value) => value === 0 ? 112 : 128);
    const bitmap = (data) => new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(data, width, height)));
    expect(() => createBarcodeReader(decoder).decodeBitmap(bitmap(muted))).toThrow();
    const enhanced = muted.map((value) => Math.max(0, Math.min(255, (value - 128) * 1.6 + 128)));
    expect(canonicalGtinKey(createBarcodeReader(decoder).decodeBitmap(bitmap(enhanced)).getText())).toBe(canonicalGtinKey(value));
  }
);
