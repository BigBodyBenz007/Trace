import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NutritionPage from './NutritionPage';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { appendNutritionEntry, readNutritionEntries, updateStoredNutritionEntry } from '../services/nutritionEntryStorage';

const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const captured = fs.readFileSync(path.join(__dirname, '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const row = captured.find(r => r.barcode === '0856312002757');
const food = normalizeOpenFoodFactsProduct(row.responses.find(r => r.body?.product).body.product, row.barcode, row.capturedAt);
const lookup = {status: 'found', identifier: {scheme: 'gtin', value: row.barcode}, food,
  providerAttempts: [{provider: 'usda-fdc', status: 'not-found'}, {provider: 'open-food-facts', status: 'found'}]};
const oldEnvironment = process.env.NODE_ENV, oldScroll = window.scrollTo;
beforeEach(() => {window.scrollTo = jest.fn(); window.history.replaceState({}, '', '/?barcodeGrading=1');});
afterEach(() => {process.env.NODE_ENV = oldEnvironment; window.scrollTo = oldScroll; window.history.replaceState({}, '', '/');});

test.each(['development', 'production'])('%s: captured conflict reaches review and nullable sodium survives fractional save/reopen', async environment => {
  process.env.NODE_ENV = environment;
  // Disposable test-only Map and JSDOM. No installed browser profile or user records.
  const history = {id: 'synthetic-history', name: 'Synthetic historical entry', loggedAt: '2026-10-20T12:00:00Z',
    calories: 100, protein: 2, carbohydrates: 20, fat: 1, sodium: 3, notes: ''};
  const values = new Map([['nutritionEntries', JSON.stringify([history])]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  const fetchImpl = jest.fn().mockResolvedValue({ok: true, headers: {get: () => null}, text: async () => JSON.stringify(lookup)});
  const service = createRemoteBarcodeLookup({storage, fetchImpl, clock: () => Date.parse('2026-10-22T12:00:00Z'),
    localLookup: () => ({status: 'not-found'}), runtime: () => ({isWeb: true, isOnline: true})});
  const props = {onBack: jest.fn(), nutritionEntries: [history],
    nutritionGoals: {calories: 0, protein: 0, carbohydrates: 0, fat: 0},
    saveNutritionEntry: entry => appendNutritionEntry(storage, entry, {createId: () => 'new-conflict-entry'}).status === 'saved',
    updateNutritionEntry: (id, entry) => updateStoredNutritionEntry(storage, id, entry).status === 'saved',
    deleteNutritionEntry: jest.fn(), saveNutritionGoals: jest.fn(), saveUserFood: jest.fn(),
    barcodeLookupService: service, lifecycleAdapter: {subscribe: () => () => {}}, buttonStyle: {}, inputStyle: {}, containerStyle: {}};
  let view = render(<NutritionPage {...props} />);
  fireEvent.click(screen.getByRole('button', {name: 'Scan Barcode'}));
  fireEvent.change(screen.getByLabelText('Enter barcode manually'), {target: {value: row.barcode}});
  fireEvent.click(screen.getByRole('button', {name: 'Look Up Barcode'}));
  const review = await screen.findByRole('article', {name: 'Barcode product review'}, {timeout: 5000});
  await waitFor(() => expect(within(review).getByLabelText('Unresolved sodium evidence')).toHaveTextContent('Other available nutrition can still be logged'));
  expect(within(review).getByLabelText('Sodium and salt evidence').open).toBe(false);
  expect(within(review).getByLabelText('Sodium and salt evidence')).toHaveTextContent('nutriments.sodium_serving: 0.000288 g');
  expect(within(review).getByLabelText('Sodium and salt evidence')).toHaveTextContent('nutriments.salt_serving: 0.288 g');
  await waitFor(() => expect(within(review).queryByLabelText('Experimental nutrition rating')?.textContent ?? null)
    .toBe(environment === 'development' ? 'Score unavailable' : null));
  expect(within(review).queryByLabelText('Overall assessment status')?.textContent ?? null)
    .toBe(environment === 'development' ? 'Provider sodium and salt disagree. Sodium is unknown until resolved.' : null);
  expect(within(review).queryByLabelText('Experimental nutrition assessment') !== null).toBe(environment === 'development');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', {name: 'Use This Food'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button', {name: 'Use This Food'}));
  const sodium = () => screen.getByLabelText('Sodium (mg)', {selector: 'input[aria-label="Sodium (mg)"]'});
  expect(sodium()).toHaveValue(null);
  fireEvent.change(screen.getByLabelText('Number of servings'), {target: {value: '1.25'}});
  expect(sodium()).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', {name: 'Save Entry'}));
  await waitFor(() => expect(readNutritionEntries(storage).entries).toHaveLength(2));
  const saved = readNutritionEntries(storage).entries.find(e => e.id === 'new-conflict-entry');
  expect(saved.sodium).toBeNull(); expect(saved.nutritionBasis.sodium).toBeNull();
  expect(saved.portion.amount).toBe(1.25);
  expect(saved.foodReference.nutritionConflicts.length).toBe(3);
  expect(saved.foodReference.providerNutritionBasis.nutrients.sodium).toBeCloseTo(.288, 12);
  expect(saved.foodReference.assessmentInputs.datasets[0].observations.find(o => o.nutrient === 'salt').rawValue).toBe(.288);
  expect(saved.nutritionCompleteness.unknownNutrients).toContain('sodium');
  expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|"grade"|scoreReady/);
  view.unmount();
  view = render(<NutritionPage {...props} nutritionEntries={[saved]} />);
  fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
  expect(sodium()).toHaveValue(null);
  fireEvent.change(screen.getByLabelText('Number of servings'), {target: {value: '0.5'}});
  expect(sodium()).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', {name: 'Save Changes'}));
  expect(readNutritionEntries(storage).entries.find(e => e.id === saved.id).sodium).toBeNull();
  expect(readNutritionEntries(storage).entries.find(e => e.id === history.id)).toEqual(history);
  view.unmount();
}, 15000);
