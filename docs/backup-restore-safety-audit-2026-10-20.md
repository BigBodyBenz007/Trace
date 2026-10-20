# Backup/restore safety audit — 2026-10-20

Scope: repository inspection and synthetic fixtures only. The user's iPhone,
iCloud file and browser profiles were not accessed. No real restore, storage
clear or service-worker operation was performed. Backup implementation is
unchanged. The reported 195.3 MB file, 85 photos and one Time Capsule attachment
have **not** been individually validated by this audit.

## Findings

| Question | Finding |
| --- | --- |
| Completeness | Current exports are schema 9 JSON with `data.structured`, `data.photos`, `data.media` and a SHA-256 integrity inventory. The storage manifest includes Memories, Nutrition entries/goals/saved foods, water, health, medications/schedules, protocols, workouts/templates, exercises, trophies, settings/themes, Journal and supported drafts. Photos include full Blob bytes encoded as base64; capsule photo/audio/video attachments are in the separate media collection. |
| Device isolation | Restore uses the supplied/default localStorage and the local `tracePhotoStorage` IndexedDB database. It makes no network requests. A Lenovo restore does not update or erase the iPhone's archive or the exported iCloud file. Downloading a file through iCloud Drive is file transfer, not Trace record synchronization. |
| Replacement | It replaces all backed-up structured domains and both media collections; it does not merge. Existing laptop-only records are removed from those collections. Domains absent from older backups may be cleared/defaulted. Zero visible Memories does not prove that Nutrition, Journal or other laptop domains are empty. |
| Exclusions | Rebuildable remote barcode cache, service-worker caches, transaction/migration recovery state are not normal archive content. Existing `nutritionEntriesRecovery` is intentionally excluded from the backup and preserved across replacement; a damaged current Nutrition source may be saved there before restore. This is not a full browser/profile backup. |
| Preview | Selecting a file calls `readSelectedFile` and `parseTraceBackupText`; no archive replacement occurs until explicit restore confirmation. The preview shows Memories, photos, capsules/attachments, other domains and draft effects. Validation checks supported schema, structured shapes, duplicate identities, referenced photos, media ownership and, for schema 5+, SHA-256 digests. Validation cannot prove a file includes every record ever present on the phone. |
| Page initialization | BackupPage's size estimate calls `readBackupSource`, which can recover pre-existing Journal/dose/Protocol transactions and open/upgrade IndexedDB. File validation itself is separate and does not write records, but opening Backup & Restore is not a blanket promise of zero normal maintenance writes. |
| Legacy compatibility | Schemas 1–9 are supported; pre-5 files lack the current hash manifest. Pre-9 exports have no current capsule media collection. Compatibility normalization can add defaults or normalize recognized legacy fields; this is not a byte-for-byte preservation promise for every legacy payload. |
| Identity and dates | Current record identifiers, recorded dates/timestamps, photo reference IDs and attachment ownership metadata are carried through export/restore. Runtime Blob URLs are recreated. Attachment bytes, MIME/name and owner links are checked; normalization may add legacy defaults. The new synthetic round-trip verifies 85 tiny photos and one capsule attachment with stable Memory IDs/timestamps/references. |
| Privacy | Ordinary backup JSON contains private archive content and readable media. An enabled Journal vault remains encrypted and must authenticate before restore writes. Other domains are not thereby encrypted. Keep all file copies private. |

Evidence: `storageDomainManifest.js`; `traceBackup.js` functions
`createTraceBackupArchive`, `verifyBackupIntegrity`, `validateAndNormalizeBackup`,
`parseTraceBackupText`, `restoreTraceBackup`; `BackupPage.jsx` file-selection and
confirmation paths; `backupFileAdapter.js`; `photoStorage.js`; App's backup
callbacks and Journal broadcast handler. The Journal BroadcastChannel/storage
events coordinate tabs on the same local origin; they are not device/cloud sync.

## Atomicity and failure behavior

`restoreTraceBackup` validates before writing, captures the old localStorage
values and both old Blob collections in memory, then performs:

1. LocalStorage key-by-key replacement.
2. A photos-store readwrite transaction (`clear` then `put`).
3. A separate media-store readwrite transaction.

Each IndexedDB transaction is atomic within its own scope; the overall restore
is **not** one transaction across localStorage, photos and media. There is no
durable whole-restore journal or automatic recovery for interruption between
these phases. Other open tabs can observe intermediate state or write stale
state; the UI in-flight guard prevents only repeated confirmations on that page.

Caught write failures attempt to restore all three old snapshots. Existing
tests demonstrate successful rollback after single structured/photo/media
failures. A new synthetic test demonstrates that a second storage failure during
rollback leaves replaced Memory data and produces the explicit error:
`automatic rollback could not be completed. Do not close this page.`
Consequently **a failed restore does not unconditionally preserve the old
archive**. Browser termination, out-of-memory failure or power interruption can
bypass the catch/rollback entirely. Rollback snapshots are memory-only.
Likewise, an App refresh callback failing after a successful storage replacement
can show an error without undoing the completed replacement.

No restore repair is included in this task. Staging plus a durable recovery
protocol and import quota/memory checks should be a separate reviewed change.

## Large-archive limits

195.3 MB is not a hardcoded import rejection threshold. Files are read entirely
as text, parsed entirely as JSON, cloned during validation and decoded for
integrity checks, then validated again and decoded into replacement Blobs at
restore. The preview and old archive snapshots can coexist in memory. This is
not a streaming import; peak memory can substantially exceed file size.

