import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { restoreCapsuleTimelineReturn } from "./services/capsuleTimelineReturn";

// Geometry correction is exercised in its service and browser tests. This file
// keeps real App/Home capture, history, retained views, and capsule navigation.
jest.mock("./services/capsuleTimelineReturn", () => ({
  ...jest.requireActual("./services/capsuleTimelineReturn"),
  restoreCapsuleTimelineReturn: jest.fn(),
}));

jest.mock("./storage/photoStorage", () => ({
  clearCompletedMigrationBackup: jest.fn(async () => {}),
  dataUrlToBlob: jest.fn(), deletePhotos: jest.fn(async () => {}), deleteMedia: jest.fn(async () => {}),
  getMedia: jest.fn(async () => undefined), getAllMedia: jest.fn(async () => []),
  getPhoto: jest.fn(async () => undefined), getAllPhotos: jest.fn(async () => []),
  hasLegacyPhotos: jest.fn(() => false), markLegacyMigrationComplete: jest.fn(async () => {}),
  migrateLegacyPhotos: jest.fn(), openPhotoDatabase: jest.fn(async () => ({ name: "capsule-timeline-test" })),
  putPhotos: jest.fn(async () => {}), putMedia: jest.fn(async () => {}),
  replaceAllMedia: jest.fn(async () => {}), replaceAllPhotos: jest.fn(async () => {}),
}));

jest.setTimeout(15000);
let originalBrowser;
let restorations;

function capsule(id, name, sealedAt, overrides = {}) {
  return {
    schemaVersion: 1, id, name, text: `Private contents of ${name}`, media: [], openOn: "2099-09-11",
    createdAt: sealedAt, updatedAt: sealedAt, sealedAt, openedAt: null,
    ...overrides,
  };
}

const originCapsule = capsule("origin", "Origin capsule", "2023-06-01T14:00:00.000Z");
const otherCapsule = capsule("other", "Other capsule", "2024-06-01T14:00:00.000Z");

function seed(capsules = [originCapsule, otherCapsule]) {
  localStorage.setItem("timeCapsules", JSON.stringify(capsules));
  localStorage.setItem("memories", JSON.stringify([
    { id: "old-memory", title: "Earlier memory", description: "", date: "2022-01-01", images: [], categories: [] },
    { id: "new-memory", title: "Later memory", description: "", date: "2025-01-01", images: [], categories: [] },
  ]));
}

function originCard() { return screen.getByTestId("timeline-time-capsule-origin"); }

function captureGeometry() {
  const home = screen.getByTestId("home-page");
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const card = originCard();
  viewport.scrollLeft = 417;
  viewport.scrollTop = 23;
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 12, top: 160, width: 390, height: 410 }));
  card.getBoundingClientRect = jest.fn(() => ({ left: 95, top: 267, width: 264, height: 340 }));
  Object.defineProperty(window, "scrollX", { configurable: true, value: 37 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 684 });
  return { home, viewport, card };
}

async function clickBackToTimeline() {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Back to Timeline", exact: true })); });
  await screen.findByRole("heading", { name: "Trace", exact: true });
}

