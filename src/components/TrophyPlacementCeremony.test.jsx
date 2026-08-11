import { act, fireEvent, render, screen } from "@testing-library/react";
import TrophyPlacementCeremony from "./TrophyPlacementCeremony";

const entry = {
  id: "trophy",
  sourceType: "memory",
  title: "Finished My First Novel",
  description: "A personal milestone",
  sourceSnapshot: { recordValue: "First complete draft" },
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
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("renders a generic saved snapshot in an accessible ceremony and closes explicitly", () => {
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={entry} onClose={close} />);
  const dialog = screen.getByRole("dialog", { name: "Added to Trophy Case" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveTextContent("Finished My First Novel");
  expect(dialog).toHaveTextContent("First complete draft");
  const closeButton = screen.getByRole("button", { name: "Close Trophy Case ceremony" });
  expect(closeButton).toHaveFocus();
  fireEvent.click(closeButton);
  expect(close).toHaveBeenCalledTimes(1);
});

test("supports Escape, automatic completion, and isolated lifecycle hooks", () => {
  const close = jest.fn();
  const start = jest.fn();
  const settle = jest.fn();
  render(<TrophyPlacementCeremony entry={entry} onClose={close} onCeremonyStart={start} onTrophySettle={settle} />);
  expect(start).toHaveBeenCalledWith(entry);
  jest.advanceTimersByTime(3599);
  expect(settle).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(settle).toHaveBeenCalledWith(entry);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
});

test("remains visible indefinitely after reaching its completed static state", () => {
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={entry} onClose={close} />);
  jest.advanceTimersByTime(4449);
  expect(screen.getByRole("dialog")).not.toHaveClass("trophy-ceremony--complete");
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByRole("dialog")).toHaveClass("trophy-ceremony--complete");
  jest.advanceTimersByTime(60000);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("backdrop clicks do not dismiss the ceremony", () => {
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={entry} onClose={close} />);
  fireEvent.click(screen.getByRole("presentation"));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("uses a static completed state for reduced motion until explicitly dismissed", () => {
  window.matchMedia = jest.fn(() => ({
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  const settle = jest.fn();
  const close = jest.fn();
  render(<TrophyPlacementCeremony entry={entry} onClose={close} onTrophySettle={settle} />);
  act(() => jest.advanceTimersByTime(0));
  expect(screen.getByRole("dialog")).toHaveClass("trophy-ceremony--reduced", "trophy-ceremony--complete");
  expect(settle).toHaveBeenCalledWith(entry);
  jest.advanceTimersByTime(60000);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
