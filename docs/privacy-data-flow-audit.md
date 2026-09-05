# Trace privacy and data-flow audit

Audit date: September 5, 2026

Audited revision: `4b752d7d2056136a542f5cf68be1db9a190dfe16`

Purpose: factual source for the public Privacy Policy and Terms of Service. This is an engineering audit, not legal advice.

## Architecture summary

Trace is a local-first Create React App/PWA. It has no account or authentication implementation and no cloud-sync data store. Durable structured records use browser `localStorage`; memory and workout photo blobs use IndexedDB (`tracePhotoStorage`). The service worker stores only rebuildable application-shell/static responses in Cache Storage. The only application network request found is a user-initiated remote barcode lookup through the same-origin Vercel function at `POST /api/nutrition/barcode`. `reportWebVitals()` is called without a callback, so it does not collect or transmit metrics.

## Data inventory

| User-data category | Storage and purpose | Leaves device? | Retention and deletion |
| --- | --- | --- | --- |
| Memories | `localStorage.memories`; titles, descriptions, dates, categories, photo references, and display metadata | Only in a user-created backup | Until an individual memory is deleted, a restore replaces data, or browser/site data is cleared. Deleting a memory also attempts to delete its photo blobs. |
| Journal entries and draft | Plaintext `journalEntries` and `journalDraft` when Journal Lock is off; encrypted `journalVault` envelope when on | Only in a user-created backup | Individual entries and drafts can be deleted. The encrypted Journal can be erased/reset. Disabling Journal Lock restores plaintext locally. Browser/site clearing removes it. |
| Nutrition and water | `nutritionEntries`, `nutritionGoals`, `waterEntries`, `userFoods`; includes portions, nutrients, saved/custom foods, goals, and provider snapshots | Saved data leaves only in a backup. A submitted barcode may leave as described below. | Individual entries/custom foods can be deleted where controls exist; otherwise restore/site clearing applies. |
| Remote barcode response cache | `remoteBarcodeFoodResponses` in `localStorage`; normalized successful/incomplete provider results only | The GTIN is sent for a lookup; returned normalized data is cached locally | 30-day TTL, maximum 500 LRU records. Rebuildable, excluded from backups, removable by clearing site data. |
| Health measurements | `healthMeasurementEntries`; measurements used for history and optional workout-estimate inputs | Only in a user-created backup | Individual deletion, restore replacement, or site clearing. |
| Medication and supplements | `medicationEntries`, `medicationCompounds`, `medicationDoseSchedules`, `medicationDoseOccurrences`; user-entered history, catalog items, schedules, and occurrence state | Only in a user-created backup | Medication entries and dose schedules have deletion controls, and individual occurrences can be removed. Ending a schedule preserves history. Saved compounds can be edited but no compound-delete callback is wired in App. Restore replacement or site clearing applies to every domain. |
| Protocols and injections | `protocols`, `protocolOccurrences`, `protocolCompoundOutcomes`, `injectionSiteEntries`, `injectionSiteSettings`; definitions, results, schedule state, injection locations, and display preference | Only in a user-created backup | Available record deletion/ending, restore replacement, or site clearing. Transaction keys used to recover interrupted compound-result changes are not backed up. |
| Workouts | `workoutEntries`, `plannedWorkouts`, `workoutTemplates`, `workoutDraft`, `savedExercises`, `dailyActions`; performance, readiness, duration, calories, estimate snapshots, targets, plans, templates, active draft, and exercise catalog | Only in a user-created backup | Workouts, plans, templates, and actions have individual deletion controls; drafts can be canceled or completed. Saved exercises can be edited but no catalog-delete callback is wired in App. Restore replacement or site clearing applies to every domain. Completion does not necessarily erase schedule/history. |
| Trophy Case | `trophyCaseEntries`; saved achievement items and source references | Only in a user-created backup | Individual removal, restore replacement, or site clearing. |
| Settings | `appSettings`; units, theme, Home visibility, motion preference, and Journal auto-lock preference | Only in a user-created backup | Changed in Settings, replaced by restore, or removed by site clearing. |
| Selected photos | IndexedDB `tracePhotoStorage/photos`; photo bytes and memory/workout reference metadata | Included in a user-created backup. No photo-upload request exists. | Removed when associated photos/records are deleted where implemented, replaced wholesale on restore, or removed by clearing site data. |
| Recovery journals | `journalVaultTransaction`, `medicationDoseCompletionTransaction`, `protocolCompoundOutcomeTransaction`, plus an IndexedDB photo-migration marker | No | Temporary recovery state; excluded from backups and cleared after successful completion/recovery. |
| PWA application shell | Cache Storage keys matching `trace-app-shell-*`; HTML, manifest, icons, and static build files | Browser fetches deployed app assets | Replaced by newer service-worker cache versions or removed through browser/site-data controls. Contains no user records by design. |

