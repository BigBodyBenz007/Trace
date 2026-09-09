import { normalizeGtin } from "./productIdentifiers";
import { barcodeFormats, createBarcodeReader, isExpectedDecodeMiss, loadBarcodeDecoder } from "./barcodeDecoder";

export const CAMERA_FACING_MODES = Object.freeze({
  REAR: "environment",
  FRONT: "user",
});

export const CAMERA_ERROR_CODES = Object.freeze({
  UNSUPPORTED: "unsupported",
  INSECURE: "insecure",
  DENIED: "denied",
  NOT_FOUND: "not-found",
  BUSY: "busy",
  DECODE: "decode",
  UNAVAILABLE: "unavailable",
});

function globalMediaDevices() {
  return typeof navigator === "undefined" ? null : navigator.mediaDevices;
}

function globalSecureContext() {
  return typeof window === "undefined" || window.isSecureContext !== false;
}

function cameraFailure(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function cameraErrorFor(error, facingMode = CAMERA_FACING_MODES.REAR) {
  if (error?.code && Object.values(CAMERA_ERROR_CODES).includes(error.code)) return error;
  const selectedCamera = facingMode === CAMERA_FACING_MODES.FRONT ? "front" : "rear";
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
    return cameraFailure(
      CAMERA_ERROR_CODES.DENIED,
      "Camera permission was denied. You can allow camera access in browser settings or enter the barcode manually.",
      error
    );
  }
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return cameraFailure(
      CAMERA_ERROR_CODES.NOT_FOUND,
      `The ${selectedCamera} camera could not be opened. Try another camera or enter the barcode manually.`,
      error
    );
  }
  if (error?.name === "NotReadableError" || error?.name === "AbortError") {
    return cameraFailure(
      CAMERA_ERROR_CODES.BUSY,
      "The camera is unavailable or already in use. Close other camera apps and try again, or enter the barcode manually.",
      error
    );
  }
  if (error?.name === "SecurityError") {
    return cameraFailure(
      CAMERA_ERROR_CODES.INSECURE,
      "Camera access requires a secure HTTPS connection. Enter the barcode manually instead.",
      error
    );
  }
  return cameraFailure(
    CAMERA_ERROR_CODES.UNAVAILABLE,
    "Trace could not start the camera. Try another camera or enter the barcode manually.",
    error
  );
}

function stopTracks(stream) {
  try {
    stream?.getTracks?.().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        // Every remaining track still gets a stop attempt.
      }
    });
  } catch (error) {
    // A partially initialized stream must remain safe to dispose.
  }
}

function cameraDevices(mediaDevices) {
  if (typeof mediaDevices?.enumerateDevices !== "function") return Promise.resolve([]);
  return mediaDevices.enumerateDevices()
    .then((devices) => devices
      .filter(({ kind, deviceId }) => kind === "videoinput" && deviceId)
      .map(({ deviceId, label }, index) => Object.freeze({
        deviceId,
        label: String(label || "").trim() || `Camera ${index + 1}`,
      })))
    .catch(() => []);
}

export function createBrowserBarcodeCamera({
  mediaDevices = globalMediaDevices(),
  secureContext = globalSecureContext(),
  loadDecoder = loadBarcodeDecoder,
} = {}) {
  async function start({
    videoElement,
    facingMode = CAMERA_FACING_MODES.REAR,
    deviceId = null,
    signal,
    onDetected,
    onDecodeError,
  } = {}) {
    if (!secureContext) {
      throw cameraFailure(
        CAMERA_ERROR_CODES.INSECURE,
        "Camera access requires a secure HTTPS connection. Enter the barcode manually instead."
      );
    }
    if (typeof mediaDevices?.getUserMedia !== "function") {
      throw cameraFailure(
        CAMERA_ERROR_CODES.UNSUPPORTED,
        "This browser does not provide camera access. Enter the barcode manually instead."
      );
    }
    if (!videoElement) {
      throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "The camera preview is not ready.");
    }

    let stream = null;
    let controls = null;
    let stopped = false;
    let controlsStopped = false;
    let tracksStopped = false;
    const stop = () => {
      stopped = true;
      signal?.removeEventListener?.("abort", stop);
      if (controls && !controlsStopped) {
        controlsStopped = true;
        try {
          controls.stop?.();
        } catch (error) {
          // Track shutdown below remains authoritative.
        }
      }
      if (stream && !tracksStopped) {
        tracksStopped = true;
        stopTracks(stream);
      }
      if (videoElement.srcObject === stream) videoElement.srcObject = null;
    };
    signal?.addEventListener?.("abort", stop, { once: true });

    try {
      if (signal?.aborted) throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "Camera start was canceled.");
      stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
          height: { ideal: 1080 },
          width: { ideal: 1920 },
        },
      });
      if (stopped || signal?.aborted) {
        stop();
        throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "Camera start was canceled.");
      }

      const decoder = await loadDecoder();
      if (stopped || signal?.aborted) throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "Camera start was canceled.");
      const Reader = decoder?.BrowserMultiFormatOneDReader;
      const BarcodeFormat = decoder?.BarcodeFormat;
      if (typeof Reader !== "function" || !BarcodeFormat) {
        throw cameraFailure(CAMERA_ERROR_CODES.DECODE, "Barcode decoding is unavailable. Enter the barcode manually instead.");
      }
      const track = stream.getVideoTracks?.()[0];
      try {
        if (track?.getCapabilities?.().focusMode?.includes("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        }
      } catch (error) {
        // Optional focus controls vary by browser; keep scanning if rejected.
      }
      if (stopped || signal?.aborted) throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "Camera start was canceled.");
      const reader = createBarcodeReader(decoder, { live: true });
      controls = await reader.decodeFromStream(stream, videoElement, (result, error) => {
        if (stopped) return;
        if (result) {
          const format = result.getBarcodeFormat?.();
          if (!barcodeFormats(decoder).includes(format)) return;
          const value = result.getText?.();
          const normalized = normalizeGtin(value);
          if (normalized) onDetected?.(normalized);
          else onDecodeError?.(cameraFailure(
            CAMERA_ERROR_CODES.DECODE,
            "That barcode is not a valid supported GTIN. Check the digits and try again."
          ));
          return;
        }
        if (error && !isExpectedDecodeMiss(error)) {
          onDecodeError?.(cameraFailure(
            CAMERA_ERROR_CODES.DECODE,
            "The barcode could not be read. Hold it steady in good light or enter it manually.",
            error
          ));
        }
      });
      if (stopped || signal?.aborted) {
        stop();
        throw cameraFailure(CAMERA_ERROR_CODES.UNAVAILABLE, "Camera start was canceled.");
      }

      return Object.freeze({
        devices: Object.freeze(await cameraDevices(mediaDevices)),
        facingMode,
        stop,
      });
    } catch (error) {
      stop();
      throw cameraErrorFor(error, facingMode);
    }
  }

  return Object.freeze({ start });
}

export const browserBarcodeCamera = createBrowserBarcodeCamera();
