const references = require('./__fixtures__/publishedNutritionReferences.json');
const { OBSERVATIONS, PRIOR_OBSERVATIONS, SYNTHETIC, PROFILES } = require('./publishedNutritionFixtures');
const { evaluatePublishedNutrition: evaluate } = require('./publishedNutritionScoring');

const observation = id => OBSERVATIONS.find(record => record.id === id);
const clone = value => JSON.parse(JSON.stringify(value));

describe('self-contained published-method research observations', () => {
  test('retains the 18 distinct observations and separates synthetic controls', () => {
    expect(OBSERVATIONS).toHaveLength(18);
    expect(new Set(OBSERVATIONS.map(record => record.id)).size).toBe(18);
    expect(OBSERVATIONS.every(record => record.synthetic === false)).toBe(true);
    expect(SYNTHETIC.every(record => record.synthetic === true)).toBe(true);
    expect(PROFILES).toHaveLength(OBSERVATIONS.length + SYNTHETIC.length);
    expect(PROFILES.filter(record => !record.synthetic)).toEqual(OBSERVATIONS);
  });
  test('twelve nutrition profiles converge while six remain unresolved', () => {
    const calculable = OBSERVATIONS.filter(record => evaluate(record).nutritionScore100 !== null).map(record => record.id).sort();
    expect(calculable).toEqual([
      'sugary-cereal-frosted-flakes', 'plain-almonds', 'processed-meat', 'whole-wheat-bread',
      'whole-grain-cereal', 'olive-oil', 'diet-soda', 'unsweetened-tea', 'plain-yogurt',
      'sweetened-yogurt', 'fresh-apple', 'fresh-broccoli',
    ].sort());
    expect(OBSERVATIONS.filter(record => evaluate(record).nutritionScore100 === null).map(record => record.id).sort()).toEqual([
      'refined-cereal-rice-krispies', 'peanut-butter', 'frozen-meal', 'protein-bar', 'white-bread', 'regular-soda',
    ].sort());
  });
  test('evaluation preserves every bundled source profile and cached prior result', () => {
    const before = JSON.stringify(references);
    const cached = clone(OBSERVATIONS);
    for (const record of cached) {
      const saved = JSON.stringify(record);
      const result = evaluate(record);
      expect(JSON.stringify(record)).toBe(saved);
      expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false); expect(result.scanMatchEligible).toBe(false);
      expect(Object.isFrozen(record)).toBe(false);
    }
    expect(JSON.stringify(references)).toBe(before);
    expect(cached).toEqual(OBSERVATIONS);
  });
  test('real rows retain source evidence without inventing additive reviews or organic certification', () => {
    for (const record of OBSERVATIONS) {
      expect(record.source.url).toMatch(/^https:\/\//);
      expect(record.source.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.baseline).toHaveProperty('score');
      expect(record.previousDensity).toHaveProperty('score');
      expect(record.additives).toBeNull();
      expect(record.organicAssessment).toBeNull();
    }
    for (const record of OBSERVATIONS.filter(record => record.plantContent)) {
      expect(record.plantContent.basis.length).toBeGreaterThan(0);
      expect(record.plantContent.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.plantContent.source.reviewedOn).toBe('2026-10-19');
    }
  });
  test('unknown whole-wheat plant content converges without being set to zero', () => {
    const bread = observation('whole-wheat-bread'), result = evaluate(bread);
    expect(bread.plantContent).toBeNull();
    expect(result.normalized.plantPercent).toBeNull();
    expect(result.points.plant.possible).toEqual([0, 1, 2, 5]);
    expect(result.possibleScores).toEqual([100]);
    expect(result.rawScore).toBeNull();
  });
  test('regular Pepsi remains unresolved instead of inventing fiber from carbohydrate minus sugars', () => {
    const pepsi = observation('regular-soda'), result = evaluate(pepsi);
    expect(pepsi.nutrients.fiber.value).toBeNull();
    expect(result.normalized.nutrients.fiber).toBeNull();
    expect(result.nutritionScore100).toBeNull();
    expect(result.possibleScores.length).toBeGreaterThan(1);
    expect(result.points.fiber.possible).toEqual([0, 1, 2, 3, 4, 5]);
  });
  test.each([['diet-soda', 68], ['unsweetened-tea', 68], ['olive-oil', 50]])('%s retains unknown nutrients while bounds determine %s nutrition points', (id, expected) => {
    const record = observation(id), result = evaluate(record);
    expect(record.nutrients.fiber.value).toBeNull();
    expect(result.normalized.nutrients.fiber).toBeNull();
    expect(result.points.fiber.possible).toEqual([0]);
    expect(result.nutritionScore100).toBe(expected);
  });
  test('olive oil receives the original added-fat ratio treatment on its declared mL basis', () => {
    const result = evaluate(observation('olive-oil'));
    expect(result.methodCategory).toBe('added-fat');
    expect(result.normalized.basis).toEqual({ amount: 100, unit: 'ml' });
    expect(result.points.saturatedFat.possible).toEqual([1]);
    expect(result.rawScore).toBe(6);
    expect(result.letter).toBe('C');
    expect(result.normalized.nutrients.totalSugar).toBeNull();
  });
  test('package/panel conflicts and unknown serving mass continue blocking the appropriate records', () => {
    expect(evaluate(observation('refined-cereal-rice-krispies')).reasons.map(reason => reason.code)).toContain('conflicting-panels');
    expect(evaluate(observation('protein-bar')).reasons.map(reason => reason.code)).toContain('conflicting-panels');
    expect(evaluate(observation('white-bread')).reasons.map(reason => reason.code)).toContain('unsupported-basis');
  });
});

