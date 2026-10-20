import { assessAdditiveEvidence, resolveGrainEvidence } from './traceFoodQualityEvidence';
import { normalizeOpenFoodFactsAdditives } from '../services/productAdditives';

const source = { url: 'https://example.org/label', attribution: 'Synthetic attributed ingredient evidence' };
test.each([
  ['Organic whole wheat (organic whole wheat flour, organic cracked whole wheat), water, sugar.', 'whole-grain-first'],
  ['GRAHAM FLOUR (WHOLE GRAIN WHEAT FLOUR), ENRICHED FLOUR, SUGAR.', 'whole-grain-first'],
  ['Whole grain wheat. bht is added to the packaging material to preserve freshness.', 'whole-grain-first'],
  ['Enriched wheat flour (flour, niacin), water, whole wheat flour.', 'refined-grain-first'],
  ['Wheat flour, water.', 'refined-grain-first'],
  ['Sugar, whole wheat flour.', 'not-established'],
  ['Whole wheat flour...', 'not-established'],
  ['Whole wheat (incomplete', 'not-established'],
])('first-ingredient evidence: %s', (text, status) => {
  const result = resolveGrainEvidence({ text, language: 'en' }, source);
  expect(result.status).toBe(status);
  expect(result.originalText).toBe(text);
});
test('whole-grain evidence retains attribution without inventing a percentage', () => {
  const result = resolveGrainEvidence({ text: 'Whole grain wheat.', language: 'en' }, source);
  expect(result.source).toMatchObject(source);
  expect(result.percentage).toBeNull();
});
test('unknown language, missing text and missing provenance earn no grain credit', () => {
  expect(resolveGrainEvidence({ text: 'whole wheat', language: 'fr' }, source).status).toBe('not-established');
  expect(resolveGrainEvidence({}, source).status).toBe('not-established');
  expect(resolveGrainEvidence({ text: 'whole wheat' }).status).toBe('not-established');
});
test.each([
  [undefined, 'not-collected'],
  [{ status: 'unknown', source: 'open-food-facts', items: null }, 'unknown'],
  [normalizeOpenFoodFactsAdditives([]), 'provider-reported-empty'],
  [normalizeOpenFoodFactsAdditives(['en:e322', 'en:e322i', 'en:e211', 'en:unknown']), 'incomplete-assessment'],
])('%s has explicit evidence state, never an invented additive score', (input, status) => {
  const before = JSON.stringify(input);
  const result = assessAdditiveEvidence(input);
  expect(result.status).toBe(status);
  expect(result.additiveScore100).toBeNull();
  expect(result.overallFoodQualityScore100).toBeNull();
  expect(result.organicScore100).toBeNull();
  expect(result.exposure).toBe('unknown');
  expect(result.source).toContain('fda.gov');
  expect(JSON.stringify(input)).toBe(before);
});
test('identified and unknown additives keep separate identity and assessment states', () => {
  const result = assessAdditiveEvidence(normalizeOpenFoodFactsAdditives(['en:e322', 'en:e322i', 'en:e211', 'en:unknown']));
  expect(result.items[0]).toMatchObject({ nameVerified: true, functionAvailable: true, assessment: 'incomplete' });
  expect(result.items[1].nameVerified).toBe(false);
  expect(result.items[2].scientificContextAvailable).toBe(true);
  expect(result.items[3].assessment).toBe('incomplete');
});
