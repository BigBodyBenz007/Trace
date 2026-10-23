import React from 'react';
import {render,screen,within,fireEvent,waitFor} from '@testing-library/react';
import NutritionPage from '../components/NutritionPage';
import {createBarcodeNutritionCandidate} from '../services/barcodeNutritionSelection';
import {createRemoteBarcodeLookup} from '../services/remoteBarcodeLookup';
import {chooseBarcodeSource} from '../services/barcodeSourceSelection';
import {appendNutritionEntry,readNutritionEntries} from '../services/nutritionEntryStorage';
import {resolveProteinSupplementBoundary,PROTEIN_SUPPLEMENT_MESSAGE} from './proteinSupplementBoundary';
import {assessBarcodeNutrition} from './barcodeNutritionAssessment';
import {assessOverallFoodQuality} from './traceOverallFoodQuality';
import {assessLookupForGrading} from './barcodeAssessmentFallback';
import BarcodeNutritionReview,{BarcodeAdditives} from './BarcodeNutritionReview';
import capture from './__fixtures__/dymatizeCocoaPebblesLookup.json';
import comparison from '../../docs/protein-powder-comparison-2026-10-22.json';
const clone=x=>JSON.parse(JSON.stringify(x));
const captured=capture.lookup;
const originalEnvironment=process.env.NODE_ENV;
const originalScroll=window.scrollTo;
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}};
const none=()=>({status:'not-found',identifier:null,food:null});
const response=body=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(body)});
function constructed(name,categories=['Protein Powders'],unit='g'){
 // Constructed candidate shape tests classification independently of gateway
 // numeric-consistency rejection; the captured transport remains unchanged.
 const c=clone(createBarcodeNutritionCandidate(captured));c.display.name=name;c.display.assessmentInputs.identity.name=name;
 c.display.assessmentInputs.categories=[{field:'constructed-provider-category',values:categories}];
 c.selection.serving.unit=unit;c.display.assessmentInputs.serving=[{field:'servingSizeUnit',value:unit}];
 return c;
}
function manufacturerReference(ref){
 // Existing official reference in a constructed catalog transport, not a lookup.
 const nutrients=Object.fromEntries(Object.entries(ref.nutrients).map(([k,v])=>[k,v.value]));
 const food={id:ref.id,sourceType:'packaged-food',name:ref.name,brand:'NOW Sports',serving:ref.serving,nutrients,
  categories:[{field:'official-product-page.category',values:['Protein Powders']}],
  providerSourceSnapshot:{ingredients:ref.ingredients},provenance:{source:'official-manufacturer',label:ref.source.attribution,sourceUrl:ref.source.url}};
 return createBarcodeNutritionCandidate({status:'found',food});
}

