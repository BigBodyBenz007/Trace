# Production startup repair — October 20, 2026

No commit, push or deployment is authorized. Existing user browser storage and
service-worker data must not be cleared. The uncommitted barcode-grading
integration is independent of this repair and must remain preserved.

## Reproduced live failure

Local HEAD and remote `origin/main` were both
`4e2b1ed7b599aba5955ae53dc6ed83f1e0ba88dc` at investigation start.
The live HTML returned HTTP 200 and referenced `/static/js/main.2478fcc8.js`.
That 3,173,057-byte bundle was downloaded directly, then executed from the live
URL in a fresh, isolated hidden Chrome profile. The body remained empty.

The actual uncaught exception was:

```text
ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: 385
at Object.set [as exports] (main.2478fcc8.js:2:1147297)
at 385 (main.2478fcc8.js:2:339274)
at 2337 (main.2478fcc8.js:2:456389)
```

Extracting module 385 from the downloaded bundle identifies
`src/services/additiveNameReference.js`: it imports helper module 2555, is
marked as an ES module (`n.r`), receives webpack's harmony module decorator
(`n.hmd`), then assigns `e.exports` for its CommonJS exports. That assignment
triggers the throwing setter before React mounts.

This is an application-source/build-transformation compatibility failure. The
shared Node/browser module uses CommonJS, but Babel's production browser caller
injects an ES-module `objectSpread2` helper for `{ ...data, source }`. Mixing that
injected import with `module.exports` is incompatible with webpack's ESM export
guard. The existing source itself does not explicitly mix imports and exports;
the transformation introduces the mix.

The problematic spread was introduced in committed registry work
`b023751e254d9e3e67663b75e630d37d67b467d0`. It predates the uncommitted grading
integration. The live bundle does not contain the new `barcodeGrading` flag.
The same production transform also introduces an ESM `slicedToArray` helper
into `nutritionAssessmentInputs.js` because of one destructured entries-map
parameter. That second production-loaded shared module needs the same boundary
safeguard, so the correction addresses both before the full-build smoke test.

A fresh browser reproduced the error against the current live asset; stale user
cache is not needed to explain it. This is not the separate Apple meta-tag
deprecation warning. The deployed source map returned HTTP 403, so its contents
and an exact deployed Git SHA were not inferred. The failing module was instead
identified directly from the executable bundle, export names and helper calls.

## Small correction

- `src/services/additiveNameReference.js`: replace the one object spread with
  `Object.assign({}, data, { source })`, retaining the same frozen data/source
  snapshot and CommonJS exports.
- `src/services/nutritionAssessmentInputs.js`: enumerate the same frozen nutrient
  dictionary with `Object.keys`, reading its unit by key, instead of destructuring
  an `Object.entries` callback parameter. Nutrient values, units, calculations,
  ordering, missing states and return contracts are unchanged.
- `src/services/productionCommonJs.test.js`: explicitly invoke the production
  browser Babel caller. Normal Jest CommonJS transforms mask this failure. The
  regression failed against the original source and passes after the correction.
- `scripts/verify-production-startup.cjs`: serve an existing production build and
  smoke-test real browser mounting, Home → Nutrition navigation, scanner opening,
  absence of experimental grading, and unchanged saved-food record values.
- This investigation document.

No dependency, bundler configuration, Vercel configuration, storage migration,
scanner implementation or scoring-mathematics change is required.

## Build and browser procedure

The existing `build/` directory is preserved. The one full production build is
directed to a new task-owned artifact directory:

```powershell
$env:BUILD_PATH='artifacts/production-startup-repair-20261020/production-build'
$env:CI='false'
npm.cmd run build
```

`npm.cmd` avoids the workstation's restriction on executing `npm.ps1`; no
execution-policy setting is changed. `CI=false` retains normal CRA handling of
preexisting build warnings. Changed-file lint and focused tests are checked
separately. No additional dependencies are installed.

```powershell
node scripts/verify-production-startup.cjs artifacts/production-startup-repair-20261020/production-build
```

The browser uses a new profile and a temporary loopback origin. It never opens
the user's existing Chrome/Safari profile, never clears storage, and never
performs a food save. Normal startup/navigation operates only on that isolated
test profile. Production query flags are deliberately supplied; the pilot and
experimental engine must remain absent. The original service worker is served
unchanged; no unregister/cache-clear/reinstall step is used.

All raw evidence, initial file hashes, live exception stacks, deployed asset,
build logs and browser results are retained under
`artifacts/production-startup-repair-20261020/` for interruption-safe resumption.

## Deployment boundary

The deployed website remains broken until a separately approved source commit,
push and Vercel deployment. Deployment must exclude the unapproved grading
integration unless it receives separate approval. No Vercel settings change is
proposed. Following deployment, verify the new served asset and normal startup;
do not use destructive browser-data cleanup as the repair. Offline clients may
need connectivity and an ordinary update/reload before receiving the fixed
shell. Saved records remain local and their storage contract is unchanged.

## Completed validation

- One full CRA production build completed successfully, producing
  `/static/js/main.5b64ac4e.js`. The existing `build/` directory retained its
  original October 16 timestamp and contents. The new build is not deployed.
- The repaired main bundle has zero harmony-module export decorators versus
  one in the live bundle. Explicit production Babel comparisons show the
  committed originals injecting `objectSpread2` and `slicedToArray`, respectively;
  neither repaired module injects an ESM import.
- The production build mounted Home in real Chrome at 1280×960, navigated to
  Nutrition at 390×844, and opened/closed the original scanner. There were zero
  uncaught page exceptions. The experimental grading engine was absent from the
  bundle and both preview URL flags failed to enable grading. Saved Nutrition
  and user-food values were unchanged by navigation. Physical Safari/PWA testing
  remains a post-deployment check; no reinstall or data cleanup was requested.
- 314 focused tests passed across 18 suites, including startup transformation,
  name references, assessment capture, additive/cache integration, gateway,
  scanner/Ingredients, Nutrition logging, serving precision, storage, service
  workers and development/production grading safeguards.
- Changed-file lint, JavaScript/CJS syntax and whitespace checks passed.
- Build warnings concern missing dependency source maps (including ZXing),
  bundle size and Node's `fs.F_OK` deprecation. They are distinct from the fatal
  application export error; no dependency or configuration change was made to
  suppress them. The separate Apple mobile meta-tag warning was not changed.
- File-hash checks preserve all 708 baseline paths outside the two repaired
  modules, including every file in the uncommitted grading integration and all
  preexisting missing artifacts/research reports. HEAD and index are unchanged.

Evidence:

- `artifacts/production-startup-repair-20261020/live-exceptions.jsonl`
- `artifacts/production-startup-repair-20261020/deployed-module-385.js`
- `artifacts/production-startup-repair-20261020/transform-before-after.json`
- `artifacts/production-startup-repair-20261020/build-production.log`
- `artifacts/production-startup-repair-20261020/production-browser-smoke.json`
- `artifacts/production-startup-repair-20261020/production-home-desktop.png`
- `artifacts/production-startup-repair-20261020/production-nutrition-mobile.png`
- `artifacts/production-startup-repair-20261020/regression-tests.json`
