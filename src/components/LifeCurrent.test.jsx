import React, { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import LifeCurrent, {
  getLifeCurrentPointCoordinates,
  LifeCurrentScenery,
} from "./LifeCurrent";
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

function RiverHarness({
  active = true,
  points,
  scrollWidth = 6000,
  themeId = "river",
  viewportWidth = 1000,
}) {
  const viewportRef = useRef(null);
  return (
    <div
      data-testid="memory-timeline-viewport"
      ref={(node) => {
        viewportRef.current = node;
        if (!node) return;
        Object.defineProperty(node, "clientWidth", {
          configurable: true,
          value: viewportWidth,
        });
        Object.defineProperty(node, "scrollWidth", {
          configurable: true,
          value: scrollWidth,
        });
        node.getBoundingClientRect = () => ({ width: viewportWidth });
      }}
    >
      <LifeCurrentScenery
        active={active}
        layout={layout(points)}
        themeId={themeId}
        viewportRef={viewportRef}
      />
    </div>
  );
}

test("does not render a River visual for an empty layout", () => {
  const { container } = render(<>
    <LifeCurrentScenery layout={layout([])} />
    <LifeCurrent layout={layout([])} />
  </>);
  expect(container).toBeEmptyDOMElement();
});

test("Modern Heirloom renders no decorative scenery or SVG paths", () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="modern-heirloom"
  />);

  const current = screen.getByTestId("life-current");
  expect(current).toHaveAttribute("aria-hidden", "true");
  expect(current).toHaveAttribute("data-theme-id", "modern-heirloom");
  expect(current).toHaveAttribute("data-life-current-renderer", "modern-heirloom-current");
  expect(current).toHaveAttribute("data-quiet-trail", "false");
  expect(current).toBeEmptyDOMElement();
  expect(screen.queryByTestId("life-current-modern-heirloom-scenery")).not.toBeInTheDocument();
  expect(current.querySelectorAll("svg, path, circle, img, picture, source")).toHaveLength(0);
  expect(getComputedStyle(current).pointerEvents).toBe("none");
});

test("renders the approved raster River from the sticky scenery slot", () => {
  render(<RiverHarness points={[
    point("2020-01-01", 0),
    point("2026-01-01", 1),
  ]} />);

  const current = screen.getByTestId("life-current");
  expect(current).toHaveAttribute("aria-hidden", "true");
  expect(current).toHaveAttribute("data-theme-id", "river");
  expect(current).toHaveAttribute("data-life-current-renderer", "river-current");
  expect(current).toHaveAttribute("data-river-catalog", "ten-section");
  expect(current).toHaveAttribute("data-current-river-section", "mountain-headwaters");
  expect(current).toHaveAttribute(
    "data-loaded-river-sections",
    "mountain-headwaters narrow-calm narrow-rocky-whitewater"
  );
  expect(screen.getByTestId("life-current-river-scenery")).toBeInTheDocument();
  expect(current.querySelectorAll("picture")).toHaveLength(3);
  expect(current.querySelectorAll("img")).toHaveLength(3);
  expect(current.querySelectorAll("source")).toHaveLength(0);
  current.querySelectorAll("img").forEach((image) => {
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("loading", "eager");
  });
  expect([...current.querySelectorAll("img")].map((image) => image.getAttribute("src")))
    .toEqual(expect.arrayContaining([
      expect.stringContaining("00-mountain-headwaters.png"),
      expect.stringContaining("01-narrow-calm.png"),
      expect.stringContaining("02-narrow-rocky-whitewater.png"),
    ]));
  expect(getComputedStyle(current).pointerEvents).toBe("none");
});

