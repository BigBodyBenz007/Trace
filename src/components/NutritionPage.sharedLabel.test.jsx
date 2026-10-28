import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import NutritionPage from './NutritionPage';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { appendNutritionEntry,readNutritionEntries } from '../services/nutritionEntryStorage';
import { submissionPanel } from '../services/sharedPackageLabels';
import { profile } from '../services/__fixtures__/personalPackageLabel.json';
import captures from '../services/__fixtures__/barcodeServingEvidence.json';
import { normalizeUsdaFood } from '../../api/nutrition/_barcodeGateway.cjs';
const previousFetch=global.fetch,originalScroll=window.scrollTo;
beforeEach(()=>{localStorage.clear();window.scrollTo=jest.fn();});
afterEach(()=>{localStorage.clear();global.fetch=previousFetch;window.scrollTo=originalScroll;});
test('explicit package match -> review -> fractional save -> reopen preserves edition and historical snapshots; withdrawal blocks new use',async()=>{
 const historical={id:'history',name:'Synthetic prior entry',loggedAt:'2026-10-20T12:00:00Z',calories:10,protein:1,carbohydrates:1,fat:0,sodium:9,notes:''};
 localStorage.setItem('nutritionEntries',JSON.stringify([historical]));
 const version={id:'constructed-review-edition',status:'active',publishedAt:'2026-10-24T17:00:00Z',
  panel:{...submissionPanel(profile),nutrients:{...profile.nutrients,sodium:null}}};
 let active=[version];
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({versions:active,checkedAt:'2026-10-24T17:00:00Z'})}));
 const food=normalizeUsdaFood(captures.bun.detail.body,profile.barcode,captures.bun.detail.capturedAt);
 const raw={status:'found',identifier:{scheme:'gtin',value:profile.barcode},food};
 const service=createRemoteBarcodeLookup({storage:localStorage,localLookup:()=>({status:'not-found'}),runtime:{isWeb:true,isOnline:true},
  fetchImpl:async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(raw)})});
 const props={onBack:jest.fn(),nutritionEntries:[historical],nutritionGoals:{},saveNutritionEntry:e=>appendNutritionEntry(localStorage,e,{createId:()=> 'shared-entry'}).status==='saved',
  updateNutritionEntry:jest.fn(),deleteNutritionEntry:jest.fn(),saveNutritionGoals:jest.fn(),barcodeLookupService:service,
  lifecycleAdapter:{subscribe:()=>()=>{}},buttonStyle:{},inputStyle:{},containerStyle:{}};
 let view=render(<NutritionPage {...props}/>);
 const scan=async()=>{fireEvent.click(screen.getByRole('button',{name:'Scan Barcode'}));fireEvent.change(screen.getByLabelText('Enter barcode manually'),{target:{value:profile.barcode}});fireEvent.click(screen.getByRole('button',{name:'Look Up Barcode'}));await screen.findByRole('article',{name:'Barcode product review'});};
 const choose=async()=>{fireEvent.click(screen.getByText('Trace-reviewed package editions'));fireEvent.click(screen.getByRole('button',{name:'Compare this package edition'}));fireEvent.click(screen.getByRole('button',{name:/My package matches/}));expect(screen.getByRole('article',{name:'Barcode product review'})).toHaveTextContent('Reviewed by Trace');};
 await scan();await choose();fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));
 await screen.findByLabelText('Number of servings');fireEvent.change(screen.getByLabelText('Number of servings'),{target:{value:'1.25'}});
 expect(screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'})).toHaveValue(null);
 fireEvent.click(screen.getByRole('button',{name:'Save Entry'}));await waitFor(()=>expect(readNutritionEntries(localStorage).entries).toHaveLength(2));
 const saved=readNutritionEntries(localStorage).entries.find(e=>e.id==='shared-entry');
 expect(saved).toMatchObject({calories:237.5,sodium:null,addedSugar:5,totalSugar:6.25});
 expect(saved.foodReference.reviewedLabel.id).toBe(version.id);expect(saved.foodReference.providerNutritionBasis.nutrients.sodium).toBe(370);
 expect(readNutritionEntries(localStorage).entries.find(e=>e.id==='history')).toEqual(historical);
 view.unmount();view=render(<NutritionPage {...props} nutritionEntries={[saved]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Edit'}));expect(screen.getByLabelText('Calories',{selector:'input[aria-label="Calories"]'})).toHaveValue(237.5);
 expect(screen.getByLabelText('Sodium (mg)',{selector:'input[aria-label="Sodium (mg)"]'})).toHaveValue(null);
 view.unmount();view=render(<NutritionPage {...props}/>);await scan();await choose();active=[];
 fireEvent.click(screen.getByRole('button',{name:'Use This Food'}));await screen.findByText(/This shared edition was withdrawn/);
 expect(screen.getByRole('article',{name:'Barcode product review'})).toBeInTheDocument();
 expect(readNutritionEntries(localStorage).entries.find(e=>e.id==='shared-entry')).toEqual(saved);
 view.unmount();
},15000);
