import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { createRemoteBarcodeCache } from '../services/remoteBarcodeCache';
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { assessOverallFoodQuality } from './traceOverallFoodQuality';

const { lookupRemoteBarcode } = require('../../api/nutrition/_barcodeGateway.cjs');
// Actual OFF responses from the sample selected before scoring. These are not
// invented nutrition panels or evidence of a current US manufacturer match.
const captures = fs.readFileSync(path.join(__dirname,
  '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8')
  .trim().split('\n').map(JSON.parse);
const originalEnvironment = process.env.NODE_ENV;
const originalScrollTo = window.scrollTo;
const camera = { start: jest.fn(async () => ({ devices: [], stop() {} })) };
const lifecycleAdapter = { subscribe: () => () => {} };

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  window.history.replaceState({}, '', '/?barcodeGrading=1');
  window.scrollTo = jest.fn();
});
afterEach(() => {
  process.env.NODE_ENV = originalEnvironment;
  window.history.replaceState({}, '', '/');
  window.scrollTo = originalScrollTo;
});

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value) };
}

function offlineService(row, storage) {
  const raw = row.responses[0], providerSnapshot = JSON.stringify(raw.body);
  const fetchImpl = jest.fn(async () => {
    const result = await lookupRemoteBarcode({ barcode: row.barcode,
      now: () => Date.parse(row.capturedAt), env: { OPEN_FOOD_FACTS_USER_AGENT: 'Trace-captured-regression' },
      fetchImpl: async () => ({ ok: true, status: raw.httpStatus, headers: { get: () => null },
        text: async () => JSON.stringify(raw.body) }) });
    expect(JSON.stringify(raw.body)).toBe(providerSnapshot);
    return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify(result) };
  });
  return { fetchImpl, service: createRemoteBarcodeLookup({ storage, clock: () => Date.parse(row.capturedAt) + 1000,
    fetchImpl, runtime: { isWeb: true, isOnline: true } }) };
}

async function openReview(service, barcode) {
  const onUseFood = jest.fn(() => true);
  render(<BarcodeScannerDialog access={{ available: true, message: 'Scan a barcode.', label: 'Scanner beta' }}
    barcodeLookup={service} camera={camera} lifecycleAdapter={lifecycleAdapter}
    onUseFood={onUseFood} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: barcode } });
  fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
  await screen.findByRole('article', { name: 'Barcode product review' });
  await screen.findByLabelText('Experimental nutrition rating');
  return onUseFood;
}

