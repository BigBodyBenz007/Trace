import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App, { localCalendarDateKey } from "./App";
import { createCompoundDefinition } from "./services/compoundCatalog";
import { createExerciseDefinition } from "./services/exerciseCatalog";
import {
  createWorkoutDraftFromPlannedWorkout,
  WORKOUT_DRAFT_STORAGE_KEY,
} from "./services/workoutDraft";
import { deletePhotos, getPhoto, openPhotoDatabase, putPhotos } from "./storage/photoStorage";
import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  traceBackupFilename,
} from "./services/traceBackup";

jest.mock("./storage/photoStorage", () => ({
  clearCompletedMigrationBackup: jest.fn(),
  dataUrlToBlob: jest.fn(),
  deletePhotos: jest.fn(),
  getPhoto: jest.fn(),
  getAllPhotos: jest.fn(),
  hasLegacyPhotos: jest.fn(() => false),
  markLegacyMigrationComplete: jest.fn(),
  migrateLegacyPhotos: jest.fn(),
  openPhotoDatabase: jest.fn(() => new Promise(() => {})),
  putPhotos: jest.fn(),
  replaceAllPhotos: jest.fn(),
}));

jest.mock("./services/traceBackup", () => ({
  createTraceBackup: jest.fn(),
  parseTraceBackupText: jest.fn(),
  restoreTraceBackup: jest.fn(),
  traceBackupFilename: jest.fn(() => "trace-backup-settings.json"),
}));

let originalRequestAnimationFrame;
let originalCancelAnimationFrame;
let originalScrollTo;
let originalScrollIntoView;
let originalCreateObjectURL;
let originalRevokeObjectURL;

beforeEach(() => {
  jest.clearAllMocks();
  createTraceBackup.mockReset();
  parseTraceBackupText.mockReset();
  restoreTraceBackup.mockReset();
  traceBackupFilename.mockReset();
  localStorage.clear();
  traceBackupFilename.mockReturnValue("trace-backup-settings.json");
  originalRequestAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;
  originalScrollTo = window.scrollTo;
  originalScrollIntoView = Element.prototype.scrollIntoView;
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  URL.createObjectURL = jest.fn((blob) => `blob:${blob.size}:${blob.type}`);
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.scrollTo = originalScrollTo;
  Element.prototype.scrollIntoView = originalScrollIntoView;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

function renderAppAtTimeline() {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  window.scrollTo.mockClear();
}

function expectDestinationScrolledToTop() {
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 0,
    left: 0,
    behavior: "auto",
  });
}

function openWorkouts() {
  fireEvent.click(screen.getByRole("button", { name: "Workouts" }));
}

function openBackupFromSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  const actions = screen.getAllByRole("button", { name: "Backup & Restore" });
  expect(actions).toHaveLength(1);
  fireEvent.click(actions[0]);
}

function expandCompletedWorkout(title) {
  fireEvent.click(
    screen.getByRole("button", { name: `Expand workout: ${title}` })
  );
}

function getLifeCurrentRenderer(renderer) {
  const current = screen.getByTestId("life-current");
  return current.matches(`[data-life-current-renderer="${renderer}"]`)
    ? current
    : current.querySelector(`[data-life-current-renderer="${renderer}"]`);
}

function plannedWorkout(id, title = "Upper Body") {
  return {
    id,
    schemaVersion: 1,
    type: "strength",
    scheduledDate: "2026-08-22",
    title,
    notes: "Plan only",
    exercises: [{
      id: `${id}:exercise`,
      name: "Dumbbell Bench Press",
      exerciseId: "trace:chest-db-bench-002",
      notes: "",
      targetSets: [],
    }],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
  };
}

function mockWindowScrollPosition(scrollX, scrollY) {
  const originalScrollX = Object.getOwnPropertyDescriptor(window, "scrollX");
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollX", { configurable: true, value: scrollX });
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
  return () => {
    if (originalScrollX) Object.defineProperty(window, "scrollX", originalScrollX);
    else delete window.scrollX;
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    else delete window.scrollY;
  };
}

function captureCeremonyTimers() {
  const callbacks = new Map();
  const ceremonyDelays = new Set([350, 1750, 2850, 3000, 3800]);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const timerSpy = jest.spyOn(window, "setTimeout").mockImplementation((callback, delay, ...args) => {
    if (!ceremonyDelays.has(delay)) return nativeSetTimeout(callback, delay, ...args);
    callbacks.set(delay, () => callback(...args));
    return 100000 + delay;
  });
  return {
    run(delay) {
      const callback = callbacks.get(delay);
      if (!callback) throw new Error(`No ceremony timer captured for ${delay}ms`);
      act(callback);
    },
    restore() {
      timerSpy.mockRestore();
    },
  };
}

function openMedications() {
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
}

function logTraceCompound(search, compoundName, amount = "1") {
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: search },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: `Select Trace compound ${compoundName}`,
    })
  );
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByLabelText("Dose unit"), {
    target: { value: "mg" },
  });
  fireEvent.change(screen.getByLabelText("Method / route"), {
    target: { value: "oral" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
}

test("passes authoritative structured activity to the Home Life Current", async () => {
  localStorage.setItem("nutritionEntries", JSON.stringify([
    { id: "nutrition-current", loggedAt: "2026-05-18T12:00:00" },
  ]));

  renderAppAtTimeline();

  expect(await screen.findByTestId("life-current")).toBeInTheDocument();
  expect(screen.getByText("No memories found.")).toBeInTheDocument();
});

test("loads and preserves planned workouts separately from completed workout storage", async () => {
  const plans = [plannedWorkout("planned-workout:loaded")];
  const serialized = JSON.stringify(plans);
  localStorage.setItem("plannedWorkouts", serialized);

  const first = render(<App />);
  await waitFor(() => expect(screen.getByTestId("trace-app-shell"))
    .toHaveAttribute("data-planned-workout-count", "1"));
  expect(localStorage.getItem("plannedWorkouts")).toBe(serialized);
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  first.unmount();

  render(<App />);
  await waitFor(() => expect(screen.getByTestId("trace-app-shell"))
    .toHaveAttribute("data-planned-workout-count", "1"));
  expect(localStorage.getItem("plannedWorkouts")).toBe(serialized);
  expect(localStorage.getItem("workoutEntries")).toBeNull();
});

test("successful same-tab restore immediately refreshes planned-workout App state", async () => {
  const originalPlans = [plannedWorkout("planned-workout:original")];
  const restoredPlans = [
    plannedWorkout("planned-workout:restored-one", "Push"),
    plannedWorkout("planned-workout:restored-two", "Pull"),
  ];
  localStorage.setItem("plannedWorkouts", JSON.stringify(originalPlans));
  const restoredBackup = {
    createdAt: "2026-08-22T18:00:00.000Z",
    data: { structured: { plannedWorkouts: restoredPlans }, photos: [] },
  };
  parseTraceBackupText.mockReturnValue({
    backup: restoredBackup,
    summary: { memories: 0, photos: 0, plannedWorkouts: 2 },
  });
  restoreTraceBackup.mockImplementation(async () => {
    localStorage.setItem("plannedWorkouts", JSON.stringify(restoredPlans));
    return { memories: 0, photos: 0, plannedWorkouts: 2 };
  });
  window.confirm = jest.fn(() => true);

  render(<App />);
  await waitFor(() => expect(screen.getByTestId("trace-app-shell"))
    .toHaveAttribute("data-planned-workout-count", "1"));
  openBackupFromSettings();
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace-backup.json", { type: "application/json" })] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));

  expect(await screen.findByRole("heading", { name: /Trace restored successfully/ })).toBeInTheDocument();
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute(
    "data-planned-workout-count",
    "2"
  );
  expect(JSON.parse(localStorage.getItem("plannedWorkouts"))).toEqual(restoredPlans);
  expect(localStorage.getItem("workoutEntries")).toBeNull();
});

test("same-tab restore leaves navigation unchanged and resumes an orphaned active draft with entered sets", async () => {
  const restoredDraft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout("planned-workout:deleted", "Restored Active Workout"),
    new Date(2026, 7, 22, 18, 0)
  );
  restoredDraft.form.exercises[0].sets[0] = {
    ...restoredDraft.form.exercises[0].sets[0],
    reps: "9",
    weightAmount: "185",
    notes: "Preserved from backup",
    isUntouched: false,
  };
  const restoredBackup = {
    createdAt: "2026-08-22T19:00:00.000Z",
    data: { structured: { plannedWorkouts: [], workoutDraft: restoredDraft }, photos: [] },
  };
  const restoredSummary = {
    memories: 0,
    photos: 0,
    plannedWorkouts: 0,
    activeWorkoutDraft: true,
  };
  parseTraceBackupText.mockReturnValue({ backup: restoredBackup, summary: restoredSummary });
  restoreTraceBackup.mockImplementation(async () => {
    localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(restoredDraft));
    return restoredSummary;
  });
  window.confirm = jest.fn(() => true);

  renderAppAtTimeline();
  openBackupFromSettings();
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace-backup.json", { type: "application/json" })] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));

  expect(await screen.findByRole("heading", { name: /Trace restored successfully/ })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Backup & Restore" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Workouts" })).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" }).at(-1));
  openWorkouts();
  expect(screen.getByRole("heading", { name: "Workout Roadmap" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Restored Active Workout" })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(185);
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(9);
  expect(screen.getByLabelText("Exercise 1 set 1 notes")).toHaveValue("Preserved from backup");
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY))).toMatchObject({
    plannedWorkoutId: "planned-workout:deleted",
  });
});

function fillBodyweightWorkout(title = "Push Day") {
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "Dips" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 load mode"), {
    target: { value: "bodyweight" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "6" },
  });
}

test("Timeline to Nutrition lands at the top after rendering", () => {
  renderAppAtTimeline();

  fireEvent.click(screen.getByRole("button", { name: "Nutrition" }));

  expect(
    screen.getByRole("heading", { name: "Nutrition" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Timeline opens the first-class Health page and Health measurements survive remount", async () => {
  const first = render(<App />);
  const navigation = screen.getAllByRole("button").map((button) => button.textContent.trim());
  expect(navigation.indexOf("Nutrition")).toBeLessThan(navigation.indexOf("Health"));
  expect(navigation.indexOf("Health")).toBeLessThan(navigation.indexOf("Workouts"));
  fireEvent.click(screen.getByRole("button", { name: "Health" }));
  expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "255" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  const stored = JSON.parse(localStorage.getItem("healthMeasurementEntries"));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ schemaVersion: 1, measurements: { weight: { value: 255, unit: "lb" } } });
  expect(stored[0].id).toBeTruthy();
  first.unmount();

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Health" }));
  expect(await screen.findByText("255 lb")).toBeInTheDocument();
});

test("Settings opens and global unit preferences survive remount into a fresh Health form", () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  fireEvent.click(screen.getByLabelText("Centimeters (cm)", { selector: 'input[name="height"]' }));
  fireEvent.click(screen.getByLabelText("Centimeters (cm)", { selector: 'input[name="circumference"]' }));
  expect(JSON.parse(localStorage.getItem("appSettings"))).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "river" });
  first.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Health" }));
  expect(screen.getByLabelText("Weight unit")).toHaveTextContent("kg");
  expect(screen.getByLabelText("Waist unit")).toHaveTextContent("cm");
  expect(screen.getByLabelText("Height centimeters")).toBeInTheDocument();
});

test("Timeline opens Protocols and returns to Timeline at the top", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Protocols" }));
  expect(screen.getByRole("heading", { name: "Protocols" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
  window.scrollTo.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Nutrition creates, persists, searches, and logs a custom grocery food", async () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Nutrition" }));
  fireEvent.click(screen.getByRole("button", { name: "Create grocery food" }));
  const creator = screen.getByRole("button", { name: "Save grocery food" }).closest("form");

  fireEvent.change(within(creator).getByLabelText("Food name"), {
    target: { value: "Raw chicken breast strips" },
  });
  fireEvent.change(within(creator).getByLabelText("Brand (optional)"), {
    target: { value: "Market Pantry" },
  });
  fireEvent.change(within(creator).getByLabelText("Food category / type"), {
    target: { value: "protein" },
  });
  fireEvent.change(within(creator).getByLabelText("Serving amount"), {
    target: { value: "4" },
  });
  fireEvent.change(within(creator).getByLabelText("Serving unit"), {
    target: { value: "oz" },
  });
  fireEvent.change(within(creator).getByLabelText("Protein (g)"), {
    target: { value: "26" },
  });
  fireEvent.click(within(creator).getByRole("button", { name: "Save grocery food" }));

  await waitFor(() => expect(JSON.parse(localStorage.getItem("userFoods"))).toHaveLength(1));
  const [savedFood] = JSON.parse(localStorage.getItem("userFoods"));
  expect(savedFood).toMatchObject({
    name: "Raw chicken breast strips",
    brand: "Market Pantry",
    category: "protein",
    categoryLabel: "Protein / meat",
    sourceType: "grocery-custom",
    nutrients: {
      calories: null,
      protein: 26,
      carbohydrates: null,
      fat: null,
      fiber: null,
      sodium: null,
    },
    provenance: { label: "User-entered", completeness: "partial" },
  });

  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "Market Pantry" },
  });
  const searchResult = await screen.findByRole("button", {
    name: /Raw chicken breast strips/i,
  });
  expect(within(searchResult).getByText("Grocery/custom")).toBeInTheDocument();
  expect(within(searchResult).getByText("User-entered")).toBeInTheDocument();
  fireEvent.click(searchResult);
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  const [loggedMeal] = JSON.parse(localStorage.getItem("nutritionEntries"));
  expect(loggedMeal).toMatchObject({
    name: "Raw chicken breast strips",
    calories: null,
    protein: 26,
    carbohydrates: null,
    fat: null,
    fiber: null,
    foodReference: {
      sourceType: "grocery-custom",
      categoryLabel: "Protein / meat",
      brand: "Market Pantry",
    },
  });
});

