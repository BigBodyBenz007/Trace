import { fireEvent, render, screen, within } from "@testing-library/react";
import TodayPage from "./TodayPage";
import {
  createPlannedWorkout as createRecord,
  getPlannedWorkoutError,
  updatePlannedWorkout as updateRecord,
} from "../services/plannedWorkout";
import {
  completeDailyAction as completeActionRecord,
  createDailyAction as createActionRecord,
  updateDailyAction as updateActionRecord,
} from "../services/dailyAction";
import {
  completeProtocolOccurrence as completeProtocolOccurrenceRecord,
  skipProtocolOccurrence as skipProtocolOccurrenceRecord,
} from "../services/protocolOccurrence";

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

function protocol(overrides = {}, itemOverrides = {}) {
  return {
    id: "protocol:today",
    schemaVersion: 1,
    name: "Recovery protocol",
    startDate: "2026-08-01",
    endDate: null,
    status: "active",
    notes: "",
    items: [{
      id: "protocol-item:today",
      compound: { name: "B12" },
      dose: { amount: 1, unit: "ml" },
      route: { code: "subcutaneous" },
      schedule: { type: "weekly-days", weekdays: [6] },
      notes: "Rotate injection site",
      ...itemOverrides,
    }],
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    endedAt: null,
    ...overrides,
  };
}

function dailyAction(overrides = {}) {
  return createActionRecord({
    title: "Team check-in",
    actionType: "meeting",
    date: "2026-08-22",
    time: "10:00",
    timeWindow: null,
    durationMinutes: 30,
    location: "Studio conference room",
    notes: "Bring the launch notes",
    recurrence: null,
    ...overrides,
  }, { id: overrides.id || "daily-action:check-in", now: CREATED_AT });
}

function protocolOccurrence(status = "completed", overrides = {}) {
  const identity = {
    protocolId: "protocol:today",
    itemId: "protocol-item:today",
    date: "2026-08-22",
  };
  return status === "completed"
    ? completeProtocolOccurrenceRecord(null, { ...identity, ...overrides }, CREATED_AT)
    : skipProtocolOccurrenceRecord(
      null,
      { ...identity, ...overrides },
      overrides.skipReason || "Schedule conflict",
      overrides.customSkipReason || "",
      CREATED_AT
    );
}

function renderPage(props = {}, { expanded = true } = {}) {
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
    restorePlannedWorkout: jest.fn(() => ({ status: "restored" })),
    skipPlannedWorkout: jest.fn(() => ({ status: "skipped" })),
    startPlannedWorkout: jest.fn(() => ({ status: "started" })),
    openCompletedWorkout: jest.fn(() => true),
    createDailyAction: jest.fn((draft) => ({
      status: "saved",
      dailyAction: createActionRecord(draft, { id: "daily-action:new", now: CREATED_AT }),
    })),
    updateDailyAction: jest.fn((id, draft) => {
      const existing = (props.dailyActions || []).find((item) => item.id === id);
      const dailyAction = updateActionRecord(existing, draft, CREATED_AT);
      return dailyAction ? { status: "saved", dailyAction } : { status: "invalid" };
    }),
    deleteDailyAction: jest.fn(() => true),
    completeDailyAction: jest.fn(() => ({ status: "saved" })),
    skipDailyAction: jest.fn(() => ({ status: "saved" })),
    completeProtocolOccurrence: jest.fn(() => ({ status: "saved" })),
    skipProtocolOccurrence: jest.fn(() => ({ status: "saved" })),
    showToast: jest.fn(),
    saveExerciseDefinitions: jest.fn(() => [{
      status: "added",
      exercise: { id: "user-saved:test" },
      matchesDefinition: true,
    }]),
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
  if (expanded) {
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  }
  return {
    ...callbacks,
    unmount: view.unmount,
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

  const schedule = screen.getByRole("region", { name: "Today's actionable items" });
  expect(within(schedule).getByRole("button", { name: "Open workout preview Upper Body" })).toBeInTheDocument();
  expect(within(schedule).queryByText("Tomorrow Pull")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "August 22, 2026" })).toBeInTheDocument();
});

test("shows a protocol item scheduled for the browser-local current date", () => {
  renderPage({ protocols: [protocol()] });

  const schedule = screen.getByRole("region", { name: "Today's actionable items" });
  expect(schedule.querySelector('[data-schedule-item-type="protocol"]')).toBeInTheDocument();
  expect(within(schedule).getByRole("heading", { name: "B12" })).toBeInTheDocument();
  expect(within(schedule).getByText("Recovery protocol")).toBeInTheDocument();
  expect(within(schedule).getByText("1 mL")).toBeInTheDocument();
  expect(within(schedule).getByText("Subcutaneous (SC)")).toBeInTheDocument();
  expect(within(schedule).getByText("Rotate injection site")).toBeInTheDocument();
});

test("does not show protocols scheduled for another local date or historical ended protocols", () => {
  renderPage({
    protocols: [
      protocol({ id: "protocol:tomorrow", name: "Sunday protocol" }, {
        id: "protocol-item:tomorrow",
        schedule: { type: "weekly-days", weekdays: [7] },
      }),
      protocol({ id: "protocol:future", name: "Future protocol", startDate: "2026-08-23" }),
      protocol({ id: "protocol:ended", name: "Ended protocol", status: "ended", endDate: "2026-08-22" }),
    ],
  });

  expect(screen.queryByRole("region", { name: "Today's actionable items" })).not.toBeInTheDocument();
  expect(screen.queryByText("Sunday protocol")).not.toBeInTheDocument();
  expect(screen.queryByText("Future protocol")).not.toBeInTheDocument();
  expect(screen.queryByText("Ended protocol")).not.toBeInTheDocument();
});

