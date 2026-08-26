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
import { getLifeCurrentTheme } from "../services/lifeCurrentThemes";
import {
  calculateTimelineFocusScale,
  TIMELINE_FOCUS_TUNING,
} from "../services/timelineFocus";
import LifeCurrent, { LifeCurrentScenery } from "./LifeCurrent";
import { LIFE_CURRENT_TRAIL_TUNING } from "./LifeCurrent";
import StoredPhoto, { storedPhotoId } from "./StoredPhoto";
import { PHOTO_LOAD_PRIORITY } from "../services/photoUrlLoader";
import { acquireDocumentScrollLock } from "../services/documentScrollLock";
import {
  homeModulesInGroup,
  normalizeHomeVisibility,
} from "../services/homeModules";

const CATEGORY_FILTER_OPTIONS = [
  "All",
  ...CATEGORY_OPTIONS,
];
const TIMELINE_FOCUS_CONTAINMENT_WIDTH = Math.ceil(
  TIMELINE_FOCUS_TUNING.baseCardWidth * TIMELINE_FOCUS_TUNING.maximumScale
);
const TIMELINE_FOCUS_CONTAINMENT_GUTTER =
  (TIMELINE_FOCUS_CONTAINMENT_WIDTH - TIMELINE_FOCUS_TUNING.baseCardWidth) / 2;

