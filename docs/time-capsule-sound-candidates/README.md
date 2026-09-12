# Time Capsule sound candidates — physical mechanics revision

Development audition only. These are original procedural sounds authored for Trace,
not recordings or third-party samples. The complete deterministic source is
`scripts/generate-time-capsule-sound-candidates.cjs`. No sample licences or external
downloads are required. Production sounds and saved preferences are unchanged.

Open `docs/time-capsule-sound-preview.html` directly in a browser. No server or build
is needed. The page starts silent, has separate Play buttons and native audio
controls, and allows only one candidate to play at a time. Stop, page hiding and
navigation stop playback. The 65% initial volume is local to this page session.

## Separate designs

- **Opening, 4.20 seconds:** loaded collar friction and irregular pawl contacts
  (0.12–1.48 s); two bolts slide and strike their stops (1.49–2.32 s); a small
  release, then pressurized air breaking the seal (2.37–3.95 s).
- **Closing, 2.35 seconds:** a heavy plate impact at 0.18 s with a short, damped
  metallic ring; a separate lock slide around 1.02 s and locking clunk at 1.25 s,
  followed by a quiet detent. The rest is natural decay and a silent tail.

The old rising tones and fast descending pitch sweeps are removed. Metal contacts
use fixed inharmonic resonances, broadband contact noise and independent exponential
decays. Movement uses filtered friction noise and irregular mechanical contacts;
air uses fixed-band noise with a pressure envelope. No oscillator pitch glides,
chirps, beeps, melody, reverse playback or external audio assets are used.

These are standalone sound-design candidates, not synchronized animation tracks.
They must be auditioned and approved before any future production integration.

## Levels and regeneration

Both files are mono, 44.1 kHz, 16-bit PCM WAV. Peak limits leave at least 6 dB of
digital headroom; dynamics are retained without compression or hard clipping.
Device volume still determines listening loudness.

| Candidate | Sample peak | Whole-file RMS |
| --- | --- | --- |
| Opening | −6.75 dBFS | −26.58 dBFS |
| Closing | −6.02 dBFS | −29.03 dBFS |

From the repository root:

```powershell
node scripts/generate-time-capsule-sound-candidates.cjs
Start-Process .\docs\time-capsule-sound-preview.html
```

Generation prints duration, PCM format, peak, RMS and DC offset. It changes only
these two candidate WAV files. Re-running with the same source produces identical
bytes. It does not import application code, persist preferences or invoke audio.

## Validation

The following focused checks passed for this revision:

- RIFF/PCM structure, durations, finite samples, peak limits, negligible DC, silent
  edges and byte-identical regeneration.
- Direct file loading in Chrome and both candidates playing to completion.
- No autoplay; clean replay; rapid Play/Stop changes; one player at a time using
  either buttons or native controls; volume reset after reload.
- Playback rejection feedback and recovery, hidden-page/navigation cleanup,
  no uncaught browser errors, and no horizontal overflow at 390 px.
- Generator/preview script syntax, whitespace, and production isolation.

No application-wide build or tests were needed: production source, preferences,
capsule behavior and the motion prototype were not edited. Diagnostics remain in
ignored `artifacts/time-capsule-sound-review/` for interruption-safe recovery.

The authoring environment cannot directly hear audio, so no subjective listening
approval is claimed. User listening approval remains pending.
