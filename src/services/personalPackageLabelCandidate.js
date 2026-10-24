import { validatePersonalLabel, LABEL_NUTRIENTS, labelMeasurement } from './personalPackageLabels';
import { canonicalGtinKey } from './productIdentifiers';
import { immutableCopy } from './remoteFoodModel';

// A private, whole serving panel. No old nutrition conflict or manufacturer
// verification is transferred onto the user's independently entered edition.
export function applyPersonalPackageLabel(candidate, profile, identifier) {
  if (!candidate || !validatePersonalLabel(profile) || profile.status !== 'active'
    || canonicalGtinKey(profile.barcode) !== canonicalGtinKey(identifier?.value)) return candidate;
  const ingredients = profile.ingredientsConfirmed
    ? {status:'reported',text:profile.ingredients,language:'en'} : {status:'unknown',text:null,language:null};
  const nutrients = {...profile.nutrients};
  const base = candidate.selection || candidate.recovery?.food || {};
  const original = candidate.selection?.remote || candidate.recovery?.providerSourceSnapshot || null;
  const canUse = ['calories','protein','carbohydrates','fat'].every(k=>nutrients[k] !== null);
  const personalLabel = {...profile, authenticity:'Not independently authenticated; confirmed by this device user.'};
  const measured=labelMeasurement(profile.serving);
  const serving = {...profile.serving,grams:measured?.unit === 'g' ? measured.amount : null};
  const selection = canUse ? {...base,sourceType:'remote-barcode',dataType:'branded',name:profile.name,brand:profile.brand,
    identifiers:[{scheme:'gtin',value:profile.barcode}],serving,nutrients,personalLabel,
    ingredients,additives:{status:'unknown',items:[]},
    packaged:{packageSize:profile.packageDescription,servingsPerContainer:profile.servingsPerContainer},
    remote:original || {provider:{id:'personal-label',recordId:profile.id},provenance:{attribution:'Your confirmed label'},unknownFields:[]},
    provenance:{source:'personal-label',sourceId:profile.id,label:'Your confirmed label',confidence:'user-confirmed'}} : null;
  if (selection) { delete selection.nutritionCorrection; delete selection.nutritionConflicts; delete selection.ingredientSource; }
  const display = {...candidate.display,name:profile.name,brand:profile.brand,packageQuantity:profile.packageDescription,
    servingsPerContainer:profile.servingsPerContainer,servingDescription:profile.serving.description,nutrients,
    personalLabel,ingredients,additives:{status:'unknown',items:[]},
    ingredientSource:{attribution:profile.ingredientsConfirmed ? 'Your confirmed ingredients' : 'Ingredients not confirmed for your package',url:null},
    attribution:'Your confirmed label',sourceUrl:candidate.display.sourceUrl,
    basisMessage:'Your confirmed label: declared values for one labeled serving. Stored only on this device; not independently authenticated.',
    unknownFields:LABEL_NUTRIENTS.filter(k=>nutrients[k] === null).map(k=>'nutrients.'+k)};
  delete display.nutritionCorrection; delete display.nutritionConflicts;
  return immutableCopy({...candidate,stale:false,customFood:undefined,personalLabel,originalCandidate:candidate,canUse,selection,display,
    ...(canUse ? {status:'found'} : {status:'incomplete',recovery:{barcode:identifier,food:{...base,serving,nutrients},providerSourceSnapshot:original}})});
}
