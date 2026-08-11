import { fireEvent, render, screen, within } from "@testing-library/react";
import ExerciseHistory from "./ExerciseHistory";
import { deriveExercisePrs } from "../services/exercisePr";
import { createWorkoutPrCandidate } from "../services/trophyCase";

let originalScrollIntoView;
let scrollTargets;

beforeAll(() => {
  originalScrollIntoView = Element.prototype.scrollIntoView;
});

beforeEach(() => {
  scrollTargets = [];
  Element.prototype.scrollIntoView = jest.fn(function recordScrollTarget() {
    scrollTargets.push(this);
  });
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

function workout(id, title, occurredAt, exercise) {
  return { id, title, occurredAt, exercises: [exercise] };
}

function builtInExercise(id, name, reps, occurredSetId) {
  return {
    id: `instance-${occurredSetId}`,
    name,
    exerciseId: id,
    sets: [
      {
        id: occurredSetId,
        reps,
        load: { mode: "external", amount: 80, unit: "lb" },
        notes: reps === 10 ? "Controlled" : "",
      },
    ],
  };
}

function expandPrTimeline() {
  fireEvent.click(screen.getByRole("button", { name: "View PR Timeline" }));
}

test("renders summaries and opens newest-first performance details", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("old", "Old Chest Day", "2026-08-03T12:00:00.000Z", builtInExercise("trace:bench", "Dumbbell Bench Press", 9, "old-set")),
        workout("new", "New Chest Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Dumbbell Bench Press", 10, "new-set")),
      ]}
      buttonStyle={{}}
    />
  );
  const summary = screen.getByRole("button", { name: /Dumbbell Bench Press/ });
  expect(summary).toHaveTextContent("2 performances");
  fireEvent.click(summary);

  expect(screen.getByText("Current Records")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "View PR Timeline" })).toBeInTheDocument();
  expect(screen.queryByText("PR Timeline")).not.toBeInTheDocument();

  const detailArticles = screen.getAllByRole("article");
  expect(within(detailArticles[0]).getByText("New Chest Day")).toBeInTheDocument();
  expect(within(detailArticles[0]).getByText("80 lb × 10 reps")).toBeInTheDocument();
  expect(within(detailArticles[0]).getByText("Controlled")).toBeInTheDocument();
  expect(within(detailArticles[1]).getByText("Old Chest Day")).toBeInTheDocument();
});

test("expands details directly below their summary and toggles one exercise at a time", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        {
          id: "workout",
          title: "Strength Day",
          occurredAt: "2026-08-10T12:00:00.000Z",
          exercises: [
            builtInExercise("trace:bench", "Dumbbell Bench Press", 10, "bench-set"),
            builtInExercise("trace:squat", "Barbell Back Squat", 8, "squat-set"),
          ],
        },
      ]}
      buttonStyle={{}}
    />
  );

  const benchSummary = screen.getByRole("button", { name: /Dumbbell Bench Press/ });
  const squatSummary = screen.getByRole("button", { name: /Barbell Back Squat/ });
  expect(benchSummary).toHaveAttribute("aria-expanded", "false");
  expect(squatSummary).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(benchSummary);
  const benchDetail = document.getElementById(
    benchSummary.getAttribute("aria-controls")
  );
  expect(benchSummary).toHaveAttribute("aria-expanded", "true");
  expect(benchSummary.nextElementSibling).toBe(benchDetail);
  expect(within(benchDetail).getByRole("heading", { name: "Dumbbell Bench Press" })).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(1);

  fireEvent.click(benchSummary);
  expect(benchSummary).toHaveAttribute("aria-expanded", "false");
  expect(document.getElementById(benchSummary.getAttribute("aria-controls"))).not.toBeInTheDocument();

  fireEvent.click(benchSummary);
  fireEvent.click(squatSummary);
  const squatDetail = document.getElementById(
    squatSummary.getAttribute("aria-controls")
  );
  expect(benchSummary).toHaveAttribute("aria-expanded", "false");
  expect(squatSummary).toHaveAttribute("aria-expanded", "true");
  expect(squatSummary.nextElementSibling).toBe(squatDetail);
  expect(within(squatDetail).getByRole("heading", { name: "Barbell Back Squat" })).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(1);

  expect(screen.getAllByRole("button", { name: "Close History" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Close History" })[0]);
  expect(squatSummary).toHaveAttribute("aria-expanded", "false");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "center",
  });
  expect(scrollTargets[scrollTargets.length - 1]).toBe(squatSummary);
  expect(screen.queryByRole("button", { name: "Close History" })).not.toBeInTheDocument();
});

