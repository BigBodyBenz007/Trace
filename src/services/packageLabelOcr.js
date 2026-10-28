// User-initiated on-device OCR. Only static code/models are downloaded;
// the image Blob is passed to a local worker, never sent to an OCR service.
const OCR_SCRIPT = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
let scriptLoading;
async function loadOcr() {
  if (window.Tesseract) return window.Tesseract;
  if (!scriptLoading) scriptLoading = new Promise((resolve,reject)=>{
    const tag=document.createElement('script');tag.src=OCR_SCRIPT;tag.crossOrigin='anonymous';tag.integrity='sha384-r1ru3tcf6FhnCFR4B7pIFG+BhFF9LlFtz/P1y4pblWn3AGs9y3lBx5SKLNf4+rED';
    tag.onload=()=>resolve(window.Tesseract);tag.onerror=()=>reject(new Error('OCR could not load. Enter the label manually.'));
    document.head.appendChild(tag);
  }).catch(e=>{scriptLoading=null;throw e;});
  return scriptLoading;
}
export function parseLabelOcr(text, confidence = 0, lines = null) {
  const fields={}, unresolved=[];
  const patterns={calories:/^\s*calories\s+([\d.]+)\b/im,protein:/^\s*protein\s+([\d.]+)\s*g\b/im,
    carbohydrates:/^\s*total carb(?:ohydrate)?s?\.?\s+([\d.]+)\s*g\b/im,fat:/^\s*total fat\s+([\d.]+)\s*g\b/im,
    saturatedFat:/^\s*(?:sat\.|saturated) fat\s+([\d.]+)\s*g\b/im,fiber:/^\s*(?:dietary )?fiber\s+([\d.]+)\s*g\b/im,
    sodium:/^\s*sodium\s+([\d.]+)\s*mg\b/im,totalSugar:/^\s*total sugars?\s+([\d.]+)\s*g\b/im,
    addedSugar:/^\s*(?:incl(?:udes)?\.?\s+)([\d.]+)\s*g\s+added sugars?\b/im};
  for (const [key,pattern] of Object.entries(patterns)) {
    const match=String(text).match(pattern);
    const line=lines?.find(l=>l.text.trim()===match?.[0]?.trim());
    const reliableLine=lines===null || (line && line.confidence>=80 && (line.words || []).every(w=>w.confidence>=80));
    const value = confidence >= 80 && reliableLine ? match?.[1] : null;
    if (value != null && Number.isFinite(Number(value))) fields[key]=value; else unresolved.push(key);
  }
  return {fields,unresolved,confidence,text:String(text),draft:true};
}
export async function recognizeLabel(blob, onProgress = ()=>{}) {
  let worker,abandoned=false,timer;
  const work=(async()=>{
    const api=await loadOcr();if(abandoned)throw new Error('OCR canceled.');
    const ready=await api.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:p=>onProgress(p.status)});
    if(abandoned){await ready.terminate();throw new Error('OCR canceled.');}
    worker=ready;
    const {data}=await worker.recognize(blob,{}, {blocks:true});
    const lines=(data.blocks || []).flatMap(b=>(b.paragraphs || []).flatMap(p=>p.lines || []));
    return parseLabelOcr(data.text,data.confidence,lines);
  })();
  try { return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('OCR timed out. Enter the label manually.')),45000);})]); }
  finally { abandoned=true;clearTimeout(timer);await worker?.terminate(); }
}