test('captured Dymatize is an intentional unrated category; diagnostics retain the unchanged 41 calculation',()=>{
 const c=createBarcodeNutritionCandidate(captured),before=JSON.stringify(c);
 const assessment=assessBarcodeNutrition(c,captured.identifier),overall=assessOverallFoodQuality(c,assessment);
 expect(resolveProteinSupplementBoundary(c)).toMatchObject({status:'not-rated-category',code:'protein-supplement-powder',source:{url:c.display.sourceUrl}});
 expect(assessment).toMatchObject({ratingStatus:'not-rated-category',nutritionScore100:null,result:null,grade:null,scoreReady:false});
 expect(assessment.diagnostics.nutrition.nutritionScore100).toBe(41);
 expect(overall).toMatchObject({status:'not-rated-category',overallScore100:null,additiveDeduction:null,deductions:[]});
 expect(overall.additiveAssessment).toEqual(assessOverallFoodQuality(c,assessment.diagnostics.nutrition).additiveAssessment);
 expect(JSON.stringify(c)).toBe(before);expect(c.canUse).toBe(true);
});
test.each(comparison.controls)('$id existing manufacturer reference establishes powder scope without a brand/GTIN override',ref=>{
 const c=manufacturerReference(ref);
 expect(resolveProteinSupplementBoundary(c).status).toBe('not-rated-category');
 expect(assessBarcodeNutrition(c).nutritionScore100).toBeNull();expect(c.canUse).toBe(true);
});
test.each([
 ['High protein bar',['Protein Bars'],'g'],['Greek protein yogurt',['Yogurts'],'g'],['Protein milk',['Milks'],'ml'],
 ['Protein shake ready-to-drink',['Protein Drinks'],'ml'],['Bottled whey protein drink',['Protein Powders'],'g'],
 ['Eggs',['Eggs'],'g'],['Chicken meat',['Meat'],'g'],['Wheat flour',['Flours'],'g'],
 ['Cocoa powder',['Cocoa Powders'],'g'],['Powdered milk',['Milk Powders'],'g'],['Milk powder',['Milk Powders'],'g'],
 ['Bread with whey protein powder',['Dietary Supplements'],'g'],['Yogurt with protein powder',['Protein Powders'],'g'],
 ['Cookies containing protein powder',['Dietary Supplements'],'g'],['Protein mix',[],'g'],
 ['Protein powder',[],'g'],['Sports recovery drink',['Energy, Protein & Muscle Recovery Drinks'],'ml'],
 ['Protein tablets',['Protein Supplements'],'g'],['Whey protein isolate',['Dietary Supplements'],'g'],
 ['Creatine powder',['Dietary Supplements'],'g'],['Plain protein food',['Foods'],'g'],
])('constructed ordinary or ambiguous %s keeps existing treatment',(name,categories,unit)=>{
 expect(resolveProteinSupplementBoundary(constructed(name,categories,unit)).status).toBe('not-established');
});
test('classification uses source form/use evidence, not quantities, ingredients or mismatched provenance',()=>{
 const noProtein=clone(createBarcodeNutritionCandidate(captured));noProtein.display.nutrients.protein=0;
 expect(resolveProteinSupplementBoundary(noProtein).status).toBe('not-rated-category');
 const c=clone(createBarcodeNutritionCandidate(captured));c.display.sourceUrl='https://example.invalid/other';
 expect(resolveProteinSupplementBoundary(c).status).toBe('not-established');
 const other=constructed('Synthetic ordinary food',['Foods']);
 expect(resolveProteinSupplementBoundary(other).status).toBe('not-established');
});
test('fresh, cached and offline observations keep the boundary without chasing a numerical alternative',async()=>{
 const storage=memory(),fetchImpl=jest.fn().mockResolvedValue(response(captured));
 const service=createRemoteBarcodeLookup({storage,fetchImpl,localLookup:none,userLookup:none,runtime:{isWeb:true,isOnline:true},clock:()=>Date.parse(capture.capturedAt)+1000});
 const fresh=await service.lookup(capture.barcode,{assess:assessLookupForGrading});
 const cached=await service.lookup(capture.barcode,{assess:assessLookupForGrading});
 const offlineFetch=jest.fn(),offline=createRemoteBarcodeLookup({storage,fetchImpl:offlineFetch,localLookup:none,userLookup:none,runtime:{isWeb:true,isOnline:false},clock:()=>Date.parse(capture.capturedAt)+2000});
 const retained=await offline.lookup(capture.barcode,{assess:assessLookupForGrading});
 for(const result of [fresh,cached,retained]){
  expect(assessLookupForGrading(result)).toEqual({nutrition:false,overall:false,ratingStatus:'not-rated-category'});
  expect(createBarcodeNutritionCandidate(result).display.nutrients).toEqual(createBarcodeNutritionCandidate(captured).display.nutrients);
 }
 expect(fetchImpl).toHaveBeenCalledTimes(1);expect(offlineFetch).not.toHaveBeenCalled();
 // Constructed competing edition cannot replace a resolved preferred category.
 const competing=clone(captured);competing.food.name='Synthetic ordinary food';competing.food.assessmentInputs.identity.name=competing.food.name;
 competing.food.assessmentInputs.categories=[];
 expect(chooseBarcodeSource(captured,[competing],assessLookupForGrading).food).toEqual(captured.food);
});
test('powder review exposes facts and ingredient review without any ratings, factors or deduction points',()=>{
 const c=createBarcodeNutritionCandidate(captured);render(<><BarcodeNutritionReview candidate={c} identifier={captured.identifier}/><BarcodeAdditives candidate={c}/></>);
 expect(screen.getByText(PROTEIN_SUPPLEMENT_MESSAGE)).toBeVisible();
 expect(screen.getByText(/Unrated does not mean unhealthy or unsafe/)).toBeVisible();
 expect(screen.queryByLabelText('Why this score')).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Experimental nutrition rating')).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Experimental overall rating')).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Additive score effect')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Experimental nutrition assessment')).not.toHaveTextContent(/\d+\s*\/\s*100|point|lowers the score/i);
 expect(screen.getByRole('link',{name:'Provider nutrition'})).toHaveAttribute('href',c.display.sourceUrl);
 expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
 expect(screen.getByLabelText('Product additives')).toHaveTextContent('Sucralose');
});

beforeEach(()=>{process.env.NODE_ENV='development';window.history.replaceState({},'','/?barcodeGrading=1');localStorage.clear();window.scrollTo=jest.fn()});
afterEach(()=>{process.env.NODE_ENV=originalEnvironment;window.scrollTo=originalScroll;window.history.replaceState({},'','/')});
function propsFor(lookup,storage,historical){return{onBack:jest.fn(),nutritionEntries:historical,nutritionGoals:{calories:0,protein:0,carbohydrates:0,fat:0},
 saveNutritionEntry:entry=>appendNutritionEntry(storage,entry,{createId:()=> 'new-powder-entry'}).status==='saved',updateNutritionEntry:jest.fn(),deleteNutritionEntry:jest.fn(),saveNutritionGoals:jest.fn(),saveUserFood:jest.fn(),
 barcodeLookupService:lookup,barcodeCamera:{start:async()=>({devices:[],stop(){}})},lifecycleAdapter:{subscribe:()=>()=>{}},buttonStyle:{},inputStyle:{},containerStyle:{}}}
