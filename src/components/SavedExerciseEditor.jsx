import { useState } from "react";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";

function SavedExerciseEditor({ exercise, onSave, onCancel, inputStyle, buttonStyle }) {
  const [name, setName] = useState(exercise.name);
  const [defaultLoadMode, setDefaultLoadMode] = useState(
    exercise.defaults.load.mode
  );
  const [defaultWeightUnit, setDefaultWeightUnit] = useState(
    exercise.defaults.load.unit || "lb"
  );
  const [error, setError] = useState("");
  const fieldStyle = { ...inputStyle, boxSizing: "border-box", fontSize: "16px", marginTop: "8px", padding: "10px", width: "100%" };

  function save() {
    const draft = { name, defaultLoadMode, defaultWeightUnit };
    const validationError = getExerciseDefinitionError(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const result = onSave(exercise.id, draft);
    if (result?.status !== "updated") {
      setError(result?.message || "The saved exercise could not be updated.");
      return;
    }
    onCancel();
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #6b7280", borderRadius: "10px", marginBottom: "14px", padding: "14px" }}>
      <h4 style={{ marginTop: 0 }}>Edit Saved Exercise</h4>
      <p style={{ color: "#d1d5db" }}>Changes affect only this reusable definition. Historical workouts are not changed.</p>
      <label style={{ display: "block" }}>
        Saved exercise name
        <input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} style={fieldStyle} />
      </label>
      <label style={{ display: "block", marginTop: "12px" }}>
        Saved default load mode
        <select value={defaultLoadMode} onChange={(event) => { setDefaultLoadMode(event.target.value); setError(""); }} style={fieldStyle}>
          {WORKOUT_LOAD_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {defaultLoadMode === "external" && (
        <label style={{ display: "block", marginTop: "12px" }}>
          Saved default weight unit
          <select value={defaultWeightUnit} onChange={(event) => { setDefaultWeightUnit(event.target.value); setError(""); }} style={fieldStyle}>
            {WORKOUT_WEIGHT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      )}
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
        <button type="button" onClick={save} style={{ ...buttonStyle, fontSize: "16px", marginTop: 0, padding: "8px 12px" }}>Save Saved Exercise</button>
        <button type="button" onClick={onCancel} style={{ ...buttonStyle, background: "#666", fontSize: "16px", marginTop: 0, padding: "8px 12px" }}>Cancel Saved Exercise Edit</button>
      </div>
    </div>
  );
}

export default SavedExerciseEditor;
