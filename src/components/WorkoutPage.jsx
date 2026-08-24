import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ExerciseSearch from "./ExerciseSearch";
import SavedExerciseEditor from "./SavedExerciseEditor";
import ExerciseHistory from "./ExerciseHistory";
import WorkoutPhotos from "./WorkoutPhotos";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import {
  createWorkoutEntry,
  createWorkoutItemId,
  getWorkoutEntryError,
} from "../services/workoutEntry";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";
import { formatWorkoutDuration } from "../services/workoutDuration";
import {
  clearWorkoutDraft,
  readWorkoutDraft,
  writeWorkoutDraft,
  WORKOUT_DRAFT_SCHEMA_VERSION,
} from "../services/workoutDraft";

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
  if (!entry.startedAt || !entry.finishedAt) return null;
  const start = new Date(entry.startedAt);
  const finish = new Date(entry.finishedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(finish.getTime())) {
    return null;
  }
  const duration = formatWorkoutDuration(entry.startedAt, entry.finishedAt);

  return (
    <dl style={{ display: "grid", gap: "6px", gridTemplateColumns: "max-content minmax(0, 1fr)", margin: "10px 0", maxWidth: "100%" }}>
      <dt style={{ color: "#9ca3af" }}>Start</dt>
      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{start.toLocaleString()}</dd>
      <dt style={{ color: "#9ca3af" }}>Finish</dt>
      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{finish.toLocaleString()}</dd>
      {duration && (
        <>
          <dt style={{ color: "#9ca3af" }}>Duration</dt>
          <dd style={{ margin: 0 }}>{duration}</dd>
        </>
      )}
    </dl>
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

function WorkoutPage({
  onBack,
  navigationOriginPage = null,
  onReturnToToday = onBack,
  workoutEntries,
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
  addTrophyCaseEntry = () => false,
  buttonStyle,
  inputStyle,
  containerStyle,
  trophySourceTarget = null,
  onReturnToTrophyCase = null,
  workoutEntryTargetId = null,
  onWorkoutEntryTargetShown = () => {},
}) {
  const initialDateTime = currentLocalDateTime();
  const restoredDraftRef = useRef(readWorkoutDraft());
  const restoredForm = restoredDraftRef.current?.form;
  const [title, setTitle] = useState(restoredForm?.title || "");
  const [date, setDate] = useState(restoredForm?.date || initialDateTime.date);
  const [time, setTime] = useState(restoredForm?.time || initialDateTime.time);
  const [notes, setNotes] = useState(restoredForm?.notes || "");
  const [exercises, setExercises] = useState(() => restoredForm?.exercises || [emptyExercise()]);
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
  const [roadmapSkipExerciseId, setRoadmapSkipExerciseId] = useState(null);
  const [roadmapSkipReason, setRoadmapSkipReason] = useState("");
  const [roadmapCustomReason, setRoadmapCustomReason] = useState("");
  const [focusDropId, setFocusDropId] = useState(null);
  const [pendingDropRemovals, setPendingDropRemovals] = useState({});
  const [searchResetKey, setSearchResetKey] = useState(0);
  const pageTopRef = useRef(null);
  const formRef = useRef(null);
  const workoutEntryRefs = useRef(new Map());
  const workoutEditOriginRef = useRef(null);
  const pendingWorkoutDeleteAnchorRef = useRef(null);
  const workoutDeleteScrollCompensationRef = useRef(null);
  const dropInputRefs = useRef(new Map());
  const dropRemovalTimersRef = useRef(new Map());
  const dropUndoRowRefs = useRef(new Map());
  const pendingUndoVisibilityRef = useRef(null);
  const startedAtRef = useRef(
    restoredDraftRef.current?.startedAt ||
      new Date(`${initialDateTime.date}T${initialDateTime.time}`).toISOString()
  );
  const plannedWorkoutIdRef = useRef(
    restoredDraftRef.current?.plannedWorkoutId || null
  );
  const workoutOriginPageRef = useRef(
    restoredDraftRef.current?.context?.originPage || navigationOriginPage
  );
  const draftPersistenceEnabledRef = useRef(Boolean(restoredForm));

  useEffect(() => {
    if (editingEntryId !== null || !isDirty) return undefined;
    const persistedDraft = {
      schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
      ...(plannedWorkoutIdRef.current
        ? { plannedWorkoutId: plannedWorkoutIdRef.current }
        : {}),
      startedAt: startedAtRef.current,
      updatedAt: new Date().toISOString(),
      form: { title, date, time, notes, exercises },
      context: {
        activeSearchExerciseId,
        roadmapEditingExerciseId,
        ...(workoutOriginPageRef.current === "today"
          ? { originPage: "today" }
          : {}),
      },
    };
    const persist = () => {
      if (!draftPersistenceEnabledRef.current) return;
      try {
        writeWorkoutDraft(localStorage, persistedDraft);
        onWorkoutDraftChange(persistedDraft);
      } catch (error) {
        // Completed workout persistence reports storage failures globally. A
        // draft failure must not interrupt or discard the in-memory workout.
      }
    };
    const timeout = window.setTimeout(persist, 200);
    const flush = () => persist();
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", flush);
      persist();
    };
  }, [title, date, time, notes, exercises, activeSearchExerciseId, roadmapEditingExerciseId, editingEntryId, isDirty, onWorkoutDraftChange]);

  useLayoutEffect(() => {
    if (!focusDropId) return;
    const input = dropInputRefs.current.get(focusDropId);
    if (input) {
      input.focus({ preventScroll: true });
      setFocusDropId(null);
    }
  }, [exercises, focusDropId]);

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
      row.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
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
        behavior: "smooth",
        block: "center",
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


  function markChanged() {
    draftPersistenceEnabledRef.current = true;
    setIsDirty(true);
    setFormError("");
  }

  function changeField(setValue, value) {
    setValue(value);
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
    setExercises((current) => [...current, emptyExercise()]);
    markChanged();
  }

  function removeExercise(exerciseId) {
    setExercises((current) => current.filter(({ id }) => id !== exerciseId));
    markChanged();
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
    if (clearDraft) draftPersistenceEnabledRef.current = false;
    const current = currentLocalDateTime();
    setTitle("");
    setDate(current.date);
    setTime(current.time);
    setNotes("");
    setExercises([emptyExercise()]);
    setEditingEntryId(null);
    setIsDirty(false);
    setFormError("");
    setActiveSearchExerciseId(null);
    setRoadmapEditingExerciseId(null);
    setRoadmapSkipExerciseId(null);
    setRoadmapSkipReason("");
    setRoadmapCustomReason("");
    setEditingSavedExercise(null);
    photos.filter(({ isDraft }) => isDraft).forEach(({ url }) => url && URL.revokeObjectURL(url));
    setPhotos([]);
    setSearchResetKey((current) => current + 1);
    startedAtRef.current = new Date(`${current.date}T${current.time}`).toISOString();
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
        form: { title, date, time, notes, exercises },
        context: {
          activeSearchExerciseId,
          roadmapEditingExerciseId,
          ...(workoutOriginPageRef.current === "today"
            ? { originPage: "today" }
            : {}),
        },
      };
      try {
        writeWorkoutDraft(localStorage, persistedDraft);
        onWorkoutDraftChange(persistedDraft);
        setFormError("");
        showToast(
          "Workout progress saved.",
          workoutOriginPageRef.current === "today" ? "today" : undefined
        );
        if (workoutOriginPageRef.current === "today") onReturnToToday();
      } catch (error) {
        setFormError("The workout progress could not be saved.");
      }
      return;
    }
    const error = getWorkoutEntryError(workoutDraft);
    if (error) {
      setFormError(error);
      return;
    }

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

    function finishSave(saved) {
      if (!saved) return;
      const savedEditingEntryId = editingEntryId;
      const returnToToday = savedEditingEntryId === null
        && Boolean(plannedWorkoutIdRef.current)
        && workoutOriginPageRef.current === "today"
        && plannedRoadmapIsComplete;
      resetForm({ clearDraft: savedEditingEntryId === null });
      const messages = [];
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
        returnToToday ? "today" : undefined
      );
      if (returnToToday) {
        onReturnToToday();
        return;
      }
      if (savedEditingEntryId === null) {
        setActiveWorkoutEntryId(null);
        pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
      } else {
        setActiveWorkoutEntryId(savedEditingEntryId);
        window.requestAnimationFrame(() => {
          workoutEntryRefs.current.get(savedEditingEntryId)?.scrollIntoView?.({
            behavior: "smooth",
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
    setPhotos((entry.photos || []).map((photo) => ({ ...photo })));
    setEditingEntryId(entry.id);
    setActiveWorkoutEntryId(entry.id);
    setIsDirty(false);
    setFormError("");
    setActiveSearchExerciseId(null);
    setEditingSavedExercise(null);
    plannedWorkoutIdRef.current = entry.plannedWorkoutId || null;
    formRef.current?.scrollIntoView?.({ behavior: "smooth" });
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
    resetForm({ clearDraft: editingEntryId === null });
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
        pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
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
  const returnsToToday = isPlannedRoadmap && workoutOriginPageRef.current === "today";
  const volume = isPlannedRoadmap ? roadmapVolume(exercises) : null;
  const leaveWorkout = returnsToToday ? onReturnToToday : onBack;
  const leaveWorkoutLabel = returnsToToday ? "Back to Today's Schedule" : "Back to Timeline";

  return (
    <div className="trace-feature-page trace-feature-page--workouts" ref={pageTopRef} data-testid="workout-page" style={containerStyle}>
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
        {returnsToToday && <button className="trace-action trace-action--secondary" type="button" onClick={onReturnToToday} style={{ ...backButtonStyle, marginTop: 0 }}>Back to Today&apos;s Schedule</button>}
      </nav>

      {isPlannedRoadmap && (
        <form
          className="trace-feature-surface trace-feature-form trace-workout-roadmap"
          aria-label="Workout roadmap"
          ref={formRef}
          onSubmit={saveWorkout}
        >
          <span className="trace-badge">Active planned workout</span>
          <h2>Workout Roadmap</h2>
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
          {formError && <p role="alert" style={{ color: "#fca5a5" }}>{formError}</p>}
          <div className="trace-workout-roadmap__finish-actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>Save Workout</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={cancelWorkout} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel</button>
          </div>
        </form>
      )}

      {!isPlannedRoadmap && (
      <form
        className="trace-feature-surface trace-feature-form trace-workout-form"
        ref={formRef}
        onSubmit={saveWorkout}
        style={{ maxWidth: "760px", textAlign: "left", width: "100%" }}
      >
        <h2>{editingEntryId === null ? "Log Workout" : "Edit Workout"}</h2>
        <label style={{ display: "block" }}>
          Workout title
          <input
            value={title}
            onChange={(event) => changeField(setTitle, event.target.value)}
            maxLength={120}
            style={formInputStyle}
          />
        </label>
        <div
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
              style={formInputStyle}
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => changeField(setTime, event.target.value)}
              style={formInputStyle}
            />
          </label>
        </div>
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
        {exercises.map((exercise, exerciseIndex) => (
          <section
            className="trace-workout-exercise"
            key={exercise.id}
            aria-label={`Exercise ${exerciseIndex + 1}`}
            style={{
              background: "#1f2937",
              borderRadius: "14px",
              marginBottom: "16px",
              padding: "18px",
            }}
          >
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
                value={exercise.name}
                onChange={(event) =>
                  changeExerciseName(exercise.id, event.target.value)
                }
                maxLength={120}
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
                      style={formInputStyle}
                    >
                      {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  {set.loadMode === "external" && (
                    <label className="workout-set-unit-control" style={{ gridArea: "unit" }}>
                      Unit
                      <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight unit`} value={set.weightUnit} onChange={(event) => updateSet(exercise.id, set.id, { weightUnit: event.target.value })} style={{ ...formInputStyle, fontSize: "16px", padding: "10px" }}>
                        {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  )}
                  {set.loadMode === "external" && (
                    <label className="workout-set-weight-control" style={{ gridArea: "weight" }}>
                      Weight
                      <input type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight`} value={set.weightAmount} onChange={(event) => updateSet(exercise.id, set.id, { weightAmount: event.target.value })} style={formInputStyle} />
                    </label>
                  )}
                  <label className="workout-set-reps-control" style={{ gridArea: "reps" }}>
                    {set.toFailure ? "Goal reps" : "Reps"}
                    <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} reps`} value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: event.target.value })} style={formInputStyle} />
                  </label>
                </div>
                <label style={{ display: "block", marginTop: "10px" }}>
                  <input type="checkbox" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} to failure`} checked={Boolean(set.toFailure)} onChange={(event) => updateSet(exercise.id, set.id, { toFailure: event.target.checked, actualRepsAtFailure: event.target.checked ? set.actualRepsAtFailure : "" })} />
                  {" To failure"}
                </label>
                {set.toFailure && (
                  <label style={{ display: "block", marginTop: "10px" }}>
                    Actual reps at failure (optional)
                    <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} actual reps at failure`} value={set.actualRepsAtFailure} onChange={(event) => updateSet(exercise.id, set.id, { actualRepsAtFailure: event.target.value })} style={{ ...formInputStyle, maxWidth: "140px" }} />
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
                        <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} load mode`} value={drop.loadMode} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { loadMode: event.target.value })} style={formInputStyle}>
                          {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      {drop.loadMode === "external" && (
                        <>
                          <label className="workout-drop-weight-control" style={{ gridArea: "weight" }}>
                            Weight
                            <input ref={(node) => { if (node) dropInputRefs.current.set(drop.id, node); else dropInputRefs.current.delete(drop.id); }} type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} weight`} value={drop.weightAmount} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { weightAmount: event.target.value })} style={formInputStyle} />
                          </label>
                          <label className="workout-drop-unit-control" style={{ gridArea: "unit" }}>
                            Weight unit
                            <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} weight unit`} value={drop.weightUnit} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { weightUnit: event.target.value })} style={formInputStyle}>
                              {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                      <label className="workout-drop-reps-control" style={{ gridArea: "reps" }}>
                        {drop.toFailure ? "Goal reps" : "Reps"}
                        <input ref={drop.loadMode === "bodyweight" ? (node) => { if (node) dropInputRefs.current.set(drop.id, node); else dropInputRefs.current.delete(drop.id); } : undefined} type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} reps`} value={drop.reps} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { reps: event.target.value })} style={formInputStyle} />
                      </label>
                    </div>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      <input type="checkbox" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} to failure`} checked={Boolean(drop.toFailure)} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { toFailure: event.target.checked, actualRepsAtFailure: event.target.checked ? drop.actualRepsAtFailure : "" })} />
                      {" To failure"}
                    </label>
                    {drop.toFailure && (
                      <label style={{ display: "block", marginTop: "8px" }}>
                        Actual reps at failure (optional)
                        <input type="number" min="0" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} drop ${displayNumber} actual reps at failure`} value={drop.actualRepsAtFailure} onChange={(event) => updateDrop(exercise.id, set.id, drop.id, { actualRepsAtFailure: event.target.value })} style={{ ...formInputStyle, maxWidth: "140px" }} />
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
            <button className="trace-action trace-action--secondary" type="button" onClick={() => addSet(exercise.id)} aria-label={`Add set to exercise ${exerciseIndex + 1}`} style={{ ...smallButtonStyle, marginTop: "14px" }}>Add Set</button>
          </section>
        ))}
        <button className="trace-action trace-action--primary" type="button" onClick={addExercise} style={smallButtonStyle}>Add Exercise</button>

        <section aria-label="Workout photo attachments" style={{ marginTop: "22px" }}>
          <h3>Photos (optional)</h3>
          <label className="trace-action trace-action--secondary" style={{ ...smallButtonStyle, cursor: "pointer", display: "inline-block" }}>
            {photos.length ? "Add More Photos" : "Choose Photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(event) => {
                const additions = Array.from(event.target.files || []).map((blob) => ({ blob, isDraft: true, url: URL.createObjectURL(blob) }));
                if (additions.length) { setPhotos((current) => [...current, ...additions]); markChanged(); }
                event.target.value = "";
              }}
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

        {formError && <p role="alert" style={{ color: "#fca5a5" }}>{formError}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>{editingEntryId === null ? "Save Workout" : "Save Changes"}</button>
          <button className="trace-action trace-action--secondary" type="button" onClick={cancelWorkout} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel</button>
        </div>
      </form>
      )}

      <section className="trace-feature-section trace-feature-history trace-workout-history" style={{ marginTop: "36px", maxWidth: "760px", textAlign: "left", width: "100%" }}>
        <h2>Workout History</h2>
        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No workouts logged yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {sortedEntries.map((entry) => {
              const expanded = expandedWorkoutEntryIds.has(entry.id);
              const detailId = `workout-history-details-${entry.id}`;
              return (
                <article
                  className="trace-data-card trace-workout-history-card"
                  key={entry.id}
                  ref={(node) => {
                    if (node) workoutEntryRefs.current.set(entry.id, node);
                    else workoutEntryRefs.current.delete(entry.id);
                  }}
                  aria-current={activeWorkoutEntryId === entry.id ? "true" : undefined}
                  style={{ background: "#1f2937", borderRadius: "12px", maxWidth: "100%", overflow: "hidden", overflowWrap: "anywhere", padding: "18px", width: "100%" }}
                >
                <div className="trace-workout-history-card__summary">
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0 }}>{entry.title}</h3>
                    <p style={{ margin: "6px 0 0" }}>
                      <time dateTime={entry.occurredAt}>
                        {new Date(entry.occurredAt).toLocaleString()}
                      </time>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  <button className="trace-action trace-action--secondary" type="button" onClick={() => editWorkout(entry)} style={smallButtonStyle}>Edit</button>
                  <button className="trace-action trace-action--danger" type="button" onClick={() => removeWorkout(entry.id)} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Delete</button>
                </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ExerciseHistory
        workoutEntries={workoutEntries}
        trophyEntries={trophyEntries}
        addTrophyCaseEntry={addTrophyCaseEntry}
        buttonStyle={buttonStyle}
        trophySourceTarget={trophySourceTarget}
        onReturnToTrophyCase={onReturnToTrophyCase}
      />

      <button className="trace-action trace-action--secondary" type="button" onClick={leaveWorkout} style={{ ...backButtonStyle, marginTop: "24px" }}>{leaveWorkoutLabel}</button>
      <div
        aria-hidden="true"
        ref={workoutDeleteScrollCompensationRef}
        style={{ height: 0, pointerEvents: "none", width: "100%" }}
      />
    </div>
  );
}

export default WorkoutPage;