function useDocumentScrollLock(
  locked,
  scrollOrigin = null,
  unlockScrollTargetRef = null
) {
  const latestUnlockScrollTargetRef = useRef(unlockScrollTargetRef);
  latestUnlockScrollTargetRef.current = unlockScrollTargetRef;

  useEffect(() => {
    if (!locked) return undefined;

    const scrollX = scrollOrigin?.documentScrollX ?? window.scrollX ?? window.pageXOffset ?? 0;
    const scrollY = scrollOrigin?.documentScrollY ?? window.scrollY ?? window.pageYOffset ?? 0;
    const releaseLock = acquireDocumentScrollLock({ mode: "fixed", scrollX, scrollY });

    return () => {
      releaseLock();
      const unlockScrollTarget = latestUnlockScrollTargetRef.current?.current;
      if (unlockScrollTarget) {
        unlockScrollTarget.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (scrollX !== 0 || scrollY !== 0) {
        window.scrollTo(scrollX, scrollY);
      }
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

function MemorySearchInput({ className, search, setSearch, style }) {
  const [inputValue, setInputValue] = useState(search);
  const [, startTransition] = useTransition();

  useEffect(() => setInputValue(search), [search]);

  return (
    <input
      className={className}
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

function TimelinePhotoGallery({
  active,
  eager,
  memory,
  photoLoader,
  priority,
  timelineRef,
}) {
  const galleryRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const previewPhotos = (memory.images || []).slice(0, 3);
  const photoCount = memory.images?.length || 0;
  const remainingPhotoCount = Math.max(0, photoCount - 3);

  useEffect(() => {
    if (!active) return undefined;
    if (eager || shouldLoad) {
      if (eager) setShouldLoad(true);
      return undefined;
    }

    const gallery = galleryRef.current;
    const viewport = timelineRef.current;
    if (!gallery || !viewport || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { root: viewport, rootMargin: "0px 480px" });
    observer.observe(gallery);
    return () => observer.disconnect();
  }, [active, eager, shouldLoad, timelineRef]);

  if (previewPhotos.length === 0) return null;

  return (
    <div
      aria-label={photoCount + " photo preview"}
      className="trace-timeline-photo-gallery"
      data-testid={"timeline-photo-gallery-" + memory.id}
      ref={galleryRef}
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
        gridTemplateRows: photoCount >= 4 ? "repeat(2, 39px)" : "82px",
        marginTop: "10px",
      }}
    >
      {previewPhotos.map((photo, index) => (
        <div
          className="timeline-photo-slot trace-timeline-photo-slot"
          data-timeline-photo-slot="true"
          key={storedPhotoId(photo) || index}
          style={{
            background: "#24384a",
            borderRadius: "6px",
            height: "100%",
            minWidth: 0,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <StoredPhoto
            aria-hidden="true"
            alt=""
            data-timeline-gallery-thumbnail="true"
            enabled={shouldLoad}
            loader={photoLoader}
            photo={photo}
            placeholder={(
              <span
                aria-hidden="true"
                className="trace-timeline-photo-placeholder"
                data-timeline-photo-placeholder="true"
                style={{ display: "block", height: "100%", width: "100%" }}
              />
            )}
            priority={priority}
            style={{
              borderRadius: "6px",
              display: "block",
              height: "100%",
              objectFit: "cover",
              width: "100%",
            }}
          />
        </div>
      ))}
      {remainingPhotoCount > 0 && (
        <div
          aria-label={remainingPhotoCount + " more photos"}
          className="trace-timeline-photo-overflow"
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
  );
}

function HomePage({
  active = true,
  inactiveScrollTargetRef = null,
  memoryCount,
  memories,
  photoLoader,
  timelineTargetMemoryId = null,
  onTimelineTargetShown = () => {},
  toggleFavorite,
  onAddMemory,
  onOpenNutrition,
  onOpenHealth,
  onOpenSettings,
  onOpenMedications,
  onOpenProtocols,
  onOpenToday,
  onOpenWorkouts,
  onOpenTrophyCase,
  onOpenJournal,
  deleteMemory,
  editMemory,
  trophyEntries = [],
  nutritionEntries = [],
  healthMeasurementEntries = [],
  workoutEntries = [],
  medicationEntries = [],
  journalEntries = [],
  lifeCurrentThemeId = "river",
  homeVisibility,
  addTrophyCaseEntry = () => false,
  memoryAchievementSuggestion = null,
  dismissMemoryAchievementSuggestion = () => {},
  containerStyle,
  trophySourceTarget = null,
  onReturnToTrophyCase = null,
  onExitTrophySource = null,
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isNarrowPhotoViewport, setIsNarrowPhotoViewport] = useState(
    () => window.innerWidth <= 600 && window.innerHeight >= window.innerWidth
  );
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [timelinePosition, setTimelinePosition] = useState("present");
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [detailMemoryId, setDetailMemoryId] = useState(null);
  const [activeDetailPhotoIndex, setActiveDetailPhotoIndex] = useState(0);
  const [hoveredMemory, setHoveredMemory] = useState(null);
  const [filteredCameraDate, setFilteredCameraDate] = useState(null);
  const lifeCurrentTheme = getLifeCurrentTheme(lifeCurrentThemeId);
  const visibleHomeModules = normalizeHomeVisibility(homeVisibility);
  const lifeCurrentColors = lifeCurrentTheme.presentation.colors;
  const timelineRef = useRef(null);
  const timelineFocusFrameRef = useRef(null);
  const timelineFocusedCardRef = useRef(null);
  const visibleTimelineCardsRef = useRef(new Set());
  const detailOriginScrollRef = useRef(null);
  const filterOriginRef = useRef(null);
  const restoreFilterOriginRef = useRef(false);
  const filteredCameraDateRef = useRef(null);
  const timelinePositionRequestRef = useRef(true);
  const memoryCardRefs = useRef(new Map());
  const detailPanelRef = useRef(null);
  const homeModuleHandlers = {
    schedule: onOpenToday,
    nutrition: onOpenNutrition,
    health: onOpenHealth,
    workouts: onOpenWorkouts,
    medications: onOpenMedications,
    protocols: onOpenProtocols,
  };
  const visibleCoreModules = homeModulesInGroup("core")
    .filter(({ id }) => visibleHomeModules[id]);
  const visibleSecondaryModules = homeModulesInGroup("secondary")
    .filter(({ id }) => visibleHomeModules[id]);
  useEffect(() => {
    if (!active) return undefined;
    const updatePhotoViewerLayout = () => {
      setIsNarrowPhotoViewport(
        window.innerWidth <= 600 && window.innerHeight >= window.innerWidth
      );
    };
    window.addEventListener("resize", updatePhotoViewerLayout);
    return () => window.removeEventListener("resize", updatePhotoViewerLayout);
  }, [active]);
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
        journalEntries,
        trophyCaseEntries: trophyEntries,
      }),
    [memories, nutritionEntries, healthMeasurementEntries, workoutEntries, medicationEntries, journalEntries, trophyEntries]
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
  const timelineMemories = isMemoryFilterActive ? filteredMemories : sortedMemories;
  const timelineMemoryIndexById = useMemo(
    () => new Map(timelineMemories.map((memory, index) => [memory.id, index])),
    [timelineMemories]
  );
  const photoPriorityAnchorId = timelineTargetMemoryId || (
    isMemoryFilterActive
      ? timelineMemories[0]?.id
      : timelineMemories[timelinePosition === "past" ? 0 : timelineMemories.length - 1]?.id
  );
  const photoPriorityAnchorIndex = timelineMemoryIndexById.get(photoPriorityAnchorId);
  const timelineFocusKey = filteredMemories.map(({ id }) => id).join("|");
  const detailMemory =
    detailMemoryId === null
      ? null
      : memories.find((memory) => memory.id === detailMemoryId);
  useDocumentScrollLock(
    active && Boolean(detailMemory || selectedImageIndex !== null),
    detailOriginScrollRef.current,
    !active && detailMemory ? inactiveScrollTargetRef : null
  );
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
    if (!active) return undefined;
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
      let focusedCard = null;
      let focusedCardDistance = Infinity;
      Array.from(cards).forEach((card) => {
        const bounds = card.getBoundingClientRect();
        const cardCenter = bounds.left + bounds.width / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < focusedCardDistance) {
          focusedCardDistance = distance;
          focusedCard = card;
        }
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
      if (timelineFocusedCardRef.current !== focusedCard) {
        timelineFocusedCardRef.current?.removeAttribute("data-timeline-focused");
        focusedCard?.setAttribute("data-timeline-focused", "true");
        timelineFocusedCardRef.current = focusedCard;
      }
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
  }, [active, isMemoryFilterActive, timelineFocusKey]);

  useEffect(() => {
    if (!active || !isMemoryFilterActive || filteredMemories.length === 0) return;
    const firstDated = filteredMemories.find(({ date }) => /^\d{4}-\d{2}-\d{2}$/.test(String(date || "")));
    if (firstDated && !filteredCameraDateRef.current) {
      filteredCameraDateRef.current = firstDated.date;
      setFilteredCameraDate(firstDated.date);
    }
  }, [active, filteredMemories, isMemoryFilterActive]);

  useEffect(() => {
    if (!active || isMemoryFilterActive || !restoreFilterOriginRef.current) return undefined;
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
  }, [active, isMemoryFilterActive, timelineFocusKey]);

  useEffect(() => {
    if (!active || !/^\d{4}$/.test(search.trim())) return undefined;
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
  }, [active, filteredMemories, search]);

  useEffect(() => {
    if (!active || !trophySourceTarget?.memoryId) return undefined;
    const memory = memories.find(({ id }) => id === trophySourceTarget.memoryId);
    if (!memory) return undefined;
    setSelectedMemory(memory.id);
    setActiveDetailPhotoIndex(0);
    setDetailMemoryId(memory.id);
    const frame = window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, memories, trophySourceTarget]);

  useEffect(() => {
    if (!active || !timelinePositionRequestRef.current || isMemoryFilterActive || sortedMemories.length === 0) return undefined;
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
  }, [active, isMemoryFilterActive, sortedMemories, timelinePosition]);

  useEffect(() => {
    if (!active || !timelineTargetMemoryId) return undefined;
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
  }, [active, memories, onTimelineTargetShown, timelineTargetMemoryId]);

  return (
    <div
      aria-hidden={active ? undefined : "true"}
      className="trace-home-page"
      data-testid="home-page"
      hidden={!active}
      inert={!active}
      style={{ ...containerStyle, fontFamily: "var(--trace-font-sans)" }}
    >
      <div className="trace-home-intro" data-safe-area-context="body-inset">
        <header className="trace-home-top" data-layout="centered-branding">
          <div className="trace-home-identity">
            <p className="trace-home-kicker">A record of a life in motion</p>
            <h1>Trace</h1>
            <p className="trace-home-tagline">Your timeline. Your story.</p>
          </div>
        </header>
        <aside className="trace-home-utilities" aria-label="Personal and settings" data-layout="independent-utility-frame">
          <button type="button" className="trace-settings-button" data-utility-position="left" aria-label="Settings" onClick={onOpenSettings} title="Settings">⚙</button>
          {(visibleHomeModules.journal || visibleHomeModules.trophyCase) && (
          <div className="trace-journal-shelf" data-utility-position="right" data-testid="story-achievements-actions">
            {visibleHomeModules.journal && <button type="button" className="trace-journal-button" aria-label="Open Journal" onClick={onOpenJournal}>
              <svg aria-hidden="true" viewBox="0 0 36 36" fill="none">
                <path d="M8.5 5.5h18A2.5 2.5 0 0 1 29 8v22H11a4 4 0 0 1-4-4V7a1.5 1.5 0 0 1 1.5-1.5Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11.5 5.5v24M11 24.5h18M16 12h8M16 17h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
              <span className="trace-utility-button__copy">
                <span className="trace-utility-button__eyebrow">Your story</span>
                <span className="trace-utility-button__label">Journal</span>
              </span>
            </button>}
            {visibleHomeModules.trophyCase && <button type="button" className="trace-trophy-button" aria-label="Open Trophy Case" onClick={onOpenTrophyCase}>
              <svg aria-hidden="true" viewBox="0 0 36 36" fill="none">
                <path d="M12 7.5h12v5.75c0 4.1-2.5 7.25-6 7.25s-6-3.15-6-7.25V7.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/>
                <path d="M12 10H8.5v2.25c0 3 1.65 4.75 4.5 5.25M24 10h3.5v2.25c0 3-1.65 4.75-4.5 5.25M18 20.5V26M13.5 29h9M15 26h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/>
                <path d="m18 10.25.9 1.85 2.05.3-1.48 1.44.35 2.04L18 14.92l-1.82.96.35-2.04-1.48-1.44 2.05-.3.9-1.85Z" fill="currentColor"/>
              </svg>
              <span className="trace-utility-button__copy">
                <span className="trace-utility-button__eyebrow">Achievements</span>
                <span className="trace-utility-button__label">Trophy Case</span>
              </span>
            </button>}
          </div>
          )}
        </aside>
      </div>

      <nav className="trace-feature-navigation" aria-label="Trace features">
        <div className="trace-feature-navigation__primary">
          <button className="trace-feature-action trace-feature-action--primary" type="button" onClick={onAddMemory}>
            Add Memory
          </button>
        </div>

        {visibleCoreModules.length > 0 && (
          <div className="trace-feature-navigation__core">
            {visibleCoreModules.map((module) => (
              <button className="trace-feature-action trace-feature-action--core" key={module.id} type="button" onClick={homeModuleHandlers[module.id]}>
                {module.label}
              </button>
            ))}
          </div>
        )}

        {visibleSecondaryModules.length > 0 && (
          <div className="trace-feature-navigation__secondary">
            {visibleSecondaryModules.map((module) => (
              <button className="trace-feature-action" key={module.id} type="button" onClick={homeModuleHandlers[module.id]}>
                {module.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {memoryAchievementSuggestion &&
        !isMemoryInTrophyCase(memoryAchievementSuggestion.memory) && (
          <section
            className="trace-achievement-suggestion"
            aria-label="Memory achievement suggestion"
            aria-live="polite"
          >
            <strong style={{ display: "block" }}>
              This sounds like an achievement. Would you like to add it to your Trophy Case?
            </strong>
            <span className="trace-achievement-suggestion__memory">
              {memoryAchievementSuggestion.memory.title}
            </span>
            <div className="trace-achievement-suggestion__actions">
              <button
                className="trace-small-action trace-small-action--brass"
                type="button"
                onClick={() => addMemoryToTrophyCase(memoryAchievementSuggestion.memory)}
              >
                Add to Trophy Case
              </button>
              <button
                className="trace-small-action"
                type="button"
                onClick={dismissMemoryAchievementSuggestion}
              >
                Not this time
              </button>
            </div>
          </section>
        )}

      <section className="trace-timeline-section" aria-labelledby="trace-timeline-heading">
        <div className="trace-timeline-section__heading">
          <p>Your archive</p>
          <h2 id="trace-timeline-heading">Memories Added: {memoryCount}</h2>
        </div>

        <div className="trace-timeline-toolbar">
          <div className="trace-timeline-position" aria-label="Timeline position">
            <button className="trace-position-button" type="button" aria-pressed={timelinePosition === "past"} onClick={() => { timelinePositionRequestRef.current = true; setTimelinePosition("past"); }}>Past</button>
            <button className="trace-position-button" type="button" aria-pressed={timelinePosition === "present"} onClick={() => { timelinePositionRequestRef.current = true; setTimelinePosition("present"); }}>Present</button>
          </div>

          <div className="trace-memory-filters">
            <MemorySearchInput
              className="trace-memory-filter trace-memory-filter--search"
              search={search}
              setSearch={updateSearch}
            />

            <select
              className="trace-memory-filter"
              aria-label="Filter memories by category"
              value={selectedCategory}
              onChange={(e) => updateCategory(e.target.value)}
            >
              {CATEGORY_FILTER_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              className="trace-memory-filter"
              aria-label="Filter memories by favorites"
              value={favoriteFilter}
              onChange={(e) => updateFavoriteFilter(e.target.value)}
            >
              <option value="all">All Memories</option>
              <option value="favorites">Favorites Only</option>
            </select>
          </div>
        </div>

      <div
        className={`life-current-theme ${lifeCurrentTheme.presentation.className}`}
        data-life-current-theme={lifeCurrentTheme.id}
        data-testid="memory-timeline-viewport"
        ref={timelineRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: "var(--trace-space-5)",
          overflowX: "auto",
          position: "relative",
        }}
      >
        <LifeCurrentScenery
          active={active}
          layout={filteredLifeCurrentLayout}
          themeId={lifeCurrentTheme.id}
          viewportRef={timelineRef}
        />
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
            <LifeCurrent layout={filteredLifeCurrentLayout} themeId={lifeCurrentTheme.id} />
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
              <LifeCurrent layout={lifeCurrentLayout} showQuietTrail themeId={lifeCurrentTheme.id} />
            )}
            {lifeCurrentLayout.points.length === 0 && filteredMemories.length > 0 && <div
              aria-hidden="true"
              style={{
                background: lifeCurrentColors.fallback,
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
                    color: lifeCurrentColors.year,
                    fontSize: "34px",
                    fontWeight: 800,
                    lineHeight: "40px",
                    margin: 0,
                    position: "relative",
                    textAlign: "left",
                    zIndex: 1,
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
                          color: lifeCurrentColors.month,
                          fontSize: "18px",
                          lineHeight: "22px",
                          margin: 0,
                          position: "relative",
                          textAlign: "left",
                          zIndex: 1,
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
                          const memoryIndex = timelineMemoryIndexById.get(memory.id);
                          const photoDistance = Number.isInteger(memoryIndex) &&
                            Number.isInteger(photoPriorityAnchorIndex)
                            ? Math.abs(memoryIndex - photoPriorityAnchorIndex)
                            : Number.POSITIVE_INFINITY;
                          const photoPriority = photoDistance === 0
                            ? PHOTO_LOAD_PRIORITY.centered
                            : photoDistance <= 2
                              ? PHOTO_LOAD_PRIORITY.nearby
                              : PHOTO_LOAD_PRIORITY.visible;

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
                                  background: lifeCurrentColors.stem,
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
                                  background: isSelected ? lifeCurrentColors.selectedNode : lifeCurrentColors.node,
                                  border: `3px solid ${lifeCurrentColors.nodeBorder}`,
                                  borderRadius: "50%",
                                  boxShadow: isHovered
                                    ? `0 0 16px ${lifeCurrentColors.nodeGlow}`
                                    : "0 0 0 transparent",
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
                                background: lifeCurrentColors.card,
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
                                  ? `0 0 0 2px ${lifeCurrentColors.selectedCardRing}, 0 8px 20px ${lifeCurrentColors.selectedCardGlow}`
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

                {photoCount > 0 && (
                  <TimelinePhotoGallery
                    active={active}
                    eager={photoDistance <= 2}
                    memory={memory}
                    photoLoader={photoLoader}
                    priority={photoPriority}
                    timelineRef={timelineRef}
                  />
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
      </section>

      {active && detailMemory && (
        <div
          className="trace-memory-detail"
          role="dialog"
          aria-modal="true"
          aria-label={`Memory details for ${detailMemory.title}`}
        >
          <div
            className="trace-memory-detail__folio"
            ref={detailPanelRef}
            data-testid="memory-detail-panel"
            tabIndex="-1"
            onClick={(event) => event.stopPropagation()}
            style={{
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <div className="trace-memory-detail__header">
              <div className="trace-memory-detail__identity">
                <p className="trace-memory-detail__kicker">Memory record</p>
                <h2 className="trace-memory-detail__title">{detailMemory.title}</h2>
                {detailMemory.date && (
                  <p className="trace-memory-detail__date">
                    {formatDateOnly(detailMemory.date)}
                  </p>
                )}
              </div>

              <button
                className="trace-memory-detail__dismiss"
                type="button"
                aria-label={trophySourceTarget ? "Back to Trophy Case" : "Close memory details"}
                onClick={(event) => {
                  event.stopPropagation();
                  closeMemoryDetail();
                }}
              >
                {trophySourceTarget ? "Back to Trophy Case" : "×"}
              </button>
            </div>

            <p className="trace-memory-detail__description">
              {detailMemory.description}
            </p>

            {Array.isArray(detailMemory.categories) &&
              detailMemory.categories.length > 0 && (
                <div className="trace-memory-detail__categories">
                  {detailMemory.categories.map((category) => (
                    <span className="trace-memory-detail__category" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              )}

            <p className="trace-memory-detail__favorite-state">
              Favorite: {detailMemory.favorite ? "Yes" : "No"}
            </p>

            {detailMemory.images && detailMemory.images.length > 0 && (
              <section className="trace-memory-detail__photos" aria-label="Memory photographs">
                <StoredPhoto
                  alt={`Memory ${activeDetailPhotoIndex + 1}`}
                  className="trace-memory-detail__hero-photo"
                  enabled
                  loader={photoLoader}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedImageIndex(activeDetailPhotoIndex);
                  }}
                  photo={detailMemory.images[activeDetailPhotoIndex]}
                  placeholder={(
                    <div
                      aria-hidden="true"
                      className="trace-memory-detail__hero-photo trace-memory-detail__photo-placeholder"
                      data-memory-detail-photo-placeholder="true"
                    />
                  )}
                  priority={PHOTO_LOAD_PRIORITY.detail}
                />

                <div className="trace-memory-detail__photo-navigation">
                  <button
                    className="trace-memory-detail__photo-step"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDetailPhotoIndex(
                        (currentIndex) =>
                          (currentIndex - 1 + detailMemory.images.length) %
                          detailMemory.images.length
                      );
                    }}
                  >
                    Previous
                  </button>

                  <button
                    className="trace-memory-detail__photo-step"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDetailPhotoIndex(
                        (currentIndex) =>
                          (currentIndex + 1) % detailMemory.images.length
                      );
                    }}
                  >
                    Next
                  </button>
                </div>

                <div className="trace-memory-detail__thumbnails">
                  {detailMemory.images.map((img, index) => (
                    <button
                      className="trace-memory-detail__thumbnail-button"
                      key={index}
                      type="button"
                      aria-label={`Show photo ${index + 1}`}
                      aria-pressed={activeDetailPhotoIndex === index}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDetailPhotoIndex(index);
                      }}
                    >
                      <StoredPhoto
                        alt={`Memory ${index + 1}`}
                        className="trace-memory-detail__thumbnail"
                        enabled
                        loader={photoLoader}
                        photo={img}
                        placeholder={(
                          <span
                            aria-hidden="true"
                            className="trace-memory-detail__thumbnail trace-memory-detail__thumbnail-placeholder"
                            data-memory-detail-thumbnail-placeholder="true"
                          />
                        )}
                        priority={PHOTO_LOAD_PRIORITY.detail}
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="trace-memory-detail__actions">
              <button
                className="trace-memory-detail__action trace-memory-detail__action--trophy"
                type="button"
                disabled={isMemoryInTrophyCase(detailMemory)}
                onClick={(event) => {
                  event.stopPropagation();
                  addMemoryToTrophyCase(detailMemory);
                }}
              >
                {isMemoryInTrophyCase(detailMemory) ? "In Trophy Case" : "Add to Trophy Case"}
              </button>

              <button
                className="trace-memory-detail__action trace-memory-detail__action--favorite"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(detailMemoryId);
                }}
              >
                {detailMemory.favorite ? "Remove Favorite" : "Add Favorite"}
              </button>

              <button
                className="trace-memory-detail__action trace-memory-detail__action--edit"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedImageIndex(null);
                  if (trophySourceTarget) {
                    onExitTrophySource?.();
                    setDetailMemoryId(null);
                    editMemory(detailMemoryId, { retainHome: false });
                  } else {
                    editMemory(detailMemoryId, { retainHome: true });
                  }
                }}
              >
                Edit
              </button>

              <button
                className="trace-memory-detail__action trace-memory-detail__action--delete"
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
              >
                Delete
              </button>

              {!trophySourceTarget && <button
                className="trace-memory-detail__action trace-memory-detail__action--close"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeMemoryDetail();
                }}
              >
                Close
              </button>}
            </div>
          </div>
        </div>
      )}

      {active && selectedImageIndex !== null && detailMemory && (
        <div
          className="trace-memory-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Memory photo viewer"
          onClick={() => setSelectedImageIndex(null)}
          style={{
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          <button className="trace-memory-viewer__close" type="button" aria-label="Close photo viewer" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setSelectedImageIndex(null); }}>×</button>
          <div className="trace-memory-viewer__content" data-testid="memory-photo-viewer-content" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { event.currentTarget.dataset.touchX = event.clientX; }} onPointerUp={(event) => { const start = Number(event.currentTarget.dataset.touchX); const delta = event.clientX - start; if (Math.abs(delta) < 50) return; setSelectedImageIndex((index) => Math.max(0, Math.min(detailMemory.images.length - 1, index + (delta < 0 ? 1 : -1)))); }} style={{ flexDirection: isNarrowPhotoViewport ? "column" : "row" }}>
            {!isNarrowPhotoViewport && detailMemory.images.length > 1 && <button className="trace-memory-viewer__step" type="button" aria-label="Previous photo" disabled={selectedImageIndex === 0} onClick={() => setSelectedImageIndex((index) => index - 1)}>Previous</button>}
            <div className="trace-memory-viewer__photo-frame" style={{ width: isNarrowPhotoViewport ? "100%" : undefined }}>
              <StoredPhoto
                alt={`Memory ${selectedImageIndex + 1} enlarged`}
                className="trace-memory-viewer__photo"
                enabled
                loader={photoLoader}
                photo={detailMemory.images[selectedImageIndex]}
                placeholder={<span aria-hidden="true" className="trace-memory-viewer__photo trace-memory-viewer__placeholder" data-memory-viewer-photo-placeholder="true" />}
                priority={PHOTO_LOAD_PRIORITY.detail}
                style={{ maxWidth: "100%" }}
              />
              {!isNarrowPhotoViewport && detailMemory.images.length > 1 && <p className="trace-memory-viewer__position" aria-live="polite">{selectedImageIndex + 1} of {detailMemory.images.length}</p>}
            </div>
            {!isNarrowPhotoViewport && detailMemory.images.length > 1 && <button className="trace-memory-viewer__step" type="button" aria-label="Next photo" disabled={selectedImageIndex === detailMemory.images.length - 1} onClick={() => setSelectedImageIndex((index) => index + 1)}>Next</button>}
            {isNarrowPhotoViewport && detailMemory.images.length > 1 && <div className="trace-memory-viewer__mobile-navigation"><button className="trace-memory-viewer__step" type="button" aria-label="Previous photo" disabled={selectedImageIndex === 0} onClick={() => setSelectedImageIndex((index) => index - 1)}>Previous</button><p className="trace-memory-viewer__position" aria-live="polite">{selectedImageIndex + 1} of {detailMemory.images.length}</p><button className="trace-memory-viewer__step" type="button" aria-label="Next photo" disabled={selectedImageIndex === detailMemory.images.length - 1} onClick={() => setSelectedImageIndex((index) => index + 1)}>Next</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
