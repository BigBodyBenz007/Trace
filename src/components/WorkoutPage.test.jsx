import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import WorkoutPage from "./WorkoutPage";
import { createExerciseDefinition } from "../services/exerciseCatalog";
import { createPlannedWorkout } from "../services/plannedWorkout";
import {
  createWorkoutDraftFromTemplate,
  createWorkoutDraftFromPlannedWorkout,
  WORKOUT_DRAFT_STORAGE_KEY,
} from "../services/workoutDraft";
import { PHOTO_SELECTION_RESULT_STATUS } from "../services/photoSelectionAdapter";
import { APP_LIFECYCLE_PHASE } from "../services/appLifecycleAdapter";
import {
  createWorkoutTemplate,
  workoutTemplateDraftFromWorkoutEntry,
} from "../services/workoutTemplate";

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  localStorage.clear();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  Element.prototype.scrollIntoView = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    top: 100,
    bottom: 150,
    left: 0,
    right: 300,
    width: 300,
    height: 50,
    x: 0,
    y: 100,
    toJSON: () => {},
  }));
  URL.createObjectURL = jest.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = jest.fn();
});

async function storedDraft() {
  await waitFor(() =>
    expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull()
  );
  return JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
}

function lifecycleHarness() {
  const subscribers = new Set();
  return {
    adapter: {
      subscribe: jest.fn((subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      }),
    },
    emit(phase, persisted = false) {
      Array.from(subscribers).forEach((subscriber) => subscriber({ phase, persisted }));
    },
  };
}

function openWorkoutLogger() {
  const button = screen.queryByRole("button", { name: "Log Workout" });
  if (button) fireEvent.click(button);
}

function submitWorkout() {
  const reviewButton = screen.queryByRole("button", {
    name: /^(Finish|Review) Workout$/,
  });
  if (reviewButton) fireEvent.click(reviewButton);
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
}

test("defaults to a history-oriented page and opens Log Workout with accessible focus", async () => {
  render(<WorkoutPage {...renderPageProps({ workoutEntries: [entry()] })} />);

  expect(screen.getByRole("heading", { name: "Workout History" })).toBeInTheDocument();
  expect(screen.getByText("Chest Day")).toBeInTheDocument();
  expect(document.querySelector(".trace-workout-form")).toBeNull();
  expect(screen.queryByLabelText("Workout title")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Log Workout" }));
  expect(screen.getByRole("heading", { name: "Log Workout" })).toHaveFocus();
  expect(screen.getByLabelText("Workout title")).toBeInTheDocument();
  expect(screen.queryByLabelText("Approximate workout duration")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Expand workout: Chest Day" }))
    .toHaveAttribute("aria-expanded", "false");

  const persisted = await storedDraft();
  expect(persisted.form.timingMode).toBe("live");
  expect(new Date(persisted.startedAt).getTime()).not.toBeNaN();
});

test("live timing persists across a remount and keeps entered duration separate from elapsed time", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-01T15:00:00.000Z"));
  try {
    const first = render(<WorkoutPage {...renderPageProps()} />);
    openWorkoutLogger();
    fillFirstSet();
    const persisted = await storedDraft();
    expect(persisted.startedAt).toBe("2026-09-01T15:00:00.000Z");
    first.unmount();

    jest.setSystemTime(new Date("2026-09-01T15:42:00.000Z"));
    const props = renderPageProps();
    render(<WorkoutPage {...props} />);
    expect(screen.getByLabelText("Workout title")).toHaveValue("Chest Day");
    fireEvent.click(screen.getByRole("button", { name: "Finish Workout" }));
    expect(screen.getByLabelText("Approximate workout duration")).toHaveValue(null);
    expect(screen.getByText(/records elapsed time from start to finish separately/i))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Approximate workout duration"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByLabelText("Calories Burned"), {
      target: { value: "315" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

    expect(props.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
      startedAt: "2026-09-01T15:00:00.000Z",
      finishedAt: "2026-09-01T15:42:00.000Z",
      activeDurationMinutes: 40,
      caloriesBurned: 315,
    }));
    expect(screen.getByRole("button", { name: "Log Workout" })).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test("a live workout can omit approximate duration while preserving recorded timestamps", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-01T15:00:00.000Z"));
  try {
    const props = renderPage();
    fillFirstSet();
    jest.setSystemTime(new Date("2026-09-01T15:01:12.000Z"));
    submitWorkout();

    expect(props.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
      startedAt: "2026-09-01T15:00:00.000Z",
      finishedAt: "2026-09-01T15:01:12.000Z",
    }));
    expect(props.saveWorkoutEntry.mock.calls[0][0]).not.toHaveProperty("activeDurationMinutes");
  } finally {
    jest.useRealTimers();
  }
});

test("historical logging accepts manual results without fabricated elapsed timing", () => {
  const props = renderPage();
  fireEvent.click(screen.getByLabelText("Log a completed or historical workout"));
  fillFirstSet();
  fireEvent.click(screen.getByRole("button", { name: "Review Workout" }));
  expect(screen.getByLabelText("Approximate workout duration")).toHaveValue(null);
  fireEvent.change(screen.getByLabelText("Approximate workout duration"), {
    target: { value: "55.5" },
  });
  fireEvent.change(screen.getByLabelText("Calories Burned"), {
    target: { value: "420" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  const saved = props.saveWorkoutEntry.mock.calls[0][0];
  expect(saved).toMatchObject({ activeDurationMinutes: 55.5, caloriesBurned: 420 });
  expect(saved).not.toHaveProperty("startedAt");
  expect(saved).not.toHaveProperty("finishedAt");
});

test("saved Calories Burned remains visible and editable in Workout History", () => {
  const props = renderPage({ workoutEntries: [entry({ caloriesBurned: 420 })] });
  const card = expandWorkout();
  expect(within(card).getByText("Calories Burned")).toBeInTheDocument();
  expect(within(card).getByText("420 kcal")).toBeInTheDocument();
  fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Calories Burned")).toHaveValue(420);
  fireEvent.change(screen.getByLabelText("Calories Burned"), { target: { value: "430" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(
    "workout-1",
    expect.objectContaining({ caloriesBurned: 430 })
  );
});

test("opening Log Workout uses instant scrolling when Motion & Effects is reduced", () => {
  render(
    <div className="trace-app-shell" data-motion="reduced">
      <WorkoutPage {...renderPageProps()} />
    </div>
  );
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Log Workout" }));
  expect(screen.getByRole("heading", { name: "Log Workout" })).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "auto",
    block: "start",
  });
});

test("persists new-workout changes and restores the original start and form state", async () => {
  const first = render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  const originalDate = screen.getByLabelText("Date").value;
  const originalTime = screen.getByLabelText("Time").value;
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Survives reload" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Squat" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 notes"), { target: { value: "Deep" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "225" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 notes"), { target: { value: "Solid" } });
  fireEvent.click(screen.getByRole("button", { name: "Finish Workout" }));
  fireEvent.change(screen.getByLabelText("Approximate workout duration"), { target: { value: "48" } });
  fireEvent.change(screen.getByLabelText("Workout intensity"), { target: { value: "moderate" } });

  await waitFor(() => {
    const stored = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
    expect(stored.form.exercises[0].sets[0].notes).toBe("Solid");
    expect(stored.form.activeDurationMinutes).toBe("48");
    expect(stored.form.intensity).toBe("moderate");
  });
  const draft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(draft).toMatchObject({
    schemaVersion: 1,
    form: {
      title: "Survives reload",
      date: originalDate,
      time: originalTime,
      activeDurationMinutes: "48",
      intensity: "moderate",
    },
  });
  expect(draft.form.exercises[0]).toMatchObject({
    name: "Squat", notes: "Deep", sets: [expect.objectContaining({ reps: "5", weightAmount: "225", notes: "Solid" })],
  });

  first.unmount();
  render(<WorkoutPage {...renderPageProps()} />);
  expect(screen.getByLabelText("Workout title")).toHaveValue("Survives reload");
  expect(screen.getByLabelText("Date")).toHaveValue(originalDate);
  expect(screen.getByLabelText("Time")).toHaveValue(originalTime);
  expect(screen.getByLabelText("Approximate workout duration")).toHaveValue(48);
  expect(screen.getByLabelText("Workout intensity")).toHaveValue("moderate");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(225);
}, 10000);

test("background lifecycle flushes the latest active draft with its exact startedAt", () => {
  const lifecycle = lifecycleHarness();
  renderPage({ lifecycleAdapter: lifecycle.adapter });
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Latest background workout" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "Background squat" },
  });

  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);

  const firstPersistedBytes = localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY);
  const firstPersisted = JSON.parse(firstPersistedBytes);
  expect(firstPersisted.form).toMatchObject({
    title: "Latest background workout",
    exercises: [expect.objectContaining({ name: "Background squat" })],
  });
  const exactStartedAt = firstPersisted.startedAt;

  const storageWrite = jest.spyOn(Storage.prototype, "setItem");
  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);
  lifecycle.emit(APP_LIFECYCLE_PHASE.SUSPENDING, true);
  lifecycle.emit(APP_LIFECYCLE_PHASE.ACTIVE);
  lifecycle.emit(APP_LIFECYCLE_PHASE.RESUMED, true);

  expect(storageWrite).not.toHaveBeenCalled();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBe(firstPersistedBytes);
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).startedAt).toBe(exactStartedAt);
});

test("lifecycle events do not create a draft when no workout is active", () => {
  const lifecycle = lifecycleHarness();
  render(<WorkoutPage {...renderPageProps({ lifecycleAdapter: lifecycle.adapter })} />);

  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);
  lifecycle.emit(APP_LIFECYCLE_PHASE.SUSPENDING);

  expect(lifecycle.adapter.subscribe).not.toHaveBeenCalled();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
});

test("lifecycle flush never overwrites a newer persisted workout draft", () => {
  const lifecycle = lifecycleHarness();
  renderPage({ lifecycleAdapter: lifecycle.adapter });
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Older in-memory workout" },
  });
  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);
  const inMemoryDraft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  const newerDraft = {
    ...inMemoryDraft,
    updatedAt: "2099-01-01T00:00:00.000Z",
    form: { ...inMemoryDraft.form, title: "Newer persisted workout" },
  };
  const newerDraftBytes = JSON.stringify(newerDraft);
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, newerDraftBytes);

  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Stale component update" },
  });
  lifecycle.emit(APP_LIFECYCLE_PHASE.SUSPENDING);

  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBe(newerDraftBytes);
  expect(screen.getByLabelText("Workout title")).toHaveValue("Stale component update");
});

