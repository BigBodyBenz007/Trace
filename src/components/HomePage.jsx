import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CATEGORY_OPTIONS } from "../constants/categories";
import { deriveLifeCurrent } from "../services/lifeCurrent";
import { deriveLifeCurrentLayout } from "../services/lifeCurrentLayout";
import { matchesMemorySearch } from "../services/memorySearch";
import {
  deriveLifeCurrentCameraWindow,
  deriveLifeCurrentWindow,
  LIFE_CURRENT_WINDOW_TUNING,
} from "../services/lifeCurrentWindow";
import { createMemoryTrophyCandidate } from "../services/trophyCase";
import { formatDateOnly, parseDateOnlyLocal } from "../services/dateOnly";
import {
  calculateTimelineFocusScale,
  TIMELINE_FOCUS_TUNING,
} from "../services/timelineFocus";
import LifeCurrent from "./LifeCurrent";
import { LIFE_CURRENT_TRAIL_TUNING } from "./LifeCurrent";

const CATEGORY_FILTER_OPTIONS = [
  "All",
  ...CATEGORY_OPTIONS,
];
const TIMELINE_FOCUS_CONTAINMENT_WIDTH = Math.ceil(
  TIMELINE_FOCUS_TUNING.baseCardWidth * TIMELINE_FOCUS_TUNING.maximumScale
);
const TIMELINE_FOCUS_CONTAINMENT_GUTTER =
  (TIMELINE_FOCUS_CONTAINMENT_WIDTH - TIMELINE_FOCUS_TUNING.baseCardWidth) / 2;

function photoSource(photo) {
  return typeof photo === "string" ? photo : photo?.url;
}

function useDocumentScrollLock(locked, scrollOrigin = null) {
  useEffect(() => {
    if (!locked) return undefined;

    const body = document.body;
    const root = document.documentElement;
    const scrollX = scrollOrigin?.documentScrollX ?? window.scrollX ?? window.pageXOffset ?? 0;
    const scrollY = scrollOrigin?.documentScrollY ?? window.scrollY ?? window.pageYOffset ?? 0;
    const originalBodyStyles = {
      left: body.style.left,
      overflow: body.style.overflow,
      position: body.style.position,
      right: body.style.right,
      top: body.style.top,
      width: body.style.width,
    };
    const originalRootStyles = {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    };

    body.style.left = `-${scrollX}px`;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.right = "0";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      Object.assign(body.style, originalBodyStyles);
      Object.assign(root.style, originalRootStyles);
      if (scrollX !== 0 || scrollY !== 0) window.scrollTo(scrollX, scrollY);
    };
  }, [locked, scrollOrigin]);
}

function getTimelineDate(memory, currentDay) {
  if (!memory.date) return currentDay;

  return parseDateOnlyLocal(memory.date) || currentDay;
}

function groupMemoriesByDate(memories, currentDay) {
  return memories.reduce((yearGroups, memory) => {
    const date = getTimelineDate(memory, currentDay);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    let yearGroup = yearGroups[yearGroups.length - 1];

    if (!yearGroup || yearGroup.year !== year) {
      yearGroup = { year, months: [] };
      yearGroups.push(yearGroup);
    }

    let monthGroup = yearGroup.months[yearGroup.months.length - 1];

    if (!monthGroup || monthGroup.monthIndex !== monthIndex) {
      monthGroup = { month, monthIndex, memories: [] };
      yearGroup.months.push(monthGroup);
    }

    monthGroup.memories.push(memory);
    return yearGroups;
  }, []);
}

function getMemorySelectionKey(memory) {
  return memory.id;
}

function MemorySearchInput({ search, setSearch, style }) {
  const [inputValue, setInputValue] = useState(search);
  const [, startTransition] = useTransition();

  useEffect(() => setInputValue(search), [search]);

  return (
    <input
      style={style}
      type="text"
      placeholder="Search memories..."
      value={inputValue}
      onChange={(event) => {
        const nextSearch = event.target.value;
        setInputValue(nextSearch);
        startTransition(() => setSearch(nextSearch));
      }}
    />
  );
}

