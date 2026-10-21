// Closed, development-only screening batch. These are Trace policy judgments,
// not Yuka classifications, exposure estimates, legal findings or safety labels.
export const REVIEWED_ON = '2026-10-20';
export const CONCERN_WEIGHTS = Object.freeze({ reviewed: 0, limited: .2, moderate: .5, substantial: 1 });
const source = (publisher, jurisdiction, title, url, edition) =>
  ({ publisher, jurisdiction, title, url, edition, reviewedOn: REVIEWED_ON });
const efsa = (title, doi, edition) => source('EFSA', 'EU', title,
  `https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.${doi}`, edition);
const types = source('FDA', 'US', 'Types of Food Ingredients',
  'https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients',
  'Ingredient function table; undated live page');
const phosphate = source('EFSA', 'EU', 'New advice on phosphates',
  'https://www.efsa.europa.eu/en/press/news/190612', '2019-06-12; assessment 2019.5674');
const nitrite = source('EFSA', 'EU', 'Nitrites and nitrates re-evaluation',
  'https://www.efsa.europa.eu/en/press/news/170615', '2017-06-15; nitrite assessment 2017.4786');
const nci = source('NCI/NIH', 'US', 'Red meat and colorectal DNA damage',
  'https://www.cancer.gov/news-events/cancer-currents-blog/2021/red-meat-colorectal-cancer-genetic-signature', '2021-07-22');
const erythritol = source('NIH', 'US', 'Erythritol and cardiovascular events',
  'https://www.nih.gov/news-events/nih-research-matters/erythritol-cardiovascular-events', '2023-03-14; study doi:10.1038/s41591-023-02223-9');
const erythritolEfsa = source('EFSA', 'EU', 'Erythritol re-evaluation summary',
  'https://www.efsa.europa.eu/en/plain-language-summary/re-evaluation-erythritol-e-968-food-additive', '2023-12-20');
const benzene = source('FDA', 'US', 'Benzene in beverages',
  'https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages',
  'Historical 2005–May 2007 survey; undated live explanation');
const mei = source('FDA', 'US', 'Questions & Answers About 4-MEI',
  'https://www.fda.gov/food/food-additives-petitions/questions-answers-about-4-mei', 'Undated live explanation');
const sucralose = source('EFSA', 'EU', 'Sucralose: current uses and heating uncertainty',
  'https://www.efsa.europa.eu/en/news/efsa-finds-sucralose-safe-when-used-currently-authorised-cannot-confirm-safety-extending-its', '2026-02-17');
const tbhq = source('NTP', 'US', 'TR-459 t-Butylhydroquinone',
  'https://ntp.niehs.nih.gov/publications/reports/tr/tr459', 'May 1997; abstract and conclusions');
const diabetes = source('Salame et al.; Lancet Diabetes & Endocrinology', 'FR',
  'Emulsifiers and type 2 diabetes: NutriNet-Santé', 'https://pubmed.ncbi.nlm.nih.gov/38663950/',
  '2024 May;12(5):339–349; doi:10.1016/S2213-8587(24)00086-X; primary abstract');
const cancer = source('Sellem et al.; PLOS Medicine', 'FR',
  'Emulsifiers and cancer: NutriNet-Santé', 'https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004338',
  '2024-02-13;21(2):e1004338; main results and sensitivity analyses');
const carbonateReview = source('FDA-hosted SCOGS inventory; independent expert committee', 'US',
  'Carbonate salts, SCOGS report 26',
  'https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?order=ASC&search=CARBON&set=SCOGS&sort=Sortsubstance',
  '1975; sodium bicarbonate CAS 144-55-8, calcium carbonate CAS 471-34-1; conclusion type 1; historical inventory summary');
const propionateTrial = source('Adler et al.; BMJ Open Diabetes Research & Care', 'US',
  'Acute effects of the food preservative propionic acid on glucose metabolism in humans',
  'https://pubmed.ncbi.nlm.nih.gov/34312159/',
  '2021-07-26;9:e002336; doi:10.1136/bmjdrc-2021-002336; randomized crossover study');

