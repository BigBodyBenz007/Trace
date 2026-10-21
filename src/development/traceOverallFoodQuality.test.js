import { assessAdditiveProfile, assessOverallFoodQuality, OVERALL_POLICY } from './traceOverallFoodQuality';
import { ADDITIVE_SCREENING_POLICY, CONCERN_WEIGHTS, screenIngredientDeclaration } from './additiveScreeningPolicy';
import { normalizeOpenFoodFactsAdditives } from '../services/productAdditives';

// All declarations below are synthetic controls unless explicitly read from the archive.
const candidate = (text = 'ALMONDS. PEANUT FREE.', tags = []) => ({ display: {
  ingredients: { text, language: 'en' }, additives: normalizeOpenFoodFactsAdditives(tags),
  sourceUrl: 'https://example.org/synthetic-label', attribution: 'Synthetic ingredient declaration' } });
const nutrition = nutritionScore100 => ({ nutritionScore100, grade: null, scoreReady: false });
const assess = (text, tags = [], n = 80) => assessOverallFoodQuality(candidate(text, tags), nutrition(n));

test.each([0, 46, 95, 100])('reviewed composition preserves %s with no bonus or inferred exposure', n => {
  const input = candidate(), before = JSON.stringify(input), result = assessOverallFoodQuality(input, nutrition(n));
  expect(result).toMatchObject({ nutritionScore100: n, overallScore100: n, additiveDeduction: 0,
    status: 'reviewed', grade: null, scoreReady: false, scanMatchEligible: false });
  expect(result.additiveAssessment).toMatchObject({ status: 'reviewed', concernBurden: 0,
    exposure: 'unknown', originalIngredientText: input.display.ingredients.text });
  expect(result.rawOverall).toBe(n);
  expect(result.additiveAssessment.limitation).toContain('not independently verified');
  expect(JSON.stringify(input)).toBe(before); expect(Object.isFrozen(result)).toBe(true);
});

test.each(['Potatoes, vegetable oil (canola, corn, soybean and/or sunflower oil), and salt.',
  'Whole wheat flour, water, sugar, canola oil, wheat gluten, sea salt, yeast.',
  'Milk, live active yogurt cultures.'])('mixed ordinary declarations can be reviewed: %s', text => {
  expect(assess(text)).toMatchObject({ status: 'reviewed', overallScore100: 80 });
});

test('the approved weights and budget are explicit; they are not Yuka risk labels', () => {
  expect(CONCERN_WEIGHTS).toEqual({ reviewed: 0, limited: .2, moderate: .5, substantial: 1 });
  expect(OVERALL_POLICY).toMatchObject({ nutritionWeight: .8, maximumRelativeAdditiveDeduction: .2 });
  for (const record of ADDITIVE_SCREENING_POLICY) {
    expect(record.weight).toBe(record.classification === null ? null : CONCERN_WEIGHTS[record.classification]);
    expect(record).toMatchObject({ reviewedOn: '2026-10-20', evidence: expect.any(String),
      conditions: expect.any(String), conflicts: expect.any(String), rationale: expect.any(String) });
    expect(record.sources.length).toBeGreaterThan(0);
    for (const source of record.sources) expect(source).toMatchObject({ url: expect.stringMatching(/^https:/),
      jurisdiction: expect.stringMatching(/^(US|EU|FR)$/), edition: expect.any(String), reviewedOn: '2026-10-20' });
  }
});

test.each([['Carbonated water, phosphoric acid.', 'E338'], ['Water, erythritol.', 'E968'],
  ['Pork, sodium nitrite.', 'E250'], ['Pork, sodium phosphate.', 'E339'],
  ['Water, xanthan gum.', 'E415'], ['Water, monoglycerides.', 'E471'], ['Water, datem.', 'E472e']])(
  'supported nonzero screening applies without inventing concentration: %s', (text, id) => {
    const result = assess(text);
    expect(result).toMatchObject({ overallScore100: 77, rawOverall: 76.8, additiveDeduction: 3 });
    expect(result.deductions[0]).toMatchObject({ identifier: id, weight: .2 });
    expect(result.deductions[0].sources.length).toBeGreaterThan(0);
    expect(result.additiveAssessment.items.find(i => i.identifier === id).exposure).toBe('unknown');
  });

test('multiple distinct additives accumulate and cap at the unchanged 20% budget', () => {
  const result = assess('Pork, sodium nitrite, erythritol, phosphoric acid, sodium phosphate, calcium phosphate.');
  expect(result).toMatchObject({ status: 'reviewed', overallScore100: 64, rawOverall: 64,
    additiveDeduction: 16, additiveAssessment: { concernBurden: 1 } });
  expect(result.deductions).toHaveLength(5);
});

