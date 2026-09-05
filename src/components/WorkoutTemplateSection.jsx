import { useEffect, useRef } from "react";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { createWorkoutItemId } from "../services/workoutEntry";

function newTargetSet(inheritedLoad = null) {
  return {
    id: createWorkoutItemId("template-set"),
    setType: "working",
    reps: "",
    load: inheritedLoad ? { ...inheritedLoad } : null,
    notes: "",
  };
}

function newExercise() {
  return {
    id: createWorkoutItemId("template-exercise"),
    name: "",
    notes: "",
    targetSets: [newTargetSet()],
  };
}

function move(items, index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= items.length) return items;
  const updated = [...items];
  [updated[index], updated[destination]] = [updated[destination], updated[index]];
  return updated;
}

export function WorkoutTemplateEditorDialog({
  draft,
  error,
  mode,
  onChange,
  onCancel,
  onSave,
  buttonStyle = {},
  inputStyle = {},
}) {
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      ) || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "6px",
    padding: "10px",
    width: "100%",
  };
  const compactButton = {
    ...buttonStyle,
    fontSize: "15px",
    marginTop: 0,
    padding: "8px 11px",
  };

  function updateExercise(exerciseId, update) {
    onChange({
      ...draft,
      exercises: draft.exercises.map((exercise) => (
        exercise.id === exerciseId ? update(exercise) : exercise
      )),
    });
  }

  function changeExerciseName(exerciseId, name) {
    updateExercise(exerciseId, (exercise) => {
      const changed = { ...exercise, name };
      delete changed.exerciseId;
      if (exercise.exerciseReference) {
        changed.exerciseReference = { ...exercise.exerciseReference, modified: true };
      }
      return changed;
    });
  }

  function updateTarget(exerciseId, targetId, values) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: exercise.targetSets.map((target) => (
        target.id === targetId ? { ...target, ...values } : target
      )),
    }));
  }

  return (
    <div className="trace-template-dialog-backdrop">
      <section
        ref={dialogRef}
        className="trace-feature-surface trace-template-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-template-editor-heading"
      >
        <h2 id="workout-template-editor-heading">
          {mode === "edit" ? "Edit Workout Template" : "Save Workout as Template"}
        </h2>
        <p className="trace-template-dialog__intro">
          Reps and loads are editable targets. Saving this template will not change workout history.
        </p>
        <form onSubmit={onSave}>
          <label>
            Template name
            <input
              ref={nameRef}
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              maxLength={160}
              style={fieldStyle}
            />
          </label>
          <label className="trace-template-dialog__notes">
            Template notes (optional)
            <textarea
              value={draft.notes || ""}
              onChange={(event) => onChange({ ...draft, notes: event.target.value })}
              rows={2}
              style={fieldStyle}
            />
          </label>

          <section className="trace-template-editor__exercises" aria-label="Template exercises">
            <h3>Exercises</h3>
            {draft.exercises.map((exercise, exerciseIndex) => (
              <fieldset className="trace-data-card trace-template-editor__exercise" key={exercise.id}>
                <legend>Exercise {exerciseIndex + 1}</legend>
                <div className="trace-template-editor__actions">
                  <button type="button" className="trace-action trace-action--secondary" aria-label={`Move template exercise ${exerciseIndex + 1} up`} disabled={exerciseIndex === 0} onClick={() => onChange({ ...draft, exercises: move(draft.exercises, exerciseIndex, -1) })} style={compactButton}>Move up</button>
                  <button type="button" className="trace-action trace-action--secondary" aria-label={`Move template exercise ${exerciseIndex + 1} down`} disabled={exerciseIndex === draft.exercises.length - 1} onClick={() => onChange({ ...draft, exercises: move(draft.exercises, exerciseIndex, 1) })} style={compactButton}>Move down</button>
                  <button type="button" className="trace-action trace-action--danger" aria-label={`Remove template exercise ${exerciseIndex + 1}`} disabled={draft.exercises.length === 1} onClick={() => onChange({ ...draft, exercises: draft.exercises.filter(({ id }) => id !== exercise.id) })} style={compactButton}>Remove exercise</button>
                </div>
                <div className="trace-template-editor__exercise-fields">
                  <label>
                    Exercise name
                    <input value={exercise.name} onChange={(event) => changeExerciseName(exercise.id, event.target.value)} maxLength={120} style={fieldStyle} />
                  </label>
                  <label>
                    Exercise notes (optional)
                    <input value={exercise.notes || ""} onChange={(event) => updateExercise(exercise.id, (current) => ({ ...current, notes: event.target.value }))} maxLength={240} style={fieldStyle} />
                  </label>
                </div>
                <div className="trace-template-editor__sets">
                  <div className="trace-template-editor__set-heading">
                    <strong>Target sets</strong>
                    <button type="button" className="trace-action trace-action--secondary" aria-label={`Add target set to template exercise ${exerciseIndex + 1}`} onClick={() => updateExercise(exercise.id, (current) => ({ ...current, targetSets: [...current.targetSets, newTargetSet(current.targetSets[current.targetSets.length - 1]?.load)] }))} style={compactButton}>Add set</button>
                  </div>
                  {exercise.targetSets.length === 0 && <p>No target sets yet.</p>}
                  {exercise.targetSets.map((target, targetIndex) => (
                    <fieldset className="trace-template-editor__set" key={target.id}>
                      <legend>Set {targetIndex + 1}</legend>
                      <div className="trace-template-editor__set-fields">
                        <label>
                          Set type
                          <select value={target.setType || "working"} onChange={(event) => updateTarget(exercise.id, target.id, { setType: event.target.value })} style={fieldStyle}>
                            <option value="working">Working</option>
                            <option value="warm-up">Warm-up</option>
                          </select>
                        </label>
                        <label>
                          Target reps
                          <input type="number" min="0" step="1" value={target.reps ?? ""} onChange={(event) => updateTarget(exercise.id, target.id, { reps: event.target.value })} placeholder="Optional" style={fieldStyle} />
                        </label>
                        <label>
                          Target load
                          <select value={target.load?.mode || ""} onChange={(event) => {
                            const mode = event.target.value;
                            updateTarget(exercise.id, target.id, {
                              load: mode === "" ? null : mode === "bodyweight"
                                ? { mode }
                                : { mode, unit: target.load?.unit || "lb", ...(target.load?.amount === undefined ? {} : { amount: target.load.amount }) },
                            });
                          }} style={fieldStyle}>
                            <option value="">Open</option>
                            {WORKOUT_LOAD_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        {target.load?.mode === "external" && <label>
                          Target weight
                          <input type="number" min="0" step="any" value={target.load.amount ?? ""} onChange={(event) => updateTarget(exercise.id, target.id, { load: { ...target.load, amount: event.target.value } })} placeholder="Optional" style={fieldStyle} />
                        </label>}
                        {target.load?.mode === "external" && <label>
                          Unit
                          <select value={target.load.unit || "lb"} onChange={(event) => updateTarget(exercise.id, target.id, { load: { ...target.load, unit: event.target.value } })} style={fieldStyle}>
                            {WORKOUT_WEIGHT_UNITS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>}
                      </div>
                      <label>
                        Set notes (optional)
                        <input value={target.notes || ""} onChange={(event) => updateTarget(exercise.id, target.id, { notes: event.target.value })} style={fieldStyle} />
                      </label>
                      <button type="button" className="trace-action trace-action--danger" aria-label={`Remove target set ${targetIndex + 1} from template exercise ${exerciseIndex + 1}`} onClick={() => updateExercise(exercise.id, (current) => ({ ...current, targetSets: current.targetSets.filter(({ id }) => id !== target.id) }))} style={compactButton}>Remove set</button>
                    </fieldset>
                  ))}
                </div>
              </fieldset>
            ))}
            <button type="button" className="trace-action trace-action--secondary" onClick={() => onChange({ ...draft, exercises: [...draft.exercises, newExercise()] })} style={compactButton}>Add exercise</button>
          </section>

          {error && <p role="alert" className="trace-template-dialog__error">{error}</p>}
          <div className="trace-template-dialog__actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>{mode === "edit" ? "Save Template" : "Create Template"}</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={onCancel} style={buttonStyle}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function WorkoutTemplateSection({
  expanded,
  onToggle,
  templates,
  onStart,
  onSchedule,
  onEdit,
  onDelete,
  buttonStyle = {},
  toggleButtonRef = null,
  registerStartButton = () => {},
}) {
  const compactButton = {
    ...buttonStyle,
    fontSize: "15px",
    marginTop: 0,
    padding: "8px 11px",
  };

  return (
    <section className="trace-feature-section trace-workout-templates" aria-labelledby="workout-templates-heading">
      <div className="trace-workout-templates__heading">
        <div>
          <h2 id="workout-templates-heading">Workout Templates</h2>
          <p>{templates.length} saved {templates.length === 1 ? "template" : "templates"}</p>
        </div>
        <button ref={toggleButtonRef} className="trace-action trace-action--secondary" type="button" aria-controls="workout-template-list" aria-expanded={expanded} onClick={onToggle} style={compactButton}>
          {expanded ? "Hide templates" : "Show templates"}
        </button>
      </div>
      {expanded && (
        <div id="workout-template-list" className="trace-workout-templates__list">
          {templates.length === 0 ? (
            <p>No workout templates saved yet. Expand a completed workout and choose Save as Template.</p>
          ) : templates.map((template) => {
            const totalSets = template.exercises.reduce((sum, exercise) => sum + exercise.targetSets.length, 0);
            const summary = template.exercises.map(({ name }) => name).join(" · ");
            return (
              <article className="trace-data-card trace-workout-template-card" key={template.id}>
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.exercises.length} {template.exercises.length === 1 ? "exercise" : "exercises"} · {totalSets} planned {totalSets === 1 ? "set" : "sets"}</p>
                  <p className="trace-workout-template-card__summary">{summary}</p>
                </div>
                <div className="trace-workout-template-card__actions" aria-label={`${template.name} template actions`}>
                  <button ref={(node) => registerStartButton(template.id, node)} className="trace-action trace-action--primary" type="button" onClick={() => onStart(template)} style={compactButton}>Start Now</button>
                  <button className="trace-action trace-action--brass" type="button" onClick={(event) => onSchedule(template, event.currentTarget)} style={compactButton}>Schedule Workout</button>
                  <button className="trace-action trace-action--secondary" type="button" onClick={(event) => onEdit(template, event.currentTarget)} style={compactButton}>Edit Template</button>
                  <button className="trace-action trace-action--danger" type="button" onClick={(event) => onDelete(template, event.currentTarget)} style={compactButton}>Delete Template</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