function finishRestoration() {
  const restore = restorations.at(-1);
  expect(restore).toBeDefined();
  act(() => restore.onRestored({ restored: true, canceled: false, targetItemId: restore.origin.sourceItemId }));
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  restorations = [];
  originalBrowser = {
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
    scrollTo: window.scrollTo, scrollIntoView: Element.prototype.scrollIntoView, matchMedia: window.matchMedia,
    scrollX: Object.getOwnPropertyDescriptor(window, "scrollX"), scrollY: Object.getOwnPropertyDescriptor(window, "scrollY"),
    scrollRestoration: window.history.scrollRestoration,
  };
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn((query) => ({ matches: query.includes("prefers-reduced-motion"), addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.scrollRestoration = "auto";
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  restoreCapsuleTimelineReturn.mockImplementation((options) => {
    const dispose = jest.fn();
    restorations.push({ ...options, dispose });
    return dispose;
  });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  window.history.replaceState({}, "", "/");
  window.requestAnimationFrame = originalBrowser.requestAnimationFrame;
  window.cancelAnimationFrame = originalBrowser.cancelAnimationFrame;
  window.scrollTo = originalBrowser.scrollTo;
  Element.prototype.scrollIntoView = originalBrowser.scrollIntoView;
  window.matchMedia = originalBrowser.matchMedia;
  window.history.scrollRestoration = originalBrowser.scrollRestoration;
  if (originalBrowser.scrollX) Object.defineProperty(window, "scrollX", originalBrowser.scrollX);
  else delete window.scrollX;
  if (originalBrowser.scrollY) Object.defineProperty(window, "scrollY", originalBrowser.scrollY);
  else delete window.scrollY;
});

test("a Timeline card captures its source and retains the exact hidden, inert Home across capsule views", async () => {
  seed();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Past", exact: true }));
  const { home, viewport, card } = captureGeometry();
  fireEvent.click(card);
  expect(screen.getByRole("heading", { level: 1, name: originCapsule.name })).toBeInTheDocument();
  expect(screen.getByTestId("home-page")).toBe(home);
  expect(home).toHaveAttribute("hidden");
  expect(home).toHaveAttribute("inert");
  expect(home).toHaveAttribute("aria-hidden", "true");
  expect(window.history.scrollRestoration).toBe("manual");
  const origin = window.history.state.traceCapsuleTimelineReturn;
  expect(origin).toMatchObject({
    sourceItemId: "time-capsule:origin", documentScrollX: 37, documentScrollY: 684,
    timelineScrollLeft: 417, timelineScrollTop: 23, viewportTop: 160, sourceCardLeft: 83, sourceCardTop: 267,
    filters: { search: "", selectedCategory: "All", favoriteFilter: "all", timelinePosition: "past" },
  });
  expect(origin.nearbyItemIds).toEqual(expect.arrayContaining(["old-memory", "time-capsule:origin", "time-capsule:other", "new-memory"]));
  expect(origin.nearbyItemIds[origin.sourceIndex]).toBe(origin.sourceItemId);
  expect(restoreCapsuleTimelineReturn).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Back to Time Capsules", exact: true }));
  const archive = screen.getByRole("region", { name: "Time Capsule archive" });
  const otherArticle = within(archive).getByRole("heading", { name: otherCapsule.name }).closest("article");
  fireEvent.click(within(otherArticle).getByRole("button", { name: "View Time Capsule" }));
  expect(screen.getByRole("heading", { level: 1, name: otherCapsule.name })).toBeInTheDocument();
  expect(window.history.state.traceCapsuleTimelineReturn).toEqual(origin);
  window.scrollTo.mockClear();
  await clickBackToTimeline();
  expect(screen.getByTestId("home-page")).toBe(home);
  expect(home).not.toHaveAttribute("hidden");
  expect(home).not.toHaveAttribute("inert");
  expect(screen.getByRole("button", { name: "Past", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(restoreCapsuleTimelineReturn).toHaveBeenLastCalledWith(expect.objectContaining({ origin, viewport, cards: expect.any(Map) }));
  expect(restorations.at(-1).cards.get(origin.sourceItemId)).toBe(card);
  expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  finishRestoration();
  expect(window.history.scrollRestoration).toBe("auto");
});

test("browser Back and Forward restore the same card journey without losing retained Home", async () => {
  seed();
  render(<App />);
  const { home, card } = captureGeometry();
  fireEvent.click(card);
  const origin = window.history.state.traceCapsuleTimelineReturn;
  act(() => window.history.back());
  await screen.findByRole("heading", { name: "Trace", exact: true });
  expect(restorations.at(-1).origin).toEqual(origin);
  finishRestoration();
  act(() => window.history.forward());
  await screen.findByRole("heading", { level: 1, name: originCapsule.name });
  expect(screen.getByTestId("home-page")).toBe(home);
  expect(home).toHaveAttribute("inert");
  expect(window.history.scrollRestoration).toBe("manual");
  act(() => window.history.back());
  await screen.findByRole("heading", { name: "Trace", exact: true });
  expect(restorations.at(-1).origin).toEqual(origin);
  finishRestoration();
});

test("rapid Back to Timeline clicks enqueue one history traversal until popstate completes", async () => {
  seed();
  render(<App />);
  fireEvent.click(captureGeometry().card);
  const historyBack = jest.spyOn(window.history, "back").mockImplementation(() => {});
  const origin = window.history.state.traceCapsuleTimelineReturn;
  const back = screen.getByRole("button", { name: "Back to Timeline", exact: true });
  act(() => { fireEvent.click(back); fireEvent.click(back); });
  expect(historyBack).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { level: 1, name: originCapsule.name })).toBeInTheDocument();

  const homeEntry = { tracePage: "home", traceCapsuleTimelineReturn: origin };
  window.history.replaceState(homeEntry, "", "/");
  await act(async () => { fireEvent.popState(window, { state: homeEntry }); });
  expect(screen.getByRole("heading", { name: "Trace", exact: true })).toBeInTheDocument();
  finishRestoration();

  // The completed traversal must release the guard for a later capsule visit.
  fireEvent.click(originCard());
  const nextBack = screen.getByRole("button", { name: "Back to Timeline", exact: true });
  act(() => { fireEvent.click(nextBack); fireEvent.click(nextBack); });
  expect(historyBack).toHaveBeenCalledTimes(2);
});

test("direct Time Capsules navigation clears old card history and returns using ordinary page scrolling", async () => {
  seed();
  render(<App />);
  fireEvent.click(captureGeometry().card);
  await clickBackToTimeline();
  finishRestoration();
  expect(window.history.state.traceCapsuleTimelineReturn).toBeDefined();
  restoreCapsuleTimelineReturn.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Time Capsules", exact: true }));
  expect(screen.getByRole("heading", { level: 1, name: "Time Capsules" })).toBeInTheDocument();
  expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  expect(window.history.state).not.toHaveProperty("traceCapsuleTimelineReturn");
  expect(window.history.scrollRestoration).toBe("auto");
  window.scrollTo.mockClear();
  await clickBackToTimeline();
  expect(restoreCapsuleTimelineReturn).not.toHaveBeenCalled();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
});

test("a ready reminder opens directly and clears a stale card-origin history entry", async () => {
  seed();
  const app = render(<App />);
  fireEvent.click(captureGeometry().card);
  await clickBackToTimeline();
  finishRestoration();
  expect(window.history.state.traceCapsuleTimelineReturn).toBeDefined();
  app.unmount();
  seed([originCapsule, { ...otherCapsule, openOn: "2020-01-01" }]);
  restoreCapsuleTimelineReturn.mockClear();
  render(<App />);
  const reminder = screen.getByRole("dialog", { name: "Your Time Capsule is ready" });
  fireEvent.click(within(reminder).getByRole("button", { name: "Open now" }));
  expect(screen.getByRole("heading", { level: 1, name: otherCapsule.name })).toBeInTheDocument();
  expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  expect(window.history.state).not.toHaveProperty("traceCapsuleTimelineReturn");
  expect(window.history.scrollRestoration).toBe("auto");
  await clickBackToTimeline();
  expect(restoreCapsuleTimelineReturn).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog", { name: "Your Time Capsule is ready" })).not.toBeInTheDocument();
});

test("deleting the originating capsule returns its old context with a current card map for safe fallback", async () => {
  seed();
  render(<App />);
  const { home, card } = captureGeometry();
  fireEvent.click(card);
  const origin = window.history.state.traceCapsuleTimelineReturn;
  jest.spyOn(window, "confirm").mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Delete Time Capsule" })); });
  await screen.findByRole("heading", { level: 1, name: "Time Capsules" });
  await clickBackToTimeline();
  expect(screen.getByTestId("home-page")).toBe(home);
  const restore = restorations.at(-1);
  expect(restore.origin).toEqual(origin);
  expect(restore.cards.has(origin.sourceItemId)).toBe(false);
  expect(restore.cards.has("time-capsule:other")).toBe(true);
  expect(JSON.parse(localStorage.getItem("timeCapsules")).map(({ id }) => id)).toEqual(["other"]);
  finishRestoration();
});

test("an unrelated browser destination cancels retained capsule context rather than restoring stale scroll", async () => {
  seed();
  render(<App />);
  fireEvent.click(captureGeometry().card);
  await act(async () => { fireEvent.popState(window, { state: { tracePage: "home", unrelatedEntry: true } }); });
  await waitFor(() => expect(screen.getByRole("heading", { name: "Trace", exact: true })).toBeInTheDocument());
  expect(restoreCapsuleTimelineReturn).not.toHaveBeenCalled();
  expect(window.history.scrollRestoration).toBe("auto");
});
