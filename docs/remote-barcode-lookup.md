# Remote barcode lookup foundation

Trace's remote barcode foundation is separate from saved food history. The
Nutrition scanner calls the browser orchestrator only after a user submits a
barcode from the camera, a locally decoded photo, or manual input. The orchestrator resolves in this
order:

1. Trace's committed, verified local barcode catalog.
2. A user-created food with the same barcode.
3. A fresh normalized response in the local cache.
4. USDA FoodData Central Branded Foods through Trace's Vercel function.
5. Open Food Facts through the same function when USDA has no usable exact
   match.

No request occurs during module import, application startup, text search, or
ordinary Nutrition use. The browser sends only a validated GTIN-family string
to `POST /api/nutrition/barcode`. It cannot choose a provider or upstream URL.

## Vercel environment

Configure these values in the Vercel project settings for the environments
that may use remote lookup:

- `USDA_FDC_API_KEY`: a server-only data.gov key used by FoodData Central.
- `OPEN_FOOD_FACTS_USER_AGENT`: an application-specific User-Agent that meets
  Open Food Facts identification requirements.

Do not prefix either name with `REACT_APP_`. Values with that prefix can be
embedded in the browser build. No environment values belong in source control.

The endpoint is the default file-based Vercel Node function at
`api/nutrition/barcode.mjs`; no `vercel.json` routing rule is required. It
accepts JSON containing only `barcode`, applies request and upstream response
size limits, times out provider requests, never automatically retries, and
returns normalized data rather than raw provider payloads.

## Normalization and completeness

Remote records remain attributable to exactly one provider. USDA and Open Food
Facts nutrients are never merged. Unknown, malformed, negative, or nonfinite
published values remain `null`, and an explicit zero remains zero. Inconsistent
Added Sugar is left unknown rather than replacing or inventing label data.

USDA candidates must be Branded Foods with an exact canonical GTIN match. The
newest valid exact revision is selected. USDA `labelNutrients` paired with its
declared serving wins over `foodNutrients`; otherwise per-100g `foodNutrients`
can be converted only to a declared compatible mass serving. Open Food Facts
uses credible `_serving` values first, then `_value` when
`nutrition_data_per` declares a serving, then compatible `_100g` or `_100ml`
conversion. Mass-to-volume and volume-to-mass conversion are rejected. An
explicit whole-package basis is accepted only when the provider also declares
one serving per container. `energy-kcal` is preferred for calories; published
kilojoules are converted to kcal. Sodium is converted to milligrams from its
published unit.

A record is log-ready only when its exact name, a trustworthy labeled-serving
or one-serving package basis, calories, protein, carbohydrates, and fat are
present and valid. Reference-only per-100g/per-100mL data remains attributable
provider provenance but produces an `incomplete` result for user completion.

## Optional additive identification