The authoritative storage classification is `src/services/storageDomainManifest.js`; its tests audit persistence-key coverage. There is no single in-app “erase everything” control. Users can delete many individual records, replace all durable domains and photos through confirmed restore, reset the Journal independently, or use browser/device controls to clear all Trace site data. Uninstall behavior is browser/platform-dependent.

## Journal security

Journal Lock covers exactly `journalEntries` and `journalDraft`. It uses Web Crypto AES-256-GCM for the payload and key wrapping, PBKDF2-SHA-256 with at least 600,000 iterations for password wrapping, and a recovery wrapper (current 12-word BIP39 phrase derived through HKDF-SHA-256; legacy recovery keys remain supported). Trace verifies atomic transitions and uses a recovery transaction for enable, disable, replacement, and reset operations.

Limitations: the rest of Trace is not encrypted by Journal Lock; content is plaintext in application memory while unlocked; device/browser compromise, screenshots, credentials, and exported files are outside this protection. Trace cannot recover a lost password and recovery credential. Backup integrity hashes provide tamper/corruption detection, not secrecy.

## Photos and camera

- Memory/workout photos enter through an HTML photo/file picker only after user selection. Object URLs are temporary display references; persisted blobs are local IndexedDB records.
- The barcode scanner calls `getUserMedia` only when scanning starts, requests video without audio, decodes the live stream locally through the dynamically loaded ZXing browser decoder, and stops tracks on acceptance, close, switch, unmount, background, or suspension.
- No source path stores, uploads, or includes barcode camera frames in a backup. Manual barcode entry is available.
- Permission grant/revocation, picker access, and device labels are controlled by the browser/operating system. Withdrawing permission does not remove already selected photo files.

## Barcode lookup and third parties

Lookup order is committed local catalog, user-saved food, fresh normalized local cache, then remote providers. A valid GTIN-family numeric identifier is sent in a JSON body to same-origin `POST /api/nutrition/barcode` only after a scan or manual submission. The Vercel Node function sends the barcode to USDA FoodData Central Branded Foods first and, when necessary, to Open Food Facts. The browser cannot select an upstream URL. Requests and responses are bounded and timed out; the endpoint returns normalized provider data with `Cache-Control: no-store`.

Verified third parties:

- Vercel hosts the deployed app/serverless function according to the repository operations documentation and file-based `api/` function architecture.
- USDA FoodData Central receives the barcode as a search query. The server uses a server-only API key. FDC data is identified in project documentation as public domain/CC0.
- Open Food Facts receives the barcode in its product endpoint when fallback is needed. Returned records retain contributor attribution, public source URL, revision metadata, and the ODbL notice.

The repository does not establish Vercel, USDA, or Open Food Facts access-log fields or retention periods. As a conservative disclosure, ordinary infrastructure request metadata (for example IP address, time, and user-agent/technical headers) may be processed under each provider's practices. Opening provider source links also makes a normal direct browser request to that third party.

## Backup and restore

