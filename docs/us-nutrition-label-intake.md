# Offline US nutrition-label intake, version 1

Research checkpoint: 2026-10-19. This tool validates local, reviewed observations;
it does not fetch labels, authenticate manufacturers, change eligibility policy,
validate the nutritional methodology, or release grades. Every output retains
`grade: null` and `scoreReady: false`. Numeric research results remain confined
to documentation/tool output. No application file imports the tool.

## Architecture and reproducibility

- `scripts/lib/us-nutrition-label-intake.cjs`: versioned contract validation,
  collection conflict checks, coverage analysis and a narrow adapter to the
  unchanged experimental engine. No I/O, network or current-time dependency.
- `scripts/lib/us-nutrition-label-archive.cjs`: explicit import of the existing
  reviewed observations. Checks source bindings, unchanged engine hash, original
  quantities/units, exact rejection reasons and research results. It is an
  archive adapter, not a general label scraper or ingredient parser.
- `scripts/validate-us-nutrition-labels.cjs`: Node-built-in-only CLI. Reads an
  intake JSON or the prior archive; prints summary counts (and malformed-input
  reasons) to stdout. Full coverage files require an explicitly requested new
  output directory. Checks the engine's normalized source hash.
  Archive import also checks original catalog/capture-manifest byte hashes.
- [Initial intake and coverage](nutrition-label-intake/2026-10-19/README.md): new
  snapshots, leaving the six prior research files unchanged. `intake.json`
  preserves the observations; `coverage.json` includes every engine reason/path,
  intake issue, unknown, recovery candidate and disabled public grade.

From the project root, inspect summary counts without writing:

```powershell
node scripts/validate-us-nutrition-labels.cjs
node scripts/validate-us-nutrition-labels.cjs --input docs/nutrition-label-intake/2026-10-19/intake.json
```

Save another reproducible run to a **new** directory:

```powershell
node scripts/validate-us-nutrition-labels.cjs --output-dir artifacts/us-nutrition-label-intake-review-20261019
```

Existing output directories are refused, including partially completed ones.
After interruption, inspect the preserved output and use a new directory for a
retry. No input, historical report, cache or user record is overwritten. Output
must remain inside Trace; an existing ancestor resolving outside the workspace
is rejected. Malformed intake exits 1; valid but score-ineligible observations
are a successful coverage report and exit 0. There is no automatic fetch,
dependency installation or production build.

## Intake contract

The JSON collection contains `schemaVersion: 1`, an explicit ISO `asOf`, exact
`methodId`/`methodVersion`, `engineNormalizedSourceSha256`, and `records`.
The CLI refuses an absent/different engine hash. Method constants remain
`trace-us-nutrient-profile` / `0.1-research-A`.

Each record contains:

| Field | Content and unknown-state policy |
| --- | --- |
| `schemaVersion`, `id`, `role` | Version and stable observation ID; role describes sampling, not automatic classification. |
| `product` | Exact name, brand, variant, package description, verified GTIN, category, preparation/description and market. Brand/package/GTIN may be explicitly null in intake. This does **not** relax the engine's identity requirement. A supplied GTIN must have valid length/check digit; leading zeros are retained. |
| `source` | ID, immutable capture edition, provider, record ID, kind, attribution, URL, description, original provision, optional document title/label version, artifact ID/locator/SHA-256, matching product snapshot and separate retrieval/publication/revision dates. Unknown title/version/publication/revision are null. A Trace capture edition is not a manufacturer revision. |
| `review`, `sourceState` | Existing exact-product/source/artifact review, observation/review/due dates, unresolved conflicts, cache-stale and superseded states. No bare `verified: true` shortcut. Imported reviewer identity explicitly states automated review, not a second human or physical inspection. |
| `marketEvidence` | Explicit market claim, source/edition/field, statement and `matched-formulation`, `us-oriented-observation` or `unknown` verification. Unknown has null claim/statement. A brand, language or provider-country claim alone is insufficient formulation evidence. |
| `serving` | Original serving description and quantity/unit, with source binding. `servingsPerContainer` is null or a positive declaration with provenance and `exact`/`about` qualifier (null if not established). No division of package weight/count supplies a serving mass. |
| `datasets`, `selectedDatasetId` | Explicitly selected coherent dataset, original `basis` and nine nutrient measurements. A record's datasets share its source edition. A different source edition requires a distinct observation. No nutrient borrowing between datasets. |
| `ingredients` | `transcribed`, `not-transcribed` or `unknown`; text/language and bound provenance when transcribed. No ingredient text is invented from a category or nutrient profile. |
| `foodGroups`, `wholeGrains`, `fatQuality` | Evidence arrays, not inferred health claims. Empty arrays mean no captured evidence, not zero content. Claims carry description, nullable value/unit/basis description and URL/field/source/edition/artifact verification. Quantitative fat observations also bind a dataset ID. |
| `recovery` | Target field, source URL, reason and explicit recovery status described below. Documented fields also bind the source edition. Entries never fill values or establish formulation identity. |
| `limitations`, `lineage` | Original qualifications, prior observation ID/verification description and local original-capture path/hash/size. Local paths are descriptive, never automatically opened by the importer. |

