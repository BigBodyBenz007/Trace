import { fireEvent, render, screen } from "@testing-library/react";
import SavedExerciseEditor from "./SavedExerciseEditor";
import { createExerciseDefinition } from "../services/exerciseCatalog";

function exercise() {
  return createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
}

test("edits name and user-defined defaults without weight or reps", () => {
  const onSave = jest.fn(() => ({ status: "updated" }));
  render(<SavedExerciseEditor exercise={exercise()} onSave={onSave} onCancel={jest.fn()} inputStyle={{}} buttonStyle={{}} />);
  fireEvent.change(screen.getByLabelText("Saved exercise name"), { target: { value: "Bench Dips" } });
  fireEvent.change(screen.getByLabelText("Saved default load mode"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Saved default weight unit"), { target: { value: "kg" } });
  expect(screen.queryByLabelText(/default weight$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/default reps/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Exercise" }));
  expect(onSave).toHaveBeenCalledWith(expect.any(String), { name: "Bench Dips", defaultLoadMode: "external", defaultWeightUnit: "kg" });
});

test("shows collisions or persistence failures and remains open", () => {
  const onCancel = jest.fn();
  render(<SavedExerciseEditor exercise={exercise()} onSave={jest.fn(() => ({ status: "invalid", message: "Another saved exercise already uses that name." }))} onCancel={onCancel} inputStyle={{}} buttonStyle={{}} />);
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Exercise" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Another saved exercise already uses that name.");
  expect(onCancel).not.toHaveBeenCalled();
});