test("explains approximate workout duration as first-to-last set time with normal rests", () => {
  render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  fireEvent.click(screen.getByRole("button", { name: "Finish Workout" }));
  const durationInput = screen.getByLabelText("Approximate workout duration");
  const durationLabel = durationInput.closest("label");

  expect(durationInput).not.toHaveAttribute("placeholder");
  expect(durationLabel).toHaveTextContent("Approximate workout duration");
  expect(durationLabel).toHaveTextContent(
    "From your first set to your last, including normal rest between sets. Exclude long interruptions."
  );
});

test("ordinary unmount keeps a draft while explicit discard clears it", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const view = render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Keep me" } });
  await storedDraft();
  view.unmount();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull();

  render(<WorkoutPage {...renderPageProps()} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalled();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
});

test("successful save clears a restored draft and does not duplicate the workout", async () => {
  const initial = render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  fillFirstSet();
  await storedDraft();
  initial.unmount();

  const props = renderPageProps();
  render(<WorkoutPage {...props} />);
  submitWorkout();
  expect(props.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  expect(props.showToast).toHaveBeenCalledWith("Workout traced", undefined);
});

test("restores planned prefills and saves one normal entry with its backlink", () => {
  const plan = plannedExecution();
  const draft = createWorkoutDraftFromPlannedWorkout(
    plan,
    new Date(2026, 7, 22, 14, 25)
  );
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  const view = renderPage();

  expect(screen.getByRole("form", { name: "Workout roadmap" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Planned Push" })).toBeInTheDocument();
  expect(screen.getByText("Plan notes")).toBeInTheDocument();
  const exercise = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" });
  expect(within(exercise).getByText("1 planned set")).toBeInTheDocument();
  expect(within(exercise).getByText("Warm-up · 60 kg × 8")).toBeInTheDocument();
  expect(screen.queryByLabelText("Approximate workout duration")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Workout intensity")).not.toBeInTheDocument();
  const volume = screen.getByRole("list", { name: "Workout set summary" });
  expect(volume).toHaveTextContent("1 total set");
  expect(volume).toHaveTextContent("1 warm-up");
  expect(volume).toHaveTextContent("0 working");
  fireEvent.click(within(exercise).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(8);
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(60);
  expect(screen.getByLabelText("Exercise 1 set 1 weight unit")).toHaveValue("kg");
  expect(screen.getByLabelText("Exercise 1 set 1 type")).toHaveValue("warm-up");
  expect(screen.getByLabelText("Exercise 1 set 1 notes")).toHaveValue("Target notes");
  fireEvent.click(within(exercise).getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Workout" }));
  fireEvent.change(screen.getByLabelText("Approximate workout duration"), { target: { value: "38" } });
  fireEvent.change(screen.getByLabelText("Workout intensity"), { target: { value: "high" } });
  submitWorkout();
  expect(view.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(view.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
    plannedWorkoutId: plan.id,
    title: plan.title,
    activeDurationMinutes: 38,
    intensity: "high",
  }));
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
});

test("keeps Roadmap actions compact, edits one exercise, and persists skip details only in the active draft", async () => {
  const plan = plannedExecution();
  const savedPlan = JSON.stringify([plan]);
  localStorage.setItem("plannedWorkouts", savedPlan);
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(plan, new Date(2026, 7, 22, 14, 25))
  ));
  renderPage();

  const exercise = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" });
  const actions = within(exercise).getByLabelText("Dumbbell Bench Press roadmap actions");
  expect(within(actions).getAllByRole("button")).toHaveLength(3);
  fireEvent.click(within(actions).getByRole("button", { name: "Completed" }));
  expect(exercise).toHaveAttribute("data-roadmap-status", "completed");
  fireEvent.click(within(actions).getByRole("button", { name: "Completed" }));

  fireEvent.click(within(actions).getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("region", { name: "Edit Dumbbell Bench Press sets" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "9" } });
  fireEvent.click(within(actions).getByRole("button", { name: "Skipped" }));
  const reason = screen.getByRole("region", { name: "Skip reason for Dumbbell Bench Press" });
  fireEvent.change(within(reason).getByLabelText("Optional reason"), { target: { value: "Pain or discomfort" } });
  fireEvent.click(within(reason).getByRole("button", { name: "Save skipped exercise" }));
  expect(exercise).toHaveAttribute("data-roadmap-status", "skipped");
  expect(within(exercise).getByText("Reason: Pain or discomfort")).toBeInTheDocument();

  await waitFor(() => {
    const stored = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
    expect(stored).toMatchObject({
      plannedWorkoutId: plan.id,
      form: {
        exercises: [
          {
            name: "Dumbbell Bench Press",
            roadmapStatus: "skipped",
            roadmapSkipReason: "Pain or discomfort",
            sets: [expect.objectContaining({ reps: "9" })],
          },
        ],
      },
    });
  });
  expect(localStorage.getItem("plannedWorkouts")).toBe(savedPlan);
});

test("Roadmap expands only one exercise editor and remains contained at 390px", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const firstPlan = plannedExecution();
  const plan = createPlannedWorkout({
    ...firstPlan,
    id: "planned-workout:two-exercises",
    exercises: [
      firstPlan.exercises[0],
      {
        id: "planned-exercise:dip",
        name: "Chest Dip With A Deliberately Long Exercise Name",
        notes: "",
        targetSets: [{
          id: "planned-set:dip",
          reps: 10,
          load: { mode: "bodyweight" },
          notes: "",
        }],
      },
    ],
  }, new Date("2026-08-20T12:00:00.000Z"));
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(plan, new Date(2026, 7, 22, 14, 25))
  ));
  renderPage();

  const volume = screen.getByRole("list", { name: "Workout set summary" });
  expect(volume).toHaveTextContent("2 total sets");
  expect(volume).toHaveTextContent("1 warm-up");
  expect(volume).toHaveTextContent("1 working");

  const first = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" });
  const second = screen.getByRole("article", { name: "Roadmap exercise Chest Dip With A Deliberately Long Exercise Name" });
  fireEvent.click(within(first).getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("region", { name: "Edit Dumbbell Bench Press sets" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Edit Chest Dip With A Deliberately Long Exercise Name sets" })).not.toBeInTheDocument();

  fireEvent.click(within(second).getByRole("button", { name: "Edit" }));
  expect(screen.queryByRole("region", { name: "Edit Dumbbell Bench Press sets" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Edit Chest Dip With A Deliberately Long Exercise Name sets" })).toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});

test("a Today-origin Roadmap provides standardized Today navigation and returns there after all exercises are handled and saved", () => {
  const plan = plannedExecution();
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(
      plan,
      new Date(2026, 7, 22, 14, 25),
      { originPage: "today" }
    )
  ));
  const onReturnToToday = jest.fn();
  const view = renderPage({ onReturnToToday });

  expect(screen.getByTestId("workout-page")).toHaveAttribute("data-focused-workout", "true");
  expect(screen.queryByRole("heading", { name: "Workout Templates" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Workout History" })).not.toBeInTheDocument();
  const navigation = screen.getByRole("navigation", { name: "Focused event navigation" });
  expect(within(navigation).getByRole("button", { name: "Back to Timeline" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Back to Today's Schedule" })).toHaveLength(2);
  expect(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Edit" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("region", { name: "Edit Dumbbell Bench Press sets" }))
    .not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Today's Schedule" })[0]);
  expect(onReturnToToday).toHaveBeenCalledTimes(1);
  fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Completed" }));
  submitWorkout();

  expect(view.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(onReturnToToday).toHaveBeenCalledTimes(2);
});

test("a Calendar-origin Roadmap exposes calendar navigation and returns there after completion", () => {
  const plan = plannedExecution();
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(
      plan,
      new Date(2026, 7, 22, 14, 25),
      { originPage: "calendar", selectedDate: "2026-08-22", visibleMonth: "2026-08" }
    )
  ));
  const onReturnToCalendar = jest.fn();
  const view = renderPage({ onReturnToCalendar });

  expect(screen.getAllByRole("button", { name: "Back to Calendar" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Calendar" })[0]);
  expect(onReturnToCalendar).toHaveBeenCalledTimes(1);

  fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Completed" }));
  submitWorkout();
  expect(view.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(onReturnToCalendar).toHaveBeenCalledTimes(2);
});

test("discarding a planned-workout draft does not complete or change its plan", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const plan = plannedExecution();
  const savedPlan = JSON.stringify([plan]);
  localStorage.setItem("plannedWorkouts", savedPlan);
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(plan, new Date(2026, 7, 22, 14, 25))
  ));
  const view = renderPage();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(view.saveWorkoutEntry).not.toHaveBeenCalled();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem("plannedWorkouts")).toBe(savedPlan);
  confirm.mockRestore();
});

test("saving a restored draft records its original start and actual finish", () => {
  const startedAt = "2026-08-09T18:30:00.000Z";
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    startedAt,
    updatedAt: startedAt,
    form: {
      title: "Restored workout",
      date: "2026-08-09",
      time: "13:30",
      notes: "",
      exercises: [{
        id: "exercise-restored",
        name: "Squat",
        notes: "",
        sets: [{ id: "set-restored", reps: "5", loadMode: "external", weightAmount: "225", weightUnit: "lb", notes: "", isUntouched: false }],
      }],
    },
    context: { activeSearchExerciseId: null },
  }));
  jest.useFakeTimers().setSystemTime(new Date("2026-08-09T19:35:00.000Z"));
  try {
    const props = renderPage();
    submitWorkout();
    expect(props.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
      startedAt,
      finishedAt: "2026-08-09T19:35:00.000Z",
    }));
    expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

test("unmount does not add finish timing and a failed save retains the draft", async () => {
  const view = render(<WorkoutPage {...renderPageProps()} />);
  fillFirstSet();
  const draft = await storedDraft();
  expect(draft).not.toHaveProperty("finishedAt");
  view.unmount();
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY))).not.toHaveProperty("finishedAt");

  const props = renderPage({ saveWorkoutEntry: jest.fn(() => false) });
  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0]).toHaveProperty("finishedAt");
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull();
});

test("editing a saved workout neither restores into nor clears the new-workout draft", async () => {
  const initial = render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "New draft" } });
  await storedDraft();
  initial.unmount();

  const props = renderPageProps({ workoutEntries: [entry()] });
  render(<WorkoutPage {...props} />);
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Edited history" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(props.saveWorkoutEntry).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.title).toBe("New draft");
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  window.scrollTo = originalScrollTo;
  jest.restoreAllMocks();
});

test("existing saved duration values load unchanged while legacy workouts remain unspecified", () => {
  const props = renderPageProps({
    workoutEntries: [entry({ activeDurationMinutes: 55.5, intensity: "light" })],
  });
  const firstView = render(<WorkoutPage {...props} />);
  const card = expandWorkout();
  expect(within(card).getByText("Approximate workout duration")).toBeInTheDocument();
  expect(within(card).getByText("55.5 min")).toBeInTheDocument();
  expect(within(card).getByText("Light")).toBeInTheDocument();
  fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Approximate workout duration")).toHaveValue(55.5);
  expect(screen.getByLabelText("Workout intensity")).toHaveValue("light");
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Updated title only" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(
    "workout-1",
    expect.objectContaining({ activeDurationMinutes: 55.5, intensity: "light" })
  );

  firstView.unmount();
  props.updateWorkoutEntry.mockClear();
  const savedWithElapsedOnly = entry({
    id: "legacy-workout",
    startedAt: "2026-08-09T18:00:00.000Z",
    finishedAt: "2026-08-09T19:00:00.000Z",
  });
  const { unmount } = render(<WorkoutPage {...renderPageProps({ workoutEntries: [savedWithElapsedOnly] })} />);
  expect(screen.queryByLabelText("Approximate workout duration")).not.toBeInTheDocument();
  const legacyCard = expandWorkout("Chest Day");
  fireEvent.click(within(legacyCard).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Approximate workout duration")).toHaveValue(null);
  expect(screen.getByLabelText("Workout intensity")).toHaveValue("");
  unmount();
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

function calorieEstimate(overrides = {}) {
  return {
    schemaVersion: 1,
    estimateKind: "broad-estimate",
    status: "calculated",
    code: null,
    estimatorMethodName: "trace-workout-calorie-range",
    estimatorMethodVersion: 2,
    estimatedAt: "2026-08-09T20:00:00.000Z",
    bodyWeightKg: 80,
    sourceHealthWeightEntryId: "health-1",
    age: 35,
    ageBasis: "adult",
    activeDurationMinutes: 60,
    durationSource: "entered",
    selectedIntensity: "moderate",
    confidence: { level: "moderate", uncertaintyReasons: [] },
    requiredInputs: { bodyWeight: "provided", activeDuration: "provided" },
    optionalInputs: { age: "provided", intensity: "provided" },
    inputFingerprint: "workout-calorie-input-v1:test",
    inputSummary: { completedSegments: 1 },
    lowerKcal: 300,
    upperKcal: 440,
    ...overrides,
  };
}

function renderPageProps(overrides = {}) {
  return {
    onBack: jest.fn(),
    workoutEntries: [],
    saveWorkoutEntry: jest.fn(() => true),
    showToast: jest.fn(),
    saveExerciseDefinitions: jest.fn(() => []),
    updateSavedExercise: jest.fn(() => ({ status: "updated" })),
    updateWorkoutEntry: jest.fn(() => true),
    deleteWorkoutEntry: jest.fn(() => true),
    saveWorkoutTemplate: jest.fn(() => ({ status: "saved" })),
    updateWorkoutTemplate: jest.fn(() => ({ status: "saved" })),
    deleteWorkoutTemplate: jest.fn(() => true),
    startWorkoutTemplate: jest.fn(() => ({ status: "started" })),
    scheduleWorkoutTemplate: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };
}

function renderPage(overrides = {}) {
  const props = renderPageProps(overrides);
  render(<WorkoutPage {...props} />);
  openWorkoutLogger();
  return props;
}

function workoutTemplate(overrides = {}) {
  return {
    ...createWorkoutTemplate(
      workoutTemplateDraftFromWorkoutEntry(entry({ title: "ARMegddon" })),
      new Date("2026-09-04T12:00:00.000Z")
    ),
    ...overrides,
  };
}

test("saves a completed workout as an editable template without changing history", () => {
  const source = entry({ title: "ARMegddon" });
  const props = renderPageProps({ workoutEntries: [source] });
  render(<WorkoutPage {...props} />);
  const card = expandWorkout("ARMegddon");

  fireEvent.click(within(card).getByRole("button", { name: "Save as Template" }));
  const dialog = screen.getByRole("dialog", { name: "Save Workout as Template" });
  expect(within(dialog).getByLabelText("Template name")).toHaveValue("ARMegddon");
  expect(within(dialog).getByLabelText("Target reps")).toHaveValue(10);
  expect(within(dialog).getByLabelText("Target weight")).toHaveValue(70.5);
  fireEvent.change(within(dialog).getByLabelText("Template name"), {
    target: { value: "ARMegddon reusable" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Create Template" }));

  expect(props.saveWorkoutTemplate).toHaveBeenCalledWith(expect.objectContaining({
    name: "ARMegddon reusable",
    exercises: [expect.objectContaining({
      name: "Incline Press",
      targetSets: [expect.objectContaining({
        reps: 10,
        load: { mode: "external", amount: 70.5, unit: "lb" },
      })],
    })],
  }));
  expect(source.title).toBe("ARMegddon");
  expect(screen.queryByRole("dialog", { name: "Save Workout as Template" })).not.toBeInTheDocument();
});

test("template creation reports duplicate names and Escape cancellation creates nothing", () => {
  const saveWorkoutTemplate = jest.fn(() => ({
    status: "duplicate",
    message: "A workout template with that name already exists. Choose a different name.",
  }));
  const props = renderPageProps({ workoutEntries: [entry({ title: "ARMegddon" })], saveWorkoutTemplate });
  const confirmCancel = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    render(<WorkoutPage {...props} />);
    const card = expandWorkout("ARMegddon");
    const createButton = within(card).getByRole("button", { name: "Save as Template" });
    fireEvent.click(createButton);
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    expect(screen.getByRole("alert")).toHaveTextContent("already exists");
    expect(screen.getByRole("dialog", { name: "Save Workout as Template" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Changed" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(saveWorkoutTemplate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Save Workout as Template" })).not.toBeInTheDocument();
    expect(createButton).toHaveFocus();
  } finally {
    confirmCancel.mockRestore();
  }
});

test("keeps templates compact and provides start, schedule, edit, and confirmed delete actions", () => {
  const saved = workoutTemplate();
  const props = renderPageProps({ workoutTemplates: [saved] });
  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  try {
    render(<WorkoutPage {...props} />);
    expect(screen.queryByText("Incline Press")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show templates" }));
    expect(screen.getByText("1 exercise · 1 planned set")).toBeInTheDocument();
    expect(screen.getByText("Incline Press")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Now" }));
    expect(props.startWorkoutTemplate).toHaveBeenCalledWith(saved.id, null);
    fireEvent.click(screen.getByRole("button", { name: "Schedule Workout" }));
    expect(props.scheduleWorkoutTemplate).toHaveBeenCalledWith(saved.id);

    fireEvent.click(screen.getByRole("button", { name: "Edit Template" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Workout Template" });
    fireEvent.change(within(dialog).getByLabelText("Template name"), { target: { value: "Edited ARMegddon" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Template" }));
    expect(props.updateWorkoutTemplate).toHaveBeenCalledWith(
      saved.id,
      expect.objectContaining({ name: "Edited ARMegddon" })
    );
    expect(saved.name).toBe("ARMegddon");

    fireEvent.click(screen.getByRole("button", { name: "Delete Template" }));
    expect(props.deleteWorkoutTemplate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete Template" }));
    expect(props.deleteWorkoutTemplate).toHaveBeenCalledWith(saved.id);
    expect(screen.getByRole("button", { name: "Hide templates" })).toHaveFocus();
  } finally {
    confirmSpy.mockRestore();
  }
});

test("a template-origin draft uses the focused editor and returns without discarding progress", async () => {
  const saved = workoutTemplate();
  const draft = createWorkoutDraftFromTemplate(
    saved,
    new Date(2026, 8, 4, 12, 30),
    { originPage: "workout-templates", originTemplateId: saved.id }
  );
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  const onReturnToWorkoutTemplates = jest.fn();
  render(<WorkoutPage {...renderPageProps({
    workoutEntries: [entry()],
    workoutTemplates: [saved],
    onReturnToWorkoutTemplates,
  })} />);

  expect(screen.getByTestId("workout-page")).toHaveAttribute("data-focused-workout", "true");
  expect(screen.getByRole("form", { name: "Active workout" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Workout in Progress" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Back to Workout Templates" })).toBeInTheDocument();
  expect(screen.getByLabelText("Workout title")).toHaveValue("ARMegddon");
  expect(screen.getByRole("button", { name: "Expand Exercise: Incline Press" }))
    .toBeInTheDocument();
  expect(screen.getByText("1 set")).toBeInTheDocument();
  expect(screen.queryByLabelText("Exercise 1 name")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Exercise 1 set 1 reps")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Expand Exercise: Incline Press" }));
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Incline Press");
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(10);
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(70.5);
  expect(screen.queryByRole("heading", { name: "Workout Templates" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Workout History" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show templates" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Expand workout: Chest Day" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Log Workout" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Log Workout" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Start and track a live workout")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Log a completed or historical workout")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Time")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "Incline Dumbbell Press" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add set to exercise 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  expect(screen.getByRole("button", { name: "Expand Exercise: Incline Dumbbell Press" }))
    .toBeInTheDocument();
  expect(screen.getByLabelText("Exercise 2 name")).toHaveFocus();

  fireEvent.click(screen.getByRole("button", { name: "Back to Workout Templates" }));
  expect(screen.getByRole("heading", { name: "Workout Templates" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Workout title")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resume Active Workout" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start Now" })).toHaveFocus();
  expect(onReturnToWorkoutTemplates).not.toHaveBeenCalled();
  expect((await storedDraft()).form.exercises[0].name).toBe("Incline Dumbbell Press");

  fireEvent.click(screen.getByRole("button", { name: "Resume Active Workout" }));
  expect(screen.getByLabelText("Workout title")).toHaveValue("ARMegddon");
  expect(screen.getByRole("heading", { name: "Workout in Progress" })).toHaveFocus();
  expect(screen.queryByRole("heading", { name: "Workout Templates" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Expand Exercise: Incline Dumbbell Press" }))
    .toBeInTheDocument();

  const confirmDiscard = jest.spyOn(window, "confirm")
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  try {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Workout title")).toHaveValue("ARMegddon");
    expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Workout title")).not.toBeInTheDocument();
    expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("heading", { name: "Workout Templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Now" })).toHaveFocus();
    expect(onReturnToWorkoutTemplates).toHaveBeenCalledTimes(1);
  } finally {
    confirmDiscard.mockRestore();
  }
});

test("template Start Now reuses active-draft collision choices", () => {
  const saved = workoutTemplate();
  const startWorkoutTemplate = jest.fn((id, action) => (
    action ? { status: action === "resume" ? "resumed-existing" : "started" } : {
      status: "draft-conflict",
      existingDraftTitle: "Current workout",
    }
  ));
  render(<WorkoutPage {...renderPageProps({ workoutTemplates: [saved], startWorkoutTemplate })} />);
  fireEvent.click(screen.getByRole("button", { name: "Show templates" }));
  fireEvent.click(screen.getByRole("button", { name: "Start Now" }));
  expect(screen.getByRole("dialog", { name: "Workout already in progress" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(startWorkoutTemplate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: "Workout already in progress" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Start Now" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard and start template" }));
  expect(startWorkoutTemplate).toHaveBeenLastCalledWith(saved.id, "discard");
  expect(screen.queryByRole("dialog", { name: "Workout already in progress" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Start Now" }));
  fireEvent.click(screen.getByRole("button", { name: "Resume current workout" }));
  expect(startWorkoutTemplate).toHaveBeenLastCalledWith(saved.id, "resume");
  expect(screen.queryByRole("dialog", { name: "Workout already in progress" })).not.toBeInTheDocument();
});

function expandWorkout(title = "Chest Day") {
  fireEvent.click(
    screen.getByRole("button", { name: `Expand workout: ${title}` })
  );
  return screen.getByText(title).closest("article");
}

test("save outcome shows the approved immediate broad-range wording", () => {
  const props = renderPage({
    saveWorkoutEntry: jest.fn(() => ({
      saved: true,
      calorieEstimate: calorieEstimate(),
    })),
  });
  fillFirstSet();
  submitWorkout();
  expect(props.showToast).toHaveBeenCalledWith(
    "Workout traced. Estimated calories burned: about 300\u2013440 kcal.",
    undefined
  );
});

test.each([
  [
    { bodyWeight: "missing", activeDuration: "provided" },
    "Workout traced. Add body weight to receive an estimate.",
  ],
  [
    { bodyWeight: "provided", activeDuration: "missing" },
    "Workout traced. Add workout duration to receive an estimate.",
  ],
  [
    { bodyWeight: "missing", activeDuration: "missing" },
    "Workout traced. Add body weight and workout duration to receive an estimate.",
  ],
])("save outcome names only missing required estimate inputs", (requiredInputs, message) => {
  const snapshot = calorieEstimate({
    status: "missing-required-inputs",
    code: "missing-required-inputs",
    requiredInputs,
  });
  delete snapshot.lowerKcal;
  delete snapshot.upperKcal;
  const props = renderPage({
    saveWorkoutEntry: jest.fn(() => ({ saved: true, calorieEstimate: snapshot })),
  });
  fillFirstSet();
  submitWorkout();
  expect(props.showToast).toHaveBeenCalledWith(message, undefined);
});

test("expanded history displays only the saved range and a native keyboard disclosure", () => {
  renderPage({
    workoutEntries: [entry({
      activeDurationMinutes: 60,
      calorieEstimate: calorieEstimate(),
    })],
  });
  expect(screen.queryByRole("region", { name: "Estimated calories burned" })).not.toBeInTheDocument();
  const card = expandWorkout();
  const estimate = within(card).getByRole("region", { name: "Estimated calories burned" });
  expect(estimate).toHaveTextContent("About 300\u2013440 kcal");
  expect(estimate).toHaveTextContent(
    "Estimated using your entered workout duration of 60 minutes."
  );
  expect(estimate).toHaveTextContent("This is a broad estimate, not an exact measurement.");
  const disclosure = within(estimate).getByText("How is this estimated?");
  expect(disclosure.tagName).toBe("SUMMARY");
  fireEvent.click(disclosure);
  expect(disclosure.closest("details")).toHaveAttribute("open");
  expect(estimate).toHaveTextContent(
    "approximate workout duration including normal between-set rest"
  );
  expect(estimate).toHaveTextContent("More complete information can narrow the range.");
  expect(estimate).not.toHaveTextContent(/\bMET\b|fingerprint|health-1|formula/i);
});

test("history identifies recorded elapsed time when it is the estimate fallback", () => {
  renderPage({
    workoutEntries: [entry({
      startedAt: "2026-08-09T18:00:00.000Z",
      finishedAt: "2026-08-09T18:01:12.000Z",
      calorieEstimate: calorieEstimate({
        activeDurationMinutes: 1,
        durationSource: "recorded",
        lowerKcal: 10,
        upperKcal: 40,
      }),
    })],
  });
  const card = expandWorkout();
  expect(within(card).getByRole("region", { name: "Estimated calories burned" }))
    .toHaveTextContent("Estimated using the recorded duration of 1 minute.");
});

test("legacy and non-calculable history entries render safely only after expansion", () => {
  const missingSnapshot = calorieEstimate({
    status: "missing-required-inputs",
    code: "missing-required-inputs",
    requiredInputs: { bodyWeight: "missing", activeDuration: "provided" },
  });
  delete missingSnapshot.lowerKcal;
  delete missingSnapshot.upperKcal;
  renderPage({
    workoutEntries: [
      entry({ id: "legacy", title: "Legacy Workout" }),
      entry({ id: "missing", title: "Missing Weight", calorieEstimate: missingSnapshot }),
    ],
  });
  expect(screen.queryByText("No saved estimate is available for this workout.")).not.toBeInTheDocument();
  expandWorkout("Legacy Workout");
  expect(screen.getByText("No saved estimate is available for this workout.")).toBeInTheDocument();
  expandWorkout("Missing Weight");
  expect(screen.getByText("Add body weight to receive an estimate.")).toBeInTheDocument();
});

function plannedExecution() {
  return createPlannedWorkout({
    id: "planned-workout:execution",
    scheduledDate: "2026-08-22",
    title: "Planned Push",
    notes: "Plan notes",
    exercises: [{
      id: "planned-exercise:bench",
      name: "Dumbbell Bench Press",
      exerciseId: "trace:chest-db-bench-002",
      notes: "Exercise notes",
      targetSets: [{
        id: "planned-set:bench",
        setType: "warm-up",
        reps: 8,
        load: { mode: "external", amount: 60, unit: "kg" },
        notes: "Target notes",
      }],
    }],
  }, new Date("2026-08-20T12:00:00.000Z"));
}

test("uses the scoped performance-log presentation and nested workout surfaces", () => {
  renderPage();
  expect(screen.getByTestId("workout-page")).toHaveClass("trace-feature-page--workouts");
  expect(screen.getByRole("heading", { name: "Log Workout" }).closest("form")).toHaveClass("trace-workout-form");
  expect(screen.getByRole("region", { name: "Exercise 1" })).toHaveClass("trace-workout-exercise");
});

function fillFirstSet({ bodyweight = false } = {}) {
  openWorkoutLogger();
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

function addExternalDrop({ exercise = 1, set = 1, weight, reps, notes = "", unit = "lb" }) {
  fireEvent.click(screen.getByRole("button", { name: `Add drop to exercise ${exercise} set ${set}` }));
  const dropNumber = screen.getAllByRole("region", { name: new RegExp(`Exercise ${exercise} set ${set} drop`) }).length;
  if (unit !== "lb") {
    fireEvent.change(screen.getByLabelText(`Exercise ${exercise} set ${set} drop ${dropNumber} weight unit`), { target: { value: unit } });
  }
  fireEvent.change(screen.getByLabelText(`Exercise ${exercise} set ${set} drop ${dropNumber} weight`), { target: { value: String(weight) } });
  fireEvent.change(screen.getByLabelText(`Exercise ${exercise} set ${set} drop ${dropNumber} reps`), { target: { value: String(reps) } });
  if (notes) fireEvent.change(screen.getByLabelText(`Exercise ${exercise} set ${set} drop ${dropNumber} notes`), { target: { value: notes } });
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

test("focuses the exercise search input at a mobile viewport when Find an Exercise opens it", () => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  try {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Find an exercise for exercise 1" }));
    expect(screen.getByLabelText("Exercise search")).toHaveFocus();
  } finally {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  }
});

test("focuses the search belonging to the activated exercise", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.click(screen.getByRole("button", { name: "Find an exercise for exercise 2" }));

  const searchInput = screen.getByLabelText("Exercise search");
  expect(searchInput).toHaveFocus();
  expect(searchInput.closest('section[aria-label="Exercise 2"]')).not.toBeNull();
  expect(screen.getByRole("button", { name: "Find an exercise for exercise 2" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Expand Exercise: Exercise 1" })).toHaveAttribute("aria-expanded", "false");
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
  fireEvent.change(screen.getByLabelText("Exercise 1 notes"), {
    target: { value: "  Keep shoulders down  " },
  });
  submitWorkout();

  expect(props.saveWorkoutEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "strength",
      title: "Chest Day",
      notes: "Workout note",
      exercises: [
        expect.objectContaining({
          name: "Incline Press",
          notes: "Keep shoulders down",
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
  expect(screen.getByRole("button", { name: "Log Workout" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Workout title")).not.toBeInTheDocument();
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
  submitWorkout();

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
  fireEvent.click(screen.getByRole("button", { name: "Expand Exercise: First Exercise" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Remove exercise 2" })
  );
  expect(screen.queryByLabelText("Exercise 2 name")).not.toBeInTheDocument();
});

test("adds ordered drops with inherited settings, autofocus, edits, and targeted removal", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight unit"), { target: { value: "kg" } });
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  const firstWeight = screen.getByLabelText("Exercise 1 set 1 drop 1 weight");
  expect(firstWeight).toHaveFocus();
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight unit")).toHaveValue("kg");
  fireEvent.change(firstWeight, { target: { value: "55" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 reps"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 notes"), { target: { value: "Fast" } });

  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  const secondWeight = screen.getByLabelText("Exercise 1 set 1 drop 2 weight");
  expect(secondWeight).toHaveFocus();
  expect(firstWeight).toHaveValue(55);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 2 weight unit")).toHaveValue("kg");
  fireEvent.change(secondWeight, { target: { value: "40" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 2 reps"), { target: { value: "6" } });

  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  expect(screen.getByText("Drop removed")).toBeInTheDocument();
  expect(screen.getByLabelText("Exercise 1 set 1 drop 2 weight")).toHaveValue(40);
  expect(screen.queryByLabelText("Exercise 1 set 1 drop 1 weight")).not.toBeInTheDocument();
});

test("contextual Undo restores the exact drop ID, position, mode, unit, values, and notes", () => {
  const props = renderPage();
  fillFirstSet();
  addExternalDrop({ weight: 55, reps: 8, notes: "Exact drop", unit: "kg" });
  addExternalDrop({ weight: 40, reps: 6 });
  const original = screen.getByRole("region", { name: "Exercise 1 set 1 drop 1" });
  const originalId = original.getAttribute("data-drop-id");
  fireEvent.click(within(original).getByRole("button", { name: /Remove/ }));

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Drop removed");
  expect(within(status).getByRole("button", { name: /Undo removed drop/ })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Exercise 1 set 1 drop 2" })).toHaveAttribute("data-drop-id", expect.any(String));
  expect(screen.queryByRole("region", { name: "Exercise 1 set 1 drop 1" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Undo removed drop/ }));
  const restored = screen.getByRole("region", { name: "Exercise 1 set 1 drop 1" });
  expect(restored).toHaveAttribute("data-drop-id", originalId);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveValue(55);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 reps")).toHaveValue(8);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight unit")).toHaveValue("kg");
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 notes")).toHaveValue("Exact drop");
  expect(screen.queryByText("Drop removed")).not.toBeInTheDocument();

  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0].drops[0]).toMatchObject({
    id: originalId,
    reps: 8,
    load: { mode: "external", amount: 55, unit: "kg" },
    notes: "Exact drop",
  });
});

test.each([
  ["above", { top: -30, bottom: 20, left: 0, right: 300 }],
  ["below", { top: 780, bottom: 830, left: 0, right: 300 }],
  ["partially clipped", { top: 740, bottom: 790, left: 0, right: 300 }],
])("scrolls the contextual Undo row into view when %s the viewport", (_label, rectangle) => {
  Element.prototype.getBoundingClientRect.mockReturnValue({
    width: 300,
    height: 50,
    x: rectangle.left,
    y: rectangle.top,
    toJSON: () => {},
    ...rectangle,
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  renderPage();
  addExternalDrop({ weight: 55, reps: 8 });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  const status = screen.getByRole("status");
  expect(status.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
});

test("does not scroll when the contextual Undo row is fully visible", () => {
  renderPage();
  addExternalDrop({ weight: 55, reps: 8 });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("targets only the newly removed row with multiple independent parent sets", () => {
  renderPage();
  addExternalDrop({ weight: 55, reps: 8 });
  fireEvent.click(screen.getByRole("button", { name: "Add set to exercise 1" }));
  addExternalDrop({ set: 2, weight: 35, reps: 6 });
  Element.prototype.getBoundingClientRect
    .mockReturnValueOnce({ top: 100, bottom: 150, left: 0, right: 300 })
    .mockReturnValueOnce({ top: 900, bottom: 950, left: 0, right: 300 });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 2 drop 1" }));
  const statuses = screen.getAllByRole("status");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
  expect(Element.prototype.getBoundingClientRect.mock.instances.at(-1)).toBe(statuses[1]);
});

test("unrelated rerenders and Undo restoration do not trigger visibility scrolling", () => {
  Element.prototype.getBoundingClientRect.mockReturnValue({ top: -30, bottom: 20, left: 0, right: 300 });
  renderPage();
  Element.prototype.scrollIntoView.mockClear();
  addExternalDrop({ weight: 55, reps: 8 });
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Still editing" } });
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: /Undo removed drop/ }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
});

test("Undo expires after eight seconds and then numbering settles", () => {
  jest.useFakeTimers();
  try {
    renderPage();
    addExternalDrop({ weight: 55, reps: 8 });
    addExternalDrop({ weight: 40, reps: 6 });
    fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
    expect(screen.getByRole("region", { name: "Exercise 1 set 1 drop 2" })).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(7999));
    expect(screen.getByText("Drop removed")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText("Drop removed")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Exercise 1 set 1 drop 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveValue(40);
  } finally {
    jest.useRealTimers();
  }
});

test("a second removal in one parent replaces its pending Undo", () => {
  renderPage();
  addExternalDrop({ weight: 60, reps: 8 });
  addExternalDrop({ weight: 50, reps: 7 });
  addExternalDrop({ weight: 40, reps: 6 });
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 2" }));
  expect(screen.getAllByText("Drop removed")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Undo removed drop/ }));
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveValue(50);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 2 weight")).toHaveValue(40);
  expect(screen.queryByDisplayValue(60)).not.toBeInTheDocument();
});

test("different parent sets keep independent pending Undo rows", () => {
  renderPage();
  addExternalDrop({ weight: 55, reps: 8 });
  fireEvent.click(screen.getByRole("button", { name: "Add set to exercise 1" }));
  addExternalDrop({ set: 2, weight: 35, reps: 6 });
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 2 drop 1" }));
  expect(screen.getAllByText("Drop removed")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Undo removed drop from exercise 1 set 2" }));
  expect(screen.getByLabelText("Exercise 1 set 2 drop 1 weight")).toHaveValue(35);
  expect(screen.getByText("Drop removed")).toBeInTheDocument();
});

test("focuses the correct new drop across multiple exercises and sets", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.click(screen.getByRole("button", { name: "Add set to exercise 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 2 set 2" }));
  expect(screen.getByLabelText("Exercise 2 set 2 drop 1 weight")).toHaveFocus();
  expect(screen.queryByLabelText("Exercise 1 set 1 drop 1 weight")).not.toBeInTheDocument();
});

test.each([375, 390, 430])("keeps drop controls constrained at %ipx", (width) => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  try {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
    const drop = screen.getByRole("region", { name: "Exercise 1 set 1 drop 1" });
    expect(drop).toHaveStyle({ maxWidth: "100%", overflow: "hidden" });
    expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveStyle({ maxWidth: "100%", width: "100%" });
    expect(screen.getByLabelText("Exercise 1 set 1 drop 1 reps").closest(".workout-drop-entry-row")).toBeInTheDocument();
  } finally {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  }
});

test("drop data survives draft persistence and restoration with stable IDs and order", async () => {
  const first = render(<WorkoutPage {...renderPageProps()} />);
  fillFirstSet();
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 weight"), { target: { value: "55" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 reps"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 notes"), { target: { value: "No rest" } });
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 2 weight"), { target: { value: "40" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 2 reps"), { target: { value: "6" } });

  await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].drops[1].reps).toBe("6"));
  const stored = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  const ids = stored.form.exercises[0].sets[0].drops.map(({ id }) => id);
  first.unmount();
  render(<WorkoutPage {...renderPageProps()} />);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveValue(55);
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 notes")).toHaveValue("No rest");
  expect(screen.getByLabelText("Exercise 1 set 1 drop 2 weight")).toHaveValue(40);
  const restored = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(restored.form.exercises[0].sets[0].drops.map(({ id }) => id)).toEqual(ids);
});

test("remove and Undo flow naturally through draft persistence without persisting the placeholder", async () => {
  renderPage();
  fillFirstSet();
  addExternalDrop({ weight: 55, reps: 8, notes: "Draft drop" });
  const id = screen.getByRole("region", { name: "Exercise 1 set 1 drop 1" }).getAttribute("data-drop-id");
  await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].drops).toHaveLength(1));
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].drops).toEqual([]));
  expect(JSON.stringify(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)))).not.toContain("Drop removed");
  fireEvent.click(screen.getByRole("button", { name: /Undo removed drop/ }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].drops[0].id).toBe(id));
});

test("saves normalized drops and failed save retains the complete drop draft", async () => {
  const props = renderPage({ saveWorkoutEntry: jest.fn(() => false) });
  fillFirstSet();
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 weight"), { target: { value: "55" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 reps"), { target: { value: "8" } });
  await storedDraft();
  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0].drops).toEqual([
    expect.objectContaining({ reps: 8, load: { mode: "external", amount: 55, unit: "lb" } }),
  ]);
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].drops).toHaveLength(1);
});

test("historical drops can be edited, extended, and removed without changing timing", () => {
  const saved = entry({
    startedAt: "2026-08-09T18:30:00.000Z",
    finishedAt: "2026-08-09T19:35:00.000Z",
    exercises: [{
      ...entry().exercises[0],
      sets: [{ ...entry().exercises[0].sets[0], drops: [{ id: "drop-old", reps: 8, load: { mode: "external", amount: 55, unit: "lb" }, notes: "Old drop" }] }],
    }],
  });
  const props = renderPage({ workoutEntries: [saved] });
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 drop 1 weight")).toHaveValue(55);
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 reps"), { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 2 weight"), { target: { value: "40" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 2 reps"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(saved.id, expect.objectContaining({
    startedAt: saved.startedAt,
    finishedAt: saved.finishedAt,
    exercises: [expect.objectContaining({ sets: [expect.objectContaining({ drops: [expect.objectContaining({ id: "drop-old", reps: 9 }), expect.objectContaining({ reps: 7 })] })] })],
  }));
});

test("historical drop removal can be undone before saving with timing intact", () => {
  const saved = entry({
    startedAt: "2026-08-09T18:30:00.000Z",
    finishedAt: "2026-08-09T19:35:00.000Z",
    exercises: [{
      ...entry().exercises[0],
      sets: [{ ...entry().exercises[0].sets[0], drops: [{ id: "historical-drop", reps: 8, load: { mode: "external", amount: 55, unit: "lb" }, notes: "Restore me" }] }],
    }],
  });
  const props = renderPage({ workoutEntries: [saved] });
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
  expect(screen.getByText("Drop removed")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Undo removed drop/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(saved.id, expect.objectContaining({
    startedAt: saved.startedAt,
    finishedAt: saved.finishedAt,
    exercises: [expect.objectContaining({ sets: [expect.objectContaining({ drops: [expect.objectContaining({ id: "historical-drop", notes: "Restore me" })] })] })],
  }));
});

test("saving after Undo expires persists the removed state", () => {
  jest.useFakeTimers();
  try {
    const props = renderPage();
    fillFirstSet();
    addExternalDrop({ weight: 55, reps: 8 });
    fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1 set 1 drop 1" }));
    act(() => jest.advanceTimersByTime(8000));
    submitWorkout();
    expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0]).not.toHaveProperty("drops");
  } finally {
    jest.useRealTimers();
  }
});

test("shows mechanical validation errors", () => {
  renderPage();
  submitWorkout();
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a workout title.");

  fillFirstSet();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "1.5" },
  });
  submitWorkout();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "whole-number reps"
  );
});

test("places Collapse Exercise beside Add Set and compactly preserves entered exercise data", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Incline Press" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 notes"), { target: { value: "Keep this private" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "10" } });

  const collapse = screen.getByRole("button", { name: "Collapse Exercise: Incline Press" });
  const actionRow = collapse.closest(".trace-workout-exercise__bottom-actions");
  expect(within(actionRow).getByRole("button", { name: "Add set to exercise 1" })).toBeInTheDocument();
  expect(collapse).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(collapse);
  const card = screen.getByRole("region", { name: "Exercise 1" });
  expect(within(card).getByRole("heading", { name: "Incline Press" })).toBeInTheDocument();
  expect(within(card).getByText("1 set")).toBeInTheDocument();
  expect(within(card).getAllByRole("button")).toHaveLength(1);
  expect(within(card).queryByText("Keep this private")).not.toBeInTheDocument();
  expect(within(card).queryByLabelText("Exercise 1 set 1 weight")).not.toBeInTheDocument();

  const expand = within(card).getByRole("button", { name: "Expand Exercise: Incline Press" });
  expect(expand).toHaveAttribute("aria-expanded", "false");
  expect(expand).toHaveAttribute("aria-controls", collapse.getAttribute("aria-controls"));
  fireEvent.click(expand);
  expect(screen.getByLabelText("Exercise 1 notes")).toHaveValue("Keep this private");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(70);
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(10);

  fireEvent.click(screen.getByRole("button", { name: "Add set to exercise 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Incline Press" }));
  expect(within(card).getByText("2 sets")).toBeInTheDocument();
});

test("successful Add Exercise collapses the active exercise, expands and focuses the new one, and scrolls with standard motion", () => {
  render(
    <div className="trace-app-shell" data-motion="standard">
      <WorkoutPage {...renderPageProps()} />
    </div>
  );
  openWorkoutLogger();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Squat" } });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));

  expect(screen.getByRole("button", { name: "Expand Exercise: Squat" })).toBeInTheDocument();
  expect(screen.getByLabelText("Exercise 2 name")).toHaveFocus();
  expect(screen.getByRole("button", { name: "Collapse Exercise: Exercise 2" })).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
    behavior: "smooth",
    block: "center",
  });
});

test("Add Exercise uses instant scrolling when Motion & Effects is reduced", () => {
  render(
    <div className="trace-app-shell" data-motion="reduced">
      <WorkoutPage {...renderPageProps()} />
    </div>
  );
  openWorkoutLogger();
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  expect(screen.getByLabelText("Exercise 2 name")).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
    behavior: "auto",
    block: "center",
  });
});

test("manual collapse focuses its explicit Expand Exercise control and only scrolls when needed", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Row" } });
  const card = screen.getByRole("region", { name: "Exercise 1" });
  jest.spyOn(card, "getBoundingClientRect").mockReturnValue({
    top: window.innerHeight + 10,
    bottom: window.innerHeight + 210,
    left: 0,
    right: 300,
    width: 300,
    height: 200,
    x: 0,
    y: window.innerHeight + 10,
    toJSON: () => {},
  });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Row" }));
  const expand = screen.getByRole("button", { name: "Expand Exercise: Row" });
  expect(expand).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
    behavior: "smooth",
    block: "nearest",
  });

  fireEvent.click(expand);
  card.getBoundingClientRect.mockReturnValue({
    top: 100,
    bottom: 300,
    left: 0,
    right: 300,
    width: 300,
    height: 200,
    x: 0,
    y: 100,
    toJSON: () => {},
  });
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Row" }));
  expect(screen.getByRole("button", { name: "Expand Exercise: Row" })).toHaveFocus();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("multiple exercise cards retain independent collapse state and closing exercise search changes neither", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "First" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.change(screen.getByLabelText("Exercise 2 name"), { target: { value: "Second" } });

  const findSecond = screen.getByRole("button", { name: "Find an exercise for exercise 2" });
  fireEvent.click(findSecond);
  fireEvent.click(findSecond);
  expect(screen.getByRole("button", { name: "Expand Exercise: First" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Collapse Exercise: Second" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Expand Exercise: First" }));
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Second" }));
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("First");
  expect(screen.getByRole("button", { name: "Expand Exercise: Second" })).toBeInTheDocument();
});

test("save validation marks every incomplete collapsed exercise and clears each warning after correction", () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Validation" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Exercise" }));
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Exercise 2" }));
  Element.prototype.scrollIntoView.mockClear();

  submitWorkout();
  const firstCard = screen.getByRole("region", { name: "Exercise 1" });
  const secondCard = screen.getByRole("region", { name: "Exercise 2" });
  expect(firstCard).toHaveClass("trace-workout-exercise--missing");
  expect(secondCard).toHaveClass("trace-workout-exercise--missing");
  expect(within(firstCard).getByText("Missing information")).toBeInTheDocument();
  expect(within(secondCard).getByText("Missing information")).toBeInTheDocument();
  const firstExpand = within(firstCard).getByRole("button", { name: "Expand Exercise: Exercise 1" });
  const firstWarning = within(firstCard).getByText("Missing information");
  expect(firstExpand).not.toHaveAttribute("aria-invalid");
  expect(firstExpand).toHaveAttribute("aria-describedby", firstWarning.id);
  expect(firstExpand).toHaveFocus();
  const secondExpand = within(secondCard).getByRole("button", { name: "Expand Exercise: Exercise 2" });
  expect(secondExpand).not.toHaveAttribute("aria-invalid");
  expect(secondExpand).toHaveAttribute(
    "aria-describedby",
    within(secondCard).getByText("Missing information").id
  );
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "nearest" });

  fireEvent.click(firstExpand);
  expect(screen.getByLabelText("Exercise 1 name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Bench" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "100" } });
  expect(firstCard).not.toHaveClass("trace-workout-exercise--missing");
  expect(secondCard).toHaveClass("trace-workout-exercise--missing");
  expect(within(secondCard).getByText("Missing information")).toBeInTheDocument();
});