test("renders bodyweight sets and repeated workout occurrences without loss", () => {
  const first = {
    id: "first",
    name: "Pull-Up",
    exerciseId: "trace:pullup",
    sets: [{ id: "s1", reps: 12, load: { mode: "bodyweight" }, notes: "" }],
  };
  const second = {
    ...first,
    id: "second",
    sets: [{ id: "s2", reps: 8, load: { mode: "bodyweight" }, notes: "Second block" }],
  };
  render(
    <ExerciseHistory
      workoutEntries={[{ id: "w", title: "Back Day", occurredAt: "2026-08-10T12:00:00.000Z", exercises: [first, second] }]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Pull-Up/ }));
  expect(screen.getByText("Bodyweight × 12 reps")).toBeInTheDocument();
  expect(screen.getByText("Bodyweight × 8 reps")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("renders separate lb and kg records with sources and limits reps-at-weight per unit", () => {
  const sets = [
    { id: "50", reps: 15, load: { mode: "external", amount: 50, unit: "lb" }, notes: "" },
    { id: "60", reps: 12, load: { mode: "external", amount: 60, unit: "lb" }, notes: "" },
    { id: "70", reps: 10, load: { mode: "external", amount: 70, unit: "lb" }, notes: "" },
    { id: "80", reps: 8, load: { mode: "external", amount: 80, unit: "lb" }, notes: "" },
    { id: "kg", reps: 5, load: { mode: "external", amount: 90, unit: "kg" }, notes: "" },
  ];
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("records", "Chest Day", "2026-08-10T12:00:00.000Z", {
          id: "bench",
          name: "Bench Press",
          exerciseId: "trace:bench",
          sets,
        }),
      ]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Bench Press/ }));
  const records = screen.getByRole("region", { name: "Bench Press current records" });

  expect(within(records).getByText("Current Records")).toBeInTheDocument();
  expect(within(records).getByText("80 lb × 8 reps")).toBeInTheDocument();
  expect(within(records).getByText("90 kg × 5 reps")).toBeInTheDocument();
  expect(within(records).getAllByText(/August 10, 2026 · Chest Day/)).toHaveLength(2);
  expect(within(records).getByText("80 lb — 8 reps")).toBeInTheDocument();
  expect(within(records).getByText("70 lb — 10 reps")).toBeInTheDocument();
  expect(within(records).getByText("60 lb — 12 reps")).toBeInTheDocument();
  expect(within(records).queryByText("50 lb — 15 reps")).not.toBeInTheDocument();
  expect(within(records).getByText("90 kg — 5 reps")).toBeInTheDocument();
});

test("renders a sourced bodyweight record and omits irrelevant external categories", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("bodyweight", "Back Day", "2026-08-08T12:00:00.000Z", {
          id: "pull-up",
          name: "Pull-Up",
          exerciseId: "trace:pull-up",
          sets: [{ id: "set", reps: 12, load: { mode: "bodyweight" }, notes: "" }],
        }),
      ]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Pull-Up/ }));
  const records = screen.getByRole("region", { name: "Pull-Up current records" });
  expect(within(records).getByText("Bodyweight Rep Record")).toBeInTheDocument();
  expect(within(records).getByText("12 reps")).toBeInTheDocument();
  expect(within(records).getByText(/August 8, 2026 · Back Day/)).toBeInTheDocument();
  expect(within(records).queryByText("Heaviest Weight")).not.toBeInTheDocument();
  expect(within(records).queryByText("Best Reps at Weight")).not.toBeInTheDocument();
});

test("does not render Current Records for invalid PR data", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("invalid", "Legacy Day", "2026-08-08T12:00:00.000Z", {
          id: "legacy",
          name: "Legacy Lift",
          sets: [{ id: "set", reps: 0, load: { mode: "external", amount: -10, unit: "lb" }, notes: "" }],
        }),
      ]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Legacy Lift/ }));
  expect(screen.queryByText("Current Records")).not.toBeInTheDocument();
});

