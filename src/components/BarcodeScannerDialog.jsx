import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_ERROR_CODES,
  CAMERA_FACING_MODES,
  browserBarcodeCamera,
  cameraErrorFor,
} from "../services/barcodeCamera";
import { createBarcodeNutritionCandidate } from "../services/barcodeNutritionSelection";
import { normalizeGtin } from "../services/productIdentifiers";
import {
  APP_LIFECYCLE_PHASE,
  webAppLifecycleAdapter,
} from "../services/appLifecycleAdapter";
import { acquireDocumentScrollLock } from "../services/documentScrollLock";
import GroceryFoodForm from "./GroceryFoodForm";
import "./BarcodeScannerDialog.css";

const FOCUSABLE = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const NUTRIENT_ROWS = [
  ["calories", "Calories", ""],
  ["protein", "Protein", " g"],
  ["carbohydrates", "Carbohydrates", " g"],
  ["fat", "Fat", " g"],
  ["fiber", "Fiber", " g"],
  ["sodium", "Sodium", " mg"],
  ["totalSugar", "Total Sugar", " g"],
  ["addedSugar", "Added Sugar", " g"],
];

const LOOKUP_MESSAGES = Object.freeze({
  "not-found": "No matching product was found. You can save it as a custom food, scan again, or use normal food search.",
  invalid: "That barcode is not a valid supported GTIN. Check the digits and try again.",
  offline: "Trace is offline and has no usable cached result for this barcode.",
  "rate-limited": "Barcode providers are temporarily busy. Please try again later.",
  unavailable: "Remote barcode lookup is temporarily unavailable, so Trace cannot tell whether this product exists. You can enter it manually; verified Trace catalog barcodes still work.",
  unconfigured: "Remote barcode lookup is not configured here, so Trace cannot check providers. You can enter the food manually; verified Trace catalog barcodes still work.",
});

const AUTOMATIC_FALLBACK_ERROR_CODES = new Set([
  CAMERA_ERROR_CODES.NOT_FOUND,
  CAMERA_ERROR_CODES.BUSY,
  CAMERA_ERROR_CODES.UNAVAILABLE,
]);
const COMPACT_LANDSCAPE_MEDIA = "(orientation: landscape) and (max-height: 600px) and (max-width: 1000px) and (pointer: coarse)";

function availableScreenOrientation() {
  return typeof window === "undefined" ? null : window.screen?.orientation || null;
}

function nutrientValue(value, unit) {
  return value === null || value === undefined ? "Unknown" : `${value}${unit}`;
}