test("collapsed state and all exercise values resume through the existing workout draft", async () => {
  const first = render(<WorkoutPage {...renderPageProps()} />);
  openWorkoutLogger();
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Draft Row" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "88" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Collapse Exercise: Draft Row" }));
  await waitFor(() => expect(
    JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).context.collapsedExerciseIds
  ).toHaveLength(1));
  const draft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(draft.context.collapsedExerciseIds).toEqual([draft.form.exercises[0].id]);

  first.unmount();
  render(<WorkoutPage {...renderPageProps()} />);
  fireEvent.click(screen.getByRole("button", { name: "Expand Exercise: Draft Row" }));
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(88);
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(12);
});

test("uses compact responsive rows for external and bodyweight set entry", () => {
  renderPage();
  expect(screen.getByLabelText("Exercise 1 set 1 type").closest(".workout-set-input-grid")).toHaveClass("external");
  expect(screen.getByLabelText("Exercise 1 set 1 weight").closest(".workout-set-input-grid")).toHaveClass("external");

  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 load mode"), { target: { value: "bodyweight" } });
  expect(screen.getByLabelText("Exercise 1 set 1 type").closest(".workout-set-input-grid")).toHaveClass("bodyweight");
  expect(screen.getByLabelText("Exercise 1 set 1 reps").closest(".workout-set-input-grid")).toBeInTheDocument();
  expect(screen.queryByLabelText("Exercise 1 set 1 weight")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Exercise 1 set 1 weight unit")).not.toBeInTheDocument();
});

test("renders the exact 400px external grid contract with Unit only on row two", () => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 });
  try {
    renderPage();
    const grid = screen.getByLabelText("Exercise 1 set 1 type").closest(".workout-set-input-grid");
    expect(grid).toHaveClass("external");
    expect(grid).toHaveStyle({ gridTemplateAreas: '"type load unit" "weight reps ."' });
    const responsiveStyle = [...document.querySelectorAll("style")]
      .map((style) => style.textContent)
      .find((text) => text.includes('"weight weight reps reps unit unit"'));
    expect(responsiveStyle).toContain('"type type type load load load"');
    expect(responsiveStyle).toContain('"weight weight reps reps unit unit" !important');
  } finally {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  }
});

