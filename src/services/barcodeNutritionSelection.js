import { NUTRITION_ENTRY_NUTRIENT_KEYS } from "./nutritionCalculation";
import { immutableCopy, normalizeRemoteFood } from "./remoteFoodModel";
import { getNutritionAssessmentQuality, normalizeNutritionAssessmentInputs } from "./nutritionAssessmentInputs";
import { resolveVerifiedNutritionCorrection } from "./verifiedProductNutritionCorrections";
import { findSodiumSaltConflicts } from "./sodiumSaltEvidence";

const REQUIRED_NUTRIENTS = ["calories", "protein", "carbohydrates", "fat"];
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

function remoteCandidate(result, applyVerifiedCorrections) {
  const food = normalizeRemoteFood(result.food);
  if (!food) return null;
  const assessmentInputs = result.stale && food.assessmentInputs
    ? normalizeNutritionAssessmentInputs({ ...food.assessmentInputs,
        source: { ...food.assessmentInputs.source, cacheStale: true } }, food)
    : food.assessmentInputs;
  const ingredientFields = {
    ...(food.ingredients === undefined ? {} : { ingredients: food.ingredients }),
    ...(food.additives === undefined ? {} : { additives: food.additives }),
    ...(assessmentInputs === undefined ? {} : { assessmentInputs }),
  };
  const reliable = SAFE_REMOTE_BASIS_KINDS.has(food.nutritionBasis?.kind);
  let serving = selectedServing(food);
  let servingsPerContainer = food.servingsPerContainer;
  const nutrients = reliable
    ? { ...food.nutrients }
    : Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [key, null]));
  const providerSnapshot = immutableCopy({
    ...(food.usdaDetails ? { usdaDetails: food.usdaDetails } : {}),
    ...ingredientFields,
    provider: food.provider,
    dataBasis: food.dataBasis,
    serving: food.serving,
    nutrients: food.nutrients,
    ...(food.nutritionBasis ? { nutritionBasis: food.nutritionBasis } : {}),
    completeness: food.completeness,
    unknownFields: food.unknownFields,
    provenance: food.provenance,
  });
  let adaptedUnknownFields = [...new Set([
    ...food.unknownFields,
    ...NUTRITION_ENTRY_NUTRIENT_KEYS
      .filter((key) => nutrients[key] === null)
      .map((key) => `nutrients.${key}`),
  ])];
  const providerCanUse = result.status === "found"
    && food.logReady
    && reliable
    && REQUIRED_NUTRIENTS.every((key) => nutrients[key] !== null);
  const resolvedCorrection = applyVerifiedCorrections
    ? resolveVerifiedNutritionCorrection(food, { identifier: result.identifier, stale: result.stale }) : null;
  const nutritionCorrection = providerCanUse || resolvedCorrection?.mode === 'replacement-panel' ? resolvedCorrection : null;
  const canUse = providerCanUse || nutritionCorrection?.mode === 'replacement-panel';
  if (nutritionCorrection) nutritionCorrection.changes.forEach(({ nutrient, correctedValue }) => {
    nutrients[nutrient] = correctedValue;
  });
  const replacement = nutritionCorrection?.mode === 'replacement-panel' ? nutritionCorrection.manufacturerPanel : null;
  if (replacement) {
    serving = { ...replacement.serving, grams: replacement.serving.amount };
    servingsPerContainer = replacement.servingsPerContainer;
    ingredientFields.ingredients = replacement.ingredients;
    ingredientFields.ingredientSource = replacement.source;
    // Provider tags belong to the old declaration, retained in remote. Do not
    // attach them to this newer ingredient edition or fabricate replacement tags.
    delete ingredientFields.additives;
    adaptedUnknownFields = adaptedUnknownFields.filter(field => !field.startsWith('nutrients.')
      && (field !== 'servingsPerContainer' || servingsPerContainer === null));
  }
  // Inspect only the retained provider panel. A complete manufacturer panel
  // supersedes it; never compare that replacement sodium with old provider salt.
  const nutritionConflicts = replacement ? [] : findSodiumSaltConflicts(assessmentInputs);
  if (nutritionConflicts.length) {
    nutrients.sodium = null;
    adaptedUnknownFields = [...new Set([...adaptedUnknownFields, 'nutrients.sodium'])];
  }
  const selection = canUse ? immutableCopy({
    id: `remote-barcode:${food.provider.id}:${food.provider.recordId}`,
    sourceType: "remote-barcode",
    dataType: "branded",
    brand: food.brand,
    name: food.name,
    identifiers: food.identifiers,
    ...ingredientFields,
    serving,
    nutrients,
    ...(nutritionConflicts.length ? { nutritionConflicts } : {}),
    ...(nutritionCorrection ? { nutritionCorrection } : {}),
    packaged: {
      packageSize: food.packageQuantity,
      servingsPerContainer,
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
    status: canUse ? "found" : "incomplete",
    stale: result.stale === true,
    canUse,
    selection,
    display: {
      ...ingredientFields,
      ...(assessmentInputs === undefined ? {} : {
        assessmentInputQuality: getNutritionAssessmentQuality(assessmentInputs, { stale: result.stale === true }),
      }),
      brand: food.brand,
      name: food.name,
      packageQuantity: food.packageQuantity,
      servingsPerContainer,
      servingDescription: serving.description,
      basisMessage: replacement
        ? `Nutrition shown for ${serving.description} using ${replacement.source.attribution} (${replacement.source.edition}). Manufacturer ingredients use the same reviewed edition; original provider facts remain in the source snapshot. The physical package revision is unconfirmed.`
        : basisMessage(food, serving.description, reliable) + (nutritionCorrection
        ? ` ${nutritionCorrection.changes.map(change => change.nutrient === 'addedSugar' ? 'Added sugars' : 'Supporting total sugars').join(' and ')} corrected using ${nutritionCorrection.source.attribution} (label edition ${nutritionCorrection.source.updatedOn}); other provider nutrients and original observations are retained.` : ""),
      nutrients,
      ...(nutritionConflicts.length ? { nutritionConflicts } : {}),
      ...(nutritionCorrection ? { nutritionCorrection } : {}),
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
              ...ingredientFields,
              brand: food.brand,
              name: food.name,
              packageQuantity: food.packageQuantity,
              serving,
              servingsPerContainer: food.servingsPerContainer,
              nutrients,
            },
            providerSourceSnapshot: { ...food, ...ingredientFields },
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
      ...(food.providerSourceSnapshot?.ingredients === undefined
        ? {}
        : { ingredients: food.providerSourceSnapshot.ingredients }),
      ...(food.providerSourceSnapshot?.additives === undefined
        ? {}
        : { additives: food.providerSourceSnapshot.additives }),
      ...(food.providerSourceSnapshot?.assessmentInputs === undefined
        ? {}
        : { assessmentInputs: food.providerSourceSnapshot.assessmentInputs,
            assessmentInputQuality: getNutritionAssessmentQuality(food.providerSourceSnapshot.assessmentInputs) }),
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

// The explicit opt-out is for retrospective source-only research replays.
// Normal lookup/selection always applies reviewed fact corrections.
export function createBarcodeNutritionCandidate(result, { applyVerifiedCorrections = true } = {}) {
  if (!result || !["found", "incomplete"].includes(result.status) || !result.food) return null;
  const candidate = result.food.sourceType === "remote-barcode"
    ? remoteCandidate(result, applyVerifiedCorrections)
    : localCandidate(result);
  if (!candidate || !result.sourceSelection) return candidate;
  return immutableCopy({ ...candidate,
    display: { ...candidate.display, sourceSelection: result.sourceSelection },
    selection: candidate.selection ? { ...candidate.selection, sourceSelection: result.sourceSelection } : null,
  });
}
