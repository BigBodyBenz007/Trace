# Trace native foundation

Trace remains the existing React/PWA. Capacitor adds a native wrapper that packages the compiled `build` directory inside the app. This slice does not create an iOS project or change web features. See [Trace 1.0 release scope](trace-1.0-release-scope.md) for the approved product and Premium boundaries.

## Foundation decisions

- Studio: Current Forge. App name: Trace. Bundle/application ID: `com.currentforge.trace`.
- `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` are pinned to stable `8.5.2`, the matching latest Capacitor 8 release selected for this slice. Core and iOS are runtime dependencies; the CLI is a development dependency. No native plugins are installed yet.
- `capacitor.config.ts` uses CRA's production `build` output as `webDir`. It has no remote `server.url`, cleartext transport setting, or live-update configuration. Native releases must package a current production build.
- Native iOS marketing version begins at `1.0.0` and build number at `1`; set and increment them in the Xcode project when it is created. The web `package.json` version is still `0.1.0` and is not the native release version.
- Future one-time, non-consumable Premium product ID: `com.currentforge.trace.premium.lifetime`. No StoreKit integration, entitlement check, paywall, or theme gating exists in this slice.
- The existing `src/services/runtimePlatform.js` recognizes Capacitor's native bridge and keeps its injectable detection. `src/serviceWorkerRegistration.js` registers the web service worker only in web mode. Neither needed a source change in this slice.

## Windows validation, to run after this slice

Use `npm.cmd` in PowerShell because this machine's execution policy blocks the `npm.ps1` shim. Run from the Trace repository root:

```powershell
npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/services/runtimePlatform.test.js src/serviceWorkerRegistration.test.js
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

Create and review the iOS project; validate native localStorage, IndexedDB, offline packaged assets, and PWA-to-native Backup/Restore migration; add camera/photo, microphone/audio, Files/Backup/Restore, sharing, lifecycle, and barcode networking adapters; implement StoreKit and Restore Purchases for Premium; finish privacy manifest and permissions; then test on a physical iPhone before TestFlight.

References: [Capacitor 8 environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS setup](https://capacitorjs.com/docs/ios), and [Swift Package Manager](https://capacitorjs.com/docs/ios/spm).
