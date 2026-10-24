# Experimental food-grading release - 2026-10-23

The owner authorized normal Production grading for family testing. This supersedes earlier Production-hiding instructions, not scientific limitations. Reviewed Preview 3301f70e225dc8e1a71963a8b9610756abb3ea55 is integrated above main 4b4b17048f46ab7e46b97ab7890b668b26f672c0 in an isolated worktree. Both existing checkouts and the original 62 unrelated Git entries remain unchanged.

## Behavior and contracts

Normal Nutrition > Scan Barcode displays the existing experimental assessments without flags or Vercel sign-in. The separate protected Preview remains unchanged. The legacy build entry preserves Preview markers for diagnostics; the runtime gate now intentionally permits normal Production and development.

Nutrition v2 2.1-milk-development-2026-10-21, additive classifications and the combined formula/20% proportional adjustment are unchanged. No product overrides, new nutrition data, calibration or storage migrations were added. Protein-supplement powders stay unrated; conflicting/missing values remain unknown. Manufacturer correction scope, source provenance and historical entries remain intact.

Current barcode nutrition/overall assessments expose scoreReady only when their respective numeric result exists. grade remains null because there are no letter grades. API observation-quality metadata remains scoreReady=false because an observation has not been assessed; its reason is now assessment-required rather than method-not-approved. Older standalone research engines/reports retain historical contracts. Ratings are not saved to food records.

The main review visibly states, outside disclosures, for graded and ungraded foods: "Check your package label. Nutrition and ingredients come from external sources and may differ from your package. Grades use the information shown." For a partial correction's separate manufacturer-reference comparison, the last sentence becomes: "This reference score uses the separately identified manufacturer reference panel." Teddy's logging panel remains separately identified as partially corrected.

The reviewed light Modern Heirloom/deep-teal controls, 12px Nutrition spacing, collapsed entry/Water sections, selected-day log and separate history are included. Shared USDA serving-panel retrieval and assessment/cache fixes are preserved. No Preview browser records are transferred. Provider credentials stay server-side; protection settings are unchanged.

## Pre-deployment validation

- One final complete focused run: 469/469 Jest cases, 17 suites, no failures or skipped tests. Six Node build-marker tests also pass. Unaffected prior reviewed visual/scanner checks are reused.
- Actual optimized Production build succeeds. Existing ZXing missing source-map warnings, existing source lint warnings and Node fs.F_OK deprecation remain. New release source/new disclaimer tests have no new lint findings.
- Final built application, isolated Chrome, mobile 390x844 and desktop 1440x1000, no query flags: Quest nutrition 54 / provisional overall 52; Teddy separate 20 reference; Dymatize unrated; conflicted Fairlife unavailable with logging sodium unknown. These local HTTP replays use labeled existing captured evidence, not live lookup claims. No runtime or console errors.
- Actual App selection > 1.25 servings > save > reload > reopen preserves Quest 237.5 kcal / 275 mg sodium. Theme selection survives reload. Selected-day display excludes that entry when viewing another date while history retains it. Only disposable local browser data was used; hosted verification never saves entries.
- CommonJS/ESM production browser-transform checks pass. All 77 relative dependencies resolve to tracked files; generated artifacts, credentials and sharing tokens are excluded.
- Older assertions referred to hidden Production grading, retired technical disclosure names, the pre-milk result and pre-conflict Oikos availability. Updated assertions preserve the existing 83 result on captured, unverified Fat Free Milk and Oikos's three sodium conflicts/null score. Application scoring was not changed to satisfy those tests. Earlier failed runs remain in local artifacts; the final complete run above is the release result.

Exact-commit Vercel Production status and real hosted mobile/desktop checks are recorded after push in local release artifacts and the completion message. Reproduce bounded built-app verification with node scripts/verify-production-startup.cjs build; use --url https://trace-umber.vercel.app/ for real hosted lookup/selection without saves.

## Remaining limits

Source records do not establish the current physical package edition. Source/package mismatches, including the reported bun panel, remain unresolved. Additive amounts/exposure remain unknown; provisional screens remain provisional. Milk with unknown added sugars retains the existing total-sugar fallback. The per-100-kcal powder candidate remains isolated offline evidence. Browser emulation does not establish physical iPhone camera recognition.

## Complete released inventory (60)

Cumulative changes from starting main, including reviewed Preview ancestors plus this release commit:

