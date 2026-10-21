// Development disclosure copy only; never feeds scoring, product records or caches.
const list = values => values.length < 3 ? values.join(' and ')
  : `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;

// Presentation only: rank guaranteed, actually applied point contributions.
// No new nutrient thresholds, estimated values or scoring calculations.
export function getNutritionHighlights(result) {
  if (result?.nutritionScore100 == null) return [];
  const points = result.points || {}, fatRich = ['nuts', 'oil', 'fats-nuts-seeds'].includes(result.methodCategory);
  const applied = key => Number.isFinite(points[key]?.min) && points[key].min > 0 ? points[key].min : 0;
  const factors = [
    ['energy', fatRich ? 0 : applied('energy'), result.methodCategory === 'beverage' ? 'Calories lower the score.' : 'Calorie density lowers the score.'],
    ['sugar', applied('sugar'), result.sugarMode === 'addedSugar' ? 'Added sugars lower the score.' : 'Total sugars lower the score.'],
    ['saturatedFat', applied('saturatedFat') + (fatRich ? applied('energy') : 0), 'Saturated fat lowers the score.'],
    ['salt', applied('salt'), 'Sodium lowers the score.'],
    ['fiber', applied('fiber'), 'Fiber helps the score.'],
    ['proteinApplied', applied('proteinApplied'), 'Protein helps the score.'],
    ['wholeGrain', applied('wholeGrain'), 'Whole grains help the score.'],
  ];
  return factors.map(([key, contribution, text], order) => ({ key, contribution, text, order }))
    .filter(item => item.contribution > 0).sort((a, b) => b.contribution - a.contribution || a.order - b.order)
    .slice(0, 3).map(({ order, ...item }) => item);
}

export function explainNutritionPoints(result) {
  if (result?.nutritionScore100 == null) return null;
  const points = result.points || {};
  const applied = key => Number.isFinite(points[key]?.min) && points[key].min > 0;
  if (result.methodId === 'trace-us-practical-nutrition') {
    const hasUsableAdded = result.normalized.originalNutrients?.addedSugar != null && !result.excludedNutrients?.includes('addedSugar');
    const sugar = result.sugarMode === 'addedSugar' ? 'added sugars' : hasUsableAdded ? 'total sugars' : 'total sugars (added sugars unavailable or inconsistent)';
    const fatRich = ['nuts', 'oil'].includes(result.methodCategory);
    const lower = [['energy', fatRich ? 'energy from saturated fat' : 'energy density'], ['sugar', sugar],
      ['saturatedFat', fatRich ? 'the share of saturated fat' : 'saturated fat'], ['salt', 'sodium']]
      .filter(([key]) => applied(key)).map(([, label]) => label);
    const higher = [['fiber', 'fiber'], ['proteinApplied', 'protein'], ['wholeGrain', 'a first-listed whole-grain ingredient']]
      .filter(([key]) => applied(key)).map(([, label]) => label);
    const sentences = [lower.length ? `This score is lowered by ${list(lower)}.` : 'The measured limiting nutrients do not lower this score.'];
    if (higher.length) sentences.push(`It is raised by ${list(higher)}.`);
    if (result.sugarMode === 'totalSugar' && !applied('sugar')) sentences.push(hasUsableAdded
      ? 'Total sugars are screened separately from the reported added sugars.' : 'Total sugars are screened separately because added sugars are unavailable or inconsistent.');
    if (result.normalized.nutrients.fiber === null || result.normalized.nutrients.protein === null) sentences.push('Missing fiber or protein earns no credit.');
    if (result.comparison.missingLimitingNutrients.length) sentences.push('The missing limiting-nutrient information cannot change this result under the model; no missing value is assumed.');
    return sentences.join(' ');
  }
  if (result.methodCategory === 'water') return 'Plain water uses a separate reference score.';
  const fats = result.methodCategory === 'fats-nuts-seeds';
  const lower = [[ 'energy', fats ? 'energy from saturated fat' : 'energy density' ],
    ['sugar', 'total sugars'], ['saturatedFat', fats ? 'the share of saturated fat' : 'saturated fat'], ['salt', 'sodium (calculated as salt)']]
    .filter(([key]) => applied(key)).map(([, label]) => label);
  const higher = [['fiber', 'fiber'], ['proteinApplied', 'protein'], ['plant', fats ? 'qualifying plant ingredients' : 'fruit, vegetable and legume content']]
    .filter(([key]) => applied(key)).map(([, label]) => label);
  const sentences = [];
  if (lower.length) sentences.push(`This score is lowered by ${list(lower)}.`);
  if (applied('nonNutritiveSweeteners')) sentences.push('The beverage rule also lowers the score for non-sugar sweeteners; this is not a safety judgment.');
  if (higher.length) sentences.push(`It is raised by ${list(higher)}.`);
  if (!sentences.length) sentences.push(Object.values(points).some(point => point.max > 0)
    ? 'The available inputs do not establish which individual factors change this score.'
    : 'No measured component adds or subtracts points in this calculation.');
  return sentences.join(' ');
}

const reviewedOn = '2026-10-20';
const source = (title, url, provision, edition = 'Live page reviewed 2026-10-20; publication date not stated') =>
  Object.freeze({ title, url, provision, edition, reviewedOn, jurisdiction: 'US', publisher: 'FDA', verification: 'directly-reviewed' });
const types = source('FDA: Types of Food Ingredients',
  'https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients', 'Ingredient function table');
const inventory = id => source(`FDA: ${id === 'LECITHIN' ? 'Lecithin' : id === 'ASCORBICACID' ? 'Ascorbic acid' : 'Sodium bicarbonate'} inventory`,
  `https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=${id}`, 'Technical effect and synonyms', 'Page updated 2026-09-08');
const cfr = (section, provision) => source(`21 CFR ${section}`,
  `https://www.ecfr.gov/current/title-21/section-${section}`, provision, 'Reviewed text current through 2026-10-16; eCFR is authoritative but unofficial; linked text may change');