test('aliases and repeated ingredient/tag occurrences count once, including parent/subtype tags', () => {
  const result = assess('Pork, sodium nitrite, sodium nitrite, soy lecithin, baking soda.',
    ['en:e250', 'en:e322', 'en:e322i', 'en:e500', 'en:e500ii']);
  expect(result.additiveAssessment.items.map(i => i.identifier)).toEqual(['E250', 'E322', 'E500ii']);
  expect(result.additiveAssessment.concernBurden).toBe(.2);
  expect(result.deductions).toHaveLength(1);
  expect(result.additiveAssessment.items[1].providerIdentifiers).toEqual(['en:e322', 'en:e322i']);
});

test('unresolved parent carbonate tags do not acquire a subtype', () => {
  const result = assess('Water, salt.', ['en:e500']);
  expect(result.status).toBe('provisional');
  expect(result.additiveAssessment.items[0]).toMatchObject({ identifier: 'E500', name: null, concernBurden: null });
});

test('vitamin C/benzoate concern stays conditional and is applied only once to the benzoate', () => {
  const yes = assess('Carbonated water, sodium benzoate, ascorbic acid.');
  expect(yes.deductions.map(i => i.identifier)).toEqual(['E211']);
  expect(yes.additiveAssessment.items.find(i => i.identifier === 'E211').conditionResult).toBe('beverage-and-cofactor-established');
  for (const text of ['Carbonated water, sodium benzoate, citric acid.', 'Water, sodium benzoate, orange juice.']) {
    const no = assess(text);
    expect(no.status).toBe('provisional'); expect(no.deductions).toHaveLength(0);
    expect(no.additiveAssessment.items.find(i => i.identifier === 'E211').concernBurden).toBeNull();
  }
});

test('nitrite meat condition is not assumed, nor is nitrite inferred from celery', () => {
  expect(assess('Water, sodium nitrite.').deductions).toHaveLength(0);
  expect(assess('Water, sodium nitrite, no meat.').deductions).toHaveLength(0);
  expect(assess('Pork, cultured celery juice, cherry powder.').additiveAssessment.items).toHaveLength(0);
});

test('packaging BHT is retained without declaring it a food ingredient or deducting', () => {
  const r = assess('Whole grain wheat. bht is added to the packaging material to preserve freshness.');
  expect(r).toMatchObject({ status: 'provisional', overallScore100: 80, deductions: [] });
  expect(r.additiveAssessment.items[0]).toMatchObject({ identifier: 'BHT', packagingOnly: true, concernBurden: null });
});

test('unknown ingredients preserve known deductions, provisional range and original source text', () => {
  const text = 'Water, erythritol, unfamiliar ingredient.';
  const r = assess(text);
  expect(r).toMatchObject({ status: 'provisional', provisional: true, overallScore100: 77,
    possibleRange: { min: 64, max: 77 }, additiveAssessment: { originalIngredientText: text } });
  expect(r.reason).toContain('could decrease');
  expect(r.additiveAssessment.reasons.join(' ')).toContain('unfamiliar ingredient');
});

test.each([null, '', 'unreviewed molecule'])('missing or entirely unassessed declarations are nutrition-only: %s', text => {
  const r = assess(text);
  expect(r).toMatchObject({ overallScore100: null, nutritionScore100: 80, status: 'nutrition-only' });
  expect(r.additiveAssessment.concernBurden).toBeNull();
});

test.each([undefined, { status: 'unknown', source: 'open-food-facts' }])('unknown tags stay distinct while an actual ordinary declaration can be screened: %s', additives => {
  const c = candidate('Potatoes, canola oil, salt.'); c.display.additives = additives;
  expect(assessOverallFoodQuality(c, nutrition(80)).status).toBe('reviewed');
  c.display.ingredients.text = null;
  expect(assessOverallFoodQuality(c, nutrition(80)).overallScore100).toBeNull();
});

test('provider empty, unknown and legacy uncollected states remain distinct from the ingredient screen', () => {
  expect(assessAdditiveProfile(candidate()).providerState).toBe('provider-reported-empty');
  const c = candidate(); c.display.additives = undefined;
  expect(assessAdditiveProfile(c).providerState).toBe('not-collected');
  c.display.additives = { status: 'unknown', source: 'open-food-facts' };
  expect(assessAdditiveProfile(c).providerState).toBe('unknown');
});

test.each(['sourceUrl', 'attribution'])('missing %s cannot support source review', field => {
  const c = candidate(); delete c.display[field];
  expect(assessOverallFoodQuality(c, nutrition(95)).overallScore100).toBeNull();
});

