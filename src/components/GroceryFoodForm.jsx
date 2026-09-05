import { useState } from "react";
import {
  GROCERY_FOOD_CATEGORY_OPTIONS,
} from "../services/userFoodCatalog";
import {
  SERVING_UNIT_OPTIONS,
  createServingDefinition,
  getServingDefinitionError,
} from "../services/servingDefinition";
import { getSugarValidationError } from "../services/nutritionCalculation";
import { canonicalGtinKey } from "../services/productIdentifiers";

const EMPTY_FORM = {
  name: "",
  brand: "",
  category: "other",
  servingAmount: "1",
  servingUnit: "serving",
  servingDescription: "",
  customServingDescription: "",
  servingGrams: "",
  packageQuantity: "",
  servingsPerContainer: "",
  calories: "",
  protein: "",
  carbohydrates: "",
  fat: "",
  fiber: "",
  sodium: "",
  totalSugar: "",
  addedSugar: "",
  notes: "",
};

const NUTRIENT_FIELDS = [
  ["calories", "Calories"],
  ["protein", "Protein (g)"],
  ["carbohydrates", "Carbohydrates (g)"],
  ["fat", "Fat (g)"],
  ["fiber", "Fiber (g), optional"],
  ["sodium", "Sodium (mg), optional"],
  ["totalSugar", "Total Sugar (g), optional"],
  ["addedSugar", "Added Sugar (g), optional"],
];

const REQUIRED_NUTRIENTS = new Set(["calories", "protein", "carbohydrates", "fat"]);
const SERVING_UNITS = new Set(SERVING_UNIT_OPTIONS.map(({ value }) => value));

function formForFood(food) {
  if (!food) return EMPTY_FORM;
  const providerServingUnit = food.serving?.unit || "serving";
  const servingUnit = SERVING_UNITS.has(providerServingUnit)
    ? providerServingUnit
    : "custom";
  return {
    ...EMPTY_FORM,
    name: food.name || "",
    brand: food.brand || "",
    category: food.category || "other",
    servingAmount: String(food.serving?.amount ?? 1),
    servingUnit,
    servingDescription: food.serving?.description || "",
    customServingDescription: servingUnit === "custom"
      ? food.serving.description || ""
      : "",
    servingGrams: food.serving?.grams == null ? "" : String(food.serving.grams),
    packageQuantity: food.packageQuantity || food.packaged?.packageSize || "",
    servingsPerContainer: food.servingsPerContainer == null
      ? food.packaged?.servingsPerContainer == null
        ? ""
        : String(food.packaged.servingsPerContainer)
      : String(food.servingsPerContainer),
    ...Object.fromEntries(NUTRIENT_FIELDS.map(([key]) => [
      key,
      food.nutrients?.[key] == null ? "" : String(food.nutrients[key]),
    ])),
    notes: food.notes || "",
  };
}

function nutrientInputError(form, requireCore) {
  for (const [key, label] of NUTRIENT_FIELDS) {
    if (requireCore && REQUIRED_NUTRIENTS.has(key) && form[key] === "") {
      return `Enter ${label.replace(/ \(.+\)/, "").toLowerCase()}.`;
    }
    if (form[key] === "") continue;
    const value = Number(form[key]);
    if (!Number.isFinite(value) || value < 0) {
      return `${label.replace(", optional", "")} must be zero or greater.`;
    }
  }
  return "";
}