Source kinds distinguish manufacturer/package labels, retailer labels, government
composition, provider observations and synthetic references. Unknown kinds are
rejected. Non-package sources and artifacts require credential-free HTTPS URLs.
A physical `package-label` may use a local artifact locator and an explicitly
unknown source URL; the engine still requires the artifact hash and bound review.
A hash binds declared bytes; it does not prove truthful transcription or contents.
The tool does not reread images/HTML or verify actual raw-artifact bytes on disk.

Every nutrient measurement has `value`, original `unit`, `sourceId`,
`sourceEdition`, source `field` and one of these states:

- `reported`: finite nonnegative number, including an explicitly declared zero.
- `missing`: null; no amount available in the observation.
- `not-numerically-declared`: null; a qualitative declaration cannot become zero.
- `ambiguous`: null; a value must be resolved before numerical use.

All nine nutrient keys must be present, even when null. Numeric strings,
booleans, negative/nonfinite values, inconsistent states and unsupported units
are rejected. Added, total and free sugars are never interchangeable. Only
added/total sugars enter this nine-key experimental contract; optional free-sugar
evidence cannot substitute for either. Added sugar cannot exceed total sugar;
saturated fat cannot exceed total fat after supported unit conversion.

`basis.kind` is `serving`, `100g` or `100ml`. A metric reference must actually
declare 100 g/mL. Serving datasets must agree with the recorded serving quantity.
Unknown household quantities can remain intact in intake, with a conversion
warning and engine rejection. Nutrient g/mg/microgram and kcal/kJ conversions
match the engine; positive-to-zero underflow and overflow cannot yield known
values. Reference quantities remain limited to evidenced g/mL. No density,
fluid-ounce/cup conversion, percent-DV imputation or inferred rounding repair.
The engine handles per-100 scaling without intermediate rounding. Original
values survive in intake and eligible explanation inputs.

## Validation and report semantics

Malformed structure, missing attribution/bindings, invalid dates, impossible
quantities, unsupported conversions and contradictory nutrients produce structured
intake errors. Unknown optional metadata is preserved with warnings where useful.
An intake-valid record can still be ineligible for experimental scoring.

Dates are strict ISO calendar dates. Known source dates cannot postdate retrieval
or `asOf`. The engine separately enforces publication/revision versus observation,
review chronology, expiry, source identity, preparation evidence, stale-cache and
supersession safeguards. Unknown manufacturer revision remains unknown; a recent
download does not renew an old observation or establish the current shelf label.
Coverage reports show the separate dates and exact freshness rejection reasons.

Duplicate IDs reject both participants; conflicting reuse of a source ID/edition
also rejects all affected observations. Repeated canonical GTIN/market/preparation
identities require reconciliation, including different source editions. They are
not silently combined or automatically treated as newer replacements. Different
market/preparation records are never merged. Unknown GTINs are not guessed equal
from similar brand/name strings. Same-dimensional datasets with different scaled
declarations require reconciliation, even where label rounding might explain the
difference; no unapproved tolerance adjudicates it. Cross-dimensional datasets
are not compared by inventing a density.

Each report separates present numeric, missing, ambiguous/non-numeric and
conflicting inputs; numeric completeness; market evidence; formulation acceptance;
and exact engine rejection reasons with paths. Additional intake errors always
suppress numerical results, even if the unchanged engine alone would score.
Neither supplemental claims nor recovery entries contribute scoring points.

Recovery statuses are deliberately distinct:

- `documented-not-transcribed`: an existing archived provision identifies a
  field, such as ingredients, awaiting transcription and review. It is not a
  recovered nutrient amount.
- `candidate-requires-verification`: a targeted manufacturer/package/USDA review
  could help; availability and exact formulation match are not yet established.
- `not-numeric-in-observed-source`: the source observation does not give a usable
  numeric declaration. The tool cannot resolve it through zeros or percentages.

