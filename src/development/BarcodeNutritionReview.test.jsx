import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';
import NutritionPage from '../components/NutritionPage';
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import BarcodeNutritionReview, { BarcodeAdditives } from './BarcodeNutritionReview';
const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const { barcodeGradingRecord, BARCODE, RETRIEVED_AT } = require('./__fixtures__/barcodeGrading.cjs');
const originalEnvironment = process.env.NODE_ENV;
const originalScrollTo = window.scrollTo;
const identifier = { scheme: 'gtin', value: BARCODE };
const food = (scenario, barcode = BARCODE) => normalizeOpenFoodFactsProduct({ ...barcodeGradingRecord(scenario), code: barcode }, barcode, RETRIEVED_AT);
const candidate = scenario => createBarcodeNutritionCandidate({ status: 'found', identifier, food: food(scenario) });
const headline = () => screen.queryByLabelText('Experimental overall rating') || screen.getByLabelText('Experimental nutrition rating');
beforeEach(() => { process.env.NODE_ENV = 'development'; window.history.replaceState({}, '', '/?barcodeGrading=1'); localStorage.clear(); window.scrollTo = jest.fn(); });
afterEach(() => { process.env.NODE_ENV = originalEnvironment; window.history.replaceState({}, '', '/'); window.scrollTo = originalScrollTo; });
const camera = { start: jest.fn(async () => ({ devices: [], stop() {} })) };
const lifecycleAdapter = { subscribe: () => () => {} };
function dialog(lookup, onUseFood = jest.fn()) {
  return render(<BarcodeScannerDialog access={{ available: true, message: 'Scan a barcode.', label: 'Scanner beta' }}
    barcodeLookup={{ lookup }} camera={camera} lifecycleAdapter={lifecycleAdapter} onUseFood={onUseFood} onClose={jest.fn()} />);
}
async function lookup(barcode = BARCODE, options) {
  fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: barcode } });
  fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
  return screen.findByRole('article', { name: 'Barcode product review' }, options);
}
test.each(['production', 'test'])('%s runtime cannot expose grading with URL flag', async environment => {
  process.env.NODE_ENV = environment; dialog(jest.fn(async () => ({ status: 'found', food: food() })));
  await lookup(); expect(screen.queryByLabelText('Experimental nutrition rating')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Experimental overall rating')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Product additives')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Use This Food' })).toBeEnabled();
});
test('development without explicit opt-in retains original review', async () => {
  window.history.replaceState({}, '', '/'); dialog(jest.fn(async () => ({ status: 'found', food: food() })));
  await lookup(); expect(screen.queryByLabelText('Experimental nutrition rating')).not.toBeInTheDocument();
});

