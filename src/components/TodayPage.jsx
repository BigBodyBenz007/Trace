import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseSearch from "./ExerciseSearch";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { formatDateOnly } from "../services/dateOnly";
import { getPlannedWorkoutError } from "../services/plannedWorkout";
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

function emptyTargetSet() {
  return {
    id: createWorkoutItemId("planned-set"),
    setType: "working",
    reps: "",
    load: null,
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

function targetSummary(target) {
  const reps = target.reps === undefined ? "reps open" : `${target.reps} reps`;
  if (!target.load) return reps;
  if (target.load.mode === "bodyweight") return `${reps}, bodyweight`;
  const amount = target.load.amount === undefined ? "load open" : `${target.load.amount} ${target.load.unit}`;
  return `${reps}, ${amount}`;
}

function TodayPage({
  onBack,
  plannedWorkouts = [],
  workoutEntries = [],
  savedExercises = [],
  createPlannedWorkout,
  updatePlannedWorkout,
  deletePlannedWorkout,
  startPlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be started.",
  }),
  openCompletedWorkout = () => false,
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
  const [statusMessage, setStatusMessage] = useState("");
  const [draftConflict, setDraftConflict] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const conflictResumeButtonRef = useRef(null);
  const startButtonRefs = useRef(new Map());
  const restoreStartFocusPlanIdRef = useRef(null);

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
    setDraft({
      scheduledDate: todayKey,
      title: "",
      notes: "",
      exercises: [emptyPlannedExercise()],
    });
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
    setStatusMessage("");
    setDraftConflict(null);
  }

  function openEdit(plan) {
    setDraft(copyPlanForEditing(plan));
    setEditingId(plan.id);
    setActiveSearchExerciseId(null);
    setFormError("");
    setStatusMessage("");
    setDraftConflict(null);
  }

  function closeEditor() {
    setDraft(null);
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
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
      targetSets: [...exercise.targetSets, emptyTargetSet()],
    }));
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
    setStatusMessage(editingId ? "Planned workout updated." : "Planned workout created.");
    closeEditor();
  }

  function removePlan(plan) {
    if (!window.confirm(`Delete the planned workout “${plan.title}”? Completed workout history will not be changed.`)) {
      return;
    }
    if (!deletePlannedWorkout(plan.id)) {
      setStatusMessage("");
      setFormError("The planned workout could not be deleted.");
      return;
    }
    if (editingId === plan.id) closeEditor();
    setFormError("");
    setStatusMessage("Planned workout deleted.");
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
        <p className="trace-feature-page__kicker">Workout planning</p>
        <h1>Today&apos;s Schedule</h1>
        <p className="trace-feature-page__lede">
          Map out intended exercises and targets. Plans stay separate from completed workout history.
        </p>
      </header>

      <div className="trace-today-page__actions">
        <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>
          Back to Timeline
        </button>
        {!draft && (
          <button className="trace-action trace-action--primary" type="button" onClick={openCreate} style={buttonStyle}>
            Create planned workout
          </button>
        )}
      </div>

      {statusMessage && <p role="status" className="trace-today-page__status">{statusMessage}</p>}
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
                    <strong>Optional targets</strong>
                    <button className="trace-action trace-action--secondary" type="button" aria-label={`Add target set to exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                  </div>
                  {exercise.targetSets.length === 0 ? (
                    <p className="trace-today-page__muted">No target sets. This exercise can be filled in during a future workout.</p>
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
                        {target.load?.mode === "external" ? (
                          <>
                            <label>
                              <span className="trace-today-target__amount-label-text">Intended amount</span>
                              <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended amount`} type="number" min="0" step="any" value={target.load.amount ?? ""} onChange={(event) => updateTarget(exercise.id, target.id, { load: { ...target.load, amount: event.target.value } })} placeholder="Optional" style={fieldStyle} />
                            </label>
                            <label>
                              Unit
                              <select aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} unit`} value={target.load.unit || "lb"} onChange={(event) => updateTarget(exercise.id, target.id, { load: { ...target.load, unit: event.target.value } })} style={fieldStyle}>
                                {WORKOUT_WEIGHT_UNITS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </label>
                          </>
                        ) : <span aria-hidden="true" className="trace-today-target__empty-load" />}
                      </div>
                      <label style={{ display: "block", marginTop: "10px" }}>
                        Target set notes (optional)
                        <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} notes`} value={target.notes || ""} onChange={(event) => updateTarget(exercise.id, target.id, { notes: event.target.value })} style={fieldStyle} />
                      </label>
                      <button className="trace-action trace-action--danger" type="button" aria-label={`Remove target set ${targetIndex + 1} from exercise ${exerciseIndex + 1}`} onClick={() => removeTarget(exercise.id, target.id)} style={{ ...compactButtonStyle, marginTop: "10px" }}>Remove target set</button>
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
            <button className="trace-action trace-action--secondary" type="button" onClick={closeEditor} style={backStyle}>Cancel</button>
          </div>
        </form>
      )}

      {!draft && (
        <>
      <section className="trace-feature-section trace-today-schedule" aria-label="Planned workouts for today">
        <h2>Planned for {formatDateOnly(todayKey)}</h2>
        {todaysPlans.length === 0 ? (
          <div className="trace-feature-surface trace-today-empty">
            <h3>No workout planned for today.</h3>
            <p>You can create a plan for today or choose another date.</p>
          </div>
        ) : (
          <div className="trace-today-schedule__list">
            {todaysPlans.map((plan) => {
              const completedWorkout = completedWorkoutByPlanId.get(plan.id);
              const hasDraftConflict = draftConflict?.planId === plan.id;
              return (
              <article className="trace-data-card trace-today-plan" data-draft-collision={hasDraftConflict ? "open" : "closed"} key={plan.id}>
                <span className="trace-badge">
                  Plan {"\u00b7"} {completedWorkout ? "completed" : "not completed"}
                </span>
                <h3>{plan.title}</h3>
                {plan.notes && <p className="trace-today-plan__notes">{plan.notes}</p>}
                {completedWorkout && (
                  <p className="trace-today-plan__completion">
                    Completed {new Date(completedWorkout.occurredAt).toLocaleString()}
                  </p>
                )}
                <ol>
                  {plan.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      <strong>{exercise.name}</strong>
                      {exercise.targetSets.length > 0 && (
                        <ul aria-label={`${exercise.name} targets`}>
                          {exercise.targetSets.map((target) => <li key={target.id}>{targetSummary(target)}</li>)}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
                {!hasDraftConflict && (
                  <div className="trace-today-exercise__actions">
                    {completedWorkout ? (
                      <button className="trace-action trace-action--primary" type="button" aria-label={`Open completed workout ${plan.title}`} onClick={() => openCompletedWorkout(completedWorkout.id)} style={compactButtonStyle}>View completed workout</button>
                    ) : (
                      <button
                        className="trace-action trace-action--brass"
                        type="button"
                        aria-label={`Start planned workout ${plan.title}`}
                        onClick={() => startPlan(plan)}
                        ref={(node) => {
                          if (node) startButtonRefs.current.set(plan.id, node);
                          else startButtonRefs.current.delete(plan.id);
                        }}
                        style={compactButtonStyle}
                      >
                        Start workout
                      </button>
                    )}
                    <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit planned workout ${plan.title}`} onClick={() => openEdit(plan)} style={compactButtonStyle}>Edit plan</button>
                    <button className="trace-action trace-action--danger" type="button" aria-label={`Delete planned workout ${plan.title}`} onClick={() => removePlan(plan)} style={compactButtonStyle}>Delete plan</button>
                  </div>
                )}
                {hasDraftConflict && (
                  <div
                    aria-label="Workout already in progress"
                    className="trace-feature-surface trace-today-draft-conflict"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") cancelDraftConflict();
                    }}
                    role="dialog"
                  >
                    <h4>Workout already in progress</h4>
                    <p>
                      Resume {draftConflict.existingDraftTitle}, discard it and start this plan, or cancel.
                    </p>
                    <div className="trace-today-exercise__actions">
                      <button ref={conflictResumeButtonRef} className="trace-action trace-action--primary" type="button" onClick={() => startPlan(plan, "resume")} style={compactButtonStyle}>Resume current workout</button>
                      <button className="trace-action trace-action--danger" type="button" onClick={() => startPlan(plan, "discard")} style={compactButtonStyle}>Discard and start plan</button>
                      <button className="trace-action trace-action--secondary" type="button" onClick={cancelDraftConflict} style={compactButtonStyle}>Cancel</button>
                    </div>
                  </div>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>

      <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>Back to Timeline</button>
        </>
      )}
    </div>
  );
}

export default TodayPage;