test("Timeline opens Today's Schedule and returns to Timeline at the top", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  expect(screen.getByTestId("today-schedule-dashboard")).toHaveAttribute("data-expanded", "false");
  expect(screen.getByRole("heading", { name: "Today's Schedule" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
  expect(screen.getByRole("heading", { name: "Nothing scheduled for today." })).toBeInTheDocument();

  window.scrollTo.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Today reads scheduled protocol items from the existing protocol collection", async () => {
  const today = new Date();
  const isoWeekday = today.getDay() || 7;
  localStorage.setItem("protocols", JSON.stringify([{
    id: "protocol:today",
    schemaVersion: 1,
    name: "Stored protocol",
    startDate: localCalendarDateKey(today),
    endDate: null,
    status: "active",
    notes: "",
    items: [{
      id: "protocol-item:today",
      compound: { name: "Stored compound" },
      dose: { amount: 2.5, unit: "mg" },
      route: { code: "intramuscular" },
      schedule: { type: "weekly-days", weekdays: [isoWeekday] },
      notes: "Left side",
    }],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    endedAt: null,
  }]));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));

  const schedule = await screen.findByRole("region", { name: "Today's actionable items" });
  const protocols = schedule.querySelector('[data-schedule-item-type="protocol"]');
  expect(within(protocols).getByRole("heading", { name: "Stored compound" })).toBeInTheDocument();
  expect(within(protocols).getByText("Stored protocol")).toBeInTheDocument();
  expect(within(protocols).getByText("2.5 mg")).toBeInTheDocument();
  expect(within(protocols).getByText("Intramuscular (IM)")).toBeInTheDocument();
  expect(within(protocols).getByText("Left side")).toBeInTheDocument();
  expect(localStorage.getItem("medicationEntries")).toBeNull();
});

test("Today persists completed and skipped protocol occurrences by date without altering the recurring protocol", () => {
  const today = new Date();
  const date = localCalendarDateKey(today);
  const isoWeekday = today.getDay() || 7;
  const storedProtocol = {
    id: "protocol:occurrences",
    schemaVersion: 1,
    name: "Recurring protocol",
    startDate: date,
    endDate: null,
    status: "active",
    notes: "Series remains active",
    items: [
      { id: "protocol-item:complete", compound: { name: "B12" }, dose: { amount: 1, unit: "ml" }, route: { code: "subcutaneous" }, schedule: { type: "weekly-days", weekdays: [isoWeekday] }, notes: "Complete today" },
      { id: "protocol-item:skip", compound: { name: "Vitamin C" }, dose: { amount: 500, unit: "mg" }, route: { code: "oral" }, schedule: { type: "weekly-days", weekdays: [isoWeekday] }, notes: "Skip today" },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    endedAt: null,
  };
  localStorage.setItem("protocols", JSON.stringify([storedProtocol]));

  const first = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  let remaining = screen.getByRole("list", { name: "Today's schedule summary" });
  let protocolCard = within(remaining).getByRole("button", { name: "Open protocol B12" }).closest("li");
  fireEvent.click(within(protocolCard).getByRole("button", { name: "Complete protocol B12" }));
  remaining = screen.getByRole("list", { name: "Today's schedule summary" });
  protocolCard = within(remaining).getByRole("button", { name: "Open protocol Vitamin C" }).closest("li");
  fireEvent.click(within(protocolCard).getByRole("button", { name: "Skip protocol Vitamin C" }));
  fireEvent.change(screen.getByLabelText("Skip reason"), { target: { value: "Schedule conflict" } });
  fireEvent.click(screen.getByRole("button", { name: "Save skip" }));

  const occurrences = JSON.parse(localStorage.getItem("protocolOccurrences"));
  expect(occurrences).toMatchObject({ schemaVersion: 1 });
  expect(occurrences.occurrences).toHaveLength(2);
  expect(occurrences.occurrences).toEqual(expect.arrayContaining([
    expect.objectContaining({ protocolId: storedProtocol.id, itemId: "protocol-item:complete", date, status: "completed" }),
    expect.objectContaining({ protocolId: storedProtocol.id, itemId: "protocol-item:skip", date, status: "skipped", skipReason: "Schedule conflict" }),
  ]));
  expect(JSON.parse(localStorage.getItem("protocols"))).toEqual([storedProtocol]);
  expect(localStorage.getItem("medicationEntries")).toBeNull();

  first.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  expect(within(screen.getByRole("region", { name: "Completed today" })).getByText("B12 · 1 mL"))
    .toBeInTheDocument();
  const remainingRegion = screen.getByRole("region", { name: "Remaining today" });
  expect(within(remainingRegion).getByRole("button", { name: "Open protocol Vitamin C" })).toHaveTextContent("Skipped");
  fireEvent.click(within(remainingRegion).getByRole("button", { name: "Open protocol Vitamin C" }));
  expect(screen.getByText("Reason: Schedule conflict")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Complete" }));
  const completedOccurrence = JSON.parse(localStorage.getItem("protocolOccurrences"))
    .occurrences.find(({ itemId }) => itemId === "protocol-item:skip");
  expect(completedOccurrence).toMatchObject({
    date,
    status: "completed",
    skipReason: "Schedule conflict",
  });
  expect(completedOccurrence.completedAt).toBeTruthy();
  expect(completedOccurrence.skippedAt).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("protocols"))).toEqual([storedProtocol]);
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
  expect(within(screen.getByRole("region", { name: "Completed today" }))
    .getByRole("button", { name: "Open protocol Vitamin C" })).toBeInTheDocument();
});

test("Today persists daily action create, edit, skip, navigation, and delete without creating workout history", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to Today" }));
  fireEvent.change(screen.getByLabelText("Action type"), { target: { value: "errand" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Pick up prescription" } });
  fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "time" } });
  fireEvent.change(screen.getByLabelText("Time"), { target: { value: "17:30" } });
  fireEvent.change(screen.getByLabelText("Location (optional)"), { target: { value: "Pharmacy" } });
  fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "Use drive-through" } });
  fireEvent.click(screen.getByRole("button", { name: "Save daily action" }));

  let stored = JSON.parse(localStorage.getItem("dailyActions"));
  expect(stored).toMatchObject({ schemaVersion: 1 });
  expect(stored.actions).toHaveLength(1);
  expect(stored.actions[0]).toMatchObject({
    title: "Pick up prescription",
    actionType: "errand",
    date: localCalendarDateKey(),
    time: "17:30",
    location: "Pharmacy",
    notes: "Use drive-through",
    status: "scheduled",
  });
  expect(localStorage.getItem("workoutEntries")).toBeNull();

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Open daily action Pick up prescription" }));
  expect(screen.getByRole("region", { name: "Daily action Pick up prescription" })).toHaveTextContent("Use drive-through");

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Collect prescription" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  stored = JSON.parse(localStorage.getItem("dailyActions"));
  expect(stored.actions[0].title).toBe("Collect prescription");

  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  fireEvent.change(screen.getByLabelText("Skip reason"), { target: { value: "Schedule conflict" } });
  fireEvent.click(screen.getByRole("button", { name: "Save skip" }));
  stored = JSON.parse(localStorage.getItem("dailyActions"));
  expect(stored.actions[0]).toMatchObject({ status: "skipped", skipReason: "Schedule conflict" });
  expect(stored.actions[0].skippedAt).toBeTruthy();
  expect(localStorage.getItem("workoutEntries")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Complete" }));
  stored = JSON.parse(localStorage.getItem("dailyActions"));
  expect(stored.actions[0]).toMatchObject({
    status: "completed",
    skipReason: "Schedule conflict",
  });
  expect(stored.actions[0].completedAt).toBeTruthy();
  expect(stored.actions[0].skippedAt).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
  expect(within(screen.getByRole("region", { name: "Completed today" }))
    .getByRole("button", { name: "Open daily action Collect prescription" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open daily action Collect prescription" }));
  expect(screen.getByText("Previously skipped: Schedule conflict")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("dailyActions")).actions).toEqual([]));
  expect(confirm).toHaveBeenCalled();
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  confirm.mockRestore();
});

test("Today re-sorts daily actions immediately after create and edit", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));

  const addTimedAction = (title, time) => {
    fireEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: title } });
    fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "time" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: time } });
    fireEvent.click(screen.getByRole("button", { name: "Save daily action" }));
  };
  const orderedActions = () => within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getAllByRole("button", { name: /^Open / }).map((button) => button.getAttribute("aria-label"));

  addTimedAction("Late action", "16:00");
  addTimedAction("Early action", "09:00");
  expect(orderedActions()).toEqual([
    "Open daily action Early action",
    "Open daily action Late action",
  ]);

  fireEvent.click(screen.getByRole("button", { name: "Open daily action Late action" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Time"), { target: { value: "08:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
  expect(orderedActions()).toEqual([
    "Open daily action Late action",
    "Open daily action Early action",
  ]);
});

test("Today creates, edits, and deletes plans without creating completed workouts", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: "Today's Push" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Bench Press" } });
  fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
  fireEvent.change(screen.getByLabelText("Exercise 2 name"), { target: { value: "Triceps Extension" } });
  fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));

  let stored = JSON.parse(localStorage.getItem("plannedWorkouts"));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    schemaVersion: 1,
    type: "strength",
    scheduledDate: localCalendarDateKey(),
    title: "Today's Push",
  });
  expect(stored[0].exercises.map(({ name }) => name)).toEqual([
    "Bench Press",
    "Triceps Extension",
  ]);
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("data-planned-workout-count", "1");

  fireEvent.click(screen.getByRole("button", { name: "Edit planned workout Today's Push" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: "Push and Arms" } });
  fireEvent.click(screen.getByRole("button", { name: "Remove exercise 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  stored = JSON.parse(localStorage.getItem("plannedWorkouts"));
  expect(stored[0].title).toBe("Push and Arms");
  expect(stored[0].exercises.map(({ name }) => name)).toEqual(["Triceps Extension"]);
  expect(localStorage.getItem("workoutEntries")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Push and Arms" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("plannedWorkouts"))).toEqual([]));
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("data-planned-workout-count", "0");
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  confirm.mockRestore();
});

test("Today Undo restores the exact deleted plan and storage order without changing workout history", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const scheduledDate = localCalendarDateKey();
  const first = {
    ...plannedWorkout("planned-workout:first", "First Plan"),
    scheduledDate,
  };
  const deleted = {
    ...plannedWorkout("planned-workout:deleted", "Deleted Plan"),
    scheduledDate,
    notes: "Distinct plan notes",
    createdAt: "2026-08-18T10:00:00.000Z",
    updatedAt: "2026-08-21T11:30:00.000Z",
    futurePlanField: { preserved: true },
    exercises: [{
      id: "planned-exercise:deleted",
      name: "Front Squat",
      exerciseId: "trace:legs-front-squat-036",
      notes: "Exact exercise notes",
      targetSets: [{
        id: "planned-set:deleted",
        setType: "working",
        reps: 6,
        load: { mode: "external", amount: 102.5, unit: "kg" },
        notes: "Exact set notes",
      }],
    }],
  };
  const last = {
    ...plannedWorkout("planned-workout:last", "Last Plan"),
    scheduledDate,
  };
  const originalPlans = [first, deleted, last];
  localStorage.setItem("plannedWorkouts", JSON.stringify(originalPlans));
  localStorage.setItem("workoutEntries", "[]");

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Deleted Plan" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("plannedWorkouts")))
    .toEqual([first, last]));
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  await waitFor(() => expect(JSON.parse(localStorage.getItem("plannedWorkouts")))
    .toEqual(originalPlans));
  expect(screen.getByRole("status")).toHaveTextContent("Planned workout restored.");
  expect(localStorage.getItem("workoutEntries")).toBe("[]");
  confirm.mockRestore();
});

test("failed Today Undo keeps the plan deleted and reports the storage error", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const existing = {
    ...plannedWorkout("planned-workout:restore-failure", "Restore Failure Plan"),
    scheduledDate: localCalendarDateKey(),
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([existing]));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Restore Failure Plan" }));
  await waitFor(() => expect(localStorage.getItem("plannedWorkouts")).toBe("[]"));

  const originalSetItem = Storage.prototype.setItem;
  const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
    if (key === "plannedWorkouts") throw new Error("quota full");
    return originalSetItem.call(this, key, value);
  });
  try {
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(localStorage.getItem("plannedWorkouts")).toBe("[]");
    expect(screen.getByText("The planned workout could not be restored.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  } finally {
    setItem.mockRestore();
    confirm.mockRestore();
  }
});

test("Today deletion Undo disappears after navigation remounts the page", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const existing = {
    ...plannedWorkout("planned-workout:session-only", "Session-only Plan"),
    scheduledDate: localCalendarDateKey(),
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([existing]));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete planned workout Session-only Plan" }));
  await waitFor(() => expect(localStorage.getItem("plannedWorkouts")).toBe("[]"));
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));

  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  expect(localStorage.getItem("plannedWorkouts")).toBe("[]");
  confirm.mockRestore();
});

