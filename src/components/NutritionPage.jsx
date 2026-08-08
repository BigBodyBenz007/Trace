function NutritionPage({ onBack, buttonStyle, containerStyle }) {
  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Health & Nutrition</h1>

      <p style={{ color: "#bbb", marginBottom: "30px" }}>
        Track your food and nutrition here.
      </p>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#666",
        }}
        onClick={onBack}
      >
        Back to Timeline
      </button>
    </div>
  );
}

export default NutritionPage;
