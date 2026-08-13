import { fireEvent, render, screen, within } from "@testing-library/react";
import ExerciseSearch from "./ExerciseSearch";
import { createExerciseDefinition } from "../services/exerciseCatalog";

function savedExercise() {
  return createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
}

test("focuses its search input when requested without changing the query", () => {
  const props = {
    exercises: [],
    onSelectExercise: jest.fn(),
    onSelectBuiltInExercise: jest.fn(),
    onEditExercise: jest.fn(),
    inputStyle: {},
    resetKey: 0,
  };
  const { rerender } = render(<ExerciseSearch {...props} />);
  const input = screen.getByLabelText("Exercise search");
  fireEvent.change(input, { target: { value: "squat" } });
  rerender(<ExerciseSearch {...props} autoFocus />);
  expect(input).toHaveFocus();
  expect(input).toHaveValue("squat");
});

test("searches, selects, and offers explicit editing", () => {
  const exercise = savedExercise();
  const onSelectExercise = jest.fn();
  const onSelectBuiltInExercise = jest.fn();
  const onEditExercise = jest.fn();
  render(<ExerciseSearch exercises={[exercise]} onSelectExercise={onSelectExercise} onSelectBuiltInExercise={onSelectBuiltInExercise} onEditExercise={onEditExercise} inputStyle={{}} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "DIP" } });
  expect(screen.getByText("Saved Exercise")).toBeInTheDocument();
  expect(screen.getByText("Default: Bodyweight")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Dips" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit saved exercise Dips" }));
  expect(onSelectExercise).toHaveBeenCalledWith(exercise);
  expect(onEditExercise).toHaveBeenCalledWith(exercise);
});

test("refreshes immediately when catalog props change and clears on reset", () => {
  const first = savedExercise();
  const updated = { ...first, name: "Weighted Dips" };
  const props = { onSelectExercise: jest.fn(), onSelectBuiltInExercise: jest.fn(), onEditExercise: jest.fn(), inputStyle: {} };
  const { rerender } = render(<ExerciseSearch exercises={[first]} {...props} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "dips" } });
  rerender(<ExerciseSearch exercises={[updated]} {...props} resetKey={0} />);
  expect(screen.getByText("Weighted Dips")).toBeInTheDocument();
  rerender(<ExerciseSearch exercises={[updated]} {...props} resetKey={1} />);
  expect(screen.getByLabelText("Exercise search")).toHaveValue("");
});

test("shows and selects Trace exercises found through a safe alias", () => {
  const onSelectBuiltInExercise = jest.fn();
  render(<ExerciseSearch exercises={[]} onSelectExercise={jest.fn()} onSelectBuiltInExercise={onSelectBuiltInExercise} onEditExercise={jest.fn()} inputStyle={{}} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "db bench" },
  });
  expect(screen.getAllByText("Trace Exercise").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Chest · Dumbbell").length).toBeGreaterThan(0);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Select Trace exercise Dumbbell Bench Press",
    })
  );
  expect(onSelectBuiltInExercise).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "trace:chest-db-bench-002",
      name: "Dumbbell Bench Press",
    })
  );
});

test("keeps identical Trace and saved names visibly distinct", () => {
  const saved = createExerciseDefinition({
    name: "Dumbbell Bench Press",
    defaultLoadMode: "external",
    defaultWeightUnit: "lb",
  });
  render(<ExerciseSearch exercises={[saved]} onSelectExercise={jest.fn()} onSelectBuiltInExercise={jest.fn()} onEditExercise={jest.fn()} inputStyle={{}} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "Dumbbell Bench Press" },
  });
  expect(screen.getAllByText("Trace Exercise").length).toBeGreaterThan(0);
  expect(screen.getByText("Saved Exercise")).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "Select Trace exercise Dumbbell Bench Press",
    })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "Select saved exercise Dumbbell Bench Press",
    })
  ).toBeInTheDocument();
});

test("renders every matching Saved Exercise above remaining Trace results", () => {
  const saved = [
    createExerciseDefinition({ name: "squat", defaultLoadMode: "external", defaultWeightUnit: "lb" }),
    createExerciseDefinition({ name: "Barbell Back Squat one leg", defaultLoadMode: "external", defaultWeightUnit: "lb" }),
    createExerciseDefinition({ name: "Barbell Back Squat one legged", defaultLoadMode: "external", defaultWeightUnit: "lb" }),
  ];
  render(<ExerciseSearch exercises={saved} onSelectExercise={jest.fn()} onSelectBuiltInExercise={jest.fn()} onEditExercise={jest.fn()} inputStyle={{}} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "squ" },
  });
  const resultList = screen.getByLabelText("Exercise search results");
  expect(
    within(resultList)
      .getAllByRole("button", { name: /^Select / })
      .map((button) => button.getAttribute("aria-label"))
  ).toEqual([
    "Select saved exercise squat",
    "Select saved exercise Barbell Back Squat one leg",
    "Select saved exercise Barbell Back Squat one legged",
    "Select Trace exercise Barbell Back Squat",
    "Select Trace exercise Barbell Front Squat",
    "Select Trace exercise Bodyweight Squat",
  ]);
});
