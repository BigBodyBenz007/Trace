import { act, render, screen } from "@testing-library/react";
import SuccessToast from "./SuccessToast";

test("exposes one accessible transient success and replaces stale content", () => {
  jest.useFakeTimers();
  const dismiss = jest.fn();
  const { rerender } = render(<SuccessToast notification={{ id: "one", message: "Meal traced" }} onDismiss={dismiss} />);
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  rerender(<SuccessToast notification={{ id: "two", message: "Workout traced" }} onDismiss={dismiss} />);
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Workout traced");
  act(() => jest.advanceTimersByTime(2600));
  expect(dismiss).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
