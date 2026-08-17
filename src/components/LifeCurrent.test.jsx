import { render, screen } from "@testing-library/react";
import LifeCurrent, { getLifeCurrentPointCoordinates } from "./LifeCurrent";
import { deriveLifeCurrent } from "../services/lifeCurrent";
import { deriveLifeCurrentLayout } from "../services/lifeCurrentLayout";

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
  const path = screen.getByTestId("life-current").querySelector("path");
  expect(path.getAttribute("d")).toMatch(/^M 2 [\d.]+ L 22 [\d.]+$/);
  expect(path.getAttribute("d")).not.toContain(" 28");
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

test("path geometry responds to both temporal layout and activity intensity", () => {
  const first = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2021-01-01", 0.25, 0.2, 0.4),
    point("2022-01-01", 1, 0.3, 0.6),
  ]);
  const { rerender } = render(<LifeCurrent layout={first} />);
  const initialPath = screen.getByTestId("life-current").querySelector("path").getAttribute("d");

  rerender(<LifeCurrent layout={layout(first.points.map((item) => ({ ...item, intensity: 1, rawActivity: 99 })))} />);
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d"))
    .not.toBe(initialPath);

  rerender(<LifeCurrent layout={layout([first.points[0], { ...first.points[1], normalizedX: 0.6 }, first.points[2]])} />);
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d")).not.toBe(initialPath);
});

test("is decorative and cannot intercept Timeline pointer interaction", () => {
  render(<LifeCurrent layout={layout([point("2025-01-01", 0), point("2026-01-01", 1)])} />);
  const current = screen.getByTestId("life-current");
  expect(current).toHaveAttribute("aria-hidden", "true");
  expect(current).toHaveStyle({ pointerEvents: "none" });
});

test("does not invent a wavy path after the final authoritative activity", () => {
  const points = [
    point("2007-04-17", 0),
    point("2026-08-06", 0.92),
    point("2026-08-12", 1),
  ];
  render(<LifeCurrent layout={layout(points)} showQuietTrail />);

  const current = screen.getByTestId("life-current");
  expect(current).toHaveAttribute("data-last-activity-date", "2026-08-12");
  expect(current).toHaveAttribute("data-quiet-trail", "false");
  expect(current).toHaveAttribute("data-visible-end-x", "1000");
  const finalCoordinate = getLifeCurrentPointCoordinates(points, true).at(-1);
  expect(current.querySelector("path").getAttribute("d"))
    .toMatch(new RegExp(`1000 ${finalCoordinate.y}$`));
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(points).toHaveLength(3);
  expect(points.at(-1).dateKey).toBe("2026-08-12");
});

test("ends at the latest activity for sparse older and recent Memory data", () => {
  const source = deriveLifeCurrent({
    memories: [
      { id: "old", date: "2007-04-17" },
      { id: "old-same-day", date: "2007-04-17" },
      { id: "middle-one", date: "2012-01-01" },
      { id: "middle-two", date: "2018-06-15" },
      { id: "recent-one", date: "2026-08-06" },
      { id: "recent-two", date: "2026-08-12" },
    ],
  });
  const currentLayout = deriveLifeCurrentLayout(source);

  expect(currentLayout.points.map(({ dateKey }) => dateKey)).toEqual([
    "2007-04-17", "2012-01-01", "2018-06-15", "2026-08-06", "2026-08-12",
  ]);
  const normalizedPositions = currentLayout.points.map(({ normalizedX }) => normalizedX);
  expect(normalizedPositions[0]).toBe(0);
  expect(normalizedPositions.at(-1)).toBe(1);
  normalizedPositions.slice(1).forEach((x, index) => {
    expect(x).toBeGreaterThan(normalizedPositions[index]);
  });
  expect(normalizedPositions[2]).toBeGreaterThan(0.5);
  expect(normalizedPositions[2]).toBeLessThan(0.85);
  const coordinates = getLifeCurrentPointCoordinates(currentLayout.points, true);
  expect(coordinates[0].x).toBe(12);
  expect(coordinates.at(-1).x).toBe(1000);
  expect(coordinates.slice(0, 3).every(({ y }) => y !== 28)).toBe(true);
  expect(coordinates.slice(-2).every(({ y }) => y !== 28)).toBe(true);
  expect(new Set(coordinates.slice(0, 3).map(({ y }) => y)).size).toBeGreaterThan(1);
  expect(Math.abs(coordinates[0].y - 28))
    .toBeGreaterThan(Math.abs(coordinates[1].y - 28));
  render(<LifeCurrent layout={currentLayout} showQuietTrail />);

  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-last-activity-date", "2026-08-12");
  expect(screen.getByTestId("life-current").querySelector("path").getAttribute("d"))
    .not.toMatch(/^M [\d.]+ 28(?: |$)/);
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
});

test("distributes historical and recent bends across the full rendered range", () => {
  const source = deriveLifeCurrent({
    memories: [
      { id: "1983", date: "1983-06-16" },
      { id: "2001", date: "2001-06-16" },
      { id: "2024", date: "2024-08-06" },
      { id: "recent-start", date: "2026-08-01" },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `recent-${index}`,
        date: `2026-08-${String(index + 5).padStart(2, "0")}`,
      })),
    ],
  });
  const currentLayout = deriveLifeCurrentLayout(source);
  const activityCoordinates = getLifeCurrentPointCoordinates(currentLayout.points, true);
  const historicalSpan = activityCoordinates[3].x - activityCoordinates[0].x;
  const recentSpan = activityCoordinates.at(-1).x - activityCoordinates[3].x;

  expect(historicalSpan).toBeGreaterThan(400);
  expect(recentSpan).toBeGreaterThan(400);
  expect(activityCoordinates.slice(0, 4).every(({ y }) => y !== 28)).toBe(true);
  expect(new Set(activityCoordinates.slice(0, 4).map(({ y }) => y)).size)
    .toBeGreaterThan(1);
  expect(activityCoordinates.at(-1).x).toBe(1000);
});

test("consolidates same-day memories while preserving their combined intensity", () => {
  const source = deriveLifeCurrent({
    memories: [
      { id: "first", date: "2007-04-17" },
      { id: "second", date: "2007-04-17" },
      { id: "single", date: "2008-01-01" },
    ],
  });
  const currentLayout = deriveLifeCurrentLayout(source);
  const coordinates = getLifeCurrentPointCoordinates(currentLayout.points, true);

  expect(currentLayout.points).toHaveLength(2);
  expect(currentLayout.points[0].rawActivity).toBe(1.25);
  expect(Math.abs(coordinates[0].y - 28))
    .toBeGreaterThan(Math.abs(coordinates[1].y - 28));
});

test("uses the same generated geometry at laptop and phone container widths", () => {
  const points = [point("2000-01-01", 0), point("2010-01-01", 0.5), point("2026-01-01", 1)];
  const { rerender } = render(
    <div style={{ width: "1440px" }}><LifeCurrent layout={layout(points)} showQuietTrail /></div>
  );
  const laptopPath = screen.getByTestId("life-current").querySelector("path").getAttribute("d");
  rerender(
    <div style={{ width: "390px" }}><LifeCurrent layout={layout(points)} showQuietTrail /></div>
  );
  expect(screen.getByTestId("life-current").querySelector("path"))
    .toHaveAttribute("d", laptopPath);
});

test("does not add a quiet trail to camera-window rendering by default", () => {
  render(<LifeCurrent layout={layout([
    point("2026-01-01", 0),
    point("2026-08-06", 1),
  ])} />);
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-visible-end-x", "988");
});
