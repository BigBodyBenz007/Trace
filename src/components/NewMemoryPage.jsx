function NewMemoryPage({
  title,
  setTitle,
  description,
  setDescription,
  date,
  setDate,
  image,
  setImage,
  saveMemory,
  inputStyle,
  buttonStyle,
  containerStyle,
  setPage,
  editingIndex,
  setEditingIndex,
}) {
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
        {image ? "Change Photo" : "Choose Photo"}

        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files[0];

            if (!file) return;

            const reader = new FileReader();

            reader.onloadend = () => {
              setImage(reader.result);
            };

            reader.readAsDataURL(file);
          }}
        />
      </label>

      {image && (
        <>
          <br />
          <br />

          <img
            src={image}
            alt="Preview"
            style={{
              width: "100%",
              maxWidth: "500px",
              maxHeight: "300px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />

          <br />
          <br />

          <button
            onClick={() => setImage("")}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Remove Photo
          </button>
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
        onClick={() => {
          setEditingIndex(null);
          setPage("home");
        }}
      >
        Back
      </button>
    </div>
  );
}

export default NewMemoryPage;