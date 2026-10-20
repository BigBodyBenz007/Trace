const published = require('./publishedNutritionFixtures');
const originalSnapshot = JSON.stringify(published.PROFILES);
const updated = require('./updatedNutritionFixtures');

const observed = id => updated.OBSERVATIONS.find(profile => profile.id === id);
const synthetic = id => updated.SYNTHETIC.find(profile => profile.id === id);

describe('updated Nutri-Score fixture metadata', () => {
  test('preserves all 18 observation identities and every supplied nutrient and source field', () => {
    expect(updated.OBSERVATIONS.map(profile => profile.id)).toEqual(published.OBSERVATIONS.map(profile => profile.id));
    expect(updated.OBSERVATIONS).toHaveLength(18);
    for (const original of published.OBSERVATIONS) {
      const result = observed(original.id);
      for (const field of ['product', 'nutrients', 'basis', 'source', 'ingredients', 'additives',
        'plantContent', 'sourceState', 'baseline', 'previousDensity']) {
        expect(result[field]).toEqual(original[field]);
      }
      expect(result).not.toBe(original);
      expect(result.nutrients).not.toBe(original.nutrients);
    }
    expect(JSON.stringify(published.PROFILES)).toBe(originalSnapshot);
  });

  test('keeps updated FVL separate and applies the specific olive-oil exception', () => {
    expect(observed('plain-almonds').updatedCategory).toBe('fats-nuts-seeds');
    expect(observed('plain-almonds').plantContent.percent).toBe(100);
    expect(observed('plain-almonds').updatedFvlContent.percent).toBe(0);
    expect(observed('olive-oil').updatedCategory).toBe('fats-nuts-seeds');
    expect(observed('olive-oil').updatedFvlContent.percent).toBe(100);
    expect(observed('olive-oil').updatedFvlContent.basis).toContain('Table 8');
    expect(observed('fresh-apple').updatedFvlContent.percent).toBe(100);
    expect(observed('fresh-broccoli').updatedFvlContent.percent).toBe(100);
  });

  test('retains unknown nut proportion and mixed-meat classification', () => {
    expect(observed('peanut-butter').updatedCategory).toBeNull();
    expect(observed('peanut-butter').updatedCategoryCandidates).toEqual(['general', 'fats-nuts-seeds']);
    expect(observed('peanut-butter').updatedFvlContent).toBeNull();
    expect(observed('peanut-butter').updatedCategoryEvidence.basis).toContain('more than 50%');
    expect(observed('processed-meat').updatedCategory).toBeNull();
    expect(observed('processed-meat').updatedCategoryCandidates).toEqual(['general', 'red-meat']);
    expect(observed('processed-meat').updatedCategoryEvidence.basis).toContain('20% or more');
  });

  test('binds sweetener presence or absence to the individually reviewed full ingredient list', () => {
    for (const [id, present] of [['diet-soda', true], ['regular-soda', false], ['unsweetened-tea', false]]) {
      const profile = observed(id);
      expect(profile.nonNutritiveSweeteners.present).toBe(present);
      expect(profile.nonNutritiveSweeteners.source).toEqual(profile.ingredients.provenance);
      expect(profile.nonNutritiveSweeteners.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(profile.additives).toBeNull();
      expect(profile.nutrients.saturatedFat.value).toBeNull();
      expect(profile.nutrients.fiber.value).toBeNull();
    }
  });

  test('spoonable yogurt stays general while the synthetic milk control moves to beverages', () => {
    expect(observed('plain-yogurt').updatedCategory).toBe('general');
    expect(observed('sweetened-yogurt').updatedCategory).toBe('general');
    expect(synthetic('milk-original-general-rule').updatedCategory).toBe('beverage');
    expect(synthetic('milk-original-general-rule').methodCategory).toBe('general');
    expect(synthetic('water').updatedCategory).toBe('water');
  });

  test('unquantified FVL remains unknown and original missing quantities remain missing', () => {
    for (const id of ['frozen-meal', 'sweetened-yogurt', 'white-bread', 'whole-wheat-bread']) {
      expect(observed(id).updatedFvlContent).toBeNull();
    }
    expect(observed('white-bread').basis.amount).toBeNull();
    expect(observed('fresh-apple').nutrients.addedSugar.value).toBeNull();
    expect(observed('refined-cereal-rice-krispies').sourceState.unresolvedConflicts.length).toBeGreaterThan(0);
  });

  test('retains all earlier synthetic IDs and their nutrient vectors without reclassifying real additives', () => {
    for (const profile of published.SYNTHETIC) {
      expect(synthetic(profile.id).nutrients).toEqual(profile.nutrients);
      expect(synthetic(profile.id).additives).toEqual(profile.additives);
    }
    expect(synthetic('whole-grain-evidence').nutrients).toEqual(synthetic('refined-grain-evidence').nutrients);
    expect(synthetic('provider-empty-additives').additives.status).toBe('reported');
    expect(synthetic('missing-additives').additives).toBeNull();
  });

  test('the new bread comparison differs only in fiber and is explicitly synthetic', () => {
    const low = synthetic('refined-bread-lower-fiber');
    const high = synthetic('whole-grain-bread-higher-fiber');
    expect(low.synthetic).toBe(true);
    expect(high.synthetic).toBe(true);
    expect(low.nutrients.fiber.value).toBe(2);
    expect(high.nutrients.fiber.value).toBe(6);
    const withoutFiber = profile => Object.fromEntries(Object.entries(profile.nutrients).filter(([key]) => key !== 'fiber'));
    expect(withoutFiber(low)).toEqual(withoutFiber(high));
    expect(low.updatedFvlContent.percent).toBe(0);
    expect(high.updatedFvlContent.percent).toBe(0);
  });
});
