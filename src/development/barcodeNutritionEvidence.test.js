import { reconcileBarcodeDatasets, resolveBarcodeCategory, resolveBarcodePlantContent, FDA_ENERGY_SOURCE, CATEGORY_SOURCE } from './barcodeNutritionEvidence';

// Synthetic boundary controls, not manufacturer nutrition panels.
const observation = (nutrient, rawValue, rawUnit, field = nutrient) => ({ nutrient, rawValue, rawUnit, field });
const dataset = (kcal, kj, amount = 30, basis = 'serving', unit = 'g') => ({
  id: `${basis}-${amount}-${unit}`, basis, quantity: { amount, unit },
  observations: [observation('calories', kcal, 'kcal', 'kcal'), observation('calories', kj, 'kJ', 'kj')],
});
const reconcile = (...datasets) => reconcileBarcodeDatasets({ datasets });

test.each([[160, 669], [150, 645], [360, 1520], [50, 215], [0, 0]])('accepts compatible energy representations %s kcal/%s kJ', (kcal, kj) => {
  const input = dataset(kcal, kj), before = JSON.stringify(input);
  const result = reconcile(input);
  expect(result.reasons).toEqual([]);
  expect(result.records[0]).toMatchObject({ energyKj: kj, nutrients: { calories: { value: kcal } } });
  expect(result.records[0].energyEvidence).toMatchObject({ accepted: true, source: FDA_ENERGY_SOURCE });
  expect(JSON.stringify(input)).toBe(before);
});
test.each([[160, 709], [190, 1160], [300, 1300], [0, 100], [150, 663]])('rejects contradictory %s kcal/%s kJ', (kcal, kj) => {
  expect(reconcile(dataset(kcal, kj)).reasons.join(' ')).toContain('Energy observations conflict');
});
test('a non-label per-100 quantity does not inherit a flat five-kcal serving tolerance', () => {
  expect(reconcile(dataset(160, 685, 100, '100g')).reasons.length).toBeGreaterThan(0);
});
test('FDA-compatible declaration and unit-convention interval has deterministic boundaries', () => {
  const ceiling = 165 * 4.2 + .5;
  expect(reconcile(dataset(160, ceiling)).reasons.length).toBeGreaterThan(0); // decimal kJ has its own finer precision
  expect(reconcile(dataset(160, 693)).reasons).toEqual([]);
  expect(reconcile(dataset(160, 694)).reasons.length).toBeGreaterThan(0);
});
test('per-serving/per-100 observations are compared after rescaling compatible units', () => {
  const serving = dataset(160, 669, 25), hundred = dataset(640, 2676, 100, '100g');
  expect(reconcile(serving, hundred).reasons).toEqual([]);
  expect(reconcile(serving, hundred).records[1].energyEvidence.calorieRoundingAllowance).toBe(20);
  const foreignDimension = dataset(640, 2676, 100, '100ml', 'ml');
  expect(reconcile(serving, foreignDimension).reasons.length).toBeGreaterThan(0);
});
test('independent decimal representation rounding is accepted across quantities, not large differences', () => {
  const serving = dataset(150, 645, 30), hundred = dataset(500, 2148.44, 100, '100g');
  serving.observations.push(observation('sodium', 230, 'mg'));
  hundred.observations.push(observation('sodium', 768, 'mg'));
  expect(reconcile(serving, hundred).reasons).toEqual([]);
  hundred.observations[2].rawValue = 1000;
  expect(reconcile(serving, hundred).reasons.join(' ')).toContain('sodium conflicts');
});
test('duplicate aliases retain the exact reported kJ; conflicting aliases are rejected', () => {
  const input = dataset(160, 669);
  input.observations.push(observation('calories', 669, 'kJ', 'energy'));
  expect(reconcile(input).records[0].energyKj).toBe(669);
  input.observations[2].rawValue = 900;
  expect(reconcile(input).reasons.length).toBeGreaterThan(0);
});

