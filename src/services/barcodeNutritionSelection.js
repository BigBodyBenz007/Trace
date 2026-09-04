import { NUTRITION_ENTRY_NUTRIENT_KEYS } from "./nutritionCalculation";
import { immutableCopy, normalizeRemoteFood } from "./remoteFoodModel";

const REQUIRED_NUTRIENTS = ["calories", "protein", "carbohydrates", "fat"];
const WHOLE_NUMBER_NUTRIENTS = new Set(["calories", "sodium"]);

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

function scaledNutrients(nutrients, multiplier) {
  return applyRemoteNutrientPrecision(Object.fromEntries(
    NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [
      key,
      nutrients[key] === null ? null : nutrients[key] * multiplier,
    ])
  ));
}

function remoteServing(food) {
  if (food.dataBasis === "100g") {
    if (food.serving.grams !== null) {
      return {
        serving: {
          amount: food.serving.amount ?? food.serving.grams,
          unit: food.serving.unit || "g",
          description: food.serving.description || `${food.serving.grams} g`,
          grams: food.serving.grams,
        },
        nutrients: scaledNutrients(food.nutrients, food.serving.grams / 100),
      };
    }
    return {
      serving: { amount: 100, unit: "g", description: "100 g", grams: 100 },
      nutrients: scaledNutrients(food.nutrients, 1),
    };
  }

  return {
    serving: {
      amount: food.serving.amount ?? 1,
      unit: food.serving.unit || "serving",
      description: food.serving.description || "1 serving",
      ...(food.serving.grams === null ? {} : { grams: food.serving.grams }),
    },
    nutrients: { ...food.nutrients },
  };
}

function remoteCandidate(result) {
  const food = normalizeRemoteFood(result.food);
  if (!food) return null;
  const adapted = remoteServing(food);
  const providerSnapshot = immutableCopy({
    provider: food.provider,
    dataBasis: food.dataBasis,
    serving: food.serving,
    nutrients: food.nutrients,
    completeness: food.completeness,
    unknownFields: food.unknownFields,
    provenance: food.provenance,
  });
  const adaptedUnknownFields = [...new Set([
    ...food.unknownFields,
    ...NUTRITION_ENTRY_NUTRIENT_KEYS
      .filter((key) => adapted.nutrients[key] === null)
      .map((key) => `nutrients.${key}`),
  ])];
  const canUse = result.status === "found"
    && food.logReady
    && REQUIRED_NUTRIENTS.every((key) => adapted.nutrients[key] !== null);
  const selection = canUse ? immutableCopy({
    id: `remote-barcode:${food.provider.id}:${food.provider.recordId}`,
    sourceType: "remote-barcode",
    dataType: "branded",
    brand: food.brand,
    name: food.name,
    identifiers: food.identifiers,
    serving: adapted.serving,
    nutrients: adapted.nutrients,
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
    status: result.status,
    stale: result.stale === true,
    canUse,
    selection,
    display: {
      brand: food.brand,
      name: food.name,
      packageQuantity: food.packageQuantity,
      servingDescription: adapted.serving.description,
      nutrients: adapted.nutrients,
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
              serving: adapted.serving,
              servingsPerContainer: food.servingsPerContainer,
              nutrients: adapted.nutrients,
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
      servingDescription: food.serving.description,
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
