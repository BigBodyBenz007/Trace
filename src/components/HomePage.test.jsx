import { act, fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "./HomePage";
import { TIMELINE_FOCUS_TUNING } from "../services/timelineFocus";

const baseProps = {
  memoryCount: 2,
  toggleFavorite: jest.fn(),
  onAddMemory: jest.fn(),
  onOpenNutrition: jest.fn(),
  onOpenHealth: jest.fn(),
  onOpenMedications: jest.fn(),
  onOpenProtocols: jest.fn(),
  onOpenWorkouts: jest.fn(),
  onOpenTrophyCase: jest.fn(),
  onOpenBackup: jest.fn(),
  onOpenJournal: jest.fn(),
  onOpenSettings: jest.fn(),
  deleteMemory: jest.fn(),
  editMemory: jest.fn(),
  addTrophyCaseEntry: jest.fn(),
  buttonStyle: {},
  inputStyle: {},
  containerStyle: {},
};

test("renders primary Timeline actions in the intended order", () => {
  render(<HomePage {...baseProps} memories={[]} trophyEntries={[]} />);
  const names = screen.getAllByRole("button")
    .map((button) => button.textContent.trim())
    .filter((name) => [
      "Add Memory",
      "Nutrition",
      "Health",
      "Workouts",
      "Medications & Supplements",
      "Protocols",
      "Open Trophy Case",
      "Backup & Restore",
    ].includes(name));
  expect(names).toEqual([
    "Add Memory",
    "Nutrition",
    "Health",
    "Workouts",
    "Medications & Supplements",
    "Protocols",
    "Open Trophy Case",
    "Backup & Restore",
  ]);
  expect(screen.getByRole("button", { name: "Add Memory" })).toHaveClass("trace-feature-action--primary");
  expect(screen.getByRole("button", { name: "Nutrition" })).toHaveClass("trace-feature-action--core");
  expect(screen.getByRole("button", { name: "Health" })).toHaveClass("trace-feature-action--core");
});

test("frames centered branding with independent accessible Settings and Journal controls", () => {
  render(<HomePage {...baseProps} memories={[]} trophyEntries={[]} />);
  const featureNavigation = screen.getByRole("navigation", { name: "Trace features" });
  const personalArea = screen.getByRole("complementary", { name: "Personal and settings" });
  const branding = screen.getByRole("banner");
  const intro = branding.parentElement;
  const settings = within(personalArea).getByRole("button", { name: "Settings" });
  const journal = within(personalArea).getByRole("button", { name: "Open Journal" });
  expect(branding).toHaveAttribute("data-layout", "centered-branding");
  expect(within(branding).getByRole("heading", { name: "Trace" })).toBeInTheDocument();
  expect(within(branding).getByText("Your timeline. Your story.")).toBeInTheDocument();
  expect(branding).not.toContainElement(personalArea);
  expect(personalArea.parentElement).toBe(intro);
  expect(intro).toHaveAttribute("data-safe-area-context", "body-inset");
  expect(personalArea).toHaveAttribute("data-layout", "independent-utility-frame");
  expect(settings).toHaveAttribute("data-utility-position", "left");
  expect(journal.closest("[data-utility-position]")).toHaveAttribute("data-utility-position", "right");
  expect(within(featureNavigation).queryByRole("button", { name: /Journal/ })).not.toBeInTheDocument();
  fireEvent.click(journal);
  expect(baseProps.onOpenJournal).toHaveBeenCalledTimes(1);
  fireEvent.click(settings);
  expect(baseProps.onOpenSettings).toHaveBeenCalledTimes(1);
});

const memories = [
  { id: "memory-a", title: "Same Day", description: "First", date: "2026-05-18", categories: [], images: [], favorite: false },
  { id: "memory-b", title: "Same Day", description: "Second", date: "2026-05-19", categories: [], images: [], favorite: false },
];

function mockPageScroll(x, y) {
  const originalScrollTo = window.scrollTo;
  const originalScrollX = Object.getOwnPropertyDescriptor(window, "scrollX");
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollX", { configurable: true, value: x });
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.scrollTo = jest.fn();
  return {
    scrollTo: window.scrollTo,
    restore() {
      window.scrollTo = originalScrollTo;
      if (originalScrollX) Object.defineProperty(window, "scrollX", originalScrollX);
      else delete window.scrollX;
      if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
      else delete window.scrollY;
    },
  };
}

function memoryWithOnePhoto() {
  return {
    ...memories[0],
    title: "Scrollable memory",
    description: "A long Memory detail can keep scrolling inside its overlay.",
    images: [{ id: "detail-photo", url: "blob:detail-photo" }],
  };
}

test("Memory detail locks document scrolling while its panel remains scrollable", () => {
  const pageScroll = mockPageScroll(18, 240);
  const memory = memoryWithOnePhoto();
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);

  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));

  expect(document.body).toHaveStyle({
    left: "-18px",
    overflow: "hidden",
    position: "fixed",
    top: "-240px",
  });
  expect(document.documentElement).toHaveStyle({ overflow: "hidden" });
  const detailPanel = screen.getByTestId("memory-detail-panel");
  expect(detailPanel.style.overflowY).toBe("auto");
  expect(detailPanel.style.overscrollBehavior).toBe("contain");
  detailPanel.scrollTop = 120;
  fireEvent.scroll(detailPanel);
  expect(detailPanel.scrollTop).toBe(120);
  expect(document.body).toHaveStyle({ position: "fixed", top: "-240px" });

  fireEvent.click(screen.getByRole("button", { name: "Close memory details" }));
  expect(document.body.style.position).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
  expect(pageScroll.scrollTo).toHaveBeenCalledWith(18, 240);
  pageScroll.restore();
});

