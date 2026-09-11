import { MEBIBYTE } from "./photoIngestion";
import { CapsuleMediaError, prepareCapsuleMediaFiles } from "./capsuleMedia";

const file = (name, type, size = 4) => new File([new Uint8Array(size)], name, { type });
test("accepts playable audio and video and infers missing MIME from extension", async () => {
  const probe = jest.fn().mockResolvedValue({ durationMs: 1234 });
  const result = await prepareCapsuleMediaFiles([
    file("voice.m4a", ""), file("clip.mp4", "video/mp4"),
  ], [], { probe });
  expect(result.map(({ kind, mimeType, durationMs }) => [kind, mimeType, durationMs])).toEqual([
    ["audio", "audio/mp4", 1234], ["video", "video/mp4", 1234],
  ]);
});

test("rejects count, individual size, combined size, and unreadable media", async () => {
  const probe = jest.fn().mockResolvedValue({ durationMs: 1234 });
  await expect(prepareCapsuleMediaFiles([file("fourth.mp3", "audio/mpeg")], [
    { kind: "audio", bytes: 1 }, { kind: "audio", bytes: 1 }, { kind: "audio", bytes: 1 },
  ], { probe })).rejects.toMatchObject({ code: "audio-count-limit" });
  await expect(prepareCapsuleMediaFiles([file("large.mp3", "audio/mpeg", 20 * MEBIBYTE + 1)], [], { probe })).rejects.toMatchObject({ code: "audio-size-limit" });
  await expect(prepareCapsuleMediaFiles([file("clip.mp4", "video/mp4", 2)], [{ kind: "photo", bytes: 100 * MEBIBYTE - 1 }], { probe })).rejects.toMatchObject({ code: "combined-size-limit" });
  await expect(prepareCapsuleMediaFiles([file("bad.bin", "")], [], { probe })).rejects.toBeInstanceOf(CapsuleMediaError);
});
