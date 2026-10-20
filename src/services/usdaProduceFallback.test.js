import { assessProduceFallback } from './usdaProduceFallback';
import { USDA_PRODUCE_REFERENCES } from '../development/usdaProduceFixtures';
import { evaluateTraceNutrition } from '../development/traceNutritionConversion';
import { OBSERVATIONS } from '../development/updatedNutritionFixtures';

const clone = value => JSON.parse(JSON.stringify(value));
const get = id => USDA_PRODUCE_REFERENCES.find(item => item.source.recordId === String(id));
const confirmation = reference => ({ referenceId: reference.id, plainFreshSingleIngredient: true,
  acceptGenericEstimate: true, confirmedOn: '2026-10-20' });
const run = (reference = get(171688), extra = {}) => assessProduceFallback({ reference,
  productEvidence: { status: 'unknown' }, confirmation: confirmation(reference), ...extra });
const reviewed = { status: 'verified', food: 'apple', cultivar: 'gala', category: 'fruit', preparation: 'raw',
  fresh: true, plain: true, singleIngredient: true, source: { url: 'https://example.test/reviewed-package-evidence' }, reviewedOn: '2026-10-20' };

test.each([[171688, 'apple', true], [1750341, 'apple', false], [173944, 'banana', true],
  [170379, 'broccoli', true], [170393, 'carrot', false]])('reference %i retains identity, preparation and completeness', (id, food, eligible) => {
  const reference = get(id), result = run(reference);
  expect(reference.produceIdentity.food).toBe(food);
  expect(reference.produceIdentity.preparation).toBe('raw');
  expect(reference.basis).toMatchObject({ kind: '100g', amount: 100, unit: 'g' });
  expect(result.eligible).toBe(eligible);
  expect(result.confirmed).toBe(true);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(result.association).toMatchObject({ fdcId: String(id), productIdentity: 'unverified', exactPackageComposition: 'unknown' });
  expect(reference.ingredients).toBeNull(); expect(reference.additives).toBeNull();
});

test('apple remains raw -2 / 82 with the published fruit contribution, without a bonus', () => {
  const result = evaluateTraceNutrition(get(171688));
  expect(result.rawScore).toBe(-2); expect(result.nutritionScore100).toBe(82);
  expect(result.points.sugar.possible).toEqual([3]); expect(result.points.plant.possible).toEqual([5]);
  expect(result.points.fiber.possible).toEqual([0]); expect(result.points.proteinApplied.possible).toEqual([0]);
  expect(result.nutritionScore100).toBe(evaluateTraceNutrition(OBSERVATIONS.find(p => p.id === 'fresh-apple')).nutritionScore100);
  expect(evaluateTraceNutrition(get(170379)).nutritionScore100).toBe(87);
});

