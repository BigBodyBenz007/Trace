// Both camera frames and selected photos use the same local ZXing reader.
export async function loadBarcodeDecoder() {
  const [browser, core] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  return { ...browser, DecodeHintType: core.DecodeHintType };
}

export function isExpectedDecodeMiss(error) {
  // ZXing's error.name follows the constructor name, which production builds
  // minify. Its public getKind() retains the stable exception identifier.
  const kind = typeof error?.getKind === "function" ? error.getKind() : error?.name;
  return ["NotFoundException", "ChecksumException", "FormatException"].includes(kind);
}

export function barcodeFormats({ BarcodeFormat }) {
  return [BarcodeFormat.EAN_8, BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.ITF];
}

// Preserve quiet zones, bound memory, and rotate the actual pixels/dimensions.
export function barcodeCanvas(source, { maxSide = 1920, angle = 0, contrast = false } = {}) {
  const width = source.naturalWidth || source.videoWidth || source.width;
  const height = source.naturalHeight || source.videoHeight || source.height;
  const radians = angle * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const scale = Math.min(2, maxSide / Math.max(width * cos + height * sin, width * sin + height * cos));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((width * cos + height * sin) * scale));
  canvas.height = Math.max(1, Math.round((width * sin + height * cos) * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing is unavailable.");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(source, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
  if (contrast) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114;
      const value = Math.max(0, Math.min(255, (gray - 128) * 1.6 + 128));
      pixels.data[i] = value;
      pixels.data[i + 1] = value;
      pixels.data[i + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
  }
  return canvas;
}

export function createBarcodeReader(decoder, { live = false } = {}) {
  const { BrowserMultiFormatOneDReader: Reader, DecodeHintType } = decoder;
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, barcodeFormats(decoder)],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  // OneDReader chooses its internal readers at construction, not in the formats setter.
  const reader = new Reader(hints, { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 500 });
  const decodeBitmap = reader.decodeBitmap.bind(reader);
  reader.decodeBitmap = (bitmap) => {
    // @zxing/browser 0.2.1 rotates the luminance buffer without swapping its
    // dimensions. Disable that path; our canvas passes handle rotation safely.
    bitmap.isRotateSupported = () => false;
    return decodeBitmap(bitmap);
  };
  if (live) {
    const decodeCanvas = reader.decodeFromCanvas.bind(reader);
    let frame = 0;
    reader.decodeFromCanvas = (canvas) => {
      // One bounded pass per frame keeps the existing cancellable scan loop.
      const angle = [0, 0, 90, -15, 15][frame++ % 5];
      const transformed = barcodeCanvas(canvas, { angle, contrast: frame % 5 === 0 });
      try {
        return decodeCanvas(transformed);
      } finally {
        transformed.width = transformed.height = 0;
      }
    };
  }
  return reader;
}
