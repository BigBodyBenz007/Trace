// Optional generic-reference association. This never establishes a barcode match.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const text = value => typeof value === 'string' && value.trim().length > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const required = { calories: 'kcal', saturatedFat: 'g', totalSugar: 'g', sodium: 'mg', fiber: 'g', protein: 'g', fat: 'g', carbohydrates: 'g' };

function assessProduceFallback({ reference, productEvidence, confirmation } = {}) {
  const reasons = [];
  const add = (code, message) => reasons.push({ code, message });
  const identity = reference?.produceIdentity;
  const source = reference?.source;
  if (!text(reference?.id) || !text(identity?.food) || !['fruit', 'vegetables'].includes(identity?.category)
    || identity?.preparation !== 'raw' || identity?.fresh !== true || identity?.plain !== true || identity?.singleIngredient !== true) {
    add('unsupported-reference', 'Only reviewed plain, fresh, raw, single-ingredient produce references are supported.');
  }
  if (source?.kind !== 'government-composition' || !/^\d+$/.test(source?.recordId || '')
    || source?.id !== `usda-fdc-${source?.recordId}-${identity?.sourceKey}`
    || !text(source?.edition) || !text(source?.documentTitle)
    || !/^https:\/\/(?:fdc\.nal\.usda\.gov|api\.nal\.usda\.gov)\//.test(source?.url || '')) {
    add('missing-usda-provenance', 'An identified USDA source edition and official reference URL are required.');
  }
  const basis = reference?.basis;
  if (basis?.kind !== '100g' || basis?.amount !== 100 || basis?.unit !== 'g') add('unsupported-basis', 'This fallback requires a reference per 100 g edible portion.');
  if (basis?.sourceId !== source?.id || basis?.sourceEdition !== source?.edition) add('conflicting-provenance', 'Reference basis and source edition must agree.');
  const conflicts = reference?.sourceState?.unresolvedConflicts;
  if (reference?.sourceState?.cacheStale === true || reference?.sourceState?.superseded === true
    || (conflicts != null && (!Array.isArray(conflicts) || conflicts.length > 0))) {
    add('unresolved-reference', 'Stale, superseded or conflicting reference data cannot support this fallback.');
  }
  const evidence = productEvidence || { status: 'unknown' };
  if (!['unknown', 'verified', 'excluded'].includes(evidence.status)) add('invalid-identity-evidence', 'Identity evidence status is unsupported.');
  if (evidence.status === 'excluded' || ['fresh', 'plain', 'singleIngredient'].some(key => evidence[key] === false)
    || (evidence.category != null && !['fruit', 'vegetables'].includes(evidence.category))
    || (evidence.preparation != null && evidence.preparation !== 'raw')) {
    add('product-excluded', 'Processed, mixed, prepared or otherwise excluded products cannot use this fallback.');
  }
  if (evidence.status === 'verified') {
    if (!text(evidence.source?.url) || !date(evidence.reviewedOn)
      || !['fresh', 'plain', 'singleIngredient'].every(key => evidence[key] === true)
      || evidence.preparation !== 'raw' || evidence.category !== identity?.category || evidence.food !== identity?.food) {
      add('identity-not-supported', 'Reviewed product identity must establish the same plain raw produce type.');
    }
    if (identity?.cultivar && evidence.cultivar !== identity.cultivar) add('cultivar-not-supported', 'A cultivar-specific reference requires matching cultivar evidence.');
  }
  const blocked = reasons.length > 0;
  const confirmed = !blocked && confirmation?.referenceId === reference?.id
    && confirmation.plainFreshSingleIngredient === true && confirmation.acceptGenericEstimate === true
    && date(confirmation.confirmedOn);
  if (!blocked && !confirmed) add('confirmation-required', 'Explicit selection and confirmation of plain fresh produce and the generic estimate are required.');
  for (const [key, unit] of Object.entries(required)) {
    const nutrient = reference?.nutrients?.[key];
    if (nutrient?.value == null) add('missing-nutrient', `USDA reference ${key} is unknown; no single score will be assigned.`);
    else if (!Number.isFinite(nutrient.value) || nutrient.value < 0 || nutrient.unit !== unit) add('invalid-nutrient', `USDA reference ${key} has an invalid value or unsupported unit.`);
    if (nutrient?.sourceId !== source?.id || nutrient?.sourceEdition !== source?.edition) add('conflicting-provenance', `${key} must retain its source and edition binding.`);
  }
  const n = reference?.nutrients || {};
  for (const [part, total] of [['saturatedFat', 'fat'], ['totalSugar', 'carbohydrates'], ['fiber', 'carbohydrates']]) {
    if (n[part]?.value != null && n[total]?.value != null && n[part].value > n[total].value) add('contradictory-nutrients', `${part} exceeds ${total}.`);
  }
  const ready = confirmed && reasons.length === 0;
  return freeze({ status: blocked ? 'blocked' : !confirmed ? 'confirmation-required' : ready ? 'ready' : 'incomplete-reference',
    eligible: ready, confirmed, reasons, grade: null, scoreReady: false, scanMatchEligible: false,
    association: confirmed ? { type: 'user-confirmed-generic-produce', referenceId: reference.id,
      fdcId: source.recordId, confirmedOn: confirmation.confirmedOn,
      productIdentity: evidence.status === 'verified' ? 'reviewed-produce-type' : 'unverified',
      exactPackageComposition: 'unknown', genericCultivarEstimate: identity.cultivar || null,
      qualification: 'USDA generic nutrition estimate; no exact package, specimen or barcode match established.' } : null });
}

module.exports = { assessProduceFallback };
