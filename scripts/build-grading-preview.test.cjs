const {test}=require('node:test');
const assert=require('node:assert/strict');
const {gradingBuildEnvironment,PREVIEW_BRANCH}=require('./build-grading-preview.cjs');
test('only the approved Vercel Preview branch enables grading',()=>{
 const input={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PREVIEW_BRANCH,USDA_FDC_API_KEY:'synthetic-server-secret'};
 const result=gradingBuildEnvironment(input);
 assert.equal(result.REACT_APP_TRACE_GRADING_PREVIEW,'true');
 assert.equal(result.REACT_APP_TRACE_DEPLOYMENT_ENV,'preview');
 assert.equal(result.USDA_FDC_API_KEY,input.USDA_FDC_API_KEY);
 assert(!Object.keys(result).some(key=>key.startsWith('REACT_APP_')&&key.includes('KEY')));
 assert.equal(input.REACT_APP_TRACE_GRADING_PREVIEW,undefined);
});
for(const [deployment,branch] of [['production',PREVIEW_BRANCH],['preview','main'],['preview','other-preview'],['development',PREVIEW_BRANCH],[undefined,undefined]]){
 test('fails closed for '+deployment+' / '+branch,()=>{
  const result=gradingBuildEnvironment({VERCEL_ENV:deployment,VERCEL_GIT_COMMIT_REF:branch,
   REACT_APP_TRACE_GRADING_PREVIEW:'true',REACT_APP_TRACE_DEPLOYMENT_ENV:'preview'});
  assert.equal(result.REACT_APP_TRACE_GRADING_PREVIEW,'false');
  assert.equal(result.REACT_APP_TRACE_DEPLOYMENT_ENV,deployment||'');
 });
}
