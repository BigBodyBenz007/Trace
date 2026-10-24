import fixture from './__fixtures__/personalPackageLabel.json';
import captures from './__fixtures__/barcodeServingEvidence.json';
import providers from './__fixtures__/manufacturerProviderLookups.json';
import powder from '../development/__fixtures__/dymatizeCocoaPebblesLookup.json';
import { readPersonalLabels, savePersonalLabel, removePersonalLabel, personalLabelsFor, labelScope, PERSONAL_LABEL_KEY, validatePersonalLabel } from './personalPackageLabels';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { scaleNutrition } from './nutritionCalculation';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';
import { parseLabelOcr } from './packageLabelOcr';
import { normalizeUsdaFood } from '../../api/nutrition/_barcodeGateway.cjs';
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
const food=()=>normalizeUsdaFood(captures.bun.detail.body,'050400740280',captures.bun.detail.capturedAt);
const lookup=()=>({status:'found',identifier:{scheme:'gtin',value:'050400740280'},food:food()});
const profile=(extra={})=>({...fixture.profile,observedScope:labelScope(food()),...extra});
test('OCR drafts require confidence and preserve unreadable/less-than amounts as unknown, not zero',()=>{
  const text='Calories 190\nSodium 340mg\nTotal Sugars 5g\nIncludes 4g Added Sugars\nDietary Fiber <1g';
  expect(parseLabelOcr(text,92).fields).toMatchObject({calories:'190',sodium:'340',totalSugar:'5',addedSugar:'4'});
  expect(parseLabelOcr(text,92).fields.fiber).toBeUndefined();
  expect(parseLabelOcr(text,45).fields).toEqual({});
  expect(parseLabelOcr('Protein 0g',95).fields.protein).toBe('0');
  expect(parseLabelOcr('Sodium 340mg',95,[{text:'Sodium 340mg',confidence:95,words:[{confidence:40}]}]).fields.sodium).toBeUndefined();
});
test('personal versions persist, edit without mutating old snapshots, remove restores normal provider lookup',async()=>{
  const storage=memory(),p=profile();await savePersonalLabel(p,[],{storage});
  const historical=JSON.stringify(p),next={...p,id:'version-2',previousVersionId:p.id,nutrients:{...p.nutrients,sodium:350}};
  await savePersonalLabel(next,[],{storage});expect(readPersonalLabels(storage)).toHaveLength(2);
  expect(readPersonalLabels(storage)[0].status).toBe('superseded');expect(JSON.stringify(p)).toBe(historical);
  removePersonalLabel(next.id,storage);expect(personalLabelsFor(lookup(),readPersonalLabels(storage)).personalLabel).toBeUndefined();
});
test('fresh/cached scans use the same panel without requesting alternatives, fractions remain precise',async()=>{
  const storage=memory();await savePersonalLabel(profile(),[],{storage});
  const fetchImpl=jest.fn(async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(lookup())}));
  const options={storage,fetchImpl,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true},clock:()=>Date.parse('2026-10-24T16:00:00Z')};
  const fresh=await createRemoteBarcodeLookup(options).lookup('050400740280',{assess:()=>({nutrition:false,overall:false})});
  const cached=await createRemoteBarcodeLookup(options).lookup('0050400740280',{assess:()=>({nutrition:false,overall:false})});
  for(const r of[fresh,cached]){const c=createBarcodeNutritionCandidate(r);expect(c.selection.nutrients).toEqual(profile().nutrients);
    expect(scaleNutrition(c.selection.nutrients,1.25).sodium).toBe(425);
    expect(scaleNutrition(c.selection.nutrients,.5).addedSugar).toBe(2);
    expect(c.display.nutritionConflicts).toBeUndefined();expect(c.selection.remote.assessmentInputs).toBeDefined();
    expect(c.display.ingredients.text).toBeNull();expect(assessBarcodeNutrition(c,r.identifier).nutritionScore100).toEqual(expect.any(Number));
    expect(assessOverallFoodQuality(c,assessBarcodeNutrition(c,r.identifier)).overallScore100).toBeNull();}
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
test('different package evidence or two active editions requires explicit selection; unrelated barcode does not match',()=>{
  const r=lookup(),p=profile();expect(personalLabelsFor(r,[p]).personalLabel).toEqual(p);
  expect(personalLabelsFor({...r,food:{...r.food,packageQuantity:'different package'}},[p]).personalLabel).toBeUndefined();
  expect(personalLabelsFor(r,[p,{...p,id:'other',editionId:'other',variant:'Another edition'}]).personalLabel).toBeUndefined();
  expect(personalLabelsFor({...r,identifier:{scheme:'gtin',value:'888849000012'}},[p]).personalLabelChoices).toBeUndefined();
});
test('personal unknowns replace old provider values; no manufacturer authority or obsolete provider salt conflict is inherited',()=>{
  const r=providers.observations.find(p=>p.request.body.barcode==='044000045586').response;
  const original=createBarcodeNutritionCandidate(r);expect(original.selection.nutrients.addedSugar).toBe(7);
  const p=profile({barcode:r.identifier.value,name:r.food.name,brand:r.food.brand,serving:{description:'30 g',amount:30,unit:'g'},
    nutrients:{...fixture.profile.nutrients,addedSugar:null,sodium:null,saturatedFat:null}});
  const c=createBarcodeNutritionCandidate({...r,personalLabel:p});
  expect(c.selection.nutrients.addedSugar).toBeNull();expect(c.selection.nutrients.sodium).toBeNull();
  expect(c.display.nutritionCorrection).toBeUndefined();expect(c.selection.nutritionCorrection).toBeUndefined();
  expect(c.selection.remote).toEqual(original.selection.remote);
  expect(assessBarcodeNutrition(c,r.identifier).nutritionScore100).toBeNull();
  expect(assessBarcodeNutrition(original,r.identifier).nutritionScore100).toBe(20);
});
test('source-identified protein powder stays unrated after a personal correction; ingredients are separate',()=>{
  const r=powder.lookup;const p=profile({barcode:r.identifier.value,name:r.food.name,brand:r.food.brand});
  const c=createBarcodeNutritionCandidate({...r,personalLabel:p});
  expect(assessBarcodeNutrition(c,r.identifier).ratingStatus).toBe('not-rated-category');
  expect(assessBarcodeNutrition(c,r.identifier).nutritionScore100).toBeNull();
  const withIngredients=createBarcodeNutritionCandidate({...lookup(),personalLabel:profile({ingredientsConfirmed:true,ingredients:'Whole wheat flour, water, yeast, salt.'})});
  expect(withIngredients.display.ingredients.text).toBe('Whole wheat flour, water, yeast, salt.');
  expect(withIngredients.display.additives.status).toBe('unknown');
});
test('malformed device data is not silently erased, invalid quantities and nutrient conflicts are not fabricated',async()=>{
  const storage=memory();storage.setItem(PERSONAL_LABEL_KEY,'broken');
  expect(()=>readPersonalLabels(storage)).toThrow();await expect(savePersonalLabel(profile(),[],{storage})).rejects.toThrow();
  expect(storage.getItem(PERSONAL_LABEL_KEY)).toBe('broken');
  expect(validatePersonalLabel(profile({nutrients:{...profile().nutrients,addedSugar:99}}))).toBe(false);
  expect(validatePersonalLabel(profile({nutrients:{...profile().nutrients,fiber:null}}))).toBe(true);
});

