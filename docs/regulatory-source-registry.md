# Regulatory source registry and provenance validation

Implementation checkpoint: 2026-10-19. This local foundation contains source
metadata, not legal-use rules, health claims, scientific conclusions or ratings.
The research basis remains in [the regulatory audit](additive-regulatory-audit-2026-10-19.md).

## Architecture and shipped records

- `src/data/regulatorySourceRegistry.js` is the maintained data manifest. It uses
  CommonJS so the browser and Node gateway can share it without dependencies.
  It composes the historical citation directly from `additiveNameReference.json`
  rather than maintaining a second copy of that citation.
- `src/services/regulatorySourceValidation.js` exports pure validators returning
  `{ valid, errors }`: `validateSourceRecord`, `validateSourceReference`, and
  `validateSourceRegistry`. Invalid input is rejected, never repaired or upgraded.
- `src/services/regulatorySourceRegistry.js` validates the manifest, makes an
  immutable private snapshot and builds exact-key indexes. Its factory throws
  with diagnostics for an invalid registry. Unknown lookup keys return null.
- `src/services/additiveNameReference.js` obtains its historical source through
  the registry. Names, identifiers and serialized name-reference fields are unchanged.

The manifest has a schema version, registry version, snapshot date, source
editions and name-reference bindings. An edition is identified by the pair
`sourceId` / `editionId`; there is deliberately no automatic "latest" lookup.
Separate editions of a stable source can coexist. Their publisher, jurisdiction
and document type must agree; a different kind of source gets a separate ID.

Six source editions are shipped (BVO was appended in manifest v2; three
Red No. 3 editions were appended in v3):

| Source | Edition | Verification | Currency |
| --- | --- | --- | --- |
| CELEX:32012R0231 | original-2012-03-22 | Verified official text for eight name headings only | Historical |
| CELEX:02012R0231-20260818 | consolidated-2026-08-18 | Partial, indexed evidence from the audit; completed verification date is null | Undetermined |
| FR:2024-14300 | published-2024-07-03 | Verified final BVO revocation action and its dates/qualifications; archived official text | Historical |
| FR:2025-00830 | published-2025-01-16 | Verified Red No. 3 final food-removal order, dates and certificate qualification | Historical |
| FR:2026-15920 | published-2026-08-05 | Verified automatic-stay history, lifting and food-date confirmation | Historical |
| FDA:Red3 | snapshot-2026-10-19 | Verified manufacturer deadline and earlier-stock summary; supporting evidence only | Undetermined |

No source is shipped as current. The 2026 entry neither replaces the 2012
attribution nor supplies new product metadata. Its separate publication date is
unknown with an explicit reason; the known consolidation date is not substituted.
The full-source and amendment-review gaps remain open.
The BVO citation is held in `src/data/bvoRevocationSource.json`, retaining the
edition from the [evidence archive](regulatory-evidence/2026-10-19/README.md).
It supports a [separate legal-event record](regulatory-legal-events.md); it is
not a name-reference binding or a statement of present product compliance.
The Red No. 3 editions are in `src/data/red3RegulatorySources.json`, retaining
archived citations and editions with more precise evidence locators. Relevant
text was independently read for the
[Red No. 3 implementation](regulatory-red3-timeline-2026-10-19.md). The live-page
publication date remains unknown; its access date is not substituted. No earlier
edition, source verification scope or historical name binding was overwritten.

## Record fields

Each source has `sourceId`, `editionId`, `documentType`, `citation`, `edition`
and `verification`.

The citation retains the existing vocabulary: `id` is the official source ID,
`publisher` the issuing organization, `url` the official source URL, and `title`,
`jurisdiction`, `language`, `publicationDate`, `version`, `attribution`,
`reuseBasis`, `reuseNoticeUrl`, `changes` and `scope` describe its provenance.
An unknown publication date must be explicit null with `publicationDateNote`.
The legacy `reviewedOn` and `reuseDecisionUrl` are supported without changing
their meaning. `edition` supplies kind, date and a label matching the citation's
version. An unidentified edition cannot be registered by guessing a date.

Verification records contain:

- `status`: verified, partial, unverified or unavailable.
- `currency`: historical, current-as-of or undetermined. This is separate from
  verification strength and never represents permission to use an additive.
- `lastAttemptedOn`, `lastVerifiedOn`, `verifiedThrough`: separate nullable ISO
  dates. An incomplete attempt cannot claim a completed verification date.
- `evidenceType`: official-text, indexed-excerpt or none; `evidenceLocator`
  identifies the reviewed material and `scope` limits the assertion.
- `currentnessBasis`: a required review explanation for current-as-of; otherwise
  null. Merely having a working URL is not a basis.
- `limitations`: an explicit list, nonempty for incomplete verification.

"Verified" applies only to the recorded scope. It does not independently verify
product contents, legal authorization, ingredient quantity or safety. A future
current-as-of record describes completed review **through its specified date**,
not perpetual currency or today's legal status.

## Validation and lookup contracts