## Findings from the initial 18

All 18 import as valid, possibly incomplete observations. The unchanged engine
still accepts only Frosted Flakes, Smart Ones Santa Fe Rice & Beans and Oscar
Mayer Classic Wieners. All prior experimental scores and rejection reasons match.

| Independent coverage issue | Observations |
| --- | ---: |
| Complete nine numeric nutrients | 12 |
| Missing at least one required nutrient | 6 |
| Identity/formulation rejected by engine | 12 |
| Unsupported category | 7 |
| Unknown/unsupported measurement basis | 3 |
| Documented unresolved conflict | 2 |
| Eligible for internal research | 3 |

Counts overlap and are **not** national coverage percentages. Exact reasons for
every rejected observation appear in the generated table/JSON.

The six nutrient-gap records are olive oil (added/total sugar and fiber), Pepsi,
Diet Pepsi and unsweetened tea (saturated fat/fiber), and the FDA apple/broccoli
tables (saturated fat/added sugar). Not-significant-source text is qualitative;
it is not numeric zero. The oil's volume does not establish a mass reference.

Three complete observations in supported categories (Shredded Wheat and both
FAGE panels) fail identity/provenance gates without a nutrient gap. Mandatory
GTIN, brand, variant and exact-package snapshots are conservative experimental
metadata policy. This sample demonstrates their cost, not that unverified
matching is safe. A separately approved alternative exact-formulation identity
route could be researched. Generic produce also fails the branded-source route;
a separate reviewed generic USDA route needs its own specification.

The unsupported nuts, spread, bread, oil and low-energy beverage categories are
methodology-scope exclusions, not nutrient omissions. Energy/protein and other
unweighted context nutrients are still required by the approved engine; this
tool does not remove them. Rice Krispies has a package/count conflict; the bar
has 200 versus 190 kcal plus missing serving mass. These need adjudication,
not metadata relaxation or convenient recategorization.

Available fat-quality declarations are retained for almonds/oil. Dave's 25 g
whole-grain marketing callout remains an **unverified archived note** with null
artifact binding: the separate NFP image does not prove the callout. Post's
whole-grain statement remains qualitative. No FDA food-group equivalents are
invented. Ingredient fields documented by the previous archive are marked for
transcription; full ingredient lists were not collected afresh in this task.

## Provider compatibility and next evidence work

Existing USDA normalization separates label-per-serving from food-nutrient
reference datasets; unknown reference dimensions stay unknown. OFF retains
declared serving/reference bases and raw versus standardized-unit provenance;
country/category/whole-grain metadata remains provider reported or estimated.
These application contracts are unchanged. Neither provider observation is
automatically upgraded to a matched manufacturer/package label by this tool.
The research nine-nutrient requirement is distinct from the assessment contract's
three essential limiting nutrients; public assessment readiness stays disabled.

The smallest next task is an independently reviewed exact-US-label intake pass:
bind GTIN/package/edition for the two FAGE cups and Shredded Wheat, adjudicate
the cereal/bar conflicts, and obtain declared metric serving evidence where
missing. Use manufacturer/package labels first. A USDA branded candidate must
match GTIN, market, preparation and source edition, retain original derivation
and rounded-label limitations, and never supply isolated values to another
edition. Missing entries, unlike explicit zeros, remain missing. A generic USDA
composition record is a distinct research route, not a branded substitute.
No new manufacturer/USDA records have been fetched or asserted to exist here.

Any proposal to accept an alternative identity key, qualitative nutrient bounds,
generic foods or additional categories needs separate evidence and approval.
Do not tune weights to improve these familiar products. A larger preregistered
reserved sample and scientific review are still needed before consumer grading.

## Validation commands

```powershell
node --test scripts/us-nutrition-label-intake.test.cjs
node node_modules/eslint/bin/eslint.js scripts/lib/us-nutrition-label-intake.cjs scripts/lib/us-nutrition-label-archive.cjs scripts/validate-us-nutrition-labels.cjs scripts/us-nutrition-label-intake.test.cjs
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/services/experimentalUsNutritionScoring.test.js src/services/nutritionAssessmentInputs.test.js
```

Tests label controlled mutations synthetic; they are not additional real labels.
They exercise the initial 18, supported conversions, missing values, market
review, dates/revision, source identity, conflicting/duplicate observations,
multiple datasets, grain/fat/ingredient evidence, disabled grades and CLI
round-trip/no-overwrite behavior. No scanner, UI, logging, saved-record, cache,
assessment, additive, regulatory or scoring-engine application file is modified.