test('a provider-computed approximation is retained without contradicting entered label kcal', () => {
  const input = dataset(190, 1160);
  input.observations[1].derivation = 'off:modifier:~';
  const before = JSON.stringify(input), result = reconcile(input);
  expect(result.reasons).toEqual([]);
  expect(result.records[0]).toMatchObject({ energyKj: null, nutrients: { calories: { value: 190, status: 'reported' } } });
  expect(result.records[0].energyEvidence.observations[1]).toMatchObject({ rawValue: 1160, derivation: 'off:modifier:~' });
  expect(result.warnings.join(' ')).toContain('not treated as a label declaration');
  expect(result.warnings.join(' ')).not.toContain('rounding accepted');
  expect(JSON.stringify(input)).toBe(before);
});

test('qualified-only energy stays unknown; no approximate measurement becomes known zero', () => {
  const input = dataset(190, 1160);
  input.observations.forEach(entry => { entry.derivation = 'off:modifier:~'; });
  expect(reconcile(input).records[0]).toMatchObject({ energyKj: null, nutrients: { calories: { value: null, status: 'unknown' } } });
});

test('approximate metadata never hides conflicting unqualified energy or invalid values', () => {
  const input = dataset(190, 1160);
  input.observations.push({ ...observation('calories', 1600, 'kJ'), derivation: 'off:modifier:~' });
  expect(reconcile(input).reasons.length).toBeGreaterThan(0);
  input.observations[1].derivation = 'off:modifier:~';
  input.observations.push(observation('calories', 250, 'kcal'));
  expect(reconcile(input).reasons.length).toBeGreaterThan(0);
  const negative = dataset(190, -1160);
  negative.observations[1].derivation = 'off:modifier:~';
  expect(reconcile(negative).reasons.length).toBeGreaterThan(0);
});

test('unsupported bounded energy is not interpreted as an exact point value', () => {
  const input = dataset(190, 1160);
  input.observations[1].derivation = 'off:modifier:<';
  expect(reconcile(input).reasons.length).toBeGreaterThan(0);
});

test('inconsistent serving units remain disclosed without inventing density for a reference vector', () => {
  const input = { datasets: [dataset(200, 836.8, 100, '100g')], serving: [
    { field: 'serving_size', value: '1.5 cups (40 g)' }, { field: 'serving_quantity_unit', value: 'ml' },
  ] };
  const result = reconcileBarcodeDatasets(input);
  expect(result.warnings.join(' ')).toContain('serving-size text and structured unit disagree');
  expect(result.records[0].quantity).toEqual({ amount: 100, unit: 'g' });
});
test.each([-1, NaN, 'not a number'])('invalid energy is rejected (%s)', value => {
  expect(reconcile(dataset(value, 669)).reasons.length).toBeGreaterThan(0);
});
test('unsupported units and same-basis contradictions do not become rounding', () => {
  const input = dataset(160, 669);
  input.observations[0].rawUnit = 'Calories?';
  expect(reconcile(input).reasons.length).toBeGreaterThan(0);
  const contradiction = dataset(160, 669);
  contradiction.observations.push(observation('addedSugar', 12, 'g'), observation('totalSugar', 10, 'g'));
  expect(reconcile(contradiction).reasons.join(' ')).toContain('addedSugar exceeds totalSugar');
});
test('missing energy remains unknown, never zero', () => {
  const input = dataset(null, null);
  expect(reconcile(input).records[0].nutrients.calories.value).toBeNull();
});
test('same-quantity nutrient records must agree; rescaling tolerance cannot hide a second panel', () => {
  const left = dataset(150, 630), right = { ...dataset(150, 630), id: 'second-panel' };
  left.observations.push(observation('protein', 2, 'g'));
  right.observations = [...right.observations, observation('protein', 3, 'g')];
  expect(reconcile(left, right).reasons.join(' ')).toContain('protein conflicts');
});
test('a missing kcal value may use a directly supplied kJ value without losing that observation', () => {
  const result = reconcile(dataset(null, 669));
  expect(result.reasons).toEqual([]);
  expect(result.records[0].energyKj).toBe(669);
  expect(result.records[0].nutrients.calories.value).toBeCloseTo(669 / 4.184, 10);
});

