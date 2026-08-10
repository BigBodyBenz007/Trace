import { useRef, useState } from "react";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import {
  createWorkoutEntry,
  createWorkoutItemId,
  getWorkoutEntryError,
} from "../services/workoutEntry";

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

function emptySet() {
  return {
    id: createWorkoutItemId("set"),
    reps: "",
    loadMode: "external",
    weightAmount: "",
    weightUnit: "lb",
    notes: "",
  };
}

function emptyExercise() {
  return {
    id: createWorkoutItemId("exercise"),
    name: "",
    sets: [emptySet()],
  };
}

function moveItem(items, index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= items.length) return items;
  const moved = [...items];
  [moved[index], moved[destination]] = [moved[destination], moved[index]];
  return moved;
}

function WorkoutPage({
  onBack,
  workoutEntries,
  saveWorkoutEntry,
  updateWorkoutEntry,
  deleteWorkoutEntry,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const initialDateTime = currentLocalDateTime();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState(() => [emptyExercise()]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const pageTopRef = useRef(null);
  const formRef = useRef(null);

  const sortedEntries = [...workoutEntries].sort(
    (first, second) => new Date(second.occurredAt) - new Date(first.occurredAt)
  );
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
        set.id === setId ? { ...set, ...values } : set
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
      sets: [...exercise.sets, emptySet()],
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

  function resetForm() {
    const current = currentLocalDateTime();
    setTitle("");
    setDate(current.date);
    setTime(current.time);
    setNotes("");
    setExercises([emptyExercise()]);
    setEditingEntryId(null);
    setIsDirty(false);
    setFormError("");
  }

  function draft() {
    return { title, date, time, notes, exercises };
  }

  function saveWorkout(event) {
    event.preventDefault();
    const workoutDraft = draft();
    const error = getWorkoutEntryError(workoutDraft);
    if (error) {
      setFormError(error);
      return;
    }

    const existingEntry = workoutEntries.find(({ id }) => id === editingEntryId);
    const entry = createWorkoutEntry(workoutDraft, existingEntry);
    const saved =
      editingEntryId === null
        ? saveWorkoutEntry(entry)
        : updateWorkoutEntry(editingEntryId, entry);
    if (!saved) return;

    resetForm();
    pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function editWorkout(entry) {
    const entryDateTime = localDateTime(entry.occurredAt);
    setTitle(entry.title);
    setDate(entryDateTime.date);
    setTime(entryDateTime.time);
    setNotes(entry.notes || "");
    setExercises(
      entry.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          reps: String(set.reps),
          loadMode: set.load.mode,
          weightAmount:
            set.load.mode === "external" ? String(set.load.amount) : "",
          weightUnit: set.load.mode === "external" ? set.load.unit : "lb",
          notes: set.notes || "",
        })),
      }))
    );
    setEditingEntryId(entry.id);
    setIsDirty(false);
    setFormError("");
    formRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function cancelWorkout() {
    if (
      (editingEntryId !== null || isDirty) &&
      !window.confirm("Discard this workout? Your unsaved changes will be lost.")
    ) {
      return;
    }
    resetForm();
    window.requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
    });
  }

  function removeWorkout(id) {
    if (!window.confirm("Delete this workout?")) return;
    if (!deleteWorkoutEntry(id)) return;
    if (editingEntryId === id) resetForm();
  }

  return (
    <div ref={pageTopRef} data-testid="workout-page" style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Workouts</h1>
      <p style={{ color: "#bbb", marginBottom: "24px" }}>
        Record completed strength workouts as entered. Trace does not provide
        training recommendations.
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{ ...backButtonStyle, marginBottom: "24px", marginTop: 0 }}
      >
        Back to Timeline
      </button>

      <form
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
            key={exercise.id}
            aria-label={`Exercise ${exerciseIndex + 1}`}
            style={{
              background: "#1f2937",
              borderRadius: "14px",
              marginBottom: "16px",
              padding: "18px",
            }}
          >
            <label style={{ display: "block" }}>
              Exercise {exerciseIndex + 1} name
              <input
                value={exercise.name}
                onChange={(event) =>
                  updateExercise(exercise.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={120}
                style={formInputStyle}
              />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
              <button type="button" onClick={() => reorderExercise(exerciseIndex, -1)} disabled={exerciseIndex === 0} aria-label={`Move exercise ${exerciseIndex + 1} up`} style={smallButtonStyle}>Move Up</button>
              <button type="button" onClick={() => reorderExercise(exerciseIndex, 1)} disabled={exerciseIndex === exercises.length - 1} aria-label={`Move exercise ${exerciseIndex + 1} down`} style={smallButtonStyle}>Move Down</button>
              <button type="button" onClick={() => removeExercise(exercise.id)} aria-label={`Remove exercise ${exerciseIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Remove Exercise</button>
            </div>

            {exercise.sets.map((set, setIndex) => (
              <fieldset
                key={set.id}
                style={{ border: "1px solid #4b5563", borderRadius: "10px", marginTop: "16px", padding: "14px" }}
              >
                <legend>Set {setIndex + 1}</legend>
                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                  <label>
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
                    <>
                      <label>
                        Weight
                        <input type="number" min="0" step="any" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight`} value={set.weightAmount} onChange={(event) => updateSet(exercise.id, set.id, { weightAmount: event.target.value })} style={formInputStyle} />
                      </label>
                      <label>
                        Weight unit
                        <select aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} weight unit`} value={set.weightUnit} onChange={(event) => updateSet(exercise.id, set.id, { weightUnit: event.target.value })} style={formInputStyle}>
                          {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Reps
                    <input type="number" min="1" step="1" aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} reps`} value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: event.target.value })} style={formInputStyle} />
                  </label>
                </div>
                <label style={{ display: "block", marginTop: "10px" }}>
                  Set notes (optional)
                  <input aria-label={`Exercise ${exerciseIndex + 1} set ${setIndex + 1} notes`} value={set.notes} onChange={(event) => updateSet(exercise.id, set.id, { notes: event.target.value })} style={formInputStyle} />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  <button type="button" disabled={setIndex === 0} onClick={() => reorderSet(exercise.id, setIndex, -1)} aria-label={`Move exercise ${exerciseIndex + 1} set ${setIndex + 1} up`} style={smallButtonStyle}>Move Up</button>
                  <button type="button" disabled={setIndex === exercise.sets.length - 1} onClick={() => reorderSet(exercise.id, setIndex, 1)} aria-label={`Move exercise ${exerciseIndex + 1} set ${setIndex + 1} down`} style={smallButtonStyle}>Move Down</button>
                  <button type="button" onClick={() => removeSet(exercise.id, set.id)} aria-label={`Remove exercise ${exerciseIndex + 1} set ${setIndex + 1}`} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Remove Set</button>
                </div>
              </fieldset>
            ))}
            <button type="button" onClick={() => addSet(exercise.id)} aria-label={`Add set to exercise ${exerciseIndex + 1}`} style={{ ...smallButtonStyle, marginTop: "14px" }}>Add Set</button>
          </section>
        ))}
        <button type="button" onClick={addExercise} style={smallButtonStyle}>Add Exercise</button>

        {formError && <p role="alert" style={{ color: "#fca5a5" }}>{formError}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button type="submit" style={buttonStyle}>{editingEntryId === null ? "Save Workout" : "Save Changes"}</button>
          <button type="button" onClick={cancelWorkout} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel</button>
        </div>
      </form>

      <section style={{ marginTop: "36px", maxWidth: "760px", textAlign: "left", width: "100%" }}>
        <h2>Workout History</h2>
        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No workouts logged yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {sortedEntries.map((entry) => (
              <article key={entry.id} style={{ background: "#1f2937", borderRadius: "12px", padding: "18px" }}>
                <h3 style={{ marginTop: 0 }}>{entry.title}</h3>
                <p>{new Date(entry.occurredAt).toLocaleString()}</p>
                {entry.notes && <p style={{ whiteSpace: "pre-wrap" }}>{entry.notes}</p>}
                {entry.exercises.map((exercise) => (
                  <div key={exercise.id} style={{ marginTop: "14px" }}>
                    <strong>{exercise.name}</strong>
                    <ol style={{ marginBottom: 0 }}>
                      {exercise.sets.map((set) => (
                        <li key={set.id}>
                          {set.load.mode === "bodyweight" ? "Bodyweight" : `${set.load.amount} ${set.load.unit}`} × {set.reps} reps
                          {set.notes ? ` — ${set.notes}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  <button type="button" onClick={() => editWorkout(entry)} style={smallButtonStyle}>Edit</button>
                  <button type="button" onClick={() => removeWorkout(entry.id)} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <button type="button" onClick={onBack} style={{ ...backButtonStyle, marginTop: "24px" }}>Back to Timeline</button>
    </div>
  );
}

export default WorkoutPage;
