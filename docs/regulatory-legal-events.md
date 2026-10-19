# Regulatory legal-event foundation

Checkpoint: 2026-10-19. One US BVO action, three US Red No. 3 food timeline
events and one historical EU E171 withdrawal are implemented as dated records.
This is not a product-compliance decision, scientific
assessment, safety classification, or complete statement of current law.
The [evidence archive](regulatory-evidence/2026-10-19/README.md) remains unchanged.

## Architecture and schema

- `src/data/regulatoryLegalEvents.json`: versioned local manifest with
  `schemaVersion`, `referenceVersion`, `snapshotDate`, and `events`.
- `src/services/regulatoryLegalEventValidation.js`: pure validators
  `validateLegalEvent(event, sources, { asOf })` and
  `validateLegalEventRegistry(manifest, sourceManifest)`, returning
  `{ valid, errors }`. No missing value is repaired or substituted.
- `src/services/regulatoryLegalEvents.js`: validates the bundle, copies and
  recursively freezes it, and exposes exact lookups. The factory
  `createLegalEventRegistry(manifest, sourceManifest)` throws with diagnostics
  for invalid input. Unknown IDs return null; unknown substance/jurisdiction
  combinations return an empty array.
- `src/data/bvoRevocationSource.json`: the archived final-rule edition, appended
  to the source registry as v2. Historical EU source editions and name bindings
  are unchanged. Only the evidence locator was expanded; the archive's citation,
  edition, verification dates, scope and limitations were retained.
- `src/data/red3RegulatorySources.json`: two exact US order editions and one
  supporting FDA page snapshot, independently rechecked for the
  [Red No. 3 implementation](regulatory-red3-timeline-2026-10-19.md). The three
  earlier registry editions and all name bindings remain unchanged in bundle v3.
- `src/data/e171RegulatorySources.json`: the historical EU withdrawal act,
  Commission Q&A snapshot and dated EFSA opinion, appended in source bundle v4.
  The opinion remains separate from legal-event source references. Direct
  evidence and current-consolidation limits are recorded in
  [the E171 checkpoint](regulatory-e171-timeline-2026-10-19.md).

Each event has these fields:

| Field | Meaning |
| --- | --- |
| `eventId` | Stable local event identifier |
| `substance.id`, `substance.name` | Local substance key and human-readable identity, independent of an E-number |
| Optional `substance.identifiers`, `synonyms`, `sourceReferenceId` | Cited local identity metadata; currently supports EU E-number syntax, with explicit synonym state; no provider-presence or current-authorization inference |
| `jurisdiction`, `authority` | Known jurisdiction and primary source's issuing authority |
| `action.type`, `stage`, `target` | Final authorization/amendment/revocation, administrative stay, or stay lifting, and affected legal provision |
| `affectedUses` | Explicit food uses or categories within the action's scope |
| `useScope` | Optional for legacy records; explicit food domain and exact affected provision for new procedural and prior-certified-use records |
| `dates.publishedOn` | Publication date of the primary legal act |
| `dates.effectiveOn` | Date the action takes legal effect |
| `dates.complianceOn`, `complianceNote` | Separate deadline, or explicit null with explanation; derived dates must state their basis |
| `dates.sourceReferenceId` | Primary legal source supporting the dates |
| `dates.effectiveNote` | Required explanation for procedural dates, including retrospective notice of an automatic stay |
| `dates.complianceSourceReferenceId` | Explicit source for a typed food-scope deadline; may cite a verified supporting FDA announcement |
| `qualifications` | Identified, cited scope, statutory qualifications and transitions |
| `sourceReferences` | Unique reference IDs, primary/supporting role, exact source/edition keys and provision locators |
| `evidence` | Verified scope, last-reviewed date, and explicit limitations |
| `marketTransition` | Optional verified EU withdrawal transition: prior-rules cutoff, market-placement end and product-specific stock-end basis; distinct from general compliance |
| `relationships` | Cited `amends` / `supersedes`, `stays`, `lifts-stay`, or `confirms` links; explicit empty list when none recorded |

