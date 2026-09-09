import * as browser from "@zxing/browser";
import { BinaryBitmap, DecodeHintType, HybridBinarizer, NotFoundException, RGBLuminanceSource } from "@zxing/library";
import { barcodeCanvas, createBarcodeReader, isExpectedDecodeMiss } from "./barcodeDecoder";
import fixture from "./__fixtures__/barcode.json";

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
  const context = { fillRect: jest.fn(), translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: jest.fn() };
  const spy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  class Reader {
    decodeBitmap() {}
    decodeFromCanvas(canvas) { decoded.push(canvas); throw new Error("miss"); }
  }
  try {
    const reader = createBarcodeReader({ ...decoder, BrowserMultiFormatOneDReader: Reader }, { live: true });
    for (let i = 0; i < 5; i += 1) expect(() => reader.decodeFromCanvas({ width: 1920, height: 1080 })).toThrow("miss");
    expect(context.rotate.mock.calls.map(([angle]) => Math.round(angle * 180 / Math.PI))).toEqual([0, 0, 90, -15, 15]);
    expect(decoded.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  } finally {
    spy.mockRestore();
  }
});
