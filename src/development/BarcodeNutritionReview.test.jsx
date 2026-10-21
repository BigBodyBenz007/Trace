import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
async function lookup(barcode = BARCODE) {
  fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: barcode } });
  fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
  return screen.findByRole('article', { name: 'Barcode product review' });
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

test('the reviewed almond profile shows overall and separate nutrition without opening evidence', () => {
  const archive = require('../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json');
  const row = archive.observations.find(r => r.barcode === '00041570003831');
  const c = createBarcodeNutritionCandidate(row.lookup);
  render(<><BarcodeNutritionReview candidate={c} identifier={row.lookup.identifier} /><BarcodeAdditives candidate={c} /></>);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('95/100');
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition 95/100');
  expect(screen.getByLabelText('Overall assessment status')).toHaveTextContent('No bonus');
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Overall assessment evidence')).toHaveTextContent('not independently verified');
});

test('partial ingredient review displays a provisional overall score and keeps nutrition separate', () => {
  render(<BarcodeNutritionReview candidate={candidate()} identifier={identifier} />);
  expect(screen.getByLabelText('Experimental overall rating').textContent).toMatch(/^\d+\/100$/);
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition');
  expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
  expect(screen.getByLabelText('Overall assessment status')).toHaveTextContent('could decrease');
  expect(screen.getByLabelText('Possible overall range')).toHaveTextContent('not a confidence interval');
  expect(screen.getByLabelText('Overall assessment evidence')).toHaveTextContent('No reviewed local identity');
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
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('22/100');
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Nutrition 23/100');
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('additive deduction 1 point');
  expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
  expect(screen.getByLabelText('Additive deduction reasons')).toHaveTextContent('Sodium nitrite');
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Overall assessment evidence')).toHaveTextContent('low nitrosamine concern');
});
test('product switching resets disclosures and never transfers an earlier score', async () => {
  const onUseFood = jest.fn(); dialog(jest.fn().mockResolvedValueOnce({ status: 'found', food: food() })
    .mockResolvedValueOnce({ status: 'found', food: food('unresolved', '012000001291') }), onUseFood);
  await lookup(); expect(headline().textContent).toMatch(/^\d+\/100$/);
  expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByText(/Additives · 3 provider-reported/));
  expect(screen.getByText('Original: en:e330 · open-food-facts')).toBeVisible();
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
    ? 'does not prove the product contains no additives' : 'unavailable or incomplete');
});
test('verified additive names keep original identifiers and name-source attribution without safety claims', () => {
  render(<BarcodeAdditives candidate={candidate()} />); fireEvent.click(screen.getByText(/Additives ·/));
  expect(screen.getAllByText(/Citric acid/i).some(el => el.textContent.includes('Citric acid'))).toBe(true);
  expect(screen.getByText(/Name unknown/)).toBeVisible();
  expect(screen.getAllByRole('link').some(link => link.href.includes('eur-lex.europa.eu'))).toBe(true);
  expect(screen.getByLabelText('Product additives')).toHaveTextContent('Name matching does not establish regulatory authorization');
});

test('explanations and additive functions preserve collapsed details and source uncertainty', () => {
  render(<><BarcodeNutritionReview candidate={candidate()} identifier={identifier} /><BarcodeAdditives candidate={candidate()} /></>);
  expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('This score is lowered by');
  expect(screen.getByLabelText('Experimental nutrition assessment')).not.toHaveTextContent(/Contributing factors:|Favorable factors:/);
  expect(screen.getByLabelText('Experimental nutrition assessment')).toHaveTextContent('not independently verified');
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText(/Additives ·/));
  expect(screen.getAllByText(/Acidity regulator/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Preservative — helps prevent spoilage/).some(el => el.textContent.includes('Preservative'))).toBe(true);
  expect(screen.getByText(/Identity not verified in this reference/)).toBeVisible();
  expect(screen.getByText(/Verified US provision:/)).toHaveTextContent('good manufacturing practice');
  expect(screen.getByLabelText('Product additives')).toHaveTextContent('Reviewed 2026-10-20');
  expect(screen.getByLabelText('Product additives')).toHaveTextContent('Scientific assessment incomplete');
  fireEvent.click(screen.getByText(/Additives ·/));
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
});

test('approximate provider energy remains qualified in collapsed evidence, without replacing entered kcal', () => {
  const record = barcodeGradingRecord();
  record.nutriments['energy-kj_100g'] = 2000;
  record.nutriments['energy-kj_modifier'] = '~';
  const c = createBarcodeNutritionCandidate({ status: 'found', identifier,
    food: normalizeOpenFoodFactsProduct(record, BARCODE, RETRIEVED_AT) });
  render(<BarcodeNutritionReview candidate={c} identifier={identifier} />);
  expect(headline().textContent).toMatch(/^\d+\/100$/);
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Original energy evidence')).not.toHaveAttribute('open');
  expect(screen.getByText(/nutriments.energy-kj_100g: ~2000/)).toHaveTextContent('Qualified approximations retained separately');
});

test('plant percentages are not required and the independent method remains inside collapsed technical details', () => {
  const record = barcodeGradingRecord();
  record.ingredients_text = 'Whole grain wheat. bht is added to the packaging material to preserve freshness.';
  delete record.nutriments['fruits-vegetables-nuts_100g'];
  const c = createBarcodeNutritionCandidate({ status: 'found', identifier,
    food: normalizeOpenFoodFactsProduct(record, BARCODE, RETRIEVED_AT) });
  render(<BarcodeNutritionReview candidate={c} identifier={identifier} />);
  const details = screen.getByLabelText('Score details & limitations');
  expect(details).not.toHaveAttribute('open');
  expect(screen.queryByLabelText('Plant-content evidence')).not.toBeInTheDocument();
  expect(details).toHaveTextContent('Trace US nutrition model');
  expect(details).toHaveTextContent('Independent development calculation');
  expect(headline().textContent).toMatch(/^\d+\/100$/);
  expect(c.display.ingredients.text).toBe(record.ingredients_text);
});

test.each(['unknown-additives', 'empty-additives'])('%s preserves provider state while named ingredient screening remains possible', scenario => {
  render(<BarcodeAdditives candidate={candidate(scenario)} />);
  expect(screen.queryByText(/Verified US provision:/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Ingredient screening evidence')).toHaveTextContent('Citric acid');
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
