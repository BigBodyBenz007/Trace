import { MEBIBYTE } from "./photoIngestion";

export const CAPSULE_MEDIA_POLICY = Object.freeze({
  maxAudio: 3,
  maxAudioBytes: 20 * MEBIBYTE,
  maxVideo: 1,
  maxVideoBytes: 75 * MEBIBYTE,
  maxCombinedBytes: 100 * MEBIBYTE,
  validationTimeoutMs: 8000,
});

const MIME_BY_EXTENSION = Object.freeze({
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav",
  oga: "audio/ogg", ogg: "audio/ogg", weba: "audio/webm",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm",
});

function inferredMime(file) {
  const declared = String(file?.type || "").toLowerCase();
  if (/^(audio|video)\/[a-z0-9.+-]+$/.test(declared)) return declared;
  const extension = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return MIME_BY_EXTENSION[extension] || "";
}

function kindForMime(mimeType) {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

export class CapsuleMediaError extends Error {
  constructor(message, code = "capsule-media-invalid") {
    super(message);
    this.name = "CapsuleMediaError";
    this.code = code;
  }
}

function browserProbe(file, mimeType, timeoutMs) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return Promise.resolve({ durationMs: undefined });
  }
  return new Promise((resolve, reject) => {
    const element = document.createElement(mimeType.startsWith("video/") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      element.removeAttribute("src");
      element.load?.();
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve({ durationMs: Number.isFinite(element.duration) ? Math.round(element.duration * 1000) : undefined });
    };
    const timer = setTimeout(() => finish(new CapsuleMediaError("This media file took too long to validate.", "media-timeout")), timeoutMs);
    element.preload = "metadata";
    element.onloadedmetadata = () => finish();
    element.onerror = () => finish(new CapsuleMediaError("This browser could not read or play the selected media file.", "media-unreadable"));
    element.src = url;
  });
}

export async function prepareCapsuleMediaFiles(files, existing = [], {
  policy = CAPSULE_MEDIA_POLICY,
  probe = browserProbe,
} = {}) {
  const selected = Array.from(files || []);
  const existingAudio = existing.filter(({ kind }) => kind === "audio").length;
  const existingVideo = existing.filter(({ kind }) => kind === "video").length;
  const existingBytes = existing.reduce((total, item) => total + (Number(item.bytes) || 0), 0);
  const prepared = [];

  for (const file of selected) {
    if (!(file instanceof Blob)) throw new CapsuleMediaError("Choose a valid audio or video file.");
    const mimeType = inferredMime(file);
    const kind = kindForMime(mimeType);
    if (!kind) throw new CapsuleMediaError("Choose a supported audio or video file.", "unsupported-media");
    const sameKind = prepared.filter((item) => item.kind === kind).length;
    if (kind === "audio" && existingAudio + sameKind >= policy.maxAudio) throw new CapsuleMediaError(`Each capsule can contain up to ${policy.maxAudio} audio files.`, "audio-count-limit");
    if (kind === "video" && existingVideo + sameKind >= policy.maxVideo) throw new CapsuleMediaError(`Each capsule can contain ${policy.maxVideo} video file.`, "video-count-limit");
    const limit = kind === "audio" ? policy.maxAudioBytes : policy.maxVideoBytes;
    if (file.size > limit) throw new CapsuleMediaError(`${file.name || "This file"} exceeds the ${limit / MEBIBYTE} MiB ${kind} limit.`, `${kind}-size-limit`);
    if (existingBytes + prepared.reduce((sum, item) => sum + item.bytes, 0) + file.size > policy.maxCombinedBytes) {
      throw new CapsuleMediaError("Capsule attachments cannot exceed 100 MiB combined.", "combined-size-limit");
    }
    const metadata = await probe(file, mimeType, policy.validationTimeoutMs);
    prepared.push({
      blob: file,
      kind,
      name: String(file.name || `Capsule ${kind}`),
      mimeType,
      bytes: file.size,
      ...(metadata?.durationMs === undefined ? {} : { durationMs: metadata.durationMs }),
    });
  }
  return prepared;
}
