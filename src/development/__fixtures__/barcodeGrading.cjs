// Synthetic schema fixtures only. No manufacturer observation is attached by name.
const { offRecord, BARCODE, RETRIEVED_AT } = require('../../services/__fixtures__/nutritionAssessmentInputs.cjs');
function barcodeGradingRecord(scenario = 'eligible') {
  const record = offRecord({ product_name: 'Synthetic US cereal — review control',
    ingredients_text: 'Synthetic oats, sugar, salt, citric acid.',
    additives_tags: ['en:e330', 'en:e202', 'en:e9999'] });
  record.nutriments['fruits-vegetables-nuts_100g'] = 0;
  if (scenario === 'unresolved') { delete record.nutriments['saturated-fat_100g']; delete record.nutriments.fiber_100g; }
  if (scenario === 'unknown-additives') delete record.additives_tags;
  if (scenario === 'unknown-market') delete record.countries_tags;
  if (scenario === 'empty-additives') record.additives_tags = [];
  return record;
}
module.exports = { barcodeGradingRecord, BARCODE, RETRIEVED_AT };
