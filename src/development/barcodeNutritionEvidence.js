// Development assessment adapters only. Original provider records and the shared
// assessment contract remain unchanged; no values are filled from product names.
import { getAssessmentDatasetNutrients } from '../services/nutritionAssessmentInputs';

export const FDA_ENERGY_SOURCE = 'https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(1)';
export const CATEGORY_SOURCE = 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf';
const UNITS = { g: [1, 'g'], mg: [.001, 'g'], kg: [1000, 'g'], oz: [28.349523125, 'g'], lb: [453.59237, 'g'], ml: [1, 'ml'], l: [1000, 'ml'] };
const close = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(a), Math.abs(b)) * 1e-9;
export const measurementQuantity = dataset => {
  const conversion = UNITS[dataset.quantity?.unit?.toLowerCase()];
  return dataset.basis !== 'unknown' && conversion ? { amount: dataset.quantity.amount * conversion[0], unit: conversion[1] } : null;
};
// Half of the last recorded decimal place, for independently rounded API fields.
// This does not certify a Nutrition Facts panel or regulatory compliance.
function halfQuantum(value) {
  const [mantissa, exponent = '0'] = String(Number(value)).toLowerCase().split('e');
  return .5 * 10 ** (Number(exponent) - (mantissa.split('.')[1]?.length || 0));
}
function calorieAllowance(value) {
  if (value === 0) return 5; // FDA permits <5 kcal to be declared zero.
  if (value <= 50 && close(value / 5, Math.round(value / 5))) return 2.5;
  if (value > 50 && close(value / 10, Math.round(value / 10))) return 5;
  return 0;
}
function energyFor(dataset, datasets) {
  const entries = dataset.observations.filter(entry => entry.nutrient === 'calories');
  // OFF preserves provider approximations/computed values in the flattened
  // legacy fields with modifier ~. They are not a second label declaration.
  // Unqualified evidence wins; qualified-only evidence stays unknown.
  const qualified = entry => entry.derivation?.startsWith('off:modifier:');
  const reported = entries.filter(entry => !qualified(entry));
  const ignored = entries.filter(qualified);
  const single = unit => getAssessmentDatasetNutrients({ observations: reported.filter(entry => entry.rawUnit?.toLowerCase() === unit) }).calories;
  const kcal = single('kcal'), kjAsKcal = single('kj');
  const unsupported = entries.some(entry => !['kcal', 'kj'].includes(entry.rawUnit?.toLowerCase()) && entry.rawValue != null);
  const invalid = unsupported || [kcal, kjAsKcal].some(entry => ['invalid', 'unsupported-unit', 'conflicting'].includes(entry.status))
    || ignored.some(entry => entry.derivation !== 'off:modifier:~'
      || ['invalid', 'unsupported-unit'].includes(getAssessmentDatasetNutrients({ observations: [entry] }).calories.status));
  const kjEntry = reported.find(entry => entry.rawUnit?.toLowerCase() === 'kj' && entry.rawValue !== null && entry.rawValue !== '');
  const energyKj = kjAsKcal.value === null ? null : Number(kjEntry.rawValue);
  const quantity = measurementQuantity(dataset);
  let allowance = 0, kjAllowance = 0;
  const ownServing = dataset.basis === 'serving';
  if (ownServing && kcal.value !== null) {
    allowance = calorieAllowance(kcal.value);
    if (energyKj !== null) kjAllowance = halfQuantum(energyKj);
  } else if (quantity && kcal.value !== null) {
    // Carry a serving's declaration interval to a per-100 quantity only when
    // units match and its captured kcal actually rescales to this observation.
    for (const serving of datasets.filter(entry => entry.basis === 'serving')) {
      const sq = measurementQuantity(serving);
      const declared = serving.observations.find(entry => entry.nutrient === 'calories' && !qualified(entry) && entry.rawUnit?.toLowerCase() === 'kcal');
      if (!sq || sq.unit !== quantity.unit || declared?.rawValue == null) continue;
      const ratio = quantity.amount / sq.amount;
      if (!close(Number(declared.rawValue) * ratio, kcal.value)) continue;
      allowance = Math.max(allowance, calorieAllowance(Number(declared.rawValue)) * ratio);
      const j = serving.observations.find(entry => entry.nutrient === 'calories' && !qualified(entry) && entry.rawUnit?.toLowerCase() === 'kj');
      if (j?.rawValue != null && energyKj !== null
        && Math.abs(Number(j.rawValue) * ratio - energyKj) <= halfQuantum(j.rawValue) * ratio + halfQuantum(energyKj) + 1e-8) {
        kjAllowance = Math.max(kjAllowance, halfQuantum(j.rawValue) * ratio);
      }
    }
  }
  // 4.184 is physical unit conversion; 4.2 is the unchanged published
  // calculator's convention. A tiny convention difference is not a conflict.
  const low = kcal.value === null ? null : Math.max(0, kcal.value - allowance) * 4.184 - kjAllowance;
  const high = kcal.value === null ? null : (kcal.value + allowance) * 4.2 + kjAllowance;
  const accepted = !invalid && (energyKj === null || kcal.value === null
    || (energyKj >= low - 1e-8 && energyKj <= high + 1e-8));
  return { accepted, energyKj, kcal: kcal.value ?? kjAsKcal.value,
    evidence: { datasetId: dataset.id, quantity: dataset.quantity, observations: entries,
      accepted, acceptedKjInterval: low === null ? null : [low, high],
      calorieRoundingAllowance: allowance, source: FDA_ENERGY_SOURCE,
      excludedQualifiedFields: ignored.map(entry => entry.field),
      qualificationSource: ignored.length ? 'https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition_v3.5/' : null,
      policy: ignored.length ? 'Use unqualified reported energy. Provider-qualified approximations are retained separately; they are not a second label declaration.'
        : 'Compatible numeric rounding, not proof of a US label. Preserve reported kcal and kJ; never average or repair contradictory values.' } };
}