test("Today planner saves an exercise through the existing reusable catalog without saving or duplicating the plan", async () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
  fireEvent.change(screen.getByLabelText("Planned workout title"), { target: { value: "Unsaved Push" } });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: "Cable Fly" } });
  fireEvent.click(screen.getByRole("button", { name: "Add target set to exercise 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 target set 1 intended weight"), { target: { value: "35" } });
  fireEvent.click(screen.getByRole("button", { name: "Save exercise 1 as reusable" }));

  await waitFor(() => expect(JSON.parse(localStorage.getItem("savedExercises"))).toHaveLength(1));
  expect(JSON.parse(localStorage.getItem("savedExercises"))[0]).toMatchObject({
    name: "Cable Fly",
    defaults: { load: { mode: "external", unit: "lb" } },
  });
  expect(localStorage.getItem("plannedWorkouts")).toBeNull();
  expect(screen.getByRole("form", { name: "Create planned workout" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save exercise 1 as reusable" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("savedExercises"))).toHaveLength(1));
  expect(screen.getByRole("status")).toHaveTextContent("Cable Fly is already saved for reuse.");
});

test("Today skips a planned workout for its date without deleting or completing it", async () => {
  const existing = {
    ...plannedWorkout("planned-workout:skip", "Skip Day"),
    scheduledDate: localCalendarDateKey(),
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([existing]));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  const workoutCard = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Skip Day" }).closest("li");
  fireEvent.click(within(workoutCard).getByRole("button", { name: "Skip workout Skip Day" }));
  expect(JSON.parse(localStorage.getItem("plannedWorkouts"))[0]).not.toHaveProperty("skippedDates");
  const reasonDialog = screen.getByRole("dialog", { name: "Skip workout Skip Day" });
  fireEvent.change(within(reasonDialog).getByLabelText("Skip reason"), { target: { value: "Schedule conflict" } });
  fireEvent.click(within(reasonDialog).getByRole("button", { name: "Save skip" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("plannedWorkouts"))[0])
    .toMatchObject({
      id: existing.id,
      title: existing.title,
      exercises: existing.exercises,
      skippedDates: [localCalendarDateKey()],
      skipReasons: { [localCalendarDateKey()]: "Schedule conflict" },
    }));
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  expect(screen.getAllByText("Skipped")[0]).toHaveClass("trace-today-item-status");
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getByText("Skipped for today · Schedule conflict")).toBeInTheDocument();
  const skippedCard = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Skip Day" }).closest("li");
  expect(within(skippedCard).getByRole("button", { name: "Start workout Skip Day" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open completed workout Skip Day" })).not.toBeInTheDocument();
  fireEvent.click(within(skippedCard).getByRole("button", { name: "Start workout Skip Day" }));
  expect(screen.getByRole("heading", { name: "Workout Roadmap" })).toBeInTheDocument();
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Today's Schedule" })[0]);
  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Continue workout Skip Day" })).toBeInTheDocument();
  expect(localStorage.getItem("workoutEntries")).toBeNull();
});

test("executes a plan through WorkoutPage and reflects completion and deletion in Today", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const plan = {
    ...plannedWorkout("planned-workout:execute", "Planned Push"),
    scheduledDate: localCalendarDateKey(),
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
      }, {
        id: "planned-set:bench-working",
        setType: "working",
        reps: 6,
        load: { mode: "external", amount: 70, unit: "kg" },
        notes: "Working target",
      }],
    }],
  };
  const savedPlan = JSON.stringify([plan]);
  localStorage.setItem("plannedWorkouts", savedPlan);
  const startedAfter = Date.now();

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  const workoutCard = within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Open workout preview Planned Push" }).closest("li");
  fireEvent.click(within(workoutCard).getByRole("button", { name: "Start workout Planned Push" }));

  expect(screen.getByRole("heading", { name: "Workouts" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Workout Roadmap" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Planned Push" })).toBeInTheDocument();
  expect(screen.getByText("Plan notes")).toBeInTheDocument();
  const roadmapExercise = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" });
  expect(within(roadmapExercise).getByText("2 planned sets")).toBeInTheDocument();
  expect(within(roadmapExercise).getByText("Warm-up · 60 kg × 8")).toBeInTheDocument();
  expect(within(roadmapExercise).getByText("Working · 70 kg × 6")).toBeInTheDocument();
  const volume = screen.getByRole("list", { name: "Workout set summary" });
  expect(volume).toHaveTextContent("2 total sets");
  expect(volume).toHaveTextContent("1 warm-up");
  expect(volume).toHaveTextContent("1 working");
  expect(screen.getAllByRole("button", { name: "Back to Today's Schedule" })).toHaveLength(2);
  fireEvent.click(within(roadmapExercise).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 type")).toHaveValue("warm-up");
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(8);
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(60);
  expect(screen.getByLabelText("Exercise 1 set 1 weight unit")).toHaveValue("kg");
  expect(screen.getByLabelText("Exercise 1 set 1 notes")).toHaveValue("Target notes");
  expect(screen.getByLabelText("Exercise 1 set 2 reps")).toHaveValue(6);
  expect(screen.getByLabelText("Exercise 1 set 2 weight")).toHaveValue(70);
  expect(screen.getByLabelText("Exercise 1 set 2 weight unit")).toHaveValue("kg");
  expect(screen.getByLabelText("Exercise 1 set 2 notes")).toHaveValue("Working target");

  const activeDraft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(activeDraft.plannedWorkoutId).toBe(plan.id);
  expect(activeDraft.context.originPage).toBe("today");
  expect(new Date(activeDraft.startedAt).getTime()).toBeGreaterThanOrEqual(startedAfter);
  expect(activeDraft).not.toHaveProperty("finishedAt");
  expect(activeDraft.form.exercises[0].id).not.toBe(plan.exercises[0].id);
  expect(activeDraft.form.exercises[0].sets[0].id).not.toBe(
    plan.exercises[0].targetSets[0].id
  );

  expect(localStorage.getItem("plannedWorkouts")).toBe(savedPlan);
  fireEvent.click(within(roadmapExercise).getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem("workoutEntries"))).toHaveLength(1);
  });
  const completed = JSON.parse(localStorage.getItem("workoutEntries"))[0];
  expect(completed).toMatchObject({
    plannedWorkoutId: plan.id,
    title: "Planned Push",
    exercises: [expect.objectContaining({
      name: "Dumbbell Bench Press",
      sets: [
        expect.objectContaining({
          reps: 8,
          load: { mode: "external", amount: 60, unit: "kg" },
          notes: "Target notes",
        }),
        expect.objectContaining({
          reps: 6,
          load: { mode: "external", amount: 70, unit: "kg" },
          notes: "Working target",
        }),
      ],
    })],
  });
  expect(completed.finishedAt).toBeTruthy();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem("plannedWorkouts")).toBe(savedPlan);

  expect(screen.getByRole("heading", { name: "Today's Schedule" })).toBeInTheDocument();
  expect(within(screen.getByRole("list", { name: "Completed today summary" }))
    .getByText("Completed")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getAllByText("Completed")[0]).toHaveClass("trace-today-item-status");
  expect(screen.queryByRole("button", { name: "Start planned workout Planned Push" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open completed workout Planned Push" }));
  expect(screen.getByRole("heading", { name: "Workout History" })).toBeInTheDocument();
  const expandCompleted = screen.queryByRole("button", { name: "Expand workout: Planned Push" });
  if (expandCompleted) fireEvent.click(expandCompleted);
  expect(screen.getByText(/Warm-up · 60 kg × 8 reps/)).toBeInTheDocument();
  expect(screen.getByText(/Working · 70 kg × 6 reps/)).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "center",
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]));
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getAllByText("Planned")[0]).toHaveClass("trace-today-item-status");
  expect(screen.getByRole("button", { name: "Start planned workout Planned Push" })).toBeInTheDocument();
  confirm.mockRestore();
});

test("saves a partial planned workout as resumable progress and completes it exactly once", async () => {
  const plan = {
    ...plannedWorkout("planned-workout:partial", "Partial Push"),
    scheduledDate: localCalendarDateKey(),
    exercises: [{
      id: "planned-exercise:press",
      name: "Dumbbell Press",
      notes: "Keep the completed values",
      targetSets: [{
        id: "planned-set:press",
        reps: 8,
        load: { mode: "external", amount: 60, unit: "kg" },
        notes: "Controlled",
      }],
    }, {
      id: "planned-exercise:dip",
      name: "Chest Dip",
      notes: "Finish later",
      targetSets: [{
        id: "planned-set:dip",
        reps: 10,
        load: { mode: "bodyweight" },
        notes: "Full range",
      }],
    }],
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([plan]));

  const firstRender = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Open workout preview Partial Push" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Partial Push" }));

  const firstExercise = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Press" });
  fireEvent.click(within(firstExercise).getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), {
    target: { value: "65" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "9" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Done editing" }));
  fireEvent.click(within(firstExercise).getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(screen.getByRole("heading", { name: "Today's Schedule" })).toBeInTheDocument();
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Workout progress saved.");
  expect(localStorage.getItem("workoutEntries")).toBeNull();
  const partialDraft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
  expect(partialDraft).toMatchObject({
    plannedWorkoutId: plan.id,
    context: { originPage: "today" },
    form: {
      exercises: [
        expect.objectContaining({
          name: "Dumbbell Press",
          roadmapStatus: "completed",
          sets: [expect.objectContaining({ weightAmount: "65", reps: "9" })],
        }),
        expect.objectContaining({ name: "Chest Dip", roadmapStatus: "pending" }),
      ],
    },
  });
  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByText("Started")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getAllByText("Started")[0]).toHaveClass("trace-today-item-status");
  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Continue workout Partial Push" })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  expect(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByText("Started")).toBeInTheDocument();

  firstRender.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Continue workout Partial Push" }));

  const restoredFirst = screen.getByRole("article", { name: "Roadmap exercise Dumbbell Press" });
  const restoredSecond = screen.getByRole("article", { name: "Roadmap exercise Chest Dip" });
  expect(within(restoredFirst).getByRole("button", { name: "Completed" }))
    .toHaveAttribute("aria-pressed", "true");
  expect(within(restoredSecond).getByRole("button", { name: "Completed" }))
    .toHaveAttribute("aria-pressed", "false");
  fireEvent.click(within(restoredFirst).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Exercise 1 set 1 weight")).toHaveValue(65);
  expect(screen.getByLabelText("Exercise 1 set 1 reps")).toHaveValue(9);

  fireEvent.click(within(restoredSecond).getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem("workoutEntries"))).toHaveLength(1);
  });
  expect(JSON.parse(localStorage.getItem("workoutEntries"))[0]).toMatchObject({
    plannedWorkoutId: plan.id,
    exercises: [
      expect.objectContaining({ roadmapStatus: "completed" }),
      expect.objectContaining({ roadmapStatus: "completed" }),
    ],
  });
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  expect(within(screen.getByRole("list", { name: "Completed today summary" }))
    .getByText("Completed")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toHaveLength(1);
});

test("uses one fixed auto-dismissing toast host for planner, preview, and Roadmap success", () => {
  jest.useFakeTimers();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const previewPlan = {
    ...plannedWorkout("planned-workout:toast-preview", "Preview Toast"),
    scheduledDate: localCalendarDateKey(),
  };
  const roadmapPlan = {
    ...plannedWorkout("planned-workout:toast-roadmap", "Roadmap Toast"),
    scheduledDate: localCalendarDateKey(),
    exercises: [{
      id: "planned-exercise:toast-one",
      name: "Push-Up",
      notes: "",
      targetSets: [{
        id: "planned-set:toast-one",
        reps: 10,
        load: { mode: "bodyweight" },
        notes: "",
      }],
    }, {
      id: "planned-exercise:toast-two",
      name: "Dip",
      notes: "",
      targetSets: [{
        id: "planned-set:toast-two",
        reps: 8,
        load: { mode: "bodyweight" },
        notes: "",
      }],
    }],
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([previewPlan, roadmapPlan]));

  try {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Create planned workout" }));
    fireEvent.change(screen.getByLabelText("Planned workout title"), {
      target: { value: "Planner Toast" },
    });
    fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
      target: { value: "Squat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save planned workout" }));

    const plannerToast = screen.getByTestId("save-confirmation");
    expect(plannerToast).toHaveTextContent("Planned workout created.");
    expect(plannerToast).toHaveClass("trace-save-confirmation");
    expect(plannerToast).toHaveAttribute("data-placement", "viewport-edge");
    expect(plannerToast).toHaveAttribute("aria-live", "polite");
    expect(plannerToast).toHaveStyle({ position: "fixed", zIndex: "10000" });
    expect(screen.getAllByTestId("save-confirmation")).toHaveLength(1);
    act(() => jest.advanceTimersByTime(3200));
    expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open workout preview Preview Toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip workout Preview Toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip without reason" }));
    expect(screen.getByTestId("save-confirmation")).toHaveTextContent(
      "Preview Toast marked skipped for today."
    );
    expect(screen.getByTestId("save-confirmation")).toHaveClass("trace-save-confirmation");
    fireEvent.click(screen.getByRole("button", { name: "Back to Today's Schedule" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
    expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));

    fireEvent.click(screen.getByRole("button", { name: "Open workout preview Roadmap Toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Start planned workout Roadmap Toast" }));
    fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Push-Up" }))
      .getByRole("button", { name: "Completed" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
    expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Workout progress saved.");
    expect(screen.getByTestId("save-confirmation")).toHaveClass("trace-save-confirmation");
    expect(screen.getAllByTestId("save-confirmation")).toHaveLength(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    act(() => jest.advanceTimersByTime(3200));
    expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
  } finally {
    confirm.mockRestore();
    if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
    else delete window.innerWidth;
    jest.useRealTimers();
  }
});

test("does not replace an unrelated draft and can resume it from the collision choice", () => {
  const plan = {
    ...plannedWorkout("planned-workout:collision", "Collision Plan"),
    scheduledDate: localCalendarDateKey(),
  };
  const unrelatedDraft = {
    schemaVersion: 1,
    startedAt: "2026-08-22T16:00:00.000Z",
    updatedAt: "2026-08-22T16:00:00.000Z",
    form: {
      title: "Unrelated workout",
      date: localCalendarDateKey(),
      time: "11:00",
      notes: "",
      exercises: [{
        id: "exercise:unrelated",
        name: "Squat",
        notes: "",
        sets: [{
          id: "set:unrelated",
          reps: "5",
          loadMode: "bodyweight",
          weightAmount: "",
          weightUnit: "lb",
          notes: "",
        }],
      }],
    },
    context: { activeSearchExerciseId: null },
  };
  const serializedDraft = JSON.stringify(unrelatedDraft);
  localStorage.setItem("plannedWorkouts", JSON.stringify([plan]));
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, serializedDraft);

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Collision Plan" }));
  expect(screen.getByRole("dialog", { name: "Workout already in progress" })).toBeInTheDocument();
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBe(serializedDraft);

  fireEvent.click(screen.getByRole("button", { name: "Resume current workout" }));
  expect(screen.getByRole("heading", { name: "Workouts" })).toBeInTheDocument();
  expect(screen.getByLabelText("Workout title")).toHaveValue("Unrelated workout");
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBe(serializedDraft);
  expect(localStorage.getItem("workoutEntries")).toBeNull();
});

test("explicit discard replaces an unrelated draft with the selected plan", () => {
  const plan = {
    ...plannedWorkout("planned-workout:discard", "Discard Choice Plan"),
    scheduledDate: localCalendarDateKey(),
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([plan]));
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    startedAt: "2026-08-22T16:00:00.000Z",
    updatedAt: "2026-08-22T16:00:00.000Z",
    form: {
      title: "Replace me deliberately",
      date: localCalendarDateKey(),
      time: "11:00",
      notes: "",
      exercises: [{ id: "exercise:old", name: "Squat", sets: [] }],
    },
  }));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Discard Choice Plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard and start plan" }));

  expect(screen.getByRole("heading", { name: "Workouts" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Workout Roadmap" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Discard Choice Plan" })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY))).toMatchObject({
    plannedWorkoutId: plan.id,
    form: { title: "Discard Choice Plan" },
  });
});