test("keeps workout and protocol entries clearly separated with workout actions intact", () => {
  const { startPlannedWorkout } = renderPage({
    plannedWorkouts: [plan()],
    protocols: [protocol()],
  });

  const schedule = screen.getByRole("region", { name: "Today's actionable items" });
  const workoutGroup = schedule.querySelector('[data-schedule-item-type="workout"]');
  const protocolGroup = schedule.querySelector('[data-schedule-item-type="protocol"]');
  expect(workoutGroup).toHaveTextContent("Workout");
  expect(protocolGroup).toHaveTextContent("Protocol");
  expect(within(protocolGroup).getByText("Scheduled")).toHaveClass("trace-today-item-status");

  fireEvent.click(within(workoutGroup).getByRole("button", { name: "Start planned workout Upper Body" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith("planned-workout:today", null);
  expect(within(workoutGroup).getByRole("button", { name: "Edit planned workout Upper Body" })).toBeInTheDocument();
  expect(within(workoutGroup).getByRole("button", { name: "Delete planned workout Upper Body" })).toBeInTheDocument();
});

test("shows a useful empty state when today has no workouts or protocols", () => {
  renderPage({ plannedWorkouts: [plan({ scheduledDate: "2026-08-23" })] });
  expect(screen.getByRole("heading", { name: "Nothing scheduled for today." })).toBeInTheDocument();
  expect(screen.getByText("Add a daily action, create a workout plan, or choose another date.")).toBeInTheDocument();
});

test("starts an incomplete planned workout through the execution callback", () => {
  const { startPlannedWorkout } = renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Upper Body" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith(
    "planned-workout:today",
    null
  );
});

test("starts an incomplete planned workout once after the complete mobile touch and compatibility-click sequence", () => {
  const { startPlannedWorkout } = renderPage({ plannedWorkouts: [plan()] }, { expanded: false });
  const startButton = screen.getByRole("button", { name: "Start workout Upper Body" });
  fireEvent.touchStart(startButton);
  expect(startPlannedWorkout).not.toHaveBeenCalled();
  fireEvent.touchEnd(startButton);
  fireEvent.click(startButton);
  expect(startPlannedWorkout).toHaveBeenCalledWith("planned-workout:today", null);
  expect(startPlannedWorkout).toHaveBeenCalledTimes(1);
});

test("shows an active planned-workout draft as Started with Continue actions", () => {
  const planned = plan();
  const { startPlannedWorkout } = renderPage({
    plannedWorkouts: [planned],
    activeWorkoutDraft: {
      plannedWorkoutId: planned.id,
      form: { title: planned.title, exercises: [] },
    },
  });

  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByText("Started")).toBeInTheDocument();
  expect(screen.getAllByText("Started")[0]).toHaveClass("trace-today-item-status");
  fireEvent.click(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Continue workout Upper Body" }));
  expect(startPlannedWorkout).toHaveBeenCalledWith(planned.id, null);

  fireEvent.click(screen.getAllByRole("button", { name: "Open workout preview Upper Body" })[0]);
  const previewActions = screen.getByTestId("workout-preview-actions");
  expect(within(previewActions).getAllByRole("button")).toHaveLength(3);
  expect(within(previewActions).getByRole("button", { name: "Continue workout Upper Body" }))
    .toBeInTheDocument();
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

  expect(within(screen.getByRole("region", { name: "Completed today" })).getByText("Completed"))
    .toHaveClass("trace-today-item-status");
  expect(screen.queryByRole("button", { name: "Start planned workout Upper Body" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open completed workout Upper Body" }));
  expect(openCompletedWorkout).toHaveBeenCalledWith("workout:completed");

  rerenderPage({ workoutEntries: [] });
  expect(screen.getAllByText("Planned")[0]).toHaveClass("trace-today-item-status");
  expect(screen.getByRole("button", { name: "Start planned workout Upper Body" })).toBeInTheDocument();
});

test("hides the empty schedule while creating and restores it on cancel", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));

  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "create");
  expect(screen.getByRole("form", { name: "Create planned workout" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Today's schedule" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Nothing scheduled for today." })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "closed");
  expect(screen.getByRole("heading", { name: "Nothing scheduled for today." })).toBeInTheDocument();
});

test("hides the saved plan while editing and restores it on cancel", () => {
  renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Edit planned workout Upper Body" }));

  expect(screen.getByTestId("today-page")).toHaveAttribute("data-editor-mode", "edit");
  expect(screen.getByRole("form", { name: "Edit planned workout" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Today's schedule" })).not.toBeInTheDocument();
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
  const { createPlannedWorkout, showToast } = renderPage();
  openCreateAndFillBasics();
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended reps"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended load"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended weight"), { target: { value: "135" } });
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
  expect(showToast).toHaveBeenCalledWith("Planned workout created.");
});

test("edits a planned workout through the immutable record update path", () => {
  const existing = plan();
  const { updatePlannedWorkout, showToast } = renderPage({ plannedWorkouts: [existing] });
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
  expect(showToast).toHaveBeenCalledWith("Planned workout updated.");
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
  const { deletePlannedWorkout, showToast } = renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Upper Body" }));
  expect(deletePlannedWorkout).toHaveBeenCalledWith("planned-workout:today");
  expect(showToast).toHaveBeenCalledWith("Planned workout deleted.");
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  confirm.mockRestore();
});

test("does not offer Undo when planned-workout deletion is cancelled", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  const { deletePlannedWorkout, restorePlannedWorkout } = renderPage({
    plannedWorkouts: [plan()],
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Upper Body" }));

  expect(deletePlannedWorkout).not.toHaveBeenCalled();
  expect(restorePlannedWorkout).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  confirm.mockRestore();
});

test("replaces the pending Undo target with the newest deletion", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const first = plan({ id: "planned-workout:first", title: "First Plan" });
  const second = plan({ id: "planned-workout:second", title: "Second Plan" });
  const { rerenderPage, restorePlannedWorkout } = renderPage({
    plannedWorkouts: [first, second],
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout First Plan" }));
  rerenderPage({ plannedWorkouts: [second] });
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Second Plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(restorePlannedWorkout).toHaveBeenCalledTimes(1);
  expect(restorePlannedWorkout).toHaveBeenCalledWith(second, 0);
  confirm.mockRestore();
});

test("drops pending Undo state when Today is remounted", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const first = renderPage({ plannedWorkouts: [plan()] });
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Upper Body" }));
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

  first.unmount();
  renderPage({ plannedWorkouts: [] });

  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  confirm.mockRestore();
});

test("leaves a deleted plan unrestored and reports an Undo failure", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const deletedPlan = plan();
  const restorePlannedWorkout = jest.fn(() => ({
    status: "error",
    message: "The planned workout could not be restored.",
  }));
  renderPage({ plannedWorkouts: [deletedPlan], restorePlannedWorkout });
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Upper Body" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(restorePlannedWorkout).toHaveBeenCalledWith(deletedPlan, 0);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The planned workout could not be restored."
  );
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
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

test("keeps intended weight on its own desktop target-field track", () => {
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
  expect(screen.getByText("Intended weight")).toHaveClass("trace-today-target__amount-label-text");
  expect(screen.getByText("Intended weight")).toHaveProperty("tagName", "SPAN");
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

test("contains mixed Today schedule cards at 390px without horizontal overflow", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderPage({
    plannedWorkouts: [plan({
      title: "A deliberately long workout name that must wrap on mobile",
      exercises: [{
        id: "planned-exercise:long",
        name: "A deliberately long exercise name that must wrap without clipping",
        notes: "",
        targetSets: [{
          id: "planned-set:long",
          setType: "working",
          reps: 12,
          load: { mode: "external", amount: 123.5, unit: "lb" },
          notes: "",
        }],
      }],
    })],
    protocols: [protocol({}, {
      compound: { name: "A very long compound name that must remain contained on a narrow screen" },
    })],
    dailyActions: [dailyAction({
      title: "A deliberately long appointment title that must wrap without clipping on mobile",
      notes: "Long action notes must remain readable and contained without creating horizontal overflow in the compact dashboard.",
      location: "A long location name inside the west conference building",
    })],
  });

  expect(screen.getByTestId("today-page")).toHaveAttribute("data-layout", "mobile");
  const schedule = screen.getByRole("region", { name: "Today's actionable items" });
  expect(schedule.querySelector('[data-schedule-item-type="workout"]')).toBeInTheDocument();
  expect(schedule.querySelector('[data-schedule-item-type="protocol"]')).toBeInTheDocument();
  expect(schedule.querySelector('[data-schedule-item-type="daily-action"]')).toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  fireEvent.click(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview A deliberately long workout name that must wrap on mobile" }));
  expect(screen.getByRole("region", { name: "Workout preview A deliberately long workout name that must wrap on mobile" })).toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});

test("keeps skipped-item recovery actions accessible without overflow at 390px", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const skippedAction = {
    ...dailyAction({ title: "Mobile errand", actionType: "errand" }),
    status: "skipped",
    skippedAt: "2026-08-22T17:00:00.000Z",
    skipReason: "Not enough time",
    updatedAt: "2026-08-22T17:00:00.000Z",
  };
  const skippedWorkout = plan({
    skippedDates: ["2026-08-22"],
    skipReasons: { "2026-08-22": "Low energy" },
  });
  renderPage({
    plannedWorkouts: [skippedWorkout],
    protocols: [protocol()],
    protocolOccurrences: [protocolOccurrence("skipped")],
    dailyActions: [skippedAction],
  }, { expanded: false });

  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  expect(within(summary).getByRole("button", { name: "Start workout Upper Body" })).toBeInTheDocument();
  expect(within(summary).getByRole("button", { name: "Skip workout Upper Body" })).toBeInTheDocument();
  expect(within(summary).getByRole("button", { name: "Complete protocol B12" })).toBeInTheDocument();
  expect(within(summary).getByRole("button", { name: "Complete Errand Mobile errand" })).toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});

test("starts collapsed with a compact typed summary that lists every scheduled item", () => {
  const plans = Array.from({ length: 4 }, (_, index) => plan({
    id: `planned-workout:summary-${index}`,
    title: `Workout ${index + 1}`,
  }));
  renderPage({ plannedWorkouts: plans, protocols: [protocol()] }, { expanded: false });

  const dashboard = screen.getByTestId("today-schedule-dashboard");
  expect(dashboard).toHaveAttribute("data-expanded", "false");
  expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("5 scheduled items")).toBeInTheDocument();
  expect(screen.queryByText(/more scheduled/)).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Today's schedule summary" })
    .querySelectorAll("li")).toHaveLength(5);
  expect(screen.queryByRole("region", { name: "Today's actionable items" })).not.toBeInTheDocument();
});

test("direct protocol Complete moves only today's occurrence to Completed today", () => {
  const view = renderPage({ protocols: [protocol()] }, { expanded: false });
  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  const protocolCard = within(summary).getByRole("button", { name: "Open protocol B12" }).closest("li");

  fireEvent.click(within(protocolCard).getByRole("button", { name: "Complete protocol B12" }));
  expect(view.completeProtocolOccurrence).toHaveBeenCalledWith(
    "protocol:today",
    "protocol-item:today",
    "2026-08-22"
  );

  view.rerenderPage({ protocolOccurrences: [protocolOccurrence("completed")] });
  expect(screen.queryByRole("region", { name: "Remaining today" })).not.toBeInTheDocument();
  const completed = screen.getByRole("region", { name: "Completed today" });
  expect(within(completed).getByRole("button", { name: "Open protocol B12" })).toBeInTheDocument();
  expect(within(completed).getByText("Completed")).toHaveClass("trace-today-item-status--completed");
  expect(within(completed).queryByRole("button", { name: "Complete protocol B12" })).not.toBeInTheDocument();
});

test("direct Complete works for meeting, errand, medication, and supplement cards", () => {
  const actions = [
    dailyAction({ id: "daily-action:meeting", title: "Standup", actionType: "meeting", time: "08:00" }),
    dailyAction({ id: "daily-action:errand", title: "Post office", actionType: "errand", time: "09:00" }),
    dailyAction({ id: "daily-action:medication", title: "Morning medication", actionType: "medication", time: "10:00" }),
    dailyAction({ id: "daily-action:supplement", title: "Vitamin D", actionType: "supplement", time: "11:00" }),
  ];
  const view = renderPage({ dailyActions: actions }, { expanded: false });
  const summary = screen.getByRole("list", { name: "Today's schedule summary" });

  actions.forEach((action) => {
    const card = within(summary).getByRole("button", { name: `Open daily action ${action.title}` }).closest("li");
    fireEvent.click(within(card).getByRole("button", { name: /^Complete / }));
  });
  expect(view.completeDailyAction.mock.calls).toEqual(actions.map(({ id }) => [id]));

  view.rerenderPage({ dailyActions: actions.map((action) => ({
    ...action,
    status: "completed",
    completedAt: "2026-08-22T18:00:00.000Z",
  })) });
  const completed = screen.getByRole("region", { name: "Completed today" });
  actions.forEach(({ title }) => expect(within(completed).getByText(title)).toBeInTheDocument());
  expect(screen.queryByRole("region", { name: "Remaining today" })).not.toBeInTheDocument();
});

test("non-workout card Skip persists its reason and remains visibly skipped", () => {
  const action = dailyAction({ title: "Pick up prescription", actionType: "errand" });
  const view = renderPage({ dailyActions: [action], protocols: [protocol()] }, { expanded: false });
  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  const actionCard = within(summary)
    .getByRole("button", { name: "Open daily action Pick up prescription" }).closest("li");

  fireEvent.click(within(actionCard).getByRole("button", { name: "Skip Errand Pick up prescription" }));
  const dialog = screen.getByRole("dialog", { name: "Skip Errand Pick up prescription" });
  fireEvent.change(within(dialog).getByLabelText("Skip reason"), { target: { value: "Other" } });
  fireEvent.change(within(dialog).getByLabelText("Custom reason"), { target: { value: "Pharmacy closed" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save skip" }));
  expect(view.skipDailyAction).toHaveBeenCalledWith(action.id, "Other", "Pharmacy closed");

  view.rerenderPage({ dailyActions: [{
    ...action,
    status: "skipped",
    skippedAt: "2026-08-22T18:00:00.000Z",
    skipReason: "Other",
    customSkipReason: "Pharmacy closed",
  }] });
  const remaining = screen.getByRole("region", { name: "Remaining today" });
  expect(within(remaining).getByText("Skipped")).toHaveClass("trace-today-item-status--skipped");
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();

  const protocolCard = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open protocol B12" }).closest("li");
  fireEvent.click(within(protocolCard).getByRole("button", { name: "Skip protocol B12" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Skip protocol B12" }))
    .getByRole("button", { name: "Skip without reason" }));
  expect(view.skipProtocolOccurrence).toHaveBeenCalledWith(
    "protocol:today",
    "protocol-item:today",
    "2026-08-22",
    "",
    ""
  );
});

test("a skipped daily action can be completed from its card and retains the skip reason", () => {
  const scheduled = dailyAction({ title: "Collect medication", actionType: "errand" });
  const skipped = {
    ...scheduled,
    status: "skipped",
    completedAt: null,
    skippedAt: "2026-08-22T17:00:00.000Z",
    skipReason: "Other",
    customSkipReason: "Pharmacy closed",
    updatedAt: "2026-08-22T17:00:00.000Z",
  };
  const view = renderPage({ dailyActions: [skipped] }, { expanded: false });
  const card = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open daily action Collect medication" }).closest("li");

  expect(within(card).getByText("Skipped")).toBeInTheDocument();
  fireEvent.click(within(card).getByRole("button", { name: "Complete Errand Collect medication" }));
  expect(view.completeDailyAction).toHaveBeenCalledWith(skipped.id);

  const completed = completeActionRecord(skipped, new Date("2026-08-22T18:00:00.000Z"));
  view.rerenderPage({ dailyActions: [completed] });
  expect(screen.queryByRole("region", { name: "Remaining today" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "Completed today" }))
    .getByRole("button", { name: "Open daily action Collect medication" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open daily action Collect medication" }));
  expect(screen.getByText("Previously skipped: Pharmacy closed")).toBeInTheDocument();
});

test("a skipped protocol occurrence completes only today and retains its skip provenance", () => {
  const identity = {
    protocolId: "protocol:today",
    itemId: "protocol-item:today",
    date: "2026-08-22",
  };
  const skipped = skipProtocolOccurrenceRecord(
    null,
    identity,
    "Schedule conflict",
    "",
    new Date("2026-08-22T17:00:00.000Z")
  );
  const view = renderPage({ protocols: [protocol()], protocolOccurrences: [skipped] }, { expanded: false });
  const card = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open protocol B12" }).closest("li");

  fireEvent.click(within(card).getByRole("button", { name: "Complete protocol B12" }));
  expect(view.completeProtocolOccurrence).toHaveBeenCalledWith(
    identity.protocolId,
    identity.itemId,
    identity.date
  );

  const completed = completeProtocolOccurrenceRecord(
    skipped,
    identity,
    new Date("2026-08-22T18:00:00.000Z")
  );
  view.rerenderPage({ protocolOccurrences: [completed] });
  expect(within(screen.getByRole("region", { name: "Completed today" }))
    .getByRole("button", { name: "Open protocol B12" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open protocol B12" }));
  expect(screen.getByText("Previously skipped: Schedule conflict")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));

  view.rerenderPage({
    currentDate: new Date(2026, 7, 29, 12, 0, 0),
    protocolOccurrences: [completed],
  });
  const nextOccurrence = screen.getByRole("button", { name: "Open protocol B12" });
  expect(nextOccurrence).toHaveTextContent("Scheduled");
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();
});

test("a skipped workout still offers Start and Skip without creating completed history", () => {
  const skipped = plan({
    skippedDates: ["2026-08-22"],
    skipReasons: { "2026-08-22": "Low energy" },
  });
  const view = renderPage({ plannedWorkouts: [skipped], workoutEntries: [] }, { expanded: false });
  let card = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Upper Body" }).closest("li");

  expect(within(card).getByRole("button", { name: "Start workout Upper Body" })).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "Skip workout Upper Body" })).toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: /Complete/ })).not.toBeInTheDocument();
  fireEvent.click(within(card).getByRole("button", { name: "Start workout Upper Body" }));
  expect(view.startPlannedWorkout).toHaveBeenCalledWith(skipped.id, null);
  expect(view.openCompletedWorkout).not.toHaveBeenCalled();

  view.rerenderPage({
    activeWorkoutDraft: { plannedWorkoutId: skipped.id, form: { title: skipped.title, exercises: [] } },
    workoutEntries: [],
  });
  card = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Upper Body" }).closest("li");
  expect(within(card).getByText("Started")).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "Continue workout Upper Body" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();
});

test("workout fast actions start directly and open a fixed accessible skip overlay", () => {
  const planned = plan();
  const view = renderPage({ plannedWorkouts: [planned] }, { expanded: false });
  const dashboard = screen.getByTestId("today-schedule-dashboard");
  const dashboardRect = dashboard.getBoundingClientRect();
  const card = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Upper Body" }).closest("li");

  fireEvent.click(within(card).getByRole("button", { name: "Start workout Upper Body" }));
  expect(view.startPlannedWorkout).toHaveBeenCalledWith(planned.id, null);
  expect(screen.queryByRole("region", { name: "Workout preview Upper Body" })).not.toBeInTheDocument();

  const skipButton = within(card).getByRole("button", { name: "Skip workout Upper Body" });
  skipButton.focus();
  fireEvent.click(skipButton);
  const dialog = screen.getByRole("dialog", { name: "Skip workout Upper Body" });
  const overlay = dialog.parentElement;
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(overlay).toHaveClass("trace-skip-overlay");
  expect(dashboard).not.toContainElement(overlay);
  expect(dashboard.getBoundingClientRect()).toEqual(dashboardRect);
  expect(within(dialog).getByLabelText("Skip reason")).toHaveFocus();
  expect(within(dialog).getAllByRole("option").map(({ textContent }) => textContent)).toEqual([
    "No reason",
    "Pain or discomfort",
    "Equipment unavailable",
    "Not enough time",
    "Low energy",
    "Schedule conflict",
    "Other / custom reason",
  ]);
  within(dialog).getByRole("button", { name: "Cancel" }).focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(within(dialog).getByLabelText("Skip reason")).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Skip workout Upper Body" })).not.toBeInTheDocument();
  expect(skipButton).toHaveFocus();
  expect(view.skipPlannedWorkout).not.toHaveBeenCalled();

  fireEvent.click(skipButton);
  fireEvent.change(screen.getByLabelText("Skip reason"), { target: { value: "Schedule conflict" } });
  fireEvent.click(screen.getByRole("button", { name: "Save skip" }));
  expect(view.skipPlannedWorkout).toHaveBeenCalledWith(planned.id, "2026-08-22", "Schedule conflict");

  view.rerenderPage({ plannedWorkouts: [{
    ...planned,
    skippedDates: ["2026-08-22"],
    skipReasons: { "2026-08-22": "Schedule conflict" },
  }] });
  const remaining = screen.getByRole("region", { name: "Remaining today" });
  expect(within(remaining).getByText("Skipped")).toHaveClass("trace-today-item-status--skipped");
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();
});

test("sorts timed items across sources, time windows by start, and untimed items last", () => {
  renderPage({
    plannedWorkouts: [plan({ title: "Untimed workout" })],
    protocols: [protocol({}, {
      compound: { name: "Omeprazole" },
      schedule: { type: "weekly-days", weekdays: [6], time: "06:20" },
    })],
    dailyActions: [
      dailyAction({ id: "daily-action:meeting", title: "Work meeting", time: "09:00" }),
      dailyAction({ id: "daily-action:vitamin", title: "Vitamin C", actionType: "supplement", time: "06:15" }),
      dailyAction({ id: "daily-action:grocery", title: "Grocery shop", actionType: "errand", time: null, timeWindow: { start: "16:10", end: "18:10" } }),
    ],
  }, { expanded: false });

  const labels = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getAllByRole("button", { name: /^Open / }).map((button) => button.getAttribute("aria-label"));
  expect(labels).toEqual([
    "Open daily action Vitamin C",
    "Open protocol Omeprazole",
    "Open daily action Work meeting",
    "Open daily action Grocery shop",
    "Open workout preview Untimed workout",
  ]);
});

test("equal-time items keep stable source and collection order and react to edited times", () => {
  const first = dailyAction({ id: "daily-action:first", title: "First meeting", time: "09:00" });
  const second = dailyAction({ id: "daily-action:second", title: "Second meeting", time: "09:00" });
  const view = renderPage({
    protocols: [protocol({}, { schedule: { type: "weekly-days", weekdays: [6], time: "09:00" } })],
    dailyActions: [first, second],
  }, { expanded: false });
  const orderedLabels = () => within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getAllByRole("button", { name: /^Open / }).map((button) => button.getAttribute("aria-label"));
  expect(orderedLabels()).toEqual([
    "Open protocol B12",
    "Open daily action First meeting",
    "Open daily action Second meeting",
  ]);

  view.rerenderPage({ dailyActions: [{ ...second, time: "08:30" }, first] });
  expect(orderedLabels()).toEqual([
    "Open daily action Second meeting",
    "Open protocol B12",
    "Open daily action First meeting",
  ]);
});

test("separates completed work while started and skipped items stay clearly visible in Remaining today", () => {
  const planned = plan({ id: "planned-workout:started", title: "Started workout" });
  const completedPlan = plan({ id: "planned-workout:complete", title: "Completed workout" });
  const completedAction = {
    ...dailyAction({ id: "daily-action:complete", title: "Completed meeting" }),
    status: "completed",
    completedAt: "2026-08-22T18:00:00.000Z",
    updatedAt: "2026-08-22T18:00:00.000Z",
  };
  const skippedAction = {
    ...dailyAction({ id: "daily-action:skip", title: "Skipped errand" }),
    status: "skipped",
    skippedAt: "2026-08-22T18:30:00.000Z",
    skipReason: "Not enough time",
    updatedAt: "2026-08-22T18:30:00.000Z",
  };
  renderPage({
    plannedWorkouts: [completedPlan, planned],
    workoutEntries: [{ id: "workout:done", plannedWorkoutId: completedPlan.id, occurredAt: "2026-08-22T17:00:00.000Z" }],
    activeWorkoutDraft: { plannedWorkoutId: planned.id, form: { title: planned.title, exercises: [] } },
    dailyActions: [completedAction, skippedAction],
  }, { expanded: false });

  const remaining = screen.getByRole("region", { name: "Remaining today" });
  const completed = screen.getByRole("region", { name: "Completed today" });
  expect(within(remaining).getByText("Started workout")).toBeInTheDocument();
  expect(within(remaining).getByText("Started")).toBeInTheDocument();
  expect(within(remaining).getByText("Skipped errand")).toBeInTheDocument();
  expect(within(remaining).getByText("Skipped")).toBeInTheDocument();
  expect(within(remaining).queryByText("Completed workout")).not.toBeInTheDocument();
  expect(within(completed).getByText("Completed workout")).toBeInTheDocument();
  expect(within(completed).getByText("Completed meeting")).toBeInTheDocument();
});

test("uses the same status component for workouts, protocols, and daily actions", () => {
  renderPage({ plannedWorkouts: [plan()], protocols: [protocol()], dailyActions: [dailyAction()] }, { expanded: false });
  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  const statusFor = (type) => summary.querySelector(`[data-schedule-item-type="${type}"] .trace-today-item-status`);
  expect(statusFor("workout")).toHaveTextContent("Planned");
  expect(statusFor("protocol")).toHaveTextContent("Scheduled");
  expect(statusFor("daily-action")).toHaveTextContent("Scheduled");
  [statusFor("workout"), statusFor("protocol"), statusFor("daily-action")].forEach((status) => {
    expect(status).toHaveClass("trace-today-item-status");
  });
});

test("adds a validated daily action through the prominent Today entry point", () => {
  const { createDailyAction, showToast } = renderPage({}, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Add to Today" }));

  expect(screen.getByRole("form", { name: "Add to Today" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Action type"), { target: { value: "appointment" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Annual physical" } });
  fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "window" } });
  fireEvent.change(screen.getByLabelText("Window start"), { target: { value: "09:00" } });
  fireEvent.change(screen.getByLabelText("Window end"), { target: { value: "11:00" } });
  fireEvent.change(screen.getByLabelText("Duration in minutes (optional)"), { target: { value: "60" } });
  fireEvent.change(screen.getByLabelText("Location (optional)"), { target: { value: "Family clinic" } });
  fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "Bring lab results" } });
  fireEvent.click(screen.getByRole("button", { name: "Save daily action" }));

  expect(createDailyAction).toHaveBeenCalledWith(expect.objectContaining({
    title: "Annual physical",
    actionType: "appointment",
    date: "2026-08-22",
    time: null,
    timeWindow: { start: "09:00", end: "11:00" },
    durationMinutes: "60",
    location: "Family clinic",
    notes: "Bring lab results",
  }));
  expect(showToast).toHaveBeenCalledWith("Added to Today.");
  expect(screen.queryByRole("form", { name: "Add to Today" })).not.toBeInTheDocument();
});

test("daily action validation preserves entered values and changed Cancel confirms discard", () => {
  const createDailyAction = jest.fn(() => ({
    status: "invalid",
    message: "Enter a valid action time.",
  }));
  const confirm = jest.spyOn(window, "confirm")
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  renderPage({ createDailyAction }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Add to Today" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Keep this value" } });
  fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "time" } });
  fireEvent.change(screen.getByLabelText("Time"), { target: { value: "09:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save daily action" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid action time.");
  expect(screen.getByLabelText("Title")).toHaveValue("Keep this value");
  expect(screen.getByLabelText("Time")).toHaveValue("09:00");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledWith("Cancel this daily action? Your unsaved changes will be lost.");
  expect(screen.getByRole("form", { name: "Add to Today" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form", { name: "Add to Today" })).not.toBeInTheDocument();
  confirm.mockRestore();
});

test("daily actions filter by local date and expose complete focused details", () => {
  renderPage({
    dailyActions: [
      dailyAction(),
      dailyAction({
        id: "daily-action:window",
        title: "Delivery window",
        actionType: "errand",
        time: null,
        timeWindow: { start: "09:00", end: "11:00" },
      }),
      dailyAction({ id: "daily-action:tomorrow", title: "Tomorrow errand", date: "2026-08-23" }),
    ],
  }, { expanded: false });

  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  expect(within(summary).getByText("Meeting")).toBeInTheDocument();
  expect(within(summary).getByText("Team check-in")).toBeInTheDocument();
  expect(within(summary).getByText(/10:00 AM/)).toBeInTheDocument();
  expect(within(summary).getByText(/9:00 AM.*11:00 AM/)).toBeInTheDocument();
  expect(within(summary).queryByText("Tomorrow errand")).not.toBeInTheDocument();

  fireEvent.click(within(summary).getByRole("button", { name: "Open daily action Team check-in" }));
  const detail = screen.getByRole("region", { name: "Daily action Team check-in" });
  expect(within(detail).getByText("Studio conference room")).toBeInTheDocument();
  expect(within(detail).getByText("Bring the launch notes")).toBeInTheDocument();
  expect(within(detail).getByText("30 minutes")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Focused event navigation" })).getByRole("button", { name: "Back to Today's Schedule" }));
  expect(screen.getByTestId("today-schedule-dashboard")).toHaveAttribute("data-expanded", "false");
});

test("a protocol summary opens focused protocol details and returns to the same dashboard state", () => {
  renderPage({ protocols: [protocol()] }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Open protocol B12" }));
  const detail = screen.getByRole("region", { name: "Protocol details B12" });
  expect(within(detail).getByText("Recovery protocol")).toBeInTheDocument();
  expect(within(detail).getByText("Rotate injection site")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Focused event navigation" })).getByRole("button", { name: "Back to Today's Schedule" }));
  expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
});

test("completes one protocol occurrence, keeps focused navigation, and schedules the recurrence next week", () => {
  const view = renderPage({ protocols: [protocol()] }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Open protocol B12" }));
  const navigation = screen.getByRole("navigation", { name: "Focused event navigation" });
  expect(within(navigation).getAllByRole("button").map(({ textContent }) => textContent)).toEqual([
    "Back to Timeline",
    "Back to Today's Schedule",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Complete" }));
  expect(view.completeProtocolOccurrence).toHaveBeenCalledWith(
    "protocol:today", "protocol-item:today", "2026-08-22"
  );

  view.rerenderPage({ protocolOccurrences: [protocolOccurrence("completed")] });
  expect(screen.getByRole("region", { name: "Protocol details B12" })).toHaveTextContent("Completed");
  expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Focused event navigation" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
  expect(within(screen.getByRole("region", { name: "Completed today" })).getByText("B12 · 1 mL"))
    .toBeInTheDocument();

  view.rerenderPage({ currentDate: new Date(2026, 7, 29, 12, 0, 0) });
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();
  const nextOccurrence = screen.getByRole("button", { name: "Open protocol B12" });
  expect(within(nextOccurrence).getByText("Scheduled")).toBeInTheDocument();
});

test("skips one protocol occurrence with a persisted reason and leaves it outside Completed today", () => {
  const view = renderPage({ protocols: [protocol()] }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Open protocol B12" }));
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  fireEvent.change(screen.getByLabelText("Skip reason"), { target: { value: "Other" } });
  fireEvent.change(screen.getByLabelText("Custom reason"), { target: { value: "Travel day" } });
  fireEvent.click(screen.getByRole("button", { name: "Save skip" }));
  expect(view.skipProtocolOccurrence).toHaveBeenCalledWith(
    "protocol:today", "protocol-item:today", "2026-08-22", "Other", "Travel day"
  );

  view.rerenderPage({ protocolOccurrences: [protocolOccurrence("skipped", {
    skipReason: "Other",
    customSkipReason: "Travel day",
  })] });
  expect(screen.getByRole("region", { name: "Protocol details B12" })).toHaveTextContent("Reason: Travel day");
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
  expect(screen.queryByRole("region", { name: "Completed today" })).not.toBeInTheDocument();
  const remaining = screen.getByRole("region", { name: "Remaining today" });
  expect(within(remaining).getByText("Skipped")).toBeInTheDocument();
});

test("workout, protocol, and manual focused views share the same top navigation", () => {
  renderPage({ plannedWorkouts: [plan()], protocols: [protocol()], dailyActions: [dailyAction()] }, { expanded: false });
  const assertNavigation = () => {
    const navigation = screen.getByRole("navigation", { name: "Focused event navigation" });
    expect(within(navigation).getAllByRole("button").map(({ textContent }) => textContent)).toEqual([
      "Back to Timeline",
      "Back to Today's Schedule",
    ]);
    fireEvent.click(within(navigation).getByRole("button", { name: "Back to Today's Schedule" }));
  };

  fireEvent.click(screen.getByRole("button", { name: "Open workout preview Upper Body" }));
  assertNavigation();
  fireEvent.click(screen.getByRole("button", { name: "Open protocol B12" }));
  assertNavigation();
  fireEvent.click(screen.getByRole("button", { name: "Open daily action Team check-in" }));
  assertNavigation();
  expect(screen.getByTestId("today-schedule-dashboard")).toBeInTheDocument();
});

test("focused daily actions support completion, skip cancellation/reason, edit, and delete", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const callbacks = renderPage({ dailyActions: [dailyAction()] }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Open daily action Team check-in" }));

  fireEvent.click(screen.getByRole("button", { name: "Complete" }));
  expect(callbacks.completeDailyAction).toHaveBeenCalledWith("daily-action:check-in");
  expect(callbacks.showToast).toHaveBeenCalledWith("Team check-in completed.");

  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(screen.getByRole("dialog", { name: "Skip Meeting Team check-in" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(callbacks.skipDailyAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  fireEvent.change(screen.getByLabelText("Skip reason"), { target: { value: "Other" } });
  fireEvent.change(screen.getByLabelText("Custom reason"), { target: { value: "Family commitment" } });
  fireEvent.click(screen.getByRole("button", { name: "Save skip" }));
  expect(callbacks.skipDailyAction).toHaveBeenCalledWith(
    "daily-action:check-in", "Other", "Family commitment"
  );

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("form", { name: "Edit daily action" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated check-in" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(callbacks.updateDailyAction).toHaveBeenCalledWith(
    "daily-action:check-in",
    expect.objectContaining({ title: "Updated check-in" })
  );

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(confirm).toHaveBeenCalled();
  expect(callbacks.deleteDailyAction).toHaveBeenCalledWith("daily-action:check-in");
  expect(callbacks.showToast).toHaveBeenCalledWith("Daily action deleted.");
  confirm.mockRestore();
});

test("completed and skipped daily actions remain visible with terminal status and persisted reason", () => {
  const completed = {
    ...dailyAction({ id: "daily-action:completed", title: "Completed errand" }),
    status: "completed",
    completedAt: "2026-08-22T18:00:00.000Z",
    updatedAt: "2026-08-22T18:00:00.000Z",
  };
  const skipped = {
    ...dailyAction({ id: "daily-action:skipped", title: "Skipped meeting" }),
    status: "skipped",
    skippedAt: "2026-08-22T18:30:00.000Z",
    skipReason: "Schedule conflict",
    updatedAt: "2026-08-22T18:30:00.000Z",
  };
  renderPage({ dailyActions: [completed, skipped] }, { expanded: false });
  const summary = screen.getByRole("list", { name: "Today's schedule summary" });
  const completedSummary = screen.getByRole("list", { name: "Completed today summary" });
  expect(within(completedSummary).getByText("Completed")).toBeInTheDocument();
  expect(within(summary).getByText("Skipped")).toBeInTheDocument();

  fireEvent.click(within(summary).getByRole("button", { name: "Open daily action Skipped meeting" }));
  expect(screen.getByText("Reason: Schedule conflict")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
});

test("expanding reveals complete workout and protocol details", () => {
  renderPage({
    plannedWorkouts: [plan({ notes: "Keep two reps in reserve" })],
    protocols: [protocol({ notes: "Follow the full recovery cycle" })],
    dailyActions: [dailyAction()],
  }, { expanded: false });

  fireEvent.click(screen.getByRole("button", { name: "Show details" }));

  expect(screen.getByTestId("today-schedule-dashboard")).toHaveAttribute("data-expanded", "true");
  expect(screen.getByText("Keep two reps in reserve")).toBeInTheDocument();
  const schedule = screen.getByRole("region", { name: "Today's actionable items" });
  const protocolCard = schedule.querySelector('[data-schedule-item-type="protocol"]');
  expect(within(protocolCard).getByRole("heading", { name: "B12" })).toBeInTheDocument();
  expect(within(protocolCard).getByText("1 mL")).toBeInTheDocument();
  expect(within(protocolCard).getByText("Subcutaneous (SC)")).toBeInTheDocument();
  expect(within(protocolCard).getByText("Saturday")).toBeInTheDocument();
  expect(within(protocolCard).getByText("Rotate injection site")).toBeInTheDocument();
  expect(within(protocolCard).getByText("Follow the full recovery cycle")).toBeInTheDocument();
  const dailyCard = schedule.querySelector('[data-schedule-item-type="daily-action"]');
  expect(within(dailyCard).getByRole("button", { name: "Open daily action Team check-in" })).toBeInTheDocument();
  expect(within(dailyCard).getByText("Studio conference room")).toBeInTheDocument();
  expect(within(dailyCard).getByText("Bring the launch notes")).toBeInTheDocument();
});

test("a collapsed workout schedule item opens the correct compact preview", () => {
  renderPage({
    plannedWorkouts: [
      plan({ id: "planned-workout:first", title: "First workout" }),
      plan({
        id: "planned-workout:correct",
        title: "Correct workout",
        notes: "Inspect me",
        exercises: [
          {
            id: "planned-exercise:row",
            name: "Chest-Supported Row",
            notes: "",
            targetSets: [
              { id: "planned-set:row-1", setType: "warm-up", reps: 10, load: { mode: "external", amount: 185, unit: "lb" }, notes: "" },
              { id: "planned-set:row-2", reps: 10, load: { mode: "external", amount: 185, unit: "lb" }, notes: "" },
            ],
          },
          {
            id: "planned-exercise:dip",
            name: "Chest Dip",
            notes: "",
            targetSets: [
              { id: "planned-set:dip-1", reps: 10, load: { mode: "bodyweight" }, notes: "" },
            ],
          },
        ],
      }),
    ],
  }, { expanded: false });

  fireEvent.click(screen.getByRole("button", { name: "Open workout preview Correct workout" }));

  const preview = screen.getByRole("region", { name: "Workout preview Correct workout" });
  expect(within(preview).getByRole("heading", { name: "Correct workout" })).toBeInTheDocument();
  expect(within(preview).getByText("Inspect me")).toBeInTheDocument();
  expect(within(preview).getByRole("heading", { name: "Chest-Supported Row" })).toBeInTheDocument();
  expect(within(preview).getByText("2 sets")).toBeInTheDocument();
  expect(within(preview).getByText("Warm-up · 185 lb × 10")).toBeInTheDocument();
  expect(within(preview).getByText("Working · 185 lb × 10")).toBeInTheDocument();
  expect(within(preview).getByRole("heading", { name: "Chest Dip" })).toBeInTheDocument();
  expect(within(preview).getByText("Working · Bodyweight × 10")).toBeInTheDocument();
  const volume = within(preview).getByRole("list", { name: "Workout set summary" });
  expect(volume).toHaveTextContent("3 total sets");
  expect(volume).toHaveTextContent("1 warm-up");
  expect(volume).toHaveTextContent("2 working");
  const actionRow = within(preview).getByTestId("workout-preview-actions");
  expect(within(actionRow).getAllByRole("button")).toHaveLength(3);
  expect(within(actionRow).getByRole("button", { name: "Start planned workout Correct workout" })).toBeInTheDocument();
  expect(within(actionRow).getByRole("button", { name: "Edit planned workout Correct workout" })).toBeInTheDocument();
  expect(within(actionRow).getByRole("button", { name: "Skip workout Correct workout" })).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Edit planned workout" })).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Focused event navigation" })).getByRole("button", { name: "Back to Today's Schedule" }));
  expect(screen.getByRole("region", { name: "Today's schedule" })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Open workout preview Correct workout" })[0]);
  fireEvent.click(within(screen.getByTestId("workout-preview-actions"))
    .getByRole("button", { name: "Edit planned workout Correct workout" }));
  expect(screen.getByRole("form", { name: "Edit planned workout" })).toBeInTheDocument();
  expect(screen.getByLabelText("Planned workout title")).toHaveValue("Correct workout");
});

test("Cancel confirms unsaved planning changes and keeps the editor open when declined", () => {
  const confirm = jest.spyOn(window, "confirm")
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), {
    target: { value: "Unsaved workout" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledWith(
    "Cancel planning this workout? Your unsaved changes will be lost."
  );
  expect(screen.getByRole("form", { name: "Create planned workout" })).toBeInTheDocument();
  expect(screen.getByLabelText("Planned workout title")).toHaveValue("Unsaved workout");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form", { name: "Create planned workout" })).not.toBeInTheDocument();
  confirm.mockRestore();
});

test("Cancel closes an unchanged planner without confirmation", () => {
  const confirm = jest.spyOn(window, "confirm");
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.queryByRole("form", { name: "Create planned workout" })).not.toBeInTheDocument();
  confirm.mockRestore();
});

test("planning multiple sets preserves each intended reps and intended weight", () => {
  const { createPlannedWorkout } = renderPage();
  openCreateAndFillBasics();
  expect(screen.queryByText("Optional targets")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add target set to exercise 1" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  expect(screen.getByLabelText("Exercise 1 target set 1 intended weight")).toHaveAttribute("placeholder", "Enter weight");
  expect(screen.getByRole("button", { name: "Add target set after set 1 in exercise 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove target set 1 from exercise 1" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add target set after set 1 in exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 type"), { target: { value: "warm-up" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended reps"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended load"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended weight"), { target: { value: "95" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 2 intended reps"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 2 intended load"), { target: { value: "external" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 2 intended weight"), { target: { value: "155" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));

  expect(createPlannedWorkout.mock.calls[0][0].exercises[0].targetSets).toEqual([
    expect.objectContaining({ setType: "warm-up", reps: "10", load: expect.objectContaining({ amount: "95" }) }),
    expect.objectContaining({ setType: "working", reps: "6", load: expect.objectContaining({ amount: "155" }) }),
  ]);
  expect(screen.queryByText(/Intended amount/i)).not.toBeInTheDocument();
});

test("a new target set inherits the previous intended load, weight, and unit but keeps its own set type", () => {
  renderPage();
  openCreateAndFillBasics();
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 type"), { target: { value: "warm-up" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended weight"), { target: { value: "42.5" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 unit"), { target: { value: "kg" } });
  fireEvent.click(screen.getByRole("button", { name: "Add target set after set 1 in exercise 1" }));

  expect(screen.getByLabelText("Exercise 1 target set 2 intended load")).toHaveValue("external");
  expect(screen.getByLabelText("Exercise 1 target set 2 intended weight")).toHaveValue(42.5);
  expect(screen.getByLabelText("Exercise 1 target set 2 unit")).toHaveValue("kg");
  expect(screen.getByLabelText("Exercise 1 target set 1 type")).toHaveValue("warm-up");
  expect(screen.getByLabelText("Exercise 1 target set 2 type")).toHaveValue("working");
});

test("saves a planner exercise through the existing reusable-exercise service without changing the plan", () => {
  const { saveExerciseDefinitions, createPlannedWorkout, showToast } = renderPage();
  openCreateAndFillBasics({ exerciseName: "Chest-Supported Row" });
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended weight"), { target: { value: "185" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 unit"), { target: { value: "lb" } });
  fireEvent.click(screen.getByRole("button", { name: "Save exercise 1 as reusable" }));

  expect(saveExerciseDefinitions).toHaveBeenCalledWith([{
    name: "Chest-Supported Row",
    defaultLoadMode: "external",
    defaultWeightUnit: "lb",
  }]);
  expect(showToast).toHaveBeenCalledWith("Chest-Supported Row saved as a reusable exercise.");
  expect(createPlannedWorkout).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Planned workout title")).toHaveValue("Push Day");
  expect(screen.getByLabelText("Exercise 1 target set 1 intended weight")).toHaveValue(185);
});

test("Skip workout uses the reason overlay and shows skipped status without completion", () => {
  const planned = plan();
  const { skipPlannedWorkout, rerenderPage, openCompletedWorkout } = renderPage({
    plannedWorkouts: [planned],
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Open workout preview Upper Body" })[0]);

  fireEvent.click(screen.getByRole("button", { name: "Skip workout Upper Body" }));
  const reasonDialog = screen.getByRole("dialog", { name: "Skip workout Upper Body" });
  expect(skipPlannedWorkout).not.toHaveBeenCalled();
  expect(within(reasonDialog).getByText("Why are you skipping this workout?")).toBeInTheDocument();
  const skipActions = within(reasonDialog).getByRole("button", { name: "Save skip" }).parentElement;
  expect(skipActions).toHaveClass("trace-skip-reason__actions");
  expect(within(skipActions).getAllByRole("button")).toHaveLength(3);
  fireEvent.change(within(reasonDialog).getByLabelText("Skip reason"), { target: { value: "Low energy" } });
  fireEvent.click(within(reasonDialog).getByRole("button", { name: "Save skip" }));
  expect(skipPlannedWorkout).toHaveBeenCalledWith("planned-workout:today", "2026-08-22", "Low energy");
  rerenderPage({ plannedWorkouts: [{ ...planned, skippedDates: ["2026-08-22"], skipReasons: { "2026-08-22": "Low energy" } }] });
  const preview = screen.getByRole("region", { name: "Workout preview Upper Body" });
  expect(within(preview).getAllByText("Skipped")[0]).toHaveClass("trace-today-item-status");
  expect(within(preview).getByRole("button", { name: "Start planned workout Upper Body" })).toBeInTheDocument();
  expect(within(preview).getByRole("button", { name: "Skip workout Upper Body" })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Focused event navigation" })).getByRole("button", { name: "Back to Today's Schedule" }));
  expect(screen.getAllByText("Skipped")[0]).toHaveClass("trace-today-item-status");
  expect(screen.getByText("Skipped for today · Low energy")).toBeInTheDocument();
  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Start workout Upper Body" })).toBeInTheDocument();
  expect(openCompletedWorkout).not.toHaveBeenCalled();
});

test("whole-workout skip accepts a custom reason and keeps its actions contained at 390px", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const { skipPlannedWorkout } = renderPage({ plannedWorkouts: [plan()] }, { expanded: false });
  fireEvent.click(screen.getByRole("button", { name: "Open workout preview Upper Body" }));
  fireEvent.click(screen.getByRole("button", { name: "Skip workout Upper Body" }));

  const dialog = screen.getByRole("dialog", { name: "Skip workout Upper Body" });
  expect(dialog.parentElement).toHaveClass("trace-skip-overlay");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  fireEvent.change(within(dialog).getByLabelText("Skip reason"), { target: { value: "Other" } });
  fireEvent.change(within(dialog).getByLabelText("Custom reason"), { target: { value: "Travel day" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save skip" }));

  expect(skipPlannedWorkout).toHaveBeenCalledWith(
    "planned-workout:today",
    "2026-08-22",
    "Travel day"
  );
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});
