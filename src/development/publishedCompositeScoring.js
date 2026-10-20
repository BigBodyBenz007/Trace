// Independent arithmetic for attributed assessments supplied to the local preview.
// This module contains no additive risk database and performs no ingredient parsing.
const { evaluatePublishedNutrition, EXCLUDED_PRODUCTS } = require('./publishedNutritionScoring');
const SOURCES = Object.freeze({
  weights: 'https://help.yuka.io/l/en/article/ijzgfvi1jq-how-are-food-products-scored',
  additives: 'https://help.yuka.io/l/en/article/yth80j3vle-sources-analysis-of-food-additives',
  oils: 'https://help.yuka.io/l/en/article/zng6f5sv6y-les-huiles-hydrog-n-es-sont-elles-prises-en-compte-dans-la-notation',
  salt: 'https://help.yuka.io/l/en/article/0ugjxul5pe-untitled-article-en',
  chocolate: 'https://help.yuka.io/l/en/article/s10gg49v7c-how-are-the-chocolates-rated',
  simulator: 'https://editor.yuka.io/',
});
const PENALTIES = Object.freeze({ green: 0, yellow: 6, orange: 15, red: 30 });
const text = v => typeof v === 'string' && v.trim().length > 0;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const freeze = v => { if (object(v) || Array.isArray(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };

function evaluatePublishedComposite(profile, nutrition = evaluatePublishedNutrition(profile)) {
  const reasons = [], p = profile || {}, a = p.compositeAssessments || {};
  const fail = (code, message) => reasons.push({ code, message });
  const attributed = source => object(source) && text(source.attribution)
    && ((source.kind === 'synthetic' && p.synthetic === true)
      || (source.kind !== 'synthetic' && (text(source.url) || text(source.archive))));
  const result = { methodId: 'yuka-public-composite-local-research', methodVersion: '2026-10-19',
    grade: null, scoreReady: false, scanMatchEligible: false, score100: null, rawScore100: null,
    components: null, cap: null, reasons, sources: { ...SOURCES } };
  const category = String(p.product?.category || '').toLowerCase().replace(/[_\s]+/g, '-');
  const salt = ['salt', 'table-salt', 'sea-salt'].includes(category);
  const water = p.methodCategory === 'water';
  if (EXCLUDED_PRODUCTS.includes(category)) fail('excluded-product-category', 'The public Yuka method does not rate this product category.');
  if (nutrition?.status === 'invalid') fail('invalid-profile', 'Known nutrition, scope or provenance conflicts must be resolved before any combined calculation.');
  if (category.includes('chocolate') && !category.includes('milk')) {
    fail('chocolate-rule-incomplete', 'Chocolate has special weights; its complete cocoa conversion is not established here.');
  }
  if (!salt && (!Number.isFinite(nutrition?.nutritionScore100) || nutrition.nutritionScore100 < 0 || nutrition.nutritionScore100 > 100)) {
    fail('nutrition-unavailable', 'A determined nutrition rating is required for the ordinary combined calculation.');
  }
  if (p.product?.market !== 'US' && p.evidence?.market?.claim !== 'US') fail('market-unverified', 'This composite route requires a supplied US formulation claim.');
  if (p.product?.market && p.evidence?.market?.claim && p.product.market !== p.evidence.market.claim) fail('market-conflict', 'Product and evidence market claims disagree.');
  const additives = a.additives;
  let deduction = 0, red = false;
  if (additives?.status !== 'reviewed' || additives.complete !== true || additives.scope !== 'full-ingredient-list'
    || !Array.isArray(additives.items) || !attributed(additives.source)) {
    fail('additive-assessment-missing', 'A complete, attributed ingredient/additive assessment is missing; provider identifiers or an empty provider list do not earn 30 points.');
  } else {
    const identifiers = new Set();
    for (const item of additives.items) {
      if (!text(item?.id) || !Object.hasOwn(PENALTIES, item.level) || !attributed(item.source)) {
        fail('invalid-additive-assessment', 'Each assessed additive needs a distinct identifier, supported classification and attribution.'); break;
      }
      if (identifiers.has(item.id)) { fail('duplicate-assessment', 'Duplicate additive assessments must be resolved, not counted twice.'); break; }
      identifiers.add(item.id); deduction += PENALTIES[item.level]; red ||= item.level === 'red';
    }
  }
  const oils = a.hydrogenatedOils;
  const validCount = n => Number.isSafeInteger(n) && n >= 0;
  if (oils?.status !== 'reviewed' || !validCount(oils.partialCount) || !validCount(oils.fullyCount) || !attributed(oils.source)) {
    fail('oil-assessment-missing', 'A complete US hydrogenated-oil assessment is missing.');
  } else if (oils.partialCount || oils.fullyCount) {
    // The public deductions are known; their aggregation with multiple assessed
    // additives/oils has not yet been checked against the official simulator.
    if (deduction > 0 || oils.partialCount + oils.fullyCount > 1) {
      fail('oil-aggregation-unverified', 'The aggregation of multiple oil/additive deductions has not been independently reproduced.');
    } else { deduction += oils.partialCount ? 30 : 15; red ||= oils.partialCount > 0; }
  }
  let organic = 0, saltBonuses = 0;
  if (salt) {
    const processing = a.salt;
    if (typeof processing?.unrefined !== 'boolean' || typeof processing?.seaExtracted !== 'boolean' || !attributed(processing.source)) {
      fail('salt-assessment-missing', 'Salt requires attributed refining and extraction assessments.');
    } else saltBonuses = (processing.unrefined ? 10 : 0) + (processing.seaExtracted ? 10 : 0);
  } else if (!water && (!['certified', 'not-certified'].includes(a.organic?.status) || !attributed(a.organic?.source)
    || (a.organic?.status === 'certified' && !text(a.organic.certification)))) {
    fail('organic-assessment-missing', 'Official organic certification or an attributed non-certified assessment is missing; the 10-point component is not redistributed.');
  } else organic = !water && a.organic?.status === 'certified' ? 10 : 0;
  if (deduction > 30 && !red) fail('additive-floor-unverified', 'Aggregation exceeding 30 points without a red assessment still requires a reference check.');
  if (reasons.length) return freeze(result);
  const nutritionComponent = salt ? 0 : nutrition.nutritionScore100 * 0.6;
  const additiveComponent = Math.max(0, 30 - deduction);
  result.components = { nutrition: nutritionComponent, nutritionRounded: Math.round(nutritionComponent),
    additives: additiveComponent, organic, saltBonuses, waterException: water ? 10 : 0, deduction };
  result.rawScore100 = nutritionComponent + additiveComponent + organic + saltBonuses + result.components.waterException;
  result.cap = red ? 49 : salt ? 50 : 100;
  result.score100 = Math.min(result.cap, Math.max(0, Math.round(result.rawScore100)));
  return freeze(result);
}

module.exports = { evaluatePublishedComposite, SOURCES, PENALTIES };
