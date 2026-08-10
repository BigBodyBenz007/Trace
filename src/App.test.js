import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { createCompoundDefinition } from "./services/compoundCatalog";

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

beforeEach(() => {
  localStorage.clear();
  originalRequestAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;
  originalScrollTo = window.scrollTo;
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.scrollTo = originalScrollTo;
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

test("Timeline to Nutrition lands at the top after rendering", () => {
  renderAppAtTimeline();

  fireEvent.click(screen.getByRole("button", { name: "Health & Nutrition" }));

  expect(
    screen.getByRole("heading", { name: "Health & Nutrition" })
  ).toBeInTheDocument();
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
