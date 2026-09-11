import {
  playCapsuleCeremonySound,
  prepareCapsuleCeremonyAudio,
  resetCapsuleCeremonyAudioForTests,
} from "./capsuleCeremonySound";

function audioNode(extra = {}) {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    ...extra,
  };
}

function context({ state = "running" } = {}) {
  const oscillators = [];
  const sources = [];
  const gains = [];
  const value = {
    state,
    currentTime: 10,
    sampleRate: 20,
    destination: audioNode(),
    resume: jest.fn(() => { value.state = "running"; return Promise.resolve(); }),
    createGain: jest.fn(() => {
      const node = audioNode({ gain: {
        value: 0,
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      } });
      gains.push(node); return node;
    }),
    createOscillator: jest.fn(() => {
      const node = audioNode({
        frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        type: "sine",
      });
      oscillators.push(node); return node;
    }),
    createBiquadFilter: jest.fn(() => audioNode({ frequency: { value: 0 }, type: "lowpass" })),
    createBuffer: jest.fn((channels, length) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: jest.fn(() => { const node = audioNode({ buffer: null }); sources.push(node); return node; }),
  };
  return { value, oscillators, sources, gains };
}

beforeEach(() => resetCapsuleCeremonyAudioForTests());

test("prepares audio silently from a user gesture and safely handles disabled or unsupported sound", async () => {
  expect(prepareCapsuleCeremonyAudio(true, {})).toBeNull();
  const suspended = context({ state: "suspended" });
  const prepared = prepareCapsuleCeremonyAudio(true, { AudioContext: jest.fn(() => suspended.value) });
  expect(suspended.value.resume).toHaveBeenCalledTimes(1);
  expect(suspended.value.createOscillator).not.toHaveBeenCalled();
  await expect(prepared.ready).resolves.toBe(true);
  expect(prepareCapsuleCeremonyAudio(false, { AudioContext: jest.fn() })).toBeNull();
});

test("opening and sealing use distinct layered schedules only after successful playback is requested", async () => {
  const opening = context();
  const openingController = await playCapsuleCeremonySound("opening", { context: opening.value, ready: Promise.resolve(true) });
  expect(opening.oscillators).toHaveLength(5);
  expect(opening.sources).toHaveLength(1);

  const sealing = context();
  const sealingController = await playCapsuleCeremonySound("sealing", { context: sealing.value, ready: Promise.resolve(true) });
  expect(sealing.oscillators).toHaveLength(4);
  expect(sealing.sources).toHaveLength(2);
  expect(opening.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(62, expect.any(Number));
  expect(sealing.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(126, expect.any(Number));

  openingController.stop();
  sealingController.stop();
  expect(opening.oscillators.every(({ stop }) => stop.mock.calls.length > 0)).toBe(true);
  expect(sealing.oscillators.every(({ stop }) => stop.mock.calls.length > 0)).toBe(true);
});

test("blocked playback remains silent without surfacing an error", async () => {
  const blocked = context({ state: "suspended" });
  const controller = await playCapsuleCeremonySound("opening", { context: blocked.value, ready: Promise.resolve(false) });
  expect(blocked.value.createGain).not.toHaveBeenCalled();
  expect(() => controller.stop()).not.toThrow();
});
