import { useEffect, useRef, useState } from "react";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";
import {
  clearFormDraft,
  formDraftFingerprint,
  readFormDraft,
  writeFormDraft,
} from "../services/formDrafts";

function SavedExerciseEditor({ exercise, onSave, onCancel, inputStyle, buttonStyle }) {
  const baseValueRef = useRef({
    name: exercise.name,
    defaultLoadMode: exercise.defaults.load.mode,
    defaultWeightUnit: exercise.defaults.load.unit || "lb",
  });
  const contextRef = useRef({
    domain: "saved-exercise",
    context: `edit:${exercise.id}`,
    sourceFingerprint: formDraftFingerprint(exercise),
  });
  const restoredRef = useRef(readFormDraft(localStorage, contextRef.current, baseValueRef.current));
  const initialValueRef = useRef(restoredRef.current.status === "restored"
    ? restoredRef.current.entry.initialValue
    : baseValueRef.current);
  const value = restoredRef.current.status === "restored" ? restoredRef.current.value : baseValueRef.current;
  const [name, setName] = useState(value.name);
  const [defaultLoadMode, setDefaultLoadMode] = useState(value.defaultLoadMode);
  const [defaultWeightUnit, setDefaultWeightUnit] = useState(value.defaultWeightUnit);
  const [error, setError] = useState(restoredRef.current.status === "conflict"
    ? "This saved exercise changed after an unfinished edit was stored, so Trace did not apply the older draft."
    : restoredRef.current.status === "malformed" || restoredRef.current.status === "invalid-value"
      ? "Trace found malformed unfinished form data and left it unchanged."
      : "");
  const fieldStyle = { ...inputStyle, boxSizing: "border-box", fontSize: "16px", marginTop: "8px", padding: "10px", width: "100%" };

  useEffect(() => {
    try {
      writeFormDraft(localStorage, contextRef.current, initialValueRef.current, { name, defaultLoadMode, defaultWeightUnit });
    } catch (storageFailure) {
      setError("Trace could not preserve this unfinished saved-exercise edit. Keep the editor open and try again.");
    }
  }, [name, defaultLoadMode, defaultWeightUnit]);

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
    try {
      clearFormDraft(localStorage, contextRef.current);
    } catch (storageFailure) {
      setError("The saved exercise was updated, but Trace could not clear its unfinished draft. Reload and verify it before saving again.");
      return;
    }
    onCancel();
  }

  function cancel() {
    const current = { name, defaultLoadMode, defaultWeightUnit };
    if (
      formDraftFingerprint(current) !== formDraftFingerprint(initialValueRef.current) &&
      !window.confirm("Cancel this saved exercise edit? Your unsaved changes will be lost.")
    ) return;
    try {
      clearFormDraft(localStorage, contextRef.current);
    } catch (storageFailure) {
      setError("Trace could not discard this unfinished saved-exercise edit. It was left available for recovery.");
      return;
    }
    onCancel();
  }

  return (
    <div className="trace-feature-surface trace-saved-exercise-editor" style={{ background: "#111827", border: "1px solid #6b7280", borderRadius: "10px", marginBottom: "14px", padding: "14px" }}>
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
        <button className="trace-action trace-action--primary" type="button" onClick={save} style={{ ...buttonStyle, fontSize: "16px", marginTop: 0, padding: "8px 12px" }}>Save Saved Exercise</button>
        <button className="trace-action trace-action--secondary" type="button" onClick={cancel} style={{ ...buttonStyle, background: "#666", fontSize: "16px", marginTop: 0, padding: "8px 12px" }}>Cancel Saved Exercise Edit</button>
      </div>
    </div>
  );
}

export default SavedExerciseEditor;
