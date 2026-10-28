import { useEffect, useRef, useState } from 'react';
import { LABEL_NUTRIENTS, labelScope, savePersonalLabel } from '../services/personalPackageLabels';
import { prepareLabelPhoto } from '../services/packageLabelPhotos';
import { recognizeLabel } from '../services/packageLabelOcr';
import { openPhotoDatabase, getPhoto } from '../storage/photoStorage';
import './PersonalPackageLabelEditor.css';

const LABELS={calories:'Calories (kcal)',protein:'Protein (g)',carbohydrates:'Carbohydrates (g)',fat:'Total fat (g)',
  saturatedFat:'Saturated fat (g)',fiber:'Fiber (g)',sodium:'Sodium (mg)',totalSugar:'Total sugars (g)',addedSugar:'Added sugars (g)'};
export function LabelPhoto({photo}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{let active=true,objectUrl;
    Promise.resolve(photo.blob ? photo : openPhotoDatabase().then(db=>getPhoto(db,photo.id)))
      .then(p=>{if(p?.blob && active){objectUrl=URL.createObjectURL(p.blob);setUrl(objectUrl);}}).catch(()=>{});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[photo]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={photo.role+' label evidence'} /></a> : <span>Photo not loaded</span>;
}
export default function PersonalPackageLabelEditor({candidate,lookupResult,identifier,onCancel,onSaved,
  save=savePersonalLabel,preparePhoto=prepareLabelPhoto,recognize=recognizeLabel}) {
  const prior=candidate.personalLabel, display=candidate.display;
  const reference=(candidate.originalCandidate || candidate).display;
  const serving=prior?.serving || candidate.selection?.serving || candidate.recovery?.food?.serving || lookupResult?.food?.serving || {};
  const [identity,setIdentity]=useState(()=>({name:prior?.name || display.name || '',brand:prior?.brand || display.brand || '',
    variant:prior?.variant || '',packageDescription:prior?.packageDescription || display.packageQuantity || '',
    description:serving.description || display.servingDescription || '',amount:serving.amount || '',unit:['g','ml','oz','US fl oz','serving'].includes(serving.unit)?serving.unit:'serving',
    servingsPerContainer:prior?.servingsPerContainer ?? display.servingsPerContainer ?? ''}));
  // The original provider panel stays visible as a reference. Blank fields
  // deliberately require the user to transcribe/OCR this package, not rubber-stamp a mismatched edition.
  const [values,setValues]=useState(()=>Object.fromEntries(LABEL_NUTRIENTS.map(k=>[k,prior?.nutrients[k] ?? ''])));
  const [ingredients,setIngredients]=useState(prior?.ingredients || '');
  const [ingredientsConfirmed,setIngredientsConfirmed]=useState(prior?.ingredientsConfirmed || false);
  const [photos,setPhotos]=useState(prior?.photos || []);
  const [confirmed,setConfirmed]=useState(false),[autoUse,setAutoUse]=useState(prior?.autoUse ?? true);
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [ocr,setOcr]=useState(null);
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{document.getElementById('package-label-name')?.focus();},[]);
  function field(key,value){setIdentity(x=>({...x,[key]:value}));setConfirmed(false);setIngredientsConfirmed(false);}
  async function photoChanged(event,role) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    setBusy(true);setError('');
    try{const p=await preparePhoto(file,role);if(active.current){setPhotos(ps=>[...ps.filter(x=>x.role!==role),p]);setConfirmed(false);setIngredientsConfirmed(false);setMessage('Photo ready on this device. Nothing has been uploaded.');}}
    catch(e){if(active.current)setError(e.message);}finally{if(active.current)setBusy(false);}
  }
  async function runOcr(){
    const photo=photos.find(p=>p.role==='nutrition');if(!photo)return;
    setBusy(true);setError('');setMessage('Reading the photo on this device...');
    try {const p=photo.blob?photo:await openPhotoDatabase().then(db=>getPhoto(db,photo.id));
      const result=await recognize(p.blob);
      if(active.current){setOcr(result);setMessage('OCR draft only. Check every value against your package. Unreadable fields stay blank.');setConfirmed(false);}
    }catch(e){if(active.current)setError(e.message+' You can enter all values manually.');}
    finally{if(active.current)setBusy(false);}
  }
  async function submit(event) {
    event.preventDefault();setError('');if(!confirmed){setError('Confirm that you checked the product, serving and every entered value.');return;}
    const nutrients=Object.fromEntries(LABEL_NUTRIENTS.map(k=>[k,String(values[k]).trim()===''?null:Number(values[k])]));
    if(Object.values(nutrients).some(v=>v!==null&&(!Number.isFinite(v)||v<0))){setError('Enter non-negative numbers, or leave unknown values blank.');return;}
    if(nutrients.addedSugar!==null && nutrients.totalSugar!==null && nutrients.addedSugar>nutrients.totalSugar){setError('Added sugars exceed total sugars. Check the serving column and units; leave unresolved values blank.');return;}
    const now=new Date().toISOString(),id='package-label-'+(crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16))).map(v=>v.toString(16).padStart(2,'0')).join(''));
    const profile={schemaVersion:1,id,editionId:prior?.editionId || id,previousVersionId:prior?.id || null,
      barcode:identifier.value,name:identity.name.trim(),brand:identity.brand.trim(),variant:identity.variant.trim(),
      packageDescription:identity.packageDescription.trim(),serving:{description:identity.description.trim(),amount:Number(identity.amount),unit:identity.unit},
      servingsPerContainer:identity.servingsPerContainer===''?null:Number(identity.servingsPerContainer),
      nutrients,ingredients:ingredientsConfirmed?ingredients.trim():null,ingredientsConfirmed,
      photos:photos.map(({id,role,bytes,mimeType})=>({id,role,bytes,mimeType})),autoUse,status:'active',
      observedScope:prior?.observedScope || labelScope(lookupResult?.food),createdAt:prior?.createdAt || now,confirmedAt:now,
      providerObservation:prior?.providerObservation || lookupResult?.food || null,
      provenance:{kind:'user-confirmed-package-label',authenticity:'Not independently authenticated',ocrUsed:!!ocr,ocrDraft:ocr ? {confidence:ocr.confidence,fields:ocr.fields,unresolved:ocr.unresolved} : null}};
    setBusy(true);
    try {await save(profile,photos.filter(p=>p.blob));if(active.current)onSaved(profile);}
    catch(e){if(active.current)setError(e.message);}finally{if(active.current)setBusy(false);}
  }
  return <form className="trace-package-label" onSubmit={submit} aria-label="Your package label">
    <h3>Use my package label</h3>
    <p>Confirm your package, then enter its declared values for one serving. Blank means unknown. This stays on this device and does not sync automatically.</p>
    <p>Barcode: <strong>{identifier.value}</strong></p>
    <details><summary>Package photos</summary><p>Choose a clear Nutrition Facts photo to read on this device. Additional photos can document the barcode, package and ingredients. Photos and OCR do not prove authenticity.</p>
      {['nutrition','barcode','package','ingredients'].map(role=><div key={role} className="trace-package-label__photo">
        <strong>{role==='nutrition'?'Nutrition Facts':role==='package'?'Product / package':role==='barcode'?'Barcode':'Ingredients'} photo</strong>
        <label>Take photo<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>photoChanged(e,role)} /></label>
        <label>Choose photo<input type="file" accept="image/*" disabled={busy} onChange={e=>photoChanged(e,role)} /></label>
        {photos.filter(p=>p.role===role).map(p=><div key={p.id}><LabelPhoto photo={p}/><button type="button" onClick={()=>setPhotos(ps=>ps.filter(x=>x.id!==p.id))}>Remove {role} photo</button></div>)}
      </div>)}
      <p>Optional OCR downloads reading software, then processes the photo on your device. Your photo is not uploaded.</p>
      <button type="button" disabled={busy || !photos.some(p=>p.role==='nutrition')} onClick={runOcr}>Read Nutrition Facts on device</button>
      {ocr && <div><p>Recognition confidence: {Math.round(ocr.confidence)}%. Review the draft before using it. Unresolved: {ocr.unresolved.map(k=>LABELS[k]).join(', ') || 'none detected; all values still need your confirmation'}.</p>
        <button type="button" onClick={()=>{setValues(v=>({...v,...ocr.fields}));setConfirmed(false);setIngredientsConfirmed(false);}}>Use OCR draft in fields</button>
        <details><summary>Recognized text</summary><pre>{ocr.text}</pre></details></div>}
    </details>
    <div className="trace-package-label__grid">
      {['name','brand','variant','packageDescription'].map(k=><label key={k}>{({name:'Product name',brand:'Brand',variant:'Flavor / variant (or Plain)',packageDescription:'Package size / identity'})[k]}
        <input id={k==='name'?'package-label-name':undefined} required maxLength={200} value={identity[k]} onChange={e=>field(k,e.target.value)} /></label>)}
    </div>
    <div className="trace-package-label__grid">
      <label>Serving description<input required maxLength={200} value={identity.description} onChange={e=>field('description',e.target.value)} placeholder="1 bun (65 g)" /></label>
      <label>Declared quantity<input required type="number" min="0.000001" step="any" value={identity.amount} onChange={e=>field('amount',e.target.value)} /></label>
      <label>Declared unit<select value={identity.unit} onChange={e=>field('unit',e.target.value)}><option value="g">g</option><option value="ml">mL</option><option value="oz">oz</option><option value="US fl oz">US fl oz</option><option value="serving">labeled serving (count only)</option></select></label>
      <label>Servings per container (if stated)<input type="number" min="0.000001" step="any" value={identity.servingsPerContainer} onChange={e=>field('servingsPerContainer',e.target.value)} /></label>
      {LABEL_NUTRIENTS.map(k=><label key={k}>{LABELS[k]}<input inputMode="decimal" type="number" min="0" step="any" placeholder="Unknown" value={values[k]} onChange={e=>{setValues(v=>({...v,[k]:e.target.value}));setConfirmed(false);setIngredientsConfirmed(false);}} /></label>)}
    </div>
    <details><summary>Original values for comparison</summary><p>These describe the previous source, not confirmation of your package.</p>
      <dl>{LABEL_NUTRIENTS.map(k=><div key={k}><dt>{LABELS[k]}</dt><dd>{reference.nutrients[k] ?? 'Unknown'}</dd></div>)}</dl></details>
    <details><summary>Ingredients for this package (optional)</summary><p>Do not copy ingredients from another edition. Without confirmation, this package's additive review stays incomplete.</p>
      <label>Ingredient declaration<textarea rows="4" maxLength={8192} value={ingredients} onChange={e=>{setIngredients(e.target.value);setIngredientsConfirmed(false);setConfirmed(false);}} /></label>
      <label><input type="checkbox" checked={ingredientsConfirmed} onChange={e=>{setIngredientsConfirmed(e.target.checked);setConfirmed(false);}} />I checked this ingredient declaration against the same package.</label>
    </details>
    <label><input type="checkbox" checked={autoUse} onChange={e=>setAutoUse(e.target.checked)} />Remember for matching future scans. Ask me when the product record or package is different.</label>
    <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />I checked the product, barcode, serving and every entered value against my package.</label>
    <p role="status">{message}</p>{error&&<p role="alert">{error}</p>}
    <div className="trace-package-label__actions"><button type="submit" disabled={busy}>Save my label</button><button type="button" disabled={busy} onClick={onCancel}>Cancel label changes</button></div>
  </form>;
}
