import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import NutritionPage from './NutritionPage';
import {createRemoteBarcodeLookup} from '../services/remoteBarcodeLookup';
import {appendNutritionEntry, readNutritionEntries, updateStoredNutritionEntry} from '../services/nutritionEntryStorage';
import evidence from '../services/__fixtures__/barcodeServingEvidence.json';
const {lookupRemoteBarcode} = require('../../api/nutrition/_barcodeGateway.cjs');
const response = body => ({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(body)});
const previousScroll=window.scrollTo;
beforeEach(()=>{window.scrollTo=jest.fn();});
afterEach(()=>{window.scrollTo=previousScroll;});

test('captured USDA serving panel -> review -> fractional save -> reload/edit preserves facts, unknowns and source history', async()=>{
  const historical={id:'synthetic-history',name:'Synthetic prior record',loggedAt:'2026-10-20T12:00:00Z',calories:180.05,protein:6,carbohydrates:33.02,fat:3,sodium:369.85,notes:''};
  const values=new Map([['nutritionEntries',JSON.stringify([historical])]]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const fetchUpstream=jest.fn().mockResolvedValueOnce(response(evidence.bun.search.body)).mockResolvedValueOnce(response(evidence.bun.detail.body));
  // Run the real gateway with captured original HTTP bodies, not a pre-normalized lookup fixture.
  const fetchImpl=jest.fn(async()=>response(await lookupRemoteBarcode({barcode:'050400740280',fetchImpl:fetchUpstream,env:{USDA_FDC_API_KEY:'test-server-key'}})));
  const service=createRemoteBarcodeLookup({storage,fetchImpl,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true}});
  const props={onBack:jest.fn(),nutritionEntries:[historical],nutritionGoals:{calories:0,protein:0,carbohydrates:0,fat:0},
    saveNutritionEntry:entry=>appendNutritionEntry(storage,entry,{createId:()=> 'new-serving-entry'}).status==='saved',
    updateNutritionEntry:(id,entry)=>updateStoredNutritionEntry(storage,id,entry).status==='saved',deleteNutritionEntry:jest.fn(),saveNutritionGoals:jest.fn(),saveUserFood:jest.fn(),
    barcodeLookupService:service,lifecycleAdapter:{subscribe:()=>()=>{}},buttonStyle:{},inputStyle:{},containerStyle:{}};
  let view=render(<NutritionPage {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Scan Barcode'}));
  fireEvent.change(screen.getByLabelText('Enter barcode manually'),{target:{value:'050400740280'}});
  fireEvent.click(screen.getByRole('button',{name:'Look Up Barcode'}));
  const review=await screen.findByRole('article',{name:'Barcode product review'}, {timeout:5000});
  expect(within(review).getByText('180',{exact:true})).toBeInTheDocument();
  expect(within(review).getByText('370 mg',{exact:true})).toBeInTheDocument();
  expect(review).not.toHaveTextContent("Calculated from the provider's per-100 g");
  fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));
  const sodium=()=>screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'});
  expect(sodium()).toHaveValue(370);
  fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'1.25'}});
  expect(sodium()).toHaveValue(462.5);
  fireEvent.click(screen.getByRole('button',{name:'Save Entry'}));
  await waitFor(()=>expect(readNutritionEntries(storage).entries).toHaveLength(2));
  let saved=readNutritionEntries(storage).entries.find(e=>e.id==='new-serving-entry');
  expect(saved).toMatchObject({calories:225,protein:7.5,carbohydrates:41.25,fat:3.75,fiber:1.21875,sodium:462.5,totalSugar:5,addedSugar:null,portion:{amount:1.25}});
  expect(saved.foodReference.usdaDetails.searchFood.nutrients.sodium).toBeCloseTo(369.85,10);
  expect(saved.foodReference.assessmentInputs.datasets[0].observations).toContainEqual(expect.objectContaining({nutrient:'addedSugar',rawValue:4.03}));
  view.unmount();view=render(<NutritionPage {...props} nutritionEntries={[saved]}/>);
  fireEvent.click(screen.getByRole('button',{name:'Edit'}));
  expect(sodium()).toHaveValue(462.5);
  fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'0.5'}});
  expect(sodium()).toHaveValue(185);
  fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
  saved=readNutritionEntries(storage).entries.find(e=>e.id==='new-serving-entry');
  expect(saved).toMatchObject({calories:90,sodium:185,addedSugar:null});
  expect(readNutritionEntries(storage).entries.find(e=>e.id===historical.id)).toEqual(historical);
  expect(fetchUpstream).toHaveBeenCalledTimes(2);expect(fetchImpl).toHaveBeenCalledTimes(1);
  view.unmount();
},15000);
