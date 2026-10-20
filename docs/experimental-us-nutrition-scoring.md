# Isolated experimental US nutrient scoring engine

Implementation checkpoint: 2026-10-19; base commit
`8c477ef4f1385bc9e8941f9d6caf1537ade2066f`.
Implements candidate A from the
[research specification](us-nutrition-grade-specification-2026-10-19.md).
This is internal arithmetic/eligibility work, not scientific validation or approval
to show a consumer grade. The earlier research reports remain unchanged.

## Isolation and method

`src/services/experimentalUsNutritionScoring.js` imports only its pure local
reviewed-label identity validator. It has no storage, network, UI, provider,
regulatory, additive or runtime-clock dependencies. Its
only evaluator is `evaluateExperimentalUsNutrition(input)`. No existing application
file imports it; it is exercised by focused tests. It cannot enrich missing data,
look up an artifact or authenticate a reviewer's claims.

The existing assessment contract, lookup/cache formats and saved records are
unchanged. Offline research intake has its own adapter; no adapter connects this
evaluator to barcode review, Nutrition, logging or saved records. There is no
migration, public persistence or score display. Every result, eligible or rejected, has
`grade: null`, `scoreReady: false`, and `methodStatus: research-not-frozen`.
Existing assessment quality continues to report `scoreReady: false`; no public
grade field is added to the existing contract.

Method ID `trace-us-nutrient-profile`, version `0.1-research-A` must be explicitly
supplied. A future or missing method version is rejected rather than interpreted
as the current method. Only A is implemented; no B/C experiments or unguarded
diagnostic calculator are exported.

```text
a = min(1, addedSugar_g / 10)
s = min(1, saturatedFat_g / 4)
n = min(1, sodium_mg / 460)
f = min(1, fiber_g / 5.6)
mean = (1/3)*a + (1/3)*s + (1/3)*n
worst = max(a, s, n)
R = 0.5*mean + 0.5*worst
factor = 0.8 + 0.2*f
experimentalRawScore = 100*(1-R)*factor
experimentalScore = floor(experimentalRawScore + 0.5)
```

Invalid or missing inputs are rejected before clipping. Inputs are nonnegative,
so these min operations match the specification's [0,1] clipping. The raw score
is already on the 0–100 scale; the second field is its final rounded integer,
not a second invented score or a rescaled burden. No intermediate rounding or
extra score clamps are applied.

Contributions reproduce the specification's accounting: start at 100, subtract
`20*(1-f)` and the three `50*factor*(1/3)*burden` losses, then subtract the single
`50*factor*worst` guard loss. Tied strongest components share one guard, not one
charge each. `fiberAdjustment.pointsAboveNoFiber` is `20*(1-R)*f`; this is an
accounting comparison, not a causal health effect.

Protein, calories, total sugar, total fat and carbohydrate are required for the
complete profile/context but get no direct points. Free sugar does not substitute
for added sugar. No additive/legal/marketing/organic/portion field influences
the calculation. Numerical weights/caps remain experimental Trace decisions,
not FDA scoring rules or established relative health effects.

## Controlled input contract

This contract is separate from `assessmentInputs`. Raw gateway products and old
cache entries do not meet it merely by being log-ready or nutrient-complete.

| Field | Required content |
| --- | --- |
| `methodId`, `methodVersion`, `asOf` | Exact method constants; explicit `YYYY-MM-DD` UTC assessment date. No default to today's date. |
| `product` | Name, brand, variant, packageDescription, preparation, preparationDescription, market and category are explicit nonempty strings. Legacy inputs require GTIN (8/12/13/14 digits with valid check digit). The explicit reviewed-label route permits GTIN=null; it never invents a barcode. |
| `basis` | `kind`: `100g`, `100ml` or `serving`; positive numeric `amount`, `unit`: `g` or `ml`, `sourceId`, `sourceEdition`, original source `field`. A 100-reference must actually declare 100 of its stated unit. |
| `nutrients` | Nine measurements keyed by `calories`, `saturatedFat`, `addedSugar`, `totalSugar`, `sodium`, `fiber`, `protein`, `fat`, `carbohydrates`. Each requires numeric `value`, `unit`, `sourceId`, `sourceEdition`, `field`. Numeric strings, booleans, missing, negative and nonfinite values are not known amounts. |
| `source` | ID, provider, recordId, edition, attribution, kind, artifact, matching product identity, retrievedOn, publishedOn and revisionOn. Publication/revision may be explicitly null; they cannot silently disappear or replace observation/review dates. |
| `source.artifact` | Stable ID, nonempty captured-artifact locator, SHA-256 string. A manufacturer-label locator must be HTTPS without credentials. An accessible URL alone does not establish provenance or currentness. |
| `review` | ID, reviewerId, notes, kind, decision, consistency, sourceId/sourceEdition, artifactId/artifactSha256, matching product, labelObservedOn, reviewedOn and reviewDueOn. Source/edition/artifact/identity bindings must agree. |
| `sourceState` | Explicit boolean cacheStale and superseded flags, plus an explicit unresolvedConflicts array. Unknown flags do not default to false. Unresolved conflicts cannot be scored. |