test("photo viewer keeps the document locked until the nested detail closes", () => {
  const pageScroll = mockPageScroll(0, 180);
  const memory = memoryWithOnePhoto();
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);

  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));
  const detail = screen.getByRole("dialog", { name: "Memory details for Scrollable memory" });
  fireEvent.click(within(detail).getAllByAltText("Memory 1")[0]);
  const photoViewer = screen.getByRole("dialog", { name: "Memory photo viewer" });
  expect(photoViewer.style.overflowY).toBe("auto");
  expect(photoViewer.style.overscrollBehavior).toBe("contain");
  expect(document.body).toHaveStyle({ position: "fixed", top: "-180px" });

  fireEvent.click(photoViewer);
  expect(screen.getByRole("dialog", { name: "Memory details for Scrollable memory" }))
    .toBeInTheDocument();
  expect(document.body).toHaveStyle({ position: "fixed", top: "-180px" });
  expect(pageScroll.scrollTo).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Close memory details" }));
  expect(document.body.style.position).toBe("");
  expect(pageScroll.scrollTo).toHaveBeenCalledWith(0, 180);
  pageScroll.restore();
});

test("photo viewer has an explicit close control and hides navigation for one photo", () => {
  const memory = memoryWithOnePhoto();
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));
  fireEvent.click(within(screen.getByRole("dialog", { name: /Memory details/ })).getAllByAltText("Memory 1")[0]);

  fireEvent.click(screen.getByRole("button", { name: "Close photo viewer" }));
  expect(screen.queryByRole("dialog", { name: "Memory photo viewer" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Previous photo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
});

test("photo viewer navigates a Memory gallery with boundaries, position, and swipe", () => {
  const memory = {
    ...memoryWithOnePhoto(),
    images: ["blob:first", "blob:second", "blob:third"],
  };
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));
  fireEvent.click(within(screen.getByRole("dialog", { name: /Memory details/ })).getAllByAltText("Memory 1")[0]);
  const viewer = screen.getByRole("dialog", { name: "Memory photo viewer" });

  expect(within(viewer).getByAltText("Memory 1 enlarged")).toHaveStyle({
    maxWidth: "100%",
  });
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous photo" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  const swipeStart = new Event("pointerdown", { bubbles: true });
  Object.defineProperty(swipeStart, "clientX", { value: 200 });
  const swipeEnd = new Event("pointerup", { bubbles: true });
  Object.defineProperty(swipeEnd, "clientX", { value: 100 });
  fireEvent(screen.getByTestId("memory-photo-viewer-content"), swipeStart);
  fireEvent(screen.getByTestId("memory-photo-viewer-content"), swipeEnd);
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
});

test("photo viewer close control handles its own pointer and click without backdrop closing", () => {
  const memory = memoryWithOnePhoto();
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));
  fireEvent.click(within(screen.getByRole("dialog", { name: /Memory details/ })).getAllByAltText("Memory 1")[0]);
  const close = screen.getByRole("button", { name: "Close photo viewer" });

  fireEvent.pointerDown(close);
  expect(screen.getByRole("dialog", { name: "Memory photo viewer" })).toBeInTheDocument();
  fireEvent.click(close);
  expect(screen.queryByRole("dialog", { name: "Memory photo viewer" })).not.toBeInTheDocument();
});