- Export is explicit. Trace serializes every durable structured domain plus every stored photo into one JSON file.
- On compatible iPhone/browser combinations, the file can be handed to the Web Share API; the user chooses the share-sheet destination. Otherwise Trace creates a temporary object URL and browser download.
- The backup contains a schema/domain inventory and SHA-256 digests for structured data and each photo. Parsing validates JSON, schema compatibility, every domain, referential constraints, and integrity before restore.
- Restore requires explicit confirmation and replaces all audited durable `localStorage` domains and the complete photo store; it does not merge. The existing state is snapshotted and an automatic rollback is attempted if replacement fails.
- An encrypted Journal remains encrypted in the backup and must be verified with its password or recovery credential. If restoring plaintext Journal content over an active encrypted Journal, the current unlocked session is used to encrypt the incoming content. Other backup content is readable JSON. Credentials entered for verification are not persisted by the backup UI.
- Once exported, backup retention, confidentiality, sharing, and deletion depend on the destination selected by the user and are outside Trace's control.

## Network, dependencies, and tracking audit

- Runtime dependencies are React/ReactDOM, CRA tooling, Web Vitals, `@scure/bip39`, and `@zxing/browser`, plus test libraries.
- The only application `fetch` path found is the barcode lookup. No analytics SDK, ad SDK, crash reporter, payment SDK, account/auth client, cloud database, or sync client is present.
- `reportWebVitals()` receives no callback and therefore does not register metrics handlers or transmit performance results.
- No application cookie write/read, advertising identifier, persistent device identifier, cross-site tracking, or consent/acceptance record was found.
- The service worker performs same-origin app-shell/static-asset fetches and caching. It does not cache API responses or user data.
- The manifest describes an installable standalone PWA and does not declare extra permissions.

## Existing safety disclosures

The Medication page says Trace records entered information and does not provide dosing or medical advice. Injection Site Tracker says marker colors/shapes indicate recency only, not medical safety. Workout calorie output is labeled a broad estimate rather than an exact measurement and lists input/uncertainty factors. Barcode UI identifies provider attribution, missing values, stale cached results, and source links. Journal and backup screens explain credential loss, replacement semantics, and backup handling.

## Release-blocking uncertainty

1. Hosting/platform request logs and retention cannot be proven from source or repository configuration. Confirm the production Vercel project's current privacy, logging, security, region, and retention settings before launch, then update public disclosures if necessary.
2. Complete the Open Food Facts ODbL attribution/share-alike and any image/database licensing review for the exact public distribution. Visible source attribution is not by itself a legal conclusion.
3. The repository cannot prove how each target browser/OS handles site-data removal after PWA uninstall or share-sheet destinations; documentation must stay qualified.
4. Qualified legal counsel should review the release-candidate policies, age language, Oklahoma governing-law clause, liability/indemnity terms, and applicable state/country privacy obligations before public commercial launch.

## Store-submission checklist

- [ ] Publish and verify the production `/privacy` URL without sign-in; enter it in App Store Connect and Google Play Console.
- [ ] Complete Apple App Privacy metadata from the final binary and production infrastructure behavior, including health/fitness data, photos, identifiers submitted for barcode lookup, diagnostics/logs if any, collection linkage, and tracking status.
- [ ] Complete Google Play Data Safety from the final app and production provider behavior; do not rely only on this source audit.
- [ ] Complete the Google Play Health apps declaration and any applicable health-content/permissions forms.
- [ ] Keep the medical disclaimer prominent in store listing text and in-app legal terms; ensure screenshots and marketing do not imply diagnosis, treatment, prescribing, FDA clearance, or guaranteed accuracy.
- [ ] Review Open Food Facts attribution, ODbL database obligations, notices, and any applicable provider/API terms for the shipped use.
- [ ] Confirm USDA/data.gov and Vercel terms, production environment, request logging, retention, security, and contact details.
- [ ] Verify camera/photo permission purpose strings and platform packaging if Trace is later wrapped as a native app.
- [ ] Have qualified legal counsel approve the final Privacy Policy and Terms before public commercial launch.
