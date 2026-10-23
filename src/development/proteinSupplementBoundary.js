// Development rating scope, independent of nutrient quantities and logging.
// Only source-bound product-form AND supplement-use evidence establish scope.
export const PROTEIN_SUPPLEMENT_MESSAGE = 'Overall rating not available for protein supplements.';
const normalize = value => String(value || '').toLowerCase().replace(/^en:/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

export function resolveProteinSupplementBoundary(candidate) {
  const display = candidate?.display, food = candidate?.selection || candidate?.recovery?.food;
  const unknown = { status: 'not-established' };
  if (!display || candidate.customFood) return unknown;
  const input = display.assessmentInputs;
  const source = input?.source || { url: display.sourceUrl, attribution: display.attribution };
  if (!source.url || !source.attribution || source.url !== display.sourceUrl || source.attribution !== display.attribution
    || (input && (input.identity?.name !== display.name || input.identity?.brand !== display.brand))) return unknown;
  const name = normalize(display.name);
  const categories = input?.categories || food?.categories;
  const claims = (Array.isArray(categories) ? categories : []).flatMap(entry => Array.isArray(entry?.values)
    ? entry.values.filter(value => typeof value === 'string').map(value => ({field:entry.field,value,normalized:normalize(value)})) : []);
  // Ready-to-drink and ordinary food descriptions contradict supplement-powder
  // form. An ingredient list or protein concentration is never consulted.
  const ordinary = /\b(?:bars?|yogurts?|yoghurts?|flours?|milk powder|powdered milk|cocoa powder|ready to drink|rtd|bread)\b/;
  const ordinaryCategory = /^(?:protein bars|cereal bars|yogurts|milks|flours|cocoa powders|milk powders|ready to drink protein drinks)$/;
  if (/\b(?:with|containing|added)\b.*\b(?:protein|whey|casein)\b.*\bpowder\b/.test(name)) return unknown;
  if (ordinary.test(name) || claims.some(entry => ordinaryCategory.test(entry.normalized))) return unknown;
  const serving = food?.serving || candidate?.recovery?.providerSourceSnapshot?.serving;
  const declaredUnits = (Array.isArray(input?.serving) ? input.serving : []).filter(entry => /(?:servingSizeUnit|serving_quantity_unit)$/.test(entry.field)).map(entry => normalize(entry.value));
  const units = [...declaredUnits, normalize(serving?.unit)].filter(Boolean);
  if (units.some(unit => ['ml','mlt','l','fl oz'].includes(unit))) return unknown;
  const specific = claims.filter(entry => /^(?:protein powders|whey protein powders|pea protein powders|sports protein powders)$/.test(entry.normalized));
  const intendedUse = claims.filter(entry => /^(?:energy, protein & muscle recovery drinks|dietary supplements|food supplements|bodybuilding supplements|sports supplements|protein supplements)$/.test(entry.normalized));
  const proteinProduct = /\b(?:protein|whey|casein)\b/.test(name);
  const namedPowder = /\bpowders?\b/.test(name) && proteinProduct;
  if (!namedPowder && /\b(?:milk|eggs?|meat|liquid|bottled)\b/.test(name)) return unknown;
  const massEvidence = units.some(unit => ['g','grm','grams','gram'].includes(unit))
    || input?.datasets?.some(dataset => dataset.quantity?.unit === 'g');
  if (!proteinProduct || !(specific.length || (namedPowder && massEvidence && intendedUse.length))) return unknown;
  return { status: 'not-rated-category', code: 'protein-supplement-powder', message: PROTEIN_SUPPLEMENT_MESSAGE,
    source: { url: source.url, attribution: source.attribution }, name: display.name,
    evidence: { productForm: 'dry-protein-supplement-powder', categoryClaims: [...specific,...intendedUse].map(({field,value})=>({field,value})),
      namedPowder, massEvidence: Boolean(massEvidence), scope: 'Source-reported product form and intended use; no protein cutoff or ingredient inference.' } };
}