test.each([
  ["2007-04-17", "April 17, 2007"],
  ["2000-01-01", "January 1, 2000"],
  ["1999-12-31", "December 31, 1999"],
])("renders date-only Memory %s on its entered calendar day", (date, label) => {
  render(<HomePage {...baseProps} memories={[{ ...memories[0], date }]} trophyEntries={[]} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});

beforeEach(() => jest.clearAllMocks());

test("opens the dedicated Trophy Case from the Timeline", () => {
  render(<HomePage {...baseProps} memories={[]} trophyEntries={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(baseProps.onOpenTrophyCase).toHaveBeenCalledTimes(1);
});

test("opens Backup & Restore from the Timeline without changing existing action order", () => {
  render(<HomePage {...baseProps} memories={[]} trophyEntries={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Backup & Restore" }));
  expect(baseProps.onOpenBackup).toHaveBeenCalledTimes(1);
});

test("renders Life Current from full source data independently of Memory filters", () => {
  const fullMemories = [
    { ...memories[0], title: "Mountain trip" },
    { ...memories[1], title: "Quiet evening", date: "2026-08-19" },
  ];
  render(
    <HomePage
      {...baseProps}
      memories={fullMemories}
      trophyEntries={[]}
      nutritionEntries={[{ id: "meal", loggedAt: "2026-06-01T12:00:00" }]}
      workoutEntries={[{ id: "workout", occurredAt: "2026-07-01T12:00:00", exercises: [] }]}
      medicationEntries={[{ id: "dose", occurredAt: "2026-08-01T12:00:00" }]}
    />
  );
  const current = screen.getByTestId("life-current");
  const pathBeforeFilter = current.querySelector("path").getAttribute("d");
  const canvas = screen.getByTestId("timeline-content-canvas");
  expect(canvas).toHaveAttribute("data-full-memory-count", "2");

  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "Mountain" },
  });

  expect(screen.getByText("Mountain trip")).toBeInTheDocument();
  expect(screen.queryByText("Quiet evening")).not.toBeInTheDocument();
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d"))
    .not.toBe(pathBeforeFilter);
  expect(screen.getByTestId("timeline-content-canvas")).toBe(canvas);
  expect(canvas).toHaveAttribute("data-full-memory-count", "2");
  expect(canvas).toHaveAttribute("data-visible-memory-count", "1");
  expect(canvas).toHaveAttribute("data-filtered", "true");
  expect(canvas.querySelectorAll("[data-testid^='timeline-memory-']"))
    .toHaveLength(1);
  expect(canvas.querySelector("[data-timeline-memory-placeholder]"))
    .not.toBeInTheDocument();
  expect(screen.getByTestId("filtered-life-current-context"))
    .toHaveStyle({ position: "sticky", width: "100%" });
  expect(screen.getByTestId("filtered-life-current-context"))
    .toHaveAttribute("data-authoritative-points", "5");
  expect(Number(screen.getByTestId("filtered-life-current-context")
    .getAttribute("data-window-points"))).toBeGreaterThan(1);
});

test("unfiltered Timeline reserves card-centering space without inventing a trailing river", () => {
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const canvas = screen.getByTestId("timeline-content-canvas");
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(canvas).toHaveStyle({ paddingRight: `${Math.max(32, Math.ceil(window.innerWidth / 2 - 120)) + 160}px` });
  expect(canvas).toHaveAttribute("data-quiet-trail-extent", "160");

  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "First" },
  });
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(canvas).toHaveStyle({ paddingRight: "32px" });
  expect(canvas).toHaveAttribute("data-quiet-trail-extent", "0");
});

test("keeps the controlled search input immediate and clearing restores all Memories", () => {
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const input = screen.getByPlaceholderText("Search memories...");

  fireEvent.change(input, { target: { value: "First" } });
  expect(input).toHaveValue("First");
  expect(screen.getByTestId("timeline-memory-memory-a")).toBeInTheDocument();
  expect(screen.queryByTestId("timeline-memory-memory-b")).not.toBeInTheDocument();

  fireEvent.change(input, { target: { value: "" } });
  expect(input).toHaveValue("");
  expect(screen.getByTestId("timeline-memory-memory-a")).toBeInTheDocument();
  expect(screen.getByTestId("timeline-memory-memory-b")).toBeInTheDocument();
  expect(screen.getByTestId("timeline-content-canvas"))
    .toHaveAttribute("data-filtered", "false");
  expect(screen.queryByTestId("filtered-life-current-context"))
    .not.toBeInTheDocument();
});

test.each([
  ["June", ["june", "prior"]],
  ["jun", ["june", "prior"]],
  ["2026", ["june", "may"]],
  ["June 2026", ["june"]],
  ["June 12", ["june", "prior"]],
  ["June 12, 2026", ["june"]],
  ["6/12/2026", ["june"]],
  ["06/12/2026", ["june"]],
])("date-aware Timeline search %s returns authoritative date matches", (query, ids) => {
  const datedMemories = [
    { ...memories[0], id: "june", title: "Neutral Alpha", description: "No date text", date: "2026-06-12" },
    { ...memories[1], id: "may", title: "Neutral Beta", description: "No calendar text", date: "2026-05-03" },
    { ...memories[1], id: "prior", title: "Neutral Gamma", description: "No year text", date: "2025-06-12" },
  ];
  render(<HomePage {...baseProps} memories={datedMemories} trophyEntries={[]} />);
  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: query },
  });

  ids.forEach((id) => expect(screen.getByTestId("timeline-memory-" + id)).toBeInTheDocument());
  expect(screen.getByTestId("timeline-content-canvas"))
    .toHaveAttribute("data-visible-memory-count", String(ids.length));
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
});

