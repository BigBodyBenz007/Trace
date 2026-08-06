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
        {memories.length === 0 ? (
          <p>No memories yet.</p>
        ) : (
          memories
            .slice()
            .reverse()
            .map((memory, index) => (
              <div
                key={index}
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

                {memory.image && (
                  <img
                    src={memory.image}
                    alt="Memory"
                    onClick={() => window.open(memory.image, "_blank")}
                    style={{
                      width: "100%",
                      maxHeight: "500px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      marginTop: "20px",
                      marginBottom: "20px",
                      cursor: "pointer",
                    }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  <button
                    onClick={() =>
                      editMemory(memories.length - 1 - index)
                    }
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
                        deleteMemory(memories.length - 1 - index);
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
            ))
        )}
      </div>
    </div>
  );
}

export default HomePage;