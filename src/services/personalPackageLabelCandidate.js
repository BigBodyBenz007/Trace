import { validatePersonalLabel, LABEL_NUTRIENTS, labelMeasurement } from './personalPackageLabels';
import { canonicalGtinKey } from './productIdentifiers';
import { immutableCopy } from './remoteFoodModel';
import { validReviewedVersion } from './sharedPackageLabels';

// No provider identity or nutrients are fabricated when lookup supplies no panel.
export function createPersonalPackageLabelDraft(identifier) {
  if (!canonicalGtinKey(identifier?.value)) return null;
  return immutableCopy({status:'incomplete',canUse:false,selection:null,providerUnavailable:true,
    display:{name:'',brand:'',packageQuantity:null,servingDescription:'',servingsPerContainer:null,
      nutrients:Object.fromEntries(LABEL_NUTRIENTS.map(k=>[k,null])),ingredients:{status:'unknown',text:null,language:null},
      additives:{status:'unknown',items:[]},sourceUrl:null,attribution:'No provider panel available',
      unknownFields:LABEL_NUTRIENTS.map(k=>'nutrients.'+k)}});
}

// A private, whole serving panel. No old nutrition conflict or manufacturer
// verification is transferred onto the user's independently entered edition.
export function applyPersonalPackageLabel(candidate, profile, identifier) {
  if (!validatePersonalLabel(profile) || profile.status !== 'active') return candidate;
  return applyPackagePanel(candidate, profile, identifier, false);
}
export function applyReviewedPackageLabel(candidate, version, identifier) {
  if (!validReviewedVersion(version, identifier?.value)) return candidate;
  return applyPackagePanel(candidate, {...version.panel,id:version.id,versionId:version.id,publishedAt:version.publishedAt,status:'active'},identifier,true);
}
function applyPackagePanel(candidate, profile, identifier, shared) {
  if (!candidate || profile.status !== 'active'
    || canonicalGtinKey(profile.barcode) !== canonicalGtinKey(identifier?.value)) return candidate;
  const ingredients = profile.ingredientsConfirmed
    ? {status:'reported',text:profile.ingredients,language:'en'} : {status:'unknown',text:null,language:null};
  const nutrients = {...profile.nutrients};
  const base = candidate.selection || candidate.recovery?.food || {};
  const original = candidate.selection?.remote || candidate.recovery?.providerSourceSnapshot || null;
  const canUse = ['calories','protein','carbohydrates','fat'].every(k=>nutrients[k] !== null);
  const personalLabel = {...profile, authenticity:shared ? 'Reviewed by Trace; not manufacturer certification or guaranteed package matching.' : 'Not independently authenticated; confirmed by this device user.'};
  const labelField=shared?{reviewedLabel:personalLabel}:{personalLabel};
  const attribution=shared?'Reviewed by Trace':'Your confirmed label';
  const measured=labelMeasurement(profile.serving);
  const serving = {...profile.serving,grams:measured?.unit === 'g' ? measured.amount : null};
  const selection = canUse ? {...base,sourceType:'remote-barcode',dataType:'branded',name:profile.name,brand:profile.brand,
    identifiers:[{scheme:'gtin',value:profile.barcode}],serving,nutrients,...labelField,
    ingredients,additives:{status:'unknown',items:[]},
    packaged:{packageSize:profile.packageDescription,servingsPerContainer:profile.servingsPerContainer},
    remote:original || {provider:{id:shared?'reviewed-label':'personal-label',recordId:profile.id},provenance:{attribution},unknownFields:[]},
    provenance:{source:shared?'reviewed-label':'personal-label',sourceId:profile.id,label:attribution,confidence:shared?'owner-reviewed':'user-confirmed'}} : null;
  if (selection) { delete selection.nutritionCorrection; delete selection.nutritionConflicts; delete selection.ingredientSource; }
  const display = {...candidate.display,name:profile.name,brand:profile.brand,packageQuantity:profile.packageDescription,
    servingsPerContainer:profile.servingsPerContainer,servingDescription:profile.serving.description,nutrients,
    ...labelField,ingredients,additives:{status:'unknown',items:[]},
    ingredientSource:{attribution:profile.ingredientsConfirmed ? (shared?'Trace-reviewed package ingredients':'Your confirmed ingredients') : 'Ingredients not confirmed for this package edition',url:null},
    attribution,sourceUrl:candidate.display.sourceUrl,
    basisMessage:shared?'Reviewed by Trace: declared values for one selected package edition. Not manufacturer certification; confirm that your package matches.':'Your confirmed label: declared values for one labeled serving. Stored only on this device; not independently authenticated.',
    unknownFields:LABEL_NUTRIENTS.filter(k=>nutrients[k] === null).map(k=>'nutrients.'+k)};
  delete display.nutritionCorrection; delete display.nutritionConflicts;
  return immutableCopy({...candidate,stale:false,customFood:undefined,...labelField,originalCandidate:candidate,canUse,selection,display,
    ...(canUse ? {status:'found'} : {status:'incomplete',recovery:{barcode:identifier,food:{...base,serving,nutrients},providerSourceSnapshot:original}})});
}