function missingLabel(field) {
  return field
    .replace(/^nutrients\./, "")
    .replace(/^serving\./, "serving ")
    .replace(/^provenance\./, "source ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default function BarcodeScannerDialog({
  access,
  barcodeLookup,
  camera = browserBarcodeCamera,
  lifecycleAdapter = webAppLifecycleAdapter,
  onClose,
  onUseFood,
  saveUserFood = () => ({ status: "error", food: null }),
  updateUserFood = () => ({ status: "error", food: null }),
  deleteUserFood = () => false,
  orientation = availableScreenOrientation(),
  reducedMotion = false,
}) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraState, setCameraState] = useState("idle");
  const [facingMode, setFacingMode] = useState(CAMERA_FACING_MODES.REAR);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [message, setMessage] = useState(access.message);
  const [errorMessage, setErrorMessage] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [lookupIdentifier, setLookupIdentifier] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const dialogRef = useRef(null);
  const contentRef = useRef(null);
  const videoRef = useRef(null);
  const sessionRef = useRef(null);
  const startAbortRef = useRef(null);
  const cameraStartPendingRef = useRef(false);
  const automaticStartAttemptedRef = useRef(false);
  const orientationLockAttemptedRef = useRef(false);
  const startCameraRef = useRef(null);
  const acceptedBarcodeRef = useRef(false);
  const pendingLookupRef = useRef(false);
  const mountedRef = useRef(true);
  const submitBarcodeRef = useRef(null);

  const releaseCamera = useCallback(() => {
    startAbortRef.current?.abort();
    startAbortRef.current = null;
    cameraStartPendingRef.current = false;
    sessionRef.current?.stop?.();
    sessionRef.current = null;
  }, []);

  const close = useCallback(() => {
    releaseCamera();
    onClose();
  }, [onClose, releaseCamera]);

  const submitBarcode = useCallback(async (rawValue) => {
    const barcode = normalizeGtin(rawValue);
    if (!barcode) {
      acceptedBarcodeRef.current = false;
      pendingLookupRef.current = false;
      setCandidate(null);
      setRecovery(null);
      setLookupIdentifier(null);
      setDeletePending(false);
      setErrorMessage(LOOKUP_MESSAGES.invalid);
      setMessage("");
      return;
    }
    if (acceptedBarcodeRef.current || pendingLookupRef.current) return;

    acceptedBarcodeRef.current = true;
    pendingLookupRef.current = true;
    releaseCamera();
    setCameraState("idle");
    setCandidate(null);
    setRecovery(null);
    setLookupIdentifier({ scheme: "gtin", value: barcode });
    setDeletePending(false);
    setErrorMessage("");
    setMessage("Looking up barcode…");
    setLookingUp(true);

    let result;
    try {
      result = await barcodeLookup.lookup(barcode);
    } catch (error) {
      result = { status: "unavailable", identifier: { scheme: "gtin", value: barcode }, food: null };
    }
    if (!mountedRef.current) return;

    const nextCandidate = createBarcodeNutritionCandidate(result);
    setLookingUp(false);
    pendingLookupRef.current = false;
    if (nextCandidate) {
      setCandidate(nextCandidate);
      setMessage(nextCandidate.canUse
        ? "Product found. Review it before using this food."
        : "Product found, but required nutrition is missing. Review the available information.");
      setErrorMessage("");
      return;
    }

    acceptedBarcodeRef.current = false;
    setMessage("");
    setErrorMessage(LOOKUP_MESSAGES[result?.status] || LOOKUP_MESSAGES.unavailable);
  }, [barcodeLookup, releaseCamera]);
  submitBarcodeRef.current = submitBarcode;

  const startCamera = useCallback(async ({
    nextFacingMode = facingMode,
    deviceId = null,
    allowAutomaticFallback = false,
  } = {}) => {
    if (cameraStartPendingRef.current || cameraState === "starting" || lookingUp) return;
    if (!allowAutomaticFallback) automaticStartAttemptedRef.current = true;
    releaseCamera();
    cameraStartPendingRef.current = true;
    acceptedBarcodeRef.current = false;
    setCandidate(null);
    setRecovery(null);
    setLookupIdentifier(null);
    setDeletePending(false);
    setErrorMessage("");
    setCameraState("starting");
    const controller = new AbortController();
    startAbortRef.current = controller;
    const attempts = [{ facingMode: nextFacingMode, deviceId }];
    let lastAttemptedFacingMode = nextFacingMode;
    if (
      allowAutomaticFallback
      && !deviceId
      && nextFacingMode === CAMERA_FACING_MODES.REAR
    ) {
      attempts.push({ facingMode: CAMERA_FACING_MODES.FRONT, deviceId: null });
    }

    try {
      let session = null;
      let successfulAttempt = attempts[0];
      for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index];
        lastAttemptedFacingMode = attempt.facingMode;
        setFacingMode(attempt.facingMode);
        setMessage(`Starting the ${attempt.facingMode === CAMERA_FACING_MODES.FRONT ? "front" : "rear"} camera…`);
        try {
          session = await camera.start({
            videoElement: videoRef.current,
            facingMode: attempt.facingMode,
            deviceId: attempt.deviceId,
            signal: controller.signal,
            onDetected: (value) => submitBarcodeRef.current?.(value),
            onDecodeError: (error) => {
              if (!mountedRef.current) return;
              setErrorMessage(cameraErrorFor(error, attempt.facingMode).message);
            },
          });
          successfulAttempt = attempt;
          break;
        } catch (error) {
          const cameraError = cameraErrorFor(error, attempt.facingMode);
          const canFallback = index === 0
            && attempts.length > 1
            && AUTOMATIC_FALLBACK_ERROR_CODES.has(cameraError.code);
          if (!canFallback) throw cameraError;
          setMessage("The rear camera is unavailable. Trying the front camera…");
        }
      }
      if (!mountedRef.current || controller.signal.aborted) {
        session?.stop?.();
        return;
      }
      sessionRef.current = session;
      startAbortRef.current = null;
      cameraStartPendingRef.current = false;
      setDevices(session.devices || []);
      setSelectedDeviceId(successfulAttempt.deviceId || "");
      setCameraState("active");
      setMessage("Camera active. Hold a supported product barcode inside the frame.");
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted) return;
      startAbortRef.current = null;
      cameraStartPendingRef.current = false;
      setCameraState("idle");
      setMessage("");
      setErrorMessage(cameraErrorFor(error, lastAttemptedFacingMode).message);
    }
  }, [camera, cameraState, facingMode, lookingUp, releaseCamera]);
  startCameraRef.current = startCamera;

  function resetForAnotherScan() {
    releaseCamera();
    acceptedBarcodeRef.current = false;
    pendingLookupRef.current = false;
    setLookingUp(false);
    setCandidate(null);
    setRecovery(null);
    setLookupIdentifier(null);
    setDeletePending(false);
    setErrorMessage("");
    setMessage("Ready for another barcode. Start a camera or enter the digits manually.");
    setCameraState("idle");
  }

  function beginRecovery() {
    if (!lookupIdentifier) return;
    releaseCamera();
    setCameraState("idle");
    setRecovery({
      ...(candidate?.recovery || {
        barcode: lookupIdentifier,
        food: null,
        providerSourceSnapshot: null,
      }),
      returnError: errorMessage,
    });
    setErrorMessage("");
    setMessage(candidate
      ? "Complete the missing product details, then save it for future scans."
      : "Enter the product details, then save it for future scans.");
  }

  function cancelRecovery() {
    if (!candidate && recovery?.returnError) setErrorMessage(recovery.returnError);
    setRecovery(null);
    setMessage(candidate
      ? "Product found, but required nutrition is missing. Review the available information."
      : "");
  }

  function finishRecovery(food) {
    const nextCandidate = createBarcodeNutritionCandidate({
      status: "found",
      identifier: food.identifiers[0],
      food,
    });
    setRecovery(null);
    setCandidate(nextCandidate);
    setDeletePending(false);
    setErrorMessage("");
    setMessage("Custom barcode food saved. Future scans will find it before remote providers.");
  }

  function removeCustomFood() {
    if (!candidate?.customFood) return;
    if (!deletePending) {
      setDeletePending(true);
      return;
    }
    if (!deleteUserFood(candidate.customFood.id)) {
      setErrorMessage("Trace could not delete this custom barcode food.");
      return;
    }
    acceptedBarcodeRef.current = false;
    setDeletePending(false);
    setCandidate(null);
    setMessage("Custom barcode food deleted. Looking up this barcode again will use the normal provider fallback.");
    setErrorMessage("");
  }

  function useFood() {
    if (!candidate?.canUse || !candidate.selection) return;
    const accepted = onUseFood(candidate.selection);
    if (accepted === false) {
      setErrorMessage("Trace could not populate the Nutrition form. Try normal food entry instead.");
      return;
    }
    close();
  }

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.querySelector(FOCUSABLE)?.focus();

    function keyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(dialog?.querySelectorAll(FOCUSABLE) || [])];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog?.addEventListener("keydown", keyDown);
    return () => {
      dialog?.removeEventListener("keydown", keyDown);
      previousFocus?.focus?.();
    };
  }, [close]);

  useEffect(() => {
    const unsubscribe = lifecycleAdapter.subscribe((event) => {
      if (![APP_LIFECYCLE_PHASE.BACKGROUND, APP_LIFECYCLE_PHASE.SUSPENDING].includes(event.phase)) return;
      if (!sessionRef.current && !startAbortRef.current) return;
      releaseCamera();
      if (!mountedRef.current) return;
      setCameraState("idle");
      setMessage("");
      setErrorMessage("The camera was stopped while Trace was in the background. Start it again when ready.");
    });
    return unsubscribe;
  }, [lifecycleAdapter, releaseCamera]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseCamera();
    };
  }, [releaseCamera]);

  useEffect(() => {
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const releaseLock = acquireDocumentScrollLock({ mode: "fixed", scrollX, scrollY });
    return () => {
      releaseLock();
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  useEffect(() => {
    if (typeof orientation?.lock !== "function") return undefined;
    let disposed = false;
    let acquired = false;
    const timer = window.setTimeout(() => {
      if (orientationLockAttemptedRef.current) return;
      orientationLockAttemptedRef.current = true;
      Promise.resolve()
        .then(() => orientation.lock("portrait"))
        .then(() => {
          acquired = true;
          if (disposed) {
            try {
              orientation.unlock?.();
            } catch (error) {
              // Orientation locking is best effort and must never block scanner cleanup.
            }
          }
        })
        .catch(() => {});
    }, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (acquired) {
        try {
          orientation.unlock?.();
        } catch (error) {
          // Orientation locking is best effort and must never block scanner cleanup.
        }
      }
    };
  }, [orientation]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (automaticStartAttemptedRef.current) return;
      automaticStartAttemptedRef.current = true;
      startCameraRef.current?.({
        nextFacingMode: CAMERA_FACING_MODES.REAR,
        allowAutomaticFallback: true,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cameraState !== "active") return undefined;
    const resetCompactLandscapeScroll = () => {
      if (
        typeof window.matchMedia !== "function"
        || !window.matchMedia(COMPACT_LANDSCAPE_MEDIA).matches
      ) return;
      if (contentRef.current) contentRef.current.scrollTop = 0;
    };
    resetCompactLandscapeScroll();
    window.addEventListener("orientationchange", resetCompactLandscapeScroll);
    return () => window.removeEventListener("orientationchange", resetCompactLandscapeScroll);
  }, [cameraState]);

  const alternateFacing = facingMode === CAMERA_FACING_MODES.REAR
    ? CAMERA_FACING_MODES.FRONT
    : CAMERA_FACING_MODES.REAR;
  const alternateLabel = alternateFacing === CAMERA_FACING_MODES.FRONT
    ? "Use Front Camera"
    : "Use Rear Camera";

  return (
    <div className="trace-barcode-dialog__backdrop">
      <section
        aria-describedby="trace-barcode-description"
        aria-labelledby="trace-barcode-title"
        aria-modal="true"
        className={`trace-barcode-dialog${reducedMotion ? " trace-barcode-dialog--reduced-motion" : ""}`}
        data-camera-state={cameraState}
        data-orientation-layout="responsive"
        data-mobile-safe="true"
        data-safe-area="top-and-bottom"
        ref={dialogRef}
        role="dialog"
      >
        <header className="trace-barcode-dialog__header">
          <div>
            <span className="trace-barcode-dialog__premium">{access.label}</span>
            <h2 id="trace-barcode-title">Scan a food barcode</h2>
          </div>
          <button aria-label="Close barcode scanner" className="trace-barcode-dialog__close" onClick={close} type="button">
            ×
          </button>
        </header>
        <div
          className="trace-barcode-dialog__content"
          data-scroll-container="internal"
          ref={contentRef}
        >
          <p id="trace-barcode-description">
            Camera access starts automatically after you choose Scan Barcode. Trace does not save or upload camera images.
          </p>

          <div className="trace-barcode-dialog__camera" data-camera-facing={facingMode}>
            <div className="trace-barcode-dialog__preview" hidden={cameraState === "idle"}>
            <video
              aria-label="Barcode camera preview"
              autoPlay
              muted
              playsInline
              ref={videoRef}
            />
            <span aria-hidden="true" className="trace-barcode-dialog__target" />
            </div>
            <div className="trace-barcode-dialog__camera-actions">
            {cameraState === "idle" ? (
              <button disabled={lookingUp} onClick={() => startCamera({ nextFacingMode: facingMode })} type="button">
                Start Camera
              </button>
            ) : (
              <button
                disabled={cameraState === "starting" || lookingUp}
                onClick={() => {
                  releaseCamera();
                  setCameraState("idle");
                  setMessage("Camera stopped. You can restart it or enter the barcode manually.");
                }}
                type="button"
              >
                Stop Camera
              </button>
            )}
            <button
              disabled={cameraState === "starting" || lookingUp}
              onClick={() => startCamera({ nextFacingMode: alternateFacing })}
              type="button"
            >
              {alternateLabel}
            </button>
            </div>
            {devices.length > 1 && cameraState === "active" && (
              <label>
                Camera device
                <select
                  value={selectedDeviceId}
                  onChange={(event) => startCamera({
                    nextFacingMode: facingMode,
                    deviceId: event.target.value,
                  })}
                >
                  <option value="">Automatic camera</option>
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

        <form
          className="trace-barcode-dialog__manual"
          onSubmit={(event) => {
            event.preventDefault();
            submitBarcode(manualBarcode);
          }}
        >
          <label>
            Enter barcode manually
            <input
              autoComplete="off"
              disabled={lookingUp}
              inputMode="numeric"
              onChange={(event) => {
                setManualBarcode(event.target.value);
                setErrorMessage("");
              }}
              placeholder="UPC, EAN, or GTIN"
              type="text"
              value={manualBarcode}
            />
          </label>
          <button disabled={lookingUp || !manualBarcode.trim()} type="submit">
            Look Up Barcode
          </button>
        </form>

        <div aria-atomic="true" aria-live="polite" className="trace-barcode-dialog__status" role="status">
          {lookingUp ? "Looking up barcode…" : message}
        </div>
        {errorMessage && <p className="trace-barcode-dialog__error" role="alert">{errorMessage}</p>}

        {!candidate && !recovery && lookupIdentifier && !lookingUp && errorMessage
          && errorMessage !== LOOKUP_MESSAGES.invalid && (
          <button onClick={beginRecovery} type="button">
            {errorMessage === LOOKUP_MESSAGES["not-found"]
              ? "Create This Food"
              : "Create This Food Manually"}
          </button>
        )}

        {recovery && (
          <GroceryFoodForm
            key={`${recovery.barcode.value}:${recovery.food?.id || "new"}`}
            identifier={recovery.barcode}
            initialFood={recovery.food}
            onCancel={cancelRecovery}
            onSaved={finishRecovery}
            providerSourceSnapshot={recovery.providerSourceSnapshot}
            recovery
            saveUserFood={saveUserFood}
            updateUserFood={updateUserFood}
          />
        )}

        {candidate && !recovery && (
          <article className="trace-barcode-dialog__product" aria-label="Barcode product review">
            <p className="trace-barcode-dialog__eyebrow">
              {candidate.canUse ? "Ready to review" : "Review required"}
            </p>
            <h3>{[candidate.display.brand, candidate.display.name].filter(Boolean).join(" · ")}</h3>
            {candidate.display.packageQuantity && <p>Package: {candidate.display.packageQuantity}</p>}
            <p>
              Nutrition shown for {candidate.display.servingDescription}
              {candidate.display.providerNutritionBasis === "100g" ? " (adapted from the provider's per-100g values)" : ""}.
            </p>
            {candidate.stale && (
              <p className="trace-barcode-dialog__unknowns">
                Offline cached result: this provider record is past Trace's normal cache age. Review it carefully.
              </p>
            )}
            <dl className="trace-barcode-dialog__nutrients">
              {NUTRIENT_ROWS.map(([key, label, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{nutrientValue(candidate.display.nutrients[key], unit)}</dd>
                </div>
              ))}
            </dl>
            {candidate.display.unknownFields.length > 0 && (
              <p className="trace-barcode-dialog__unknowns">
                Unknown or unpublished: {candidate.display.unknownFields.map(missingLabel).join(", ")}.
              </p>
            )}
            <p className="trace-barcode-dialog__source">
              Source: {candidate.display.attribution}
              {candidate.display.sourceUrl && (
                <> · <a href={candidate.display.sourceUrl} rel="noreferrer noopener" target="_blank">View source</a></>
              )}
            </p>
            {!candidate.canUse && (
              <p className="trace-barcode-dialog__error">
                Required nutrition is missing, so this product cannot populate an entry yet.
              </p>
            )}
            <div className="trace-barcode-dialog__review-actions">
              <button disabled={!candidate.canUse} onClick={useFood} type="button">Use This Food</button>
              {!candidate.canUse && candidate.recovery && (
                <button onClick={beginRecovery} type="button">Complete This Food</button>
              )}
              {candidate.customFood && (
                <>
                  <button onClick={beginRecovery} type="button">Edit Custom Food</button>
                  <button onClick={removeCustomFood} type="button">
                    {deletePending ? "Confirm Delete Custom Food" : "Delete Custom Food"}
                  </button>
                </>
              )}
              <button onClick={resetForAnotherScan} type="button">Scan Again</button>
            </div>
          </article>
        )}
        </div>
        <footer className="trace-barcode-dialog__footer">
          <button onClick={close} type="button">Return to Food Search</button>
        </footer>
      </section>
    </div>
  );
}
