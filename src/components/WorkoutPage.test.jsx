import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import WorkoutPage from "./WorkoutPage";
import { createExerciseDefinition } from "../services/exerciseCatalog";
import { WORKOUT_DRAFT_STORAGE_KEY } from "../services/workoutDraft";

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  localStorage.clear();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  Element.prototype.scrollIntoView = jest.fn();
  URL.createObjectURL = jest.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = jest.fn();
});

async function storedDraft() {
  await waitFor(() =>
    expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull()
  );
  return JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
}

test("persists new-workout changes and restores the original start and form state", async () => {
  const first = render(<WorkoutPage {...renderPageProps()} />);
  const originalDate = screen.getByLabelText("Date").value;
  const originalTime = screen.getByLabelText("Time").value;
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "Survives reload" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Squat" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 notes"), { target: { value: "Deep" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), { target: { value: "225" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 notes"), { target: { value: "Solid" } });

  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).form.exercises[0].sets[0].notes).toBe("Solid")
  );
  const draft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(draft).toMatchObject({
    schemaVersion: 1,
    form: { title: "Survives reload", date: originalDate, time: originalTime },
  });
  expect(draft.form.exercises[0]).toMatchObject({
    name: "Squat", notes: "Deep", sets: [expect.objectContaining({ reps: "5", weightAmount: "225", notes: "Solid" })],
  });

  first.unmount();
  render(<WorkoutPage {...renderPageProps()} />);
  expect(screen.getByLabelText("Workout title")).toHaveValue("Survives reload");
  expect(screen.getByLabelText("Date")).toHaveValue(originalDate);
  expect(screen.getByLabelText("Time")).toHaveValue(originalTime);
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(225);
});

test("ordinary unmount keeps a draft while explicit discard clears it", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const view = render(<WorkoutPage {...renderPageProps()} />);
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
  fillFirstSet();
  await storedDraft();
  initial.unmount();

  const props = renderPageProps();
  render(<WorkoutPage {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
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
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  expect(props.saveWorkoutEntry.mock.calls[0][0]).toHaveProperty("finishedAt");
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull();
});

test("editing a saved workout neither restores into nor clears the new-workout draft", async () => {
  const initial = render(<WorkoutPage {...renderPageProps()} />);
  fireEvent.change(screen.getByLabelText("Workout title"), { target: { value: "New draft" } });
  await storedDraft();
  initial.unmount();

  const props = renderPageProps({ workoutEntries: [entry()] });
  render(<WorkoutPage {...props} />);
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
  expect(screen.getByRole("button", { name: "Find an exercise for exercise 1" })).toHaveAttribute("aria-expanded", "false");
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
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

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
  const saved = entry({
    startedAt: "2026-08-09T18:30:00.000Z",
    finishedAt: "2026-08-09T19:35:00.000Z",
  });
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
  const completed = screen.getByText("Chest Day").closest("article");
  expect(within(completed).getByText("Start")).toBeInTheDocument();
  expect(within(completed).getByText("Finish")).toBeInTheDocument();
  expect(within(completed).getByText("1 hr 5 min")).toBeInTheDocument();
  const legacy = screen.getByText("Legacy Workout").closest("article");
  expect(within(legacy).queryByText("Duration")).not.toBeInTheDocument();
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
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(props.saveWorkoutEntry).toHaveBeenCalledWith(expect.objectContaining({
    photos: [expect.objectContaining({ blob: second, isDraft: true, url: "blob:second.jpg" })],
  }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.jpg");
});

test("editing preserves photos and each workout history card owns its gallery", () => {
  const withPhoto = entry({ photos: [{ id: "photo-1", url: "blob:stored" }] });
  const withoutPhoto = entry({ id: "workout-2", title: "No Photo Workout" });
  const props = renderPage({ workoutEntries: [withPhoto, withoutPhoto] });

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

test("places an empty curated Trophy Case before Exercise History while PRs remain candidates", () => {
  renderPage({ workoutEntries: [entry()] });
  const trophyHeading = screen.getByRole("heading", { name: "Trophy Case" });
  const historyHeading = screen.getByRole("heading", { name: "Exercise History" });
  expect(trophyHeading.compareDocumentPosition(historyHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Incline Press.*1 performance/ }));
  expect(screen.getAllByRole("button", { name: "Add to Trophy Case" }).length).toBeGreaterThan(0);
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
