import { fireEvent, render, screen, within } from "@testing-library/react";
import WorkoutPage from "./WorkoutPage";
import { createExerciseDefinition } from "../services/exerciseCatalog";

const originalRequestAnimationFrame = window.requestAnimationFrame;

beforeEach(() => {
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  jest.restoreAllMocks();
});

function entry(overrides = {}) {
  return {
    id: "workout-1",
    schemaVersion: 1,
    type: "strength",
    title: "Chest Day",
    occurredAt: new Date(2026, 7, 9, 18, 30).toISOString(),
    notes: "Workout note",
    exercises: [
      {
        id: "exercise-1",
        name: "Incline Press",
        sets: [
          {
            id: "set-1",
            reps: 10,
            load: { mode: "external", amount: 70.5, unit: "lb" },
            notes: "Controlled",
          },
        ],
      },
    ],
    createdAt: "2026-08-09T20:00:00.000Z",
    updatedAt: "2026-08-09T20:00:00.000Z",
    ...overrides,
  };
}

function renderPageProps(overrides = {}) {
  return {
    onBack: jest.fn(),
    workoutEntries: [],
    saveWorkoutEntry: jest.fn(() => true),
    saveExerciseDefinitions: jest.fn(() => []),
    updateSavedExercise: jest.fn(() => ({ status: "updated" })),
    updateWorkoutEntry: jest.fn(() => true),
    deleteWorkoutEntry: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };
}

function renderPage(overrides = {}) {
  const props = renderPageProps(overrides);
  render(<WorkoutPage {...props} />);
  return props;
}

function fillFirstSet({ bodyweight = false } = {}) {
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Chest Day" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: bodyweight ? "Dips" : "Incline Press" },
  });
  if (bodyweight) {
    fireEvent.change(screen.getByLabelText("Exercise 1 set 1 load mode"), {
      target: { value: "bodyweight" },
    });
  } else {
    fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), {
      target: { value: "70.5" },
    });
  }
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "10" },
  });
}

test("starts with one empty exercise containing one external-load set", () => {
  renderPage();

  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("");
  expect(screen.getByLabelText("Exercise 1 set 1 load mode")).toHaveValue(
    "external"
  );
  expect(screen.getByLabelText("Exercise 1 set 1 weight unit")).toHaveValue(
    "lb"
  );
});

test("saves decimal external load and optional notes then resets", () => {
  const props = renderPage();
  fillFirstSet();
  fireEvent.change(screen.getByLabelText("Workout notes (optional)"), {
    target: { value: "  Workout note  " },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 notes"), {
    target: { value: "  Controlled  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(props.saveWorkoutEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "strength",
      title: "Chest Day",
      notes: "Workout note",
      exercises: [
        expect.objectContaining({
          name: "Incline Press",
          sets: [
            expect.objectContaining({
              reps: 10,
              load: { mode: "external", amount: 70.5, unit: "lb" },
              notes: "Controlled",
            }),
          ],
        }),
      ],
    })
  );
  expect(screen.getByLabelText("Workout title")).toHaveValue("");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
  });
});

test("saves bodyweight without hidden external load data", () => {
  const props = renderPage();
  fillFirstSet({ bodyweight: true });
  expect(
    screen.queryByLabelText("Exercise 1 set 1 weight")
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(
    props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0].load
  ).toEqual({ mode: "bodyweight" });
});

test("adds, removes, and reorders exercises and sets without drag and drop", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "First Exercise" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.change(screen.getByLabelText("Exercise 2 name"), {
    target: { value: "Second Exercise" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Move exercise 2 up" })
  );
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue(
    "Second Exercise"
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Add set to exercise 1" })
  );
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 2 reps"), {
    target: { value: "8" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Move exercise 1 set 2 up" })
  );
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(8);

  fireEvent.click(
    screen.getByRole("button", { name: "Remove exercise 1 set 2" })
  );
  expect(
    screen.queryByLabelText("Exercise 1 set 2 reps")
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Remove exercise 2" })
  );
  expect(screen.queryByLabelText("Exercise 2 name")).not.toBeInTheDocument();
});

test("shows mechanical validation errors", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a workout title.");

  fillFirstSet();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "1.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "positive whole-number reps"
  );
});

test("restores and updates a complete historical snapshot", () => {
  const saved = entry();
  const props = renderPage({ workoutEntries: [saved] });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByRole("heading", { name: "Edit Workout" })).toBeInTheDocument();
  expect(screen.getByLabelText("Workout title")).toHaveValue("Chest Day");
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Incline Press");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(70.5);
  expect(screen.getByLabelText("Exercise 1 set 1 notes")).toHaveValue("Controlled");

  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(
    saved.id,
    expect.objectContaining({
      createdAt: saved.createdAt,
      exercises: [
        expect.objectContaining({
          id: "exercise-1",
          sets: [expect.objectContaining({ id: "set-1", reps: 12 })],
        }),
      ],
    })
  );
});