const benzene = source('FDA: Benzene in beverages',
  'https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages', 'Questions 3–5; historical beverage survey');
const mei = source('FDA: Questions & Answers About 4-MEI',
  'https://www.fda.gov/food/food-additives-petitions/questions-answers-about-4-mei', 'Formation, animal studies and FDA response');
const benzeneConcern = Object.freeze({ source: benzene,
  text: 'FDA describes benzene formation in some beverages containing benzoate salts and vitamin C, encouraged by heat and light. Its historical survey did not indicate a consumer safety concern at the levels found. These tags do not establish benzene in this product.' });
const entries = {
  E150d: { function: 'Coloring — gives foods a brown color.', functionSource: types,
    concern: { source: mei, text: 'Class IV caramel can contain the manufacturing byproduct 4-MEI. FDA reports lung tumors in mice and reproductive/developmental effects in rats at doses far above estimated food exposure. FDA does not recommend dietary changes over 4-MEI. The amount in this product is unknown.' } },
  E202: { function: 'Preservative — helps prevent spoilage.', functionSource: types },
  E211: { function: 'Preservative — limits microbial growth.', functionSource: types, concern: benzeneConcern,
    regulation: { source: cfr('184.1733', '(b)–(e)'), text: 'This US provision describes antimicrobial/flavor uses under good manufacturing practice, with current usage resulting in a maximum of 0.1% in food. It requires specifications and does not establish GRAS for significantly different use conditions. Prior-sanction qualifications also apply; this is not a product compliance check.' } },
  E300: { function: 'Antioxidant — helps limit oxidation; also used as vitamin C.', functionSource: inventory('ASCORBICACID'), concern: benzeneConcern },
  E322: { function: 'Emulsifier — helps ingredients mix and stay mixed.', functionSource: inventory('LECITHIN') },
  E330: { function: 'Acidity regulator — helps control acidity.', functionSource: types,
    regulation: { source: cfr('184.1033', '(b)–(d)'), text: 'This US provision describes food use under good manufacturing practice, subject to identity and purity specifications and prior-sanction qualifications. It does not verify this product’s use or compliance.' } },
  E415: { function: 'Thickener and stabilizer — helps maintain texture.', functionSource: types,
    regulation: { source: cfr('172.695', '(a)–(f), especially (e)–(f)'), text: 'This US provision permits specified texture-related uses under good manufacturing practice where food standards do not preclude them. Manufacturing, purity, food-grade labeling and directions conditions apply; product compliance is not established.' } },
  E500ii: { function: 'Leavening agent — helps baked foods rise.', functionSource: inventory('SODIUMBICARBONATE') },
};
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
freeze(entries);
export function getBarcodeAdditiveInformation(identifier) {
  return Object.prototype.hasOwnProperty.call(entries, identifier) ? entries[identifier] : null;
}
