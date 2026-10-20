// Pure local research implementation of published rules; no product matching or I/O.
// Sources/edition and independently checked calculator cases: docs/yuka-method.md.
const METHOD = 'original-nutriscore-with-yuka-nutrition-conversion';
const VERSION = '2017-original-2021-calculator+2024-12-20-yuka+water-verified-2026-10-19';
const SOURCES = Object.freeze({
  calculator: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Outil_Calcul_Nutri-Score_SpF_EN_20210921.xlsx',
  guide: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf',
  conversion: 'https://help.yuka.io/l/en/article/owuc9rbhqs-how-is-the-nutri-score-correlated-to-obtain-the-yuka-rating',
  simulator: 'https://editor.yuka.io/',
});
const THRESHOLDS = Object.freeze({
  energy: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugar: [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45],
  saturatedFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  sodium: [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
  fiber: [0.9, 1.9, 2.8, 3.7, 4.7], protein: [1.6, 3.2, 4.8, 6.4, 8],
  beverageEnergy: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
  beverageSugar: [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5],
  fatRatio: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64],
});
Object.values(THRESHOLDS).forEach(Object.freeze);
const FOOD_CONVERSION = [90, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 15, 13, 11, 9, 7, 5, 3, 1];
const DRINK_CONVERSION = [77, 74, 71, 68, 65, 57, 49, 41, 33, 15, 11, 7, 3];
const CATEGORIES = ['general', 'beverage', 'cheese', 'added-fat', 'water'];
const EXCLUDED_PRODUCTS = Object.freeze(['sugar', 'sugars', 'coconut-sugar', 'honey', 'agave', 'agave-syrup', 'maple-syrup', 'maplesyrup',
  'sweetener', 'sweeteners', 'table-sweetener', 'alcohol', 'alcoholic-beverage', 'infant-formula', 'infantformula',
  'protein-supplement', 'protein-supplements', 'protein-powder', 'pet-food', 'petfood', 'supplement', 'supplements',
  'dietary-supplement', 'dietary-supplements', 'food-supplement']);
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
const pointSummary = values => ({ min: values[0], max: values[values.length - 1], possible: values });
const sumOptions = (a, b) => unique(a.flatMap(x => b.map(y => x + y)));

function convertScore(raw, beverage) {
  if (beverage) return raw <= -4 ? 80 : raw >= 10 ? 0 : DRINK_CONVERSION[raw + 3];
  return raw <= -2 ? 100 : raw >= 19 ? 0 : FOOD_CONVERSION[raw + 1];
}
function letterFor(raw, beverage) {
  if (beverage) return raw < 2 ? 'B' : raw < 6 ? 'C' : raw < 10 ? 'D' : 'E';
  return raw < 0 ? 'A' : raw < 3 ? 'B' : raw < 11 ? 'C' : raw < 19 ? 'D' : 'E';
}
function formatRating(score100) {
  return nonnegative(score100) && score100 <= 100 ? (score100 / 10).toFixed(1) : null;
}
function isExcludedProductCategory(category) {
  return text(category) && EXCLUDED_PRODUCTS.includes(category.trim().toLowerCase().replace(/[_\s]+/g, '-'));
}

