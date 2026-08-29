import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import InjectionSiteTracker from "./InjectionSiteTracker";
import { INJECTION_BODY_STYLE_ASSETS } from "../assets/injection-body-styles";
import {
  BODY_STYLE_OPTIONS,
  appendInjectionSession,
  createInjectionSession,
  emptyInjectionSiteCollection,
} from "../services/injectionSite";

const protocols = [
  {
    id: "protocol:energy", name: "Energy Phase 1", items: [
      { id: "item:b12", compound: { name: "Vitamin B12" }, dose: { amount: 1, unit: "ml" } },
      { id: "item:nad", compound: { name: "NAD+" }, dose: { amount: 50, unit: "mg" } },
    ],
  },
  { id: "protocol:recovery", name: "Recovery", items: [{ id: "item:peptide", compound: { name: "Peptide A" }, dose: { amount: 2, unit: "mg" } }] },
];
const now = new Date(2026, 7, 27, 12, 0);
let frames;
let originalRequestAnimationFrame;

beforeEach(() => {
  frames = [];
  originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

function flushFrame() {
  act(() => frames.shift()?.());
}

function shot(overrides = {}) {
  return {
    view: "front", x: 0.25, y: 0.68, siteLabel: "Right Thigh (Outer)", substanceName: "Vitamin B12",
    protocolId: "protocol:energy", protocolName: "Energy Phase 1", protocolItemId: "item:b12",
    amount: 1, unit: "mL", notes: "", ...overrides,
  };
}

function dataWith(shots, occurredAt = "2026-08-27T13:24:00.000Z") {
  const created = createInjectionSession({ occurredAt, shots }, {
    now: new Date("2026-08-27T13:25:00.000Z"), sessionId: `session:${occurredAt}`,
    shotIds: shots.map((value, index) => value.id || `shot:${index + 1}`),
  });
  return appendInjectionSession(emptyInjectionSiteCollection(), created);
}

function renderTracker(overrides = {}) {
  const props = {
    bodyHitTest: jest.fn(() => true),
    bodyStyleId: "neutral-average",
    data: emptyInjectionSiteCollection(),
    deleteShot: jest.fn(() => true),
    initialProtocolId: "",
    now,
    onBack: jest.fn(),
    protocols,
    saveSession: jest.fn(() => ({ status: "saved", shots: [] })),
    updateBodyStyle: jest.fn(() => true),
    updateShot: jest.fn(() => ({ status: "saved" })),
    ...overrides,
  };
  render(<InjectionSiteTracker {...props} />);
  return props;
}

function setMapBounds(view) {
  const map = screen.getByTestId(`${view}-body-map`);
  map.getBoundingClientRect = () => ({ left: 10, top: 20, width: 600, height: 1100, right: 610, bottom: 1120 });
  return map;
}

function selectBody(view = "front", clientX = 160, clientY = 768) {
  setMapBounds(view);
  fireEvent.click(screen.getByTestId(`${view}-silhouette`), { clientX, clientY });
}

function openEditor() {
  fireEvent.click(screen.getByRole("button", { name: /Log Injection/ }));
}

test("uses all ten standardized front/back assets and defaults to Neutral — Average", () => {
  expect(Object.keys(INJECTION_BODY_STYLE_ASSETS)).toEqual(BODY_STYLE_OPTIONS.map(({ id }) => id));
  Object.values(INJECTION_BODY_STYLE_ASSETS).forEach((assets) => {
    expect(assets.front).toBeTruthy();
    expect(assets.back).toBeTruthy();
  });
  renderTracker();
  expect(screen.getByLabelText("Body Style")).toHaveValue("neutral-average");
  expect(screen.getByAltText("Neutral — Average, front view")).toBeInTheDocument();
  expect(screen.getByAltText("Neutral — Average, back view")).toBeInTheDocument();
});

test.each(BODY_STYLE_OPTIONS)("renders approved $label artwork for both views", ({ id, label }) => {
  renderTracker({ bodyStyleId: id });
  expect(screen.getByAltText(`${label}, front view`)).toBeInTheDocument();
  expect(screen.getByAltText(`${label}, back view`)).toBeInTheDocument();
});

test("persists body-style selection through its owner without moving saved coordinates", () => {
  const saved = dataWith([shot({ id: "shot:fixed", x: 0.237891, y: 0.681234 })]);
  function Harness() {
    const [style, setStyle] = useState("neutral-average");
    return <InjectionSiteTracker bodyHitTest={() => true} bodyStyleId={style} data={saved} now={now} protocols={protocols} updateBodyStyle={(value) => { setStyle(value); return true; }} />;
  }
  const { container } = render(<Harness />);
  const before = container.querySelector('[data-entry-id="shot:fixed"]').getAttribute("transform");
  fireEvent.change(screen.getByLabelText("Body Style"), { target: { value: "feminine-fuller" } });
  expect(screen.getByAltText("Feminine — Fuller, front view")).toBeInTheDocument();
  expect(container.querySelector('[data-entry-id="shot:fixed"]')).toHaveAttribute("transform", before);
});

test("front and back flank taps keep their exact coordinates and anatomical labels", () => {
  renderTracker();
  selectBody("front", 214, 482);
  expect(screen.getByText(/Selected:/)).toHaveTextContent("Selected: Right Flank");
  expect(screen.getByTestId("pending-marker")).toHaveAttribute("transform", "translate(204 462)");

  selectBody("back", 406, 482);
  expect(screen.getByText(/Selected:/)).toHaveTextContent("Selected: Right Flank (Back)");
  expect(screen.getByTestId("pending-marker")).toHaveAttribute("transform", "translate(396 462)");
});

test("a pending flank label and normalized marker remain stable across all five body styles", () => {
  function Harness() {
    const [style, setStyle] = useState("neutral-average");
    return <InjectionSiteTracker
      bodyHitTest={() => true}
      bodyStyleId={style}
      data={emptyInjectionSiteCollection()}
      now={now}
      protocols={protocols}
      updateBodyStyle={(value) => { setStyle(value); return true; }}
    />;
  }
  render(<Harness />);
  selectBody("front", 214, 482);
  const expectedTransform = "translate(204 462)";

  BODY_STYLE_OPTIONS.forEach(({ id, label }) => {
    fireEvent.change(screen.getByLabelText("Body Style"), { target: { value: id } });
    expect(screen.getByAltText(`${label}, front view`)).toBeInTheDocument();
    expect(screen.getByText(/Selected:/)).toHaveTextContent("Selected: Right Flank");
    expect(screen.getByTestId("pending-marker")).toHaveAttribute("transform", expectedTransform);
  });
});

test("transparent artwork space never selects a location", () => {
  renderTracker({ bodyHitTest: jest.fn(() => false) });
  selectBody("front", 20, 30);
  expect(screen.queryByTestId("pending-marker")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Log Injection/ })).toBeDisabled();
});

