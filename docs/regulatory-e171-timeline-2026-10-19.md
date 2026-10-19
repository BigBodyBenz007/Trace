# EU E171 food withdrawal: evidence and implementation checkpoint

Review date/cutoff: 2026-10-19. Repository baseline:
`04546ae7c247c3b0c01f2f0737495f5f462b4609`.
The existing audit/history documents and
[original evidence archive](regulatory-evidence/2026-10-19/README.md) remain unchanged.

## Direct official verification

- [Commission Regulation (EU) 2022/63](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R0063):
  full English act accessible. OJ L 11, 18 January 2022, pp. 1-4; adopted
  14 January 2022. Articles 1-4 and the Annex were read directly. Article 4's
  twentieth-day rule gives entry into force **2022-02-07**; Article 2 and the
  Commission Q&A corroborate the date.
- [Commission re-evaluation Q&A](https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/re-evaluation_en):
  titanium-dioxide identity (including TiO2), entry into force, Article 2 transition,
  finished-food/B2B clarification and medicinal distinction read directly.
  The separate state-of-play heading dated 2026-09-10 does not date all Q&A text.
- [EFSA opinion, DOI 10.2903/j.efsa.2021.6585](https://www.efsa.europa.eu/en/efsajournal/pub/6585):
  accessible through EFSA's publisher redirect. Adopted **2021-03-25**, published
  **2021-05-06**; date header, abstract and **section 7, Conclusions** checked.
  The original archive's section-4 conclusion locator is shorthand/incorrect for
  this full opinion; the new locator identifies section 7 without editing it.

The legal act withdraws E171 food-colour uses through Regulation (EC) 1333/2008,
Annex II: Part B's retained entry expressly excludes Part D/E food categories;
the Group II quantum-satis entry and specified category 04.2.4.1 and 09.2 entries
are removed. Annex III's E555 carrier entry is limited to E172. Retaining E171
in Part B for medicinal-product context is not food authorization. Article 3's
medicinal review obligation is not a food reinstatement or automatic new removal.

Article 2 distinguishes conditional market placement through **2022-08-07**
from qualifying stock remaining until its own minimum-durability or use-by date.
Production must comply with the rules applicable before **2022-02-07**; this is
not a claim that every qualifying food had to be manufactured before that day.
The Q&A clarifies finished-food stock and no further transformation for later
B2B supply. No universal stock-removal date or unconditional sale permission is
inferred, and product eligibility remains unknown.

EFSA's dated finding concerns unresolved genotoxicity concerns in its assessment;
it is not proof that every exposure is harmful or an individual-product risk
estimate. Its dates and scientific source remain separate from legal dates and
legal source references. No safety rating or medical interpretation is imported.

## Current-law and amendment verification limits

The essential historical act and transition are directly verified. Complete
current-law coverage through the requested cutoff is **not verified**:

| Material / attempt | Result and consequence |
| --- | --- |
| 1333/2008, consolidation 2026-08-18, English TXT and HTML | Retrieval errors |
| Same edition through English ELI PDF URL | Three-line response without usable legislative text |
| 231/2012, consolidation 2026-08-18, English TXT | Tool content-size limit |
| Same edition through HTML and ELI PDF | No usable legislative text returned / retrieval error |
| Targeted official-domain searches for E171, 2022/63 and 231/2012, including 2026-08-19 through 2026-10-19 | Indexed original/older material and unrelated trade/cosmetic provisions; not a complete amendment or negative-change ledger |
| SWD(2025) 244, requested through CELEX:52025SC0244 | Direct retrieval failed; indexed court notices concern medicinal-product review, not verified reversal of food withdrawal |

The original 2022 act amends Annexes II/III of **1333/2008**, not 231/2012.
Its discussion of proposed specification changes does not establish that those
proposals were enacted. No new E171 specification amendments, 2026 consolidated
conditions, medicinal decisions, court outcomes or worldwide status are imported
from snippets. Trade duties and inhalation/cosmetic classifications are not food
authorization decisions. The two inaccessible consolidations and subsequent
amendment/corrigendum coverage remain an explicit review gate.

Implementation can therefore record the **historical 2022 action and its verified
conditions**, not an exhaustively current legal verdict. The existing partial
2026 specification edition and original 2012 name bindings will remain intact.

## Implementation and validation

Implemented one EU food withdrawal event and three source editions: the original
act, Commission Q&A snapshot and dated EFSA opinion. EFSA is outside the event's
legal references. Optional cited identity metadata records E171 and TiO2. A narrow
`marketTransition` shape separates the prior-rules date, market-placement end and
product-specific stock-end basis, requires verified primary legal evidence and
rejects invented stock dates or permission flags. General compliance remains
explicit null. The four US events and all earlier source/name bindings are intact.

- **522 tests passed across 22 suites**, including 48 new E171 cases and existing
  BVO/Red No. 3, source/name, additive/provider, gateway/cache, selection, saved
  records, Nutrition/serving, Ingredients and scanner/camera/decoder/photo tests.
- Changed-file ESLint passed with zero warnings; changed JavaScript syntax,
  both changed/new JSON files, Git whitespace and all eight task files' newline/
  whitespace checks passed. Git emitted LF-to-CRLF notices. PowerShell wraps
  Jest stderr PASS output as NativeCommandError; Jest exited 0 with all tests
  and suites passing.
- The original four US records, six earlier source editions and name bindings
  matched the approved baseline. New source metadata matched the original
  archive except for expanded/corrected evidence locators. All 48 unrelated Git
  entries and file hashes, including audit/history and evidence files, matched
  the saved baseline; the staging index remained empty and HEAD was unchanged.
- No scanner/camera, native iOS, Nutrition/Ingredients UI, provider model, cache,
  persistence or Zibblez changes; no runtime requests or migrations. No package
  installation, production build, physical-device test, commit or push.

Files changed or added:

```text
src/data/e171RegulatorySources.json
src/data/regulatoryLegalEvents.json
src/data/regulatorySourceRegistry.js
src/services/regulatoryLegalEventValidation.js
src/services/regulatoryLegalEvents.e171.test.js
docs/regulatory-e171-timeline-2026-10-19.md
docs/regulatory-legal-events.md
docs/regulatory-source-registry.md
```

Tests/lint logs and the resumable validation summary are saved in the existing
ignored directory as `e171-tests.log`, `e171-lint.log` and `e171-validation.json`.
Baseline hashes/statuses are saved in the existing ignored file
`artifacts/barcode-ingredients-disclosure-20261019/e171-baseline.json`.
Resume from Git status and this checkpoint after interruption; do not recreate
or overwrite earlier research. No commit or push is authorized for this task.

Next task: complete direct EU consolidated-law and subsequent-amendment review,
including 231/2012 specification coverage, and record dated coverage limits
before implementing legal UI or product-eligibility resolution. Other transition
templates require evidence, explicit schema review and focused tests.
