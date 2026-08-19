import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { searchUnifiedExercises } from "../services/exerciseSearch";

function loadLabel(exercise) {
  const load = exercise.defaults.load;
  return load.mode === "bodyweight"
    ? "Bodyweight"
    : `External weight · ${load.unit}`;
}

function ExerciseSearch({
  exercises,
  onSelectExercise,
  onSelectBuiltInExercise,
  onEditExercise,
  inputStyle,
  resetKey,
  autoFocus = false,
}) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);
  const results = useMemo(
    () => searchUnifiedExercises(query, exercises),
    [query, exercises]
  );
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);

  useEffect(() => setQuery(""), [resetKey]);

  useLayoutEffect(() => {
    if (!autoFocus) return;
    searchInputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <div className="trace-feature-surface trace-exercise-search" style={{ border: "1px solid #4b5563", borderRadius: "10px", marginBottom: "14px", padding: "14px" }}>
      <label style={{ display: "block" }}>
        Exercise search
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Trace and saved exercises..."
          style={{ ...inputStyle, boxSizing: "border-box", fontSize: "16px", marginTop: "8px", padding: "10px", width: "100%" }}
        />
      </label>
      {results.length > 0 && (
        <div aria-label="Exercise search results" style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {results.map(({ source, exercise }) => (
            <div className="trace-search-result" key={`${source}:${exercise.id}`} style={{ background: "#111827", borderRadius: "8px", overflowWrap: "anywhere", padding: "12px", width: "100%" }}>
              <span className="trace-badge" style={{ background: source === "trace" ? "#1e3a5f" : "#374151", borderRadius: "999px", color: "#dbeafe", display: "inline-block", fontSize: "12px", marginBottom: "6px", padding: "3px 8px" }}>
                {source === "trace" ? "Trace Exercise" : "Saved Exercise"}
              </span>
              <strong style={{ display: "block" }}>{exercise.name}</strong>
              <span style={{ color: "#9ca3af", display: "block", marginTop: "4px" }}>
                {source === "trace"
                  ? `${exercise.category} · ${exercise.equipment}`
                  : `Default: ${loadLabel(exercise)}`}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                <button className="trace-action trace-action--primary" type="button" aria-label={`Select ${source === "trace" ? "Trace" : "saved"} exercise ${exercise.name}`} onClick={() => source === "trace" ? onSelectBuiltInExercise(exercise) : onSelectExercise(exercise)} style={{ background: "#2563eb", border: 0, borderRadius: "8px", color: "white", cursor: "pointer", minHeight: "38px", padding: "8px 14px" }}>Select</button>
                {source === "saved" && <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit saved exercise ${exercise.name}`} onClick={() => onEditExercise(exercise)} style={{ background: "#4b5563", border: 0, borderRadius: "8px", color: "white", cursor: "pointer", minHeight: "38px", padding: "8px 14px" }}>Edit Saved Exercise</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMeaningfulQuery && results.length === 0 && (
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>No exercises found.</p>
      )}
    </div>
  );
}

export default ExerciseSearch;
