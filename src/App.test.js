import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

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