test("retains a valid draft when persistence fails", () => {
  renderPage({ saveWorkoutEntry: jest.fn(() => false) });
  fillFirstSet();
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(screen.getByLabelText("Workout title")).toHaveValue("Chest Day");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(70.5);
});

test("sorts history newest first and confirms deletion", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const props = renderPage({
    workoutEntries: [
      entry({ id: "old", title: "Old Workout", occurredAt: "2025-01-01T12:00:00.000Z" }),
      entry({ id: "new", title: "New Workout", occurredAt: "2026-01-01T12:00:00.000Z" }),
    ],
  });
  const articles = screen.getAllByRole("article");
  expect(within(articles[0]).getByText("New Workout")).toBeInTheDocument();
  fireEvent.click(within(articles[0]).getByRole("button", { name: "Delete" }));

  expect(confirm).toHaveBeenCalledWith("Delete this workout?");
  expect(props.deleteWorkoutEntry).toHaveBeenCalledWith("new");
});

test("cancel confirms dirty changes, resets, and scrolls to the workout top", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  renderPage();
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Unsaved" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(confirm).toHaveBeenCalledWith(
    "Discard this workout? Your unsaved changes will be lost."
  );
  expect(screen.getByLabelText("Workout title")).toHaveValue("");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
});

test("provides top and bottom Timeline navigation controls", () => {
  const props = renderPage();
  const buttons = screen.getAllByRole("button", { name: "Back to Timeline" });
  expect(buttons).toHaveLength(2);
  fireEvent.click(buttons[0]);
  fireEvent.click(buttons[1]);
  expect(props.onBack).toHaveBeenCalledTimes(2);
});

test("integrates a browsable Exercise History summary", () => {
  renderPage({ workoutEntries: [entry()] });
  expect(
    screen.getByRole("heading", { name: "Exercise History" })
  ).toBeInTheDocument();
  const summary = screen.getByRole("button", {
    name: /Incline Press.*1 performance/,
  });
  fireEvent.click(summary);
  expect(screen.getByText("70.5 lb × 10 reps")).toBeInTheDocument();
  expect(screen.getByText("Controlled")).toBeInTheDocument();
});

test("selects a saved exercise and applies defaults only to untouched and new sets", () => {
  const dips = createExerciseDefinition({
    name: "Dips",
    defaultLoadMode: "bodyweight",
    defaultWeightUnit: "lb",
  });
  const props = renderPage({ savedExercises: [dips] });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Find an exercise for exercise 1",
    })
  );
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "dips" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select saved exercise Dips" })
  );

  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Dips");
  expect(screen.getByLabelText("Exercise 1 set 1 load mode")).toHaveValue(
    "bodyweight"
  );
  expect(
    screen.queryByLabelText("Save as reusable exercise")
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Add set to exercise 1" })
  );
  expect(screen.getByLabelText("Exercise 1 set 2 load mode")).toHaveValue(
    "bodyweight"
  );

  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Push Day" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "6" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 2 reps"), {
    target: { value: "5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(
    props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference
  ).toEqual({ source: "user-saved", sourceId: dips.id, modified: false });
});

test("only exercise name changes mark a selected reference modified", () => {
  const press = createExerciseDefinition({
    name: "Press",
    defaultLoadMode: "external",
    defaultWeightUnit: "kg",
  });
  const props = renderPage({ savedExercises: [press] });
  fireEvent.click(screen.getByRole("button", { name: /Find an exercise/ }));
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "press" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Press" }));
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Day" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 notes"), { target: { value: "Log-specific" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight unit"), { target: { value: "lb" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference.modified).toBe(false);

  props.saveWorkoutEntry.mockClear();
  fireEvent.click(screen.getByRole("button", { name: /Find an exercise/ }));
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "press" } });
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Press" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Strict Press" } });
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Day" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference.modified).toBe(true);
});

