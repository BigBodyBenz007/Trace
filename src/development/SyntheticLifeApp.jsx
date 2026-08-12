import { useMemo, useState } from "react";
import HomePage from "../components/HomePage";
import WorkoutPage from "../components/WorkoutPage";
import TrophyCasePage from "../components/TrophyCasePage";
import { deriveLifeCurrent } from "../services/lifeCurrent";
import { deriveLifeCurrentLayout } from "../services/lifeCurrentLayout";
import { resolveTrophySource } from "../services/trophySourceNavigation";
import { generateSyntheticLife } from "./syntheticLife";

const buttonStyle = { background: "#374151", border: 0, borderRadius: "8px", color: "white", cursor: "pointer", margin: "6px", padding: "10px 14px" };
const inputStyle = { boxSizing: "border-box", maxWidth: "100%", padding: "12px" };
const containerStyle = { alignItems: "center", display: "flex", flexDirection: "column", margin: "0 auto", maxWidth: "1200px", minHeight: "100vh", padding: "20px", width: "100%" };
const readOnly = () => false;

export function defaultExitSyntheticLife() {
  const url = new URL(window.location.href);
  url.searchParams.delete("syntheticLife");
  window.location.assign(url.toString());
}

function SyntheticLifeApp({ onExit = defaultExitSyntheticLife }) {
  const [page, setPage] = useState("home");
  const [trophyNavigation, setTrophyNavigation] = useState(null);
  const dataset = useMemo(() => generateSyntheticLife(), []);
  const performanceReport = useMemo(() => {
    const currentStart = performance.now();
    const current = deriveLifeCurrent(dataset);
    const currentEnd = performance.now();
    const layout = deriveLifeCurrentLayout(current);
    const layoutEnd = performance.now();
    return { lifeCurrentMilliseconds: currentEnd - currentStart, layoutMilliseconds: layoutEnd - currentEnd, populatedDays: current.days.length, layoutPoints: layout.points.length };
  }, [dataset]);
  const resolveSyntheticTrophySource = (entry) =>
    resolveTrophySource(entry, {
      memories: dataset.memories,
      workouts: dataset.workoutEntries,
    });
  const viewTrophySource = (entry) => {
    const target = resolveSyntheticTrophySource(entry);
    if (!target) return;
    setTrophyNavigation({
      originTrophyId: entry.id,
      sourceType: entry.sourceType,
      target,
    });
    setPage(entry.sourceType === "memory" ? "home" : "workouts");
  };
  const returnToTrophyCase = () => setPage("trophy-case");
  const banner = (
    <aside style={{ background: "#78350f", color: "white", padding: "10px 16px", position: "sticky", top: 0, zIndex: 10000 }}>
      <strong>Synthetic Life development mode — read only</strong>
      <span style={{ marginLeft: "12px" }}>{dataset.metrics.memoryCount} Memories · {dataset.metrics.photoCount} photos · {dataset.metrics.workoutCount} workouts</span>
      <button type="button" onClick={onExit} style={buttonStyle}>Exit synthetic mode</button>
      <details><summary>Performance report</summary><pre>{JSON.stringify({ ...dataset.metrics, ...performanceReport }, null, 2)}</pre></details>
    </aside>
  );
  if (page === "workouts") {
    return <>{banner}<WorkoutPage onBack={() => setPage("home")} workoutEntries={dataset.workoutEntries} trophyEntries={dataset.trophyCaseEntries} savedExercises={[]} saveWorkoutEntry={readOnly} saveExerciseDefinitions={() => []} updateWorkoutEntry={readOnly} deleteWorkoutEntry={readOnly} addTrophyCaseEntry={readOnly} removeTrophyCaseEntry={readOnly} buttonStyle={buttonStyle} inputStyle={inputStyle} containerStyle={containerStyle} trophySourceTarget={trophyNavigation?.sourceType === "workout-pr" ? trophyNavigation.target : null} onReturnToTrophyCase={returnToTrophyCase} /></>;
  }
  if (page === "trophy-case") {
    return <>{banner}<TrophyCasePage onBack={() => setPage("home")} trophyEntries={dataset.trophyCaseEntries} removeTrophyCaseEntry={readOnly} buttonStyle={buttonStyle} containerStyle={containerStyle} onViewSource={viewTrophySource} sourceAvailable={(entry) => Boolean(resolveSyntheticTrophySource(entry))} restoreTrophyId={trophyNavigation?.originTrophyId ?? null} onRestoreComplete={() => setTrophyNavigation(null)} allowRemoval={false} /></>;
  }
  return <>{banner}<HomePage memoryCount={dataset.memories.length} memories={dataset.memories} nutritionEntries={dataset.nutritionEntries} workoutEntries={dataset.workoutEntries} medicationEntries={dataset.medicationEntries} trophyEntries={dataset.trophyCaseEntries} toggleFavorite={readOnly} onAddMemory={readOnly} onOpenNutrition={readOnly} onOpenMedications={readOnly} onOpenProtocols={readOnly} onOpenWorkouts={() => setPage("workouts")} onOpenTrophyCase={() => setPage("trophy-case")} deleteMemory={readOnly} editMemory={readOnly} addTrophyCaseEntry={readOnly} buttonStyle={buttonStyle} inputStyle={inputStyle} containerStyle={containerStyle} trophySourceTarget={trophyNavigation?.sourceType === "memory" ? trophyNavigation.target : null} onReturnToTrophyCase={returnToTrophyCase} onExitTrophySource={() => setTrophyNavigation(null)} /></>;
}

export default SyntheticLifeApp;
