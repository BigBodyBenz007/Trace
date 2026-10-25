import { openPhotoDatabase, getPhoto } from '../storage/photoStorage';
import { canonicalGtinKey } from './productIdentifiers';
import { LABEL_NUTRIENTS } from './personalPackageLabels';

async function request(path, options={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),path.startsWith('versions?')?4000:15000);
  try {
    const response=await fetch('/api/labels/'+path,{...options,credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Shared labels are temporarily unavailable. Personal labels still work.');
    return result;
  } catch(error) {throw new Error(error.name==='AbortError'?'Shared review timed out. Your personal label is unchanged; retry when online.':error.message);}
  finally {clearTimeout(timer);}
}
export const labelServiceStatus=()=>request('submissions');
export const ownerLabelRequest=(action,body)=>request(action,body?{method:'POST',body:JSON.stringify(body)}:{});
export function submissionPanel(profile) {
  return {barcode:profile.barcode,name:profile.name,brand:profile.brand,variant:profile.variant,
    packageDescription:profile.packageDescription,serving:{amount:profile.serving.amount,unit:profile.serving.unit,description:profile.serving.description},
    servingsPerContainer:profile.servingsPerContainer,nutrients:Object.fromEntries(LABEL_NUTRIENTS.map(k=>[k,profile.nutrients[k]??null])),
    ingredientsConfirmed:profile.ingredientsConfirmed,ingredients:profile.ingredientsConfirmed?profile.ingredients:null,confirmedAt:profile.confirmedAt};
}
export function newSubmissionKey() {
  return {id:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')};
}
function photoBase64(blob) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('A label photo could not be read.'));
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});
}
export async function submitSharedLabel(profile,key,{consent,clearPhotosConfirmed,completePanelConfirmed,onProgress=()=>{}}={}) {
  const photos=profile.photos||[],required=['barcode','package','nutrition',...(profile.ingredientsConfirmed?['ingredients']:[])];
  if(!consent||!clearPhotosConfirmed||!completePanelConfirmed||required.some(role=>!photos.some(p=>p.role===role))) throw new Error('Confirm the complete label, clear required photos and upload consent.');
  const db=await openPhotoDatabase(),blobs=[];
  // Read only this label's evidence. No memory, archive, provider snapshot or other photo is uploaded.
  for(const ref of photos) {
    const photo=await getPhoto(db,ref.id);
    if(!photo?.blob||photo.blob.size>2097152) throw new Error('A required label photo is unavailable or too large. Edit your personal label first.');
    blobs.push({role:ref.role,blob:photo.blob});
  }
  const post=data=>request('submissions',{method:'POST',body:JSON.stringify({...key,...data})});
  const original=profile.providerObservation;
  const comparison=original?{nutrients:original.nutrients,serving:original.serving,ingredients:original.ingredients?.text||null,
    attribution:original.provenance?.attribution||'Original provider observation',sourceUrl:original.provenance?.sourceUrl||null}:null;
  const started=await post({action:'start',panel:submissionPanel(profile),comparison,consent:true,clearPhotosConfirmed:true,completePanelConfirmed:true});
  if(started.status!=='uploading') return started;
  for(const photo of blobs) {onProgress('Uploading '+photo.role+' photo...');await post({action:'photo',role:photo.role,base64:await photoBase64(photo.blob)});}
  onProgress('Submitting for review...');
  return post({action:'finish'});
}
export function validReviewedVersion(version,barcode) {
  const p=version?.panel;
  return version?.status==='active'&&typeof version.id==='string'&&p&&canonicalGtinKey(p.barcode)===canonicalGtinKey(barcode)
    && ['name','brand','variant','packageDescription'].every(k=>typeof p[k]==='string'&&p[k].trim())
    && p.serving?.amount>0&&['g','ml','oz','US fl oz','serving'].includes(p.serving.unit)&&typeof p.serving.description==='string'
    && (p.servingsPerContainer===null||(Number.isFinite(p.servingsPerContainer)&&p.servingsPerContainer>0))
    && Number.isFinite(Date.parse(p.confirmedAt))
    && LABEL_NUTRIENTS.every(k=>p.nutrients?.[k]===null||(typeof p.nutrients?.[k]==='number'&&Number.isFinite(p.nutrients[k])&&p.nutrients[k]>=0))
    && typeof p.ingredientsConfirmed==='boolean'&&(!p.ingredientsConfirmed||typeof p.ingredients==='string')
    && Number.isFinite(Date.parse(version.publishedAt));
}
export async function getReviewedLabels(barcode) {
  if(typeof navigator!=='undefined'&&navigator.onLine===false) return {versions:[],unavailable:true,offline:true};
  const result=await request('versions?barcode='+encodeURIComponent(barcode));
  return {...result,versions:(result.versions||[]).filter(v=>validReviewedVersion(v,barcode))};
}
export async function reviewedVersionStillActive(version) {
  const {versions}=await getReviewedLabels(version.panel.barcode);
  return versions.some(v=>v.id===version.id);
}
