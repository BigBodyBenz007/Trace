import { fireEvent, render, screen, within } from "@testing-library/react";
import TodayPage from "./TodayPage";
import {
  createPlannedWorkout as createRecord,
  getPlannedWorkoutError,
  updatePlannedWorkout as updateRecord,
} from "../services/plannedWorkout";

const TODAY = new Date(2026, 7, 22, 12, 0, 0);
const CREATED_AT = new Date("2026-08-20T12:00:00.000Z");

function plan(overrides = {}) {
  return createRecord({
    id: "planned-workout:today",
    scheduledDate: "2026-08-22",
    title: "Upper Body",
    notes: "Plan only",
    exercises: [{
      id: "planned-exercise:bench",
      name: "Dumbbell Bench Press",
      exerciseId: "trace:chest-db-bench-002",
      notes: "",
      targetSets: [],
    }],
    ...overrides,
  }, CREATED_AT);
}

function renderPage(props = {}) {
  const callbacks = {
    onBack: jest.fn(),
    createPlannedWorkout: jest.fn((draft) => {
      const plannedWorkout = createRecord(draft, CREATED_AT);
      return plannedWorkout
        ? { status: "saved", plannedWorkout }
        : { status: "invalid", message: getPlannedWorkoutError(draft) };
    }),
    updatePlannedWorkout: jest.fn((id, draft) => {
      const existing = (props.plannedWorkouts || []).find((item) => item.id === id);
      const plannedWorkout = updateRecord(existing, draft, CREATED_AT);
      return plannedWorkout
        ? { status: "saved", plannedWorkout }
        : { status: "invalid", message: getPlannedWorkoutError(draft) };
    }),
    deletePlannedWorkout: jest.fn(() => true),
    startPlannedWorkout: jest.fn(() => ({ status: "started" })),
    openCompletedWorkout: jest.fn(() => true),
  };
  const view = render(
    <TodayPage
      currentDate={TODAY}
      plannedWorkouts={[]}
      savedExercises={[]}
      {...callbacks}
      {...props}
    />
  );
  return {
    ...callbacks,
    rerenderPage(nextProps = {}) {
      view.rerender(
        <TodayPage
          currentDate={TODAY}
          plannedWorkouts={[]}
          savedExercises={[]}
          {...callbacks}
          {...props}
          {...nextProps}
        />
      );
    },
  };
}

function openCreateAndFillBasics({ title = "Push Day", exerciseName = "Bench Press" } = {}) {
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: exerciseName } });
}

test("shows only planned workouts matching the current device-local date", () => {
  renderPage({
    plannedWorkouts: [
      plan(),
      plan({ id: "planned-workout:tomorrow", scheduledDate: "2026-08-23", title: "Tomorrow Pull" }),
    ],
  });

  const schedule = screen.getByRole("region", { name: "Planned workouts for today" });
  expect(within(schedule).getByRole("heading", { name: "Upper Body" })).toBeInTheDocument();
  expect(within(schedule).queryByText("Tomorrow Pull")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Planned for August 22, 2026" })).toBeInTheDocument();
});

test("shows a useful empty state when today has no plans", () => {
  renderPage({ plannedWorkouts: [plan({ scheduledDate: "2026-08-23" })] });
  expect(screen.getByRole("heading", { name: "No workout planned for today." })).toBeInTheDocument();
  expect(screen.getByText("You can create a plan for today or choose another date.")).toBeInTheDocument();
});

test("starts an incomplete planned workout through the execution callback", () => {
  const { startPlannedWorkout } = renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Upper Body" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith(
    "planned-workout:today",
    null
  );
});

