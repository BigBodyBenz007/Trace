import { fireEvent, render, screen, within } from "@testing-library/react";
import ExerciseHistory from "./ExerciseHistory";

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

  fireEvent.click(screen.getByRole("button", { name: "Close History" }));
  expect(squatSummary).toHaveAttribute("aria-expanded", "false");
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
