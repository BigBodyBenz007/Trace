import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import PersonalPackageLabelEditor from './PersonalPackageLabelEditor';
import fixture from '../services/__fixtures__/personalPackageLabel.json';
const candidate={display:{name:'Test food',brand:'Test brand',packageQuantity:'1 pack',servingDescription:'30 g',nutrients:{}},selection:{serving:{description:'30 g',amount:30,unit:'g'}}};
test('camera and picker are wired separately for all evidence roles; unknowns start blank, disclosures collapsed',()=>{
 render(<PersonalPackageLabelEditor candidate={candidate} identifier={{value:'044000045586'}} lookupResult={{food:{}}} onCancel={()=>{}} onSaved={()=>{}}/>);
 expect(screen.getAllByLabelText('Take photo')).toHaveLength(4);
 screen.getAllByLabelText('Take photo').forEach(i=>{expect(i).toHaveAttribute('capture','environment');expect(i).toHaveAttribute('accept','image/*');});
 screen.getAllByLabelText('Choose photo').forEach(i=>expect(i).not.toHaveAttribute('capture'));
 expect(screen.getByLabelText('Sodium (mg)')).toHaveValue(null);
 expect(screen.getByRole('button',{name:'Read Nutrition Facts on device'})).not.toBeVisible();
 expect(screen.getByLabelText('Ingredient declaration')).not.toBeVisible();
 expect(screen.getByRole('button',{name:'Read Nutrition Facts on device'})).toBeDisabled();
});
test('manual revision keeps unknown distinct from zero, requires confirmation and never submits shared data',async()=>{
 const save=jest.fn().mockResolvedValue(fixture.profile),onSaved=jest.fn();
 render(<PersonalPackageLabelEditor candidate={{...candidate,personalLabel:fixture.profile}} identifier={{value:fixture.profile.barcode}} lookupResult={{food:{}}} onCancel={()=>{}} onSaved={onSaved} save={save}/>);
 fireEvent.change(screen.getByLabelText('Fiber (g)'),{target:{value:''}});
 fireEvent.change(screen.getByLabelText('Added sugars (g)'),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('button',{name:'Save my label'}));expect(save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox',{name:/I checked the product/}));
 fireEvent.click(screen.getByRole('button',{name:'Save my label'}));
 await waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
 expect(save.mock.calls[0][0].nutrients).toMatchObject({fiber:null,addedSugar:0});
 expect(save.mock.calls[0][0].previousVersionId).toBe(fixture.profile.id);
 expect(onSaved).toHaveBeenCalledTimes(1);
});
