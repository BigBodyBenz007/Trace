# Time Capsule motion and recorded-sound review

**Visual approval pending. Production integration is not approved.** The recorded sounds from `0eee79f` are approved and unchanged. This development-only preview combines a revised version of the existing 3D model, seam vapor and those recordings. It contains synthetic keepsakes only and does not import application code or read capsule data.

## Open the preview

Run this exact PowerShell command from any directory:

```powershell
node 'C:\Users\benma\Documents\Trace\scripts\preview-time-capsule.cjs'
```

Open **http://127.0.0.1:4174/recordings.html**. Leave Sound checked, leave Slow motion and Reduced Motion unchecked, and select **Open** or **Close**. Each button prepares the corresponding starting pose. Replay restarts the last sequence. Nothing plays automatically. Volume starts at 65% and applies only to this page session.

The server needs no npm install or production build. Stop it with Ctrl+C. If it is already running, use its URL. For optional phone review on the same local network, run with `--host 0.0.0.0` and replace `127.0.0.1` in the URL with this computer's local IPv4 address; Windows firewall/network access must allow the connection. Physical iPhone/Safari playback is not yet verified.

The silent live geometry inspector remains at http://127.0.0.1:4174/. Use its Light & pressure checkbox to inspect the geometry without effects. The pre-rendered page is the primary motion-and-sound review.

## What was inspected and changed

The original artwork, the production body/lid/closed PNGs, the rejected recording contact sheets, and the `1b874f4` model were inspected before this revision. The original PNGs have different proportions, front mechanisms and baked perspectives. The rejected opening crossfades two bodies; closing first lifts the detached lid before flattening/fading into another silhouette. Those images remain material references, not moving parts.

The existing model already supplied a stable body, hollow interior, shared rear hinge and separate timelines. Its prior small pressure effect came from a front vent; its material and movement were not approved. This revision retains that model and improves:

- Lid thickness, layered armor and surface variation, with a closer view of the gunmetal/brass construction.
- Shorter hinge leaves, two telescopic supports with attached ball joints, and actual hollow bolt-guide channels and lid sockets. The same opaque geometry remains present throughout.
- Warm interior and underside lighting, with synthetic paper keepsakes visible in the cavity.
- Vapor emitted at the front and side gasket seams. Its irregular alpha particles billow outward/upward and dissipate; the particles are depth-tested against the model and transparent at their texture boundaries.
- Timing driven by the approved sound cues. Closing accelerates into contact and then engages its locks; it has no vapor and does not reverse opening's lighting/unlock actions.

## Choreography and audio alignment

| Event | Opening time | Closing time |
| --- | --- | --- |
| Lock movement | Starts 0.12 s; prominent recording transient 0.223 s | Final dial turns 3.65–4.10 s |
| Bolt travel | 0.57–1.40 s; clears before lid movement | 3.615–3.89 s, after lid contact |
| Seal/contact | Narrow hinge crack begins 1.72 s | Physical lid contact 2.60 s |
| Air/vapor | Approved air begins 1.82 s; visible cloud builds and fades by 4.17 s | None |
| Main lid travel | 2.18–5.35 s to 102° | Starts 0.30 s, reaches contact at 2.60 s |
| Lock clunk | Recorded mechanical release at 1.455/1.522 s | First engagement at about 3.89 s |
| Full clip | 6.00 s | 5.40 s |

The approved opening WAV starts at video time zero. The closing WAV starts at 2.345 s: its impact attack at approximately 0.255 s therefore coincides with physical contact at 2.600 s. The later bolt/latch sounds retain their approved spacing. No pitch, speed, EQ, gain or choreography within either approved WAV was changed.

The MP4s contain H.264 video and an AAC transcode of the approved recording on **one media clock**, with silence around it where needed. This avoids independent sound timers drifting through stalls, seeks or pauses. Full source credits, license requirements, edit provenance and approved WAV hashes are in [audio-credits.md](audio-credits.md). The original audition page and all reference recordings remain unchanged elsewhere in the repository.

## Controls and interruption behavior

Open, Close, Replay, Stop, Skip, Pause/Resume, quarter-speed Slow motion, Reduced Motion, frame scrubbing, Sound and Volume are available. Only one clip can play. Repeated actions cancel stale loading/play requests.

Slow motion and frame inspection are muted, including Resume after scrubbing. Select Open, Close or Replay at normal speed to hear sound again. Reduced Motion immediately selects the relevant resting endpoint silently. Skip goes to the endpoint; Stop returns to the starting pose. Hiding/freezing/leaving the page pauses and mutes playback; returning never automatically resumes it. Back/forward-cache return restores one set of handlers.