The export path uses per-record encoding and Blob parts and warns at 128 MiB.
It has a conditional `performance.memory` heap check where the browser exposes
that API. Those are **export safeguards**, not import safeguards. Restore does
not use the photo-ingestion `preparePhotoStorage` quota/persistence helper and
does not preflight destination quota or working memory. There is no reliable
195 MB success guarantee for the user's Lenovo/browser from source inspection.

The synthetic size test models 146,475,000 binary photo bytes, which require
195,300,000 base64 characters before metadata. It exercises estimation and
early insufficient-export-memory rejection with a size-only stand-in; it
allocates only tiny real bytes. It is deliberately **not** evidence that a
195 MB JSON parse, restore, quota write or browser-crash recovery succeeds.

Browser constraints, verified against primary documentation on 2026-10-20:

- [WHATWG Storage Standard](https://storage.spec.whatwg.org/#storage-endpoints):
  localStorage has a 5 MiB endpoint quota. IndexedDB has different quota
  accounting. Media Blobs are stored in IndexedDB, so a 195 MB backup is not
  written wholesale into localStorage; structured/legacy inline data can still
  exceed the smaller localStorage allowance.
- [IndexedDB specification](https://www.w3.org/TR/IndexedDB-3/#transaction-concept):
  transaction atomicity applies to that transaction's object-store scope,
  not an independent set of localStorage writes and later transactions.
- [Chrome's storage guidance](https://web.dev/articles/storage-for-the-web):
  quota depends on browser policy, disk and profile mode; best-effort data can
  be evicted. `navigator.storage.estimate()` is informative, not a reservation
  or proof of localStorage capacity. Avoid private/clear-on-exit profiles for
  an archive intended to remain available.
- [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/):
  Safari quotas depend on app context and device capacity; eviction can occur
  under storage pressure or policy conditions. Home Screen installation is
  not a substitute for an external backup. Persistence can be requested but
  is not guaranteed.

## Safest next procedure (user action only; not performed)

1. Keep the working iPhone archive and original iCloud backup unchanged. Make
   a separate fully downloaded copy on the Lenovo; do not move/delete the
   original or assume a cloud placeholder is a complete local file.
2. Preserve any existing Lenovo archive with its own backup, even if Memories
   displays zero. A dedicated **normal** browser profile is the safest test
   destination because it avoids replacing the existing profile's records.
3. Open the intended Trace origin (`https://trace-umber.vercel.app`) in that
   profile. Select the copied file and wait for validation and Review Backup.
   Stop before confirmation. Compare the Memory count with the phone and
   expect 85 photos plus the expected capsule and its one attachment. Stop on
   mismatches, unsupported format, integrity errors or missing media.
4. This preview is the recommended first step, not approval of a full-size
   restore. For stronger assurance, validate a synthetic archive of comparable
   size in an isolated profile or implement the reviewed import safeguards
   first. Keep enough free device/browser storage and working memory; no fixed
   safe amount can be certified by this audit.
5. If proceeding later, close other Trace tabs on the Lenovo, retain the file
   copies, and confirm only in the intended target profile. The current restore
   is not interruption-safe: if a work break may interrupt it, pause before
   confirmation and resume the procedure later. Never clear browser data to
   recover from a failure. Keep any failed-rollback page open for investigation.
6. After a reported success, check Memory counts/dates, representative original
   photos, the capsule attachment and Nutrition, then reopen Trace to check
   persistence and export a separate Lenovo backup. There remains no automatic
   synchronization with the iPhone.

## Nutrition navigation change

Moved the existing upper Back to Timeline button before `NutritionSummary`.
Same handler, classes and inline styles; no new navigation control or CSS.
The existing bottom navigation remains because the page already deliberately
provides and tests matching top/bottom controls with draft preservation.
No calculations, barcode scanning, logging, saved records or themes are changed.

The focused navigation test now checks that the upper control precedes the
Nutrition heading. Synthetic backup tests and the existing backup/UI/privacy/
storage/Nutrition suites are run serially. Test/browser artifacts and the
interruption checkpoint are under `artifacts/backup-navigation-audit-20261020/`.
No commit, push or deployment is authorized.

## Validation results

- 363 distinct tests across ten suites passed across the initial run and one
  focused rerun. The initial run had one five-second timeout in the unchanged
  barcode handoff suite; all 14 tests in that suite passed with a 15-second
  timeout on rerun. No test assertions or application behavior were changed to
  accommodate it.
- Backup structure, integrity, photo/media ownership, privacy credentials,
  preview/confirmation, rollback, media transactions, Nutrition drafts,
  calculations, logging and barcode handoff are covered. The new failure test
  records the existing rollback limitation rather than hiding or repairing it.
- Eight isolated Chrome viewport checks passed: 390×844 in all seven themes
  plus 1280×1000 desktop. The upper navigation was visible, clickable and
  above the Nutrition heading; no horizontal overflow or hidden primary actions.
  Physical iPhone testing was not performed.
- Syntax and changed-file whitespace passed. `NutritionPage.jsx` and
  `traceBackup.test.js` have no lint errors/warnings. Full lint reports 391
  Testing Library findings in unchanged `NutritionPage.test.jsx` code; every
  reported line maps to identical HEAD code and none falls on the two added
  assertion lines. That existing cleanup is outside this task. Detailed lint
  and mapping reports are retained with the artifacts.
- Only the Nutrition component, its test, backup tests and this audit document
  were changed/added. The other 713 baseline paths are unchanged. No production
  build, dependency installation, commit, push or deployment was performed.