function evaluatePublishedNutrition(profile) {
  const input = object(profile) ? profile : {};
  const reasons = [], warnings = [], conversions = [];
  const add = (code, path, message) => reasons.push({ code, path, message });
  if (!object(profile)) add('invalid-profile', '', 'A nutrition profile object is required.');
  const category = input.methodCategory;
  if (!CATEGORIES.includes(category)) add('unsupported-category', 'methodCategory', 'An explicit supported method category is required.');
  if (isExcludedProductCategory(input.product?.category)) {
    add('excluded-product-category', 'product.category', 'The public Yuka method excludes this product category; selecting a method category cannot override that exclusion.');
  }
  const beverage = category === 'beverage' || category === 'water';
  const basis = object(input.basis) ? input.basis : {};
  let unit = basis.unit, amount = basis.amount;
  if (['US fl oz', 'fl oz (US)', 'us_fl_oz'].includes(unit) || (unit === 'fl oz' && basis.system === 'US')) {
    unit = 'ml'; amount *= 29.5735295625;
    conversions.push('US fluid ounces converted to mL using 29.5735295625 mL per US fl oz.');
  }
  if (!nonnegative(basis.amount) || basis.amount === 0 || !nonnegative(amount) || amount === 0
    || !['g', 'ml'].includes(unit)) add('unsupported-basis', 'basis', 'A positive declared gram or mL quantity (or explicit US fl oz) is required.');
  if (basis.kind != null && !['serving', '100g', '100ml'].includes(basis.kind)) {
    add('unsupported-basis', 'basis.kind', 'The supplied measurement basis is unsupported.');
  }
  if ((basis.kind === '100g' && (basis.amount !== 100 || basis.unit !== 'g'))
    || (basis.kind === '100ml' && (basis.amount !== 100 || basis.unit !== 'ml'))) {
    add('inconsistent-basis', 'basis', 'The amount and unit contradict the declared reference basis.');
  }
  if (beverage && unit === 'g') add('volume-required', 'basis.unit', 'This beverage route requires a declared volume; grams are not assumed to equal mL.');
  const scale = nonnegative(amount) && amount > 0 ? 100 / amount : null;
  const nutrients = {};
  if (input.nutrients != null && !object(input.nutrients)) add('invalid-nutrients', 'nutrients', 'Nutrients must be supplied as measurement objects.');
  for (const [key, target] of Object.entries(UNITS)) {
    nutrients[key] = null;
    const measurement = input.nutrients?.[key];
    if (measurement == null) continue;
    if (!object(measurement)) { add('invalid-measurement', `nutrients.${key}`, 'A measurement must contain a value and unit.'); continue; }
    const factor = key === 'calories' ? (measurement.unit === 'kcal' ? 1 : undefined)
      : key === 'energyKj' ? (measurement.unit === 'kJ' ? 1 : undefined)
        : MASS[measurement.unit] * (target === 'mg' ? 1000 : 1);
    if (measurement.value == null && measurement.unit == null) continue;
    if (!Number.isFinite(factor)) { add('unsupported-unit', `nutrients.${key}.unit`, 'The supplied unit cannot be converted for this nutrient.'); continue; }
    if (measurement.value == null) continue;
    if (!nonnegative(measurement.value)) { add('invalid-value', `nutrients.${key}`, 'A supplied value must be finite and nonnegative.'); continue; }
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
  else if (conflicts?.length) add('conflicting-panels', 'sourceState.unresolvedConflicts', 'Unresolved source/panel conflicts must be resolved before calculation.');
  for (const key of ['sourceId', 'sourceEdition', 'formulationId', 'panelId']) {
    const sourceValue = key === 'sourceId' ? input.source?.id : key === 'sourceEdition' ? input.source?.edition : input.source?.[key];
    const bindings = [sourceValue, basis[key], ...Object.values(object(input.nutrients) ? input.nutrients : {}).map(m => m?.[key])].filter(v => v != null);
    if (bindings.some(v => !text(v)) || new Set(bindings).size > 1) add('conflicting-provenance', key, 'Supplied measurements reference inconsistent source, formulation or panel bindings.');
  }
  const marketClaims = [input.product?.market, input.evidence?.market?.claim].filter(text);
  if (new Set(marketClaims).size > 1) add('conflicting-market', 'evidence.market', 'Supplied market claims disagree; formulations cannot be combined.');
  if (!marketClaims.length) warnings.push('Market unknown; this evaluates the supplied profile without establishing a regional formulation.');
  else if (marketClaims[0] !== 'US') warnings.push('This is a non-US profile; it does not establish a US formulation or barcode match.');
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
  contradiction('saturatedFat', 'fat'); contradiction('totalSugar', 'carbohydrates'); contradiction('fiber', 'carbohydrates');
  if (unit === 'g') {
    for (const [key, value] of Object.entries(nutrients)) {
      if (UNITS[key] === 'g' && value !== null && value > 100 + 1e-9) add('impossible-mass', `nutrients.${key}`, 'A nutrient exceeds 100 g per 100 g of product.');
    }
    if (nutrients.sodium > 100000) add('impossible-mass', 'nutrients.sodium', 'Sodium exceeds the mass of the product.');
  }
  if (nutrients.energyKj === null && nutrients.calories !== null) {
    nutrients.energyKj = Math.round(nutrients.calories * 4.2);
    if (!nonnegative(nutrients.energyKj)) add('conversion-overflow', 'nutrients.calories', 'Energy cannot be converted reliably.');
    conversions.push('Energy converted after normalization using the official original calculator: round(kcal × 4.2).');
  } else if (nutrients.energyKj !== null && nutrients.calories !== null) {
    // Allow ordinary declared-label rounding; do not merge clearly inconsistent panels.
    if (Math.abs(nutrients.energyKj - nutrients.calories * 4.2) > Math.max(21 * scale, nutrients.energyKj * 0.05)) {
      add('conflicting-energy', 'nutrients.energyKj', 'Declared kcal and kJ disagree beyond label rounding tolerance.');
    }
    warnings.push('Declared kJ is used directly; declared kcal is retained separately without replacing the source energy value.');
  }
  if (nutrients.sodium === null && nutrients.salt !== null) {
    nutrients.sodium = Math.round(nutrients.salt / 2.5 * 1000);
    if (!nonnegative(nutrients.sodium)) add('conversion-overflow', 'nutrients.salt', 'Sodium cannot be converted reliably.');
    conversions.push('Sodium converted using the official original calculator: round(salt g / 2.5 × 1000).');
  } else if (nutrients.salt !== null && nutrients.sodium !== null
    && Math.abs(nutrients.sodium - nutrients.salt / 2.5 * 1000) > Math.max(1, nutrients.sodium * 0.05)) {
    add('conflicting-salt-sodium', 'nutrients.sodium', 'Supplied salt and sodium values disagree beyond rounding tolerance.');
  }
  let plantPercent = null;
  if (input.plantContent != null) {
    const plant = input.plantContent;
    if (!object(plant) || !nonnegative(plant.percent) || plant.percent > 100) {
      add('invalid-plant-content', 'plantContent.percent', 'Eligible plant percentage must be between zero and 100.');
    } else if (!text(plant.basis) || !(text(plant.source) || (object(plant.source) && Object.values(plant.source).some(text)))) {
      add('plant-evidence-missing', 'plantContent', 'A supplied plant percentage needs its derivation and source attribution.');
    } else {
      plantPercent = Math.round(plant.percent * 10) / 10;
      conversions.push('Eligible plant content rounded to one decimal per original calculator instructions.');
    }
  }
  if (category === 'added-fat' && nutrients.fat === 0) add('undefined-fat-ratio', 'nutrients.fat', 'The added-fat calculation requires a positive total-fat denominator.');
  if (category === 'added-fat' && nutrients.fat === null) add('fat-denominator-unknown', 'nutrients.fat', 'The added-fat calculation requires a known positive total-fat denominator; no ratio was invented.');
  if (category === 'water' && ['energyKj', 'calories', 'saturatedFat', 'totalSugar', 'fiber', 'protein', 'fat', 'carbohydrates'].some(key => nutrients[key] > 0)) {
    add('water-category-conflict', 'methodCategory', 'A plain-water category conflicts with the supplied nutrient profile.');
  }
  const output = { methodId: METHOD, methodVersion: VERSION, methodCategory: CATEGORIES.includes(category) ? category : null,
    sources: { ...SOURCES }, grade: null, scoreReady: false,
    scanMatchEligible: false, status: 'invalid', eligible: false, nutritionScore100: null, rawScore: null, rawRange: null,
    possibleScores: [], letter: null, letters: [], points: {}, normalized: { basis: { amount: 100, unit: ['g', 'ml'].includes(unit) ? unit : null },
      nutrients, plantPercent, conversions }, reasons, warnings };
  if (reasons.length) {
    if (reasons.every(reason => reason.code === 'fat-denominator-unknown')) output.status = 'incomplete';
    return freeze(output);
  }
  if (category === 'water') {
    // Public simulator, Waters / water / all nutrients zero, verified 2026-10-19:
    // nutrition receives 60/60. This is categorical, not an invented raw N-P score.
    output.status = 'calculated'; output.eligible = true;
    output.nutritionScore100 = 100; output.possibleScores = [100];
    output.letter = 'A'; output.letters = ['A'];
    warnings.push('Plain water uses the categorical nutrition exception verified in the public Yuka simulator on 2026-10-19; no raw nutrient score is assigned.');
    return freeze(output);
  }
  // Unknown values remain unknown. Enumerate a conservative set of point bands,
  // constrained by supplied totals; never fill a missing nutrient with zero.
  const options = (key, thresholds, upper = Infinity, lower = 0, inclusive = false) => {
    if (nutrients[key] !== null) return [pointsFor(nutrients[key], thresholds, inclusive)];
    warnings.push(`${key} is unknown; its possible point bands are retained.`);
    // If arithmetic roundoff makes a nominally equal bound cross a threshold,
    // keep both adjacent bands rather than producing an empty candidate set.
    const a = pointsFor(lower, thresholds, inclusive), b = pointsFor(upper, thresholds, inclusive);
    return range(Math.min(a, b), Math.max(a, b));
  };
  const energy = options('energyKj', beverage ? THRESHOLDS.beverageEnergy : THRESHOLDS.energy);
  const sugar = options('totalSugar', beverage ? THRESHOLDS.beverageSugar : THRESHOLDS.sugar,
    nutrients.carbohydrates ?? Infinity, Math.max(nutrients.addedSugar ?? 0, nutrients.freeSugar ?? 0));
  let saturatedFat;
  if (category === 'added-fat') {
    if (nutrients.fat !== null && nutrients.saturatedFat !== null) {
      saturatedFat = [pointsFor(nutrients.saturatedFat / nutrients.fat * 100, THRESHOLDS.fatRatio, true)];
    } else {
      saturatedFat = nutrients.saturatedFat === 0 ? [0] : range(0, 10);
      warnings.push('Fat ratio is incomplete; possible ratio points are retained.');
    }
  } else saturatedFat = options('saturatedFat', THRESHOLDS.saturatedFat, nutrients.fat ?? Infinity);
  const sodium = options('sodium', THRESHOLDS.sodium);
  const fiber = options('fiber', THRESHOLDS.fiber, nutrients.carbohydrates ?? Infinity);
  const protein = options('protein', THRESHOLDS.protein);
  const plant = plantPercent === null ? (beverage ? [0, 2, 4, 10] : [0, 1, 2, 5])
    : [(plantPercent > 80 ? 5 : plantPercent > 60 ? 2 : plantPercent > 40 ? 1 : 0) * (beverage ? 2 : 1)];
  if (plantPercent === null) warnings.push('Eligible plant percentage is unknown; all applicable plant point bands are retained.');
  const negative = [energy, sugar, saturatedFat, sodium].reduce(sumOptions, [0]);
  const raw = new Set(), usedProtein = new Set();
  for (const n of negative) for (const p of plant) for (const f of fiber) for (const pr of protein) {
    const use = category === 'cheese' || n < 11 || p === (beverage ? 10 : 5);
    usedProtein.add(use ? pr : 0); raw.add(n - p - f - (use ? pr : 0));
  }
  const rawValues = unique([...raw]);
  output.rawRange = [rawValues[0], rawValues[rawValues.length - 1]];
  output.rawScore = rawValues.length === 1 ? rawValues[0] : null;
  output.possibleScores = unique(rawValues.map(value => convertScore(value, beverage)));
  output.letters = [...new Set(rawValues.map(value => letterFor(value, beverage)))].sort();
  output.letter = output.letters.length === 1 ? output.letters[0] : null;
  output.points = Object.fromEntries(Object.entries({ energy, sugar, saturatedFat, sodium, fiber, protein, plant,
    negative, proteinApplied: unique([...usedProtein]) }).map(([key, values]) => [key, pointSummary(values)]));
  if (output.possibleScores.length === 1) {
    output.status = 'calculated'; output.eligible = true; output.nutritionScore100 = output.possibleScores[0];
    if (rawValues.length > 1) warnings.push('The raw score is uncertain, but every retained completion has the same published nutrition conversion.');
  } else {
    output.status = 'incomplete';
    add('score-not-determined', 'nutrients', 'Missing inputs allow different nutrition scores; ranges are shown without assigning favorable or unfavorable values.');
  }
  return freeze(output);
}

module.exports = { METHOD, VERSION, SOURCES, THRESHOLDS, EXCLUDED_PRODUCTS, isExcludedProductCategory,
  evaluatePublishedNutrition, formatRating };
