import { useEffect, useRef, useState } from "react";
import FoodSearch from "./FoodSearch";
import GroceryFoodForm from "./GroceryFoodForm";
import ConfirmationMessage from "./ConfirmationMessage";
import { motionScrollBehavior } from "../services/motionPreference";
import {
  FOOD_NUTRIENT_KEYS,
  NUTRIENT_KEYS,
  TRACKED_NUTRIENT_KEYS,
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

function formatNutrient(value, unit = "") {
  return value === null || value === undefined ? "Unknown" : `${value}${unit}`;
}

function getEntrySourceDetails(foodReference) {
  if (foodReference?.sourceType === "restaurant") {
    return ["Restaurant", foodReference.restaurantName].filter(Boolean);
  }
  if (
    foodReference?.sourceType === "grocery" ||
    foodReference?.source === "usda-fooddata-central"
  ) {
    return [
      "Grocery",
      foodReference.label || "USDA",
      foodReference.categoryLabel || foodReference.category,
      foodReference.brand,
    ].filter(Boolean);
  }
  if (
    foodReference?.sourceType === "grocery-custom" ||
    foodReference?.source === "user-added"
  ) {
    return [
      "User-entered",
      "Grocery",
      foodReference.categoryLabel || foodReference.category,
      foodReference.brand,
    ].filter(Boolean);
  }
  if (foodReference?.sourceType === "beverage") {
    return [
      "Packaged drink",
      foodReference.brand,
      foodReference.packageSize,
    ].filter(Boolean);
  }
  if (foodReference) return ["Trace starter"];
  return ["User-entered"];
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
        if (!Object.prototype.hasOwnProperty.call(entry.nutritionBasis, nutrient)) {
          return false;
        }
        const value = entry.nutritionBasis[nutrient];
        if (value === null || value === undefined) return true;
        const number = Number(value);
        return Number.isFinite(number) && number >= 0;
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
      sodium: 0,
    };

    TRACKED_NUTRIENT_KEYS.forEach((nutrient) => {
      if (entry[nutrient] === null || entry[nutrient] === undefined) {
        totals.incompleteNutrients = [...new Set([...(totals.incompleteNutrients || []), nutrient])];
      } else {
        totals[nutrient] += toNutritionNumber(entry[nutrient]);
      }
    });
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
        sodium: sum.sodium + day.sodium,
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 0 }
    );

    const result = {
      loggedDays,
      calories: loggedDays ? totals.calories / loggedDays : 0,
      protein: loggedDays ? totals.protein / loggedDays : 0,
      carbohydrates: loggedDays ? totals.carbohydrates / loggedDays : 0,
      fat: loggedDays ? totals.fat / loggedDays : 0,
      sodium: loggedDays ? totals.sodium / loggedDays : 0,
    };
    const incompleteNutrients = [...new Set(dayTotals.flatMap((day) => day.incompleteNutrients || []))];
    if (incompleteNutrients.length) result.incompleteNutrients = incompleteNutrients;
    return result;
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
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [notes, setNotes] = useState("");
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [foodReference, setFoodReference] = useState(null);
  const [servingQuantity, setServingQuantity] = useState("1");
  const [portionBasis, setPortionBasis] = useState(null);
  const [nutritionBasis, setNutritionBasis] = useState(null);
  const [unknownNutritionKeys, setUnknownNutritionKeys] = useState(new Set());
  const [restaurantServingOptions, setRestaurantServingOptions] = useState([]);
  const [selectedRestaurantServingId, setSelectedRestaurantServingId] = useState("");
  const [foodSearchResetKey, setFoodSearchResetKey] = useState(0);
  const [manualServingAmount, setManualServingAmount] = useState("1");
  const [manualServingUnit, setManualServingUnit] = useState("serving");
  const [customServingDescription, setCustomServingDescription] = useState("");
  const [saveAsReusableFood, setSaveAsReusableFood] = useState(true);
  const [servingDefinitionError, setServingDefinitionError] = useState("");
  const [entryStatusMessage, setEntryStatusMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const confirmationTimerRef = useRef(null);
  const nutritionPageTopRef = useRef(null);
  const todaySectionRef = useRef(null);
  const entryFormRef = useRef(null);
  const nameInputRef = useRef(null);
  const [goalValues, setGoalValues] = useState({
    calories: String(nutritionGoals.calories),
    protein: String(nutritionGoals.protein),
    carbohydrates: String(nutritionGoals.carbohydrates),
    fat: String(nutritionGoals.fat),
    sodium: String(nutritionGoals.sodium ?? 0),
  });

  useEffect(() => () => clearTimeout(confirmationTimerRef.current), []);

  function showConfirmation(message) {
    setConfirmationMessage(message);
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = setTimeout(() => setConfirmationMessage(""), 3200);
  }

  useEffect(() => {
    setGoalValues({
      calories: String(nutritionGoals.calories),
      protein: String(nutritionGoals.protein),
      carbohydrates: String(nutritionGoals.carbohydrates),
      fat: String(nutritionGoals.fat),
      sodium: String(nutritionGoals.sodium ?? 0),
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
        calories: entry.calories == null ? totals.calories : totals.calories + toNutritionNumber(entry.calories),
        protein: entry.protein == null ? totals.protein : totals.protein + toNutritionNumber(entry.protein),
        carbohydrates: entry.carbohydrates == null ? totals.carbohydrates : totals.carbohydrates + toNutritionNumber(entry.carbohydrates),
        fat: entry.fat == null ? totals.fat : totals.fat + toNutritionNumber(entry.fat),
        sodium: entry.sodium == null ? totals.sodium : totals.sodium + toNutritionNumber(entry.sodium),
        incompleteNutrients: [...new Set([...(totals.incompleteNutrients || []), ...TRACKED_NUTRIENT_KEYS.filter((nutrient) => entry[nutrient] == null)])],
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 0 }
  );
  const nutritionMetrics = [
    { key: "calories", label: "Calories", unit: "" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
  ];
  const sodiumMetric = { key: "sodium", label: "Sodium", unit: "mg" };
  const averageMetrics = [...nutritionMetrics, sodiumMetric];
  const nutritionAverages = calculateNutritionAverages(nutritionEntries, today);
  const sodiumGoal = toNutritionNumber(nutritionGoals.sodium);
  const hasSodiumGoal = sodiumGoal > 0;
  const sodiumProgress = hasSodiumGoal
    ? (todayTotals.sodium / sodiumGoal) * 100
    : 0;
  const averagePeriods = [
    { key: "lastSevenDays", label: "Weekly Totals" },
    { key: "thisMonth", label: "Monthly Totals" },
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
    return ["calories", "sodium"].includes(metricKey)
      ? Math.round(value)
      : Number(value.toFixed(1));
  }

  function saveFood(event) {
    event.preventDefault();

    if (name.trim() === "") return;

    const fallbackDateTime = getCurrentLocalDateTime();
    const nutritionInputs = { calories, protein, carbohydrates, fat, fiber, sodium };
    const enteredNutrition = Object.fromEntries(FOOD_NUTRIENT_KEYS.map((nutrient) => [
      nutrient,
      nutritionInputs[nutrient] === ""
        ? null
        : toNutritionNumber(nutritionInputs[nutrient]),
    ]));
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
          sourceType: reusableFoodResult.food.sourceType || "grocery-custom",
          category: reusableFoodResult.food.category,
          categoryLabel: reusableFoodResult.food.categoryLabel,
          ...(reusableFoodResult.food.brand
            ? { brand: reusableFoodResult.food.brand }
            : {}),
          modified: false,
        };
        entryPortionBasis = { ...reusableFoodResult.food.serving };
        entryNutritionBasis = { ...reusableFoodResult.food.nutrients };
      }
    }

    const completenessNutrition = entryNutritionBasis || enteredNutrition;
    const scaledCatalogNutrition = entryNutritionBasis
      ? scaleNutrition(entryNutritionBasis, isCreatingManualFood ? 1 : servingQuantity)
      : null;
    const entry = {
      name: name.trim(),
      ...enteredNutrition,
      ...(scaledCatalogNutrition && Object.prototype.hasOwnProperty.call(scaledCatalogNutrition, "totalSugar")
        ? {
            totalSugar: scaledCatalogNutrition.totalSugar,
            addedSugar: scaledCatalogNutrition.addedSugar,
          }
        : {}),
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
      ...(TRACKED_NUTRIENT_KEYS.some((nutrient) => completenessNutrition[nutrient] == null)
        ? { nutritionCompleteness: { status: "partial", unknownNutrients: TRACKED_NUTRIENT_KEYS.filter((nutrient) => completenessNutrition[nutrient] == null) } }
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
    showConfirmation("Meal traced");

    resetForm();
    setFoodSearchResetKey((currentKey) => currentKey + 1);
    todaySectionRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
  }

  function resetForm() {
    const currentDateTime = getCurrentLocalDateTime();

    setName("");
    setCalories("");
    setProtein("");
    setCarbohydrates("");
    setFat("");
    setFiber("");
    setSodium("");
    setDate(currentDateTime.date);
    setTime(currentDateTime.time);
    setNotes("");
    setIsDraftDirty(false);
    setEditingEntryId(null);
    setFoodReference(null);
    setServingQuantity("1");
    setPortionBasis(null);
    setNutritionBasis(null);
    setUnknownNutritionKeys(new Set());
    setRestaurantServingOptions([]);
    setSelectedRestaurantServingId("");
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
    const servingOptions = food.servingOptions?.length ? food.servingOptions : [{ id: food.id, serving: food.serving, nutrients: food.nutrients, provenance: food.provenance }];
    const selectedOption = servingOptions[0];
    const selectedNutritionBasis = {
      sodium: null,
      fiber: null,
      ...selectedOption.nutrients,
    };
    const selectedPortionBasis = {
      amount: selectedOption.serving.amount,
      unit: selectedOption.serving.unit,
      description: selectedOption.serving.description,
      ...(selectedOption.serving.grams === undefined
        ? {}
        : { grams: selectedOption.serving.grams }),
    };

    setName(food.name);
    setCalories(selectedNutritionBasis.calories === null ? "" : String(selectedNutritionBasis.calories));
    setProtein(selectedNutritionBasis.protein === null ? "" : String(selectedNutritionBasis.protein));
    setCarbohydrates(selectedNutritionBasis.carbohydrates === null ? "" : String(selectedNutritionBasis.carbohydrates));
    setFat(selectedNutritionBasis.fat === null ? "" : String(selectedNutritionBasis.fat));
    setFiber(selectedNutritionBasis.fiber === null ? "" : String(selectedNutritionBasis.fiber));
    setSodium(selectedNutritionBasis.sodium === null ? "" : String(selectedNutritionBasis.sodium));
    setUnknownNutritionKeys(new Set(FOOD_NUTRIENT_KEYS.filter((nutrient) => selectedNutritionBasis[nutrient] === null)));
    setRestaurantServingOptions(servingOptions);
    setSelectedRestaurantServingId(selectedOption.id);
    setFoodReference({
      source: food.provenance.source,
      sourceId: food.provenance.sourceId,
      confidence: food.provenance.confidence,
      ...(food.provenance.label ? { label: food.provenance.label } : {}),
      ...(food.provenance.completeness ? { completeness: food.provenance.completeness } : {}),
      ...(food.sourceType === "restaurant"
        ? {
            sourceType: "restaurant",
            restaurantId: food.restaurant.id,
            restaurantName: food.restaurant.name,
          }
        : food.sourceType === "grocery"
          ? {
              sourceType: "grocery",
              dataType: food.dataType || "generic",
              category: food.category,
              categoryLabel: food.categoryLabel,
              preparationState: food.preparationState,
              ...(food.brand ? { brand: food.brand } : {}),
            }
        : food.sourceType === "beverage"
          ? {
              sourceType: "beverage",
              brand: food.brand,
              category: food.category,
              categoryLabel: food.categoryLabel,
              packageSize: food.beverage.packageSize,
              caffeineMg: food.beverage.caffeineMg,
            }
        : food.sourceType === "grocery-custom" || food.provenance.source === "user-added"
          ? {
              sourceType: "grocery-custom",
              category: food.category || "other",
              categoryLabel: food.categoryLabel,
              ...(food.brand ? { brand: food.brand } : {}),
            }
          : {}),
      modified: false,
    });
    setServingQuantity("1");
    setPortionBasis(selectedPortionBasis);
    setNutritionBasis(selectedNutritionBasis);
    setServingDefinitionError("");
    setEntryStatusMessage("");
    setIsDraftDirty(true);

    window.requestAnimationFrame(() => {
      entryFormRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
      nameInputRef.current?.focus();
    });
  }

  function selectRestaurantServing(optionId) {
    const option = restaurantServingOptions.find((candidate) => candidate.id === optionId);
    if (!option) return;
    setSelectedRestaurantServingId(option.id);
    setCalories(option.nutrients.calories === null ? "" : String(option.nutrients.calories));
    setProtein(option.nutrients.protein === null ? "" : String(option.nutrients.protein));
    setCarbohydrates(option.nutrients.carbohydrates === null ? "" : String(option.nutrients.carbohydrates));
    setFat(option.nutrients.fat === null ? "" : String(option.nutrients.fat));
    setFiber(option.nutrients.fiber === null || option.nutrients.fiber === undefined ? "" : String(option.nutrients.fiber));
    setSodium(option.nutrients.sodium === null ? "" : String(option.nutrients.sodium));
    setUnknownNutritionKeys(new Set(FOOD_NUTRIENT_KEYS.filter((nutrient) => option.nutrients[nutrient] === null || option.nutrients[nutrient] === undefined)));
    setPortionBasis({ ...option.serving });
    setNutritionBasis({ ...option.nutrients });
    const completeness = NUTRIENT_KEYS.every((nutrient) => option.nutrients[nutrient] !== null) ? "complete" : "partial";
    setFoodReference((current) => current ? { ...current, sourceId: option.provenance.sourceId, completeness } : current);
    setIsDraftDirty(true);
  }

  function editEntry(entry) {
    const localDateTime = getLocalDateTimeFromTimestamp(entry.loggedAt);

    setName(entry.name);
    setCalories(entry.calories === null ? "" : String(entry.calories));
    setProtein(entry.protein === null ? "" : String(entry.protein));
    setCarbohydrates(entry.carbohydrates === null ? "" : String(entry.carbohydrates));
    setFat(entry.fat === null ? "" : String(entry.fat));
    setFiber(entry.fiber === null || entry.fiber === undefined ? "" : String(entry.fiber));
    setSodium(entry.sodium === null || entry.sodium === undefined ? "" : String(entry.sodium));
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
      setSodium(entry.nutritionBasis.sodium == null ? "" : String(entry.nutritionBasis.sodium));
      setFiber(entry.nutritionBasis.fiber == null ? "" : String(entry.nutritionBasis.fiber));
      setUnknownNutritionKeys(new Set(FOOD_NUTRIENT_KEYS.filter((nutrient) => entry.nutritionBasis[nutrient] == null)));
    } else {
      setServingQuantity("1");
      setPortionBasis(null);
      setNutritionBasis(null);
    }
    entryFormRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
  }

  function changeServingQuantity(value) {
    const scaledNutrition = scaleNutrition(nutritionBasis, value);

    setServingQuantity(value);
    setCalories(scaledNutrition.calories === null ? "" : String(scaledNutrition.calories));
    setProtein(scaledNutrition.protein === null ? "" : String(scaledNutrition.protein));
    setCarbohydrates(scaledNutrition.carbohydrates === null ? "" : String(scaledNutrition.carbohydrates));
    setFat(scaledNutrition.fat === null ? "" : String(scaledNutrition.fat));
    setFiber(scaledNutrition.fiber === null || scaledNutrition.fiber === undefined ? "" : String(scaledNutrition.fiber));
    setSodium(scaledNutrition.sodium === null ? "" : String(scaledNutrition.sodium));
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
      nutritionPageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
    });
  }

  function saveGoals(event) {
    event.preventDefault();

    if (saveNutritionGoals({
      calories: toNutritionNumber(goalValues.calories),
      protein: toNutritionNumber(goalValues.protein),
      carbohydrates: toNutritionNumber(goalValues.carbohydrates),
      fat: toNutritionNumber(goalValues.fat),
      sodium: toNutritionNumber(goalValues.sodium),
    })) showConfirmation("Goals traced");
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
    <div className="trace-feature-page trace-feature-page--nutrition" ref={nutritionPageTopRef} data-testid="nutrition-page" style={containerStyle}>
      <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Daily ledger</p>
      <h1 style={{ marginBottom: "10px" }}>Nutrition</h1>
      <ConfirmationMessage message={confirmationMessage} />

      <p className="trace-feature-page__lede" style={{ color: "#bbb", marginBottom: "30px" }}>
        Track your food and nutrition here.
      </p>
      </header>

      <button
        className="trace-action trace-action--secondary"
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

      <section className="trace-nutrition-goals-disclosure" aria-labelledby="nutrition-goals-toggle">
        <button
          aria-controls="nutrition-goals-panel"
          aria-expanded={goalsExpanded}
          className="trace-action trace-action--secondary trace-nutrition-goals-toggle"
          id="nutrition-goals-toggle"
          type="button"
          onClick={() => setGoalsExpanded((expanded) => !expanded)}
        >
          <span>Nutrition Goals</span>
          <span aria-hidden="true" className="trace-nutrition-goals-toggle__indicator">
            {goalsExpanded ? "\u2212" : "+"}
          </span>
        </button>

        <form
          hidden={!goalsExpanded}
          id="nutrition-goals-panel"
          className="trace-feature-surface trace-feature-form trace-nutrition-goals"
          onSubmit={saveGoals}
          style={{
            background: "#1f2937",
            borderRadius: "16px",
            marginTop: "12px",
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
            {averageMetrics.map((metric) => (
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

          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
            Save Goals
          </button>
        </form>
      </section>

      <FoodSearch
        onSelectFood={selectFood}
        inputStyle={inputStyle}
        userFoods={userFoods}
        resetKey={foodSearchResetKey}
      />

      <GroceryFoodForm
        saveUserFood={saveUserFood}
        buttonStyle={buttonStyle}
        inputStyle={inputStyle}
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
        className="trace-feature-surface trace-feature-form trace-nutrition-entry"
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

        {restaurantServingOptions.length > 1 && (
          <label style={{ display: "block", marginBottom: "16px" }}>
            Menu serving size
            <select value={selectedRestaurantServingId} onChange={(event) => selectRestaurantServing(event.target.value)} style={formInputStyle}>
              {restaurantServingOptions.map((option) => <option key={option.id} value={option.id}>{option.serving.description}</option>)}
            </select>
          </label>
        )}

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
            {foodReference?.sourceType === "beverage" && (
              <>
                <p style={{ color: "#9ca3af", marginBottom: 0, marginTop: "4px" }}>
                  Packaged drink: {foodReference.brand}
                </p>
                {foodReference.caffeineMg !== null && (
                  <p style={{ color: "#9ca3af", marginBottom: 0, marginTop: "4px" }}>
                    Caffeine per serving: {foodReference.caffeineMg} mg
                  </p>
                )}
              </>
            )}
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
            ["calories", "Calories", calories, setCalories],
            ["protein", "Protein (g)", protein, setProtein],
            ["carbohydrates", "Carbohydrates (g)", carbohydrates, setCarbohydrates],
            ["fat", "Fat (g)", fat, setFat],
            ["fiber", "Fiber (g)", fiber, setFiber],
            ["sodium", "Sodium (mg)", sodium, setSodium],
          ].map(([nutrient, label, value, setValue]) => (
            <label key={label} style={{ display: "block" }}>
              {label}
              <input
                aria-label={label}
                type="number"
                min="0"
                step="any"
                style={formInputStyle}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setUnknownNutritionKeys((current) => {
                    const next = new Set(current);
                    if (event.target.value === "") next.add(nutrient);
                    else next.delete(nutrient);
                    return next;
                  });
                  setIsDraftDirty(true);
                  markSelectedFoodModified();
                }}
              />
              {unknownNutritionKeys.has(nutrient) && <span aria-hidden="true" style={{ color: "#fbbf24", display: "block", fontSize: "13px", marginTop: "4px" }}>Unknown</span>}
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
          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
            {editingEntryId === null ? "Save Entry" : "Save Changes"}
          </button>

          <button
            className="trace-action trace-action--secondary"
            type="button"
            onClick={cancelEntry}
            style={{
              ...buttonStyle,
              backgroundColor: "#666",
            }}
          >
            Cancel Entry
          </button>

        </div>
      </form>

      <section
        className="trace-feature-surface trace-nutrition-today"
        ref={todaySectionRef}
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
        <h2 style={{ marginTop: 0 }}>Daily Totals</h2>

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
              <div className="trace-stat-card" key={metric.key}>
                <strong>
                  {metric.label}
                  {metric.unit ? ` (${metric.unit})` : ""}
                </strong>
                <p style={{ marginBottom: hasGoal ? "8px" : 0 }}>
                  {hasGoal
                    ? `${current}${metric.unit} / ${goal}${metric.unit}`
                    : `${current}${metric.unit} · No goal set`}
                </p>
                {todayTotals.incompleteNutrients?.includes(metric.key) && <p style={{ color: "#fbbf24", margin: "-4px 0 8px" }}>Incomplete: one or more logged foods had an unknown value.</p>}

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
        <div
          style={{
            borderTop: "1px solid #374151",
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
            marginTop: "18px",
            paddingTop: "18px",
          }}
        >
          <div className="trace-stat-card">
          <strong>Sodium (mg)</strong>
          <p style={{ marginBottom: hasSodiumGoal ? "8px" : 0 }}>
            {hasSodiumGoal
              ? `${todayTotals.sodium} / ${sodiumGoal} mg`
              : `${todayTotals.sodium}mg`}
            {todayTotals.incompleteNutrients?.includes("sodium") && " · Incomplete: one or more logged foods had unknown sodium."}
          </p>
          {todayTotals.incompleteNutrients?.includes("sodium") && (
            <p style={{ color: "#fbbf24", margin: "-4px 0 8px" }}>
              Progress may be incomplete because one or more logged foods had unknown sodium.
            </p>
          )}
          {hasSodiumGoal && (
            <>
              <div
                aria-label="Sodium progress"
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
                    width: `${Math.min(sodiumProgress, 100)}%`,
                  }}
                />
              </div>
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                {Math.round(sodiumProgress)}%
              </p>
            </>
          )}
        </div>
        <div aria-hidden="true" />
        <div aria-hidden="true" />
        <div aria-hidden="true" />
        </div>
      </section>

      <section
        className="trace-feature-surface trace-nutrition-averages"
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
                className="trace-data-card trace-data-card--subtle"
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
                  {averageMetrics.map((metric) => (
                    <div key={metric.key}>
                      <strong>Average {metric.label}</strong>
                      <div>
                        {formatAverage(averages[metric.key], metric.key)}
                        {metric.unit}
                        {averages.incompleteNutrients?.includes(metric.key) ? " (incomplete)" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="trace-feature-section trace-feature-history"
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
                className="trace-data-card"
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
                  {formatNutrient(entry.calories)} calories · Protein {formatNutrient(entry.protein, " g")} ·
                  Carbohydrates {formatNutrient(entry.carbohydrates, " g")} · Fat {formatNutrient(entry.fat, " g")} · Fiber {formatNutrient(entry.fiber, " g")} · Sodium {formatNutrient(entry.sodium, " mg")}
                </p>

                <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: 0 }}>
                  {getEntrySourceDetails(entry.foodReference).join(" · ")}
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
                    className="trace-action trace-action--secondary"
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
                    className="trace-action trace-action--danger"
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

      <nav
        aria-label="Nutrition page navigation"
        className="trace-nutrition-bottom-navigation"
      >
        <button
          className="trace-action trace-action--secondary"
          data-testid="nutrition-bottom-back"
          type="button"
          onClick={onBack}
          style={{
            ...buttonStyle,
            backgroundColor: "#666",
          }}
        >
          Back to Timeline
        </button>
      </nav>

    </div>
  );
}

export default NutritionPage;
