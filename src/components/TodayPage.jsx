import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseSearch from "./ExerciseSearch";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";
import { formatDateOnly } from "../services/dateOnly";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";
import {
  getPlannedWorkoutError,
  isPlannedWorkoutSkippedOnDate,
} from "../services/plannedWorkout";
import {
  formatProtocolSchedule,
  protocolItemsScheduledForDate,
} from "../services/protocol";
import { createWorkoutItemId } from "../services/workoutEntry";

export function localScheduledDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function emptyPlannedExercise() {
  return {
    id: createWorkoutItemId("planned-exercise"),
    name: "",
    notes: "",
    targetSets: [],
  };
}

function emptyTargetSet(inheritedLoad = null) {
  return {
    id: createWorkoutItemId("planned-set"),
    setType: "working",
    reps: "",
    load: inheritedLoad ? { ...inheritedLoad } : null,
    notes: "",
  };
}

function copyPlanForEditing(plan) {
  return {
    ...plan,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      exerciseReference: exercise.exerciseReference
        ? { ...exercise.exerciseReference }
        : undefined,
      targetSets: exercise.targetSets.map((target) => ({
        ...target,
        load: target.load ? { ...target.load } : null,
      })),
    })),
  };
}

const WORKOUT_SKIP_REASONS = [
  "Pain or discomfort",
  "Equipment unavailable",
  "Not enough time",
  "Low energy",
  "Schedule conflict",
];

function plannedSetPreview(target) {
  const setType = target.setType === "warm-up" ? "Warm-up" : "Working";
  const reps = target.reps === undefined ? "reps open" : target.reps;
  if (!target.load) return `${setType} · No weight target × ${reps}`;
  if (target.load.mode === "bodyweight") return `${setType} · Bodyweight × ${reps}`;
  const weight = target.load.amount === undefined
    ? "Weight open"
    : `${target.load.amount} ${target.load.unit}`;
  return `${setType} · ${weight} × ${reps}`;
}

function plannedWorkoutVolume(exercises) {
  const sets = exercises.flatMap((exercise) => exercise.targetSets || []);
  const warmUp = sets.filter(({ setType }) => setType === "warm-up").length;
  return {
    total: sets.length,
    warmUp,
    working: sets.length - warmUp,
  };
}

