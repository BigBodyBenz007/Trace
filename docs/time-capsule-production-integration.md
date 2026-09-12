# Approved Time Capsule presentation

The user approved the combined presentation at `178f8ed` (“That’s perfect”). Production uses those MP4 files unchanged: opening is 6 seconds, closing is 5.4 seconds. The fixed camera, modeled vault, opening vapor, lighting, and synchronized recorded sound are baked into each film. There is no runtime 3D renderer, synthesized sound, layered-image hinge, or separate audio scheduler.

`src/assets/time-capsule/ceremony-open.mp4` and `ceremony-close.mp4` are byte-identical copies of the approved preview. `vault-opened.png` is decoded opening frame 179; `vault-sealed.png` is decoded closing frame 161. Both retain the full 960×840 camera frame. Detail, Timeline, archive, Reduced Motion, and failure recovery use these matching endpoints. Existing source recordings and editing provenance remain under `docs/time-capsule-sound-candidates/`; the complete bundled recording credits now appear inside Settings → About → Credits & licenses.

## iPhone repair: evidence and limits

The user reported an extra Enable sound tap on opening, silent closing until moving its volume slider, premature completion, and a credits page with no usable installed-PWA exit. This repair follows the initial integration at `b965023b64d876b030afa01e5168f3699049dcd0`.

- Previously, the initiating handler resumed an AudioContext but created the video after persistence. The player immediately inspected context state without awaiting readiness. A still-resuming context could therefore select silence despite the original sound-enabled gesture. Native confirmation dialogs also separated sealing from a reliable final DOM gesture. Preparing the same video element and waiting for readiness addresses these code paths; physical-iPhone validation remains necessary.
- The old slider rewrote gain and mute state. **Only a zero-to-positive volume transition retried resume/play.** This establishes what the control did, but not which uninstrumented iPhone condition caused silent closing or why that specific slider interaction restored sound. The repair initializes playback correctly instead of simulating a slider adjustment.
- The old `duration - 0.025` progress check could release **at most 25 ms before the configured clip end**, with no settled final hold. That code alone does **not** prove the reported multi-second iPhone cutoff. Device playback and lifecycle behavior was not instrumented on that phone. Normal completion now follows actual media timing and allows final output to drain.
- The former credits control opened a same-origin raw text asset with no Back control. Credits now stays in an app view with sticky safe-area return navigation.

## Current lifecycle

- Existing persistence callbacks still complete before success playback or private reveal. Home’s Open now only navigates. Failed writes leave no success ceremony.
- Open Capsule and the final DOM seal/reseal confirmation synchronously prepare the exact video element used afterward. A zero-gain route is established before any priming play call; the same gesture requests AudioContext resume. Readiness is asynchronous and bounded. Priming is silent. Failed writes, stale navigation, backgrounding, and unmount dispose preparation safely.
- The approved embedded audio and picture use one media clock at original speed. Settings owns Capsule sounds and saved `capsuleVolume`, default 0.65, applied before success playback. There is no ceremony slider or normal-flow Enable sound prompt. Remaining audible-playback rejection receives a bounded muted retry and an honest notice. Trace does not detect the silent switch or alter device volume.
- Initial sealing has an in-app dialog with a final Confirm seal Time Capsule button. Resealing’s visible Confirm seal again button is its final confirmation gesture. Cancellation does not prime or persist a ceremony.
- Normal completion retains the final picture for 800 ms after actual media completion without immediately disconnecting output. A progress monitor and bounded startup/stall/absolute limits handle missing events. Failure shows the saved endpoint with Continue and releases automatically. Explicit Skip, navigation, backgrounding, pagehide, and freeze may stop immediately. Reduced Motion shows a silent endpoint for 500 ms.
- Backgrounded successful operations reconcile saved state without replay. Navigation invalidates the old presentation. Returning to an opened capsule does not replay it.
- Shared media loaders retain URL ownership. Capsule media pauses on cleanup without revoking session-owned photo URLs. User attachments never autoplay.
- Service worker v5 installs repaired JS/CSS plus the two films, two endpoints, and attribution from CRA’s manifest. Cached MP4 ranges, exclusion of partial network responses, and safe static-file navigation remain unchanged. Other theme art remains cached on use; user storage is untouched.

## Credits navigation

Settings → About → Credits & licenses opens `/#credits` without a hosting rewrite. Settings remains mounted but hidden during the visit. Return restores controls, scroll, and entry-link focus. Browser/device Back and Forward follow existing app history conventions; direct credits entry also has a safe Back to Settings route.

