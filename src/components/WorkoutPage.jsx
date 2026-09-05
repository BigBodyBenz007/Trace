import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ExerciseSearch from "./ExerciseSearch";
import SavedExerciseEditor from "./SavedExerciseEditor";
import ExerciseHistory from "./ExerciseHistory";
import WorkoutPhotos from "./WorkoutPhotos";
import WorkoutTemplateSection, {
  WorkoutTemplateEditorDialog,
} from "./WorkoutTemplateSection";
import { WorkoutDraftConflictDialog } from "./TodayPage";
import { motionScrollBehavior } from "../services/motionPreference";
import {
  PHOTO_SELECTION_ACCEPT,
  PHOTO_SELECTION_RESULT_STATUS,
  webPhotoSelectionAdapter,
} from "../services/photoSelectionAdapter";
import {
  APP_LIFECYCLE_PHASE,
  webAppLifecycleAdapter,
} from "../services/appLifecycleAdapter";
import {
  WORKOUT_INTENSITY_OPTIONS,
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import {
  createWorkoutEntry,
  createWorkoutItemId,
  getWorkoutEntryError,
  getWorkoutEntryIssues,
} from "../services/workoutEntry";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";
import {
  formatWorkoutDuration,
  resolveWorkoutCalorieDuration,
} from "../services/workoutDuration";
import { workoutCalorieEstimateSaveMessage } from "../services/workoutCalorieEstimateSnapshot";
import {
  clearWorkoutDraft,
  readWorkoutDraft,
  writeWorkoutDraft,
  WORKOUT_DRAFT_SCHEMA_VERSION,
} from "../services/workoutDraft";
import {
  workoutTemplateDraftForEditing,
  workoutTemplateDraftFromWorkoutEntry,
} from "../services/workoutTemplate";

function currentLocalDateTime() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}

function localDateTime(timestamp) {
  const date = new Date(timestamp);
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function emptySet(defaultLoadMode = "external", defaultWeightUnit = "lb") {
  return {
    id: createWorkoutItemId("set"),
    reps: "",
    setType: "working",
    toFailure: false,
    actualRepsAtFailure: "",
    loadMode: defaultLoadMode,
    weightAmount: "",
    weightUnit: defaultWeightUnit,
    notes: "",
    isUntouched: true,
    drops: [],
  };
}

function emptyExercise() {
  return {
    id: createWorkoutItemId("exercise"),
    name: "",
    exerciseId: null,
    exerciseReference: null,
    saveAsReusable: false,
    defaultLoadMode: "external",
    defaultWeightUnit: "lb",
    notes: "",
    sets: [emptySet()],
  };
}

function emptyDrop(loadMode = "external", weightUnit = "lb") {
  return {
    id: createWorkoutItemId("drop"),
    reps: "",
    toFailure: false,
    actualRepsAtFailure: "",
    loadMode,
    weightAmount: "",
    weightUnit,
    notes: "",
    isUntouched: true,
  };
}

function moveItem(items, index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= items.length) return items;
  const moved = [...items];
  [moved[index], moved[destination]] = [moved[destination], moved[index]];
  return moved;
}

const EXERCISE_SKIP_REASONS = [
  "Pain or discomfort",
  "Equipment unavailable",
  "Not enough time",
  "Low energy",
  "Schedule conflict",
];

function roadmapSetSummary(set) {
  const setType = set.setType === "warm-up" ? "Warm-up" : "Working";
  const load = set.loadMode === "bodyweight"
    ? "Bodyweight"
    : set.weightAmount
      ? `${set.weightAmount} ${set.weightUnit}`
      : "Weight open";
  return `${setType} · ${load} × ${set.reps || "reps open"}`;
}

function roadmapVolume(exercises) {
  const sets = exercises.flatMap((exercise) =>
    exercise.sets.filter((set) => !set.isUntouched)
  );
  const warmUp = sets.filter(({ setType }) => setType === "warm-up").length;
  return {
    total: sets.length,
    warmUp,
    working: sets.length - warmUp,
  };
}

function WorkoutTiming({ entry }) {
  const start = new Date(entry.startedAt);
  const finish = new Date(entry.finishedAt);
  const hasElapsedTiming = entry.startedAt
    && entry.finishedAt
    && Number.isFinite(start.getTime())
    && Number.isFinite(finish.getTime());
  const duration = hasElapsedTiming
    ? formatWorkoutDuration(entry.startedAt, entry.finishedAt)
    : null;
  const hasActiveDuration = Number.isFinite(entry.activeDurationMinutes)
    && entry.activeDurationMinutes > 0;
  const hasCaloriesBurned = Number.isInteger(entry.caloriesBurned)
    && entry.caloriesBurned > 0;
  const intensityLabel = WORKOUT_INTENSITY_OPTIONS.find(
    ({ value }) => value && value === entry.intensity
  )?.label;
  if (!hasElapsedTiming && !hasActiveDuration && !hasCaloriesBurned && !intensityLabel) return null;

  return (
    <dl style={{ display: "grid", gap: "6px", gridTemplateColumns: "max-content minmax(0, 1fr)", margin: "10px 0", maxWidth: "100%" }}>
      {hasElapsedTiming && <>
        <dt style={{ color: "#9ca3af" }}>Start</dt>
        <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{start.toLocaleString()}</dd>
        <dt style={{ color: "#9ca3af" }}>Finish</dt>
        <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{finish.toLocaleString()}</dd>
      </>}
      {duration && (
        <>
          <dt style={{ color: "#9ca3af" }}>Duration</dt>
          <dd style={{ margin: 0 }}>{duration}</dd>
        </>
      )}
      {hasActiveDuration && <>
        <dt style={{ color: "#9ca3af" }}>Approximate workout duration</dt>
        <dd style={{ margin: 0 }}>{entry.activeDurationMinutes.toLocaleString()} min</dd>
      </>}
      {hasCaloriesBurned && <>
        <dt style={{ color: "#9ca3af" }}>Calories Burned</dt>
        <dd style={{ margin: 0 }}>{entry.caloriesBurned} kcal</dd>
      </>}
      {intensityLabel && <>
        <dt style={{ color: "#9ca3af" }}>Intensity</dt>
        <dd style={{ margin: 0 }}>{intensityLabel}</dd>
      </>}
    </dl>
  );
}

function WorkoutResultFields({
  activeDurationMinutes,
  caloriesBurned,
  intensity,
  onActiveDurationChange,
  onCaloriesBurnedChange,
  onIntensityChange,
  formInputStyle,
  durationInvalid = false,
  caloriesInvalid = false,
  liveTiming = false,
}) {
  return (
    <fieldset className="workout-readiness-fields">
      <legend>Workout results (optional)</legend>
      {liveTiming && (
        <p style={{ color: "#bbb", marginTop: 0 }}>
          Trace records elapsed time from start to finish separately. Enter an approximate active
          duration here when it better reflects the workout.
        </p>
      )}
      <div className="workout-readiness-fields__grid">
        <label>
          Approximate workout duration
          <span className="workout-readiness-fields__minutes">
            <input
              aria-label="Approximate workout duration"
              aria-invalid={durationInvalid || undefined}
              inputMode="decimal"
              min="0"
              step="any"
              type="number"
              value={activeDurationMinutes}
              onChange={(event) => onActiveDurationChange(event.target.value)}
              style={formInputStyle}
            />
            <span>minutes</span>
          </span>
          <small>
            From your first set to your last, including normal rest between sets. Exclude long
            interruptions.
          </small>
        </label>
        <label>
          Calories Burned
          <span className="workout-readiness-fields__minutes">
            <input
              aria-label="Calories Burned"
              aria-invalid={caloriesInvalid || undefined}
              inputMode="numeric"
              min="1"
              step="1"
              type="number"
              value={caloriesBurned}
              onChange={(event) => onCaloriesBurnedChange(event.target.value)}
              style={formInputStyle}
            />
            <span>kcal</span>
          </span>
          <small>Enter a result from your watch, machine, or another measured source.</small>
        </label>
        <label>
          Workout intensity
          <select
            aria-label="Workout intensity"
            value={intensity}
            onChange={(event) => onIntensityChange(event.target.value)}
            style={formInputStyle}
          >
            {WORKOUT_INTENSITY_OPTIONS.map((option) => (
              <option key={option.value || "not-specified"} value={option.value}>{option.label}</option>
            ))}
          </select>
          <small>Applies to the workout as a whole.</small>
        </label>
      </div>
    </fieldset>
  );
}

function completedSetDescription(set) {
  const load = set.load.mode === "bodyweight"
    ? "Bodyweight"
    : `${set.load.amount} ${set.load.unit}`;
  const description = set.toFailure
    ? (set.actualRepsAtFailure === null || set.actualRepsAtFailure === undefined
      ? `${load} × ${set.reps} goal → to failure`
      : `${load} × ${set.reps} goal → failure at ${set.actualRepsAtFailure}`)
    : `${load} × ${set.reps} reps`;
  return `${set.setType === "warm-up" ? "Warm-up" : "Working"} · ${description}`;
}

function countCompletedWorkoutSets(entry) {
  const exercises = Array.isArray(entry?.exercises) ? entry.exercises : [];
  return exercises.reduce((total, exercise) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return total + sets.length;
  }, 0);
}

function CompletedDropSegments({ drops }) {
  if (!Array.isArray(drops) || drops.length === 0) return null;
  return (
    <div style={{ borderLeft: "2px solid #60a5fa", display: "grid", gap: "6px", marginTop: "6px", maxWidth: "100%", paddingLeft: "10px" }}>
      {drops.map((drop, dropIndex) => (
        <div key={drop.id || dropIndex} style={{ overflowWrap: "anywhere" }}>
          <span>↳ Drop {dropIndex + 1}: {completedSetDescription(drop)}</span>
          {drop.notes && <span style={{ color: "#9ca3af", display: "block", whiteSpace: "pre-wrap" }}>{drop.notes}</span>}
        </div>
      ))}
    </div>
  );
}

function unavailableCalorieEstimateMessage(snapshot) {
  if (!snapshot) return "No saved estimate is available for this workout.";
  const missingWeight = snapshot.requiredInputs?.bodyWeight !== "provided";
  const missingDuration = snapshot.requiredInputs?.activeDuration !== "provided";
  if (missingWeight || missingDuration) {
    const missing = [
      ...(missingWeight ? ["body weight"] : []),
      ...(missingDuration ? ["workout duration"] : []),
    ];
    return `Add ${missing.join(" and ")} to receive an estimate.`;
  }
  if (snapshot.code === "unsupported-age") {
    return "An estimate is not available for a known age under 19.";
  }
  if (snapshot.code === "no-completed-work") {
    return "An estimate is not available because no completed workout segments were recorded.";
  }
  return "A saved estimate is not available for this workout.";
}

function WorkoutCalorieEstimate({ snapshot, workout }) {
  const hasRange = snapshot?.status === "calculated"
    && Number.isFinite(snapshot.lowerKcal)
    && Number.isFinite(snapshot.upperKcal)
    && snapshot.lowerKcal <= snapshot.upperKcal;
  const duration = resolveWorkoutCalorieDuration(workout);
  const hasDurationBasis = Number.isFinite(snapshot?.activeDurationMinutes)
    && snapshot.activeDurationMinutes > 0
    && snapshot.activeDurationMinutes === duration.minutes
    && snapshot.durationSource === duration.source
    && ["entered", "recorded"].includes(snapshot.durationSource);
  const durationBasis = hasDurationBasis
    ? `Estimated using ${snapshot.durationSource === "entered"
      ? "your entered workout"
      : "the recorded"} duration of ${snapshot.activeDurationMinutes.toLocaleString()} ${
      snapshot.activeDurationMinutes === 1 ? "minute" : "minutes"
    }.`
    : "";

  return (
    <section className="workout-calorie-estimate" aria-label="Estimated calories burned">
      <h4>Estimated calories burned</h4>
      {hasRange ? (
        <p className="workout-calorie-estimate__range">
          About {snapshot.lowerKcal.toLocaleString()}{"\u2013"}{snapshot.upperKcal.toLocaleString()} kcal
        </p>
      ) : (
        <p className="workout-calorie-estimate__unavailable">
          {unavailableCalorieEstimateMessage(snapshot)}
        </p>
      )}
      <p className="workout-calorie-estimate__disclaimer">
        This is a broad estimate, not an exact measurement.
      </p>
      {durationBasis && <p>{durationBasis}</p>}
      <details className="workout-calorie-estimate__details">
        <summary>How is this estimated?</summary>
        <p>
          Trace uses body weight, approximate workout duration including normal between-set rest,
          age when supplied, selected intensity, exercises, warm-up and working sets, reps, drops,
          and failure information.
        </p>
        <p>More complete information can narrow the range.</p>
        <p>
          Individual metabolism, rest periods, exercise technique, pace, and other factors can
          change actual calorie burn. Trace does not claim this range is an exact measurement.
        </p>
      </details>
    </section>
  );
}

