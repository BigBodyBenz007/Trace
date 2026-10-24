# Personal package-label corrections

24 October 2026. Feature branch only; main and Production are unchanged.

## Available personal flow

In barcode review choose **Use my package label**. Confirm the barcode, product/variant/package, declared serving quantity/unit and each nutrient. Blank values stay unknown. A photo can be taken with the rear camera or selected from files for the Nutrition Facts, barcode, package and ingredients. Photos are optional for a personal manual correction; shared approval has stricter evidence requirements.

**Read Nutrition Facts on device** optionally downloads pinned Tesseract code/models and processes the selected image in a local worker. Only sufficiently confident fields populate a draft; inequalities/unrecognized fields remain unresolved. The user must apply, check and confirm the draft. OCR, a photo and plausibility checks do not establish authenticity. If OCR is unavailable or exceeds 45 seconds, manual entry remains available. This is not a physical iPhone-camera validation.

The confirmed serving values are used directly in review, the existing nutrition/overall calculation, selection and new entries. Serving multipliers retain precision; no calories are reconstructed from macros and missing values are never replaced by zero. Mass/volume conversions use explicit units only (g, mL, oz or US fl oz); count-only servings permit logging but cannot supply a comparison basis for grading. No density is assumed.

Ingredients are confirmed separately. Without that confirmation, provider ingredients/additive identifiers are kept as original evidence but are not assessed as the new package's composition. Editing package/panel/photo evidence resets ingredient confirmation. The protein-supplement boundary and existing category rules remain active. Formula constants, additive classifications and combination weights are unchanged.

## Persistence and evidence

- Versioned profiles use the existing localStorage domain manifest; photos use the existing IndexedDB photos store. A later edit supersedes the old version, and removal stops future application without altering old entries or deleting their evidence.
- A single remembered edition is automatic only when the selected provider context still matches. Multiple editions or changed evidence require a choice. If lookup fails, retained provider context is visibly stale and a saved version requires an explicit choice. This is not a new provider success.
- Personal values are attributed **Your confirmed label**, never manufacturer-verified. Original provider fields, ingredients, identifiers, source links and manufacturer corrections remain separately retained. New entries carry the personal-version snapshot; historical entries are never rewritten.
- Images are decoded and re-encoded to remove unnecessary metadata, at most four JPEG/PNG/WebP images, 2 MiB each after processing (15 MiB input maximum, 2400px long edge). Storage is checked before saving photos. A failed metadata write cleans up only newly added photo IDs; existing labels remain intact. Retained photo references are checked before creating a new version.
- Backup schema 10 includes personal versions and their referenced photos, including retained history. Schemas 1-9 remain accepted without silently adding fields that invalidate old integrity hashes. Photo metadata/reference checks are enforced. Existing restore behavior remains non-atomic; this feature does not claim to repair that separate limitation.
- Corrections are local to this browser/origin. The Preview address starts with separate local data. They do not synchronize automatically; do not import an existing archive merely to try the feature. Browser quota, eviction, private mode and device loss remain limitations: export a backup through the existing flow for durable preservation.

## Shared approval is unavailable, deliberately

The current project has no app-level owner session/authentication, private submission/photo store, or transactional shared-label/version database. No new account, paid service, secret or recurring expense was provisioned. **Submit for shared review** is disabled with that explanation. `/api/labels/submissions` fails closed with 503 and `private_label_review_not_configured`; it does not accept or publish private evidence.

`api/labels/_reviewPolicy.cjs` is server-only policy preparation, not a deployed authentication/storage system or working owner review screen. Its focused tests cover immutable pending/approve/reject/withdraw/rollback records, explicit owner context and approval reasons, required barcode/package/full-panel evidence, separate ingredient evidence, duplicate/transcription/major-change review flags and final edited values. Flags assist review and never invent replacements or automatically reject an unusual food. A caller-provided role is not authorization. The public handler never accepts the trusted context used in policy tests.

