import './SharedLabelSubmission.css';
import { useEffect, useState } from 'react';
import { labelServiceStatus, newSubmissionKey, submitSharedLabel } from '../services/sharedPackageLabels';

export default function SharedLabelSubmission({profile}) {
  const [available,setAvailable]=useState(null),[consent,setConsent]=useState(false),[clear,setClear]=useState(false),[complete,setComplete]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[receipt,setReceipt]=useState(null);
  // Session-only capability is excluded from backups and never sent except to this same-origin API.
  const storageKey='trace-label-submission:'+profile.id;
  const [key,setKey]=useState(()=>{try {const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved?.id&&saved?.secret)return saved;}catch{}
    const next=newSubmissionKey();try {sessionStorage.setItem(storageKey,JSON.stringify(next));}catch{}return next;});
  useEffect(()=>{let live=true;labelServiceStatus().then(()=>live&&setAvailable(true)).catch(()=>live&&setAvailable(false));return()=>{live=false;};},[]);
  const required=['barcode','package','nutrition',...(profile.ingredientsConfirmed?['ingredients']:[])];
  const missing=required.filter(role=>!profile.photos.some(p=>p.role===role));
  async function submit() {
    setBusy(true);setMessage('');
    try {const result=await submitSharedLabel(profile,key,{consent,clearPhotosConfirmed:clear,completePanelConfirmed:complete,onProgress:setMessage});
      setReceipt(result);setMessage(result.status==='pending'?'Submitted for private owner review. It is not published.':'Submission status: '+result.status+'. Your personal label is unchanged.');}
    catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  return <details className="trace-package-label-evidence"><summary>Optional shared review</summary>
    <p>Your personal label works without sharing. Submission uploads only this confirmed product identity, serving, nutrition, confirmed ingredients, the relevant provider comparison panel and {profile.photos.length} label photos to Trace's private review service.</p>
    <p>Photos and checks do not prove authenticity. Nothing is published automatically. Approved values may be offered as a separate package edition; photos stay private.</p>
    {available===false&&<p role="status">Shared review is not configured yet. Nothing has been uploaded. Keep using your personal label.</p>}
    {available===null&&<p>Checking shared review availability...</p>}
    {missing.length>0&&<p>First edit your personal label to add clear {missing.join(', ')} photos.</p>}
    {!receipt&&<><label><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/> I transcribed the complete Nutrition Facts panel; blanks mean unknown, not zero.</label>
      <label><input type="checkbox" checked={clear} onChange={e=>setClear(e.target.checked)}/> Photos clearly show this package, its barcode and the complete panel{profile.ingredientsConfirmed?' and ingredient declaration':''}.</label>
      <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to upload these label fields and photos for private review and possible publication of reviewed label values.</label>
      <button type="button" onClick={submit} disabled={available!==true||busy||missing.length>0||!consent||!clear||!complete}>{busy?'Submitting...':'Submit for owner review'}</button></>}
    {message&&<p role="status">{message}</p>}
    {!receipt&&/expired|Start a new submission/i.test(message)&&<button type="button" onClick={()=>{const next=newSubmissionKey();setKey(next);try{sessionStorage.setItem(storageKey,JSON.stringify(next));}catch{}setMessage('New retry key ready. Review your consent and submit again.');}}>Start a new submission</button>}
    {receipt&&<p>Submission {receipt.id}. Status: {receipt.status}.</p>}
    <a href="/?labelReview=1">Owner review sign-in</a>
  </details>;
}
