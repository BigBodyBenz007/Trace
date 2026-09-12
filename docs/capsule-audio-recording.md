# Recording audio in Time Capsules

In the draft editor, choose **Record audio**, allow microphone access, and use **Stop** to finish. Trace shows a recording indicator and elapsed time. The completed take is checked, saved, and presented with native playback controls. Playback never starts automatically.

**Keep recording** adds the take to the capsule's labeled Audio recording cards. **Record again** and **Discard recording** require confirmation. **Choose audio file** remains an alternative, including when browser recording is unavailable; its input has no capture attribute.

The microphone is requested only after a recording gesture. Starting recording pauses competing capsule playback. Recording completion, cancellation, errors, editor exit, and lifecycle interruption release microphone tracks. Permission, hardware, format, and storage failures provide recovery messages and preserve existing draft content.

## Limits and preservation

- New recordings stop automatically at five minutes or the available size budget, whichever comes first. Existing limits remain three audio attachments, 20 MiB per audio file, and 100 MiB combined capsule media. Available device storage can lower the recording budget further.
- Existing upload limits remain unchanged: up to 12 photos with 48 MiB prepared photo data, one video up to 75 MiB, and the audio/combined limits above. The five-minute limit applies to newly recorded takes.
- A take is described as saved only after its blob and pending draft reference are persisted. It can then be reviewed after navigation or reload. Keeping it promotes the existing reference without duplicating the blob.
- Failed persistence retains the validated file in the current App session for **Retry saving recording**. Voluntary editor navigation is blocked until the take is saved or discarded. Session-only files do not survive a reload or process termination.
- Recording or an unresolved take blocks sealing and attachment changes. Draft text stays editable. Back waits for recording finalization and persistence; an ongoing Keep or Discard action must finish before leaving.

Backgrounding, screen lock, and editor unmount attempt to finalize and save through the existing lifecycle adapter. This is best-effort recovery: an abrupt operating-system kill can lose unfinished audio or interrupt saving. Encoded chunks are bounded in memory and assembled into one complete container; individual chunks are not treated as playable recovery files.

## Browser and storage implementation

`capsuleAudioRecorder` uses runtime `MediaRecorder.isTypeSupported` and playback capability checks to choose MP4, WebM, or Ogg where supported. The output's actual MIME type determines its filename extension. The complete recording must decode into a usable audio track before ingestion. Browser capability detection does not establish physical-iPhone compatibility.

The existing draft format gains an optional `timeCapsuleDraft.pendingRecording` audio reference. The blob uses existing capsule media storage and draft ownership. Shared draft-media scans include the pending reference for backup, restore, retention, and cleanup. No new top-level storage domain or backup schema version is introduced. Backup integrity is checked before normalization, and transactional restore and legacy compatibility remain in place. Session-only retry files are not durable backup content.

The recorder revokes only its own temporary preview URLs. Persisted previews use the shared media URL loader and playback registry. Ownership checks protect retained or shared media during discard and replacement.

Backup restore invalidates earlier recording callbacks and waits for pending media writes to finish before replacing data. Recording writes stay blocked during restore; a failed restore retains any session-only retry file.

## Physical iPhone checklist

Run on a physical iPhone in both Safari and the installed PWA, recording the iOS/browser versions. This checklist describes manual validation still needed; it is not a claim that those checks passed.

1. Grant, deny, and dismiss microphone permission. Verify clear recovery guidance and the file-upload alternative.
2. Record speech, stop, preview, keep, seal, open, and play it. Confirm no autoplay and separate labeled audio cards.
3. Cancel replacement/discard confirmations, then confirm them. Check that existing text and attachments remain intact.
4. Stop a take and reload before keeping it. Verify restored playback; export and restore a backup containing that pending take.
5. While recording, navigate away, switch apps, and lock the screen. Verify the microphone indicator stops and any successfully saved take returns for review. Do not expect recovery after forcibly terminating unfinished recording.
6. Check five-minute stopping, full attachment limits, and storage-error retry. Confirm sealing remains blocked while review or recovery is unresolved.
7. After Trace is loaded and microphone permission is granted, go offline and repeat record, preview, save, and review. Check controls and native playback at the phone's normal viewport size.

## Validation on September 12, 2026

356 affected tests across 16 suites passed, run serially without watch mode with a 4 GB heap. Coverage includes recorder lifecycle and limits, editor/App flows, pending storage and cleanup, backup integrity/rollback, shared URLs, and existing capsule ceremony behavior. The production build passed with a 6 GB heap; existing dependency source-map, Node deprecation, and bundle-size warnings remain.

The production build passed Chromium checks at 1440×1000 and 390×844 using its synthetic WAV microphone with the real MediaRecorder and decoder. It produced playable MP4/M4A recordings and passed pending reload, same-blob Keep, replacement/discard confirmation, offline recording after permission, synthetic background finalization, sealing/opening/playback, 44px recorder controls, and overflow checks. Desktop and mobile screenshots were inspected.

The installed Windows WebKit build exposes no MediaRecorder. Its unsupported state and available audio-file input were checked at both sizes; recording could not be exercised there. Synthetic Chromium capture and lifecycle events do not verify a physical iPhone microphone, installed PWA, or lock-screen behavior. The checklist above remains necessary.

Local validation logs, browser script/results, and screenshots are in the ignored `artifacts/capsule-audio-20260912` directory.