export function reconcileBarcodeDatasets(input) {
  const reasons = [], warnings = [];
  const servingText = input.serving?.find(entry => entry.field === 'serving_size')?.value;
  const rawServingUnit = input.serving?.find(entry => entry.field === 'serving_quantity_unit')?.value;
  const servingUnit = typeof rawServingUnit === 'string' ? rawServingUnit.toLowerCase() : null;
  if (typeof servingText === 'string' && ((servingUnit === 'ml' && /\d\s*g\b/i.test(servingText))
    || (servingUnit === 'g' && /\d\s*ml\b/i.test(servingText)))) {
    warnings.push('Provider serving-size text and structured unit disagree. Only an explicitly compatible reference dataset is used; no density is assumed.');
  }
  const add = message => { if (!reasons.includes(message)) reasons.push(message); };
  const records = input.datasets.map(dataset => {
    const nutrients = getAssessmentDatasetNutrients(dataset);
    const energy = energyFor(dataset, input.datasets);
    if (!energy.accepted) add(`Energy observations conflict beyond compatible rounding in ${dataset.id}.`);
    const adjusted = { ...nutrients, calories: { ...nutrients.calories,
      status: energy.accepted ? energy.kcal === null ? 'unknown' : 'reported' : 'conflicting',
      value: energy.accepted ? energy.kcal : null } };
    if (energy.accepted && nutrients.calories.status === 'conflicting' && !energy.evidence.excludedQualifiedFields.length) warnings.push(`Compatible kcal/kJ rounding accepted in ${dataset.id}; original source values are retained in the evidence details.`);
    if (energy.evidence.excludedQualifiedFields.length) warnings.push(`Provider-qualified approximate energy in ${dataset.id} is retained for transparency, not treated as a label declaration or used to replace unqualified reported energy.`);
    for (const [key, n] of Object.entries(nutrients)) {
      if (key !== 'calories' && ['conflicting', 'invalid', 'unsupported-unit'].includes(n.status)) add(`${key} observations are ${n.status} in ${dataset.id}.`);
    }
    for (const [part, total] of [['addedSugar', 'totalSugar'], ['freeSugar', 'totalSugar'], ['addedSugar', 'carbohydrates'], ['freeSugar', 'carbohydrates'], ['saturatedFat', 'fat'], ['totalSugar', 'carbohydrates']]) {
      if (adjusted[part].value !== null && adjusted[total].value !== null && adjusted[part].value > adjusted[total].value + 1e-9) add(`${part} exceeds ${total} in ${dataset.id}.`);
    }
    return { dataset, nutrients: adjusted, energyKj: energy.energyKj, energyEvidence: energy.evidence, quantity: measurementQuantity(dataset) };
  });
  records.forEach((left, index) => records.slice(index + 1).forEach(right => {
    if (!left.quantity || !right.quantity || left.quantity.unit !== right.quantity.unit) return;
    const ratio = left.quantity.amount / right.quantity.amount;
    for (const key of Object.keys(left.nutrients)) {
      const a = left.nutrients[key].value, b = right.nutrients[key].value;
      if (a === null || b === null || close(a, b * ratio)) continue;
      // Compare each raw nutrient on compatible declared quantities. Decimal
      // representation intervals explain small serving/per-100 API differences.
      const allowance = halfQuantum(a) + halfQuantum(b) * ratio;
      if (close(ratio, 1) || Math.abs(a - b * ratio) > allowance + 1e-8) add(`${key} conflicts between ${left.dataset.id} and ${right.dataset.id} after matching measurement bases.`);
      else warnings.push(`Recorded decimal rounding differs for ${key} between ${left.dataset.id} and ${right.dataset.id}; the selected dataset is retained intact.`);
    }
    if (left.energyKj !== null && right.energyKj !== null && !close(left.energyKj, right.energyKj * ratio)
      && (close(ratio, 1) || Math.abs(left.energyKj - right.energyKj * ratio) > halfQuantum(left.energyKj) + halfQuantum(right.energyKj) * ratio
        + .016 * Math.max(left.nutrients.calories.value || 0, (right.nutrients.calories.value || 0) * ratio) + 1e-8)) {
      add(`Reported kJ conflicts between ${left.dataset.id} and ${right.dataset.id} after matching measurement bases.`);
    }
  }));
  return { records, reasons, warnings: [...new Set(warnings)] };
}