test("matches records by stable identity rather than similar display names", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        {
          id: "identities",
          title: "Leg Day",
          occurredAt: "2026-08-10T12:00:00.000Z",
          exercises: [
            {
              id: "trace",
              name: "Barbell Back Squat",
              exerciseId: "trace:squat",
              sets: [{ id: "trace-set", reps: 5, load: { mode: "external", amount: 200, unit: "lb" }, notes: "" }],
            },
            {
              id: "saved",
              name: "Barbell Back Squat one leg",
              exerciseReference: { source: "user-saved", sourceId: "saved:one-leg", modified: false },
              sets: [{ id: "saved-set", reps: 8, load: { mode: "external", amount: 50, unit: "lb" }, notes: "" }],
            },
          ],
        },
      ]}
      buttonStyle={{}}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /^Barbell Back Squat 1 performance/ }));
  expect(screen.getByRole("region", { name: "Barbell Back Squat current records" })).toHaveTextContent("200 lb × 5 reps");
  fireEvent.click(screen.getByRole("button", { name: /Barbell Back Squat one leg/ }));
  const savedRecords = screen.getByRole("region", { name: "Barbell Back Squat one leg current records" });
  expect(savedRecords).toHaveTextContent("50 lb × 8 reps");
  expect(savedRecords).not.toHaveTextContent("200 lb × 5 reps");
});

test("updates from edited props and removes deleted workout history", () => {
  const original = workout("w", "Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Bench", 8, "set"));
  const { rerender } = render(<ExerciseHistory workoutEntries={[original]} buttonStyle={{}} />);
  fireEvent.click(screen.getByRole("button", { name: /Bench/ }));
  expect(screen.getAllByText("80 lb × 8 reps")).toHaveLength(2);

  const edited = {
    ...original,
    exercises: [{ ...original.exercises[0], sets: [{ ...original.exercises[0].sets[0], reps: 12 }] }],
  };
  rerender(<ExerciseHistory workoutEntries={[edited]} buttonStyle={{}} />);
  expect(screen.getAllByText("80 lb × 12 reps")).toHaveLength(2);

  rerender(<ExerciseHistory workoutEntries={[]} buttonStyle={{}} />);
  expect(screen.getByText("No exercise history yet.")).toBeInTheDocument();
});

test("workout edits and deletions immediately recalculate displayed records", () => {
  const previous = workout("old", "Old Day", "2026-08-01T12:00:00.000Z", {
    ...builtInExercise("trace:bench", "Bench", 8, "old-set"),
    sets: [{ id: "old-set", reps: 8, load: { mode: "external", amount: 70, unit: "lb" }, notes: "" }],
  });
  const latest = workout("new", "New Day", "2026-08-10T12:00:00.000Z", {
    ...builtInExercise("trace:bench", "Bench", 6, "new-set"),
    sets: [{ id: "new-set", reps: 6, load: { mode: "external", amount: 80, unit: "lb" }, notes: "" }],
  });
  const { rerender } = render(
    <ExerciseHistory workoutEntries={[previous, latest]} buttonStyle={{}} />
  );
  fireEvent.click(screen.getByRole("button", { name: /Bench/ }));
  let records = screen.getByRole("region", { name: "Bench current records" });
  expect(records).toHaveTextContent("80 lb × 6 reps");

  const editedLatest = {
    ...latest,
    exercises: [{
      ...latest.exercises[0],
      sets: [{ ...latest.exercises[0].sets[0], load: { mode: "external", amount: 60, unit: "lb" } }],
    }],
  };
  rerender(
    <ExerciseHistory workoutEntries={[previous, editedLatest]} buttonStyle={{}} />
  );
  records = screen.getByRole("region", { name: "Bench current records" });
  expect(records).toHaveTextContent("70 lb × 8 reps");
  expect(records).not.toHaveTextContent("80 lb × 6 reps");

  rerender(<ExerciseHistory workoutEntries={[editedLatest]} buttonStyle={{}} />);
  records = screen.getByRole("region", { name: "Bench current records" });
  expect(records).toHaveTextContent("60 lb × 6 reps");
  expect(records).not.toHaveTextContent("70 lb × 8 reps");
});

test("renders legacy records without assigning them to built-in history", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("legacy", "Legacy Day", "2026-08-10T12:00:00.000Z", {
          id: "legacy-exercise",
          name: "Incline Press",
          sets: [{ id: "legacy-set", reps: 10, load: { mode: "external", amount: 50, unit: "kg" }, notes: "" }],
        }),
      ]}
      buttonStyle={{}}
    />
  );
  expect(screen.getByRole("button", { name: /Incline Press/ })).toBeInTheDocument();
});

