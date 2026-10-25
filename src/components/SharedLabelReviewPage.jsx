import { useEffect, useState } from 'react';
import { ownerLabelRequest } from '../services/sharedPackageLabels';
import { LABEL_NUTRIENTS } from '../services/personalPackageLabels';
import './SharedLabelReviewPage.css';
import { readAppSettings } from '../services/appSettings';
import { resolveAppShellThemeId } from '../services/appThemes';

const UNITS={calories:'kcal',sodium:'mg'};
export default function SharedLabelReviewPage() {
  const [owner,setOwner]=useState(false),[available,setAvailable]=useState(true),[email,setEmail]=useState(''),[code,setCode]=useState('');
  const [rows,setRows]=useState([]),[status,setStatus]=useState('pending'),[detail,setDetail]=useState(null),[panel,setPanel]=useState(null);
  const [reason,setReason]=useState(''),[reviewed,setReviewed]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function run(action){setBusy(true);setMessage('');try{await action();}catch(error){setMessage(error.message);}finally{setBusy(false);}}
  useEffect(()=>{const settings=readAppSettings();document.documentElement.setAttribute('data-trace-theme',settings.themeId);document.documentElement.setAttribute('data-trace-shell-theme',resolveAppShellThemeId(settings.themeId));},[]);
  useEffect(()=>{let live=true;ownerLabelRequest('submissions').catch(()=>live&&setAvailable(false));
    ownerLabelRequest('session').then(()=>live&&setOwner(true)).catch(()=>{});return()=>{live=false;};},[]);
  useEffect(()=>{if(owner)ownerLabelRequest('review?status='+status).then(r=>setRows(r.submissions)).catch(e=>setMessage(e.message));},[owner,status]);
  async function open(id) {
    const data=await ownerLabelRequest('review?id='+id);
    setDetail(data);setPanel(JSON.parse(JSON.stringify(data.submission.panel)));setReason('');setReviewed(false);
  }
  async function decide(action,versionId) {
    await ownerLabelRequest('review',{action,id:detail.submission.id,revision:detail.submission.revision,reason,panel,evidenceReviewed:reviewed,versionId});
    await open(detail.submission.id);
    setRows((await ownerLabelRequest('review?status='+status)).submissions);setMessage('Decision recorded. Prior versions and submitted values remain in history.');
  }
  const field=(key,value)=>setPanel(p=>({...p,[key]:value}));
  return <main className="trace-label-owner"><a href="/">Back to Trace</a><h1>Private label review</h1>
    <p>Owner decisions publish label values, never private photos. Photos, OCR and review do not certify authenticity or a current package match.</p>
    {!available&&<p role="status">Shared storage and owner sign-in are not configured. Personal labels continue working. Follow the repository's shared-label setup instructions.</p>}
    {!owner?<form onSubmit={e=>{e.preventDefault();run(async()=>{await ownerLabelRequest('session',{action:'verify-code',email,code});setOwner(true);});}}>
      <label>Owner email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <button type="button" disabled={!available||busy||!email} onClick={()=>run(async()=>{await ownerLabelRequest('session',{action:'send-code',email});setMessage('Check your owner email for the code.');})}>Send sign-in code</button>
      <label>Email code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required/></label>
      <button disabled={!available||busy||!code}>Sign in</button>
    </form>:<>
      <button type="button" disabled={busy} onClick={()=>run(async()=>{await ownerLabelRequest('session',{action:'logout'});setOwner(false);setDetail(null);setRows([]);})}>Sign out</button>
      <label>Submission status<select value={status} onChange={e=>setStatus(e.target.value)}>{['pending','approved','rejected','withdrawn','uploading'].map(v=><option key={v}>{v}</option>)}</select></label>
      <ul aria-label="Submissions">{rows.map(row=><li key={row.id}><button type="button" disabled={busy} onClick={()=>run(()=>open(row.id))}>{row.panel.name} - {row.panel.variant} - {row.status}</button></li>)}</ul>
      {!rows.length&&<p>No {status} submissions.</p>}
      {detail&&panel&&<section aria-label="Submission review"><h2>{panel.name}</h2>
        <p>Status: {detail.submission.status}. Submitted: {detail.submission.submitted_at?new Date(detail.submission.submitted_at).toLocaleString():'Upload incomplete'}. User confirmation: {new Date(panel.confirmedAt).toLocaleString()}. Label publication date unknown.</p>
        <div className="trace-label-owner__review"><div aria-label="Private evidence">
          {detail.submission.photos.map(photo=><figure key={photo.role}><a href={'/api/labels/evidence?id='+detail.submission.id+'&role='+photo.role} target="_blank" rel="noreferrer">Open {photo.role} photo</a>
            <img alt={'Submitted '+photo.role+' evidence'} src={'/api/labels/evidence?id='+detail.submission.id+'&role='+photo.role}/>
            <figcaption>Uploaded {new Date(photo.uploadedAt).toLocaleString()}</figcaption></figure>)}</div>
          <div><h3>Final transcription</h3><p>Blank nutrition means unknown. Check the serving, units, full panel and package identity before approval.</p>
            <p>Barcode: {panel.barcode}</p>
            {['name','brand','variant','packageDescription'].map(key=><label key={key}>{key}<input value={panel[key]} onChange={e=>field(key,e.target.value)}/></label>)}
            <label>Serving description<input value={panel.serving.description} onChange={e=>field('serving',{...panel.serving,description:e.target.value})}/></label>
            <label>Serving quantity<input type="number" min="0" step="any" value={panel.serving.amount} onChange={e=>field('serving',{...panel.serving,amount:e.target.value===''?null:Number(e.target.value)})}/></label>
            <label>Serving unit<select value={panel.serving.unit} onChange={e=>field('serving',{...panel.serving,unit:e.target.value})}>{['g','ml','oz','US fl oz','serving'].map(u=><option key={u}>{u}</option>)}</select></label>
            <label>Servings per container<input type="number" min="0" step="any" value={panel.servingsPerContainer??''} onChange={e=>field('servingsPerContainer',e.target.value===''?null:Number(e.target.value))}/></label>
            {LABEL_NUTRIENTS.map(key=>{const previous=(detail.versions.find(v=>v.active)?.panel || detail.submission.metadata?.comparison)?.nutrients[key]??null;
              return <label key={key}>{key} ({UNITS[key]||'g'})<input aria-label={key+" ("+(UNITS[key]||"g")+")"} type="number" min="0" step="any" value={panel.nutrients[key]??''} onChange={e=>field('nutrients',{...panel.nutrients,[key]:e.target.value===''?null:Number(e.target.value)})}/>
                <small>Submitted: {detail.submission.panel.nutrients[key]??'Unknown'}. Existing {detail.versions.some(v=>v.active)?'reviewed edition':'provider comparison (unverified)'}: {previous??'Unknown'}{panel.nutrients[key]!==detail.submission.panel.nutrients[key]?' - Owner transcription edit':''}</small></label>;})}
            <label><input type="checkbox" checked={panel.ingredientsConfirmed} onChange={e=>field('ingredientsConfirmed',e.target.checked)}/> Ingredient declaration transcribed from this package</label>
            <label>Ingredients<textarea value={panel.ingredients||''} onChange={e=>field('ingredients',e.target.value)}/></label>
          </div></div>
        <h3>Existing edition comparison</h3>
        <p>{detail.versions.some(v=>v.active)?'Latest active reviewed edition':detail.submission.metadata?.comparison?.attribution||'No prior comparison available'}.</p>
        <p>Existing serving: {(detail.versions.find(v=>v.active)?.panel||detail.submission.metadata?.comparison)?.serving?.description||'Unknown'}. Submitted serving: {detail.submission.panel.serving.description}.</p>
        <details><summary>Existing ingredient declaration</summary><p>{(detail.versions.find(v=>v.active)?.panel||detail.submission.metadata?.comparison)?.ingredients||'Unknown'}</p></details>
        <h3>Review flags</h3><p>Hints for review, not replacement numbers or automatic rejection.</p>
        <ul>{detail.review.flags.map((f,i)=><li key={i}>{f.message||f.code}{f.field?' - '+f.field:''}</li>)}</ul>
        {detail.review.changes.length>0&&<table><caption>Submitted versus existing reviewed edition or unverified provider comparison</caption><thead><tr><th>Nutrient</th><th>Previous</th><th>Submitted</th></tr></thead><tbody>{detail.review.changes.map(c=><tr key={c.field}><th>{c.field}</th><td>{c.previous??'Unknown'}</td><td>{c.submitted??'Unknown'}{c.major?' - Major departure':''}</td></tr>)}</tbody></table>}
        <label>Decision reason / transcription changes / remaining qualifications<textarea value={reason} onChange={e=>setReason(e.target.value)} required/></label>
        <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed clear barcode, package and complete panel photos, and ingredient evidence for any ingredient publication.</label>
        {detail.submission.status==='pending'&&<div><button type="button" disabled={busy||!reason.trim()||!reviewed} onClick={()=>run(()=>decide('approve'))}>Approve this edition</button>
          <button type="button" disabled={busy||!reason.trim()} onClick={()=>run(()=>decide('reject'))}>Reject with reason</button></div>}
        <h3>Published versions</h3><ul>{detail.versions.map(v=><li key={v.id}>{v.id} - {v.active?'Available':'Withdrawn'} - {new Date(v.published_at).toLocaleString()}
          <button type="button" disabled={busy||!reason.trim()||(!v.active&&!reviewed)} onClick={()=>run(()=>decide(v.active?'withdraw':'restore',v.id))}>{v.active?'Withdraw version':'Re-publish prior edition as a new version'}</button></li>)}</ul>
        <details><summary>Decision history and submitted values</summary><pre>{JSON.stringify(detail.submission.history,null,2)}</pre><pre>{JSON.stringify(detail.submission.panel,null,2)}</pre></details>
      </section>}
    </>}
    {busy&&<p role="status">Working...</p>}{message&&<p role="status">{message}</p>}
  </main>;
}