test('English text with conflicting language metadata stays partial; absent metadata is not a veto', () => {
  const c = candidate('Almonds.'); c.display.ingredients.language = 'es';
  expect(assessOverallFoodQuality(c, nutrition(95)).status).toBe('provisional');
  c.display.ingredients.language = null;
  expect(assessOverallFoodQuality(c, nutrition(95)).status).toBe('reviewed');
});

test('negations and contradictory provider tags never become positive presence or zero-concern assurance', () => {
  expect(assess('Pork, no sodium nitrite.').deductions).toHaveLength(0);
  const r = assess('Pork, no sodium nitrite.', ['en:e250']);
  expect(r.status).toBe('provisional'); expect(r.deductions).toHaveLength(0);
  expect(r.additiveAssessment.items[0]).toMatchObject({ conflict: true, concernBurden: null });
  expect(assess('Almonds.', ['en:e338']).additiveAssessment.items[0].concernBurden).toBeNull();
});

test('nested subingredients are screened, while ambiguous identifiers and alternative use remain unresolved', () => {
  expect(assess('Flour, oil (canola oil, erythritol).').deductions[0].identifier).toBe('E968');
  expect(assess('Flour, baking soda and/or calcium phosphate.', ['en:e341']).deductions).toHaveLength(0);
  const rice = screenIngredientDeclaration('Rice, iron (tric phosphate).');
  expect(rice.items).toHaveLength(0); expect(rice.unresolved.join(' ')).toContain('tric phosphate');
  expect(assess('Rice, oil (canola oil,').status).toBe('provisional');
});

test('historical legal sources retain qualifications without becoming scientific penalties', () => {
  const r = assess('Water.', ['en:e171']);
  const event = r.additiveAssessment.items[0].historicalEvents[0];
  expect(event).toMatchObject({ jurisdiction: 'EU', dates: { publishedOn: '2022-01-18', effectiveOn: '2022-02-07' } });
  expect(event.sources[0]).toMatchObject({ editionId: 'original-2022-01-18', verification: { currency: 'historical' } });
  expect(event.qualifications.join(' ')).toMatch(/prior|prior-rules/i);
  expect(r.deductions).toHaveLength(0);
});

test('unknown identity, organic and provider risk claims cannot inject classifications', () => {
  const c = candidate('Almonds.', ['en:e9999']);
  c.display.risk = 'high'; c.display.organic = { certified: true }; c.display.additives = { ...c.display.additives, concernBurden: 1 };
  const r = assessOverallFoodQuality(c, nutrition(95));
  expect(r).toMatchObject({ status: 'provisional', overallScore100: 95 });
  expect(r.additiveAssessment.items[0]).toMatchObject({ concernBurden: null, name: null });
  expect(assessOverallFoodQuality({ ...c, customFood: {} }, nutrition(95)).overallScore100).toBeNull();
});

test.each([null, -1, 101, 1.5, NaN, '95'])('invalid nutrition %s never becomes overall', n => {
  const result = assessOverallFoodQuality(candidate(), nutrition(n));
  expect(result.overallScore100).toBeNull(); expect(result.nutritionScore100).toBeNull();
});

test('real replay preserves every v2 score and separately counts assessed, partial, and unavailable cases', () => {
  const report = require('../../docs/trace-overall-food-quality-2026-10-20.json');
  const v2 = require('../../docs/trace-nutrition-v2-comparison-2026-10-20.json');
  expect(report).toMatchObject({ originalNutritionScores: 19, nutritionScores: 20, overallScores: 18,
    reviewedOverall: 4, provisionalOverall: 14, nutritionOnly: 2, nutritionUnavailable: 1,
    supportedDeductionProfiles: 6, roundedScoreDecreases: 5 });
  expect(report.products.map(p => p.nutritionScore100)).toEqual(v2.products.map(p => p.after.nutritionScore100));
  expect(report.products.filter(p => p.additiveDeduction > 0).map(p => [p.name, p.nutritionScore100, p.overallScore100]))
    .toEqual([['Quest Chocolate Chip Cookie Dough Protein Bar', 54, 52], ['Pepperidge Farm Farmhouse Hearty White Bread', 55, 51],
      ['Smart Ones Santa Fe Rice & Beans', 75, 72], ['Oscar Mayer Classic Wieners', 25, 24], ['SPAM Classic', 23, 22]]);
  expect(report.stouffersComparison).toMatchObject({ matchingProductEvidence: false, classicNutritionV2: 70,
    meatLovers: { nutritionV2: 66, publishedNutrition: 75, traceOverall: null, vegetableVerification: 'Yuka-reported assumption only' } });
});