Source kinds are `synthetic-reference`, `package-label` or `manufacturer-label`.
Synthetic sources require `review.kind=synthetic-controlled`; primary-label sources
require `independent-label-review`. All reviews require
`decision=matched-product-market-and-label` and
`consistency=reviewed-no-unresolved-conflict`, plus the actual bound artifact and
review details. A provider-only source or bare `verified:true` does not qualify.
These fields validate a controlled review record's structure and consistency;
they do not cryptographically certify that someone performed a truthful review.
Production trust/curation infrastructure is outside this experiment.

The additional [reviewed US manufacturer-label route](reviewed-us-manufacturer-label-identity.md)
requires versioned `identity`, direct official-manufacturer/panel/formulation
evidence and a completed review. Its decision is
`label-suitable-for-research-assessment`, distinct from the legacy decision above.
It always returns `assessmentIdentity.scanMatch.eligible=false`: an assessment
does not establish a match to a scanned item. Legacy inputs/results are unchanged.
The formula/method version below has not changed; this is an identity extension.

Root, source and review product snapshots must match, including US market,
category, variant, package and preparation. US country claims from a provider,
language, GTIN alone, source URL or current retrieval cannot supply missing primary
formulation review. A known non-US record stays outside the initial US scope.
Only exact `US` can qualify. Other uppercase two-letter market codes are outside
scope; malformed/unknown labels (including `XX` and `ZZ`) remain insufficient
data. This is a serialization check, not an independent country-code or market
verification service.
There is no generic-food substitution or ingredient-based identity inference.
Reviewed-label snapshots must also agree on a stable formulation ID and their
product identity, including explicit null GTIN when unknown. The new route does
not waive the original source, date, nutrients, basis, category or conflict checks.

`preparation` is `as-sold` or `as-prepared`, with an explicit description. A prepared
snapshot also needs artifact-bound `source.preparationEvidence` containing
instructions, positive finalAmount, compatible finalUnit and
`includesAllAdditions:true`. This attests to a fully reviewed prepared dataset;
the engine does not estimate cooking losses or calculate a recipe from ingredients.
Unknown additions/yield prevent scoring.

## Units, basis and consistency

Nutrient units support g, mg and microgram aliases (`mcg`, `ug`, `µg`, `μg`), with
canonical g except sodium mg. Energy supports kcal/kJ using 4.184. Original unit
spelling, amounts, fields and source editions remain in explanation inputs;
explicit conversion factors and reference scaling are returned. No salt/%DV
imputation, density estimate or total/free-to-added-sugar conversion occurs.
Overflow or positive-to-zero underflow during transformation is rejected.

A compatible g/ml serving is scaled by `100 / servingAmount`. Reference quantity
units are deliberately limited to g/ml: callers must supply an evidenced gram or
mL quantity, not a household cup or a guessed mass. Cross-dimensional conversion
is not implemented. Solids require mass and beverages volume. Every measurement
and basis must reference the same source and edition; no dataset merging.

Added sugars exceeding total sugars or saturates exceeding total fat are rejected.
Other energy/component plausibility requires the explicitly bound consistency
review. No unspecified 4/4/9 tolerance or food-group inference was invented.
An omitted/failed consistency review or declared conflict blocks evaluation.
The evaluator cannot independently compare entered numbers with an artifact's
contents without violating its no-I/O design; controlled input curation matters.

## Category and date policy

Supported research solid category IDs: `produce`, `breakfast-cereal`,
`spoonable-yogurt`, `conventional-protein-bar`, `frozen-meal`, `processed-meat`,
`legumes`, `refined-starch`. Beverage IDs: `sugar-sweetened-beverage`, `juice`,
`dairy-beverage`, `plant-beverage`. The spelling is a serialization choice for the
specification's reviewed roles, not an automated classifier or regulatory taxonomy.
All use unmodified A and retain `consumerApproved:false`.

Nuts, seeds, oils, water, specialist products and all other categories get no
numeric output. In particular, the specification's nuts/water/oil and NZ rows
are deliberately excluded diagnostics. Their worksheet numbers are not an
eligibility bypass. The reference tests cover all 22 rows as **18 scored research
cases and four explicit rejections**. Unknown category is insufficient data;
known unsupported category is not applicable. No energy cutoff for “very low”
was invented; reviewed category labels determine scope.

