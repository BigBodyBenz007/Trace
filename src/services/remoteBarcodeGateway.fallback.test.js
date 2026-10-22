const { createHandler, lookupRemoteBarcode } = require('../../api/nutrition/_barcodeGateway.cjs');

// Constructed provider-shaped controls: these are not captured product panels.
const BARCODE = '00000000000000';
const OTHER_BARCODE = '00012000001291';
const NOW = Date.parse('2026-10-21T12:00:00.000Z');
const environment = { USDA_FDC_API_KEY: 'test-only-key', OPEN_FOOD_FACTS_USER_AGENT: 'Trace-test/1.0 contact' };
const usdaFood = (overrides = {}) => ({
  fdcId: 10, dataType: 'Branded', gtinUpc: BARCODE, description: 'Exact food', brandOwner: 'Test Brand',
  ingredients: 'OATS, SALT.', servingSize: 30, servingSizeUnit: 'g', householdServingFullText: '30 g',
  modifiedDate: '2026-10-01', foodNutrients: [
    { nutrientName: 'Energy', unitName: 'KCAL', value: 120 },
    { nutrientName: 'Protein', unitName: 'G', value: 4 },
    { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 20 },
    { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 3 },
  ], ...overrides,
});
const offProduct = (overrides = {}) => ({
  code: BARCODE, product_name: 'Exact food', brands: 'Test Brand', ingredients_text: 'OATS, SALT.', lang: 'en',
  serving_size: '30 g', serving_quantity: 30, serving_quantity_unit: 'g', nutrition_data_per: '100g',
  nutriments: { 'energy-kcal_100g': 120, proteins_100g: 4, carbohydrates_100g: 20, fat_100g: 3 }, ...overrides,
});
const upstream = (body, status = 200, retry = null) => ({
  status, ok: status >= 200 && status < 300, body: null,
  headers: { get: name => name.toLowerCase() === 'retry-after' ? retry : null },
  text: async () => JSON.stringify(body),
});
const lookup = options => lookupRemoteBarcode({ barcode: BARCODE, env: environment, now: () => NOW, ...options });

test('default selection keeps the newest USDA record and retains already-fetched older exact editions', async () => {
  const records = [usdaFood({ fdcId: 1, modifiedDate: '2025-01-01' }), usdaFood(),
    usdaFood({ fdcId: 99, gtinUpc: OTHER_BARCODE, modifiedDate: '2027-01-01' }),
    usdaFood({ fdcId: 1, modifiedDate: '2024-01-01' })];
  const original = JSON.stringify(records);
  const fetchImpl = jest.fn().mockResolvedValue(upstream({ foods: records }));
  const result = await lookup({ fetchImpl });
  expect(result.food.provider).toMatchObject({ id: 'usda-fdc', recordId: '10' });
  expect(result.alternatives.map(candidate => candidate.food.provider.recordId)).toEqual(['1']);
  expect(result.alternatives[0]).not.toHaveProperty('alternatives');
  expect(result.providerAttempts).toEqual([{ provider: 'usda-fdc', status: 'found' }]);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(records)).toBe(original);
  expect(Object.isFrozen(result.alternatives[0].food)).toBe(true);
});

test('retaining alternatives does not promote an older complete record over the preferred incomplete edition', async () => {
  const newest = usdaFood({ foodNutrients: [] });
  const fetchImpl = jest.fn().mockResolvedValue(upstream({ foods: [newest, usdaFood({ fdcId: 1, modifiedDate: '2025-01-01' })] }));
  const result = await lookup({ provider: 'usda-fdc', fetchImpl });
  expect(result.status).toBe('incomplete');
  expect(result.food.provider.recordId).toBe('10');
  expect(result.alternatives[0]).toMatchObject({ status: 'found', food: { provider: { recordId: '1' } } });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('the usual OFF fallback preserves the losing incomplete USDA edition and provider outcomes', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce(upstream({ foods: [usdaFood({ foodNutrients: [] })] }))
    .mockResolvedValueOnce(upstream({ status: 1, product: offProduct() }));
  const result = await lookup({ fetchImpl });
  expect(result.food.provider.id).toBe('open-food-facts');
  expect(result.alternatives).toHaveLength(1);
  expect(result.alternatives[0]).toMatchObject({ status: 'incomplete', food: { provider: { id: 'usda-fdc' } } });
  expect(result.providerAttempts).toEqual([
    { provider: 'usda-fdc', status: 'incomplete' }, { provider: 'open-food-facts', status: 'found' },
  ]);
});

test('both incomplete outcomes retain the existing preference and the other coherent record', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce(upstream({ foods: [usdaFood({ foodNutrients: [] })] }))
    .mockResolvedValueOnce(upstream({ status: 1, product: offProduct({ nutriments: {} }) }));
  const result = await lookup({ fetchImpl });
  expect(result.status).toBe('incomplete');
  expect(result.food.provider.id).toBe('usda-fdc');
  expect(result.alternatives[0].food.provider.id).toBe('open-food-facts');
});

