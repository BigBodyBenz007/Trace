import { act, fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "./HomePage";
import { TIMELINE_FOCUS_TUNING } from "../services/timelineFocus";

const baseProps = {
  memoryCount: 2,
  toggleFavorite: jest.fn(),
  onAddMemory: jest.fn(),
  onOpenNutrition: jest.fn(),
  onOpenMedications: jest.fn(),
  onOpenProtocols: jest.fn(),
  onOpenWorkouts: jest.fn(),
  onOpenTrophyCase: jest.fn(),
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
      "Health & Nutrition",
      "Workouts",
      "Medications & Supplements",
      "Protocols",
      "Open Trophy Case",
    ].includes(name));
  expect(names).toEqual([
    "Add Memory",
    "Health & Nutrition",
    "Workouts",
    "Medications & Supplements",
    "Protocols",
    "Open Trophy Case",
  ]);
});

const memories = [
  { id: "memory-a", title: "Same Day", description: "First", date: "2026-05-18", categories: [], images: [], favorite: false },
  { id: "memory-b", title: "Same Day", description: "Second", date: "2026-05-19", categories: [], images: [], favorite: false },
];

beforeEach(() => jest.clearAllMocks());

test("opens the dedicated Trophy Case from the Timeline", () => {
  render(<HomePage {...baseProps} memories={[]} trophyEntries={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Open Trophy Case" }));
  expect(baseProps.onOpenTrophyCase).toHaveBeenCalledTimes(1);
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

  fireEvent.change(screen.getByPlaceholderText("Search memories..."), {
    target: { value: "Mountain" },
  });

  expect(screen.getByText("Mountain trip")).toBeInTheDocument();
  expect(screen.queryByText("Quiet evening")).not.toBeInTheDocument();
  expect(screen.getByTestId("life-current").querySelector("path"))
    .toHaveAttribute("d", pathBeforeFilter);
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
  expect(card).toHaveStyle({ width: "184px" });
  expect(within(card).queryByText(memory.description)).not.toBeVisible();
  expect(card.querySelectorAll("[data-timeline-gallery-thumbnail]")).toHaveLength(2);
  expect(within(card).getByText("+1")).toBeInTheDocument();

  fireEvent.click(card);
  const detail = screen.getByRole("dialog", { name: "Memory details for Compact preview" });
  expect(detail).toHaveTextContent(memory.description);
  expect(within(detail).getAllByAltText(/Memory/)).toHaveLength(3);
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

  act(() => frames.shift()());
  const scale = (card) =>
    Number(card.querySelector("[data-timeline-card-visual]")
      .style.getPropertyValue("--timeline-focus-scale"));
  expect(scale(center)).toBe(TIMELINE_FOCUS_TUNING.maximumScale);
  expect(scale(left)).toBeLessThan(scale(center));
  expect(scale(left)).toBeCloseTo(scale(right), 3);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.scroll(viewport);
  fireEvent.scroll(viewport);
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  act(() => frames.shift()());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(left);
  expect(screen.getByRole("dialog", { name: "Memory details for Left" })).toBeInTheDocument();
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
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
