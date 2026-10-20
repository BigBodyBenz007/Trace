// Pure, development-only calculation. The original/Yuka engine is preserved separately.
// Numbers encode official A-E bands for Trace's preview; they are not official scores,
// percentages, within-band precision, product safety or a validated health index.
const METHOD = 'updated-nutriscore-with-trace-ordinal-band-display';
const VERSION = '2023-updated+2024-04-04-calculator+2025-03-17-faq+trace-bands-v1';
const SOURCES = Object.freeze({
  calculator: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Nutri-Score_Updated-algorithm_20240404.xlsx',
  guide: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf',
  official: 'https://www.santepubliquefrance.fr/en/nutrition-and-physical-activity/nutri-score',
  usLabelRounding: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9#p-101.9(c)(6)',
});
const BAND_SCORES = Object.freeze({ A: 90, B: 70, C: 50, D: 30, E: 10 });
const THRESHOLDS = Object.freeze({
  energy: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugar: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  saturatedFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  salt: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4],
  fiber: [3, 4.1, 5.2, 6.3, 7.4], protein: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
  beverageEnergy: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390],
  beverageSugar: [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11],
  beverageProtein: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3],
  fatEnergy: [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200],
  fatRatio: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64],
});
Object.values(THRESHOLDS).forEach(Object.freeze);
const CATEGORIES = Object.freeze(['general', 'beverage', 'cheese', 'red-meat', 'fats-nuts-seeds', 'water']);
// Nutri-Score exclusions, not Yuka's separate exclusions of e.g. honey and sugar.
const EXCLUDED_PRODUCTS = Object.freeze(['alcohol', 'alcoholic-beverage', 'infant-formula', 'infantformula',
  'baby-food', 'food-for-infants', 'food-for-young-children', 'food-for-special-medical-purposes',
  'total-diet-replacement', 'pet-food', 'petfood', 'supplement', 'supplements', 'dietary-supplement',
  'dietary-supplements', 'food-supplement', 'protein-supplement', 'protein-supplements']);
