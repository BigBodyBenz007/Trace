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