test("date-aware search remains case-insensitive and searches categories", () => {
  const dated = { ...memories[0], id: "dated", title: "Neutral", description: "Plain", date: "2026-06-12", categories: ["Milestone"] };
  render(<HomePage {...baseProps} memories={[dated]} trophyEntries={[]} />);
  const input = screen.getByPlaceholderText("Search memories...");
  fireEvent.change(input, { target: { value: "jUnE" } });
  expect(screen.getByTestId("timeline-memory-dated")).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "milestone" } });
  expect(screen.getByTestId("timeline-memory-dated")).toBeInTheDocument();
});

test("retains the existing Timeline fallback line when full activity has no dated bucket", () => {
  const undated = { ...memories[0], date: "" };
  const { container } = render(<HomePage {...baseProps} memories={[undated]} trophyEntries={[]} />);
  expect(screen.queryByTestId("life-current")).not.toBeInTheDocument();
  expect(container.querySelector('div[aria-hidden="true"]')).toBeInTheDocument();
});

test("renders compact Timeline previews while keeping full content in Memory Detail", () => {
  const memory = {
    id: "compact",
    title: "Compact preview",
    description: "This complete description belongs in the detail view.",
    date: "2026-05-18",
    categories: ["Travel", "Friends", "Milestone"],
    images: [
      { id: "one", url: "blob:one" },
      { id: "two", url: "blob:two" },
    ],
    favorite: true,
  };
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  const card = screen.getByTestId("timeline-memory-compact");
  const visual = card.querySelector("[data-timeline-card-visual]");
  expect(card).toHaveStyle({
    contain: "layout paint style",
    width: "240px",
  });
  expect(card).toHaveAttribute("data-containment-width", "240");
  expect(card).toHaveAttribute("data-containment-gutter", "28");
  expect(card.style.marginLeft).toBe("-28px");
  expect(card.style.marginRight).toBe("-28px");
  expect(visual).toHaveStyle({ margin: "0 auto", width: "184px" });
  expect(within(card).queryByText(memory.description)).not.toBeVisible();
  expect(card.querySelectorAll("[data-timeline-gallery-thumbnail]")).toHaveLength(2);
  expect(within(card).getByText("+1")).toBeInTheDocument();

  fireEvent.click(card);
  const detail = screen.getByRole("dialog", { name: "Memory details for Compact preview" });
  expect(detail).toHaveTextContent(memory.description);
  expect(within(detail).getAllByAltText(/Memory/)).toHaveLength(3);
});

test("mobile focused cards can grow without paint-containment clipping", () => {
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const card = screen.getByTestId("timeline-memory-memory-a");
  const visual = card.querySelector("[data-timeline-card-visual]");
  viewport.style.width = "390px";

  expect(TIMELINE_FOCUS_TUNING.baseCardWidth *
    TIMELINE_FOCUS_TUNING.maximumScale).toBeLessThan(390);
  expect(240 - 28 - 28).toBe(TIMELINE_FOCUS_TUNING.baseCardWidth);
  expect(card).toHaveAttribute("data-containment-width", "240");
  expect(visual).toHaveStyle({ transformOrigin: "center top" });
  expect(within(card).getByText("Same Day")).toBeInTheDocument();
  expect(within(card).getByText(/May/)).toBeInTheDocument();
});

