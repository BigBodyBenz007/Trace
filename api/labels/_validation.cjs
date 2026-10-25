const crypto = require('node:crypto');
const KEYS = ['calories','protein','carbohydrates','fat','fiber','sodium','totalSugar','addedSugar','saturatedFat'];
const ROLES = ['barcode','package','nutrition','ingredients'];
const fail = (message, status=400) => Object.assign(new Error(message), {status});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function barcode(value) {
  if(typeof value!=='string'||! /^(?:\d{8}|\d{12,14})$/.test(value)) throw fail('A valid package barcode is required.');
  const digits=value.split('').map(Number), last=digits.pop();
  if((10-digits.reverse().reduce((n,d,i)=>n+d*(i%2?1:3),0)%10)%10!==last) throw fail('Check the barcode digits.');
  return value.padStart(14,'0');
}
function text(value, name, max=300) {
  if(typeof value!=='string'||!value.trim()||value.length>max) throw fail('Check '+name+'.');
  return value.trim();
}
function panel(input) {
  if(!input||typeof input!=='object') throw fail('A confirmed panel is required.');
  const n={};
  for(const key of KEYS) {
    const value=input.nutrients?.[key];
    if(value!==null && !(typeof value==='number'&&Number.isFinite(value)&&value>=0)) throw fail('Check '+key+'; unknown values must be null.');
    n[key]=value;
  }
  const amount=input.serving?.amount;
  if(!(typeof amount==='number'&&Number.isFinite(amount)&&amount>0)||!['g','ml','oz','US fl oz','serving'].includes(input.serving?.unit)) throw fail('Check the serving quantity and unit.');
  const count=input.servingsPerContainer;
  if(count!==null&&!(typeof count==='number'&&Number.isFinite(count)&&count>0)) throw fail('Check servings per container.');
  if(typeof input.ingredientsConfirmed!=='boolean') throw fail('Confirm whether ingredients were transcribed.');
  if(typeof input.confirmedAt!=='string'||!Number.isFinite(Date.parse(input.confirmedAt))) throw fail('The confirmation date is required.');
  return {barcode:barcode(input.barcode),name:text(input.name,'product name'),brand:text(input.brand,'brand'),
    variant:text(input.variant,'variant'),packageDescription:text(input.packageDescription,'package size'),
    serving:{amount,unit:input.serving.unit,description:text(input.serving.description,'serving description')},
    servingsPerContainer:count,nutrients:n,ingredientsConfirmed:input.ingredientsConfirmed,
    ingredients:input.ingredientsConfirmed?text(input.ingredients,'ingredient declaration',8192):null,
    confirmedAt:new Date(input.confirmedAt).toISOString()};
}
function metadata(input={}) {
  // Deliberately exclude provider snapshots, personal records, photo IDs and filenames.
  const result={};
  if(input.ocrDraft&&typeof input.ocrDraft==='object') result.ocrDraft=Object.fromEntries(KEYS.filter(k=>Number.isFinite(input.ocrDraft[k])).map(k=>[k,input.ocrDraft[k]]));
  return result;
}
async function image(base64) {
  if(typeof base64!=='string'||base64.length>2800000||(base64.length%4!==0||/[^A-Za-z0-9+/=]/.test(base64))) throw fail('Use a JPEG, PNG or WebP photo no larger than 2 MiB.');
  const buffer=Buffer.from(base64,'base64');
  if(buffer.toString('base64')!==base64) throw fail('Invalid photo encoding.');
  if(!buffer.length||buffer.length>2*1024*1024) throw fail('Each photo must be at most 2 MiB.',413);
  const sharp=require('sharp');
  try {
    const info=await sharp(buffer,{limitInputPixels:24000000,failOn:'warning'}).metadata();
    if(!['jpeg','png','webp'].includes(info.format)||(info.pages||1)!==1||!info.width||!info.height) throw fail('Use one still JPEG, PNG or WebP photo.');
    // Decode fully and re-encode. Do not retain EXIF, original filename or metadata.
    const cleaned=await sharp(buffer,{limitInputPixels:24000000,failOn:'warning'}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
    if(cleaned.length>2*1024*1024) throw fail('The processed photo exceeds 2 MiB.',413);
    return {buffer:cleaned,hash:hash(cleaned),mimeType:'image/jpeg'};
  } catch(error) { if(error.status) throw error; throw fail('The photo could not be decoded safely.'); }
}
function comparison(input) {
  if(!input || typeof input!=='object') return null;
  const nutrients={};
  for(const key of KEYS) nutrients[key]=typeof input.nutrients?.[key]==='number'&&Number.isFinite(input.nutrients[key])&&input.nutrients[key]>=0?input.nutrients[key]:null;
  return {nutrients,serving:{amount:Number.isFinite(input.serving?.amount)?input.serving.amount:null,
    unit:typeof input.serving?.unit==='string'?input.serving.unit.slice(0,30):'',description:typeof input.serving?.description==='string'?input.serving.description.slice(0,300):''},
    ingredients:typeof input.ingredients==='string'?input.ingredients.slice(0,8192):null,
    attribution:typeof input.attribution==='string'?input.attribution.slice(0,300):'Submitter-supplied comparison; unverified',
    sourceUrl:typeof input.sourceUrl==='string'&&input.sourceUrl.startsWith('https://')?input.sourceUrl.slice(0,1000):null};
}
module.exports={KEYS,ROLES,fail,hash,uuid,barcode,panel,metadata,image,comparison};