test("abandons and resumes the same plan draft without marking the plan complete", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  const plan = {
    ...plannedWorkout("planned-workout:resume", "Resume Plan"),
    scheduledDate: localCalendarDateKey(),
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([plan]));

  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Start planned workout Resume Plan" }));
  fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Today's Schedule" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getAllByText("Started")[0]).toHaveClass("trace-today-item-status");

  fireEvent.click(within(screen.getByRole("list", { name: "Today's schedule summary" }))
    .getByRole("button", { name: "Continue workout Resume Plan" }));
  expect(screen.queryByRole("dialog", { name: "Workout already in progress" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("article", { name: "Roadmap exercise Dumbbell Bench Press" }))
    .getByRole("button", { name: "Completed" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem("workoutEntries")).toBeNull();

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getAllByText("Planned")[0]).toHaveClass("trace-today-item-status");
  confirm.mockRestore();
});

test("prevents a second completed entry for the same planned workout", async () => {
  const plan = {
    ...plannedWorkout("planned-workout:duplicate", "Duplicate Guard"),
    scheduledDate: localCalendarDateKey(),
    exercises: [{
      id: "planned-exercise:dips",
      name: "Dips",
      notes: "",
      targetSets: [{
        id: "planned-set:dips",
        reps: 6,
        load: { mode: "bodyweight" },
        notes: "",
      }],
    }],
  };
  const existingEntry = {
    id: "workout:existing-completion",
    schemaVersion: 1,
    type: "strength",
    plannedWorkoutId: plan.id,
    title: plan.title,
    occurredAt: "2026-08-22T16:00:00.000Z",
    startedAt: "2026-08-22T16:00:00.000Z",
    finishedAt: "2026-08-22T17:00:00.000Z",
    notes: "",
    exercises: [{
      id: "exercise:existing",
      name: "Dips",
      sets: [{
        id: "set:existing",
        reps: 6,
        load: { mode: "bodyweight" },
        notes: "",
      }],
    }],
    createdAt: "2026-08-22T17:00:00.000Z",
    updatedAt: "2026-08-22T17:00:00.000Z",
  };
  localStorage.setItem("plannedWorkouts", JSON.stringify([plan]));
  localStorage.setItem("workoutEntries", JSON.stringify([existingEntry]));
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(
    createWorkoutDraftFromPlannedWorkout(plan, new Date(2026, 7, 22, 18, 0))
  ));

  renderAppAtTimeline();
  openWorkouts();
  expect(within(await screen.findByRole("form", { name: "Workout roadmap" }))
    .getByRole("heading", { name: "Duplicate Guard" })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("article", { name: "Roadmap exercise Dips" }))
    .getByRole("button", { name: "Completed" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([existingEntry]);
  expect(localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY)).not.toBeNull();
  expect(screen.getByText(/already linked to a completed workout/)).toBeInTheDocument();
});

test("Settings opens Backup & Restore and returns to Timeline without changing data", () => {
  localStorage.setItem("nutritionGoals", JSON.stringify({ calories: 2100 }));
  renderAppAtTimeline();
  expect(screen.queryByRole("button", { name: "Backup & Restore" })).not.toBeInTheDocument();
  openBackupFromSettings();
  expect(screen.getByRole("heading", { name: "Backup & Restore" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Download Trace Backup" })).toHaveLength(1);
  expectDestinationScrolledToTop();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("nutritionGoals"))).toEqual({ calories: 2100 });
});

test("ending and deleting a protocol never changes medication history", async () => {
  const medicationEntry = { id: "med:future", name: "Legacy", occurredAt: "2030-01-01T12:00:00.000Z" };
  const protocol = {
    id: "protocol:one", schemaVersion: 1, name: "User plan", startDate: "2026-08-01",
    endDate: null, status: "active", notes: "", createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z", endedAt: null,
    items: [{ id: "protocol-item:one", compound: { name: "Unknown snapshot", reference: { source: "trace-catalog", sourceId: "trace:compound:removed" } }, dose: { amount: 1, unit: "mg" }, route: { code: "oral" }, schedule: { type: "weekly-days", weekdays: [1] }, notes: "" }],
  };
  localStorage.setItem("medicationEntries", JSON.stringify([medicationEntry]));
  localStorage.setItem("protocols", JSON.stringify([protocol]));
  window.confirm = jest.fn(() => true);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Protocols" }));
  await waitFor(() => expect(screen.getByText("User plan")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "View Protocol" }));
  expect(screen.getByText("Unknown snapshot")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "End Protocol" })[0]);
  expect(JSON.parse(localStorage.getItem("medicationEntries"))).toEqual([medicationEntry]);
  await waitFor(() => expect(screen.getByLabelText("Ended Protocols")).toHaveTextContent("User plan"));
  fireEvent.click(screen.getByRole("button", { name: "View Protocol" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Delete Protocol" })[0]);
  expect(JSON.parse(localStorage.getItem("protocols"))).toEqual([]);
  expect(JSON.parse(localStorage.getItem("medicationEntries"))).toEqual([medicationEntry]);
});

test("creates and persists a protocol without generating medication history", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Protocols" }));
  fireEvent.click(screen.getByRole("button", { name: "Create Protocol" }));
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "My weekly plan" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Protocol Item" }));
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: "Personal compound" } });
  fireEvent.click(screen.getByRole("button", { name: /Use.*Personal compound.*Custom Compound/ }));
  const itemEditor = screen.getByRole("article", { name: /Personal compound/ });
  fireEvent.change(within(itemEditor).getByLabelText("Dose amount"), { target: { value: "3" } });
  fireEvent.change(within(itemEditor).getByLabelText("Dose unit"), { target: { value: "mg" } });
  fireEvent.change(within(itemEditor).getByLabelText("Route"), { target: { value: "oral" } });
  fireEvent.click(within(itemEditor).getByLabelText("Friday"));
  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  const saved = JSON.parse(localStorage.getItem("protocols"));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ name: "My weekly plan", status: "active" });
  expect(saved[0].items[0].compound).toEqual({ name: "Personal compound" });
  expect(localStorage.getItem("medicationEntries")).toBeNull();
  expect(screen.getByText("My weekly plan")).toBeInTheDocument();
});

test("Timeline to Workouts and Workouts to Timeline land at the top", () => {
  renderAppAtTimeline();
  openWorkouts();

  expect(screen.getByRole("heading", { name: "Workouts" })).toBeInTheDocument();
  expectDestinationScrolledToTop();

  window.scrollTo.mockClear();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Back to Timeline" })[0]
  );
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Timeline opens the empty Trophy Case and returns at the top without replaying a ceremony", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));

  expect(screen.getByRole("heading", { level: 1, name: "Trophy Case" })).toBeInTheDocument();
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  expectDestinationScrolledToTop();

  window.scrollTo.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Nutrition to Timeline lands at the top after rendering", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Nutrition" }));
  window.scrollTo.mockClear();

  fireEvent.click(
    screen.getAllByRole("button", { name: "Back to Timeline" })[0]
  );

  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Timeline to Add Memory resets a previously scrolled position", () => {
  renderAppAtTimeline();
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 900,
  });

  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));

  expect(
    screen.getByRole("heading", { name: "Add Memory" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("successful same-tab restore immediately synchronizes theme and unit settings without reload", async () => {
  const backedUpSettings = {
    schemaVersion: 1,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "haunted-forest",
  };
  localStorage.setItem("appSettings", JSON.stringify(backedUpSettings));
  localStorage.setItem("nutritionGoals", JSON.stringify({ calories: 2450 }));
  const backedUpDailyActions = { schemaVersion: 1, actions: [{
    schemaVersion: 1,
    id: "daily-action:restored",
    title: "Restored appointment",
    actionType: "appointment",
    date: localCalendarDateKey(),
    time: "14:00",
    timeWindow: null,
    durationMinutes: null,
    location: "Restored office",
    notes: "Restored action notes",
    recurrence: null,
    status: "scheduled",
    completedAt: null,
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
  }] };
  localStorage.setItem("dailyActions", JSON.stringify(backedUpDailyActions));
  let exportedBackup;
  createTraceBackup.mockImplementation(async () => {
    exportedBackup = {
      createdAt: "2026-08-18T12:00:00.000Z",
      data: {
        structured: {
          appSettings: JSON.parse(localStorage.getItem("appSettings")),
          nutritionGoals: JSON.parse(localStorage.getItem("nutritionGoals")),
          dailyActions: JSON.parse(localStorage.getItem("dailyActions")),
        },
        photos: [],
      },
    };
    return exportedBackup;
  });
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).toBeChecked();
  expect(screen.getByLabelText("Kilograms (kg)")).toBeChecked();
  expect(screen.getByLabelText("Centimeters (cm)", { selector: 'input[name="height"]' })).toBeChecked();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);

  openBackupFromSettings();
  fireEvent.click(screen.getByRole("button", { name: "Download Trace Backup" }));
  expect(await screen.findByText("Trace backup downloaded. Your current data was not changed.")).toBeInTheDocument();
  expect(exportedBackup.data.structured.appSettings).toEqual(backedUpSettings);
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("radio", { name: /River/ }));
  fireEvent.click(screen.getByLabelText("Pounds (lb)"));
  fireEvent.click(screen.getByLabelText("Feet + inches (ft/in)"));
  fireEvent.click(screen.getByLabelText("Inches (in)"));
  expect(JSON.parse(localStorage.getItem("appSettings"))).toMatchObject({
    units: { weight: "lb", height: "ft-in", circumference: "in" },
    lifeCurrentThemeId: "river",
  });
  localStorage.setItem("nutritionGoals", JSON.stringify({ calories: 1800 }));
  localStorage.setItem("dailyActions", JSON.stringify({ schemaVersion: 1, actions: [] }));
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);

  parseTraceBackupText.mockReturnValue({
    backup: exportedBackup,
    summary: { memories: 0, photos: 0 },
  });
  restoreTraceBackup.mockImplementation(async (backup) => {
    localStorage.setItem("appSettings", JSON.stringify(backup.data.structured.appSettings));
    localStorage.setItem("nutritionGoals", JSON.stringify(backup.data.structured.nutritionGoals));
    localStorage.setItem("dailyActions", JSON.stringify(backup.data.structured.dailyActions));
    return { memories: 0, photos: 0 };
  });
  window.confirm = jest.fn(() => true);
  openBackupFromSettings();
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File([JSON.stringify(exportedBackup)], "trace-backup-settings.json", { type: "application/json" })] },
  });
  expect(await screen.findByRole("heading", { name: "Review Backup" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  expect(await screen.findByRole("heading", { name: /Trace restored successfully/ })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("nutritionGoals"))).toEqual({ calories: 2450 });
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /River/ })).not.toBeChecked();
  expect(screen.getByLabelText("Kilograms (kg)")).toBeChecked();
  expect(screen.getByLabelText("Centimeters (cm)", { selector: 'input[name="height"]' })).toBeChecked();
  expect(screen.getByLabelText("Centimeters (cm)", { selector: 'input[name="circumference"]' })).toBeChecked();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Today's Schedule" }));
  expect(screen.getByRole("button", { name: "Open daily action Restored appointment" })).toBeInTheDocument();
  anchorClick.mockRestore();
});

test("Life Current theme selection persists across reload and switches back to River", async () => {
  localStorage.setItem("nutritionEntries", JSON.stringify([
    { id: "theme-activity", loggedAt: "2026-05-18T12:00:00" },
  ]));
  const first = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("radio", { name: /Haunted Forest/ }));
  expect(JSON.parse(localStorage.getItem("appSettings"))).toMatchObject({
    lifeCurrentThemeId: "haunted-forest",
    units: { weight: "lb", height: "ft-in", circumference: "in" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(await screen.findByTestId("life-current")).toHaveAttribute("data-theme-id", "haunted-forest");
  first.unmount();

  render(<App />);
  expect(await screen.findByTestId("life-current")).toHaveAttribute("data-theme-id", "haunted-forest");
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: /River/ }));
  expect(JSON.parse(localStorage.getItem("appSettings"))).toMatchObject({
    lifeCurrentThemeId: "river",
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(await screen.findByTestId("life-current")).toHaveAttribute("data-theme-id", "river");
});

test("standalone Journal navigation creates private entries and keeps content inside Journal", async () => {
  renderAppAtTimeline();
  const featureNavigation = screen.getByRole("navigation", { name: "Trace features" });
  expect(within(featureNavigation).queryByRole("button", { name: "Open Journal" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  expectDestinationScrolledToTop();

  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Journal-only phrase" } });
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Content that must never become a Memory preview" } });
  fireEvent.click(screen.getByRole("button", { name: "Calm" }));
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Private Tag" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));

  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Journal entry traced");
  const stored = JSON.parse(localStorage.getItem("journalEntries"));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ visibility: "private", title: "Journal-only phrase", mood: "Calm", tags: ["Private Tag"] });
  expect(localStorage.getItem("journalDraft")).toBeNull();

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search memories..."), { target: { value: "Journal-only phrase" } });
  expect(screen.getByText("No memories found.")).toBeInTheDocument();
  expect(screen.queryByText("Content that must never become a Memory preview")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.queryByText("Journal-only phrase")).not.toBeInTheDocument();
});

test("Journal editing preserves identity, updates timestamps, and repeated confirmations remount", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "First entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  const firstConfirmation = screen.getByTestId("save-confirmation");
  const original = JSON.parse(localStorage.getItem("journalEntries"))[0];

  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Second entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Journal entry traced");
  expect(screen.getByTestId("save-confirmation")).not.toBe(firstConfirmation);

  const firstCard = document.querySelector(`[data-journal-entry-id="${original.id}"]`);
  fireEvent.click(within(firstCard).getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Edited entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Journal entry updated");
  const edited = JSON.parse(localStorage.getItem("journalEntries")).find(({ id }) => id === original.id);
  expect(edited.id).toBe(original.id);
  expect(edited.createdAt).toBe(original.createdAt);
  expect(edited.updatedAt).not.toBeUndefined();
  expect(edited.body).toBe("Edited entry");
});

test("Journal storage failure keeps the draft and does not show success", () => {
  const originalSetItem = Storage.prototype.setItem;
  const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
    if (key === "journalEntries") throw new Error("quota full");
    return originalSetItem.call(this, key, value);
  });
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Preserve after failure" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Entry")).toHaveValue("Preserve after failure");
  expect(JSON.parse(localStorage.getItem("journalDraft")).form.body).toBe("Preserve after failure");
  expect(screen.getByRole("alert")).toHaveTextContent("save this Journal entry");
  setItem.mockRestore();
});

