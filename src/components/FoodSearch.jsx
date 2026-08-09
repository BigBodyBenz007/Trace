import { useMemo, useState } from "react";
import { searchFoods } from "../services/foodSearch";

const CONFIDENCE_LABELS = {
  verified: "Verified",
  "community-verified": "Community Verified",
  "user-added": "User Added",
};

function FoodSearch({ onSelectFood, inputStyle }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchFoods(query), [query]);
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);

  return (
    <section
      style={{
        background: "#1f2937",
        borderRadius: "16px",
        marginTop: "24px",
        maxWidth: "700px",
        padding: "24px",
        textAlign: "left",
        width: "100%",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Find a Food</h2>
      <p style={{ color: "#d1d5db" }}>
        Search the development starter catalog, or use the manual entry form
        below.
      </p>

      <label style={{ display: "block" }}>
        Food search
        <input
          type="search"
          placeholder="Search foods by name..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            ...inputStyle,
            boxSizing: "border-box",
            fontSize: "18px",
            marginTop: "8px",
            maxWidth: "100%",
            padding: "12px",
            width: "100%",
          }}
        />
      </label>

      {results.length > 0 && (
        <div
          aria-label="Food search results"
          style={{ display: "grid", gap: "10px", marginTop: "16px" }}
        >
          {results.map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => onSelectFood(food)}
              style={{
                background: "#111827",
                border: "1px solid #4b5563",
                borderRadius: "12px",
                color: "white",
                cursor: "pointer",
                overflowWrap: "anywhere",
                padding: "14px",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span
                style={{
                  alignItems: "baseline",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "space-between",
                }}
              >
                <strong>{food.name}</strong>
                <span
                  style={{
                    background: "#374151",
                    borderRadius: "999px",
                    color: "#d1d5db",
                    fontSize: "13px",
                    padding: "4px 8px",
                  }}
                >
                  {CONFIDENCE_LABELS[food.provenance.confidence] ||
                    food.provenance.confidence}
                </span>
              </span>
              <span
                style={{ color: "#9ca3af", display: "block", marginTop: "6px" }}
              >
                {food.serving.description}
              </span>
              <span style={{ display: "block", lineHeight: 1.6, marginTop: "6px" }}>
                {food.nutrients.calories} calories · Protein {food.nutrients.protein}g
                {" · "}Carbohydrates {food.nutrients.carbohydrates}g · Fat {food.nutrients.fat}g
              </span>
            </button>
          ))}
        </div>
      )}

      {hasMeaningfulQuery && results.length === 0 && (
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          No starter foods found. You can enter this food manually below.
        </p>
      )}
    </section>
  );
}

export default FoodSearch;
