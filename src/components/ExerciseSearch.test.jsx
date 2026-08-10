import { fireEvent, render, screen } from "@testing-library/react";
import ExerciseSearch from "./ExerciseSearch";
import { createExerciseDefinition } from "../services/exerciseCatalog";

function savedExercise() {
  return createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
}

test("searches, selects, and offers explicit editing", () => {
  const exercise = savedExercise();
  const onSelectExercise = jest.fn();
  const onEditExercise = jest.fn();
  render(<ExerciseSearch exercises={[exercise]} onSelectExercise={onSelectExercise} onEditExercise={onEditExercise} inputStyle={{}} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Saved exercise search"), { target: { value: "DIP" } });
  expect(screen.getByText("Default: Bodyweight")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Dips" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit saved exercise Dips" }));
  expect(onSelectExercise).toHaveBeenCalledWith(exercise);
  expect(onEditExercise).toHaveBeenCalledWith(exercise);
});

test("refreshes immediately when catalog props change and clears on reset", () => {
  const first = savedExercise();
  const updated = { ...first, name: "Weighted Dips" };
  const props = { onSelectExercise: jest.fn(), onEditExercise: jest.fn(), inputStyle: {} };
  const { rerender } = render(<ExerciseSearch exercises={[first]} {...props} resetKey={0} />);
  fireEvent.change(screen.getByLabelText("Saved exercise search"), { target: { value: "dips" } });
  rerender(<ExerciseSearch exercises={[updated]} {...props} resetKey={0} />);
  expect(screen.getByText("Weighted Dips")).toBeInTheDocument();
  rerender(<ExerciseSearch exercises={[updated]} {...props} resetKey={1} />);
  expect(screen.getByLabelText("Saved exercise search")).toHaveValue("");
});