test("deleting a Journal entry leaves Memories and other records unchanged", () => {
  const memories = [{ id: "memory-safe", title: "Keep me", description: "", date: "2026-08-18", images: [], categories: [] }];
  const journalEntries = [{
    id: "journal-delete", schemaVersion: 1, visibility: "private", title: "Delete me", body: "Only this entry",
    date: "2026-08-18", time: "20:00", createdAt: "2026-08-19T01:00:00.000Z",
    updatedAt: "2026-08-19T01:00:00.000Z", tags: [],
  }];
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  window.confirm = jest.fn(() => true);
  renderAppAtTimeline();
  localStorage.setItem("memories", JSON.stringify(memories));
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Journal entry deleted");
  expect(localStorage.getItem("journalEntries")).toBe("[]");
  expect(JSON.parse(localStorage.getItem("memories"))).toEqual(memories);
});

test("canceled Journal deletion does not show success confirmation", () => {
  const journalEntries = [{
    id: "journal-cancel", schemaVersion: 1, visibility: "private", title: "Do not delete", body: "Keep this",
    date: "2026-08-18", time: "20:00", createdAt: "2026-08-19T01:00:00.000Z",
    updatedAt: "2026-08-19T01:00:00.000Z", tags: [],
  }];
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  window.confirm = jest.fn(() => false);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("journalEntries"))).toEqual(journalEntries);
});

test("failed Journal deletion does not show success confirmation", () => {
  const journalEntries = [{
    id: "journal-fail", schemaVersion: 1, visibility: "private", title: "Persistence fail", body: "Keep this too",
    date: "2026-08-18", time: "20:00", createdAt: "2026-08-19T01:00:00.000Z",
    updatedAt: "2026-08-19T01:00:00.000Z", tags: [],
  }];
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  const originalSetItem = Storage.prototype.setItem;
  const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
    if (key === "journalEntries") throw new Error("quota full");
    return originalSetItem.call(this, key, value);
  });
  window.confirm = jest.fn(() => true);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("journalEntries"))).toEqual(journalEntries);
  setItem.mockRestore();
});

test("successful Journal deletions remount the confirmation for each delete", () => {
  const journalEntries = [{
    id: "journal-first", schemaVersion: 1, visibility: "private", title: "First", body: "Keep first alive",
    date: "2026-08-18", time: "20:00", createdAt: "2026-08-19T01:00:00.000Z", updatedAt: "2026-08-19T01:00:00.000Z", tags: [],
  }, {
    id: "journal-second", schemaVersion: 1, visibility: "private", title: "Second", body: "Keep second alive",
    date: "2026-08-18", time: "20:01", createdAt: "2026-08-19T01:01:00.000Z", updatedAt: "2026-08-19T01:01:00.000Z", tags: [],
  }];
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  window.confirm = jest.fn(() => true);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));

  fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
  const firstConfirmation = screen.getByTestId("save-confirmation");
  expect(firstConfirmation).toHaveTextContent("Journal entry deleted");

  fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
  const secondConfirmation = screen.getByTestId("save-confirmation");
  expect(secondConfirmation).toHaveTextContent("Journal entry deleted");
  expect(secondConfirmation).not.toBe(firstConfirmation);
});

test("returning from a section initializes the offscreen timeline at Present after it becomes visible", async () => {
  openPhotoDatabase.mockResolvedValue({});
  localStorage.setItem("memories", JSON.stringify([
    { id: "oldest", title: "Oldest", description: "", date: "1999-01-01", categories: [], images: [], favorite: false },
    { id: "newest", title: "Newest", description: "", date: "2026-08-17", categories: [], images: [], favorite: false },
  ]));
  render(<App />);
  await screen.findByRole("button", { name: "Open memory Newest" });
  fireEvent.click(screen.getByRole("button", { name: "Nutrition" }));

  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();

  const viewport = screen.getByTestId("memory-timeline-viewport");
  const newest = screen.getByTestId("timeline-memory-newest");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 0 }));
  newest.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 0 }));
  Object.defineProperty(viewport, "scrollWidth", { configurable: true, value: 400 });
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });

  act(() => {
    while (frames.length) frames.shift()();
  });
  expectDestinationScrolledToTop();
  expect(viewport.scrollLeft).toBe(0);

  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  newest.getBoundingClientRect = jest.fn(() => ({
    left: 1000 - viewport.scrollLeft,
    width: 200,
  }));
  Object.defineProperty(viewport, "scrollWidth", { configurable: true, value: 1200 });
  fireEvent.scroll(window);
  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(viewport.scrollLeft).toBe(900);
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("new Memory defaults to today's local calendar date and can be changed", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  const dateInput = document.querySelector('input[type="date"]');

  expect(dateInput).toHaveValue(localCalendarDateKey());
  fireEvent.change(dateInput, { target: { value: "2007-04-17" } });
  expect(dateInput).toHaveValue("2007-04-17");
});

test("editing a Memory preserves its saved date exactly", async () => {
  localStorage.setItem("memories", JSON.stringify([{
    id: "dated-memory",
    title: "Original date",
    description: "Stored date must remain unchanged.",
    date: "2007-04-17",
    categories: [],
    images: [],
    favorite: false,
  }]));
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Open memory Original date" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(document.querySelector('input[type="date"]')).toHaveValue("2007-04-17");
});

test("new Memory date generation uses local calendar fields instead of UTC serialization", () => {
  const localDateAtUtcBoundary = {
    getFullYear: () => 2007,
    getMonth: () => 3,
    getDate: () => 17,
    toISOString: () => "2007-04-18T04:30:00.000Z",
  };

  expect(localCalendarDateKey(localDateAtUtcBoundary)).toBe("2007-04-17");
});

test("reopening a new Memory after cancel restores today's default date", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  fireEvent.change(document.querySelector('input[type="date"]'), {
    target: { value: "2007-04-17" },
  });
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));

  expect(document.querySelector('input[type="date"]')).toHaveValue(localCalendarDateKey());
  confirm.mockRestore();
});

test("reopening a new Memory after save restores today's default date", async () => {
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), {
    target: { value: "Saved date reset" },
  });
  fireEvent.change(document.querySelector('input[type="date"]'), {
    target: { value: "2007-04-17" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Memory" }));
  await screen.findByRole("heading", { name: "Trace" });
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));

  expect(document.querySelector('input[type="date"]')).toHaveValue(localCalendarDateKey());
});

test("saving a Memory returns to and centers the newly saved Memory", async () => {
  openPhotoDatabase.mockResolvedValue({});
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  localStorage.setItem("memories", JSON.stringify([{
    id: "existing-newest",
    title: "Existing newest Memory",
    description: "",
    date: "2026-08-17",
    categories: [],
    images: [],
    favorite: false,
  }]));
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();

  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Add Memory" }));
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), {
    target: { value: "Saved historical Memory" },
  });
  fireEvent.change(document.querySelector('input[type="date"]'), {
    target: { value: "1999-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Memory" }));
  await screen.findByRole("heading", { name: "Trace" });

  const saved = JSON.parse(localStorage.getItem("memories")).find(
    ({ title }) => title === "Saved historical Memory"
  );
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const savedCard = screen.getByTestId("timeline-memory-" + saved.id);
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  savedCard.getBoundingClientRect = jest.fn(() => ({
    left: 100 - viewport.scrollLeft,
    width: 200,
  }));
  Object.defineProperty(viewport, "scrollWidth", { configurable: true, value: 1200 });
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });

  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "auto",
    block: "start",
  });
  expect(viewport.scrollLeft).toBe(0);
  expect(savedCard.querySelector("[data-timeline-card-visual]")).toHaveStyle({
    boxShadow: "0 0 0 2px #5ec8ff, 0 8px 20px rgba(94, 200, 255, 0.2)",
  });
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("editing a Memory returns to its timeline card", async () => {
  openPhotoDatabase.mockResolvedValue({});
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  localStorage.setItem("memories", JSON.stringify([{
    id: "edited-memory",
    title: "Original Memory",
    description: "",
    date: "1999-01-01",
    categories: [],
    images: [],
    favorite: false,
  }]));
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Open memory Original Memory" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), {
    target: { value: "Edited Memory" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByRole("heading", { name: "Trace" });

  const viewport = screen.getByTestId("memory-timeline-viewport");
  const editedCard = screen.getByTestId("timeline-memory-edited-memory");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  editedCard.getBoundingClientRect = jest.fn(() => ({
    left: 100 - viewport.scrollLeft,
    width: 200,
  }));
  Object.defineProperty(viewport, "scrollWidth", { configurable: true, value: 1200 });
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });

  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "auto",
    block: "start",
  });
  expect(editedCard.querySelector("[data-timeline-card-visual]")).toHaveStyle({
    boxShadow: "0 0 0 2px #5ec8ff, 0 8px 20px rgba(94, 200, 255, 0.2)",
  });
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Add Memory to Timeline lands at the top", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  window.scrollTo.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Memory Detail keeps its route, lock, and exact origin beneath the full ceremony lifecycle", () => {
  const memory = {
    id: "memory-ceremony-route",
    title: "Graduation Day",
    description: "Finally finished my degree.",
    date: "2026-05-18",
    categories: ["Milestone"],
    images: [],
    favorite: false,
  };
  localStorage.setItem("memories", JSON.stringify([memory]));
  const restoreScrollPosition = mockWindowScrollPosition(18, 240);
  render(<App />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 412;
  viewport.scrollTop = 19;
  fireEvent.click(screen.getByTestId(`timeline-memory-${memory.id}`));
  const detail = screen.getByRole("dialog", { name: "Memory details for Graduation Day" });
  const detailPanel = screen.getByTestId("memory-detail-panel");
  const trophyControl = within(detail).getByRole("button", { name: "Add to Trophy Case" });
  trophyControl.focus();
  const storageWrite = jest.spyOn(Storage.prototype, "setItem");
  const ceremonyTimers = captureCeremonyTimers();

  fireEvent.click(trophyControl);
  const ceremony = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(ceremony).toHaveAttribute("data-phase", "closed");
  expect(detail).toBeInTheDocument();
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("inert");
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("aria-hidden", "true");
  expect(storageWrite.mock.calls.filter(([key]) => key === "trophyCaseEntries")).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toHaveLength(1);

  ceremonyTimers.run(350);
  expect(ceremony).toHaveAttribute("data-phase", "opening");
  ceremonyTimers.run(1750);
  expect(ceremony).toHaveAttribute("data-phase", "placing");
  ceremonyTimers.run(2850);
  expect(ceremony).toHaveAttribute("data-phase", "settled");
  ceremonyTimers.run(3000);
  expect(ceremony).toHaveAttribute("data-phase", "plaque");
  ceremonyTimers.run(3800);
  expect(ceremony).toHaveAttribute("data-phase", "complete");

  fireEvent.keyDown(document, { key: "Escape" });
  ceremonyTimers.restore();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Memory details for Graduation Day" })).toBeInTheDocument();
  expect(screen.getByTestId("trace-app-shell")).not.toHaveAttribute("inert");
  expect(detailPanel).toHaveFocus();
  expect(document.body).toHaveStyle({ position: "fixed", top: "-240px", overflow: "hidden" });
  expect(within(detail).getByRole("button", { name: "In Trophy Case" })).toBeDisabled();

  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
  fireEvent.click(within(detail).getByRole("button", { name: "Close memory details" }));
  expect(viewport.scrollLeft).toBe(412);
  expect(viewport.scrollTop).toBe(19);
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
  expect(window.scrollTo).toHaveBeenCalledWith(18, 240);

  storageWrite.mockRestore();
  restoreScrollPosition();
});

