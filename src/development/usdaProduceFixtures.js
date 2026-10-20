// Preview only: reuse complete USDA records, never splice into manufacturer data.
import fruitSeeds from '../data/groceryFoods.v1.fruit';
import vegetableSeeds from '../data/groceryFoods.v1.vegetables';
import { OBSERVATIONS } from './updatedNutritionFixtures';
import banana from './__fixtures__/usdaBananaReference.json';

const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fields = { calories: [1008, 'kcal'], saturatedFat: [1258, 'g'], totalSugar: [2000, 'g'],
  sodium: [1093, 'mg'], fiber: [1079, 'g'], protein: [1003, 'g'], fat: [1004, 'g'], carbohydrates: [1005, 'g'] };

function catalogProfile(fdcId, food, cultivar = null) {
  const seed = [...fruitSeeds, ...vegetableSeeds].find(item => item.fdcId === fdcId);
  const sourceKey = seed.sourceDataType === 'Foundation' ? 'foundation' : 'sr-legacy';
  const source = { id: `usda-fdc-${fdcId}-${sourceKey}`, recordId: String(fdcId), kind: 'government-composition',
    provider: 'US Department of Agriculture, Agricultural Research Service',
    documentTitle: seed.sourceDescription, edition: `${seed.sourceDataType}; catalog release ${seed.sourceRelease}`,
    url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`,
    attribution: 'USDA FoodData Central; public domain (CC0)',
    artifact: { locator: `src/data/groceryFoods.v1.${seed.category}.js#${fdcId}` },
    verification: 'existing-catalog-excerpt', publishedOn: null };
  return { id: `produce-${fdcId}`, synthetic: false,
    product: { name: `${seed.name} (USDA generic estimate)`, brand: null, variant: cultivar, gtin: null,
      market: null, category: 'produce', preparation: 'raw edible portion', packageDescription: null },
    produceIdentity: { food, cultivar, category: seed.category, preparation: 'raw', fresh: true, plain: true, singleIngredient: true, sourceKey },
    source, basis: { kind: '100g', amount: 100, unit: 'g', sourceId: source.id, sourceEdition: source.edition },
    nutrients: Object.fromEntries(Object.entries(fields).map(([key, [, unit]]) => [key, {
      value: seed.nutrientsPer100g[key] ?? null, unit, sourceId: source.id, sourceEdition: source.edition,
      provenance: { field: `nutrientsPer100g.${key}`, status: seed.nutrientsPer100g[key] == null ? 'not-in-catalog' : 'catalog-reported' },
    }])), evidence: { market: { claim: null, statement: 'USDA generic composition; package market and formulation unknown.' }, reviewedOn: '2026-10-20' },
    sourceState: { unresolvedConflicts: [] }, ingredients: null, additives: null,
    updatedCategory: 'general', updatedFvlContent: { percent: 100,
      basis: 'The selected reference describes one raw fruit or vegetable; not a verified package ingredient list.', source },
    updatedMethodNotes: ['Generic reference only. No current package, ingredient, additive or barcode match is established.'],
  };
}

function existingProfile(id, food, category) {
  const profile = clone(OBSERVATIONS.find(item => item.id === id));
  profile.id = `produce-${profile.source.recordId}`;
  profile.produceIdentity = { food, cultivar: null, category, preparation: 'raw', fresh: true,
    plain: true, singleIngredient: true, sourceKey: 'sr-legacy' };
  profile.product = { ...profile.product, name: `${profile.product.name} — generic estimate`, market: null, gtin: null };
  profile.evidence.market = { claim: null, statement: 'USDA generic reference; package market and formulation remain unknown.' };
  // USDA food description is not an original package ingredient disclosure.
  profile.ingredients = null;
  profile.additives = null;
  return profile;
}

function bananaProfile() {
  const profile = catalogProfile(banana.fdcId, 'banana');
  const source = { ...profile.source, documentTitle: banana.description,
    edition: `SR Legacy; published ${banana.publicationDate}; captured ${banana.retrievedOn}`,
    url: banana.url, publishedOn: banana.publicationDate, retrievedOn: banana.retrievedOn,
    verification: 'direct-official-record', artifact: { locator: banana.url, sha256: banana.responseSha256 } };
  profile.source = source;
  profile.basis = { ...profile.basis, sourceEdition: source.edition };
  profile.nutrients = Object.fromEntries(Object.entries(fields).map(([key, [id, unit]]) => {
    const row = banana.foodNutrients.find(item => item.nutrientId === id);
    return [key, { value: row?.amount ?? null, unit, sourceId: source.id, sourceEdition: source.edition,
      provenance: { field: `foodNutrients[nutrient.id=${id}].amount`, nutrientId: id,
        derivationCode: row?.derivationCode ?? null, derivationDescription: row?.derivationDescription ?? null } }];
  }));
  profile.updatedFvlContent.source = source;
  return profile;
}

export const USDA_PRODUCE_REFERENCES = freeze([
  existingProfile('fresh-apple', 'apple', 'fruit'), catalogProfile(1750341, 'apple', 'gala'),
  bananaProfile(), existingProfile('fresh-broccoli', 'broccoli', 'vegetables'), catalogProfile(170393, 'carrot'),
]);