test('compact review has a single fixed action set, readable name and collapsed secondary nutrition', async () => {
  const archive = require('../services/__fixtures__/manufacturerProviderLookups.json');
  const result = archive.observations.find(row => row.request.body.barcode === '888849000012').response;
  dialog(jest.fn(async () => result));
  const article = await lookup('888849000012', { timeout: 5000 });
  expect(within(article).getByRole('heading')).toHaveTextContent('Quest · Chocolate Chip Cookie Dough Protein Bar');
  expect(screen.getByRole('button', { name: 'Use This Food' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Scan Again' })).toBeEnabled();
  expect(within(article).queryByRole('button', { name: 'Use This Food' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Return to Food Search' })).toHaveLength(1);
  expect(within(article).getByText('220 mg')).not.toBeVisible();
  fireEvent.click(screen.getByText('More nutrition & provider details'));
  expect(within(article).getByText('220 mg')).toBeVisible();
  expect(screen.getByLabelText('Score evidence scope')).toHaveTextContent('manufacturer label');
  expect(screen.getByLabelText('Nutrition sources')).not.toBeVisible();
});

test('incomplete development review preserves disabled saving and specific fixed-footer recovery', async () => {
  const raw = barcodeGradingRecord();
  Object.keys(raw.nutriments).filter(key => key.startsWith('carbohydrates')).forEach(key => delete raw.nutriments[key]);
  const incomplete = normalizeOpenFoodFactsProduct(raw, BARCODE, RETRIEVED_AT);
  dialog(jest.fn(async () => ({ status: 'incomplete', identifier, food: incomplete })));
  await lookup();
  expect(screen.getByRole('button', { name: 'Use This Food' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Complete This Food' })).toBeEnabled();
  expect(screen.getByText('Needed to log: carbohydrates per serving.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Complete This Food' }));
  expect(screen.getByRole('button', { name: 'Save Barcode Food' })).toBeInTheDocument();
  expect(screen.getByLabelText('Carbohydrates (g)')).toHaveValue(null);
});

test('the reviewed almond profile keeps overall and nutrition separate without declaring safety', () => {
 const row=require('../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json').observations.find(r=>r.barcode==='00041570003831');
 render(<><BarcodeNutritionReview candidate={createBarcodeNutritionCandidate(row.lookup)} identifier={row.lookup.identifier}/><BarcodeAdditives candidate={createBarcodeNutritionCandidate(row.lookup)}/></>);
 expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('95/100');
 expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition 95/100');
 expect(screen.getByLabelText('Experimental nutrition rating')).not.toBeVisible();
 expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');
 expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
 expect(screen.getByLabelText('Product additives')).toHaveTextContent('amounts and package contents remain unverified');
});

test('partial ingredient review keeps its provisional number and a concise uncertainty statement', () => {
 render(<><BarcodeNutritionReview candidate={candidate()} identifier={identifier}/><BarcodeAdditives candidate={candidate()}/></>);
 expect(screen.getByLabelText('Experimental overall rating').textContent).toMatch(/^\d+\/100$/);
 expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition');
 expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
 expect(screen.getByLabelText('Opening score summary')).toHaveTextContent('Additive review incomplete');
 expect(screen.getByLabelText('Product additives')).toHaveTextContent('Unfamiliar ingredients are not automatically concerning');
 expect(screen.queryByLabelText('Possible overall range')).not.toBeInTheDocument();
});

test('missing ingredient evidence retains nutrition-only rather than an invented overall assessment', () => {
  const original = candidate(); const c = { ...original, display: { ...original.display, ingredients: null } };
  render(<BarcodeNutritionReview candidate={c} identifier={identifier} />);
  expect(screen.queryByLabelText('Experimental overall rating')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Overall assessment status')).toHaveTextContent('Nutrition-only');
});

test('a real nitrite finding shows its deduction and limitations with the provisional number visible', () => {
  const archive = require('../../docs/barcode-grading-grocery-pilot-2026-10-20/follow-up-results.json');
  const row = archive.observations.find(r => r.barcode === '00037600138727');
  const saved = require('../../docs/trace-nutrition-v2-comparison-2026-10-20.json').products.find(p => p.barcode === row.barcode);
  const copy = JSON.parse(JSON.stringify(row.lookup));
  const approved = saved.after.evidence.originalDataset;
  const retained = copy.food.assessmentInputs.datasets.find(d => d.id === approved.id);
  for (const entry of retained.observations) {
    const verified = approved.observations.find(o => o.field === entry.field);
    expect(entry.rawValue).toEqual(verified.rawValue); expect(entry.enteredUnit).toBe(verified.enteredUnit);
    entry.derivation = verified.derivation;
  }
  const c = createBarcodeNutritionCandidate(copy);
  render(<BarcodeNutritionReview candidate={c} identifier={row.lookup.identifier} />);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('20/100');
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition 21/100');
  expect(screen.getByLabelText('Additive score effect')).toHaveTextContent('1-point additive adjustment');
  expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
  expect(screen.getByLabelText('Additive deduction reasons')).toHaveTextContent('nitrite in processed meat');
  expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Additive score effect')).toHaveTextContent('1-point additive adjustment');
});

test('captured USDA Teddy keeps provider rounding in evidence and explains the partial correction', () => {
 const row=require('../services/__fixtures__/manufacturerProviderLookups.json').observations.find(row=>row.request.body.barcode==='044000045586').response;
 const c=createBarcodeNutritionCandidate(row);render(<BarcodeNutritionReview candidate={c} identifier={row.identifier}/>);
 expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('20/100');
 expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
 expect(screen.getByLabelText('Manufacturer label correction')).toHaveTextContent('7 g added and total sugars per 30 g');
 expect(screen.getByLabelText('Manufacturer label correction')).toHaveTextContent('Other logged nutrients remain provider values, not independently verified');
 expect(screen.getByLabelText('Score evidence scope')).toHaveTextContent('Score: manufacturer reference');
 expect(c.selection.remote.nutrients).toEqual(row.food.nutrients);
 expect(c.display.nutrients.calories).toBe(row.food.nutrients.calories);
 expect(c.display.nutrients.addedSugar).toBe(7);expect(c.display.nutrients.totalSugar).toBe(7);
});

test('actual Teddy separates the reference score from corrected logging without technical dumps', () => {
 const row=require('../../docs/trace-nutrition-v2-teddy-2026-10-20.json');const c=createBarcodeNutritionCandidate(row.lookup);
 render(<><BarcodeNutritionReview candidate={c} identifier={row.lookup.identifier}/><BarcodeAdditives candidate={c}/></>);
 expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('20/100');
 expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition 20/100');
 const opening=screen.getByLabelText('Opening score summary');expect(within(opening).getAllByRole('listitem')).toHaveLength(3);
 expect(opening).toHaveTextContent('Added sugars lower the score');expect(opening).toHaveTextContent('Whole grains help');
 expect(opening).not.toHaveTextContent(/baking soda|premenopausal|HR 1.48/);
 expect(screen.getByLabelText('Score evidence scope')).toHaveTextContent('other values from provider');
 expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');
 fireEvent.click(screen.getByText('Why this score'));expect(screen.getByLabelText('Experimental nutrition rating')).toBeVisible();
 expect(screen.getByLabelText('Why this score')).not.toHaveTextContent(/policy|grade=null|proteinApplied|raw deduction|2.1 g/i);
 expect(c.selection.remote.nutrients.addedSugar).toBe(2.1);expect(c.selection.nutrients.addedSugar).toBe(7);
 fireEvent.click(screen.getByText('Additives · 2 provider-reported groups'));
 const additive=screen.getByLabelText('Product additives');expect(additive).toHaveTextContent('Baking soda');expect(additive).toHaveTextContent('Lecithins');
 expect(additive).not.toHaveTextContent(/premenopausal|HR 1.48|fortification|classification|en:e322/i);
});

test.each(['development', 'production'])('manufacturer correction reaches review and Use This Food without exposing grading in %s', async environment => {
  process.env.NODE_ENV = environment;
  const archive = require('../../docs/trace-nutrition-v2-teddy-2026-10-20.json');
  const onUseFood = jest.fn(() => true);
  dialog(jest.fn(async () => archive.lookup), onUseFood);
  await lookup(archive.barcode, { timeout: 5000 });
  expect(screen.queryByLabelText('Experimental overall rating')?.textContent || null).toBe(environment === 'development' ? '20/100' : null);
  expect(Boolean(screen.queryByLabelText('Experimental nutrition assessment'))).toBe(environment === 'development');
  expect(screen.queryByLabelText('Score evidence scope')?.textContent.includes('other values from provider') || false).toBe(environment === 'development');
  expect(within(screen.getByRole('article', { name: 'Barcode product review' })).getAllByText('7 g')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  const selected = onUseFood.mock.calls[0][0];
  expect(selected.nutrients).toEqual({ ...archive.lookup.food.nutrients, addedSugar: 7 });
  expect(selected.remote.nutrients.addedSugar).toBe(2.1);
  expect(selected.nutritionCorrection.source.updatedOn).toBe('2023-12-14');
  expect(JSON.stringify(selected)).not.toMatch(/nutritionScore100|overallScore100|reviewedManufacturerLabel/);
});

test('a supported finding remains visible when rounding leaves the displayed score unchanged', () => {
 const row=require('../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json').observations.find(r=>r.barcode==='00049000000443');
 const c=createBarcodeNutritionCandidate(row.lookup);render(<BarcodeNutritionReview candidate={c} identifier={row.lookup.identifier}/>);
 expect(screen.getByLabelText('Additive score effect')).toHaveTextContent('too small to change the whole-number score');
 expect(screen.getByLabelText('Additive deduction reasons')).toHaveTextContent('total dietary intake matters');
 expect(screen.queryByLabelText('Additive calculation')).not.toBeInTheDocument();
});
test('product switching resets disclosures and never transfers an earlier score', async () => {
  const onUseFood = jest.fn(); dialog(jest.fn().mockResolvedValueOnce({ status: 'found', food: food() })
    .mockResolvedValueOnce({ status: 'found', food: food('unresolved', '012000001291') }), onUseFood);
  await lookup(); expect(headline().textContent).toMatch(/^\d+\/100$/);
  expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByText(/Additives · 3 provider-reported/));
  expect(screen.getByLabelText('Identified additives')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Scan Again' })); await lookup('012000001291');
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Score unavailable');
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Use This Food' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  expect(JSON.stringify(onUseFood.mock.calls[0][0])).not.toMatch(/nutritionScore100|overallScore100|concernBurden|additiveDeduction|methodVersion|"grade"|scoreReady/);
});
test.each(['unknown-additives', 'empty-additives'])('%s state stays distinct from verified absence', scenario => {
  render(<BarcodeAdditives candidate={candidate(scenario)} />);
  fireEvent.click(screen.getByText(/Additives ·/));
  expect(screen.getByLabelText('Product additives')).toHaveTextContent(scenario === 'empty-additives'
    ? 'does not prove there are no additives' : 'No provider additive list');
});
test('verified names retain source links and unrecognized identities remain neutral', () => {
 render(<BarcodeAdditives candidate={candidate()}/>);fireEvent.click(screen.getByText(/Additives ·/));
 expect(screen.getByLabelText('Identified additives')).toHaveTextContent('Citric acid');
 expect(screen.getByLabelText('Identified additives')).toHaveTextContent('Unrecognized additive');
 expect(screen.getAllByRole('link').some(link=>link.href.includes('eur-lex.europa.eu'))).toBe(true);
 expect(screen.getByLabelText('Product additives')).toHaveTextContent('Unfamiliar ingredients are not automatically concerning');
});

test('short explanations preserve collapsed details, source links and uncertainty', () => {
 render(<><BarcodeNutritionReview candidate={candidate()} identifier={identifier}/><BarcodeAdditives candidate={candidate()}/></>);
 expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('Lowered by');
 expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
 fireEvent.click(screen.getByText(/Additives ·/));expect(screen.getByLabelText('Product additives')).toHaveTextContent('Review incomplete');
 expect(screen.getByRole('link',{name:'Provider ingredients'})).toHaveAttribute('href',candidate().display.sourceUrl);
 expect(screen.getByLabelText('Product additives')).not.toHaveTextContent(/raw|classification|SCOGS|technical effect/i);
});

test('approximate energy evidence stays in the assessment without a customer-facing raw dump', () => {
 const record=barcodeGradingRecord();record.nutriments['energy-kj_100g']=2000;record.nutriments['energy-kj_modifier']='~';
 const c=createBarcodeNutritionCandidate({status:'found',identifier,food:normalizeOpenFoodFactsProduct(record,BARCODE,RETRIEVED_AT)});
 render(<BarcodeNutritionReview candidate={c} identifier={identifier}/>);
 expect(headline().textContent).toMatch(/^\d+\/100$/);expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');
 expect(screen.queryByLabelText('Original energy evidence')).not.toBeInTheDocument();
 expect(c.display.assessmentInputs.datasets.flatMap(d=>d.observations).some(o=>o.rawValue===2000&&o.derivation==='off:modifier:~')).toBe(true);
});

test('ingredient evidence and packaging-only distinctions remain without model internals', () => {
 const record=barcodeGradingRecord();record.ingredients_text='Whole grain wheat. bht is added to the packaging material to preserve freshness.';delete record.nutriments['fruits-vegetables-nuts_100g'];
 const c=createBarcodeNutritionCandidate({status:'found',identifier,food:normalizeOpenFoodFactsProduct(record,BARCODE,RETRIEVED_AT)});
 render(<><BarcodeNutritionReview candidate={c} identifier={identifier}/><BarcodeAdditives candidate={c}/></>);
 expect(screen.getByLabelText('Why this score')).not.toHaveTextContent(/model|points|proteinApplied/i);
 expect(screen.getByLabelText('Identified additives')).toHaveTextContent('packaging only');
 expect(headline().textContent).toMatch(/^\d+\/100$/);expect(c.display.ingredients.text).toBe(record.ingredients_text);
});

test.each(['unknown-additives', 'empty-additives'])('%s preserves provider state while named ingredient screening remains possible', scenario => {
  render(<BarcodeAdditives candidate={candidate(scenario)} />);
  expect(screen.queryByText(/Verified US provision:/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Identified additives')).toHaveTextContent('Citric acid');
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
});
test('unknown market and missing nutrients have concise explanations and no letter ratings', () => {
  const view = render(<BarcodeNutritionReview candidate={candidate('unknown-market')} identifier={identifier} />);
  expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('market is unknown');
  expect(headline().textContent).toMatch(/^\d+\/100$/);
  view.rerender(<BarcodeNutritionReview candidate={candidate('unresolved')} identifier={identifier} />);
  expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('Saturated fat is missing');
  expect(screen.getByLabelText('Experimental nutrition assessment')).not.toHaveTextContent(/Nutri-Score [A-E]\b|Letter:/);
});
test.each(['eligible', 'unresolved'])('%s review preserves real Nutrition handoff, serving math and saved payload', async scenario => {
  const saveNutritionEntry = jest.fn(() => true);
  const props = { onBack: jest.fn(), nutritionEntries: [], nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    saveNutritionEntry, saveNutritionGoals: jest.fn(), barcodeLookupService: { lookup: async () => ({ status: 'found', food: food(scenario) }) },
    barcodeCamera: camera, lifecycleAdapter, buttonStyle: {}, inputStyle: {}, containerStyle: {} };
  const view = render(<NutritionPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' })); await lookup();
  expect(headline().textContent).toMatch(scenario === 'eligible' ? /^\d+\/100$/ : /Score unavailable/);
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  expect(screen.getByLabelText('Calories', { selector: 'input[aria-label="Calories"]' })).toHaveValue(120);
  fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '2' } });
  expect(screen.getByLabelText('Calories', { selector: 'input[aria-label="Calories"]' })).toHaveValue(240);
  fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  expect(saveNutritionEntry.mock.calls[0][0].calories).toBe(240);
  expect(JSON.stringify(saveNutritionEntry.mock.calls[0][0])).not.toMatch(/nutritionScore100|overallScore100|concernBurden|additiveDeduction|methodVersion|"grade"|scoreReady/);
  const saved = { ...saveNutritionEntry.mock.calls[0][0], id: 'saved-synthetic' };
  view.rerender(<NutritionPage {...props} nutritionEntries={[saved]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByLabelText('Number of servings')).toHaveValue(2);
  fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '.5' } });
  expect(screen.getByLabelText('Calories', { selector: 'input[aria-label="Calories"]' })).toHaveValue(60);
});

test('explicit hosted Preview build exposes existing grading and selection without URL flags', async () => {
  const previousPreview = process.env.REACT_APP_TRACE_GRADING_PREVIEW;
  const previousDeployment = process.env.REACT_APP_TRACE_DEPLOYMENT_ENV;
  try {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_TRACE_DEPLOYMENT_ENV = 'preview';
    process.env.REACT_APP_TRACE_GRADING_PREVIEW = 'true';
    window.history.replaceState({}, '', '/');
    dialog(jest.fn(async () => ({ status: 'found', identifier, food: food() })));
    await lookup();
    expect(screen.getByLabelText('Experimental nutrition assessment')).toBeInTheDocument();
    expect(headline()).toBeInTheDocument();
    expect(screen.getByLabelText('Why this score').open).toBe(false);
    expect(screen.getByRole('button', { name: 'Use This Food' })).toBeEnabled();
  } finally {
    if (previousPreview === undefined) delete process.env.REACT_APP_TRACE_GRADING_PREVIEW;
    else process.env.REACT_APP_TRACE_GRADING_PREVIEW = previousPreview;
    if (previousDeployment === undefined) delete process.env.REACT_APP_TRACE_DEPLOYMENT_ENV;
    else process.env.REACT_APP_TRACE_DEPLOYMENT_ENV = previousDeployment;
  }
});


const presentationCases = require('./__fixtures__/barcodePresentationCases.cjs').barcodePresentationCases();
const presentationExpected = {quest:[54,52],dymatize:[41,41],teddy:[20,20],conflicted:[null,null]};
test.each(presentationCases)('$id: concise disclosures preserve the complete assessment and effective food', row => {
 const {assessBarcodeNutrition}=require('./barcodeNutritionAssessment');
 const {assessOverallFoodQuality}=require('./traceOverallFoodQuality');
 const c=createBarcodeNutritionCandidate(row.result),nutrition=assessBarcodeNutrition(c,row.result.identifier),overall=assessOverallFoodQuality(c,nutrition);
 const before=JSON.stringify({c,nutrition,overall});
 render(<><BarcodeNutritionReview candidate={c} identifier={row.result.identifier}/><BarcodeAdditives candidate={c}/></>);
 expect([nutrition.nutritionScore100,overall.overallScore100]).toEqual(presentationExpected[row.id]);
 const section=screen.getByLabelText('Experimental nutrition assessment'),additives=screen.getByLabelText('Product additives');
 expect(section).not.toHaveTextContent(/grade=null|scoreReady|proteinApplied|round\(nutrition|raw deduction|policy:|model:|Unreviewed ingredient phrase/);
 expect(additives).not.toHaveTextContent(/Unreviewed ingredient phrase|closed ordinary|constituents unspecified|concernBurden|weight|conditions:/i);
 expect(within(section).getAllByRole('group',{hidden:true})).toHaveLength(1);expect(within(additives).queryAllByRole('group',{hidden:true})).toHaveLength(0);
 expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');expect(additives).not.toHaveAttribute('open');
 const afterNutrition=assessBarcodeNutrition(c,row.result.identifier);
 expect(JSON.stringify({c,nutrition:afterNutrition,overall:assessOverallFoodQuality(c,afterNutrition)})).toBe(before);
 const copy=section.textContent+' '+additives.textContent;
 expect(copy.trim().split(/\s+/).length).toBeLessThan(220);
});

test('Dymatize keeps identified additives and neutral uncertainty without raw ingredient fragments', () => {
 const row=presentationCases.find(row=>row.id==='dymatize');
 render(<BarcodeAdditives candidate={createBarcodeNutritionCandidate(row.result)}/>);
 const additives=screen.getByLabelText('Product additives');
 expect(additives).toHaveTextContent('Sucralose');
 expect(additives).toHaveTextContent('Review incomplete');
 expect(additives).not.toHaveTextContent('hydrolyzed whey protein isolate');
});

test('conflicted presentation leaves sodium unknown and logging available', () => {
 const row=presentationCases.find(row=>row.id==='conflicted'),c=createBarcodeNutritionCandidate(row.result);
 render(<BarcodeNutritionReview candidate={c} identifier={row.result.identifier}/>);
 expect(headline()).toHaveTextContent('Score unavailable');
 expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('Provider sodium and salt disagree');
 expect(c.selection.nutrients.sodium).toBeNull();expect(c.canUse).toBe(true);
});