test("initial newest navigation centers the final Memory before the quiet trail", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(
    <HomePage {...baseProps} memories={memories} trophyEntries={[]} />
  );
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const finalCard = screen.getByTestId("timeline-memory-memory-b");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 390 }));
  finalCard.getBoundingClientRect = jest.fn(() => ({ left: 300, width: 240 }));

  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(finalCard.getBoundingClientRect).toHaveBeenCalled();
  expect(viewport.scrollLeft).toBe(225);
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test.each([
  ["river", "river-current"],
  ["haunted-forest", "forest-path"],
])("%s keeps Timeline Focus cards and navigation behavior intact", (themeId, renderer) => {
  render(
    <HomePage
      {...baseProps}
      lifeCurrentThemeId={themeId}
      memories={memories}
      trophyEntries={[]}
    />
  );

  const viewport = screen.getByTestId("memory-timeline-viewport");
  expect(viewport).toHaveAttribute("data-life-current-theme", themeId);
  expect(screen.getByTestId("life-current").querySelector(`[data-life-current-renderer="${renderer}"]`))
    .toBeInTheDocument();
  expect(screen.getByTestId("timeline-memory-memory-a").querySelector("[data-timeline-card-visual]"))
    .toHaveStyle({ transformOrigin: "center top" });
  fireEvent.click(screen.getByRole("button", { name: "Past" }));
  expect(screen.getByRole("button", { name: "Past" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByTestId("timeline-memory-memory-a"));
  expect(screen.getByRole("dialog", { name: "Memory details for Same Day" })).toBeInTheDocument();
});

test("Past positions the oldest Memory at the start and centers it when possible", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const { unmount } = render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const firstCard = screen.getByTestId("timeline-memory-memory-a");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 390 }));
  firstCard.getBoundingClientRect = jest.fn(() => ({ left: 20, width: 240 }));
  act(() => { while (frames.length) frames.shift()(); });
  fireEvent.click(screen.getByRole("button", { name: "Past" }));
  act(() => { while (frames.length) frames.shift()(); });
  expect(firstCard.getBoundingClientRect).toHaveBeenCalled();
  expect(viewport.scrollLeft).toBe(0);
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("reserves responsive edge space so desktop Past and Present cards can center", () => {
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const canvas = screen.getByTestId("timeline-content-canvas");
  const edgeGutter = Math.max(32, Math.ceil(window.innerWidth / 2 - 120));
  expect(canvas.style.paddingLeft).toBe(`${edgeGutter}px`);
  expect(canvas.style.paddingRight).toBe(`${edgeGutter + 160}px`);
});