test("creates a per-exercise reusable definition and attaches its reference", () => {
  const saved = createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
  const saveExerciseDefinitions = jest.fn(() => [
    { status: "added", exercise: saved, matchesDefinition: true },
  ]);
  const props = renderPage({ saveExerciseDefinitions });
  fillFirstSet({ bodyweight: true });
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.change(screen.getByLabelText("Exercise 1 reusable default load mode"), { target: { value: "bodyweight" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(saveExerciseDefinitions).toHaveBeenCalledWith([
    { name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" },
  ]);
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference).toEqual({ source: "user-saved", sourceId: saved.id, modified: false });
});

test("an exact duplicate safely attaches the existing reference", () => {
  const existing = createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
  const props = renderPage({
    saveExerciseDefinitions: jest.fn(() => [
      { status: "duplicate", exercise: existing, matchesDefinition: true },
    ]),
  });
  fillFirstSet({ bodyweight: true });
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.change(screen.getByLabelText("Exercise 1 reusable default load mode"), { target: { value: "bodyweight" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference).toEqual({ source: "user-saved", sourceId: existing.id, modified: false });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("selection does not overwrite load choices on a touched initial set", () => {
  const dips = createExerciseDefinition({ name: "Dips", defaultLoadMode: "bodyweight", defaultWeightUnit: "lb" });
  renderPage({ savedExercises: [dips] });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: /Find an exercise/ }));
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "dips" } });
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Dips" }));
  expect(screen.getByLabelText("Exercise 1 set 1 load mode")).toHaveValue("external");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(10);
});

test("keeps conflicting historical snapshots unreferenced and combines messages", () => {
  const existingDips = createExerciseDefinition({ name: "Dips", defaultLoadMode: "external", defaultWeightUnit: "kg" });
  const existingPress = createExerciseDefinition({ name: "Press", defaultLoadMode: "external", defaultWeightUnit: "kg" });
  const props = renderPage({
    saveExerciseDefinitions: jest.fn(() => [
      { status: "duplicate", exercise: existingDips, matchesDefinition: false },
      { status: "duplicate", exercise: existingPress, matchesDefinition: false },
    ]),
  });
  fillFirstSet({ bodyweight: true });
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.change(screen.getByLabelText("Exercise 1 reusable default load mode"), { target: { value: "bodyweight" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.change(screen.getByLabelText("Exercise 2 name"), { target: { value: "Press" } });
  fireEvent.change(screen.getByLabelText("Exercise 2 set 1 weight"), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText("Exercise 2 set 1 reps"), { target: { value: "10" } });
  fireEvent.click(screen.getAllByLabelText("Save as reusable exercise")[1]);
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises.every((exercise) => !exercise.exerciseReference)).toBe(true);
  expect(screen.getByRole("status")).toHaveTextContent("Dips, Press definitions were kept");
});

test("catalog failure does not block history and leaves no misleading reference", () => {
  const props = renderPage({
    saveExerciseDefinitions: jest.fn(() => [
      { status: "error", exercise: null, matchesDefinition: false },
    ]),
  });
  fillFirstSet();
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0]).not.toHaveProperty("exerciseReference");
  expect(screen.getByRole("status")).toHaveTextContent("reusable exercises could not be saved");
});

test("Phase 1 exercises are eligible during edit while referenced exercises are not", () => {
  const phaseOne = entry();
  const referenced = entry({
    id: "referenced-workout",
    title: "Referenced",
    exercises: [
      {
        ...entry().exercises[0],
        exerciseReference: { source: "user-saved", sourceId: "user-saved:press", modified: false },
      },
    ],
  });
  const { unmount } = render(<WorkoutPage {...renderPageProps({ workoutEntries: [phaseOne] })} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Save as reusable exercise")).toBeInTheDocument();
  unmount();
  render(<WorkoutPage {...renderPageProps({ workoutEntries: [referenced] })} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.queryByLabelText("Save as reusable exercise")).not.toBeInTheDocument();
});

test("selecting a Trace exercise saves its canonical name and built-in ID", () => {
  const props = renderPage();
  fireEvent.click(
    screen.getByRole("button", { name: "Find an exercise for exercise 1" })
  );
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "db bench" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Select Trace exercise Dumbbell Bench Press",
    })
  );
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue(
    "Dumbbell Bench Press"
  );
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Chest Day" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), {
    target: { value: "70" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0]).toMatchObject({
    name: "Dumbbell Bench Press",
    exerciseId: "trace:chest-db-bench-002",
  });
  expect(
    props.saveWorkoutEntry.mock.calls[0][0].exercises[0]
  ).not.toHaveProperty("exerciseReference");
});

test("manually typed ambiguous names remain without a built-in ID", () => {
  const props = renderPage();
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Chest Day" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "Incline Press" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), {
    target: { value: "70" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0]).not.toHaveProperty(
    "exerciseId"
  );
});

test("editing preserves built-in identity until the exercise name changes", () => {
  const builtInEntry = entry({
    exercises: [
      {
        ...entry().exercises[0],
        name: "Dumbbell Bench Press",
        exerciseId: "trace:chest-db-bench-002",
      },
    ],
  });
  const props = renderPage({ workoutEntries: [builtInEntry] });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry.mock.calls[0][1].exercises[0].exerciseId).toBe(
    "trace:chest-db-bench-002"
  );
});
