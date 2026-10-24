import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import evidence from './__fixtures__/barcodeServingEvidence.json';
import providerLookups from './__fixtures__/manufacturerProviderLookups.json';
import dymatize from '../development/__fixtures__/dymatizeCocoaPebblesLookup.json';
import { normalizeRemoteFood } from './remoteFoodModel';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { createRemoteBarcodeCache } from './remoteBarcodeCache';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';

const {lookupRemoteBarcode, normalizeUsdaFood, normalizeOpenFoodFactsProduct} = require('../../api/nutrition/_barcodeGateway.cjs');
const barcode = '050400740280', now = () => Date.parse('2026-10-23T20:00:00Z');
const response = body => ({ok: true, status: 200, headers: {get: () => null}, text: async () => JSON.stringify(body)});
const memory = () => {const values = new Map(); return {getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v)};};
const upstream = detail => jest.fn().mockResolvedValueOnce(response(evidence.bun.search.body)).mockResolvedValueOnce(response(detail));
const lookup = fetchImpl => lookupRemoteBarcode({barcode, fetchImpl, now, env: {USDA_FDC_API_KEY: 'test-server-key'}});
const bare = food => ({status: food.logReady ? 'found' : 'incomplete', identifier: {scheme: 'gtin', value: barcode}, food});

test('captured bun search -> exact detail retains original observations and uses one coherent serving panel', async () => {
  const original = JSON.stringify(evidence), fetchImpl = upstream(evidence.bun.detail.body);
  const result = await lookup(fetchImpl), food = result.food;
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(fetchImpl.mock.calls[1][0]).toContain('/food/2678411?');
  expect(food.nutrients).toEqual({calories: 180, protein: 6, carbohydrates: 33, fat: 3, fiber: .975, sodium: 370, totalSugar: 4, addedSugar: null});
  expect(food.nutritionBasis.kind).toBe('provider-serving');
  // The detail's 4.03 g added sugar exceeds its 4 g total. Existing unknown handling is retained.
  expect(food.assessmentInputs.datasets[0].observations).toContainEqual(expect.objectContaining({nutrient:'addedSugar', rawValue:4.03}));
  const search = food.usdaDetails.searchFood;
  expect(search.nutrients.calories).toBeCloseTo(180.05, 10);
  expect(search.nutrients.sodium).toBeCloseTo(369.85, 10);
  expect(search.assessmentInputs.datasets[0].observations).toContainEqual(expect.objectContaining({nutrient:'sodium',rawValue:569,rawUnit:'MG'}));
  expect(normalizeRemoteFood(food)).toEqual(food);
  const candidate = createBarcodeNutritionCandidate(result);
  expect(candidate.display.nutrients).toEqual(food.nutrients);
  expect(candidate.selection.nutrients).toEqual(food.nutrients);
  expect(candidate.selection.remote.usdaDetails).toEqual(food.usdaDetails);
  const assessment = assessBarcodeNutrition(candidate, result.identifier);
  expect(assessment.grade).toBeNull(); expect(assessment.scoreReady).toBe(false);
  expect(assessment.evidence.selectedDatasetId).toBe('usda-label-serving');
  expect(assessment.result.excludedNutrients).toContain('addedSugar');
  expect(assessment.result.normalized.originalNutrients.calories).toBe(180);
  expect(JSON.stringify(evidence)).toBe(original);
});