test("loads only the current and adjacent landscape sections while scrolling", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();

  const { unmount } = render(<RiverHarness points={[
    point("2020-01-01", 0),
    point("2026-01-01", 1),
  ]} />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const current = screen.getByTestId("life-current");

  viewport.scrollLeft = 2500;
  fireEvent.scroll(viewport);
  act(() => frames.shift()());

  expect(viewport.scrollLeft).toBe(2500);
  expect(current).toHaveAttribute("data-current-river-section", "medium-active-s-bend");
  expect(current).toHaveAttribute(
    "data-loaded-river-sections",
    "broad-calm medium-active-s-bend broad-energetic-whitewater"
  );
  expect(current.querySelectorAll("picture")).toHaveLength(3);
  expect(Number(current.getAttribute("data-river-progress"))).toBeCloseTo(0.5, 4);
  expect(current.style.getPropertyValue("--river-offset")).toMatch(/^-/);

  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("River scenery node count stays constant as Memory-derived point count grows", () => {
  const sparse = [point("2000-01-01", 0), point("2026-01-01", 1)];
  const dense = Array.from({ length: 900 }, (_, index) =>
    point(`2026-01-${String(index % 28 + 1).padStart(2, "0")}`, index / 899)
  );
  const { rerender } = render(<RiverHarness points={sparse} />);
  const sparseNodeCount = screen.getByTestId("life-current").querySelectorAll("*").length;

  rerender(<RiverHarness points={dense} />);

  expect(screen.getByTestId("life-current").querySelectorAll("*"))
    .toHaveLength(sparseNodeCount);
  expect(screen.getByTestId("life-current")).toHaveAttribute(
    "data-last-activity-date",
    dense.at(-1).dateKey
  );
});

test("River visuals are not recreated inside the Timeline card canvas", () => {
  const { container } = render(<LifeCurrent layout={layout([
    point("2020-01-01", 0),
    point("2026-01-01", 1),
  ])} />);
  expect(container).toBeEmptyDOMElement();
});

test("Haunted Forest renders the ordered raster catalog from the sticky scenery slot", () => {
  const currentLayout = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2021-01-01", 0.45, 0.5, 1),
    point("2026-01-01", 1, 1, 4),
  ]);
  const before = JSON.parse(JSON.stringify(currentLayout));
  render(<RiverHarness
    points={currentLayout.points}
    themeId="haunted-forest"
    viewportWidth={390}
  />);
  const forest = screen.getByTestId("life-current");

  expect(forest).toHaveAttribute("data-theme-id", "haunted-forest");
  expect(forest).toHaveAttribute("data-life-current-renderer", "forest-path");
  expect(forest).toHaveAttribute("data-forest-catalog", "ten-section");
  expect(forest).toHaveAttribute("data-current-forest-section", "root-doorway");
  expect(forest).toHaveAttribute(
    "data-loaded-forest-sections",
    "root-doorway first-trail crowded-tangle"
  );
  expect(forest).toHaveAttribute("data-last-activity-date", "2026-01-01");
  const scenery = screen.getByTestId("life-current-forest-scenery");
  expect(scenery.querySelectorAll("picture")).toHaveLength(3);
  expect([...scenery.querySelectorAll("[data-forest-section]")]
    .map((section) => section.getAttribute("data-forest-section")))
    .toEqual(["root-doorway", "first-trail", "crowded-tangle"]);
  expect(scenery.querySelector("svg")).not.toBeInTheDocument();
  expect(scenery.querySelector('[data-forest-section="root-doorway"] img'))
    .toHaveAttribute("width", "1600");
  expect(scenery.querySelector('[data-forest-section="root-doorway"] img'))
    .toHaveAttribute("height", "900");
  expect(scenery.querySelector('[data-forest-section="root-doorway"]')
    .style.getPropertyValue("--river-section-width-mobile")).toBe("460px");
  expect(currentLayout).toEqual(before);
});

