import { captureCapsuleTimelineReturn, restoreCapsuleTimelineReturn } from "./capsuleTimelineReturn";

function layout() {
  const frames = new Map();
  let nextFrame = 0;
  let observer;
  const documentObject = new EventTarget();
  documentObject.documentElement = { scrollWidth: 1400, scrollHeight: 3000 };
  documentObject.body = { scrollWidth: 1400, scrollHeight: 3000 };
  const windowObject = new EventTarget();
  Object.assign(windowObject, {
    document: documentObject, scrollX: 37, scrollY: 240, innerWidth: 390, innerHeight: 844,
    requestAnimationFrame: jest.fn((callback) => { const id = ++nextFrame; frames.set(id, callback); return id; }),
    cancelAnimationFrame: jest.fn((id) => frames.delete(id)),
    setTimeout, clearTimeout,
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    },
  });
  windowObject.scrollTo = jest.fn(({ left, top }) => { windowObject.scrollX = left; windowObject.scrollY = top; });
  function element() {
    const node = new EventTarget();
    const attributes = new Map();
    Object.assign(node, {
      isConnected: true, focus: jest.fn(),
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    });
    return node;
  }
  const viewport = element();
  Object.assign(viewport, { scrollLeft: 417, scrollTop: 23, clientWidth: 390, clientHeight: 400, scrollWidth: 3000, scrollHeight: 450, documentTop: 900, visible: true });
  viewport.getBoundingClientRect = () => ({ left: 40 - windowObject.scrollX, top: viewport.documentTop - windowObject.scrollY, width: viewport.visible ? 390 : 0, height: viewport.visible ? 400 : 0 });
  function cardAt(contentLeft, contentTop = 100) {
    const card = element();
    Object.assign(card, { contentLeft, contentTop, visible: true });
    card.getBoundingClientRect = () => ({
      left: viewport.getBoundingClientRect().left + card.contentLeft - viewport.scrollLeft,
      top: viewport.getBoundingClientRect().top + card.contentTop - viewport.scrollTop,
      width: card.visible ? 200 : 0, height: card.visible ? 240 : 0,
    });
    return card;
  }
  const before = cardAt(200);
  const source = cardAt(500);
  const after = cardAt(800);
  const cards = new Map([["memory-before", before], ["time-capsule:source", source], ["memory-after", after]]);
  const capture = (filters) => captureCapsuleTimelineReturn({ capsuleId: "source", viewport, card: source, orderedItemIds: [...cards.keys()], filters, windowObject });
  function frame() {
    const current = [...frames.values()];
    frames.clear();
    current.forEach((callback) => callback());
  }
  function doubleFrame() { frame(); frame(); }
  function leave() { viewport.scrollLeft = 0; viewport.scrollTop = 0; windowObject.scrollX = 0; windowObject.scrollY = 0; }
  return { windowObject, viewport, source, before, after, cards, capture, frame, doubleFrame, leave, cardAt, frames, get observer() { return observer; } };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("captures a serializable source, two scroll axes, relative card anchor, order, and filters", () => {
  const h = layout();
  const origin = h.capture({ search: "year", selectedCategory: "Family", favoriteFilter: "favorites", timelinePosition: "past" });
  expect(JSON.parse(JSON.stringify(origin))).toEqual({
    sourceItemId: "time-capsule:source", documentScrollX: 37, documentScrollY: 240,
    timelineScrollLeft: 417, timelineScrollTop: 23, viewportTop: 660, sourceCardLeft: 83, sourceCardTop: 737,
    filters: { search: "year", selectedCategory: "Family", favoriteFilter: "favorites", timelinePosition: "past" },
    nearbyItemIds: ["memory-before", "time-capsule:source", "memory-after"], sourceIndex: 1,
  });
});

