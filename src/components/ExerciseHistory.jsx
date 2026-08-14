import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deriveExerciseHistory } from "../services/exerciseHistory";
import { deriveExercisePrs } from "../services/exercisePr";
import { deriveEstimatedOneRepMaxes, formatEstimatedOneRepMax } from "../services/estimatedOneRepMax";
import { createWorkoutPrCandidate } from "../services/trophyCase";
import {
  describeExerciseRecord,
  getExerciseRecordTrackKey,
} from "../services/exerciseRecordDescriptor";
import WorkoutPhotos from "./WorkoutPhotos";

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

function DropSegments({ drops }) {
  if (!Array.isArray(drops) || drops.length === 0) return null;
  return (
    <div style={{ borderLeft: "2px solid #60a5fa", display: "grid", gap: "6px", marginTop: "6px", maxWidth: "100%", paddingLeft: "10px" }}>
      {drops.map((drop, dropIndex) => (
        <div key={drop.id || dropIndex} style={{ overflowWrap: "anywhere" }}>
          <span>↳ Drop {dropIndex + 1}: {setDescription(drop)}</span>
          {drop.notes && (
            <span style={{ color: "#9ca3af", display: "block", whiteSpace: "pre-wrap" }}>{drop.notes}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function recordsAtHeaviestWeights(records) {
  const byUnit = new Map();
  records.forEach((record) => {
    if (!byUnit.has(record.unit)) byUnit.set(record.unit, []);
    byUnit.get(record.unit).push(record);
  });

  return [...byUnit.entries()]
    .sort(([firstUnit], [secondUnit]) => firstUnit.localeCompare(secondUnit))
    .flatMap(([, unitRecords]) =>
      unitRecords.sort((first, second) => second.weight - first.weight).slice(0, 3)
    );
}

function CandidateAction({ candidate, trophySourceKeys, addTrophyCaseEntry, buttonStyle }) {
  const isCurated = trophySourceKeys.has(candidate.sourceKey);
  return (
    <button
      type="button"
      disabled={isCurated}
      onClick={() => addTrophyCaseEntry(candidate)}
      style={{ ...buttonStyle, backgroundColor: isCurated ? "#4b5563" : "#a16207", fontSize: "16px", marginTop: "10px", minHeight: "44px", padding: "10px 14px" }}
    >
      {isCurated ? "In Trophy Case" : "Add to Trophy Case"}
    </button>
  );
}

function timestampValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isModalInteraction(target) {
  return Boolean(target?.closest?.('[aria-modal="true"]'));
}

function compareProgressionEventsForDisplay(first, second) {
  const timeDifference =
    timestampValue(second.performedAt) - timestampValue(first.performedAt);
  if (timeDifference !== 0) return timeDifference;
  const workoutComparison = String(first.workoutId).localeCompare(
    String(second.workoutId)
  );
  if (workoutComparison !== 0) return workoutComparison;
  const exerciseDifference = first.exerciseIndex - second.exerciseIndex;
  if (exerciseDifference !== 0) return exerciseDifference;
  const setDifference = first.setIndex - second.setIndex;
  if (setDifference !== 0) return setDifference;
  return first.recordType.localeCompare(second.recordType);
}

function PrTimeline({
  exercisePr,
  trophySourceKeys,
  addTrophyCaseEntry,
  buttonStyle,
  panelRef,
  onCollapse,
}) {
  if (!exercisePr) return null;
  const currentSourceKeyByTrack = new Map();
  Object.values(exercisePr.records).forEach((value) => {
    const records = Array.isArray(value) ? value : value ? [value] : [];
    records.forEach((record) => {
      currentSourceKeyByTrack.set(
        getExerciseRecordTrackKey(record),
        createWorkoutPrCandidate(exercisePr, record).sourceKey
      );
    });
  });
  const events = Object.values(exercisePr.progression)
    .flat()
    .sort(compareProgressionEventsForDisplay);
  if (events.length === 0) return null;

  return (
    <section
      ref={panelRef}
      aria-label={`${exercisePr.displayName} PR timeline`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "12px",
        marginTop: "14px",
        padding: "14px",
      }}
    >
      <h4 style={{ margin: "0 0 12px" }}>PR Timeline</h4>
      <button
        type="button"
        onClick={onCollapse}
        style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", marginTop: 0, minHeight: "44px", padding: "10px 14px" }}
      >
        Hide PR Timeline
      </button>
      <ol style={{ display: "grid", gap: "12px", listStyle: "none", margin: 0, padding: 0 }}>
        {events.map((event) => {
          const candidate = createWorkoutPrCandidate(exercisePr, event);
          const presentationStatus = event.achievement === "matched"
            ? "matched"
            : currentSourceKeyByTrack.get(getExerciseRecordTrackKey(event)) === candidate.sourceKey
              ? "current"
              : "former";
          const description = describeExerciseRecord(event, presentationStatus);
          const isCurrent = presentationStatus === "current";
          const accentColor = isCurrent
            ? "#f59e0b"
            : presentationStatus === "matched"
              ? "#60a5fa"
              : "#6b7280";
          return (
            <li
              key={candidate.sourceKey}
              data-achievement={event.achievement}
              data-record-status={presentationStatus}
              style={{
                background: isCurrent ? "#172033" : "transparent",
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: isCurrent ? "6px" : 0,
                padding: isCurrent ? "10px 10px 10px 12px" : "0 0 0 12px",
              }}
            >
              <strong style={{ color: isCurrent ? "#fde68a" : presentationStatus === "matched" ? "#93c5fd" : "#d1d5db", display: "block" }}>
                {description.status}
              </strong>
              <span style={{ display: "block", marginTop: "4px" }}>
                {description.label} · {description.value}
              </span>
              <span style={{ color: "#9ca3af", display: "block", marginTop: "2px" }}>
                {formatDate(event.performedAt)} · {event.workoutTitle}
              </span>
              <CandidateAction
                candidate={candidate}
                trophySourceKeys={trophySourceKeys}
                addTrophyCaseEntry={addTrophyCaseEntry}
                buttonStyle={buttonStyle}
              />
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={onCollapse}
        style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", minHeight: "44px", padding: "10px 14px" }}
      >
        Hide PR Timeline
      </button>
    </section>
  );
}

function CurrentRecords({ exercisePr, trophySourceKeys, addTrophyCaseEntry, buttonStyle }) {
  if (!exercisePr) return null;

  const { heaviestWeight, repsAtWeight, bodyweightReps } = exercisePr.records;
  const visibleRepsAtWeight = recordsAtHeaviestWeights(repsAtWeight);
  if (
    heaviestWeight.length === 0 &&
    visibleRepsAtWeight.length === 0 &&
    !bodyweightReps
  ) {
    return null;
  }

  const recordGroupStyle = {
    background: "#1f2937",
    borderRadius: "10px",
    overflowWrap: "anywhere",
    padding: "12px",
  };

  return (
    <section
      aria-label={`${exercisePr.displayName} current records`}
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "12px",
        marginTop: "14px",
        padding: "14px",
      }}
    >
      <h4 style={{ margin: "0 0 12px" }}>Current Records</h4>
      <div style={{ display: "grid", gap: "10px" }}>
        {heaviestWeight.length > 0 && (
          <div style={recordGroupStyle}>
            <strong style={{ display: "block", marginBottom: "6px" }}>
              Heaviest Weight
            </strong>
            {heaviestWeight.map((record) => (
              <div key={record.unit} style={{ marginTop: "8px" }}>
                <span style={{ display: "block", fontSize: "18px" }}>
                  {record.weight} {record.unit} × {record.reps} reps
                </span>
                <span style={{ color: "#9ca3af", display: "block", marginTop: "2px" }}>
                  {formatDate(record.performedAt)} · {record.workoutTitle}
                </span>
                <CandidateAction
                  candidate={createWorkoutPrCandidate(exercisePr, record)}
                  trophySourceKeys={trophySourceKeys}
                  addTrophyCaseEntry={addTrophyCaseEntry}
                  buttonStyle={buttonStyle}
                />
              </div>
            ))}
          </div>
        )}

        {visibleRepsAtWeight.length > 0 && (
          <div style={recordGroupStyle}>
            <strong style={{ display: "block", marginBottom: "6px" }}>
              Best Reps at Weight
            </strong>
            {visibleRepsAtWeight.map((record) => (
              <div
                key={`${record.unit}|${record.weight}`}
                style={{ display: "block", marginTop: "4px" }}
              >
                {record.weight} {record.unit} — {record.reps} reps
                <CandidateAction
                  candidate={createWorkoutPrCandidate(exercisePr, record)}
                  trophySourceKeys={trophySourceKeys}
                  addTrophyCaseEntry={addTrophyCaseEntry}
                  buttonStyle={buttonStyle}
                />
              </div>
            ))}
          </div>
        )}

        {bodyweightReps && (
          <div style={recordGroupStyle}>
            <strong style={{ display: "block", marginBottom: "6px" }}>
              Bodyweight Rep Record
            </strong>
            <span style={{ display: "block", fontSize: "18px" }}>
              {bodyweightReps.reps} reps
            </span>
            <span style={{ color: "#9ca3af", display: "block", marginTop: "2px" }}>
              {formatDate(bodyweightReps.performedAt)} · {bodyweightReps.workoutTitle}
            </span>
            <CandidateAction
              candidate={createWorkoutPrCandidate(exercisePr, bodyweightReps)}
              trophySourceKeys={trophySourceKeys}
              addTrophyCaseEntry={addTrophyCaseEntry}
              buttonStyle={buttonStyle}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function EstimatedOneRepMax({ exerciseName, estimates }) {
  if (!Array.isArray(estimates) || estimates.length === 0) return null;
  return (
    <section
      aria-label={`${exerciseName} Estimated 1RM`}
      style={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px", marginTop: "14px", padding: "14px" }}
    >
      <h4 style={{ margin: "0 0 10px" }}>Estimated 1RM</h4>
      <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {estimates.map((estimate) => (
          <div key={estimate.unit} style={{ background: "#1f2937", borderRadius: "10px", overflowWrap: "anywhere", padding: "12px" }}>
            <strong style={{ display: "block", fontSize: "20px" }}>{formatEstimatedOneRepMax(estimate)}</strong>
            <span style={{ display: "block", marginTop: "4px" }}>
              Based on {estimate.performedWeight} {estimate.unit} × {estimate.reps}
            </span>
            <span style={{ color: "#9ca3af", display: "block", marginTop: "2px" }}>
              {formatDate(estimate.performedAt)} · {estimate.workoutTitle}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExerciseHistory({ workoutEntries, trophyEntries = [], addTrophyCaseEntry = () => false, buttonStyle, trophySourceTarget = null, onReturnToTrophyCase = null }) {
  const history = useMemo(
    () => deriveExerciseHistory(workoutEntries),
    [workoutEntries]
  );
  const prsByIdentity = useMemo(
    () =>
      new Map(
        deriveExercisePrs(workoutEntries).map((exercisePr) => [
          exercisePr.identityKey,
          exercisePr,
        ])
      ),
    [workoutEntries]
  );
  const estimatesByIdentity = useMemo(
    () => new Map(deriveEstimatedOneRepMaxes(workoutEntries).map(({ identityKey, estimates }) => [identityKey, estimates])),
    [workoutEntries]
  );
  const [selectedIdentityKey, setSelectedIdentityKey] = useState(null);
  const [isPrTimelineOpen, setIsPrTimelineOpen] = useState(false);
  const prTimelineRef = useRef(null);
  const exerciseHistoryDetailRef = useRef(null);
  const exerciseSummaryRefs = useRef(new Map());
  const pendingSwitchScrollIdentityRef = useRef(null);
  const performanceRefs = useRef(new Map());
  const trophySourceKeys = useMemo(
    () => new Set(trophyEntries.map(({ sourceKey }) => sourceKey)),
    [trophyEntries]
  );
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

  const closeExerciseHistory = useCallback(({ restoreContext = true } = {}) => {
    const summary = exerciseSummaryRefs.current.get(selectedIdentityKey);
    setIsPrTimelineOpen(false);
    setSelectedIdentityKey(null);
    if (restoreContext) {
      summary?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [selectedIdentityKey]);

  useEffect(() => {
    if (pendingSwitchScrollIdentityRef.current !== selectedIdentityKey) return;
    pendingSwitchScrollIdentityRef.current = null;
    exerciseSummaryRefs.current.get(selectedIdentityKey)?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedIdentityKey]);

  useEffect(() => {
    if (!trophySourceTarget?.exerciseIdentityKey) return undefined;
    setIsPrTimelineOpen(false);
    setSelectedIdentityKey(trophySourceTarget.exerciseIdentityKey);
    return undefined;
  }, [trophySourceTarget]);

  useEffect(() => {
    if (!trophySourceTarget?.performanceId || selectedIdentityKey !== trophySourceTarget.exerciseIdentityKey) return undefined;
    const frame = window.requestAnimationFrame(() => {
      performanceRefs.current.get(trophySourceTarget.performanceId)?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedIdentityKey, trophySourceTarget]);

  useEffect(() => {
    if (selectedIdentityKey && !selectedHistory) {
      setSelectedIdentityKey(null);
      setIsPrTimelineOpen(false);
    }
  }, [selectedHistory, selectedIdentityKey]);

  useEffect(() => {
    if (!isPrTimelineOpen) return undefined;

    function handlePointerDown(event) {
      if (isModalInteraction(event.target)) return;
      if (prTimelineRef.current?.contains(event.target)) return;
      setIsPrTimelineOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isPrTimelineOpen]);

  useEffect(() => {
    if (!selectedIdentityKey) return undefined;

    function handlePointerDown(event) {
      if (isModalInteraction(event.target)) return;
      if (exerciseHistoryDetailRef.current?.contains(event.target)) return;
      if ([...exerciseSummaryRefs.current.values()].some((summary) => summary.contains(event.target))) return;
      closeExerciseHistory({ restoreContext: false });
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      if (isPrTimelineOpen) {
        setIsPrTimelineOpen(false);
        return;
      }
      closeExerciseHistory();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeExerciseHistory, isPrTimelineOpen, selectedIdentityKey]);

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
                    ref={(node) => {
                      if (node) {
                        exerciseSummaryRefs.current.set(exercise.identityKey, node);
                      } else {
                        exerciseSummaryRefs.current.delete(exercise.identityKey);
                      }
                    }}
                    type="button"
                    aria-controls={detailId}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      if (isExpanded) {
                        closeExerciseHistory({ restoreContext: false });
                      } else {
                        if (selectedIdentityKey) {
                          pendingSwitchScrollIdentityRef.current = exercise.identityKey;
                        }
                        setIsPrTimelineOpen(false);
                        setSelectedIdentityKey(exercise.identityKey);
                      }
                    }}
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
                    <div
                      ref={exerciseHistoryDetailRef}
                      id={detailId}
                      style={{ margin: "14px 0 10px" }}
                    >
                      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
                        <h3 style={{ margin: 0 }}>{exercise.displayName}</h3>
                        <button type="button" onClick={closeExerciseHistory} style={{ ...compactButtonStyle, backgroundColor: "#4b5563" }}>
                          Close History
                        </button>
                      </div>
                      <CurrentRecords
                        exercisePr={prsByIdentity.get(exercise.identityKey)}
                        trophySourceKeys={trophySourceKeys}
                        addTrophyCaseEntry={addTrophyCaseEntry}
                        buttonStyle={buttonStyle}
                      />
                      <EstimatedOneRepMax
                        exerciseName={exercise.displayName}
                        estimates={estimatesByIdentity.get(exercise.identityKey)}
                      />
                      {isPrTimelineOpen ? (
                        <PrTimeline
                          exercisePr={prsByIdentity.get(exercise.identityKey)}
                          trophySourceKeys={trophySourceKeys}
                          addTrophyCaseEntry={addTrophyCaseEntry}
                          buttonStyle={buttonStyle}
                          panelRef={prTimelineRef}
                          onCollapse={() => setIsPrTimelineOpen(false)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPrTimelineOpen(true)}
                          style={{ ...compactButtonStyle, backgroundColor: "#374151", marginTop: "14px" }}
                        >
                          View PR Timeline
                        </button>
                      )}
                      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                        {exercise.performances.map((performance) => (
                          <article
                            key={performance.performanceId}
                            ref={(node) => {
                              if (node) performanceRefs.current.set(performance.performanceId, node);
                              else performanceRefs.current.delete(performance.performanceId);
                            }}
                            data-performance-id={performance.performanceId}
                            style={{ background: "#111827", border: performance.performanceId === trophySourceTarget?.performanceId ? "2px solid #d97706" : "1px solid #374151", borderRadius: "12px", overflowWrap: "anywhere", padding: "16px", scrollMarginTop: "24px" }}
                          >
                            <h4 style={{ margin: 0 }}>{formatDate(performance.performedAt)}</h4>
                            <p style={{ color: "#d1d5db", margin: "6px 0 10px" }}>{performance.workoutTitle}</p>
                            {performance.performanceId === trophySourceTarget?.performanceId && onReturnToTrophyCase && (
                              <button type="button" onClick={onReturnToTrophyCase} style={{ ...compactButtonStyle, backgroundColor: "#a16207", marginBottom: "12px" }}>
                                Back to Trophy Case
                              </button>
                            )}
                            <WorkoutPhotos photos={performance.photos} label={`${performance.workoutTitle} photos`} />
                            <ol style={{ marginBottom: 0, paddingLeft: "24px" }}>
                              {performance.sets.map((set, setIndex) => (
                                <li key={set.id || setIndex} data-source-set={set.id === trophySourceTarget?.setId ? "true" : undefined} style={{ background: set.id === trophySourceTarget?.setId ? "rgba(217, 119, 6, 0.18)" : "transparent", borderRadius: "6px", marginBottom: "6px", padding: set.id === trophySourceTarget?.setId ? "6px" : 0 }}>
                                  {setDescription(set)}
                                  {set.notes && (
                                    <span style={{ color: "#9ca3af", display: "block", whiteSpace: "pre-wrap" }}>
                                      {set.notes}
                                    </span>
                                  )}
                                  <DropSegments drops={set.drops} />
                                </li>
                              ))}
                            </ol>
                          </article>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={closeExerciseHistory}
                        style={{ ...compactButtonStyle, backgroundColor: "#4b5563", marginTop: "14px" }}
                      >
                        Close History
                      </button>
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
