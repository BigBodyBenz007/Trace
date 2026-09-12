const DEFAULT_FILTERS = Object.freeze({ search: "", selectedCategory: "All", favoriteFilter: "all", timelinePosition: "present" });
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const nonnegative = (value) => Math.max(0, finite(value));
const clamp = (value, maximum) => Math.min(Math.max(0, finite(value)), Math.max(0, finite(maximum)));

export function captureCapsuleTimelineReturn({
  capsuleId, viewport, card, orderedItemIds = [], filters = {}, windowObject = window,
}) {
  const sourceItemId = `time-capsule:${String(capsuleId)}`;
  const viewportBounds = viewport?.getBoundingClientRect?.();
  const cardBounds = card?.getBoundingClientRect?.();
  const nearbyItemIds = [...new Set(orderedItemIds.filter((id) => (typeof id === "string" && id) || (typeof id === "number" && Number.isFinite(id))))];
  const sourceIndex = nearbyItemIds.indexOf(sourceItemId);
  return {
    sourceItemId,
    documentScrollX: nonnegative(windowObject.scrollX ?? windowObject.pageXOffset),
    documentScrollY: nonnegative(windowObject.scrollY ?? windowObject.pageYOffset),
    timelineScrollLeft: nonnegative(viewport?.scrollLeft),
    timelineScrollTop: nonnegative(viewport?.scrollTop),
    viewportTop: finite(viewportBounds?.top),
    sourceCardLeft: finite(cardBounds?.left) - finite(viewportBounds?.left),
    sourceCardTop: finite(cardBounds?.top),
    filters: {
      search: typeof filters.search === "string" ? filters.search : DEFAULT_FILTERS.search,
      selectedCategory: typeof filters.selectedCategory === "string" ? filters.selectedCategory : DEFAULT_FILTERS.selectedCategory,
      favoriteFilter: filters.favoriteFilter === "favorites" ? "favorites" : "all",
      timelinePosition: filters.timelinePosition === "past" ? "past" : "present",
    },
    nearbyItemIds,
    sourceIndex,
  };
}

function availableCard(cards, id) {
  const card = cards?.get?.(id);
  return card && card.isConnected !== false ? card : null;
}

function returnTarget(origin, cards) {
  const source = availableCard(cards, origin.sourceItemId);
  if (source) return { id: origin.sourceItemId, card: source };
  const previous = Array.isArray(origin.nearbyItemIds) ? origin.nearbyItemIds : [];
  const sourceIndex = Number.isInteger(origin.sourceIndex) && origin.sourceIndex >= 0
    ? origin.sourceIndex : previous.indexOf(origin.sourceItemId);
  if (sourceIndex >= 0) {
    for (let distance = 1; distance <= previous.length; distance += 1) {
      // Prefer the following item on equal distance, then the preceding item.
      for (const index of [sourceIndex + distance, sourceIndex - distance]) {
        const id = previous[index];
        const card = availableCard(cards, id);
        if (card) return { id, card };
      }
    }
  }
  const remaining = Array.from(cards?.entries?.() || []).filter(([, card]) => card && card.isConnected !== false);
  if (!remaining.length) return { id: null, card: null };
  const [id, card] = remaining[clamp(sourceIndex, remaining.length - 1)];
  return { id, card };
}

function documentRange(windowObject) {
  const documentObject = windowObject.document;
  const root = documentObject?.documentElement;
  const body = documentObject?.body;
  const scrolling = documentObject?.scrollingElement || root;
  return {
    x: Math.max(0, finite(Math.max(scrolling?.scrollWidth || 0, root?.scrollWidth || 0, body?.scrollWidth || 0)) - finite(windowObject.innerWidth || root?.clientWidth)),
    y: Math.max(0, finite(Math.max(scrolling?.scrollHeight || 0, root?.scrollHeight || 0, body?.scrollHeight || 0)) - finite(windowObject.innerHeight || root?.clientHeight)),
  };
}

/**
 * Restore one return journey, then stop observing. Fixed photo placeholders make
 * most returns stable in two frames; a short bounded settling window also covers
 * cached image/font completion and responsive layout changes without fighting
 * the user's next scroll. Cleanup never invokes onRestored on an obsolete view.
 */