Scientific assessment dates are deliberately unsupported in this legal schema.
They must not replace publication, effective or compliance dates. There is no
clock-based active/banned/permitted flag or automatic product matching.

```javascript
const { getLegalEvent, getLegalEventsForSubstance } = require("../src/services/regulatoryLegalEvents");
getLegalEvent("us-fda-bvo-2024-revocation");
getLegalEventsForSubstance("brominated-vegetable-oil", "US-federal");
```

The service has no runtime network requests, storage writes or migrations and is
not connected to barcode lookup, product selection, cached/saved food snapshots,
Nutrition calculations or UI. It uses the source registry's existing exact
source-edition semantics. Additive names and provider-reported presence retain
their previous meanings; verified legal evidence does not verify product contents.

## Initial BVO event and official evidence

Event `us-fda-bvo-2024-revocation` concerns FDA removal of **21 CFR 180.30**, the
former authorization of BVO as a stabilizer for flavoring oils in fruit-flavored
beverages. Source: [FDA final rule, 89 FR 55040, document 2024-14300](https://www.govinfo.gov/content/pkg/FR-2024-07-03/pdf/2024-14300.pdf),
edition `FR:2024-14300` / `published-2024-07-03`.

| Date | Value | Basis |
| --- | --- | --- |
| Publication | 2024-07-03 | Final-rule publication |
| Effective | 2024-08-02 | DATES and section VI |
| Compliance | 2025-08-02 | Section VII: one year after the effective date; calendar date derived from that interval |
| Reviewed | 2026-10-19 | Archived direct official-text verification, not a new legal effective date |

The source references identify Summary/DATES, section V responses 1 and 3,
sections VI-VII, and amendatory instruction 2. Qualifications preserve:

- The affected beverage use and covered brominated vegetable-oil variants.
  The former 15 ppm limit is historical context, not current permission.
- Response 1's condition concerning an authorizing food additive regulation or
  an applicable statutory exception under FD&C Act 201(s)(1)-(6). No specific
  exception is asserted to apply to a product or particular trace occurrence.
- Time to reformulate, relabel and deplete inventory during the compliance
  period. No further sell-through entitlement is inferred.

The evidence supports the recorded **final action**. The source remains
`verified` / `historical` with null `verifiedThrough`; neither source nor event
asserts exhaustive subsequent-law review. There is no EU BVO event, guessed CAS
identifier or E-number. No scientific conclusion is encoded by the revocation.

## Red No. 3 food timeline

Bundle `legal-events-2026-10-19-v2` appends three records without rewriting BVO:

| Event | Primary-source publication | Action effective | Compliance |
| --- | --- | --- | --- |
| `us-fda-red3-food-2025-revocation` | 2025-01-16 | 2027-01-15 | 2027-01-15 |
| `us-fda-red3-food-2025-administrative-stay` | 2026-08-05 (later notice) | 2025-02-18 (automatic stay) | Explicit null: procedural event |
| `us-fda-red3-food-2026-stay-lifted` | 2026-08-05 | 2026-08-05 (stay lifting only) | Explicit null: original deadline confirmed |

Publication always identifies the cited primary source, not an invented February
notice. The later notice expressly reports the earlier automatic stay. The lift
links to that stay and confirms the original food action; it neither supersedes
the original record nor brings removal forward. The records concern 21 CFR
74.303, including dietary supplements. The separate drug provision and its
2028 date are not food deadlines or imported legal records.

The food revocation's `prior-certified-use` qualification carries the verified
condition `color-used-while-certificate-effective`, a primary legal citation and
`verificationStatus: "verified"`. This verifies the conditional legal finding,
not product eligibility. Its text limits the consequence to adulteration by
reason of that color use. Manufacture date alone cannot establish certificate
validity or other compliance. No unconditional sale permission, universal retail
cutoff, animal-feed exemption or EU E127 status is inferred. Sources, exact
provisions and direct re-verification are recorded in the linked evidence note.

## EU E171 historical food withdrawal

Bundle `legal-events-2026-10-19-v3` appends
`eu-ec-e171-food-2022-withdrawal`; the four US events are unchanged.
The original 2022/63 source edition supports:

| Meaning | Recorded value |
| --- | --- |
| Official Journal publication | 2022-01-18 |
| Entry into force (`effectiveOn`) | 2022-02-07; Article 4's twentieth-day rule |
| Rules applicable before (`marketTransition.productionRulesBefore`) | 2022-02-07; a rules cutoff, not a manufacture-before requirement |
| Conditional market placement through (`placementUntil`) | 2022-08-07 |
| Qualifying stock end (`stockEndBasis`) | The applicable product minimum-durability or use-by date |
| General compliance date | Explicit null, with explanation |

The transition applies to foods produced under the prior rules and placed on
the market by the transition end. It cannot be converted into a universal retail
deadline or unconditional stock permission. A cited Commission Q&A qualification
also preserves the finished-food/no-further-transformation clarification for B2B
supply. No code evaluates a product's eligibility or commercial dates.

The event includes the E171 identifier and the cited TiO2 alias. This does not
add E171 to the separate eight-name reference, interpret ingredient text, or
change provider-reported additive metadata. Food scope preserves Annex II's
Part D/E exclusion, Group II/category removals and Annex III's carrier change.
The medicinal context is not a food exception or a present medicinal verdict.

EFSA's adoption (2021-03-25) and publication (2021-05-06) are documented as
scientific context, not legal effective dates. Its registered scientific edition
is not cited as legal authority. No scientific result becomes a safety rating.
Full current consolidated EU law and subsequent-change coverage remain
unverified; this record is explicitly the verified historical action.

## Validation and limits

The manifest validates the source registry first, then every event and its
relationships. Invalid data is rejected before being exposed by the factory.
Validation requires:

- Stable identifiers, explicit food uses, known jurisdictions, authority,
  supported final action, and no unexpected fields (including safety verdicts).
- Real ISO calendar dates. Ordinary actions remain prospective:
  publication must not follow effect, and compliance must not precede effect.
  Compliance may be explicit null with a note; omission is rejected. Future
  effective/compliance dates are permitted and do not alter verification status.
  Only `administrative-stay` permits effect before the cited notice's publication,
  with a required explanation and a valid `stays` target. Procedural events must
  carry explicit null compliance; they cannot invent or copy a deadline.
- Review on/after publication and source verification, and on/before the pinned
  snapshot date. Runtime validation does not depend on a device's current date.
- Exactly one primary legal source, exact edition, nonempty provision locators,
  matching jurisdiction/authority/publication date, and directly verified
  official-text evidence. Proposals and scientific assessments cannot be legal
  sources; a regulatory announcement can only be supporting evidence. Partial,
  unavailable and unverified evidence cannot enter this verified-only bundle.
- Nonempty cited qualifications, including explicit scope. A compliance date
  requires a transition qualification. Missing/blank text, unsupported kinds,
  duplicate IDs and unresolved citation references are rejected.
  `prior-certified-use` additionally requires explicit food revocation scope,
  verified qualification evidence, the supported certificate condition and the
  primary legal citation. Conditional-use fields on other kinds are rejected.
- Optional identity metadata must include supported identifiers, unique explicit
  synonyms (empty is allowed when none were verified), and a valid source
  reference. Legacy substance objects remain valid without these fields.
- `marketTransition` requires EU food revocation scope, a primary legal citation,
  verified conditions and a cited transition qualification. Its prior-rules date
  must equal entry into force, placement cannot end earlier, and its only
  supported stock-end basis is the product minimum-durability/use-by date.
  General compliance must remain null. Fixed stock dates, manufacture-before
  fields and unconditional permission flags are rejected as unsupported fields.
- Unique event IDs and unique action/source-edition identities. Differing
  versions under one ID or duplicate actions under different IDs are rejected.
- Cited, distinct amendment/supersession targets within the same substance and
  jurisdiction. Targets must exist and cannot have later publication dates;
  self-links, cycles and conflicting duplicate targets are rejected. Original
  events remain available instead of being overwritten or silently hidden.
- Procedural actions require typed food scope and primary legal citations.
  A stay must reference a revocation, and a lifting must reference a stay plus
  confirm the action that was stayed. Authority, provision, jurisdiction,
  substance and affected uses must agree. A stay cannot begin before the original
  act's publication; lifting cannot precede the stay. Conflicting lifting records
  are rejected. The first procedural model handles the whole recorded use scope;
  partial stays or changed deadlines need a deliberate future extension.

Structural validation cannot establish that a paragraph supports its summary or
that all material exceptions were included. Legal accuracy, completeness,
substance identity and subsequent-change review remain human evidence-review
responsibilities. The shipped BVO scope/qualifications and dates are explicitly
tested. No automatic interpretation of provision text is attempted.

The manifest retains schemaVersion 1 so legacy BVO-only inputs remain accepted;
the bundle reference version records this additive extension. It intentionally
does not model proposals, separate application dates, general retroactive
effects, partial stays, changed compliance deadlines, arbitrary stock transitions, multiple drug/food dates
inside one event, or scientific assessments. Add a deliberate schema extension with source evidence
and tests before representing these actions. An amendment link alone does not
compute present legal status or determine an individual product's applicability.

## Validation and resumability

Original BVO implementation coverage: **427 tests across 20 suites passed**. The first run
passed 426 tests and exposed one source-registry test fixture that assumed the
registry always had two entries. The fixture now retains its appended synthetic
record instead of addressing index 2. The two affected suites were rerun and all
136 tests passed; the other 18 suites had already passed. This was a test-fixture
correction, not a production-validator change.

Coverage includes 72 new legal-event cases plus existing source/name provenance,
additive states, gateway/cache compatibility, product selection, saved food
records, serving safeguards, Nutrition, scanner/camera/decoder/photo and
Ingredients behavior. Browser/PWA behavior was checked by existing automated
tests; no physical-device verification or production build was performed.

Changed-file ESLint passed with zero warnings. JavaScript syntax, both new JSON
files, source metadata equality against the archive (expanded evidence locator
excepted), Git whitespace and all nine task files' whitespace/newlines passed.
Git emitted only its usual LF-to-CRLF conversion notices. PowerShell formats
Jest's stderr PASS output as NativeCommandError in redirected logs; test-run exit
codes and Jest summaries establish the actual outcome.

Logs are in the existing ignored
`artifacts/barcode-ingredients-disclosure-20261019/` directory:
`legal-events-tests.log` (initial run), `legal-events-recheck.log` and
`legal-events-lint.log`. All 48 original unrelated Git entries and their file
hashes, including the audit/history/evidence files, matched the initial baseline.
No dependencies were installed, and no files were staged, committed or pushed.
Those results and logs describe the original BVO implementation checkpoint.
Red No. 3 validation is recorded separately in
[its evidence note](regulatory-red3-timeline-2026-10-19.md).
E171 validation is recorded in [its checkpoint](regulatory-e171-timeline-2026-10-19.md).

Copyable focused commands from the project root:

```powershell
$env:CI='true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/services/regulatoryLegalEvents.e171.test.js src/services/regulatoryLegalEvents.red3.test.js src/services/regulatoryLegalEvents.test.js src/services/regulatorySourceRegistry.test.js src/services/additiveNameReference.test.js src/services/productAdditives.test.js src/services/productAdditives.integration.test.js
node node_modules/eslint/bin/eslint.js src/data/regulatorySourceRegistry.js src/services/regulatoryLegalEventValidation.js src/services/regulatoryLegalEvents.e171.test.js --max-warnings=0
node --check src/services/regulatoryLegalEventValidation.js
node --check src/services/regulatoryLegalEvents.js
git diff --check
```

Resume by inspecting Git status and this checkpoint, then continue any unfinished
checks; do not recreate the archive or reset unrelated work. Nothing is committed
or pushed without explicit approval.

## Next bounded task

Complete direct EU consolidation and subsequent-amendment verification, then
record dated coverage limits before any legal UI or product applicability work.
Do not turn historical actions into an evergreen product warning.
EU BVO records remain gated on direct official EU
positive-list/applicability verification. Keep legal and scientific records
separate before considering any visible regulatory UI.