const CATEGORIES = {
  'en:breakfast-cereals': 'general', 'en:breads': 'general', 'en:biscuits': 'general', 'en:crackers-appetizers': 'general',
  'en:pastas': 'general', 'en:rice': 'general', 'en:pasta-dishes': 'general', 'en:potato-crisps': 'general',
  'en:cheeses': 'cheese', 'en:sodas': 'beverage', 'en:soft-drinks': 'beverage', 'en:drinkable-yogurts': 'beverage',
  'en:nuts': 'fats-nuts-seeds', 'en:seeds': 'fats-nuts-seeds', 'en:olive-oils': 'fats-nuts-seeds',
  'Breakfast Cereals': 'general', 'Breads & Buns': 'general', 'Cheese': 'cheese',
  'Non Alcoholic Beverages - Ready to Drink': 'beverage',
};
export function resolveBarcodeCategory(input, display) {
  const claims = input.categories.flatMap(entry => entry.values);
  const name = input.identity.name.toLowerCase();
  const text = (display.ingredients?.text || '').trim().toLowerCase();
  const product = `${claims.join(' ')} ${name}`;
  const basis = [];
  const excluded = /infant|baby.food|medical|supplement|total.diet.replacement|pet.food/i.test(product);
  let categories = [...new Set(claims.map(value => CATEGORIES[value]).filter(Boolean))];
  if (categories.length) basis.push('Explicit provider food-category claims.');
  let plantZero = null;
  // Closed composition patterns only: an unknown extra ingredient never inherits
  // zero FVL. These are ingredient evidence, not brand or research-ID mappings.
  const wholeNuts = /^(almonds|walnuts|pecans|hazelnuts|pistachios|cashews|peanuts)\.?\s*(?:peanut free\.?)?$/.test(text);
  const milkCultureList = /^(?:##\s*ingredients\s*)?(?:grade a\s+)?(?:pasteurized\s+)?(?:skimmed |skim |whole |nonfat )?milk,\s*(?:live active |live and active )?yog(?:urt|hurt) cultures\s*\(([^)]+)\)\.?$/.exec(text);
  const milkCultures = Boolean(milkCultureList && milkCultureList[1].split(',').every(culture =>
    /^(?:l\. bulgaricus|s\. thermophilus|l\. acidophilus|bifidus|l\. casei)$/.test(culture.trim())));
  const potatoOilSalt = /^potatoes,\s*vegetable oil\s*\((?:canola|corn|soybean|sunflower|oil|and|or|[\s,/])+\),\s*(?:and )?salt\.?$/.test(text);
  const drinking = /drinkable|drinking|beverage|smoothie|yog(?:urt|hurt) drink/.test(product);
  if (wholeNuts) { categories.push('fats-nuts-seeds'); basis.push('Complete single-nut ingredient declaration.'); plantZero = 'Only declared nuts; nuts do not count as updated FVL.'; }
  if (/greek|strained|spoonable/.test(name) && /yog(?:urt|hurt)/.test(name) && !drinking) {
    categories.push('general'); basis.push('Explicit strained/Greek/spoonable yogurt food description.');
    if (milkCultures) plantZero = 'Only milk and yogurt cultures are declared; no qualifying FVL ingredients.';
  }
  if (potatoOilSalt) { categories.push('general'); basis.push('Complete potato/oil/salt food composition.'); plantZero = 'Potatoes are excluded from FVL; added oils in general foods and salt do not count.'; }
  if (drinking && /yog(?:urt|hurt)/.test(product)) { categories = ['beverage']; basis.push('Explicit drinking-yogurt presentation.'); }
  if (/en:chestnuts(?:\s|$)/.test(claims.join(' '))) { categories = ['general']; basis.push('Chestnuts are excluded from the nuts-category rule.'); }
  if (/en:meats(?:\s|$)|en:sausages|en:canned-meats/.test(claims.join(' '))) {
    categories = ['general', 'red-meat']; basis.push('Meat product; red-meat percentage unknown, so both applicable rules are retained.');
  }
  if (/en:peanut-butters|en:nut-butters|en:nut-bars/.test(claims.join(' '))) {
    categories = ['general', 'fats-nuts-seeds']; basis.push('Processed nut product; proportion unknown, so both category rules are retained.');
  }
  if (!categories.length && /\bgranola\b/.test(name) && input.serving.some(entry => /\bbar\b/.test(String(entry.value)))
    && /\b(?:peanuts|almonds|nuts)\b/.test(text)) {
    categories = ['general', 'fats-nuts-seeds']; basis.push('Granola-bar description and declared nuts; proportion unknown, both category rules retained.');
  }
  // A generic meal is not a cheese or meat product simply because it contains
  // cheese/meat. A rice-based meal description plus captured rice composition
  // supports the general-food route, without inventing its FVL percentage.
  if (!categories.length && /\brice\b/.test(name) && /beans|meal|bowl|dish/.test(name) && /\brice\b/.test(text) && !drinking) {
    categories = ['general']; basis.push('Rice food description corroborated by the captured ingredient declaration.');
  }
  categories = excluded ? [] : [...new Set(categories)];
  return { categories, plantZero, basis, excluded, source: CATEGORY_SOURCE, edition: '2025-03-17' };
}

// This verifies an interpretation of the captured declaration, not the contents
// of a package or a current US formulation. Never drop unfamiliar ingredients.
export function resolveBarcodePlantContent(input, display, categoryEvidence) {
  const original = display.ingredients?.text;
  const text = typeof original === 'string' ? original.trim().toLowerCase() : '';
  const groups = input.foodGroups;
  const evidence = { status: 'unknown', percent: null, basis: null, identification: null,
    ingredientEvidence: { ...input.ingredients, text: original ?? null }, source: { ...input.source },
    method: { url: CATEGORY_SOURCE, edition: '2025-03-17', provisions: 'Appendix 1, pp. 44–47; special fats/oils rule, p. 30.' },
    providerQuantities: groups.map(entry => ({ ...entry })), warnings: [],
    verificationScope: 'Interpretation of the captured provider declaration only; no independent verification of package contents or exact US formulation.' };
  const categories = categoryEvidence.categories;
  // Cereal grains are outside the updated FVL component. This is a closed,
  // single-ingredient statement, optionally followed by this packaging notice.
  // It does not strip generic preservative, allergen or other trailing text.
  const soleGrain = /^(?:whole grain wheat|whole wheat|wheat flour|rice|whole grain oats|rolled oats)\.?\s*(?:bht is added to the packaging material to preserve freshness\.?)?$/.test(text);
  const ingredientZero = categories.length === 1 && !categoryEvidence.excluded
    ? categoryEvidence.plantZero || (categories[0] === 'general' && soleGrain
      ? 'The complete declaration contains only a cereal grain, which does not qualify as updated fruit/vegetable/legume content. Any matched BHT notice explicitly concerns packaging.' : null)
    : null;
  const reported = groups.filter(entry => entry.identification === 'provider-reported'
    && entry.field === 'nutriments.fruits-vegetables-nuts_100g');
  const reportedZero = !categories.includes('fats-nuts-seeds') && reported.length === 1
    && reported[0].rawUnit === '%' && [0, '0'].includes(reported[0].rawValue);
  const attributedText = text && input.ingredients?.textAvailable === true && input.ingredients.field
    && input.source?.provider && input.source.url && input.source.attribution;
  const proposal = attributedText && ingredientZero;
  if (proposal && reported.some(entry => entry.rawUnit !== '%' || ![0, '0'].includes(entry.rawValue))) {
    // The older broader group may include nuts. Keep this conservative instead
    // of overriding any reported quantity with a newly inferred percentage.
    return { ...evidence, status: 'conflicting',
      basis: 'The closed ingredient declaration suggests zero updated FVL, but a provider-reported broader plant quantity disagrees or is unsupported. Review the original evidence; no quantity is overwritten.' };
  }
  if (!proposal && !reportedZero) return evidence;
  if (groups.some(entry => entry.identification === 'provider-estimated')) evidence.warnings.push(
    'Provider plant estimates remain unchanged in the evidence. They are not declared qualifying percentages and are not used to establish zero.');
  return { ...evidence, status: 'verified-zero', percent: 0,
    identification: proposal ? 'closed-ingredient-declaration' : 'provider-reported-zero',
    basis: proposal || 'Provider reports zero for the older broader fruit/vegetable/nut group; the updated subset cannot exceed it.' };
}
