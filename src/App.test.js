import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { createCompoundDefinition } from "./services/compoundCatalog";
import { createExerciseDefinition } from "./services/exerciseCatalog";
import { deletePhotos, openPhotoDatabase, putPhotos } from "./storage/photoStorage";

jest.mock("./storage/photoStorage", () => ({
  clearCompletedMigrationBackup: jest.fn(),
  dataUrlToBlob: jest.fn(),
  deletePhotos: jest.fn(),
  getPhoto: jest.fn(),
  hasLegacyPhotos: jest.fn(() => false),
  markLegacyMigrationComplete: jest.fn(),
  migrateLegacyPhotos: jest.fn(),
  openPhotoDatabase: jest.fn(() => new Promise(() => {})),
  putPhotos: jest.fn(),
}));

let originalRequestAnimationFrame;
let originalCancelAnimationFrame;
let originalScrollTo;
let originalScrollIntoView;

beforeEach(() => {
  localStorage.clear();
  originalRequestAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;
  originalScrollTo = window.scrollTo;
  originalScrollIntoView = Element.prototype.scrollIntoView;
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.scrollTo = originalScrollTo;
  Element.prototype.scrollIntoView = originalScrollIntoView;
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

  fireEvent.click(screen.getByRole("button", { name: "Health & Nutrition" }));

  expect(
    screen.getByRole("heading", { name: "Health & Nutrition" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
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
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Nutrition to Timeline lands at the top after rendering", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Health & Nutrition" }));
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
    screen.getByRole("heading", { name: "New Memory" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
});

test("Add Memory to Timeline lands at the top", () => {
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Add Memory" }));
  window.scrollTo.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expectDestinationScrolledToTop();
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
  fireEvent.click(within(suggestion).getByRole("button", { name: "Add to Trophy Case" }));
  const ceremony = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(ceremony).toHaveTextContent("Graduation Day");
  expect(ceremony).toHaveTextContent("Finally finished my degree.");
  const originalTrophies = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(originalTrophies).toHaveLength(1);
  expect(originalTrophies[0]).toMatchObject({
    sourceType: "memory",
    sourceKey: `memory|${originalTrophies[0].sourceId}`,
    sourceSnapshot: { title: "Graduation Day", description: "Finally finished my degree.", date: "2026-05-18" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));
  expect(screen.getByRole("button", { name: "In Trophy Case" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Graduation Day trophy" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("memories"))).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
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
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("memories"))).toEqual([]));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual(readdedTrophies);

  openWorkouts();
  expect(screen.getByRole("group", { name: "Graduation Day trophy" })).toHaveTextContent("Finally finished my degree.");
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
  const add = await screen.findByRole("button", { name: "Add to Trophy Case" });
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

  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "ss-31" },
  });
  expect(screen.getByRole("button", { name: "Select SS-31" })).toBeInTheDocument();
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
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "saved" },
  });

  expect(
    screen.getByRole("button", { name: "Select Saved Compound" })
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
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
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
    screen.getByRole("button", { name: "Select Retatrutide" })
  );
  expect(screen.getByLabelText("Amount / dose")).toHaveValue(20);

  unmount();
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Medications & Supplements" })
  );
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
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
  expect(screen.getByText(/Bodyweight.*6 reps/)).toBeInTheDocument();
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
  expect(screen.getAllByRole("button", { name: "In Trophy Case" }).every((button) => button.disabled)).toBe(true);
  expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("6 reps");
  const curatedSnapshot = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(curatedSnapshot).toHaveLength(1);
  expect(curatedSnapshot[0]).toMatchObject({
    sourceType: "workout-pr",
    sourceRecordType: "bodyweight-reps",
    sourceSnapshot: { exerciseName: "Dips", recordValue: "6 reps", workoutTitle: "Push Day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Exercise 1 set 1 reps"), { target: { value: "16" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => {
    expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("16 reps");
  });
  const correctedSnapshot = JSON.parse(localStorage.getItem("trophyCaseEntries"));
  expect(correctedSnapshot[0]).toMatchObject({
    id: curatedSnapshot[0].id,
    addedToTrophyCaseAt: curatedSnapshot[0].addedToTrophyCaseAt,
    sourceKey: curatedSnapshot[0].sourceKey,
    sourceSnapshot: { recordValue: "16 reps" },
  });

  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]);
  expect(screen.getByRole("group", { name: "Dips trophy" })).toHaveTextContent("16 reps");
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual(correctedSnapshot);

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
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("trophyCaseEntries"))).toEqual([]);
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual(storedWorkouts);

  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  openWorkouts();
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Dips.*1 performance/ }));
  expect(screen.getByRole("region", { name: "Dips current records" })).toHaveTextContent("6 reps");
  expect(screen.getAllByRole("button", { name: "Add to Trophy Case" }).length).toBeGreaterThan(0);
});

test("adding a PR Timeline achievement keeps both Timeline and Exercise History expanded", () => {
  render(<App />);
  openWorkouts();
  fillBodyweightWorkout("Push Day");
  fireEvent.click(screen.getByRole("button", { name: "Save Workout" }));
  const summary = screen.getByRole("button", { name: /Dips.*1 performance/ });
  fireEvent.click(summary);
  fireEvent.click(screen.getByRole("button", { name: "View PR Timeline" }));
  const timeline = screen.getByRole("region", { name: "Dips PR timeline" });
  fireEvent.click(within(timeline).getByRole("button", { name: "Add to Trophy Case" }));

  expect(screen.getByRole("dialog", { name: "Added to Trophy Case" })).toBeInTheDocument();
  const closeCeremony = screen.getByRole("button", { name: "Close Trophy Case ceremony" });
  fireEvent.mouseDown(closeCeremony);
  fireEvent.click(closeCeremony);
  expect(screen.getByRole("region", { name: "Dips PR timeline" })).toBeInTheDocument();
  expect(summary).toHaveAttribute("aria-expanded", "true");
  expect(within(screen.getByRole("region", { name: "Dips PR timeline" }))
    .getByRole("button", { name: "In Trophy Case" })).toBeDisabled();
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
  openWorkouts();
  expect(screen.getByRole("group", { name: "Existing Achievement trophy" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
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
  expect(screen.getAllByText("100 kg × 6 reps")).toHaveLength(3);

  jest.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(JSON.parse(localStorage.getItem("workoutEntries"))).toEqual([]);
  expect(screen.getByText("No workouts logged yet.")).toBeInTheDocument();
  expect(screen.getByText("No exercise history yet.")).toBeInTheDocument();
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
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
