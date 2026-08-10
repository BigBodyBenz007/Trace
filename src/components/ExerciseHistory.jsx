import { useEffect, useMemo, useState } from "react";
import { deriveExerciseHistory } from "../services/exerciseHistory";

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
}

function setDescription(set) {
  if (set?.load?.mode === "bodyweight") {
    return `Bodyweight × ${set.reps} reps`;
  }
  if (set?.load?.mode === "external") {
    return `${set.load.amount} ${set.load.unit} × ${set.reps} reps`;
  }
  return `${set?.load?.mode || "Load"} × ${set?.reps} reps`;
}

function ExerciseHistory({ workoutEntries, buttonStyle }) {
  const history = useMemo(
    () => deriveExerciseHistory(workoutEntries),
    [workoutEntries]
  );
  const [selectedIdentityKey, setSelectedIdentityKey] = useState(null);
  const selectedHistory = history.find(
    ({ identityKey }) => identityKey === selectedIdentityKey
  );
  const compactButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    marginTop: 0,
    minHeight: "44px",
    padding: "10px 14px",
  };

  useEffect(() => {
    if (selectedIdentityKey && !selectedHistory) {
      setSelectedIdentityKey(null);
    }
  }, [selectedHistory, selectedIdentityKey]);

  return (
    <section
      aria-labelledby="exercise-history-heading"
      style={{ marginTop: "36px", maxWidth: "760px", textAlign: "left", width: "100%" }}
    >
      <h2 id="exercise-history-heading">Exercise History</h2>
      {history.length === 0 ? (
        <p style={{ color: "#bbb" }}>No exercise history yet.</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: "10px" }}>
            {history.map((exercise, exerciseIndex) => {
              const isExpanded = exercise.identityKey === selectedIdentityKey;
              const detailId = `exercise-history-detail-${exerciseIndex}`;

              return (
                <div key={exercise.identityKey}>
                  <button
                    type="button"
                    aria-controls={detailId}
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setSelectedIdentityKey(isExpanded ? null : exercise.identityKey)
                    }
                    style={{
                      background: isExpanded ? "#1d4ed8" : "#1f2937",
                      border: "1px solid #4b5563",
                      borderRadius: "12px",
                      color: "white",
                      cursor: "pointer",
                      minHeight: "64px",
                      overflowWrap: "anywhere",
                      padding: "14px",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <strong style={{ display: "block" }}>{exercise.displayName}</strong>
                    <span style={{ color: "#d1d5db", display: "block", marginTop: "4px" }}>
                      {exercise.performanceCount} performance
                      {exercise.performanceCount === 1 ? "" : "s"} · Most recent {formatDate(exercise.lastPerformedAt)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div id={detailId} style={{ margin: "14px 0 10px" }}>
                      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
                        <h3 style={{ margin: 0 }}>{exercise.displayName}</h3>
                        <button type="button" onClick={() => setSelectedIdentityKey(null)} style={{ ...compactButtonStyle, backgroundColor: "#4b5563" }}>
                          Close History
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                        {exercise.performances.map((performance) => (
                          <article key={performance.performanceId} style={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px", overflowWrap: "anywhere", padding: "16px" }}>
                            <h4 style={{ margin: 0 }}>{formatDate(performance.performedAt)}</h4>
                            <p style={{ color: "#d1d5db", margin: "6px 0 10px" }}>{performance.workoutTitle}</p>
                            <ol style={{ marginBottom: 0, paddingLeft: "24px" }}>
                              {performance.sets.map((set, setIndex) => (
                                <li key={set.id || setIndex} style={{ marginBottom: "6px" }}>
                                  {setDescription(set)}
                                  {set.notes && (
                                    <span style={{ color: "#9ca3af", display: "block", whiteSpace: "pre-wrap" }}>
                                      {set.notes}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default ExerciseHistory;