test("expands and dismisses the PR Timeline without disrupting inside actions", () => {
  const addTrophyCaseEntry = jest.fn();
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("records", "Volume Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Bench Press", 10, "set")),
      ]}
      addTrophyCaseEntry={addTrophyCaseEntry}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Bench Press/ }));
  const performance = screen.getByRole("article");
  expect(performance).toHaveTextContent("Volume Day");
  expect(screen.queryByRole("region", { name: "Bench Press PR timeline" })).not.toBeInTheDocument();

  expandPrTimeline();
  let timeline = screen.getByRole("region", { name: "Bench Press PR timeline" });
  expect(timeline).toHaveTextContent("Current Heaviest Weight Record");
  expect(timeline).toHaveTextContent("Current Reps-at-Weight Record");
  fireEvent.mouseDown(timeline);
  expect(screen.getByRole("region", { name: "Bench Press PR timeline" })).toBeInTheDocument();

  const repsEvent = within(timeline).getByText(/Reps at Weight/).closest("li");
  const add = within(repsEvent).getByRole("button", { name: "Add to Trophy Case" });
  fireEvent.mouseDown(add);
  fireEvent.click(add);
  expect(addTrophyCaseEntry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("region", { name: "Bench Press PR timeline" })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Hide PR Timeline" })[0]);
  expect(screen.queryByRole("region", { name: "Bench Press PR timeline" })).not.toBeInTheDocument();

  expandPrTimeline();
  fireEvent.mouseDown(performance);
  expect(screen.queryByRole("region", { name: "Bench Press PR timeline" })).not.toBeInTheDocument();
  expect(performance).toHaveTextContent("Volume Day");

  expandPrTimeline();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "Bench Press PR timeline" })).not.toBeInTheDocument();
});

test("dismisses Exercise History from both controls, outside clicks, and layered Escape", () => {
  const addTrophyCaseEntry = jest.fn();
  const edit = jest.fn();
  const remove = jest.fn();
  const workouts = [
    workout("records", "Volume Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Bench Press", 10, "set")),
  ];
  const snapshot = JSON.parse(JSON.stringify(workouts));
  render(
    <>
      <ExerciseHistory
        workoutEntries={workouts}
        addTrophyCaseEntry={addTrophyCaseEntry}
        buttonStyle={{}}
      />
      <button type="button" onClick={edit}>Edit</button>
      <button type="button" onClick={remove}>Delete</button>
    </>
  );
  const summary = screen.getByRole("button", { name: /Bench Press/ });

  fireEvent.click(summary);
  const detail = document.getElementById(summary.getAttribute("aria-controls"));
  expect(screen.getAllByRole("button", { name: "Close History" })).toHaveLength(2);
  fireEvent.mouseDown(detail);
  fireEvent.click(within(detail).getByText("Current Records"));
  expect(summary).toHaveAttribute("aria-expanded", "true");

  const currentAdd = within(screen.getByRole("region", { name: "Bench Press current records" }))
    .getAllByRole("button", { name: "Add to Trophy Case" })[0];
  fireEvent.mouseDown(currentAdd);
  fireEvent.click(currentAdd);
  expect(addTrophyCaseEntry).toHaveBeenCalledTimes(1);
  expect(summary).toHaveAttribute("aria-expanded", "true");

  expandPrTimeline();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(summary).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByRole("region", { name: "Bench Press PR timeline" })).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(summary).toHaveAttribute("aria-expanded", "false");
  expect(summary.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "center" });

  fireEvent.click(summary);
  expect(screen.getByRole("button", { name: "View PR Timeline" })).toBeInTheDocument();
  summary.scrollIntoView.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Close History" })[1]);
  expect(summary).toHaveAttribute("aria-expanded", "false");
  expect(summary.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

  fireEvent.click(summary);
  summary.scrollIntoView.mockClear();
  fireEvent.mouseDown(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(edit).toHaveBeenCalledTimes(1);
  expect(summary).toHaveAttribute("aria-expanded", "false");
  expect(summary.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

  fireEvent.click(summary);
  summary.scrollIntoView.mockClear();
  fireEvent.mouseDown(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(summary).toHaveAttribute("aria-expanded", "false");
  expect(summary.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  expect(workouts).toEqual(snapshot);
});

test("displays PR progression newest-first with current, former, and matched track status", () => {
  const makeExercise = (instanceId, setId, weight, reps) => ({
    id: instanceId,
    name: "Bench Press",
    exerciseId: "trace:bench",
    sets: [{ id: setId, reps, load: { mode: "external", amount: weight, unit: "lb" }, notes: "" }],
  });
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("latest", "Match Day", "2026-08-03T12:00:00.000Z", makeExercise("three", "three-set", 80, 8)),
        workout("first", "First Day", "2026-08-01T12:00:00.000Z", makeExercise("one", "one-set", 70, 10)),
        workout("middle", "Heavy Day", "2026-08-02T12:00:00.000Z", makeExercise("two", "two-set", 80, 8)),
      ]}
      buttonStyle={{}}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Bench Press/ }));
  expandPrTimeline();
  const timeline = screen.getByRole("region", { name: "Bench Press PR timeline" });
  const events = within(timeline).getAllByRole("listitem");
  expect(events.map((event) => event.textContent)).toEqual([
    expect.stringContaining("Match Day"),
    expect.stringContaining("Match Day"),
    expect.stringContaining("Heavy Day"),
    expect.stringContaining("Heavy Day"),
    expect.stringContaining("First Day"),
    expect.stringContaining("First Day"),
  ]);
  expect(events.filter((event) => event.dataset.achievement === "new")).toHaveLength(4);
  expect(events.filter((event) => event.dataset.achievement === "matched")).toHaveLength(2);
  expect(within(timeline).getAllByText(/^Matched .* Record$/)).toHaveLength(2);
  expect(events.filter((event) => event.dataset.recordStatus === "current")).toHaveLength(3);
  expect(events.filter((event) => event.dataset.recordStatus === "former")).toHaveLength(1);
  expect(within(timeline).getByText("Current Heaviest Weight Record")).toBeInTheDocument();
  expect(within(timeline).getByText("Former Heaviest Weight Record")).toBeInTheDocument();
  expect(within(timeline).getAllByText("Current Reps-at-Weight Record")).toHaveLength(2);
  expect(timeline).toHaveTextContent("Heaviest Weight · 80 lb × 8 reps");
  expect(timeline).toHaveTextContent("Reps at Weight · 80 lb × 8 reps");
});

