import { useCallback, useEffect, useRef, useState } from "react";
import {
  BARCODE_CAMERA_RESULT_STATUS,
  CAMERA_ERROR_CODES,
  CAMERA_FACING_MODES,
  cameraErrorFor,
  traceBarcodeCamera,
} from "../services/barcodeCamera";
import { createBarcodeNutritionCandidate } from "../services/barcodeNutritionSelection";
import { normalizeGtin } from "../services/productIdentifiers";
import { decodeBarcodePhoto, PHOTO_MESSAGES } from "../services/barcodePhoto";
import {
  APP_LIFECYCLE_PHASE,
  webAppLifecycleAdapter,
} from "../services/appLifecycleAdapter";
import { acquireDocumentScrollLock } from "../services/documentScrollLock";
import { createPersonalPackageLabelDraft } from '../services/personalPackageLabelCandidate';
import PersonalPackageLabelEditor, { LabelPhoto } from './PersonalPackageLabelEditor';
import SharedLabelSubmission from './SharedLabelSubmission';
import { getReviewedLabels, reviewedVersionStillActive } from '../services/sharedPackageLabels';
import { personalLabelsFor, readPersonalLabels, removePersonalLabel } from '../services/personalPackageLabels';
import GroceryFoodForm from "./GroceryFoodForm";
import BarcodeIngredients from "./BarcodeIngredients";
import { shouldLoadBarcodeGrading } from "../development/barcodeGradingMode";
import { formatNutrientValue } from "../services/nutritionDisplay";
import "./BarcodeScannerDialog.css";

