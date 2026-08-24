import { useState } from "react";
import {
  GROCERY_FOOD_CATEGORY_OPTIONS,
} from "../services/userFoodCatalog";
import {
  SERVING_UNIT_OPTIONS,
  createServingDefinition,
  getServingDefinitionError,
} from "../services/servingDefinition";

const EMPTY_FORM = {
  name: "",
  brand: "",
  category: "other",
  servingAmount: "1",
  servingUnit: "serving",
  customServingDescription: "",
  calories: "",
  protein: "",
  carbohydrates: "",
  fat: "",
  fiber: "",
  sodium: "",
  notes: "",
};

const NUTRIENT_FIELDS = [
  ["calories", "Calories"],
  ["protein", "Protein (g)"],
  ["carbohydrates", "Carbohydrates (g)"],
  ["fat", "Fat (g)"],
  ["fiber", "Fiber (g), optional"],
  ["sodium", "Sodium (mg), optional"],
];

function GroceryFoodForm({ saveUserFood, buttonStyle, inputStyle }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "6px",
    maxWidth: "100%",
    padding: "10px",
    width: "100%",
  };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setStatus("");
  }

  function saveGroceryFood(event) {
    event.preventDefault();
    const servingError = getServingDefinitionError({
      amount: form.servingAmount,
      unit: form.servingUnit,
      customDescription: form.customServingDescription,
    });

    if (!form.name.trim()) {
      setError("Enter a food name.");
      return;
    }
    if (servingError) {
      setError(servingError);
      return;
    }

    const result = saveUserFood({
      name: form.name,
      brand: form.brand,
      category: form.category,
      serving: createServingDefinition({
        amount: form.servingAmount,
        unit: form.servingUnit,
        customDescription: form.customServingDescription,
      }),
      nutrients: Object.fromEntries(
        NUTRIENT_FIELDS.map(([nutrient]) => [nutrient, form[nutrient]])
      ),
      notes: form.notes,
    });

    if (result?.status === "added") {
      const savedName = result.food?.name || form.name.trim();
      setForm(EMPTY_FORM);
      setError("");
      setStatus(`${savedName} saved. Search for it above to log a meal.`);
      return;
    }
    if (result?.status === "duplicate") {
      setError(
        `A grocery food named ${result.food?.name || form.name.trim()} is already saved. The existing food was kept.`
      );
      return;
    }
    setError("Trace could not save this grocery food.");
  }

  return (
    <section
      className="trace-feature-surface trace-grocery-food-creator"
      style={{
        background: "#1f2937",
        borderRadius: "16px",
        marginTop: "12px",
        maxWidth: "700px",
        padding: "16px",
        textAlign: "left",
        width: "100%",
      }}
    >
      <button
        aria-controls="grocery-food-form"
        aria-expanded={expanded}
        className="trace-action trace-action--secondary"
        type="button"
        onClick={() => {
          setExpanded((current) => !current);
          setError("");
        }}
        style={{ ...buttonStyle, width: "100%" }}
      >
        {expanded ? "Close grocery food creator" : "Create grocery food"}
      </button>

      {status && <p role="status" style={{ color: "#bbf7d0", marginBottom: 0 }}>{status}</p>}

      {expanded && (
        <form id="grocery-food-form" onSubmit={saveGroceryFood} style={{ marginTop: "16px" }}>
          <p style={{ color: "#d1d5db", marginTop: 0 }}>
            Save a store-bought or home-cooking ingredient. Blank nutrition values stay unknown.
          </p>

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))" }}>
            <label>
              Food name
              <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Raw chicken breast strips" style={fieldStyle} />
            </label>
            <label>
              Brand (optional)
              <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} style={fieldStyle} />
            </label>
            <label>
              Food category / type
              <select value={form.category} onChange={(event) => updateField("category", event.target.value)} style={fieldStyle}>
                {GROCERY_FOOD_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset style={{ border: "1px solid #4b5563", borderRadius: "12px", marginTop: "16px", padding: "12px" }}>
            <legend>Serving and nutrition</legend>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))" }}>
              <label>
                Serving amount
                <input min="0" step="any" type="number" value={form.servingAmount} onChange={(event) => updateField("servingAmount", event.target.value)} style={fieldStyle} />
              </label>
              <label>
                Serving unit
                <select value={form.servingUnit} onChange={(event) => updateField("servingUnit", event.target.value)} style={fieldStyle}>
                  {SERVING_UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {form.servingUnit === "custom" && (
                <label>
                  Custom serving description
                  <input value={form.customServingDescription} onChange={(event) => updateField("customServingDescription", event.target.value)} placeholder="1 prepared portion" style={fieldStyle} />
                </label>
              )}
              {NUTRIENT_FIELDS.map(([nutrient, label]) => (
                <label key={nutrient}>
                  {label}
                  <input min="0" step="any" type="number" value={form[nutrient]} onChange={(event) => updateField(nutrient, event.target.value)} style={fieldStyle} />
                </label>
              ))}
            </div>
          </fieldset>

          <label style={{ display: "block", marginTop: "12px" }}>
            Food notes (optional)
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} style={{ ...fieldStyle, minHeight: "72px", resize: "vertical" }} />
          </label>

          {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>Save grocery food</button>
        </form>
      )}
    </section>
  );
}

export default GroceryFoodForm;
