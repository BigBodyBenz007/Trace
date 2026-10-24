// Server-only preparation. Not an authentication implementation or database.
// A future handler must derive owner identity from a verified server session,
// never from request-body roles. No publication endpoint is currently enabled.
const crypto = require('node:crypto');
const copy=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const ROLES=['barcode','package','nutrition'];
const fingerprint = p => crypto.createHash('sha256').update(JSON.stringify([p.barcode.replace(/^0+/,''),p.variant,p.packageDescription,p.serving,
  Object.entries(p.nutrients).sort(),p.ingredientsConfirmed?p.ingredients:null])).digest('hex');
function reviewFlags(submission, existing, submissions=[]) {
  const panel=submission.panel,flags=[];
  const photos=submission.photos || [];
  for (const role of ROLES) if(!photos.some(p=>p.role===role)) flags.push({code:'missing-'+role+'-evidence',message:'Clear '+role+' evidence is required for approval.'});
  if(panel.ingredientsConfirmed&&!photos.some(p=>p.role==='ingredients')) flags.push({code:'missing-ingredient-evidence',message:'Ingredient changes need readable evidence from the same package.'});
  if(submissions.some(s=>s.id!==submission.id&&fingerprint(s.panel)===fingerprint(panel)))flags.push({code:'possible-duplicate',message:'Another submission has the same confirmed panel. Review both; do not reject automatically.'});
  const changes=[];
  if(existing && JSON.stringify(existing.serving)!==JSON.stringify(panel.serving)) flags.push({code:'serving-change',message:'Serving quantity or unit changed. Values below compare declarations, not a common quantity.'});
  for(const [key,value]of Object.entries(panel.nutrients)){
    const previous=existing?.nutrients?.[key]??null;
    if(value!==previous) changes.push({field:key,previous,submitted:value,major:value!==null&&previous!==null
      && (previous===0?value>0:value===0?previous>0:value>=previous*2||previous>=value*2)});
    if(value!==null&&(!Number.isFinite(value)||value<0))flags.push({code:'invalid-number',field:key,message:'Transcription requires review; no replacement inferred.'});
    if(submission.ocrDraft?.[key]!=null&&submission.ocrDraft[key]!==value)flags.push({code:'transcription-difference',field:key,ocr:submission.ocrDraft[key],submitted:value});
  }
  if(panel.nutrients.addedSugar>panel.nutrients.totalSugar&&panel.nutrients.totalSugar!==null)flags.push({code:'sugar-conflict',message:'Added sugar exceeds total sugar; inspect the photo and columns.'});
  if(panel.serving.unit==='g' && ['fat','protein','carbohydrates'].some(k=>panel.nutrients[k]>panel.serving.amount))flags.push({code:'quantity-review',message:'A macronutrient exceeds serving mass. Check units, columns and transcription.'});
  if(changes.some(c=>c.major))flags.push({code:'major-panel-departure',message:'A value changes by at least twofold or to/from zero. Review hint only; unusual foods are not automatically rejected.'});
  return {flags,changes,authenticity:'OCR, checks and uploaded photos do not establish authenticity.'};
}
function createPending(panel,photos,metadata={}) {
  // Upload/auth/size validation and private object ownership must precede this.
  return freeze({id:crypto.randomUUID(),status:'pending',panel:copy(panel),photos:copy(photos),submittedAt:new Date().toISOString(),
    metadata:copy(metadata),history:[],fingerprint:fingerprint(panel)});
}
function ownerDecision(submission,{actor,decision,finalPanel,reason,evidenceReviewed=false}) {
  if(actor?.serverVerifiedOwner!==true)throw Error('Owner authorization required.');
  if(!['approve','reject','withdraw'].includes(decision))throw Error('Unsupported decision.');
  if(decision==='withdraw'&&submission.status!=='approved')throw Error('Only approved versions can be withdrawn.');
  if(decision!=='withdraw'&&submission.status!=='pending')throw Error('Only pending submissions can be reviewed.');
  if(decision==='approve'&&(!evidenceReviewed||!finalPanel||ROLES.some(r=>!submission.photos.some(p=>p.role===r))
    || (finalPanel.ingredientsConfirmed&&!submission.photos.some(p=>p.role==='ingredients'))))throw Error('Complete evidence and explicit owner review are required.');
  if(!reason?.trim())throw Error('Record a review reason, including transcription edits or remaining concerns.');
  const event={id:crypto.randomUUID(),ownerId:actor.subject,decision,reason,at:new Date().toISOString(),
    submittedPanel:submission.panel,finalPanel:decision==='approve'?finalPanel:null,authenticity:'Owner review does not guarantee authenticity.'};
  return freeze({...submission,status:{approve:'approved',reject:'rejected',withdraw:'withdrawn'}[decision],
    finalPanel:decision==='approve'?finalPanel:submission.finalPanel,
    history:[...submission.history,copy(event)],approvedVersionId:submission.approvedVersionId || (decision==='approve'?crypto.randomUUID():null)});
}
// Rollback is another recorded owner decision: withdraw the new version and
// re-publish an explicitly reviewed prior edition, never mutate old history.
function rollbackVersion(current,previous,options) {
  if(!previous.finalPanel)throw Error('A previously reviewed version is required.');
  const withdrawn=ownerDecision(current,{...options,decision:'withdraw'});
  const pending=createPending(previous.finalPanel,previous.photos,{reinstatesVersionId:previous.approvedVersionId,withdrawnVersionId:current.approvedVersionId});
  const restored=ownerDecision(pending,{...options,decision:'approve',finalPanel:previous.finalPanel});
  return freeze({withdrawn,restored});
}
module.exports={reviewFlags,createPending,ownerDecision,rollbackVersion,fingerprint};