const records = [];
const add = (id, name, aliases, fn, classification, rationale, sources, evidence, conditions, conflicts, condition = null) => {
  records.push({ id, name, aliases, function: fn, classification,
    weight: classification === null ? null : CONCERN_WEIGHTS[classification], rationale,
    sources, evidence, conditions, conflicts, condition, reviewedOn: REVIEWED_ON });
};
for (const [id, name, aliases] of [
  ['E338', 'Phosphoric acid', ['phosphoric acid']],
  ['E339', 'Sodium phosphates (subtype unspecified)', ['sodium phosphate', 'sodium phosphates']],
  ['E341', 'Calcium phosphates (subtype unspecified)', ['calcium phosphate', 'calcium phosphates', 'tricalcium phosphate']],
]) add(id, name, aliases, 'Acidity/texture control or mineral addition; exact product purpose unconfirmed.', 'limited',
  'Added phosphates receive a limited precautionary weight: total dietary intake can exceed EFSA’s reference in some age groups. This does not establish excess intake from this product.', [phosphate],
  'Integrated toxicology and dietary exposure assessment; kidney effects inform the reference, not a clinical trial of this product.',
  'Added phosphate only, not naturally occurring phosphorus. The 40 mg phosphorus/kg/day group ADI concerns all sources; it excludes moderate/severe kidney impairment.',
  'Phosphorus is essential. Some modeled intakes exceed the ADI; that is not proof of an adverse outcome or a US restriction.');
add('E968', 'Erythritol', ['erythritol'], 'Sweetener.', 'limited',
  'Limited precaution: dose-related laxative effects and an unresolved cardiovascular signal warrant screening; no harmful exposure is established.', [erythritol, erythritolEfsa],
  'Human observational cardiovascular associations, small ingestion study (8 volunteers), platelet experiments and animal thrombosis work; human diarrhoea studies.',
  'Added erythritol. EFSA’s 0.5 g/kg/day ADI addresses diarrhoea; quantity and intake here are unknown.',
  'EFSA found no established causal link between dietary erythritol and cardiovascular disease; circulating levels may not represent dietary intake.');
add('E250', 'Sodium nitrite', ['sodium nitrite'], 'Preservative in cured meat.', 'limited',
  'Limited precaution for explicitly declared nitrite in meat: nitrosamine formation and high-intake uncertainty; not a claim that this package causes cancer.', [nitrite, nci],
  'EFSA toxicology/exposure assessment; NCI describes human meat-pattern associations and possible nitrosation mechanisms, not additive-specific causation.',
  'Applies only when the declaration establishes meat use. Nitrite amount, nitrosamines and exposure remain unknown.',
  'EFSA found low nitrosamine concern from nitrite used at permitted levels and protective ADIs, with a slight exceedance for highly exposed children. Meat-pattern evidence cannot isolate nitrite.', 'meat');
add('E322', 'Lecithins (subtype unspecified)', ['soy lecithin', 'soya lecithin', 'lecithin', 'lecithins'],
  'Emulsifier; helps ingredients mix.', 'reviewed', 'No qualifying concern identified for general food use under this batch policy.',
  [efsa('Lecithins re-evaluation', '2017.4742', '2017-04-07; amended 2021-04-22'), types],
  'Integrated assessment including animal toxicity and choline exposure; no numerical ADI needed at assessed uses.',
  'General grocery use, not individual allergy suitability or a review of infant formula.',
  'Soy/egg allergen suitability remains separate; no claim of universal safety.');
// The general lecithin assessment covers ordinary and partially hydrolysed
// lecithins. Keep explicit subtypes separate; a parent tag is not another dose.
for (const [id, name, aliases] of [
  ['E322i', 'Lecithins', []],
  ['E322ii', 'Partially hydrolysed lecithins', ['partially hydrolysed lecithins', 'partially hydrolyzed lecithins', 'hydrolysed lecithin', 'hydrolyzed lecithin']],
]) records.push({ ...records.find(record => record.id === 'E322'), id, name, aliases });
add('E422', 'Glycerol', ['vegetable glycerin', 'glycerin', 'glycerol'], 'Humectant; retains moisture.', 'reviewed',
  'No qualifying concern identified for refined food-grade glycerol at assessed uses.',
  [efsa('Glycerol re-evaluation', '2017.4720', '2017-03-15'), efsa('Glycerol specification follow-up', '2022.7353', '2022-06-20')],
  'Toxicology/exposure evaluation with follow-up assessment of manufacturing impurities.',
  'Ordinary food-grade use; impurity concentrations and manufacturing conditions here are unknown.',
  'EFSA recommended tighter impurity specifications; this is not evidence of contamination in the product.');
