import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { applyReviewedPackageLabel } from './personalPackageLabelCandidate';
import { getReviewedLabels, submissionPanel } from './sharedPackageLabels';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';
import { profile } from './__fixtures__/personalPackageLabel.json';
import captures from './__fixtures__/barcodeServingEvidence.json';
import { normalizeUsdaFood } from '../../api/nutrition/_barcodeGateway.cjs';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { savePersonalLabel, labelScope } from './personalPackageLabels';
const identifier={scheme:'gtin',value:profile.barcode};
const raw=normalizeUsdaFood(captures.bun.detail.body,profile.barcode,captures.bun.detail.capturedAt);
const version={id:'constructed-reviewed-version',status:'active',panel:submissionPanel(profile),publishedAt:'2026-10-24T17:00:00Z'};
const previousFetch=global.fetch;
afterEach(()=>{global.fetch=previousFetch;localStorage.clear();});
test('explicit reviewed edition is coherent, retains original evidence and does not transfer verification/conflict flags',()=>{
 const original=createBarcodeNutritionCandidate({status:'found',identifier,food:raw});
 const selected=applyReviewedPackageLabel(original,version,identifier);
 expect(selected.display.attribution).toBe('Reviewed by Trace');expect(selected.personalLabel).toBeUndefined();
 expect(selected.selection.nutrients.sodium).toBe(340);expect(selected.selection.remote.nutrients.sodium).toBe(370);
 expect(selected.display.ingredients.status).toBe('unknown');expect(selected.display.nutritionCorrection).toBeUndefined();
 expect(assessOverallFoodQuality(selected,assessBarcodeNutrition(selected,identifier)).overallScore100).toBeNull();
 expect(applyReviewedPackageLabel(original,version,{scheme:'gtin',value:'888849000012'})).toBe(original);
 expect(applyReviewedPackageLabel(original,{...version,status:'withdrawn'},identifier)).toBe(original);
});
test('fresh/cache lookup rechecks shared editions, never chooses by score, removes withdrawn choices and honors personal priority',async()=>{
 let versions=[version,{...version,id:"constructed-alternate-edition",panel:{...version.panel,variant:"Alternate constructed edition",packageDescription:"Different constructed package"}}];global.fetch=jest.fn(async()=>({ok:true,json:async()=>({versions,checkedAt:'2026-10-24T17:00:00Z'})}));
 const fetchImpl=jest.fn(async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({status:'found',identifier,food:raw})}));
 const lookup=createRemoteBarcodeLookup({storage:localStorage,fetchImpl,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true}});
 let result=await lookup.lookup(profile.barcode);
 expect(result.food.nutrients.sodium).toBe(370);expect(result.reviewedLabel).toBeUndefined();expect(result.reviewedLabelChoices).toHaveLength(2);
 versions=[];result=await lookup.lookup(profile.barcode);expect(result.reviewedLabelChoices).toHaveLength(0);expect(fetchImpl).toHaveBeenCalledTimes(1);
 await savePersonalLabel({...profile,observedScope:labelScope(raw)});
 const calls=global.fetch.mock.calls.length;result=await lookup.lookup(profile.barcode);expect(result.personalLabel.id).toBe(profile.id);expect(global.fetch).toHaveBeenCalledTimes(calls);
});
test('offline/failed shared service preserves provider food and does not invent an active edition',async()=>{
 global.fetch=jest.fn().mockRejectedValue(new Error('not configured'));
 await expect(getReviewedLabels(profile.barcode)).rejects.toThrow('not configured');
 const lookup=createRemoteBarcodeLookup({storage:localStorage,fetchImpl:async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({status:'found',identifier,food:raw})}),localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true}});
 const result=await lookup.lookup(profile.barcode);expect(result.food.nutrients.sodium).toBe(370);expect(result.reviewedLabelChoices).toBeUndefined();
 const offline=createRemoteBarcodeLookup({storage:localStorage,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:false}});
 const calls=global.fetch.mock.calls.length;expect((await offline.lookup(profile.barcode)).food).toBeTruthy();expect(global.fetch).toHaveBeenCalledTimes(calls);
});
test('submission serialization excludes unrelated snapshots, private photo references and device records',()=>{
 const p=submissionPanel({...profile,providerObservation:{secret:'not uploaded'},photos:[{id:'private'}],unrelatedMemories:['private']});
 expect(p.providerObservation).toBeUndefined();expect(p.photos).toBeUndefined();expect(p.unrelatedMemories).toBeUndefined();
 expect(p.nutrients.addedSugar).toBe(4);expect(p.confirmedAt).toBe(profile.confirmedAt);
});
