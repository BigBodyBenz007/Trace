# Time Capsule motion study — awaiting visual approval

This is an isolated development preview using synthetic content. The replacement
must receive the user's visual approval before production integration. Functional
checks establish mechanical and control correctness; they do not establish visual
quality. Both sequences have now been rendered, played, and inspected at intermediate
frames. User visual approval is still pending.

## Recoverable status and scope

- Work is saved in this preview directory and the dedicated preview/test scripts.
  After an interruption, inspect `git status --short` and this document before
  continuing. A closed laptop lid or lost connection is a pause, not cancellation.
- The production ceremony, production imports, capsule persistence, opening dates,
  reminders, resealing history, media, backups, sound preferences, and food search
  are outside this prototype's scope and remain unchanged.
- The session-shared media loader's object-URL ownership and cleanup fix remains
  intact. Future integration must retain persist-before-reveal, duplicate-action
  protection, playback cleanup, and failure recovery.
- No replacement sound candidates are integrated. Review motion first; review
  opening and closing audio against approved motion later.
- `trace-test-run.log` is unrelated and must remain untouched and unstaged.

## Why the existing image approach cannot work

The source artwork provides the desired gunmetal, brass, and warm interior material
reference, but the three PNGs are not corresponding parts of one physical vault:

- `src/assets/time-capsule/vault-closed.png` is 1400 × 700. It shows a shallow shell
  without feet, a broad split front dial, and a different arrangement of mechanisms.
- `vault-body.png` is 1200 × 800. Its taller body has circular side hubs, brass feet,
  two large front latch bars, and a smaller inset dial. Crossfading between these
  images changes the object's silhouette and construction.
- `vault-lid.png` is 1200 × 800. Its lit underside and perspective are already baked
  into the artwork, with barrel-like fittings along both top and bottom edges.
  A flat image cannot reveal correct outer surfaces, changing thickness, or changing
  lighting as it rotates.
- In `src/index.css`, the shared 3:2 stage and `object-fit: contain` frame the 2:1
  closed image differently. The lid uses a canvas-based `50% 70%` transform origin,
  independent vertical translation, nonuniform scaling, rotation, and opacity.
  At the open endpoint, its apparent lower hinge sits around 47% of stage height;
  the body's rear rim sits around 20%. Layer ordering hides the separation.
- Existing closing keyframes first lift the lid from `translateY(-25%)` to `-42%`,
  then flatten and fade it into the different closed artwork. Changing duration,
  smoke, or glow cannot repair this geometry.

No matching source mesh, Blender scene, or layered material artwork was found in
the repository. The PNGs are therefore references rather than animated parts.

The supplied 6.33-second opening recording was sampled across its timeline: around
2.46 seconds the closed shell becomes translucent while the different open body
appears; the lid rises and then drops back toward the rim. The adjacent 7.27-second
closing recording from the same session shows the lid rising around 2.62-3.43
seconds, then the body morphing around 4.04-4.44 seconds. These observations agree
with the asset and CSS audit. Personal recording frames remain local and ignored.

## Rendering approach

The preview uses a consistently modeled browser-rendered 3D vault with vendored
Three.js 0.180.0 (MIT). It has a fixed camera, stable body, a solid lid with thickness
and an underside, and a shared physical hinge. The same geometry remains present
throughout both sequences; there are no endpoint image swaps or fading lids.
Gunmetal surfaces, brass mechanisms, and restrained warm interior lighting interpret
the source art. Synthetic contents keep the preview independent of user data.

`motion.mjs` samples the choreography independently of rendering:

- **Open — 7.6 seconds:** dial unlocks, bolts retract, valve releases pressure while
  the lid is seated, then the lid rises to 102 degrees. Light follows the opening gap.
- **Close — 6.4 seconds:** a brief hold, controlled descent to seven degrees, slower
  seating without rebound, bolt engagement after full contact, and a final dial lock.
  Closing has its own timeline rather than reversed opening keyframes.

The review interface includes separate Open, Close, Replay, and Slow motion controls,
plus Reduced Motion and Skip. Both resting endpoints can be inspected without motion.

The primary review page is now **coherent pre-rendered playback**. The live WebGL
inspector was too slow on this laptop's Intel UHD 600 (ANGLE / Direct3D11), so it
cannot establish smooth mobile rendering. Both review clips render every exact
1/30-second pose from the same model and encode it with WebCodecs VP9. There is no
frame interpolation. They use the same fixed 960 x 720 camera framing and include
half-second endpoint holds. Opening contains 258 frames (about 8.6 seconds), closing
222 frames (about 7.4 seconds). Both clips are silent.