test.each(['failed', 'different-gtin', 'different-id', 'no-label', 'partial-label'])(
  'constructed control: %s detail preserves usable search panel, without requests to a different provider', async mode => {
    const detail = JSON.parse(JSON.stringify(evidence.bun.detail.body));
    if (mode === 'different-gtin') detail.gtinUpc = '888849000012';
    if (mode === 'different-id') detail.fdcId = 1;
    if (mode === 'no-label') delete detail.labelNutrients;
    if (mode === 'partial-label') detail.labelNutrients = {sodium: {value: 300}};
    const fetchImpl = upstream(detail);
    if (mode === 'failed') fetchImpl.mockReset().mockResolvedValueOnce(response(evidence.bun.search.body)).mockRejectedValueOnce(Error('offline'));
    const result = await lookup(fetchImpl);
    expect(result.food.nutritionBasis.kind).toBe('derived-serving');
    expect(result.food.nutrients.calories).toBeCloseTo(180.05, 10);
    expect(result.food.usdaDetails.status).not.toBe('retrieved');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

test('constructed control: available search serving panel needs no detail request', async () => {
  const fetchImpl = jest.fn().mockResolvedValue(response({foods:[evidence.bun.detail.body]}));
  const result = await lookup(fetchImpl);
  expect(result.food.nutrients.calories).toBe(180);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('old derived cache refreshes once; fresh/reopened cache agree and failed/offline refresh preserves usable food', async () => {
  const result = await lookup(upstream(evidence.bun.detail.body));
  const old = bare(result.food.usdaDetails.searchFood), storage = memory();
  createRemoteBarcodeCache({storage, clock: now}).set(barcode, old);
  const fetchImpl = jest.fn().mockResolvedValue(response(result));
  const service = createRemoteBarcodeLookup({storage, clock: now, fetchImpl, localLookup: () => ({status:'not-found'}), runtime:{isWeb:true,isOnline:true}});
  expect((await service.lookup(barcode)).food).toEqual(result.food);
  expect((await service.lookup('0050400740280')).food).toEqual(result.food);
  const reopened = createRemoteBarcodeLookup({storage, clock:now, fetchImpl, localLookup: () => ({status:'not-found'}), runtime:{isWeb:true,isOnline:true}});
  expect((await reopened.lookup(barcode)).food).toEqual(result.food);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  for (const online of [false,true]) {
    const retained = memory(); createRemoteBarcodeCache({storage:retained,clock:now}).set(barcode,old);
    const failed = jest.fn().mockRejectedValue(Error('offline'));
    const svc = createRemoteBarcodeLookup({storage:retained,clock:now,fetchImpl:failed,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:online}});
    expect((await svc.lookup(barcode)).food).toEqual(old.food);
    expect((await svc.lookup(barcode)).food).toEqual(old.food);
    expect(failed).toHaveBeenCalledTimes(online ? 1 : 0);
  }
});

test.each(evidence.existingControlDetails.body.map(d => [d.gtinUpc,d]))('captured USDA detail %s preserves corrections and powder boundary', async (id, detail) => {
  const captured = id === '705016356201' ? dymatize.lookup : providerLookups.observations.find(o => o.request.body.barcode === id).response;
  const before = createBarcodeNutritionCandidate(captured);
  const food = normalizeUsdaFood(detail,id,evidence.existingControlDetails.capturedAt);
  const result = {...bare(food),identifier:{scheme:'gtin',value:id}};
  const after = createBarcodeNutritionCandidate(result), assessment = assessBarcodeNutrition(after,result.identifier);
  expect(food.nutrients.calories).toBe(detail.labelNutrients.calories.value);
  if (id === '888849000012') {
    assert.deepEqual(after.selection.nutrients, before.selection.nutrients);
    assert.equal(after.selection.nutrients.sodium, 220);
    assert.equal(assessment.nutritionScore100, 54);
    assert.equal(assessOverallFoodQuality(after,assessment).overallScore100, 52);
  } else if (id === '044000045586') {
    assert.equal(after.selection.nutrients.addedSugar, 7);
    assert.equal(after.selection.nutrients.totalSugar, 7);
    assert.equal(assessment.nutritionScore100, 20);
  } else {
    assert.equal(assessment.ratingStatus, 'not-rated-category');
    assert.equal(assessment.nutritionScore100, null);
  }
});

test('bounded original OFF captures retain supported serving precedence and unknown/conflict guards', () => {
  const rows = fs.readFileSync(path.join(__dirname,'../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const ids = ['00049000000443','00037600138727','0856312002757','0016000435094'];
  for (const id of ids) {
    const row = rows.find(r => r.barcode === id); expect(row).toBeDefined();
    const raw = row.responses.find(r => r.body?.product).body.product, original = JSON.stringify(raw);
    const food = normalizeOpenFoodFactsProduct(raw,id,row.capturedAt);
    expect(normalizeRemoteFood(food)).not.toBeNull();
    if (food.nutritionBasis.kind === 'provider-serving') {
      assert.equal(food.nutrients.calories, raw.nutriments['energy-kcal_serving']);
      assert(Math.abs(food.nutrients.sodium - raw.nutriments.sodium_serving * 1000) < 1e-9);
    }
    if (id === '0856312002757') assert.equal(createBarcodeNutritionCandidate({...bare(food),identifier:{scheme:'gtin',value:id}}).display.nutrients.sodium, null);
    if (id === '00037600138727') assert.equal(createBarcodeNutritionCandidate({...bare(food),identifier:{scheme:'gtin',value:id}}).selection.nutrients.sodium, 770);
    expect(JSON.stringify(raw)).toBe(original);
  }
});

test('constructed control: detail timeout retains search food inside the existing request budget', async () => {
  const fetchImpl=jest.fn().mockResolvedValueOnce(response(evidence.bun.search.body)).mockImplementationOnce((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timed out')))));
  const result=await lookupRemoteBarcode({barcode,fetchImpl,now,timeoutMs:25,env:{USDA_FDC_API_KEY:'test-server-key'}});
  expect(result.food.usdaDetails.status).toBe('unavailable');
  expect(result.food.nutritionBasis.kind).toBe('derived-serving');
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('captured OFF sugar contradiction cannot reintroduce an added-sugar value already rejected by review/logging',()=>{
  const rows=fs.readFileSync(path.join(__dirname,'../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const row=rows.find(r=>r.barcode==='00049000000443');
  const food=normalizeOpenFoodFactsProduct(row.responses.find(r=>r.body?.product).body.product,row.barcode,row.capturedAt);
  const id={scheme:'gtin',value:row.barcode},candidate=createBarcodeNutritionCandidate({...bare(food),identifier:id});
  expect(candidate.display.nutrients.addedSugar).toBeNull();
  const assessment=assessBarcodeNutrition(candidate,id);
  expect(assessment.result.excludedNutrients).toContain('addedSugar');
  expect(assessment.evidence.originalDataset.observations.some(o=>o.nutrient==='addedSugar'&&o.rawValue>0)).toBe(true);
});

test.each([['GRM','g'],['g','g'],['MLT','ml'],['mL','ml']])('constructed compatible serving unit %s retains declared facts and fractional precision', (unit, canonical)=>{
  const detail={...evidence.bun.detail.body,servingSizeUnit:unit};
  const food=normalizeUsdaFood(detail,barcode,evidence.bun.detail.capturedAt);
  expect(food.serving.unit).toBe(canonical);
  expect(food.nutritionBasis.kind).toBe('provider-serving');
  const selection=createBarcodeNutritionCandidate(bare(food)).selection;
  for (const quantity of [.5,1,1.25,2]) {
    expect(selection.nutrients.sodium*quantity).toBe(370*quantity);
    expect(selection.nutrients.protein*quantity).toBe(6*quantity);
  }
});

test('transient detail failure is cached safely, does not loop, and can recover on a later session',async()=>{
  const failed=await lookup(upstream(null)), fresh=await lookup(upstream(evidence.bun.detail.body)),storage=memory();
  const firstFetch=jest.fn().mockResolvedValue(response(failed));
  const options={storage,clock:now,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true}};
  const first=createRemoteBarcodeLookup({...options,fetchImpl:firstFetch});
  expect((await first.lookup(barcode)).food.nutrients.calories).toBeCloseTo(180.05,10);
  await first.lookup(barcode);expect(firstFetch).toHaveBeenCalledTimes(1);
  const nextFetch=jest.fn().mockResolvedValue(response(fresh));
  const next=createRemoteBarcodeLookup({...options,fetchImpl:nextFetch});
  expect((await next.lookup(barcode)).food.nutrients.calories).toBe(180);
  expect(nextFetch).toHaveBeenCalledTimes(1);
});