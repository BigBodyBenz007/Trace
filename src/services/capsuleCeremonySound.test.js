import { attachCapsuleCeremonyAudio, prepareCapsuleCeremonyAudio, resetCapsuleCeremonyAudioForTests } from "./capsuleCeremonySound";

const node = extra => ({ connect: jest.fn(), disconnect: jest.fn(), ...extra });
function context(state = "running") {
  const source = node();
  const gain = node({ gain: { value: 0 } });
  const value = {
    state, destination: {},
    resume: jest.fn(() => { value.state = "running"; return Promise.resolve(); }),
    createMediaElementSource: jest.fn(() => source),
    createGain: jest.fn(() => gain),
  };
  return { value, source, gain };
}

beforeEach(resetCapsuleCeremonyAudioForTests);

test("gesture preparation resumes audio silently and preserves disabled/unsupported preferences", async () => {
  const audio = context("suspended");
  const Context = jest.fn(() => audio.value);
  expect(prepareCapsuleCeremonyAudio(false, { AudioContext: Context })).toBeNull();
  expect(Context).not.toHaveBeenCalled();
  expect(prepareCapsuleCeremonyAudio(true, {})).toBeNull();
  const prepared = prepareCapsuleCeremonyAudio(true, { webkitAudioContext: Context });
  expect(audio.value.resume).toHaveBeenCalledTimes(1);
  expect(audio.value.createMediaElementSource).not.toHaveBeenCalled();
  await expect(prepared.ready).resolves.toBe(true);
});

test("video audio uses one source with a gain node, including StrictMode reconnect", () => {
  const audio = context();
  const media = { volume: 1 };
  const first = attachCapsuleCeremonyAudio(media, { context: audio.value });
  first.setVolume(0.65);
  expect(audio.gain.gain.value).toBe(0.65);
  expect(media.volume).toBe(1);
  expect(audio.source.connect).toHaveBeenCalledWith(audio.gain);
  expect(audio.gain.connect).toHaveBeenCalledWith(audio.value.destination);
  first.stop();
  const second = attachCapsuleCeremonyAudio(media, { context: audio.value });
  second.setVolume(0.2);
  first.stop();
  expect(audio.value.createMediaElementSource).toHaveBeenCalledTimes(1);
  expect(audio.gain.gain.value).toBe(0.2);
  second.stop();
  expect(audio.gain.gain.value).toBe(0);
  expect(audio.source.disconnect).toHaveBeenCalledTimes(2);
});

test("native volume remains available without WebAudio and clamps input", () => {
  const media = { volume: 1 };
  const controller = attachCapsuleCeremonyAudio(media, null);
  controller.setVolume(0.4);
  expect(media.volume).toBe(0.4);
  controller.setVolume(10);
  expect(media.volume).toBe(1);
  controller.setVolume(-1);
  expect(media.volume).toBe(0);
  controller.stop();
  controller.setVolume(0.5);
  expect(media.volume).toBe(0);
});

test("blocked or interrupted contexts can be resumed by a new sound gesture", async () => {
  const audio = context("interrupted");
  audio.value.resume.mockRejectedValueOnce(Error("Audio blocked"));
  const prepared = prepareCapsuleCeremonyAudio(true, { AudioContext: jest.fn(() => audio.value) });
  await expect(prepared.ready).resolves.toBe(false);
  const controller = attachCapsuleCeremonyAudio({}, prepared);
  expect(controller.isReady()).toBe(false);
  await expect(controller.resumeFromGesture()).resolves.toBe(true);
  expect(controller.isReady()).toBe(true);
});

test("an unavailable audio output reports muted recovery without throwing away the video", async () => {
  const audio = context();
  audio.source.connect.mockImplementation(() => { throw Error("Output unavailable"); });
  const controller = attachCapsuleCeremonyAudio({}, { context: audio.value });
  expect(controller.isReady()).toBe(false);
  await expect(controller.resumeFromGesture()).resolves.toBe(false);
  expect(() => controller.stop()).not.toThrow();
});
