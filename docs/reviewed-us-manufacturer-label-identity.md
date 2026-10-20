# Reviewed US manufacturer-label identity for research

Implemented for review on 2026-10-19 against commit
`fd6675dce854d349a381b2ad65f1d99d0d6584ee`. This is an isolated identity extension,
not approval of the experimental nutritional formula or consumer grading.
Every result retains **grade=null and scoreReady=false**. No application UI,
barcode/camera implementation, provider lookup, cache, meal or saved record uses
this route. No runtime network calls or migrations were introduced.

## What changed

Previously, `completeProduct`/`sameProduct` required valid GTINs for the main
product, source product and review product. Null GTIN produced cascading identity
and provenance failures even for a complete manufacturer label. The default
GTIN route still uses those checks. Only explicit
`identity.type=reviewed_us_manufacturer_label`, `identity.schemaVersion=1` can use
null GTIN after additional label validation. Omitted GTIN, empty/fake identifiers,
unreviewed pages and unknown identity types remain rejected.

The pure `reviewedManufacturerLabelIdentity.js` validator checks the new evidence
before the existing scorer can calculate anything. The scorer shares the exact
original `calculate` function; weights, caps, rounding, category rules, nutrients,
units, basis, dates, stale/supersession and conflict checks are unchanged. There
is no exported unguarded arithmetic bypass.

## Evidence contract

`identity` contains:

| Field | Required evidence |
| --- | --- |
| `type`, `schemaVersion` | Exact supported identity/version; no fallback from unknown types. |
| `observationId`, `formulationId` | Stable document/panel observation and formulation identifiers, explicitly separate from GTIN. The formulation ID must also match `source.formulationId` and `review.formulationId`. |
| `manufacturer` | Name matching source provider, credential-free HTTPS official URL, and `status=reviewed-official-source`. A source must be `manufacturer-label`; retailer, provider, package-only and synthetic-source types do not qualify for this route. |
| `panel` | Stable panel ID, source ID/edition and artifact ID/SHA-256; nutrition, ingredient, presentation and market evidence fields; reviewed US market statement and same-formulation/presentation statuses. |
| `review` | `status=completed`, `evidenceStatus=direct-manufacturer-label`, explicit reviewer ID/type, notes and date matching the main review. Reviewer type distinguishes `human` from `automated-document-review`; neither is inferred from a boolean. |

Product name, brand, variant/flavor, presentation, preparation, category and US
market remain required. Product snapshots in source/review must match, including
null GTIN. A valid GTIN supplied on this route remains only an attributed
identifier; it does not create a scan match.

Panel `nutritionField` scopes the serving and all nutrient field paths. The
ingredient/presentation fields identify the same formulation observation. Fields
can be explicit transcription locators qualified by the original panel; they
do not claim to be manufacturer JSON property names. For version 2 intake,
ingredient text/provenance and market statement must agree with that panel.

The manufacturer and captured artifact must share an origin, or the input must
include an explicitly reviewed official-page-to-external-artifact link with the
exact artifact URL and source field. Thus archived manufacturer-linked images
are possible without trusting an arbitrary accessible CDN URL. The evaluator
does not fetch or authenticate a URL or read raw captured files. Official-source
ownership, truthful review and transcription are curation responsibilities;
well-formed assertions alone are not cryptographic proof.

The main review decision is `label-suitable-for-research-assessment`, rather than
the legacy `matched-product-market-and-label`. Existing review dates/expiry,
source/product binding, consistency and source-state safeguards still apply.
Unknown manufacturer publication/revision dates stay null, independently of
known observation/retrieval/review dates. No country is inferred from a brand,
language, barcode or domain name alone.

## Assessment and scan matching

New-route results include `assessmentIdentity` with the identity type, stable
observation/formulation IDs, actual assessment eligibility and review provenance.
They always contain:

```json
{
  "scanMatch": {
    "eligible": false,
    "status": "not-established",
    "reason": "label-review-does-not-establish-scanned-product-match"
  }
}
```

This remains false for rejected assessments, eligible assessments and labels
with a known GTIN. Caller-supplied `scanMatch=true` flags have no effect. No new
scan-match function or name/brand matcher is provided. Legacy result shape is
preserved; legacy assessment eligibility also should never be interpreted as a
general-purpose barcode matcher. Actual barcode lookup/selection is unchanged.

## Intake and historical compatibility

Version 2 intake explicitly opts into the route. Version 1 rows/collections keep
their original behavior and exact results. Completed review overlays require
the original product identity, all nine amounts/units and reference basis to
agree; they cannot create barcodes, clear unresolved source conflicts or splice
nutrients. Pending reviews leave the original observation unchanged.

The offline compatibility registry binds both the current engine and its pure
identity helper by normalized SHA-256. Only the original known engine pin is
registered for version 1 replay. Version 2 requires the current engine hash.
Unknown engine/helper edits fail rather than silently changing historical
meaning. Original source, research and regulatory archives are not rewritten.
The old archive's standalone historical reproducer still requires its original
engine bytes; the supported intake CLI performs registered compatible replay.

## Individual reviews and demonstrated impact

The [review manifest](reviewed-us-manufacturer-labels/2026-10-19/reviews.json)
contains explicit individual decisions, source captures, exact declarations,
ingredient transcriptions, candidate dispositions and review limitations.
These are **automated document reviews**, not second-human reviews or physical
package inspection. The review status does not claim independent laboratory or
retail-formulation confirmation.