function scheduleTimeLabel(item) {
  const time = item?.schedule?.time || item?.time;
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function protocolActionSummary(item) {
  return [
    item.compound.name,
    `${item.dose.amount} ${formatDoseUnit(item.dose)}`,
    scheduleTimeLabel(item),
  ].filter(Boolean).join(" · ");
}

function TodayPage({
  onBack,
  plannedWorkouts = [],
  protocols = [],
  workoutEntries = [],
  activeWorkoutDraft = null,
  savedExercises = [],
  saveExerciseDefinitions = () => [],
  createPlannedWorkout,
  updatePlannedWorkout,
  deletePlannedWorkout,
  restorePlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be restored.",
  }),
  skipPlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be skipped.",
  }),
  startPlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be started.",
  }),
  openCompletedWorkout = () => false,
  showToast = () => {},
  currentDate = new Date(),
  buttonStyle = {},
  inputStyle = {},
  containerStyle = {},
}) {
  const todayKey = localScheduledDate(currentDate);
  const todaysPlans = useMemo(
    () => plannedWorkouts.filter(({ scheduledDate }) => scheduledDate === todayKey),
    [plannedWorkouts, todayKey]
  );
  const todaysProtocolItems = useMemo(
    () => protocolItemsScheduledForDate(protocols, currentDate),
    [protocols, currentDate]
  );
  const scheduleItems = useMemo(() => [
    ...todaysPlans.map((plan) => ({
      id: plan.id,
      type: "workout",
      title: plan.title,
      plan,
    })),
    ...todaysProtocolItems.map(({ protocol, item }) => ({
      id: `${protocol.id}:${item.id}`,
      type: "protocol",
      title: protocolActionSummary(item),
      subtitle: `${protocol.name} · ${formatRoute(item.route)}`,
      protocol,
      item,
    })),
  ], [todaysPlans, todaysProtocolItems]);
  const completedWorkoutByPlanId = useMemo(() => {
    const completed = new Map();
    workoutEntries.forEach((entry) => {
      if (entry.plannedWorkoutId && !completed.has(entry.plannedWorkoutId)) {
        completed.set(entry.plannedWorkoutId, entry);
      }
    });
    return completed;
  }, [workoutEntries]);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeSearchExerciseId, setActiveSearchExerciseId] = useState(null);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [draftConflict, setDraftConflict] = useState(null);
  const [previewPlanId, setPreviewPlanId] = useState(null);
  const [pendingSkipPlan, setPendingSkipPlan] = useState(null);
  const [skipReason, setSkipReason] = useState("");
  const [customSkipReason, setCustomSkipReason] = useState("");
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const initialDraftRef = useRef(null);
  const conflictResumeButtonRef = useRef(null);
  const startButtonRefs = useRef(new Map());
  const restoreStartFocusPlanIdRef = useRef(null);
  const previewPlan = plannedWorkouts.find(({ id }) => id === previewPlanId) || null;
  const activePlannedWorkoutId = activeWorkoutDraft?.plannedWorkoutId || null;

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (draftConflict) {
      conflictResumeButtonRef.current?.focus();
      return;
    }
    const planId = restoreStartFocusPlanIdRef.current;
    if (!planId) return;
    restoreStartFocusPlanIdRef.current = null;
    startButtonRefs.current.get(planId)?.focus();
  }, [draftConflict]);

  function openCreate() {
    const nextDraft = {
      scheduledDate: todayKey,
      title: "",
      notes: "",
      exercises: [emptyPlannedExercise()],
    };
    initialDraftRef.current = JSON.stringify(nextDraft);
    setDraft(nextDraft);
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
    setDraftConflict(null);
    setPreviewPlanId(null);
  }

  function openEdit(plan) {
    const nextDraft = copyPlanForEditing(plan);
    initialDraftRef.current = JSON.stringify(nextDraft);
    setDraft(nextDraft);
    setEditingId(plan.id);
    setActiveSearchExerciseId(null);
    setFormError("");
    setDraftConflict(null);
    setPreviewPlanId(null);
  }

  function closeEditor() {
    setDraft(null);
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
    initialDraftRef.current = null;
  }

  function openPreview(plan) {
    setPreviewPlanId(plan.id);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
    setFormError("");
  }

  function closePreview() {
    setPreviewPlanId(null);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
  }

  function cancelEditor() {
    const hasUnsavedChanges = draft
      && JSON.stringify(draft) !== initialDraftRef.current;
    if (
      hasUnsavedChanges
      && !window.confirm("Cancel planning this workout? Your unsaved changes will be lost.")
    ) {
      return;
    }
    closeEditor();
  }

  function startPlan(plan, conflictAction = null) {
    const result = startPlannedWorkout(plan.id, conflictAction);
    if (result?.status === "draft-conflict") {
      setDraftConflict({
        planId: plan.id,
        existingDraftTitle: result.existingDraftTitle,
      });
      setFormError("");
      return;
    }
    if (result?.status === "error") {
      setFormError(
        result.message || "The planned workout could not be started."
      );
      return;
    }
    if (result?.status === "completed" && result.workoutEntry) {
      openCompletedWorkout(result.workoutEntry.id);
      return;
    }
    setDraftConflict(null);
    setFormError("");
  }

  function cancelDraftConflict() {
    restoreStartFocusPlanIdRef.current = draftConflict?.planId || null;
    setDraftConflict(null);
  }

  function updateExercise(exerciseId, update) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? update(exercise) : exercise
      ),
    }));
  }

  function changeExerciseName(exerciseId, name) {
    updateExercise(exerciseId, (exercise) => {
      const changed = { ...exercise, name };
      delete changed.exerciseId;
      if (exercise.exerciseReference) {
        changed.exerciseReference = {
          ...exercise.exerciseReference,
          modified: true,
        };
      }
      return changed;
    });
  }

  function selectSavedExercise(exerciseId, exerciseDefinition) {
    updateExercise(exerciseId, (exercise) => {
      const selected = {
        ...exercise,
        name: exerciseDefinition.name,
        exerciseReference: {
          source: "user-saved",
          sourceId: exerciseDefinition.id,
          modified: false,
        },
      };
      delete selected.exerciseId;
      return selected;
    });
    setActiveSearchExerciseId(null);
  }

  function selectBuiltInExercise(exerciseId, builtInExercise) {
    updateExercise(exerciseId, (exercise) => {
      const selected = {
        ...exercise,
        name: builtInExercise.name,
        exerciseId: builtInExercise.id,
      };
      delete selected.exerciseReference;
      return selected;
    });
    setActiveSearchExerciseId(null);
  }

  function addExercise() {
    setDraft((current) => ({
      ...current,
      exercises: [...current.exercises, emptyPlannedExercise()],
    }));
    setActiveSearchExerciseId(null);
    setSearchResetKey((current) => current + 1);
  }

  function removeExercise(exerciseId) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter(({ id }) => id !== exerciseId),
    }));
    if (activeSearchExerciseId === exerciseId) setActiveSearchExerciseId(null);
  }

  function moveExercise(index, direction) {
    setDraft((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[destination]] = [exercises[destination], exercises[index]];
      return { ...current, exercises };
    });
  }

  function updateTarget(exerciseId, targetId, values) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: exercise.targetSets.map((target) =>
        target.id === targetId ? { ...target, ...values } : target
      ),
    }));
  }

  function addTarget(exerciseId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: [
        ...exercise.targetSets,
        emptyTargetSet(exercise.targetSets[exercise.targetSets.length - 1]?.load),
      ],
    }));
  }

  function saveReusableExercise(exercise, exerciseIndex) {
    const inheritedLoad = exercise.targetSets.find(({ load }) => load)?.load;
    const definition = {
      name: exercise.name,
      defaultLoadMode: inheritedLoad?.mode || "external",
      defaultWeightUnit: inheritedLoad?.mode === "external"
        ? inheritedLoad.unit
        : "lb",
    };
    const error = getExerciseDefinitionError(definition);
    if (error) {
      setFormError(`Exercise ${exerciseIndex + 1}: ${error}`);
      return;
    }
    const result = saveExerciseDefinitions([definition])?.[0];
    if (result?.status === "added") {
      setFormError("");
      showToast(`${exercise.name.trim()} saved as a reusable exercise.`);
      return;
    }
    if (result?.status === "duplicate" && result.matchesDefinition) {
      setFormError("");
      showToast(`${exercise.name.trim()} is already saved for reuse.`);
      return;
    }
    setFormError(
      result?.status === "duplicate"
        ? `A reusable exercise named ${exercise.name.trim()} already exists with different defaults.`
        : "The reusable exercise could not be saved."
    );
  }

  function removeTarget(exerciseId, targetId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: exercise.targetSets.filter(({ id }) => id !== targetId),
    }));
  }

  function savePlan(event) {
    event.preventDefault();
    const error = getPlannedWorkoutError(draft);
    if (error) {
      setFormError(error);
      return;
    }
    const result = editingId
      ? updatePlannedWorkout(editingId, draft)
      : createPlannedWorkout(draft);
    if (result?.status !== "saved") {
      setFormError(result?.message || "The planned workout could not be saved.");
      return;
    }
    setPendingDeletion(null);
    showToast(editingId ? "Planned workout updated." : "Planned workout created.");
    closeEditor();
  }

  function removePlan(plan) {
    if (!window.confirm(`Delete the planned workout “${plan.title}”? Completed workout history will not be changed.`)) {
      return;
    }
    if (!deletePlannedWorkout(plan.id)) {
      setFormError("The planned workout could not be deleted.");
      return;
    }
    setPendingDeletion({
      plannedWorkout: plan,
      originalIndex: plannedWorkouts.findIndex(({ id }) => id === plan.id),
    });
    if (editingId === plan.id) closeEditor();
    setFormError("");
    showToast("Planned workout deleted.");
  }

  function requestSkipPlan(plan) {
    if (!window.confirm(`Skip workout “${plan.title}” for today? This keeps the plan and does not create a completed workout.`)) {
      return false;
    }
    setPendingSkipPlan(plan);
    setPreviewPlanId(plan.id);
    setSkipReason("");
    setCustomSkipReason("");
    return true;
  }

  function confirmSkipPlan(reason) {
    if (!pendingSkipPlan) return;
    const selectedReason = reason === null
      ? ""
      : (reason || (skipReason === "Other" ? customSkipReason : skipReason));
    const result = skipPlannedWorkout(pendingSkipPlan.id, todayKey, selectedReason.trim());
    if (result?.status !== "skipped") {
      setFormError(result?.message || "The planned workout could not be skipped.");
      return;
    }
    setFormError("");
    showToast(`${pendingSkipPlan.title} marked skipped for today.`);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
  }

  function undoPlanDeletion() {
    if (!pendingDeletion) return;
    const result = restorePlannedWorkout(
      pendingDeletion.plannedWorkout,
      pendingDeletion.originalIndex
    );
    setPendingDeletion(null);
    if (result?.status !== "restored") {
      setFormError(result?.message || "The planned workout could not be restored.");
      return;
    }
    setFormError("");
    showToast("Planned workout restored.");
  }

  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "8px",
    padding: "10px",
    width: "100%",
  };
  const compactButtonStyle = {
    ...buttonStyle,
    fontSize: "15px",
    marginTop: 0,
    padding: "9px 12px",
  };
  const backStyle = { ...buttonStyle, backgroundColor: "#666" };

  return (
    <div
      className="trace-feature-page trace-feature-page--today"
      data-editor-mode={draft ? (editingId ? "edit" : "create") : "closed"}
      data-layout={isMobile ? "mobile" : "desktop"}
      data-testid="today-page"
      style={containerStyle}
    >
      <header className="trace-feature-page__identity">
        <p className="trace-feature-page__kicker">Daily planning</p>
        <h1>Today&apos;s Schedule</h1>
        <p className="trace-feature-page__lede">
          Review today&apos;s workout plans and protocol items. Plans stay separate from completed history.
        </p>
      </header>

      <div className="trace-today-page__actions">
        <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>
          Back to Timeline
        </button>
        {!draft && !previewPlan && (
          <button className="trace-action trace-action--primary" type="button" onClick={openCreate} style={buttonStyle}>
            Create planned workout
          </button>
        )}
      </div>

      {pendingDeletion && (
        <div className="trace-today-page__status">
          <button
            className="trace-action trace-action--secondary"
            type="button"
            onClick={undoPlanDeletion}
            style={{ ...buttonStyle, fontSize: "15px", marginTop: 0, padding: "7px 12px" }}
          >
            Undo
          </button>
        </div>
      )}
      {!draft && formError && <p role="alert" className="trace-today-page__error">{formError}</p>}

      {draft && (
        <form className="trace-feature-surface trace-feature-form trace-today-editor" aria-label={editingId ? "Edit planned workout" : "Create planned workout"} onSubmit={savePlan}>
          <h2>{editingId ? "Edit planned workout" : "Create planned workout"}</h2>
          <div className="trace-today-editor__details" data-testid="planned-workout-details" style={{ gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}>
            <label>
              Planned workout title
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={160} style={fieldStyle} />
            </label>
            <label>
              Scheduled date
              <input type="date" value={draft.scheduledDate} onChange={(event) => setDraft((current) => ({ ...current, scheduledDate: event.target.value }))} style={fieldStyle} />
            </label>
          </div>
          <label style={{ display: "block", marginTop: "14px" }}>
            Planned workout notes (optional)
            <textarea value={draft.notes || ""} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} style={fieldStyle} />
          </label>

          <section aria-label="Planned exercises" className="trace-today-editor__exercises">
            <div className="trace-today-editor__section-heading">
              <h3>Exercises</h3>
              <span>{draft.exercises.length} planned</span>
            </div>
            {draft.exercises.map((exercise, exerciseIndex) => (
              <fieldset className="trace-data-card trace-today-exercise" key={exercise.id}>
                <legend>Exercise {exerciseIndex + 1}</legend>
                <div className="trace-today-exercise__actions">
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-expanded={activeSearchExerciseId === exercise.id} aria-label={`Find an exercise for exercise ${exerciseIndex + 1}`} onClick={() => setActiveSearchExerciseId((current) => current === exercise.id ? null : exercise.id)} style={compactButtonStyle}>
                    Find an Exercise
                  </button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Move exercise ${exerciseIndex + 1} up`} disabled={exerciseIndex === 0} onClick={() => moveExercise(exerciseIndex, -1)} style={compactButtonStyle}>Move up</button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Move exercise ${exerciseIndex + 1} down`} disabled={exerciseIndex === draft.exercises.length - 1} onClick={() => moveExercise(exerciseIndex, 1)} style={compactButtonStyle}>Move down</button>
                  <button className="trace-action trace-action--danger" type="button" aria-label={`Remove exercise ${exerciseIndex + 1}`} disabled={draft.exercises.length === 1} onClick={() => removeExercise(exercise.id)} style={compactButtonStyle}>Remove exercise</button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Save exercise ${exerciseIndex + 1} as reusable`} onClick={() => saveReusableExercise(exercise, exerciseIndex)} style={compactButtonStyle}>Save as reusable exercise</button>
                </div>
                {activeSearchExerciseId === exercise.id && (
                  <ExerciseSearch
                    autoFocus
                    exercises={savedExercises}
                    onSelectExercise={(selected) => selectSavedExercise(exercise.id, selected)}
                    onSelectBuiltInExercise={(selected) => selectBuiltInExercise(exercise.id, selected)}
                    inputStyle={inputStyle}
                    resetKey={searchResetKey}
                  />
                )}
                <div className="trace-today-editor__details" style={{ gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}>
                  <label>
                    Exercise {exerciseIndex + 1} name
                    <input value={exercise.name} onChange={(event) => changeExerciseName(exercise.id, event.target.value)} maxLength={120} style={fieldStyle} />
                  </label>
                  <label>
                    Exercise {exerciseIndex + 1} notes (optional)
                    <input value={exercise.notes || ""} onChange={(event) => updateExercise(exercise.id, (current) => ({ ...current, notes: event.target.value }))} maxLength={240} style={fieldStyle} />
                  </label>
                </div>

                <div className="trace-today-targets">
                  <div className="trace-today-editor__section-heading">
                    <strong>Target sets</strong>
                    {exercise.targetSets.length > 0 && (
                      <button className="trace-action trace-action--secondary" type="button" aria-label={`Add target set to exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                    )}
                  </div>
                  {exercise.targetSets.length === 0 ? (
                    <button className="trace-action trace-action--secondary trace-today-add-target" type="button" aria-label={`Add target set to exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                  ) : exercise.targetSets.map((target, targetIndex) => (
                    <fieldset className="trace-today-target" key={target.id}>
                      <legend>Target set {targetIndex + 1}</legend>
                      <div
                        className="trace-today-target__fields"
                        data-layout={isMobile ? "mobile" : "desktop"}
                        data-testid={`target-fields-${exerciseIndex + 1}-${targetIndex + 1}`}
                        style={{
                          gridTemplateColumns: isMobile
                            ? "minmax(0, 1fr)"
                            : "minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(130px, 1fr) minmax(70px, 0.55fr)",
                        }}
                      >
                        <label>
                          Set type
                          <select aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} type`} value={target.setType || "working"} onChange={(event) => updateTarget(exercise.id, target.id, { setType: event.target.value })} style={fieldStyle}>
                            <option value="working">Working</option>
                            <option value="warm-up">Warm-up</option>
                          </select>
                        </label>
                        <label>
                          Intended reps
                          <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended reps`} type="number" min="0" step="1" value={target.reps ?? ""} onChange={(event) => updateTarget(exercise.id, target.id, { reps: event.target.value })} placeholder="Optional" style={fieldStyle} />
                        </label>
                        <label>
                          Intended load
                          <select aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended load`} value={target.load?.mode || ""} onChange={(event) => {
                            const mode = event.target.value;
                            updateTarget(exercise.id, target.id, {
                              load: mode === "" ? null : mode === "bodyweight" ? { mode } : { mode, unit: target.load?.unit || "lb", ...(target.load?.amount === undefined ? {} : { amount: target.load.amount }) },
                            });
                          }} style={fieldStyle}>
                            <option value="">No load target</option>
                            {WORKOUT_LOAD_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="trace-today-target__amount-label-text">Intended weight</span>
                          <input
                            aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended weight`}
                            type="number"
                            min="0"
                            step="any"
                            value={target.load?.mode === "external" ? (target.load.amount ?? "") : ""}
                            disabled={target.load?.mode === "bodyweight"}
                            onChange={(event) => updateTarget(exercise.id, target.id, {
                              load: {
                                mode: "external",
                                amount: event.target.value,
                                unit: target.load?.unit || "lb",
                              },
                            })}
                            placeholder="Enter weight"
                            style={fieldStyle}
                          />
                        </label>
                        <label>
                          Unit
                          <select
                            aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} unit`}
                            value={target.load?.unit || "lb"}
                            disabled={target.load?.mode === "bodyweight"}
                            onChange={(event) => updateTarget(exercise.id, target.id, {
                              load: {
                                mode: "external",
                                unit: event.target.value,
                                ...(target.load?.amount === undefined ? {} : { amount: target.load.amount }),
                              },
                            })}
                            style={fieldStyle}
                          >
                            {WORKOUT_WEIGHT_UNITS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label style={{ display: "block", marginTop: "10px" }}>
                        Target set notes (optional)
                        <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} notes`} value={target.notes || ""} onChange={(event) => updateTarget(exercise.id, target.id, { notes: event.target.value })} style={fieldStyle} />
                      </label>
                      <div className="trace-today-target__actions">
                        <button className="trace-action trace-action--secondary" type="button" aria-label={`Add target set after set ${targetIndex + 1} in exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                        <button className="trace-action trace-action--danger" type="button" aria-label={`Remove target set ${targetIndex + 1} from exercise ${exerciseIndex + 1}`} onClick={() => removeTarget(exercise.id, target.id)} style={compactButtonStyle}>Remove target set</button>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </fieldset>
            ))}
            <button className="trace-action trace-action--brass trace-today-add-exercise" type="button" onClick={addExercise} style={buttonStyle}>
              Add exercise
            </button>
          </section>

          {formError && <p role="alert" className="trace-today-page__error">{formError}</p>}
          <div className="trace-today-page__actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>{editingId ? "Save changes" : "Save planned workout"}</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={cancelEditor} style={backStyle}>Cancel</button>
          </div>
        </form>
      )}

      {!draft && previewPlan && (
        <section className="trace-feature-surface trace-workout-preview" aria-label={`Workout preview ${previewPlan.title}`}>
          <button className="trace-action trace-action--secondary" type="button" onClick={closePreview} style={compactButtonStyle}>Back to today</button>
          <span className="trace-badge">Planned workout</span>
          <h2>{previewPlan.title}</h2>
          {previewPlan.notes && <p className="trace-today-plan__notes">{previewPlan.notes}</p>}
          {(() => {
            const volume = plannedWorkoutVolume(previewPlan.exercises);
            return (
              <ul className="trace-workout-volume" aria-label="Workout set summary">
                <li><strong>{volume.total}</strong> total {volume.total === 1 ? "set" : "sets"}</li>
                <li><strong>{volume.warmUp}</strong> warm-up</li>
                <li><strong>{volume.working}</strong> working</li>
              </ul>
            );
          })()}
          <div className="trace-workout-preview__exercises">
            {previewPlan.exercises.map((exercise) => (
              <article className="trace-data-card trace-workout-preview__exercise" key={exercise.id}>
                <h3>{exercise.name}</h3>
                <p>{exercise.targetSets.length} {exercise.targetSets.length === 1 ? "set" : "sets"}</p>
                {exercise.targetSets.length > 0 ? (
                  <ul aria-label={`${exercise.name} planned sets`}>
                    {exercise.targetSets.map((target) => <li key={target.id}>{plannedSetPreview(target)}</li>)}
                  </ul>
                ) : <p className="trace-today-page__muted">No target sets planned.</p>}
              </article>
            ))}
          </div>
          <div className="trace-workout-preview__actions" data-testid="workout-preview-actions">
            {completedWorkoutByPlanId.get(previewPlan.id) ? (
              <button className="trace-action trace-action--primary" type="button" onClick={() => openCompletedWorkout(completedWorkoutByPlanId.get(previewPlan.id).id)} style={compactButtonStyle}>View completed workout</button>
            ) : isPlannedWorkoutSkippedOnDate(previewPlan, todayKey) ? (
              <span className="trace-today-plan__status" role="status">Skipped</span>
            ) : (
              <>
                <button className="trace-action trace-action--brass" type="button" aria-label={`${activePlannedWorkoutId === previewPlan.id ? "Continue workout" : "Start planned workout"} ${previewPlan.title}`} onClick={() => startPlan(previewPlan)} style={compactButtonStyle}>{activePlannedWorkoutId === previewPlan.id ? "Continue workout" : "Start"}</button>
                <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit planned workout ${previewPlan.title}`} onClick={() => openEdit(previewPlan)} style={compactButtonStyle}>Edit</button>
                <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip workout ${previewPlan.title}`} onClick={() => requestSkipPlan(previewPlan)} style={compactButtonStyle}>Skip</button>
              </>
            )}
          </div>
        </section>
      )}

      {!draft && !previewPlan && (
        <>
          <section className="trace-feature-surface trace-today-schedule" aria-label="Today's schedule" data-expanded={isScheduleExpanded ? "true" : "false"} data-testid="today-schedule-dashboard">
            <div className="trace-today-schedule__header">
              <div>
                <p className="trace-today-schedule__eyebrow">Today</p>
                <h2>{formatDateOnly(todayKey)}</h2>
                <p className="trace-today-schedule__count">{scheduleItems.length === 0 ? "No scheduled items" : `${scheduleItems.length} scheduled ${scheduleItems.length === 1 ? "item" : "items"}`}</p>
              </div>
              <button className="trace-action trace-action--secondary trace-today-schedule__toggle" type="button" aria-controls="today-schedule-details" aria-expanded={isScheduleExpanded} onClick={() => setIsScheduleExpanded((current) => !current)} style={compactButtonStyle}>{isScheduleExpanded ? "Hide details" : "Show details"}</button>
            </div>
            {scheduleItems.length === 0 ? (
              <div className="trace-today-empty"><h3>Nothing scheduled for today.</h3><p>You can create a workout plan for today or choose another date.</p></div>
            ) : (
              <ul className="trace-today-summary" aria-label="Today's schedule summary">
                {scheduleItems.slice(0, 4).map((scheduleItem) => scheduleItem.type === "workout" ? (
                  <li data-schedule-item-type="workout" key={scheduleItem.id}>
                    <button className="trace-today-summary__workout" type="button" aria-label={`Open workout preview ${scheduleItem.title}`} onClick={() => openPreview(scheduleItem.plan)}>
                      <span className="trace-today-summary__type trace-today-summary__type--workout">Workout</span>
                      <span className="trace-today-summary__copy"><strong>{scheduleItem.title}</strong><small>{completedWorkoutByPlanId.get(scheduleItem.plan.id) ? "Completed" : isPlannedWorkoutSkippedOnDate(scheduleItem.plan, todayKey) ? "Skipped" : activePlannedWorkoutId === scheduleItem.plan.id ? "Started" : "Planned"}</small></span>
                    </button>
                  </li>
                ) : (
                  <li data-schedule-item-type="protocol" key={scheduleItem.id}>
                    <span className="trace-today-summary__type trace-today-summary__type--protocol">Protocol</span>
                    <span className="trace-today-summary__copy"><strong>{scheduleItem.title}</strong><small>{scheduleItem.subtitle}</small></span>
                  </li>
                ))}
                {scheduleItems.length > 4 && <li className="trace-today-summary__more">+{scheduleItems.length - 4} more scheduled</li>}
              </ul>
            )}
            {isScheduleExpanded && scheduleItems.length > 0 && (
              <section id="today-schedule-details" className="trace-today-schedule__details" aria-label="Today's actionable items">
                <h3 className="trace-today-schedule__group-title">Daily plan</h3>
                <div className="trace-today-schedule__list">
                  {scheduleItems.map((scheduleItem) => {
                    if (scheduleItem.type === "protocol") {
                      const { protocol, item } = scheduleItem;
                      return (
                        <article className="trace-data-card trace-today-protocol" data-schedule-item-type="protocol" key={scheduleItem.id}>
                          <span className="trace-badge">Protocol item · scheduled</span>
                          <h3>{item.compound.name}</h3>
                          <p className="trace-today-protocol__action-summary">{protocolActionSummary(item)}</p>
                          <dl className="trace-today-protocol__details">
                            <div><dt>Protocol</dt><dd>{protocol.name}</dd></div>
                            <div><dt>Dose</dt><dd>{item.dose.amount} {formatDoseUnit(item.dose)}</dd></div>
                            <div><dt>Route / method</dt><dd>{formatRoute(item.route)}</dd></div>
                            <div><dt>Schedule</dt><dd>{formatProtocolSchedule(item.schedule)}{scheduleTimeLabel(item) ? ` · ${scheduleTimeLabel(item)}` : ""}</dd></div>
                          </dl>
                          {item.notes && <p className="trace-today-protocol__notes"><strong>Item notes:</strong> <span>{item.notes}</span></p>}
                          {protocol.notes && <p className="trace-today-protocol__notes"><strong>Protocol notes:</strong> <span>{protocol.notes}</span></p>}
                        </article>
                      );
                    }
                    const plan = scheduleItem.plan;
                    const completedWorkout = completedWorkoutByPlanId.get(plan.id);
                    const skipped = isPlannedWorkoutSkippedOnDate(plan, todayKey);
                    const started = activePlannedWorkoutId === plan.id;
                    const hasDraftConflict = draftConflict?.planId === plan.id;
                    return (
                      <article className="trace-data-card trace-today-plan" data-draft-collision={hasDraftConflict ? "open" : "closed"} data-schedule-item-type="workout" key={plan.id}>
                        <span className="trace-badge">Workout · {completedWorkout ? "completed" : skipped ? "skipped" : started ? "started" : "planned"}</span>
                        <h3><button className="trace-today-plan__open" type="button" aria-label={`Open workout preview ${plan.title}`} onClick={() => openPreview(plan)}>{plan.title}</button></h3>
                        <p className="trace-today-plan__schedule">Scheduled {formatDateOnly(plan.scheduledDate)}</p>
                        {plan.notes && <p className="trace-today-plan__notes">{plan.notes}</p>}
                        {completedWorkout && <p className="trace-today-plan__completion">Completed {new Date(completedWorkout.occurredAt).toLocaleString()}</p>}
                        {skipped && !completedWorkout && <p className="trace-today-plan__skipped">Skipped for today{plan.skipReasons?.[todayKey] ? ` · ${plan.skipReasons[todayKey]}` : ""}</p>}
                        {!hasDraftConflict && (
                          <div className="trace-today-exercise__actions">
                            {completedWorkout ? <button className="trace-action trace-action--primary" type="button" aria-label={`Open completed workout ${plan.title}`} onClick={() => openCompletedWorkout(completedWorkout.id)} style={compactButtonStyle}>View completed workout</button> : skipped ? <span className="trace-today-plan__status" role="status">Skipped</span> : <button className="trace-action trace-action--brass" type="button" aria-label={`${started ? "Continue workout" : "Start planned workout"} ${plan.title}`} onClick={() => startPlan(plan)} ref={(node) => { if (node) startButtonRefs.current.set(plan.id, node); else startButtonRefs.current.delete(plan.id); }} style={compactButtonStyle}>{started ? "Continue workout" : "Start workout"}</button>}
                            <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit planned workout ${plan.title}`} onClick={() => openEdit(plan)} style={compactButtonStyle}>Edit plan</button>
                            {!completedWorkout && !skipped && <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip workout ${plan.title}`} onClick={() => requestSkipPlan(plan)} style={compactButtonStyle}>Skip workout</button>}
                            <button className="trace-action trace-action--danger" type="button" aria-label={`Delete planned workout ${plan.title}`} onClick={() => removePlan(plan)} style={compactButtonStyle}>Delete plan</button>
                          </div>
                        )}
                        {hasDraftConflict && (
                          <div aria-label="Workout already in progress" className="trace-feature-surface trace-today-draft-conflict" onKeyDown={(event) => { if (event.key === "Escape") cancelDraftConflict(); }} role="dialog">
                            <h4>Workout already in progress</h4><p>Resume {draftConflict.existingDraftTitle}, discard it and start this plan, or cancel.</p>
                            <div className="trace-today-exercise__actions"><button ref={conflictResumeButtonRef} className="trace-action trace-action--primary" type="button" onClick={() => startPlan(plan, "resume")} style={compactButtonStyle}>Resume current workout</button><button className="trace-action trace-action--danger" type="button" onClick={() => startPlan(plan, "discard")} style={compactButtonStyle}>Discard and start plan</button><button className="trace-action trace-action--secondary" type="button" onClick={cancelDraftConflict} style={compactButtonStyle}>Cancel</button></div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </section>
          <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>Back to Timeline</button>
        </>
      )}

      {!draft && pendingSkipPlan && (
        <section className="trace-feature-surface trace-skip-reason" role="dialog" aria-label="Optional skip reason">
          <h2>Optional reason</h2>
          <p>Why are you skipping this workout?</p>
          <label>
            Skip reason
            <select value={skipReason} onChange={(event) => setSkipReason(event.target.value)} style={fieldStyle}>
              <option value="">No reason</option>
              {WORKOUT_SKIP_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              <option value="Other">Other / custom reason</option>
            </select>
          </label>
          {skipReason === "Other" && <label>Custom reason<input value={customSkipReason} onChange={(event) => setCustomSkipReason(event.target.value)} style={fieldStyle} /></label>}
          <div className="trace-skip-reason__actions">
            <button className="trace-action trace-action--primary" type="button" onClick={() => confirmSkipPlan()} style={compactButtonStyle}>Save skip</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={() => confirmSkipPlan(null)} style={compactButtonStyle}>Skip without reason</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={() => setPendingSkipPlan(null)} style={compactButtonStyle}>Cancel</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default TodayPage;