All dates must be valid ISO calendar dates. Require
`labelObservedOn <= reviewedOn <= asOf`, and retrieval no earlier than observation
or later than asOf. Known publication/revision must not postdate observation or
asOf; revision preceding publication requires review. Unknown publication/revision
stays null. These remain distinct dates, not substitutes for label observation.

Apply the draft specification's operational review window:
`labelObservedOn <= reviewDueOn <= labelObservedOn + 365 UTC days`, with
`asOf < reviewDueOn`. Equality at expiry is ineligible. A reviewer may shorten,
but not extend the maximum or refresh old observation through new retrieval.
Stale-cache use, supersession, conflicting observations or inconsistent future
dates require review. This internal policy is not a scientifically validated
product shelf life or assurance of unchanged formulation.

## Results and rejection behavior

Every result includes inputStatus, eligible, reasons (`status`, `code`, `path`),
deduplicated reasonCodes, warnings, fixed method identity/status and disabled
public grade fields. All independent reasons survive. Primary status precedence
is invalid-data, needs-review, not-enough-data, not-applicable, then
eligible-for-research; scope reasons are retained even when another error leads.

Rejected results have null raw/rounded scores, contributions, components and
explanation inputs. There is no partial score, zero fill, reduced formula or
fallback to a general category. Malformed input returns structured rejection.
Eligible results additionally contain:

- Exact/rounded experimental score, normalized burdens, single strongest guard,
  fiber fraction/factor and reconciled nutrient/guard contributions.
- Category/comparison class and explicit absence of energy, protein or additive
  points; no A–E bands or health labels.
- Canonical/original nutrient values, transformations, reference basis, product
  snapshot, source/edition/artifact binding, review details and dates.
- Research, matrix/fat-quality and no-consumer-grade warnings; synthetic inputs
  are identified, reported-label rounding and beverage/dairy limitations retained.

Outputs are recursively frozen independent copies. Inputs are not mutated/frozen.
AsOf is explicit; repeat calls do not consult Date.now, fetch or localStorage.
No experimental result is written into a product, cache or saved food record.

## Reference validation and limitations

The synthetic fixture file independently transcribes all nine nutrient values
and A's four-decimal reference observations from the specification. It pins the
source document path/edition/SHA-256 and clearly labels every number, product and
review record synthetic. No real manufacturer label, independent package
verification or clinical evidence is fabricated.

Tests cover all 22 examples and eligibility failures, caps/rounding, strongest
ties, bounded fiber, protein/energy invariance, 27 controlled monotonicity profiles,
unit/reference equivalence, source/identity/edition binding, date/expiry/leap-day
rules, preparation, metadata invariance and absence of I/O/input mutation.
The known refined-starch/whole-grain ties and dilution effect are retained.
Nuts/oils/water stay rejected rather than hand-adjusted to attractive values.
These checks establish implementation conformance, not scientific validity,
US product coverage or consumer interpretability.

Validation completed on 2026-10-19:

- 104 final scoring tests passed, plus 315 existing regression tests across 20
  distinct suites. The combined run passed 416 tests before the final eligibility
  cases; the final scoring suite was then rerun independently.
- Existing coverage includes assessment inputs, product normalization/cache/
  lookup/selection, saved catalog and log records, serving calculations, additive
  metadata, Nutrition barcode handoff, ingredient disclosure, scanner dialog,
  camera lifecycle, photo handling and decoder behavior.
- Changed-file ESLint: zero errors and warnings. All three JavaScript/CommonJS
  files passed Node syntax checks; all four new files passed whitespace checks.
- All 22 fixture input vectors and expected A observations were independently
  compared with the unchanged, SHA-256-pinned specification.
- All 51 pre-existing Git entries retained their original status and file hashes;
  HEAD and the empty index remained unchanged. Only these four task files are new.
- Ignored resumable logs and verification results are under
  `artifacts/experimental-us-scoring-20261019/`. No build, dependency installation,
  commit or push was performed. No new physical-device validation was performed.

Run the focused scoring tests from the project root:

```powershell
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/services/experimentalUsNutritionScoring.test.js
node node_modules/eslint/bin/eslint.js src/services/experimentalUsNutritionScoring.js src/services/experimentalUsNutritionScoring.test.js src/services/__fixtures__/experimentalUsNutritionScoring.cjs
```

Next validation: independently double-review exact US product/formulation evidence
on a preregistered, stratified reserved-label set, and review category/fat/food-group,
basis/dilution and calibration failures with nutrition expertise before any
method freeze. Keep this engine disconnected from users and preserve null public
grades while that scientific work remains unresolved.