test("new Memory trophies persist, trigger the shared ceremony, preserve snapshots, and can be re-added", async () => {
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), { target: { value: "Graduation Day" } });
  fireEvent.change(screen.getByPlaceholderText("Tell your story..."), { target: { value: "Finally finished my degree." } });
  fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: "2026-05-18" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Memory" }));

  await screen.findByRole("heading", { name: "Trace" });
  const suggestion = screen.getByRole("region", { name: "Memory achievement suggestion" });
  const storageWrite = jest.spyOn(Storage.prototype, "setItem");
  fireEvent.click(within(suggestion).getByRole("button", { name: "Add to Trophy Case" }));
  const ceremony = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(ceremony).toHaveTextContent("Graduation Day");
  expect(ceremony).toHaveTextContent("May 18, 2026");
  expect(ceremony).not.toHaveTextContent("Finally finished my degree.");
  expect(storageWrite.mock.calls.filter(([key]) => key === "trophyCaseEntries")).toHaveLength(1);
  storageWrite.mockRestore();
  const originalTrophies = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(originalTrophies).toHaveLength(1);
  expect(originalTrophies[0]).toMatchObject({
    sourceType: "memory",
    sourceKey: `memory|${originalTrophies[0].sourceId}`,
    sourceSnapshot: { title: "Graduation Day", description: "Finally finished my degree.", date: "2026-05-18" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));
  expect(screen.getByLabelText("In Trophy Case")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("button", { name: "Open achievement: Graduation Day" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open achievement: Graduation Day" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("memories"))).toHaveLength(1);
  const backToTimeline = screen.queryAllByRole("button", { name: "Back to Timeline" });
  if (backToTimeline.length) {
    fireEvent.click(backToTimeline[0]);
  }
  fireEvent.click(screen.getByRole("button", { name: "Open memory Graduation Day" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to Trophy Case" }));
  const readdedTrophies = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(readdedTrophies).toHaveLength(1);
  expect(readdedTrophies[0].id).not.toBe(originalTrophies[0].id);
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), { target: { value: "Edited Graduation" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByRole("heading", { name: "Edited Graduation" });
  expect(screen.queryByRole("region", { name: "Memory achievement suggestion" })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual(readdedTrophies);

  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Open memory Edited Graduation" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("memories"))).toEqual([]));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual(readdedTrophies);

  const backToTimelineAfterDelete = screen.queryAllByRole("button", { name: "Back to Timeline" });
  const backToTrophyCase = screen.queryByRole("button", { name: "Back to Trophy Case" });
  if (backToTimelineAfterDelete.length) {
    fireEvent.click(backToTimelineAfterDelete[0]);
  } else if (backToTrophyCase) {
    fireEvent.click(backToTrophyCase);
  }
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Graduation Day trophy" })).toHaveTextContent("Finally finished my degree.");
  fireEvent.click(screen.getByRole("button", { name: "Open achievement: Graduation Day" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual([]);
});

test("legacy Memories receive a compatibility-safe stable ID and remain trophy-eligible", async () => {
  const legacyMemory = {
    title: "Legacy Milestone",
    description: "Saved before Memory IDs existed.",
    date: "2020-01-02",
    categories: ["Milestone"],
    images: [],
    favorite: false,
  };
  localStorage.setItem("memories", JSON.stringify([legacyMemory]));
  openPhotoDatabase.mockResolvedValue({});
  render(<App />);
  const memoryPreview = await screen.findByRole("button", { name: "Open memory Legacy Milestone" });
  fireEvent.click(memoryPreview);
  const add = screen.getByRole("button", { name: "Add to Trophy Case" });
  const migratedMemory = JSON.parse(localStorage.getItem("memories"))[0];
  expect(migratedMemory).toMatchObject(legacyMemory);
  expect(migratedMemory.id).toBeTruthy();
  fireEvent.click(add);
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))[0]).toMatchObject({
    sourceType: "memory",
    sourceId: migratedMemory.id,
    sourceKey: `memory|${migratedMemory.id}`,
  });
  openPhotoDatabase.mockImplementation(() => new Promise(() => {}));
});

test("renders stable metadata-first geometry for 21 Memories while 51 photos hydrate with bounded priority", async () => {
  const photoCounts = [
    ...Array(9).fill(3),
    ...Array(10).fill(2),
    0,
    4,
  ];
  const storedMemories = photoCounts.map((photoCount, index) => ({
    id: `startup-memory-${index}`,
    title: `Startup Memory ${index}`,
    description: `Metadata for Memory ${index}`,
    date: `${2000 + index}-01-01`,
    categories: [],
    images: Array.from(
      { length: photoCount },
      (_, photoIndex) => `startup-photo-${index}-${photoIndex}`
    ),
    favorite: false,
  }));
  expect(storedMemories.flatMap(({ images }) => images)).toHaveLength(51);
  localStorage.setItem("memories", JSON.stringify(storedMemories));
  openPhotoDatabase.mockResolvedValue({ name: "startup-photo-database" });
  const completions = new Map();
  getPhoto.mockImplementation((database, id) => new Promise((resolve) => {
    completions.set(id, resolve);
  }));

  const { unmount } = render(<App />);

  expect(await screen.findByText("Memories Added: 21")).toBeInTheDocument();
  const cards = storedMemories.map(({ id }) =>
    screen.getByTestId(`timeline-memory-${id}`)
  );
  expect(screen.getByRole("heading", { name: "2000" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "2020" })).toBeInTheDocument();
  const canvas = screen.getByTestId("timeline-content-canvas");
  const lifeCurrent = screen.getByTestId("life-current");
  const newestGallery = screen.getByTestId(
    "timeline-photo-gallery-startup-memory-20"
  );
  const newestSlots = [
    ...newestGallery.querySelectorAll("[data-timeline-photo-slot]"),
  ];
  expect(newestSlots).toHaveLength(3);
  expect(newestGallery.querySelectorAll("[data-timeline-photo-placeholder]"))
    .toHaveLength(3);

  await waitFor(() => expect(getPhoto).toHaveBeenCalledTimes(3));
  expect(getPhoto.mock.calls.map(([, id]) => id)).toEqual([
    "startup-photo-20-0",
    "startup-photo-20-1",
    "startup-photo-20-2",
  ]);

  await act(async () => {
    completions.get("startup-photo-20-1")({
      id: "startup-photo-20-1",
      blob: new Blob(["second"], { type: "image/jpeg" }),
    });
    completions.get("startup-photo-20-0")({
      id: "startup-photo-20-0",
      blob: new Blob(["first"], { type: "image/jpeg" }),
    });
    completions.get("startup-photo-20-2")({
      id: "startup-photo-20-2",
      blob: new Blob(["third"], { type: "image/jpeg" }),
    });
    await Promise.resolve();
  });

  expect(storedMemories.map(({ id }) => id))
    .toEqual(cards.map((card) => card.dataset.memoryId));
  storedMemories.forEach(({ id }, index) => {
    expect(screen.getByTestId(`timeline-memory-${id}`)).toBe(cards[index]);
  });
  expect(screen.getByTestId("timeline-content-canvas")).toBe(canvas);
  expect(screen.getByTestId("life-current")).toBe(lifeCurrent);
  expect(newestGallery.querySelectorAll("[data-timeline-photo-slot]")[0])
    .toBe(newestSlots[0]);
  expect(newestGallery.querySelectorAll("[data-timeline-gallery-thumbnail]"))
    .toHaveLength(3);
  expect(JSON.parse(localStorage.getItem("memories"))).toEqual(storedMemories);

  unmount();
  openPhotoDatabase.mockImplementation(() => new Promise(() => {}));
});

test.each([
  ["river", "river-current", "Close Edit Memory"],
  ["haunted-forest", "forest-path", "Close Edit Memory"],
  ["river", "river-current", "Cancel"],
])("Edit Cancel retains four-photo Detail and restores the exact original %s timeline position (%s) via %s", async (themeId, rendererId, cancelControlName) => {
  const storedMemories = [
    {
      id: "route-oldest",
      title: "Oldest route Memory",
      description: "Before the target",
      date: "2000-01-01",
      categories: [],
      images: [],
      favorite: false,
    },
    {
      id: "route-target",
      title: "Four photo route Memory",
      description: "Retain this exact Detail",
      date: "2012-06-15",
      categories: [],
      images: ["route-photo-1", "route-photo-2", "route-photo-3", "route-photo-4"],
      favorite: false,
    },
    {
      id: "route-present",
      title: "Present route Memory",
      description: "After the target",
      date: "2026-08-18",
      categories: [],
      images: [],
      favorite: false,
    },
  ];
  localStorage.setItem("memories", JSON.stringify(storedMemories));
  localStorage.setItem("appSettings", JSON.stringify({
    schemaVersion: 1,
    units: { weight: "lb", height: "ft-in", circumference: "in" },
    lifeCurrentThemeId: themeId,
  }));
  openPhotoDatabase.mockResolvedValue({ name: "edit-cancel-photo-database" });
  getPhoto.mockImplementation(async (database, id) => ({
    id,
    blob: new Blob([id], { type: "image/jpeg" }),
  }));
  let objectUrlSequence = 0;
  URL.createObjectURL.mockImplementation(() => `blob:route-${++objectUrlSequence}`);
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const originalScrollX = Object.getOwnPropertyDescriptor(window, "scrollX");
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  let documentScrollX = 37;
  let documentScrollY = 240;
  Object.defineProperty(window, "scrollX", {
    configurable: true,
    get: () => documentScrollX,
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => documentScrollY,
  });
  window.scrollTo.mockImplementation((leftOrOptions, top) => {
    if (typeof leftOrOptions === "object") {
      documentScrollX = leftOrOptions.left ?? documentScrollX;
      documentScrollY = leftOrOptions.top ?? documentScrollY;
    } else {
      documentScrollX = leftOrOptions;
      documentScrollY = top;
    }
  });
  const editorFolioDocumentTop = 48;
  const editorFolioViewportInset = 16;
  const editorFolioScrollTargets = [];
  Element.prototype.scrollIntoView.mockImplementation(function scrollIntoView(options) {
    if (this.matches?.(".trace-memory-editor__folio")) {
      editorFolioScrollTargets.push({ element: this, options });
      documentScrollY = editorFolioDocumentTop - editorFolioViewportInset;
    }
  });

  try {
    render(<App />);
    const targetCard = await screen.findByTestId("timeline-memory-route-target");
    const home = screen.getByTestId("home-page");
    const viewport = screen.getByTestId("memory-timeline-viewport");
    const gallery = screen.getByTestId("timeline-photo-gallery-route-target");
    const targetVisual = targetCard.querySelector("[data-timeline-card-visual]");
    viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, right: 400, width: 400 }));
    viewport.scrollBy = jest.fn();
    targetCard.getBoundingClientRect = jest.fn(() => ({
      left: 150,
      right: 250,
      width: 100,
    }));
    screen.getByTestId("timeline-memory-route-oldest").getBoundingClientRect =
      jest.fn(() => ({ left: 10, right: 110, width: 100 }));
    screen.getByTestId("timeline-memory-route-present").getBoundingClientRect =
      jest.fn(() => ({ left: 290, right: 390, width: 100 }));
    act(() => {
      while (frames.length) frames.shift()();
    });
    fireEvent.scroll(viewport);
    act(() => {
      while (frames.length) frames.shift()();
    });
    expect(targetCard).toHaveAttribute("data-timeline-focused", "true");

    await waitFor(() => {
      expect(gallery.querySelectorAll("[data-timeline-gallery-thumbnail]"))
        .toHaveLength(3);
    });
    expect(getPhoto).toHaveBeenCalledTimes(3);
    viewport.scrollLeft = 417;
    viewport.scrollTop = 23;
    const previewNodes = [...gallery.querySelectorAll("[data-timeline-gallery-thumbnail]")];
    const previewSources = previewNodes.map(({ src }) => src);
    const themedRenderer = getLifeCurrentRenderer(rendererId);
    const themedGeometry = themedRenderer.outerHTML;

    documentScrollX = 37;
    documentScrollY = 240;
    fireEvent.click(targetCard);
    const detail = screen.getByRole("dialog", {
      name: "Memory details for Four photo route Memory",
    });
    await waitFor(() => {
      expect(within(detail).getAllByAltText("Memory 4").length).toBeGreaterThan(0);
    });
    expect(getPhoto).toHaveBeenCalledTimes(4);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(4);

    fireEvent.click(within(detail).getAllByAltText("Memory 1")[0]);
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close photo viewer" }));
    const targetVisualStyle = targetVisual.getAttribute("style");

    window.scrollTo.mockClear();
    fireEvent.click(within(detail).getByRole("button", { name: "Edit" }));
    const editHeading = screen.getByRole("heading", { name: "Edit Memory" });
    const editor = editHeading.closest(".trace-memory-editor");
    const editorFolio = screen.getByTestId("memory-editor-folio");
    editorFolio.getBoundingClientRect = jest.fn(() => ({
      top: editorFolioDocumentTop - documentScrollY,
    }));
    expect(editorFolioScrollTargets).toEqual([{
      element: editorFolio,
      options: { behavior: "auto", block: "start" },
    }]);
    expect(editorFolio.getBoundingClientRect().top).toBe(editorFolioViewportInset);
    expect(window.scrollY).toBe(editorFolioDocumentTop - editorFolioViewportInset);
    expect(window.scrollY).not.toBe(0);
    expect(window.scrollTo).not.toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    await waitFor(() => {
      expect(within(editor).getAllByAltText(/Memory \d/)).toHaveLength(4);
    });
    act(() => {
      while (frames.length) frames.shift()();
    });
    expect(home).toHaveAttribute("hidden");
    expect(home).toHaveAttribute("inert");
    expect(home).toHaveAttribute("aria-hidden", "true");
    expect(editHeading).toBeVisible();
    expect(screen.queryByTestId("memory-detail-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", {
      name: "Memory details for Four photo route Memory",
    })).not.toBeInTheDocument();
    expect(detail).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close memory details" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Favorite" }))
      .not.toBeInTheDocument();
    const titleInput = within(editor).getByPlaceholderText("Memory title...");
    const cancelButton = within(editor).getByRole("button", { name: "Cancel" });
    const closeEditorButton = within(editor).getByRole("button", {
      name: "Close Edit Memory",
    });
    expect(titleInput).toBeVisible();
    expect(titleInput).toBeEnabled();
    expect(titleInput.closest("[inert]")).toBeNull();
    expect(cancelButton).toBeVisible();
    expect(cancelButton).toBeEnabled();
    expect(closeEditorButton).toBeVisible();
    expect(closeEditorButton).toBeEnabled();
    expect(document.body.style.position).toBe("");
    expect(getPhoto).toHaveBeenCalledTimes(4);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(4);

    jest.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.change(titleInput, { target: { value: "Editor remains interactive" } });
    expect(titleInput).toHaveValue("Editor remains interactive");
    fireEvent.click(within(editor).getByRole("button", { name: cancelControlName }));
    act(() => {
      while (frames.length) frames.shift()();
    });

    expect(screen.queryByRole("heading", { name: "Edit Memory" })).not.toBeInTheDocument();
    const returnedDetail = screen.getByRole("dialog", {
      name: "Memory details for Four photo route Memory",
    });
    expect(returnedDetail).toBeVisible();
    expect(returnedDetail).not.toHaveAttribute("aria-hidden");
    expect(returnedDetail).not.toHaveAttribute("inert");
    expect(returnedDetail).not.toBe(detail);
    await waitFor(() => {
      expect(within(returnedDetail).getAllByAltText(/Memory \d/)).toHaveLength(5);
    });
    expect(screen.getByTestId("home-page")).toBe(home);
    expect(screen.getByTestId("memory-timeline-viewport")).toBe(viewport);
    expect(screen.getByTestId("timeline-memory-route-target")).toBe(targetCard);
    expect(screen.getByTestId("timeline-photo-gallery-route-target")).toBe(gallery);
    expect([...gallery.querySelectorAll("[data-timeline-gallery-thumbnail]")])
      .toEqual(previewNodes);
    expect(previewNodes.map(({ src }) => src)).toEqual(previewSources);
    expect(gallery.querySelector("[data-timeline-photo-placeholder]"))
      .not.toBeInTheDocument();
    expect(targetCard).toHaveAttribute("data-timeline-focused", "true");
    expect(targetVisual.getAttribute("style")).toBe(targetVisualStyle);
    expect(getLifeCurrentRenderer(rendererId)).toBe(themedRenderer);
    expect(themedRenderer.outerHTML).toBe(themedGeometry);
    expect(getPhoto).toHaveBeenCalledTimes(4);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(4);

    window.scrollTo.mockClear();
    fireEvent.click(within(returnedDetail).getByRole("button", { name: "Close memory details" }));
    act(() => {
      while (frames.length) frames.shift()();
    });
    expect(viewport.scrollLeft).toBe(417);
    expect(viewport.scrollTop).toBe(23);
    expect(window.scrollTo).toHaveBeenLastCalledWith(37, 240);
    expect(window.scrollX).toBe(37);
    expect(window.scrollY).toBe(240);
    expect(targetCard).toHaveAttribute("data-timeline-focused", "true");
    expect(getPhoto).toHaveBeenCalledTimes(4);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(4);
  } finally {
    if (originalScrollX) Object.defineProperty(window, "scrollX", originalScrollX);
    else delete window.scrollX;
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    else delete window.scrollY;
    openPhotoDatabase.mockImplementation(() => new Promise(() => {}));
  }
}, 15000);

test("edited Memories are re-evaluated and declining keeps manual trophy addition available", async () => {
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  fireEvent.change(screen.getByPlaceholderText("Memory title..."), { target: { value: "Morning Run" } });
  fireEvent.change(screen.getByPlaceholderText("Tell your story..."), { target: { value: "Ran today." } });
  fireEvent.click(screen.getByRole("button", { name: "Save Memory" }));
  await screen.findByRole("heading", { name: "Morning Run" });
  expect(screen.queryByRole("region", { name: "Memory achievement suggestion" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open memory Morning Run" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByPlaceholderText("Tell your story..."), {
    target: { value: "Finished my first 5K today after training for three months." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  const suggestion = await screen.findByRole("region", { name: "Memory achievement suggestion" });
  expect(suggestion).toHaveTextContent("This sounds like an achievement");
  expect(localStorage.getItem("trophyCaseEntries")).toBeNull();

  fireEvent.click(within(suggestion).getByRole("button", { name: "Not this time" }));
  expect(screen.queryByRole("region", { name: "Memory achievement suggestion" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open memory Morning Run" }));
  expect(screen.getByRole("button", { name: "Add to Trophy Case" })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("memories"))[0].description).toContain("first 5K");
});

test("Timeline to Medications and back uses shared destination scrolling", () => {
  renderAppAtTimeline();

  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );

  expect(
    screen.getByRole("heading", { name: "Medications & Supplements" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
  window.scrollTo.mockClear();

  fireEvent.click(
    screen.getAllByRole("button", { name: "Back to Timeline" })[0]
  );

  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("medication entries persist separately in localStorage", () => {
  renderAppAtTimeline();
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Medication A" },
  });
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: "1.25" },
  });
  fireEvent.change(screen.getByLabelText("Dose unit"), {
    target: { value: "mg" },
  });
  fireEvent.change(screen.getByLabelText("Method / route"), {
    target: { value: "oral" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  const savedEntries = JSON.parse(localStorage.getItem("medicationEntries"));
  expect(savedEntries).toHaveLength(1);
  expect(savedEntries[0]).toMatchObject({
    schemaVersion: 1,
    name: "Medication A",
    dose: { amount: 1.25, unit: "mg" },
    route: { code: "oral" },
  });
  expect(localStorage.getItem("nutritionEntries")).toBeNull();
});

test("successful categorized medication and supplement logs show exact confirmations", () => {
  renderAppAtTimeline();
  openMedications();

  logTraceCompound("metformin", "Metformin");
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent(
    "Medication traced"
  );

  logTraceCompound("creatine", "Creatine Monohydrate", "5");
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent(
    "Supplement traced"
  );
  expect(JSON.parse(localStorage.getItem("medicationEntries"))).toHaveLength(2);
});

test("an unclassified name is confirmed as a compound without guessing from its text", () => {
  renderAppAtTimeline();
  openMedications();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Supplement C" },
  });
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Dose unit"), {
    target: { value: "capsule" },
  });
  fireEvent.change(screen.getByLabelText("Method / route"), {
    target: { value: "oral" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(screen.getByTestId("save-confirmation")).toHaveTextContent(
    "Compound traced"
  );
});

test("validation and medication persistence failures do not show success", () => {
  renderAppAtTimeline();
  openMedications();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Invalid medication" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Save Entry" }).closest("form"));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a dose amount greater than zero."
  );
  expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();

  const originalSetItem = Storage.prototype.setItem;
  const setItemSpy = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function setItem(key, value) {
      if (key === "medicationEntries") throw new Error("Storage unavailable");
      return originalSetItem.call(this, key, value);
    });

  try {
    fireEvent.change(screen.getByLabelText("Amount / dose"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Dose unit"), {
      target: { value: "mg" },
    });
    fireEvent.change(screen.getByLabelText("Method / route"), {
      target: { value: "oral" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

    expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
    expect(localStorage.getItem("medicationEntries")).toBeNull();
  } finally {
    setItemSpy.mockRestore();
  }
});

test("repeated medication logs remount compact polite feedback and expire", () => {
  jest.useFakeTimers();
  try {
    renderAppAtTimeline();
    openMedications();

    logTraceCompound("metformin", "Metformin");
    const firstConfirmation = screen.getByTestId("save-confirmation");
    expect(firstConfirmation).toHaveAttribute("aria-live", "polite");
    expect(firstConfirmation).toHaveStyle({
      boxSizing: "border-box",
      maxWidth: "min(700px, calc(100vw - 24px))",
      width: "max-content",
    });

    logTraceCompound("metformin", "Metformin", "2");
    const secondConfirmation = screen.getByTestId("save-confirmation");
    expect(secondConfirmation).toHaveTextContent("Medication traced");
    expect(secondConfirmation).not.toBe(firstConfirmation);

    act(() => jest.advanceTimersByTime(3200));
    expect(screen.queryByTestId("save-confirmation")).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test("editing a categorized medication follows the existing updated convention", () => {
  renderAppAtTimeline();
  openMedications();
  logTraceCompound("metformin", "Metformin");

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  expect(screen.getByTestId("save-confirmation")).toHaveTextContent(
    "Medication updated"
  );
  expect(JSON.parse(localStorage.getItem("medicationEntries"))[0].dose.amount).toBe(2);
});

test("Trace catalog logging persists a self-contained identity snapshot", () => {
  renderAppAtTimeline();
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "LY3437943" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select Trace compound Retatrutide" })
  );
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: "2.5" },
  });
  fireEvent.change(screen.getByLabelText("Dose unit"), {
    target: { value: "mg" },
  });
  fireEvent.change(screen.getByLabelText("Method / route"), {
    target: { value: "subcutaneous" },
  });
  fireEvent.change(screen.getByLabelText("Notes (optional)"), {
    target: { value: "Historical catalog snapshot" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  const entries = JSON.parse(localStorage.getItem("medicationEntries"));
  expect(entries[0]).toMatchObject({
    name: "Retatrutide",
    dose: { amount: 2.5, unit: "mg" },
    route: { code: "subcutaneous" },
    notes: "Historical catalog snapshot",
    compoundReference: {
      source: "trace-catalog",
      sourceId: "trace:compound:retatrutide",
      category: "peptide",
      modified: false,
    },
  });
  expect(localStorage.getItem("medicationCompounds")).toBeNull();
});

test("reusable compounds persist separately and are immediately searchable", () => {
  renderAppAtTimeline();
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "SS-31" },
  });
  fireEvent.change(screen.getByLabelText("Amount / dose"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Dose unit"), {
    target: { value: "mg" },
  });
  fireEvent.change(screen.getByLabelText("Method / route"), {
    target: { value: "subcutaneous" },
  });
  fireEvent.click(screen.getByLabelText("Save as reusable compound"));
  fireEvent.change(screen.getByLabelText("Default dose amount (optional)"), {
    target: { value: "3.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  const compounds = JSON.parse(localStorage.getItem("medicationCompounds"));
  const entries = JSON.parse(localStorage.getItem("medicationEntries"));
  expect(compounds).toHaveLength(1);
  expect(compounds[0]).toMatchObject({
    name: "SS-31",
    defaults: {
      dose: { amount: 3.5, unit: "mg" },
      route: { code: "subcutaneous" },
    },
  });
  expect(entries[0].compoundReference).toMatchObject({
    source: "user-saved",
    sourceId: compounds[0].id,
    modified: false,
  });

  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "ss-31" },
  });
  expect(
    screen.getByRole("button", { name: "Select saved compound SS-31" })
  ).toBeInTheDocument();
});

test("persisted reusable compounds reload independently from entries", () => {
  const compound = createCompoundDefinition({
    name: "Saved Compound",
    defaultDoseAmount: "",
    doseUnit: "mg",
    route: "oral",
  });
  localStorage.setItem("medicationCompounds", JSON.stringify([compound]));
  renderAppAtTimeline();
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "saved" },
  });

  expect(
    screen.getByRole("button", { name: "Select saved compound Saved Compound" })
  ).toBeInTheDocument();
  expect(screen.getByText("No medication entries yet.")).toBeInTheDocument();
});

test("editing a saved compound refreshes defaults without rewriting history and persists", () => {
  const compound = createCompoundDefinition(
    {
      name: "Retatrutide",
      defaultDoseAmount: "",
      doseUnit: "mg",
      route: "subcutaneous",
    },
    new Date("2025-01-01T12:00:00.000Z")
  );
  const historicalEntry = {
    id: "historical-entry",
    schemaVersion: 1,
    name: "Retatrutide",
    dose: { amount: 5, unit: "mg" },
    route: { code: "subcutaneous" },
    occurredAt: "2026-01-01T12:00:00.000Z",
    notes: "Historical snapshot",
    compoundReference: {
      source: "user-saved",
      sourceId: compound.id,
      modified: false,
    },
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
  };
  localStorage.setItem("medicationCompounds", JSON.stringify([compound]));
  localStorage.setItem("medicationEntries", JSON.stringify([historicalEntry]));

  const { unmount } = render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "retatrutide" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Edit saved compound Retatrutide",
    })
  );
  fireEvent.change(
    screen.getByLabelText("Saved default dose amount (optional)"),
    { target: { value: "20" } }
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save Saved Compound" })
  );

  const updatedCompounds = JSON.parse(
    localStorage.getItem("medicationCompounds")
  );
  expect(updatedCompounds[0]).toMatchObject({
    id: compound.id,
    createdAt: compound.createdAt,
    defaults: { dose: { amount: 20, unit: "mg" } },
  });
  expect(updatedCompounds[0].updatedAt).not.toBe(compound.updatedAt);
  expect(JSON.parse(localStorage.getItem("medicationEntries"))).toEqual([
    historicalEntry,
  ]);
  expect(screen.getByText(/Saved defaults: 20 mg/)).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Select saved compound Retatrutide" })
  );
  expect(screen.getByLabelText("Amount / dose")).toHaveValue(20);

  unmount();
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "retatrutide" },
  });
  expect(screen.getByText(/Saved defaults: 20 mg/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("medicationEntries"))).toEqual([
    historicalEntry,
  ]);
});

