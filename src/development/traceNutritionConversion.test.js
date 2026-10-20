const { DOMAINS, convertRawScore: convert, evaluateTraceNutrition: evaluate } = require('./traceNutritionConversion');
const { evaluateUpdatedNutrition: raw } = require('./updatedNutritionScoring');
const { PROFILES, OBSERVATIONS, SYNTHETIC } = require('./updatedNutritionFixtures');
const clone = value => JSON.parse(JSON.stringify(value));
const observation = id => OBSERVATIONS.find(profile => profile.id === id);
const control = id => SYNTHETIC.find(profile => profile.id === id);

test.each(Object.keys(DOMAINS))('%s preserves endpoints, monotonicity and whole numbers without clipping', category => {
  const [minimum, maximum, ceiling] = DOMAINS[category];
  expect(convert(minimum, category)).toBe(ceiling); expect(convert(maximum, category)).toBe(0);
  for (let point = minimum; point <= maximum; point++) {
    const score = convert(point, category);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0); expect(score).toBeLessThanOrEqual(ceiling);
  }
  for (let point = minimum + 1; point <= maximum; point++) expect(convert(point, category)).toBeLessThanOrEqual(convert(point - 1, category));
  expect(() => convert(minimum - 1, category)).toThrow(RangeError);
  expect(() => convert(maximum + 1, category)).toThrow(RangeError);
});

test('interpolates then floors once, allowing honest within-category rounding ties', () => {
  expect(convert(-4, 'general')).toBe(84);
  expect(convert(1, 'general')).toBe(75);
  expect(convert(2, 'general')).toBe(65);
  expect(convert(3, 'general')).toBe(58);
  expect(convert(19, 'general')).toBe(19);
  expect(convert(20, 'general')).toBe(19);
  expect(convert(21, 'general')).toBe(18);
  expect(convert(4, 'beverage')).toBe(52); // 52.5 is floored, not nearest-rounded.
});

test.each([null, undefined, NaN, Infinity, -Infinity, '4', 1.5])('rejects malformed raw point input %s', input => {
  expect(() => convert(input, 'general')).toThrow(RangeError);
});

test.each([
  ['general', [[-17, 0, 80, 99], [1, 2, 60, 79], [3, 10, 40, 59], [11, 18, 20, 39], [19, 55, 0, 19]]],
  ['cheese', [[-17, 0, 80, 99], [1, 2, 60, 79], [3, 10, 40, 59], [11, 18, 20, 39], [19, 55, 0, 19]]],
  ['red-meat', [[-12, 0, 80, 99], [1, 2, 60, 79], [3, 10, 40, 59], [11, 18, 20, 39], [19, 55, 0, 19]]],
  ['fats-nuts-seeds', [[-17, -6, 80, 99], [-5, 2, 60, 79], [3, 10, 40, 59], [11, 18, 20, 39], [19, 55, 0, 19]]],
  ['beverage', [[-18, 2, 60, 79], [3, 6, 40, 59], [7, 9, 20, 39], [10, 54, 0, 19]]],
])('%s maps every published raw category into its own ordered numerical range', (category, ranges) => {
  for (const [lo, hi, minimum, maximum] of ranges) {
    for (let point = lo; point <= hi; point++) {
      expect(convert(point, category)).toBeGreaterThanOrEqual(minimum);
      expect(convert(point, category)).toBeLessThanOrEqual(maximum);
    }
  }
});

test('calculation families retain component domains and the categorical water distinction', () => {
  expect(convert(0, 'general')).toBe(80); expect(convert(0, 'fats-nuts-seeds')).toBe(66);
  expect(convert(0, 'beverage')).toBe(62);
  expect(convert(null, 'water')).toBe(100);
  expect(() => convert(0, 'water')).toThrow(RangeError);
  expect(() => convert(0, 'invented')).toThrow(RangeError);
  expect(convert(-18, 'beverage')).toBe(79);
});

test.each([
  ['general', 0], ['general', 2], ['general', 10], ['general', 18],
  ['fats-nuts-seeds', -6], ['fats-nuts-seeds', 2], ['fats-nuts-seeds', 10], ['fats-nuts-seeds', 18],
  ['beverage', 2], ['beverage', 6], ['beverage', 9],
])('published %s cutoff %s retains strict category ordering', (category, cutoff) => {
  expect(convert(cutoff, category)).toBeGreaterThan(convert(cutoff + 1, category));
});