The source model uses physical metal/roughness shading with procedural surface
textures and environment lighting; see the official
[Three.js material documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html).
Dependencies are vendored and do not change the production dependency tree.

## Run locally

From PowerShell in `C:\Users\benma\Documents\Trace`:

```powershell
node scripts/preview-time-capsule.cjs
```

Open <http://127.0.0.1:4174/recordings.html> for the rendered review, or
<http://127.0.0.1:4174/> for the live 3D inspector, including the effects toggle.
This standalone server does not add the preview to the production app or normal
navigation. It needs no npm installation or live CDN connection. Stop it with `Ctrl+C`.

For optional testing from a phone on the same local network:

```powershell
node scripts/preview-time-capsule.cjs --host 0.0.0.0
```

Open `http://YOUR-PC-LOCAL-IP:4174/recordings.html` on the phone, replacing `YOUR-PC-LOCAL-IP` with
the computer's local IPv4 address. Windows network/firewall settings must permit
that connection. The default command only needs localhost.

Focused motion checks:

```powershell
node --test scripts/time-capsule-motion.test.cjs
```

## Limitations to review honestly

- This is a simpler machined interpretation of the original sculpted, weathered
  artwork. It does not reproduce that artwork's exact shape or material richness.
- The live inspector requires WebGL2 and performed below 10 fps in the initial
  headless capture on this laptop. It is a geometry inspection tool, not an approved
  real-time mobile implementation. Use the rendered review for motion pacing.
- The rendered review requires a browser that can decode VP9 WebM. Chrome playback
  was checked; physical iPhone/Safari compatibility remains untested.
- Pressure accents are supporting effects, not fluid simulation.
- Hinge motion uses authored kinematic curves rather than rigid-body simulation.
- Real phone GPU performance and thermal behavior are not yet verified. Browser
  viewport emulation cannot establish those results.
- The motion is silent for this approval round.

## Local visual evidence

The distributable synthetic clips and evidence are in `recordings/`:

- [Opening clip](recordings/open.webm) and [closing clip](recordings/close.webm).
- [Opening intermediate frames](recordings/open-frames.png) and
  [closing intermediate frames](recordings/close-frames.png).
- [Open without effects](recordings/open-no-effects.png) and
  [closed without effects](recordings/closed-no-effects.png).

Additional diagnostics and local capture tooling remain under ignored
`artifacts/time-capsule-motion/`. Personal source recordings and their extracted
frames are not distributed or staged. Local `record-offline.cjs` can regenerate
either clip from the inspector's deterministic `capsulePreview.seek()` hook; its
WebM muxer is a pinned local scratch dependency. Model and timeline source are
preserved in `vault.mjs` and `motion.mjs`.

## Validation — 2026-09-11

- Six focused Node choreography tests passed; preview modules and server passed
  syntax checks. No application-wide test/build was run because production and
  shared application code are unchanged.
- Live inspector: 142 sampled poses retained the same body matrix, hinge origin,
  and camera. Open, Close, Replay, Skip, slow motion, manual and system Reduced
  Motion passed. The resume lifecycle was checked to leave only one animation-frame
  chain. Hinge bearing and leaf clearances were corrected during review.
- Rendered player: Open, Close, Replay, Skip, quarter speed, Reduced Motion, rapid
  sequence changes, scrubbing, and decoding passed browser checks.
- Normal playback: opening played all 258 frames with zero dropped frames in
  8.67 seconds; closing played all 222 with zero drops in 7.44 seconds. These are
  playback observations, not live-rendering or physical-phone performance claims.
  An initial fixed nine-second wait was too short for startup; the final check
  waited for the actual media-ended event with a stall timeout.
- Both rendered sequences and eight encoded intermediate frames per sequence were
  visually inspected. The body is stable, the lid stays attached, and closing
  settles before bolt engagement. No ghosted lid, morphing silhouette, or endpoint
  replacement was observed. The opening vent is deliberately subtle.
- Both effects-disabled endpoints were rendered and inspected. Geometry remains
  legible; the material/detail gap to the original artwork is still visible.
- Both pages fit a 390 x 844 viewport without horizontal overflow. Physical phone
  playback, GPU performance, and thermal behavior remain unverified.
- The preview server served only its allowlisted files and rejected repository
  paths and traversal. Production `src/`, `public/`, package manifests, and lockfile
  match the starting commit. The shared photo URL ownership fix remains untouched.
- User visual approval: pending. Stop before production integration.

Do not use passing tests as evidence that the animation looks convincing.