test("updates visual focus from viewport-center geometry without changing selection", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const focusMemories = [
    { ...memories[0], id: "left", title: "Left" },
    { ...memories[0], id: "center", title: "Center" },
    { ...memories[0], id: "right", title: "Right" },
  ];
  const { unmount } = render(
    <HomePage {...baseProps} memories={focusMemories} trophyEntries={[]} />
  );
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const left = screen.getByTestId("timeline-memory-left");
  const center = screen.getByTestId("timeline-memory-center");
  const right = screen.getByTestId("timeline-memory-right");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  viewport.scrollBy = jest.fn();
  left.getBoundingClientRect = jest.fn(() => ({ left: 10, width: 100 }));
  center.getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  right.getBoundingClientRect = jest.fn(() => ({ left: 290, width: 100 }));

  act(() => {
    while (frames.length) frames.shift()();
  });
  const scale = (card) =>
    Number(card.querySelector("[data-timeline-card-visual]")
      .style.getPropertyValue("--timeline-focus-scale"));
  expect(scale(center)).toBe(TIMELINE_FOCUS_TUNING.maximumScale);
  expect(scale(left)).toBeLessThan(scale(center));
  expect(scale(left)).toBeCloseTo(scale(right), 3);
  expect(center).toHaveAttribute("data-timeline-focused", "true");
  expect(left).not.toHaveAttribute("data-timeline-focused");
  expect(right).not.toHaveAttribute("data-timeline-focused");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  const centerRemoveAttribute = jest.spyOn(center, "removeAttribute");
  const rightSetAttribute = jest.spyOn(right, "setAttribute");
  const callsBeforeScroll = window.requestAnimationFrame.mock.calls.length;
  fireEvent.scroll(viewport);
  fireEvent.scroll(viewport);
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(callsBeforeScroll + 1);
  act(() => frames.shift()());
  expect(centerRemoveAttribute).not.toHaveBeenCalledWith("data-timeline-focused");
  expect(rightSetAttribute).not.toHaveBeenCalledWith("data-timeline-focused", "true");
  expect(center).toHaveAttribute("data-timeline-focused", "true");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  center.getBoundingClientRect = jest.fn(() => ({ left: 290, width: 100 }));
  right.getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  fireEvent.scroll(viewport);
  act(() => frames.shift()());
  expect(centerRemoveAttribute).toHaveBeenCalledWith("data-timeline-focused");
  expect(rightSetAttribute).toHaveBeenCalledWith("data-timeline-focused", "true");
  expect(right).toHaveAttribute("data-timeline-focused", "true");
  expect(center).not.toHaveAttribute("data-timeline-focused");

  fireEvent.click(left);
  expect(screen.getByRole("dialog", { name: "Memory details for Left" })).toBeInTheDocument();
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("limits focus geometry reads to cards near the Timeline viewport", () => {
  const originalObserver = global.IntersectionObserver;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  let observerCallback;
  global.IntersectionObserver = jest.fn(function (callback) {
    observerCallback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
  });
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const manyMemories = Array.from({ length: 100 }, (_, index) => ({
    ...memories[0],
    id: "scale-" + index,
    title: "Scale " + index,
  }));
  const { unmount } = render(
    <HomePage {...baseProps} memories={manyMemories} trophyEntries={[]} />
  );
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const near = screen.getByTestId("timeline-memory-scale-50");
  const secondNear = screen.getByTestId("timeline-memory-scale-51");
  const far = screen.getByTestId("timeline-memory-scale-0");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  near.getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  secondNear.getBoundingClientRect = jest.fn(() => ({ left: 260, width: 100 }));
  far.getBoundingClientRect = jest.fn(() => ({ left: -5000, width: 100 }));

  act(() => observerCallback([
    { isIntersecting: true, target: near },
    { isIntersecting: true, target: secondNear },
  ]));
  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(near.getBoundingClientRect).toHaveBeenCalled();
  expect(secondNear.getBoundingClientRect).toHaveBeenCalled();
  expect(far.getBoundingClientRect).not.toHaveBeenCalled();
  expect(global.IntersectionObserver).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({ root: viewport, rootMargin: "0px 480px" })
  );
  unmount();
  global.IntersectionObserver = originalObserver;
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("a plain year search positions the earliest matching Memory after filtering", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const datedMemories = [
    { ...memories[0], id: "december", title: "December 2000", date: "2000-12-20" },
    { ...memories[0], id: "january", title: "January 2000", date: "2000-01-05" },
    { ...memories[0], id: "other", title: "Other year", date: "2001-01-01" },
  ];
  const { unmount } = render(
    <HomePage {...baseProps} memories={datedMemories} trophyEntries={[]} />
  );
  act(() => {
    while (frames.length) frames.shift()();
  });
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 0;
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  const january = screen.getByTestId("timeline-memory-january");
  january.getBoundingClientRect = jest.fn(() => ({ left: 300, width: 100 }));

  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "2000" },
  });
  act(() => {
    while (frames.length) frames.shift()();
  });

  expect(screen.getByTestId("timeline-memory-january")).toBeInTheDocument();
  expect(screen.getByTestId("timeline-memory-december")).toBeInTheDocument();
  expect(viewport.scrollLeft).toBe(150);
  expect(screen.getByTestId("filtered-life-current-context"))
    .toHaveAttribute("data-window-start", "2000-01-05");
  expect(screen.getByTestId("filtered-life-current-context"))
    .toHaveAttribute("data-window-end", "2000-05-04");
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("filtered browsing moves the authoritative Current camera with the centered dated Memory", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const yearMemories = [
    { ...memories[0], id: "early", title: "Early 1999", date: "1999-01-15" },
    { ...memories[0], id: "middle", title: "Middle 1999", date: "1999-06-15" },
    { ...memories[0], id: "late", title: "Late 1999", date: "1999-12-15" },
  ];
  const { unmount } = render(
    <HomePage
      {...baseProps}
      memories={yearMemories}
      trophyEntries={[]}
      nutritionEntries={[
        { id: "early-meal-a", loggedAt: "1999-01-20T12:00:00" },
        { id: "early-meal-b", loggedAt: "1999-02-10T12:00:00" },
        { id: "late-meal-a", loggedAt: "1999-09-01T12:00:00" },
        { id: "late-meal-b", loggedAt: "1999-11-10T12:00:00" },
      ]}
    />
  );
  act(() => { while (frames.length) frames.shift()(); });
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "1999" },
  });
  const early = screen.getByTestId("timeline-memory-early");
  const middle = screen.getByTestId("timeline-memory-middle");
  const late = screen.getByTestId("timeline-memory-late");
  early.getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  middle.getBoundingClientRect = jest.fn(() => ({ left: 500, width: 100 }));
  late.getBoundingClientRect = jest.fn(() => ({ left: 850, width: 100 }));
  act(() => { while (frames.length) frames.shift()(); });
  const context = screen.getByTestId("filtered-life-current-context");
  const earlyStart = context.getAttribute("data-window-start");
  const earlyPath = screen.getByTestId("life-current").querySelector("path").getAttribute("d");

  early.getBoundingClientRect = jest.fn(() => ({ left: -550, width: 100 }));
  middle.getBoundingClientRect = jest.fn(() => ({ left: -200, width: 100 }));
  late.getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  fireEvent.scroll(viewport);
  act(() => { while (frames.length) frames.shift()(); });

  expect(context.getAttribute("data-window-start")).not.toBe(earlyStart);
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d"))
    .not.toBe(earlyPath);
  expect(context).toHaveAttribute("data-authoritative-points", "7");
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("clearing temporary filters restores the original semantic Timeline position", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const originMemories = [
    { ...memories[0], id: "old", title: "Old 1999", date: "1999-01-01" },
    { ...memories[0], id: "origin", title: "Origin 2014", date: "2014-06-01" },
    { ...memories[0], id: "new", title: "New 2026", date: "2026-01-01" },
  ];
  const { unmount } = render(
    <HomePage {...baseProps} memories={originMemories} trophyEntries={[]} />
  );
  act(() => { while (frames.length) frames.shift()(); });
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 700;
  viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 400 }));
  screen.getByTestId("timeline-memory-old").getBoundingClientRect = jest.fn(() => ({ left: -500, width: 100 }));
  screen.getByTestId("timeline-memory-origin").getBoundingClientRect = jest.fn(() => ({ left: 150, width: 100 }));
  screen.getByTestId("timeline-memory-new").getBoundingClientRect = jest.fn(() => ({ left: 600, width: 100 }));

  const input = screen.getByPlaceholderText("Search memories...");
  fireEvent.change(input, { target: { value: "1999" } });
  fireEvent.change(input, { target: { value: "2026" } });
  fireEvent.change(input, { target: { value: "" } });
  const restoredOrigin = screen.getByTestId("timeline-memory-origin");
  restoredOrigin.getBoundingClientRect = jest.fn(() => ({ left: 350, width: 100 }));
  act(() => { while (frames.length) frames.shift()(); });

  expect(restoredOrigin.getBoundingClientRect).toHaveBeenCalled();
  expect(viewport.scrollLeft).toBe(500);
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("ordinary text search does not invoke year-specific Timeline positioning", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const callbacks = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const { unmount } = render(
    <HomePage {...baseProps} memories={memories} trophyEntries={[]} />
  );
  act(() => {
    while (callbacks.length) callbacks.shift()();
  });
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 73;
  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "First" },
  });
  act(() => {
    while (callbacks.length) callbacks.shift()();
  });
  expect(viewport.scrollLeft).toBe(73);
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("closing Memory Detail restores the originating horizontal Timeline position", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = jest.fn((callback) => {
    callback();
    return 1;
  });
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 412;
  fireEvent.click(screen.getByTestId("timeline-memory-memory-a"));
  viewport.scrollLeft = 0;
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {
    name: "Close memory details",
  }));
  expect(viewport.scrollLeft).toBe(412);
  window.requestAnimationFrame = originalRequestAnimationFrame;
});