- api/nutrition/_barcodeGateway.cjs
- docs/barcode-serving-normalization-2026-10-23.md
- docs/food-grading-release-2026-10-23.md
- docs/phone-grading-preview.md
- docs/protein-powder-comparison-2026-10-22.json
- public/index.html
- scripts/build-grading-preview.cjs
- scripts/build-grading-preview.test.cjs
- scripts/check-protein-powder-comparison.cjs
- scripts/evaluate-nutrition-v2-calibration.cjs
- scripts/lib/grading-user-review-checks.cjs
- scripts/verify-barcode-grading.cjs
- scripts/verify-grading-user-review.cjs
- scripts/verify-production-startup.cjs
- src/appThemes.css
- src/components/BarcodeScannerDialog.css
- src/components/BarcodeScannerDialog.jsx
- src/components/NutritionPage.barcodeServing.test.jsx
- src/components/NutritionPage.dailyLog.test.jsx
- src/components/NutritionPage.jsx
- src/components/NutritionPage.sodiumSalt.test.jsx
- src/components/NutritionPage.test.jsx
- src/components/NutritionSummary.css
- src/components/NutritionSummary.jsx
- src/components/WaterTrackerSection.jsx
- src/development/BarcodeNutritionReview.css
- src/development/BarcodeNutritionReview.jsx
- src/development/BarcodeNutritionReview.test.jsx
- src/development/__fixtures__/barcodePresentationCases.cjs
- src/development/__fixtures__/dymatizeCocoaPebblesLookup.json
- src/development/barcodeAssessmentFallback.js
- src/development/barcodeGradeCoverage.integration.test.jsx
- src/development/barcodeGradingMode.js
- src/development/barcodeGradingMode.test.js
- src/development/barcodeNutritionAssessment.js
- src/development/barcodeNutritionAssessment.test.js
- src/development/barcodeReviewInformation.js
- src/development/barcodeReviewInformation.test.js
- src/development/milkDrinkCalibration.test.jsx
- src/development/proteinSupplementBoundary.js
- src/development/proteinSupplementBoundary.test.jsx
- src/development/traceOverallFoodQuality.js
- src/development/traceOverallFoodQuality.test.js
- src/index.css
- src/services/__fixtures__/barcodeServingEvidence.json
- src/services/appThemes.js
- src/services/appThemes.test.js
- src/services/barcodeNutritionDataAudit.test.js
- src/services/barcodeNutritionSelection.js
- src/services/barcodeServingPipeline.test.js
- src/services/barcodeSourceSelection.js
- src/services/nutritionAssessmentInputs.js
- src/services/nutritionAssessmentInputs.test.js
- src/services/remoteBarcodeGateway.test.js
- src/services/remoteBarcodeLookup.js
- src/services/remoteFoodModel.js
- src/services/verifiedProductNutritionCorrections.manufacturer.test.js
- src/services/verifiedProductNutritionCorrections.providers.test.js
- src/services/verifiedProductNutritionCorrections.test.js
- vercel.json

## Final release commit inventory (27)

The already-committed Preview changes remain in their original ancestor commits. This final commit changes only:

- docs/food-grading-release-2026-10-23.md
- docs/phone-grading-preview.md
- scripts/build-grading-preview.cjs
- scripts/build-grading-preview.test.cjs
- scripts/check-protein-powder-comparison.cjs
- scripts/evaluate-nutrition-v2-calibration.cjs
- scripts/verify-barcode-grading.cjs
- scripts/verify-production-startup.cjs
- src/components/BarcodeScannerDialog.css
- src/components/BarcodeScannerDialog.jsx
- src/components/NutritionPage.sodiumSalt.test.jsx
- src/development/BarcodeNutritionReview.jsx
- src/development/BarcodeNutritionReview.test.jsx
- src/development/barcodeGradeCoverage.integration.test.jsx
- src/development/barcodeGradingMode.js
- src/development/barcodeGradingMode.test.js
- src/development/barcodeNutritionAssessment.js
- src/development/barcodeNutritionAssessment.test.js
- src/development/traceOverallFoodQuality.js
- src/development/traceOverallFoodQuality.test.js
- src/services/barcodeNutritionDataAudit.test.js
- src/services/barcodeServingPipeline.test.js
- src/services/nutritionAssessmentInputs.js
- src/services/nutritionAssessmentInputs.test.js
- src/services/verifiedProductNutritionCorrections.manufacturer.test.js
- src/services/verifiedProductNutritionCorrections.providers.test.js
- src/services/verifiedProductNutritionCorrections.test.js
