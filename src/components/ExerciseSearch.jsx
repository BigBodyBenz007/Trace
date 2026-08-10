import { useEffect, useMemo, useState } from "react";
import { searchExercises } from "../services/exerciseSearch";

function loadLabel(exercise) {
  const load = exercise.defaults.load;
  return load.mode === "bodyweight"
    ? "Bodyweight"
    : `External weight · ${load.unit}`;
}

function ExerciseSearch({
  exercises,
  onSelectExercise,
  onEditExercise,
  inputStyle,
  resetKey,
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchExercises(query, exercises),
    [query, exercises]
  );
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);

  useEffect(() => setQuery(""), [resetKey]);

  return (
    <div style={{ border: "1px solid #4b5563", borderRadius: "10px", marginBottom: "14px", padding: "14px" }}>
      <label style={{ display: "block" }}>
        Saved exercise search
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search saved exercises..."
          style={{ ...inputStyle, boxSizing: "border-box", fontSize: "16px", marginTop: "8px", padding: "10px", width: "100%" }}
        />
      </label>
      {results.length > 0 && (
        <div aria-label="Saved exercise search results" style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {results.map((exercise) => (
            <div key={exercise.id} style={{ background: "#111827", borderRadius: "8px", padding: "12px" }}>
              <strong>{exercise.name}</strong>
              <span style={{ color: "#9ca3af", display: "block", marginTop: "4px" }}>
                Default: {loadLabel(exercise)}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                <button type="button" aria-label={`Select saved exercise ${exercise.name}`} onClick={() => onSelectExercise(exercise)} style={{ background: "#2563eb", border: 0, borderRadius: "8px", color: "white", cursor: "pointer", padding: "7px 12px" }}>Select</button>
                <button type="button" aria-label={`Edit saved exercise ${exercise.name}`} onClick={() => onEditExercise(exercise)} style={{ background: "#4b5563", border: 0, borderRadius: "8px", color: "white", cursor: "pointer", padding: "7px 12px" }}>Edit Saved Exercise</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMeaningfulQuery && results.length === 0 && (
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>No saved exercises found.</p>
      )}
    </div>
  );
}

export default ExerciseSearch;