const category = (name, claims = [], text = '', serving = []) => resolveBarcodeCategory({
  identity: { name }, categories: [{ values: claims }], serving,
}, { ingredients: { text } });
test.each([
  ['Cheese crackers', ['en:crackers-appetizers'], '', ['general']],
  ['Potato chips', ['en:potato-crisps'], '', ['general']],
  ['Lasagna', ['en:pasta-dishes'], '', ['general']],
  ['Rice & Beans', [], 'Rice, beans, vegetables.', ['general']],
  ['Greek strained yogurt', ['Milk/Milk Substitutes'], '', ['general']],
  ['Drinking Greek yogurt', ['en:yogurts'], '', ['beverage']],
  ['Greek yogurt smoothie', ['en:yogurts'], '', ['beverage']],
  ['Drink', ['Non Alcoholic Beverages - Ready to Drink'], '', ['beverage']],
  ['Mixed sausage', ['en:sausages'], '', ['general', 'red-meat']],
  ['Peanut butter', ['en:peanut-butters'], '', ['general', 'fats-nuts-seeds']],
])('category evidence for %s preserves the applicable rules', (name, claims, text, expected) => {
  expect(category(name, claims, text).categories).toEqual(expected);
});
test('category recognition never guesses from a brand or a broad milk category', () => {
  expect(category('Famous Brand', ['en:undefined']).categories).toEqual([]);
  expect(category('Milk', ['Milk/Milk Substitutes']).categories).toEqual([]);
  expect(category('Rice oil', [], 'Rice oil.').categories).toEqual([]);
  expect(category('Infant Greek yogurt', [], 'Milk.').categories).toEqual([]);
});
test('chestnuts keep the general rule and unknown nut-bar proportions retain both rules', () => {
  expect(category('Chestnuts', ['en:nuts', 'en:chestnuts']).categories).toEqual(['general']);
  expect(category('Granola bar', [], 'Roasted peanuts, sugar.', [{ value: '1 bar (40 g)' }]).categories).toEqual(['general', 'fats-nuts-seeds']);
});
test('closed ingredient declarations support FVL zero; extra or unknown ingredients retain uncertainty', () => {
  expect(category('Whole almonds', [], 'ALMONDS. PEANUT FREE.')).toMatchObject({ categories: ['fats-nuts-seeds'], plantZero: expect.any(String) });
  expect(category('Potato chips', [], 'POTATOES, VEGETABLE OIL (CANOLA, CORN, SOYBEAN AND/OR SUNFLOWER OIL), AND SALT').plantZero).not.toBeNull();
  expect(category('Greek yogurt', [], 'Milk, live active yogurt cultures (l. bulgaricus, s. thermophilus).').plantZero).not.toBeNull();
  for (const ingredients of ['Almonds, raisins.', 'Potatoes, oil, carrots.', 'Milk, live active yogurt cultures (strawberry).', 'Milk, cultures, strawberry.']) {
    expect(category('Greek yogurt', [], ingredients).plantZero).toBeNull();
  }
});

// Synthetic composition controls: these are not new manufacturer observations.
const plantInput = (foodGroups = []) => ({ identity: { name: 'Synthetic cereal' },
  categories: [{ values: ['en:breakfast-cereals'] }], serving: [], foodGroups,
  ingredients: { field: 'ingredients_text', language: 'en', textAvailable: true },
  source: { provider: 'open-food-facts', recordId: 'synthetic', url: 'https://world.openfoodfacts.org/product/synthetic',
    attribution: 'Open Food Facts contributors; database ODbL', revisionDate: '2026-10-19T00:00:00.000Z', retrievedAt: '2026-10-20T00:00:00.000Z' } });
const plantContent = (text, input = plantInput()) => {
  const display = { ingredients: { text } };
  return resolveBarcodePlantContent(input, display, resolveBarcodeCategory(input, display));
};
const plantGroup = (rawValue, identification = 'provider-reported', rawUnit = '%') => ({
  field: 'nutriments.fruits-vegetables-nuts_100g', rawValue, rawUnit, identification });