Laptop hibernation is a pause, not cancellation. On resuming work, inspect `git status --short`, this document and `artifacts/time-capsule-combined-review/` before rerunning anything. Completed frames and diagnostic files are saved continuously. No personal recording frames are included in the committed preview.

## Render and review evidence

- [Opening MP4 with sound](recordings/open.mp4): 960×840, 30 fps, 180 frames, about 719 KB.
- [Closing MP4 with sound](recordings/close.mp4): 960×840, 30 fps, 162 frames, about 540 KB.
- [Opening decoded intermediate frames](recordings/open-frames.png).
- [Closing decoded intermediate frames](recordings/close-frames.png).
- [Closed without effects](recordings/closed-no-effects.png) and [open without effects](recordings/open-no-effects.png).
- `recordings/render-manifest.json`: model/timeline hashes, frame counts, audio offsets, approved-source hashes and clip hashes.

Each frame is rendered at its exact 1/30-second pose using the existing vendored Three.js scene. There is no image interpolation, generated video, endpoint crossfade or moving camera. FFmpeg packages these frames with the approved sound into MP4. The portable authoring tool was downloaded from [Gyan's build page](https://www.gyan.dev/ffmpeg/builds/), linked by [FFmpeg](https://ffmpeg.org/download.html), and verified against its published SHA-256. The executable stays in ignored local tooling and is not needed to play the preview.

For regeneration, run the preview server, then from the repository root:

```powershell
node scripts/render-time-capsule.cjs both
```

The renderer uses the local portable FFmpeg path when present. Another checkout can set `TRACE_PREVIEW_FFMPEG` to an installed executable, and `TRACE_PREVIEW_CHROME` if Chrome is elsewhere. `TRACE_PREVIEW_URL` can select another localhost preview port. Rendering writes each completed PNG into `artifacts/time-capsule-combined-review/frames-<source-fingerprint>/` before encoding; an interruption resumes saved frames. Complete videos replace prior exports only after successful encoding. The renderer refuses altered approved WAV hashes.

## Actual findings and limitations

The inspected decoded frames show the body and camera staying fixed, lid thickness and interior remaining consistent, and the hinge/support attachments staying connected. Closing reaches the rim before bolt engagement. The seam vapor is visible at 390×844, including during the early narrow opening, without a rectangular boundary. No ghosted lid, detached part or visible body/lid clipping was observed in the reviewed views. Both resting endpoints remain legible with the light/vapor disabled.

The appearance remains a simpler machined model. Its broad surfaces, weathering, brass and sculpted details do not fully match the rich original artwork. The vapor is an authored particle effect, not a fluid simulation; hinge/support movement is kinematic, not a rigid-body simulation. These remain visual-review limitations, not implied approval.

Offline rendering saved the final opening's 180 frames in about 40 seconds and the closing's 162 in 33 seconds, excluding encoding. This is why pre-rendered playback is used. The final Chrome playback test reported all frames displayed with zero drops. This is one desktop-browser observation, not evidence of live mobile rendering, physical iPhone performance, Safari behavior or thermal performance.

## Validation and scope

Passed for this revision:

- Seven focused Node motion tests: endpoints, monotonic hinge bounds, bolt/seal ordering, sound/contact alignment, no closing vapor, separate choreography and invalid/clamped inputs.
- Full FFmpeg decode of both MP4s; H.264/AAC, dimensions, 30 fps, exact frame counts and durations verified.
- Approved WAV hashes unchanged. Decoded AAC/source correlation exceeded 0.999 for both clips; recovered closing offset was 2.344989 s, and recovered gain differed by less than 0.3%. These are encoding/timing checks, not a listening review.
- Both clips played to completion in Chrome: 180/162 frames, zero reported drops, no uncaught browser errors.
- Repeated Open/Close/Replay/Stop, Skip, pause/resume, sound/volume, slow/scrub muting, manual/system Reduced Motion, hidden-page interruption, back/forward-cache cleanup/rebind, blocked-play recovery and session-only volume reset.
- Desktop 1200×1000 and mobile 390×844 layout checked. Mobile stage is 364×330 CSS pixels, with no horizontal overflow.
- Intermediate decoded frames and both effects-disabled endpoints visually inspected.
- Preview modules, renderer/helper/server syntax and Git whitespace checks. Preview URLs, MP4 byte ranges and repository/evidence isolation passed.

No production or shared app code, dependency, build configuration, approved sound source, capsule persistence, photo-loader ownership, settings, reminders, backups or media was changed. No production build or application-wide tests were needed. Passing checks do not establish visual quality. `trace-test-run.log` remains untouched and unstaged.

Stop here for the user's visual approval before any production ceremony integration.