test("uses the compact entry-form display labels without changing option values", () => {
  renderPage();
  expect(screen.getByRole("option", { name: "Working" })).toHaveValue("working");
  expect(screen.getByRole("option", { name: "Warm-up" })).toHaveValue("warm-up");
  expect(screen.getByRole("option", { name: "External" })).toHaveValue("external");
  expect(screen.getByRole("option", { name: "Bodyweight" })).toHaveValue("bodyweight");
  expect(screen.queryByRole("option", { name: "Working set" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "External weight" })).not.toBeInTheDocument();
});

test("logs a to-failure set with an optional actual count and preserves exact zero", () => {
  const props = renderPage();
  fillFirstSet();
  expect(screen.getByText("Reps", { selector: "label" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "0" } });
  fireEvent.click(screen.getByLabelText("Exercise 1 set 1 to failure"));
  expect(screen.getByText("Goal reps", { selector: "label" })).toBeInTheDocument();
  expect(screen.getByLabelText("Exercise 1 set 1 actual reps at failure")).toHaveStyle({ maxWidth: "140px" });
  fireEvent.click(screen.getByLabelText("Exercise 1 set 1 to failure"));
  expect(screen.getByText("Reps", { selector: "label" })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Exercise 1 set 1 to failure"));
  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0]).toMatchObject({
    reps: 0,
    toFailure: true,
    actualRepsAtFailure: null,
  });
});