test("mobile restores the exact Timeline viewport position after nested photo viewing", () => {
  const originalInnerWidth = window.innerWidth;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const callbacks = [];
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  window.requestAnimationFrame = jest.fn((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const memory = memoryWithOnePhoto();
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  act(() => {
    while (callbacks.length) callbacks.shift()();
  });
  const viewport = screen.getByTestId("memory-timeline-viewport");
  viewport.scrollLeft = 287;
  viewport.scrollTop = 19;

  fireEvent.click(screen.getByTestId("timeline-memory-" + memory.id));
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
  const detail = screen.getByRole("dialog", { name: "Memory details for Scrollable memory" });
  fireEvent.click(within(detail).getAllByAltText("Memory 1")[0]);
  fireEvent.click(screen.getByRole("dialog", { name: "Memory photo viewer" }));
  expect(viewport.scrollLeft).toBe(0);

  fireEvent.click(screen.getByRole("button", { name: "Close memory details" }));
  expect(viewport.scrollLeft).toBe(0);
  act(() => {
    while (callbacks.length) callbacks.shift()();
  });
  expect(viewport.scrollLeft).toBe(287);
  expect(viewport.scrollTop).toBe(19);

  window.requestAnimationFrame = originalRequestAnimationFrame;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: originalInnerWidth });
});

function memoryWithPhotos(count) {
  return {
    ...memories[0],
    id: "gallery-" + count,
    title: "Gallery " + count,
    images: Array.from({ length: count }, (_, index) => ({
      id: "photo-" + index,
      url: "blob:photo-" + index,
    })),
  };
}

test.each([
  [1, 1, null],
  [2, 2, null],
  [3, 3, null],
  [4, 3, "+1"],
  [8, 3, "+5"],
  [50, 3, "+47"],
])(
  "renders a bounded adaptive gallery for %i photos",
  (count, thumbnailCount, overflowText) => {
    const memory = memoryWithPhotos(count);
    render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
    const card = screen.getByTestId("timeline-memory-" + memory.id);
    expect(card.querySelectorAll("[data-timeline-gallery-thumbnail]"))
      .toHaveLength(thumbnailCount);
    if (overflowText) {
      expect(within(card).getByTestId("timeline-photo-overflow"))
        .toHaveTextContent(overflowText);
    } else {
      expect(within(card).queryByTestId("timeline-photo-overflow"))
        .not.toBeInTheDocument();
    }
  }
);

