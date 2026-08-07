import { useEffect, useRef, useState } from "react";

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

function HomePage({
  memoryCount,
  memories,
  toggleFavorite,
  onAddMemory,
  deleteMemory,
  editMemory,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState("");
  const timelineRef = useRef(null);
  const hasScrolledToNewest = useRef(false);
  const currentDay = new Date();
  currentDay.setHours(0, 0, 0, 0);

  const filteredMemories = memories
    .filter((memory) => {
      const text = `${memory.title} ${memory.description}`.toLowerCase();
      return text.includes(search.toLowerCase());
    })
    .sort(
      (a, b) =>
        getTimelineDate(a, currentDay) - getTimelineDate(b, currentDay)
    );
  const timelineGroups = groupMemoriesByDate(filteredMemories, currentDay);

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

      <br />
      <br />

      <input
        style={inputStyle}
        type="text"
        placeholder="Search memories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
                top: "108px",
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
                  gap: "20px",
                  paddingLeft: yearIndex === 0 ? 0 : "48px",
                }}
              >
                <h2
                  style={{
                    color: "#e5e7eb",
                    fontSize: "28px",
                    lineHeight: "34px",
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
                          const originalIndex = memories.indexOf(memory);

                          return (
                            <div
                              key={originalIndex}
                              style={{
                                flexShrink: 0,
                                minWidth: "320px",
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

                              <div
                                aria-hidden="true"
                                style={{
                                  background: "#5ec8ff",
                                  border: "3px solid #111827",
                                  borderRadius: "50%",
                                  height: "18px",
                                  left: "50%",
                                  position: "absolute",
                                  top: "-64px",
                                  transform: "translateX(-50%)",
                                  width: "18px",
                                  zIndex: 1,
                                }}
                              />

                            <div
                              style={{
                                background: "#1f2937",
                                borderRadius: "16px",
                                padding: "20px",
                                minWidth: "320px",
                                flexShrink: 0,
                                textAlign: "left",
                                boxShadow: "0 4px 12px rgba(0,0,0,.25)",
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
                    onClick={() => toggleFavorite(originalIndex)}
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
                    {memory.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Memory ${i + 1}`}
                        onClick={() => setSelectedImage(img)}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    onClick={() => editMemory(originalIndex)}
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
                    onClick={() => {
                      if (window.confirm("Delete this memory?")) {
                        deleteMemory(originalIndex);
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