test("restores exact scroll and waits two frames plus bounded settling before preventScroll focus", () => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.frame();
  expect(h.windowObject.scrollTo).not.toHaveBeenCalled();
  h.frame();
  expect(h.viewport.scrollLeft).toBe(417);
  expect(h.viewport.scrollTop).toBe(23);
  expect(h.windowObject.scrollY).toBe(240);
  expect(h.windowObject.scrollX).toBe(37);
  expect(onRestored).not.toHaveBeenCalled();
  jest.advanceTimersByTime(500);
  expect(h.source.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(onRestored).toHaveBeenCalledWith({ restored: true, canceled: false, targetItemId: "time-capsule:source" });
  expect(h.observer.disconnect).toHaveBeenCalledTimes(1);
});

test("hidden geometry cannot restore or focus early and becomes restorable once visible", () => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  h.viewport.visible = false;
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  expect(h.windowObject.scrollTo).not.toHaveBeenCalled();
  expect(onRestored).not.toHaveBeenCalled();
  h.viewport.visible = true;
  jest.advanceTimersByTime(16);
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(h.viewport.scrollLeft).toBe(417);
  expect(onRestored).toHaveBeenCalledTimes(1);
});

test("changed neighbors and content above the viewport preserve the source's original visual anchor", () => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  h.source.contentLeft += 85;
  h.viewport.documentTop += 120;
  restoreCapsuleTimelineReturn({ origin, ...h });
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(h.viewport.scrollLeft).toBe(502);
  expect(h.windowObject.scrollY).toBe(360);
  expect(h.source.getBoundingClientRect().left - h.viewport.getBoundingClientRect().left).toBe(origin.sourceCardLeft);
  expect(h.source.getBoundingClientRect().top).toBe(origin.sourceCardTop);
});

test("deleted source chooses the nearest surviving saved neighbor, with following item winning ties", () => {
  const h = layout();
  const origin = h.capture();
  h.cards.delete(origin.sourceItemId);
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(h.viewport.scrollLeft).toBe(717);
  expect(h.after.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ targetItemId: "memory-after" }));
});

test("removed and filtered original neighbors use the clamped source index in current cards", () => {
  const h = layout();
  const origin = h.capture();
  const replacement = h.cardAt(900);
  h.cards.clear();
  h.cards.set("replacement-1", h.cardAt(100));
  h.cards.set("replacement-2", replacement);
  h.leave();
  restoreCapsuleTimelineReturn({ origin, ...h });
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(replacement.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(h.viewport.scrollLeft).toBe(817);
});

test("empty timeline clamps both axes and focuses the viewport without making it permanently tabbable", () => {
  const h = layout();
  const origin = h.capture();
  h.cards.clear();
  h.viewport.scrollWidth = 400;
  h.viewport.scrollHeight = 400;
  h.windowObject.document.documentElement.scrollWidth = 400;
  h.windowObject.document.body.scrollWidth = 400;
  h.windowObject.document.documentElement.scrollHeight = 900;
  h.windowObject.document.body.scrollHeight = 900;
  h.leave();
  restoreCapsuleTimelineReturn({ origin, ...h });
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(h.viewport.scrollLeft).toBe(10);
  expect(h.viewport.scrollTop).toBe(0);
  expect(h.windowObject.scrollX).toBe(10);
  expect(h.windowObject.scrollY).toBe(56);
  expect(h.viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(h.viewport.getAttribute("tabindex")).toBeNull();
});

test("late image layout changes are corrected during the bounded settle window only", () => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  jest.advanceTimersByTime(300);
  h.source.contentLeft += 40;
  h.windowObject.document.dispatchEvent(new Event("load"));
  h.doubleFrame();
  expect(h.viewport.scrollLeft).toBe(457);
  jest.advanceTimersByTime(500);
  expect(onRestored).toHaveBeenCalledTimes(1);
  h.viewport.scrollLeft = 700;
  h.windowObject.document.dispatchEvent(new Event("load"));
  h.doubleFrame();
  expect(h.viewport.scrollLeft).toBe(700);
});

test.each(["wheel", "touchstart", "pointerdown", "keydown"])("%s immediately cancels correction and never steals user focus", (type) => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  h.windowObject.dispatchEvent(new Event(type));
  h.viewport.scrollLeft = 999;
  h.observer.callback();
  h.doubleFrame();
  jest.advanceTimersByTime(2000);
  expect(h.viewport.scrollLeft).toBe(999);
  expect(h.source.focus).not.toHaveBeenCalled();
  expect(onRestored).toHaveBeenCalledTimes(1);
  expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ canceled: true }));
});

