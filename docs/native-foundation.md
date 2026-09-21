# Trace native foundation

Trace remains the existing React/PWA. Capacitor adds a native wrapper that packages the compiled `build` directory inside the app. This slice does not create an iOS project or change web features. See [Trace 1.0 release scope](trace-1.0-release-scope.md) for the approved product and Premium boundaries.

## Foundation decisions

- Studio: Current Forge. App name: Trace. Bundle/application ID: `com.currentforge.trace`.
- `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` are pinned to stable `8.5.2`. Core and iOS are runtime dependencies; the CLI is a development dependency. Official `@capacitor/filesystem@8.1.3`, `@capacitor/share@8.0.2`, and `@capacitor/camera@8.2.4` are pinned exactly. An npm registry query on September 20, 2026 reported Camera `8.2.4` as the stable `latest` release and its peer dependency as `@capacitor/core >=8.0.0`, which includes installed Core `8.5.2`.
- `capacitor.config.ts` uses CRA's production `build` output as `webDir`. It has no remote `server.url`, cleartext transport setting, or live-update configuration. Native releases must package a current production build.
- Native iOS marketing version begins at `1.0.0` and build number at `1`; set and increment them in the Xcode project when it is created. The web `package.json` version is still `0.1.0` and is not the native release version.
- Future one-time, non-consumable Premium product ID: `com.currentforge.trace.premium.lifetime`. No StoreKit integration, entitlement check, paywall, or theme gating exists in this slice.
- The existing `src/services/runtimePlatform.js` recognizes Capacitor's native bridge and keeps its injectable detection. `src/serviceWorkerRegistration.js` registers the web service worker only in web mode. Neither needed a source change in this slice.

## Backup/Restore migration path

The PWA user creates a Trace backup using the existing Backup & Restore page and saves or shares the resulting JSON file. In the native iOS app, **Select Backup to Restore** uses the existing `application/json,.json` file input so the user can choose that file from iOS Files. Trace then uses the same read, validation, integrity, preview, explicit confirmation, transaction-blocking, rollback, and restore-without-reload code as the PWA. Selection alone never replaces data. This is a manual backup transfer, not automatic migration or cloud sync. The selected source file is never deleted. The backup schema and contents are unchanged; this work adds no future Add Memory video data.

For native iOS export, the existing backup engine still creates the complete archive Blob and safe `traceBackupFilename`. The file adapter reads its UTF-8 JSON and writes it to an isolated folder in `Directory.Cache`, obtains its native `file://` URI, and passes that URI to the official Share plugin. The user can choose Save to Files or another share destination. Trace reports that the share sheet closed and asks the user to verify the destination; it does not claim a backup was saved merely because the sheet returned. After the share operation settles, Trace deletes only its own temporary file and then its empty temporary folder. Cancellation is distinct from failure, and write, URI, share, or cleanup failures return typed errors. iOS may evict cache files after an interruption; the app does not treat its cache copy as a retained backup. Large exports require physical-device memory testing because native UTF-8 writing reads the archive Blob into a string.

The web/PWA Download Trace Backup action immediately uses the browser download, including in browsers with Web Share support. The shared web adapter still supports Web Share for workflows that explicitly request it. Native Android and unknown native platforms return an explicit unsupported result in this iOS slice. Other App-level raw recovery downloads remain unsupported in native mode; they are separate workflows to address before any native action depends on them.

