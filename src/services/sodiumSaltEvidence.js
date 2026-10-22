// Shared optional OFF consistency evidence. No replacement values or score policy.
// Schema units: https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/
const SODIUM_SALT_SOURCE = 'https://openfoodfacts.github.io/openfoodfacts-server/dev/ref-perl-pod/ProductOpener/Nutrition.html';
const SODIUM_SALT_MESSAGE = 'Provider sodium and salt disagree. Sodium is unknown until resolved.';
const SODIUM_ROUNDING_SOURCE = 'https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(4)';

function quantity(dataset) {
  const q = dataset.quantity;
  return ['100g', '100ml', 'serving', 'package'].includes(dataset.basis)
    && q && Number.isFinite(q.amount) && q.amount > 0 && ['g', 'ml'].includes(q.unit) ? q : null;
}

function declaration(entry) {
  if (!entry || entry.rawValue == null || typeof entry.rawValue === 'boolean'
    || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(entry.rawValue).trim())
    || entry.derivation?.includes('off:modifier:')) return null;
  const factor = { g: 1, mg: .001, mcg: .000001, ug: .000001, 'µg': .000001, 'μg': .000001 }[entry.rawUnit?.trim().toLowerCase()];
  const value = Number(entry.rawValue);
  if (!factor || !Number.isFinite(value) || value < 0) return null;
  // Avoid destructuring/spread in this shared CommonJS module: the production
  // browser Babel caller can otherwise inject ESM runtime-helper imports.
  const parts = String(entry.rawValue).trim().toLowerCase().split('e');
  const coefficient = parts[0], exponent = parts[1] || '0';
  const decimals = (coefficient.split('.')[1] || '').length;
  // Half the final recorded decimal place, including the entered unit. A zero
  // without retained precision gets the deliberately broad integer interval.
  return { value: value * factor, allowance: .5 * 10 ** (Number(exponent) - decimals) * factor, entry };
}

function pair(dataset) {
  const q = quantity(dataset);
  if (!q) return null;
  const select = nutrient => dataset.observations.filter(o => o.nutrient === nutrient
    && new RegExp(`^nutriments\\.${nutrient}_(100g|serving|value|100ml)$`).test(o.field));
  const sodium = select('sodium'), salt = select('salt');
  if (sodium.length !== 1 || salt.length !== 1
    || sodium[0].field.replace('sodium', '') !== salt[0].field.replace('salt', '')) return null;
  const na = declaration(sodium[0]), nacl = declaration(salt[0]);
  return na && nacl ? { dataset, q, sodium: na, salt: nacl } : null;
}

const close = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(a), Math.abs(b)) * 1e-10;

function usDeclarationInterval(mg) {
  if (mg === 0) return [0, 5];
  let low = Infinity, high = -Infinity;
  if (mg >= 5 && mg <= 140 && close(mg / 5, Math.round(mg / 5))) {
    low = Math.max(5, mg - 2.5); high = Math.min(140, mg + 2.5);
  }
  // 140 can also be the rounded declaration of a quantity above 140 mg.
  if (mg >= 140 && close(mg / 10, Math.round(mg / 10))) {
    low = Math.min(low, Math.max(140, mg - 5)); high = mg + 5;
  }
  return low <= high ? [low, high] : null;
}

function labelRounding(input, pairs, current) {
  const servings = input.datasets.filter(d => d.basis === 'serving').map(quantity)
    .filter(q => q?.unit === current.q.unit);
  // Per-serving label uncertainty cannot be scaled without a compatible serving.
  // Missing evidence makes this comparison indeterminate, not sodium unusable.
  if (!servings.length || servings.some(q => !close(q.amount, servings[0].amount))) return null;
  const ratio = current.q.amount / servings[0].amount;
  const usClaim = input.markets?.some(m => m.values.some(v => /^(?:en:)?(?:united[ -]states(?: of america)?|us|usa)$/i.test(v)));
  const original = usClaim && pairs.find(p => p.dataset.id === 'off-value' && p.dataset.basis === 'serving'
    && p.q.unit === current.q.unit && close(p.q.amount, servings[0].amount)
    && close(p.sodium.value * ratio, current.sodium.value) && close(p.salt.value * ratio, current.salt.value));
  const interval = original && usDeclarationInterval(original.sodium.value * 1000);
  // Unknown original label precision cannot be read from normalized decimals.
  // Allow the largest FDA half-increment (5 mg/serving) as a possible rounding
  // explanation; this does not assert US label compliance or a replacement value.
  const sodium = interval ? interval.map(mg => mg / 1000 * ratio)
    : [Math.max(0, current.sodium.value - .005 * ratio), current.sodium.value + .005 * ratio];
  return { sodium, saltAllowance: .005 * 2.5 * ratio,
    mode: interval ? 'reported-us-serving-declaration' : 'original-rounding-indeterminate',
    source: SODIUM_ROUNDING_SOURCE };
}

function findSodiumSaltConflicts(input) {
  if (input?.source?.provider !== 'open-food-facts') return [];
  const pairs = (input.datasets || []).map(pair).filter(Boolean);
  return pairs.flatMap(current => {
    const rounding = labelRounding(input, pairs, current);
    if (!rounding) return [];
    const allowance = { sodium: current.sodium.allowance, salt: current.salt.allowance };
    for (const other of pairs) {
      if (other.q.unit !== current.q.unit) continue;
      const ratio = current.q.amount / other.q.amount;
      // Inherit coarser recorded precision only when BOTH values are equivalent
      // on the same dimension. Do not borrow one matching value from another panel.
      if (!close(other.sodium.value * ratio, current.sodium.value)
        || !close(other.salt.value * ratio, current.salt.value)) continue;
      for (const key of ['sodium', 'salt']) allowance[key] = Math.max(allowance[key], other[key].allowance * ratio);
    }
    // Widen, never narrow, retained uncertainty. Normalized digit counts alone
    // are insufficient evidence of the original declaration's precision.
    const sodiumInterval = [Math.min(Math.max(0, current.sodium.value - allowance.sodium), rounding.sodium[0]),
      Math.max(current.sodium.value + allowance.sodium, rounding.sodium[1])];
    // Salt may itself derive from a rounded sodium declaration. Its normalized
    // decimals are not independent precision evidence for that original label.
    allowance.salt = Math.max(allowance.salt, rounding.saltAllowance);
    const saltInterval = [Math.max(0, current.salt.value - allowance.salt), current.salt.value + allowance.salt];
    const expectedSaltInterval = sodiumInterval.map(value => value * 2.5);
    if (saltInterval[0] <= expectedSaltInterval[1] + 1e-12 && expectedSaltInterval[0] <= saltInterval[1] + 1e-12) return [];
    return [{ type: 'sodium-salt', nutrient: 'sodium', datasetId: current.dataset.id,
      basis: current.dataset.basis, quantity: Object.assign({}, current.q), source: Object.assign({}, input.source),
      observations: [Object.assign({}, current.sodium.entry), Object.assign({}, current.salt.entry)],
      saltIntervalGrams: saltInterval, expectedSaltIntervalGrams: expectedSaltInterval,
      rounding: { mode: rounding.mode, source: rounding.source },
      message: SODIUM_SALT_MESSAGE, methodUrl: SODIUM_SALT_SOURCE,
      qualification: 'Provider consistency check using salt = sodium × 2.5, retained precision and possible per-serving sodium-label rounding. Salt may be provider-derived; this is not independent label verification. Neither field supplies a replacement value.' }];
  });
}

module.exports = { findSodiumSaltConflicts, SODIUM_SALT_MESSAGE, SODIUM_SALT_SOURCE };
