# Trace photo and backup safety policy

This document describes the policy applied to newly selected Memory and Workout photos. The authoritative constants are `PHOTO_INGESTION_POLICY` in `src/services/photoIngestion.js` and `PHOTO_STORAGE_SAFETY_POLICY` in `src/services/photoStorageSafety.js`.

Existing saved photos and legacy migrations are not recompressed during startup, migration, backup, or restore.

## New-photo limits

| Policy | Default | Reason |
| --- | ---: | --- |
| Photos per Memory or Workout | 12 | Keeps one entry usable on ordinary mobile browsers while allowing a meaningful set of memories. |
| Preserve original at or below | 6 MiB and 4096 px longest edge | Typical already-compressed phone photos remain byte-for-byte unchanged. Every file is still decoded once to reject corrupt content. |
| Maximum selected source photo | 30 MiB | Rejects unusually large inputs before a potentially dangerous decode. |
| Maximum source picker batch | 90 MiB | Bounds one ingestion operation before decoding begins. |
| Maximum prepared photo | 10 MiB | Prevents one new IndexedDB blob from dominating local storage. |
| Maximum prepared draft selection | 48 MiB | Bounds the new photo payload attached during one entry-editing session. |
| Maximum stored longest edge | 4096 px | Retains high-resolution long-term viewing and print utility without keeping full 48-megapixel dimensions. Images are never upscaled. |
| JPEG/WebP quality | 0.90 | High-quality output intended for personal memories. Dimension reduction, not aggressive quality reduction, handles files that remain too large. |

The picker rejects the whole selection when a count or byte limit is exceeded; it never silently truncates the list. If any selected file is unsupported, corrupt, or cannot be safely processed, the whole operation fails before object URLs or saved records are created.

JPEG orientation is applied while decoding and baked into optimized pixels. PNG remains PNG, and WebP remains WebP when the browser supports that encoder, preserving alpha-capable output. Other browser-decodable formats may be converted to JPEG only when optimization is required, and the UI reports that optimization occurred.

## Storage safety

Immediately before a new photo write, Trace uses `navigator.storage.estimate()` when available. It requires the prepared bytes plus 15 percent write overhead and 5 MiB of remaining headroom. An estimate that clearly cannot accommodate the write blocks it before IndexedDB mutation. Missing, malformed, or rejected quota APIs do not block an otherwise valid save because browsers do not consistently expose these APIs.

Trace also calls `navigator.storage.persist()` on a best-effort basis. A rejection or unsupported API never turns a valid save into a failure. IndexedDB writes remain transactional, and the existing metadata-write rollback removes newly staged blobs if structured storage fails.

## Backup safety

Backup size estimation includes UTF-8 structured data, base64 expansion of every stored photo, photo metadata, and integrity-manifest overhead. The Backup page displays that estimate and recalculates it before export. Archives estimated at 128 MiB or more require an explicit large-backup confirmation.

When Chromium exposes trustworthy JavaScript heap figures, Trace rejects an export that clearly lacks enough working memory before photo base64 construction. Browsers without that nonstandard signal continue safely; destination free space cannot be known before the browser download/share sheet takes control.

The export path encodes photos sequentially and assembles JSON as Blob parts. It avoids the prior combination of simultaneous photo buffers, a complete backup object, a deep validation clone, and a second full-payload `JSON.stringify`. The archive format, structured digest, per-photo SHA-256 digests, validation, and transactional restore behavior are unchanged.
