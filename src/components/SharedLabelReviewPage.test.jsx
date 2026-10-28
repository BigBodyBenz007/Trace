import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import SharedLabelReviewPage from './SharedLabelReviewPage';
import SharedLabelSubmission from './SharedLabelSubmission';
import { ownerLabelRequest,labelServiceStatus,submitSharedLabel,newSubmissionKey } from '../services/sharedPackageLabels';
import { profile } from '../services/__fixtures__/personalPackageLabel.json';
jest.mock('../services/sharedPackageLabels',()=>({ownerLabelRequest:jest.fn(),labelServiceStatus:jest.fn(),submitSharedLabel:jest.fn(),
 newSubmissionKey:jest.fn(()=>({id:'synthetic-key',secret:'test-only'}))}));
beforeEach(()=>{jest.clearAllMocks();sessionStorage.clear();});
test('unconfigured sharing leaves personal label intact and cannot upload without explicit consent',async()=>{
 labelServiceStatus.mockRejectedValue(new Error('not configured'));
 const view=render(<SharedLabelSubmission profile={profile}/>);
 await screen.findByText(/Shared review is not configured/);
 expect(screen.getByRole('button',{name:'Submit for owner review'})).toBeDisabled();
 expect(submitSharedLabel).not.toHaveBeenCalled();expect(profile.status).toBe('active');view.unmount();
});
test('consented retry uses the same key and leaves receipt pending, never auto-published',async()=>{
 labelServiceStatus.mockResolvedValue({available:true});
 const p={...profile,photos:['barcode','package','nutrition'].map(role=>({id:role,role}))};
 submitSharedLabel.mockRejectedValueOnce(new Error('Temporary connection loss')).mockResolvedValueOnce({id:'synthetic-key',status:'pending'});
 render(<SharedLabelSubmission profile={p}/>);
 const button=screen.getByRole('button',{name:'Submit for owner review'});
 await waitFor(()=>expect(labelServiceStatus).toHaveBeenCalled());
 expect(button).toBeDisabled();
 for(const checkbox of screen.getAllByRole('checkbox'))fireEvent.click(checkbox);
 await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);await screen.findByText('Temporary connection loss');
 fireEvent.click(button);await screen.findByText(/Status: pending/);
 expect(submitSharedLabel.mock.calls[0][1]).toEqual(submitSharedLabel.mock.calls[1][1]);expect(newSubmissionKey).toHaveBeenCalledTimes(1);
});
test('private owner screen shows photos beside editable values, differences, flags and recorded approval reason',async()=>{
 const row={id:'synthetic-submission',status:'pending',revision:3,panel:profile,photos:[{role:'nutrition',uploadedAt:'2026-10-24T17:00:00Z'}],submitted_at:'2026-10-24T17:01:00Z',metadata:{comparison:{nutrients:{...profile.nutrients,sodium:370},serving:profile.serving,attribution:'Unverified captured provider'}},history:[]};
 ownerLabelRequest.mockImplementation(async(path,body)=>{
  if(path==='submissions')return {available:true};if(path==='session')return {owner:true};
  if(path.startsWith('review?status'))return {submissions:[row]};
  if(path.startsWith('review?id'))return {submission:row,versions:[],review:{flags:[{code:'major-panel-departure',message:'Review this departure; no replacement inferred.'}],changes:[{field:'sodium',previous:370,submitted:340,major:false}]}};
  if(path==='review'&&body){row.status='approved';return {submission:row};}return {};
 });
 render(<SharedLabelReviewPage/>);
 fireEvent.click(await screen.findByRole('button',{name:/Seeded Jumbo Burger Buns/}));
 expect(await screen.findByAltText('Submitted nutrition evidence')).toHaveAttribute('src',expect.stringContaining('/api/labels/evidence?'));
 expect(screen.getByText('Unverified captured provider.')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('sodium (mg)',{selector:'input'}),{target:{value:'345'}});
 fireEvent.change(screen.getByLabelText('Decision reason / transcription changes / remaining qualifications'),{target:{value:'Corrected sodium transcription after checking the photo.'}});
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed clear/}));
 fireEvent.click(screen.getByRole('button',{name:'Approve this edition'}));
 await waitFor(()=>expect(ownerLabelRequest).toHaveBeenCalledWith('review',expect.objectContaining({action:'approve',revision:3,reason:expect.stringContaining('Corrected sodium'),panel:expect.objectContaining({nutrients:expect.objectContaining({sodium:345})})})));
});

test('owner password form signs in without email delivery and clears its password after sign-out',async()=>{
 ownerLabelRequest.mockImplementation(async(path,body)=>{
  if(path==='session'&&!body)throw new Error('Sign-in required');
  if(path==='session'&&body.action==='sign-in')return {owner:true};
  if(path==='session'&&body.action==='logout')return {owner:false};
  if(path.startsWith('review?status'))return {submissions:[]};return {available:true};
 });
 render(<SharedLabelReviewPage/>);
 const password=screen.getByLabelText('Owner password');
 expect(password).toHaveAttribute('type','password');expect(password).toHaveAttribute('autoComplete','current-password');
 expect(screen.queryByRole('button',{name:'Send sign-in code'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Sign in'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Owner email'),{target:{value:'owner@example.test'}});
 fireEvent.change(password,{target:{value:'synthetic-owner-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
 fireEvent.click(await screen.findByRole('button',{name:'Sign out'}));
 expect(await screen.findByLabelText('Owner password')).toHaveValue('');
 expect(ownerLabelRequest).toHaveBeenCalledWith('session',{action:'sign-in',email:'owner@example.test',password:'synthetic-owner-password'});
 expect(ownerLabelRequest.mock.calls.filter(([,body])=>body?.action==='send-code')).toHaveLength(0);
});

test('failed owner sign-in stays private, clears the password and cannot grant review access',async()=>{
 ownerLabelRequest.mockImplementation(async(path,body)=>{
  if(path==='session')throw new Error(body?'Owner sign-in failed. Check your email and password.':'Sign-in required');
  return {available:true};
 });
 render(<SharedLabelReviewPage/>);
 fireEvent.change(screen.getByLabelText('Owner email'),{target:{value:'owner@example.test'}});
 fireEvent.change(screen.getByLabelText('Owner password'),{target:{value:'synthetic-wrong-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
 await screen.findByText('Owner sign-in failed. Check your email and password.');
 expect(screen.getByLabelText('Owner password')).toHaveValue('');
 expect(screen.queryByRole('button',{name:'Sign out'})).not.toBeInTheDocument();
 expect(ownerLabelRequest.mock.calls.some(([url])=>url.startsWith('review?'))).toBe(false);
});
