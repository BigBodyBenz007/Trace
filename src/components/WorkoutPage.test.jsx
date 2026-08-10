import { fireEvent, render, screen, within } from "@testing-library/react";
import WorkoutPage from "./WorkoutPage";

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

function renderPage(overrides = {}) {
  const props = {
    onBack: jest.fn(),
    workoutEntries: [],
    saveWorkoutEntry: jest.fn(() => true),
    updateWorkoutEntry: jest.fn(() => true),
    deleteWorkoutEntry: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };
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