The iOS project is still deferred. When created, its `ios/App` privacy manifest must declare `NSPrivacyAccessedAPICategoryFileTimestamp` with approved reason `C617.1` for Filesystem. Review the complete native privacy manifest then. `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are unnecessary for this cache-plus-share design: Trace does not expose its private Documents container in Files or edit a picked backup in place. The Files picker supplies the user-selected file to WKWebView; the native share sheet exports a temporary cache file. Do not add broad storage permissions or those Info.plist keys for this design.

On a physical iPhone, verify the Files picker opens from the selection control, accepts a PWA backup, shows preview before confirmation, rejects invalid or modified backups, and preserves existing data after canceled or failed restore. Verify Save to Files and another share destination, canceled sharing, cleanup, large archives, app backgrounding, and a full round-trip restore. Unit tests cannot establish on-device picker or share-sheet behavior.

## Add Memory photo selection

On native iOS, the existing Add Memory photo control uses the official Camera plugin's `chooseFromGallery` API with photo-only media, multiple selection, and Trace's remaining per-Memory photo allowance. Native results are read in selection order and converted to browser `File` objects before entering the existing photo validation, preparation, preview, draft, storage, backup, and restore paths. No memory schema, photo storage format, draft behavior, or backup schema changed. Cancellation is normal; permission denial and total conversion failures are actionable errors. If some native results are unreadable, Trace keeps and processes the readable photos in order while reporting the failed remainder. Browser and PWA users retain the existing `input[type=file]` path. Native Android and unknown native platforms remain unsupported in this slice.

Camera `8.2.4` provides the later native media APIs needed for a planned video slice, but this slice exposes no video controls or behavior.

The following `Info.plist` keys must be added when the iOS project is created in Xcode. Use these user-facing values:

- `NSCameraUsageDescription`: “Trace uses the camera when you choose to take a photo for a Memory.”
- `NSPhotoLibraryUsageDescription`: “Trace accesses your photo library so you can add selected photos to your Memories.”
- `NSPhotoLibraryAddUsageDescription`: “Trace saves a photo to your library only when you choose to save it.”

The Windows implementation includes the pinned dependency, injectable native adapter, Add Memory routing, file conversion, limit and failure handling, and regression tests. Xcode is still required to generate the iOS project, add and review these permission strings, sync the plugin, review native privacy requirements, sign the app, and build it. A physical iPhone must verify gallery presentation, first-use and denied permission behavior, cancellation, app backgrounding and return, large photos, HEIC and JPEG handling, multiple selection and order, the 12-photo limit, restored unfinished drafts, and backup/restore of Memories containing native-selected photos.

## Windows validation, to run after this slice

Use `npm.cmd` in PowerShell because this machine's execution policy blocks the `npm.ps1` shim. Run from the Trace repository root:

```powershell
npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/services/backupFileAdapter.test.js src/components/BackupPage.test.jsx src/services/traceBackup.test.js
npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/services/photoSelectionAdapter.test.js src/components/NewMemoryPage.test.jsx
npm.cmd run build
npm.cmd run cap:doctor
```

`cap:doctor` may report that the iOS platform is absent; project creation is intentionally deferred. Do not run copy or sync until the iOS project and a current `build` directory exist.

## Mac handoff for the next slice

Capacitor 8 requires Node 22 or newer, macOS, Xcode 26 or newer, and Xcode Command Line Tools for iOS work. Swift Package Manager is the expected iOS dependency system. On the Mac, after the repository and approved code are available:

```sh
node --version
npm --version
xcodebuild -version
npm ci
npm run build
npx cap add ios --packagemanager SPM
npm run cap:sync:ios
npm run cap:doctor
npm run cap:open:ios
```

`npx cap add ios --packagemanager SPM` is the exact command that will create `ios/` later. Review the generated Xcode project before setting version `1.0.0`, build `1`, signing, deployment target, icons, launch assets, and permissions. Later web asset updates use `npm run build` followed by `npm run cap:copy:ios`; native plugin/config updates use `npm run cap:sync:ios`. No iOS or Android project is generated in this Windows slice.

## Subsequent native slices

Create and review the iOS project; validate native localStorage, IndexedDB, offline packaged assets, and the Backup/Restore path above; validate and then extend camera/photo support for the separately planned video slice; add microphone/audio, other Files and sharing workflows, lifecycle, and barcode networking adapters; implement StoreKit and Restore Purchases for Premium; finish privacy manifest and permissions; then test on a physical iPhone before TestFlight.

References: [Capacitor 8 environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS setup](https://capacitorjs.com/docs/ios), [Swift Package Manager](https://capacitorjs.com/docs/ios/spm), [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share), and [Camera](https://capacitorjs.com/docs/apis/camera).
