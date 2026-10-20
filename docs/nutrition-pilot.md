# Local nutrition assessment pilot

Work dated 2026-10-19, based on HEAD
`5e495f8cc81628f7619d4465a83856d296af2d24`.
This is an opt-in development preview, not consumer grading. The original
experimental engine, its source-hash registry and all earlier archives remain
unchanged. No score is added to a product, cache, food log or saved record.

## Decision and what it solves

Use **Trace US Density Pilot 0.2-local**, a deliberately limited nutrient-density
index for conventional solid foods. It uses six numerical inputs and makes the
source/formulation assessment visible separately. It gives a working food
assessment preview without pretending that administrative evidence determines
nutrient arithmetic or that an arithmetic result authenticates a scanned product.

Two serious candidates were considered using the existing research:

| Candidate | Capability and decision |
| --- | --- |
| Revised Trace nutrient-density pilot | Transparent, uses available US label quantities, bounded positive credit and a strongest-component safeguard. Selected for this local experiment. Weights and category scope are research hypotheses. |
| Published NRF9.3 | US nutrient-density research provides a precedent for energy-based comparisons, but the full method requires nine positive nutrients, including often-missing micronutrients, and has compensatory arithmetic. Filling unknowns or silently implementing a subset would not reproduce NRF9.3. Not implemented. |

This is not Nutri-Score, Yuka's method, NRF9.3, an FDA healthy-claim test, or a
prediction of personal health. The design borrows only the useful idea of an
easy-to-scan number plus explanations and accessible ingredient information;
no proprietary database, branding or interface is copied. No foreign
formulation or international coefficient table supplies missing US product data.

The old formula gave pure synthetic starch 80 without favorable nutrient
evidence, ignored protein despite requiring it, and compared nuts against a
large 100 g quantity. The new candidate starts at 50, gives bounded fiber and
protein credit, and uses 100 calories. That is a testable improvement in its
limited interpretation, not a scientifically validated ordering of all foods.
Nutrient-identical whole-grain and refined-grain profiles still tie. Ingredient
evidence is displayed rather than fabricated into a numerical distinction.

## Exact calculation and evidence

Method ID `trace-us-density-pilot`; version `0.2-local`.
For one coherent declared dataset, let `E` be positive kcal. For each nutrient,
`density = declaredAmount / E * 100`. Sodium is mg; other scored nutrients are g.

```text
a = min(1, addedSugarsDensity / 10)
s = min(1, saturatedFatDensity / 4)
n = min(1, sodiumDensity / 460)
f = min(1, fiberDensity / 1.4)
p = min(1, proteinDensity / 2.5)
R = ((a + s + n)/3 + max(a, s, n))/2
potential = 50 + 25*f + 25*p
experimentalRaw = potential * (1 - R)
experimentalDisplay = floor(experimentalRaw + 0.5)
```

Nonnegative valid inputs are required before clipping. No intermediate rounding.
The raw result already lies in 0–100; integer display adds no health precision.
The exact accounting shown in the preview starts at 50, adds `25f` and `25p`,
subtracts `potential*a/6`, `potential*s/6`, `potential*n/6`, and subtracts one
`potential*max(a,s,n)/2` safeguard. Ties share that one safeguard.

Directly checked FDA reference values are added sugars 50 g, saturated fat 20 g,
sodium 2300 mg, fiber 28 g and protein 50 g. Limiting anchors above are 20% of
their DVs; positive anchors are DV/20, the proportional reference for 100 kcal
of a 2000-kcal diet. **The density basis, anchors as scoring caps, 50/25/25
weights, safeguard and scale are Trace choices.** FDA's low/high %DV guidance
applies per serving; these density components are not labeled FDA low/high
claims. Protein grams are not a protein-quality-adjusted label %DV.
[FDA Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels).

