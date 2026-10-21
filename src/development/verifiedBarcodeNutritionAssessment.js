// Consume the same verified fact overlay used by review and new food logging.
import { immutableCopy } from '../services/remoteFoodModel';
import { getAppliedVerifiedNutritionCorrection } from '../services/verifiedProductNutritionCorrections';
import { evaluateTraceUsNutritionV2 } from './traceUsNutritionScoringV2';
import { resolveGrainEvidence } from './traceFoodQualityEvidence';

export function applyVerifiedNutritionToAssessment(candidate, identifier, providerAssessment) {
  const correction = getAppliedVerifiedNutritionCorrection(candidate, identifier);
  if (!correction) return providerAssessment;
  const label = correction.manufacturerPanel;
  const source = { url: label.source.url, attribution: label.source.attribution,
    revisionDate: label.source.updatedOn, retrievedAt: label.source.verifiedAt, edition: label.source.edition || label.source.updatedOn };
  const nutrients = Object.fromEntries(Object.entries(label.nutrients).map(([nutrient, value]) =>
    [nutrient, { value, unit: nutrient === 'calories' ? 'kcal' : nutrient === 'sodium' ? 'mg' : 'g' }]));
  const result = evaluateTraceUsNutritionV2({ category: 'general', basis: label.serving,
    nutrients, source, grainEvidence: resolveGrainEvidence(label.ingredients, source) });
  return immutableCopy({ ...providerAssessment, result, nutritionScore100: result.nutritionScore100,
    reasons: result.reasons, warnings: [...result.warnings, label.qualification],
    confidence: 'US manufacturer label reviewed for this exact UPC; the scanned package revision is unconfirmed.',
    evidence: { ...providerAssessment.evidence,
      selectedDatasetId: label.id,
      originalDataset: { id: label.id, basis: 'serving', quantity: label.serving, nutrients },
      assessment: { methodId: result.methodId, methodVersion: result.methodVersion,
        excludedNutrients: result.excludedNutrients, source, sugarMode: result.sugarMode },
      reviewedManufacturerLabel: label,
      // Full original normalized evidence, sugar fields and score remain separate.
      originalProviderAssessment: providerAssessment } });
}
