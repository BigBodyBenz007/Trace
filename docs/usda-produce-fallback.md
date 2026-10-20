# Experimental USDA produce fallback

Development-only, opt-in localhost preview. Public `grade = null`,
`scoreReady = false`, and `scanMatchEligible = false` remain unchanged.
No runtime network calls, persistence, migrations or scanner connections.

Open `http://localhost:3000/?nutritionPilot=1`, then **Try a USDA produce
estimate**. Select a reference, explicitly confirm the food is that plain,
fresh, raw, single-ingredient produce and accept the generic estimate. Changing
the reference or unchecking confirmation clears the association. Clear selection
removes it. The original research observation and ingredients remain separate.

## Why the existing apple is 82

USDA FDC **171688**, SR Legacy, published April 1, 2019, per 100 g raw edible
portion with skin: 52 kcal, 10.39 g total sugars, 0.028 g saturated fat,
1 mg sodium, 2.4 g fiber and 0.26 g protein.

The unchanged updated nutrient engine converts energy to 218 kJ and sodium to
0.0025 g salt. Sugars exceed 3.4, 6.8 and 10 g: **3 negative points**. Energy,
saturated fat and salt contribute zero points. Fiber does not exceed 3 g and
protein does not exceed 2.4 g, so both contribute zero positive points.
The single-fruit reference is 100% qualifying fruit, above 80%: **5 positive
points**. Raw score = 3 − 5 = **−2**.

The existing Trace anchors (−17, 99) and (0.5, 80) give
`floor(99 + (80 - 99) * ((-2 + 17) / 17.5)) = floor(82.7142857) = 82`.
This is an experimental Trace presentation of composition data, not a USDA
score, exact specimen analysis, Gala-specific profile or package label.
No calculation bug was demonstrated; neither engine nor conversion changed.

Official method reviewed October 20, 2026:
[Santé publique France scientific and technical FAQ, version 11, March 17, 2025](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf).
Printed pages 27–28, Tables 5–6, establish the updated general-food thresholds
and subtraction. Printed pages 9–11 distinguish nutrition-declaration scope,
voluntary labeling and recipe composition estimates. No automatic highest-score
override for whole fresh produce was found. The recipe database substitution
route expressly excludes prepackaged food products. This experiment therefore
does **not** establish eligibility to display an official Nutri-Score on a bag
of produce. It applies the published mathematics to a generic reference only.

## References and coverage

