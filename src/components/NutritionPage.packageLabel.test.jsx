import { fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import NutritionPage from './NutritionPage';
import captures from '../services/__fixtures__/barcodeServingEvidence.json';
import { normalizeUsdaFood } from '../../api/nutrition/_barcodeGateway.cjs';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { appendNutritionEntry,readNutritionEntries,updateStoredNutritionEntry } from '../services/nutritionEntryStorage';
import { readPersonalLabels,removePersonalLabel } from '../services/personalPackageLabels';
const originalScroll=window.scrollTo;
beforeEach(()=>{window.scrollTo=jest.fn();localStorage.clear();});
afterEach(()=>{window.scrollTo=originalScroll;localStorage.clear();});
test('manual package correction -> review -> fractional selection/save -> remount/reopen; history and original observations survive',async()=>{
 const historical={id:'synthetic-history',name:'Synthetic prior record',loggedAt:'2026-10-20T12:00:00Z',calories:180.05,protein:6,carbohydrates:33.02,fat:3,sodium:369.85,notes:''};
 localStorage.setItem('nutritionEntries',JSON.stringify([historical]));
 const rawFood=normalizeUsdaFood(captures.bun.detail.body,'050400740280',captures.bun.detail.capturedAt);
 const result={status:'found',identifier:{scheme:'gtin',value:'050400740280'},food:rawFood};
 const fetchImpl=jest.fn(async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(result)}));
 const service=createRemoteBarcodeLookup({storage:localStorage,fetchImpl,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true}});
 const props={onBack:jest.fn(),nutritionEntries:[historical],nutritionGoals:{calories:0,protein:0,carbohydrates:0,fat:0},
  saveNutritionEntry:e=>appendNutritionEntry(localStorage,e,{createId:()=> 'new-personal-entry'}).status==='saved',
  updateNutritionEntry:(id,e)=>updateStoredNutritionEntry(localStorage,id,e).status==='saved',deleteNutritionEntry:jest.fn(),saveNutritionGoals:jest.fn(),saveUserFood:jest.fn(),
  barcodeLookupService:service,lifecycleAdapter:{subscribe:()=>()=>{}},buttonStyle:{},inputStyle:{},containerStyle:{}};
 let view=render(<NutritionPage {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Scan Barcode'}));
 fireEvent.change(screen.getByLabelText('Enter barcode manually'),{target:{value:'050400740280'}});
 fireEvent.click(screen.getByRole('button',{name:'Look Up Barcode'}));
 await screen.findByRole('article',{name:'Barcode product review'});
 fireEvent.click(screen.getByRole('button',{name:'Use my package label'}));
 const form=screen.getByRole('form',{name:'Your package label'}),f=within(form);
 for(const [label,value]of Object.entries({'Product name':'Seeded Jumbo Burger Buns','Brand':'Bimbo Bakeries USA','Flavor / variant (or Plain)':'Seeded','Package size / identity':'8 buns','Serving description':'1 bun (65 g)','Declared quantity':'65','Servings per container (if stated)':'8','Calories (kcal)':'190','Protein (g)':'6','Carbohydrates (g)':'33','Total fat (g)':'3','Fiber (g)':'2','Sodium (mg)':'340','Total sugars (g)':'5','Added sugars (g)':'4','Saturated fat (g)':'0.5'}))fireEvent.change(f.getByLabelText(label),{target:{value}});
 fireEvent.click(f.getByRole('checkbox',{name:/I checked the product/}));
 fireEvent.click(f.getByRole('button',{name:'Save my label'}));
 await waitFor(()=>expect(readPersonalLabels()).toHaveLength(1));
 const review=screen.getByRole('article',{name:'Barcode product review'});
 expect(review).toHaveTextContent('Your confirmed label');expect(review).toHaveTextContent('Ingredients need separate confirmation');
 expect(within(review).getByRole('button',{name:/Submit for owner review/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));
 const sodium=()=>screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'});
 expect(sodium()).toHaveValue(340);
 fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'1.25'}});
 expect(sodium()).toHaveValue(425);fireEvent.click(screen.getByRole('button',{name:'Save Entry'}));
 await waitFor(()=>expect(readNutritionEntries(localStorage).entries).toHaveLength(2));
 let saved=readNutritionEntries(localStorage).entries.find(e=>e.id==='new-personal-entry');
 expect(saved).toMatchObject({calories:237.5,sodium:425,fiber:2.5,addedSugar:5,totalSugar:6.25,portion:{amount:1.25}});
 expect(saved.foodReference.personalLabel.nutrients.sodium).toBe(340);
 expect(saved.foodReference.providerNutritionBasis.nutrients.sodium).toBe(370);
 view.unmount();view=render(<NutritionPage {...props} nutritionEntries={[saved]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Edit'}));expect(sodium()).toHaveValue(425);
 fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'0.5'}});expect(sodium()).toHaveValue(170);
 fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
 saved=readNutritionEntries(localStorage).entries.find(e=>e.id==='new-personal-entry');expect(saved).toMatchObject({calories:95,sodium:170,addedSugar:2});
 removePersonalLabel(readPersonalLabels()[0].id);
 expect(saved.foodReference.personalLabel.nutrients.sodium).toBe(340);
 expect(readNutritionEntries(localStorage).entries.find(e=>e.id===historical.id)).toEqual(historical);
 view.unmount();
},15000);

test('a confirmed label with unknown sodium saves/reopens unknown rather than zero',async()=>{
 const raw=normalizeUsdaFood(captures.bun.detail.body,'050400740280',captures.bun.detail.capturedAt);
 const {profile}=require('../services/__fixtures__/personalPackageLabel.json');
 const {savePersonalLabel,labelScope}=require('../services/personalPackageLabels');
 await savePersonalLabel({...profile,id:'null-sodium',observedScope:labelScope(raw),nutrients:{...profile.nutrients,sodium:null}});
 const result={status:'found',identifier:{scheme:'gtin',value:profile.barcode},food:raw};
 const props={onBack:jest.fn(),nutritionEntries:[],nutritionGoals:{},saveNutritionEntry:e=>appendNutritionEntry(localStorage,e,{createId:()=> 'unknown-entry'}).status==='saved',
  updateNutritionEntry:jest.fn(),deleteNutritionEntry:jest.fn(),saveNutritionGoals:jest.fn(),barcodeLookupService:{lookup:async()=>result},
  lifecycleAdapter:{subscribe:()=>()=>{}},buttonStyle:{},inputStyle:{},containerStyle:{}};
 let view=render(<NutritionPage {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Scan Barcode'}));fireEvent.change(screen.getByLabelText('Enter barcode manually'),{target:{value:profile.barcode}});
 fireEvent.click(screen.getByRole('button',{name:'Look Up Barcode'}));await screen.findByRole('article',{name:'Barcode product review'});
 fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));
 const sodium=()=>screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'});
 expect(sodium()).toHaveValue(null);fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'0.5'}});
 fireEvent.click(screen.getByRole('button',{name:'Save Entry'}));await waitFor(()=>expect(readNutritionEntries(localStorage).entries).toHaveLength(1));
 const saved=readNutritionEntries(localStorage).entries[0];expect(saved.sodium).toBeNull();
 view.unmount();view=render(<NutritionPage {...props} nutritionEntries={[saved]}/>);fireEvent.click(screen.getByRole('button',{name:'Edit'}));expect(sodium()).toHaveValue(null);view.unmount();
},15000);
