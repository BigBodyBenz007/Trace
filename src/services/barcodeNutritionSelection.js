import { NUTRITION_ENTRY_NUTRIENT_KEYS } from "./nutritionCalculation";
import { immutableCopy, normalizeRemoteFood } from "./remoteFoodModel";

const REQUIRED_NUTRIENTS = ["calories", "protein", "carbohydrates", "fat"];
const WHOLE_NUMBER_NUTRIENTS = new Set(["calories", "sodium"]);
const SAFE_REMOTE_BASIS_KINDS = new Set([
  "provider-serving",
  "derived-serving",
  "provider-package",
]);

function safeSourceUrl(value) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch (error) {
    return null;
  }
}

function preciseNutrientValue(key, value) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  if (value === 0) return 0;
  const decimalPlaces = WHOLE_NUMBER_NUTRIENTS.has(key) ? 0 : 2;
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function applyRemoteNutrientPrecision(nutrients) {
  return Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [
    key,
    preciseNutrientValue(key, nutrients?.[key]),
  ]));
}

function selectedServing(food) {
  return {
    amount: food.serving.amount ?? 1,
    unit: food.serving.unit || "serving",
    description: food.serving.description || "1 serving",
    ...(food.serving.grams === null ? {} : { grams: food.serving.grams }),
  };
}

function basisMessage(food, servingDescription, reliable) {
  if (!reliable) {
    return "The provider did not supply enough compatible serving data to establish labeled-serving nutrition.";
  }
  if (food.nutritionBasis.kind === "derived-serving") {
    const reference = food.nutritionBasis.sourceBasis === "100ml" ? "100 mL" : "100 g";
    return `Nutrition shown for ${servingDescription}. Calculated from the provider's per-${reference} data using its declared serving quantity.`;
  }
  return `Nutrition shown for ${servingDescription}.`;
}

function remoteCandidate(result) {
  const food = normalizeRemoteFood(result.food);
  if (!food) return null;
  const reliable = SAFE_REMOTE_BASIS_KINDS.has(food.nutritionBasis?.kind);
  const serving = selectedServing(food);
  const nutrients = reliable
    ? applyRemoteNutrientPrecision(food.nutrients)
    : Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [key, null]));
  const providerSnapshot = immutableCopy({
    provider: food.provider,
    dataBasis: food.dataBasis,
    serving: food.serving,
    nutrients: food.nutrients,
    ...(food.nutritionBasis ? { nutritionBasis: food.nutritionBasis } : {}),
    completeness: food.completeness,
    unknownFields: food.unknownFields,
    provenance: food.provenance,
  });
  const adaptedUnknownFields = [...new Set([
    ...food.unknownFields,
    ...NUTRITION_ENTRY_NUTRIENT_KEYS
      .filter((key) => nutrients[key] === null)
      .map((key) => `nutrients.${key}`),
  ])];
  const canUse = result.status === "found"
    && food.logReady
    && reliable
    && REQUIRED_NUTRIENTS.every((key) => nutrients[key] !== null);
  const selection = canUse ? immutableCopy({
    id: `remote-barcode:${food.provider.id}:${food.provider.recordId}`,
    sourceType: "remote-barcode",
    dataType: "branded",
    brand: food.brand,
    name: food.name,
    identifiers: food.identifiers,
    serving,
    nutrients,
    packaged: {
      packageSize: food.packageQuantity,
      servingsPerContainer: food.servingsPerContainer,
    },
    remote: providerSnapshot,
    provenance: {
      source: food.provider.id,
      sourceId: food.provider.recordId,
      confidence: "external-provider",
      label: food.provider.attribution,
      completeness: food.completeness,
      sourceUrl: food.provenance.sourceUrl,
      revisionDate: food.provenance.revisionDate,
      retrievedAt: food.provenance.retrievedAt,
      attribution: food.provenance.attribution,
    },
  }) : null;

  return immutableCopy({
    status: canUse ? result.status : "incomplete",
    stale: result.stale === true,
    canUse,
    selection,
    display: {
      brand: food.brand,
      name: food.name,
      packageQuantity: food.packageQuantity,
      servingsPerContainer: food.servingsPerContainer,
      servingDescription: serving.description,
      basisMessage: basisMessage(food, serving.description, reliable),
      nutrients,
      providerNutritionBasis: food.dataBasis,
      attribution: food.provenance.attribution,
      sourceUrl: food.provenance.sourceUrl,
      unknownFields: adaptedUnknownFields,
    },
    ...(canUse
      ? {}
      : {
          recovery: {
            barcode: food.identifiers[0],
            food: {
              brand: food.brand,
              name: food.name,
              packageQuantity: food.packageQuantity,
              serving,
              servingsPerContainer: food.servingsPerContainer,
              nutrients,
            },
            providerSourceSnapshot: food,
          },
        }),
  });
}

function localCandidate(result) {
  const food = result.food;
  if (!food?.name || !food?.serving || !food?.nutrients) return null;
  const nutrients = Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [
    key,
    food.nutrients[key] ?? null,
  ]));
  const canUse = REQUIRED_NUTRIENTS.every((key) => nutrients[key] !== null);
  const sourceUrl = safeSourceUrl(
    food.provenance?.verification?.sourceUrl || food.provenance?.sourceUrl
  );
  return immutableCopy({
    status: canUse ? "found" : "incomplete",
    stale: false,
    canUse,
    selection: canUse ? food : null,
    display: {
      brand: food.brand || food.restaurant?.name || null,
      name: food.name,
      packageQuantity: food.packaged?.packageSize || food.beverage?.packageSize || null,
      servingsPerContainer: food.packaged?.servingsPerContainer ?? null,
      servingDescription: food.serving.description,
      basisMessage: `Nutrition shown for ${food.serving.description}.`,
      nutrients,
      providerNutritionBasis: "serving",
      attribution: food.provenance?.label || "Trace verified catalog",
      sourceUrl,
      unknownFields: NUTRITION_ENTRY_NUTRIENT_KEYS
        .filter((key) => nutrients[key] === null)
        .map((key) => `nutrients.${key}`),
    },
    ...(food.sourceType === "grocery-custom" && food.identifiers?.length
      ? {
          customFood: food,
          recovery: {
            barcode: food.identifiers[0],
            food,
            providerSourceSnapshot: food.providerSourceSnapshot || null,
          },
        }
      : {}),
  });
}

export function createBarcodeNutritionCandidate(result) {
  if (!result || !["found", "incomplete"].includes(result.status) || !result.food) return null;
  return result.food.sourceType === "remote-barcode"
    ? remoteCandidate(result)
    : localCandidate(result);
}