test("large galleries render only preview metadata and thumbnails are not separate controls", () => {
  const memory = memoryWithPhotos(137);
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} />);
  const card = screen.getByTestId("timeline-memory-" + memory.id);
  const thumbnails = card.querySelectorAll("[data-timeline-gallery-thumbnail]");
  expect(thumbnails).toHaveLength(3);
  expect(within(card).getByTestId("timeline-photo-overflow")).toHaveTextContent("+134");
  expect(within(card).queryAllByRole("button")).toHaveLength(1);

  fireEvent.click(thumbnails[0]);
  const detail = screen.getByRole("dialog", {
    name: "Memory details for Gallery 137",
  });
  expect(within(detail).getAllByRole("button", { name: /Show photo/ }))
    .toHaveLength(137);
});

test("cancels a pending Timeline focus frame when Home unmounts", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  window.requestAnimationFrame = jest.fn(() => 77);
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(
    <HomePage {...baseProps} memories={[memories[0]]} trophyEntries={[]} />
  );
  unmount();
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(77);
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Trophy source navigation opens the existing live Memory detail and returns", () => {
  const back = jest.fn();
  const memory = { id: "memory-live", title: "Edited title", description: "Current details", date: "2026-05-18", categories: ["Achievement"], images: [{ id: "photo", url: "blob:photo" }], favorite: true };
  render(<HomePage {...baseProps} memories={[memory]} trophyEntries={[]} trophySourceTarget={{ memoryId: memory.id }} onReturnToTrophyCase={back} />);
  const dialog = screen.getByRole("dialog", { name: "Memory details for Edited title" });
  expect(dialog).toHaveTextContent("Current details");
  expect(dialog).toHaveTextContent("Achievement");
  expect(within(dialog).getAllByAltText("Memory 1")[0]).toHaveAttribute("src", "blob:photo");
  expect(within(dialog).getAllByRole("button", { name: "Back to Trophy Case" })).toHaveLength(1);
  expect(within(dialog).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Back to Trophy Case" }));
  expect(back).toHaveBeenCalledTimes(1);
});

test("offers stable, distinct Memory trophy candidates", () => {
  render(<HomePage {...baseProps} memories={memories} trophyEntries={[]} />);
  fireEvent.click(screen.getByTestId("timeline-memory-memory-a"));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add to Trophy Case" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close memory details" }));
  fireEvent.click(screen.getByTestId("timeline-memory-memory-b"));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add to Trophy Case" }));
  expect(baseProps.addTrophyCaseEntry.mock.calls.map(([candidate]) => candidate.sourceKey)).toEqual([
    "memory|memory-a", "memory|memory-b",
  ]);
});

test("shows an accessible non-duplicating state for a curated Memory", () => {
  render(<HomePage {...baseProps} memories={[memories[0]]} trophyEntries={[{ sourceKey: "memory|memory-a" }]} />);
  expect(screen.getByLabelText("In Trophy Case")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("timeline-memory-memory-a"));
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "In Trophy Case" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Add to Trophy Case" })).not.toBeInTheDocument();
});

test("offers and dismisses a high-confidence suggestion without removing manual add", () => {
  const dismiss = jest.fn();
  render(
    <HomePage
      {...baseProps}
      memories={[memories[0]]}
      trophyEntries={[]}
      memoryAchievementSuggestion={{ memory: memories[0], detection: { confidence: "high" } }}
      dismissMemoryAchievementSuggestion={dismiss}
    />
  );
  const suggestion = screen.getByRole("region", { name: "Memory achievement suggestion" });
  expect(suggestion).toHaveAttribute("aria-live", "polite");
  fireEvent.click(screen.getByRole("button", { name: "Not this time" }));
  expect(dismiss).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTestId("timeline-memory-memory-a"));
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Add to Trophy Case" }))
    .toBeInTheDocument();
});

test("accepting a suggestion uses the same Memory trophy candidate pathway", () => {
  const dismiss = jest.fn();
  baseProps.addTrophyCaseEntry.mockReturnValue({ id: "curated" });
  render(
    <HomePage
      {...baseProps}
      memories={[memories[0]]}
      trophyEntries={[]}
      memoryAchievementSuggestion={{ memory: memories[0], detection: { confidence: "high" } }}
      dismissMemoryAchievementSuggestion={dismiss}
    />
  );
  const suggestion = screen.getByRole("region", { name: "Memory achievement suggestion" });
  fireEvent.click(within(suggestion).getByRole("button", { name: "Add to Trophy Case" }));
  expect(baseProps.addTrophyCaseEntry).toHaveBeenCalledWith(expect.objectContaining({
    sourceType: "memory",
    sourceKey: "memory|memory-a",
  }));
  expect(dismiss).toHaveBeenCalledTimes(1);
});