function WorkoutPage({
  onBack,
  navigationOriginPage = null,
  navigationOriginCalendar = null,
  onReturnToToday = onBack,
  onReturnToCalendar = onBack,
  onReturnToWorkoutTemplates = () => {},
  workoutEntries,
  workoutTemplates = [],
  onWorkoutDraftChange = () => {},
  trophyEntries = [],
  savedExercises = [],
  saveWorkoutEntry,
  showToast = () => {},
  saveExerciseDefinitions = () => [],
  updateSavedExercise = () => ({
    status: "error",
    message: "The saved exercise could not be updated.",
  }),
  updateWorkoutEntry,
  deleteWorkoutEntry,
  saveWorkoutTemplate = () => ({ status: "error" }),
  updateWorkoutTemplate = () => ({ status: "error" }),
  deleteWorkoutTemplate = () => false,
  startWorkoutTemplate = () => ({ status: "error" }),
  scheduleWorkoutTemplate = () => false,
  addTrophyCaseEntry = () => false,
  buttonStyle,
  inputStyle,
  containerStyle,
  trophySourceTarget = null,
  onReturnToTrophyCase = null,
  workoutEntryTargetId = null,
  onWorkoutEntryTargetShown = () => {},
  photoSelectionAdapter = webPhotoSelectionAdapter,
  lifecycleAdapter = webAppLifecycleAdapter,
}) {
  const initialDateTime = currentLocalDateTime();
  const restoredDraftRef = useRef(readWorkoutDraft());
  const restoredForm = restoredDraftRef.current?.form;
  const [title, setTitle] = useState(restoredForm?.title || "");
  const [date, setDate] = useState(restoredForm?.date || initialDateTime.date);
  const [time, setTime] = useState(restoredForm?.time || initialDateTime.time);
  const [timingMode, setTimingMode] = useState(restoredForm?.timingMode || "live");
  const [activeDurationMinutes, setActiveDurationMinutes] = useState(
    restoredForm?.activeDurationMinutes || ""
  );
  const [caloriesBurned, setCaloriesBurned] = useState(
    restoredForm?.caloriesBurned || ""
  );
  const [intensity, setIntensity] = useState(restoredForm?.intensity || "");
  const [notes, setNotes] = useState(restoredForm?.notes || "");
  const [exercises, setExercises] = useState(() => restoredForm?.exercises || [emptyExercise()]);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState(
    () => {
      const restoredCollapsedIds = restoredDraftRef.current?.context?.collapsedExerciseIds;
      if (Array.isArray(restoredCollapsedIds)) return new Set(restoredCollapsedIds);
      if (restoredDraftRef.current?.context?.originPage === "workout-templates") {
        return new Set(restoredForm?.exercises?.map(({ id }) => id) || []);
      }
      return new Set();
    }
  );
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isDirty, setIsDirty] = useState(Boolean(restoredForm));
  const [formError, setFormError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [activeSearchExerciseId, setActiveSearchExerciseId] = useState(
    restoredDraftRef.current?.context?.activeSearchExerciseId || null
  );
  const [editingSavedExercise, setEditingSavedExercise] = useState(null);
  const [activeWorkoutEntryId, setActiveWorkoutEntryId] = useState(null);
  const [expandedWorkoutEntryIds, setExpandedWorkoutEntryIds] = useState(
    () => new Set()
  );
  const [roadmapEditingExerciseId, setRoadmapEditingExerciseId] = useState(
    restoredDraftRef.current?.context?.roadmapEditingExerciseId || null
  );
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [templateEditor, setTemplateEditor] = useState(null);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [templateError, setTemplateError] = useState("");
  const [templateConflict, setTemplateConflict] = useState(null);
  const templateInitialDraftRef = useRef(null);
  const templateToggleButtonRef = useRef(null);
  const templateEditorReturnFocusRef = useRef(null);
  const templateEditorWasOpenRef = useRef(false);
  const templateStartButtonRefs = useRef(new Map());
  const pendingTemplateFocusIdRef = useRef(null);

  function selectWorkoutPhotos(event) {
    const input = event.currentTarget;
    const selection = photoSelectionAdapter.acquireImages({
      input,
      accept: input.accept,
      multiple: input.multiple,
    });
    input.value = "";

    if (selection.status !== PHOTO_SELECTION_RESULT_STATUS.SUCCESS) return;

    const additions = selection.files.map((blob) => ({
      blob,
      isDraft: true,
      url: URL.createObjectURL(blob),
    }));
    setPhotos((current) => [...current, ...additions]);
    markChanged();
  }
  const [roadmapSkipExerciseId, setRoadmapSkipExerciseId] = useState(null);
  const [roadmapSkipReason, setRoadmapSkipReason] = useState("");
  const [roadmapCustomReason, setRoadmapCustomReason] = useState("");
  const [focusDropId, setFocusDropId] = useState(null);
  const [pendingDropRemovals, setPendingDropRemovals] = useState({});
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isLoggingOpen, setIsLoggingOpen] = useState(Boolean(restoredForm));
  const [completionReview, setCompletionReview] = useState(
    Boolean(restoredDraftRef.current?.context?.completionReview)
  );
  const pageTopRef = useRef(null);
  const formRef = useRef(null);
  const formHeadingRef = useRef(null);
  const resultsRef = useRef(null);
  const pendingFormFocusRef = useRef(
    restoredDraftRef.current?.context?.originPage === "workout-templates"
  );
  const pendingResultsFocusRef = useRef(false);
  const workoutEntryRefs = useRef(new Map());
  const workoutEditOriginRef = useRef(null);
  const pendingWorkoutDeleteAnchorRef = useRef(null);
  const workoutDeleteScrollCompensationRef = useRef(null);
  const dropInputRefs = useRef(new Map());
  const dropRemovalTimersRef = useRef(new Map());
  const dropUndoRowRefs = useRef(new Map());
  const exerciseCardRefs = useRef(new Map());
  const exerciseNameInputRefs = useRef(new Map());
  const expandExerciseButtonRefs = useRef(new Map());
  const activeExerciseIdRef = useRef(restoredForm?.exercises?.[0]?.id || null);
  const pendingExerciseOrientationRef = useRef(null);
  const pendingUndoVisibilityRef = useRef(null);
  const startedAtRef = useRef(
    restoredDraftRef.current?.startedAt ||
      null
  );
  const plannedWorkoutIdRef = useRef(
    restoredDraftRef.current?.plannedWorkoutId || null
  );
  const workoutOriginPageRef = useRef(
    restoredDraftRef.current?.context?.originPage || navigationOriginPage
  );
  const workoutOriginCalendarRef = useRef(
    restoredDraftRef.current?.context?.originPage === "calendar"
      ? {
          selectedDate: restoredDraftRef.current.context.selectedDate,
          visibleMonth: restoredDraftRef.current.context.visibleMonth,
        }
      : navigationOriginCalendar
  );
  const workoutOriginTemplateIdRef = useRef(
    restoredDraftRef.current?.context?.originPage === "workout-templates"
      ? restoredDraftRef.current.context.originTemplateId
      : null
  );
  const [templateWorkoutFocused, setTemplateWorkoutFocused] = useState(
    restoredDraftRef.current?.context?.originPage === "workout-templates"
  );
  const draftPersistenceEnabledRef = useRef(Boolean(restoredForm));
  const lastPersistedDraftJsonRef = useRef(null);

  function workoutOriginContext() {
    if (workoutOriginPageRef.current === "calendar") {
      return {
        originPage: "calendar",
        selectedDate: workoutOriginCalendarRef.current?.selectedDate,
        visibleMonth: workoutOriginCalendarRef.current?.visibleMonth,
      };
    }
    if (workoutOriginPageRef.current === "workout-templates") {
      return {
        originPage: "workout-templates",
        originTemplateId: workoutOriginTemplateIdRef.current,
      };
    }
    return workoutOriginPageRef.current === "today" ? { originPage: "today" } : {};
  }

  function focusOriginatingTemplate(templateId) {
    pendingTemplateFocusIdRef.current = templateId;
    setTemplatesExpanded(true);
    setTemplateWorkoutFocused(false);
  }

  function returnToWorkoutOrigin({ clearTemplateOrigin = false } = {}) {
    if (workoutOriginPageRef.current === "calendar") onReturnToCalendar();
    else if (workoutOriginPageRef.current === "today") onReturnToToday();
    else if (workoutOriginPageRef.current === "workout-templates") {
      const templateId = workoutOriginTemplateIdRef.current;
      focusOriginatingTemplate(templateId);
      if (clearTemplateOrigin) {
        workoutOriginPageRef.current = null;
        workoutOriginTemplateIdRef.current = null;
        onReturnToWorkoutTemplates();
      }
    }
    else if (workoutOriginPageRef.current === "trophy-case" && onReturnToTrophyCase) onReturnToTrophyCase();
    else onBack();
  }

  useEffect(() => {
    if (editingEntryId !== null || !isDirty) return undefined;
    const persistedDraft = {
      schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
      ...(plannedWorkoutIdRef.current
        ? { plannedWorkoutId: plannedWorkoutIdRef.current }
        : {}),
      startedAt: startedAtRef.current,
      updatedAt: new Date().toISOString(),
      form: {
        title,
        date,
        time,
        timingMode,
        activeDurationMinutes,
        caloriesBurned,
        intensity,
        notes,
        exercises,
      },
      context: {
        activeSearchExerciseId,
        roadmapEditingExerciseId,
        collapsedExerciseIds: Array.from(collapsedExerciseIds),
        ...(completionReview ? { completionReview: true } : {}),
        ...workoutOriginContext(),
      },
    };
    const persist = () => {
      if (!draftPersistenceEnabledRef.current) return;
      const persistedDraftJson = JSON.stringify(persistedDraft);
      if (lastPersistedDraftJsonRef.current === persistedDraftJson) return;
      try {
        const storedDraft = readWorkoutDraft(localStorage);
        if (storedDraft?.updatedAt > persistedDraft.updatedAt) return;
        writeWorkoutDraft(localStorage, persistedDraft);
        lastPersistedDraftJsonRef.current = persistedDraftJson;
        onWorkoutDraftChange(persistedDraft);
      } catch (error) {
        // Completed workout persistence reports storage failures globally. A
        // draft failure must not interrupt or discard the in-memory workout.
      }
    };
    const timeout = window.setTimeout(persist, 200);
    const unsubscribeLifecycle = lifecycleAdapter.subscribe(({ phase }) => {
      if (
        phase === APP_LIFECYCLE_PHASE.BACKGROUND ||
        phase === APP_LIFECYCLE_PHASE.SUSPENDING
      ) {
        persist();
      }
    });
    return () => {
      window.clearTimeout(timeout);
      unsubscribeLifecycle();
      persist();
    };
  }, [title, date, time, timingMode, activeDurationMinutes, caloriesBurned, intensity, notes, exercises, activeSearchExerciseId, roadmapEditingExerciseId, collapsedExerciseIds, completionReview, editingEntryId, isDirty, onWorkoutDraftChange, lifecycleAdapter]);

  useLayoutEffect(() => {
    if (!isLoggingOpen || !pendingFormFocusRef.current) return;
    pendingFormFocusRef.current = false;
    formHeadingRef.current?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "start" });
  }, [isLoggingOpen, editingEntryId, templateWorkoutFocused]);

  useLayoutEffect(() => {
    if (!completionReview || !pendingResultsFocusRef.current) return;
    pendingResultsFocusRef.current = false;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "nearest" });
  }, [completionReview]);

  useLayoutEffect(() => {
    if (templateEditor) {
      templateEditorWasOpenRef.current = true;
      return;
    }
    if (!templateEditorWasOpenRef.current) return;
    templateEditorWasOpenRef.current = false;
    const target = templateEditorReturnFocusRef.current;
    templateEditorReturnFocusRef.current = null;
    target?.focus({ preventScroll: true });
  }, [templateEditor]);

  useLayoutEffect(() => {
    const templateId = pendingTemplateFocusIdRef.current;
    if (!templatesExpanded || templateWorkoutFocused || !templateId) return;
    pendingTemplateFocusIdRef.current = null;
    const target = templateStartButtonRefs.current.get(templateId)
      || templateToggleButtonRef.current;
    target?.focus({ preventScroll: true });
    const bounds = target?.getBoundingClientRect?.();
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
      target.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "nearest" });
    }
  }, [templatesExpanded, templateWorkoutFocused]);

  useLayoutEffect(() => {
    if (!focusDropId) return;
    const input = dropInputRefs.current.get(focusDropId);
    if (input) {
      input.focus({ preventScroll: true });
      setFocusDropId(null);
    }
  }, [exercises, focusDropId]);

  useLayoutEffect(() => {
    const request = pendingExerciseOrientationRef.current;
    if (!request) return;
    const card = exerciseCardRefs.current.get(request.exerciseId);
    const focusTarget = request.focusName
      ? exerciseNameInputRefs.current.get(request.exerciseId)
      : expandExerciseButtonRefs.current.get(request.exerciseId);
    if (!card || !focusTarget) return;
    pendingExerciseOrientationRef.current = null;
    focusTarget.focus({ preventScroll: true });
    const rectangle = card.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const isFullyVisible = rectangle.top >= 0 && rectangle.bottom <= viewportHeight;
    if (request.alwaysScroll || !isFullyVisible) {
      card.scrollIntoView?.({
        behavior: motionScrollBehavior(),
        block: request.focusName ? "center" : "nearest",
      });
    }
  }, [exercises, collapsedExerciseIds]);

  useLayoutEffect(() => {
    const request = pendingUndoVisibilityRef.current;
    if (!request) return;
    const pending = pendingDropRemovals[request.parentKey];
    const row = dropUndoRowRefs.current.get(request.parentKey);
    if (!pending || pending.drop.id !== request.dropId || !row) return;
    pendingUndoVisibilityRef.current = null;
    const rectangle = row.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const isFullyVisible =
      rectangle.top >= 0 &&
      rectangle.bottom <= viewportHeight &&
      rectangle.left >= 0 &&
      rectangle.right <= window.innerWidth;
    if (!isFullyVisible) {
      row.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "nearest" });
    }
  }, [pendingDropRemovals]);

  useEffect(() => () => {
    dropRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dropRemovalTimersRef.current.clear();
  }, []);
  const sortedEntries = [...workoutEntries].sort(
    (first, second) => new Date(second.occurredAt) - new Date(first.occurredAt)
  );

  useLayoutEffect(() => {
    const anchor = pendingWorkoutDeleteAnchorRef.current;
    if (
      !anchor ||
      workoutEntries.some(({ id }) => id === anchor.deletedEntryId)
    ) {
      return;
    }
    pendingWorkoutDeleteAnchorRef.current = null;
    const compensation = workoutDeleteScrollCompensationRef.current;
    const anchorNode = anchor.entryId
      ? workoutEntryRefs.current.get(anchor.entryId)
      : null;
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    const desiredScrollY = anchorNode
      ? currentScrollY + anchorNode.getBoundingClientRect().top - anchor.viewportTop
      : anchor.documentScrollY;
    if (compensation) compensation.style.height = "0px";
    const naturalDocumentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const requiredCompensation = Math.max(
      0,
      Math.ceil(desiredScrollY + viewportHeight - naturalDocumentHeight)
    );
    if (compensation) {
      compensation.style.height = `${requiredCompensation}px`;
    }
    window.scrollTo({
      top: Math.max(0, desiredScrollY),
      left: anchor.documentScrollX,
      behavior: "auto",
    });
  }, [workoutEntries]);

  useEffect(() => {
    if (
      !workoutEntryTargetId ||
      !workoutEntries.some(({ id }) => id === workoutEntryTargetId)
    ) {
      return;
    }
    setActiveWorkoutEntryId(workoutEntryTargetId);
    setExpandedWorkoutEntryIds((current) => {
      if (current.has(workoutEntryTargetId)) return current;
      const next = new Set(current);
      next.add(workoutEntryTargetId);
      return next;
    });
    const frameId = window.requestAnimationFrame(() => {
      workoutEntryRefs.current.get(workoutEntryTargetId)?.scrollIntoView?.({
        behavior: motionScrollBehavior(),
        block: workoutOriginPageRef.current === "trophy-case" ? "start" : "center",
      });
      onWorkoutEntryTargetShown();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [workoutEntryTargetId, workoutEntries, onWorkoutEntryTargetShown]);
  const formInputStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "18px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "12px",
    width: "100%",
  };
  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    marginTop: 0,
    padding: "8px 12px",
  };
  const backButtonStyle = { ...buttonStyle, backgroundColor: "#666" };

  function openWorkoutLogger() {
    const now = new Date();
    const current = currentLocalDateTime();
    startedAtRef.current = now.toISOString();
    draftPersistenceEnabledRef.current = true;
    lastPersistedDraftJsonRef.current = null;
    pendingFormFocusRef.current = true;
    setDate(current.date);
    setTime(current.time);
    setTimingMode("live");
    setCompletionReview(false);
    setIsDirty(true);
    setIsLoggingOpen(true);
    setFormError("");
  }

  function markChanged() {
    draftPersistenceEnabledRef.current = true;
    setIsDirty(true);
    setFormError("");
  }

  function changeField(setValue, value) {
    setValue(value);
    markChanged();
  }

  function changeTimingMode(value) {
    if (value === "live" && timingMode !== "live") {
      const now = new Date();
      const current = currentLocalDateTime();
      startedAtRef.current = now.toISOString();
      setDate(current.date);
      setTime(current.time);
    }
    setActiveDurationMinutes("");
    setTimingMode(value);
    setCompletionReview(false);
    markChanged();
  }

  function reviewWorkoutResults() {
    pendingResultsFocusRef.current = true;
    setCompletionReview(true);
    markChanged();
  }

  function updateExercise(exerciseId, update) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? update(exercise) : exercise
      )
    );
    markChanged();
  }

  function updateSet(exerciseId, setId, values) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === setId ? { ...set, ...values, isUntouched: false } : set
      ),
    }));
  }

  function addExercise() {
    const addedExercise = emptyExercise();
    const previousExerciseId = exercises.some(({ id }) => id === activeExerciseIdRef.current)
      ? activeExerciseIdRef.current
      : exercises[exercises.length - 1]?.id;
    setCollapsedExerciseIds((collapsed) => {
      const next = new Set(collapsed);
      if (previousExerciseId) next.add(previousExerciseId);
      next.delete(addedExercise.id);
      return next;
    });
    setExercises((current) => [...current, addedExercise]);
    activeExerciseIdRef.current = addedExercise.id;
    pendingExerciseOrientationRef.current = {
      exerciseId: addedExercise.id,
      focusName: true,
      alwaysScroll: true,
    };
    markChanged();
  }

  function removeExercise(exerciseId) {
    setExercises((current) => current.filter(({ id }) => id !== exerciseId));
    setCollapsedExerciseIds((current) => {
      if (!current.has(exerciseId)) return current;
      const next = new Set(current);
      next.delete(exerciseId);
      return next;
    });
    markChanged();
  }

  function collapseExercise(exerciseId) {
    activeExerciseIdRef.current = exerciseId;
    pendingExerciseOrientationRef.current = { exerciseId, focusName: false };
    setCollapsedExerciseIds((current) => {
      const next = new Set(current);
      next.add(exerciseId);
      return next;
    });
  }

  function expandExercise(exerciseId) {
    activeExerciseIdRef.current = exerciseId;
    setCollapsedExerciseIds((current) => {
      if (workoutOriginPageRef.current === "workout-templates" && editingEntryId === null) {
        return new Set(exercises
          .filter(({ id }) => id !== exerciseId)
          .map(({ id }) => id));
      }
      const next = new Set(current);
      next.delete(exerciseId);
      return next;
    });
  }

  function reorderExercise(index, direction) {
    setExercises((current) => moveItem(current, index, direction));
    markChanged();
  }

  function addSet(exerciseId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: [
        ...exercise.sets,
        emptySet(exercise.defaultLoadMode, exercise.defaultWeightUnit),
      ],
    }));
  }

  function removeSet(exerciseId, setId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((set) => set.id !== setId),
    }));
  }

  function reorderSet(exerciseId, setIndex, direction) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: moveItem(exercise.sets, setIndex, direction),
    }));
  }

  function addDrop(exerciseId, setId) {
    const addedDropId = createWorkoutItemId("drop");
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => {
        if (set.id !== setId) return set;
        const drops = Array.isArray(set.drops) ? set.drops : [];
        const previous = drops[drops.length - 1] || set;
        const drop = {
          ...emptyDrop(previous.loadMode, previous.weightUnit || "lb"),
          id: addedDropId,
        };
        return { ...set, drops: [...drops, drop] };
      }),
    }));
    setFocusDropId(addedDropId);
  }

  function updateDrop(exerciseId, setId, dropId, values) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              drops: (Array.isArray(set.drops) ? set.drops : []).map((drop) =>
                drop.id === dropId
                  ? { ...drop, ...values, isUntouched: false }
                  : drop
              ),
            }
          : set
      ),
    }));
  }

  function removeDrop(exerciseId, setId, dropId) {
    const exercise = exercises.find(({ id }) => id === exerciseId);
    const set = exercise?.sets.find(({ id }) => id === setId);
    const drops = Array.isArray(set?.drops) ? set.drops : [];
    const dropIndex = drops.findIndex(({ id }) => id === dropId);
    if (dropIndex < 0) return;
    const parentKey = `${exerciseId}|${setId}`;
    const previousTimer = dropRemovalTimersRef.current.get(parentKey);
    if (previousTimer) window.clearTimeout(previousTimer);
    const pending = {
      parentKey,
      exerciseId,
      setId,
      dropIndex,
      drop: { ...drops[dropIndex] },
    };
    pendingUndoVisibilityRef.current = { parentKey, dropId: pending.drop.id };
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              drops: (Array.isArray(set.drops) ? set.drops : []).filter(
                (drop) => drop.id !== dropId
              ),
            }
          : set
      ),
    }));
    setPendingDropRemovals((current) => ({ ...current, [parentKey]: pending }));
    const timer = window.setTimeout(() => {
      dropRemovalTimersRef.current.delete(parentKey);
      setPendingDropRemovals((current) => {
        if (current[parentKey] !== pending) return current;
        const next = { ...current };
        delete next[parentKey];
        return next;
      });
    }, 8000);
    dropRemovalTimersRef.current.set(parentKey, timer);
  }

  function undoDropRemoval(parentKey) {
    const pending = pendingDropRemovals[parentKey];
    if (!pending) return;
    const timer = dropRemovalTimersRef.current.get(parentKey);
    if (timer) window.clearTimeout(timer);
    dropRemovalTimersRef.current.delete(parentKey);
    updateExercise(pending.exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => {
        if (set.id !== pending.setId) return set;
        const drops = Array.isArray(set.drops) ? set.drops : [];
        const insertionIndex = Math.min(pending.dropIndex, drops.length);
        return {
          ...set,
          drops: [
            ...drops.slice(0, insertionIndex),
            pending.drop,
            ...drops.slice(insertionIndex),
          ],
        };
      }),
    }));
    setPendingDropRemovals((current) => {
      const next = { ...current };
      delete next[parentKey];
      return next;
    });
    pendingUndoVisibilityRef.current = null;
  }

  function clearPendingDropRemovals() {
    dropRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dropRemovalTimersRef.current.clear();
    dropUndoRowRefs.current.clear();
    pendingUndoVisibilityRef.current = null;
    setPendingDropRemovals({});
  }

  function resetForm({ clearDraft = false } = {}) {
    clearPendingDropRemovals();
    if (clearDraft) {
      draftPersistenceEnabledRef.current = false;
      lastPersistedDraftJsonRef.current = null;
    }
    const current = currentLocalDateTime();
    setTitle("");
    setDate(current.date);
    setTime(current.time);
    setTimingMode("live");
    setActiveDurationMinutes("");
    setCaloriesBurned("");
    setIntensity("");
    setNotes("");
    setExercises([emptyExercise()]);
    setCollapsedExerciseIds(new Set());
    setEditingEntryId(null);
    setIsDirty(false);
    setFormError("");
    setValidationAttempted(false);
    setCompletionReview(false);
    setIsLoggingOpen(false);
    setActiveSearchExerciseId(null);
    setRoadmapEditingExerciseId(null);
    setRoadmapSkipExerciseId(null);
    setRoadmapSkipReason("");
    setRoadmapCustomReason("");
    setEditingSavedExercise(null);
    photos.filter(({ isDraft }) => isDraft).forEach(({ url }) => url && URL.revokeObjectURL(url));
    setPhotos([]);
    setSearchResetKey((current) => current + 1);
    startedAtRef.current = null;
    plannedWorkoutIdRef.current = null;
    if (clearDraft) {
      clearWorkoutDraft();
      onWorkoutDraftChange(null);
    }
  }

  function draft() {
    return {
      title,
      date,
      time,
      timingMode,
      activeDurationMinutes,
      caloriesBurned,
      intensity,
      startedAt: startedAtRef.current,
      ...(plannedWorkoutIdRef.current
        ? { plannedWorkoutId: plannedWorkoutIdRef.current }
        : {}),
      notes,
      exercises,
      photos,
    };
  }

  function changeExerciseName(exerciseId, value) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      name: value,
      exerciseId: null,
      exerciseReference: exercise.exerciseReference
        ? { ...exercise.exerciseReference, modified: true }
        : null,
    }));
  }

  function selectSavedExercise(exerciseId, savedExercise) {
    const load = savedExercise.defaults.load;
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      name: savedExercise.name,
      exerciseId: null,
      exerciseReference: {
        source: "user-saved",
        sourceId: savedExercise.id,
        modified: false,
      },
      saveAsReusable: false,
      defaultLoadMode: load.mode,
      defaultWeightUnit: load.unit || "lb",
      sets: exercise.sets.map((set) =>
        set.isUntouched
          ? {
              ...set,
              loadMode: load.mode,
              weightUnit: load.unit || "lb",
            }
          : set
      ),
    }));
    setActiveSearchExerciseId(null);
  }

  function selectBuiltInExercise(exerciseId, builtInExercise) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      name: builtInExercise.name,
      exerciseId: builtInExercise.id,
      exerciseReference: null,
      saveAsReusable: false,
    }));
    setActiveSearchExerciseId(null);
  }

  function reusableDefinitionDraft(exercise) {
    return {
      name: exercise.name,
      defaultLoadMode: exercise.defaultLoadMode,
      defaultWeightUnit: exercise.defaultWeightUnit,
    };
  }

  function saveWorkout(event) {
    event.preventDefault();
    const workoutDraft = draft();
    const isActivePlannedRoadmap = editingEntryId === null
      && Boolean(plannedWorkoutIdRef.current);
    const plannedRoadmapIsComplete = isActivePlannedRoadmap
      && exercises.every(({ roadmapStatus }) =>
        roadmapStatus === "completed" || roadmapStatus === "skipped"
      );
    if (isActivePlannedRoadmap && !plannedRoadmapIsComplete) {
      const persistedDraft = {
        schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
        plannedWorkoutId: plannedWorkoutIdRef.current,
        startedAt: startedAtRef.current,
        updatedAt: new Date().toISOString(),
        form: {
          title,
          date,
          time,
          timingMode,
          activeDurationMinutes,
          caloriesBurned,
          intensity,
          notes,
          exercises,
        },
        context: {
          activeSearchExerciseId,
          roadmapEditingExerciseId,
          collapsedExerciseIds: Array.from(collapsedExerciseIds),
          ...workoutOriginContext(),
        },
      };
      try {
        writeWorkoutDraft(localStorage, persistedDraft);
        onWorkoutDraftChange(persistedDraft);
        setFormError("");
        showToast(
          "Workout progress saved.",
          workoutOriginPageRef.current || undefined
        );
        if (workoutOriginPageRef.current) returnToWorkoutOrigin();
      } catch (error) {
        setFormError("The workout progress could not be saved.");
      }
      return;
    }
    if (editingEntryId === null && !completionReview) {
      reviewWorkoutResults();
      return;
    }
    const error = getWorkoutEntryError(workoutDraft);
    if (error) {
      setValidationAttempted(true);
      setFormError(error);
      const firstCollapsedIssue = getWorkoutEntryIssues(workoutDraft).find(
        ({ exerciseId }) => exerciseId && collapsedExerciseIds.has(exerciseId)
      );
      if (firstCollapsedIssue) {
        pendingExerciseOrientationRef.current = {
          exerciseId: firstCollapsedIssue.exerciseId,
          focusName: false,
          alwaysScroll: true,
        };
        setCollapsedExerciseIds((current) => new Set(current));
      }
      return;
    }
    setValidationAttempted(false);

    const reusableExercises = exercises.filter(
      (exercise) => !exercise.exerciseReference && exercise.saveAsReusable
    );
    for (const exercise of reusableExercises) {
      const definitionError = getExerciseDefinitionError(
        reusableDefinitionDraft(exercise)
      );
      if (definitionError) {
        setFormError(definitionError);
        return;
      }
    }

    const definitionResults = saveExerciseDefinitions(
      reusableExercises.map(reusableDefinitionDraft)
    );
    const resultByExerciseId = new Map(
      reusableExercises.map((exercise, index) => [
        exercise.id,
        definitionResults[index],
      ])
    );
    const conflicts = [];
    let catalogFailure = false;
    const resolvedExercises = exercises.map((exercise) => {
      const result = resultByExerciseId.get(exercise.id);
      if (!result) {
        if (exercise.saveAsReusable && !exercise.exerciseReference) {
          catalogFailure = true;
          return { ...exercise, exerciseReference: null };
        }
        return exercise;
      }
      if (
        result.exercise &&
        (result.status === "added" || result.matchesDefinition)
      ) {
        return {
          ...exercise,
          exerciseReference: {
            source: "user-saved",
            sourceId: result.exercise.id,
            modified: false,
          },
        };
      }
      if (result.status === "duplicate") {
        conflicts.push(result.exercise?.name || exercise.name.trim());
      } else if (result.status === "error") {
        catalogFailure = true;
      }
      return { ...exercise, exerciseReference: null };
    });

    const existingEntry = workoutEntries.find(({ id }) => id === editingEntryId);
    const entry = { ...createWorkoutEntry(
      { ...workoutDraft, exercises: resolvedExercises },
      existingEntry
    ), photos };
    const saveResult =
      editingEntryId === null
        ? saveWorkoutEntry(entry)
        : updateWorkoutEntry(editingEntryId, entry);

    function finishSave(saveOutcome) {
      const saved = saveOutcome && typeof saveOutcome === "object"
        ? saveOutcome.saved
        : saveOutcome;
      if (!saved) return;
      const savedEditingEntryId = editingEntryId;
      const returnToSchedule = savedEditingEntryId === null
        && Boolean(plannedWorkoutIdRef.current)
        && Boolean(workoutOriginPageRef.current)
        && plannedRoadmapIsComplete;
      const returnToTemplates = savedEditingEntryId === null
        && workoutOriginPageRef.current === "workout-templates";
      resetForm({ clearDraft: savedEditingEntryId === null });
      const messages = [];
      const estimateMessage = saveOutcome && typeof saveOutcome === "object"
        ? workoutCalorieEstimateSaveMessage(saveOutcome.calorieEstimate)
        : "";
      if (estimateMessage) messages.push(estimateMessage);
      if (conflicts.length > 0) {
        messages.push(
          `Your existing saved ${conflicts.join(", ")} definition${
            conflicts.length === 1 ? " was" : "s were"
          } kept.`
        );
      }
      if (catalogFailure) {
        messages.push("One or more reusable exercises could not be saved.");
      }
      showToast(
        messages.length > 0
          ? `Workout traced. ${messages.join(" ")}`
          : "Workout traced",
        returnToSchedule ? workoutOriginPageRef.current : undefined
      );
      if (returnToSchedule || returnToTemplates) {
        returnToWorkoutOrigin({ clearTemplateOrigin: returnToTemplates });
        return;
      }
      if (savedEditingEntryId === null) {
        setActiveWorkoutEntryId(null);
        pageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
      } else {
        setActiveWorkoutEntryId(savedEditingEntryId);
        window.requestAnimationFrame(() => {
          workoutEntryRefs.current.get(savedEditingEntryId)?.scrollIntoView?.({
            behavior: motionScrollBehavior(),
            block: "center",
          });
        });
      }
    }

    if (saveResult && typeof saveResult.then === "function") {
      saveResult.then(finishSave);
    } else {
      finishSave(saveResult);
    }
  }

  function editWorkout(entry) {
    const entryNode = workoutEntryRefs.current.get(entry.id);
    workoutEditOriginRef.current = entryNode ? {
      entryId: entry.id,
      viewportTop: entryNode.getBoundingClientRect().top,
      documentScrollX: window.scrollX || window.pageXOffset || 0,
    } : null;
    clearPendingDropRemovals();
    const entryDateTime = localDateTime(entry.occurredAt);
    setTitle(entry.title);
    setDate(entryDateTime.date);
    setTime(entryDateTime.time);
    setTimingMode(entry.startedAt ? "live" : "manual");
    setActiveDurationMinutes(
      Number.isFinite(entry.activeDurationMinutes) && entry.activeDurationMinutes > 0
        ? String(entry.activeDurationMinutes)
        : ""
    );
    setCaloriesBurned(
      Number.isInteger(entry.caloriesBurned) && entry.caloriesBurned > 0
        ? String(entry.caloriesBurned)
        : ""
    );
    setIntensity(
      WORKOUT_INTENSITY_OPTIONS.some(({ value }) => value && value === entry.intensity)
        ? entry.intensity
        : ""
    );
    setNotes(entry.notes || "");
    setExercises(
      entry.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        exerciseId: exercise.exerciseId || null,
        exerciseReference: exercise.exerciseReference
          ? { ...exercise.exerciseReference }
          : null,
        saveAsReusable: false,
        defaultLoadMode: exercise.sets[0]?.load.mode || "external",
        defaultWeightUnit:
          exercise.sets[0]?.load.mode === "external"
            ? exercise.sets[0].load.unit
            : "lb",
        notes: exercise.notes || "",
        sets: exercise.sets.map((set) => ({
          id: set.id,
          reps: String(set.reps),
          setType: set.setType === "warm-up" ? "warm-up" : "working",
          toFailure: Boolean(set.toFailure),
          actualRepsAtFailure: set.toFailure && set.actualRepsAtFailure !== null && set.actualRepsAtFailure !== undefined
            ? String(set.actualRepsAtFailure)
            : "",
          loadMode: set.load.mode,
          weightAmount:
            set.load.mode === "external" ? String(set.load.amount) : "",
          weightUnit: set.load.mode === "external" ? set.load.unit : "lb",
          notes: set.notes || "",
          isUntouched: false,
          drops: (Array.isArray(set.drops) ? set.drops : []).map((drop) => ({
            id: drop.id,
            reps: String(drop.reps),
            toFailure: Boolean(drop.toFailure),
            actualRepsAtFailure: drop.toFailure && drop.actualRepsAtFailure !== null && drop.actualRepsAtFailure !== undefined
              ? String(drop.actualRepsAtFailure)
              : "",
            loadMode: drop.load?.mode || "external",
            weightAmount:
              drop.load?.mode === "external" ? String(drop.load.amount) : "",
            weightUnit:
              drop.load?.mode === "external" ? drop.load.unit : "lb",
            notes: drop.notes || "",
            isUntouched: false,
          })),
        })),
      }))
    );
    setCollapsedExerciseIds(new Set());
    setPhotos((entry.photos || []).map((photo) => ({ ...photo })));
    setEditingEntryId(entry.id);
    setActiveWorkoutEntryId(entry.id);
    setIsDirty(false);
    setFormError("");
    setValidationAttempted(false);
    setCompletionReview(true);
    setIsLoggingOpen(true);
    setActiveSearchExerciseId(null);
    setEditingSavedExercise(null);
    plannedWorkoutIdRef.current = entry.plannedWorkoutId || null;
    pendingFormFocusRef.current = true;
  }

  function cancelWorkout() {
    if (
      (editingEntryId !== null || isDirty) &&
      !window.confirm("Discard this workout? Your unsaved changes will be lost.")
    ) {
      return;
    }
    const editOrigin = editingEntryId !== null
      ? workoutEditOriginRef.current
      : null;
    workoutEditOriginRef.current = null;
    const returnToSchedule = editingEntryId === null
      && Boolean(plannedWorkoutIdRef.current)
      && Boolean(workoutOriginPageRef.current);
    const returnToTemplates = editingEntryId === null
      && workoutOriginPageRef.current === "workout-templates";
    resetForm({ clearDraft: editingEntryId === null });
    if (returnToSchedule || returnToTemplates) {
      returnToWorkoutOrigin({ clearTemplateOrigin: returnToTemplates });
      return;
    }
    window.requestAnimationFrame(() => {
      const originNode = editOrigin
        ? workoutEntryRefs.current.get(editOrigin.entryId)
        : null;
      if (originNode) {
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        window.scrollTo({
          top: Math.max(
            0,
            currentScrollY + originNode.getBoundingClientRect().top - editOrigin.viewportTop
          ),
          left: editOrigin.documentScrollX,
          behavior: "auto",
        });
      } else {
        pageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
      }
    });
  }

  function removeWorkout(id) {
    if (!window.confirm("Delete this workout?")) return;
    const deletedIndex = sortedEntries.findIndex((entry) => entry.id === id);
    const nextEntry = sortedEntries[deletedIndex + 1];
    const previousEntry = sortedEntries[deletedIndex - 1];
    const anchorEntry = nextEntry || previousEntry || null;
    const deletedNode = workoutEntryRefs.current.get(id);
    const anchorNode = anchorEntry
      ? workoutEntryRefs.current.get(anchorEntry.id)
      : null;
    pendingWorkoutDeleteAnchorRef.current = {
      deletedEntryId: id,
      entryId: anchorEntry?.id || null,
      viewportTop: nextEntry && deletedNode
        ? deletedNode.getBoundingClientRect().top
        : anchorNode?.getBoundingClientRect().top || 0,
      documentScrollX: window.scrollX || window.pageXOffset || 0,
      documentScrollY: window.scrollY || window.pageYOffset || 0,
    };
    const deleteResult = deleteWorkoutEntry(id);
    const finishDelete = (deleted) => {
      if (!deleted) {
        pendingWorkoutDeleteAnchorRef.current = null;
        return;
      }
      if (editingEntryId === id) resetForm();
      setExpandedWorkoutEntryIds((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setActiveWorkoutEntryId((current) => current === id
        ? anchorEntry?.id || null
        : current);
    };
    if (deleteResult && typeof deleteResult.then === "function") {
      deleteResult.then(finishDelete);
    } else {
      finishDelete(deleteResult);
    }
  }

  function toggleWorkoutEntry(id) {
    setActiveWorkoutEntryId(id);
    setExpandedWorkoutEntryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openTemplateFromWorkout(entry, trigger = null) {
    const nextDraft = workoutTemplateDraftFromWorkoutEntry(entry);
    if (!nextDraft) {
      showToast("This completed workout could not be copied into a template.");
      return;
    }
    templateInitialDraftRef.current = JSON.stringify(nextDraft);
    templateEditorReturnFocusRef.current = trigger || document.activeElement;
    setTemplateDraft(nextDraft);
    setTemplateEditor({ mode: "create", sourceWorkoutId: entry.id });
    setTemplateError("");
  }

  function openTemplateEditor(template, trigger = null) {
    const nextDraft = workoutTemplateDraftForEditing(template);
    if (!nextDraft) {
      showToast("This workout template could not be opened.");
      return;
    }
    templateInitialDraftRef.current = JSON.stringify(nextDraft);
    templateEditorReturnFocusRef.current = trigger || document.activeElement;
    setTemplateDraft(nextDraft);
    setTemplateEditor({ mode: "edit", templateId: template.id });
    setTemplateError("");
  }

  function closeTemplateEditor() {
    setTemplateEditor(null);
    setTemplateDraft(null);
    setTemplateError("");
    templateInitialDraftRef.current = null;
  }

  function cancelTemplateEditor() {
    const changed = templateDraft
      && JSON.stringify(templateDraft) !== templateInitialDraftRef.current;
    if (changed && !window.confirm("Cancel this workout template? Your unsaved changes will be lost.")) {
      return;
    }
    closeTemplateEditor();
  }

  function submitTemplate(event) {
    event.preventDefault();
    const result = templateEditor?.mode === "edit"
      ? updateWorkoutTemplate(templateEditor.templateId, templateDraft)
      : saveWorkoutTemplate(templateDraft);
    if (result?.status !== "saved") {
      setTemplateError(result?.message || "The workout template could not be saved.");
      return;
    }
    setTemplatesExpanded(true);
    closeTemplateEditor();
    showToast(templateEditor.mode === "edit" ? "Workout template updated." : "Workout template saved.");
  }

  function removeTemplate(template) {
    if (!window.confirm(`Delete the workout template “${template.name}”? Workouts and planned workouts already created from it will remain.`)) {
      return;
    }
    if (!deleteWorkoutTemplate(template.id)) {
      showToast("The workout template could not be deleted.");
      return;
    }
    showToast("Workout template deleted.");
    window.requestAnimationFrame(() => templateToggleButtonRef.current?.focus());
  }

  function startTemplate(template, conflictAction = null) {
    const result = startWorkoutTemplate(template.id, conflictAction);
    if (result?.status === "draft-conflict") {
      setTemplateConflict({
        template,
        existingDraftTitle: result.existingDraftTitle,
      });
      return;
    }
    if (result?.status === "error") {
      showToast(result.message || "The workout template could not be started.");
      return;
    }
    setTemplateConflict(null);
    if (result?.status === "resumed-existing") {
      pendingFormFocusRef.current = true;
      if (workoutOriginPageRef.current === "workout-templates") {
        setTemplateWorkoutFocused(true);
      } else {
        formHeadingRef.current?.focus({ preventScroll: true });
        formRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "start" });
      }
    }
  }

  function resumeTemplateWorkout() {
    pendingFormFocusRef.current = true;
    setTemplateWorkoutFocused(true);
  }

  function scheduleTemplate(template) {
    if (!scheduleWorkoutTemplate(template.id)) {
      showToast("The workout template could not be opened in Planned Workouts.");
    }
  }

  function completeRoadmapExercise(exerciseId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      roadmapStatus: exercise.roadmapStatus === "completed" ? "pending" : "completed",
      roadmapSkipReason: "",
    }));
    setRoadmapSkipExerciseId(null);
  }

  function saveRoadmapExerciseSkip(exerciseId, withoutReason = false) {
    const reason = withoutReason
      ? ""
      : roadmapSkipReason === "Other"
        ? roadmapCustomReason.trim()
        : roadmapSkipReason;
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      roadmapStatus: "skipped",
      roadmapSkipReason: reason,
    }));
    setRoadmapSkipExerciseId(null);
    setRoadmapSkipReason("");
    setRoadmapCustomReason("");
  }

  const isPlannedRoadmap = editingEntryId === null && Boolean(plannedWorkoutIdRef.current);
  const returnsToOrigin = Boolean(workoutOriginPageRef.current);
  const originReturnLabel = workoutOriginPageRef.current === "calendar"
    ? "Back to Calendar"
    : workoutOriginPageRef.current === "trophy-case"
      ? "Back to Trophy Case"
      : workoutOriginPageRef.current === "workout-templates"
        ? "Back to Workout Templates"
        : "Back to Today's Schedule";
  const isTemplateWorkoutOrigin = workoutOriginPageRef.current === "workout-templates";
  const isTemplateWorkoutFocused = isTemplateWorkoutOrigin
    && editingEntryId === null
    && isLoggingOpen
    && templateWorkoutFocused;
  const isTemplateWorkoutBrowsing = isTemplateWorkoutOrigin
    && editingEntryId === null
    && isLoggingOpen
    && !templateWorkoutFocused;
  const isFocusedActiveWorkout = isPlannedRoadmap || isTemplateWorkoutFocused;
  const showActiveWorkoutEditor = isLoggingOpen && !isTemplateWorkoutBrowsing;
  const volume = isPlannedRoadmap ? roadmapVolume(exercises) : null;
  const plannedRoadmapIsCompleteNow = isPlannedRoadmap && exercises.every(
    ({ roadmapStatus }) => roadmapStatus === "completed" || roadmapStatus === "skipped"
  );
  const leaveWorkout = returnsToOrigin && !isTemplateWorkoutBrowsing
    ? returnToWorkoutOrigin
    : onBack;
  const leaveWorkoutLabel = returnsToOrigin && !isTemplateWorkoutBrowsing
    ? originReturnLabel
    : "Back to Timeline";
  const validationIssues = validationAttempted ? getWorkoutEntryIssues(draft()) : [];
  const displayedFormError = validationIssues[0]?.message || formError;

  function hasValidationIssue({ exerciseId, setId, dropId, field }) {
    return validationIssues.some((issue) =>
      issue.exerciseId === exerciseId
      && issue.setId === setId
      && issue.dropId === dropId
      && issue.field === field
    );
  }

  return (
    <div className="trace-feature-page trace-feature-page--workouts" ref={pageTopRef} data-testid="workout-page" data-focused-workout={isFocusedActiveWorkout ? "true" : undefined} style={containerStyle}>
      <style>{`
        .workout-set-load-row > label,
        .workout-set-input-grid > label,
        .workout-set-entry-row > label,
        .workout-drop-entry-row > label {
          min-width: 0;
        }
        @media (max-width: 600px) {
          .workout-set-load-row {
            grid-template-columns: minmax(0, 1.35fr) minmax(0, 1.35fr) minmax(64px, 0.65fr) !important;
          }
          .workout-set-load-row.workout-set-load-row-bodyweight {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
          .workout-set-entry-row {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
          .workout-set-input-grid.external {
            grid-template-areas:
              "type type type load load load"
              "weight weight reps reps unit unit" !important;
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          }
          .workout-set-input-grid.bodyweight {
            grid-template-areas:
              "type type type load load load"
              "reps reps . . . ." !important;
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          }
          .workout-drop-entry-row {
            grid-template-areas: "load load load load weight weight weight unit unit reps reps reps";
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          }
          .workout-drop-entry-row.workout-drop-entry-row-bodyweight {
            grid-template-areas: "load load load load load load reps reps reps reps reps reps";
          }
          .workout-set-load-row input,
          .workout-set-load-row select,
          .workout-set-entry-row input,
          .workout-set-entry-row select,
          .workout-drop-entry-row input,
          .workout-drop-entry-row select {
            min-width: 0;
          }
        }
      `}</style>
      <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Performance log</p>
      <h1 style={{ marginBottom: "10px" }}>Workouts</h1>
      <p className="trace-feature-page__lede" style={{ color: "#bbb", marginBottom: "24px" }}>
        Record completed strength workouts as entered. Trace does not provide
        training recommendations.
      </p>
      </header>
      <nav className="trace-focused-navigation" aria-label="Focused event navigation">
        <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...backButtonStyle, marginTop: 0 }}>Back to Timeline</button>
        {returnsToOrigin && !isTemplateWorkoutBrowsing && <button className="trace-action trace-action--secondary" type="button" onClick={() => returnToWorkoutOrigin()} style={{ ...backButtonStyle, marginTop: 0 }}>{originReturnLabel}</button>}
      </nav>

      {!showActiveWorkoutEditor && (
        <div style={{ maxWidth: "760px", textAlign: "left", width: "100%" }}>
          <button
            className="trace-action trace-action--primary"
            type="button"
            aria-controls="workout-entry"
            aria-expanded="false"
            onClick={isTemplateWorkoutBrowsing ? resumeTemplateWorkout : openWorkoutLogger}
            style={buttonStyle}
          >
            {isTemplateWorkoutBrowsing ? "Resume Active Workout" : "Log Workout"}
          </button>
        </div>
      )}

      {showActiveWorkoutEditor && isPlannedRoadmap && (
        <form
          id="workout-entry"
          className="trace-feature-surface trace-feature-form trace-workout-roadmap"
          aria-label="Workout roadmap"
          ref={formRef}
          onSubmit={saveWorkout}
        >
          <span className="trace-badge">Active planned workout</span>
          <h2 ref={formHeadingRef} tabIndex="-1">Workout Roadmap</h2>
          <h3 className="trace-workout-roadmap__title">{title}</h3>
          {notes && <p className="trace-workout-roadmap__notes">{notes}</p>}
          <ul className="trace-workout-volume" aria-label="Workout set summary">
            <li><strong>{volume.total}</strong> total {volume.total === 1 ? "set" : "sets"}</li>
            <li><strong>{volume.warmUp}</strong> warm-up</li>
            <li><strong>{volume.working}</strong> working</li>
          </ul>
          <div className="trace-workout-roadmap__list">
            {exercises.map((exercise, exerciseIndex) => {
              const isEditing = roadmapEditingExerciseId === exercise.id;
              const isChoosingSkipReason = roadmapSkipExerciseId === exercise.id;
              const status = exercise.roadmapStatus || "pending";
              const plannedSets = exercise.sets.filter((set) => !set.isUntouched);
              return (
                <article
                  className="trace-data-card trace-workout-roadmap__exercise"
                  data-roadmap-status={status}
                  key={exercise.id}
                  aria-label={`Roadmap exercise ${exercise.name}`}
                >
                  <div className="trace-workout-roadmap__exercise-header">
                    <div>
                      <h3>{exercise.name}</h3>
                      <p>{plannedSets.length} {plannedSets.length === 1 ? "planned set" : "planned sets"}</p>
                    </div>
                    {status !== "pending" && <span className="trace-badge">{status === "completed" ? "Completed" : "Skipped"}</span>}
                  </div>
                  {plannedSets.length > 0 ? (
                    <ul className="trace-workout-roadmap__set-summary" aria-label={`${exercise.name} planned set summary`}>
                      {plannedSets.map((set) => <li key={set.id}>{roadmapSetSummary(set)}</li>)}
                    </ul>
                  ) : <p className="trace-workout-roadmap__empty">No planned sets.</p>}
                  {status === "skipped" && exercise.roadmapSkipReason && <p className="trace-workout-roadmap__reason">Reason: {exercise.roadmapSkipReason}</p>}
                  <div className="trace-workout-roadmap__actions" aria-label={`${exercise.name} roadmap actions`}>
                    <button className="trace-action trace-action--secondary" type="button" aria-pressed={status === "completed"} onClick={() => completeRoadmapExercise(exercise.id)} style={smallButtonStyle}>Completed</button>
                    <button className="trace-action trace-action--secondary" type="button" aria-expanded={isChoosingSkipReason} onClick={() => { setRoadmapSkipExerciseId((current) => current === exercise.id ? null : exercise.id); setRoadmapSkipReason(""); setRoadmapCustomReason(""); }} style={smallButtonStyle}>Skipped</button>
                    <button className="trace-action trace-action--secondary" type="button" aria-expanded={isEditing} aria-controls={`roadmap-exercise-editor-${exercise.id}`} onClick={() => setRoadmapEditingExerciseId((current) => current === exercise.id ? null : exercise.id)} style={smallButtonStyle}>Edit</button>
                  </div>
                  {isChoosingSkipReason && (
                    <section className="trace-workout-roadmap__skip" aria-label={`Skip reason for ${exercise.name}`}>
                      <label>
                        Optional reason
                        <select value={roadmapSkipReason} onChange={(event) => setRoadmapSkipReason(event.target.value)} style={formInputStyle}>
                          <option value="">No reason</option>
                          {EXERCISE_SKIP_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                          <option value="Other">Other / custom reason</option>
                        </select>
                      </label>
                      {roadmapSkipReason === "Other" && <label>Custom reason<input value={roadmapCustomReason} onChange={(event) => setRoadmapCustomReason(event.target.value)} style={formInputStyle} /></label>}
                      <div className="trace-workout-roadmap__actions">
                        <button className="trace-action trace-action--primary" type="button" onClick={() => saveRoadmapExerciseSkip(exercise.id)} style={smallButtonStyle}>Save skipped exercise</button>
                        <button className="trace-action trace-action--secondary" type="button" onClick={() => saveRoadmapExerciseSkip(exercise.id, true)} style={smallButtonStyle}>Skip without reason</button>
                        <button className="trace-action trace-action--secondary" type="button" onClick={() => setRoadmapSkipExerciseId(null)} style={smallButtonStyle}>Cancel</button>
                      </div>
                    </section>
                  )}
                  {isEditing && (
                    <section id={`roadmap-exercise-editor-${exercise.id}`} className="trace-workout-roadmap__editor" aria-label={`Edit ${exercise.name} sets`}>
                      {exercise.sets.map((set, setIndex) => (
                        <fieldset key={set.id}>
                          <legend>Set {setIndex + 1}</legend>
                          <div className="trace-workout-roadmap__set-fields">
                            <label>Set type<select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} type`} value={set.setType || "working"} onChange={(event) => updateSet(exercise.id, set.id, { setType: event.target.value })} style={formInputStyle}><option value="working">Working</option><option value="warm-up">Warm-up</option></select></label>
                            <label>Load mode<select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} load mode`} value={set.loadMode} onChange={(event) => updateSet(exercise.id, set.id, { loadMode: event.target.value })} style={formInputStyle}>{WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                            {set.loadMode === "external" && <label>Weight<input type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight`} value={set.weightAmount} onChange={(event) => updateSet(exercise.id, set.id, { weightAmount: event.target.value })} style={formInputStyle} /></label>}
                            {set.loadMode === "external" && <label>Unit<select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight unit`} value={set.weightUnit} onChange={(event) => updateSet(exercise.id, set.id, { weightUnit: event.target.value })} style={formInputStyle}>{WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
                            <label>Reps<input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} reps`} value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: event.target.value })} style={formInputStyle} /></label>
                          </div>
                          <label>Set notes (optional)<input aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} notes`} value={set.notes} onChange={(event) => updateSet(exercise.id, set.id, { notes: event.target.value })} style={formInputStyle} /></label>
                        </fieldset>
                      ))}
                      <button className="trace-action trace-action--secondary" type="button" onClick={() => setRoadmapEditingExerciseId(null)} style={smallButtonStyle}>Done editing</button>
                    </section>
                  )}
                </article>
              );
            })}
          </div>
          {completionReview && (
            <section ref={resultsRef} tabIndex="-1" aria-label="Workout completion results">
              <WorkoutResultFields
                activeDurationMinutes={activeDurationMinutes}
                caloriesBurned={caloriesBurned}
                intensity={intensity}
                onActiveDurationChange={(value) => changeField(setActiveDurationMinutes, value)}
                onCaloriesBurnedChange={(value) => changeField(setCaloriesBurned, value)}
                onIntensityChange={(value) => changeField(setIntensity, value)}
                formInputStyle={formInputStyle}
                durationInvalid={validationIssues.some(({ field }) => field === "activeDurationMinutes")}
                caloriesInvalid={validationIssues.some(({ field }) => field === "caloriesBurned")}
                liveTiming
              />
            </section>
          )}
          {formError && <p role="alert" style={{ color: "#fca5a5" }}>{formError}</p>}
          <div className="trace-workout-roadmap__finish-actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
              {plannedRoadmapIsCompleteNow && !completionReview ? "Finish Workout" : "Save Workout"}
            </button>
            {completionReview && (
              <button className="trace-action trace-action--secondary" type="button" onClick={() => setCompletionReview(false)} style={buttonStyle}>Continue Workout</button>
            )}
            <button className="trace-action trace-action--secondary" type="button" onClick={cancelWorkout} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel</button>
          </div>
        </form>
      )}

      {showActiveWorkoutEditor && !isPlannedRoadmap && (
      <form
        id="workout-entry"
        className={`trace-feature-surface trace-feature-form trace-workout-form${isTemplateWorkoutFocused ? " trace-workout-form--focused" : ""}`}
        aria-label={isTemplateWorkoutFocused ? "Active workout" : undefined}
        ref={formRef}
        onSubmit={saveWorkout}
        style={{ maxWidth: "760px", textAlign: "left", width: "100%" }}
      >
        {isTemplateWorkoutFocused && <span className="trace-badge">Active workout</span>}
        <h2 ref={formHeadingRef} tabIndex="-1">{isTemplateWorkoutFocused ? "Workout in Progress" : editingEntryId === null ? "Log Workout" : "Edit Workout"}</h2>
        {editingEntryId === null && !isTemplateWorkoutFocused && (
          <fieldset>
            <legend>Workout timing</legend>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                name="workout-timing"
                value="live"
                checked={timingMode === "live"}
                onChange={(event) => changeTimingMode(event.target.value)}
              />{" Start and track a live workout"}
            </label>
            <label style={{ display: "block", marginTop: "8px" }}>
              <input
                type="radio"
                name="workout-timing"
                value="manual"
                checked={timingMode === "manual"}
                onChange={(event) => changeTimingMode(event.target.value)}
              />{" Log a completed or historical workout"}
            </label>
          </fieldset>
        )}
        <label style={{ display: "block" }}>
          Workout title
          <input
            value={title}
            onChange={(event) => changeField(setTitle, event.target.value)}
            maxLength={120}
            aria-invalid={validationIssues.some(({ field }) => field === "title") || undefined}
            style={formInputStyle}
          />
        </label>
        {!isTemplateWorkoutFocused && <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: "16px",
          }}
        >
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => changeField(setDate, event.target.value)}
              aria-invalid={validationIssues.some(({ field }) => field === "dateTime") || undefined}
              style={formInputStyle}
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => changeField(setTime, event.target.value)}
              aria-invalid={validationIssues.some(({ field }) => field === "dateTime") || undefined}
              style={formInputStyle}
            />
          </label>
        </div>}
        <label style={{ display: "block", marginTop: "16px" }}>
          Workout notes (optional)
          <textarea
            value={notes}
            onChange={(event) => changeField(setNotes, event.target.value)}
            rows={3}
            style={formInputStyle}
          />
        </label>

        <h3>Exercises</h3>
        {exercises.map((exercise, exerciseIndex) => {
          const collapsed = collapsedExerciseIds.has(exercise.id);
          const detailId = `workout-exercise-details-${exercise.id}`;
          const missingInformationId = `workout-exercise-missing-${exercise.id}`;
          const displayName = exercise.name.trim() || `Exercise ${exerciseIndex + 1}`;
          const exerciseHasMissingInformation = validationIssues.some(
            ({ exerciseId }) => exerciseId === exercise.id
          );
          const primarySetCount = Array.isArray(exercise.sets) ? exercise.sets.length : 0;
          return (
          <section
            className={`trace-workout-exercise${collapsed ? " trace-workout-exercise--collapsed" : ""}${exerciseHasMissingInformation ? " trace-workout-exercise--missing" : ""}`}
            key={exercise.id}
            ref={(node) => {
              if (node) exerciseCardRefs.current.set(exercise.id, node);
              else exerciseCardRefs.current.delete(exercise.id);
            }}
            aria-label={`Exercise ${exerciseIndex + 1}`}
            data-missing-information={exerciseHasMissingInformation || undefined}
            onFocusCapture={() => { activeExerciseIdRef.current = exercise.id; }}
            style={{
              background: "#1f2937",
              borderRadius: "14px",
              marginBottom: "16px",
              padding: "18px",
            }}
          >
            {collapsed ? (
              <div className="trace-workout-exercise__collapsed-summary">
                <div className="trace-workout-exercise__collapsed-copy">
                  <h4>{displayName}</h4>
                  <p>{primarySetCount} {primarySetCount === 1 ? "set" : "sets"}</p>
                  {exerciseHasMissingInformation && <p id={missingInformationId} className="trace-workout-exercise__missing-text">Missing information</p>}
                </div>
                <button
                  ref={(node) => {
                    if (node) expandExerciseButtonRefs.current.set(exercise.id, node);
                    else expandExerciseButtonRefs.current.delete(exercise.id);
                  }}
                  className="trace-action trace-action--secondary"
                  type="button"
                  aria-expanded={false}
                  aria-controls={detailId}
                  aria-describedby={exerciseHasMissingInformation ? missingInformationId : undefined}
                  aria-label={`Expand Exercise: ${displayName}`}
                  onClick={() => expandExercise(exercise.id)}
                  style={smallButtonStyle}
                >
                  Expand Exercise
                </button>
              </div>
            ) : (
            <div id={detailId} className="trace-workout-exercise__details">
              <button
                className="trace-action trace-action--secondary"
              type="button"
              onClick={() => {
                setActiveSearchExerciseId((current) =>
                  current === exercise.id ? null : exercise.id
                );
                setEditingSavedExercise(null);
              }}
              aria-expanded={activeSearchExerciseId === exercise.id}
              aria-label={`Find an exercise for exercise ${exerciseIndex + 1}`}
              style={{ ...smallButtonStyle, marginBottom: "12px" }}
            >
              Find an Exercise
            </button>
            {activeSearchExerciseId === exercise.id && (
              <ExerciseSearch
                autoFocus
                exercises={savedExercises}
                onSelectExercise={(savedExercise) =>
                  selectSavedExercise(exercise.id, savedExercise)
                }
                onSelectBuiltInExercise={(builtInExercise) =>
                  selectBuiltInExercise(exercise.id, builtInExercise)
                }
                onEditExercise={(savedExercise) =>
                  setEditingSavedExercise({
                    exercise: savedExercise,
                    exerciseCardId: exercise.id,
                  })
                }
                inputStyle={inputStyle}
                resetKey={searchResetKey}
              />
            )}
            {editingSavedExercise?.exerciseCardId === exercise.id && (
              <SavedExerciseEditor
                key={editingSavedExercise.exercise.id}
                exercise={editingSavedExercise.exercise}
                onSave={updateSavedExercise}
                onCancel={() => setEditingSavedExercise(null)}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
              />
            )}
            <label style={{ display: "block" }}>
              Exercise {exerciseIndex + 1} name
              <input
                ref={(node) => {
                  if (node) exerciseNameInputRefs.current.set(exercise.id, node);
                  else exerciseNameInputRefs.current.delete(exercise.id);
                }}
                value={exercise.name}
                onChange={(event) =>
                  changeExerciseName(exercise.id, event.target.value)
                }
                maxLength={120}
                aria-invalid={hasValidationIssue({ exerciseId: exercise.id, field: "name" }) || undefined}
                style={formInputStyle}
              />
            </label>
            <label style={{ display: "block", marginTop: "10px" }}>
              Exercise notes (optional)
              <textarea
                aria-label={`Exercise ${exerciseIndex + 1} notes`}
                value={exercise.notes || ""}
                onChange={(event) =>
                  updateExercise(exercise.id, (current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={2}
                style={formInputStyle}
              />
            </label>
            {!exercise.exerciseReference && (
              <div style={{ marginTop: "12px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={exercise.saveAsReusable}
                    onChange={(event) =>
                      updateExercise(exercise.id, (current) => ({
                        ...current,
                        saveAsReusable: event.target.checked,
                        ...(event.target.checked
                          ? {
                              defaultLoadMode:
                                current.sets[0]?.loadMode ||
                                current.defaultLoadMode,
                              defaultWeightUnit:
                                current.sets[0]?.weightUnit ||
                                current.defaultWeightUnit,
                            }
                          : {}),
                      }))
                    }
                  />{" "}
                  Save as reusable exercise
                </label>
                {exercise.saveAsReusable && (
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: "10px" }}>
                    <label>
                      Reusable default load mode
                      <select
                        aria-label={`Exercise ${exerciseIndex + 1} reusable default load mode`}
                        value={exercise.defaultLoadMode}
                        onChange={(event) =>
                          updateExercise(exercise.id, (current) => ({
                            ...current,
                            defaultLoadMode: event.target.value,
                          }))
                        }
                        style={formInputStyle}
                      >
                        {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    {exercise.defaultLoadMode === "external" && (
                      <label>
                        Reusable default weight unit
                        <select
                          aria-label={`Exercise ${exerciseIndex + 1} reusable default weight unit`}
                          value={exercise.defaultWeightUnit}
                          onChange={(event) =>
                            updateExercise(exercise.id, (current) => ({
                              ...current,
                              defaultWeightUnit: event.target.value,
                            }))
                          }
                          style={formInputStyle}
                        >
                          {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
              <button className="trace-action trace-action--secondary" type="button" onClick={() => reorderExercise(exerciseIndex, -1)} disabled={exerciseIndex === 0} aria-label={`Move exercise ${exerciseIndex + 1} up`} style={smallButtonStyle}>Move Up</button>
              <button className="trace-action trace-action--secondary" type="button" onClick={() => reorderExercise(exerciseIndex, 1)} disabled={exerciseIndex === exercises.length - 1} aria-label={`Move exercise ${exerciseIndex + 1} down`} style={smallButtonStyle}>Move Down</button>
              <button className="trace-action trace-action--danger" type="button" onClick={() => removeExercise(exercise.id)} aria-label={`Remove exercise ${exerciseIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Remove Exercise</button>
            </div>

            {exercise.sets.map((set, setIndex) => (
              <fieldset
                className="trace-workout-set"
                key={set.id}
                style={{ border: "1px solid #4b5563", borderRadius: "10px", marginTop: "16px", padding: "14px" }}
              >
                <legend>Set {setIndex + 1}</legend>
                <div className={`workout-set-input-grid ${set.loadMode === "external" ? "external" : "bodyweight"}`} style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateAreas: set.loadMode === "external" ? '"type load unit" "weight reps ."' : '"type load ." "reps reps ."' }}>
                  <label className="workout-set-type-control" style={{ gridArea: "type" }}>
                    Set type
                    <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} type`} value={set.setType || "working"} onChange={(event) => updateSet(exercise.id, set.id, { setType: event.target.value })} style={formInputStyle}>
                      <option value="working">Working</option>
                      <option value="warm-up">Warm-up</option>
                    </select>
                  </label>
                  <label className="workout-set-load-control" style={{ gridArea: "load" }}>
                    Load mode
                    <select
                      aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} load mode`}
                      value={set.loadMode}
                      onChange={(event) => updateSet(exercise.id, set.id, { loadMode: event.target.value })}
                      aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, field: "loadMode" }) || undefined}
                      style={formInputStyle}
                    >
                      {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  {set.loadMode === "external" && (
                    <label className="workout-set-unit-control" style={{ gridArea: "unit" }}>
                      Unit
                      <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight unit`} value={set.weightUnit} onChange={(event) => updateSet(exercise.id, set.id, { weightUnit: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, field: "weightUnit" }) || undefined} style={{ ...formInputStyle, fontSize: "16px", padding: "10px" }}>
                        {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  )}
                  {set.loadMode === "external" && (
                    <label className="workout-set-weight-control" style={{ gridArea: "weight" }}>
                      Weight
                      <input type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight`} value={set.weightAmount} onChange={(event) => updateSet(exercise.id, set.id, { weightAmount: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, field: "weightAmount" }) || undefined} style={formInputStyle} />
                    </label>
                  )}
                  <label className="workout-set-reps-control" style={{ gridArea: "reps" }}>
                    {set.toFailure ? "Goal reps" : "Reps"}
                    <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} reps`} value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, field: "reps" }) || undefined} style={formInputStyle} />
                  </label>
                </div>
                <label style={{ display: "block", marginTop: "10px" }}>
                  <input type="checkbox" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} to failure`} checked={Boolean(set.toFailure)} onChange={(event) => updateSet(exercise.id, set.id, { toFailure: event.target.checked, actualRepsAtFailure: event.target.checked ? set.actualRepsAtFailure : "" })} />
                  {" To failure"}
                </label>
                {set.toFailure && (
                  <label style={{ display: "block", marginTop: "10px" }}>
                    Actual reps at failure (optional)
                    <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} actual reps at failure`} value={set.actualRepsAtFailure} onChange={(event) => updateSet(exercise.id, set.id, { actualRepsAtFailure: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, field: "actualRepsAtFailure" }) || undefined} style={{ ...formInputStyle, maxWidth: "140px" }} />
                  </label>
                )}
                <label style={{ display: "block", marginTop: "10px" }}>
                  Set notes (optional)
                  <input aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} notes`} value={set.notes} onChange={(event) => updateSet(exercise.id, set.id, { notes: event.target.value })} style={formInputStyle} />
                </label>
                {(() => {
                  const drops = Array.isArray(set.drops) ? set.drops : [];
                  const parentKey = `${exercise.id}|${set.id}`;
                  const pending = pendingDropRemovals[parentKey];
                  const rows = drops.map((drop, dropIndex) => ({
                    type: "drop",
                    drop,
                    dropIndex,
                    displayNumber:
                      pending && dropIndex >= pending.dropIndex
                        ? dropIndex + 2
                        : dropIndex + 1,
                  }));
                  if (pending) {
                    rows.splice(Math.min(pending.dropIndex, rows.length), 0, {
                      type: "removed",
                      pending,
                    });
                  }
                  return rows.map((row) => row.type === "removed" ? (
                    <div
                      key={`removed:${row.pending.drop.id}`}
                      ref={(node) => {
                        if (node) dropUndoRowRefs.current.set(parentKey, node);
                        else dropUndoRowRefs.current.delete(parentKey);
                      }}
                      role="status"
                      aria-live="polite"
                      style={{ alignItems: "center", background: "#374151", borderLeft: "3px solid #f59e0b", borderRadius: "8px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", marginTop: "12px", maxWidth: "100%", padding: "10px 12px" }}
                    >
                      <span>Drop removed</span>
                      <button className="trace-action trace-action--brass" type="button" onClick={() => undoDropRemoval(parentKey)} aria-label={`Undo removed drop from exercise ${exerciseIndex + 1} set ${setIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#b45309", minHeight: "44px" }}>Undo</button>
                    </div>
                  ) : (() => {
                    const { drop, displayNumber } = row;
                    return (
                  <section
                    className="trace-workout-drop"
                    key={drop.id}
                    data-drop-id={drop.id}
                    aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber}`}
                    style={{ borderLeft: "3px solid #60a5fa", marginTop: "12px", maxWidth: "100%", overflow: "hidden", padding: "10px 0 10px 12px" }}
                  >
                    <strong style={{ display: "block", marginBottom: "8px" }}>↳ Drop {displayNumber}</strong>
                    <div className={`workout-drop-entry-row${drop.loadMode === "bodyweight" ? " workout-drop-entry-row-bodyweight" : ""}`} style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", maxWidth: "100%" }}>
                      <label className="workout-drop-load-control" style={{ gridArea: "load" }}>
                        Load mode
                        <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} load mode`} value={drop.loadMode} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { loadMode: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, dropId: drop.id, field: "loadMode" }) || undefined} style={formInputStyle}>
                          {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      {drop.loadMode === "external" && (
                        <>
                          <label className="workout-drop-weight-control" style={{ gridArea: "weight" }}>
                            Weight
                            <input ref={(node) => { if (node) dropInputRefs.current.set(drop.id, node); else dropInputRefs.current.delete(drop.id); }} type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} weight`} value={drop.weightAmount} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { weightAmount: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, dropId: drop.id, field: "weightAmount" }) || undefined} style={formInputStyle} />
                          </label>
                          <label className="workout-drop-unit-control" style={{ gridArea: "unit" }}>
                            Weight unit
                            <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} weight unit`} value={drop.weightUnit} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { weightUnit: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, dropId: drop.id, field: "weightUnit" }) || undefined} style={formInputStyle}>
                              {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                      <label className="workout-drop-reps-control" style={{ gridArea: "reps" }}>
                        {drop.toFailure ? "Goal reps" : "Reps"}
                        <input ref={drop.loadMode === "bodyweight" ? (node) => { if (node) dropInputRefs.current.set(drop.id, node); else dropInputRefs.current.delete(drop.id); } : undefined} type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} reps`} value={drop.reps} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { reps: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, dropId: drop.id, field: "reps" }) || undefined} style={formInputStyle} />
                      </label>
                    </div>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      <input type="checkbox" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} to failure`} checked={Boolean(drop.toFailure)} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { toFailure: event.target.checked, actualRepsAtFailure: event.target.checked ? drop.actualRepsAtFailure : "" })} />
                      {" To failure"}
                    </label>
                    {drop.toFailure && (
                      <label style={{ display: "block", marginTop: "8px" }}>
                        Actual reps at failure (optional)
                        <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} actual reps at failure`} value={drop.actualRepsAtFailure} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { actualRepsAtFailure: event.target.value })} aria-invalid={hasValidationIssue({ exerciseId: exercise.id, setId: set.id, dropId: drop.id, field: "actualRepsAtFailure" }) || undefined} style={{ ...formInputStyle, maxWidth: "140px" }} />
                      </label>
                    )}
                    <label style={{ display: "block", marginTop: "8px" }}>
                      Drop notes (optional)
                      <input aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} notes`} value={drop.notes} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { notes: event.target.value })} style={formInputStyle} />
                    </label>
                    <button className="trace-action trace-action--danger" type="button" onClick={() => removeDrop(exercise.id, set.id, drop.id)} aria-label={`Remove exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber}`} style={{ ...smallButtonStyle, backgroundColor: "#9f1239", marginTop: "10px" }}>Remove Drop</button>
                  </section>
                    );
                  })());
                })()}
                <button className="trace-action trace-action--primary" type="button" onClick={() => addDrop(exercise.id, set.id)} aria-label={`Add drop to exercise ${exerciseIndex + 1} set ${setIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#1d4ed8", marginTop: "12px" }}>
                  {(Array.isArray(set.drops) ? set.drops : []).length > 0 ? "+ Add Another Drop" : "+ Add Drop"}
                </button>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  <button className="trace-action trace-action--secondary" type="button" disabled={setIndex === 0} onClick={() => reorderSet(exercise.id, setIndex, -1)} aria-label={`Move exercise ${exerciseIndex + 1} set ${setIndex + 1} up`} style={smallButtonStyle}>Move Up</button>
                  <button className="trace-action trace-action--secondary" type="button" disabled={setIndex === exercise.sets.length - 1} onClick={() => reorderSet(exercise.id, setIndex, 1)} aria-label={`Move exercise ${exerciseIndex + 1} set ${setIndex + 1} down`} style={smallButtonStyle}>Move Down</button>
                  <button className="trace-action trace-action--danger" type="button" onClick={() => removeSet(exercise.id, set.id)} aria-label={`Remove exercise ${exerciseIndex + 1} set ${setIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Remove Set</button>
                </div>
              </fieldset>
            ))}
            <div className="trace-workout-exercise__bottom-actions">
              <button className="trace-action trace-action--secondary" type="button" onClick={() => addSet(exercise.id)} aria-label={`Add set to exercise ${exerciseIndex + 1}`} style={smallButtonStyle}>Add Set</button>
              <button className="trace-action trace-action--secondary" type="button" onClick={() => collapseExercise(exercise.id)} aria-expanded={true} aria-controls={detailId} aria-label={`Collapse Exercise: ${displayName}`} style={smallButtonStyle}>Collapse Exercise</button>
            </div>
            </div>
            )}
          </section>
          );
        })}
        <button className="trace-action trace-action--primary" type="button" onClick={addExercise} style={smallButtonStyle}>Add Exercise</button>

        <section aria-label="Workout photo attachments" style={{ marginTop: "22px" }}>
          <h3>Photos (optional)</h3>
          <label className="trace-action trace-action--secondary" style={{ ...smallButtonStyle, cursor: "pointer", display: "inline-block" }}>
            {photos.length ? "Add More Photos" : "Choose Photos"}
            <input
              type="file"
              accept={PHOTO_SELECTION_ACCEPT}
              multiple
              style={{ display: "none" }}
              onChange={selectWorkoutPhotos}
            />
          </label>
          {photos.length > 0 && (
            <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", marginTop: "12px" }}>
              {photos.map((photo, index) => (
                <div key={photo.id || `${photo.url}-${index}`} style={{ position: "relative" }}>
                  <img src={photo.url} alt={`Workout attachment ${index + 1}`} style={{ borderRadius: "8px", height: "110px", objectFit: "cover", width: "100%" }} />
                  {false && (
                  <button type="button" aria-label={`Remove workout photo ${index + 1}`} onClick={() => { if (photo.isDraft && photo.url) URL.revokeObjectURL(photo.url); setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index)); markChanged(); }} style={{ background: "#b91c1c", border: 0, borderRadius: "50%", color: "white", cursor: "pointer", position: "absolute", right: "5px", top: "5px" }}>Ã—</button>
                  )}
                  <button className="trace-action--danger" type="button" aria-label={`Remove workout photo ${index + 1}`} onClick={() => { if (photo.isDraft && photo.url) URL.revokeObjectURL(photo.url); setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index)); markChanged(); }} style={{ background: "#b91c1c", border: 0, borderRadius: "50%", color: "white", cursor: "pointer", position: "absolute", right: "5px", top: "5px" }}>{"\u00d7"}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {completionReview && (
          <section ref={resultsRef} tabIndex="-1" aria-label="Workout completion results">
            <WorkoutResultFields
              activeDurationMinutes={activeDurationMinutes}
              caloriesBurned={caloriesBurned}
              intensity={intensity}
              onActiveDurationChange={(value) => changeField(setActiveDurationMinutes, value)}
              onCaloriesBurnedChange={(value) => changeField(setCaloriesBurned, value)}
              onIntensityChange={(value) => changeField(setIntensity, value)}
              formInputStyle={formInputStyle}
              durationInvalid={validationIssues.some(({ field }) => field === "activeDurationMinutes")}
              caloriesInvalid={validationIssues.some(({ field }) => field === "caloriesBurned")}
              liveTiming={timingMode === "live" && editingEntryId === null}
            />
          </section>
        )}
        {displayedFormError && <p role="alert" style={{ color: "#fca5a5" }}>{displayedFormError}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
            {editingEntryId !== null
              ? "Save Changes"
              : completionReview
                ? "Save Workout"
                : timingMode === "live"
                  ? "Finish Workout"
                  : "Review Workout"}
          </button>
          {completionReview && editingEntryId === null && (
            <button className="trace-action trace-action--secondary" type="button" onClick={() => setCompletionReview(false)} style={buttonStyle}>Continue Workout</button>
          )}
          <button className="trace-action trace-action--secondary" type="button" onClick={cancelWorkout} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel</button>
        </div>
      </form>
      )}

      {!isFocusedActiveWorkout && <WorkoutTemplateSection
        expanded={templatesExpanded}
        onToggle={() => setTemplatesExpanded((current) => !current)}
        templates={workoutTemplates}
        onStart={startTemplate}
        onSchedule={scheduleTemplate}
        onEdit={openTemplateEditor}
        onDelete={removeTemplate}
        buttonStyle={buttonStyle}
        toggleButtonRef={templateToggleButtonRef}
        registerStartButton={(templateId, node) => {
          if (node) templateStartButtonRefs.current.set(templateId, node);
          else templateStartButtonRefs.current.delete(templateId);
        }}
      />}

      {!isFocusedActiveWorkout && <section className="trace-feature-section trace-feature-history trace-workout-history" style={{ marginTop: "36px", maxWidth: "760px", textAlign: "left", width: "100%" }}>
        <h2>Workout History</h2>
        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No workouts logged yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {sortedEntries.map((entry) => {
              const expanded = expandedWorkoutEntryIds.has(entry.id);
              const detailId = `workout-history-details-${entry.id}`;
              const totalSets = countCompletedWorkoutSets(entry);
              const isTrophyOriginTarget = workoutOriginPageRef.current === "trophy-case"
                && activeWorkoutEntryId === entry.id
                && onReturnToTrophyCase;
              return (
                <article
                  className="trace-data-card trace-workout-history-card"
                  key={entry.id}
                  ref={(node) => {
                    if (node) workoutEntryRefs.current.set(entry.id, node);
                    else workoutEntryRefs.current.delete(entry.id);
                  }}
                  aria-current={activeWorkoutEntryId === entry.id ? "true" : undefined}
                  style={{ background: "#1f2937", borderRadius: "12px", maxWidth: "100%", overflow: "hidden", overflowWrap: "anywhere", padding: "18px", ...(isTrophyOriginTarget ? { scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 24px)" } : {}), width: "100%" }}
                >
                <div className="trace-workout-history-card__summary">
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0 }}>{entry.title}</h3>
                    <p style={{ margin: "6px 0 0" }}>
                      <time dateTime={entry.occurredAt}>
                        {new Date(entry.occurredAt).toLocaleString()}
                      </time>
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "4px 0 0" }}>
                      {totalSets} {totalSets === 1 ? "set" : "sets"}
                    </p>
                  </div>
                  <button
                    className="trace-action trace-action--secondary trace-workout-history-card__toggle"
                    type="button"
                    aria-controls={detailId}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} workout: ${entry.title}`}
                    onClick={() => toggleWorkoutEntry(entry.id)}
                    style={smallButtonStyle}
                  >
                    {expanded ? "Collapse workout" : "Expand workout"}
                  </button>
                </div>
                  {expanded && (
                    <div id={detailId} className="trace-workout-history-card__details">
                      <WorkoutTiming entry={entry} />
                <WorkoutCalorieEstimate snapshot={entry.calorieEstimate} workout={entry} />
                {entry.notes && <p style={{ whiteSpace: "pre-wrap" }}>{entry.notes}</p>}
                <WorkoutPhotos photos={entry.photos} label={`${entry.title} photos`} />
                {entry.exercises.map((exercise) => (
                  <div key={exercise.id} style={{ marginTop: "14px" }}>
                    <strong>{exercise.name}</strong>
                    <ol style={{ marginBottom: 0 }}>
                      {exercise.sets.map((set) => (
                        <li key={set.id}>
                          {completedSetDescription(set)}
                          {set.notes ? ` — ${set.notes}` : ""}
                          <CompletedDropSegments drops={set.drops} />
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                <div className="trace-workout-history-card__actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  <button className="trace-action trace-action--primary" type="button" onClick={(event) => openTemplateFromWorkout(entry, event.currentTarget)} style={smallButtonStyle}>Save as Template</button>
                  <button className="trace-action trace-action--secondary" type="button" onClick={() => editWorkout(entry)} style={smallButtonStyle}>Edit</button>
                  <button className="trace-action trace-action--danger" type="button" onClick={() => removeWorkout(entry.id)} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Delete</button>
                  {isTrophyOriginTarget && (
                    <button
                      className="trace-action trace-action--secondary"
                      type="button"
                      onClick={returnToWorkoutOrigin}
                      style={{ ...smallButtonStyle, backgroundColor: "#666" }}
                    >
                      Back to Trophy Case
                    </button>
                  )}
                </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>}

      {!isFocusedActiveWorkout && <ExerciseHistory
        workoutEntries={workoutEntries}
        trophyEntries={trophyEntries}
        addTrophyCaseEntry={addTrophyCaseEntry}
        buttonStyle={buttonStyle}
        trophySourceTarget={trophySourceTarget}
        onReturnToTrophyCase={onReturnToTrophyCase}
      />}

      {!isTemplateWorkoutFocused && <button className="trace-action trace-action--secondary" type="button" onClick={leaveWorkout} style={{ ...backButtonStyle, marginTop: "24px" }}>{leaveWorkoutLabel}</button>}
      <div
        aria-hidden="true"
        ref={workoutDeleteScrollCompensationRef}
        style={{ height: 0, pointerEvents: "none", width: "100%" }}
      />
      {templateEditor && templateDraft && (
        <WorkoutTemplateEditorDialog
          draft={templateDraft}
          error={templateError}
          mode={templateEditor.mode}
          onChange={(nextDraft) => { setTemplateDraft(nextDraft); setTemplateError(""); }}
          onCancel={cancelTemplateEditor}
          onSave={submitTemplate}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
        />
      )}
      {templateConflict && (
        <WorkoutDraftConflictDialog
          existingDraftTitle={templateConflict.existingDraftTitle}
          onResume={() => startTemplate(templateConflict.template, "resume")}
          onDiscard={() => startTemplate(templateConflict.template, "discard")}
          onCancel={() => setTemplateConflict(null)}
          discardLabel="Discard and start template"
          description={<>Resume {templateConflict.existingDraftTitle}, discard it and start {templateConflict.template.name}, or cancel.</>}
          buttonStyle={smallButtonStyle}
        />
      )}
    </div>
  );
}

export default WorkoutPage;
