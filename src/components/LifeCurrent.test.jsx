import { render, screen } from "@testing-library/react";
import LifeCurrent, { LIFE_CURRENT_TRAIL_TUNING } from "./LifeCurrent";

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

test("renders a bounded quiet trail after the final authoritative point", () => {
  const points = [
    point("2025-01-01", 0),
    point("2026-08-06", 1),
  ];
  render(<LifeCurrent layout={layout(points)} showQuietTrail />);

  const current = screen.getByTestId("life-current");
  const trail = screen.getByTestId("life-current-quiet-trail");
  expect(current).toHaveAttribute("data-last-activity-date", "2026-08-06");
  expect(current).toHaveAttribute("data-quiet-trail", "true");
  expect(current).toHaveAttribute("data-visible-end-x", "1000");
  expect(current.querySelector("path").getAttribute("d")).toMatch(/1000 28$/);
  expect(trail).toHaveStyle({
    pointerEvents: "none",
    width: `${LIFE_CURRENT_TRAIL_TUNING.extentPixels}px`,
  });
  expect(trail).toHaveAttribute("data-start-x", "0");
  expect(trail).toHaveAttribute("data-end-x", "160");
  expect(trail).toHaveAttribute("viewBox", "0 0 160 56");
  expect(screen.getByTestId("life-current-quiet-trail-path"))
    .toHaveAttribute("stroke-opacity", String(LIFE_CURRENT_TRAIL_TUNING.opacity));
  expect(points).toHaveLength(2);
  expect(points.at(-1).dateKey).toBe("2026-08-06");
});

test("does not add a quiet trail to camera-window rendering by default", () => {
  render(<LifeCurrent layout={layout([
    point("2026-01-01", 0),
    point("2026-08-06", 1),
  ])} />);
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-visible-end-x", "988");
});
