# Trace 1.0 release and monetization scope

Status: approved product direction. This document separates the current PWA from work required for a native iOS release; it is not a claim that the iOS app or Premium purchase is implemented.

## Current PWA, verified from source

- `src/App.js` routes the Timeline, Memory, Journal, workouts, Health, Nutrition, medications, Protocols, Time Capsules, and Backup pages. `src/components/MedicationPage.jsx` and `src/components/ProtocolsPage.jsx` open the same `InjectionSiteTracker` with App-owned records and handlers.
- `src/services/featureAccess.js` makes barcode scanning available by default as a free beta feature. `src/components/BarcodeScannerDialog.jsx` provides camera, photo, and manual barcode entry. `src/serviceWorkerRegistration.js` and `public/service-worker.js` provide the PWA app shell and offline behavior.
- `src/components/TimeCapsulesPage.jsx` accepts and plays video attachments, including a browser `Record video` file input. This is distinct from Add Memory video, which is planned for 1.1. `src/components/BackupPage.jsx` and `src/services/traceBackup.js` provide export and restore.
- `src/services/appThemes.js` defines Modern Heirloom as the default regular theme and River as an immersive theme. The other immersive themes are currently selectable in the PWA; Premium gating has not been implemented.
- `package.json` is a React web app. There is no native iOS project, StoreKit integration, or active Premium purchase in this repository. Current local storage and IndexedDB behavior must be validated in a native wrapper before release.

## Approved Trace 1.0 experience

Trace 1.0 is free to download and ad-free. Do not add ads, ad SDKs, targeted advertising, banners, interstitials, or rewarded ads. There are no accounts, cloud sync, or paid cloud storage in 1.0.

The free tier includes all core Timeline, Memory, Journal, workout, Health, Nutrition, water, medication and dose scheduling, Protocols, Injection Site Tracker, Backup/Restore, offline, camera, photo, barcode, audio recording, accessibility, and data safety functionality. Modern Heirloom remains free, and River remains the free immersive Life Current theme. Safety, privacy, data export, medical records, camera access, barcode scanning, audio recording, and access to core personal data must never depend on Premium.

Trace Premium is planned as a **one-time, non-consumable Apple in-app purchase**, not a subscription. It unlocks the remaining immersive theme collection beyond Modern Heirloom and River. Genuinely advanced customization and organization tools may be added later. The price is undecided. Premium must not appear active until native StoreKit purchase handling, entitlement verification, and Restore Purchases exist. A temporary verification failure must not block access to user-created data. The current PWA theme selection is implementation state, not a paid entitlement.

## Medical boundary

Trace records user-entered information, schedules, reminders, and estimates. Medication scheduling and injection tracking are user-directed. Trace does not diagnose, prescribe, recommend treatment, or calculate or recommend medication doses. Nutrition values and workout calorie figures are estimates where applicable. The existing in-app medical and estimate notices are in `src/components/LegalDocumentPage.jsx`; preserve and review them for native release.

## Native and App Store release gates

- [ ] Establish the native iOS foundation, app identifier, version/build numbering, packaged assets, icons, launch assets, and supported devices.
- [ ] Implement the one-time Premium product with StoreKit entitlement verification and Restore Purchases before presenting Premium as active.
- [ ] Add and validate native camera, microphone, photo, file, share, and lifecycle adapters and permission descriptions; preserve offline use.
- [ ] Validate local storage and IndexedDB in the native app and provide a safe PWA-to-native Backup/Restore migration path.
- [ ] Complete privacy manifest and SDK review, App Store privacy information, privacy policy, terms, support/contact material, and in-app links.
- [ ] Validate on a physical iPhone: permissions, capture and playback, offline launch, persistence, migration, purchases and restore, accessibility, safe areas, keyboard, rotation, and device lifecycle.
- [ ] Complete internal TestFlight testing, then external TestFlight review and feedback.
- [ ] Finalize App Store metadata, screenshots, review notes, support/privacy URLs, and submit the native app for review.

## After 1.0

Add Memory video is the first major 1.1 feature after native media storage is proven. Basic video selection, recording, playback, preservation, and export stay free; camera use alone is not a Premium benefit. Any later Premium video benefit must add genuine organization or processing value and be checked against App Store rules. Accounts, cloud sync, cross-device backup, subscriptions, and other nonessential native integrations are postponed. A subscription should only be considered if Trace later provides a genuine ongoing service such as its own cloud storage and cross-device sync.
