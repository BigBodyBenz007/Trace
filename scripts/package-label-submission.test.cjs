const test=require('node:test'),assert=require('node:assert/strict');
test('unprovisioned submission and owner actions fail closed; no private evidence is served',async()=>{
 const {default:handler}=await import('../api/labels/submissions.mjs');
 for(const request of [{method:'GET',query:{id:'private-photo'}},{method:'POST',body:{role:'owner',action:'approve',photos:['fake']}},{method:'DELETE'}]){
  const state={};const response={setHeader:(k,v)=>{state[k]=v;},status:n=>{state.status=n;return response;},json:v=>{state.body=v;return response;}};
  handler(request,response);assert.equal(state.body.available,false);assert.equal(state.body.status,'unavailable');
  assert([503,405].includes(state.status));assert.equal(state['Cache-Control'],'no-store');
  assert(!JSON.stringify(state.body).includes('private-photo'));
 }
});
