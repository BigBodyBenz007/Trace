// Development-only usability adapter. Source selection receives booleans, never
// score magnitudes, and uses the existing assessments after fact corrections.
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { assessOverallFoodQuality } from './traceOverallFoodQuality';

export function assessLookupForGrading(result) {
  const candidate = createBarcodeNutritionCandidate(result);
  // A separate reference comparison does not resolve the effective provider
  // panel. Only a full manufacturer replacement removes its active conflicts.
  if (!candidate || candidate.display.nutritionConflicts?.length) return { nutrition: false, overall: false };
  const nutrition = assessBarcodeNutrition(candidate, result.identifier);
  const overall = assessOverallFoodQuality(candidate, nutrition);
  return { nutrition: Number.isInteger(nutrition.nutritionScore100), overall: Number.isInteger(overall.overallScore100) };
}
