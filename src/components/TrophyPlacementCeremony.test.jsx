import { act, fireEvent, render, screen } from "@testing-library/react";
import { acquireDocumentScrollLock } from "../services/documentScrollLock";
import { getTrophyVariant } from "./TrophyCase";
import TrophyPlacementCeremony from "./TrophyPlacementCeremony";

const lifeEntry = {
  id: "life-trophy",
  sourceKey: "memory:first-novel",
  sourceType: "memory",
  title: "Finished My First Novel",
  description: "A personal milestone with a deliberately longer private description.",
  achievedAt: "2026-07-14T12:00:00.000Z",
  sourceSnapshot: { recordValue: "First complete draft" },
};

const workoutEntry = {
  id: "workout-trophy",
  sourceKey: "workout-pr:bench-press",
  sourceType: "workout-pr",
  sourceRecordType: "reps-at-weight",
  title: "Bench Press",
  description: "A high-volume personal record.",
  achievedAt: "2026-08-03T12:00:00.000Z",
  sourceSnapshot: {
    recordLabel: "Reps at Weight",
    recordValue: "120 lb × 100 reps",
    workoutTitle: "Push Day",
  },
};

beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

afterEach(() => {
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("uses the cabinet's exact deterministic SVG trophy for a concise Life achievement", () => {
  const { container } = render(<TrophyPlacementCeremony entry={lifeEntry} onClose={jest.fn()} />);

  const cabinet = screen.getByTestId("ceremony-cabinet");
  expect(container).toBeEmptyDOMElement();
  expect(screen.getByRole("presentation").parentElement).toBe(document.body);
  const award = cabinet.querySelector("[data-award-variant]");
  const expectedVariant = getTrophyVariant(lifeEntry);
  expect(award).toHaveAttribute("data-award-variant", expectedVariant);
  expect(award.querySelector("svg")).toHaveClass(
    "trace-award-graphic",
    `trace-award-graphic--${expectedVariant}`
  );
  expect(cabinet).not.toHaveTextContent("🏆");
  expect(cabinet.querySelector(".trophy-ceremony__icon")).not.toBeInTheDocument();
  expect(screen.getByText("Life Achievement")).toBeInTheDocument();
  expect(screen.getByText("Finished My First Novel")).toBeInTheDocument();
  expect(screen.getByText("July 14, 2026")).toBeInTheDocument();
  expect(screen.queryByText(lifeEntry.description)).not.toBeInTheDocument();
  expect(screen.queryByText("First complete draft")).not.toBeInTheDocument();
  expect(cabinet.querySelector(".trophy-ceremony__door--left")).toBeInTheDocument();
  expect(cabinet.querySelector(".trophy-ceremony__door--right")).toBeInTheDocument();
  expect(cabinet.querySelector(".trophy-ceremony__shelf")).toBeInTheDocument();
});

test("shows the exercise, record value, and date for a Workout achievement", () => {
  render(<TrophyPlacementCeremony entry={workoutEntry} onClose={jest.fn()} />);

  expect(screen.getByText("Reps at Weight")).toBeInTheDocument();
  expect(screen.getByText("Bench Press")).toBeInTheDocument();
  expect(screen.getByText("120 lb × 100 reps")).toBeInTheDocument();
  expect(screen.getByText("August 3, 2026")).toBeInTheDocument();
  expect(screen.queryByText(workoutEntry.description)).not.toBeInTheDocument();
  expect(screen.getByTestId("ceremony-cabinet").querySelector("svg")).toHaveAttribute(
    "aria-hidden",
    "true"
  );
});

test("moves through the dignified placement phases and then remains static", () => {
  const settle = jest.fn();
  render(
    <TrophyPlacementCeremony
      entry={lifeEntry}
      onClose={jest.fn()}
      onTrophySettle={settle}
    />
  );
  const dialog = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(dialog).toHaveAttribute("data-phase", "closed");

  act(() => jest.advanceTimersByTime(349));
  expect(dialog).toHaveAttribute("data-phase", "closed");
  act(() => jest.advanceTimersByTime(1));
  expect(dialog).toHaveAttribute("data-phase", "opening");
  act(() => jest.advanceTimersByTime(1400));
  expect(dialog).toHaveAttribute("data-phase", "placing");
  act(() => jest.advanceTimersByTime(1100));
  expect(dialog).toHaveAttribute("data-phase", "settled");
  expect(settle).toHaveBeenCalledTimes(1);
  expect(settle).toHaveBeenCalledWith(lifeEntry);
  act(() => jest.advanceTimersByTime(150));
  expect(dialog).toHaveAttribute("data-phase", "plaque");
  act(() => jest.advanceTimersByTime(800));
  expect(dialog).toHaveAttribute("data-phase", "complete");

  act(() => jest.advanceTimersByTime(60000));
  expect(dialog).toHaveAttribute("data-phase", "complete");
  expect(settle).toHaveBeenCalledTimes(1);
  expect(dialog).toBeInTheDocument();
});

test("keeps Close available throughout and supports Escape without backdrop dismissal", () => {
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={lifeEntry} onClose={close} />);
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAttribute("data-overflow-policy", "viewport-fit");
  const closeButton = screen.getByRole("button", { name: "Close Trophy Case ceremony" });
  expect(closeButton).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(closeButton).toHaveFocus();

  fireEvent.click(screen.getByRole("presentation"));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(closeButton);
  expect(close).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(900));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(2);
});