test("Log Injection starts dimmed and a body tap activates and focuses it without opening the editor", () => {
  renderTracker();
  const button = screen.getByRole("button", { name: /Log Injection/ });
  expect(button).toBeDisabled();
  button.getBoundingClientRect = () => ({ top: 100, bottom: 150 });
  selectBody();
  expect(button).toBeEnabled();
  expect(screen.queryByRole("region", { name: "Log shot" })).not.toBeInTheDocument();
  flushFrame();
  expect(button).toHaveFocus();
  expect(button.scrollIntoView).not.toHaveBeenCalled();
});

test("body tap scrolls the activated button only when outside the viewport and respects reduced motion", () => {
  renderTracker({ reducedMotion: true });
  const button = screen.getByRole("button", { name: /Log Injection/ });
  button.getBoundingClientRect = () => ({ top: 900, bottom: 950 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  selectBody();
  flushFrame();
  expect(button.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "nearest" });
  expect(button).toHaveFocus();
});

test("one-time injections require and save their exact custom substance without a Protocol", () => {
  const props = renderTracker({ protocols: [] });
  selectBody();
  flushFrame();
  openEditor();
  fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter what you injected");
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "Iron dextran" } });
  fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));
  expect(props.saveSession).toHaveBeenCalledWith(expect.objectContaining({
    shots: [expect.objectContaining({ substanceName: "Iron dextran", protocolId: null })],
  }));
});

