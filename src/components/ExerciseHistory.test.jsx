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

test("updates from edited props and removes deleted workout history", () => {
  const original = workout("w", "Day", "2026-08-10T12:00:00.000Z", builtInExercise("trace:bench", "Bench", 8, "set"));
  const { rerender } = render(<ExerciseHistory workoutEntries={[original]} buttonStyle={{}} />);
  fireEvent.click(screen.getByRole("button", { name: /Bench/ }));
  expect(screen.getByText("80 lb × 8 reps")).toBeInTheDocument();

  const edited = {
    ...original,
    exercises: [{ ...original.exercises[0], sets: [{ ...original.exercises[0].sets[0], reps: 12 }] }],
  };
  rerender(<ExerciseHistory workoutEntries={[edited]} buttonStyle={{}} />);
  expect(screen.getByText("80 lb × 12 reps")).toBeInTheDocument();

  rerender(<ExerciseHistory workoutEntries={[]} buttonStyle={{}} />);
  expect(screen.getByText("No exercise history yet.")).toBeInTheDocument();
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
