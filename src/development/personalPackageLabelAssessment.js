import { labelMeasurement } from '../services/personalPackageLabels';
import { evaluateTraceUsNutritionV2 } from './traceUsNutritionScoringV2';
import { resolvePracticalBarcodeCategory } from './barcodeNutritionEvidence';
import { resolveGrainEvidence } from './traceFoodQualityEvidence';
import { resolveProteinSupplementBoundary } from './proteinSupplementBoundary';

export function assessPersonalPackageLabel(candidate) {
  const label = candidate.personalLabel;
  const original = candidate.originalCandidate;
  const source = {url:'urn:trace:personal-label:'+label.id,attribution:'Your confirmed label',revisionDate:label.confirmedAt};
  const base = {grade:null,scoreReady:false,scanMatchEligible:false,nutritionScore100:null,result:null,reasons:[],warnings:[],
    confidence:'Your confirmed label; not independently authenticated.',evidence:{personalLabel:label,
      market:{status:'user-confirmed-package',exactUsFormulationVerified:false}}};
  const boundary=resolveProteinSupplementBoundary(original || candidate);
  if(boundary.status==='not-rated-category') return {...base,ratingStatus:boundary.status,ratingBoundary:boundary,reasons:[boundary.message]};
  const input=original?.display?.assessmentInputs;
  const basis=labelMeasurement(label.serving);
  const classification={...(input || {}),identity:{...(input?.identity || {}),name:input?.identity?.name || label.name},
    categories:input?.categories || original?.selection?.categories || [],serving:[],
    datasets:basis ? [{basis:'serving',quantity:basis}] : []};
  const {category}=resolvePracticalBarcodeCategory(classification,candidate.display);
  const nutrients=Object.fromEntries(Object.entries(label.nutrients).map(([k,v])=>[k,{value:v,unit:k==='calories'?'kcal':k==='sodium'?'mg':'g'}]));
  const result=evaluateTraceUsNutritionV2({category,basis,nutrients,source,
    productEvidence:{name:input?.identity?.name || label.name,categories:input?.categories || original?.selection?.categories || [],source},
    grainEvidence:resolveGrainEvidence(candidate.display.ingredients,source)});
  return {...base,result,nutritionScore100:result.nutritionScore100,scoreReady:Number.isInteger(result.nutritionScore100),
    reasons:result.reasons,warnings:result.warnings,evidence:{...base.evidence,
      category:{categories:[category]},assessment:{methodId:result.methodId,methodVersion:result.methodVersion,source,sugarMode:result.sugarMode},
      originalDataset:{quantity:label.serving,nutrients},selectedDatasetId:label.id}};
}