test("renders bodyweight progression with its record descriptor", () => {
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("pull", "Back Day", "2026-08-08T12:00:00.000Z", {
          id: "pull-up",
          name: "Pull-Up",
          exerciseId: "trace:pull-up",
          sets: [{ id: "set", reps: 12, load: { mode: "bodyweight" }, notes: "" }],
        }),
      ]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Pull-Up/ }));
  expandPrTimeline();
  expect(screen.getByRole("region", { name: "Pull-Up PR timeline" })).toHaveTextContent(
    "Current Bodyweight Reps RecordBodyweight Reps · 12 reps"
  );
});

test("keeps lb, kg, and bodyweight current/former status independent", () => {
  const mixedExercise = (id, sets) => ({
    id,
    name: "Mixed Press",
    exerciseId: "trace:mixed-press",
    sets,
  });
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("old", "Old Mixed Day", "2026-08-01T12:00:00.000Z", mixedExercise("old-exercise", [
          { id: "old-lb", reps: 8, load: { mode: "external", amount: 100, unit: "lb" }, notes: "" },
          { id: "old-kg", reps: 6, load: { mode: "external", amount: 60, unit: "kg" }, notes: "" },
          { id: "old-body", reps: 8, load: { mode: "bodyweight" }, notes: "" },
        ])),
        workout("new", "New Mixed Day", "2026-08-10T12:00:00.000Z", mixedExercise("new-exercise", [
          { id: "new-lb", reps: 5, load: { mode: "external", amount: 120, unit: "lb" }, notes: "" },
          { id: "new-kg", reps: 10, load: { mode: "external", amount: 50, unit: "kg" }, notes: "" },
          { id: "new-body", reps: 12, load: { mode: "bodyweight" }, notes: "" },
        ])),
      ]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Mixed Press/ }));
  expandPrTimeline();
  const timeline = screen.getByRole("region", { name: "Mixed Press PR timeline" });
  const eventFor = (text) => within(timeline).getByText(text).closest("li");

  expect(eventFor("Heaviest Weight · 120 lb × 5 reps")).toHaveAttribute("data-record-status", "current");
  expect(eventFor("Heaviest Weight · 100 lb × 8 reps")).toHaveAttribute("data-record-status", "former");
  expect(eventFor("Heaviest Weight · 60 kg × 6 reps")).toHaveAttribute("data-record-status", "current");
  expect(eventFor("Bodyweight Reps · 12 reps")).toHaveAttribute("data-record-status", "current");
  expect(eventFor("Bodyweight Reps · 8 reps")).toHaveAttribute("data-record-status", "former");
  expect(eventFor("Reps at Weight · 50 kg × 10 reps")).toHaveAttribute("data-record-status", "current");
  expect(eventFor("Reps at Weight · 60 kg × 6 reps")).toHaveAttribute("data-record-status", "current");
});