function GroceryFoodForm({
  saveUserFood,
  updateUserFood,
  buttonStyle,
  inputStyle,
  initialFood = null,
  identifier = null,
  providerSourceSnapshot = null,
  recovery = false,
  onSaved = () => {},
  onCancel = () => {},
}) {
  const [expanded, setExpanded] = useState(recovery);
  const [form, setForm] = useState(() => formForFood(initialFood));
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
      grams: form.servingGrams,
    });
    const sugarError = getSugarValidationError(form);
    const nutritionError = nutrientInputError(form, recovery);

    if (!form.name.trim()) {
      setError("Enter a food name.");
      return;
    }
    if (servingError) {
      setError(servingError);
      return;
    }
    if (sugarError) {
      setError(sugarError);
      return;
    }

    if (nutritionError) {
      setError(nutritionError);
      return;
    }

    if (
      form.servingsPerContainer !== ""
      && (!Number.isFinite(Number(form.servingsPerContainer)) || Number(form.servingsPerContainer) <= 0)
    ) {
      setError("Servings per container must be greater than zero when provided.");
      return;
    }

    const serving = createServingDefinition({
      amount: form.servingAmount,
      unit: form.servingUnit,
      customDescription: form.customServingDescription,
      grams: form.servingGrams,
    });
    if (form.servingDescription.trim()) {
      serving.description = form.servingDescription.trim().replace(/\s+/g, " ");
    }
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      serving,
      nutrients: Object.fromEntries(
        NUTRIENT_FIELDS.map(([nutrient]) => [nutrient, form[nutrient]])
      ),
      notes: form.notes,
      identifiers: identifier ? [identifier] : initialFood?.identifiers,
      packageQuantity: form.packageQuantity,
      servingsPerContainer: form.servingsPerContainer,
      providerSourceSnapshot,
    };
    const result = initialFood?.id && updateUserFood
      ? updateUserFood(initialFood.id, payload)
      : saveUserFood(payload);

    if (["added", "updated"].includes(result?.status)) {
      const savedName = result.food?.name || form.name.trim();
      onSaved(result.food);
      if (recovery) return;
      setForm(EMPTY_FORM);
      setError("");
      setStatus(`${savedName} saved. Search for it above to log a meal.`);
      return;
    }
    if (result?.status === "duplicate") {
      const existingBarcode = result.food?.identifiers?.[0]?.value;
      if (
        recovery
        && canonicalGtinKey(existingBarcode)
        && canonicalGtinKey(existingBarcode) === canonicalGtinKey(identifier?.value)
      ) {
        onSaved(result.food);
        return;
      }
      setError(
        recovery
          ? `A custom food with this barcode or the name ${result.food?.name || form.name.trim()} is already saved. The existing food was kept.`
          : `A grocery food named ${result.food?.name || form.name.trim()} is already saved. The existing food was kept.`
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
      {!recovery && <button
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
      </button>}

      {status && <p role="status" style={{ color: "#bbf7d0", marginBottom: 0 }}>{status}</p>}

      {expanded && (
        <form id={recovery ? "barcode-food-recovery-form" : "grocery-food-form"} onSubmit={saveGroceryFood} style={{ marginTop: recovery ? 0 : "16px" }}>
          <p style={{ color: "#d1d5db", marginTop: 0 }}>
            {recovery
              ? "Save this barcode as a custom food. Known provider values are prefilled; blank values stay unknown."
              : "Save a store-bought or home-cooking ingredient. Blank nutrition values stay unknown."}
          </p>
          {identifier && <p><strong>Barcode:</strong> {identifier.value}</p>}

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))" }}>
            <label>
              Food name
              <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={recovery ? "" : "Raw chicken breast strips"} style={fieldStyle} />
            </label>
            <label>
              Brand (optional)
              <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} style={fieldStyle} />
            </label>
            <label>
              Package quantity (optional)
              <input value={form.packageQuantity} onChange={(event) => updateField("packageQuantity", event.target.value)} placeholder={recovery ? "" : "32 oz"} style={fieldStyle} />
            </label>
            <label>
              Servings per container (optional)
              <input min="0" step="any" type="number" value={form.servingsPerContainer} onChange={(event) => updateField("servingsPerContainer", event.target.value)} style={fieldStyle} />
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
                  <input value={form.customServingDescription} onChange={(event) => updateField("customServingDescription", event.target.value)} placeholder={recovery ? "" : "1 prepared portion"} style={fieldStyle} />
                </label>
              )}
              <label>
                Serving description (optional)
                <input value={form.servingDescription} onChange={(event) => updateField("servingDescription", event.target.value)} placeholder={recovery ? "" : "1 cup (30 g)"} style={fieldStyle} />
              </label>
              <label>
                Serving grams (optional)
                <input min="0" step="any" type="number" value={form.servingGrams} onChange={(event) => updateField("servingGrams", event.target.value)} style={fieldStyle} />
              </label>
              {NUTRIENT_FIELDS.map(([nutrient, label]) => (
                <label key={nutrient}>
                  {label}
                  <input required={recovery && REQUIRED_NUTRIENTS.has(nutrient)} min="0" step="any" type="number" value={form[nutrient]} onChange={(event) => updateField(nutrient, event.target.value)} style={fieldStyle} />
                </label>
              ))}
            </div>
          </fieldset>

          <label style={{ display: "block", marginTop: "12px" }}>
            Food notes (optional)
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} style={{ ...fieldStyle, minHeight: "72px", resize: "vertical" }} />
          </label>

          {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
            {recovery ? (initialFood?.id ? "Update Barcode Food" : "Save Barcode Food") : "Save grocery food"}
          </button>
          {recovery && (
            <button className="trace-action trace-action--secondary" onClick={onCancel} type="button" style={{ ...buttonStyle, marginLeft: "8px" }}>
              Cancel
            </button>
          )}
        </form>
      )}
    </section>
  );
}

export default GroceryFoodForm;