All attribution, license links, source links, modification notices, and hashes render as accessible headings, source cards, paragraphs, and wrapped code/URLs. Checkout-only audition instructions are omitted from the app view; the original bundled credit file is unchanged. Source/license links offer an in-app panel with Copy link, Open in browser, and Back to credits. External opening uses a separate context with `noopener,noreferrer`; the browser controls its external-window UI. Copying requires no external navigation. A failed document load preserves Back to Settings and offers retry.

## Reproduce production checks

Run test processes serially without watch mode, using a 4 GB heap for tests and a 6 GB heap for the production build. Inspect saved progress after interruption before repeating completed checks. From the repository in PowerShell:

```powershell
$env:CI='true'
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/components/TimeCapsulesPage.test.jsx src/components/TimeCapsuleCeremony.test.jsx src/services/capsuleCeremonySound.test.js src/services/capsulePresentation.test.js src/services/timeCapsule.test.js src/services/capsuleMedia.test.js src/services/appSettings.test.js src/serviceWorkerOffline.test.js src/pwaAssets.test.js src/services/traceBackup.test.js
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/App.test.js src/components/HomePage.test.jsx --testNamePattern='capsule|Capsule|reseal|opening|Open now|Settings opens and global unit|Health Personal Details|Motion preference applies'
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/components/CreditsPage.test.jsx src/components/SettingsPage.test.jsx src/LegalApp.test.jsx src/services/legalNavigation.test.js src/components/LegalDocumentPage.test.jsx
$env:NODE_OPTIONS='--max-old-space-size=6144'
npm.cmd run build
node scripts/check-time-capsule-production.cjs
```

The browser harness serves the actual production build at `http://127.0.0.1:4180`, launches a separate Chrome profile, and uses synthetic localStorage/IndexedDB fixtures. It never opens a personal browser profile. Its checkpoints and screenshots are saved under `artifacts/time-capsule-audio-activation/browser/`. Use `--resume` to skip suites that passed for the identical build and harness; use `--only=desktop`, `mobile`, `resilience`, `credits`, or `offline` for a particular suite.

For manual production inspection, run `node scripts/serve-time-capsule-production.cjs` and open `http://127.0.0.1:4180`. This localhost origin has its own app data. Create a synthetic capsule dated today, seal it, then explicitly open it; use Seal again for later for closing. The original approved audition remains available with `node scripts/preview-time-capsule.cjs` at `http://127.0.0.1:4174/recordings.html`.

## Device boundary

Desktop Chrome and a 390×844 Chrome viewport validate the production integration. Injected autoplay rejection exercises recovery code; it is not a physical Safari result. On an iPhone, check Safari and the installed PWA: inline opening/closing and sound sync, saved Settings volume and muted visuals, Skip and Reduced Motion, background/lock/resume without replay, offline first-use playback after installation, and the photo after opening and revisiting.

## Previous integration validation — historical, not this repair

The following results were recorded for the initial integration at `b965023`. They predate the reported physical-iPhone problems and the current repair; they do not validate these new changes.

- 108 relevant tests passed: capsule page/domain/media (36), player/audio (15), PWA (40), App/Home/Settings capsule cases (13), and approved asset integrity (4). Player tests passed again after the viewport scroll adjustment.
- The final production build passed (main.7c427805.js). Existing dependency missing-source-map notices from @zxing and the bundle-size advisory remain; no application lint errors remain.
- Four production browser suites passed against that build: desktop (1440?1000), mobile (390?844), playback recovery/interruption, and first-use offline. No browser exceptions were recorded.
- Actual native video playback retained 6.0 s opening and 5.4 s closing. The volume slider changed WebAudio gain; saved mute still allowed video. Persistence/privacy, explicit Open Capsule, reseal identity/history/reminders, user-audio pause, Skip/focus, photo display and revisit all passed.
- Reduced Motion mounted no video. Injected decoder/autoplay failures recovered safely. A paused clip with no ended event still released controls. Navigation paused the detached video, and simulated backgrounding returned to saved state without replay.
- A fresh worker cached all five capsule assets before the first detail view. With the HTTP server stopped and network disabled, reload, opening, photo, attribution, and both MP4 byte-range requests passed (206, bytes 0?63).
- Inspected desktop opening/vapor and separate closing lid/locking frames, mobile opening/closing contact, resting endpoints, the photo reveal, and static failure recovery. The body/camera stay consistent and the approved hinge/vapor remain intact. A small initial scroll keeps the complete caption and controls visible; film framing and timing are unchanged.