test("keeps a former milestone manually curated in the Trophy Case", () => {
  const oldWorkout = workout("old", "Old Day", "2026-08-01T12:00:00.000Z", {
    id: "old-exercise",
    name: "Bench Press",
    exerciseId: "trace:bench",
    sets: [{ id: "old-set", reps: 8, load: { mode: "external", amount: 100, unit: "lb" }, notes: "" }],
  });
  const newWorkout = workout("new", "New Day", "2026-08-10T12:00:00.000Z", {
    id: "new-exercise",
    name: "Bench Press",
    exerciseId: "trace:bench",
    sets: [{ id: "new-set", reps: 5, load: { mode: "external", amount: 120, unit: "lb" }, notes: "" }],
  });
  const oldPr = deriveExercisePrs([oldWorkout])[0];
  const oldCandidate = createWorkoutPrCandidate(oldPr, oldPr.progression.heaviestWeight[0]);

  render(
    <ExerciseHistory
      workoutEntries={[oldWorkout, newWorkout]}
      trophyEntries={[{ id: "trophy", sourceKey: oldCandidate.sourceKey }]}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Bench Press/ }));
  expandPrTimeline();
  const timeline = screen.getByRole("region", { name: "Bench Press PR timeline" });
  const formerEvent = within(timeline).getByText("Former Heaviest Weight Record").closest("li");
  expect(within(formerEvent).getByRole("button", { name: "In Trophy Case" })).toBeDisabled();
});

test("keeps same-named exercise timelines separated by stable identity", () => {
  render(
    <ExerciseHistory
      workoutEntries={[{
        id: "identities",
        title: "Press Day",
        occurredAt: "2026-08-10T12:00:00.000Z",
        exercises: [
          {
            id: "trace-instance",
            name: "Bench Press",
            exerciseId: "trace:bench",
            sets: [{ id: "trace-set", reps: 5, load: { mode: "external", amount: 200, unit: "lb" }, notes: "" }],
          },
          {
            id: "saved-instance",
            name: "Bench Press",
            exerciseReference: { source: "user-saved", sourceId: "saved:bench", modified: false },
            sets: [{ id: "saved-set", reps: 10, load: { mode: "external", amount: 50, unit: "lb" }, notes: "" }],
          },
        ],
      }]}
      buttonStyle={{}}
    />
  );

  const summaries = screen.getAllByRole("button", { name: /Bench Press 1 performance/ });
  fireEvent.click(summaries[0]);
  expandPrTimeline();
  const firstTimelineText = screen.getByRole("region", { name: "Bench Press PR timeline" }).textContent;
  fireEvent.click(summaries[1]);
  expandPrTimeline();
  const savedTimeline = screen.getByRole("region", { name: "Bench Press PR timeline" });
  const secondTimelineText = savedTimeline.textContent;
  expect([firstTimelineText, secondTimelineText]).toEqual(
    expect.arrayContaining([
      expect.stringContaining("200 lb × 5 reps"),
      expect.stringContaining("50 lb × 10 reps"),
    ])
  );
  expect(firstTimelineText.includes("200 lb × 5 reps")).not.toBe(
    firstTimelineText.includes("50 lb × 10 reps")
  );
  expect(secondTimelineText.includes("200 lb × 5 reps")).not.toBe(
    secondTimelineText.includes("50 lb × 10 reps")
  );
});

test("manually curates a reps-at-weight timeline achievement", () => {
  const addTrophyCaseEntry = jest.fn();
  render(
    <ExerciseHistory
      workoutEntries={[
        workout("records", "Volume Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Bench Press", 10, "set")),
      ]}
      addTrophyCaseEntry={addTrophyCaseEntry}
      buttonStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Bench Press/ }));
  expandPrTimeline();
  const timeline = screen.getByRole("region", { name: "Bench Press PR timeline" });
  const repsEvent = within(timeline)
    .getByText("Reps at Weight · 80 lb × 10 reps")
    .closest("li");
  fireEvent.click(within(repsEvent).getByRole("button", { name: "Add to Trophy Case" }));

  expect(addTrophyCaseEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      sourceRecordType: "reps-at-weight",
      description: "Reps at Weight · 80 lb × 10 reps",
      sourceSnapshot: expect.objectContaining({
        exerciseIdentityKey: "trace|trace:bench",
        workoutId: "records",
        setId: "set",
      }),
    })
  );
});