export function restoreCapsuleTimelineReturn({
  origin, viewport, cards, windowObject = window, onRestored = () => {},
  settleDelayMs = 500, maxWaitMs = 1000,
}) {
  if (!origin || !viewport) return () => {};
  const documentObject = windowObject.document;
  const raf = windowObject.requestAnimationFrame.bind(windowObject);
  const cancelRaf = windowObject.cancelAnimationFrame.bind(windowObject);
  const setTimer = windowObject.setTimeout?.bind(windowObject) || setTimeout;
  const clearTimer = windowObject.clearTimeout?.bind(windowObject) || clearTimeout;
  let active = true;
  let frame = null;
  let settleTimer = null;
  let deadlineTimer = null;
  let geometryRetryTimer = null;
  let observer = null;
  let observedCard = null;
  let restored = false;
  let lastTarget = { id: null, card: null };
  let layoutVersion = 0;
  let lastAppliedVersion = -1;
  const detachers = [];

  function listen(target, type, callback, options) {
    target?.addEventListener?.(type, callback, options);
    detachers.push(() => target?.removeEventListener?.(type, callback, options));
  }

  function cleanup() {
    if (!active) return;
    active = false;
    if (frame !== null) cancelRaf(frame);
    clearTimer(settleTimer);
    clearTimer(deadlineTimer);
    clearTimer(geometryRetryTimer);
    observer?.disconnect();
    detachers.forEach((detach) => detach());
  }

  function finish({ canceled = false } = {}) {
    if (!active) return;
    if (!canceled && restored) {
      const target = lastTarget.card || viewport;
      const priorTabIndex = target.getAttribute?.("tabindex");
      if (priorTabIndex === null) target.setAttribute?.("tabindex", "-1");
      try { target.focus?.({ preventScroll: true }); } catch (failure) { /* A removed card is a safe fallback. */ }
      if (priorTabIndex === null) target.removeAttribute?.("tabindex");
    }
    cleanup();
    onRestored({ restored, canceled, targetItemId: lastTarget.id });
  }

  function applyPosition() {
    const bounds = viewport.getBoundingClientRect();
    if (!(bounds.width > 0) || !(bounds.height > 0) || !(viewport.clientWidth > 0)) return false;
    const target = returnTarget(origin, cards);
    const cardBounds = target.card?.getBoundingClientRect();
    if (target.card && (!(cardBounds.width > 0) || !(cardBounds.height > 0))) return false;
    if (observer && observedCard !== target.card) {
      if (observedCard) observer.unobserve?.(observedCard);
      observedCard = target.card;
      if (observedCard) observer.observe(observedCard);
    }
    viewport.scrollLeft = clamp(origin.timelineScrollLeft, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollTop = clamp(origin.timelineScrollTop, viewport.scrollHeight - viewport.clientHeight);
    const range = documentRange(windowObject);
    const documentX = clamp(origin.documentScrollX, range.x);
    const documentY = clamp(origin.documentScrollY, range.y);
    windowObject.scrollTo({ left: documentX, top: documentY, behavior: "auto" });
    const positionedViewport = viewport.getBoundingClientRect();
    const positionedCard = target.card?.getBoundingClientRect();
    if (positionedCard && Number.isFinite(origin.sourceCardLeft)) {
      viewport.scrollLeft = clamp(viewport.scrollLeft + positionedCard.left - positionedViewport.left - origin.sourceCardLeft,
        viewport.scrollWidth - viewport.clientWidth);
    }
    const anchorTop = positionedCard?.top ?? positionedViewport.top;
    const savedTop = positionedCard ? origin.sourceCardTop : origin.viewportTop;
    if (Number.isFinite(savedTop)) {
      windowObject.scrollTo({ left: documentX, top: clamp(documentY + anchorTop - savedTop, range.y), behavior: "auto" });
    }
    lastTarget = target;
    restored = true;
    lastAppliedVersion = layoutVersion;
    return true;
  }

  function schedule() {
    if (!active || frame !== null) return;
    clearTimer(geometryRetryTimer);
    geometryRetryTimer = null;
    const requestFrame = (callback) => {
      let ranSynchronously = false;
      const id = raf(() => {
        ranSynchronously = true;
        frame = null;
        if (active) callback();
      });
      if (!ranSynchronously) frame = id;
    };
    // The first frame allows Home's hidden/inert removal to commit; the second
    // reads real layout instead of a zero-size retained or newly mounted view.
    requestFrame(() => {
      requestFrame(() => {
        if (!active) return;
        if (!applyPosition()) {
          // Some test/runtime frame adapters run synchronously. A timer also
          // bounds retry work while a retained view still has no layout.
          geometryRetryTimer = setTimer(schedule, 16);
          return;
        }
        clearTimer(settleTimer);
        settleTimer = setTimer(() => {
          if (!active) return;
          if (lastAppliedVersion !== layoutVersion) { schedule(); return; }
          // Measure once more for layout shifts which did not resize the card.
          applyPosition();
          finish();
        }, Math.max(0, settleDelayMs));
      });
    });
  }

  function layoutChanged() {
    if (!active) return;
    layoutVersion += 1;
    schedule();
  }

  function userInteracted() { finish({ canceled: true }); }
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach((type) => listen(windowObject, type, userInteracted, { capture: true, passive: true }));
  listen(windowObject, "resize", layoutChanged, { passive: true });
  listen(documentObject, "load", layoutChanged, true);
  const ResizeObserverClass = windowObject.ResizeObserver;
  if (typeof ResizeObserverClass === "function") {
    observer = new ResizeObserverClass(layoutChanged);
    observer.observe(viewport);
  }
  documentObject?.fonts?.ready?.then?.(layoutChanged, () => {});
  deadlineTimer = setTimer(() => {
    if (!active) return;
    applyPosition();
    finish();
  }, Math.max(1, maxWaitMs));
  schedule();
  return cleanup;
}