test("offers resume, discard, and cancel for an unrelated workout draft", () => {
  const startPlannedWorkout = jest.fn((_id, action) => action
    ? { status: "started" }
    : { status: "draft-conflict", existingDraftTitle: "Unrelated workout" });
  renderPage({ plannedWorkouts: [plan()], startPlannedWorkout });

  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Upper Body" }));
  const conflictDialog = screen.getByRole("dialog", { name: "Workout already in progress" });
  expect(conflictDialog).toBeInTheDocument();
  expect(screen.getByText(/Resume Unrelated workout/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Start planned workout Upper Body" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit planned workout Upper Body" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete planned workout Upper Body" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resume current workout" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Workout already in progress" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start planned workout Upper Body" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Edit planned workout Upper Body" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete planned workout Upper Body" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Upper Body" }));
  fireEvent.click(screen.getByRole("button", { name: "Resume current workout" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith("planned-workout:today", "resume");

  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Upper Body" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard and start plan" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith("planned-workout:today", "discard");
});

test("shows completion, links the actual workout, and becomes incomplete after deletion", () => {
  const completedWorkout = {
    id: "workout:completed",
    plannedWorkoutId: "planned-workout:today",
    occurredAt: "2026-08-22T18:00:00.000Z",
  };
  const { openCompletedWorkout, rerenderPage } = renderPage({
    plannedWorkouts: [plan()],
    workoutEntries: [completedWorkout],
  });

  expect(screen.getByText("Plan · completed")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Start planned workout Upper Body" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open completed workout Upper Body" }));
  expect(openCompletedWorkout).toHaveBeenCalledWith("workout:completed");

  rerenderPage({ workoutEntries: [] });
  expect(screen.getByText("Plan · not completed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start planned workout Upper Body" })).toBeInTheDocument();
});

test("hides the empty schedule while creating and restores it on cancel", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));

  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "create");
  expect(screen.getByRole("form", { name: "Create planned workout" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Planned workouts for today" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "No workout planned for today." })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "closed");
  expect(screen.getByRole("heading", { name: "No workout planned for today." })).toBeInTheDocument();
});

test("hides the saved plan while editing and restores it on cancel", () => {
  renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Edit planned workout Upper Body" }));

  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "edit");
  expect(screen.getByRole("form", { name: "Edit planned workout" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Planned workouts for today" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Upper Body" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("heading", { name: "Upper Body" })).toBeInTheDocument();
});

test("does not offer a second create action while an editor is open", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  expect(screen.queryByRole("button", { name: "Create planned workout" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save planned workout" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
});

test("creates a valid planned workout with optional target intentions", () => {
  const { createPlannedWorkout } = renderPage();
  openCreateAndFillBasics();
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended reps"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended load"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended amount"), { target: { value: "135" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));

  expect(createPlannedWorkout).toHaveBeenCalledTimes(1);
  const submitted = createPlannedWorkout.mock.calls[0][0];
  expect(submitted).toMatchObject({
    scheduledDate: "2026-08-22",
    title: "Push Day",
  });
  expect(submitted.exercises[0]).toMatchObject({ name: "Bench Press" });
  expect(submitted.exercises[0].targetSets[0]).toMatchObject({
    reps: "8",
    load: { mode: "external", amount: "135", unit: "lb" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("Planned workout created.");
});

test("edits a planned workout through the immutable record update path", () => {
  const existing = plan();
  const { updatePlannedWorkout } = renderPage({ plannedWorkouts: [existing] });
  fireEvent.click(screen.getByRole("button", { name: "Edit planned workout Upper Body" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: "Upper Strength" } });
  fireEvent.change(screen.getByLabelText("Planned workout notes (optional)"), { target: { value: "Leave two reps in reserve" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(updatePlannedWorkout).toHaveBeenCalledWith(
    existing.id,
    expect.objectContaining({
      id: existing.id,
      title: "Upper Strength",
      notes: "Leave two reps in reserve",
    })
  );
  expect(existing.title).toBe("Upper Body");
  expect(screen.getByRole("status")).toHaveTextContent("Planned workout updated.");
});

test("adds an exercise by appending it and preserves the original order", () => {
  const { createPlannedWorkout } = renderPage();
  openCreateAndFillBasics({ exerciseName: "Squat" });
  fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Squat");
  fireEvent.change(screen.getByLabelText("Exercise 2 name"), { target: { value: "Pull-Up" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));

  const submitted = createPlannedWorkout.mock.calls[0][0];
  expect(submitted.exercises.map(({ name }) => name)).toEqual(["Squat", "Pull-Up"]);
  expect(submitted.exercises[1].targetSets).toEqual([]);
});

test("removes an exercise without rebuilding the remaining exercise", () => {
  const existing = plan({
    exercises: [
      { id: "planned-exercise:squat", name: "Squat", notes: "first", targetSets: [] },
      { id: "planned-exercise:pull-up", name: "Pull-Up", notes: "second", targetSets: [] },
    ],
  });
  const { updatePlannedWorkout } = renderPage({ plannedWorkouts: [existing] });
  fireEvent.click(screen.getByRole("button", { name: "Edit planned workout Upper Body" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1" }));
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Pull-Up");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  const submitted = updatePlannedWorkout.mock.calls[0][1];
  expect(submitted.exercises).toEqual([expect.objectContaining({ id: "planned-exercise:pull-up", name: "Pull-Up", notes: "second" })]);
});

test("saves a planned workout for another date", () => {
  const { createPlannedWorkout } = renderPage();
  openCreateAndFillBasics();
  fireEvent.change(screen.getByLabelText("Scheduled date"), { target: { value: "2026-08-28" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));
  expect(createPlannedWorkout.mock.calls[0][0].scheduledDate).toBe("2026-08-28");
});

test("deletes a plan after confirmation", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const { deletePlannedWorkout } = renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Upper Body" }));
  expect(deletePlannedWorkout).toHaveBeenCalledWith("planned-workout:today");
  expect(screen.getByRole("status")).toHaveTextContent("Planned workout deleted.");
  confirm.mockRestore();
});

test("rejects invalid plans through the existing validation path", () => {
  const { createPlannedWorkout } = renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a planned workout title.");
  expect(createPlannedWorkout).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: "Push" } });
  fireEvent.change(screen.getByLabelText("Scheduled date"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid scheduled date.");
  expect(createPlannedWorkout).not.toHaveBeenCalled();
});

test("uses existing exercise picker identities and exposes accessible controls", () => {
  renderPage({
    savedExercises: [{
      id: "user-saved:bench",
      schemaVersion: 1,
      name: "My Bench",
      defaults: { load: { mode: "external", unit: "lb" } },
      createdAt: "2026-08-01T12:00:00.000Z",
      updatedAt: "2026-08-01T12:00:00.000Z",
    }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  expect(screen.getByRole("form", { name: "Create planned workout" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add exercise" })).toBeVisible();
  const findButton = screen.getByRole("button", { name: "Find an exercise for exercise 1" });
  const moveUpButton = screen.getByRole("button", { name: "Move exercise 1 up" });
  const moveDownButton = screen.getByRole("button", { name: "Move exercise 1 down" });
  expect(findButton).toBeVisible();
  expect(findButton).toHaveClass("trace-today-exercise-action");
  expect(moveUpButton).toBeVisible();
  expect(moveUpButton).toHaveClass("trace-today-exercise-action");
  expect(moveDownButton).toBeVisible();
  expect(moveDownButton).toHaveClass("trace-today-exercise-action");
  findButton.focus();
  expect(findButton).toHaveFocus();
  expect(screen.getByRole("button", { name: "Remove exercise 1" })).toBeDisabled();
  fireEvent.click(findButton);
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "My Bench" } });
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise My Bench" }));
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("My Bench");
  expect(screen.queryByRole("button", { name: "Edit saved exercise My Bench" })).not.toBeInTheDocument();
});

test("keeps intended amount on its own desktop target-field track", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended load"), { target: { value: "external" } });

  expect(screen.getByTestId("target-fields-1-1")).toHaveAttribute("data-layout", "desktop");
  expect(screen.getByTestId("target-fields-1-1")).toHaveStyle({
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(130px, 1fr) minmax(70px, 0.55fr)",
  });
  expect(screen.getByText("Intended amount")).toHaveClass("trace-today-target__amount-label-text");
  expect(screen.getByText("Intended amount")).toHaveProperty("tagName", "SPAN");
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});

test.each([
  [1280, "desktop", "repeat(2, minmax(0, 1fr))"],
  [390, "mobile", "minmax(0, 1fr)"],
])("uses the responsive %s px layout", (width, layout, columns) => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  expect(screen.getByTestId("today-page")).toHaveAttribute("data-layout", layout);
  expect(screen.getByTestId("planned-workout-details")).toHaveStyle({ gridTemplateColumns: columns });
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended load"), { target: { value: "external" } });
  expect(screen.getByTestId("target-fields-1-1")).toHaveStyle({
    gridTemplateColumns: layout === "mobile"
      ? "minmax(0, 1fr)"
      : "minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(130px, 1fr) minmax(70px, 0.55fr)",
  });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});
