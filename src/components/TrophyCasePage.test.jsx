import { fireEvent, render, screen, within } from "@testing-library/react";
import TrophyCasePage from "./TrophyCasePage";

function trophy(overrides = {}) {
  return {
    id: "workout-trophy",
    sourceType: "workout-pr",
    sourceKey: "workout-pr|trace|bench",
    sourceId: "workout-1",
    sourceRecordType: "heaviest-weight",
    title: "Bench Press",
    description: "Heaviest Weight · 100 lb × 5 reps",
    achievedAt: "2026-08-10T12:00:00.000Z",
    addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
    sourceSnapshot: {
      recordLabel: "Heaviest Weight",
      recordValue: "100 lb × 5 reps",
      workoutTitle: "Push Day",
    },
    metadata: {},
    ...overrides,
  };
}

test("renders a user-curated page heading, navigation, and existing empty state", () => {
  const onBack = jest.fn();
  render(
    <TrophyCasePage
      onBack={onBack}
      trophyEntries={[]}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  expect(screen.getByRole("heading", { level: 1, name: "Trophy Case" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: "Trophy Case" })).toHaveLength(1);
  expect(screen.getByText(/personal and user-curated/i)).toBeInTheDocument();
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("shows mixed sources and delegates membership removal", () => {
  const remove = jest.fn();
  const memoryTrophy = trophy({
    id: "memory-trophy",
    sourceType: "memory",
    sourceKey: "memory|graduation",
    sourceId: "graduation",
    sourceRecordType: null,
    title: "Graduation Day",
    description: "Finished my degree.",
    achievedAt: "2026-05-18T12:00:00.000Z",
    addedToTrophyCaseAt: "2026-08-12T12:00:00.000Z",
    sourceSnapshot: { description: "Finished my degree." },
  });
  render(
    <TrophyCasePage
      trophyEntries={[trophy(), memoryTrophy]}
      removeTrophyCaseEntry={remove}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  const life = screen.getByRole("region", { name: "Life Achievements" });
  const workouts = screen.getByRole("region", { name: "Workout Achievements" });
  expect(within(life).getByRole("group", { name: "Graduation Day trophy" })).toBeInTheDocument();
  expect(within(life).queryByRole("group", { name: "Bench Press trophy" })).not.toBeInTheDocument();
  expect(within(workouts).getByRole("group", { name: "Bench Press trophy" })).toBeInTheDocument();
  expect(screen.getByTestId("trophy-source-groups")).toHaveStyle({ display: "grid" });
  fireEvent.click(screen.getAllByRole("button", { name: "Remove from Trophy Case" })[0]);
  expect(remove).toHaveBeenCalledWith("memory-trophy");
});

test("preserves existing ordering within each source group", () => {
  const olderMemory = trophy({
    id: "older-memory",
    sourceType: "memory",
    sourceKey: "memory|older",
    title: "Older Life",
    addedToTrophyCaseAt: "2026-08-01T12:00:00.000Z",
  });
  const newerMemory = trophy({
    id: "newer-memory",
    sourceType: "memory",
    sourceKey: "memory|newer",
    title: "Newer Life",
    addedToTrophyCaseAt: "2026-08-12T12:00:00.000Z",
  });
  const olderWorkout = trophy({ id: "older-workout", title: "Older Workout", addedToTrophyCaseAt: "2026-08-02T12:00:00.000Z" });
  const newerWorkout = trophy({ id: "newer-workout", title: "Newer Workout", addedToTrophyCaseAt: "2026-08-13T12:00:00.000Z" });
  render(
    <TrophyCasePage
      trophyEntries={[olderMemory, newerWorkout, newerMemory, olderWorkout]}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  const labelsIn = (regionName) => within(screen.getByRole("region", { name: regionName }))
    .getAllByRole("group", { name: /trophy$/ })
    .map((card) => card.getAttribute("aria-label"));
  expect(labelsIn("Life Achievements")).toEqual(["Newer Life trophy", "Older Life trophy"]);
  expect(labelsIn("Workout Achievements")).toEqual(["Newer Workout trophy", "Older Workout trophy"]);
});

test("renders intentional empty-group copy when only one source is present", () => {
  render(
    <TrophyCasePage
      trophyEntries={[trophy()]}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("heading", { name: "Life Achievements" })).toBeInTheDocument();
  expect(screen.getByText("No Life Achievements curated yet.")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Bench Press trophy" })).toBeInTheDocument();
  expect(screen.queryByText("No trophies yet. Achievements you choose to celebrate will appear here.")).not.toBeInTheDocument();
});