test("saves a blank to-failure goal as a zero-rep attempted set", () => {
  const props = renderPage();
  fillFirstSet();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "" } });
  fireEvent.click(screen.getByLabelText("Exercise 1 set 1 to failure"));
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(null);
  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].sets[0]).toMatchObject({
    reps: 0,
    toFailure: true,
    actualRepsAtFailure: null,
  });
});

test("editing a to-failure workout restores and updates the actual failure count", () => {
  const saved = entry({
    exercises: [{
      ...entry().exercises[0],
      sets: [{ ...entry().exercises[0].sets[0], reps: 10, toFailure: true, actualRepsAtFailure: null }],
    }],
  });
  const props = renderPage({ workoutEntries: [saved] });
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 to failure")).toBeChecked();
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 actual reps at failure"), { target: { value: "13" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry.mock.calls[0][1].exercises[0].sets[0]).toMatchObject({
    reps: 10,
    toFailure: true,
    actualRepsAtFailure: 13,
  });
});

test("Workout History cards start collapsed with their title and date visible", () => {
  const saved = entry();
  renderPage({ workoutEntries: [saved] });

  const card = screen.getByText(saved.title).closest("article");
  const toggle = within(card).getByRole("button", {
    name: `Expand workout: ${saved.title}`,
  });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(within(card).getByText(new Date(saved.occurredAt).toLocaleString())).toBeInTheDocument();
  expect(within(card).getByText("1 set")).toBeInTheDocument();
  expect(within(card).queryByText("Incline Press")).not.toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("collapsed Workout History cards show total set counts across multiple exercises", () => {
  const multiSetWorkout = entry({
    id: "workout-multi-sets",
    title: "Back to Back Day",
    exercises: [
      {
        id: "exercise-a",
        name: "Incline Press",
        sets: [
          {
            id: "set-a-1",
            reps: 10,
            load: { mode: "external", amount: 70, unit: "lb" },
          },
          {
            id: "set-a-2",
            reps: 8,
            load: { mode: "external", amount: 80, unit: "lb" },
          },
        ],
      },
      {
        id: "exercise-b",
        name: "Leg Press",
        sets: [
          {
            id: "set-b-1",
            reps: 12,
            load: { mode: "external", amount: 200, unit: "lb" },
          },
          {
            id: "set-b-2",
            reps: 12,
            load: { mode: "external", amount: 190, unit: "lb" },
          },
          {
            id: "set-b-3",
            reps: 12,
            load: { mode: "external", amount: 180, unit: "lb" },
          },
        ],
      },
    ],
  });
  renderPage({ workoutEntries: [multiSetWorkout] });

  const card = screen.getByText(multiSetWorkout.title).closest("article");
  expect(within(card).getByText("5 sets")).toBeInTheDocument();
});

test("collapsed Workout History handles missing/malformed set data as zero total sets", () => {
  const noSetWorkout = entry({
    id: "workout-no-sets",
    title: "Recovery Day",
    exercises: [
      { id: "exercise-empty", name: "Hold", sets: null },
      { id: "exercise-bad", name: "Unscored", sets: undefined },
      { id: "exercise-empty-array", name: "No-op", sets: [] },
    ],
  });
  renderPage({ workoutEntries: [noSetWorkout] });

  const card = screen.getByText(noSetWorkout.title).closest("article");
  expect(within(card).getByText("0 sets")).toBeInTheDocument();
});

test("opening and closing a Workout History card reveals and hides its existing details and actions", () => {
  renderPage({ workoutEntries: [entry()] });
  Element.prototype.scrollIntoView.mockClear();

  const card = expandWorkout();
  const collapse = within(card).getByRole("button", {
    name: "Collapse workout: Chest Day",
  });
  expect(collapse).toHaveAttribute("aria-expanded", "true");
  expect(within(card).getByText("Workout note")).toBeInTheDocument();
  expect(within(card).getByText("Incline Press")).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

  fireEvent.click(collapse);
  expect(within(card).getByRole("button", { name: "Expand workout: Chest Day" })).toHaveAttribute("aria-expanded", "false");
  expect(within(card).queryByText("Incline Press")).not.toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("the linked completed workout shows a visible Trophy Case return only for Trophy Case origin", () => {
  const target = entry({ id: "workout-trophy-target", title: "Trophy Workout" });
  const onReturnToTrophyCase = jest.fn();
  const trophyView = render(
    <WorkoutPage
      {...renderPageProps({
        navigationOriginPage: "trophy-case",
        onReturnToTrophyCase,
        workoutEntries: [target],
        workoutEntryTargetId: target.id,
      })}
    />
  );

  const trophyCard = screen.getByText(target.title).closest("article");
  expect(trophyCard.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  });
  expect(trophyCard).toHaveStyle({
    scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
  });
  const trophyReturn = within(trophyCard).getByRole("button", {
    name: "Back to Trophy Case",
  });
  const actionRow = trophyReturn.closest(".trace-workout-history-card__actions");
  expect(within(actionRow).getAllByRole("button").map((button) => button.textContent))
    .toEqual(["Save as Template", "Edit", "Delete", "Back to Trophy Case"]);
  expect(trophyReturn).toBeVisible();
  fireEvent.click(trophyReturn);
  expect(onReturnToTrophyCase).toHaveBeenCalledTimes(1);

  trophyView.unmount();
  renderPage({ workoutEntries: [target] });
  const normalCard = expandWorkout(target.title);
  expect(normalCard).not.toHaveStyle({
    scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
  });
  expect(within(normalCard).queryByRole("button", { name: "Back to Trophy Case" }))
    .not.toBeInTheDocument();
});

test("multiple Workout History records remain independently usable", () => {
  const legDay = entry({
    id: "workout-2",
    title: "Leg Day",
    notes: "Leg workout note",
    occurredAt: new Date(2026, 7, 8, 18, 30).toISOString(),
    exercises: [{
      ...entry().exercises[0],
      id: "exercise-2",
      name: "Back Squat",
    }],
  });
  renderPage({ workoutEntries: [entry(), legDay] });

  const chestCard = expandWorkout("Chest Day");
  const legCard = expandWorkout("Leg Day");
  expect(within(chestCard).getByText("Incline Press")).toBeInTheDocument();
  expect(within(legCard).getByText("Back Squat")).toBeInTheDocument();

  fireEvent.click(within(chestCard).getByRole("button", { name: "Collapse workout: Chest Day" }));
  expect(within(chestCard).queryByText("Incline Press")).not.toBeInTheDocument();
  expect(within(legCard).getByText("Back Squat")).toBeInTheDocument();
  expect(within(legCard).getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

test("target, close, edit, save, and delete retain the originating workout context", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const target = entry({ id: "workout-target", title: "Target Workout" });
  const onWorkoutEntryTargetShown = jest.fn();
  const props = renderPage({
    workoutEntries: [entry(), target],
    workoutEntryTargetId: target.id,
    onWorkoutEntryTargetShown,
  });
  const targetCard = screen.getByText(target.title).closest("article");

  expect(within(targetCard).getByRole("button", { name: "Collapse workout: Target Workout" })).toHaveAttribute("aria-expanded", "true");
  expect(targetCard).toHaveAttribute("aria-current", "true");
  expect(targetCard.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  expect(onWorkoutEntryTargetShown).toHaveBeenCalledTimes(1);

  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(within(targetCard).getByRole("button", { name: "Collapse workout: Target Workout" }));
  fireEvent.click(within(targetCard).getByRole("button", { name: "Expand workout: Target Workout" }));
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

  fireEvent.click(within(targetCard).getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("heading", { name: "Edit Workout" })).toBeInTheDocument();
  expect(screen.getByLabelText("Workout title")).toHaveValue("Target Workout");
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(target.id, expect.any(Object));
  expect(targetCard).toHaveAttribute("aria-current", "true");
  expect(targetCard.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(within(targetCard).getByRole("button", { name: "Delete" }));
  expect(confirm).toHaveBeenCalledWith("Delete this workout?");
  expect(props.deleteWorkoutEntry).toHaveBeenCalledWith(target.id);
  expect(within(targetCard).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("Edit Cancel restores the originating expanded card and viewport position", () => {
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    renderPage({ workoutEntries: [entry()] });
    const card = expandWorkout();
    let cardTop = 240;
    card.getBoundingClientRect = jest.fn(() => ({
      top: cardTop,
      bottom: cardTop + 280,
      left: 100,
      right: 700,
      width: 600,
      height: 280,
      x: 100,
      y: cardTop,
      toJSON: () => {},
    }));

    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    cardTop = 640;
    window.scrollTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1600,
      left: 0,
      behavior: "auto",
    });
    expect(card).toHaveAttribute("aria-current", "true");
    expect(within(card).getByRole("button", { name: "Collapse workout: Chest Day" })).toHaveAttribute("aria-expanded", "true");
  } finally {
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    else delete window.scrollY;
  }
});

test("Delete anchors the remaining history and compensates for a shortened document", () => {
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
  const originalScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 2369 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 3201 });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    const deleted = entry({
      id: "delete-me",
      title: "Delete Me",
      occurredAt: "2026-08-23T12:00:00.000Z",
    });
    const remaining = entry({
      id: "remaining",
      title: "Remaining Workout",
      occurredAt: "2026-08-22T12:00:00.000Z",
    });
    const props = renderPageProps({ workoutEntries: [deleted, remaining] });
    const view = render(<WorkoutPage {...props} />);
    const deletedCard = screen.getByText("Delete Me").closest("article");
    const remainingCard = screen.getByText("Remaining Workout").closest("article");
    deletedCard.getBoundingClientRect = jest.fn(() => ({
      top: 300, bottom: 500, left: 100, right: 700, width: 600, height: 200,
      x: 100, y: 300, toJSON: () => {},
    }));
    remainingCard.getBoundingClientRect = jest.fn(() => ({
      top: 300, bottom: 500, left: 100, right: 700, width: 600, height: 200,
      x: 100, y: 300, toJSON: () => {},
    }));

    expandWorkout("Delete Me");
    window.scrollTo.mockClear();
    fireEvent.click(within(deletedCard).getByRole("button", { name: "Delete" }));
    view.rerender(<WorkoutPage {...props} workoutEntries={[remaining]} />);

    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 2369,
      left: 0,
      behavior: "auto",
    });
    expect(screen.getByText("Remaining Workout").closest("article")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("workout-page").lastElementChild).toHaveStyle({ height: "168px" });
  } finally {
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    else delete window.scrollY;
    if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight);
    else delete window.innerHeight;
    if (originalScrollHeight) Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeight);
    else delete document.documentElement.scrollHeight;
  }
});