test('legacy cache evidence refresh reaches the real development review without touching synthetic history', async () => {
  const row = captures.find(entry => entry.barcode === '00049000000443');
  const legacy = JSON.parse(JSON.stringify(row.lookup));
  delete legacy.food.assessmentInputs;
  const storage = memoryStorage(), history = JSON.stringify([{ id: 'synthetic-history', sodium: 123 }]);
  storage.setItem('nutritionEntries', history);
  createRemoteBarcodeCache({ storage, clock: () => Date.parse(row.capturedAt) })
    .set(row.barcode, legacy);
  const { service, fetchImpl } = offlineService(row, storage);
  const onUseFood = await openReview(service, row.barcode);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('12/100');
  expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  expect(onUseFood.mock.calls[0][0].nutrients).toEqual(row.lookup.food.nutrients);
  expect(JSON.stringify(onUseFood.mock.calls[0][0])).not.toMatch(/nutritionScore100|overallScore100|scoreReady/);
  expect(storage.getItem('nutritionEntries')).toBe(history);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each(['3270190174356', '5449000214799'])(
  'captured numeric energy rounding repair reaches the actual review for %s', async barcode => {
    const row = captures.find(entry => entry.barcode === barcode);
    const snapshot = JSON.stringify(row);
    const { service } = offlineService(row, null);
    const result = await service.lookup(barcode);
    const candidate = createBarcodeNutritionCandidate(result);
    const nutrition = assessBarcodeNutrition(candidate, result.identifier);
    const overall = assessOverallFoodQuality(candidate, nutrition);
    expect(Number.isInteger(nutrition.nutritionScore100)).toBe(true);
    expect(nutrition).toMatchObject({ grade: null, scoreReady: false });
    const onUseFood = await openReview(service, barcode);
    expect(screen.getByLabelText('Experimental nutrition rating'))
      .toHaveTextContent(String(nutrition.nutritionScore100) + '/100');
    expect(screen.queryByLabelText('Experimental overall rating')?.textContent ?? null)
      .toBe(overall.overallScore100 === null ? null : overall.overallScore100 + '/100');
    expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
    expect(onUseFood.mock.calls[0][0].nutrients).toEqual(result.food.nutrients);
    expect(JSON.stringify(row)).toBe(snapshot);
  });

test('a real mixed-dimension soup cannot become a beverage when its reference is unresolved', async () => {
  const row = captures.find(entry => entry.barcode === '0051000000118');
  const { service } = offlineService(row, null);
  const result = await service.lookup(row.barcode);
  const candidate = createBarcodeNutritionCandidate(result);
  const nutrition = assessBarcodeNutrition(candidate, result.identifier);
  expect(nutrition.evidence.category.categories).toEqual(['general']);
  expect(nutrition.nutritionScore100).toBeNull();
  expect(nutrition.reasons.join(' ')).toContain('compatible mass or volume');
  expect(candidate.canUse).toBe(true); // Explicit provider serving can still be logged.
  const onUseFood = await openReview(service, row.barcode);
  expect(screen.getByLabelText('Experimental nutrition rating')).toHaveTextContent('Score unavailable');
  expect(screen.queryByLabelText('Experimental overall rating')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  expect(onUseFood.mock.calls[0][0].nutrients).toEqual(result.food.nutrients);
});

test('a known volume reference retains established category handling despite a separate package mass', async () => {
  const row = captures.find(entry => entry.barcode === '0036632011411');
  const { service } = offlineService(row, null);
  const result = await service.lookup(row.barcode);
  const candidate = createBarcodeNutritionCandidate(result);
  expect(candidate.display.assessmentInputs.datasets.find(d => d.id === 'off-100g').basis).toBe('100ml');
  expect(candidate.display.assessmentInputs.serving).toContainEqual({ field: 'product_quantity_unit', value: 'g' });
  const nutrition = assessBarcodeNutrition(candidate, result.identifier);
  expect(nutrition.evidence.category.categories).toEqual(['beverage']);
  expect(nutrition.nutritionScore100).toBe(44);
});

test('a captured percentage-decorated declaration reaches the real review as provisional, with unknown identities retained', async () => {
  const row = captures.find(entry => entry.barcode === '8850389111352');
  const { service } = offlineService(row, null);
  await openReview(service, row.barcode);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent('8/100');
  expect(screen.getByLabelText('Provisional overall score')).toBeVisible();
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Overall assessment evidence')).toHaveTextContent('nata de coco');
});

test.each([
  ['4056489714392', 95, false], // Ordinary whole food, not a new additive safety assessment.
  ['0021130070121', 2, true], // Fortificant identities still unresolved; nutrition unchanged.
  ['5449000214799', 82, true], // Same existing E338 evidence/weight, now matched in French.
  ['7755073001807', 77, true], // Explicit SIN identities retain unknown scientific weights.
  ['3036811460259', 77, true], // Available ordinary food evidence; truncation remains visible.
])('captured matching repair %s reaches the compact review and preserves food selection', async (barcode, score, provisional) => {
  const row = captures.find(entry => entry.barcode === barcode), original = JSON.stringify(row);
  const { service } = offlineService(row, null);
  const onUseFood = await openReview(service, barcode);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent(score + '/100');
  expect(Boolean(screen.queryByLabelText('Provisional overall score'))).toBe(provisional);
  expect(screen.getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
  const selected = onUseFood.mock.calls[0][0];
  expect(selected.nutrients).toEqual(row.lookup.food.nutrients);
  expect(selected.remote.ingredients).toEqual(row.lookup.food.ingredients);
  expect(JSON.stringify(selected)).not.toMatch(/nutritionScore100|overallScore100|scoreReady/);
  expect(JSON.stringify(row)).toBe(original);
});
