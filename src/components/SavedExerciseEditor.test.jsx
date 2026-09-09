import { fireEvent, render, screen } from "@testing-library/react";
import SavedExerciseEditor from "./SavedExerciseEditor";
import { createExerciseDefinition } from "../services/exerciseCatalog";

beforeEach(() => {
  localStorage.clear();
});

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
  expect(JSON.parse(localStorage.getItem("formDrafts")).entries).toHaveLength(0);
});

test("shows collisions or persistence failures and remains open", () => {
  const onCancel = jest.fn();
  render(<SavedExerciseEditor exercise={exercise()} onSave={jest.fn(() => ({ status: "invalid", message: "Another saved exercise already uses that name." }))} onCancel={onCancel} inputStyle={{}} buttonStyle={{}} />);
  fireEvent.change(screen.getByLabelText("Saved exercise name"), { target: { value: "Retry exercise" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Exercise" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Another saved exercise already uses that name.");
  expect(onCancel).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem("formDrafts")).entries[0]).toMatchObject({
    domain: "saved-exercise",
    value: { name: "Retry exercise" },
  });
});

test("restores an exact record-specific draft and discards it only after confirmation", () => {
  const saved = exercise();
  const first = render(<SavedExerciseEditor exercise={saved} onSave={jest.fn()} onCancel={jest.fn()} inputStyle={{}} buttonStyle={{}} />);
  fireEvent.change(screen.getByLabelText("Saved exercise name"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Saved default load mode"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Saved default weight unit"), { target: { value: "kg" } });
  first.unmount();

  const onCancel = jest.fn();
  const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<SavedExerciseEditor exercise={saved} onSave={jest.fn()} onCancel={onCancel} inputStyle={{}} buttonStyle={{}} />);
  expect(screen.getByLabelText("Saved exercise name")).toHaveValue("");
  expect(screen.getByLabelText("Saved default load mode")).toHaveValue("external");
  expect(screen.getByLabelText("Saved default weight unit")).toHaveValue("kg");
  fireEvent.click(screen.getByRole("button", { name: "Cancel Saved Exercise Edit" }));
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel Saved Exercise Edit" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem("formDrafts")).entries).toHaveLength(0);
  confirm.mockRestore();
});

test("saved-exercise edit drafts stay isolated and do not overwrite a newer saved baseline", () => {
  const firstExercise = exercise();
  const first = render(<SavedExerciseEditor exercise={firstExercise} onSave={jest.fn()} onCancel={jest.fn()} inputStyle={{}} buttonStyle={{}} />);
  fireEvent.change(screen.getByLabelText("Saved exercise name"), { target: { value: "Draft for first" } });
  first.unmount();

  const secondExercise = createExerciseDefinition({ name: "Rows", defaultLoadMode: "external", defaultWeightUnit: "kg" });
  const second = render(<SavedExerciseEditor exercise={secondExercise} onSave={jest.fn()} onCancel={jest.fn()} inputStyle={{}} buttonStyle={{}} />);
  expect(screen.getByLabelText("Saved exercise name")).toHaveValue("Rows");
  second.unmount();

  render(<SavedExerciseEditor exercise={{ ...firstExercise, name: "Newer saved exercise", updatedAt: "2026-09-10T00:00:00.000Z" }} onSave={jest.fn()} onCancel={jest.fn()} inputStyle={{}} buttonStyle={{}} />);
  expect(screen.getByLabelText("Saved exercise name")).toHaveValue("Newer saved exercise");
  expect(screen.getByRole("alert")).toHaveTextContent("changed after an unfinished edit");
});