To enable sharing safely requires: an authenticated owner session verified on the server; private durable photo storage and authorized photo retrieval; a transactional submission/publication/version store; server image validation/re-encoding and abuse controls; and an owner-only screen showing photos beside submitted/current values, editable transcription/diffs, reasons, decisions and recorded final changes. Approval must remain scoped to a particular package edition. Pending photos must never be publicly readable. Withdrawal and rollback must produce new history events without changing personal profiles or historical food entries. None of that is represented as currently functional.

## Reproduce focused validation

Use existing installed dependencies; no installation is required:

```powershell
$env:CI='true'
node node_modules/react-scripts/bin/react-scripts.js test --watch=false --runInBand --runTestsByPath src/services/personalPackageLabels.test.js src/services/personalPackageLabels.backup.test.js src/services/packageLabelPhotos.test.js src/services/sharedPackageLabelReview.test.js src/components/PersonalPackageLabelEditor.test.jsx src/components/NutritionPage.packageLabel.test.jsx src/services/traceBackup.test.js src/services/productionCommonJs.test.js src/development/barcodeGradingMode.test.js
node --test scripts/package-label-submission.test.cjs
$env:NODE_ENV='development'
node scripts/verify-grading-user-review.cjs --package-label
```

The browser tool uses the real application, disposable browser/IndexedDB storage, a captured Quest lookup and a clearly constructed nutrition image; it is not a live lookup. It exercises actual on-device OCR, review, 1.25-serving selection, save, reload, reopen and remembered reuse, with mobile/desktop screenshots and runtime checks. Generated artifacts stay ignored under `artifacts/package-label-20261024/`. Hosted checks must be reported separately from captured local checks.

## Complete feature inventory

- `api/labels/_reviewPolicy.cjs`
- `api/labels/submissions.mjs`
- `docs/package-label-corrections.md`
- `scripts/lib/package-label-review-checks.cjs`
- `scripts/package-label-submission.test.cjs`
- `scripts/verify-grading-user-review.cjs`
- `src/components/BackupPage.jsx`
- `src/components/BarcodeScannerDialog.jsx`
- `src/components/NutritionPage.jsx`
- `src/components/NutritionPage.packageLabel.test.jsx`
- `src/components/PersonalPackageLabelEditor.css`
- `src/components/PersonalPackageLabelEditor.jsx`
- `src/components/PersonalPackageLabelEditor.test.jsx`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/barcodeNutritionAssessment.js`
- `src/development/barcodeNutritionEvidence.js`
- `src/development/personalPackageLabelAssessment.js`
- `src/development/traceOverallFoodQuality.js`
- `src/services/__fixtures__/personalPackageLabel.json`
- `src/services/barcodeNutritionSelection.js`
- `src/services/packageLabelOcr.js`
- `src/services/packageLabelPhotos.js`
- `src/services/packageLabelPhotos.test.js`
- `src/services/personalPackageLabelCandidate.js`
- `src/services/personalPackageLabels.backup.test.js`
- `src/services/personalPackageLabels.js`
- `src/services/personalPackageLabels.test.js`
- `src/services/photoIngestion.js`
- `src/services/remoteBarcodeLookup.js`
- `src/services/remoteBarcodeLookup.test.js`
- `src/services/sharedPackageLabelReview.test.js`
- `src/services/storageDomainManifest.js`
- `src/services/traceBackup.js`
- `src/services/traceBackup.test.js`
- `src/services/traceBackupValidation.js`

## Completed local checks

Final focused run: 165/165 tests across nine suites; fail-closed API test: 1/1. Changed JavaScript/JSX syntax: 32 files; changed source-file lint: no findings; JSON and whitespace checks passed. Earlier unchanged scanner, fallback, category, protein-supplement and privacy regressions are retained in ignored validation artifacts.

Final isolated browser run: `artifacts/package-label-20261024/run-2026-10-24T19-54-08-118Z/`. Actual on-device OCR prefilled 190 kcal and 220 mg sodium from a constructed image. The real application preserved Quest nutrition 54 / provisional overall 52 using the confirmed test panel; 1.25 servings saved/reopened as 237.5 kcal and 275 mg sodium, and the next scan reused the private version. Mobile 390x844 and desktop 1440x1000 screenshots were inspected; no runtime/console errors or horizontal overflow. This local test used a captured lookup, not a live service response.
