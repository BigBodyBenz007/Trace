import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App, { localCalendarDateKey } from "./App";
import { createCompoundDefinition } from "./services/compoundCatalog";
import { createExerciseDefinition } from "./services/exerciseCatalog";
import { deletePhotos, openPhotoDatabase, putPhotos } from "./storage/photoStorage";

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

let originalRequestAnimationFrame;
let originalCancelAnimationFrame;
let originalScrollTo;
let originalScrollIntoView;
let originalCreateObjectURL;
let originalRevokeObjectURL;

beforeEach(() => {
  localStorage.clear();
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
  expect(JSON.parse(localStorage.getItem("appSettings"))).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } });
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

test("Timeline opens Backup & Restore and returns without changing data", () => {
  localStorage.setItem("nutritionGoals", JSON.stringify({ calories: 2100 }));
  renderAppAtTimeline();
  fireEvent.click(screen.getByRole("button", { name: "Backup & Restore" }));
  expect(screen.getByRole("heading", { name: "Backup & Restore" })).toBeInTheDocument();
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
    screen.getByRole("heading", { name: "New Memory" })
  ).toBeInTheDocument();
  expectDestinationScrolledToTop();
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
  expect(screen.getByLabelText("In Trophy Case")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(screen.getByRole("group", { name: "Graduation Day trophy" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Added to Trophy Case" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(JSON.parse(localStorage.getItem("memories"))).toHaveLength(1);
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
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
  expect(screen.getByText("↳ Drop 1: Bodyweight × 4 reps")).toBeInTheDocument();
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

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
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