test("workouts persist separately and reload as complete snapshots", () => {
  const firstRender = render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  const stored = JSON.parse(localStorage.getItem("workoutEntries"));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    schemaVersion: 1,
    type: "strength",
    title: "Push Day",
    exercises: [
      {
        name: "Dips",
        sets: [{ reps: 6, load: { mode: "bodyweight" } }],
      },
    ],
  });
  expect(stored[0].id).toBeTruthy();
  expect(stored[0].exercises[0].id).toBeTruthy();
  expect(stored[0].exercises[0].sets[0].id).toBeTruthy();
  expect(localStorage.getItem("nutritionEntries")).toBeNull();
  expect(localStorage.getItem("medicationEntries")).toBeNull();

  firstRender.unmount();
  render(<App />);
  openWorkouts();
  expect(screen.getByRole("heading", { name: "Push Day" })).toBeInTheDocument();
  expandCompletedWorkout("Push Day");
  expect(screen.getByText(/Bodyweight.*6 reps/)).toBeInTheDocument();
});

test("completed workout drops persist recursively and reload in Workout History", () => {
  const firstRender = render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Drop Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Add drop to exercise 1 set 1" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 drop 1 reps"), {
    target: { value: "4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  const stored = JSON.parse(localStorage.getItem("workoutEntries"));
  expect(stored[0].exercises[0].sets[0].drops).toEqual([
    expect.objectContaining({ reps: 4, load: { mode: "bodyweight" } }),
  ]);
  const dropId = stored[0].exercises[0].sets[0].drops[0].id;
  firstRender.unmount();
  render(<App />);
  openWorkouts();
  expandCompletedWorkout("Drop Push Day");
  expect(screen.getByText("↳ Drop 1: Working · Bodyweight × 4 reps")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("workoutEntries"))[0].exercises[0].sets[0].drops[0].id).toBe(dropId);
});

