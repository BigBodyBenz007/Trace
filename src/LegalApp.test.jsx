import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { DEFAULT_APP_SETTINGS } from "./services/appSettings";

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

let originalAnimationFrame;
let originalCancelAnimationFrame;
let originalScrollTo;
let originalTitle;
let originalScrollY;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  originalAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;
  originalScrollTo = window.scrollTo;
  originalTitle = document.title;
  originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  document.title = "Trace";
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
  window.requestAnimationFrame = originalAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.scrollTo = originalScrollTo;
  document.title = originalTitle;
  if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
});

test.each([
  ["/privacy", "Trace Privacy Policy"],
  ["/terms", "Trace Terms of Service"],
])("loads %s directly with its public title and returns safely to Settings", async (pathname, heading) => {
  window.history.replaceState({}, "", pathname);
  render(<App />);

  expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  expect(document.title).toBe(heading);
  expect(screen.getByRole("main")).toHaveClass("trace-feature-page--legal");

  fireEvent.click(screen.getAllByRole("button", { name: "Back to Settings" })[0]);
  await screen.findByRole("heading", { level: 1, name: "Settings" });
  expect(window.location.pathname).toBe("/");
  expect(document.title).toBe("Trace");
  expect(screen.getByRole("link", { name: pathname === "/privacy" ? "Privacy Policy" : "Terms of Service" }))
    .toHaveFocus();
});

test("Settings legal links preserve scroll and focus across browser Back and Forward", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Backup & Restore" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);

  Object.defineProperty(window, "scrollY", { configurable: true, value: 684 });
  window.scrollTo.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "Privacy Policy" }));
  expect(window.location.pathname).toBe("/privacy");
  expect(screen.getByRole("heading", { level: 1, name: "Trace Privacy Policy" })).toHaveFocus();
  expect(document.title).toBe("Trace Privacy Policy");

  act(() => window.history.back());
  await screen.findByRole("heading", { level: 1, name: "Settings" });
  await waitFor(() => expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveFocus());
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 684, left: 0, behavior: "auto" });
  expect(document.title).toBe("Trace");

  act(() => window.history.forward());
  await screen.findByRole("heading", { level: 1, name: "Trace Privacy Policy" });
  expect(window.location.pathname).toBe("/privacy");
  expect(document.title).toBe("Trace Privacy Policy");
});

test("Settings exposes stable Privacy, Terms, and support destinations", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(screen.getByRole("heading", { name: "Legal & Privacy" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: "Contact Trace Support" }))
    .toHaveAttribute("href", "mailto:traceappsupporthelp@gmail.com");
});

test("a direct legal page retains the saved theme and Reduced Motion shell", () => {
  localStorage.setItem("appSettings", JSON.stringify({
    ...DEFAULT_APP_SETTINGS,
    themeId: "haunted-forest",
    motionPreference: "reduced",
  }));
  window.history.replaceState({}, "", "/terms");
  render(<App />);

  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("data-trace-theme", "haunted-forest");
  expect(screen.getByTestId("trace-app-shell")).toHaveAttribute("data-motion", "reduced");
  expect(screen.getByRole("heading", { level: 1, name: "Trace Terms of Service" })).toBeInTheDocument();
});