test("Haunted Forest advances through its catalog while mounting only nearby scenes", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="haunted-forest"
    viewportWidth={1000}
  />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const forest = screen.getByTestId("life-current");

  viewport.scrollLeft = 2500;
  fireEvent.scroll(viewport);
  act(() => frames.shift()());

  expect(forest).toHaveAttribute("data-current-forest-section", "blackwater-marsh");
  expect(forest).toHaveAttribute(
    "data-loaded-forest-sections",
    "hollow-clearing blackwater-marsh white-fog-crossing"
  );
  expect(forest.querySelectorAll("img")).toHaveLength(3);
  expect(Number(forest.getAttribute("data-forest-progress"))).toBeCloseTo(0.5, 4);

  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Haunted Forest reveals decoded images and safely falls back to River on failure", async () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="haunted-forest"
    viewportWidth={390}
  />);
  const firstSection = screen.getByTestId("life-current")
    .querySelector('[data-forest-section="root-doorway"]');
  expect(firstSection).toHaveAttribute("data-image-ready", "false");

  await act(async () => {
    fireEvent.load(firstSection.querySelector("img"));
    await Promise.resolve();
  });
  expect(firstSection).toHaveAttribute("data-image-ready", "true");

  fireEvent.error(firstSection.querySelector("img"));
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-life-current-renderer", "river-current");
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-theme-id", "haunted-forest");
});

test("Gnome Village renders the approved one-time opener and complete 520px scenes", () => {
  const currentLayout = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2026-01-01", 1, 1, 4),
  ]);
  const before = JSON.parse(JSON.stringify(currentLayout));
  render(<RiverHarness
    points={currentLayout.points}
    themeId="gnome-village"
    viewportWidth={390}
  />);
  const gnome = screen.getByTestId("life-current");

  expect(gnome).toHaveAttribute("data-theme-id", "gnome-village");
  expect(gnome).toHaveAttribute("data-life-current-renderer", "gnome-village");
  expect(gnome).toHaveAttribute("data-gnome-catalog", "approved-golden-path-v1");
  expect(gnome).toHaveAttribute("data-current-gnome-region", "gnome-king-opener");
  expect(gnome).toHaveAttribute("data-current-gnome-section", "gnome-king-opener");
  expect(gnome).toHaveAttribute("data-gnome-opener-count", "1");
  expect(gnome).toHaveAttribute("data-last-activity-date", "2026-01-01");
  const scenery = screen.getByTestId("life-current-gnome-scenery");
  expect(scenery.querySelector("picture")).not.toBeInTheDocument();
  expect(scenery.querySelector("svg")).not.toBeInTheDocument();
  expect(scenery.querySelector("[data-gnome-overlay]"))
    .not.toBeInTheDocument();
  expect(scenery.querySelector("[data-gnome-seam]"))
    .not.toBeInTheDocument();
  const sections = [...scenery.querySelectorAll("[data-gnome-section]")];
  expect(sections.slice(0, 2).map((section) => section.getAttribute("data-gnome-section")))
    .toEqual(["gnome-king-opener", "gnome-path-scene-01"]);
  expect(sections.length).toBeLessThanOrEqual(4);
  expect(scenery.querySelectorAll('[data-gnome-section="gnome-king-opener"]'))
    .toHaveLength(1);
  sections.forEach((section, index) => {
    expect(section.style.getPropertyValue("--gnome-section-left"))
      .toBe(`${index * 520}px`);
    expect(section.querySelector("img")).toHaveAttribute("width", "1774");
    expect(section.querySelector("img")).toHaveAttribute("height", "887");
    expect(section.querySelector("img")).not.toHaveAttribute("style");
  });
  expect(sections[0].querySelector("img").getAttribute("src"))
    .toContain("00-gnome-king-opener.png");
  expect(gnome.style.getPropertyValue("--gnome-section-width")).toBe("520px");
  expect(gnome.style.getPropertyValue("--gnome-scenery-height")).toBe("260px");
  expect(currentLayout).toEqual(before);
});

