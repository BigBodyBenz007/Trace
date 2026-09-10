import { useEffect, useRef, useState } from "react";
import FoodSearch from "./FoodSearch";
import GroceryFoodForm from "./GroceryFoodForm";
import ConfirmationMessage from "./ConfirmationMessage";
import WaterTrackerSection from "./WaterTrackerSection";
import BarcodeScannerDialog from "./BarcodeScannerDialog";
import { motionScrollBehavior } from "../services/motionPreference";
import {
  clearFormDraft,
  clearFormDraftsForContext,
  formDraftFingerprint,
  readFormDraft,
  writeFormDraft,
} from "../services/formDrafts";
import { createRemoteBarcodeLookup } from "../services/remoteBarcodeLookup";
import { applyRemoteNutrientPrecision } from "../services/barcodeNutritionSelection";
import { lookupUserFoodByBarcode } from "../services/userFoodCatalog";
import {
  TRACE_FEATURES,
  traceFeatureAccess,
} from "../services/featureAccess";
import { webAppLifecycleAdapter } from "../services/appLifecycleAdapter";
import {
  WATER_UNITS,
  calculateWaterSummary,
  formatWaterAmount,
  millilitersToWaterAmount,
  waterAmountToMilliliters,
} from "../services/waterTracker";
import {
  NUTRITION_COMPLETENESS_NUTRIENT_KEYS,
  NUTRITION_ENTRY_NUTRIENT_KEYS,
  NUTRIENT_KEYS,
  SUGAR_NUTRIENT_KEYS,
  TRACKED_NUTRIENT_KEYS,
  getSugarValidationError,
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

const FOOD_HISTORY_BATCH_SIZE = 10;

function waterGoalInputValue(amountMl, unit) {
  const amount = toNutritionNumber(amountMl);
  if (amount <= 0) return "";
  const displayed = millilitersToWaterAmount(amount, unit);
  return String(unit === WATER_UNITS.OUNCES
    ? Number(displayed.toFixed(1))
    : Math.round(displayed));
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
      foodReference.providerAttribution || "User-entered",
      "Grocery",
      foodReference.categoryLabel || foodReference.category,
      foodReference.brand,
      foodReference.packageSize,
    ].filter(Boolean);
  }
  if (foodReference?.sourceType === "beverage") {
    return [
      "Packaged drink",
      foodReference.brand,
      foodReference.packageSize,
    ].filter(Boolean);
  }
  if (foodReference?.sourceType === "packaged-food") {
    return [
      "Packaged food",
      foodReference.brand,
      foodReference.packageSize,
    ].filter(Boolean);
  }
  if (foodReference?.sourceType === "remote-barcode") {
    return [
      "Scanned product",
      foodReference.providerAttribution || foodReference.label,
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

function emptyNutritionEntryDraft(dateTime = getCurrentLocalDateTime()) {
  return {
    name: "",
    calories: "",
    protein: "",
    carbohydrates: "",
    fat: "",
    fiber: "",
    sodium: "",
    totalSugar: "",
    addedSugar: "",
    date: dateTime.date,
    time: dateTime.time,
    notes: "",
    foodReference: null,
    servingQuantity: "1",
    portionBasis: null,
    nutritionBasis: null,
    unknownNutritionKeys: [],
    restaurantServingOptions: [],
    selectedRestaurantServingId: "",
    manualServingAmount: "1",
    manualServingUnit: "serving",
    customServingDescription: "",
    saveAsReusableFood: true,
  };
}

export function calculateDailySugarTotals(nutritionEntries, today = new Date()) {
  const totals = {
    entryCount: 0,
    totalSugar: { knownCount: 0, value: 0 },
    addedSugar: { knownCount: 0, value: 0 },
  };

  nutritionEntries.forEach((entry) => {
    const loggedAt = new Date(entry.loggedAt);
    if (Number.isNaN(loggedAt.getTime()) || !isSameLocalDate(loggedAt, today)) return;

    totals.entryCount += 1;
    SUGAR_NUTRIENT_KEYS.forEach((nutrient) => {
      const value = Number(entry[nutrient]);
      if (entry[nutrient] === null || entry[nutrient] === undefined || !Number.isFinite(value) || value < 0) return;
      totals[nutrient].knownCount += 1;
      totals[nutrient].value += value;
    });
  });

  return totals;
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
  nutritionRecovery = null,
  nutritionRecoveryDelivery = null,
  downloadNutritionRecovery = () => false,
  shareNutritionRecovery = () => false,
  userFoods = [],
  nutritionGoals,
  saveNutritionEntry,
  saveUserFood = () => ({
    status: "error",
    food: null,
    matchesDefinition: false,
  }),
  updateUserFood = () => ({ status: "error", food: null }),
  deleteUserFood = () => false,
  updateNutritionEntry,
  deleteNutritionEntry,
  saveNutritionGoals,
  waterEntries = [],
  waterUnit = "oz",
  changeWaterUnit = () => false,
  saveWaterEntry = () => false,
  updateWaterEntry = () => false,
  deleteWaterEntry = () => false,
  buttonStyle,
  inputStyle,
  containerStyle,
  barcodeLookupService = null,
  barcodeFeatureAccess = traceFeatureAccess,
  barcodeCamera,
  lifecycleAdapter = webAppLifecycleAdapter,
  reducedMotion = false,
}) {
  const initialDateTime = getCurrentLocalDateTime();
  const entryDraftContextRef = useRef({ domain: "nutrition-entry", context: "create", sourceFingerprint: null });
  const initialEntryDraftRef = useRef(emptyNutritionEntryDraft(initialDateTime));
  const restoredEntryDraftRef = useRef(readFormDraft(localStorage, entryDraftContextRef.current, initialEntryDraftRef.current));
  const restoredEntryValue = restoredEntryDraftRef.current.status === "restored"
    ? restoredEntryDraftRef.current.value
    : initialEntryDraftRef.current;
  if (restoredEntryDraftRef.current.status === "restored") {
    initialEntryDraftRef.current = restoredEntryDraftRef.current.entry.initialValue;
  }
  const [name, setName] = useState(restoredEntryValue.name);
  const [calories, setCalories] = useState(restoredEntryValue.calories);
  const [protein, setProtein] = useState(restoredEntryValue.protein);
  const [carbohydrates, setCarbohydrates] = useState(restoredEntryValue.carbohydrates);
  const [fat, setFat] = useState(restoredEntryValue.fat);
  const [fiber, setFiber] = useState(restoredEntryValue.fiber);
  const [sodium, setSodium] = useState(restoredEntryValue.sodium);
  const [totalSugar, setTotalSugar] = useState(restoredEntryValue.totalSugar);
  const [addedSugar, setAddedSugar] = useState(restoredEntryValue.addedSugar);
  const [date, setDate] = useState(restoredEntryValue.date);
  const [time, setTime] = useState(restoredEntryValue.time);
  const [notes, setNotes] = useState(restoredEntryValue.notes);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [foodReference, setFoodReference] = useState(restoredEntryValue.foodReference);
  const [servingQuantity, setServingQuantity] = useState(restoredEntryValue.servingQuantity);
  const [portionBasis, setPortionBasis] = useState(restoredEntryValue.portionBasis);
  const [nutritionBasis, setNutritionBasis] = useState(restoredEntryValue.nutritionBasis);
  const [unknownNutritionKeys, setUnknownNutritionKeys] = useState(new Set(restoredEntryValue.unknownNutritionKeys));
  const [restaurantServingOptions, setRestaurantServingOptions] = useState(restoredEntryValue.restaurantServingOptions);
  const [selectedRestaurantServingId, setSelectedRestaurantServingId] = useState(restoredEntryValue.selectedRestaurantServingId);
  const [foodSearchResetKey, setFoodSearchResetKey] = useState(0);
  const [manualServingAmount, setManualServingAmount] = useState(restoredEntryValue.manualServingAmount);
  const [manualServingUnit, setManualServingUnit] = useState(restoredEntryValue.manualServingUnit);
  const [customServingDescription, setCustomServingDescription] = useState(restoredEntryValue.customServingDescription);
  const [saveAsReusableFood, setSaveAsReusableFood] = useState(restoredEntryValue.saveAsReusableFood);
  const [servingDefinitionError, setServingDefinitionError] = useState("");
  const [nutritionValidationError, setNutritionValidationError] = useState(restoredEntryDraftRef.current.status === "malformed" || restoredEntryDraftRef.current.status === "invalid-value"
    ? "Trace found malformed unfinished form data and left it unchanged."
    : "");
  const [entryStatusMessage, setEntryStatusMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [visibleEntryCount, setVisibleEntryCount] = useState(FOOD_HISTORY_BATCH_SIZE);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const confirmationTimerRef = useRef(null);
  const barcodeLookupRef = useRef(barcodeLookupService);
  const userFoodsRef = useRef(userFoods);
  userFoodsRef.current = userFoods;
  const barcodeScanButtonRef = useRef(null);
  const nutritionPageTopRef = useRef(null);
  const todaySectionRef = useRef(null);
  const entryFormRef = useRef(null);
  const nameInputRef = useRef(null);
  const previousWaterUnitRef = useRef(waterUnit);
  const savedWaterGoalMlRef = useRef(toNutritionNumber(nutritionGoals.waterGoalMl));
  const goalDraftContextRef = useRef({
    domain: "nutrition-goals",
    context: "goals",
    sourceFingerprint: formDraftFingerprint(nutritionGoals),
  });
  const initialGoalDraftRef = useRef({
    goalValues: {
      calories: String(nutritionGoals.calories),
      protein: String(nutritionGoals.protein),
      carbohydrates: String(nutritionGoals.carbohydrates),
      fat: String(nutritionGoals.fat),
      sodium: String(nutritionGoals.sodium ?? 0),
    },
    waterGoalDraftMl: toNutritionNumber(nutritionGoals.waterGoalMl),
    waterGoalValue: waterGoalInputValue(nutritionGoals.waterGoalMl, waterUnit),
    waterUnit,
  });
  const restoredGoalDraftRef = useRef(readFormDraft(localStorage, goalDraftContextRef.current, initialGoalDraftRef.current));
  const restoredGoalValue = restoredGoalDraftRef.current.status === "restored"
    ? restoredGoalDraftRef.current.value
    : initialGoalDraftRef.current;
  if (restoredGoalDraftRef.current.status === "restored") {
    initialGoalDraftRef.current = restoredGoalDraftRef.current.entry.initialValue;
  }
  const [goalValues, setGoalValues] = useState(restoredGoalValue.goalValues || {
    calories: String(nutritionGoals.calories),
    protein: String(nutritionGoals.protein),
    carbohydrates: String(nutritionGoals.carbohydrates),
    fat: String(nutritionGoals.fat),
    sodium: String(nutritionGoals.sodium ?? 0),
  });
  const [waterGoalDraftMl, setWaterGoalDraftMl] = useState(restoredGoalValue.waterGoalDraftMl);
  const [waterGoalValue, setWaterGoalValue] = useState(restoredGoalValue.waterUnit === waterUnit
    ? restoredGoalValue.waterGoalValue
    : waterGoalInputValue(restoredGoalValue.waterGoalDraftMl, waterUnit));
  const [goalDraftError, setGoalDraftError] = useState(restoredGoalDraftRef.current.status === "conflict"
    ? "Nutrition goals changed after an unfinished edit was stored, so Trace did not apply the older draft."
    : restoredGoalDraftRef.current.status === "malformed" || restoredGoalDraftRef.current.status === "invalid-value"
      ? "Trace found malformed unfinished form data and left it unchanged."
      : "");
  const barcodeAccess = barcodeFeatureAccess.getAccess(TRACE_FEATURES.BARCODE_SCANNER);

  useEffect(() => () => clearTimeout(confirmationTimerRef.current), []);

  function showConfirmation(message) {
    setConfirmationMessage(message);
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = setTimeout(() => setConfirmationMessage(""), 3200);
  }

  useEffect(() => {
    const sourceFingerprint = formDraftFingerprint(nutritionGoals);
    if (sourceFingerprint === goalDraftContextRef.current.sourceFingerprint) return;
    const nextGoalValues = {
      calories: String(nutritionGoals.calories),
      protein: String(nutritionGoals.protein),
      carbohydrates: String(nutritionGoals.carbohydrates),
      fat: String(nutritionGoals.fat),
      sodium: String(nutritionGoals.sodium ?? 0),
    };
    const nextWaterGoalMl = toNutritionNumber(nutritionGoals.waterGoalMl);
    const nextInitial = {
      goalValues: nextGoalValues,
      waterGoalDraftMl: nextWaterGoalMl,
      waterGoalValue: waterGoalInputValue(nextWaterGoalMl, waterUnit),
      waterUnit,
    };
    goalDraftContextRef.current = { ...goalDraftContextRef.current, sourceFingerprint };
    initialGoalDraftRef.current = nextInitial;
    setGoalValues(nextGoalValues);
    setWaterGoalDraftMl(nextWaterGoalMl);
    setWaterGoalValue(nextInitial.waterGoalValue);
    setGoalDraftError("");
  }, [nutritionGoals, waterUnit]);

  useEffect(() => {
    const savedWaterGoalMl = toNutritionNumber(nutritionGoals.waterGoalMl);
    if (savedWaterGoalMl === savedWaterGoalMlRef.current) return;
    savedWaterGoalMlRef.current = savedWaterGoalMl;
    previousWaterUnitRef.current = waterUnit;
    setWaterGoalDraftMl(savedWaterGoalMl);
    setWaterGoalValue(waterGoalInputValue(savedWaterGoalMl, waterUnit));
  }, [nutritionGoals.waterGoalMl, waterUnit]);

  useEffect(() => {
    if (previousWaterUnitRef.current === waterUnit) return;
    setWaterGoalValue(waterGoalInputValue(waterGoalDraftMl, waterUnit));
    previousWaterUnitRef.current = waterUnit;
  }, [waterGoalDraftMl, waterUnit]);

  useEffect(() => {
    try {
      writeFormDraft(localStorage, entryDraftContextRef.current, initialEntryDraftRef.current, {
        name,
        calories,
        protein,
        carbohydrates,
        fat,
        fiber,
        sodium,
        totalSugar,
        addedSugar,
        date,
        time,
        notes,
        foodReference,
        servingQuantity,
        portionBasis,
        nutritionBasis,
        unknownNutritionKeys: [...unknownNutritionKeys],
        restaurantServingOptions,
        selectedRestaurantServingId,
        manualServingAmount,
        manualServingUnit,
        customServingDescription,
        saveAsReusableFood,
      });
    } catch (storageFailure) {
      setNutritionValidationError("Trace could not preserve this unfinished Nutrition entry. Keep this page open and try again.");
    }
  }, [name, calories, protein, carbohydrates, fat, fiber, sodium, totalSugar, addedSugar, date, time, notes, foodReference, servingQuantity, portionBasis, nutritionBasis, unknownNutritionKeys, restaurantServingOptions, selectedRestaurantServingId, manualServingAmount, manualServingUnit, customServingDescription, saveAsReusableFood]);

  useEffect(() => {
    try {
      writeFormDraft(localStorage, goalDraftContextRef.current, initialGoalDraftRef.current, {
        goalValues,
        waterGoalDraftMl,
        waterGoalValue,
        waterUnit,
      });
    } catch (storageFailure) {
      setGoalDraftError("Trace could not preserve these unfinished Nutrition goals. Keep this page open and try again.");
    }
  }, [goalValues, waterGoalDraftMl, waterGoalValue, waterUnit]);

  const sortedEntries = [...nutritionEntries].sort(
    (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
  );
  const visibleEntries = sortedEntries.slice(0, visibleEntryCount);
  const remainingEntryCount = Math.max(0, sortedEntries.length - visibleEntries.length);
  const nextEntryBatchCount = Math.min(FOOD_HISTORY_BATCH_SIZE, remainingEntryCount);
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
  const dailySugarTotals = calculateDailySugarTotals(nutritionEntries, today);
  const sugarMetrics = [
    { key: "totalSugar", label: "Total Sugar" },
    { key: "addedSugar", label: "Added Sugar" },
  ];
  const sodiumMetric = { key: "sodium", label: "Sodium", unit: "mg" };
  const averageMetrics = [...nutritionMetrics, sodiumMetric];
  const nutritionAverages = calculateNutritionAverages(nutritionEntries, today);
  const sodiumGoal = toNutritionNumber(nutritionGoals.sodium);
  const hasSodiumGoal = sodiumGoal > 0;
  const sodiumProgress = hasSodiumGoal
    ? (todayTotals.sodium / sodiumGoal) * 100
    : 0;
  const waterSummary = calculateWaterSummary(waterEntries, today);
  const waterGoalMl = toNutritionNumber(nutritionGoals.waterGoalMl);
  const hasWaterGoal = waterGoalMl > 0;
  const waterProgress = hasWaterGoal
    ? (waterSummary.todayMl / waterGoalMl) * 100
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

  function entryDraftValue() {
    return {
      name,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sodium,
      totalSugar,
      addedSugar,
      date,
      time,
      notes,
      foodReference,
      servingQuantity,
      portionBasis,
      nutritionBasis,
      unknownNutritionKeys: [...unknownNutritionKeys],
      restaurantServingOptions,
      selectedRestaurantServingId,
      manualServingAmount,
      manualServingUnit,
      customServingDescription,
      saveAsReusableFood,
    };
  }

  function saveFood(event) {
    event.preventDefault();

    if (name.trim() === "") return;

    const sugarError = getSugarValidationError({ totalSugar, addedSugar });
    if (sugarError) {
      setNutritionValidationError(sugarError);
      return;
    }

    const fallbackDateTime = getCurrentLocalDateTime();
    const nutritionInputs = {
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sodium,
      totalSugar,
      addedSugar,
    };
    const enteredNutrition = Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((nutrient) => [
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
      ...(NUTRITION_COMPLETENESS_NUTRIENT_KEYS.some((nutrient) => enteredNutrition[nutrient] == null)
        ? { nutritionCompleteness: { status: "partial", unknownNutrients: NUTRITION_COMPLETENESS_NUTRIENT_KEYS.filter((nutrient) => enteredNutrition[nutrient] == null) } }
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

    if (!resetForm({ clearCurrent: true })) return;
    setFoodSearchResetKey((currentKey) => currentKey + 1);
    todaySectionRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
  }

  function resetForm({ clearCurrent = false } = {}) {
    if (clearCurrent) {
      try {
        clearFormDraft(localStorage, entryDraftContextRef.current);
      } catch (storageFailure) {
        setNutritionValidationError("The Nutrition entry was saved, but Trace could not clear its unfinished draft. Reload and verify it before saving again.");
        return false;
      }
    }
    const currentDateTime = getCurrentLocalDateTime();
    const nextInitial = emptyNutritionEntryDraft(currentDateTime);

    setName("");
    setCalories("");
    setProtein("");
    setCarbohydrates("");
    setFat("");
    setFiber("");
    setSodium("");
    setTotalSugar("");
    setAddedSugar("");
    setDate(currentDateTime.date);
    setTime(currentDateTime.time);
    setNotes("");
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
    setNutritionValidationError("");
    entryDraftContextRef.current = { domain: "nutrition-entry", context: "create", sourceFingerprint: null };
    initialEntryDraftRef.current = nextInitial;
    return true;
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
      totalSugar: null,
      addedSugar: null,
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
    setTotalSugar(selectedNutritionBasis.totalSugar === null ? "" : String(selectedNutritionBasis.totalSugar));
    setAddedSugar(selectedNutritionBasis.addedSugar === null ? "" : String(selectedNutritionBasis.addedSugar));
    setUnknownNutritionKeys(new Set(NUTRITION_ENTRY_NUTRIENT_KEYS.filter((nutrient) => selectedNutritionBasis[nutrient] === null)));
    setRestaurantServingOptions(servingOptions);
    setSelectedRestaurantServingId(selectedOption.id);
    setFoodReference({
      source: food.provenance.source,
      sourceId: food.provenance.sourceId,
      confidence: food.provenance.confidence,
      ...(food.identifiers?.length
        ? { identifiers: food.identifiers.map((identifier) => ({ ...identifier })) }
        : {}),
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
        : food.sourceType === "packaged-food"
          ? {
              sourceType: "packaged-food",
              dataType: "branded",
              brand: food.brand,
              category: food.category,
              categoryLabel: food.categoryLabel,
              packageSize: food.packaged.packageSize,
              servingsPerContainer: food.packaged.servingsPerContainer,
              catalogVersion: food.provenance.catalogVersion,
              catalogBatch: food.provenance.catalogBatch,
              verification: {
                ...food.provenance.verification,
                secondarySources: food.provenance.verification.secondarySources
                  .map((source) => ({ ...source })),
              },
            }
        : food.sourceType === "remote-barcode"
          ? {
              sourceType: "remote-barcode",
              dataType: "branded",
              brand: food.brand,
              packageSize: food.packaged.packageSize,
              servingsPerContainer: food.packaged.servingsPerContainer,
              provider: { ...food.remote.provider },
              providerAttribution: food.remote.provenance.attribution,
              sourceUrl: food.remote.provenance.sourceUrl,
              revisionDate: food.remote.provenance.revisionDate,
              retrievedAt: food.remote.provenance.retrievedAt,
              dataBasis: food.remote.dataBasis,
              unknownFields: [...food.remote.unknownFields],
              providerNutritionBasis: {
                dataBasis: food.remote.dataBasis,
                serving: { ...food.remote.serving },
                nutrients: { ...food.remote.nutrients },
                ...(food.remote.nutritionBasis
                  ? { selection: food.remote.nutritionBasis }
                  : {}),
              },
            }
        : food.sourceType === "grocery-custom" || food.provenance.source === "user-added"
          ? {
              sourceType: "grocery-custom",
              dataType: food.dataType || "user-entered",
              ...(food.identifiers?.length
                ? { dataBasis: food.dataBasis || "serving" }
                : {}),
              category: food.category || "other",
              categoryLabel: food.categoryLabel,
              ...(food.brand ? { brand: food.brand } : {}),
              ...(food.packaged?.packageSize
                ? { packageSize: food.packaged.packageSize }
                : {}),
              ...(food.packaged?.servingsPerContainer
                ? { servingsPerContainer: food.packaged.servingsPerContainer }
                : {}),
              ...(food.providerSourceSnapshot
                ? {
                    providerAttribution: food.provenance.providerAttribution,
                    sourceUrl: food.provenance.sourceUrl,
                    providerSourceSnapshot: food.providerSourceSnapshot,
                  }
                : {}),
            }
          : {}),
      modified: false,
    });
    setServingQuantity("1");
    setPortionBasis(selectedPortionBasis);
    setNutritionBasis(selectedNutritionBasis);
    setServingDefinitionError("");
    setNutritionValidationError("");
    setEntryStatusMessage("");

    window.requestAnimationFrame(() => {
      entryFormRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
      nameInputRef.current?.focus();
    });
  }

  function selectRestaurantServing(optionId) {
    const option = restaurantServingOptions.find((candidate) => candidate.id === optionId);
    if (!option) return;
    const optionNutritionBasis = {
      totalSugar: null,
      addedSugar: null,
      ...option.nutrients,
    };
    setSelectedRestaurantServingId(option.id);
    setCalories(optionNutritionBasis.calories === null ? "" : String(optionNutritionBasis.calories));
    setProtein(optionNutritionBasis.protein === null ? "" : String(optionNutritionBasis.protein));
    setCarbohydrates(optionNutritionBasis.carbohydrates === null ? "" : String(optionNutritionBasis.carbohydrates));
    setFat(optionNutritionBasis.fat === null ? "" : String(optionNutritionBasis.fat));
    setFiber(optionNutritionBasis.fiber === null || optionNutritionBasis.fiber === undefined ? "" : String(optionNutritionBasis.fiber));
    setSodium(optionNutritionBasis.sodium === null ? "" : String(optionNutritionBasis.sodium));
    setTotalSugar(optionNutritionBasis.totalSugar === null ? "" : String(optionNutritionBasis.totalSugar));
    setAddedSugar(optionNutritionBasis.addedSugar === null ? "" : String(optionNutritionBasis.addedSugar));
    setUnknownNutritionKeys(new Set(NUTRITION_ENTRY_NUTRIENT_KEYS.filter((nutrient) => optionNutritionBasis[nutrient] === null || optionNutritionBasis[nutrient] === undefined)));
    setPortionBasis({ ...option.serving });
    setNutritionBasis(optionNutritionBasis);
    const completeness = NUTRIENT_KEYS.every((nutrient) => option.nutrients[nutrient] !== null) ? "complete" : "partial";
    setFoodReference((current) => current ? { ...current, sourceId: option.provenance.sourceId, completeness } : current);
    setNutritionValidationError("");
  }

  function editEntry(entry) {
    const localDateTime = getLocalDateTimeFromTimestamp(entry.loggedAt);
    const hasCalculationBasis = hasValidSavedCalculationBasis(entry);
    const baseDraft = {
      name: entry.name,
      calories: entry.calories === null ? "" : String(entry.calories),
      protein: entry.protein === null ? "" : String(entry.protein),
      carbohydrates: entry.carbohydrates === null ? "" : String(entry.carbohydrates),
      fat: entry.fat === null ? "" : String(entry.fat),
      fiber: hasCalculationBasis
        ? (entry.nutritionBasis.fiber == null ? "" : String(entry.nutritionBasis.fiber))
        : (entry.fiber == null ? "" : String(entry.fiber)),
      sodium: hasCalculationBasis
        ? (entry.nutritionBasis.sodium == null ? "" : String(entry.nutritionBasis.sodium))
        : (entry.sodium == null ? "" : String(entry.sodium)),
      totalSugar: entry.totalSugar == null ? "" : String(entry.totalSugar),
      addedSugar: entry.addedSugar == null ? "" : String(entry.addedSugar),
      date: localDateTime.date,
      time: localDateTime.time,
      notes: entry.notes,
      foodReference: entry.foodReference ? { ...entry.foodReference } : null,
      servingQuantity: hasCalculationBasis ? String(entry.portion.amount) : "1",
      portionBasis: hasCalculationBasis ? { ...entry.portion.basis } : null,
      nutritionBasis: hasCalculationBasis ? { ...entry.nutritionBasis } : null,
      unknownNutritionKeys: NUTRITION_ENTRY_NUTRIENT_KEYS.filter((nutrient) => (
        hasCalculationBasis ? entry.nutritionBasis[nutrient] == null : entry[nutrient] == null
      )),
      restaurantServingOptions: [],
      selectedRestaurantServingId: "",
      manualServingAmount: "1",
      manualServingUnit: "serving",
      customServingDescription: "",
      saveAsReusableFood: true,
    };
    const context = {
      domain: "nutrition-entry",
      context: `edit:${entry.id}`,
      sourceFingerprint: formDraftFingerprint(entry),
    };
    const restored = readFormDraft(localStorage, context, baseDraft);
    const nextDraft = restored.status === "restored" ? restored.value : baseDraft;
    entryDraftContextRef.current = context;
    initialEntryDraftRef.current = restored.status === "restored" ? restored.entry.initialValue : baseDraft;
    setName(nextDraft.name);
    setCalories(nextDraft.calories);
    setProtein(nextDraft.protein);
    setCarbohydrates(nextDraft.carbohydrates);
    setFat(nextDraft.fat);
    setFiber(nextDraft.fiber);
    setSodium(nextDraft.sodium);
    setTotalSugar(nextDraft.totalSugar);
    setAddedSugar(nextDraft.addedSugar);
    setDate(nextDraft.date);
    setTime(nextDraft.time);
    setNotes(nextDraft.notes);
    setEditingEntryId(entry.id);
    setFoodReference(nextDraft.foodReference);
    setServingQuantity(nextDraft.servingQuantity);
    setPortionBasis(nextDraft.portionBasis);
    setNutritionBasis(nextDraft.nutritionBasis);
    setUnknownNutritionKeys(new Set(nextDraft.unknownNutritionKeys));
    setRestaurantServingOptions(nextDraft.restaurantServingOptions);
    setSelectedRestaurantServingId(nextDraft.selectedRestaurantServingId);
    setManualServingAmount(nextDraft.manualServingAmount);
    setManualServingUnit(nextDraft.manualServingUnit);
    setCustomServingDescription(nextDraft.customServingDescription);
    setSaveAsReusableFood(nextDraft.saveAsReusableFood);
    setNutritionValidationError(restored.status === "conflict"
      ? "This Nutrition entry changed after an unfinished edit was stored, so Trace did not apply the older draft."
      : restored.status === "malformed" || restored.status === "invalid-value"
        ? "Trace found malformed unfinished form data and left it unchanged."
        : "");
    entryFormRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
  }

  function changeServingQuantity(value) {
    const scaledNutrition = scaleNutrition(nutritionBasis, value);
    const formNutrition = foodReference?.sourceType === "remote-barcode" || (
      foodReference?.sourceType === "grocery-custom"
      && foodReference.identifiers?.length
    )
      ? applyRemoteNutrientPrecision(scaledNutrition)
      : scaledNutrition;

    setServingQuantity(value);
    setCalories(formNutrition.calories === null ? "" : String(formNutrition.calories));
    setProtein(formNutrition.protein === null ? "" : String(formNutrition.protein));
    setCarbohydrates(formNutrition.carbohydrates === null ? "" : String(formNutrition.carbohydrates));
    setFat(formNutrition.fat === null ? "" : String(formNutrition.fat));
    setFiber(formNutrition.fiber === null || formNutrition.fiber === undefined ? "" : String(formNutrition.fiber));
    setSodium(formNutrition.sodium === null ? "" : String(formNutrition.sodium));
    setTotalSugar(formNutrition.totalSugar === null || formNutrition.totalSugar === undefined ? "" : String(formNutrition.totalSugar));
    setAddedSugar(formNutrition.addedSugar === null || formNutrition.addedSugar === undefined ? "" : String(formNutrition.addedSugar));
    setNutritionValidationError("");
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this nutrition entry?")) return;

    if (!deleteNutritionEntry(id)) return;

    try {
      clearFormDraftsForContext(localStorage, "nutrition-entry", `edit:${id}`);
    } catch (storageFailure) {
      setNutritionValidationError("The entry was deleted, but an older unfinished edit could not be cleared. It will not be restored without its saved record.");
    }

    if (editingEntryId === id) {
      resetForm();
    }
  }

  function cancelEntry() {
    if (
      formDraftFingerprint(entryDraftValue()) !== formDraftFingerprint(initialEntryDraftRef.current) &&
      !window.confirm("Discard this entry? Your unsaved changes will be lost.")
    ) {
      return;
    }

    if (!resetForm({ clearCurrent: true })) return;
    setFoodSearchResetKey((currentKey) => currentKey + 1);
    window.requestAnimationFrame(() => {
      nutritionPageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
    });
  }

  function openBarcodeScanner() {
    if (!barcodeAccess.available) return;
    if (!barcodeLookupRef.current) {
      barcodeLookupRef.current = createRemoteBarcodeLookup({
        userLookup: (barcode) => lookupUserFoodByBarcode(userFoodsRef.current, barcode),
      });
    }
    setBarcodeScannerOpen(true);
  }

  function useBarcodeFood(food) {
    selectFood(food);
    return true;
  }

  function saveGoals(event) {
    event.preventDefault();

    if (saveNutritionGoals({
      calories: toNutritionNumber(goalValues.calories),
      protein: toNutritionNumber(goalValues.protein),
      carbohydrates: toNutritionNumber(goalValues.carbohydrates),
      fat: toNutritionNumber(goalValues.fat),
      sodium: toNutritionNumber(goalValues.sodium),
      waterGoalMl: waterGoalDraftMl,
    })) {
      try {
        clearFormDraft(localStorage, goalDraftContextRef.current);
      } catch (storageFailure) {
        setGoalDraftError("Nutrition goals were saved, but Trace could not clear their unfinished draft. Reload and verify them before saving again.");
        return;
      }
      initialGoalDraftRef.current = { goalValues, waterGoalDraftMl, waterGoalValue, waterUnit };
      setGoalDraftError("");
      showConfirmation("Goals traced");
    }
  }

  function backToTimeline() {
    try {
      writeFormDraft(localStorage, entryDraftContextRef.current, initialEntryDraftRef.current, entryDraftValue());
      writeFormDraft(localStorage, goalDraftContextRef.current, initialGoalDraftRef.current, {
        goalValues,
        waterGoalDraftMl,
        waterGoalValue,
        waterUnit,
      });
    } catch (storageFailure) {
      setNutritionValidationError("Trace could not preserve the unfinished Nutrition form. Keep this page open and try again.");
      return;
    }
    onBack();
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
        onClick={backToTimeline}
        style={{
          ...buttonStyle,
          backgroundColor: "#666",
          marginBottom: "24px",
          marginTop: 0,
        }}
      >
        Back to Timeline
      </button>

      {nutritionRecovery && (
        nutritionRecovery.status === "blocked" ||
        nutritionRecovery.status === "partial" ||
        nutritionRecovery.recoveryAvailable
      ) && (
        <section
          aria-labelledby="nutrition-recovery-heading"
          className="trace-app-alert trace-app-alert--error"
          role="alert"
          style={{
            background: "#7f1d1d",
            border: "1px solid #fca5a5",
            borderRadius: "10px",
            boxSizing: "border-box",
            color: "white",
            marginBottom: "24px",
            maxWidth: "700px",
            padding: "16px",
            width: "100%",
          }}
        >
          <h2 id="nutrition-recovery-heading" style={{ fontSize: "18px", marginTop: 0 }}>
            Nutrition data needs recovery
          </h2>
          {nutritionRecovery.status === "blocked" ? (
            <p>
              Trace could not read the saved Nutrition collection. Saving, editing, and deleting Nutrition entries are blocked so the original data cannot be overwritten.
            </p>
          ) : nutritionRecovery.status === "partial" ? (
            <p>
              Trace loaded the usable Nutrition entries. {nutritionRecovery.damagedCount} saved {nutritionRecovery.damagedCount === 1 ? "record could" : "records could"} not be loaded and remain preserved outside the visible history.
            </p>
          ) : (
            <p>
              Trace is using readable Nutrition data, and an earlier damaged Nutrition source remains preserved for recovery.
            </p>
          )}
          {nutritionRecovery.recoveryError && (
            <p>
              Trace cannot verify the durable recovery copy. Nutrition changes that could replace damaged data will remain blocked.
            </p>
          )}
          {typeof nutritionRecovery.recoveryRaw === "string" ? (
            <>
              <p id="nutrition-recovery-file-description">
                This raw recovery file preserves the original Nutrition text. It is not a normal restorable Trace backup.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <button
                  aria-describedby="nutrition-recovery-file-description"
                  className="trace-action trace-action--secondary"
                  type="button"
                  onClick={downloadNutritionRecovery}
                  style={{ ...buttonStyle, backgroundColor: "#374151", maxWidth: "100%" }}
                >
                  Download raw Nutrition recovery file
                </button>
                <button
                  aria-describedby="nutrition-recovery-file-description"
                  className="trace-action trace-action--secondary"
                  type="button"
                  onClick={shareNutritionRecovery}
                  style={{ ...buttonStyle, backgroundColor: "#374151", maxWidth: "100%" }}
                >
                  Share raw Nutrition recovery file
                </button>
              </div>
              {nutritionRecoveryDelivery?.message && (
                <p aria-live="polite">
                  {nutritionRecoveryDelivery.message}
                </p>
              )}
              {nutritionRecoveryDelivery?.standardDownloadAvailable && (
                <button
                  aria-describedby="nutrition-recovery-file-description"
                  className="trace-action trace-action--secondary"
                  type="button"
                  onClick={downloadNutritionRecovery}
                  style={{ ...buttonStyle, backgroundColor: "#374151", maxWidth: "100%" }}
                >
                  Use standard browser download
                </button>
              )}
            </>
          ) : (
            <p>The raw recovery file will be available after Trace can read browser storage again.</p>
          )}
        </section>
      )}

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
          {goalDraftError && <p role="alert" style={{ color: "#fca5a5" }}>{goalDraftError}</p>}

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
            <label style={{ display: "block" }}>
              Water ({waterUnit})
              <input
                aria-label={`Daily water goal in ${waterUnit}`}
                inputMode="decimal"
                min="0"
                step={waterUnit === WATER_UNITS.OUNCES ? "0.1" : "1"}
                style={formInputStyle}
                type="number"
                value={waterGoalValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setWaterGoalValue(value);
                  setWaterGoalDraftMl(value === ""
                    ? 0
                    : waterAmountToMilliliters(value, waterUnit) ?? 0);
                }}
              />
            </label>
          </div>

          <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
            Save Goals
          </button>
        </form>
      </section>

      <FoodSearch
        barcodeAccess={barcodeAccess}
        onSelectFood={selectFood}
        onScanBarcode={openBarcodeScanner}
        scanButtonRef={barcodeScanButtonRef}
        inputStyle={inputStyle}
        userFoods={userFoods}
        resetKey={foodSearchResetKey}
      />

      {barcodeScannerOpen && (
        <BarcodeScannerDialog
          access={barcodeAccess}
          barcodeLookup={barcodeLookupRef.current}
          camera={barcodeCamera}
          lifecycleAdapter={lifecycleAdapter}
          onClose={() => setBarcodeScannerOpen(false)}
          onUseFood={useBarcodeFood}
          saveUserFood={saveUserFood}
          updateUserFood={updateUserFood}
          deleteUserFood={deleteUserFood}
          reducedMotion={reducedMotion}
        />
      )}

      <GroceryFoodForm
        saveUserFood={saveUserFood}
        updateUserFood={updateUserFood}
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
            {foodReference?.sourceType === "packaged-food" && (
              <p style={{ color: "#9ca3af", marginBottom: 0, marginTop: "4px" }}>
                Packaged food: {foodReference.brand} · {foodReference.packageSize}
              </p>
            )}
            {foodReference?.sourceType === "remote-barcode" && (
              <p style={{ color: "#9ca3af", marginBottom: 0, marginTop: "4px" }}>
                Scanned product: {foodReference.brand || "Unknown brand"}
                {foodReference.providerAttribution ? ` · ${foodReference.providerAttribution}` : ""}
                {foodReference.sourceUrl && (
                  <> · <a href={foodReference.sourceUrl} rel="noreferrer noopener" target="_blank">View source</a></>
                )}
              </p>
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
            ["totalSugar", "Total Sugar (g)", totalSugar, setTotalSugar],
            ["addedSugar", "Added Sugar (g)", addedSugar, setAddedSugar],
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
                  setNutritionValidationError("");
                  markSelectedFoodModified();
                }}
              />
              {unknownNutritionKeys.has(nutrient) && <span aria-hidden="true" style={{ color: "#fbbf24", display: "block", fontSize: "13px", marginTop: "4px" }}>Unknown</span>}
            </label>
          ))}
        </div>

        {nutritionValidationError && (
          <p role="alert" style={{ color: "#fca5a5", marginBottom: 0 }}>
            {nutritionValidationError}
          </p>
        )}

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

      <WaterTrackerSection
        entries={waterEntries}
        unit={waterUnit}
        changeUnit={changeWaterUnit}
        saveEntry={saveWaterEntry}
        updateEntry={updateWaterEntry}
        deleteEntry={deleteWaterEntry}
        showConfirmation={showConfirmation}
      />

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
        <div className="trace-stat-card">
          <strong>Water ({waterUnit})</strong>
          <p style={{ marginBottom: hasWaterGoal ? "8px" : 0 }}>
            {hasWaterGoal
              ? `${formatWaterAmount(waterSummary.todayMl, waterUnit)} / ${formatWaterAmount(waterGoalMl, waterUnit)}`
              : formatWaterAmount(waterSummary.todayMl, waterUnit)}
          </p>
          {hasWaterGoal && (
            <>
              <div
                aria-label="Water progress"
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
                    width: `${Math.min(waterProgress, 100)}%`,
                  }}
                />
              </div>
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                {Math.round(waterProgress)}%
              </p>
            </>
          )}
        </div>
        {sugarMetrics.map((metric) => {
          const sugarTotal = dailySugarTotals[metric.key];
          const hasKnownValues = sugarTotal.knownCount > 0;
          const isPartial = hasKnownValues && sugarTotal.knownCount < dailySugarTotals.entryCount;

          return (
            <div className="trace-stat-card" key={metric.key}>
              <strong>{isPartial ? `Known ${metric.label}` : metric.label} (g)</strong>
              <p style={{ marginBottom: isPartial ? "8px" : 0 }}>
                {hasKnownValues ? `${Number(sugarTotal.value.toFixed(2))}g` : "Unknown"}
              </p>
              {isPartial && (
                <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                  Some logged foods have unknown {metric.label.toLowerCase()}.
                </p>
              )}
            </div>
          );
        })}
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
            {visibleEntries.map((entry) => (
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

                {(entry.totalSugar !== null && entry.totalSugar !== undefined) ||
                (entry.addedSugar !== null && entry.addedSugar !== undefined) ? (
                  <p style={{ lineHeight: "1.6", marginBottom: 0 }}>
                    {entry.totalSugar !== null && entry.totalSugar !== undefined && (
                      <>Total Sugar {formatNutrient(entry.totalSugar, " g")}</>
                    )}
                    {entry.totalSugar !== null && entry.totalSugar !== undefined &&
                    entry.addedSugar !== null && entry.addedSugar !== undefined && " · "}
                    {entry.addedSugar !== null && entry.addedSugar !== undefined && (
                      <>Added Sugar {formatNutrient(entry.addedSugar, " g")}</>
                    )}
                  </p>
                ) : null}

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
            {remainingEntryCount > 0 && (
              <button
                aria-label={`Show ${nextEntryBatchCount} more older food entries`}
                className="trace-action trace-action--secondary trace-nutrition__show-more"
                onClick={() => setVisibleEntryCount((count) => count + FOOD_HISTORY_BATCH_SIZE)}
                type="button"
              >
                Show more ({remainingEntryCount} older)
              </button>
            )}
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
          onClick={backToTimeline}
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
