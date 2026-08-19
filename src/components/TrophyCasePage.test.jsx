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

test("uses the scoped celebratory presentation without changing Trophy semantics", () => {
  render(<TrophyCasePage onBack={jest.fn()} trophyEntries={[trophy()]} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByRole("heading", { level: 1, name: "Trophy Case" }).closest(".trace-feature-page")).toHaveClass("trace-feature-page--trophy-case");
  expect(screen.getByTestId("trophy-cabinet")).toHaveClass("trace-trophy-cabinet");
  expect(screen.getByRole("button", { name: "Open workout achievement: Bench Press, heaviest weight" })).toHaveAttribute("data-award-variant", "championship-cup");
});

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
  const buttons = screen.getAllByRole("button", { name: "Back to Timeline" });
  expect(buttons).toHaveLength(2);
  fireEvent.click(buttons[0]); fireEvent.click(buttons[1]);
  expect(onBack).toHaveBeenCalledTimes(2);
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
  expect(within(life).getByRole("button", { name: "Open achievement: Graduation Day" })).toBeInTheDocument();
  expect(within(life).queryByRole("button", { name: /Bench Press/ })).not.toBeInTheDocument();
  expect(within(workouts).getByRole("button", { name: /Open workout achievement: Bench Press/ })).toBeInTheDocument();
  expect(screen.getByTestId("trophy-source-groups")).toHaveClass("trace-trophy-cabinet__interior");
  fireEvent.click(within(life).getByRole("button", { name: "Open achievement: Graduation Day" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
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
    .getAllByRole("button", { name: /^Open/ })
    .map((button) => button.getAttribute("aria-label"));
  expect(labelsIn("Life Achievements")).toEqual(["Open achievement: Newer Life", "Open achievement: Older Life"]);
  expect(labelsIn("Workout Achievements")).toEqual(["Open workout achievement: Newer Workout, heaviest weight", "Open workout achievement: Older Workout, heaviest weight"]);
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
  expect(screen.getByRole("button", { name: /Open workout achievement: Bench Press/ })).toBeInTheDocument();
  expect(screen.queryByText("No trophies yet. Achievements you choose to celebrate will appear here.")).not.toBeInTheDocument();
});

test("shows disabled unavailable source behavior without affecting removal", () => {
  const remove = jest.fn();
  render(<TrophyCasePage trophyEntries={[trophy()]} onViewSource={jest.fn()} sourceAvailable={() => false} removeTrophyCaseEntry={remove} />);
  fireEvent.click(screen.getByRole("button", { name: /Open workout achievement: Bench Press/ }));
  expect(screen.getByRole("button", { name: "View Workout" })).toBeDisabled();
  expect(screen.getByText("Source no longer available")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(remove).toHaveBeenCalledWith("workout-trophy");
});

test("delegates both source-navigation actions from the selected award detail", () => {
  const view = jest.fn();
  const memory = trophy({ id: "memory-trophy", sourceType: "memory", sourceKey: "memory|logo", sourceRecordType: null, title: "Logo in effect", sourceSnapshot: { description: "A meaningful launch." } });
  render(<TrophyCasePage trophyEntries={[trophy(), memory]} onViewSource={view} sourceAvailable={() => true} />);

  fireEvent.click(screen.getByRole("button", { name: "Open achievement: Logo in effect" }));
  fireEvent.click(screen.getByRole("button", { name: "View Memory" }));
  expect(view).toHaveBeenLastCalledWith(expect.objectContaining({ id: "memory-trophy" }));

  fireEvent.click(screen.getByRole("button", { name: /Open workout achievement: Bench Press/ }));
  fireEvent.click(screen.getByRole("button", { name: "View Workout" }));
  expect(view).toHaveBeenLastCalledWith(expect.objectContaining({ id: "workout-trophy" }));
});

test("keeps long titles available to assistive technology and reveals them in full", () => {
  const longTitle = "A very long personal achievement title that must remain represented safely inside the cabinet";
  render(<TrophyCasePage trophyEntries={[trophy({ title: longTitle })]} />);
  const trigger = screen.getByRole("button", { name: `Open workout achievement: ${longTitle}, heaviest weight` });
  expect(within(trigger).getByTitle(longTitle)).toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.getByRole("heading", { name: longTitle })).toBeInTheDocument();
});
