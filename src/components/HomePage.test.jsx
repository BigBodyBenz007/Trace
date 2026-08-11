import { fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "./HomePage";

const baseProps = {
  memoryCount: 2,
  toggleFavorite: jest.fn(),
  onAddMemory: jest.fn(),
  onOpenNutrition: jest.fn(),
  onOpenMedications: jest.fn(),
  onOpenWorkouts: jest.fn(),
  deleteMemory: jest.fn(),
  editMemory: jest.fn(),
  addTrophyCaseEntry: jest.fn(),
  buttonStyle: {},
  inputStyle: {},
  containerStyle: {},
};

const memories = [
  { id: "memory-a", title: "Same Day", description: "First", date: "2026-05-18", categories: [], images: [], favorite: false },
  { id: "memory-b", title: "Same Day", description: "Second", date: "2026-05-19", categories: [], images: [], favorite: false },
];

beforeEach(() => jest.clearAllMocks());

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
