import { useState } from "react";

function HomePage({
  memoryCount,
  memories,
  onAddMemory,
  deleteMemory,
  editMemory,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState("");

  const filteredMemories = memories.filter((memory) => {
    const text = `${memory.title} ${memory.description}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

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
        style={{
          width: "600px",
          maxWidth: "95%",
          marginTop: "20px",
        }}
      >
        {filteredMemories.length === 0 ? (
          <p>No memories found.</p>
        ) : (
          filteredMemories
            .slice()
            .reverse()
            .map((memory) => {
              const originalIndex = memories.indexOf(memory);

              return (
                <div
                  key={originalIndex}
                  style={{
                    background: "#1f2937",
                    borderRadius: "16px",
                    padding: "20px",
                    marginBottom: "20px",
                    textAlign: "left",
                    boxShadow: "0 4px 12px rgba(0,0,0,.25)",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    {memory.title}
                  </h2>

                  {memory.date && (
                    <p
                      style={{
                        color: "#9ca3af",
                        marginTop: "-5px",
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
              );
            })
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