| Observation | Individual decision | Effect |
| --- | --- | --- |
| FAGE Total 0% plain, 5.3 oz/150 g | Completed review of the specific US cup panel and ingredient list; the 170 g tub remains separate. The mismatched 6 oz USDA candidate is not linked and supplies no barcode. | Newly eligible for assessment only; GTIN remains null. |
| FAGE Total 2% Split Cup Strawberry, 5.3 oz/150 g | Completed review of the exact full-container US flavor panel and ingredients. The incompatible USDA candidate with different sugars/ingredient order is retained as an unlinked candidate, not merged or declared corrected. | Newly eligible for assessment only; GTIN remains null. |
| Post Shredded Wheat Original Big Biscuit | Pending. Manufacturer US panel/ingredients exist, but the linked front illustration does not complete the package/panel reconciliation requested by the research audit. | No promotion. |

The two FAGE primary artifacts were rechecked against the preserved original
bytes and all nine declarations, serving size and ingredient text. Their package,
flavor, preparation and ingredient/nutrition panel binding are specific. The
assessment describes those dated primary label observations, not the possible
USDA candidates or a newly scanned product. GTINs are never borrowed from USDA.

Across the same 18 observations, the explicitly curated evaluation gives:

- **12** complete nine-nutrient profiles, unchanged.
- **5 eligible / 13 rejected**, a demonstrated increase of **2**.
- **10** remaining formulation failures, **7** category exclusions, **6** nutrient
  gaps, **3** basis problems and **2** original conflicts; counts still overlap.
- All **16** observations without completed reviews retain their exact prior
  engine results. This includes the original three eligible products and the
  unresolved cereal/bar records. No national coverage estimate is implied.

The [original archived intake](nutrition-label-intake/2026-10-19/intake.json)
continues to report 3/15. The [new evaluation](reviewed-us-manufacturer-labels/2026-10-19/evaluation/README.md)
stores its separate version 2 intake/coverage. To reproduce the two evaluations:

```powershell
node scripts/validate-us-nutrition-labels.cjs --input docs/nutrition-label-intake/2026-10-19/intake.json
node scripts/validate-us-nutrition-labels.cjs --input docs/nutrition-label-intake/2026-10-19/intake.json --reviews docs/reviewed-us-manufacturer-labels/2026-10-19/reviews.json
```

Add `--output-dir` with a fresh directory to save another research run. Existing
output directories and all historical inputs are protected from overwrite.

## Checks, limits and next task

Validation for this extension: **314 focused tests passed** (162 engine/identity,
69 intake/review harness and 83 existing nutrition regressions). The original
104 scoring tests and 58 harness tests remain included. Changed-file lint passed
without errors or warnings. No production build or dependency installation was
performed.

Modified existing files:

- `src/services/experimentalUsNutritionScoring.js`
- `scripts/lib/us-nutrition-label-archive.cjs`
- `scripts/lib/us-nutrition-label-intake.cjs`
- `scripts/validate-us-nutrition-labels.cjs`
- `scripts/us-nutrition-label-intake.test.cjs`
- `docs/experimental-us-nutrition-scoring.md`
- `docs/us-nutrition-label-intake.md`

Added files:

- `src/services/reviewedManufacturerLabelIdentity.js`
- `src/services/reviewedManufacturerLabelIdentity.test.js`
- `src/data/experimentalUsNutritionEngineEditions.json`
- `scripts/lib/us-nutrition-engine-compatibility.cjs`
- `scripts/lib/us-nutrition-reviewed-labels.cjs`
- `scripts/us-nutrition-reviewed-labels.test.cjs`
- `docs/reviewed-us-manufacturer-label-identity.md`
- `docs/reviewed-us-manufacturer-labels/2026-10-19/reviews.json`
- `docs/reviewed-us-manufacturer-labels/2026-10-19/evaluation/intake.json`
- `docs/reviewed-us-manufacturer-labels/2026-10-19/evaluation/coverage.json`
- `docs/reviewed-us-manufacturer-labels/2026-10-19/evaluation/README.md`

Focused tests cover explicit complete and unreviewed labels, null versus fake
GTIN, unknown variants/formulations, source/artifact/panel binding, international
and unknown markets, scan-match separation, all nine missing nutrients, units,
basis, conflicts, freshness, duplicate no-GTIN observations, legacy exact outputs,
formula invariance, review overlays and explicit edition compatibility. Existing
assessment, serving, selection, calculation and saved-food regression tests
check the unchanged nutrition boundary. Run without a production build:

```powershell
node --test --test-concurrency=1 scripts/us-nutrition-label-intake.test.cjs scripts/us-nutrition-reviewed-labels.test.cjs
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/services/experimentalUsNutritionScoring.test.js src/services/reviewedManufacturerLabelIdentity.test.js
```

The formula is still unvalidated for consumer use. Review assertions require a
trusted curation process, source coverage is limited, manufacturer revision dates
remain unknown, and no physical/current-market equivalence was established.
There are no automatic additive penalties, health/safety conclusions or changes
to logging/cache/provider contracts. `assessmentInputs` remains separate and its
public score readiness stays false.

Recommended next task: independently review these two FAGE curation records and
obtain a matched Post package/back-panel edition, with explicit approval before
adding any scan-match linkage or consumer UI. Further category/methodology changes
remain separate research work. No commit or push accompanies this implementation.