| Food | FDC ID / type | Data reused | Experimental result |
|---|---|---|---|
| Generic apple, raw with skin | [171688 / SR Legacy](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171688/nutrients) | Whole existing research record, published 2019-04-01, captured 2026-10-19 | 82 |
| Gala apple, with skin, raw | [1750341 / Foundation](https://fdc.nal.usda.gov/fdc-app.html#/food-details/1750341/nutrients) | Existing grocery catalog excerpt, source release 2026-04 | Unavailable: total sugars and saturated fat absent from excerpt |
| Banana, raw | [173944 / SR Legacy](https://api.nal.usda.gov/fdc/v1/food/173944?api_key=DEMO_KEY) | Complete required nutrient vector from one official API record; published 2019-04-01, captured 2026-10-20 | 81 |
| Broccoli, raw | [170379 / SR Legacy](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170379/nutrients) | Whole existing research record, published 2019-04-01, captured 2026-10-19 | 87 |
| Carrot, raw | [170393 / SR Legacy](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170393/nutrients) | Existing grocery catalog excerpt, source release 2018-04 | Unavailable: total sugars and saturated fat absent from excerpt |

The grocery catalog has a different Foundation broccoli reference, **747447**;
its quantities are not combined with SR Legacy **170379**. Catalog quantities
are used per 100 g directly, without serving conversion or rounding again.
Catalog release dates are retained as release dates, not invented publication
or fresh verification dates. Existing source hashes and nutrient bindings are
retained for the two complete research records.

One small, necessary research API download supplied the banana nutrients
missing from the catalog. Its selected fields, USDA nutrient IDs, derivation
metadata, units and full-response SHA-256 are retained in
`src/development/__fixtures__/usdaBananaReference.json`. Raw capture is in the
ignored validation artifacts directory. Two further research requests received
HTTP 429. Web access exposed some carrot fields but did not yield an archived
complete response; no partial fields were spliced into the catalog vector.
Gala and carrot reference completeness remains explicitly unresolved. Do not
infer that USDA itself lacks those nutrients.

[USDA documentation](https://fdc.nal.usda.gov/data-documentation/) and the existing
`docs/grocery-food-catalog.md` describe source types and the local catalog.
USDA data are public domain (CC0); USDA/ARS attribution and FDC identifiers
remain attached. No extra runtime requests or API keys were introduced.
Other produce is outside this initial five-reference demonstration.

## Eligibility and identity boundary

`assessProduceFallback` is a pure helper for trusted, curated local references,
not an independent verifier of arbitrary source URLs. It requires an identified
USDA edition, official URL, raw edible-portion basis of 100 g, fruit/vegetable
identity and consistent source bindings. All required nutrient values must be
present, finite, nonnegative and in supported units. Contradictory component
values and mismatched provenance block scoring. Missing values remain unknown.

A selection always requires confirmation bound to the reference and a valid
date. Unknown barcode identity can enter only the explicitly user-confirmed
generic route; failed lookup, brand and food name do not establish identity.
The result retains `productIdentity: unverified` in this route. Reviewed produce
type evidence can be supplied separately, with its source and review date;
this still does not establish exact package composition or barcode matching.
Known processed/mixed/non-raw/non-fresh evidence cannot be overridden by the
checkbox. Verified type evidence must match the selected food/category and,
for a cultivar-specific reference, its cultivar. Generic apple remains generic
even when evidence says Gala. User confirmation cannot create missing USDA data.

User confirmation is an assertion, not independent verification. No automatic
free-text or brand inference is implemented. The live scanner is not connected
to this demonstration. Any future scanner integration needs a separate review
of structured identity evidence and the confirmation flow.

The generic reference is returned separately from commercial product metadata.
The UI labels it **USDA generic reference / user-confirmed association**. It
keeps package ingredients, additives, exact composition, market/formulation and
scan matching unknown. A USDA food description is not repurposed as package
ingredient text. Absence of an additive list does not establish additive absence.
Manufacturer observations, caches and saved records are untouched.

## Validation and resuming

Focused tests cover references, apple arithmetic, confirmation, exclusions,
cultivar distinction, nutrients, basis, attribution, determinism and UI state.
Existing calculation, conversion, grocery catalog, scanner, ingredients,
Nutrition logging and serving tests provide regressions. No production build
or dependency installation is required.

Validation artifacts and the initial file-hash snapshot are under
`artifacts/usda-produce-fallback-20261020/` (ignored). Repository documentation,
fixtures and tests are saved independently of those artifacts. No commit or
push is authorized for this task.

Next: retrieve and review complete single-edition Gala and carrot references,
then review the optional selection UI before connecting any scanner workflow.

## Task inventory and results (October 20, 2026)

Modified:

- `src/development/NutritionPilot.jsx` — mounts the optional separate panel.
- `src/development/NutritionPilot.css` — theme-based panel controls.
- `scripts/verify-nutrition-pilot.cjs` — optional `--produce` visual checks with
  a separate artifact directory; the original default output remains unchanged.

Added:

- `src/services/usdaProduceFallback.js`
- `src/services/usdaProduceFallback.test.js`
- `src/development/usdaProduceFixtures.js`
- `src/development/__fixtures__/usdaBananaReference.json`
- `src/development/UsdaProduceFallback.jsx`
- `src/development/UsdaProduceFallback.test.jsx`
- `docs/usda-produce-fallback.md`

Focused runs cover **461 distinct passing tests across 14 suites**: 55 new
fallback tests, 284 existing preview/calculation/conversion/catalog tests and
122 scanner, ingredient, logging, storage and serving regression tests. The
initial banana UI expectation was corrected from 83 to the unchanged engine's
81; the final fallback run passes. No production build was run.

Changed-file ESLint, JavaScript/JSX syntax, JSON parsing and whitespace checks
pass. Mobile 390×844 and desktop 1280×960 screenshots were inspected. Browser
checks cover seven existing themes, contrast, overflow, original ingredient
disclosure, unknown formulation behavior, explicit generic confirmation,
clearing on reference changes and unresolved Gala inputs. Ordinary application
navigation without opt-in still excludes the preview. No physical-device test
was requested.

Raw hashes verify **691 baseline paths** outside the three intentionally
modified existing files are unchanged, including preexisting missing files and
untracked research reports. HEAD and index remain untouched. Research HTTP 429
responses and Git's usual LF-to-CRLF notices are the remaining validation
warnings; neither was worked around by changing data or Git settings.