add('E415', 'Xanthan gum', ['xanthan gum'], 'Thickener and stabilizer.', 'limited',
  'Limited precaution for a human observational diabetes signal; it does not establish causation or a harmful amount in this product.',
  [diabetes, efsa('Xanthan gum re-evaluation', '2017.4909', '2017-07-14'), types],
  'French adult prospective cohort, not a trial: diabetes HR 1.08 per 500 mg/day (95% CI 1.02–1.14); animal and short human data in EFSA review.',
  'Chronic dietary additive intake in adults; not evidence about infant thickeners or this package’s dose. No exposure is assigned.',
  'EFSA found no concern at assessed general-food uses. Cohort confounding, intake errors, correlated additives and lack of independent replication limit causal/US extrapolation.');
add('E1200', 'Polydextrose', ['polydextrose'], 'Bulking/texture ingredient.', 'reviewed',
  'No qualifying concern identified at assessed food uses.',
  [efsa('Polydextrose re-evaluation', '2021.6363', '2021-01-08; amended 2021-03-05'), types],
  'Animal toxicity and human gastrointestinal data integrated with exposure estimates; no numerical ADI needed.',
  'Reported food uses; high-dose gastrointestinal effects are not assumed in this package.',
  'EFSA recommended tighter contaminant specifications; no product contaminant measurements are available.');
for (const [id, name, aliases] of [
  ['E211', 'Sodium benzoate', ['sodium benzoate']], ['E212', 'Potassium benzoate', ['potassium benzoate']],
]) add(id, name, aliases, 'Preservative.', 'limited',
  'Conditional limited precaution for benzoate plus vitamin C/erythorbic acid in a beverage: conditions can favor benzene formation.', [benzene],
  'FDA analytical beverage survey and formation explanation, not human disease evidence for this product.',
  'Requires a beverage plus ascorbic/erythorbic acid evidence; heat/light can encourage formation. Missing cofactors remain unresolved.',
  'FDA’s historical survey did not indicate a consumer safety concern; ingredient presence does not establish benzene.', 'benzoate-beverage');
add('E955', 'Sucralose', ['sucralose'], 'Sweetener.', null,
  'Processing-dependent assessment unresolved: the captured declaration does not establish prolonged heating conditions.', [sucralose, types],
  'EFSA integrated assessment and thermal chemistry findings.',
  'Prolonged high-temperature processing is a specific uncertainty, not inferred from a bar or baked-food name.',
  'EFSA confirmed current assessed uses and ADI; could not confirm proposed wider fine-bakery uses. Uncertainty is not demonstrated harm.');
for (const [id, name, aliases] of [
  ['E150c', 'Ammonia caramel (provider-reported class)', []],
  ['E150d', 'Sulphite ammonia caramel (provider-reported class)', []],
  ['caramel-color', 'Caramel color (class unspecified)', ['caramel color', 'caramel colour']],
]) add(id, name, aliases, 'Color.', null, 'No numerical classification: caramel class/byproduct and long-term exposure questions are not resolved here.',
  [mei, types], 'FDA discusses high-dose animal findings for 4-MEI; no human product-specific study.',
  '4-MEI can occur in Class III/IV. Generic caramel color does not establish a class or byproduct amount.',
  'FDA finds no immediate/short-term concern at expected food levels and does not recommend dietary changes. Animal hazard is not measured dietary risk.');
add('E319', 'TBHQ (tert-butylhydroquinone)', ['tbhq', 'tert butylhydroquinone'], 'Antioxidant; delays rancidity.', null,
  'No weight: this batch reviewed the NTP animal report but has not resolved the broader endpoint/exposure evidence.', [tbhq],
  'Rat/mouse feed and genotoxicity studies, not human clinical outcomes.',
  'NTP TR-459 is a historical animal study; dietary concentration in this product is unknown.',
  'No evidence of carcinogenic activity in the two-year studies; high-dose noncancer effects do not establish ordinary dietary risk.');