test("specific Protocol item selection stores its exact fluid and editable dose defaults", () => {
  const props = renderTracker({ initialProtocolId: "protocol:energy" });
  selectBody();
  flushFrame();
  openEditor();
  expect(screen.getByLabelText("Injection source")).toHaveValue("protocol:energy");
  fireEvent.change(screen.getByLabelText("Protocol fluid or compound"), { target: { value: "item:nad" } });
  expect(screen.getByLabelText("What did you inject?")).toHaveValue("NAD+");
  expect(screen.getByLabelText("Injection amount")).toHaveValue(50);
  fireEvent.change(screen.getByLabelText("Injection amount"), { target: { value: "75" } });
  fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));
  expect(props.saveSession.mock.calls[0][0].shots[0]).toMatchObject({
    substanceName: "NAD+", protocolId: "protocol:energy", protocolName: "Energy Phase 1", protocolItemId: "item:nad", amount: "75", unit: "mg",
  });
});

test("Add Another Shot queues without overwriting, preserves time, then focuses and scrolls to the maps", () => {
  const props = renderTracker({ protocols: [] });
  const maps = screen.getByLabelText("Front and back body maps");
  selectBody("front", 160, 768);
  flushFrame();
  openEditor();
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "First fluid" } });
  fireEvent.change(screen.getByLabelText("Injection date"), { target: { value: "2026-08-26" } });
  fireEvent.change(screen.getByLabelText("Injection time"), { target: { value: "07:11" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Another Shot" }));
  expect(screen.getAllByRole("status").some((element) => element.textContent.includes("1 shot queued"))).toBe(true);
  flushFrame();
  expect(maps.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  expect(screen.getByText("Tap anywhere on the body to mark the exact location.")).toHaveFocus();

  selectBody("back", 450, 400);
  flushFrame();
  openEditor();
  expect(screen.getByLabelText("Injection date")).toHaveValue("2026-08-26");
  expect(screen.getByLabelText("Injection time")).toHaveValue("07:11");
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "Second fluid" } });
  fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));
  expect(props.saveSession.mock.calls[0][0].shots.map(({ substanceName }) => substanceName)).toEqual(["First fluid", "Second fluid"]);
  expect(props.saveSession.mock.calls[0][0].shots[0]).toMatchObject({ view: "front", x: 0.25, y: 0.68 });
  expect(props.saveSession.mock.calls[0][0].shots[1]).toMatchObject({ view: "back" });
});

test("failed atomic Finish & Save keeps every queued shot available", () => {
  const props = renderTracker({ protocols: [], saveSession: jest.fn(() => ({ status: "error", message: "Storage full" })) });
  selectBody(); flushFrame(); openEditor();
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "First" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Another Shot" }));
  flushFrame();
  selectBody("back", 450, 400); flushFrame(); openEditor();
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "Second" } });
  fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));
  expect(props.saveSession).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent("Storage full");
  expect(screen.getAllByRole("status").some((element) => element.textContent.includes("1 shot queued"))).toBe(true);
  expect(screen.getByRole("region", { name: "Log shot" })).toBeInTheDocument();
});