test.each([
  ["doors", 500],
  ["trophy", 2000],
  ["plaque", 3200],
])("can close during the %s stage", (_stage, elapsed) => {
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={lifeEntry} onClose={close} />);
  act(() => jest.advanceTimersByTime(elapsed));
  fireEvent.click(screen.getByRole("button", { name: "Close Trophy Case ceremony" }));
  expect(close).toHaveBeenCalledTimes(1);
});

test("locks background scroll and restores scroll and prior focus on unmount", () => {
  document.body.style.overflow = "clip";
  document.documentElement.style.overflow = "auto";
  const previousButton = document.createElement("button");
  document.body.appendChild(previousButton);
  previousButton.focus();

  const { unmount } = render(
    <TrophyPlacementCeremony entry={lifeEntry} onClose={jest.fn()} />
  );
  expect(document.body).toHaveStyle({ overflow: "hidden" });
  expect(document.documentElement).toHaveStyle({ overflow: "hidden" });
  expect(screen.getByRole("button", { name: "Close Trophy Case ceremony" })).toHaveFocus();

  unmount();
  expect(document.body).toHaveStyle({ overflow: "clip" });
  expect(document.documentElement).toHaveStyle({ overflow: "auto" });
  expect(previousButton).toHaveFocus();
  previousButton.remove();
});

test("keeps nested Detail ownership when ceremony closes and clears stale styles out of order", () => {
  const releaseDetail = acquireDocumentScrollLock({ mode: "fixed", scrollX: 18, scrollY: 240 });
  const { unmount } = render(
    <TrophyPlacementCeremony entry={lifeEntry} onClose={jest.fn()} />
  );

  expect(document.body).toHaveStyle({ position: "fixed", top: "-240px", overflow: "hidden" });
  unmount();
  expect(document.body).toHaveStyle({ position: "fixed", top: "-240px", overflow: "hidden" });
  releaseDetail();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");

  const releaseDetailFirst = acquireDocumentScrollLock({ mode: "fixed", scrollY: 240 });
  const secondCeremony = render(
    <TrophyPlacementCeremony entry={lifeEntry} onClose={jest.fn()} />
  );
  releaseDetailFirst();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("hidden");
  secondCeremony.unmount();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
});

test("falls back to the preserved Detail when its trophy control becomes disabled", () => {
  const detail = document.createElement("section");
  detail.setAttribute("role", "dialog");
  const panel = document.createElement("div");
  panel.dataset.testid = "memory-detail-panel";
  panel.tabIndex = -1;
  const trigger = document.createElement("button");
  panel.appendChild(trigger);
  detail.appendChild(panel);
  document.body.appendChild(detail);
  trigger.focus();

  const { unmount } = render(
    <TrophyPlacementCeremony entry={lifeEntry} onClose={jest.fn()} />
  );
  trigger.disabled = true;
  unmount();
  expect(panel).toHaveFocus();
  detail.remove();
});

test("starts and settles once while leaving persistence outside the ceremony", () => {
  const start = jest.fn();
  const settle = jest.fn();
  render(
    <TrophyPlacementCeremony
      entry={workoutEntry}
      onClose={jest.fn()}
      onCeremonyStart={start}
      onTrophySettle={settle}
    />
  );

  expect(start).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith(workoutEntry);
  act(() => jest.advanceTimersByTime(2850));
  expect(settle).toHaveBeenCalledTimes(1);
  expect(settle).toHaveBeenCalledWith(workoutEntry);
});

test("uses the immediate final state for reduced motion until explicitly dismissed", () => {
  const settle = jest.fn();
  const close = jest.fn();
  render(
    <TrophyPlacementCeremony
      entry={lifeEntry}
      onClose={close}
      onTrophySettle={settle}
      reducedMotion
    />
  );

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveClass("trophy-ceremony--reduced", "trophy-ceremony--complete");
  expect(dialog).toHaveAttribute("data-phase", "complete");
  expect(dialog).not.toHaveClass("trophy-ceremony--opening", "trophy-ceremony--placing");
  expect(settle).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(60000));
  expect(close).not.toHaveBeenCalled();
  expect(dialog).toBeInTheDocument();
});
