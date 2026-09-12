# Approved Time Capsule presentation

The user approved the combined presentation at `178f8ed` (“That’s perfect”). Production uses those MP4 files unchanged: opening is 6 seconds, closing is 5.4 seconds. The fixed camera, modeled vault, opening vapor, lighting, and synchronized recorded sound are baked into each film. There is no runtime 3D renderer, synthesized sound, layered-image hinge, or separate audio scheduler.

`src/assets/time-capsule/ceremony-open.mp4` and `ceremony-close.mp4` are byte-identical copies of the approved preview. `vault-opened.png` is decoded opening frame 179; `vault-sealed.png` is decoded closing frame 161. Both retain the full 960×840 camera frame. Detail, Timeline, archive, Reduced Motion, and failure recovery use these matching endpoints. Existing source recordings and editing provenance remain under `docs/time-capsule-sound-candidates/`; the bundled recording credits are linked from capsule details.

## Lifecycle

- Open, seal, and reseal still await their existing persistence callbacks. Opening contents stay absent while persistence or the ceremony is active. Home’s Open now only navigates.
- A gesture resumes browser audio silently before persistence. The film then supplies both picture and audio on one media clock. WebAudio gain applies the approved preview’s initial 65% playback volume; the local slider never writes saved settings. Capsule sounds off always allows muted visual playback. Browsers that block audible playback retry muted and offer Enable sound.
- Skip, completion, navigation, backgrounding, pagehide, and freeze stop playback. A time-progress check and bounded stall/deadline recovery work independently of `ended`. Failure shows the saved endpoint with Continue and also releases automatically. Reduced Motion shows the silent endpoint for 500 ms.
- An operation completed in the background reconciles its saved state without replaying. Navigation invalidates the old presentation. Returning to an opened capsule does not replay it.
- The existing shared media loader retains URL ownership. Capsule media elements pause on cleanup without revoking session-owned photo URLs.
- Service worker v4 precaches app JS/CSS, the two films, two endpoints, and attribution from CRA’s asset manifest. It supports cached MP4 byte ranges, avoids caching partial network responses, and keeps static-file navigation from replacing the cached app shell. Other theme artwork remains cached on use.

## Reproduce production checks

From the repository in PowerShell:

```powershell
$env:CI='true'
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/components/TimeCapsulesPage.test.jsx src/components/TimeCapsuleCeremony.test.jsx src/services/capsuleCeremonySound.test.js src/services/capsulePresentation.test.js src/services/timeCapsule.test.js src/services/capsuleMedia.test.js src/serviceWorkerOffline.test.js src/pwaAssets.test.js
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/App.test.js src/components/HomePage.test.jsx src/components/SettingsPage.test.jsx --testNamePattern='capsule|Capsule|reseal|opening|Open now'
npm.cmd run build
node scripts/check-time-capsule-production.cjs
```

The browser harness serves the actual production build at `http://127.0.0.1:4180`, launches a separate Chrome profile, and uses synthetic localStorage/IndexedDB fixtures. It never opens a personal browser profile. Its checkpoints and screenshots are saved under `artifacts/time-capsule-production-integration/browser/`. Use `--resume` to skip suites that passed for the identical build and harness; use `--only=desktop`, `mobile`, `resilience`, or `offline` for a particular suite.

For manual production inspection, run `node scripts/serve-time-capsule-production.cjs` and open `http://127.0.0.1:4180`. This localhost origin has its own app data. Create a synthetic capsule dated today, seal it, then explicitly open it; use Seal again for later for closing. The original approved audition remains available with `node scripts/preview-time-capsule.cjs` at `http://127.0.0.1:4174/recordings.html`.

## Device boundary

Desktop Chrome and a 390×844 Chrome viewport validate the production integration. Injected autoplay rejection exercises recovery code; it is not a physical Safari result. On an iPhone, check Safari and the installed PWA: inline opening/closing and sound sync, muted visuals and volume/Enable sound, Skip and Reduced Motion, background/lock/resume without replay, offline first-use playback after installation, and the photo after opening and revisiting.

## Completed validation

- 108 relevant tests passed: capsule page/domain/media (36), player/audio (15), PWA (40), App/Home/Settings capsule cases (13), and approved asset integrity (4). Player tests passed again after the viewport scroll adjustment.
- The final production build passed (main.7c427805.js). Existing dependency missing-source-map notices from @zxing and the bundle-size advisory remain; no application lint errors remain.
- Four production browser suites passed against that build: desktop (1440?1000), mobile (390?844), playback recovery/interruption, and first-use offline. No browser exceptions were recorded.
- Actual native video playback retained 6.0 s opening and 5.4 s closing. The volume slider changed WebAudio gain; saved mute still allowed video. Persistence/privacy, explicit Open Capsule, reseal identity/history/reminders, user-audio pause, Skip/focus, photo display and revisit all passed.
- Reduced Motion mounted no video. Injected decoder/autoplay failures recovered safely. A paused clip with no ended event still released controls. Navigation paused the detached video, and simulated backgrounding returned to saved state without replay.
- A fresh worker cached all five capsule assets before the first detail view. With the HTTP server stopped and network disabled, reload, opening, photo, attribution, and both MP4 byte-range requests passed (206, bytes 0?63).
- Inspected desktop opening/vapor and separate closing lid/locking frames, mobile opening/closing contact, resting endpoints, the photo reveal, and static failure recovery. The body/camera stay consistent and the approved hinge/vapor remain intact. A small initial scroll keeps the complete caption and controls visible; film framing and timing are unchanged.

These browser checks use isolated Chrome profiles and synthetic content. They do not constitute physical-iPhone testing or a new listening approval. The approved film hashes are pinned in capsulePresentation.test.js. The complete functional run is preserved in artifacts/time-capsule-production-integration/browser/validated-results.json alongside its screenshots. The helper shutdown was subsequently bounded and checked independently with --check-cleanup, without repeating those functional suites. Functional-run browser fingerprint: 04e3e19e2aeba456bcf0fd235719b13af7bcd2f4b7e759f2c521fdaa0647ed12.