test.each([375, 390, 430, 1280])(
  "keeps collapsed Workout History cards within the %spx viewport",
  (width) => {
    const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    try {
      renderPage({
        workoutEntries: [entry({
          title: "A very long completed workout title that must wrap without widening the page",
        })],
      });
      const card = screen.getByText(/A very long completed workout title/).closest("article");
      expect(card).toHaveStyle({ maxWidth: "100%", overflow: "hidden", width: "100%" });
      expect(within(card).getByRole("button", { name: /Expand workout/ })).toHaveClass("trace-workout-history-card__toggle");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    } finally {
      if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
    }
  }
);

test("displays known and unknown failure totals in workout history", () => {
  const saved = entry({ exercises: [{
    ...entry().exercises[0],
    sets: [
      { ...entry().exercises[0].sets[0], id: "known", toFailure: true, actualRepsAtFailure: 13 },
      { ...entry().exercises[0].sets[0], id: "unknown", toFailure: true, actualRepsAtFailure: null },
      { ...entry().exercises[0].sets[0], id: "failed", reps: 0, toFailure: true, actualRepsAtFailure: null },
    ],
  }] });
  renderPage({ workoutEntries: [saved] });
  expandWorkout();
  expect(screen.getByText(/10 goal.*failure at 13/)).toBeInTheDocument();
  expect(screen.getByText(/10 goal.*to failure/)).toBeInTheDocument();
  expect(screen.getByText(/ 0 goal.*to failure/)).toBeInTheDocument();
});