test("Gnome Village follows chronology with bounded mounting and the exact recycled overlap", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    scrollWidth={9000}
    themeId="gnome-village"
    viewportWidth={1000}
  />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const gnome = screen.getByTestId("life-current");

  [520, 2080, 4160, 5200].forEach((scrollLeft) => {
    viewport.scrollLeft = scrollLeft;
    fireEvent.scroll(viewport);
    act(() => frames.shift()());
    expect(gnome).toHaveAttribute("data-gnome-camera-offset", scrollLeft.toFixed(2));
    expect(gnome).toHaveAttribute("data-current-gnome-region", "baked-scene-cycle");
    expect(gnome.querySelectorAll("[data-gnome-section]").length)
      .toBeLessThanOrEqual(5);
  });

  const loopStart = 520 + (10 * 520 - 96 * 520 / 1774);
  viewport.scrollLeft = loopStart;
  fireEvent.scroll(viewport);
  act(() => frames.shift()());

  expect(gnome).toHaveAttribute("data-current-gnome-section", "gnome-path-scene-01");
  expect(gnome.querySelector('[data-gnome-section="gnome-king-opener"]'))
    .not.toBeInTheDocument();
  const scene10 = gnome.querySelector(
    '[data-gnome-section="gnome-path-scene-10"][data-gnome-cycle="0"]'
  );
  const recycledScene01 = gnome.querySelector(
    '[data-gnome-section="gnome-path-scene-01"][data-gnome-cycle="1"]'
  );
  expect(scene10).toBeInTheDocument();
  expect(recycledScene01).toBeInTheDocument();
  expect(recycledScene01).toHaveAttribute("data-gnome-loop-boundary", "true");
  expect(Number(recycledScene01.getAttribute("data-gnome-overlap-before")))
    .toBeCloseTo(96 * 520 / 1774, 10);
  expect(
    Number.parseFloat(scene10.style.getPropertyValue("--gnome-section-left")) + 520 -
    Number.parseFloat(recycledScene01.style.getPropertyValue("--gnome-section-left"))
  ).toBeCloseTo(96 * 520 / 1774, 10);

  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Gnome Village reveals decoded images and safely falls back to River on failure", async () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="gnome-village"
    viewportWidth={390}
  />);
  const firstSection = screen.getByTestId("life-current")
    .querySelector('[data-gnome-section="gnome-king-opener"]');
  expect(firstSection).toHaveAttribute("data-image-ready", "false");

  await act(async () => {
    fireEvent.load(firstSection.querySelector("img"));
    await Promise.resolve();
  });
  expect(firstSection).toHaveAttribute("data-image-ready", "true");

  fireEvent.error(firstSection.querySelector("img"));
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-life-current-renderer", "river-current");
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-theme-id", "gnome-village");
});

test("Desert Journey renders one opener followed by exact baked 520px scenes", () => {
  const currentLayout = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2026-01-01", 1, 1, 4),
  ]);
  const before = JSON.parse(JSON.stringify(currentLayout));
  render(<RiverHarness
    points={currentLayout.points}
    themeId="desert-journey"
    viewportWidth={390}
  />);
  const desert = screen.getByTestId("life-current");

  expect(desert).toHaveAttribute("data-theme-id", "desert-journey");
  expect(desert).toHaveAttribute("data-life-current-renderer", "desert-journey");
  expect(desert).toHaveAttribute("data-desert-catalog", "baked-continuous-v2");
  expect(desert).toHaveAttribute("data-current-desert-region", "sphinx-opener");
  expect(desert).toHaveAttribute("data-current-desert-section", "sphinx-opener");
  expect(desert).toHaveAttribute("data-desert-opener-count", "1");
  const scenery = screen.getByTestId("life-current-desert-scenery");
  expect(scenery.querySelector("svg")).not.toBeInTheDocument();
  const sections = [...scenery.querySelectorAll("[data-desert-section]")];
  const opener = scenery.querySelector('[data-desert-section="sphinx-opener"]');
  expect(sections.map((section) => section.getAttribute("data-desert-section")))
    .toEqual(["sphinx-opener", "oasis", "solo-traveler"]);
  expect(scenery.querySelectorAll('[data-desert-section="sphinx-opener"]')).toHaveLength(1);
  sections.forEach((section, index) => {
    expect(section.style.getPropertyValue("--desert-section-left"))
      .toBe(`${index * 520}px`);
    expect(section.querySelector("img")).toHaveAttribute("width", "1774");
    expect(section.querySelector("img")).toHaveAttribute("height", "887");
  });
  expect(opener.querySelector("img").getAttribute("src"))
    .toContain("00-sphinx-opener.png");
  expect(desert.style.getPropertyValue("--desert-section-width")).toBe("520px");
  expect(desert.style.getPropertyValue("--desert-scenery-height")).toBe("260px");
  expect(currentLayout).toEqual(before);
});