const FOCUSABLE = [
  "textarea:not([disabled])",
  "summary",
  "button:not([disabled])",
  "input:not([disabled]):not([hidden])",
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
  camera = traceBarcodeCamera,
  decodePhoto = decodeBarcodePhoto,
  lifecycleAdapter = webAppLifecycleAdapter,
  onClose,
  onUseFood,
  saveUserFood = () => ({ status: "error", food: null }),
  updateUserFood = () => ({ status: "error", food: null }),
  deleteUserFood = () => false,
  orientation = availableScreenOrientation(),
  reducedMotion = false,
}) {
  const grading = shouldLoadBarcodeGrading(process.env.NODE_ENV)
    ? require('../development/BarcodeNutritionReview') : null;
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraState, setCameraState] = useState("idle");
  const [facingMode, setFacingMode] = useState(CAMERA_FACING_MODES.REAR);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [labelEditor, setLabelEditor] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [labelChoices, setLabelChoices] = useState([]);
  const [reviewedChoices,setReviewedChoices]=useState([]);
  const [confirmReviewed,setConfirmReviewed]=useState(null);
  const [checkingReviewed,setCheckingReviewed]=useState(false);
  const [message, setMessage] = useState(access.message);
  const [errorMessage, setErrorMessage] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [decodingPhoto, setDecodingPhoto] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [lookupIdentifier, setLookupIdentifier] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const dialogRef = useRef(null);
  const contentRef = useRef(null);
  const videoRef = useRef(null);
  const photoInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const photoAbortRef = useRef(null);
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
  const nativeScanReturnFocusRef = useRef(null);
  const nativeFocusTimerRef = useRef(null);
  const nativeIos = camera.isNativeIos?.() === true;

  const restoreNativeScannerFocus = useCallback(() => {
    if (!nativeIos) return;
    const requestedTarget = nativeScanReturnFocusRef.current;
    nativeScanReturnFocusRef.current = null;
    if (nativeFocusTimerRef.current !== null) window.clearTimeout(nativeFocusTimerRef.current);
    nativeFocusTimerRef.current = window.setTimeout(() => {
      nativeFocusTimerRef.current = null;
      if (!mountedRef.current) return;
      const target = requestedTarget?.isConnected && !requestedTarget.disabled
        ? requestedTarget
        : dialogRef.current?.querySelector(FOCUSABLE);
      target?.focus?.();
    }, 0);
  }, [nativeIos]);

  const releaseCamera = useCallback(() => {
    startAbortRef.current?.abort();
    startAbortRef.current = null;
    cameraStartPendingRef.current = false;
    sessionRef.current?.stop?.();
    sessionRef.current = null;
  }, []);

  const close = useCallback(() => {
    mountedRef.current = false;
    if (nativeFocusTimerRef.current !== null) window.clearTimeout(nativeFocusTimerRef.current);
    photoAbortRef.current?.abort();
    releaseCamera();
    onClose();
  }, [onClose, releaseCamera]);

  const submitBarcode = useCallback(async (rawValue) => {
    if (!mountedRef.current || acceptedBarcodeRef.current || pendingLookupRef.current) return;
    automaticStartAttemptedRef.current = true;
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
    acceptedBarcodeRef.current = true;
    pendingLookupRef.current = true;
    releaseCamera();
    setCameraState("idle");
    setCandidate(null);
    setRecovery(null);
    setLookupIdentifier({ scheme: "gtin", value: barcode });
    setDeletePending(false);
    setErrorMessage("");
    setMessage("Barcode found. Looking up product…");
    setLookingUp(true);

    let result;
    try {
      result = grading
        ? await barcodeLookup.lookup(barcode, { assess: grading.assessLookupForGrading })
        : await barcodeLookup.lookup(barcode);
    } catch (error) {
      result = { status: "unavailable", identifier: { scheme: "gtin", value: barcode }, food: null };
    }
    if (!mountedRef.current) return;

    let resolved = result;
    try { resolved = personalLabelsFor(result,readPersonalLabels()); }
    catch (error) { resolved = {...result,personalLabelWarning:error.message}; }
    setLookupResult(resolved);
    setLabelChoices(resolved.personalLabelChoices || []);
    setReviewedChoices(resolved.reviewedLabelChoices || []);setConfirmReviewed(null);
    const nextCandidate = createBarcodeNutritionCandidate(resolved);
    setLookingUp(false);
    pendingLookupRef.current = false;
    if (nextCandidate) {
      setCandidate(nextCandidate);
      setMessage(nextCandidate.canUse
        ? "Product found. Review it before using this food."
        : "Product found, but required nutrition is missing. Review the available information.");
      setErrorMessage(resolved.personalLabelWarning || "");
      return;
    }

    acceptedBarcodeRef.current = false;
    setMessage("");
    setErrorMessage(LOOKUP_MESSAGES[result?.status] || LOOKUP_MESSAGES.unavailable);
  }, [barcodeLookup, releaseCamera, grading]);
  submitBarcodeRef.current = submitBarcode;

  const startCamera = useCallback(async ({
    nextFacingMode = facingMode,
    deviceId = null,
    allowAutomaticFallback = false,
  } = {}) => {
    if (cameraStartPendingRef.current || cameraState === "starting" || lookingUp || photoAbortRef.current) return;
    if (!allowAutomaticFallback) automaticStartAttemptedRef.current = true;
    if (nativeIos && !nativeScanReturnFocusRef.current) {
      nativeScanReturnFocusRef.current = document.activeElement;
    }
    releaseCamera();
    cameraStartPendingRef.current = true;
    acceptedBarcodeRef.current = false;
    setCandidate(null);
    setLabelEditor(null);
    setLabelChoices([]);
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
            onDetected: (value) => {
              if (!controller.signal.aborted && mountedRef.current) submitBarcodeRef.current?.(value);
            },
            onDecodeError: (error) => {
              if (!mountedRef.current || controller.signal.aborted) return;
              setErrorMessage(cameraErrorFor(error, attempt.facingMode).message);
            },
          });
          successfulAttempt = attempt;
          break;
        } catch (error) {
          if (controller.signal.aborted) return;
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
      if (session?.native) {
        startAbortRef.current = null;
        cameraStartPendingRef.current = false;
        setDevices([]);
        setSelectedDeviceId("");
        setFacingMode(successfulAttempt.facingMode);
        setCameraState("idle");
        if (session.status === BARCODE_CAMERA_RESULT_STATUS.CANCELED) {
          setErrorMessage("");
          setMessage("Barcode scan canceled. Choose a camera, scan a photo, or enter the digits manually.");
          restoreNativeScannerFocus();
          return;
        }
        if (session.status === BARCODE_CAMERA_RESULT_STATUS.DETECTED) {
          setErrorMessage("");
          setMessage("Barcode detected. Checking the product...");
          restoreNativeScannerFocus();
          submitBarcodeRef.current?.(session.value);
          return;
        }
      }
      sessionRef.current = session;
      cameraStartPendingRef.current = false;
      setDevices(session.devices || []);
      setSelectedDeviceId(successfulAttempt.deviceId || "");
      setCameraState("active");
      setMessage("Camera active. Fill the frame with the whole barcode, hold steady, and tilt the package to reduce glare. Try Scan from Photo if it is hard to read.");
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted) return;
      startAbortRef.current = null;
      cameraStartPendingRef.current = false;
      setCameraState("idle");
      setMessage("");
      setErrorMessage(cameraErrorFor(error, lastAttemptedFacingMode).message);
      restoreNativeScannerFocus();
    }
  }, [camera, cameraState, facingMode, lookingUp, nativeIos, releaseCamera, restoreNativeScannerFocus]);
  startCameraRef.current = startCamera;

  function resetForAnotherScan() {
    photoAbortRef.current?.abort();
    photoAbortRef.current = null;
    setDecodingPhoto(false);
    releaseCamera();
    acceptedBarcodeRef.current = false;
    pendingLookupRef.current = false;
    setLookingUp(false);
    setCandidate(null);
    setRecovery(null);
    setLookupIdentifier(null);
    setDeletePending(false);
    setErrorMessage("");
    setMessage("Ready for another barcode. Start a camera, scan a photo, or enter the digits manually.");
    setCameraState("idle");
  }

  function choosePhoto(capture = false) {
    automaticStartAttemptedRef.current = true;
    releaseCamera();
    setCameraState("idle");
    setErrorMessage("");
    setMessage("Choose or take a photo of one barcode. You can restart the camera if you cancel.");
    (capture ? captureInputRef : photoInputRef).current?.click();
  }

  async function scanPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // Permit the exact same file after failure or cancellation.
    if (!file || pendingLookupRef.current) return;
    automaticStartAttemptedRef.current = true;
    resetForAnotherScan();
    const controller = new AbortController();
    photoAbortRef.current = controller;
    setDecodingPhoto(true);
    setMessage("Reading photo on this device…");
    try {
      const result = await decodePhoto(file, { signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      if (result.status === "found" || result.status === "invalid") {
        await submitBarcodeRef.current?.(result.value);
      } else {
        setMessage("");
        setErrorMessage(PHOTO_MESSAGES[result.status] || PHOTO_MESSAGES.unavailable);
      }
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setMessage("");
      setErrorMessage(PHOTO_MESSAGES.unavailable);
    } finally {
      if (mountedRef.current && photoAbortRef.current === controller) {
        photoAbortRef.current = null;
        setDecodingPhoto(false);
      }
    }
  }

  function beginRecovery() {
    if (candidate?.personalLabel) { setLabelEditor({newVersion:false}); return; }
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

  function chooseLabel(profile) {
    setCandidate(createBarcodeNutritionCandidate({...lookupResult,reviewedLabel:undefined, ...(profile?.providerObservation ? {food:profile.providerObservation,status:"found"} : {}), personalLabel:profile}));
    setLabelEditor(null);
    setErrorMessage(profile ? "" : (LOOKUP_MESSAGES[lookupResult?.status] || ""));
  }
  async function refreshReviewedChoices() {
    setCheckingReviewed(true);setErrorMessage("");
    try {const result=await getReviewedLabels(lookupIdentifier.value);setReviewedChoices(result.versions);
      setMessage(result.versions.length?"Choose a reviewed package edition only if its identity and panel match your package.":"No active shared edition is available. Your personal label remains separate.");}
    catch(error){setErrorMessage(error.message);}finally{setCheckingReviewed(false);}
  }
  function chooseReviewedVersion(version) {
    setCandidate(createBarcodeNutritionCandidate({...lookupResult,personalLabel:undefined,reviewedLabel:version}));
    setConfirmReviewed(null);setLabelEditor(null);document.querySelectorAll(".trace-reviewed-editions").forEach(element=>{element.open=false;});setMessage("Using the package edition you selected. Reviewed by Trace does not guarantee a current package match.");setErrorMessage("");
  }
  function savedLabel(profile) {
    setLabelChoices(readPersonalLabels().filter(p=>p.status==="active" && p.barcode.replace(/^0+/,"")===lookupIdentifier.value.replace(/^0+/,"")));
    chooseLabel(profile);setMessage("Your confirmed label is saved on this device. Future matching scans can use it.");
  }
  function removeLabel() {
    try { removePersonalLabel(candidate.personalLabel.id);
      setLabelChoices(labelChoices.filter(p=>p.id!==candidate.personalLabel.id));
      setCandidate(createBarcodeNutritionCandidate({...lookupResult,personalLabel:undefined}));
      setErrorMessage(lookupResult?.food ? "" : LOOKUP_MESSAGES[lookupResult?.status] || LOOKUP_MESSAGES.unavailable);
      setMessage("Personal correction removed from future scans. Previous entries and label history are unchanged.");
    } catch(error) { setErrorMessage(error.message); }
  }
  async function useFood() {
    if (!candidate?.canUse || !candidate.selection || checkingReviewed) return;
    if(candidate.reviewedLabel){
      setCheckingReviewed(true);
      try {if(!await reviewedVersionStillActive({id:candidate.reviewedLabel.id,panel:candidate.reviewedLabel})) {setErrorMessage("This shared edition was withdrawn. Choose provider information or your personal label.");return;}}
      catch {setErrorMessage("Shared edition status could not be checked. Choose provider information or your personal label; previous entries are unchanged.");return;}
      finally {setCheckingReviewed(false);}
    }
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
      if (photoAbortRef.current && !pendingLookupRef.current) {
        photoAbortRef.current.abort();
        photoAbortRef.current = null;
        setDecodingPhoto(false);
        setMessage("Photo scan canceled while Trace was in the background. Choose the photo again when ready.");
      }
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
      if (nativeFocusTimerRef.current !== null) window.clearTimeout(nativeFocusTimerRef.current);
      photoAbortRef.current?.abort();
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

  const loggingMissing = candidate && NUTRIENT_ROWS.slice(0, 4)
    .filter(([key]) => candidate.display.nutrients[key] == null).map(([, label]) => label.toLowerCase());
  const loggingReason = candidate && !candidate.canUse
    ? loggingMissing.length ? `Needed to log: ${loggingMissing.join(', ')} per serving.`
      : 'A usable labeled serving is needed to log this food.' : null;
  const reviewActions = candidate && (
    <div className="trace-barcode-dialog__review-actions">
      {candidate.canUse && <button onClick={useFood} type="button">Use This Food</button>}
      {!candidate.canUse && candidate.recovery && (
        <button onClick={beginRecovery} type="button">Complete This Food</button>
      )}
      <button onClick={resetForAnotherScan} type="button">Scan Again</button>
    </div>
  );

  const sharedPackageChooser = <details className="trace-package-label-evidence trace-reviewed-editions"><summary>Trace-reviewed package editions</summary>
    <p>Your personal label stays separate and takes precedence. Reviewed editions require a package match; barcode alone cannot establish the edition. Shared editions are checked online, not reused offline.</p>
    <button type="button" disabled={checkingReviewed} onClick={refreshReviewedChoices}>Refresh reviewed editions</button>
    {reviewedChoices.map(version=><div key={version.id}><p><strong>{version.panel.brand} - {version.panel.name}</strong> - {version.panel.variant} - {version.panel.packageDescription}. Serving: {version.panel.serving.description}. Reviewed {new Date(version.publishedAt).toLocaleDateString()}.</p>
      <button type="button" disabled={checkingReviewed} onClick={()=>setConfirmReviewed(version)}>Compare this package edition</button></div>)}
    {confirmReviewed&&<div><p>Compare with your package: {confirmReviewed.panel.name}, {confirmReviewed.panel.variant}, {confirmReviewed.panel.packageDescription}; {confirmReviewed.panel.serving.description}.</p>
      <dl>{NUTRIENT_ROWS.map(([k,label,suffix])=><div key={k}><dt>{label}</dt><dd>{confirmReviewed.panel.nutrients[k]===null?"Unknown":confirmReviewed.panel.nutrients[k]+suffix}</dd></div>)}</dl>
      <p>{confirmReviewed.panel.ingredientsConfirmed?confirmReviewed.panel.ingredients:"Ingredients were not confirmed; no previous ingredient edition will be carried over."}</p>
      <p>Owner review does not certify authenticity. Choose this only after matching the product, variant, package and panel.</p>
      <button type="button" onClick={()=>chooseReviewedVersion(confirmReviewed)}>My package matches - use this edition</button><button type="button" onClick={()=>setConfirmReviewed(null)}>Cancel</button></div>}
    {candidate?.reviewedLabel&&<button type="button" onClick={()=>chooseLabel(undefined)}>Use provider information instead</button>}
  </details>;
  const savedPackageChooser = labelChoices.length > 0 && <details className="trace-package-label-evidence"><summary>{candidate?.personalLabel ? "Your saved package labels" : "Choose your saved package version"}</summary>
              <p>Package editions can share a barcode. Choose the label matching your package. Labels stay on this device.</p>
              {labelChoices.map(p=><button type="button" key={p.id} onClick={()=>chooseLabel(p)}>Use {p.variant} / {p.packageDescription} / {new Date(p.confirmedAt).toLocaleDateString()}</button>)}
              <button type="button" onClick={()=>setLabelEditor({newVersion:true})}>Add another package version</button>
              {lookupResult?.food && <button type="button" onClick={()=>chooseLabel(undefined)}>Use provider information for this scan</button>}
            </details>;

  return (
    <div className="trace-barcode-dialog__backdrop">
      <section
        aria-describedby="trace-barcode-description"
        aria-labelledby="trace-barcode-title"
        aria-modal="true"
        className={`trace-barcode-dialog${(candidate || labelEditor) && !recovery ? " trace-barcode-dialog--review" : ""}${grading && (candidate || labelEditor) && !recovery ? " trace-barcode-dialog--grading" : ""}${reducedMotion ? " trace-barcode-dialog--reduced-motion" : ""}`}
        data-camera-state={cameraState}
        data-orientation-layout="responsive"
        data-mobile-safe="true"
        data-safe-area="top-and-bottom"
        ref={dialogRef}
        role="dialog"
      >
        <header className="trace-barcode-dialog__header">
          <div>
            <span className="trace-barcode-dialog__access-label">{access.label}</span>
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
            Camera access starts automatically after you choose Scan Barcode. Trace does not save or upload camera images or selected barcode photos.
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
              <button disabled={lookingUp || decodingPhoto} onClick={() => startCamera({ nextFacingMode: facingMode })} type="button">
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
              disabled={cameraState === "starting" || lookingUp || decodingPhoto}
              onClick={() => startCamera({ nextFacingMode: alternateFacing })}
              type="button"
            >
              {alternateLabel}
            </button>
            <button disabled={lookingUp || decodingPhoto} onClick={() => choosePhoto()} type="button">
              Scan from Photo
            </button>
            <button disabled={lookingUp || decodingPhoto} onClick={() => choosePhoto(true)} type="button">
              Take Photo
            </button>
            {decodingPhoto && !lookingUp && (
              <button onClick={() => {
                resetForAnotherScan();
                setMessage("Photo scan canceled. Choose a photo or start the camera when ready.");
              }} type="button">Cancel Photo Scan</button>
            )}
            </div>
            <input
              accept="image/*"
              aria-label="Barcode photo"
              hidden
              onChange={scanPhoto}
              ref={photoInputRef}
              type="file"
            />
            <input
              accept="image/*"
              aria-label="Take barcode photo"
              capture="environment"
              hidden
              onChange={scanPhoto}
              ref={captureInputRef}
              type="file"
            />
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
              disabled={lookingUp || decodingPhoto}
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
          <button disabled={lookingUp || decodingPhoto || !manualBarcode.trim()} type="submit">
            Look Up Barcode
          </button>
        </form>

        <div aria-atomic="true" aria-live="polite" className="trace-barcode-dialog__status" role="status">
          {lookingUp ? "Barcode found. Looking up barcode…" : message}
        </div>
        {errorMessage && <p className="trace-barcode-dialog__error" role="alert">{errorMessage}</p>}

        {!candidate && !recovery && !labelEditor && lookupIdentifier && !lookingUp && errorMessage
          && errorMessage !== LOOKUP_MESSAGES.invalid && (
          <div className="trace-package-label-evidence">
          <button type="button" onClick={()=>setLabelEditor({newVersion:true})}>Use my package label</button>
          {savedPackageChooser}
            {sharedPackageChooser}
          <button onClick={beginRecovery} type="button">
            {errorMessage === LOOKUP_MESSAGES["not-found"]
              ? "Create This Food"
              : "Create This Food Manually"}
          </button>
          </div>
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

        {labelEditor && <PersonalPackageLabelEditor key={labelEditor.newVersion ? "new" : candidate?.personalLabel?.id || "first"}
          candidate={(labelEditor.newVersion ? candidate?.originalCandidate || candidate : candidate) || createPersonalPackageLabelDraft(lookupIdentifier)}
          lookupResult={lookupResult} identifier={lookupIdentifier} onCancel={()=>setLabelEditor(null)} onSaved={savedLabel} />}
        {candidate && !recovery && !labelEditor && (
          <article className="trace-barcode-dialog__product" aria-label="Barcode product review">
            <p className="trace-barcode-dialog__eyebrow">
              {candidate.canUse ? "Ready to review" : "Review required"}
            </p>
            <h3>{grading ? grading.getBarcodeReviewName(candidate) : [candidate.display.brand, candidate.display.name].filter(Boolean).join(" · ")}</h3>
            {savedPackageChooser}
            {sharedPackageChooser}
            {grading && <grading.default candidate={candidate} identifier={lookupIdentifier} />}
            {!grading && candidate.display.packageQuantity && <p>Package: {candidate.display.packageQuantity}</p>}
            {!grading && candidate.display.servingsPerContainer !== null
              && candidate.display.servingsPerContainer !== undefined && (
              <p>Servings per container: {candidate.display.servingsPerContainer}</p>
            )}
            <p>{grading ? `Nutrition per ${candidate.display.servingDescription}.` : candidate.display.basisMessage}</p>
            {candidate.display.nutritionConflicts?.length > 0 && <div aria-label="Unresolved sodium evidence">
              <p>{(!grading || candidate.display.nutritionCorrection) && <>{candidate.display.nutritionConflicts[0].message}{' '}</>}
                {candidate.canUse ? 'Other available nutrition can still be logged.' : 'Complete the missing fields to log this food.'}</p>
              <details aria-label="Sodium and salt evidence"><summary>Sodium &amp; salt evidence</summary>
                <p>The provider's sodium and salt values conflict. Sodium remains unknown.{' '}
                  <a href={candidate.display.nutritionConflicts[0].source.url} target="_blank" rel="noreferrer noopener">Provider nutrient record</a>.
                </p>
              </details>
            </div>}
            {candidate.stale && (
              <p className="trace-barcode-dialog__unknowns">
                Offline cached result: this provider record is past Trace's normal cache age. Review it carefully.
              </p>
            )}
            <dl className="trace-barcode-dialog__nutrients">
              {(grading ? NUTRIENT_ROWS.slice(0, 3) : NUTRIENT_ROWS).map(([key, label, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{formatNutrientValue(candidate.display.nutrients[key], key, unit)}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={()=>setLabelEditor({newVersion:false})}>{candidate.personalLabel ? "Edit my package label" : "Use my package label"}</button>
            {candidate.personalLabel && <div className="trace-package-label-evidence">
              <details><summary>Your label evidence</summary><p>Confirmed {new Date(candidate.personalLabel.confirmedAt).toLocaleString()}. Device-local; not independently authenticated. {candidate.originalCandidate?.providerUnavailable ? "No provider panel was available." : "Original provider observations are retained with new entries."}</p>
                {candidate.personalLabel.photos.map(p=><LabelPhoto key={p.id} photo={p}/>)}
                <details><summary>Original provider ingredients</summary><p>These may describe a different edition and are not used as your package declaration.</p><p>{candidate.originalCandidate?.display.ingredients?.text || "Ingredient information unavailable."}</p></details>
                <button type="button" onClick={removeLabel}>Remove my correction from future scans</button>
              </details>
              <SharedLabelSubmission key={candidate.personalLabel.id} profile={candidate.personalLabel}/>
            </div>}
            <p className="trace-barcode-dialog__label-notice" aria-label="Package label notice">
              {candidate.reviewedLabel ? "Nutrition uses your selected Trace-reviewed package edition; confirm the package match." : candidate.personalLabel ? "Nutrition uses your confirmed label. Ingredients need separate confirmation from the same package." : "Check your package label. Nutrition and ingredients come from external sources and may differ from your package."}{' '}
              {grading && candidate.display.nutritionCorrection?.mode === 'nutrient-correction'
                ? 'This reference score uses the separately identified manufacturer reference panel.'
                : 'Grades use the information shown.'}
            </p>
            {grading && <details className="trace-barcode-dialog__nutrition-details">
              <summary>More nutrition &amp; provider details</summary>
              <dl className="trace-barcode-dialog__nutrients">
                {NUTRIENT_ROWS.slice(3).map(([key, label, unit]) => <div key={key}>
                  <dt>{label}</dt><dd>{formatNutrientValue(candidate.display.nutrients[key], key, unit)}</dd>
                </div>)}
              </dl>
              <p>{candidate.display.basisMessage}</p>
              <p>Original product name: {candidate.display.name}. Brand: {candidate.display.brand || 'Unknown'}.</p>
              {candidate.display.unknownFields.length > 0 && <p>Unknown or unpublished: {candidate.display.unknownFields.map(missingLabel).join(', ')}.</p>}
              <p>Source: {candidate.display.attribution}{candidate.display.sourceUrl && <> · <a href={candidate.display.sourceUrl} rel="noreferrer noopener" target="_blank">View provider source</a></>}</p>
            </details>}
            {!grading && candidate.display.unknownFields.length > 0 && (
              <p className="trace-barcode-dialog__unknowns">
                Unknown or unpublished: {candidate.display.unknownFields.map(missingLabel).join(", ")}.
              </p>
            )}
            {!grading && <p className="trace-barcode-dialog__source">
              Source: {candidate.display.attribution}
              {candidate.display.sourceUrl && (
                <> · <a href={candidate.display.sourceUrl} rel="noreferrer noopener" target="_blank">{candidate.personalLabel ? "Original provider record" : "View source"}</a></>
              )}
            </p>}
            {!grading && !candidate.canUse && (
              <p className="trace-barcode-dialog__error">
                Exact labeled-serving nutrition is missing or cannot be safely established, so this product cannot populate an entry yet.
              </p>
            )}
            <BarcodeIngredients
              key={lookupIdentifier?.value}
              ingredients={candidate.display.ingredients}
              attribution={candidate.customFood?.providerSourceSnapshot?.provenance?.attribution || candidate.display.ingredientSource?.attribution || candidate.display.attribution}
            />
            {grading && <grading.BarcodeAdditives key={`additives:${lookupIdentifier?.value}`} candidate={candidate} />}
            {candidate.customFood && <div className="trace-barcode-dialog__review-actions">
              <button onClick={beginRecovery} type="button">Edit Custom Food</button>
              <button onClick={removeCustomFood} type="button">{deletePending ? 'Confirm Delete Custom Food' : 'Delete Custom Food'}</button>
            </div>}
          </article>
        )}
        </div>
        <footer className="trace-barcode-dialog__footer">
          {candidate && !recovery && !labelEditor && <>
            {loggingReason && <p id="trace-barcode-logging-reason" role="status">{loggingReason}</p>}
            {reviewActions}
          </>}
          <div className="trace-barcode-dialog__secondary-actions">
          {candidate && !recovery && !candidate.canUse && <button aria-describedby="trace-barcode-logging-reason" disabled type="button">Use This Food</button>}
          <button onClick={close} type="button">Return to Food Search</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