test('a retained label stays available after provider failure and ingredient-only edition changes require a choice',()=>{
 const p={...profile(),providerObservation:food()};
 const unavailable={status:'unavailable',identifier:lookup().identifier,food:null};
 const recovered=personalLabelsFor(unavailable,[p]);expect(recovered.food).toEqual(food());expect(recovered.personalLabelChoices).toHaveLength(1);expect(recovered.personalLabel).toBeUndefined();
 const changed=lookup();changed.food={...changed.food,ingredients:{text:'Different ingredient edition',language:'en'}};
 expect(personalLabelsFor(changed,[p]).personalLabel).toBeUndefined();
 const selected=createBarcodeNutritionCandidate({...recovered,personalLabel:p});expect(selected.selection.nutrients.sodium).toBe(340);
 expect(scaleNutrition({...selected.selection.nutrients,sodium:null},.5).sodium).toBeNull();
});

test('declared ounce units preserve the serving and compare equivalently; a count alone stays loggable without a guessed mass',()=>{
 const first=createBarcodeNutritionCandidate({...lookup(),personalLabel:profile({serving:{description:'1 oz',amount:1,unit:'oz'}})});
 const grams=createBarcodeNutritionCandidate({...lookup(),personalLabel:profile({serving:{description:'28.349523125 g',amount:28.349523125,unit:'g'}})});
 expect(first.selection.serving).toMatchObject({amount:1,unit:'oz',grams:28.349523125});
 expect(assessBarcodeNutrition(first,lookup().identifier).nutritionScore100).toBe(assessBarcodeNutrition(grams,lookup().identifier).nutritionScore100);
 const count=createBarcodeNutritionCandidate({...lookup(),personalLabel:profile({serving:{description:'1 labeled bun',amount:1,unit:'serving'}})});
 expect(count.canUse).toBe(true);expect(count.selection.nutrients.sodium).toBe(340);
 expect(assessBarcodeNutrition(count,lookup().identifier).nutritionScore100).toBeNull();
});
test('constructed milk classification preserves the existing zero-versus-unknown sugar policy and never assumes g equals mL',()=>{
 const base=lookup(),f=base.food;
 const input={...f.assessmentInputs,identity:{...f.assessmentInputs.identity,name:'Constructed plain nonfat milk reference'},
  categories:[{field:'categories_tags',values:['en:beverages','en:milks','en:skimmed-milks']}]};
 const original={...f,name:input.identity.name,assessmentInputs:input};
 const nutrients={calories:90,protein:9,carbohydrates:13,fat:0,fiber:0,sodium:130,totalSugar:12,addedSugar:0,saturatedFat:0};
 const make=(unit,addedSugar)=>createBarcodeNutritionCandidate({...base,food:original,personalLabel:profile({name:input.identity.name,
  serving:{description:'240 '+unit,amount:240,unit},nutrients:{...nutrients,addedSugar}})});
 expect(assessBarcodeNutrition(make('ml',0),base.identifier).nutritionScore100).toBe(86);
 expect(assessBarcodeNutrition(make('ml',null),base.identifier).nutritionScore100).toBe(61);
 const mass=assessBarcodeNutrition(make('g',0),base.identifier);
 expect(mass.result.normalized.originalBasis.unit).toBe('g');
 expect(mass.result.comparison.energyRule).not.toBe('milk food-energy ramp per 100 mL');
});
