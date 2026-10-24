import {fireEvent, render, screen, within} from '@testing-library/react';
import NutritionPage from './NutritionPage';
import {createUserFood} from '../services/userFoodCatalog';

const localDay = offset => {const d=new Date();d.setDate(d.getDate()+offset);return d;};
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const label = d => d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
const meal = (id,offset,hour=12,minute=0) => {
  const d=localDay(offset);d.setHours(hour,minute,0,0);
  return {id,name:id,loggedAt:d.toISOString(),calories:120,protein:5,carbohydrates:20,fat:2,fiber:null,sodium:null,notes:'',nutritionBasis:{calories:96,protein:4,carbohydrates:16,fat:1.6,fiber:null,sodium:null,totalSugar:null,addedSugar:null},portion:{amount:1.25,unit:'serving',basis:{amount:30,unit:'g',description:'1 serving (30 g)'}}};
};
function setup(entries=[]){
  const props={nutritionEntries:entries,userFoods:[createUserFood('Reusable food only',{calories:500,protein:10,carbohydrates:50,fat:20},{amount:1,unit:'serving',description:'1 serving'})],nutritionGoals:{calories:1800,protein:0,carbohydrates:0,fat:0},onBack:jest.fn(),saveNutritionEntry:jest.fn(()=>true),updateNutritionEntry:jest.fn(()=>true),deleteNutritionEntry:jest.fn(()=>true),saveNutritionGoals:jest.fn(),buttonStyle:{},inputStyle:{},containerStyle:{}};
  return {...render(<NutritionPage {...props}/>),props};
}
beforeEach(()=>{localStorage.clear();jest.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());

test('new daily log uses only actual logged entries for the local selected day, separately from history and reusable foods',()=>{
  const entries=[meal('Late today',0,23,55),meal('Early today',0,0,5),meal('Yesterday meal',-1),meal('Tomorrow meal',1)];
  const original=JSON.stringify(entries);setup(entries);
  const daily=screen.getByRole('region',{name:"Today's Nutrition"});
  expect(within(daily).getAllByRole('article')).toHaveLength(2);
  expect(within(daily).getByText('Early today')).toBeVisible();
  expect(within(daily).getByText('Late today')).toBeVisible();
  expect(within(daily).queryByText('Yesterday meal')).toBeNull();
  expect(within(daily).queryByText('Tomorrow meal')).toBeNull();
  expect(within(daily).queryByText('Reusable food only')).toBeNull();
  expect(within(daily).getAllByText('120 calories')).toHaveLength(2);
  expect(within(daily).getAllByText('1.25 serving x 1 serving (30 g)')).toHaveLength(2);
  const history=screen.getByRole('region',{name:'Saved Entries'});
  expect(within(history).getAllByRole('article')).toHaveLength(4);
  expect(within(history).getByText('Yesterday meal')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nutrition date'),{target:{value:key(localDay(-1))}});
  const previous=screen.getByRole('region',{name:`Nutrition for ${label(localDay(-1))}`});
  expect(within(previous).getAllByRole('article')).toHaveLength(1);
  expect(within(previous).getByText('Yesterday meal')).toBeVisible();
  const totals=screen.getByRole('region',{name:'Daily Totals'});
  expect(within(totals).getByText('1680 left')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Nutrition date'),{target:{value:key(localDay(-2))}});
  expect(screen.getByRole('region',{name:`Nutrition for ${label(localDay(-2))}`})).toHaveTextContent(`No nutrition entries logged for ${label(localDay(-2))}.`);
  expect(within(totals).getByText('1800 left')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Nutrition date'),{target:{value:key(localDay(0))}});
  expect(screen.getByRole('region',{name:"Today's Nutrition"})).toBeVisible();
  expect(JSON.stringify(entries)).toBe(original);
});

test('daily log sits immediately below default-collapsed Water and above averages; entry controls start collapsed',()=>{
  setup();
  const entry=screen.getByRole('group',{name:'Add Nutrition Entry'}),water=screen.getByRole('group',{name:'Water'});
  expect(entry.open).toBe(false);expect(water.open).toBe(false);
  expect(screen.getByText('Save Entry',{selector:'button'})).not.toBeVisible();
  expect(screen.getByRole('group',{name:'Water display unit',hidden:true})).not.toBeVisible();
  const daily=screen.getByRole('region',{name:"Today's Nutrition"});
  expect(water.compareDocumentPosition(daily) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(daily.compareDocumentPosition(screen.getByRole('region',{name:'Nutrition Averages'})) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(daily).toHaveTextContent('No nutrition entries logged today.');
  fireEvent.click(within(entry).getByRole('heading')); expect(entry.open).toBe(true);
  expect(screen.getByRole('button',{name:'Save Entry'})).toBeVisible();
  fireEvent.click(within(water).getByRole('heading')); expect(water.open).toBe(true);
  expect(screen.getByRole('group',{name:'Water display unit'})).toBeVisible();
});

test('daily edit opens the existing form and updates the same ID; delete keeps the existing confirmation and callback',()=>{
  const entry=meal('Lunch',0),{props,rerender}=setup([entry]);
  fireEvent.click(within(screen.getByRole('region',{name:"Today's Nutrition"})).getByRole('button',{name:'Edit Lunch'}));
  expect(screen.getByRole('group',{name:'Edit Nutrition Entry'}).open).toBe(true);
  expect(screen.getByLabelText('Food / meal name')).toHaveValue('Lunch');
  expect(screen.getByLabelText('Number of servings')).toHaveValue(1.25);
  fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
  expect(props.updateNutritionEntry).toHaveBeenCalledWith(entry.id,expect.objectContaining({name:'Lunch',calories:120,sodium:null}));
  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
  const confirm=jest.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  fireEvent.click(within(screen.getByRole('region',{name:"Today's Nutrition"})).getByRole('button',{name:'Delete Lunch'}));
  expect(props.deleteNutritionEntry).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('region',{name:"Today's Nutrition"})).getByRole('button',{name:'Delete Lunch'}));
  expect(confirm).toHaveBeenCalledTimes(2);expect(props.deleteNutritionEntry).toHaveBeenCalledWith(entry.id);
  rerender(<NutritionPage {...props} nutritionEntries={[]}/>);
  expect(screen.getByRole('region',{name:"Today's Nutrition"})).toHaveTextContent('No nutrition entries logged today.');
});

test('daily log uses the full record collection even when the selected day lies outside the visible history page',()=>{
  const entries=[...Array.from({length:12},(_,i)=>meal(`Current meal ${i}`,0)),meal('Older selected meal',-1)];
  setup(entries);
  expect(within(screen.getByRole('region',{name:"Today's Nutrition"})).getAllByRole('article')).toHaveLength(12);
  expect(within(screen.getByRole('region',{name:'Saved Entries'})).getAllByRole('article')).toHaveLength(10);
  fireEvent.change(screen.getByLabelText('Nutrition date'),{target:{value:key(localDay(-1))}});
  const daily=screen.getByRole('region',{name:`Nutrition for ${label(localDay(-1))}`});
  expect(within(daily).getAllByRole('article')).toHaveLength(1);
  expect(within(daily).getByText('Older selected meal')).toBeVisible();
  expect(within(screen.getByRole('region',{name:'Saved Entries'})).queryByText('Older selected meal')).toBeNull();
});

test('legacy entries without an amount remain visible and unknown calories are distinct from declared zero',()=>{
  const unknown={...meal('Unknown calorie meal',0),calories:null};delete unknown.portion;
  const zero={...meal('Zero calorie meal',0),calories:0};delete zero.portion;
  setup([unknown,zero]);
  const daily=screen.getByRole('region',{name:"Today's Nutrition"});
  expect(within(daily).getByText('Unknown calories')).toBeVisible();
  expect(within(daily).getByText('0 calories')).toBeVisible();
  expect(within(daily).queryByText(/serving/)).toBeNull();
});
