import { explainNutritionPoints, getBarcodeAdditiveInformation } from './barcodeReviewInformation';

const point = (min, max = min) => ({ min, max });
const result = points => ({ nutritionScore100: 64, methodCategory: 'general', points });
test('explains only actual adverse and applied favorable contributions', () => {
  const text = explainNutritionPoints(result({ sugar: point(3), saturatedFat: point(2), salt: point(1), fiber: point(2), protein: point(7), proteinApplied: point(0) }));
  expect(text).toBe('This score is lowered by total sugars, saturated fat, and sodium (calculated as salt). It is raised by fiber.');
  expect(text).not.toMatch(/protein|added sugar|energy/);
});
test('unknown point ranges never claim a guaranteed contribution', () => {
  expect(explainNutritionPoints(result({ plant: point(0, 5), fiber: point(0, 5) }))).toMatch(/do not establish/);
  expect(explainNutritionPoints(result({ proteinApplied: point(2, 5) }))).toBe('It is raised by protein.');
});
test('missing score, zero points, fats and beverage rules have accurate wording', () => {
  expect(explainNutritionPoints({ nutritionScore100: null })).toBeNull();
  expect(explainNutritionPoints(result({ fiber: point(0) }))).toMatch(/No measured component/);
  expect(explainNutritionPoints({ ...result({ energy: point(2), saturatedFat: point(1), plant: point(5) }), methodCategory: 'fats-nuts-seeds' }))
    .toBe('This score is lowered by energy from saturated fat and the share of saturated fat. It is raised by qualifying plant ingredients.');
  expect(explainNutritionPoints(result({ nonNutritiveSweeteners: point(4) }))).toMatch(/beverage rule.*not a safety judgment/);
  expect(explainNutritionPoints({ ...result({}), methodCategory: 'water' })).toMatch(/separate reference score/);
});
test.each([
  ['E150d', 'Coloring'], ['E202', 'Preservative'], ['E211', 'Preservative'], ['E300', 'Antioxidant'],
  ['E322', 'Emulsifier'], ['E330', 'Acidity regulator'], ['E415', 'Thickener'], ['E500ii', 'Leavening'],
])('%s has a verified general function with dated official US attribution', (id, role) => {
  const info = getBarcodeAdditiveInformation(id);
  expect(info.function).toContain(role);
  expect(info.functionSource).toMatchObject({ jurisdiction: 'US', publisher: 'FDA', reviewedOn: '2026-10-20', verification: 'directly-reviewed' });
  expect(new URL(info.functionSource.url).hostname).toMatch(/(^|\.)fda.gov$/);
  expect(Object.isFrozen(info)).toBe(true);
});
test.each(['E9999', 'E127', 'en:e330', null, 'constructor', '__proto__'])('unknown identity %s receives no invented information', id => {
  expect(getBarcodeAdditiveInformation(id)).toBeNull();
});
test('scientific concerns retain context and do not diagnose a product', () => {
  const benzoate = getBarcodeAdditiveInformation('E211').concern;
  expect(benzoate.text).toMatch(/some beverages.*vitamin C.*heat and light/);
  expect(benzoate.text).toMatch(/historical survey.*do not establish benzene/);
  expect(getBarcodeAdditiveInformation('E150d').concern.text).toMatch(/lung tumors in mice.*effects in rats.*far above.*unknown/);
  expect(getBarcodeAdditiveInformation('E202').concern).toBeUndefined();
});
test('regulatory summaries bind exact editions and preserve conditions, not blanket approval', () => {
  for (const id of ['E211', 'E330', 'E415']) {
    const regulation = getBarcodeAdditiveInformation(id).regulation;
    expect(regulation.source.url).toMatch(/^https:\/\/www.ecfr.gov\/current\/title-21\/section-/);
    expect(regulation.source.edition).toContain('current through 2026-10-16');
    expect(regulation.source.provision).toBeTruthy();
    expect(regulation.text).toMatch(/manufacturing practice/);
    expect(regulation.text).toMatch(/compliance/);
  }
  expect(getBarcodeAdditiveInformation('E211').regulation.text).toMatch(/0.1%.*significantly different.*Prior-sanction/);
  expect(getBarcodeAdditiveInformation('E415').regulation.text).toMatch(/standards do not preclude.*food-grade labeling/);
});