add('E471', 'Mono- and diglycerides of fatty acids', ['monoglycerides', 'mono and diglycerides'], 'Emulsifier.', 'limited',
  'Limited precaution for prospective human cancer associations; additive-specific causation and product exposure are not established.',
  [cancer, efsa('Mono- and diglycerides re-evaluation', '2017.5045', '2017-11-10'), types],
  'French adult observational cohort: overall cancer HR 1.15 high versus low intake (95% CI 1.04–1.27), with breast/prostate associations; animal toxicology in EFSA review.',
  'Explicitly declared added mono/diglycerides, not naturally occurring fats or every emulsifier. No inference of trans fats or package concentration.',
  'EFSA’s 2017 assessment found no concern at reported uses. Residual confounding, exposure errors and replication needs preclude a causal or individual cancer-risk claim.');
add('E472e', 'DATEM', ['datem'], 'Emulsifier.', 'limited',
  'Limited precaution for an uncertain prospective human diabetes association; this is a screening signal, not demonstrated harm.', [diabetes],
  'French adult cohort: diabetes HR 1.04 per 100 mg/day (95% CI 1.00–1.08, p=0.042), not a randomized trial.',
  'Explicit DATEM use. Reported cohort intake is not assigned to the product or consumer.',
  'Small borderline association, correlated exposures and residual confounding require replication. It neither overturns regulatory assessments nor establishes a harmful dose.');
add('E500ii', 'Sodium hydrogen carbonate (baking soda)', ['baking soda', 'sodium bicarbonate', 'sodium hydrogen carbonate'],
  'Leavening agent.', 'limited',
  'Limited precaution for a population-specific observational signal, not established harm from baking soda or this product.', [cancer, carbonateReview],
  'The 2024 French cohort explicitly names sodium bicarbonate (reported as E500): premenopausal breast-cancer subgroup HR 1.48 (95% CI 1.07–2.05). This is not a general-population result or a causal experiment.',
  'The existing limited-precaution tier screens the reported subgroup signal; it does not assume the user belongs to that subgroup. No intake, exposure or individual risk is inferred. Generic E500 and other carbonates do not acquire this finding.',
  'Subgroup analyses, multiple testing, confounding and intake measurement limit inference; independent replication is needed. FDA-hosted SCOGS report 26 (1975) records a no-hazard-concern conclusion for then-current/expected uses. That historical assessment is not a review of the 2024 signal.');
add('E282', 'Calcium propionate', ['calcium propionate'], 'Preservative.', 'limited',
  'Limited precaution for short-term human metabolic effects; chronic disease or harmful product exposure has not been demonstrated.',
  [propionateTrial, efsa('Propionic acid and propionates re-evaluation', '2014.3779', '2014-07-22; abstract and conclusions')],
  'Randomized placebo-controlled crossover study in 28 healthy adults using 1500 mg calcium propionate: acute counterregulatory hormone changes, with increased endogenous glucose production under induced hypoglycemia. These are surrogate responses, not diabetes outcomes.',
  'Explicit calcium propionate only. The experimental dose and clamp conditions are not assigned to a food or consumer; no extrapolation to naturally produced gut propionate or every propionate salt.',
  'Small acute study; long-term dietary clinical relevance is unresolved. EFSA 2014 found no concern at assessed maximum food-use concentrations; the trial does not establish that ordinary consumption causes disease.');