describe('whole USDA reference replacements preserve the FDA source history', () => {
  test.each([
    ['fresh-apple', '171688', 'fda-raw-apple', 130, 242, { calories: 52, saturatedFat: 0.028, totalSugar: 10.39, sodium: 1, fiber: 2.4, protein: 0.26, fat: 0.17, carbohydrates: 13.81 }],
    ['fresh-broccoli', '170379', 'fda-raw-broccoli', 45, 148, { calories: 34, saturatedFat: 0.114, totalSugar: 1.7, sodium: 33, fiber: 2.6, protein: 2.82, fat: 0.37, carbohydrates: 6.64 }],
  ])('%s uses one complete historical USDA table rather than filling the old FDA gaps', (id, fdcId, priorId, priorCalories, priorMass, expectedNutrients) => {
    const active = observation(id), previous = PRIOR_OBSERVATIONS.find(record => record.id === id);
    expect(active.source.recordId).toBe(fdcId);
    expect(active.source.publishedOn).toBe('2019-04-01');
    expect(active.source.edition).toContain('SR Legacy');
    expect(active.methodEvidence.sourceReplacement).toBe(true);
    expect(active.methodEvidence.priorSource.id).toBe(priorId);
    expect(previous.source.id).toBe(priorId);
    expect(previous.nutrients.calories.value).toBe(priorCalories);
    expect(previous.basis.amount).toBe(priorMass);
    expect(previous.nutrients.saturatedFat.value).toBeNull();
    expect(active.basis).toEqual(expect.objectContaining({ amount: 100, unit: 'g', sourceId: active.source.id, sourceEdition: active.source.edition }));
    for (const [key, value] of Object.entries(expectedNutrients)) {
      expect(active.nutrients[key].value).toBe(value);
      expect(active.nutrients[key].sourceId).toBe(active.source.id);
      expect(active.nutrients[key].sourceEdition).toBe(active.source.edition);
      expect(active.nutrients[key].provenance.nutrientId).toEqual(expect.any(Number));
    }
    expect(active.nutrients.addedSugar.value).toBeNull();
    expect(active.nutrients.addedSugar.provenance.status).toBe('not-reported');
    expect(active.product.gtin).toBeNull();
    expect(active.plantContent.percent).toBe(100);
    expect(evaluate(active).nutritionScore100).toBe(100);
    expect(evaluate(active).scanMatchEligible).toBe(false);
  });
  test('no source replacement overwrites the bundled FDA observations', () => {
    expect(PRIOR_OBSERVATIONS.map(record => record.source.id).sort()).toEqual(['fda-raw-apple', 'fda-raw-broccoli']);
    expect(PRIOR_OBSERVATIONS.every(record => record.nutrients.addedSugar.value === null)).toBe(true);
  });
});

describe('synthetic controls are explicit and reproducible', () => {
  test('identical grain nutrient vectors tie regardless of the grain evidence label', () => {
    const ids = ['whole-grain-evidence', 'refined-grain-evidence', 'grain-evidence-unknown'];
    const results = ids.map(id => evaluate(SYNTHETIC.find(record => record.id === id)));
    expect(new Set(results.map(result => result.nutritionScore100)).size).toBe(1);
    expect(results.every(result => result.nutritionScore100 !== null)).toBe(true);
  });
  test('missing added sugars preserves total-sugar results in otherwise identical synthetic controls', () => {
    const missing = evaluate(SYNTHETIC.find(record => record.id === 'missing-added-sugar'));
    const complete = evaluate(SYNTHETIC.find(record => record.id === 'grain-evidence-unknown'));
    expect(missing.nutritionScore100).toBe(complete.nutritionScore100);
    expect(missing.normalized.nutrients.addedSugar).toBeNull();
  });
  test('missing additives and provider-reported empty lists do not change nutrition-only arithmetic', () => {
    const missing = evaluate(SYNTHETIC.find(record => record.id === 'missing-additives'));
    const providerEmpty = evaluate(SYNTHETIC.find(record => record.id === 'provider-empty-additives'));
    expect(missing.nutritionScore100).toBe(providerEmpty.nutritionScore100);
    expect(missing.rawScore).toBe(providerEmpty.rawScore);
  });
});
