# Barcode camera and localhost lookup repair — 2026-10-20

## Scope and evidence

Starting HEAD: `3bc6b77d426c30a0045eb84c1e91e5d628ecdc3b`.
Existing uncommitted grading work and unrelated files are preserved.
No storage changes, record migrations, dependency installation, commit, push,
or deployment are part of this repair.

The user reports a live camera preview without recognition in Microsoft Edge
on their Lenovo, both locally and on the deployed website. Physical-camera
recognition has not yet been independently verified after this repair.

### Local lookup: confirmed cause

Before editing, `POST http://localhost:3000/api/nutrition/barcode` with
`044000045586` returned HTTP 404 and HTML (`Cannot POST ...`), rather than
the gateway's JSON. CRA does not run Vercel's file-based API functions and
this checkout had no development proxy.

The deployed endpoint returned HTTP 200, `found`, Open Food Facts,
`Teddy Grahams · Graham Snacks`. The equivalent EAN-13 `0044000045586`
also returned the product. These were actual public product lookups, not
invented product/nutrient fixtures.

`src/setupProxy.js` registers only `/api/nutrition/barcode` with CRA's existing
`http-proxy-middleware` dependency. It forwards to the existing HTTPS deployment
with certificate verification, strips localhost cookies/authorization, and
returns an unavailable result on connection failure. Other routes and the
Vercel function/configuration are unchanged. Local/user/cache precedence is
unchanged; the browser still requests its same-origin endpoint only when needed.
Restart `npm start` to load this server-side setup file.

### Camera: reproduced defect; physical cause still qualified

Before editing, the real ZXing decoder recognized generated bars encoding
`044000045586` from steady-resolution video, blank-then-barcode video, 90-degree
and 15-degree rotated video, and selected PNG images. Native `BarcodeDetector`
was unavailable in that Chrome session; ZXing still worked. An isolated browser
also recognized the barcode through the unchanged deployed app and reached its
real product review. This rules out a universal decoder initialization or
UPC-A failure, but does not measure the Lenovo webcam's focus or image quality.

A resolution-change test did reproduce silent failure: a live stream initially
360×600 resized to 900×600 after scanning began. ZXing 0.2.1 creates its capture
canvas once (`BrowserCodeReader.scan/createCaptureCanvas`) and draws subsequent
frames at their natural size into that original canvas. The larger frame is
clipped. Trace's existing transforms then process that clipped canvas.
The barcode remained unrecognized despite the live preview; the same full frame
decoded directly and as a photo.

Live readers now take their pixels and dimensions directly from the current
video element before the existing bounded rotation/contrast pass. ZXing's scan
loop, cancellation, supported formats, 1920×1080 ideal request, optional continuous
focus, photo path, manual entry, and camera UI remain unchanged.

This fixes the demonstrated resize defect. It is **not confirmation** that
resolution changes caused the user's Lenovo failure. A physical Edge retest is
still required; fixed-focus webcams, small bars, blur, glare, or other device
conditions remain possible causes.

## Local verification

1. Stop the existing CRA development server with Ctrl+C, then run `npm start`
   from the Trace directory. The proxy loads only at server startup.
2. Open `http://localhost:3000`, Nutrition → Scan Barcode. Manually look up
   `044000045586`, then `0044000045586`; both should show Teddy Grahams.
3. Try the same printed UPC with the rear/selected camera. Keep all bars and
   white margins visible, in even light. With a fixed-focus laptop webcam,
   try farther away instead of filling the frame with a blurred close-up.
4. If recognition still fails, try Scan from Photo with a sharp image of that
   same barcode. Report whether it succeeds and any visible camera error.
5. Close the scanner, leave/reopen Nutrition, and repeat; also test Stop/Start
   and a camera-device change if more than one device is available.

No existing browser profile, storage, service worker, or user records need to
be cleared. HTTPS/localhost camera permissions and network access to the
existing deployment remain required. Native iOS scanning is unchanged.

## Validation

Results:

- 199 distinct focused tests pass across 13 suites, covering decoder/camera,
  photos, scanner review, ingredient disclosure, lookup precedence/gateway,
  Nutrition handoff/serving precision, development grading gates, and the prior
  production CommonJS repair. The first run had a new test mock reset failure
  (test setup corrected) and an unchanged Nutrition UI wait timeout (passed on
  rerunning that full suite). No Nutrition implementation changes were made.
- Isolated Edge with a targeted, minified production-mode decoder bundle
  recognizes steady, blank-then-visible, angled and rotated UPC video, including
  the formerly failing resolution-change case; photos also decode. Rotation
  required a longer observation window than the initial 1.8-second check.
  This was not a full application production build or physical-camera test.
- The actual development proxy middleware returns HTTP 200 and the real Teddy
  Grahams result for both UPC-A/EAN-13 representations; an unrelated route stays
  unproxied. This runs on a temporary local server. The already-running CRA
  process still needs restarting to load its new setup file.
- Changed-file ESLint: zero errors and zero warnings. All five JavaScript files
  pass syntax checks; changed/new files pass whitespace checks.
- Node 24 emits a nonfatal `util._extend` deprecation from the existing proxy
  dependency. No dependency changes were needed.

Ignored reproducible probes and raw results are under
`artifacts/barcode-camera-local-repair-20261020/`. The browser probes use new
isolated Chrome profiles and synthetic video/images, never the user's camera
or stored archive. Physical Edge/iPhone acceptance remains manual.