// Identity/function review only. Specific uncompleted assessment stays null,
// rather than zero on the strength of food-use permission or a familiar name.
for (const [id, name, aliases, fn, gap] of [
  ['E200', 'Sorbic acid', ['sorbic acid'], 'Preservative.', 'Current integrated scientific assessment not completed in this batch.'],
  ['E202', 'Potassium sorbate', ['potassium sorbate'], 'Preservative.', 'Current integrated scientific assessment not completed in this batch.'],
  ['E951', 'Aspartame', ['aspartame'], 'Sweetener.', 'Hazard/exposure and phenylketonuria conditions need a dedicated synthesis; not scored from permission.'],
  ['E960-unspecified', 'Stevia sweetener (form unspecified)', ['stevia sweetener'], 'Sweetener.', 'Exact steviol preparation is unspecified; no subtype is invented.'],
  ['E160b-unspecified', 'Annatto extract (type unspecified)', ['annatto extract color', 'annatto extract'], 'Color.', 'Bixin/norbixin preparation and assessment scope are unresolved.'],
  ['E170', 'Calcium carbonate', ['calcium carbonate'], 'Mineral source / other technical use.', 'Fortification and purity questions remain unresolved; the EFSA technological-additive assessment is not a blanket review of calcium fortification.'],
  ['E500', 'Sodium carbonates (subtype unspecified)', ['sodium carbonates'], 'Acidity control / leavening.', 'The parent group does not establish bicarbonate; no transfer of a subtype-specific association.'],
  ['E500i', 'Sodium carbonate', ['sodium carbonate'], 'Acidity control.', 'Distinct from sodium bicarbonate; its scientific screen remains incomplete.'],
  ['E500iii', 'Sodium sesquicarbonate', ['sodium sesquicarbonate'], 'Acidity control.', 'Distinct carbonate subtype; no bicarbonate finding is transferred.'],
  ['E300', 'Ascorbic acid', ['ascorbic acid', 'vitamin c'], 'Antioxidant/nutrient.', 'No independent weight; benzoate interaction is evaluated once on the benzoate.'],
  ['E315', 'Erythorbic acid', ['erythorbic acid'], 'Antioxidant.', 'No independent weight; benzoate interaction is evaluated once on the benzoate.'],
  ['E330', 'Citric acid', ['citric acid'], 'Acidity control.', 'Scientific screen incomplete; citric acid is not vitamin C.'],
  ['caffeine', 'Caffeine', ['caffeine'], 'Stimulant/flavor ingredient.', 'Population/dose-dependent effects not assigned a general additive weight in this batch.'],
  ['flavor-mixture', 'Flavor mixture (constituents unspecified)', ['natural flavors', 'natural flavor', 'artificial flavor', 'flavors', 'flavor'], 'Flavor.', 'Constituents are not named; no speculative identities.'],
  ['modified-starch', 'Modified starch (type unspecified)', ['modified potato starch', 'modified food starch', 'modified cornstarch'], 'Texture ingredient.', 'Modification type is unspecified; do not infer an E-number.'],
  ['hydrogenated-oil', 'Hydrogenated oil (extent unspecified)', ['hydrogenated vegetable oil'], 'Texture/stability.', 'Do not infer partially hydrogenated oil or trans-fat exposure.'],
  ['BHT', 'BHT', ['bht', 'butylated hydroxytoluene'], 'Antioxidant.', 'Packaging statement is not food presence; migration/scientific assessment not completed.'],
]) add(id, name, aliases, fn, null, gap, [types], 'Identity/function evidence only; insufficient scientific synthesis for a weight.',
  'General batch screen; no concentration, subtype or exposure is assumed.', 'No numerical inference from authorization, foreign restrictions, allergy suitability or review activity.');
const calcium = records.find(record => record.id === 'E170');
calcium.sources = [carbonateReview, efsa('Calcium carbonate follow-up', '2023.8106', '2023-07-27; sections 1.1.3 and 4')];
calcium.evidence = 'EFSA 2023 found no concern for calcium carbonate per se at reported technological uses, but flagged aluminium impurity exposure. Its assessment explicitly excludes safety as a calcium fortificant/supplement. Historical SCOGS report 26 records conclusion type 1.';
calcium.conditions = 'The Teddy declaration calls this a source of calcium. Do not transfer the technological-use conclusion to a completed fortification review, or infer an aluminium level in this package.';
calcium.conflicts = 'No measured contaminants or total calcium exposure; neither a contaminant penalty nor an unconditional zero-concern classification is supported here.';

const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export const ADDITIVE_SCREENING_POLICY = freeze(records);
export const findScreeningRecord = id => records.find(record => record.id === id) || null;