test("Desert Journey tracks timeline scrolling directly while bounding nearby baked scenes", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="desert-journey"
    viewportWidth={1000}
  />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const desert = screen.getByTestId("life-current");

  [2500, 3500, 4250, 4800, 5000].forEach((scrollLeft) => {
    viewport.scrollLeft = scrollLeft;
    fireEvent.scroll(viewport);
    act(() => frames.shift()());
    expect(desert).toHaveAttribute("data-desert-camera-offset", `${scrollLeft.toFixed(2)}`);
    expect(desert).toHaveAttribute("data-current-desert-region", "baked-scene-cycle");
    expect(desert.querySelectorAll("[data-desert-section]").length)
      .toBeLessThanOrEqual(5);
  });

  expect(Number(desert.getAttribute("data-desert-progress"))).toBeCloseTo(1, 4);
  expect(desert).toHaveAttribute("data-current-desert-section", "large-caravan");
  expect(desert.querySelector('[data-desert-section="sphinx-opener"]'))
    .not.toBeInTheDocument();
  expect(desert.querySelector('[data-desert-section="vultures"]')).toBeInTheDocument();
  expect(desert.querySelector('[data-desert-section="oasis"][data-desert-cycle="1"]'))
    .toBeInTheDocument();
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Desert Journey uses only full-background images without layered overlay nodes", () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="desert-journey"
    viewportWidth={390}
  />);
  const desert = screen.getByTestId("life-current");

  expect(desert.querySelector("picture")).not.toBeInTheDocument();
  expect(desert.querySelector("[data-desert-overlay]")).not.toBeInTheDocument();
  expect(desert.querySelector("[data-desert-base]")).not.toBeInTheDocument();
  expect(desert.querySelectorAll("[data-desert-section] img")).toHaveLength(3);
  expect([...desert.querySelectorAll("[data-desert-section] img")].map(({ src }) => src))
    .toEqual([
      expect.stringContaining("00-sphinx-opener.png"),
      expect.stringContaining("01-oasis.png"),
      expect.stringContaining("02-solo-traveler.png"),
    ]);
});

test("Desert Journey decodes baked scenes and safely falls back to River on failure", async () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="desert-journey"
    viewportWidth={390}
  />);
  const desert = screen.getByTestId("life-current");
  const opener = desert.querySelector('[data-desert-section="sphinx-opener"]');
  const oasis = desert.querySelector('[data-desert-section="oasis"]');
  expect(opener).toHaveAttribute("data-image-ready", "false");
  expect(oasis).toHaveAttribute("data-image-ready", "false");

  await act(async () => {
    fireEvent.load(opener.querySelector("img"));
    fireEvent.load(oasis.querySelector("img"));
    await Promise.resolve();
  });
  expect(opener).toHaveAttribute("data-image-ready", "true");
  expect(oasis).toHaveAttribute("data-image-ready", "true");

  fireEvent.error(oasis.querySelector("img"));
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-life-current-renderer", "river-current");
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-theme-id", "desert-journey");
});