test('banana uses a whole independently captured USDA record and preserves unreported added sugar', () => {
  const ref = get(173944);
  expect(ref.nutrients).toMatchObject({ totalSugar: { value: 12.23, unit: 'g' }, saturatedFat: { value: .112, unit: 'g' }, carbohydrates: { value: 22.84 } });
  expect(ref.source).toMatchObject({ verification: 'direct-official-record', publishedOn: '2019-04-01' });
  expect(ref.source.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(ref.nutrients.addedSugar).toBeUndefined();
});

test('Gala catalog is distinct and its missing nutrients are not filled with generic apple values', () => {
  expect(get(1750341).produceIdentity.cultivar).toBe('gala');
  expect(get(171688).produceIdentity.cultivar).toBeNull();
  expect(get(1750341).nutrients.totalSugar.value).toBeNull();
  expect(get(1750341).nutrients.saturatedFat.value).toBeNull();
  expect(run(get(171688), { productEvidence: reviewed }).eligible).toBe(true);
  expect(run(get(171688), { productEvidence: reviewed }).association.genericCultivarEstimate).toBeNull();
  expect(run(get(1750341), { productEvidence: { ...reviewed, cultivar: null } }).status).toBe('blocked');
});

test('unknown barcode, food name and brand alone never establish identity or automatic selection', () => {
  const result = run(get(171688), { productEvidence: { status: 'unknown', name: 'Gala apples', brand: 'Apple Farm', barcode: '00012345600012' }, confirmation: undefined });
  expect(result).toMatchObject({ eligible: false, confirmed: false, association: null, scanMatchEligible: false });
  expect(result.reasons.map(r => r.code)).toContain('confirmation-required');
});

test.each(['plainFreshSingleIngredient', 'acceptGenericEstimate', 'referenceId', 'confirmedOn'])('confirmation requires %s', key => {
  const c = confirmation(get(171688)); delete c[key];
  expect(run(get(171688), { confirmation: c }).confirmed).toBe(false);
});
test('confirmation must bind the selected reference and a valid date', () => {
  expect(run(get(173944), { confirmation: confirmation(get(171688)) }).confirmed).toBe(false);
  expect(run(get(171688), { confirmation: { ...confirmation(get(171688)), confirmedOn: '2026-02-30' } }).confirmed).toBe(false);
});

test.each([
  { status: 'excluded' }, { preparation: 'dried' }, { preparation: 'juice' }, { preparation: 'canned' },
  { preparation: 'cooked' }, { category: 'snack' }, { singleIngredient: false }, { plain: false }, { fresh: false },
])('confirmation cannot override known ineligible evidence %j', evidence => {
  expect(run(get(171688), { productEvidence: { status: 'unknown', ...evidence } }).status).toBe('blocked');
});
test.each(['source', 'reviewedOn', 'food', 'plain', 'preparation'])('verified identity requires %s', key => {
  const evidence = clone(reviewed); delete evidence[key];
  expect(run(get(171688), { productEvidence: evidence }).eligible).toBe(false);
});
test('reviewed type identity remains distinct from an exact package composition or scan match', () => {
  const result = run(get(171688), { productEvidence: reviewed });
  expect(result.eligible).toBe(true); expect(result.association.productIdentity).toBe('reviewed-produce-type');
  expect(result.scanMatchEligible).toBe(false);
});
test.each(['source', 'basis', 'produceIdentity'])('missing reference %s fails closed', key => {
  const ref = clone(get(171688)); delete ref[key]; expect(run(ref).eligible).toBe(false);
});
test.each(['totalSugar', 'saturatedFat', 'protein', 'sodium', 'fiber', 'calories'])('missing %s is unknown, never zero', key => {
  const ref = clone(get(171688)); ref.nutrients[key].value = null;
  expect(run(ref).eligible).toBe(false); expect(ref.nutrients[key].value).toBeNull();
});
test.each([
  ref => { ref.basis.unit = 'ml'; }, ref => { ref.basis.amount = 1; },
  ref => { ref.nutrients.totalSugar.unit = 'oz'; }, ref => { ref.nutrients.sodium.value = -1; },
  ref => { ref.nutrients.totalSugar.sourceEdition = 'other'; },
  ref => { ref.nutrients.saturatedFat.value = 10; }, ref => { ref.source.url = 'https://unofficial.test/171688'; },
])('invalid basis, units, values or provenance cannot score (%#)', change => {
  const ref = clone(get(171688)); change(ref); expect(run(ref).eligible).toBe(false);
});
test('selection is deterministic and cannot mutate source data', () => {
  const before = JSON.stringify(USDA_PRODUCE_REFERENCES);
  expect(run()).toEqual(run()); expect(Object.isFrozen(run().association)).toBe(true);
  expect(JSON.stringify(USDA_PRODUCE_REFERENCES)).toBe(before);
});
test.each([{ cacheStale: true }, { superseded: true }, { unresolvedConflicts: ['different panels'] },
  { unresolvedConflicts: 'malformed' }])('unresolved source state %j fails closed', state => {
  const ref = clone(get(171688)); ref.sourceState = state;
  expect(run(ref).eligible).toBe(false);
  expect(run(ref).reasons.map(reason => reason.code)).toContain('unresolved-reference');
});