The existing Open Food Facts product request includes `additives_tags`, a
structured string array in its [product ingredients schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_ingredients/).
Trace retains these as **provider-reported** identifiers, not independent
verification of the product label. The [OFF additive taxonomy](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/taxonomies/additives.txt)
contains names separately; this phase does not download it or infer names from
ingredient text. The [USDA branded response schema](https://fdc.nal.usda.gov/api-spec/fdc_api.html)
documents ingredient text but no equivalent structured additive identifiers in
the response used by Trace. USDA additive information therefore stays unknown.

```js
additives: {
  status: "reported",
  source: "open-food-facts",
  sourceField: "additives_tags",
  items: [{
    standardizedIdentifier: "E330",
    name: "Citric acid",
    nameReference: {
      verification: "exact-source-name",
      referenceVersion: "eu-231-2012-names-v1",
      sourceId: "CELEX:32012R0231",
      sourcePublicationDate: "2012-03-22",
      sourceIdentifier: "E 330",
      jurisdiction: "EU",
      language: "en",
    },
    providerIdentifier: "en:e330",
    source: "open-food-facts",
    identification: "provider-reported",
  }],
}
```

- An absent `additives` property is legacy/uncollected data and remains absent.
- `status: "unknown", items: null` means unavailable or unusable data. This
  includes missing/null tags, unsupported provider data, malformed lists, more
  than 100 tags, or tags longer than 128 UTF-16 code units. A malformed list is
  discarded as a whole rather than silently becoming an empty or partial list.
- `status: "reported", items: []` preserves an explicitly empty OFF list.
  It means the provider returned no identifiers, **not** that the food contains
  no additives. There is no additive-free flag or score.
- Nonempty lists retain original provider strings. Only OFF `en:e...` identifier
  shapes are formatted to E numbers, preserving letter/roman suffixes (for
  example `en:e150d` and `en:e500ii`). This is formatting, not a registry lookup
  or confirmation of authorization, safety, quantity, or actual presence.
  Unrecognized strings remain in `items` with a null standardized identifier
  and null name. Exact duplicate strings are removed; no parent/child expansion
  or free-text matching occurs. Only the eight exact identifiers in the local
  name reference below receive names. Identifiers outside that subset retain
  `name: null, nameReference: null`, even when their E-number shape is valid.
  Cached names and verification claims are not trusted; supported provider
  identifiers and local name associations are resolved again on normalization.

The containing product/snapshot retains provider attribution, record ID, source
URL, revision, and retrieval time. Additives pass through the existing browser
normalizer, v2 cache, review candidate, remote selection, custom recovery source
snapshot, and saved Nutrition food reference. They do not participate in
nutrition completeness, log readiness, serving conversion, or nutrient math.
There is no cache version bump, history migration, visible additive section,
scanner change, extra request, or change to lookup priority. A usable USDA or
local match still wins; Trace does not call OFF solely to enrich additives.
Older cache entries with no additive data remain without it until normal expiry
and refresh. Existing v2 cache items that already contain structured identifiers
can resolve names locally, including offline; normal cache access may persist
that derived metadata. Reading saved custom products can enrich their source
snapshots in memory without rewriting storage. Saved Nutrition history is not
retroactively enriched or migrated. New selections save name-reference metadata
through the existing food-reference path, leaving nutrient values unchanged.

Coverage depends on the provider's record and analysis; structured data can be
incomplete or incorrect. The name reference verifies an identifier/name pairing,
not product contents, permitted uses, current regulatory approval, or safety.
The UI should distinguish unknown data from a provider-reported empty list,
and keep product-provider attribution separate from name-reference attribution.
Do not label the latter empty state "additive-free".

### Local additive name reference (reviewed 19 October 2026)

`src/data/additiveNameReference.json` is a deliberately small, versioned local
excerpt of the Annex to [Commission Regulation (EU) No 231/2012](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32012R0231).
It pins the original Official Journal publication of 22 March 2012, not the
latest consolidated regulation. The eight entries are E150d, E202, E211, E300,
E322, E330, E415, and E500ii. Each retains its exact source heading and source
identifier; display casing and key formatting changes are recorded. E300 uses
the first of the two names in its heading. No translations or synonyms are
generated. The historical edition is sufficient for this narrow name reference;
it must never serve as a current authorization list.

`resolveAdditiveName` accepts only an exact standardized key and returns a name
plus a frozen `nameReference`. It does not expand parent groups or infer sibling
subtypes (E500 does not match E500ii), parse ingredients, or convert CAS/INS codes.
`identification: "provider-reported"` remains unchanged on the product item.
`nameReference.verification: "exact-source-name"` refers only to the name.
`getAdditiveNameSource` resolves the version/source pair to the bundled source
record containing attribution, publication/version, URL, review date, reuse
terms, and changes. Unknown versions return null rather than using another
edition's citation. Keep prior editions available if a future reference version
is introduced and saved references still point to them.

Source editions now resolve through the [versioned regulatory-source registry](regulatory-source-registry.md).
Its exact version/source binding preserves the original 2012 citation and all
existing serialized name-reference fields. A separate 2026 audit-evidence record
is marked partial, with no completed verification or current-coverage date; it
does not replace the eight mappings' historical source. Registry validation
rejects missing, malformed, ambiguous or conflicting provenance without adding
network requests, storage migrations, legal claims or UI changes.

#### Sources and reuse research

| Source | Identifiers/names and available formats | Decision |
| --- | --- | --- |
| European Commission / EUR-Lex | E numbers and exact names in the dated Annex; downloadable HTML and Official Journal PDF. The [Commission database](https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/database_en) also provides E-number/condition searches. | Use eight manually checked headings from the pinned HTML edition. No bulk import or runtime request. |
| [FDA Substances Added to Food](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances) | Substance names with CAS registry numbers or FDA-assigned IDs, CFR references, searchable HTML and an Excel download. | Not an E-number crosswalk. No FDA mappings imported. FDA [explains that inclusion is not itself approval](https://www.fda.gov/food/food-additives-petitions/substances-added-food-formerly-eafus). |
| [EFSA OpenFoodTox](https://www.efsa.europa.eu/en/data-report/chemical-hazards-database-openfoodtox) and [food-additive resources](https://www.efsa.europa.eu/en/topics/topic/food-additives) | Chemical identifiers/characterisation and scientific assessments; OpenFoodTox 3.0 offers Excel and IUCLID archives. | No toxicology or assessments imported. EFSA directs users to the Commission for the EU additive list; unnecessary breadth for this name-only subset. |
| [Codex GSFA](https://www.fao.org/gsfaonline/index.html) | International INS numbers, names/synonyms, and searchable provisions; the [new portal](https://codex.fao.org/codex-texts/codex-online-databases/gsfa/food-additives-list/food-additive-details?additiveId=057ae6b8-249a-f111-b8dc-70a8a5613865) advertises table CSV exports. | Not a US/EU authorization list. No INS-to-E conversion or data import. |

The [EUR-Lex copyright notice](https://eur-lex.europa.eu/content/legal-notice/legal-notice.html)
permits commercial/non-commercial reuse of legal documents unless otherwise
specified, under [Decision 2011/833/EU](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011D0833).
No special restriction was identified for these Annex headings. Trace records
source attribution and transformations, preserves their meaning, and identifies
the excerpt's limited scope and Commission non-liability. This supports local
storage and distribution of the small excerpt. We do **not** relabel the original
legal text CC0: EUR-Lex distinguishes legal-document reuse from CC BY 4.0 for
consolidated/editorial texts and CC0 for metadata. No logos are copied.

[FDA website terms](https://www.fda.gov/about-fda/about-website/website-policies)
describe site content as public domain unless otherwise noted and recommend a
source link and copying date. Third-party material still needs separate review.
EFSA's OpenFoodTox notice requires original-output attribution for legal/regulatory
reuse and disclaims suitability conclusions; its downloadable archive's precise
licence was not verified here, so none is copied. Codex/FAO dataset-specific reuse
terms also need checking before any future import; no blanket licence is assumed.
These unused sources do not affect the verified reuse basis of the selected EU
legal-document excerpt.

Names and identifier groupings can differ by jurisdiction. Preserve the EU
wording (including plural/group names) rather than substituting US/common names.
An E-number match establishes no US approval and says nothing about use limits.
No ongoing API calls, scheduled downloads, new dependencies, scores, or visible
Additives section are introduced. Future additions require an exact source
identifier/name check, reuse review, source version and review date, and tests.
Before building the compact UI, review the eight mappings and design separate
provider and reference attribution, a neutral unknown-name fallback, and clear
unknown-versus-empty states.

## Optional ingredient information

Remote products may include an optional `ingredients` object:

```js
ingredients: {
  text: "Milk, cocoa (2%);\n salt.",
  language: "en",
}
```

`text` preserves the provider's original string, including case, punctuation,
spacing, and line breaks. `language` is the declared language code when known;
it is never inferred from the product name, country, or application language.
The containing product's existing `provider` and `provenance` retain the source
identity, record ID, attribution, source URL, revision, and retrieval time. Keep
that provenance with ingredient data; ingredients are not merged across providers.

USDA's existing branded search result can supply `ingredients`; Trace retains
that field when returned and leaves its language unknown. No detail request is
added. The existing Open Food Facts request now includes `ingredients_text` and
`lang`. Its schema identifies `ingredients_text` as the raw list in the product's
main language (`lang`); `ingredients_lc` instead describes the language used for
provider-side parsing and is not substituted. See the [USDA branded data
documentation](https://fdc.nal.usda.gov/GBFPD_Documentation/) and [Open Food Facts
ingredient schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_ingredients/).

An absent `ingredients` field means it was not collected, as in older cached
products. A returned object with `text: null, language: null` means the ingredient
list is unknown or unusable. Blank, non-string, or oversized text stays unknown,
never an empty ingredient list. The shared contract permits up to 8,192 UTF-16
code units, preserving accepted text in full rather than truncating it. Language
codes are bounded and checked for a language-tag shape; invalid or absent
language does not discard valid text. No language is assigned to an unknown list.

Ingredient availability does not change nutrition `completeness`, `unknownFields`,
`logReady`, provider fallback order, serving selection, or calculation precision.
There are no added provider calls or dependencies. Allergen warnings, precautionary
traces, HTML-emphasized ingredient fields, additive tags, and ratings are not used
as substitutes for raw ingredient text. This slice performs no ingredient analysis.
If a ready USDA result lacks ingredients, it stays usable with unknown ingredient
text; Trace does not fetch Open Food Facts just to fill that gap.

The existing cache remains version 2: old entries without the optional field
remain valid, and enriched entries round-trip through the same normalizer and
JSON storage. Cached old products may remain ingredient-unknown until normal
expiry or eviction allows a fresh lookup; this does not force a refresh or migrate
saved records. Capacity, expiry, stale handling, and lookup precedence are unchanged.

Candidate review data, the selected product, and its immutable provider snapshot
retain the optional object. New remote food-log entries copy it to
`foodReference.ingredients` beside the existing provider metadata. Completed custom
barcode foods retain it through `providerSourceSnapshot`, including storage and
reopening. Old entries keep their original shape. No ingredient controls or text
are rendered by this foundation change; scanner acquisition and Nutrition layout
are unchanged.

## Local response cache

`remoteBarcodeFoodResponses` stores only normalized successful or incomplete
responses. Schema version 2 expires records after 30 days and retains at most
500 records using least-recently-used eviction. Keys use the canonical GTIN-14
identity so equivalent UPC and GTIN forms share a record. Corrupt, expired, and
schema-incompatible entries are ignored. Version 1 is deliberately invalidated
because it predates explicit serving-basis provenance. When the runtime is offline, an
otherwise valid expired entry may be returned only with `stale: true`.

The storage manifest classifies this domain as `derived-excluded`. It is a
rebuildable response cache, not Nutrition history or a user-confirmed food
catalog, and Trace backups do not include it. It contains no raw provider
payload, credentials, failed responses, or user history.

## Source and licensing

Normalized products can also retain optional version-1 `assessmentInputs`, separate
from logging nutrients and serving calculations. This preserves provider-reported
saturated fat, separate sugar types, label/reference observations, units, market,
category and source evidence through existing cache and saved snapshots. Legacy
absence stays absent; no migration or additional request is introduced. Complete
nutrient capture never declares a score ready. See
[nutritional assessment input contract](nutrition-assessment-inputs.md) for basis
ambiguities, bounds, quality states and remaining US identity limitations.

USDA FoodData Central data is public domain under CC0. Open Food Facts records
retain provider attribution, their public product URL, and revision metadata.
Open Food Facts database content is offered under ODbL; attribution and
share-alike obligations require a final product/legal review before public
launch. Remote results never overwrite Trace's verified committed catalog.

## Nutrition scanner UI

Barcode scanning is free for everyone and is exposed through a small
feature-access provider. During beta it reports an available `Barcode Scanner
Beta`; it does not create or persist an entitlement, account, subscription,
or purchase. Barcode scanning remains in the free tier for Trace 1.0.

Choosing `Scan Barcode` opens the scanner and starts camera access automatically,
initially preferring the rear camera (with an availability fallback to front). The user
can switch to the front camera or another enumerated video input. Every acquired
media track is stopped when the scanner closes, accepts a barcode, switches
cameras, unmounts, or receives a background/suspending lifecycle event. Trace
does not save, cache, upload, or persist photos or video frames. Manual barcode
entry remains available when camera access is unsupported, insecure, denied,
busy, or unavailable.

The decoder is dynamically loaded from `@zxing/browser` 0.2.1 and its existing
core, `@zxing/library` 0.23.0, when camera or photo decoding is requested.
Native `BarcodeDetector` is not the sole path because
it is not dependably available in iPhone Safari/PWA. Decoder output and manual
input both pass through Trace's shared GTIN normalization and check-digit
validation; UPC-E decoder output is not treated as GTIN-8.

`Scan from Photo` opens the image picker; `Take Photo` uses a separate input
with a rear-camera capture hint. The browser/OS controls the available picker
and capture choices. Both stop live scanning and decode with the same local
ZXing reader before entering the existing `submitBarcode` lookup/review flow.
Selected files are never passed to the lookup service or saved to storage.
Local object URLs are revoked, temporary canvases are cleared, and closing,
canceling, or backgrounding discards pending decoding. File inputs reset after
selection so the same photo can be tried again.

Expected ZXing decode misses use the stable `getKind()` identifier instead of
constructor names, which are minified in production builds. Ordinary misses
therefore do not produce false camera errors or terminate photo retries.
The reader receives supported formats at construction and uses `TRY_HARDER`
for denser scan rows. Camera requests retain 1920×1080 ideal resolution even
with explicit device selection; continuous focus is requested only when the
track advertises support. Live frames cycle through bounded rotation/contrast
passes without replacing the existing stream scanner or its cleanup controls.
The preview contains the full camera frame instead of cropping it.

Photo passes preserve browser-decoded EXIF orientation, composite on white,
try three bounded scales and six angles, and retry with grayscale contrast.
ZXing also reads scan rows in reverse, covering upside-down barcodes. Its
0.2.1 canvas luminance adapter rotates the pixel buffer without updating its
dimensions; Trace disables that implicit rotation and rotates real canvases
instead. No image exceeds 2600 pixels on its long side during decoding;
inputs over 25 MB or 64 megapixels are rejected. Browser-unsupported formats
(including HEIC on some devices), corrupt images, invalid GTINs, and images
without a detected barcode produce distinct feedback. Missing barcode detail
from severe blur or glare cannot be reconstructed.

For repeatable browser checks, build the app, install Playwright under
`.tmp-browser`, then run `node scripts/verify-barcode-scanning.cjs`. The script
tests Chromium and WebKit at 390×844 and 1440×1000 using generated local
fixtures and a simulated camera stream. It verifies EXIF/rotation, mild blur,
glare, small/low-contrast barcodes, photo failures and retry, camera switching,
permission fallback, barcode-only requests, and the production Nutrition flow.
Windows Playwright WebKit does not expose `canvas.captureStream`, so simulated
live-camera checks run in Chromium; WebKit checks camera-unavailable handling
and the complete photo fallback instead. Screenshots/results go to
`artifacts/barcode-photo-20260908/`. These checks do
not substitute for physical iPhone/Android camera and native-picker testing.

A successful lookup opens a review view and never saves automatically. The
view presents the provider attribution and validated source URL. `Use This
Food` populates the existing editable Nutrition form. Provider per-100g values
are scaled only to a provider-declared compatible mass serving, and per-100mL
values only to a compatible volume serving. Trace never turns a reference-only
100 g basis into a ready-to-use serving. The original provider basis, unrounded
source nutrients, conversion factor, identifier, and provenance remain in the
selected food reference. Incomplete records preserve identity and source data,
leave unproven label nutrients blank, and offer `Complete This Food`.

The Open Food Facts ODbL attribution and share-alike obligations still require
product/legal review before public launch. The visible attribution and source
link are implementation safeguards, not a conclusion that every distribution
or database-use obligation has been resolved.


## Verified manufacturer nutrient corrections

The browser selection adapter can apply a reviewed, exact-product fact overlay
after provider normalization. `src/services/verifiedProductNutritionCorrections.js`
contains no network or grading code; `src/data/teddyGrahamsHoneyLabel.json` retains
the initial manufacturer panel, source edition, verification timestamp and hashes.
The UPC, provider identity, US-only market claims, package, serving, full ingredient
sequence and remaining nutrient panel must match. Unknown/conflicting/changed
evidence or stale records do not inherit a correction. This is independent of
the development-only grading gate.

For matching Teddy Grahams Honey 10-oz records, added sugars change from the OFF
2.1 g to the manufacturer-declared 7 g per 30 g. Review and selection share the
corrected nutrients; new entries use the same precise serving basis. The original
OFF response/cache and `selection.remote` snapshot remain unchanged. A separate
`nutritionCorrection` on the selection, review and new saved food reference records
which field changed and which manufacturer source supplied it. The complete panel
and original provider values remain accessible without relabeling OFF as the
manufacturer. Existing saved entries never re-run this overlay.

Retrospective research scripts may explicitly use
`createBarcodeNutritionCandidate(result, { applyVerifiedCorrections: false })` to
reproduce historical source-only results. Normal application lookup uses the
corrected default. No storage migration, automatic provider update or public
grading activation is introduced.

### Batch unit audit, 2026-10-21

The [twenty-product comparison](grocery-nutrition-data-audit-2026-10-21.json)
preserves the original panels and records manufacturer comparisons, package and
edition conflicts, and before/after nutrition and overall scores. There are 17
manufacturer-panel comparisons, one secondary-only comparison and two incomplete
exact-package comparisons; these are not 17 independently verified formulation
matches. No additional product-specific overlay was justified by a complete
matching source edition. The original 19/20 nutrition coverage and all displayed
nutrition/overall integers remain unchanged; that does not certify their inputs.

The audit reproduced two shared gateway defects using explicitly synthetic
API-contract fixtures. OFF's normalized `_100g` and `_serving` weight
fields are already in grams; the contributor's `_unit` applies to `_value`.
Likewise normalized `energy` is kJ even when the entered `_value` is kcal. The
gateway now follows those schema units, agreeing with the existing assessment
capture. See the [official OFF nutrient schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/).
This changes new lookup/review/selection facts, not scoring equations. Entered
units and original raw observations remain in `assessmentInputs`; existing
caches and historical food entries are not migrated or rewritten.

The implementation review separates validation paths: twenty tests start with
already-normalized archived lookups and bypass the changed gateway. Twelve
additional tests reprocess captured raw OFF nutrients, joining category/market
metadata from the same archived lookup, through the gateway and nutrition
assessment. They verify unchanged logging values and nutrition scores. Complete
raw responses are not available here for the other eight profiles. All seventeen
OFF lookups have gram-based entered weight units and explicit kcal fields; two
USDA records and one catalog record bypass OFF normalization. This explains the
unchanged twenty-profile scores without claiming twenty raw-response replays.

The review also corrects entered `energy-kcal_value` handling: its explicit unit
must be honored, including kJ conversion; unsupported units stay unknown.
Normalized `energy-kcal_100g`/`_serving` remain kcal regardless of the entered
display unit. `_value` fields are not assigned normalized-field semantics.
Trace's older `_100ml` extension is not a canonical OFF field (`_100g` can itself
describe 100 mL). Its prior explicit-unit gateway handling is preserved, with
matching assessment capture; generic legacy energy without a unit stays unknown.

A constructed-fixture test runs the actual gateway lookup with a mocked provider
response, product review, Use This Food, Nutrition serving edits, new-entry save,
read and reopen/edit. It preserves original normalized observations and entered
units in saved provenance, preserves an existing historical record, and persists
no scores. Only test memory storage is used; no interactive browser is launched.

The complete patch now requires six files: the original five plus the existing
`api/nutrition/_assessmentInputs.cjs` capture module. No new runtime dependency,
product override, scoring rule or migration was added. Quest/SPAM retain their
captured values and scores. Multi-market/formulation uncertainty is visible in
the opening experimental review; consistency warnings remain in collapsed details.
The manufacturer sodium discrepancies in this audit are not automatically
attached as product-specific runtime warnings.

These unit defects do not explain the original sample's suspicious sodium:
Quest's raw provider value is already 0.00022 g per bar (0.22 mg), and SPAM's is
0.00136 g per serving (1.36 mg). Current manufacturer panels disagree, but
ingredients/editions and, for SPAM, multiple nutrients and serving quantities
also differ. A blanket multiplication or partial replacement is not justified.
Other unresolved cases include Rice Krispies' gram/mL serving conflict,
Pepperidge's competing energy/sugar panels, bounded fiber/sugar declarations,
and regional or package mismatches. Manufacturer observations are comparison
evidence, not automatically promoted Trace product facts. The existing exact
Teddy correction remains unchanged at 7 g added sugar/30 g and provisional 20.
