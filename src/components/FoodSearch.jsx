import { useEffect, useMemo, useState } from "react";
import { searchFoodCatalog } from "../services/foodSearch";

const CONFIDENCE_LABELS = {
  verified: "Verified",
  "community-verified": "Community Verified",
  "user-added": "User-entered",
  "official-source": "Official restaurant source",
};
const displayNutrient = (value, unit = "") =>
  value === null || value === undefined ? "Unknown" : `${value}${unit}`;

function foodSourceLabels(food) {
  if (food.sourceType === "restaurant") {
    return ["Restaurant", CONFIDENCE_LABELS[food.provenance.confidence] || food.provenance.confidence];
  }
  if (food.sourceType === "grocery-custom" || food.provenance.source === "user-added") {
    return ["Grocery/custom", "User-entered"];
  }
  return ["Trace starter", CONFIDENCE_LABELS[food.provenance.confidence] || food.provenance.confidence];
}

function FoodSearch({ onSelectFood, inputStyle, userFoods = [], resetKey }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchFoodCatalog(query, userFoods), [query, userFoods]);
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);
  useEffect(() => setQuery(""), [resetKey]);

  return (
    <section className="trace-feature-surface trace-food-search" style={{ background: "#1f2937", borderRadius: "16px", marginTop: "24px", maxWidth: "700px", padding: "24px", textAlign: "left", width: "100%" }}>
      <h2 style={{ marginTop: 0 }}>Find a Food</h2>
      <p style={{ color: "#d1d5db" }}>Search starter, restaurant, grocery/custom, or saved foods.</p>
      <label style={{ display: "block" }}>
        Food search
        <input type="search" placeholder="Search foods by name, brand, or category..." value={query} onChange={(event) => setQuery(event.target.value)} style={{ ...inputStyle, boxSizing: "border-box", fontSize: "18px", marginTop: "8px", maxWidth: "100%", padding: "12px", width: "100%" }} />
      </label>
      {results.length > 0 && (
        <div aria-label="Food search results" style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
          {results.map((food) => (
            <button className="trace-search-result" key={food.id} type="button" onClick={() => onSelectFood(food)} style={{ background: "#111827", border: "1px solid #4b5563", borderRadius: "12px", color: "white", cursor: "pointer", overflowWrap: "anywhere", padding: "14px", textAlign: "left", width: "100%" }}>
              <span style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between" }}>
                <strong>{food.restaurant ? `${food.restaurant.name} \u00b7 ${food.name}` : food.brand ? `${food.brand} \u00b7 ${food.name}` : food.name}</strong>
                <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {foodSourceLabels(food).map((label) => (
                    <span className="trace-badge" key={label} style={{ background: "#374151", borderRadius: "999px", color: "#d1d5db", fontSize: "13px", padding: "4px 8px" }}>{label}</span>
                  ))}
                </span>
              </span>
              {(food.categoryLabel || food.category || food.brand) && <span style={{ color: "#d1d5db", display: "block", fontSize: "13px", marginTop: "6px" }}>{[food.categoryLabel || food.category, food.brand].filter(Boolean).join(" \u00b7 ")}</span>}
              <span style={{ color: "#9ca3af", display: "block", marginTop: "6px" }}>{food.serving.description}</span>
              <span style={{ display: "block", lineHeight: 1.6, marginTop: "6px", overflowWrap: "anywhere" }}>
                {displayNutrient(food.nutrients.calories)} calories {" \u00b7 "} Protein {displayNutrient(food.nutrients.protein, " g")} {" \u00b7 "} Carbohydrates {displayNutrient(food.nutrients.carbohydrates, " g")} {" \u00b7 "} Fat {displayNutrient(food.nutrients.fat, " g")}
                {food.sourceType === "grocery-custom" && <> {" \u00b7 "} Fiber {displayNutrient(food.nutrients.fiber, " g")}</>}
                {" \u00b7 "} Sodium {displayNutrient(food.nutrients.sodium, " mg")}
              </span>
              {food.provenance.completeness === "partial" && <span style={{ color: "#9ca3af", display: "block", fontSize: "13px", marginTop: "6px" }}>{food.sourceType === "restaurant" ? "Some nutrition values are unavailable because the restaurant does not publish them." : "Nutrition values left blank by the user remain unknown."}</span>}
              {food.notes && <span style={{ color: "#9ca3af", display: "block", fontSize: "13px", marginTop: "6px" }}>{food.notes}</span>}
            </button>
          ))}
        </div>
      )}
      {hasMeaningfulQuery && results.length === 0 && <p style={{ color: "#9ca3af", marginBottom: 0 }}>No catalog foods found. Create a grocery food or enter this meal manually below.</p>}
    </section>
  );
}

export default FoodSearch;