// Closed vocabulary of ordinary foods and nutritional fortificants in this batch.
// Unknown residual text is retained, never treated as an innocuous ingredient.
const ORDINARY_INGREDIENTS = new Set((
  'water|carbonated water|high fructose corn syrup|rice|sugar|salt|sea salt|malt flavor|iron|niacinamide|niacin|reduced iron|' +
  'vitamin b6|pyridoxine hydrochloride|vitamin b2|riboflavin|vitamin b1|thiamine hydrochloride|thiamine mononitrate|thiamin mononitrate|' +
  'folic acid|vitamin d|vitamin b12|whole grain wheat|grade a pasteurized skimmed milk|skimmed milk|live active yogurt cultures|' +
  'l bulgaricus|s thermophilus|l acidophilus|bifidus|l casei|whey protein isolate|milk protein isolate|almonds|cocoa butter|' +
  'roasted peanuts|soy protein isolate|chicory root extract|semisweet chocolate chips|chocolate liquor|vegetable oils|vegetable oil|' +
  'palm|palm kernel|canola|peanut|corn syrup|whey protein concentrate|fructose|peanut butter|peanuts|cocoa|rice starch|corn starch|' +
  'whole wheat|whole wheat flour|cracked whole wheat|dried cane syrup|expeller pressed canola oil|wheat gluten|molasses|' +
  'cultured whole wheat|yeast|enriched wheat flour|flour|soybean oil|malted barley flour|whey|milk|cottonseed|soybean|rapeseed oil|' +
  'seasoned rice|cooked enriched white rice|enriched rice|white rice|tomato paste|onions|garlic|spices|carrot juice concentrate|' +
  'corn oil|paprika|tomato puree|cooked pasta|semolina wheat flour|cooked beef|low moisture part skim mozzarella cheese|' +
  'cultured part skim milk|enzymes|dry curd cottage cheese|cultured skim milk|part skim mozzarella cheese|cultured milk|' +
  'nonfat milk|soy sauce|soybeans|wheat|wheat flour|dried onions|parmesan cheese|garlic powder|mechanically separated turkey|' +
  'mechanically separated chicken|pork|cultured dextrose|dextrose|distilled white vinegar|cultured celery juice|cherry powder|' +
  'pork with ham|unbleached enriched flour|palm oil|canola oil|chocolate|potatoes|corn|sunflower oil|graham flour|whole grain wheat flour|' +
  'honey|maltodextrin|cheese made with skim milk|cheese cultures|paprika extract color|soy|processed with alkali|source of calcium|' +
  'enriched flour|skim milk|whey protein|ham|leavening'
).split('|'));