test.each(['usda-fdc', 'open-food-facts'])('an explicit %s request contacts only that supported provider', async provider => {
  const fetchImpl = jest.fn().mockResolvedValue(provider === 'usda-fdc'
    ? upstream({ foods: [usdaFood()] }) : upstream({ status: 1, product: offProduct() }));
  const result = await lookup({ provider, fetchImpl });
  expect(result.food.provider.id).toBe(provider);
  expect(result.providerAttempts).toEqual([{ provider, status: 'found' }]);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toContain(provider === 'usda-fdc' ? 'api.nal.usda.gov' : 'world.openfoodfacts.org');
});

test.each([
  ['not-found', { status: 0 }, 200, null],
  ['unavailable', { invalid: true }, 200, null],
  ['unavailable', {}, 503, '30'],
  ['rate-limited', {}, 429, '60'],
])('explicit provider preserves %s separately from other-provider availability', async (status, body, httpStatus, retry) => {
  const fetchImpl = jest.fn().mockResolvedValue(upstream(body, httpStatus, retry));
  const result = await lookup({ provider: 'open-food-facts', fetchImpl });
  expect(result).toMatchObject({ status, food: null, providerAttempts: [{ provider: 'open-food-facts', status }] });
  expect(result.retryAfter).toBe(retry || undefined);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('an unconfigured requested provider does not silently query another provider', async () => {
  const fetchImpl = jest.fn();
  const result = await lookup({ provider: 'usda-fdc', env: { OPEN_FOOD_FACTS_USER_AGENT: environment.OPEN_FOOD_FACTS_USER_AGENT }, fetchImpl });
  expect(result).toMatchObject({ status: 'unconfigured', providerAttempts: [{ provider: 'usda-fdc', status: 'unconfigured' }] });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('default failure preference is unchanged while both outcomes remain distinguishable', async () => {
  const fetchImpl = jest.fn().mockResolvedValueOnce(upstream({ foods: [] }))
    .mockResolvedValueOnce(upstream({}, 503));
  const result = await lookup({ fetchImpl });
  expect(result.status).toBe('unavailable');
  expect(result.providerAttempts).toEqual([
    { provider: 'usda-fdc', status: 'not-found' }, { provider: 'open-food-facts', status: 'unavailable' },
  ]);
});

test('retained editions are bounded to three unique alternatives', async () => {
  const foods = Array.from({ length: 8 }, (_, index) => usdaFood({ fdcId: index + 1,
    modifiedDate: `2026-10-${String(index + 1).padStart(2, '0')}` }));
  const result = await lookup({ fetchImpl: jest.fn().mockResolvedValue(upstream({ foods })) });
  expect(result.food.provider.recordId).toBe('8');
  expect(result.alternatives.map(candidate => candidate.food.provider.recordId)).toEqual(['7', '6', '5']);
  expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThanOrEqual(60 * 1024);
});

test('large alternatives are omitted below the transport budget without losing preferred food', async () => {
  const foods = Array.from({ length: 5 }, (_, index) => usdaFood({ fdcId: index + 1,
    description: `Edition ${index + 1} ${'x'.repeat(16000)}`,
    modifiedDate: `2026-10-${String(index + 1).padStart(2, '0')}` }));
  const result = await lookup({ fetchImpl: jest.fn().mockResolvedValue(upstream({ foods })) });
  expect(result.food.provider.recordId).toBe('5');
  expect(result.alternatives.length).toBeLessThan(3);
  expect(result.alternatives.length).toBeGreaterThan(0);
  expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThanOrEqual(60 * 1024);
});

const responseRecorder = () => ({ setHeader: jest.fn(), end(body) { this.body = body; } });
test.each(['usda-fdc', 'open-food-facts'])('handler accepts only the constrained %s selector', async provider => {
  const lookupImpl = jest.fn().mockResolvedValue({ status: 'not-found', identifier: { scheme: 'gtin', value: BARCODE }, food: null });
  const response = responseRecorder();
  await createHandler({ lookup: lookupImpl })({ method: 'POST', headers: { 'content-type': 'application/json' },
    body: { barcode: BARCODE, provider } }, response);
  expect(response.statusCode).toBe(200);
  expect(lookupImpl).toHaveBeenCalledWith({ barcode: BARCODE, provider });
});

test.each([
  { provider: null }, { provider: 'other' }, { provider: ['usda-fdc'] }, { provider: 'usda-fdc', url: 'https://example.com' },
])('handler rejects malformed or unconstrained selector %j', async extra => {
  const lookupImpl = jest.fn(), response = responseRecorder();
  await createHandler({ lookup: lookupImpl })({ method: 'POST', headers: { 'content-type': 'application/json' },
    body: { barcode: BARCODE, ...extra } }, response);
  expect(response.statusCode).toBe(400);
  expect(lookupImpl).not.toHaveBeenCalled();
});