test.each(PROFILES.map(profile => [profile.id, profile]))('%s preserves all published nutrient arithmetic and input data', (id, profile) => {
  const before = JSON.stringify(profile), published = raw(profile), result = evaluate(profile);
  expect(result.points).toEqual(published.points); expect(result.normalized).toEqual(published.normalized);
  expect(result.rawScore).toBe(published.rawScore); expect(result.rawRange).toEqual(published.rawRange);
  expect(result.rawCandidates).toEqual(published.rawCandidates);
  expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false); expect(result.scanMatchEligible).toBe(false);
  expect(result).not.toHaveProperty('letter'); expect(result).not.toHaveProperty('letters');
  expect(evaluate(profile)).toEqual(result); expect(JSON.stringify(profile)).toBe(before);
  expect(Object.isFrozen(result.normalized.nutrients)).toBe(true);
});

test('missing fruit proportions preserve numerical uncertainty, without a midpoint or favorable choice', () => {
  const profile = observation('sweetened-yogurt');
  expect(raw(profile).nutritionScore100).toBe(90);
  const result = evaluate(profile);
  expect(result.nutritionScore100).toBeNull(); expect(result.scoreRange).toEqual([80, 85]);
  expect(result.status).toBe('incomplete'); expect(result.eligible).toBe(false);
  expect(result.reasons.map(reason => reason.code)).toContain('score-not-determined');
});

test('unknown categories remain paired with their own raw possibilities', () => {
  const result = evaluate(observation('peanut-butter'));
  const expected = [...new Set(result.rawCandidates.flatMap(({ category, rawScores }) => rawScores.map(point => convert(point, category))))].sort((a, b) => a - b);
  expect(result.possibleScores).toEqual(expected); expect(result.nutritionScore100).toBeNull();
  const meat = evaluate(observation('processed-meat'));
  expect(meat.categoryCandidates).toEqual(['general', 'red-meat']); expect(meat.nutritionScore100).toBe(18);
});

test('identical nutrient vectors in the same category remain tied despite grain or brand labels', () => {
  const whole = control('whole-grain-evidence'), refined = control('refined-grain-evidence');
  expect(whole.nutrients).toEqual(refined.nutrients);
  expect(evaluate(whole).nutritionScore100).toBe(83); expect(evaluate(refined).nutritionScore100).toBe(83);
  const renamed = clone(whole); renamed.product.name = 'A different brand';
  expect(evaluate(renamed).nutritionScore100).toBe(83);
});

test('missing nutrients, source conflicts and unknown markets retain their existing safeguards', () => {
  expect(evaluate(control('missing-total-sugar')).nutritionScore100).toBeNull();
  expect(evaluate(control('conflicting-panels')).status).toBe('invalid');
  expect(evaluate(observation('white-bread')).scoreRange).toBeNull();
  expect(evaluate(control('unknown-market')).warnings.join(' ')).toMatch(/Market unknown/);
  expect(evaluate(control('overseas-formulation')).warnings.join(' ')).toMatch(/non-US/);
  expect(evaluate(observation('regular-soda')).normalized.nutrients.fiber).toBeNull();
});

test('increasing salt burden cannot improve the score; increasing credited fiber cannot worsen it', () => {
  const profile = clone(control('refined-bread-lower-fiber'));
  delete profile.nutrients.sodium;
  const burdens = [0, 0.2, 0.4, 1, 2, 3, 4.1].map(salt => {
    profile.nutrients.salt = { value: salt, unit: 'g' }; return evaluate(profile).nutritionScore100;
  });
  for (let i = 1; i < burdens.length; i++) expect(burdens[i]).toBeLessThanOrEqual(burdens[i - 1]);
  profile.nutrients.salt.value = 1;
  const benefits = [0, 3, 4.1, 5.2, 6.3, 7.5].map(fiber => {
    profile.nutrients.fiber.value = fiber; return evaluate(profile).nutritionScore100;
  });
  for (let i = 1; i < benefits.length; i++) expect(benefits[i]).toBeGreaterThanOrEqual(benefits[i - 1]);
});

test('all available US comparisons use the expected raw-point conversion', () => {
  const expected = { 'plain-yogurt': 84, 'plain-almonds': 87, 'olive-oil': 66,
    'whole-grain-cereal': 85, 'sugary-cereal-frosted-flakes': 19, 'regular-soda': 18,
    'diet-soda': 52, 'fresh-apple': 82, 'fresh-broccoli': 87, 'processed-meat': 18 };
  for (const [id, score] of Object.entries(expected)) expect(evaluate(observation(id)).nutritionScore100).toBe(score);
});

test('additive absence, unknown lists and reviewed composite inputs never create nutrition adjustments', () => {
  const source = control('missing-additives');
  for (const id of ['provider-empty-additives', 'reported-additives', 'reviewed-composite']) {
    expect(evaluate(control(id)).nutritionScore100).toBe(evaluate(source).nutritionScore100);
  }
  expect(evaluate(source)).not.toHaveProperty('additiveRisk');
});