function HomePage({
  memoryCount,
  memories,
  timelineTargetMemoryId = null,
  onTimelineTargetShown = () => {},
  toggleFavorite,
  onAddMemory,
  onOpenNutrition,
  onOpenHealth,
  onOpenSettings,
  onOpenMedications,
  onOpenProtocols,
  onOpenWorkouts,
  onOpenTrophyCase,
  onOpenBackup,
  deleteMemory,
  editMemory,
  trophyEntries = [],
  nutritionEntries = [],
  healthMeasurementEntries = [],
  workoutEntries = [],
  medicationEntries = [],
  addTrophyCaseEntry = () => false,
  memoryAchievementSuggestion = null,
  dismissMemoryAchievementSuggestion = () => {},
  buttonStyle,
  inputStyle,
  containerStyle,
  trophySourceTarget = null,
  onReturnToTrophyCase = null,
  onExitTrophySource = null,
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [timelinePosition, setTimelinePosition] = useState("present");
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [detailMemoryId, setDetailMemoryId] = useState(null);
  const [activeDetailPhotoIndex, setActiveDetailPhotoIndex] = useState(0);
  const [hoveredMemory, setHoveredMemory] = useState(null);
  const [filteredCameraDate, setFilteredCameraDate] = useState(null);
  const timelineRef = useRef(null);
  const timelineFocusFrameRef = useRef(null);
  const visibleTimelineCardsRef = useRef(new Set());
  const detailOriginScrollRef = useRef(null);
  const filterOriginRef = useRef(null);
  const restoreFilterOriginRef = useRef(false);
  const filteredCameraDateRef = useRef(null);
  const timelinePositionRequestRef = useRef(true);
  const memoryCardRefs = useRef(new Map());
  const detailPanelRef = useRef(null);
  const currentDay = useMemo(() => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    return day;
  }, []);
  const timelineEdgeGutter = Math.max(32, Math.ceil(window.innerWidth / 2 - 120));
  const lifeCurrent = useMemo(
    () =>
      deriveLifeCurrent({
        memories,
        nutritionEntries,
        healthMeasurementEntries,
        workoutEntries,
        medicationEntries,
        trophyCaseEntries: trophyEntries,
      }),
    [memories, nutritionEntries, healthMeasurementEntries, workoutEntries, medicationEntries, trophyEntries]
  );
  const lifeCurrentLayout = useMemo(
    () => deriveLifeCurrentLayout(lifeCurrent),
    [lifeCurrent]
  );

  const sortedMemories = useMemo(() => [...memories].sort(
    (a, b) => getTimelineDate(a, currentDay) - getTimelineDate(b, currentDay)
  ), [currentDay, memories]);
  const filteredMemories = useMemo(() => sortedMemories
    .filter((memory) => {
      const matchesSearch = matchesMemorySearch(memory, search);
      const matchesCategory =
        selectedCategory === "All" ||
        (Array.isArray(memory.categories) &&
          memory.categories.includes(selectedCategory));
      const matchesFavorite =
        favoriteFilter === "all" || memory.favorite === true;

      return matchesSearch && matchesCategory && matchesFavorite;
    }), [favoriteFilter, search, selectedCategory, sortedMemories]);
  const isMemoryFilterActive = search.length > 0 ||
    selectedCategory !== "All" || favoriteFilter !== "all";
  const filteredLifeCurrentRange = useMemo(() => {
    if (!isMemoryFilterActive) return lifeCurrentLayout;
    const exactYear = /^\d{4}$/.test(search.trim()) ? search.trim() : null;
    if (exactYear) {
      return deriveLifeCurrentWindow(lifeCurrentLayout, {
        startDateKey: `${exactYear}-01-01`,
        endDateKey: `${exactYear}-12-31`,
      });
    }
    const datedMatches = filteredMemories.filter(({ date }) =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))
    );
    if (datedMatches.length === 0) return { points: [], bounds: {} };
    return deriveLifeCurrentWindow(lifeCurrentLayout, {
      startDateKey: datedMatches[0].date,
      endDateKey: datedMatches[datedMatches.length - 1].date,
      paddingDays: LIFE_CURRENT_WINDOW_TUNING.paddingDays,
      minimumWindowDays: LIFE_CURRENT_WINDOW_TUNING.minimumWindowDays,
    });
  }, [filteredMemories, isMemoryFilterActive, lifeCurrentLayout, search]);
  const filteredLifeCurrentLayout = useMemo(() => {
    if (!isMemoryFilterActive || !filteredCameraDate || !filteredLifeCurrentRange.bounds?.earliestDateKey) {
      return filteredLifeCurrentRange;
    }
    return deriveLifeCurrentCameraWindow(lifeCurrentLayout, {
      rangeStartDateKey: filteredLifeCurrentRange.bounds.earliestDateKey,
      rangeEndDateKey: filteredLifeCurrentRange.bounds.latestDateKey,
      anchorDateKey: filteredCameraDate,
      windowDays: LIFE_CURRENT_WINDOW_TUNING.cameraWindowDays,
    });
  }, [filteredCameraDate, filteredLifeCurrentRange, isMemoryFilterActive, lifeCurrentLayout]);
  const timelineGroups = useMemo(
    () => groupMemoriesByDate(
      isMemoryFilterActive ? filteredMemories : sortedMemories,
      currentDay
    ),
    [currentDay, filteredMemories, isMemoryFilterActive, sortedMemories]
  );
  const timelineFocusKey = filteredMemories.map(({ id }) => id).join("|");
  const detailMemory =
    detailMemoryId === null
      ? null
      : memories.find((memory) => memory.id === detailMemoryId);
  useDocumentScrollLock(Boolean(detailMemory || selectedImage), detailOriginScrollRef.current);
  const trophySourceKeys = new Set(trophyEntries.map(({ sourceKey }) => sourceKey));

  function isMemoryInTrophyCase(memory) {
    return trophySourceKeys.has(`memory|${memory.id}`);
  }

  function addMemoryToTrophyCase(memory) {
    const added = addTrophyCaseEntry(createMemoryTrophyCandidate(memory));
    if (added && memoryAchievementSuggestion?.memory?.id === memory.id) {
      dismissMemoryAchievementSuggestion();
    }
    return added;
  }

  function scrollMemoryIntoView(selectionKey) {
    const viewport = timelineRef.current;
    const card = memoryCardRefs.current.get(selectionKey);

    if (!viewport || !card) return;

    const viewportBounds = viewport.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();

    if (
      cardBounds.left >= viewportBounds.left &&
      cardBounds.right <= viewportBounds.right
    ) {
      return;
    }

    viewport.scrollBy({
      left:
        cardBounds.left -
        viewportBounds.left -
        (viewportBounds.width - cardBounds.width) / 2,
      behavior: "smooth",
    });
  }

  function captureFilterOrigin() {
    const viewport = timelineRef.current;
    if (!viewport) return;
    const viewportBounds = viewport.getBoundingClientRect();
    const center = viewportBounds.left + viewportBounds.width / 2;
    let closest = null;
    const nearbyCards = visibleTimelineCardsRef.current.size > 0
      ? visibleTimelineCardsRef.current
      : memoryCardRefs.current.values();
    Array.from(nearbyCards).forEach((card) => {
      const bounds = card.getBoundingClientRect();
      const distance = Math.abs(bounds.left + bounds.width / 2 - center);
      if (!closest || distance < closest.distance) {
        closest = { memoryId: card.dataset.memoryId || null, distance };
      }
    });
    filterOriginRef.current = {
      memoryId: closest?.memoryId || null,
      scrollLeft: viewport.scrollLeft,
    };
  }

  function prepareFilterTransition(nextSearch, nextCategory, nextFavorite) {
    const nextActive = nextSearch.length > 0 ||
      nextCategory !== "All" || nextFavorite !== "all";
    if (!isMemoryFilterActive && nextActive) captureFilterOrigin();
    if (isMemoryFilterActive && !nextActive) restoreFilterOriginRef.current = true;
  }

  function updateSearch(nextSearch) {
    prepareFilterTransition(nextSearch, selectedCategory, favoriteFilter);
    setSearch(nextSearch);
  }

  function updateCategory(nextCategory) {
    prepareFilterTransition(search, nextCategory, favoriteFilter);
    setSelectedCategory(nextCategory);
  }

  function updateFavoriteFilter(nextFavorite) {
    prepareFilterTransition(search, selectedCategory, nextFavorite);
    setFavoriteFilter(nextFavorite);
  }

  function selectMemory(memory) {
    const selectionKey = getMemorySelectionKey(memory);
    setSelectedMemory(selectionKey);
    scrollMemoryIntoView(selectionKey);
  }

  function openMemoryDetail(memory) {
    const viewport = timelineRef.current;
    detailOriginScrollRef.current = {
      documentScrollX: window.scrollX || window.pageXOffset || 0,
      documentScrollY: window.scrollY || window.pageYOffset || 0,
      timelineScrollLeft: viewport?.scrollLeft ?? 0,
      timelineScrollTop: viewport?.scrollTop ?? 0,
    };
    selectMemory(memory);
    setActiveDetailPhotoIndex(0);
    setDetailMemoryId(memory.id);
  }

  function closeMemoryDetail() {
    setDetailMemoryId(null);
    if (!trophySourceTarget && detailOriginScrollRef.current) {
      const origin = detailOriginScrollRef.current;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (detailOriginScrollRef.current !== origin) return;
          const viewport = timelineRef.current;
          if (viewport) {
            viewport.scrollLeft = origin.timelineScrollLeft;
            viewport.scrollTop = origin.timelineScrollTop;
          }
          detailOriginScrollRef.current = null;
        });
      });
    }
    if (trophySourceTarget && onReturnToTrophyCase) onReturnToTrophyCase();
  }

  function clearSelection() {
    setSelectedMemory(null);
  }

  function isMemorySelected(memory) {
    return selectedMemory === getMemorySelectionKey(memory);
  }

  function setNodeHover(memory) {
    setHoveredMemory(getMemorySelectionKey(memory));
  }

  function isNodeHovered(memory) {
    return hoveredMemory === getMemorySelectionKey(memory);
  }

  useEffect(() => {
    const viewport = timelineRef.current;
    if (!viewport) return undefined;
    const visibleCards = visibleTimelineCardsRef.current;

    function updateTimelineFocus() {
      const viewportBounds = viewport.getBoundingClientRect();
      const viewportCenter = viewportBounds.left + viewportBounds.width / 2;

      const cards = visibleCards.size > 0
        ? visibleCards
        : memoryCardRefs.current.values();
      let closestDate = null;
      let closestDistance = Infinity;
      Array.from(cards).forEach((card) => {
        const bounds = card.getBoundingClientRect();
        const cardCenter = bounds.left + bounds.width / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < closestDistance && card.dataset.memoryDate) {
          closestDistance = distance;
          closestDate = card.dataset.memoryDate;
        }
        const scale = calculateTimelineFocusScale(cardCenter - viewportCenter);
        const visual = card.querySelector("[data-timeline-card-visual]");
        if (visual) {
          visual.style.setProperty("--timeline-focus-scale", scale.toFixed(4));
        }
        card.style.zIndex = String(Math.round(scale * 100));
      });
      if (
        isMemoryFilterActive &&
        closestDate &&
        closestDate !== filteredCameraDateRef.current
      ) {
        filteredCameraDateRef.current = closestDate;
        setFilteredCameraDate(closestDate);
      }
    }

    function scheduleTimelineFocusUpdate() {
      if (timelineFocusFrameRef.current !== null) return;
      timelineFocusFrameRef.current = window.requestAnimationFrame(() => {
        timelineFocusFrameRef.current = null;
        updateTimelineFocus();
      });
    }

    viewport.addEventListener("scroll", scheduleTimelineFocusUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleTimelineFocusUpdate);
    let observer = null;
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (isIntersecting) visibleCards.add(target);
            else visibleCards.delete(target);
          });
          scheduleTimelineFocusUpdate();
        },
        { root: viewport, rootMargin: "0px 480px" }
      );
      memoryCardRefs.current.forEach((card) => observer.observe(card));
    }
    scheduleTimelineFocusUpdate();

    return () => {
      viewport.removeEventListener("scroll", scheduleTimelineFocusUpdate);
      window.removeEventListener("resize", scheduleTimelineFocusUpdate);
      observer?.disconnect();
      visibleCards.clear();
      if (timelineFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(timelineFocusFrameRef.current);
        timelineFocusFrameRef.current = null;
      }
    };
  }, [isMemoryFilterActive, timelineFocusKey]);

  useEffect(() => {
    if (!isMemoryFilterActive || filteredMemories.length === 0) return;
    const firstDated = filteredMemories.find(({ date }) => /^\d{4}-\d{2}-\d{2}$/.test(String(date || "")));
    if (firstDated && !filteredCameraDateRef.current) {
      filteredCameraDateRef.current = firstDated.date;
      setFilteredCameraDate(firstDated.date);
    }
  }, [filteredMemories, isMemoryFilterActive]);

  useEffect(() => {
    if (isMemoryFilterActive || !restoreFilterOriginRef.current) return undefined;
    restoreFilterOriginRef.current = false;
    const origin = filterOriginRef.current;
    filterOriginRef.current = null;
    filteredCameraDateRef.current = null;
    setFilteredCameraDate(null);
    const frame = window.requestAnimationFrame(() => {
      const viewport = timelineRef.current;
      if (!viewport) return;
      const card = origin?.memoryId
        ? memoryCardRefs.current.get(origin.memoryId)
        : null;
      if (card) {
        const viewportBounds = viewport.getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        viewport.scrollLeft += cardBounds.left - viewportBounds.left -
          (viewportBounds.width - cardBounds.width) / 2;
      } else if (!origin?.memoryId && Number.isFinite(origin?.scrollLeft)) {
        viewport.scrollLeft = origin.scrollLeft;
      } else {
        viewport.scrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMemoryFilterActive, timelineFocusKey]);

  useEffect(() => {
    if (!/^\d{4}$/.test(search.trim())) return undefined;
    const year = search.trim();
    const earliest = filteredMemories.find((memory) =>
      String(memory.date || "").startsWith(year + "-")
    );
    if (!earliest) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const viewport = timelineRef.current;
      const card = memoryCardRefs.current.get(earliest.id);
      if (!viewport || !card) return;
      const viewportBounds = viewport.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      viewport.scrollLeft +=
        cardBounds.left - viewportBounds.left -
        (viewportBounds.width - cardBounds.width) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filteredMemories, search]);

  useEffect(() => {
    if (!trophySourceTarget?.memoryId) return undefined;
    const memory = memories.find(({ id }) => id === trophySourceTarget.memoryId);
    if (!memory) return undefined;
    setSelectedMemory(memory.id);
    setActiveDetailPhotoIndex(0);
    setDetailMemoryId(memory.id);
    const frame = window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [memories, trophySourceTarget]);

  useEffect(() => {
    if (!timelinePositionRequestRef.current || isMemoryFilterActive || sortedMemories.length === 0) return undefined;
    const targetMemory = timelinePosition === "past"
      ? sortedMemories[0]
      : sortedMemories[sortedMemories.length - 1];
    let frame = null;
    const positionTimeline = () => {
      const viewport = timelineRef.current;
      if (!viewport) return false;
      const targetCard = targetMemory
        ? memoryCardRefs.current.get(getMemorySelectionKey(targetMemory))
        : null;
      const viewportBounds = viewport.getBoundingClientRect();
      const cardBounds = targetCard?.getBoundingClientRect();
      if (viewportBounds.width <= 0 || !cardBounds || cardBounds.width <= 0) {
        return false;
      }
      timelinePositionRequestRef.current = false;
      viewport.scrollLeft = timelinePosition === "past"
        ? 0
        : Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const positionedCardBounds = targetCard.getBoundingClientRect();
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft + positionedCardBounds.left -
        viewportBounds.left - (viewportBounds.width - cardBounds.width) / 2);
      return true;
    };
    const schedulePosition = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (positionTimeline()) window.removeEventListener("scroll", schedulePosition);
      });
    };
    schedulePosition();
    window.addEventListener("scroll", schedulePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedulePosition);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [isMemoryFilterActive, sortedMemories, timelinePosition]);

  useEffect(() => {
    if (!timelineTargetMemoryId) return undefined;
    const targetMemory = memories.find(({ id }) => id === timelineTargetMemoryId);
    if (!targetMemory) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const viewport = timelineRef.current;
      const targetCard = memoryCardRefs.current.get(timelineTargetMemoryId);
      if (!viewport || !targetCard) return;
      const viewportBounds = viewport.getBoundingClientRect();
      const cardBounds = targetCard.getBoundingClientRect();
      if (viewportBounds.width <= 0 || cardBounds.width <= 0) return;
      setSelectedMemory(getMemorySelectionKey(targetMemory));
      viewport.scrollIntoView({ behavior: "auto", block: "start" });
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft + cardBounds.left -
        viewportBounds.left - (viewportBounds.width - cardBounds.width) / 2);
      onTimelineTargetShown();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [memories, onTimelineTargetShown, timelineTargetMemoryId]);

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Trace</h1>

      <p style={{ color: "#bbb", marginBottom: "30px" }}>
        Your story. Your timeline.
      </p>

      <button
        style={buttonStyle}
        onClick={onAddMemory}
      >
        Add Memory
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#374151",
        }}
        onClick={onOpenNutrition}
      >
        Nutrition
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#0e7490",
        }}
        onClick={onOpenHealth}
      >
        Health
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#334155",
        }}
        onClick={onOpenWorkouts}
      >
        Workouts
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#4b5563",
        }}
        onClick={onOpenMedications}
      >
        Medications & Supplements
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#0f766e",
        }}
        onClick={onOpenProtocols}
      >
        Protocols
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#a16207",
        }}
        onClick={onOpenTrophyCase}
      >
        Open Trophy Case
      </button>

      <button
        style={{ ...buttonStyle, backgroundColor: "#475569" }}
        onClick={onOpenBackup}
      >
        Backup & Restore
      </button>

      <button
        style={{ ...buttonStyle, backgroundColor: "#3f3f46" }}
        onClick={onOpenSettings}
      >
        Settings
      </button>

      {memoryAchievementSuggestion &&
        !isMemoryInTrophyCase(memoryAchievementSuggestion.memory) && (
          <section
            aria-label="Memory achievement suggestion"
            aria-live="polite"
            style={{
              background: "#1f2937",
              border: "1px solid #a16207",
              borderRadius: "12px",
              boxSizing: "border-box",
              marginTop: "20px",
              maxWidth: "700px",
              minWidth: 0,
              padding: "16px",
              textAlign: "left",
              width: "100%",
            }}
          >
            <strong style={{ display: "block" }}>
              This sounds like an achievement. Would you like to add it to your Trophy Case?
            </strong>
            <span style={{ color: "#d1d5db", display: "block", marginTop: "6px", overflowWrap: "anywhere" }}>
              {memoryAchievementSuggestion.memory.title}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => addMemoryToTrophyCase(memoryAchievementSuggestion.memory)}
                style={{ background: "#a16207", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", minHeight: "44px", padding: "10px 16px" }}
              >
                Add to Trophy Case
              </button>
              <button
                type="button"
                onClick={dismissMemoryAchievementSuggestion}
                style={{ background: "#4b5563", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", minHeight: "44px", padding: "10px 16px" }}
              >
                Not this time
              </button>
            </div>
          </section>
        )}

      <br />
      <br />

      <div aria-label="Timeline position" style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button type="button" aria-pressed={timelinePosition === "past"} onClick={() => { timelinePositionRequestRef.current = true; setTimelinePosition("past"); }} style={{ ...buttonStyle, marginTop: 0 }}>Past</button>
        <button type="button" aria-pressed={timelinePosition === "present"} onClick={() => { timelinePositionRequestRef.current = true; setTimelinePosition("present"); }} style={{ ...buttonStyle, marginTop: 0 }}>Present</button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "center",
          maxWidth: "700px",
          width: "100%",
        }}
      >
        <MemorySearchInput
          style={{ ...inputStyle, flex: "1 1 280px" }}
          search={search}
          setSearch={updateSearch}
        />

        <select
          aria-label="Filter memories by category"
          value={selectedCategory}
          onChange={(e) => updateCategory(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            flex: "1 1 160px",
            width: "100%",
          }}
        >
          {CATEGORY_FILTER_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter memories by favorites"
          value={favoriteFilter}
          onChange={(e) => updateFavoriteFilter(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            flex: "1 1 180px",
            width: "100%",
          }}
        >
          <option value="all">All Memories</option>
          <option value="favorites">Favorites Only</option>
        </select>
      </div>

      <h2 style={{ marginTop: "40px" }}>
        Memories Added: {memoryCount}
      </h2>

      <div
        data-testid="memory-timeline-viewport"
        ref={timelineRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: "20px",
          overflowX: "auto",
          position: "relative",
        }}
      >
        {isMemoryFilterActive && (
          <div
            data-testid="filtered-life-current-context"
            data-window-start={filteredLifeCurrentLayout.bounds?.earliestDateKey || ""}
            data-window-end={filteredLifeCurrentLayout.bounds?.latestDateKey || ""}
            data-authoritative-points={lifeCurrentLayout.points.length}
            data-window-points={filteredLifeCurrentLayout.points.length}
            style={{
              height: 0,
              left: 0,
              pointerEvents: "none",
              position: "sticky",
              top: 0,
              width: "100%",
              zIndex: 0,
            }}
          >
            <LifeCurrent layout={filteredLifeCurrentLayout} />
          </div>
        )}
        <div
            data-testid="timeline-content-canvas"
            data-full-memory-count={sortedMemories.length}
            data-visible-memory-count={filteredMemories.length}
            data-filtered={isMemoryFilterActive ? "true" : "false"}
            data-quiet-trail-extent={isMemoryFilterActive ? "0" : LIFE_CURRENT_TRAIL_TUNING.extentPixels}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "64px",
              minHeight: "150px",
              minWidth: "100%",
              padding: isMemoryFilterActive
                ? "8px 32px 16px"
                : `8px ${timelineEdgeGutter + LIFE_CURRENT_TRAIL_TUNING.extentPixels}px 16px ${timelineEdgeGutter}px`,
              position: "relative",
              width: sortedMemories.length === 0 ? "auto" : "max-content",
            }}
          >
            {!isMemoryFilterActive && (
              <LifeCurrent layout={lifeCurrentLayout} showQuietTrail />
            )}
            {lifeCurrentLayout.points.length === 0 && filteredMemories.length > 0 && <div
              aria-hidden="true"
              style={{
                background: "#6b7280",
                height: "3px",
                left: "32px",
                position: "absolute",
                right: "32px",
                top: "118px",
              }}
            />}

            {filteredMemories.length === 0 && (
              <p style={{ left: "32px", position: "absolute", zIndex: 1 }}>No memories found.</p>
            )}
            {sortedMemories.length > 0 && (
              <>

            {timelineGroups.map((yearGroup, yearIndex) => (
              <section
                key={yearGroup.year}
                style={{
                  borderLeft:
                    yearIndex === 0 ? "none" : "1px solid #374151",
                  display: "flex",
                  flexDirection: "column",
                  flex: "0 0 auto",
                  gap: "24px",
                  paddingLeft: yearIndex === 0 ? 0 : "48px",
                }}
              >
                <h2
                  style={{
                    color: "#e5e7eb",
                    fontSize: "34px",
                    fontWeight: 800,
                    lineHeight: "40px",
                    margin: 0,
                    textAlign: "left",
                  }}
                >
                  {yearGroup.year}
                </h2>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "32px",
                  }}
                >
                  {yearGroup.months.map((monthGroup) => (
                    <section
                      key={monthGroup.monthIndex}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: "0 0 auto",
                        gap: 0,
                      }}
                    >
                      <h3
                        style={{
                          color: "#9ca3af",
                          fontSize: "18px",
                          lineHeight: "22px",
                          margin: 0,
                          textAlign: "left",
                        }}
                      >
                        {monthGroup.month}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          paddingTop: "76px",
                        }}
                      >
                        {monthGroup.memories.map((memory) => {
                          const selectionKey = getMemorySelectionKey(memory);
                          const isSelected = isMemorySelected(memory);
                          const isHovered = isNodeHovered(memory);
                          const photoCount = Array.isArray(memory.images)
                            ? memory.images.length
                            : 0;
                          const previewPhotos = (memory.images || [])
                            .slice(0, 3)
                            .filter((photo) => photoSource(photo));
                          const remainingPhotoCount = Math.max(
                            0,
                            photoCount - 3
                          );

                          return (
                            <div
                              aria-label={"Open memory " + memory.title}
                              data-containment-gutter={TIMELINE_FOCUS_CONTAINMENT_GUTTER}
                              data-containment-width={TIMELINE_FOCUS_CONTAINMENT_WIDTH}
                              data-memory-date={memory.date || ""}
                              data-memory-id={memory.id}
                              data-testid={"timeline-memory-" + memory.id}
                              key={memory.id}
                              ref={(element) => {
                                if (element) {
                                  memoryCardRefs.current.set(
                                    selectionKey,
                                    element
                                  );
                                } else {
                                  memoryCardRefs.current.delete(selectionKey);
                                }
                              }}
                              onClick={() => openMemoryDetail(memory)}
                              onKeyDown={(event) => {
                                if (
                                  event.target === event.currentTarget &&
                                  (event.key === "Enter" || event.key === " ")
                                ) {
                                  event.preventDefault();
                                  openMemoryDetail(memory);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              style={{
                                contain: "layout paint style",
                                containIntrinsicSize: `${TIMELINE_FOCUS_CONTAINMENT_WIDTH}px 236px`,
                                contentVisibility: "auto",
                                flexShrink: 0,
                                marginLeft: `-${TIMELINE_FOCUS_CONTAINMENT_GUTTER}px`,
                                marginRight: `-${TIMELINE_FOCUS_CONTAINMENT_GUTTER}px`,
                                minHeight: "236px",
                                overflow: "visible",
                                width: TIMELINE_FOCUS_CONTAINMENT_WIDTH,
                                position: "relative",
                              }}
                            >
                              <div
                                aria-hidden="true"
                                style={{
                                  background: "#6b7280",
                                  height: "52px",
                                  left: "50%",
                                  position: "absolute",
                                  top: "-52px",
                                  transform: "translateX(-50%)",
                                  width: "2px",
                                }}
                              />

                              <button
                                aria-label={`Select ${memory.title}`}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectMemory(memory);
                                }}
                                onMouseEnter={() =>
                                  setNodeHover(memory)
                                }
                                onMouseLeave={() => setHoveredMemory(null)}
                                style={{
                                  background: isSelected ? "#bae6fd" : "#5ec8ff",
                                  border: "3px solid #111827",
                                  borderRadius: "50%",
                                  boxShadow: isHovered
                                    ? "0 0 16px rgba(94, 200, 255, 0.8)"
                                    : "0 0 0 rgba(94, 200, 255, 0)",
                                  cursor: "pointer",
                                  height: "18px",
                                  left: "50%",
                                  padding: 0,
                                  position: "absolute",
                                  top: "-64px",
                                  transform: isHovered
                                    ? "translateX(-50%) scale(1.15)"
                                    : "translateX(-50%) scale(1)",
                                  transition:
                                    "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
                                  width: "18px",
                                  zIndex: 1,
                                }}
                              />

                            <div
                              data-timeline-card-visual="true"
                              style={{
                                background: "#1f2937",
                                borderRadius: "14px",
                                boxSizing: "border-box",
                                minHeight: "164px",
                                padding: "12px",
                                minWidth: 0,
                                margin: "0 auto",
                                width: TIMELINE_FOCUS_TUNING.baseCardWidth,
                                flexShrink: 0,
                                textAlign: "left",
                                overflowWrap: "anywhere",
                                boxShadow: isSelected
                                  ? "0 0 0 2px #5ec8ff, 0 8px 20px rgba(94, 200, 255, 0.2)"
                                  : "0 4px 12px rgba(0,0,0,.25)",
                                transform:
                                  "scale(var(--timeline-focus-scale, " +
                                  TIMELINE_FOCUS_TUNING.minimumScale +
                                  "))",
                                transformOrigin: "center top",
                                transition:
                                  "transform " +
                                  TIMELINE_FOCUS_TUNING.transitionMilliseconds +
                                  "ms ease-out, box-shadow 160ms ease",
                              }}
                            >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2 style={{ fontSize: "16px", lineHeight: 1.25, margin: 0 }}>
                    {memory.title}
                  </h2>

                  {memory.favorite && (
                    <span
                      aria-label="Favorite"
                      style={{ color: "#facc15", fontSize: "16px" }}
                    >
                      ★
                    </span>
                  )}
                </div>

                {memory.date && (
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: "12px",
                      marginTop: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    {formatDateOnly(memory.date)}
                  </p>
                )}

                {isMemoryInTrophyCase(memory) && (
                  <span
                    aria-label="In Trophy Case"
                    style={{
                      color: "#fbbf24",
                      display: "block",
                      fontSize: "10px",
                      marginTop: "6px",
                    }}
                  >
                    Trophy
                  </span>
                )}

                <p
                  style={{
                    display: "none",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                  }}
                >
                  {memory.description}
                </p>

                {Array.isArray(memory.categories) &&
                  memory.categories.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginTop: "16px",
                      }}
                    >
                      {memory.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          style={{
                            background: "#374151",
                            borderRadius: "999px",
                            color: "#d1d5db",
                            fontSize: "10px",
                            padding: "3px 6px",
                          }}
                        >
                          {category}
                        </span>
                      ))}
                      {memory.categories.length > 2 && (
                        <span style={{ color: "#9ca3af", fontSize: "10px" }}>
                          +{memory.categories.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                {previewPhotos.length > 0 && (
                  <div
                    aria-label={photoCount + " photo preview"}
                    data-testid={"timeline-photo-gallery-" + memory.id}
                    style={{
                      display: "grid",
                      gap: "4px",
                      gridTemplateColumns:
                        photoCount === 1
                          ? "1fr"
                          : photoCount === 2
                            ? "repeat(2, 1fr)"
                            : photoCount === 3
                              ? "repeat(3, 1fr)"
                              : "repeat(2, 1fr)",
                      gridTemplateRows:
                        photoCount >= 4 ? "repeat(2, 39px)" : "82px",
                      marginTop: "10px",
                    }}
                  >
                    {previewPhotos.map((img, i) => (
                      <img
                        aria-hidden="true"
                        alt=""
                        data-timeline-gallery-thumbnail="true"
                        key={img.id || i}
                        src={photoSource(img)}
                        style={{
                          borderRadius: "6px",
                          height: "100%",
                          objectFit: "cover",
                          width: "100%",
                        }}
                      />
                    ))}
                    {remainingPhotoCount > 0 && (
                      <div
                        aria-label={remainingPhotoCount + " more photos"}
                        data-testid="timeline-photo-overflow"
                        style={{
                          alignItems: "center",
                          background: "#374151",
                          borderRadius: "6px",
                          color: "#f3f4f6",
                          display: "flex",
                          fontSize: "13px",
                          fontWeight: 700,
                          justifyContent: "center",
                        }}
                      >
                        +{remainingPhotoCount}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "none",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="button"
                    disabled={isMemoryInTrophyCase(memory)}
                    onClick={(event) => {
                      event.stopPropagation();
                      addMemoryToTrophyCase(memory);
                    }}
                    style={{
                      background: isMemoryInTrophyCase(memory) ? "#4b5563" : "#a16207",
                      color: "white",
                      border: "none",
                      minHeight: "44px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: isMemoryInTrophyCase(memory) ? "default" : "pointer",
                    }}
                  >
                    {isMemoryInTrophyCase(memory) ? "In Trophy Case" : "Add to Trophy Case"}
                  </button>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      editMemory(memory.id);
                    }}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (window.confirm("Delete this memory?")) {
                        if (await deleteMemory(memory.id)) clearSelection();
                      }
                    }}
                    style={{
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
              </>
            )}
          </div>
      </div>

      {detailMemory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Memory details for ${detailMemory.title}`}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 9998,
          }}
        >
          <div
            ref={detailPanelRef}
            data-testid="memory-detail-panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#1f2937",
              borderRadius: "16px",
              boxShadow: "0 12px 32px rgba(0,0,0,.45)",
              maxHeight: "90vh",
              maxWidth: "900px",
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: "28px",
              width: "100%",
              overflowWrap: "anywhere",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{detailMemory.title}</h2>
                {detailMemory.date && (
                  <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                    {formatDateOnly(detailMemory.date)}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label={trophySourceTarget ? "Back to Trophy Case" : "Close memory details"}
                onClick={(event) => {
                  event.stopPropagation();
                  closeMemoryDetail();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "28px",
                  lineHeight: 1,
                }}
              >
                {trophySourceTarget ? "Back to Trophy Case" : "×"}
              </button>
            </div>

            <p style={{ lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
              {detailMemory.description}
            </p>

            {Array.isArray(detailMemory.categories) &&
              detailMemory.categories.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "16px",
                  }}
                >
                  {detailMemory.categories.map((category) => (
                    <span
                      key={category}
                      style={{
                        background: "#374151",
                        borderRadius: "999px",
                        color: "#d1d5db",
                        fontSize: "14px",
                        padding: "6px 10px",
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}

            <p style={{ color: "#facc15", marginTop: "20px" }}>
              Favorite: {detailMemory.favorite ? "Yes" : "No"}
            </p>

            {detailMemory.images && detailMemory.images.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <img
                  src={photoSource(detailMemory.images[activeDetailPhotoIndex])}
                  alt={`Memory ${activeDetailPhotoIndex + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedImage(
                      photoSource(detailMemory.images[activeDetailPhotoIndex])
                    );
                  }}
                  style={{
                    borderRadius: "12px",
                    cursor: "pointer",
                    display: "block",
                    height: "360px",
                    objectFit: "contain",
                    width: "100%",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDetailPhotoIndex(
                        (currentIndex) =>
                          (currentIndex - 1 + detailMemory.images.length) %
                          detailMemory.images.length
                      );
                    }}
                    style={{
                      background: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDetailPhotoIndex(
                        (currentIndex) =>
                          (currentIndex + 1) % detailMemory.images.length
                      );
                    }}
                    style={{
                      background: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Next
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    justifyContent: "center",
                    marginTop: "14px",
                  }}
                >
                  {detailMemory.images.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Show photo ${index + 1}`}
                      aria-pressed={activeDetailPhotoIndex === index}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDetailPhotoIndex(index);
                      }}
                      style={{
                        background: "none",
                        border:
                          activeDetailPhotoIndex === index
                            ? "3px solid #5ec8ff"
                            : "3px solid transparent",
                        borderRadius: "10px",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <img
                        src={photoSource(img)}
                        alt={`Memory ${index + 1}`}
                        style={{
                          borderRadius: "7px",
                          display: "block",
                          height: "72px",
                          objectFit: "cover",
                          width: "96px",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                disabled={isMemoryInTrophyCase(detailMemory)}
                onClick={(event) => {
                  event.stopPropagation();
                  addMemoryToTrophyCase(detailMemory);
                }}
                style={{
                  background: isMemoryInTrophyCase(detailMemory) ? "#4b5563" : "#a16207",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: isMemoryInTrophyCase(detailMemory) ? "default" : "pointer",
                  minHeight: "44px",
                  padding: "8px 16px",
                }}
              >
                {isMemoryInTrophyCase(detailMemory) ? "In Trophy Case" : "Add to Trophy Case"}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(detailMemoryId);
                }}
                style={{
                  background: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  padding: "8px 16px",
                }}
              >
                {detailMemory.favorite ? "Remove Favorite" : "Add Favorite"}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (trophySourceTarget) onExitTrophySource?.();
                  setDetailMemoryId(null);
                  editMemory(detailMemoryId);
                }}
                style={{
                  background: "#2563eb",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  padding: "8px 16px",
                }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={async (event) => {
                  event.stopPropagation();
                  if (window.confirm("Delete this memory?")) {
                    if (await deleteMemory(detailMemoryId)) {
                      clearSelection();
                      closeMemoryDetail();
                    }
                  }
                }}
                style={{
                  background: "#dc2626",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  padding: "8px 16px",
                }}
              >
                Delete
              </button>

              {!trophySourceTarget && <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeMemoryDetail();
                }}
                style={{
                  background: "#4b5563",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  padding: "8px 16px",
                }}
              >
                Close
              </button>}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Memory photo viewer"
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "pointer",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "20px",
          }}
        >
          <img
            src={selectedImage}
            alt="Full Size"
            style={{
              maxWidth: "95%",
              maxHeight: "95%",
              borderRadius: "12px",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default HomePage;
