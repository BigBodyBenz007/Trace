// Local research candidate only. No I/O, persistence, clock or product matching.
const METHOD = 'trace-us-density-pilot';
const VERSION = '0.2-local';
const REQUIRED = Object.freeze(['calories', 'addedSugar', 'saturatedFat', 'sodium', 'fiber', 'protein']);
const NAMES = Object.freeze({ calories: 'Energy', addedSugar: 'Added sugars', saturatedFat: 'Saturated fat',
  sodium: 'Sodium', fiber: 'Fiber', protein: 'Protein', totalSugar: 'Total sugars', freeSugar: 'Free sugars',
  fat: 'Total fat', carbohydrates: 'Carbohydrates' });
const SOLIDS = ['produce', 'breakfast-cereal', 'spoonable-yogurt', 'conventional-protein-bar',
  'frozen-meal', 'processed-meat', 'legumes', 'refined-starch', 'bread', 'nuts', 'seeds', 'peanut-butter'];
const DRINKS = ['sugar-sweetened-beverage', 'juice', 'dairy-beverage', 'plant-beverage', 'diet-beverage',
  'unsweetened-low-energy-beverage', 'water'];
const MASS = { g: 1, mg: 0.001, mcg: 0.000001, ug: 0.000001, 'µg': 0.000001, 'μg': 0.000001 };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim() ? v : null;
const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const clip = v => Math.min(1, Math.max(0, v));
const freeze = value => { if (object(value) || Array.isArray(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

function sourceConfidence(input) {
  const e = input.evidence || {}, source = input.source || {};
  const claim = text(e.market?.claim) || text(input.product?.market);
  const warnings = [];
  if (!source.provider || !source.url) warnings.push('Source attribution is incomplete; this assesses the supplied profile only.');
  if (!source.artifact?.sha256) warnings.push('No archived source hash supplied.');
  if (!e.reviewedOn) warnings.push('No label review date supplied.');
  if (!source.revisionOn) warnings.push('Manufacturer revision date is unknown.');
  if (!input.product?.gtin) warnings.push('GTIN is unknown.');
  if (input.sourceState?.cacheStale || input.sourceState?.superseded) warnings.push('This is a stale or superseded observation, not a current formulation claim.');
  let market = 'Unknown market — supplied profile only';
  if (claim === 'US') market = e.market?.verification === 'matched-formulation'
    ? 'US formulation recorded in the archived review' : 'US-oriented source; exact formulation unconfirmed';
  else if (claim) market = `${claim} formulation — not a verified US product`;
  if (e.market?.claim && input.product?.market && e.market.claim !== input.product.market) market = 'Conflicting market claims — formulation unresolved';
  return { market, marketClaim: claim, marketEvidence: text(e.market?.statement),
    reviewType: text(e.reviewerType) || 'Review type not established', reviewedOn: text(e.reviewedOn),
    scanMatch: 'Not established by this preview', scanMatchEligible: false, warnings };
}

function evaluateNutritionPilot(value) {
  const input = object(value) ? value : {};
  const reasons = [];
  const add = (code, path, message) => reasons.push({ code, path, message });
  const category = text(input.product?.category);
  const drink = DRINKS.includes(category), solid = SOLIDS.includes(category);
  if (!solid) add('category-not-scored', 'product.category', drink
    ? 'Beverages: quantities are shown; this solid-food density method supplies no drink score.'
    : category === 'oil' ? 'Oils: fat composition and use need a different method; no overall score.'
      : 'This category has no rule in the local pilot.');
  const marketClaims = [text(input.evidence?.market?.claim), text(input.product?.market)].filter(Boolean);
  if (new Set(marketClaims).size > 1) add('conflicting-market', 'evidence.market', 'Product and source evidence disagree about the formulation market.');
  if (marketClaims.some(market => market !== 'US')) add('outside-us-pilot', 'evidence.market', 'Known overseas formulation; it cannot stand in for a US product.');
  const conflicts = input.sourceState?.unresolvedConflicts;
  if (conflicts !== undefined && !Array.isArray(conflicts)) add('invalid-conflicts', 'sourceState', 'Conflict information is malformed.');
  if (Array.isArray(conflicts) && conflicts.length) add('conflicting-formulation', 'sourceState', `Unresolved source conflict: ${conflicts.join('; ')}`);

  const basis = object(input.basis) ? input.basis : {};
  // Energy density needs a common declared basis, not a gram/mL serving size.
  // No mass-to-volume conversion or imputed serving quantity occurs.
  if (!['serving', '100g', '100ml'].includes(basis.kind)) add('basis-unknown', 'basis', 'A shared label-serving or 100 g/mL basis is required.');
  if ((basis.kind === '100g' && (basis.amount !== 100 || basis.unit !== 'g'))
    || (basis.kind === '100ml' && (basis.amount !== 100 || basis.unit !== 'ml'))) {
    add('basis-inconsistent', 'basis', 'The reference amount and unit disagree with the stated basis.');
  }
  if (basis.kind === 'serving' && basis.amount != null && (!finite(basis.amount) || basis.amount === 0)) {
    add('invalid-serving', 'basis.amount', 'A supplied serving quantity must be positive.');
  }
  const canonical = {}, transforms = {};
  for (const key of Object.keys(NAMES)) {
    const m = input.nutrients?.[key];
    canonical[key] = null;
    if (m?.value == null) {
      if (solid && REQUIRED.includes(key)) add('missing-nutrient', `nutrients.${key}`, `${NAMES[key]} is missing; no zero was assumed.`);
      continue;
    }
    if (!finite(m.value)) { add('invalid-value', `nutrients.${key}`, `${NAMES[key]} must be a finite, nonnegative number.`); continue; }
    const factor = key === 'calories' ? ({ kcal: 1, kJ: 1 / 4.184 })[m.unit]
      : MASS[m.unit] * (key === 'sodium' ? 1000 : 1);
    if (!Number.isFinite(factor)) { add('unsupported-unit', `nutrients.${key}`, `${NAMES[key]} has an unsupported unit (${String(m.unit)}).`); continue; }
    const converted = m.value * factor;
    if (!finite(converted) || (m.value > 0 && converted === 0)) { add('conversion-overflow', `nutrients.${key}`, `${NAMES[key]} cannot be converted reliably.`); continue; }
    canonical[key] = converted;
    transforms[key] = { originalValue: m.value, originalUnit: m.unit, factor, unit: key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g' };
  }
  // Missing provenance is a confidence limitation. Contradictory supplied bindings
  // still cannot be silently spliced into one calculation.
  for (const key of ['sourceId', 'sourceEdition']) {
    const expected = key === 'sourceId' ? input.source?.id : input.source?.edition;
    const bindings = [expected, basis[key], ...Object.values(input.nutrients || {}).map(m => m?.[key])].filter(v => v != null);
    if (new Set(bindings).size > 1) add('mixed-source-bindings', key, 'Nutrition values reference conflicting source editions.');
  }
  const contradiction = (part, total) => {
    if (canonical[part] !== null && canonical[total] !== null && canonical[part] > canonical[total] + 1e-9) {
      add('contradictory-nutrients', `nutrients.${part}`, `${NAMES[part]} exceeds ${NAMES[total].toLowerCase()}.`);
    }
  };
  contradiction('addedSugar', 'totalSugar'); contradiction('freeSugar', 'totalSugar');
  contradiction('saturatedFat', 'fat'); contradiction('totalSugar', 'carbohydrates'); contradiction('fiber', 'carbohydrates');
  if (solid && canonical.calories === 0) add('zero-energy', 'nutrients.calories', 'A per-100-calorie score needs positive energy; a zero label does not earn a score.');

  const per100 = {};
  if (canonical.calories > 0) for (const [key, amount] of Object.entries(canonical)) {
    per100[key] = amount === null ? null : amount / canonical.calories * 100;
    if (amount !== null && (!finite(per100[key]) || (amount > 0 && per100[key] === 0))) {
      add('density-overflow', `nutrients.${key}`, `${NAMES[key]} cannot be scaled reliably.`);
    }
  }
  let reference = ['g', 'ml'].includes(basis.unit) && finite(basis.amount) && basis.amount > 0
    ? Object.fromEntries(Object.entries(canonical).map(([key, amount]) => [key, amount === null ? null : amount / basis.amount * 100])) : null;
  if (reference && Object.entries(reference).some(([key, amount]) => amount !== null
    && (!finite(amount) || (canonical[key] > 0 && amount === 0)))) reference = null;
  const output = { methodId: METHOD, methodVersion: VERSION, grade: null, scoreReady: false,
    eligible: reasons.length === 0, reasons, sourceConfidence: sourceConfidence(input),
    category: { id: category || null, comparison: solid ? 'Solid-food nutrient density only' : 'Quantities only; no overall index' },
    quantities: { declared: canonical, per100Calories: per100, per100Reference: reference, referenceUnit: reference ? basis.unit : null, transforms },
    experimental: null,
    limitations: ['Experimental index, not a validated health score or FDA endorsement.',
      'Whole grains, micronutrients, protein quality and complete fat quality are not scored.',
      'Compare similar foods; this number is not a complete cross-category ranking.'] };
  if (!output.eligible) return freeze(output);
  const a = clip(per100.addedSugar / 10), s = clip(per100.saturatedFat / 4), n = clip(per100.sodium / 460);
  const f = clip(per100.fiber / 1.4), p = clip(per100.protein / 2.5);
  const mean = (a + s + n) / 3, worst = Math.max(a, s, n), burden = (mean + worst) / 2;
  const potential = 50 + 25 * f + 25 * p;
  const raw = potential * (1 - burden);
  const contributions = { base: 50, fiberCredit: 25 * f, proteinCredit: 25 * p,
    addedSugarLoss: potential * a / 6, saturatedFatLoss: potential * s / 6,
    sodiumLoss: potential * n / 6, strongestLoss: potential * worst / 2 };
  output.experimental = { raw, score: Math.floor(raw + 0.5), potential, burden,
    components: { addedSugar: a, saturatedFat: s, sodium: n, fiber: f, protein: p }, contributions,
    strongest: ['addedSugar', 'saturatedFat', 'sodium'].filter((key, i) => Math.abs([a, s, n][i] - worst) < 1e-12 && worst > 0) };
  return freeze(output);
}

module.exports = { METHOD, VERSION, REQUIRED, NAMES, evaluateNutritionPilot };