async function lookupInPage(){fireEvent.click(screen.getByRole('button',{name:'Scan Barcode'}));fireEvent.change(screen.getByLabelText('Enter barcode manually'),{target:{value:capture.barcode}});fireEvent.click(screen.getByRole('button',{name:'Look Up Barcode'}));return screen.findByRole('article',{name:'Barcode product review'}, {timeout:5000})}
test('unrated powder still selects, scales, saves and reopens without rewriting history or storing ratings',async()=>{
 const storage=memory(),historical={id:'prior-entry',name:'Synthetic historical entry',loggedAt:'2026-10-20T12:00:00Z',...captured.food.nutrients,notes:''};
 storage.setItem('nutritionEntries',JSON.stringify([historical]));const before=readNutritionEntries(storage).entries;
 const lookup={lookup:jest.fn(async()=>captured)},props=propsFor(lookup,storage,before),view=render(<NutritionPage {...props}/>);
 const review=await lookupInPage();expect(within(review).getByText(PROTEIN_SUPPLEMENT_MESSAGE)).toBeVisible();
 expect(within(review).queryByRole('button',{name:'Complete This Food'})).not.toBeInTheDocument();
 expect(within(review).getByText('120')).toBeInTheDocument();expect(within(review).getByRole('button',{name:'Ingredients'})).toHaveAttribute('aria-expanded','false');
 fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));
 fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'1.25'}});
 expect(screen.getByLabelText('Calories',{selector:'input[aria-label="Calories"]'})).toHaveValue(150);
 expect(screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'})).toHaveValue(224.8);
 fireEvent.click(screen.getByRole('button',{name:'Save Entry'}));await waitFor(()=>expect(readNutritionEntries(storage).entries).toHaveLength(2));
 const saved=readNutritionEntries(storage).entries.find(row=>row.id==='new-powder-entry');
 expect(saved.sodium).toBeCloseTo(224.8,8);expect(saved.nutritionBasis.sodium).toBe(179.84);
 expect(saved.foodReference.ingredients).toEqual(captured.food.ingredients);
 expect(saved.foodReference.assessmentInputs.datasets).toEqual(captured.food.assessmentInputs.datasets);
 expect(readNutritionEntries(storage).entries.find(row=>row.id===historical.id)).toEqual(before[0]);
 expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|ratingBoundary|additiveDeduction|"grade"|scoreReady/);
 view.unmount();render(<NutritionPage {...props} nutritionEntries={[saved]}/>);fireEvent.click(screen.getByRole('button',{name:'Edit'}));
 expect(screen.getByLabelText('Number of servings')).toHaveValue(1.25);
 expect(screen.getByLabelText('Calories',{selector:'input[aria-label="Calories"]'})).toHaveValue(150);
},20000);
test('a genuine missing logging nutrient still uses Complete This Food instead of inventing data',async()=>{
 const incomplete=clone(captured);incomplete.status='incomplete';incomplete.food.logReady=false;incomplete.food.nutrients.carbohydrates=null;incomplete.food.nutritionBasis.sourceNutrients.carbohydrates=null;incomplete.food.completeness='insufficient';incomplete.food.unknownFields.push('nutrients.carbohydrates');
 expect(createBarcodeNutritionCandidate(incomplete)).not.toBeNull();
 const props=propsFor({lookup:jest.fn(async()=>incomplete)},memory(),[]);render(<NutritionPage {...props}/>);
 const review=await lookupInPage();expect(within(review).getByText(PROTEIN_SUPPLEMENT_MESSAGE)).toBeVisible();
 expect(screen.getByRole('button',{name:'Complete This Food'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'Use This Food'})).toBeDisabled();
 expect(screen.getByText(/Needed to log:.*carbohydrates/i)).toBeInTheDocument();
});

test('constructed explicit powder category works for another identity without a barcode or protein threshold',()=>{expect(resolveProteinSupplementBoundary(constructed('Synthetic unflavored whey protein powder')).status).toBe('not-rated-category')});

test('unrecognized category shapes remain ambiguous without throwing',()=>{const c=clone(createBarcodeNutritionCandidate(captured));c.display.assessmentInputs.categories=['Protein Powders',{field:'foodCategory',values:'Protein Powders'}];expect(resolveProteinSupplementBoundary(c).status).toBe('not-established')});
