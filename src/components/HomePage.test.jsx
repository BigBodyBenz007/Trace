import { fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "./HomePage";

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
  const addButtons = screen.getAllByRole("button", { name: "Add to Trophy Case" });
  expect(addButtons).toHaveLength(2);
  fireEvent.click(addButtons[0]);
  fireEvent.click(addButtons[1]);
  expect(baseProps.addTrophyCaseEntry.mock.calls.map(([candidate]) => candidate.sourceKey)).toEqual([
    "memory|memory-a", "memory|memory-b",
  ]);
});

test("shows an accessible non-duplicating state for a curated Memory", () => {
  render(<HomePage {...baseProps} memories={[memories[0]]} trophyEntries={[{ sourceKey: "memory|memory-a" }]} />);
  expect(screen.getByRole("button", { name: "In Trophy Case" })).toBeDisabled();
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
  expect(screen.getAllByRole("button", { name: "Add to Trophy Case" })).toHaveLength(2);
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
