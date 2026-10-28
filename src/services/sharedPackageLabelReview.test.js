const {reviewFlags,createPending,ownerDecision,rollbackVersion}=require('../../api/labels/_reviewPolicy.cjs');
const {profile}=require('./__fixtures__/personalPackageLabel.json');
const photos=['barcode','package','nutrition'].map(role=>({role,id:role}));
test('nothing becomes approved automatically; owner decisions retain final transcription edits and history',()=>{
  const pending=createPending(profile,photos);expect(pending.status).toBe('pending');
  expect(()=>ownerDecision(pending,{actor:{role:'owner'},decision:'approve',finalPanel:profile,evidenceReviewed:true,reason:'reviewed'})).toThrow('Owner authorization');
  const finalPanel={...profile,nutrients:{...profile.nutrients,sodium:345}};
  const approved=ownerDecision(pending,{actor:{serverVerifiedOwner:true,subject:'verified-owner'},decision:'approve',finalPanel,evidenceReviewed:true,reason:'Corrected transcription from photo'});
  expect(approved.finalPanel.nutrients.sodium).toBe(345);expect(approved.history[0].submittedPanel.nutrients.sodium).toBe(340);
  expect(pending.status).toBe('pending');
  const withdrawn=ownerDecision(approved,{actor:{serverVerifiedOwner:true,subject:'verified-owner'},decision:'withdraw',reason:'Evidence questioned'});
  expect(withdrawn.status).toBe('withdrawn');expect(withdrawn.history).toHaveLength(2);expect(approved.status).toBe('approved');
});
test('missing evidence prevents publication, while duplicates and unusual valid values produce review flags only',()=>{
  const pending=createPending(profile,[]);
  expect(()=>ownerDecision(pending,{actor:{serverVerifiedOwner:true},decision:'approve',finalPanel:profile,evidenceReviewed:true,reason:'ok'})).toThrow('Complete evidence');
  const same=createPending(profile,photos);
  const {flags,changes}=reviewFlags({...same,ocrDraft:{sodium:999}}, {...profile,nutrients:{...profile.nutrients,sodium:100}},[same,createPending(profile,photos)]);
  expect(flags.map(f=>f.code)).toEqual(expect.arrayContaining(['possible-duplicate','transcription-difference','major-panel-departure']));
  expect(same.status).toBe('pending');expect(changes.find(c=>c.field==='sodium')).toMatchObject({previous:100,submitted:340,major:true});
});
test('ingredient replacement needs its own photo and questionable submissions can stay pending or be rejected',()=>{
  const pending=createPending({...profile,ingredientsConfirmed:true,ingredients:'Wheat, water.'},photos);
  expect(()=>ownerDecision(pending,{actor:{serverVerifiedOwner:true},decision:'approve',finalPanel:pending.panel,evidenceReviewed:true,reason:'ok'})).toThrow('Complete evidence');
  const rejected=ownerDecision(pending,{actor:{serverVerifiedOwner:true,subject:'owner'},decision:'reject',reason:'Package identity cannot be established'});
  expect(rejected.status).toBe('rejected');expect(rejected.history[0].reason).toContain('identity');
});

test('rollback creates a new recorded publication, never rewrites previous approvals',()=>{
 const actor={serverVerifiedOwner:true,subject:'owner'},opts={actor,evidenceReviewed:true,reason:'Evidence reviewed'};
 const prior=ownerDecision(createPending(profile,photos),{...opts,decision:'approve',finalPanel:profile});
 const next=ownerDecision(createPending({...profile,id:'next'},photos),{...opts,decision:'approve',finalPanel:{...profile,id:'next'}});
 const result=rollbackVersion(next,prior,opts);expect(result.withdrawn.status).toBe('withdrawn');expect(result.restored.status).toBe('approved');
 expect(result.restored.approvedVersionId).not.toBe(prior.approvedVersionId);expect(prior.status).toBe('approved');expect(next.status).toBe('approved');
 expect(Object.isFrozen(result.restored.history[0].finalPanel)).toBe(true);
});