test("cleanup invalidates pending frames, observers, fonts completion, and callbacks", async () => {
  const h = layout();
  const origin = h.capture();
  let resolveFonts;
  h.windowObject.document.fonts = { ready: new Promise((resolve) => { resolveFonts = resolve; }) };
  h.leave();
  const onRestored = jest.fn();
  const cleanup = restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  cleanup();
  cleanup();
  resolveFonts();
  await Promise.resolve();
  h.observer.callback();
  h.windowObject.dispatchEvent(new Event("resize"));
  h.doubleFrame();
  jest.advanceTimersByTime(2000);
  expect(h.windowObject.scrollTo).not.toHaveBeenCalled();
  expect(onRestored).not.toHaveBeenCalled();
  expect(h.observer.disconnect).toHaveBeenCalledTimes(1);
  expect(h.frames.size).toBe(0);
});

test("persistent zero geometry releases its caller after a bounded deadline without jumping", () => {
  const h = layout();
  const origin = h.capture();
  h.viewport.visible = false;
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  jest.advanceTimersByTime(1000);
  expect(h.windowObject.scrollTo).not.toHaveBeenCalled();
  expect(onRestored).toHaveBeenCalledWith({ restored: false, canceled: false, targetItemId: null });
  expect(h.frames.size).toBe(0);
});

test("repeated resize notifications cannot extend restoration indefinitely", () => {
  const h = layout();
  const origin = h.capture();
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  for (let i = 0; i < 4; i += 1) {
    jest.advanceTimersByTime(200);
    h.observer.callback();
    h.doubleFrame();
  }
  jest.advanceTimersByTime(200);
  expect(onRestored).toHaveBeenCalledTimes(1);
  expect(h.observer.disconnect).toHaveBeenCalledTimes(1);
});

test("synchronous frame adapters retry hidden geometry through timers without recursion", () => {
  const h = layout();
  const origin = h.capture();
  h.viewport.visible = false;
  h.leave();
  h.windowObject.requestAnimationFrame = jest.fn((callback) => { callback(); return 1; });
  const onRestored = jest.fn();
  expect(() => restoreCapsuleTimelineReturn({ origin, ...h, onRestored })).not.toThrow();
  expect(h.windowObject.requestAnimationFrame).toHaveBeenCalledTimes(2);
  expect(h.windowObject.scrollTo).not.toHaveBeenCalled();
  h.viewport.visible = true;
  jest.advanceTimersByTime(16);
  expect(h.viewport.scrollLeft).toBe(417);
  jest.advanceTimersByTime(500);
  expect(onRestored).toHaveBeenCalledTimes(1);
});

test("numeric legacy Memory IDs remain eligible as saved neighbors", () => {
  const h = layout();
  h.cards = new Map([[10, h.before], ["time-capsule:source", h.source], [20, h.after]]);
  const origin = captureCapsuleTimelineReturn({ capsuleId: "source", viewport: h.viewport, card: h.source, orderedItemIds: [...h.cards.keys()], windowObject: h.windowObject });
  expect(origin.nearbyItemIds).toEqual([10, "time-capsule:source", 20]);
  h.cards.delete(origin.sourceItemId);
  h.leave();
  const onRestored = jest.fn();
  restoreCapsuleTimelineReturn({ origin, ...h, onRestored });
  h.doubleFrame();
  jest.advanceTimersByTime(500);
  expect(h.after.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ targetItemId: 20 }));
});
