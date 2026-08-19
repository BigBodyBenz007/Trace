import { fireEvent, render, screen, within } from "@testing-library/react";
import TrophyCase, { getTrophyVariant, TrophyCabinet } from "./TrophyCase";

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

test("source actions are opt-in so the inline Trophy Case remains unchanged", () => {
  render(<TrophyCase trophyEntries={[trophy()]} />);
  expect(screen.queryByRole("button", { name: "View Workout" })).not.toBeInTheDocument();
});

test("dedicated source controls navigate when available and preserve unavailable trophies", () => {
  const view = jest.fn();
  render(<TrophyCase trophyEntries={[trophy()]} onViewSource={view} sourceAvailable={() => true} />);
  fireEvent.click(screen.getByRole("button", { name: "View Workout" }));
  expect(view).toHaveBeenCalledWith(expect.objectContaining({ id: "trophy-1" }));
  expect(screen.getByRole("button", { name: "Remove from Trophy Case" })).toBeEnabled();
});

test("restores the exact originating Trophy card after it renders", () => {
  const original = Element.prototype.scrollIntoView;
  const originalFrame = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  Element.prototype.scrollIntoView = jest.fn();
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  const complete = jest.fn();
  render(<TrophyCase trophyEntries={[trophy({ id: "first", title: "First" }), trophy({ id: "target", title: "Target", addedToTrophyCaseAt: "2026-08-12T12:00:00Z" })]} restoreTrophyId="target" onRestoreComplete={complete} />);
  const target = screen.getByRole("group", { name: "Target trophy" });
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  expect(complete).toHaveBeenCalledWith("target");
  Element.prototype.scrollIntoView = original;
  window.requestAnimationFrame = originalFrame;
  window.cancelAnimationFrame = originalCancel;
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

test("displays Memory and Workout trophies together in added order", () => {
  const memoryTrophy = trophy({
    id: "memory-trophy",
    sourceType: "memory",
    sourceKey: "memory|graduation",
    sourceId: "graduation",
    sourceRecordType: null,
    title: "Graduation Day",
    description: "Finally finished my degree.",
    achievedAt: "2026-05-18T12:00:00.000Z",
    addedToTrophyCaseAt: "2026-08-12T12:00:00.000Z",
    sourceSnapshot: { title: "Graduation Day", description: "Finally finished my degree.", date: "2026-05-18" },
  });
  render(<TrophyCase trophyEntries={[trophy(), memoryTrophy]} />);
  const cards = screen.getAllByRole("group", { name: /trophy$/ });
  expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
    "Graduation Day trophy", "Dumbbell Bench Press trophy",
  ]);
  expect(cards[0]).toHaveTextContent("Finally finished my degree.");
  expect(cards[1]).toHaveTextContent("80 lb × 8 reps");
});

test("maps achievement sources and record types to deterministic award variants", () => {
  expect(getTrophyVariant(trophy({ sourceRecordType: "heaviest-weight" }))).toBe("championship-cup");
  expect(getTrophyVariant(trophy({ sourceRecordType: "reps-at-weight" }))).toBe("handled-cup");
  expect(getTrophyVariant(trophy({ sourceRecordType: "bodyweight-reps" }))).toBe("medal");
  const life = trophy({ id: "life", sourceType: "memory", sourceKey: "memory|stable", sourceRecordType: null });
  expect(getTrophyVariant(life)).toBe(getTrophyVariant({ ...life }));
  expect(["laurel-star", "crystal", "plaque", "medal"]).toContain(getTrophyVariant(life));
});

test("renders a concise Workout detail without repeating its PR type or record summary", () => {
  render(<TrophyCabinet trophyEntries={[trophy()]} />);
  const trigger = screen.getByRole("button", { name: "Open workout achievement: Dumbbell Bench Press, heaviest weight" });
  expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(trigger).not.toHaveTextContent("\u{1F3C6}");
  fireEvent.click(trigger);
  const detail = screen.getByTestId("trophy-detail");
  expect(detail).toHaveTextContent("Dumbbell Bench Press");
  expect(within(detail).getAllByText("Heaviest Weight", { exact: true })).toHaveLength(1);
  expect(within(detail).getAllByText("80 lb \u00d7 8 reps", { exact: true })).toHaveLength(1);
  expect(detail).toHaveTextContent("August 10, 2026");
  expect(detail).toHaveTextContent("Chest Day");
  expect([...detail.querySelectorAll("dt")].map((term) => term.textContent)).toEqual(["Record", "Achieved", "Workout"]);
  expect(detail).not.toHaveTextContent("Heaviest Weight \u00b7 80 lb \u00d7 8 reps");
});

test("renders a concise Life detail with its full description exactly once", () => {
  const description = "A meaningful launch that belongs in the family story.";
  const life = trophy({
    id: "life-trophy",
    sourceType: "memory",
    sourceKey: "memory|launch",
    sourceRecordType: null,
    title: "Logo in effect",
    description,
    sourceSnapshot: { description },
  });
  render(<TrophyCabinet trophyEntries={[life]} onViewSource={jest.fn()} sourceAvailable={() => true} />);
  fireEvent.click(screen.getByRole("button", { name: "Open achievement: Logo in effect" }));
  const detail = screen.getByTestId("trophy-detail");
  expect(within(detail).getAllByText("Life Achievement", { exact: true })).toHaveLength(1);
  expect(within(detail).getAllByText(description, { exact: true })).toHaveLength(1);
  expect(detail.querySelectorAll("dt")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "View Memory" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Remove from Trophy Case" })).toBeEnabled();
});

test("closing selected-award details restores focus to the exact trophy", () => {
  const originalFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  render(<TrophyCabinet trophyEntries={[trophy()]} />);
  const trigger = screen.getByRole("button", { name: /Open workout achievement/ });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByTestId("trophy-detail")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Close achievement details" }));
  expect(trigger).toHaveFocus();
  window.requestAnimationFrame = originalFrame;
});

test("cabinet exposes responsive shelf contracts and keeps empty growth positions decorative", () => {
  render(<TrophyCabinet trophyEntries={[trophy()]} />);
  expect(screen.getByTestId("trophy-cabinet")).toHaveClass("trace-trophy-cabinet");
  expect(screen.getByTestId("life-achievements-heading-shelves")).toHaveClass("trace-trophy-shelves");
  const emptyPositions = screen.getByTestId("workout-achievements-heading-shelves").querySelectorAll(".trace-trophy-position--empty");
  expect(emptyPositions.length).toBeGreaterThan(0);
  expect([...emptyPositions].every((position) => position.getAttribute("aria-hidden") === "true")).toBe(true);
});

test("cabinet restores source navigation to the exact interactive trophy", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const originalFrame = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  Element.prototype.scrollIntoView = jest.fn();
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  const complete = jest.fn();
  render(<TrophyCabinet trophyEntries={[trophy()]} restoreTrophyId="trophy-1" onRestoreComplete={complete} />);
  const trigger = screen.getByRole("button", { name: /Open workout achievement/ });
  expect(trigger.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  expect(trigger).toHaveFocus();
  expect(complete).toHaveBeenCalledWith("trophy-1");
  Element.prototype.scrollIntoView = originalScrollIntoView;
  window.requestAnimationFrame = originalFrame;
  window.cancelAnimationFrame = originalCancel;
});
