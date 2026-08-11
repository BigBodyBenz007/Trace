import { useEffect, useRef, useState } from "react";
import { CATEGORY_OPTIONS } from "../constants/categories";
import { createMemoryTrophyCandidate } from "../services/trophyCase";

const CATEGORY_FILTER_OPTIONS = [
  "All",
  ...CATEGORY_OPTIONS,
];

function photoSource(photo) {
  return typeof photo === "string" ? photo : photo?.url;
}

function getTimelineDate(memory, currentDay) {
  if (!memory.date) return currentDay;

  const date = new Date(`${memory.date}T00:00:00`);
  return Number.isNaN(date.getTime()) ? currentDay : date;
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

function HomePage({
  memoryCount,
  memories,
  toggleFavorite,
  onAddMemory,
  onOpenNutrition,
  onOpenMedications,
  onOpenProtocols,
  onOpenWorkouts,
  onOpenTrophyCase,
  deleteMemory,
  editMemory,
  trophyEntries = [],
  addTrophyCaseEntry = () => false,
  memoryAchievementSuggestion = null,
  dismissMemoryAchievementSuggestion = () => {},
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [detailMemoryId, setDetailMemoryId] = useState(null);
  const [activeDetailPhotoIndex, setActiveDetailPhotoIndex] = useState(0);
  const [hoveredMemory, setHoveredMemory] = useState(null);
  const timelineRef = useRef(null);
  const hasScrolledToNewest = useRef(false);
  const memoryCardRefs = useRef(new Map());
  const currentDay = new Date();
  currentDay.setHours(0, 0, 0, 0);

  const filteredMemories = memories
    .filter((memory) => {
      const text = `${memory.title} ${memory.description}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" ||
        (Array.isArray(memory.categories) &&
          memory.categories.includes(selectedCategory));
      const matchesFavorite =
        favoriteFilter === "all" || memory.favorite === true;

      return matchesSearch && matchesCategory && matchesFavorite;
    })
    .sort(
      (a, b) =>
        getTimelineDate(a, currentDay) - getTimelineDate(b, currentDay)
    );
  const timelineGroups = groupMemoriesByDate(filteredMemories, currentDay);
  const detailMemory =
    detailMemoryId === null
      ? null
      : memories.find((memory) => memory.id === detailMemoryId);
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

  function selectMemory(memory) {
    const selectionKey = getMemorySelectionKey(memory);
    setSelectedMemory(selectionKey);
    scrollMemoryIntoView(selectionKey);
  }

  function openMemoryDetail(memory) {
    selectMemory(memory);
    setActiveDetailPhotoIndex(0);
    setDetailMemoryId(memory.id);
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
    if (
      hasScrolledToNewest.current ||
      memories.length === 0 ||
      !timelineRef.current
    ) {
      return;
    }

    timelineRef.current.scrollLeft = Math.max(
      0,
      timelineRef.current.scrollWidth - timelineRef.current.clientWidth
    );
    hasScrolledToNewest.current = true;
  }, [memories.length]);

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
        Health & Nutrition
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
        <input
          style={{ ...inputStyle, flex: "1 1 280px" }}
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          aria-label="Filter memories by category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
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
          onChange={(e) => setFavoriteFilter(e.target.value)}
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
        ref={timelineRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: "20px",
          overflowX: "auto",
        }}
      >
        {filteredMemories.length === 0 ? (
          <p>No memories found.</p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "64px",
              padding: "8px 32px 16px",
              position: "relative",
              width: "max-content",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                background: "#6b7280",
                height: "3px",
                left: "32px",
                position: "absolute",
                right: "32px",
                top: "118px",
              }}
            />

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

                          return (
                            <div
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
                              style={{
                                flexShrink: 0,
                                width:
                                  "clamp(280px, calc(100vw - 64px), 320px)",
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
                              style={{
                                background: "#1f2937",
                                borderRadius: "16px",
                                padding: "20px",
                                minWidth: 0,
                                width: "100%",
                                flexShrink: 0,
                                textAlign: "left",
                                overflowWrap: "anywhere",
                                boxShadow: isSelected
                                  ? "0 0 0 2px #5ec8ff, 0 8px 20px rgba(94, 200, 255, 0.2)"
                                  : "0 4px 12px rgba(0,0,0,.25)",
                                transition: "box-shadow 160ms ease",
                              }}
                            >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    {memory.title}
                  </h2>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(memory.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "30px",
                      cursor: "pointer",
                    }}
                  >
                    {memory.favorite ? "⭐" : "☆"}
                  </button>
                </div>

                {memory.date && (
                  <p
                    style={{
                      color: "#9ca3af",
                      marginTop: "8px",
                      marginBottom: "15px",
                    }}
                  >
                    {new Date(memory.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}

                <p
                  style={{
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
                      {memory.categories.map((category) => (
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

                {memory.images && memory.images.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    {memory.images.map((img, i) =>
                      photoSource(img) ? (
                        <img
                          key={img.id || i}
                          src={photoSource(img)}
                          alt={`Memory ${i + 1}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedImage(photoSource(img));
                          }}
                          style={{
                            width: "100%",
                            height: "140px",
                            objectFit: "cover",
                            borderRadius: "10px",
                            cursor: "pointer",
                          }}
                        />
                      ) : (
                        <div key={img.id || i} style={{ color: "#fca5a5" }}>
                          Photo unavailable
                        </div>
                      )
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
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
          </div>
        )}
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
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#1f2937",
              borderRadius: "16px",
              boxShadow: "0 12px 32px rgba(0,0,0,.45)",
              maxHeight: "90vh",
              maxWidth: "900px",
              overflowY: "auto",
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
                    {new Date(detailMemory.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Close memory details"
                onClick={(event) => {
                  event.stopPropagation();
                  setDetailMemoryId(null);
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
                ×
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
                      setDetailMemoryId(null);
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

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDetailMemoryId(null);
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
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
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
