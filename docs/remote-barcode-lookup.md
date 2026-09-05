# Remote barcode lookup foundation

Trace's remote barcode foundation is separate from saved food history. The
Nutrition scanner calls the browser orchestrator only after a user submits a
barcode from the camera or manual input. The orchestrator resolves in this
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

USDA FoodData Central data is public domain under CC0. Open Food Facts records
retain provider attribution, their public product URL, and revision metadata.
Open Food Facts database content is offered under ODbL; attribution and
share-alike obligations require a final product/legal review before public
launch. Remote results never overwrite Trace's verified committed catalog.

## Nutrition scanner UI

Barcode scanning is exposed through a small feature-access provider. During
beta it reports an available `Premium Preview`; it does not create or persist
an entitlement, account, subscription, or purchase. A future entitlement
provider can replace this decision without changing the scanner or lookup
contracts.

Opening the scanner does not request camera permission. Camera access starts
only after `Start Camera`, initially preferring the rear camera, and the user
can switch to the front camera or another enumerated video input. Every acquired
media track is stopped when the scanner closes, accepts a barcode, switches
cameras, unmounts, or receives a background/suspending lifecycle event. Trace
does not save, cache, upload, or persist photos or video frames. Manual barcode
entry remains available when camera access is unsupported, insecure, denied,
busy, or unavailable.

The camera decoder is dynamically loaded from `@zxing/browser` 0.2.1 only when
camera use is requested. Native `BarcodeDetector` is not the sole path because
it is not dependably available in iPhone Safari/PWA. Decoder output and manual
input both pass through Trace's shared GTIN normalization and check-digit
validation; UPC-E decoder output is not treated as GTIN-8.

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
