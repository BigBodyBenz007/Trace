import { barcodeCanvas, barcodeFormats, createBarcodeReader, isExpectedDecodeMiss, loadBarcodeDecoder } from "./barcodeDecoder";
import { normalizeGtin } from "./productIdentifiers";

export const PHOTO_MESSAGES = Object.freeze({
  "not-found": "No barcode detected in this photo. Try a closer, sharper photo with the entire barcode visible and less glare.",
  unreadable: "This image is unreadable or unsupported. Try a JPEG, PNG, or another photo your browser can open.",
  "too-large": "This photo is too large to scan safely. Choose a smaller image (up to 25 MB and 64 megapixels).",
  unavailable: "Photo decoding is unavailable. Try again, or enter the barcode manually.",
});

function checkCanceled(signal) {
  if (signal?.aborted) throw new DOMException("Photo scan canceled.", "AbortError");
}

// Local object URL only: no upload, storage, data URL, or remote image request.
export function loadBarcodePhoto(file, signal) {
  return new Promise((resolve, reject) => {
    checkCanceled(signal);
    const url = URL.createObjectURL(file);
    const image = new Image();
    const dispose = () => {
      image.onload = image.onerror = null;
      signal?.removeEventListener("abort", abort);
      image.src = "";
      URL.revokeObjectURL(url);
    };
    const abort = () => {
      dispose();
      reject(new DOMException("Photo scan canceled.", "AbortError"));
    };
    image.onload = () => {
      signal?.removeEventListener("abort", abort);
      if (!image.naturalWidth || !image.naturalHeight) {
        dispose();
        reject(new Error(PHOTO_MESSAGES.unreadable));
        return;
      }
      resolve({ image, dispose });
    };
    image.onerror = () => {
      dispose();
      reject(new Error(PHOTO_MESSAGES.unreadable));
    };
    signal?.addEventListener("abort", abort, { once: true });
    // Modern Safari/Chrome apply EXIF orientation when decoding an HTML image.
    // Drawing it to canvas preserves that orientation without applying EXIF twice.
    image.src = url;
  });
}

export async function decodeBarcodePhoto(file, {
  signal,
  loadDecoder = loadBarcodeDecoder,
  loadImage = loadBarcodePhoto,
} = {}) {
  checkCanceled(signal);
  if (!file || !file.size || (file.type && !file.type.startsWith("image/"))
    || file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "")) {
    return { status: "unreadable" };
  }
  if (file.size > 25 * 1024 * 1024) return { status: "too-large" };
  let loaded;
  try {
    loaded = await loadImage(file, signal);
  } catch (error) {
    checkCanceled(signal);
    return { status: "unreadable" };
  }
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loaded.dispose();
  };
  signal?.addEventListener("abort", dispose, { once: true });
  try {
    checkCanceled(signal);
    if (loaded.image.naturalWidth * loaded.image.naturalHeight > 64 * 1024 * 1024) {
      return { status: "too-large" };
    }
    const decoder = await loadDecoder();
    checkCanceled(signal);
    const reader = createBarcodeReader(decoder);
    let invalidValue = null;
    // ZXing already tries each row forwards/backwards and converts to grayscale.
    // Multiple scales help small bars and mild blur; rotations help angled labels.
    for (const maxSide of [1600, 2600, 1000]) {
      for (const angle of [0, 90, -15, 15, 75, 105]) {
        for (const contrast of [false, true]) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          checkCanceled(signal);
          let canvas;
          try {
            canvas = barcodeCanvas(loaded.image, { maxSide, angle, contrast });
            const result = reader.decodeFromCanvas(canvas);
            if (!barcodeFormats(decoder).includes(result.getBarcodeFormat())) continue;
            const value = result.getText();
            if (normalizeGtin(value)) return { status: "found", value };
            invalidValue = value;
          } catch (error) {
            if (!isExpectedDecodeMiss(error)) throw error;
          } finally {
            if (canvas) canvas.width = canvas.height = 0;
          }
        }
      }
    }
    return invalidValue !== null ? { status: "invalid", value: invalidValue } : { status: "not-found" };
  } catch (error) {
    checkCanceled(signal);
    return { status: "unavailable" };
  } finally {
    signal?.removeEventListener("abort", dispose);
    dispose();
  }
}
