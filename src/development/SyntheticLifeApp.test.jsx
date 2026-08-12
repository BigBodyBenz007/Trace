import { fireEvent, render, screen } from "@testing-library/react";
import SyntheticLifeApp from "./SyntheticLifeApp";

jest.mock("../components/HomePage", () => (props) => (
  <div>
    <span>{props.memoryCount} synthetic Memories</span>
    <button onClick={props.onOpenWorkouts}>Workouts</button>
    <button onClick={props.onOpenTrophyCase}>Trophy Case</button>
    {props.trophySourceTarget && (
      <div>
        <span>Memory source {props.trophySourceTarget.memoryId}</span>
        <button onClick={props.onReturnToTrophyCase}>Back to Trophy Case</button>
      </div>
    )}
  </div>
));
jest.mock("../components/WorkoutPage", () => (props) => (
  <div>
    <span>{props.workoutEntries.length} synthetic workouts</span>
    {props.trophySourceTarget && (
      <div>
        <span>Workout source {props.trophySourceTarget.workoutId}</span>
        <button onClick={props.onReturnToTrophyCase}>Back to Trophy Case</button>
      </div>
    )}
    <button onClick={props.onBack}>Back</button>
  </div>
));
jest.mock("../components/TrophyCasePage", () => (props) => {
  const memory = props.trophyEntries.find(({ sourceType }) => sourceType === "memory");
  const workout = props.trophyEntries.find(({ sourceType }) => sourceType === "workout-pr");
  return (
    <div>
      <span>Synthetic Trophy Case</span>
      <span>Removal allowed: {String(props.allowRemoval)}</span>
      {props.restoreTrophyId && <span>Restored trophy {props.restoreTrophyId}</span>}
      <button onClick={() => props.onViewSource(memory)}>View Memory</button>
      <button onClick={() => props.onViewSource(workout)}>View Workout</button>
    </div>
  );
});

test("synthetic shell is explicit, read-only, and exits without touching real storage", () => {
  localStorage.setItem("memories", JSON.stringify([{ id: "real-memory" }]));
  const onExit = jest.fn();
  render(<SyntheticLifeApp onExit={onExit} />);
  expect(screen.getByText(/Synthetic Life development mode/)).toBeInTheDocument();
  expect(screen.getByText(/synthetic Memories/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Workouts" }));
  expect(screen.getByText(/synthetic workouts/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Exit synthetic mode" }));
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem("memories"))).toEqual([{ id: "real-memory" }]);
});

test("synthetic trophies navigate to exact sources and restore without mutation controls", () => {
  render(<SyntheticLifeApp />);
  fireEvent.click(screen.getByRole("button", { name: "Trophy Case" }));
  expect(screen.getByText("Removal allowed: false")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "View Memory" }));
  const memoryTarget = screen.getByText(/Memory source/).textContent.replace("Memory source ", "");
  expect(memoryTarget).toMatch(/^synthetic:memory:/);
  fireEvent.click(screen.getByRole("button", { name: "Back to Trophy Case" }));
  expect(screen.getByText(/Restored trophy synthetic:trophy:memory:/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "View Workout" }));
  const workoutTarget = screen.getByText(/Workout source/).textContent.replace("Workout source ", "");
  expect(workoutTarget).toMatch(/^synthetic:workout:/);
  fireEvent.click(screen.getByRole("button", { name: "Back to Trophy Case" }));
  expect(screen.getByText(/Restored trophy synthetic:trophy:workout:/)).toBeInTheDocument();
});