test("workout photo blobs stay in IndexedDB references and are cleaned up with only their workout", async () => {
  const database = { name: "photo-db" };
  openPhotoDatabase.mockResolvedValue(database);
  putPhotos.mockResolvedValue(undefined);
  deletePhotos.mockResolvedValue(undefined);
  openPhotoDatabase.mockClear();
  putPhotos.mockClear();
  deletePhotos.mockClear();
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Photo Workout");
  const photo = new File(["workout image"], "workout.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Choose Photos"), { target: { files: [photo] } });
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  await waitFor(() => expect(JSON.parse(localStorage.getItem("workoutEntries"))).toHaveLength(1));
  const stored = JSON.parse(localStorage.getItem("workoutEntries"))[0];
  expect(stored.photos).toEqual([expect.any(String)]);
  expect(JSON.stringify(stored)).not.toContain("workout image");
  expect(putPhotos).toHaveBeenCalledWith(database, [
    expect.objectContaining({ id: stored.photos[0], workoutId: stored.id, blob: photo }),
  ]);
  expandCompletedWorkout("Photo Workout");
  expect(screen.getByRole("region", { name: "Photo Workout photos" })).toBeInTheDocument();

  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(within(screen.getByText("Photo Workout").closest("article")).getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]));
  expect(deletePhotos).toHaveBeenCalledWith(database, [stored.photos[0]]);
});

test("refreshes a resolvable curated PR after correction and freezes it after source deletion", async () => {
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  fireEvent.click(screen.getByRole("button", { name: /Dips.*1 performance/ }));
  const currentRecords = screen.getByRole("region", { name: "Dips current records" });
  fireEvent.click(within(currentRecords).getByRole("button", { name: "Add to Trophy Case" }));
  expect(screen.getByRole("dialog", { name: "Added to Trophy Case" })).toHaveTextContent("6 reps");
  expect(screen.getAllByRole("button", { name: "In Trophy Case", hidden: true }).every((button) => button.disabled)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("6 reps");
  const curatedSnapshot = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(curatedSnapshot).toHaveLength(1);
  expect(curatedSnapshot[0]).toMatchObject({
    sourceType: "workout-pr",
    sourceRecordType: "bodyweight-reps",
    sourceSnapshot: { exerciseName: "Dips", recordValue: "6 reps", workoutTitle: "Push Day" },
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  openWorkouts();
  expandCompletedWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "16" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => {
    fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
    expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("16 reps");
  });
  const correctedSnapshot = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(correctedSnapshot[0]).toMatchObject({
    id: curatedSnapshot[0].id,
    addedToTrophyCaseAt: curatedSnapshot[0].addedToTrophyCaseAt,
    sourceKey: curatedSnapshot[0].sourceKey,
    sourceSnapshot: { recordValue: "16 reps" },
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  openWorkouts();
  expandCompletedWorkout("Push Day");
  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(within(screen.getByText("Push Day").closest("article")).getByRole("button", { name: "Delete" }));
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]);
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("16 reps");
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual(correctedSnapshot);

  fireEvent.click(screen.getByRole("button", { name: /Open workout achievement: Dips/i }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual([]);
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]);
});

test("dedicated Trophy Case removal preserves workout history, derived PRs, and inline behavior", () => {
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  fireEvent.click(screen.getByRole("button", { name: /Dips.*1 performance/ }));
  const currentRecords = screen.getByRole("region", { name: "Dips current records" });
  fireEvent.click(within(currentRecords).getByRole("button", { name: "Add to Trophy Case" }));
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));
  const storedWorkouts = JSON.parse(localStorage.getItem("workoutEntries"));

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  fireEvent.click(screen.getByRole("button", { name: /Open workout achievement: Dips/i }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual([]);
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual(storedWorkouts);

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  openWorkouts();
  fireEvent.click(screen.getByRole("button", { name: /Dips.*1 performance/ }));
  expect(screen.getByRole("region", { name: "Dips current records" })).toHaveTextContent("6 reps");
  expect(screen.getAllByRole("button", { name: "Add to Trophy Case" }).length).toBeGreaterThan(0);
});

test("adding a PR Timeline achievement keeps both Timeline and Exercise History expanded", () => {
  const restoreScrollPosition = mockWindowScrollPosition(0, 180);
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  const summary = screen.getByRole("button", { name: /Dips.*1 performance/ });
  fireEvent.click(summary);
  fireEvent.click(screen.getByRole("button", { name: "View PR Timeline" }));
  const timeline = screen.getByRole("region", { name: "Dips PR timeline" });
  const storageWrite = jest.spyOn(Storage.prototype, "setItem");
  const ceremonyTimers = captureCeremonyTimers();
  fireEvent.click(within(timeline).getByRole("button", { name: "Add to Trophy Case" }));

  const ceremony = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(ceremony).toHaveAttribute("data-phase", "closed");
  expect(storageWrite.mock.calls.filter(([key]) => key === "trophyCaseEntries")).toHaveLength(1);
  expect(document.body.style.overflow).toBe("hidden");
  ceremonyTimers.run(350);
  expect(ceremony).toHaveAttribute("data-phase", "opening");
  ceremonyTimers.run(1750);
  expect(ceremony).toHaveAttribute("data-phase", "placing");
  ceremonyTimers.run(2850);
  expect(ceremony).toHaveAttribute("data-phase", "settled");
  ceremonyTimers.run(3000);
  expect(ceremony).toHaveAttribute("data-phase", "plaque");
  ceremonyTimers.run(3800);
  expect(ceremony).toHaveAttribute("data-phase", "complete");
  const closeCeremony = screen.getByRole("button", { name: "Close Trophy Case ceremony" });
  fireEvent.mouseDown(closeCeremony);
  fireEvent.click(closeCeremony);
  ceremonyTimers.restore();
  expect(document.body.style.overflow).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
  expect(window.scrollY).toBe(180);
  expect(screen.getByRole("region", { name: "Dips PR timeline" })).toBeInTheDocument();
  expect(summary).toHaveAttribute("aria-expanded", "true");
  expect(within(screen.getByRole("region", { name: "Dips PR timeline" }))
    .getByRole("button", { name: "In Trophy Case" })).toBeDisabled();
  storageWrite.mockRestore();
  restoreScrollPosition();
});

test("loading or removing an existing trophy never replays its ceremony", () => {
  const storedTrophy = {
    schemaVersion: 1,
    id: "existing-trophy",
    sourceType: "memory",
    sourceKey: "memory|existing",
    sourceId: "memory-existing",
    sourceRecordType: null,
    title: "Existing Achievement",
    description: "Already celebrated",
    achievedAt: "2026-08-01T12:00:00.000Z",
    addedToTrophyCaseAt: "2026-08-02T12:00:00.000Z",
    sourceSnapshot: { recordValue: "Already celebrated" },
    metadata: {},
  };
  localStorage.setItem("trophyCaseEntries", JSON.stringify([storedTrophy]));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Existing Achievement trophy" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open achievement: Existing Achievement" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
});

test("workout edits and confirmed deletion update only workout storage", () => {
  const storedEntry = {
    id: "workout-existing",
    schemaVersion: 1,
    type: "strength",
    title: "Original Workout",
    occurredAt: "2026-08-09T18:30:00.000Z",
    notes: "",
    exercises: [
      {
        id: "exercise-existing",
        name: "Squat",
        sets: [
          {
            id: "set-existing",
            reps: 5,
            load: { mode: "external", amount: 100, unit: "kg" },
            notes: "",
          },
        ],
      },
    ],
    createdAt: "2026-08-09T19:00:00.000Z",
    updatedAt: "2026-08-09T19:00:00.000Z",
  };
  localStorage.setItem("workoutEntries", JSON.stringify([storedEntry]));
  render(<App />);
  openWorkouts();
  expandCompletedWorkout("Original Workout");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Updated Workout" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "6" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  const updated = JSON.parse(localStorage.getItem("workoutEntries"));
  expect(updated[0]).toMatchObject({
    id: storedEntry.id,
    createdAt: storedEntry.createdAt,
    title: "Updated Workout",
    exercises: [
      {
        id: "exercise-existing",
        sets: [
          {
            id: "set-existing",
            reps: 6,
            load: { amount: 100, unit: "kg" },
          },
        ],
      },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: /Squat.*1 performance/ }));
  expect(screen.getAllByText("100 kg × 6 reps")).toHaveLength(2);
  expect(screen.getByText("Working · 100 kg × 6 reps")).toBeInTheDocument();

  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]);
  expect(screen.getByText("No workouts logged yet.")).toBeInTheDocument();
  expect(screen.getByText("No exercise history yet.")).toBeInTheDocument();
});

test("creates reusable exercises separately and immediately makes them searchable", () => {
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.change(
    screen.getByLabelText("Exercise 1 reusable default load mode"),
    { target: { value: "bodyweight" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  const catalog = JSON.parse(localStorage.getItem("savedExercises"));
  const workouts = JSON.parse(localStorage.getItem("workoutEntries"));
  expect(catalog).toHaveLength(1);
  expect(catalog[0]).toMatchObject({
    id: expect.stringMatching(/^user-saved:/),
    name: "Dips",
    defaults: { load: { mode: "bodyweight" } },
  });
  expect(catalog[0]).not.toHaveProperty("reps");
  expect(catalog[0].defaults.load).not.toHaveProperty("amount");
  expect(workouts[0].exercises[0].exerciseReference).toEqual({
    source: "user-saved",
    sourceId: catalog[0].id,
    modified: false,
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: "Find an exercise for exercise 1",
    })
  );
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "dips" },
  });
  expect(
    screen.getByRole("button", { name: "Select saved exercise Dips" })
  ).toBeInTheDocument();
});

test("editing a saved exercise refreshes defaults and never rewrites history", () => {
  const savedExercise = createExerciseDefinition(
    {
      name: "Dips",
      defaultLoadMode: "bodyweight",
      defaultWeightUnit: "lb",
    },
    new Date("2025-01-01T00:00:00.000Z")
  );
  const historicalWorkout = {
    id: "historical-workout",
    schemaVersion: 1,
    type: "strength",
    title: "Historical Push Day",
    occurredAt: "2026-01-01T12:00:00.000Z",
    notes: "Untouched history",
    exercises: [
      {
        id: "historical-exercise",
        name: "Dips",
        exerciseReference: {
          source: "user-saved",
          sourceId: savedExercise.id,
          modified: false,
        },
        sets: [
          {
            id: "historical-set",
            reps: 6,
            load: { mode: "bodyweight" },
            notes: "Historical set",
          },
        ],
      },
    ],
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
  };
  localStorage.setItem("savedExercises", JSON.stringify([savedExercise]));
  localStorage.setItem("workoutEntries", JSON.stringify([historicalWorkout]));

  const firstRender = render(<App />);
  openWorkouts();
  fireEvent.click(screen.getByRole("button", { name: /Find an exercise/ }));
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "dips" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Edit saved exercise Dips" })
  );
  fireEvent.change(screen.getByLabelText("Saved exercise name"), {
    target: { value: "Weighted Dips" },
  });
  fireEvent.change(screen.getByLabelText("Saved default load mode"), {
    target: { value: "external" },
  });
  fireEvent.change(screen.getByLabelText("Saved default weight unit"), {
    target: { value: "kg" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save Saved Exercise" })
  );

  const updatedCatalog = JSON.parse(localStorage.getItem("savedExercises"));
  expect(updatedCatalog[0]).toMatchObject({
    id: savedExercise.id,
    createdAt: savedExercise.createdAt,
    name: "Weighted Dips",
    defaults: { load: { mode: "external", unit: "kg" } },
  });
  expect(updatedCatalog[0].updatedAt).not.toBe(savedExercise.updatedAt);
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([
    historicalWorkout,
  ]);
  expect(screen.getByText("Weighted Dips")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Select saved exercise Weighted Dips" })
  );
  expect(screen.getByLabelText("Exercise 1 name")).toHaveValue("Weighted Dips");
  expect(screen.getByLabelText("Exercise 1 set 1 load mode")).toHaveValue(
    "external"
  );
  expect(screen.getByLabelText("Exercise 1 set 1 weight unit")).toHaveValue(
    "kg"
  );

  firstRender.unmount();
  render(<App />);
  openWorkouts();
  expect(
    screen.getByRole("heading", { name: "Historical Push Day" })
  ).toBeInTheDocument();
  expandCompletedWorkout("Historical Push Day");
  expect(screen.getAllByText("Dips")).toHaveLength(2);
  expect(screen.getByText(/Bodyweight.*6 reps/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([
    historicalWorkout,
  ]);
});

test("persists related custom squat exercises separately and surfaces both in unified search", () => {
  const squat = createExerciseDefinition({
    name: "squat",
    defaultLoadMode: "external",
    defaultWeightUnit: "lb",
  });
  localStorage.setItem("savedExercises", JSON.stringify([squat]));
  render(<App />);
  openWorkouts();
  fireEvent.change(screen.getByLabelText("Workout title"), {
    target: { value: "Leg Day" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 name"), {
    target: { value: "Barbell Back Squat one legged" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 weight"), {
    target: { value: "95" },
  });
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), {
    target: { value: "5" },
  });
  fireEvent.click(screen.getByLabelText("Save as reusable exercise"));
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));

  const catalog = JSON.parse(localStorage.getItem("savedExercises"));
  expect(catalog.map(({ name }) => name)).toEqual([
    "squat",
    "Barbell Back Squat one legged",
  ]);
  expect(new Set(catalog.map(({ id }) => id)).size).toBe(2);
  const loggedExercise = JSON.parse(localStorage.getItem("workoutEntries"))[0]
    .exercises[0];
  expect(loggedExercise.exerciseReference).toMatchObject({
    source: "user-saved",
    sourceId: catalog[1].id,
    modified: false,
  });
  expect(loggedExercise).not.toHaveProperty("exerciseId");

  fireEvent.click(
    screen.getByRole("button", { name: "Find an exercise for exercise 1" })
  );
  fireEvent.change(screen.getByLabelText("Exercise search"), {
    target: { value: "squ" },
  });
  expect(
    screen.getByRole("button", { name: "Select saved exercise squat" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "Select saved exercise Barbell Back Squat one legged",
    })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "Select Trace exercise Barbell Back Squat",
    })
  ).toBeInTheDocument();
});
