# US FD&C Red No. 3: implementation evidence checkpoint

Reviewed 2026-10-19 against repository baseline
`e45f9fbf97bbb20ea05141cd046dbfb55257f071`. This supplements the original
[archive](regulatory-evidence/2026-10-19/README.md), which remains unchanged.
Scope: dated US food actions, not present product compliance or safety.

## Direct official verification

All three official resources below were accessible and their relevant text was
read independently for this implementation on 2026-10-19.

| Source edition | Provisions checked | Bounded finding |
| --- | --- | --- |
| [FR:2025-00830, published 2025-01-16](https://www.govinfo.gov/content/pkg/FR-2025-01-16/pdf/2025-00830.pdf), 90 FR 4628 | ACTION/Summary/DATES; II.B; III; VI (4633); X; instruction 2 (4634) | Final food-listing removal, food scope including dietary supplements, identity, separate dates, certification and prior-use condition |
| [FR:2026-15920, published 2026-08-05](https://www.govinfo.gov/content/pkg/FR-2026-08-05/pdf/2026-15920.pdf), 91 FR 50475 | ACTION/DATES; II; V, Summary and Conclusions (50481) | Automatic stay began 2025-02-18; objections overruled/hearing requests denied; stay lifted 2026-08-05; original food effective date confirmed |
| [FDA:Red3, snapshot 2026-10-19](https://www.fda.gov/industry/color-additives/fdc-red-no-3) | Regulatory Information, manufacturer deadlines and following stock paragraph | Food reformulation deadline is 2027-01-15; earlier manufactured stock can appear later, subject to the final order's narrower certificate condition |

The 2026 PDF actually continues onto 50482 and its section V heading is
"Summary and Conclusions". Exact locators above supersede the archive's shorthand
for this implementation without modifying the archive. The 2025 source is
2025-00830, not the earlier audit's incomplete 2025-00515 link.

## Timeline and qualifications

- **2025-01-16:** publication of the final amendment/order removing 21 CFR
  74.303, with food effect deferred to **2027-01-15**. FDA's manufacturer
  reformulation deadline coincides with that food effective date. Neither date
  is the order's publication date.
- **2025-02-18:** automatic administrative stay from objections, under FD&C Act
  701(e)(2) and 721(d), as expressly reported in the 2026 notice. No separate
  February publication date is established. Its record cites the later notice
  and explicitly identifies the retrospective evidence.
- **2026-08-05:** final procedural action lifts that stay and confirms the food
  removal date; it does not bring food removal forward to August 2026 or create
  a new compliance period.
- **2027-01-15:** food removal effective and manufacturer deadline. Certificates
  cease for the affected food use. Section VI's qualification concerns color
  used while its certificate was effective, and only adulteration by reason of
  that color use. It is not an unconditional stock exemption or confirmation of
  other aspects of a product's compliance. No universal retail cutoff is set.

The separate **2028-01-18** ingested-drug removal in instruction 4 is excluded
from food records. The statutory basis is recorded as legal context, without
importing a scientific assessment or a product-health classification. The 2026
order does not grant the requested animal-feed exception; no such permission
is added. EU E127 provisions and product identity crosswalks remain outside scope.

## Implementation checkpoint

Implemented: retained BVO unchanged; appended three exact source editions and
three food timeline events (revocation, automatic stay, stay lifting/date
confirmation). Added typed food scope, narrow procedural relationships, and a
cited conditional prior-certified-use qualification. The retrospective stay date
requires an explicit basis; ordinary final-action chronology remains strict. No temporal
permission resolver, runtime requests, cache changes or historical migration.

Sources are verified only for the recorded passages; original rule editions are
historical and the live-page snapshot has undetermined currency. This review is
not an exhaustive later-amendment/stay search or a current consolidated-law
certification. Targeted FDA/Federal Register searches, including a requested
2026-08-06 through 2026-10-19 publication range, returned existing and older
material; search filters do not establish a complete later-action ledger.
Accessible official text supports this bounded implementation;
there is no essential-evidence blocker for these events.

## Validation and preservation

- **474 tests passed across 21 suites**, run in one process, including 47 new
  Red No. 3 cases and existing BVO, source/name provenance, provider states,
  gateway/cache, selection, saved food records, Nutrition calculations/serving
  safeguards, Ingredients and scanner/camera/decoder/photo tests.
- Changed-file ESLint passed with zero warnings. All changed JavaScript passed
  syntax checks; both changed/new JSON files parsed; Git and all nine task files'
  whitespace/newline checks passed. Git emitted LF-to-CRLF notices. PowerShell
  wraps Jest stderr PASS lines as NativeCommandError in the redirected log;
  Jest exited 0 and reported all suites/tests passing.
- BVO's complete record and the three previous source editions/name bindings
  matched the approved commit. New source metadata matched the archive except
  for expanded evidence locators. All 48 unrelated Git entries and existing file
  hashes, including the original audit/history/evidence files, matched the saved
  baseline. The staging index remained empty and HEAD stayed at the baseline.
- No runtime requests, migrations, UI edits, dependencies, production builds,
  physical-device testing, commits or pushes were performed by this task.

Files changed or added:

```text
src/data/regulatoryLegalEvents.json
src/data/regulatorySourceRegistry.js
src/data/red3RegulatorySources.json
src/services/regulatoryLegalEventValidation.js
src/services/regulatoryLegalEvents.test.js
src/services/regulatoryLegalEvents.red3.test.js
docs/regulatory-legal-events.md
docs/regulatory-source-registry.md
docs/regulatory-red3-timeline-2026-10-19.md
```

Resumable validation logs/checkpoint are in the existing ignored directory:
`artifacts/barcode-ingredients-disclosure-20261019/red3-tests.log`,
`red3-lint.log`, and `red3-validation.json`.
To resume after interruption, inspect Git status, this checkpoint and
`artifacts/barcode-ingredients-disclosure-20261019/red3-baseline.json` before
continuing. Do not overwrite the original audit/history/evidence files.

Next regulatory implementation: directly reverify and model the archived EU
titanium-dioxide withdrawal, with separate placing-on-market and durability/use-by
conditions. Partial stays, procedural changes to deadlines, other conditional
transitions, EU E127 rules and present product-compliance resolution need separate
evidence and model review. Nothing in this task authorizes visible regulatory UI.