These browser checks use isolated Chrome profiles and synthetic content. They do not constitute physical-iPhone testing or a new listening approval. The approved film hashes are pinned in capsulePresentation.test.js. The complete functional run is preserved in artifacts/time-capsule-production-integration/browser/validated-results.json alongside its screenshots. The helper shutdown was subsequently bounded and checked independently with --check-cleanup, without repeating those functional suites. Functional-run browser fingerprint: 04e3e19e2aeba456bcf0fd235719b13af7bcd2f4b7e759f2c521fdaa0647ed12.

## Current repair validation

- All 17 relevant test files passed serially with a 4 GB heap and watch mode disabled (App/Home filtered to scoped cases). The initial run passed 11 unaffected suites; the corrected Page/player tests plus PWA, service-worker and backup suites passed 211 tests; scoped App/Home passed 15 tests. After the credits-only visual cleanup, Credits/LegalApp passed another 11 tests. Initial failures were test setup issues (React batching between confirmation clicks and an unsupported jsdom aspect-ratio matcher), corrected before rerunning the affected cases. Existing jsdom media-method/async-photo act warnings remain in test logs.
- Final production build passed with a 6 GB heap: main.783160e6.js and main.9bca8033.css. Existing @zxing missing-source-map, Node deprecation, and bundle-size advisories remain; no application lint errors remain. Approved media/endpoints/attribution are byte-unchanged, with asset integrity tests passing.
- Actual desktop (1440 x 1000), mobile (390 x 844), and resilience checks passed for the unchanged player. Video ended at media times 6.0 / 5.4 seconds; measured final holds were 809-858 ms. Play-call-to-ended wall time ranged from 5.459-7.003 seconds including startup/scheduling. Gesture probes recorded the same element before and after persistence, gain zero before persistence, and default/saved gain before success playback without slider interaction. Sounds-off remained muted. Explicit opening/privacy, initial seal/reseal, photos/revisits, no attachment autoplay, Skip, Reduced Motion, failed persistence/playback, stalled playback, and navigation/background cleanup passed.
- Presentation results are preserved in artifacts/time-capsule-audio-activation/browser/presentation-results.json: build main.86453a5a.js, fingerprint 20741392fe85dae976b186504f8268b19bce1efa58063d0b46f0c6a51188734c. A later rendering-only credits cleanup removed checkout audition instructions; the player and media did not change, so completed presentation checks were retained.
- Final-build credits checks passed at both viewports: all recording/source/license links retained, no developer audition commands, sticky safe-area Back control, Settings state/volume/scroll/focus restoration, browser Back, and separate external navigation. Wrapped source links required correcting the browser harness click point to a visible text rectangle; no product link defect was found.
- Final-build first-use offline checks passed in a fresh profile. All five capsule assets were cached before the first detail view. With the HTTP server stopped and network disabled, app reload, full opening and final hold (812.8 ms), IndexedDB photo, credits, and Back to Settings worked. Both cached MP4 byte-range requests returned HTTP 206 with the expected 64 bytes.
- Final credits/offline results: artifacts/time-capsule-audio-activation/browser/results.json, fingerprint 43b5bedd3b1337e0965b1e9acc88d8197483e87585738fb4d002ae73bd6d3aaa. final-build.json records the build hashes. No runtime browser exceptions were recorded, and isolated browser/server ports were closed after validation. Root inspected opening vapor, closing hinge/contact, endpoints, mobile credits scrolling and source-panel screenshots.

Logs and interruption checkpoints are under artifacts/time-capsule-audio-activation/. WebKit was unavailable; these are Chromium checks with synthetic data, not physical-iPhone audio activation or a new listening approval.

## Physical-iPhone retest

Check Safari and the installed PWA: initial opening and final seal/reseal taps play automatically at the saved level without slider interaction; sounds-off preserves visuals; unlocking/air release and closing impact/bolt/decay finish with a settled hold; Skip and Reduced Motion work; background/lock/resume does not replay; offline playback and photo revisits work; and Settings credits restores scroll/focus. Verify source links can be copied/opened and returning to Trace remains possible.

Chromium desktop/mobile emulation and injected autoplay rejection check layout/recovery, not physical-iPhone audio activation. Report any available WebKit browser checks separately from physical-device results.
