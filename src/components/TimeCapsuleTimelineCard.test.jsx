import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { TIMELINE_FOCUS_TUNING } from "../services/timelineFocus";
import TimeCapsuleTimelineCard from "./TimeCapsuleTimelineCard";

const capsule = {
  schemaVersion: 1,
  id: "timeline-capsule",
  name: "A message for a future September birthday",
  text: "Private contents must stay out of the Timeline",
  openOn: "2027-09-11",
  sealedAt: "2026-09-11T12:00:00.000Z",
  createdAt: "2026-09-11T12:00:00.000Z",
  updatedAt: "2026-09-11T12:00:00.000Z",
  openedAt: null,
  media: [{ id: "private-voice", kind: "audio", name: "Private voice message.m4a", mimeType: "audio/mp4", bytes: 20 }],
};

const props = { capsule, colors: { card: "#123456" }, today: "2026-09-12", onView: jest.fn() };

beforeEach(() => jest.clearAllMocks());

test.each([
  ["sealed", "Sealed", "Sealed Time Capsule vault", {}],
  ["ready", "Ready to open", "Time Capsule vault ready to open", { openOn: "2026-09-11" }],
  ["opened", "Opened", "Opened Time Capsule vault", { openOn: "2026-09-11", openedAt: "2026-09-12T12:00:00.000Z" }],
])("the %s preview retains artwork and public metadata without exposing private content", (state, label, imageLabel, override) => {
  const record = { ...capsule, ...override };
  const onView = jest.fn();
  render(<TimeCapsuleTimelineCard {...props} capsule={record} onView={onView} />);
  const card = screen.getByRole("button", { name: `View Time Capsule ${record.name}` });
  expect(card).toHaveAttribute("data-capsule-id", record.id);
  expect(card).toHaveTextContent(record.name);
  expect(card).toHaveTextContent(label);
  expect(card).toHaveTextContent("Opening date: September 11,");
  expect(card).toHaveTextContent("View Time Capsule");
  expect(screen.getByRole("img", { name: imageLabel })).toHaveAttribute("data-capsule-vault-state", state);
  expect(screen.queryByText(record.text)).not.toBeInTheDocument();
  expect(card).not.toHaveTextContent(record.media[0].name);
  expect(card.querySelector("audio, video")).toBeNull();
  fireEvent.click(card);
  expect(onView).toHaveBeenCalledWith(record.id);
});

test("long wrapped content reserves its full focused height and releases its observer on removal", () => {
  const originalObserver = window.ResizeObserver;
  let resize;
  let measuredHeight = 180;
  const observer = { observe: jest.fn(), disconnect: jest.fn() };
  window.ResizeObserver = jest.fn((callback) => { resize = callback; return observer; });
  const offsetHeight = jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
    return this.hasAttribute("data-timeline-card-visual") ? measuredHeight : 0;
  });
  try {
    const name = "For a future September birthday with everyone who made this year memorable and every story still to be told";
    const { unmount } = render(<TimeCapsuleTimelineCard {...props} capsule={{ ...capsule, name }} />);
    const card = screen.getByRole("button", { name: `View Time Capsule ${name}` });
    const visual = card.querySelector("[data-timeline-card-visual]");
    expect(observer.observe).toHaveBeenCalledWith(visual);
    expect(card.style.getPropertyValue("--trace-capsule-scaled-height")).toBe("246px");

    // Font loading, text sizing, and long names can grow the natural card after
    // its first layout. Its allocation must include the maximum focus scale.
    measuredHeight = 340;
    act(() => resize());
    const reserved = Number.parseFloat(card.style.getPropertyValue("--trace-capsule-scaled-height"));
    expect(reserved).toBeGreaterThan(measuredHeight * TIMELINE_FOCUS_TUNING.maximumScale);
    expect(card.style.minHeight).toContain("--trace-capsule-scaled-height");
    expect(card).toHaveTextContent(name);
    expect(card).toHaveStyle({ width: "240px", marginLeft: "-28px", marginRight: "-28px", overflow: "visible", contain: "layout style" });
    expect(visual).toHaveStyle({ width: "184px", overflowWrap: "anywhere", transformOrigin: "center top" });
    expect(card.children).toHaveLength(1);
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(() => resize()).not.toThrow();
  } finally {
    offsetHeight.mockRestore();
    window.ResizeObserver = originalObserver;
  }
});

test("window resize reserves wrapped content without ResizeObserver and reduced motion needs no scale allowance", () => {
  const originalObserver = window.ResizeObserver;
  window.ResizeObserver = undefined;
  let measuredHeight = 330;
  const offsetHeight = jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
    return this.hasAttribute("data-timeline-card-visual") ? measuredHeight : 0;
  });
  try {
    const { rerender, unmount } = render(<TimeCapsuleTimelineCard {...props} />);
    const card = screen.getByTestId("timeline-time-capsule-timeline-capsule");
    measuredHeight = 360;
    fireEvent(window, new Event("resize"));
    expect(Number.parseFloat(card.style.getPropertyValue("--trace-capsule-scaled-height"))).toBeGreaterThan(360 * 1.3);
    rerender(<TimeCapsuleTimelineCard {...props} reducedMotion />);
    expect(card.style.getPropertyValue("--trace-capsule-scaled-height")).toBe("372px");
    expect(card.querySelector("[data-timeline-card-visual]")).toHaveStyle({ transform: "scale(1)", transition: "none" });
    unmount();
  } finally {
    offsetHeight.mockRestore();
    window.ResizeObserver = originalObserver;
  }
});

test("compact artwork rules are scoped to Timeline capsules and leave the full title and date free to wrap", () => {
  const css = readFileSync(require.resolve("./TimeCapsuleTimelineCard.css"), "utf8");
  expect(css).toMatch(/\.trace-timeline-capsule-card\s*\{[^}]*align-items:\s*flex-start;[^}]*display:\s*flex/s);
  expect(css).toMatch(/\.trace-timeline-capsule-card\.trace-timeline-card-position\[data-timeline-focused="true"\]::before\s*\{\s*content:\s*none;/);
  expect(css).toMatch(/\.trace-timeline-capsule-card \.trace-capsule-vault--timeline\s*\{[^}]*max-width:\s*72px/s);
  expect(css).not.toMatch(/font-size\s*:|line-clamp|max-height\s*:|text-overflow\s*:/);
  expect(css).not.toMatch(/\.life-current-theme|\.trace-capsule-vault--detail|\.trace-capsule-film|\.trace-timeline-memory/);
  expect(css).toMatch(/\.trace-timeline-capsule-card__name,[\s\S]*\.trace-timeline-capsule-card__date,[\s\S]*overflow-wrap:\s*anywhere/s);
  // The whole outer button remains at least the existing 310px card slot;
  // typography and the 44px interaction target are not reduced to fit the art.
  render(<TimeCapsuleTimelineCard {...props} />);
  expect(screen.getByRole("button").style.minHeight).toContain("--life-current-card-space");
});
