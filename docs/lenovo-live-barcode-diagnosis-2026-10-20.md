# Lenovo live-barcode diagnosis — 2026-10-20

Starting HEAD: `3bc6b77d426c30a0045eb84c1e91e5d628ecdc3b`.
The preceding local API proxy and current-video-dimensions repairs were already
uncommitted at the start of this task and remain preserved.

## User-confirmed behavior

- Microsoft Edge on Lenovo displays live camera video without recognizing
  `044000045586`.
- Manual lookup now works locally.
- Scan from Photo recognizes Teddy Grahams from a phone/existing image.
  That image is not evidence that the Lenovo webcam can resolve the barcode.

## Physical-camera observations and limits

An isolated Edge session used the real `navigator.mediaDevices` camera, with no
fake-device flag or synthetic stream override during acquisition. No camera
images were saved or transmitted; only technical measurements were recorded.

- Camera: `EasyCamera (0bda:5627)`, the only enumerated video input.
- Negotiated/exposed maximum: 640×480 at 30 fps, despite Trace's existing
  1920×1080 ideal request. This is what this browser session exposed, not a
  universal assertion about the hardware or every driver configuration.
- No focus mode/distance or zoom controls were advertised.
- Four samples had advancing media time and nonblank pixels. Sampled luminance
  spanned 0–255; average luminance was 92. These global statistics do not prove
  that barcode bars are sharp or adequately resolved.
- The live reader continued attempting decoding without reporting errors.
  Four measured decode calls took 1209, 1069, 463 and 1134 ms. Frame processing
  is therefore substantially slower than the configured 180 ms retry delay
  alone might suggest. These are local measurements, not general benchmarks.
- No target placement was coordinated for those measurements. The bounded
  same-frame photo comparison did not finish within its five-second budget.
  It must not be reported as a completed photo-decoding failure.

The user subsequently confirmed the barcode was in Trace's preview. A second
isolated capture then failed with `NotReadableError: Device in use`, before
any decoding attempt. It could not obtain the frame while the existing Trace
session held the camera. This is a diagnostic-session limitation, not proof
that Trace's normal single-session scanner fails for that reason.

An earlier diagnostic probe also reached its own abort deadline before frame
measurement; its ended/zero-dimension video does not demonstrate an application
startup defect.

**Physical recognition of the target barcode remains unverified.** Resolution,
focus, motion, glare and target framing remain possible contributors. Upscaling
does not recover barcode detail absent from a webcam frame.

## Reproduced software defect and correction

The live and photo routes use the same ZXing reader, but different bounded
preprocessing passes. Before this correction, live passes were:

1. Straight, ordinary contrast.
2. Straight, ordinary contrast again.
3. Rotated 90°, ordinary contrast.
4. Rotated −15°, ordinary contrast.
5. Rotated +15°, enhanced contrast.

The photo path also offers enhanced contrast at 0°. A deterministic, generated
640×480 image encoding the actual UPC `044000045586`, with 18-pixel-high bars
at grayscale 112 on a 128 background, reproduced the mismatch in Edge:

- All five live passes: `NotFoundException`.
- The exact same image through Scan from Photo's actual decoder: `found`,
  `044000045586`.
- The unrotated contrast-enhanced pixels decode with the real ZXing reader.

Contrast was only paired with a rotation that crosses outside short bars.
This demonstrated a live-only coverage gap; it does not establish that the
Lenovo's actual target frame had those properties.

The second straight live pass now applies the existing contrast transform.
All five angles, attempt delays, supported formats, current-video-dimensions
handling and cleanup remain. No scanner rewrite, UI change, new dependency,
network request, scoring change or storage change was introduced.

## One physical retest

1. Use the local development app, since nothing has been deployed. Refresh it
   normally after the code update. Close other camera apps/tabs; use only one
   Trace scanner session.
2. Open Nutrition → Scan Barcode. Hold `044000045586` horizontally with every
   bar and both white margins visible. Adjust distance until the bars look
   sharp rather than filling the preview with a blurred close-up.
3. Keep the same position for about ten seconds, allowing the slower webcam
   decoder to reach the straight contrast pass. Success means the live scan
   itself opens Teddy Grahams review, without manual or photo input.
4. Stop the camera after the test. If it fails, report the result and visible
   error, if any. Neither the synthetic regression nor the earlier phone image
   substitutes for this physical result.

No storage clearing, PWA reinstall, restore, commit, push or deployment is needed.

## Validation and files

This task changes only `src/services/barcodeDecoder.js`, its existing test file,
and this report.

- 125 tests passed across eight focused suites: decoder, browser/native camera
  adapter, photo decoding, scanner controls/manual selection, ingredient
  disclosure, remote lookup, the development proxy and production CommonJS
  compatibility. The real-reader tests cover UPC-A `044000045586`, equivalent
  EAN-13 `0044000045586` and nonzero-leading EAN-13, including low-contrast pixels.
- The exact failing image was retested in isolated Edge against a fresh targeted
  decoder bundle: the second live pass now returns `044000045586`; the photo
  decoder still returns the same identifier. No full app build was run.
- Changed-file lint: zero errors/warnings. Syntax and whitespace checks passed.
- The supported angles, canvas cleanup, current-video resize correction and
  previous proxy remain covered. Scoring, layout, food logging and saved-record
  source files are unchanged; production grading gates remain unchanged.

Ignored probes/results and the interruption-safe baseline are under
`artifacts/lenovo-live-camera-20261020/`.

## User acceptance and approved release checkpoint

The user subsequently confirmed that live scanning works in Chrome on the
Lenovo, Scan from Photo works, and manual lookup works locally and in
production. This is user-confirmed physical Chrome acceptance; the earlier
unverified observations above describe the investigation at that time.

Edge live scanning remains unreliable. These repairs do not establish an Edge
hardware/driver diagnosis or universal recognition reliability. Edge's
longstanding photo-storage warning is separate; no photo-storage or browser-data
change is included.

The user has approved committing and pushing only the combined scanner/decoder,
local API proxy, associated tests and two repair reports. The uncommitted
nutrition-grading changes remain outside this checkpoint. Release validation
and deployment evidence are kept separately under
`artifacts/barcode-scanner-release-20261020/`.