test.each(['Whole grain wheat.', 'Whole wheat', 'Wheat flour.', 'Rice.', 'Whole grain oats.', 'Rolled oats.',
  'Whole grain wheat. bht is added to the packaging material to preserve freshness.'])('complete nonqualifying declaration establishes attributed zero: %s', text => {
  const input = plantInput(), before = JSON.stringify(input), result = plantContent(text, input);
  expect(result).toMatchObject({ status: 'verified-zero', percent: 0, identification: 'closed-ingredient-declaration',
    ingredientEvidence: { text, field: 'ingredients_text', language: 'en' }, source: input.source,
    method: { url: CATEGORY_SOURCE, edition: '2025-03-17' } });
  expect(result.verificationScope).toContain('no independent verification');
  expect(JSON.stringify(input)).toBe(before);
});
test.each(['', null, 'Whole grain wheat,', 'Whole grain wheat...', 'Whole grain wheat, other ingredients.',
  'Whole grain wheat, raisins.', 'Whole grain wheat, apple puree.', 'Whole grain wheat, peas.',
  'Whole grain wheat, herbs.', 'Whole grain wheat, fruit preparation.', 'Whole grain wheat, unknown extract.',
  'Whole grain wheat, malt flavor.', 'Whole grain wheat. BHT added to preserve freshness.',
  'Whole grain wheat. bht is added to the packaging material to preserve freshness. Raisins.',
  'Whole grain wheat (', 'Wheat starch, water.', 'Organic whole wheat, yeast.'])('unreviewed, qualifying or incomplete composition stays unknown: %s', text => {
  expect(plantContent(text)).toMatchObject({ status: 'unknown', percent: null });
});
test('a category, whole-grain amount or estimated zero cannot replace complete ingredient evidence', () => {
  const input = plantInput([plantGroup(0, 'provider-estimated'), {
    field: 'nutriments.whole-grain_100g', rawValue: 100, rawUnit: '%', identification: 'provider-reported',
  }]);
  expect(plantContent('', input).percent).toBeNull();
  input.ingredients.textAvailable = false;
  expect(plantContent('Whole grain wheat.', input).percent).toBeNull();
  input.ingredients.textAvailable = true; input.source.attribution = null;
  expect(plantContent('Whole grain wheat.', input).percent).toBeNull();
});
test.each([[plantGroup(5)], [plantGroup(0), plantGroup(5)], [plantGroup(null)], [plantGroup(-1)],
  [plantGroup('unknown')], [plantGroup(0, 'provider-reported', 'g')]].map(groups => [groups]))('reported conflicting or unsupported quantities cannot be overwritten (%#)', groups => {
  const input = plantInput(groups), before = JSON.stringify(input);
  expect(plantContent('Whole grain wheat.', input)).toMatchObject({ status: 'conflicting', percent: null, providerQuantities: groups });
  expect(JSON.stringify(input)).toBe(before);
});
test('provider estimates remain intact and distinct from the ingredient-derived conclusion', () => {
  const input = plantInput([plantGroup(12, 'provider-estimated')]);
  const result = plantContent('Whole grain wheat.', input);
  expect(result).toMatchObject({ status: 'verified-zero', percent: 0, providerQuantities: input.foodGroups });
  expect(result.warnings.join(' ')).toContain('not declared qualifying percentages');
  expect(plantContent('', plantInput([plantGroup('0')]))).toMatchObject({ identification: 'provider-reported-zero', percent: 0 });
});
test.each(['beverage', 'fats-nuts-seeds', 'cheese', 'red-meat'])('single-grain route cannot override the %s category', category => {
  const input = plantInput(), display = { ingredients: { text: 'Whole grain wheat.' } };
  expect(resolveBarcodePlantContent(input, display, { categories: [category] }).percent).toBeNull();
});
test('ambiguous categories and qualifying special-category oils retain unknown percentages', () => {
  const input = plantInput(), display = { ingredients: { text: 'Whole grain wheat.' } };
  expect(resolveBarcodePlantContent(input, display, { categories: ['general', 'fats-nuts-seeds'] }).percent).toBeNull();
  input.categories[0].values = ['en:olive-oils'];
  expect(plantContent('Olive oil.', input).percent).toBeNull();
  expect(plantContent('', { ...input, foodGroups: [plantGroup(0)] }).percent).toBeNull();
  input.categories[0].values = ['en:nuts'];
  expect(plantContent('ALMONDS. PEANUT FREE.', input)).toMatchObject({ percent: 0, identification: 'closed-ingredient-declaration' });
  expect(plantContent('Almonds, soybean oil.', input).percent).toBeNull();
});