const normalize = value => value.toLowerCase().replace(/[.*#]/g, ' ').replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
const aliases = records.flatMap(record => [...record.aliases, record.id.toLowerCase()].map(alias =>
  ({ record, alias: normalize(alias) }))).sort((a, b) => b.alias.length - a.alias.length);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliasRegex = alias => new RegExp(`\\b${escape(alias)}\\b`, 'g');

export function screenIngredientDeclaration(original, providerItems = []) {
  const raw = typeof original === 'string' ? original : '';
  const findings = new Map(), unresolved = [], warnings = [], ordinary = [], negated = new Set();
  const addFinding = (id, origin, options = {}) => {
    if (!findings.has(id)) findings.set(id, { id, record: findScreeningRecord(id), origins: [], ...options });
    const finding = findings.get(id);
    finding.origins.push(origin);
    if (options.conditionalPresence) finding.conditionalPresence = true;
    if (options.packagingOnly) finding.packagingOnly = true;
  };
  const usable = raw.trim().length > 0;
  let declaration = raw.replace(/^\s*(?:#+\s*)?ingredients\s*:?\s*/i, '')
    .replace(/\bcontains\s*:[\s\S]*$/i, '').replace(/\bpeanut free\.?\s*$/i, '');
  // A packaging statement is a different use. Retain it without asserting BHT
  // in the food, or treating unmeasured migration as a dietary exposure.
  declaration = declaration.replace(/\bbht is added to the packaging material to preserve freshness\.?/ig, match => {
    addFinding('BHT', { type: 'packaging-declaration', text: match }, { packagingOnly: true }); return '';
  });
  const stack = [];
  for (const char of declaration) {
    if ('([{'.includes(char)) stack.push(char);
    else if (')]}'.includes(char) && stack.pop() !== { ')': '(', ']': '[', '}': '{' }[char]) warnings.push('Unbalanced ingredient subgroups.');
  }
  if (stack.length || /,\s*$|\.\.\.|\bomitted\b|\bincomplete\b/i.test(declaration)) warnings.push('Ingredient declaration may be truncated or incomplete.');
  // Flatten only delimiters. Nested contents are still screened. This is a
  // conservative closed phrase recognizer, not a general ingredient parser.
  for (const part of declaration.split(/[,()[\]{};]+/)) {
    let residual = normalize(part).replace(/^(?:and |or |and\/or )/, '')
      .replace(/^(?:contains )?(?:less than |2% or less of:?\s*)/, '')
      .replace(/^2% of\s*/, '').replace(/\borganic\b/g, '').trim();
    if (!residual) continue;
    if (ORDINARY_INGREDIENTS.has(residual)) { ordinary.push(residual); continue; }
    const conditionalPresence = /\band\/or\b|\bor\b/.test(residual);
    for (const { record, alias } of aliases) {
      const re = aliasRegex(alias);
      if (!re.test(residual)) continue;
      const negative = new RegExp(`(?:\\bno |\\bwithout |\\bdoes not contain )${escape(alias)}\\b|\\b${escape(alias)} free\\b`);
      if (negative.test(residual)) { negated.add(record.id); residual = residual.replace(negative, ' '); continue; }
      addFinding(record.id, { type: 'ingredient-text', text: part.trim() }, { conditionalPresence });
      residual = residual.replace(aliasRegex(alias), ' ');
    }
    residual = residual.replace(/\b(?:to extend freshness|to prevent separation|to protect taste|for freshness)\b/g, ' ')
      .replace(/\b(?:with|and\/or|and|or)\b/g, '|').replace(/\s+/g, ' ').trim();
    for (const phrase of residual.split('|').map(s => s.trim()).filter(Boolean)) {
      if (ORDINARY_INGREDIENTS.has(phrase)) ordinary.push(phrase);
      else unresolved.push(`Unreviewed ingredient phrase: ${phrase}`);
    }
  }
  for (const item of providerItems) {
    addFinding(item.standardizedIdentifier || item.providerIdentifier,
      { type: 'provider-tag', identifier: item.providerIdentifier, provider: item.source });
  }
  // Fold only a documented parent/child overlap, never siblings. With multiple
  // subtypes, retain the broad evidence on each as non-corroborating provenance;
  // it cannot establish which subtype a generic text phrase describes.
  for (const [parent, children] of [['E322', ['E322i', 'E322ii']], ['E500', ['E500i', 'E500ii', 'E500iii']]]) {
    const broad = findings.get(parent), present = children.filter(id => findings.has(id));
    if (negated.has(parent)) present.forEach(id => negated.add(id));
    if (!broad || !present.length) continue;
    for (const id of present) {
      const child = findings.get(id);
      child.origins.push(...broad.origins.map(origin => ({ ...origin, groupedFrom: parent,
        ambiguousParent: present.length > 1 || (origin.type === 'ingredient-text' && (parent === 'E500' || id === 'E322ii')) })));
      if (broad.conditionalPresence) child.conditionalPresence = true;
    }
    findings.delete(parent);
  }
  for (const id of negated) if (findings.has(id)) {
    findings.get(id).conflict = true;
    warnings.push(`Conflicting ingredient negation and presence evidence: ${id}.`);
  }
  for (const finding of findings.values()) {
    if (usable && !finding.origins.some(origin => origin.type !== 'provider-tag' && !origin.ambiguousParent)) {
      finding.conflict = true;
      warnings.push(`Provider identity ${finding.id} is not corroborated in the available declaration.`);
    }
  }
  // Generic caramel color does not establish Class III/IV. Retain the exact
  // provider class and mark the declaration's unspecified identity separately.
  const items = [...findings.values()].map(finding => {
    const { record } = finding;
    let weight = record?.weight ?? null, conditionResult = 'not-conditional';
    if (record?.condition === 'meat') {
      conditionResult = ordinary.some(phrase => /\b(?:pork|beef|turkey|chicken|ham|meat)\b/i.test(phrase)) ? 'meat-use-established' : 'meat-use-unresolved';
      if (conditionResult === 'meat-use-unresolved') weight = null;
    }
    if (record?.condition === 'benzoate-beverage') {
      // Citric acid is not vitamin C; generic fruit/juice may supply vitamin C
      // naturally, so missing an explicit acid is not proof of no cofactor.
      const beverage = ordinary.includes('carbonated water');
      const cofactor = findings.has('E300') || findings.has('E315');
      conditionResult = beverage && cofactor ? 'beverage-and-cofactor-established' : 'beverage-or-cofactor-unresolved';
      if (conditionResult.endsWith('unresolved')) weight = null;
    }
    if (finding.conflict || finding.conditionalPresence || finding.packagingOnly) weight = null;
    return { ...finding, concernBurden: weight, conditionResult,
      classification: weight === null ? null : record.classification };
  });
  return { usable, items, ordinary: [...new Set(ordinary)], unresolved: [...new Set(unresolved)], warnings: [...new Set(warnings)],
    knownConcern: Math.min(1, items.reduce((sum, item) => sum + Math.round((item.concernBurden ?? 0) * 10), 0) / 10) };
}
