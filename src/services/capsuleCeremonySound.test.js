import { prepareCapsuleCeremony, resetCapsuleCeremonyAudioForTests } from "./capsuleCeremonySound";

jest.mock("./capsulePresentation", () => ({ CAPSULE_PRESENTATION: {
  opening: { src: "open.mp4", poster: "closed.png", end: "opened.png", duration: 6 },
  sealing: { src: "close.mp4", poster: "opened.png", end: "closed.png", duration: 5.4 },
} }));

const node = extra => ({ connect: jest.fn(), disconnect: jest.fn(), ...extra });
function audioContext(state = "running") {
  const source = node();
  const gain = node({ gain: { value: 1 } });
  const context = {
    state, destination: {},
    resume: jest.fn(() => { context.state = "running"; return Promise.resolve(); }),
    createMediaElementSource: jest.fn(() => source), createGain: jest.fn(() => gain),
  };
  return { context, source, gain, window: { document, AudioContext: jest.fn(() => context) } };
}
let play;
let pause;
let controllers;
const prepare = (...args) => { const value = prepareCapsuleCeremony(...args); if (value) controllers.push(value); return value; };
const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

beforeEach(() => {
  jest.useFakeTimers();
  resetCapsuleCeremonyAudioForTests();
  controllers = [];
  play = jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  controllers.forEach(controller => controller.dispose());
  play.mockRestore(); pause.mockRestore(); jest.useRealTimers();
});

test("the initiating gesture primes the exact media element with zero gain before connect or play", async () => {
  const audio = audioContext("suspended");
  audio.source.connect.mockImplementation(() => expect(audio.gain.gain.value).toBe(0));
  audio.gain.connect.mockImplementation(() => expect(audio.gain.gain.value).toBe(0));
  play.mockImplementation(function () { expect(audio.gain.gain.value).toBe(0); return Promise.resolve(); });
  const prepared = prepare("opening", { sounds: true, volume: 0.67 }, audio.window);
  expect(audio.context.resume).toHaveBeenCalledTimes(1);
  expect(play).toHaveBeenCalledTimes(1); // Synchronous, before an awaited write.
  expect(play.mock.instances[0]).toBe(prepared.video);
  expect(prepared.video).toHaveAttribute("playsinline");
  expect(prepared.video.isConnected).toBe(false);
  await prepared.ready;
  expect(audio.gain.gain.value).toBe(0);
  expect(prepared.video.currentTime).toBe(0);
});

test("async context readiness is awaited and saved gain is applied before the first success playback", async () => {
  const audio = audioContext("suspended");
  let resume;
  audio.context.resume.mockImplementation(() => new Promise(resolve => { resume = () => { audio.context.state = "running"; resolve(); }; }));
  const prepared = prepare("sealing", { sounds: true, volume: 0.67 }, audio.window);
  const starting = prepared.start();
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  expect(audio.gain.gain.value).toBe(0);
  play.mockImplementation(function () {
    expect(this).toBe(prepared.video);
    expect(this.muted).toBe(false);
    expect(this.currentTime).toBe(0);
    expect(audio.gain.gain.value).toBe(0.67);
    return Promise.resolve();
  });
  resume();
  await expect(starting).resolves.toEqual({ blocked: false });
  expect(play).toHaveBeenCalledTimes(2);
  expect(audio.context.createMediaElementSource).toHaveBeenCalledTimes(1);
});

test("default level is applied without slider interaction and native volume is never forced to maximum", async () => {
  const audio = audioContext();
  const prepared = prepare("opening", {}, audio.window);
  prepared.video.volume = 0.4;
  await prepared.start();
  expect(audio.gain.gain.value).toBe(0.65);
  expect(prepared.video.volume).toBe(0.4);
});

test.each([{ sounds: false, volume: 0.67 }, { sounds: true, volume: 0 }])("disabled sound or zero saved volume remains silent throughout: %j", async options => {
  const audio = audioContext();
  play.mockImplementation(function () { expect(this.muted).toBe(true); return Promise.resolve(); });
  const prepared = prepare("sealing", options, audio.window);
  await prepared.start();
  expect(audio.window.AudioContext).not.toHaveBeenCalled();
  expect(prepared.video.muted).toBe(true);
});

test("without a safe gain route, priming is muted even if native volume would be ignored", async () => {
  play.mockImplementationOnce(function () { expect(this.muted).toBe(true); return Promise.resolve(); });
  const prepared = prepare("opening", { volume: 0.42 }, { document });
  await prepared.start();
  expect(prepared.video.volume).toBe(0.42);
});

test("failed persistence disposal never applies success gain or allows a late play to restart", async () => {
  const audio = audioContext();
  let prime;
  play.mockImplementationOnce(() => new Promise(resolve => { prime = resolve; }));
  const prepared = prepare("sealing", {}, audio.window);
  prepared.dispose();
  prime();
  await flush();
  await expect(prepared.start()).resolves.toEqual({ cancelled: true });
  expect(audio.gain.gain.value).toBe(0);
  expect(prepared.video.muted).toBe(true);
  expect(play).toHaveBeenCalledTimes(1);
  expect(audio.source.disconnect).toHaveBeenCalledTimes(1);
});

test("blocked success playback retries visuals muted once without another prompt", async () => {
  const audio = audioContext();
  const prepared = prepare("opening", {}, audio.window);
  await prepared.ready;
  play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
  await expect(prepared.start()).resolves.toEqual({ blocked: true });
  expect(play).toHaveBeenCalledTimes(3);
  expect(prepared.video.muted).toBe(true);
  expect(audio.gain.gain.value).toBe(0);
});

test("bounded preparation waits for resume but cannot hang forever", async () => {
  const audio = audioContext("suspended");
  audio.context.resume.mockImplementation(() => new Promise(() => {}));
  const prepared = prepare("opening", {}, audio.window);
  const starting = prepared.start();
  jest.advanceTimersByTime(4000);
  await expect(starting).resolves.toEqual({ blocked: true });
  expect(prepared.video.muted).toBe(true);
});

test("stop permits a StrictMode retry while duplicate starts share one lease", async () => {
  const audio = audioContext();
  const prepared = prepare("opening", {}, audio.window);
  prepared.stop();
  const one = prepared.start();
  const two = prepared.start();
  expect(one).toBe(two);
  await one;
  expect(play).toHaveBeenCalledTimes(2);
  prepared.stop();
  await prepared.start();
  expect(play).toHaveBeenCalledTimes(3);
  expect(audio.context.createMediaElementSource).toHaveBeenCalledTimes(1);
});

test("Reduced Motion does not prime media or request an audio context", () => {
  const audio = audioContext();
  expect(prepare("opening", { reducedMotion: true }, audio.window)).toBeNull();
  expect(play).not.toHaveBeenCalled();
  expect(audio.window.AudioContext).not.toHaveBeenCalled();
});