const MASS = { g: 1, mg: 0.001, mcg: 0.000001, ug: 0.000001, '\u00b5g': 0.000001, '\u03bcg': 0.000001 };
const UNITS = { calories: 'kcal', energyKj: 'kJ', saturatedFat: 'g', totalSugar: 'g', sodium: 'mg',
  salt: 'g', fiber: 'g', protein: 'g', fat: 'g', carbohydrates: 'g', addedSugar: 'g', freeSugar: 'g' };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const nonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const freeze = v => { if (object(v) || Array.isArray(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const unique = a => [...new Set(a)].sort((a, b) => a - b);
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const pointsFor = (value, thresholds, inclusive = false) => thresholds.filter(t => inclusive ? value >= t : value > t).length;
const sumOptions = (a, b) => unique(a.flatMap(x => b.map(y => x + y)));
const sourcePresent = source => text(source) || (object(source) && Object.values(source).some(text));
const pointSummary = values => ({ min: values[0], max: values[values.length - 1], possible: values });
const categoryRulesFor = category => {
  if (category === 'water') return ['Plain water receives A categorically; no raw N-P score is invented.'];
  if (category === 'beverage') return ['Beverages include milk, drinkable yogurt and plant-based drinks.',
    'Non-nutritive sweetener presence adds four nutritional-method points; this is not a toxicity classification.',
    'Protein is always counted; only plain water can receive A.'];
  if (category === 'fats-nuts-seeds') return ['Fats, oils, nuts and seeds use energy from saturates (g × 37 kJ) and the saturated/total-fat ratio.',
    'Protein counts only when negative points are below seven.',
    'Processed nut/seed products require more than 50% nuts/seeds; qualifying whole-edible-plant oils can count toward FVL.'];
  if (category === 'cheese') return ['Cheese always counts protein; plant-based cheese alternatives use the general category.'];
  if (category === 'red-meat') return ['Qualifying meat products with at least 20% red meat cap protein credit at two points.',
    'Protein counts only when negative points are below eleven.'];
  return ['General foods count protein only when negative points are below eleven.',
    'Nuts, seeds and added oils do not receive the general FVL credit.'];
};

function letterFor(raw, category) {
  if (category === 'water') return 'A';
  if (category === 'beverage') return raw <= 2 ? 'B' : raw <= 6 ? 'C' : raw <= 9 ? 'D' : 'E';
  if (category === 'fats-nuts-seeds') return raw <= -6 ? 'A' : raw <= 2 ? 'B' : raw <= 10 ? 'C' : raw <= 18 ? 'D' : 'E';
  return raw <= 0 ? 'A' : raw <= 2 ? 'B' : raw <= 10 ? 'C' : raw <= 18 ? 'D' : 'E';
}

function evaluateUpdatedNutrition(profile) {
  const input = object(profile) ? profile : {};
  const reasons = [], warnings = [], conversions = [];
  const add = (code, path, message) => reasons.push({ code, path, message });
  if (!object(profile)) add('invalid-profile', '', 'A nutrition profile object is required.');
  let categories = [];
  if (input.updatedCategory != null) {
    if (CATEGORIES.includes(input.updatedCategory)) categories = [input.updatedCategory];
    else add('unsupported-category', 'updatedCategory', 'An explicit supported updated-method category is required.');
  }
  if (input.updatedCategoryCandidates != null) {
    const candidates = input.updatedCategoryCandidates;
    if (!Array.isArray(candidates) || !candidates.length || candidates.some(c => !CATEGORIES.includes(c))
      || new Set(candidates).size !== candidates.length) {
      add('invalid-category-candidates', 'updatedCategoryCandidates', 'Category candidates must be distinct supported categories.');
    } else if (categories.length && (candidates.length !== 1 || candidates[0] !== categories[0])) {
      add('conflicting-category', 'updatedCategoryCandidates', 'A settled category cannot contradict the candidate categories.');
    } else categories = [...candidates];
  }
  if (!categories.length && !reasons.some(r => r.path.startsWith('updatedCategory'))) {
    add('unsupported-category', 'updatedCategory', 'Supply an updated-method category or a supported set of unresolved category candidates.');
  }
  const productCategory = input.product?.category;
  if (text(productCategory) && EXCLUDED_PRODUCTS.includes(productCategory.trim().toLowerCase().replace(/[_\s]+/g, '-'))) {
    add('excluded-product-category', 'product.category', 'This product is outside the supported Nutri-Score food scope.');
  }
  const basis = object(input.basis) ? input.basis : {};
  let unit = basis.unit, amount = basis.amount;
  if (['US fl oz', 'fl oz (US)', 'us_fl_oz'].includes(unit) || (unit === 'fl oz' && basis.system === 'US')) {
    unit = 'ml'; amount *= 29.5735295625;
    conversions.push('US fluid ounces converted to mL using 29.5735295625 mL per US fl oz.');
  }
  if (!nonnegative(basis.amount) || basis.amount === 0 || !nonnegative(amount) || amount === 0 || !['g', 'ml'].includes(unit)) {
    add('unsupported-basis', 'basis', 'A positive declared gram or mL quantity (or explicit US fl oz) is required.');
  }
  if (basis.kind != null && !['serving', '100g', '100ml'].includes(basis.kind)) add('unsupported-basis', 'basis.kind', 'Unsupported measurement basis.');
  if ((basis.kind === '100g' && (basis.amount !== 100 || basis.unit !== 'g'))
    || (basis.kind === '100ml' && (basis.amount !== 100 || basis.unit !== 'ml'))) {
    add('inconsistent-basis', 'basis', 'The amount and unit contradict the declared reference basis.');
  }
  if (categories.some(c => c === 'beverage' || c === 'water') && unit === 'g') {
    add('volume-required', 'basis.unit', 'The beverage route requires a declared volume; grams are not assumed to equal mL.');
  }
  const scale = nonnegative(amount) && amount > 0 ? 100 / amount : null;
  const nutrients = {};
  if (input.nutrients != null && !object(input.nutrients)) add('invalid-nutrients', 'nutrients', 'Nutrients must be measurement objects.');
  for (const [key, target] of Object.entries(UNITS)) {
    nutrients[key] = null;
    const measurement = input.nutrients?.[key];
    if (measurement == null) continue;
    if (!object(measurement)) { add('invalid-measurement', `nutrients.${key}`, 'A measurement must contain a value and unit.'); continue; }
    const factor = key === 'calories' ? (measurement.unit === 'kcal' ? 1 : undefined)
      : key === 'energyKj' ? (measurement.unit === 'kJ' ? 1 : undefined)
        : MASS[measurement.unit] * (target === 'mg' ? 1000 : 1);
    if (measurement.value == null && measurement.unit == null) continue;
    if (!Number.isFinite(factor)) { add('unsupported-unit', `nutrients.${key}.unit`, 'Unsupported nutrient unit.'); continue; }
    if (measurement.value == null) continue;
    if (!nonnegative(measurement.value)) { add('invalid-value', `nutrients.${key}`, 'A value must be finite and nonnegative.'); continue; }
    if (measurement.basis != null && (!object(measurement.basis)
      || measurement.basis.amount !== basis.amount || measurement.basis.unit !== basis.unit)) {
      add('mixed-measurement-basis', `nutrients.${key}.basis`, 'A nutrient uses a different measurement basis.');
    }
    if (scale === null) continue;
    const value = measurement.value * factor * scale;
    if (!nonnegative(value) || (measurement.value > 0 && value === 0)) {
      add('conversion-overflow', `nutrients.${key}`, 'The measurement cannot be normalized reliably.'); continue;
    }
    nutrients[key] = value;
  }
  const conflicts = input.sourceState?.unresolvedConflicts;
  if (conflicts != null && !Array.isArray(conflicts)) add('invalid-conflicts', 'sourceState.unresolvedConflicts', 'Conflict metadata is malformed.');
  else if (conflicts?.length) add('conflicting-panels', 'sourceState.unresolvedConflicts', 'Unresolved source/panel conflicts must be resolved.');
  for (const key of ['sourceId', 'sourceEdition', 'formulationId', 'panelId']) {
    const sourceValue = key === 'sourceId' ? input.source?.id : key === 'sourceEdition' ? input.source?.edition : input.source?.[key];
    const bindings = [sourceValue, basis[key], ...Object.values(object(input.nutrients) ? input.nutrients : {}).map(m => m?.[key])].filter(v => v != null);
    if (bindings.some(v => !text(v)) || new Set(bindings).size > 1) add('conflicting-provenance', key, 'Supplied measurements reference inconsistent source, formulation or panel bindings.');
  }
  const markets = [input.product?.market, input.evidence?.market?.claim].filter(text);
  if (new Set(markets).size > 1) add('conflicting-market', 'evidence.market', 'Market claims disagree; formulations cannot be combined.');
  if (!markets.length) warnings.push('Market unknown; this evaluates the supplied profile without establishing a regional formulation.');
  else if (markets[0] !== 'US') warnings.push('A non-US profile does not establish a US formulation or barcode match.');
  if (!text(input.product?.gtin)) warnings.push('GTIN unknown; assessment does not establish barcode matching.');
  if (!text(input.source?.url) && !text(input.source?.artifact?.locator)) warnings.push('Source attribution is incomplete.');
  if (!text(input.evidence?.reviewedOn)) warnings.push('No review date is supplied.');
  if (!text(input.source?.artifact?.sha256)) warnings.push('No archived source hash is supplied.');
  if (input.sourceState?.cacheStale || input.sourceState?.superseded) warnings.push('The supplied source is marked stale or superseded.');
  const contradiction = (part, total) => {
    if (nutrients[part] !== null && nutrients[total] !== null && nutrients[part] > nutrients[total] + 1e-9) {
      add('contradictory-nutrients', `nutrients.${part}`, `${part} exceeds ${total} on the same measurement basis.`);
    }
  };
  contradiction('addedSugar', 'totalSugar'); contradiction('freeSugar', 'totalSugar');
  contradiction('addedSugar', 'carbohydrates'); contradiction('freeSugar', 'carbohydrates');
  contradiction('saturatedFat', 'fat'); contradiction('totalSugar', 'carbohydrates');
  // US total carbohydrate includes fibre; an EU declaration may exclude it.
  const carbsIncludeFiber = markets[0] === 'US' || input.carbohydrateBasis === 'includes-fiber';
  if (carbsIncludeFiber) contradiction('fiber', 'carbohydrates');
  // This optional bound is specific to explicit US Nutrition Facts label inputs.
  // 21 CFR 101.9(c)(6), (i), (ii) use nearest-gram declarations: two known
  // measurements can leave up to 1 g more residual than their printed difference.
  // It bounds a missing component's points, never fills its measurement with zero.
  // Generic composition/API data, unknown markets and non-serving bases do not
  // inherit US label rounding just because a product name looks American.
  const usLabel = markets[0] === 'US' && input.evidence?.market?.claim === 'US'
    && ['manufacturer-label', 'retailer-label'].includes(input.source?.kind)
    && text(input.source?.id) && text(input.source?.edition)
    && (text(input.source?.url) || text(input.source?.artifact?.locator))
    && basis.kind === 'serving' && scale !== null;
  const wholeGramDeclaration = key => input.nutrients?.[key]?.unit === 'g'
    && Number.isInteger(input.nutrients[key].value) && nonnegative(input.nutrients[key].value);
  const derivedBounds = {};
  if (usLabel && wholeGramDeclaration('carbohydrates')) {
    for (const [unknown, known] of [['fiber', 'totalSugar'], ['totalSugar', 'fiber']]) {
      if (nutrients[unknown] !== null || !wholeGramDeclaration(known)) continue;
      const upper = Math.max(0, nutrients.carbohydrates - nutrients[known] + scale);
      derivedBounds[unknown] = { min: 0, max: upper, unit: 'g', roundingAllowancePerSourceBasisG: 1,
        source: SOURCES.usLabelRounding, basis: 'US declared total carbohydrate less the other known component, plus rounding allowance; per 100 declared units.' };
      warnings.push(`${unknown} remains unknown; its point range uses a US-label carbohydrate residual bound with a 1 g per-serving rounding allowance.`);
    }
  }
  if (unit === 'g') {
    for (const [key, value] of Object.entries(nutrients)) {
      if (UNITS[key] === 'g' && value !== null && value > 100 + 1e-9) add('impossible-mass', `nutrients.${key}`, 'A nutrient exceeds 100 g per 100 g of product.');
    }
    if (nutrients.sodium > 100000) add('impossible-mass', 'nutrients.sodium', 'Sodium exceeds product mass.');
  }
  if (nutrients.energyKj === null && nutrients.calories !== null) {
    nutrients.energyKj = Math.round(nutrients.calories * 4.2);
    if (!nonnegative(nutrients.energyKj)) add('conversion-overflow', 'nutrients.calories', 'Energy cannot be converted reliably.');
    conversions.push('Energy converted after normalization with the official updated calculator: round(kcal × 4.2).');
  } else if (nutrients.energyKj !== null && nutrients.calories !== null) {
    if (Math.abs(nutrients.energyKj - nutrients.calories * 4.2) > Math.max(21 * scale, nutrients.energyKj * 0.05)) {
      add('conflicting-energy', 'nutrients.energyKj', 'Declared kcal and kJ disagree beyond label rounding tolerance.');
    }
    warnings.push('Declared kJ is used directly; kcal is retained separately.');
  }
  if (nutrients.salt === null && nutrients.sodium !== null) {
    nutrients.salt = nutrients.sodium / 1000 * 2.5;
    if (!nonnegative(nutrients.salt)) add('conversion-overflow', 'nutrients.sodium', 'Salt cannot be converted reliably.');
    conversions.push('Salt g = sodium mg / 1000 × 2.5; no intermediate sodium rounding.');
  } else if (nutrients.salt !== null && nutrients.sodium !== null
    && Math.abs(nutrients.sodium - nutrients.salt / 2.5 * 1000) > Math.max(1, nutrients.sodium * 0.05)) {
    add('conflicting-salt-sodium', 'nutrients.sodium', 'Supplied salt and sodium disagree beyond rounding tolerance.');
  }
  let plantPercent = null;
  if (input.updatedFvlContent != null) {
    const plant = input.updatedFvlContent;
    if (!object(plant) || !nonnegative(plant.percent) || plant.percent > 100) add('invalid-plant-content', 'updatedFvlContent.percent', 'FVL percentage must be between zero and 100.');
    else if (!text(plant.basis) || !sourcePresent(plant.source)) add('plant-evidence-missing', 'updatedFvlContent', 'FVL needs updated-method derivation and source attribution.');
    else {
      plantPercent = Math.round(plant.percent * 10) / 10;
      conversions.push('Updated eligible FVL rounded to one decimal per calculator Instructions!B35.');
    }
  }
  // Original plantContent is deliberately not reused: the eligible ingredients changed.
  let nnsPresent = null;
  if (input.nonNutritiveSweeteners != null) {
    const nns = input.nonNutritiveSweeteners;
    if (!object(nns) || typeof nns.present !== 'boolean') add('invalid-sweetener-evidence', 'nonNutritiveSweeteners', 'A supplied NNS determination must explicitly state presence or absence.');
    else if (!text(nns.basis) || !sourcePresent(nns.source)) add('sweetener-evidence-missing', 'nonNutritiveSweeteners', 'NNS presence/absence requires a basis and source.');
    else nnsPresent = nns.present;
  }
  if (categories.includes('fats-nuts-seeds') && nutrients.fat === 0) add('undefined-fat-ratio', 'nutrients.fat', 'The fats/nuts/seeds category requires positive total fat.');
  if (categories.includes('fats-nuts-seeds') && nutrients.fat === null) add('fat-denominator-unknown', 'nutrients.fat', 'A positive total-fat denominator is needed for this category.');
  if (categories.includes('water') && ['energyKj', 'calories', 'saturatedFat', 'totalSugar', 'fiber', 'protein', 'fat', 'carbohydrates'].some(key => nutrients[key] > 0)) {
    add('water-category-conflict', 'updatedCategory', 'Plain water conflicts with the supplied nutrient profile.');
  }
  if (categories.includes('water') && nnsPresent === true) add('water-category-conflict', 'nonNutritiveSweeteners', 'Sweetened water is not the categorical plain-water exception.');
  const output = { methodId: METHOD, methodVersion: VERSION, methodCategory: categories.length === 1 ? categories[0] : null,
    categoryCandidates: [...categories], categoryRules: [...new Set(categories.flatMap(categoryRulesFor))],
    sources: { ...SOURCES }, displayScale: 'Trace ordinal band code; not an official 0–100 score or health percentage',
    grade: null, scoreReady: false, scanMatchEligible: false, status: 'invalid', eligible: false,
    nutritionScore100: null, rawScore: null, rawRange: null, rawCandidates: [], possibleScores: [], letter: null, letters: [], points: {},
    normalized: { basis: { amount: 100, unit: ['g', 'ml'].includes(unit) ? unit : null }, nutrients,
      plantPercent, nonNutritiveSweeteners: nnsPresent, derivedBounds, conversions }, reasons, warnings };
  if (reasons.length) {
    if (reasons.every(r => r.code === 'fat-denominator-unknown')) output.status = 'incomplete';
    return freeze(output);
  }
  const options = (key, thresholds, upper = Infinity, lower = 0, inclusive = false) => {
    if (nutrients[key] !== null) return [pointsFor(nutrients[key], thresholds, inclusive)];
    warnings.push(`${key} is unknown; its possible point bands are retained.`);
    const a = pointsFor(lower, thresholds, inclusive), b = pointsFor(upper, thresholds, inclusive);
    return range(Math.min(a, b), Math.max(a, b));
  };
  const allRaw = new Set(), allLetters = new Set(), mergedPoints = {};
  let categoricalWater = false;
  for (const category of categories) {
    if (category === 'water') {
      categoricalWater = true; allLetters.add('A');
      output.rawCandidates.push({ category, rawScores: [null] });
      continue;
    }
    const beverage = category === 'beverage', fats = category === 'fats-nuts-seeds';
    const energy = fats ? (nutrients.saturatedFat === null ? range(0, pointsFor(nutrients.fat * 37, THRESHOLDS.fatEnergy))
      : [pointsFor(nutrients.saturatedFat * 37, THRESHOLDS.fatEnergy)])
      : options('energyKj', beverage ? THRESHOLDS.beverageEnergy : THRESHOLDS.energy);
    const sugar = options('totalSugar', beverage ? THRESHOLDS.beverageSugar : THRESHOLDS.sugar,
      Math.min(nutrients.carbohydrates ?? Infinity, derivedBounds.totalSugar?.max ?? Infinity),
      Math.max(nutrients.addedSugar ?? 0, nutrients.freeSugar ?? 0));
    const saturatedFat = fats ? (nutrients.saturatedFat === null ? range(0, 10)
      : [pointsFor(nutrients.saturatedFat / nutrients.fat * 100, THRESHOLDS.fatRatio, true)])
      : options('saturatedFat', THRESHOLDS.saturatedFat, nutrients.fat ?? Infinity);
    const salt = options('salt', THRESHOLDS.salt);
    const fiber = options('fiber', THRESHOLDS.fiber, Math.min(derivedBounds.fiber?.max ?? Infinity,
      carbsIncludeFiber ? nutrients.carbohydrates ?? Infinity : Infinity));
    const protein = unique(options('protein', beverage ? THRESHOLDS.beverageProtein : THRESHOLDS.protein).map(p => category === 'red-meat' ? Math.min(2, p) : p));
    const plant = plantPercent === null ? (beverage ? [0, 2, 4, 6] : [0, 1, 2, 5])
      : [beverage ? (plantPercent > 80 ? 6 : plantPercent > 60 ? 4 : plantPercent > 40 ? 2 : 0)
        : (plantPercent > 80 ? 5 : plantPercent > 60 ? 2 : plantPercent > 40 ? 1 : 0)];
    const nonNutritiveSweeteners = beverage ? (nnsPresent === null ? [0, 4] : [nnsPresent ? 4 : 0]) : [0];
    if (plantPercent === null) warnings.push('Updated FVL percentage is unknown; all applicable point bands are retained.');
    if (beverage && nnsPresent === null) warnings.push('NNS status is unknown; both absence and presence are retained.');
    // Unknown saturated fat simultaneously affects fat energy and fat ratio.
    // Their independent Cartesian range over-approximates feasible pairs; it can
    // withhold an otherwise computable band but cannot invent a certain band.
    if (fats && nutrients.saturatedFat === null) warnings.push('Unknown saturates retain conservative fat-energy/ratio possibilities.');
    const negative = [energy, sugar, saturatedFat, salt, nonNutritiveSweeteners].reduce(sumOptions, [0]);
    const usedProtein = new Set(), categoryRaw = new Set();
    for (const n of negative) for (const p of plant) for (const f of fiber) for (const pr of protein) {
      const use = beverage || category === 'cheese' || n < (fats ? 7 : 11);
      usedProtein.add(use ? pr : 0);
      const raw = n - p - f - (use ? pr : 0);
      categoryRaw.add(raw);
      allRaw.add(raw); allLetters.add(letterFor(raw, category));
    }
    const pointSets = { energy, sugar, saturatedFat, salt, fiber, protein, plant, nonNutritiveSweeteners,
      negative, proteinApplied: [...usedProtein] };
    for (const [key, values] of Object.entries(pointSets)) mergedPoints[key] = unique([...(mergedPoints[key] || []), ...values]);
    output.rawCandidates.push({ category, rawScores: unique([...categoryRaw]) });
  }
  const rawValues = unique([...allRaw]);
  output.rawRange = rawValues.length && !categoricalWater ? [rawValues[0], rawValues[rawValues.length - 1]] : null;
  output.rawScore = rawValues.length === 1 && !categoricalWater ? rawValues[0] : null;
  output.letters = [...allLetters].sort();
  output.letter = output.letters.length === 1 ? output.letters[0] : null;
  output.possibleScores = unique(output.letters.map(letter => BAND_SCORES[letter]));
  output.points = Object.fromEntries(Object.entries(mergedPoints).map(([key, values]) => [key, pointSummary(values)]));
  output.warnings = [...new Set(warnings)];
  if (categories.length > 1) output.warnings.push('Category is unresolved; every supported candidate is evaluated without guessing its composition.');
  if (output.letter !== null) {
    output.status = 'calculated'; output.eligible = true; output.nutritionScore100 = BAND_SCORES[output.letter];
    if (rawValues.length > 1 || categories.length > 1) output.warnings.push('The exact raw score or category is uncertain, but all retained possibilities share the same official letter band.');
  } else {
    output.status = 'incomplete';
    add('band-not-determined', 'nutrients', 'Missing inputs or category evidence allow different official bands; no band code is assigned.');
  }
  return freeze(output);
}

module.exports = { METHOD, VERSION, SOURCES, BAND_SCORES, THRESHOLDS, CATEGORIES, EXCLUDED_PRODUCTS,
  evaluateUpdatedNutrition, letterFor };