test("Add Another Shot uses instant body-map scrolling with reduced motion", () => {
  renderTracker({ protocols: [], reducedMotion: true });
  const maps = screen.getByLabelText("Front and back body maps");
  selectBody(); flushFrame(); openEditor();
  fireEvent.change(screen.getByLabelText("What did you inject?"), { target: { value: "First" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Another Shot" }));
  flushFrame();
  expect(maps.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
});

test("edits one shot while clearly applying a changed date to its shared session", () => {
  const data = dataWith([shot({ id: "first" }), shot({ id: "sibling", substanceName: "NAD+", protocolItemId: "item:nad", amount: 50, unit: "mg" })]);
  const props = renderTracker({ data });
  fireEvent.click(screen.getByRole("button", { name: /Edit Vitamin B12 injection/ }));
  expect(screen.getByText("Changing this date or time updates all 2 shots in the session.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Injection date"), { target: { value: "2026-08-26" } });
  fireEvent.change(screen.getByLabelText("Injection amount"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(props.updateShot).toHaveBeenCalledWith(
    "first",
    expect.objectContaining({ substanceName: "Vitamin B12", amount: "2" }),
    expect.any(String)
  );
  const updatedLocal = new Date(props.updateShot.mock.calls[0][2]);
  expect([updatedLocal.getFullYear(), updatedLocal.getMonth() + 1, updatedLocal.getDate()]).toEqual([2026, 8, 26]);
});

test("deletes an individual shot with an explicit sibling-preservation confirmation", () => {
  window.confirm = jest.fn(() => true);
  const data = dataWith([shot({ id: "first" }), shot({ id: "sibling", substanceName: "NAD+", protocolItemId: "item:nad", amount: 50, unit: "mg" })]);
  const props = renderTracker({ data });
  fireEvent.click(screen.getByRole("button", { name: /Edit Vitamin B12 injection/ }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Shot" }));
  expect(window.confirm).toHaveBeenCalledWith("Delete this shot? Other shots in the same session will remain.");
  expect(props.deleteShot).toHaveBeenCalledWith("first");
});

test("All, One-time, and Protocol filters update both markers and shot-prioritized history", () => {
  const data = dataWith([
    shot({ id: "linked", substanceName: "Vitamin B12" }),
    shot({ id: "unlinked", substanceName: "Iron", protocolId: null, protocolName: null, protocolItemId: null, amount: null, unit: null }),
  ]);
  const { container } = render(<InjectionSiteTracker bodyHitTest={() => true} data={data} now={now} protocols={protocols} />);
  expect(screen.getByLabelText("Injection filter")).toHaveValue("");
  expect(screen.getAllByRole("button", { name: /Edit .* injection/ })).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Injection filter"), { target: { value: "__unlinked__" } });
  expect(container.querySelector('[data-entry-id="unlinked"]')).toBeInTheDocument();
  expect(container.querySelector('[data-entry-id="linked"]')).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Edit Iron injection/ })).toHaveTextContent("One-time / Unlinked");
  fireEvent.change(screen.getByLabelText("Injection filter"), { target: { value: "protocol:energy" } });
  expect(screen.getByRole("button", { name: /Edit Vitamin B12 injection/ })).toHaveTextContent("Energy Phase 1");
});

test("deleted Protocol history keeps saved fluid and Protocol snapshots", () => {
  const data = dataWith([shot({ id: "deleted", substanceName: "Saved Fluid", protocolId: "protocol:deleted", protocolName: "Deleted Plan", protocolItemId: "item:gone" })]);
  renderTracker({ data, protocols: [] });
  expect(screen.getByRole("button", { name: /Edit Saved Fluid injection/ })).toHaveTextContent("Deleted Plan");
});

test("final marker classes remain red solid, yellow diamond, and green hollow with no old marker on the map", () => {
  const datasets = [
    dataWith([shot({ id: "today" })], "2026-08-27T08:00:00.000Z"),
    dataWith([shot({ id: "week" })], "2026-08-22T08:00:00.000Z"),
    dataWith([shot({ id: "month" })], "2026-08-10T08:00:00.000Z"),
    dataWith([shot({ id: "old" })], "2026-07-01T08:00:00.000Z"),
  ];
  const data = datasets.reduce((all, item) => ({ schemaVersion: 2, sessions: [...all.sessions, ...item.sessions], shots: [...all.shots, ...item.shots] }), emptyInjectionSiteCollection());
  const { container } = render(<InjectionSiteTracker bodyHitTest={() => true} data={data} now={now} protocols={protocols} />);
  expect(container.querySelector('[data-entry-id="today"]')).toHaveClass("trace-injection-marker--today");
  expect(container.querySelector('[data-entry-id="week"]')).toHaveClass("trace-injection-marker--week");
  expect(container.querySelector('[data-entry-id="month"]')).toHaveClass("trace-injection-marker--month");
  expect(container.querySelector('[data-entry-id="old"]')).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Edit Vitamin B12 injection.*Jul 1/ })).toBeInTheDocument();
  expect(container.innerHTML.toLowerCase()).not.toContain("orange");
});

test("warns before leaving with a pending or queued unsaved shot", () => {
  window.confirm = jest.fn(() => false);
  const props = renderTracker();
  selectBody();
  fireEvent.click(screen.getByRole("button", { name: "Back to Protocols" }));
  expect(window.confirm).toHaveBeenCalledWith("Leave the Injection Site Tracker? Unsaved shots will be discarded.");
  expect(props.onBack).not.toHaveBeenCalled();
});
