# Remote barcode lookup foundation

Trace's remote barcode foundation is separate from saved food history. The
Nutrition scanner calls the browser orchestrator only after a user submits a
barcode from the camera or manual input. The orchestrator resolves in this
order:

1. Trace's committed, verified local barcode catalog.
2. A fresh normalized response in the local cache.
3. USDA FoodData Central Branded Foods through Trace's Vercel function.
4. Open Food Facts through the same function when USDA has no usable exact
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
Facts nutrients are never merged. Unknown published values remain `null`, an
explicit zero remains zero, and negative or nonfinite values invalidate a
record. Added Sugar cannot exceed Total Sugar when both are known.

USDA candidates must be Branded Foods with an exact canonical GTIN match. The
newest valid exact revision is selected. FoodData Central nutrient values retain
their per-100g basis. Open Food Facts honors `nutrition_data_per` and uses only
explicit per-serving or per-100g fields. `energy-kcal` is used for calories;
kilojoule energy is not substituted. Open Food Facts sodium is converted to
Trace's milligram field using the published unit.

A record is log-ready only when its exact name, basis, calories, protein,
carbohydrates, and fat are present and valid. Missing optional nutrients or
metadata produce `partial` completeness while preserving an explicit
`unknownFields` list. Missing a required field produces an `incomplete` lookup
result with `insufficient` completeness so future UI must require review.

## Local response cache

`remoteBarcodeFoodResponses` stores only normalized successful or incomplete
responses. Schema version 1 expires records after 30 days and retains at most
500 records using least-recently-used eviction. Keys use the canonical GTIN-14
identity so equivalent UPC and GTIN forms share a record. Corrupt, expired, and
schema-incompatible entries are ignored. When the runtime is offline, an
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
are scaled to a published serving only when a serving gram weight is available;
otherwise Trace labels and uses a 100 g serving. The original provider basis,
nutrients, identifier, and provenance remain in the selected food reference.
Incomplete records display known data and unknown fields but cannot be used.

The Open Food Facts ODbL attribution and share-alike obligations still require
product/legal review before public launch. The visible attribution and source
link are implementation safeguards, not a conclusion that every distribution
or database-use obligation has been resolved.