Validation checks required identifiers, citation attribution/reuse information,
HTTPS URL shape without credentials, known document/edition types and exact
edition labels. The currently supported jurisdictions are EU, US-federal and
international. State-level identifiers require an explicit future extension;
ambiguous `US` is rejected.

Dates must be real YYYY-MM-DD calendar dates, including correct leap-day handling.
Publication cannot follow the edition, an edition cannot postdate its review,
completed verification cannot postdate the last attempt, and coverage must lie
between edition and completed verification. Review attempts cannot exceed the
registry snapshot date. A caller can supply `{ asOf: "YYYY-MM-DD" } to reject
future snapshots/attempts relative to an external review cutoff. Import-time
validation uses the pinned snapshot date, not a user's phone clock.

Verified records require dated official-text evidence with a locator. Indexed
evidence cannot be promoted to verified. Current-as-of additionally requires
completed verification, a coverage date and a currentness basis. Incomplete
records must retain null completed-verification/coverage dates and limitations.
Unverified records can have no attempt yet; unavailable records require a dated
attempt. These are accepted uncertainty states, not malformed-record fallbacks.

Duplicate source/edition pairs, conflicting identities across editions, missing
reference targets, duplicate or conflicting bindings, sparse arrays and unknown
schema fields are rejected. Unsupported fields such as safety verdicts cannot
be added to the source schema accidentally. Adding future metadata requires
deliberate validator, schema and test changes.

`getRegulatorySource({ sourceId, editionId })` returns the frozen edition record
or null. `validateSourceReference(reference, sources)` checks an exact,
unambiguous reference and validates its target, including partial/unverified
targets without promoting their status.

`referenceBindings` are specifically for existing **name-reference** citations:
each maps a `sourceId` / `referenceVersion` pair to an edition and must target
verified evidence. `getReferenceSource` and the existing `getAdditiveNameSource`
return that edition's citation. Unknown pairs return null. Conflicting optional
publication-date, jurisdiction or language claims on a saved reference also
return null. A future edition must add a new binding and retain existing ones;
it must not repoint a historical binding.

Structural checks cannot prove that a hostname belongs to a regulator, that a
reviewer actually read a document, or that a stated scope is complete. Source
ownership, reuse rights, factual accuracy, coverage and amendment checks remain
human review responsibilities. No URL is fetched by this implementation.

## Compatibility and future work

The eight mappings and original JSON file are unchanged. Product-provider
attribution remains Open Food Facts/provider-reported; source verification only
describes the name association. Unknown identifiers remain unnamed, and absent,
unknown and provider-reported empty additive data remain distinct.

There is no product-cache version change, historical storage migration or added
payload field. Existing cached and saved name references keep resolving to the
2012 citation. The registry itself is not copied into food records. Nutrition
calculations, serving safeguards, scanner code and visible layout are unchanged.

Future FDA sources and scientific assessments can use the same citation/edition
shape, after human verification. The legal-event foundation now holds one final
US BVO action and the bounded US Red No. 3 food timeline separately from source and name records. Effective dates,
compliance deadlines and supersession links belong in that explicit structure,
not in publication or verification dates. Scientific assessments remain separate.
Proposals, partial stays, changed deadlines and other unsupported date semantics
need deliberate schema extensions; the implemented automatic stay and lifting
preserve their exact source/version bindings.

Further current EU records still require complete official source retrieval and
amendment/corrigendum checks. See the legal-event documentation for the next
bounded US implementation and its evidence gates.
Preserve previous reviewed source snapshots when recording later review attempts;
the current manifest is a versioned bundle, not a mutable review-history database.

## Focused validation

Registry tests cover valid/invalid records, dates, status distinctions, duplicate
and dangling references, preserved historical citations, future edition lookup,
immutability and partial-evidence safeguards. Existing additive, cache, selection,
storage, ingredient, scanner and nutrition suites exercise the unchanged paths.

Original registry validation on 2026-10-19: 355 tests passed across 19 focused suites, run in one
process. Changed JavaScript passed ESLint with zero warnings and syntax checks;
Git and new-file whitespace checks passed. Git reported only an LF-to-CRLF
conversion notice. Existing audit/history documents and unrelated file hashes
and Git statuses matched the pre-edit baseline. No physical-device test or
production build was performed for this data/service-only change.
Validation of the later BVO addition is recorded in [regulatory-legal-events.md](regulatory-legal-events.md).

Copyable focused checks from the project root:

```powershell
$env:CI='true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/services/regulatorySourceRegistry.test.js src/services/additiveNameReference.test.js src/services/productAdditives.test.js src/services/productAdditives.integration.test.js
node node_modules/eslint/bin/eslint.js src/data/regulatorySourceRegistry.js src/services/regulatorySourceValidation.js src/services/regulatorySourceRegistry.js src/services/regulatorySourceRegistry.test.js src/services/additiveNameReference.js --max-warnings=0
git diff --check
```

No production build, new package, API, scheduled process or source update is
required to resolve a name. Nothing should be committed or pushed without the
user's explicit approval.
