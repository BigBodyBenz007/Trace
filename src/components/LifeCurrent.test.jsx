import { render, screen } from "@testing-library/react";
import LifeCurrent from "./LifeCurrent";

function layout(points) {
  return { points };
}

const point = (dateKey, normalizedX, intensity = 0.4, rawActivity = 1) => ({
  dateKey,
  normalizedX,
  intensity,
  rawActivity,
});

test("does not render a visual for an empty layout", () => {
  const { container } = render(<LifeCurrent layout={layout([])} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders a restrained short stroke for a single populated day", () => {
  render(<LifeCurrent layout={layout([point("2026-01-01", 0)])} />);
  expect(screen.getByTestId("life-current").querySelector("path"))
    .toHaveAttribute("d", "M 2 28 L 22 28");
});

test("renders a deterministic curved path for multiple temporal points", () => {
  const currentLayout = layout([
    point("2000-01-01", 0),
    point("2010-01-01", 0.35),
    point("2026-01-01", 1),
  ]);
  const { rerender } = render(<LifeCurrent layout={currentLayout} />);
  const firstPath = screen.getByTestId("life-current").querySelector("path").getAttribute("d");
  expect(firstPath).toContain(" C ");
  rerender(<LifeCurrent layout={currentLayout} />);
  expect(screen.getByTestId("life-current").querySelector("path")).toHaveAttribute("d", firstPath);
});

test("path geometry changes with temporal layout but not activity intensity", () => {
  const first = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2021-01-01", 0.25, 0.2, 0.4),
    point("2022-01-01", 1, 0.3, 0.6),
  ]);
  const { rerender } = render(<LifeCurrent layout={first} />);
  const initialPath = screen.getByTestId("life-current").querySelector("path").getAttribute("d");

  rerender(<LifeCurrent layout={layout(first.points.map((item) => ({ ...item, intensity: 1, rawActivity: 99 })))} />);
  expect(screen.getByTestId("life-current").querySelector("path")).toHaveAttribute("d", initialPath);

  rerender(<LifeCurrent layout={layout([first.points[0], { ...first.points[1], normalizedX: 0.6 }, first.points[2]])} />);
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d")).not.toBe(initialPath);
});

test("is decorative and cannot intercept Timeline pointer interaction", () => {
  render(<LifeCurrent layout={layout([point("2025-01-01", 0), point("2026-01-01", 1)])} />);
  const current = screen.getByTestId("life-current");
  expect(current).toHaveAttribute("aria-hidden", "true");
  expect(current).toHaveStyle({ pointerEvents: "none" });
});