test("restores and updates a complete historical snapshot", () => {
  const saved = entry({
    startedAt: "2026-08-09T18:30:00.000Z",
    finishedAt: "2026-08-09T19:35:00.000Z",
  });
  const props = renderPage({ workoutEntries: [saved] });
  expandWorkout();
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
      startedAt: saved.startedAt,
      finishedAt: saved.finishedAt,
      exercises: [
        expect.objectContaining({
          id: "exercise-1",
          sets: [expect.objectContaining({ id: "set-1", reps: 12 })],
        }),
      ],
    })
  );
  const savedWorkout = screen.getByText("Chest Day").closest("article");
  expect(savedWorkout).toHaveAttribute("aria-current", "true");
  expect(savedWorkout.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "center",
  });
});

test("failed historical edit stays in the editor without scrolling away", () => {
  const saved = entry();
  const props = renderPage({
    workoutEntries: [saved],
    updateWorkoutEntry: jest.fn(() => false),
  });
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Unsaved historical edit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  expect(props.updateWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Edit Workout" })).toBeInTheDocument();
  expect(screen.getByLabelText("Workout title")).toHaveValue("Unsaved historical edit");
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("shows completion timing while legacy workouts render without fabricated timing", () => {
  renderPage({
    workoutEntries: [
      entry({
        startedAt: "2026-08-09T18:30:00.000Z",
        finishedAt: "2026-08-09T19:35:00.000Z",
      }),
      entry({ id: "legacy", title: "Legacy Workout" }),
    ],
  });
  expandWorkout("Chest Day");
  expandWorkout("Legacy Workout");
  const completed = screen.getByText("Chest Day").closest("article");
  expect(within(completed).getByText("Start")).toBeInTheDocument();
  expect(within(completed).getByText("Finish")).toBeInTheDocument();
  expect(within(completed).getByText("1 hr 5 min")).toBeInTheDocument();
  const legacy = screen.getByText("Legacy Workout").closest("article");
  expect(within(legacy).queryByText("Duration")).not.toBeInTheDocument();
});

test("Workout History nests drop segments without changing parent set numbering", () => {
  const withDrops = entry({
    exercises: [{
      ...entry().exercises[0],
      sets: [{
        ...entry().exercises[0].sets[0],
        notes: "Parent note",
        drops: [
          { id: "drop-1", reps: 8, load: { mode: "external", amount: 55, unit: "lb" }, notes: "First drop" },
          { id: "drop-2", reps: 6, load: { mode: "bodyweight" }, notes: "Second drop" },
        ],
      }],
    }],
  });
  renderPage({ workoutEntries: [withDrops] });
  expandWorkout();
  const card = screen.getByText("Chest Day").closest("article");
  expect(within(card).getAllByRole("listitem")).toHaveLength(1);
  expect(within(card).getByText("↳ Drop 1: Working · 55 lb × 8 reps")).toBeInTheDocument();
  expect(within(card).getByText("↳ Drop 2: Working · Bodyweight × 6 reps")).toBeInTheDocument();
  expect(within(card).getByText("First drop")).toBeInTheDocument();
  expect(within(card).getByText("Second drop")).toBeInTheDocument();
});

test("retains a valid draft when persistence fails", () => {
  renderPage({ saveWorkoutEntry: jest.fn(() => false) });
  fillFirstSet();
  submitWorkout();

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
  expandWorkout("New Workout");
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
  expect(screen.getByRole("button", { name: "Log Workout" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Workout title")).not.toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
});

test("adds multiple optional photos and can remove one before saving", () => {
  const props = renderPage();
  fillFirstSet();
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.jpg", { type: "image/jpeg" });

  fireEvent.change(screen.getByLabelText("Choose Photos"), {
    target: { files: [first, second] },
  });
  expect(screen.getByAltText("Workout attachment 1")).toHaveAttribute("src", "blob:first.jpg");
  expect(screen.getByAltText("Workout attachment 2")).toHaveAttribute("src", "blob:second.jpg");
  const removePhoto = screen.getByRole("button", { name: "Remove workout photo 1" });
  expect(removePhoto).toHaveTextContent("×");
  fireEvent.click(removePhoto);
  submitWorkout();

  expect(props.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
    photos: [expect.objectContaining({ blob: second, isDraft: true, url: "blob:second.jpg" })],
  }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.jpg");
});

test("routes Workout selection through the adapter and retains its exact file order", () => {
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.png", { type: "image/png" });
  const photoSelectionAdapter = {
    acquireImages: jest.fn(() => ({
      status: PHOTO_SELECTION_RESULT_STATUS.SUCCESS,
      files: [second, first],
    })),
  };
  renderPage({ photoSelectionAdapter });
  const input = screen.getByLabelText("Choose Photos");

  fireEvent.change(input, { target: { files: [first, second] } });

  expect(photoSelectionAdapter.acquireImages).toHaveBeenCalledWith({
    input,
    accept: "image/*",
    multiple: true,
  });
  expect(screen.getByAltText("Workout attachment 1")).toHaveAttribute("src", "blob:second.png");
  expect(screen.getByAltText("Workout attachment 2")).toHaveAttribute("src", "blob:first.jpg");
  expect(URL.createObjectURL.mock.calls.map(([file]) => file)).toEqual([second, first]);
  expect(input).toHaveAttribute("accept", "image/*");
  expect(input).toHaveAttribute("multiple");
  expect(input).toHaveValue("");
});

test.each([
  PHOTO_SELECTION_RESULT_STATUS.CANCELED,
  PHOTO_SELECTION_RESULT_STATUS.FAILURE,
  PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED,
])("a %s adapter result leaves Workout photos and its draft unchanged", async (status) => {
  const photoSelectionAdapter = {
    acquireImages: jest.fn(() => ({ status, files: [], error: new Error("selection unavailable") })),
  };
  renderPage({ photoSelectionAdapter });
  const beforeSelection = await storedDraft();
  const input = screen.getByLabelText("Choose Photos");

  fireEvent.change(input, { target: { files: [] } });

  expect(screen.queryByAltText(/Workout attachment/)).not.toBeInTheDocument();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(input).toHaveValue("");
  expect(await storedDraft()).toEqual(beforeSelection);
});

test("editing preserves photos and each workout history card owns its gallery", () => {
  const withPhoto = entry({ photos: [{ id: "photo-1", url: "blob:stored" }] });
  const withoutPhoto = entry({ id: "workout-2", title: "No Photo Workout" });
  const props = renderPage({ workoutEntries: [withPhoto, withoutPhoto] });

  expandWorkout();
  expect(screen.getByRole("region", { name: "Chest Day photos" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "No Photo Workout photos" })).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByText("Chest Day").closest("article")).getByRole("button", { name: "Edit" }));
  expect(screen.getByAltText("Workout attachment 1")).toHaveAttribute("src", "blob:stored");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  expect(props.updateWorkoutEntry).toHaveBeenCalledWith(
    "workout-1",
    expect.objectContaining({ photos: [{ id: "photo-1", url: "blob:stored" }] })
  );
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
  const historyHeading = screen.getByRole("heading", { name: "Exercise History" });
  expect(historyHeading).toBeInTheDocument();
  const summary = screen.getByRole("button", {
    name: /Incline Press.*1 performance/,
  });
  fireEvent.click(summary);
  const history = historyHeading.closest("section");
  expect(within(history).getAllByText("70.5 lb × 10 reps")).toHaveLength(2);
  expect(screen.getByText("Controlled")).toBeInTheDocument();
});

test("places Workout History before Exercise History without duplicating either section", () => {
  renderPage({ workoutEntries: [entry()] });
  const workoutHeading = screen.getByRole("heading", { name: "Workout History" });
  const exerciseHeading = screen.getByRole("heading", { name: "Exercise History" });
  expect(screen.getAllByRole("heading", { name: "Workout History" })).toHaveLength(1);
  expect(screen.getAllByRole("heading", { name: "Exercise History" })).toHaveLength(1);
  expect(
    workoutHeading.compareDocumentPosition(exerciseHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
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
  submitWorkout();
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
  submitWorkout();
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0].exerciseReference.modified).toBe(false);

  props.saveWorkoutEntry.mockClear();
  openWorkoutLogger();
  fireEvent.click(screen.getByRole("button", { name: /Find an exercise/ }));
  fireEvent.change(screen.getByLabelText("Exercise search"), { target: { value: "press" } });
  fireEvent.click(screen.getByRole("button", { name: "Select saved exercise Press" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Strict Press" } });
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Day" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "8" } });
  submitWorkout();
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
  submitWorkout();

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
  submitWorkout();
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
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  submitWorkout();

  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises.every((exercise) => !exercise.exerciseReference)).toBe(true);
  expect(props.showToast).toHaveBeenCalledWith(
    "Workout traced. Your existing saved Dips, Press definitions were kept.",
    undefined
  );
});

test("catalog failure does not block history and leaves no misleading reference", () => {
  const props = renderPage({
    saveExerciseDefinitions: jest.fn(() => [
      { status: "error", exercise: null, matchesDefinition: false },
    ]),
  });
  fillFirstSet();
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  submitWorkout();
  expect(props.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(props.saveWorkoutEntry.mock.calls[0][0].exercises[0]).not.toHaveProperty("exerciseReference");
  expect(props.showToast).toHaveBeenCalledWith(
    "Workout traced. One or more reusable exercises could not be saved.",
    undefined
  );
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
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Save as reusable exercise")).toBeInTheDocument();
  unmount();
  render(<WorkoutPage {...renderPageProps({ workoutEntries: [referenced] })} />);
  expandWorkout("Referenced");
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
  submitWorkout();

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
  submitWorkout();
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
  expandWorkout();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateWorkoutEntry.mock.calls[0][1].exercises[0].exerciseId).toBe(
    "trace:chest-db-bench-002"
  );
});
