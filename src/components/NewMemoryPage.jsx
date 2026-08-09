import { CATEGORY_OPTIONS } from "../constants/categories";

function NewMemoryPage({
  title,
  setTitle,
  description,
  setDescription,
  date,
  setDate,
  categories,
  setCategories,
  images,
  setImages,
  saveMemory,
  inputStyle,
  buttonStyle,
  containerStyle,
  setPage,
  editingIndex,
  setEditingIndex,
}) {
  function cancelMemory() {
    const hasUnsavedContent =
      title !== "" ||
      description !== "" ||
      date !== "" ||
      categories.length > 0 ||
      images.length > 0;

    if (
      (editingIndex !== null || hasUnsavedContent) &&
      !window.confirm("Discard your changes? Your unsaved changes will be lost.")
    ) {
      return;
    }

    setTitle("");
    setDescription("");
    setDate("");
    setCategories([]);
    setImages([]);
    setEditingIndex(null);
    setPage("home");
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>
        {editingIndex !== null ? "Edit Memory" : "New Memory"}
      </h1>

      <p style={{ color: "#bbb", marginBottom: "30px" }}>
        Capture a moment you'll want to remember.
      </p>

      <input
        style={inputStyle}
        placeholder="Memory title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <br />
      <br />

      <textarea
        style={{
          ...inputStyle,
          height: "180px",
          resize: "vertical",
        }}
        placeholder="Tell your story..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <br />
      <br />

      <input
        style={inputStyle}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <br />
      <br />

      <div
        style={{
          width: "min(500px, 100%)",
          maxWidth: "100%",
          textAlign: "left",
        }}
      >
        <p style={{ marginBottom: "10px", fontSize: "18px" }}>
          Categories
        </p>

        <div
          aria-label="Memory categories"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {CATEGORY_OPTIONS.map((category) => {
            const isSelected = categories.includes(category);

            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setCategories(
                    isSelected
                      ? categories.filter((item) => item !== category)
                      : [...categories, category]
                  );
                }}
                style={{
                  background: isSelected ? "#5ec8ff" : "#374151",
                  color: "white",
                  border: "none",
                  borderRadius: "999px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <br />
      <br />

      <label
        style={{
          background: "#374151",
          color: "white",
          padding: "14px 22px",
          borderRadius: "10px",
          cursor: "pointer",
          display: "inline-block",
          marginTop: "15px",
        }}
      >
        {images.length ? "Add More Photos" : "Choose Photos"}

        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files);

            if (!files.length) return;

            Promise.all(
              files.map(
                (file) =>
                  new Promise((resolve) => {
                    const reader = new FileReader();

                    reader.onloadend = () => resolve(reader.result);

                    reader.readAsDataURL(file);
                  })
              )
            ).then((newImages) => {
              setImages([...images, ...newImages]);
            });
          }}
        />
      </label>

      {images.length > 0 && (
        <>
          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "12px",
              maxWidth: "700px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {images.map((img, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                }}
              >
                <img
                  src={img}
                  alt={`Memory ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "140px",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                />

                <button
                  onClick={() =>
                    setImages(images.filter((_, i) => i !== index))
                  }
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <br />
      <br />

      <button
        style={buttonStyle}
        onClick={saveMemory}
      >
        {editingIndex !== null ? "Save Changes" : "Save Memory"}
      </button>

      <br />
      <br />

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#666",
        }}
        onClick={cancelMemory}
      >
        Cancel
      </button>
    </div>
  );
}

export default NewMemoryPage;
