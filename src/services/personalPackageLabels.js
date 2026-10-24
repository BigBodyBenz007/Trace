import { canonicalGtinKey } from './productIdentifiers';
import { preparePhotoStorage } from './photoStorageSafety';
import { openPhotoDatabase, putPhotos, deletePhotos, getPhoto } from '../storage/photoStorage';

export const PERSONAL_LABEL_KEY = 'personalPackageLabels';
export const LABEL_NUTRIENTS = ['calories','protein','carbohydrates','fat','fiber','sodium','totalSugar','addedSugar','saturatedFat'];
export const LABEL_PHOTO_ROLES = ['nutrition','barcode','package','ingredients'];
const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 8192;
const nullable = v => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
const timestamp = v => text(v) && Number.isFinite(Date.parse(v));
export const labelScope = food => JSON.stringify([food?.brand || '', food?.name || '', food?.packageQuantity || food?.packaged?.packageSize || '',
  food?.serving?.amount, food?.serving?.unit, LABEL_NUTRIENTS.map(k=>food?.nutrients?.[k] ?? null),
  food?.ingredients?.text || null, food?.servingsPerContainer ?? null, food?.assessmentInputs?.categories || [], food?.assessmentInputs?.markets || []]);
export function labelMeasurement(serving) {
  const units={g:['g',1],ml:['ml',1],oz:['g',28.349523125],'US fl oz':['ml',29.5735295625]};
  const conversion=units[serving?.unit];
  return conversion && serving.amount>0 ? {amount:serving.amount*conversion[1],unit:conversion[0]} : null;
}
export function validatePersonalLabel(p) {
  return !!p && p.schemaVersion === 1 && text(p.id) && text(p.editionId) && canonicalGtinKey(p.barcode)
    && text(p.name) && text(p.brand) && text(p.variant) && text(p.packageDescription)
    && text(p.serving?.description) && p.serving.amount > 0 && Number.isFinite(p.serving.amount)
    && ['g','ml','oz','US fl oz','serving'].includes(p.serving.unit) && (p.servingsPerContainer === null || (Number.isFinite(p.servingsPerContainer) && p.servingsPerContainer > 0))
    && LABEL_NUTRIENTS.every(k => nullable(p.nutrients?.[k]))
    && (p.nutrients.addedSugar === null || p.nutrients.totalSugar === null || p.nutrients.addedSugar <= p.nutrients.totalSugar)
    && (p.nutrients.saturatedFat === null || p.nutrients.fat === null || p.nutrients.saturatedFat <= p.nutrients.fat)
    && typeof p.ingredientsConfirmed === 'boolean' && (p.ingredientsConfirmed ? text(p.ingredients) && p.ingredients.length <= 8192 : p.ingredients === null)
    && ['active','superseded','removed'].includes(p.status) && typeof p.observedScope === 'string' && p.observedScope.length > 0 && p.observedScope.length <= 50000
    && timestamp(p.confirmedAt) && timestamp(p.createdAt) && typeof p.autoUse === 'boolean'
    && Array.isArray(p.photos) && p.photos.length <= 4 && new Set(p.photos.map(r=>r.role)).size === p.photos.length
    && p.photos.every(r=>text(r.id) && LABEL_PHOTO_ROLES.includes(r.role) && Number.isInteger(r.bytes) && r.bytes > 0 && r.bytes <= 2*1024*1024
      && ['image/jpeg','image/png','image/webp'].includes(r.mimeType));
}
function browserStorage() { try { return window.localStorage; } catch { return null; } }
export function readPersonalLabels(storage = browserStorage()) {
  const raw = storage?.getItem(PERSONAL_LABEL_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(validatePersonalLabel)
    || new Set(data.map(p=>p.id)).size !== data.length) throw new Error('Saved package labels could not be read safely. Existing labels have not been changed.');
  return data;
}
export function personalLabelsFor(result, profiles) {
  const key = canonicalGtinKey(result?.identifier?.value);
  const choices = profiles.filter(p=>p.status === 'active' && canonicalGtinKey(p.barcode) === key);
  const context = result.food || choices.find(p=>p.providerObservation)?.providerObservation;
  const match = !!result.food && choices.length === 1 && choices[0].autoUse && choices[0].observedScope === labelScope(result.food) ? choices[0] : null;
  return { ...result, ...(!result.food && context ? {food:context,status:context.logReady?'found':'incomplete',stale:true} : {}), ...(choices.length ? { personalLabelChoices: choices, ...(match ? { personalLabel: match } : {}) } : {}) };
}
export async function savePersonalLabel(profile, photos = [], {storage = browserStorage(), openDatabase = openPhotoDatabase} = {}) {
  if (!validatePersonalLabel(profile)) throw new Error('Review the product, serving, nutrients and ingredient confirmation before saving.');
  if (!storage) throw new Error('Device storage is unavailable. Your label was not saved.');
  const original = storage.getItem(PERSONAL_LABEL_KEY);
  const current = readPersonalLabels(storage);
  if (current.some(p=>p.id === profile.id)) throw new Error('This version already exists. Create a new version to edit it.');
  if (photos.some(p=>!profile.photos.some(r=>r.id === p.id && r.bytes===p.blob?.size && r.mimeType===p.blob?.type) || !(p.blob instanceof Blob))) throw new Error('Label photo references do not match.');
  if (photos.length) await preparePhotoStorage(photos.reduce((n,p)=>n+p.blob.size,0));
  const database = profile.photos.length ? await openDatabase() : null;
  if (database) {
    for(const ref of profile.photos.filter(r=>!photos.some(p=>p.id===r.id))) {
      const retained=await getPhoto(database,ref.id);
      if(!retained?.blob || retained.blob.size!==ref.bytes || retained.blob.type!==ref.mimeType) throw new Error('A retained label photo is unavailable. Replace or remove it before saving; existing labels are unchanged.');
    }
    await putPhotos(database, photos);
  }
  try {
    if (storage.getItem(PERSONAL_LABEL_KEY) !== original) throw new Error('Labels changed in another tab. Reopen the label and try again.');
    const next = current.map(p=>p.editionId === profile.editionId && p.status === 'active' ? {...p,status:'superseded'} : p);
    storage.setItem(PERSONAL_LABEL_KEY, JSON.stringify([...next, profile]));
  } catch (error) {
    if (database) await deletePhotos(database,photos.map(p=>p.id)).catch(()=>{});
    throw error;
  }
  return profile;
}
export function removePersonalLabel(id, storage = browserStorage()) {
  const labels = readPersonalLabels(storage);
  const next = labels.map(p=>p.id === id ? {...p,status:'removed'} : p);
  storage.setItem(PERSONAL_LABEL_KEY,JSON.stringify(next));
}
