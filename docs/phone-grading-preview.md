# Isolated iPhone grading Preview

This branch enables the existing experimental barcode review only in the existing Vercel project's **Preview** environment. It is not a consumer grading release.

## Build opt-in

Vercel runs `node scripts/build-grading-preview.cjs` from this branch's `vercel.json`. Only `VERCEL_ENV=preview` together with `VERCEL_GIT_COMMIT_REF=preview/iphone-food-grading-20261022` sets the public, non-secret grading opt-in. The browser requires both the Preview build marker and explicit opt-in. Ordinary production, another branch, missing environment evidence, and query flags alone do not enable grading. The existing local development flag remains supported.

The build never prefixes provider credentials with `REACT_APP_`. The same-origin `/api/nutrition/barcode` Vercel function uses the existing server-only `USDA_FDC_API_KEY` and `OPEN_FOOD_FACTS_USER_AGENT` configuration for Preview. Nutrition scoring, corrections, sodium-conflict handling, source ranking, camera code and food persistence are unchanged.

## Phone use and data separation

Open the deployment-specific HTTPS URL in Safari, sign in with the project's owning Vercel account if Deployment Protection asks, select Nutrition, then Scan Barcode and allow camera access. No grading query parameter is necessary. Manual barcode entry and Scan from Photo remain available.

This separate hostname has separate local browser data. Do not import an existing Trace backup. It neither reads nor synchronizes the production site's local records. The hosted app and API operate independently of the laptop; no local development server or tunnel is required.

Keep existing Vercel Deployment Protection. An owner can sign in, or create a deployment-specific shareable link through the deployment's Share menu; do not disable project-wide protection. The URL and verification results are recorded in the task's local artifacts after deployment.

Physical iPhone camera recognition must be tested on the device; headless browser checks cover hosted lookup, grading, layout and selection only.

Official deployment references: [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [deployment shareable links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links).

## Protected mobile access verification

Use the owner-provided Vercel sharing link for this Preview branch. Its `_vercel_share` parameter grants deployment access; it is not a grading activation flag and must not be committed or logged. The bare deployment URL requires Vercel owner authentication.

The hosted sharing-link check established real Quest lookup, nutrition 54/100, provisional overall 52/100, and same-host Home/Nutrition/review/selection/reload. The earlier reported post-login transition to the production hostname was not reproduced; the shared path avoids that unverified handoff.

That run also demonstrated a protected-manifest defect: the manifest link omitted `crossorigin="use-credentials"`, so the browser requested it without the access cookie and followed Vercel SSO redirects that failed CORS. The link now includes the standard credentials attribute ([MDN reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin#web_manifest_with_credentials)). This changes neither the relative manifest start URL/scope nor app navigation. Verify the hosted manifest and console after deployment; project-wide protection remains enabled.

## Plain-language score explanations

The opening score, applied nutrition factors, supported additive note and provisional/source status remain visible. The native **Why this score** and **Additives** disclosures start closed and use a short nutrition breakdown, the actual displayed additive adjustment, relevant uncertainty and labeled links. Full ingredient text remains in its separate Ingredients disclosure. There is no replacement technical accordion.

The complete assessments, ingredient-screening reasons, raw contributions, qualifications and source editions remain in the existing assessment functions and developer reports. The default diagnostic explanation is retained; only the Preview opts into concise copy. Nutrition v2, additive classifications/weights, source selection, correction applicability, caching and logging are unchanged.

Presentation regressions use captured Quest, Teddy and conflicted Fairlife records plus one explicitly authorized hosted lookup of Dymatize Cocoa Pebbles (705016356201). That USDA capture produced nutrition/overall 41/41, matching the user-observed 41; it is not a manufacturer-verified panel. Quest remains 54/52, Teddy remains a separate 20/20 reference comparison, and conflicted Fairlife remains unavailable with nullable sodium and usable logging.

Regenerate the bounded captured-case mobile/desktop checks with `node scripts/verify-grading-user-review.cjs --concise`. Screenshots, copy lengths and source labels are written under `artifacts/grading-plain-language-preview-20261022/`; they are not live lookup claims. Hosted sharing-route verification is recorded separately in local task artifacts. Do not commit sharing credentials, screenshots, bundles or browser profiles.

## Protein-supplement powder rating boundary

Positively source-identified dry protein-supplement powders receive an intentional **not-rated-category** outcome: ?Overall rating not available for protein supplements.? This is neutral scope handling, not a missing-data error or safety classification. Both customer-facing numerical ratings and deduction points are withheld; normal serving facts, ingredients, additive evidence and source links remain available.

A shared resolver binds product-level categories/name/form and mass evidence to the selected source. It never uses protein quantity, brand, barcode or an ingredient-list match. Specific protein-powder categories establish form/use; broad supplement/recovery categories also require explicit powder naming and mass evidence. Ordinary foods, flour/cocoa/milk powders, ingredient mentions and liquid/ready-to-drink or contradictory/ambiguous records retain existing treatment. This resolver is read at assessment time for both fresh and cached observations.

The fallback adapter marks this category outcome resolved without claiming a usable numerical assessment. It neither requests another provider nor changes the preferred source to chase a score. Selection/logging readiness still comes solely from the existing nutrient and serving checks: complete foods stay loggable, genuine missing inputs retain Complete This Food, and sodium conflicts retain nullable sodium.

Nutrition v2 remains unchanged. The original dry-powder calculation is retained only in diagnostics; the isolated equal-calorie candidate and frozen comparison report remain offline development evidence. Regenerate that comparison with `node scripts/check-protein-powder-comparison.cjs`. No application imports the candidate.

Run `node scripts/verify-grading-user-review.cjs --protein-boundary` for captured-case mobile/desktop checks. Hosted sharing-route checks are separate and save no entries. An already-open phone tab must refresh after deployment to receive this boundary.
