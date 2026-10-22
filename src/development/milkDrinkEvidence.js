// Narrow development policy scope, not a new provider classification or a
// verification of the panel/formulation. Ingredients and name substrings cannot
// establish eligibility. Keep the provider's original classification intact.
const FLUID_MILK = new Set(['en:milks', 'en:whole-milks', 'en:skimmed-milks',
  'en:semi-skimmed-milks', 'en:flavoured-milks', 'en:flavored-milks',
  'en:chocolate-milks', 'en:ultra-filtered-milks', 'en:lactose-free-milk',
  'fluid-dairy-milk']); // Last value: an attributed official product-page section.
const EXCLUDED_TAG = /(?:plant-based|plant-milk|milk-substitute|soy-milk|almond-milk|oat-milk|coconut-milk|rice-milk|juice|coffee|tea-beverage|yogurt|yoghurt|dessert|ice-cream|chocolate$|cheese|snack|powder|condensed|evaporated|infant|baby|supplement|meal|shake|smoothie)/i;
const EXCLUDED_NAME = /\b(?:almond|soy|soya|oat|coconut|rice|cashew|plant|juice|coffee|latte|cappuccino|tea|chai|shake|smoothie|yogurt|yoghurt|dessert|pudding|ice cream|powder|condensed|evaporated|infant|formula)\b|\bmilk chocolate\b/i;

export function resolveMilkDrinkEvidence(product, source, basis) {
  const claims = (Array.isArray(product?.categories) ? product.categories : []).flatMap(entry => (Array.isArray(entry?.values) ? entry.values : [])
    .filter(value => typeof value === 'string').map(value => ({ field: entry.field, value })));
  const result = { status: 'not-established', name: product?.name || null,
    claims, source: product?.source ? JSON.parse(JSON.stringify(product.source)) : null,
    comparisonBasis: { amount: 100, unit: 'ml' } };
  if (!product?.name || !source?.url || !source?.attribution
    || product.source?.url !== source.url || product.source?.attribution !== source.attribution) {
    return { ...result, reason: 'Matching attributed product-classification evidence is unavailable.' };
  }
  if (basis?.unit !== 'ml' || !Number.isFinite(basis.amount) || basis.amount <= 0) {
    return { ...result, reason: 'The milk adjustment requires measured volume; no g-to-mL density is assumed.' };
  }
  // OFF's shared liquid-and-powder ancestor does not assert a powder product.
  if (EXCLUDED_NAME.test(product.name) || claims.some(claim => claim.value !== 'en:milks-liquid-and-powder' && EXCLUDED_TAG.test(claim.value))) {
    return { ...result, reason: 'Mixed, excluded or conflicting product scope retains the existing policy.' };
  }
  const supportingClaims = claims.filter(claim => FLUID_MILK.has(claim.value));
  return supportingClaims.length
    ? { ...result, status: 'source-identified', supportingClaims,
      reason: 'Source classifies fluid dairy milk on a measured volume basis; this does not verify its nutrients or regional formulation.' }
    : { ...result, reason: 'A broad dairy category, milk ingredient or product name alone does not establish fluid dairy milk.' };
}
