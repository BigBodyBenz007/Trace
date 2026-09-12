# Time Capsule audition: recorded mechanics

Development candidates, pending listening approval. This revision replaces the rejected synthesis with edits of real location recordings. The audition page and this folder are isolated from production audio, saved preferences and capsule logic.

Open from PowerShell (no server or build):

```powershell
Start-Process 'C:\Users\benma\Documents\Trace\docs\time-capsule-sound-preview.html'
```

The first two players are the finished candidates. The five source players below them contain the complete, unedited downloaded recordings. All seven share Stop and a session-only volume control. Playback stops when the page is hidden.

## Source provenance and reuse

The four prison recordings are by **Robert Thomas (RobertMThomas)**, recorded at the abandoned Shoreditch Police Station in London in summer 2011 with a Zoom H1. Their creator pages identify them as his recordings and license them under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The compressor recording is by **Flares.fr**, recorded in a garage with a Zoom H1, and dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

| Local reference | Original title and creator page | License | Used in |
| --- | --- | --- | --- |
| `sources/prison-door-slam.mp3` | [Prison Locks and Doors 2 Door slam.wav](https://freesound.org/people/RobertMThomas/sounds/151133/) — RobertMThomas | CC BY 4.0 | Closing impact and decay |
| `sources/prison-lock-movement.mp3` | [Prison Locks and Doors 5 Lock movement.wav](https://freesound.org/people/RobertMThomas/sounds/151142/) — RobertMThomas | CC BY 4.0 | Opening lock |
| `sources/prison-latch-slide.mp3` | [Prison Locks and Doors 19 Latch sliding sound.wav](https://freesound.org/people/RobertMThomas/sounds/151134/) — RobertMThomas | CC BY 4.0 | Opening bolts, closing bolt travel |
| `sources/prison-latch.mp3` | [Prison Locks and Doors 30 Latch sound.wav](https://freesound.org/people/RobertMThomas/sounds/151123/) — RobertMThomas | CC BY 4.0 | Opening release, closing engagement |
| `sources/compressor-air.mp3` | [Air pressure from compressor](https://freesound.org/people/Flares.fr/sounds/524260/) — Flares.fr | CC0 1.0 | Opening pressure release |

**Acquisition limitation:** these are Freesound's publicly downloadable HQ MP3 previews, retained byte-for-byte, not the creators' original WAV masters. The masters require a Freesound login and were not obtained. The MP3 transcodes include the full recording, including unused lead-in/tail and air bursts. Their original titles retain “.wav” in credits even though the downloaded files are MP3.

`sources.json` records the exact creator pages, download URLs, license links, acquisition date, lengths, SHA-256 hashes and decoded PCM metadata. No movie/game extracts, proprietary demo audio, noncommercial-only samples or synthesized layers are used.

**Required attribution when redistributing:** retain Robert Thomas's credit, the four source links, the CC BY 4.0 link and notice of modifications. Credit his recordings in both candidates. Changes by Trace: MP3 decoding, stereo averaging to mono, trimming, fixed equalization, gain adjustment, fades and arrangement/layering. CC BY 4.0 permits commercial adaptation and redistribution; do not imply creator endorsement or impose restrictions on the licensed material. CC0 does not require attribution; the Flares.fr credit is retained for provenance. Keep these notices with any later distribution of the candidates. No production integration is approved.

## Separate edits

- **Opening, 4.40 s:** lock movement at 0.12 s, recorded latch/bolt travel at 0.57 s, release at 1.43 s, compressor air from 1.82 s. The air uses source seconds 3.90–6.25: the sustained release, excluding intermittent short bursts. Its final 0.95 s fades down. No procedural noise or crackle is added.
- **Closing, 2.75 s:** door motion starts at 0.07 s; the recorded slam peaks around 0.26 s and retains its own short decay. Bolt travel begins at 1.27 s, with a separate latch engagement at 1.53 s. It is a separate edit, not reversed opening.

Recorded pitch and speed are unchanged. Fixed high-pass filters remove low rumble; fixed low-pass filters reduce sharp upper metal frequencies. No oscillator, pitch sweep, bass enhancement, artificial reverb or replacement ring is added. Gain balances the separate latch with the door. Final attenuation limits sample peaks to −6 dBFS without compression or clipping. Mono provides one consistent channel for playback; phone-speaker listening remains unverified.

The exports are mono 44.1 kHz / 16-bit PCM WAV. `render-report.json` contains exact levels and output hashes. Whole-file RMS is about −31.2 dBFS for each, including pauses and tails; perceived loudness still needs audition on the intended devices.

## Editing and recovery

`edit-recipe.json` is the complete source-time/timeline/gain/EQ/fade map. `edit-recordings.cjs` applies that map to decoded 44.1 kHz mono float32 little-endian PCM files named `<source-id>.f32`. It verifies the unchanged MP3 source hashes and writes only the two candidates and `render-report.json`. The committed references and edit map allow further editing without redownloading anything.

For this render, Chrome Web Audio `decodeAudioData` resampled each MP3 to 44.1 kHz, and the two channels were averaged equally. Decoded PCM and browser diagnostics are saved in ignored `artifacts/time-capsule-recording-review/` for interruption recovery. If those files still exist, reproduce the edit from the repository root with:

```powershell
node docs/time-capsule-sound-candidates/edit-recordings.cjs artifacts/time-capsule-recording-review
```

For another checkout, decode the five MP3 references to the specified PCM format with an audio editor or decoder first. Use an equal arithmetic stereo average, not a louder equal-power downmix. Decoder/resampler differences can change output bytes; the manifest records the PCM hashes used here.

The older `scripts/generate-time-capsule-sound-candidates.cjs` is the **rejected synthesis generator**. It is preserved outside this task's edit scope. Do not run it for these candidates: it would overwrite them with the rejected sounds.

## Review boundary

Validated for this revision: all seven local files loaded and played to completion in Chrome; source hashes and PCM WAV headers/durations/peaks/DC/silent edges passed; the same decoded PCM reproduced byte-identical exports. Stop, replay, native-control exclusivity, rapid switching, session-volume reset, hidden-page/navigation cleanup and playback-error recovery passed. No uncaught browser errors or horizontal overflow at 390 px. Script syntax and Git whitespace checks passed. Diagnostics are in the ignored recovery directory above. No production source was changed, so no application-wide build/test run was needed.

Technical validation covers file integrity, decoding, playback completion and page controls. It does not establish that these sound substantial, smooth or convincing. This authoring environment cannot directly hear audio. Compare the finished edits with the unchanged sources on the audition page; listening approval remains with the user. Production audio and motion are unchanged.
