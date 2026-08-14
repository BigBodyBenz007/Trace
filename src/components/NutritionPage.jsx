import { useEffect, useRef, useState } from "react";
import FoodSearch from "./FoodSearch";
import {
  NUTRIENT_KEYS,
  scaleNutrition,
} from "../services/nutritionCalculation";
import {
  SERVING_UNIT_OPTIONS,
  createServingDefinition,
  getServingDefinitionError,
} from "../services/servingDefinition";

function toNutritionNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function getCurrentLocalDateTime() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    date: `${now.getFullYear()}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function getLocalDateTimeFromTimestamp(loggedAt) {
  const date = new Date(loggedAt);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function isSameLocalDate(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function hasValidSavedCalculationBasis(entry) {
  const portionAmount = Number(entry?.portion?.amount);
  const basisAmount = Number(entry?.portion?.basis?.amount);
  const basis = entry?.portion?.basis;

  return Boolean(
    Number.isFinite(portionAmount) &&
      portionAmount >= 0 &&
      Number.isFinite(basisAmount) &&
      basisAmount > 0 &&
      basis?.unit &&
      basis?.description &&
      entry?.nutritionBasis &&
      NUTRIENT_KEYS.every((nutrient) => {
        const value = Number(entry.nutritionBasis[nutrient]);
        return Number.isFinite(value) && value >= 0;
      })
  );
}

export function calculateNutritionAverages(nutritionEntries, now = new Date()) {
  const dailyTotals = new Map();

  nutritionEntries.forEach((entry) => {
    const loggedDate = new Date(entry.loggedAt);

    if (Number.isNaN(loggedDate.getTime())) return;

    const dayKey = getLocalDateKey(loggedDate);
    const totals = dailyTotals.get(dayKey) || {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
    };

    totals.calories += toNutritionNumber(entry.calories);
    totals.protein += toNutritionNumber(entry.protein);
    totals.carbohydrates += toNutritionNumber(entry.carbohydrates);
    totals.fat += toNutritionNumber(entry.fat);
    dailyTotals.set(dayKey, totals);
  });

  const lastSevenDayKeys = new Set();

  for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
    const localDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    localDay.setDate(localDay.getDate() - daysAgo);
    lastSevenDayKeys.add(getLocalDateKey(localDay));
  }

  const averageDays = (dayTotals) => {
    const loggedDays = dayTotals.length;
    const totals = dayTotals.reduce(
      (sum, day) => ({
        calories: sum.calories + day.calories,
        protein: sum.protein + day.protein,
        carbohydrates: sum.carbohydrates + day.carbohydrates,
        fat: sum.fat + day.fat,
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }
    );

    return {
      loggedDays,
      calories: loggedDays ? totals.calories / loggedDays : 0,
      protein: loggedDays ? totals.protein / loggedDays : 0,
      carbohydrates: loggedDays ? totals.carbohydrates / loggedDays : 0,
      fat: loggedDays ? totals.fat / loggedDays : 0,
    };
  };

  const lastSevenDays = [];
  const thisMonth = [];

  dailyTotals.forEach((totals, dayKey) => {
    if (lastSevenDayKeys.has(dayKey)) {
      lastSevenDays.push(totals);
    }

    const [year, month] = dayKey.split("-").map(Number);
    if (year === now.getFullYear() && month === now.getMonth()) {
      thisMonth.push(totals);
    }
  });

  return {
    lastSevenDays: averageDays(lastSevenDays),
    thisMonth: averageDays(thisMonth),
  };
}

function NutritionPage({
  onBack,
  nutritionEntries,
  userFoods = [],
  nutritionGoals,
  saveNutritionEntry,
  saveUserFood = () => ({
    status: "error",
    food: null,
    matchesDefinition: false,
  }),
  updateNutritionEntry,
  deleteNutritionEntry,
  saveNutritionGoals,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const initialDateTime = getCurrentLocalDateTime();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [fat, setFat] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [notes, setNotes] = useState("");
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [foodReference, setFoodReference] = useState(null);
  const [servingQuantity, setServingQuantity] = useState("1");
  const [portionBasis, setPortionBasis] = useState(null);
  const [nutritionBasis, setNutritionBasis] = useState(null);
  const [foodSearchResetKey, setFoodSearchResetKey] = useState(0);
  const [manualServingAmount, setManualServingAmount] = useState("1");
  const [manualServingUnit, setManualServingUnit] = useState("serving");
  const [customServingDescription, setCustomServingDescription] = useState("");
  const [saveAsReusableFood, setSaveAsReusableFood] = useState(true);
  const [servingDefinitionError, setServingDefinitionError] = useState("");
  const [entryStatusMessage, setEntryStatusMessage] = useState("");
  const nutritionPageTopRef = useRef(null);
  const todaySectionRef = useRef(null);
  const entryFormRef = useRef(null);
  const nameInputRef = useRef(null);
  const [goalValues, setGoalValues] = useState({
    calories: String(nutritionGoals.calories),
    protein: String(nutritionGoals.protein),
    carbohydrates: String(nutritionGoals.carbohydrates),
    fat: String(nutritionGoals.fat),
  });

  useEffect(() => {
    setGoalValues({
      calories: String(nutritionGoals.calories),
      protein: String(nutritionGoals.protein),
      carbohydrates: String(nutritionGoals.carbohydrates),
      fat: String(nutritionGoals.fat),
    });
  }, [nutritionGoals]);

  const sortedEntries = [...nutritionEntries].sort(
    (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
  );
  const today = new Date();
  const todayTotals = nutritionEntries.reduce(
    (totals, entry) => {
      if (!isSameLocalDate(new Date(entry.loggedAt), today)) {
        return totals;
      }

      return {
        calories: totals.calories + toNutritionNumber(entry.calories),
        protein: totals.protein + toNutritionNumber(entry.protein),
        carbohydrates:
          totals.carbohydrates + toNutritionNumber(entry.carbohydrates),
        fat: totals.fat + toNutritionNumber(entry.fat),
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }
  );
  const nutritionMetrics = [
    { key: "calories", label: "Calories", unit: "" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
  ];
  const nutritionAverages = calculateNutritionAverages(nutritionEntries, today);
  const averagePeriods = [
    { key: "lastSevenDays", label: "Last 7 Days" },
    { key: "thisMonth", label: "This Month" },
  ];
  const isCreatingManualFood =
    editingEntryId === null && !foodReference && !portionBasis;
  const manualServingPreview = isCreatingManualFood
    ? createServingDefinition({
        amount: manualServingAmount,
        unit: manualServingUnit,
        customDescription: customServingDescription,
      })
    : null;

  function formatAverage(value, metricKey) {
    return metricKey === "calories"
      ? Math.round(value)
      : Number(value.toFixed(1));
  }

  function saveFood(event) {
    event.preventDefault();

    if (name.trim() === "") return;

    const fallbackDateTime = getCurrentLocalDateTime();
    const enteredNutrition = {
      calories: toNutritionNumber(calories),
      protein: toNutritionNumber(protein),
      carbohydrates: toNutritionNumber(carbohydrates),
      fat: toNutritionNumber(fat),
    };
    let entryFoodReference = foodReference;
    let entryPortionBasis = portionBasis;
    let entryNutritionBasis = nutritionBasis;
    let reusableFoodResult = null;

    if (isCreatingManualFood && saveAsReusableFood) {
      const definitionError = getServingDefinitionError({
        amount: manualServingAmount,
        unit: manualServingUnit,
        customDescription: customServingDescription,
      });

      if (definitionError) {
        setServingDefinitionError(definitionError);
        return;
      }

      entryPortionBasis = manualServingPreview;
      entryNutritionBasis = enteredNutrition;

      reusableFoodResult = saveUserFood({
        name: name.trim(),
        nutrients: enteredNutrition,
        serving: manualServingPreview,
      });

      if (
        reusableFoodResult?.food &&
        (reusableFoodResult.status === "added" ||
          reusableFoodResult.matchesDefinition)
      ) {
        entryFoodReference = {
          source: reusableFoodResult.food.provenance.source,
          sourceId: reusableFoodResult.food.provenance.sourceId,
          confidence: reusableFoodResult.food.provenance.confidence,
          modified: false,
        };
        entryPortionBasis = { ...reusableFoodResult.food.serving };
        entryNutritionBasis = { ...reusableFoodResult.food.nutrients };
      }
    }

    const entry = {
      name: name.trim(),
      ...enteredNutrition,
      loggedAt: new Date(
        `${date || fallbackDateTime.date}T${time || fallbackDateTime.time}`
      ).toISOString(),
      notes: notes.trim(),
      ...(entryFoodReference ? { foodReference: entryFoodReference } : {}),
      ...(entryPortionBasis && entryNutritionBasis
        ? {
            portion: {
              amount: isCreatingManualFood
                ? 1
                : toNutritionNumber(servingQuantity),
              unit: "serving",
              basis: { ...entryPortionBasis },
            },
            nutritionBasis: { ...entryNutritionBasis },
          }
        : {}),
    };

    if (editingEntryId === null) {
      if (!saveNutritionEntry(entry)) return;
    } else {
      if (!updateNutritionEntry(editingEntryId, entry)) return;
    }


    if (reusableFoodResult?.status === "duplicate") {
      setEntryStatusMessage(
        `Entry logged. Your existing saved ${reusableFoodResult.food.name} was kept.`
      );
    } else if (reusableFoodResult?.status === "error") {
      setEntryStatusMessage(
        "Entry logged, but the reusable food could not be saved."
      );
    } else {
      setEntryStatusMessage("");
    }

    resetForm();
    setFoodSearchResetKey((currentKey) => currentKey + 1);
    todaySectionRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function resetForm() {
    const currentDateTime = getCurrentLocalDateTime();

    setName("");
    setCalories("");
    setProtein("");
    setCarbohydrates("");
    setFat("");
    setDate(currentDateTime.date);
    setTime(currentDateTime.time);
    setNotes("");
    setIsDraftDirty(false);
    setEditingEntryId(null);
    setFoodReference(null);
    setServingQuantity("1");
    setPortionBasis(null);
    setNutritionBasis(null);
    setManualServingAmount("1");
    setManualServingUnit("serving");
    setCustomServingDescription("");
    setSaveAsReusableFood(true);
    setServingDefinitionError("");
  }

  function markSelectedFoodModified() {
    setFoodReference((currentReference) =>
      currentReference
        ? { ...currentReference, modified: true }
        : currentReference
    );
  }

  function selectFood(food) {
    const selectedNutritionBasis = { ...food.nutrients };
    const selectedPortionBasis = {
      amount: food.serving.amount,
      unit: food.serving.unit,
      description: food.serving.description,
      ...(food.serving.grams === undefined
        ? {}
        : { grams: food.serving.grams }),
    };

    setName(food.name);
    setCalories(String(selectedNutritionBasis.calories));
    setProtein(String(selectedNutritionBasis.protein));
    setCarbohydrates(String(selectedNutritionBasis.carbohydrates));
    setFat(String(selectedNutritionBasis.fat));
    setFoodReference({
      source: food.provenance.source,
      sourceId: food.provenance.sourceId,
      confidence: food.provenance.confidence,
      modified: false,
    });
    setServingQuantity("1");
    setPortionBasis(selectedPortionBasis);
    setNutritionBasis(selectedNutritionBasis);
    setServingDefinitionError("");
    setEntryStatusMessage("");
    setIsDraftDirty(true);

    window.requestAnimationFrame(() => {
      entryFormRef.current?.scrollIntoView?.({ behavior: "smooth" });
      nameInputRef.current?.focus();
    });
  }

  function editEntry(entry) {
    const localDateTime = getLocalDateTimeFromTimestamp(entry.loggedAt);

    setName(entry.name);
    setCalories(String(entry.calories));
    setProtein(String(entry.protein));
    setCarbohydrates(String(entry.carbohydrates));
    setFat(String(entry.fat));
    setDate(localDateTime.date);
    setTime(localDateTime.time);
    setNotes(entry.notes);
    setIsDraftDirty(false);
    setEditingEntryId(entry.id);
    setFoodReference(
      entry.foodReference ? { ...entry.foodReference } : null
    );
    if (hasValidSavedCalculationBasis(entry)) {
      setServingQuantity(String(entry.portion.amount));
      setPortionBasis({ ...entry.portion.basis });
      setNutritionBasis({ ...entry.nutritionBasis });
    } else {
      setServingQuantity("1");
      setPortionBasis(null);
      setNutritionBasis(null);
    }
    entryFormRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function changeServingQuantity(value) {
    const scaledNutrition = scaleNutrition(nutritionBasis, value);

    setServingQuantity(value);
    setCalories(String(scaledNutrition.calories));
    setProtein(String(scaledNutrition.protein));
    setCarbohydrates(String(scaledNutrition.carbohydrates));
    setFat(String(scaledNutrition.fat));
    setIsDraftDirty(true);
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this nutrition entry?")) return;

    if (!deleteNutritionEntry(id)) return;

    if (editingEntryId === id) {
      resetForm();
    }
  }

  function cancelEntry() {
    if (
      (editingEntryId !== null || isDraftDirty) &&
      !window.confirm("Discard this entry? Your unsaved changes will be lost.")
    ) {
      return;
    }

    resetForm();
    setFoodSearchResetKey((currentKey) => currentKey + 1);
    window.requestAnimationFrame(() => {
      nutritionPageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
    });
  }

  function saveGoals(event) {
    event.preventDefault();

    saveNutritionGoals({
      calories: toNutritionNumber(goalValues.calories),
      protein: toNutritionNumber(goalValues.protein),
      carbohydrates: toNutritionNumber(goalValues.carbohydrates),
      fat: toNutritionNumber(goalValues.fat),
    });
  }

  const formInputStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "18px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "12px",
    width: "100%",
  };

  return (
    <div ref={nutritionPageTopRef} data-testid="nutrition-page" style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Nutrition</h1>

      <p style={{ color: "#bbb", marginBottom: "30px" }}>
        Track your food and nutrition here.
      </p>

      <button
        type="button"
        onClick={onBack}
        style={{
          ...buttonStyle,
          backgroundColor: "#666",
          marginBottom: "24px",
          marginTop: 0,
        }}
      >
        Back to Timeline
      </button>

      <section
        ref={todaySectionRef}
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          maxWidth: "700px",
          padding: "24px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Today</h2>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
          }}
        >
          {nutritionMetrics.map((metric) => {
            const current = todayTotals[metric.key];
            const goal = toNutritionNumber(nutritionGoals[metric.key]);
            const hasGoal = goal > 0;
            const progress = hasGoal ? (current / goal) * 100 : 0;

            return (
              <div key={metric.key}>
                <strong>
                  {metric.label}
                  {metric.unit ? ` (${metric.unit})` : ""}
                </strong>
                <p style={{ marginBottom: hasGoal ? "8px" : 0 }}>
                  {hasGoal
                    ? `${current}${metric.unit} / ${goal}${metric.unit}`
                    : `${current}${metric.unit} · No goal set`}
                </p>

                <div
                  aria-label={`${metric.label} progress`}
                  style={{
                    background: "#374151",
                    borderRadius: "999px",
                    height: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#5ec8ff",
                      borderRadius: "999px",
                      height: "100%",
                      width: `${hasGoal ? Math.min(progress, 100) : 0}%`,
                    }}
                  />
                </div>

                {hasGoal && (
                  <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                    {Math.round(progress)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
        <h2 style={{ marginTop: 0 }}>Nutrition Averages</h2>

        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
          }}
        >
          {averagePeriods.map((period) => {
            const averages = nutritionAverages[period.key];

            return (
              <article
                key={period.key}
                style={{
                  background: "#111827",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>{period.label}</h3>
                <p style={{ color: "#9ca3af" }}>
                  Based on {averages.loggedDays} logged {averages.loggedDays === 1 ? "day" : "days"}
                </p>

                <div style={{ display: "grid", gap: "10px" }}>
                  {nutritionMetrics.map((metric) => (
                    <div key={metric.key}>
                      <strong>Average {metric.label}</strong>
                      <div>
                        {formatAverage(averages[metric.key], metric.key)}
                        {metric.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <form
        onSubmit={saveGoals}
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
        <h2 style={{ marginTop: 0 }}>Daily Goals</h2>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
          }}
        >
          {nutritionMetrics.map((metric) => (
            <label key={metric.key} style={{ display: "block" }}>
              {metric.label}
              {metric.unit ? ` (${metric.unit})` : ""}
              <input
                type="number"
                min="0"
                step="any"
                style={formInputStyle}
                value={goalValues[metric.key]}
                onChange={(event) =>
                  setGoalValues({
                    ...goalValues,
                    [metric.key]: event.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>

        <button type="submit" style={buttonStyle}>
          Save Goals
        </button>
      </form>

      <FoodSearch
        onSelectFood={selectFood}
        inputStyle={inputStyle}
        userFoods={userFoods}
        resetKey={foodSearchResetKey}
      />

      {entryStatusMessage && (
        <p
          role="status"
          style={{ color: "#d1d5db", maxWidth: "700px", width: "100%" }}
        >
          {entryStatusMessage}
        </p>
      )}

      <form
        ref={entryFormRef}
        onSubmit={saveFood}
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
        <h2 style={{ marginTop: 0 }}>
          {editingEntryId === null
            ? "Add Nutrition Entry"
            : "Edit Nutrition Entry"}
        </h2>

        {portionBasis && nutritionBasis && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block" }}>
              Number of servings
              <input
                aria-describedby="serving-basis-description"
                type="number"
                min="0"
                step="any"
                style={formInputStyle}
                value={servingQuantity}
                onChange={(event) =>
                  changeServingQuantity(event.target.value)
                }
              />
            </label>
            <p
              id="serving-basis-description"
              style={{ color: "#9ca3af", marginBottom: 0 }}
            >
              One serving: {portionBasis.description}
            </p>
          </div>
        )}

        <label style={{ display: "block" }}>
          Food / meal name
          <input
            ref={nameInputRef}
            required
            style={formInputStyle}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setIsDraftDirty(true);
              markSelectedFoodModified();
            }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
            marginTop: "16px",
          }}
        >
          {[
            ["Calories", calories, setCalories],
            ["Protein (g)", protein, setProtein],
            ["Carbohydrates (g)", carbohydrates, setCarbohydrates],
            ["Fat (g)", fat, setFat],
          ].map(([label, value, setValue]) => (
            <label key={label} style={{ display: "block" }}>
              {label}
              <input
                type="number"
                min="0"
                step="any"
                style={formInputStyle}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setIsDraftDirty(true);
                  markSelectedFoodModified();
                }}
              />
            </label>
          ))}
        </div>

        {isCreatingManualFood && (
          <fieldset
            style={{
              border: "1px solid #4b5563",
              borderRadius: "12px",
              marginTop: "16px",
              padding: "16px",
            }}
          >
            <legend>Reusable food</legend>

            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={saveAsReusableFood}
                onChange={(event) => {
                  setSaveAsReusableFood(event.target.checked);
                  setServingDefinitionError("");
                  setIsDraftDirty(true);
                }}
              />{" "}
              Save as reusable food
            </label>

            {saveAsReusableFood && (
              <div style={{ marginTop: "16px" }}>
                <strong>Nutrition values are for</strong>
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
                  }}
                >
                  <label style={{ display: "block" }}>
                    Serving amount
                    <input
                      type="number"
                      min="0"
                      step="any"
                      style={formInputStyle}
                      value={manualServingAmount}
                      onChange={(event) => {
                        setManualServingAmount(event.target.value);
                        setServingDefinitionError("");
                        setIsDraftDirty(true);
                      }}
                    />
                  </label>

                  <label style={{ display: "block" }}>
                    Serving unit
                    <select
                      style={formInputStyle}
                      value={manualServingUnit}
                      onChange={(event) => {
                        setManualServingUnit(event.target.value);
                        setServingDefinitionError("");
                        setIsDraftDirty(true);
                      }}
                    >
                      {SERVING_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {manualServingUnit === "custom" && (
                  <label style={{ display: "block", marginTop: "12px" }}>
                    Custom serving description
                    <input
                      required
                      style={formInputStyle}
                      placeholder="For example: 1 small homemade patty"
                      value={customServingDescription}
                      onChange={(event) => {
                        setCustomServingDescription(event.target.value);
                        setServingDefinitionError("");
                        setIsDraftDirty(true);
                      }}
                    />
                  </label>
                )}

                {manualServingPreview && (
                  <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                    Nutrition entered for: {manualServingPreview.description}
                  </p>
                )}

                {servingDefinitionError && (
                  <p role="alert" style={{ color: "#fca5a5", marginBottom: 0 }}>
                    {servingDefinitionError}
                  </p>
                )}
              </div>
            )}
          </fieldset>
        )}

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
            marginTop: "16px",
          }}
        >
          <label style={{ display: "block" }}>
            Date
            <input
              type="date"
              style={formInputStyle}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setIsDraftDirty(true);
              }}
            />
          </label>

          <label style={{ display: "block" }}>
            Time
            <input
              type="time"
              style={formInputStyle}
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setIsDraftDirty(true);
              }}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: "16px" }}>
          Notes (optional)
          <textarea
            style={{
              ...formInputStyle,
              height: "110px",
              resize: "vertical",
            }}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setIsDraftDirty(true);
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button type="submit" style={buttonStyle}>
            {editingEntryId === null ? "Save Entry" : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={cancelEntry}
            style={{
              ...buttonStyle,
              backgroundColor: "#666",
            }}
          >
            Cancel Entry
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              ...buttonStyle,
              backgroundColor: "#666",
            }}
          >
            Back to Timeline
          </button>
        </div>
      </form>

      <section
        style={{
          marginTop: "30px",
          maxWidth: "700px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2>Saved Entries</h2>

        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No food entries yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {sortedEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  background: "#1f2937",
                  borderRadius: "12px",
                  overflowWrap: "anywhere",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    alignItems: "baseline",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{entry.name}</h3>
                  <span style={{ color: "#9ca3af" }}>
                    {new Date(entry.loggedAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ lineHeight: "1.6", marginBottom: 0 }}>
                  {entry.calories} calories · Protein {entry.protein}g ·
                  Carbohydrates {entry.carbohydrates}g · Fat {entry.fat}g
                </p>

                {entry.portion?.basis && (
                  <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                    {entry.portion.amount} {entry.portion.unit} x{" "}
                    {entry.portion.basis.description}
                  </p>
                )}

                {entry.notes && (
                  <p style={{ color: "#d1d5db", whiteSpace: "pre-wrap" }}>
                    {entry.notes}
                  </p>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => editEntry(entry)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    style={{
                      background: "#dc2626",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

export default NutritionPage;