Food groups and fat type matter beyond these six inputs; the
[FDA healthy-claim overview](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/use-healthy-claim-food-labeling)
illustrates that limitation but supplies no scoring weights here.
The [original NRF validation study](https://pubmed.ncbi.nlm.nih.gov/19549759/)
is a research precedent, not validation of this new Trace formula. Earlier
American-first research remains the source of the wider method comparison.

### Scope and known counterexamples

- Conventional solid categories: produce, cereals, spoonable yogurt, conventional
  protein bars, frozen meals, processed meat, legumes, refined starch, bread,
  nuts, seeds and peanut butter. Category is explicit, not guessed from a name.
- Nuts can be compared as limited nutrient-density profiles; total fat is not
  penalized. Saturated/total-fat quantities remain visible when available.
  Unsaturated fat is never inferred by subtraction, and full fat quality is
  not represented by the number.
- Oils and all beverages have quantity displays but **no overall index**.
  This solid-food method does not solve oil fat composition, juice, hydration,
  water or low-energy drink comparison. Specialist/unknown categories also
  have no numerical rule. No food is given a zero score merely for exclusion.
- A synthetic pure starch profile changes from baseline 80 to 50. A synthetic
  nuts profile (600 kcal, 7 g saturates, 5 mg sodium, 10 g fiber, 21 g protein
  per 100 g) gives about 80.5254. Neither result establishes broad food quality.
- Added protein can raise bounded protein credit and dilute limiting nutrients
  per calorie. This remaining denominator tradeoff is demonstrated explicitly.
  The method does not claim that protein can never improve a high-burden food.
- The observed Post cereal profile reaches 100 because both positive caps are
  met and all three limiting declarations are zero. It is not a perfect food,
  confirmed package match or complete micronutrient assessment. Plateaus and
  missing food-matrix distinctions remain consumer-release concerns.
- Diluting a synthetic 100 mL drink containing 10.5 g added sugars to 200 mL
  lowers concentration to 5.25 g/100 mL; consuming the whole drink still supplies
  10.5 g. No drink score is manufactured to describe this arithmetic.

## Four separate questions

1. **Can this profile be calculated?** Require energy, added sugars, saturated
   fat, sodium, fiber and protein on one coherent basis. Optional total sugars,
   total fat, free sugars and carbohydrates are checked for contradictions when
   supplied; absence does not block. Missing essentials are named, never zeroed.
2. **How strong is the evidence?** Preserve source, edition, capture hash, market
   statement, review type/date, unknown revision and stale/superseded flags.
   Missing administrative fields produce visible limitations, not numeric
   penalties. Automated review is not independent human/package verification.
3. **Does this match a scan?** This preview establishes no scan match, even with
   a known GTIN. It performs no barcode lookup or name/brand linking. Known
   overseas records are excluded from the US pilot; contradictory market claims
   block calculation. Truly unknown market can be assessed as an explicitly
   unknown-market supplied profile. A US-oriented page is not upgraded to a
   verified US formulation.
4. **Does the method cover this category?** Category rules are independent of
   source confidence. Excluded categories retain their quantity display.

Unresolved panel/formulation conflicts, conflicting supplied source bindings,
unsupported nutrient units, negative/nonfinite values, inconsistent reference
bases and impossible component totals block calculation. No conflicting
formulations are merged. Added, free and total sugars remain distinct.

A shared label-serving basis suffices for a per-calorie ratio even when serving
mass is missing: both numerator and denominator describe the same serving.
This does **not** establish a serving-to-100-g or mass-to-volume conversion.
Such reference quantities are shown only with an explicit compatible g/mL
amount. kcal/kJ and explicit mass-unit nutrient conversions are supported.
Label-declared zeros remain rounded declarations, not proof of chemical absence.

## Local preview and reproducibility

Test URL: **http://localhost:3000/?nutritionPilot=1**.
The normal Trace development server is used. If it is not already running,
start it from the project directory in PowerShell:

```powershell
Set-Location C:\Users\benma\Documents\Trace
$env:BROWSER = 'none'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
npm start
```

This uses the existing installed dependencies. It does not require a production
build or another preview server. Development environment, loopback hostname and
the explicit parameter are all required. `src/index.js` also has a literal
development-only guard around the preview import. A production URL parameter
cannot enable grading. Theme selection stays in preview memory and restores
the previous document theme when unmounted.

The preview reuses `BarcodeIngredients` unchanged. The score card immediately
links to additive information and discloses unknown concern coverage. The
adjacent details distinguish missing data, a provider-reported empty list and
reported identifiers. Existing additive name resolution supplies only its
verified EU reference names; no speculative functions, penalties, health claims
or current legal conclusions are added. Synthetic additive examples are marked
synthetic. Real observations have no structured additive list and stay unknown.

There is no Use This Food button or fake handoff callback. Return to Trace opens
the ordinary app; its scanner, lookup, real Nutrition handoff and logging remain
unchanged. Experimental results live only in preview memory, with `grade=null`
and `scoreReady=false`. No food records or public assessment contracts change.

Fixtures are a minimal attributed projection of the already committed reviewed
intake. Each row uses its single selected dataset, unchanged original amounts,
units, identity, source edition and capture hash. The source intake path/hash is
recorded. Tests and preview import only tracked existing files or the new pilot
files; no untracked research archive, ignored HTML capture or network request is
needed. Synthetic controls are separately labeled and invent no manufacturer data.

## Before/after observations

The same 18 observations retain 12 complete nine-nutrient profiles. The original
archive remains 3 eligible; the later reviewed-label baseline remains 5 eligible.
This pilot calculates **10 profiles; 8 remain without an overall number**.
These are profile counts, not verified scanned products or national coverage.
Old/new values use different methods and bases; differences are not health gains.

| Observation | Baseline A | Pilot | Explanation |
| --- | ---: | ---: | --- |
| Rice Krispies | — | — | Package/panel conflict retained. |
| Frosted Flakes | 15 | 26 | Formula and per-calorie basis changed. |
| Blue Diamond almonds | — | 90 | Nuts now in density scope; missing exact GTIN is confidence information. |
| Jif peanut butter | — | 61 | Solid-food category included; family-page formulation uncertainty remains visible. |
| Smart Ones meal | 51 | 64 | Formula and basis changed. |
| Oscar Mayer wieners | 13 | 27 | Formula and basis changed; no additive inference. |
| Nature Valley protein bar | — | — | Conflicting calorie declarations retained. |
| White bread | — | 61 | Retailer profile assessed as supplied; exact GTIN and gram serving size not required for energy density. |
| Whole-wheat bread | — | 68 | Bread included; source/identity confidence separated. |
| Post Big Biscuit | — | 100 | Supplied panel calculated; package/panel match remains unconfirmed. |
| Olive oil | — | — | Oil method not implemented; quantities only. |
| Pepsi | — | — | Beverage method not implemented; quantities only. |
| Diet Pepsi | — | — | Beverage method not implemented; quantities only. |
| Unsweetened tea | — | — | Beverage method not implemented; no invented mL conversion from fl oz. |
| FAGE 0% plain | 76 | 68 | Formula and basis changed; automated reviewed label retained. |
| FAGE 2% strawberry | 51 | 41 | Formula and basis changed; automated reviewed label retained. |
| Generic apple | — | — | Saturated fat and added sugars absent; neither assumed zero. |
| Generic broccoli | — | — | Saturated fat and added sugars absent; neither assumed zero. |

The five additional calculable profiles come from removing identity/review
metadata gates, including additional solid categories and, for white bread,
recognizing that serving mass cancels in a per-calorie ratio. No actual nutrition
declarations changed. Post's manufacturer-label identity review stays pending
in the original archive; calculation does not promote that review.

## Validation and review boundary

Focused test commands (serial):

```powershell
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/development/nutritionPilotScoring.test.js src/development/NutritionPilot.test.jsx
node scripts/verify-nutrition-pilot.cjs
```

The browser check uses the running port-3000 app and installed Chrome, checks
390x844 and 1280x960, seven themes, text contrast, overflow, disclosure behavior
and the ordinary app without opt-in. It saves three screenshots and a small
report under `artifacts/nutrition-pilot-reset-20261019/`. This is local desktop
browser emulation, not physical iPhone/Safari validation. No device test is requested.

An independent hand-calculated synthetic vector (100 kcal, 2 g added sugars,
1 g saturates, 115 mg sodium, 0.7 g fiber, 1.25 g protein) gives
`75 * (1 - (7/30 + 1/4)/2) = 56.875`, displayed as 57. Tests also reconcile every
explanation contribution and exercise caps, unit conversions, serving scaling,
category handling, incomplete inputs, conflicting panels, source/market separation,
starch/whole-grain ties, fat context, dilution and protein denominator effects.
Passing these checks establishes implementation conformance, not nutritional validity.

Consumer-release blockers are specific: independent nutrition review and
calibration of this candidate, testing its plateaus/food-matrix and per-calorie
tradeoffs on a reserved sample, and comprehension checks for the limited index
versus safety/source confidence. Live scanned products would additionally need
an explicit dataset/category selection and established formulation linkage;
this preview does not claim that coverage. Beverage/oil scoring is a scope
choice for a later method decision, not a prerequisite to reviewing this
working solid-food prototype. Broader additive concern evidence is optional
future work while unknown coverage remains clearly disclosed.

Next decision: review the actual preview, its 18-row comparison and the disclosed
counterexamples. Decide whether this limited index and presentation merit
consumer-method validation or a targeted formula revision. No new prerequisite
registry, provider API or broad regulatory investigation is proposed.

## Completed checks and file inventory

- **370 tests passed:** 45 new pilot/component tests and 325 existing regression
  tests in 11 suites, run serially. Existing coverage includes baseline scoring,
  reviewed-label identity, assessment inputs, serving/calculation precision,
  barcode selection, storage, scanner dialog, Ingredients and Nutrition handoff.
- Changed-file ESLint: no errors or warnings. Six JS/CJS files pass Node syntax
  checks; two JSX files parse through ESLint; the fixture JSON parses. All 11
  task files pass whitespace checks.
- Actual localhost preview inspected at 390x844 and 1280x960. Seven theme token
  sets applied, with no page overflow. Checked primary/secondary card text
  contrast stayed above 4.5:1; ingredient controls have a 44 px touch target.
  The ordinary app mounts without the opt-in parameter.
- Archived fixture amounts, units, identities, source editions and hashes were
  compared directly with the committed source intake. The existing formula,
  source registry, original 3-eligible archive and reviewed 5-eligible archive
  retain their original bytes.
- Actual preservation baseline: 59 pre-existing Git entries, 668 existing
  tracked/untracked paths, empty index. All 59 unrelated entries and 667 existing
  paths remain unchanged; `src/index.js` is the one intentionally modified
  existing path. HEAD and index remain unchanged.
- No production build, dependencies, physical-device test, staging, commit,
  push or deployment. Local screenshots, logs and resumable checkpoint are in
  `artifacts/nutrition-pilot-reset-20261019/`.

Exact task inventory (one modified file, ten new files):

```text
src/index.js
src/development/nutritionPilotScoring.js
src/development/nutritionPilotScoring.test.js
src/development/nutritionPilotMode.js
src/development/nutritionPilotFixtures.js
src/development/nutritionPilotObservations.json
src/development/NutritionPilot.jsx
src/development/NutritionPilot.css
src/development/NutritionPilot.test.jsx
scripts/verify-nutrition-pilot.cjs
docs/nutrition-pilot.md
```
