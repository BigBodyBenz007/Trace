# Experimental barcode review information — 2026-10-20

Development-only copy and disclosure polish. No score mathematics, category
rules, feature gates, scanner code, storage or food logging changes. The
approved layout and CSS are unchanged. All disclosures still start collapsed.

## Nutrition explanations

`explainNutritionPoints` reads the actual engine point ranges. Only a positive
minimum establishes that a factor contributes. It uses `proteinApplied`, never
the unapplied protein points. Total sugars are not described as added sugars.
Sodium is described as calculated salt because that is what the published
method evaluates. Fats/nuts/seeds distinguish energy from saturates and the
saturated/total-fat share. Beverage sweetener points are a nutritional-method
rule, not an automatic additive-risk penalty. Unknown contributions are not
invented. Raw and component points remain inside the existing score details.

Scores remain whole numbers; no classification letters are added. Source and
US-formulation uncertainty and unresolved-score explanations are preserved.
Public `grade=null` and `scoreReady=false` remain unchanged.

## Additive scope and sources

The existing normalized provider tags and historical EU name references remain
the sole identity route. The eight names are unchanged. The new development
copy adds general food functions, not the manufacturer's confirmed purpose in
a particular product. No ingredient parsing, provider calls or safety rating
is introduced. Unknown identity, unknown lists and provider-reported empty
lists remain different states. No historical legal-event records are changed
or projected onto a product.

Official material directly reviewed on **2026-10-20**:

| Identifiers | Information | Official source and relevant text |
| --- | --- | --- |
| E150d, E202, E211, E330, E415 | Coloring, preservation, acidity control, thickening/stabilizing | [FDA Types of Food Ingredients](https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients), corresponding rows of ingredient table; publication date not stated in accessible text |
| E300 | Antioxidant and vitamin C synonym | [FDA ascorbic acid inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=ASCORBICACID), synonyms and technical effects; page updated 2026-09-08 |
| E322 | Emulsifier | [FDA lecithin inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=LECITHIN), technical effects; page updated 2026-09-08 |
| E500ii | Sodium hydrogen carbonate/bicarbonate; leavening | [FDA sodium bicarbonate inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=SODIUMBICARBONATE), synonyms and technical effects; page updated 2026-09-08 |
| E211, E300 | Conditional benzene formation in some beverages, heat/light influence, historical survey qualification | [FDA benzene Q&A](https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages), questions 3–5; discussion includes 2005–2007 survey, not a current product survey |
| E150d | Caramel-associated 4-MEI; animal exposure context and FDA response | [FDA 4-MEI Q&A](https://www.fda.gov/food/food-additives-petitions/questions-answers-about-4-mei), formation, 2007/2020 animal studies, exposure and regulatory-response sections; publication date not stated in accessible text |
| E150d | Class IV/sulphite ammonia caramel identity cross-check only (partial access) | [FAO/WHO Codex GSFA entry 150d](https://www.fao.org/gsfaonline/additives/details.html?id=94), official indexed heading available; full page retrieval failed. International reference, not US authorization or evidence of permitted food uses |

Every displayed function and scientific context links its official source with
jurisdiction, provision/section, edition information and review date. These
summaries are Trace paraphrases, not FDA endorsements. Function evidence does
not amount to a comprehensive scientific assessment. Missing concern text
does not mean there are no concerns. Provider tags establish neither measured
contaminants nor an individual's exposure or risk.

## Dated US provision summaries

Directly read the current eCFR pages below, which displayed **current through
2026-10-16**, title last amended 2026-10-14. eCFR is authoritative but unofficial.
Links point to the reviewed current pages and may change; the displayed review
and edition dates describe this review, not a promise of ongoing verification.
The point-in-time `/on/2026-10-16/` URLs could not be accessed through the research
tool and are not used as if separately verified. FDA's older CFR search pages
only redirected to eCFR and were not treated as evidence of the provisions.

- [21 CFR 184.1733](https://www.ecfr.gov/current/title-21/section-184.1733),
  (b)–(e): sodium benzoate specifications, antimicrobial/flavor uses, good
  manufacturing practice, the 0.1% current-usage statement, significantly
  different conditions not determined GRAS and prior-sanction qualifications.
- [21 CFR 184.1033](https://www.ecfr.gov/current/title-21/section-184.1033),
  (b)–(d): citric acid specifications, good manufacturing practice and
  prior-sanction qualifications.
- [21 CFR 172.695](https://www.ecfr.gov/current/title-21/section-172.695),
  (a)–(f), especially (e)–(f): xanthan production/specifications, applicable
  texture-related uses under good manufacturing practice where food identity
  standards do not preclude use, food-grade labeling and directions conditions.

Other identifiers explicitly say US regulatory conditions have not been
reviewed here. These three limited summaries do not establish product
compliance, current EU authorization, universal permission or safety.
Original EU 2012 name attribution is still shown separately and unchanged.
The existing dated historical regulatory archive remains untouched.

## Validation and resuming

Use installed dependencies; no full production build is needed:

```powershell
$env:CI='true'
npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/development/barcodeReviewInformation.test.js src/development/BarcodeNutritionReview.test.jsx src/development/barcodeNutritionAssessment.test.js src/development/traceNutritionConversion.test.js src/development/updatedNutritionScoring.test.js src/components/BarcodeScannerDialog.test.jsx src/components/BarcodeScannerDialog.ingredients.test.jsx src/components/BarcodeIngredients.test.jsx src/components/NutritionPage.barcode.test.jsx
node scripts/verify-barcode-grading.cjs
```

The offline browser harness uses synthetic data, stub camera, isolated Chrome
profile and memory-only food saves. It checks desktop and 390×844 mobile,
seven theme palettes, collapsed disclosures, scrolling and hit-testing the
logging controls above Return to Food Search, serving changes and absence of
scores from saved entries. Evidence and the pre-edit hash checkpoint are in
`artifacts/barcode-explanations-polish-20261020/`. Physical iPhone review remains
separate. No commit, push or deployment is authorized for this work.
