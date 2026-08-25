import { useEffect, useMemo, useState } from "react";
import { searchFoodCatalog } from "../services/foodSearch";
import "./FoodSearch.css";

const CONFIDENCE_LABELS = {
  verified: "Verified",
  "community-verified": "Community Verified",
  "user-added": "User-entered",
  "official-source": "Official restaurant source",
};
const displayNutrient = (value, unit = "") =>
  value === null || value === undefined ? "Unknown" : `${value}${unit}`;

const NUTRIENT_SUMMARY = [
  ["calories", "Calories", ""],
  ["protein", "Protein", " g"],
  ["carbohydrates", "Carbs", " g"],
  ["fat", "Fat", " g"],
  ["fiber", "Fiber", " g"],
  ["sodium", "Sodium", " mg"],
];

const PREPARATION_LABELS = {
  raw: "Raw",
  cooked: "Cooked",
  baked: "Baked",
  fried: "Fried",
  roasted: "Roasted",
  dry: "Dried",
  dried: "Dried",
  canned: "Canned",
  frozen: "Frozen",
  "frozen-cooked": "Frozen · cooked",
  "ready-to-eat": "Ready to eat",
  "ready-to-use": "Ready to use",
};

function preparationLabel(preparationState) {
  if (!preparationState) return null;
  return PREPARATION_LABELS[preparationState]
    || preparationState.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function foodSourceLabels(food) {
  if (food.sourceType === "restaurant") {
    return ["Restaurant", CONFIDENCE_LABELS[food.provenance.confidence] || food.provenance.confidence];
  }
  if (food.sourceType === "grocery" && food.provenance.source === "usda-fooddata-central") {
    return ["USDA", "Grocery"];
  }
  if (food.sourceType === "grocery-custom" || food.provenance.source === "user-added") {
    return ["User-entered", "Grocery"];
  }
  return ["Trace starter", CONFIDENCE_LABELS[food.provenance.confidence] || food.provenance.confidence];
}

function FoodSearch({ onSelectFood, inputStyle, userFoods = [], resetKey }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchFoodCatalog(query, userFoods), [query, userFoods]);
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);
  useEffect(() => setQuery(""), [resetKey]);

  return (
    <section className="trace-feature-surface trace-food-search" style={{ background: "#1f2937", borderRadius: "16px", boxSizing: "border-box", marginTop: "24px", maxWidth: "700px", minWidth: 0, padding: "24px", textAlign: "left", width: "100%" }}>
      <h2 style={{ marginTop: 0 }}>Find a Food</h2>
      <p style={{ color: "#d1d5db" }}>Search USDA grocery ingredients, restaurant menus, Trace starters, or your saved foods.</p>
      <label style={{ display: "block" }}>
        Food search
        <input type="search" placeholder="Search foods by name, brand, or category..." value={query} onChange={(event) => setQuery(event.target.value)} style={{ ...inputStyle, boxSizing: "border-box", fontSize: "18px", marginTop: "8px", maxWidth: "100%", padding: "12px", width: "100%" }} />
      </label>
      {results.length > 0 && (
        <div aria-label="Food search results" className="trace-food-search__results">
          {results.map((food) => (
            <button className="trace-search-result trace-food-result" data-food-source={food.sourceType} data-layout="compact" key={food.id} type="button" onClick={() => onSelectFood(food)} style={{ boxSizing: "border-box", maxWidth: "100%", minWidth: 0, width: "100%" }}>
              <span className="trace-food-result__content">
                <span className="trace-food-result__heading" style={{ minWidth: 0 }}>
                  <strong className="trace-food-result__name">{food.restaurant ? `${food.restaurant.name} \u00b7 ${food.name}` : food.brand ? `${food.brand} \u00b7 ${food.name}` : food.name}</strong>
                  <span aria-hidden="true" className="trace-food-result__action">Select</span>
                </span>
                <span className="trace-food-result__badges" style={{ maxWidth: "100%", minWidth: 0 }}>
                  {foodSourceLabels(food).map((label) => (
                    <span className="trace-badge" key={label}>{label}</span>
                  ))}
                  {preparationLabel(food.preparationState) && (
                    <span className="trace-badge trace-food-result__preparation" data-preparation-state={food.preparationState} style={{ maxWidth: "100%" }}>
                      Prep: {preparationLabel(food.preparationState)}
                    </span>
                  )}
                </span>
                <span className="trace-food-result__details">
                  {(food.categoryLabel || food.category || food.brand) && <><span className="trace-food-result__category">{[food.categoryLabel || food.category, food.brand].filter(Boolean).join(" \u00b7 ")}</span>{" "}</>}
                  <span className="trace-food-result__serving">{food.serving.description}</span>
                </span>
                <span aria-label="Nutrition summary" className="trace-food-result__nutrients" data-compact-grid="3x2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  {NUTRIENT_SUMMARY.map(([nutrient, label, unit]) => (
                    <span className="trace-food-result__nutrient" data-nutrient={nutrient} key={nutrient}>
                      <span className="trace-food-result__nutrient-label">{label}{" "}</span>
                      <strong>{displayNutrient(food.nutrients[nutrient], unit)}</strong>
                    </span>
                  ))}
                </span>
                {food.provenance.completeness === "partial" && <span className="trace-food-result__completeness">{food.sourceType === "restaurant" ? "Some nutrition values are unavailable because the restaurant does not publish them." : food.sourceType === "grocery" ? "Some USDA nutrient values are unavailable and remain unknown." : "Nutrition values left blank by the user remain unknown."}</span>}
                {food.notes && <span className="trace-food-result__notes">{food.notes}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {hasMeaningfulQuery && results.length === 0 && <p style={{ color: "#9ca3af", marginBottom: 0 }}>No catalog foods found. Create a grocery food or enter this meal manually below.</p>}
    </section>
  );
}

export default FoodSearch;