test("Outer Space Journey renders its one-time opener and exact uncropped 520px scenes", () => {
  const currentLayout = layout([
    point("2020-01-01", 0, 0.1, 0.2),
    point("2026-01-01", 1, 1, 4),
  ]);
  const before = JSON.parse(JSON.stringify(currentLayout));
  render(<RiverHarness
    points={currentLayout.points}
    themeId="outer-space-journey"
    viewportWidth={390}
  />);
  const outerSpace = screen.getByTestId("life-current");
  const scenery = screen.getByTestId("life-current-outer-space-scenery");

  expect(outerSpace).toHaveAttribute("data-theme-id", "outer-space-journey");
  expect(outerSpace).toHaveAttribute("data-life-current-renderer", "outer-space-journey");
  expect(outerSpace).toHaveAttribute("data-outer-space-catalog", "approved-continuous-v1");
  expect(outerSpace).toHaveAttribute("data-current-outer-space-region", "star-gate-opener");
  expect(outerSpace).toHaveAttribute("data-current-outer-space-section", "star-gate-opener");
  expect(outerSpace).toHaveAttribute("data-outer-space-opener-count", "1");
  expect(outerSpace).toHaveAttribute("data-last-activity-date", "2026-01-01");
  expect(scenery.querySelector("svg")).not.toBeInTheDocument();
  expect(scenery.querySelector("picture")).not.toBeInTheDocument();
  expect(scenery.querySelector("[data-outer-space-overlay]")).not.toBeInTheDocument();
  expect(scenery.querySelector("[data-outer-space-seam]")).not.toBeInTheDocument();

  const sections = [...scenery.querySelectorAll("[data-outer-space-section]")];
  expect(sections.slice(0, 2).map((section) => section.getAttribute("data-outer-space-section")))
    .toEqual(["star-gate-opener", "waystones"]);
  expect(scenery.querySelectorAll('[data-outer-space-section="star-gate-opener"]'))
    .toHaveLength(1);
  sections.forEach((section, index) => {
    expect(section.style.getPropertyValue("--outer-space-section-left"))
      .toBe(`${index * 520}px`);
    expect(section.querySelector("img")).toHaveAttribute("width", "1774");
    expect(section.querySelector("img")).toHaveAttribute("height", "887");
    expect(section.querySelector("img")).not.toHaveAttribute("style");
  });
  expect(sections[0].querySelector("img").getAttribute("src"))
    .toContain("00-star-gate-opener.png");
  expect(outerSpace.style.getPropertyValue("--outer-space-section-width")).toBe("520px");
  expect(outerSpace.style.getPropertyValue("--outer-space-scenery-height")).toBe("260px");
  expect(currentLayout).toEqual(before);
});

test("Outer Space Journey follows chronology while mounting only nearby recycled scenes", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const frames = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frames.push(callback);
    return frames.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { unmount } = render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="outer-space-journey"
    viewportWidth={1000}
  />);
  const viewport = screen.getByTestId("memory-timeline-viewport");
  const outerSpace = screen.getByTestId("life-current");

  [520, 2080, 2600, 4160, 5000].forEach((scrollLeft) => {
    viewport.scrollLeft = scrollLeft;
    fireEvent.scroll(viewport);
    act(() => frames.shift()());
    expect(outerSpace).toHaveAttribute(
      "data-outer-space-camera-offset",
      `${scrollLeft.toFixed(2)}`
    );
    expect(outerSpace).toHaveAttribute("data-current-outer-space-region", "baked-scene-cycle");
    expect(outerSpace.querySelectorAll("[data-outer-space-section]").length)
      .toBeLessThanOrEqual(5);
  });

  expect(Number(outerSpace.getAttribute("data-outer-space-progress"))).toBeCloseTo(1, 4);
  expect(outerSpace).toHaveAttribute("data-current-outer-space-section", "ancient-city");
  expect(outerSpace.querySelector('[data-outer-space-section="star-gate-opener"]'))
    .not.toBeInTheDocument();
  expect(outerSpace.querySelector('[data-outer-space-section="nomad-caravan"]'))
    .toBeInTheDocument();
  expect(outerSpace.querySelector('[data-outer-space-section="waystones"][data-outer-space-cycle="1"]'))
    .toBeInTheDocument();
  unmount();
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

test("Outer Space Journey decodes locked scenes and safely falls back to River", async () => {
  render(<RiverHarness
    points={[point("2020-01-01", 0), point("2026-01-01", 1)]}
    themeId="outer-space-journey"
    viewportWidth={390}
  />);
  const outerSpace = screen.getByTestId("life-current");
  const opener = outerSpace.querySelector('[data-outer-space-section="star-gate-opener"]');
  const waystones = outerSpace.querySelector('[data-outer-space-section="waystones"]');
  expect(opener).toHaveAttribute("data-image-ready", "false");
  expect(waystones).toHaveAttribute("data-image-ready", "false");

  await act(async () => {
    fireEvent.load(opener.querySelector("img"));
    fireEvent.load(waystones.querySelector("img"));
    await Promise.resolve();
  });
  expect(opener).toHaveAttribute("data-image-ready", "true");
  expect(waystones).toHaveAttribute("data-image-ready", "true");

  fireEvent.error(waystones.querySelector("img"));
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-life-current-renderer", "river-current");
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-theme-id", "outer-space-journey");
});

