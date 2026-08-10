import { fireEvent, render, screen } from "@testing-library/react";
import TrophyCase from "./TrophyCase";

function trophy(overrides = {}) {
  return {
    id: "trophy-1",
    sourceType: "workout-pr",
    sourceKey: "workout-pr|trace|heavy|workout|set",
    sourceId: "workout-1",
    sourceRecordType: "heaviest-weight",
    title: "Dumbbell Bench Press",
    description: "Heaviest Weight · 80 lb × 8 reps",
    achievedAt: "2026-08-10T12:00:00.000Z",
    addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
    sourceSnapshot: { recordLabel: "Heaviest Weight", recordValue: "80 lb × 8 reps", workoutTitle: "Chest Day" },
    metadata: {},
    ...overrides,
  };
}

test("starts empty unless the user has curated an entry", () => {
  render(<TrophyCase trophyEntries={[]} />);
  expect(screen.getByText("No trophies yet. Achievements you choose to celebrate will appear here.")).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: /trophy$/ })).not.toBeInTheDocument();
});

test("displays the preserved source snapshot and removes only curated membership", () => {
  const remove = jest.fn();
  render(<TrophyCase trophyEntries={[trophy()]} removeTrophyCaseEntry={remove} buttonStyle={{}} />);
  const card = screen.getByRole("group", { name: "Dumbbell Bench Press trophy" });
  expect(card).toHaveTextContent("80 lb × 8 reps");
  expect(card).toHaveTextContent("August 10, 2026 · Chest Day");
  fireEvent.click(screen.getByRole("button", { name: "Remove from Trophy Case" }));
  expect(remove).toHaveBeenCalledWith("trophy-1");
});

test("orders newest additions first with deterministic id ties", () => {
  render(<TrophyCase trophyEntries={[
    trophy({ id: "z", title: "Old", addedToTrophyCaseAt: "2026-08-01T12:00:00.000Z" }),
    trophy({ id: "b", title: "Tie B" }),
    trophy({ id: "a", title: "Tie A" }),
  ]} />);
  expect(screen.getAllByRole("group", { name: /trophy$/ }).map((card) => card.getAttribute("aria-label"))).toEqual([
    "Tie A trophy", "Tie B trophy", "Old trophy",
  ]);
});

test("keeps curated cards stacked and width-contained", () => {
  render(<TrophyCase trophyEntries={[trophy()]} />);
  expect(screen.getByTestId("trophy-card-list")).toHaveStyle({ display: "grid", width: "100%", minWidth: 0 });
  expect(screen.getByRole("group", { name: /trophy$/ })).toHaveStyle({ boxSizing: "border-box", minWidth: 0, overflow: "hidden", width: "100%" });
});