test("invalid theme IDs safely render Modern Heirloom", () => {
  render(<RiverHarness points={[point("2026-01-01", 0)]} themeId="lost-world" />);
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-theme-id", "modern-heirloom");
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-life-current-renderer", "modern-heirloom-current");
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
  const coordinates = getLifeCurrentPointCoordinates(currentLayout.points, true);
  expect(coordinates[0].x).toBe(12);
  expect(coordinates.at(-1).x).toBe(1000);
  render(<RiverHarness points={currentLayout.points} />);
  expect(screen.getByTestId("life-current"))
    .toHaveAttribute("data-last-activity-date", "2026-08-12");
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
});

test("distributes historical and recent bends across the full chronology range", () => {
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

test("keeps bank-preserving desktop and mobile framing on catalog rasters", () => {
  const { unmount } = render(<RiverHarness
    points={[point("2000-01-01", 0), point("2026-01-01", 1)]}
    viewportWidth={1440}
  />);
  let firstSection = screen.getByTestId("life-current")
    .querySelector('[data-river-section="mountain-headwaters"]');
  expect(firstSection.style.getPropertyValue("--river-image-height")).toBe("100%");
  expect(firstSection.style.getPropertyValue("--river-image-top")).toBe("0%");
  expect(firstSection.style.getPropertyValue("--river-section-width")).toBe("390px");

  unmount();
  render(<RiverHarness
    points={[point("2000-01-01", 0), point("2026-01-01", 1)]}
    viewportWidth={390}
  />);
  firstSection = screen.getByTestId("life-current")
    .querySelector('[data-river-section="mountain-headwaters"]');
  expect(firstSection.style.getPropertyValue("--river-section-width-mobile")).toBe("390px");
  expect(screen.getByTestId("life-current").querySelectorAll("img")).toHaveLength(3);
});

test("reveals catalog scenery only after the mounted image has decoded", async () => {
  render(<RiverHarness points={[
    point("2020-01-01", 0),
    point("2026-01-01", 1),
  ]} />);
  const firstSection = screen.getByTestId("life-current")
    .querySelector('[data-river-section="mountain-headwaters"]');
  expect(firstSection).toHaveAttribute("data-image-ready", "false");

  await act(async () => {
    fireEvent.load(firstSection.querySelector("img"));
    await Promise.resolve();
  });

  expect(firstSection).toHaveAttribute("data-image-ready", "true");
});

test("switches to the original six-section fallback if a catalog image fails", () => {
  render(<RiverHarness points={[
    point("2020-01-01", 0),
    point("2026-01-01", 1),
  ]} />);
  const current = screen.getByTestId("life-current");

  fireEvent.error(current.querySelector("img"));

  expect(current).toHaveAttribute("data-river-catalog", "fallback");
  expect(current).toHaveAttribute("data-current-river-section", "quiet-narrow");
  expect(current).toHaveAttribute(
    "data-loaded-river-sections",
    "quiet-narrow gentle-rise"
  );
  expect(current.querySelectorAll('source[type="image/avif"]')).toHaveLength(4);
  expect(current.querySelectorAll('source[type="image/webp"]')).toHaveLength(4);
});

test("does not add a procedural quiet trail to raster scenery", () => {
  render(<RiverHarness points={[
    point("2026-01-01", 0),
    point("2026-08-06", 1),
  ]} />);
  expect(screen.queryByTestId("life-current-quiet-trail")).not.toBeInTheDocument();
  expect(screen.getByTestId("life-current")).toHaveAttribute("data-quiet-trail", "false");
});
