// Original, deterministic sound design for the development audition page only.
// No recordings, third-party samples, oscillator glides, or production imports.
const fs = require("node:fs");
const path = require("node:path");

const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000 * 2 - 1;
  };
}

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

function mix(target, source, start, gain = 1) {
  const offset = Math.round(start * SAMPLE_RATE);
  for (let i = 0; i < source.length && offset + i < target.length; i += 1) {
    if (offset + i >= 0) target[offset + i] += source[i] * gain;
  }
}

// Fixed filters colour contact noise; their cutoffs never sweep during an event.
function bandNoise(length, random, lowHz, highHz) {
  const samples = new Float64Array(length);
  const lowCoefficient = 1 - Math.exp(-TAU * lowHz / SAMPLE_RATE);
  const highCoefficient = 1 - Math.exp(-TAU * highHz / SAMPLE_RATE);
  let low = 0, high = 0;
  for (let i = 0; i < length; i += 1) {
    const white = random();
    high += highCoefficient * (white - high);
    low += lowCoefficient * (white - low);
    samples[i] = high - low;
  }
  return samples;
}

// A struck housing: an initial broadband contact plus fixed, inharmonic modes.
// Each mode dies independently. There is no changing oscillator frequency.
function metalContact({ duration, modes, random, bite = 0.35, body = 0.3, damping = 1 }) {
  const samples = new Float64Array(Math.ceil(duration * SAMPLE_RATE));
  const contact = bandNoise(samples.length, random, 700, 6900);
  const mass = bandNoise(samples.length, random, 38, 390);
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const attack = 1 - Math.exp(-t / 0.0008);
    let resonance = 0;
    for (const [hz, amplitude, decay] of modes) {
      resonance += amplitude * Math.sin(TAU * hz * t) * Math.exp(-t / (decay * damping));
    }
    const tail = smooth((duration - t) / 0.045);
    samples[i] = attack * tail * (
      resonance + bite * contact[i] * Math.exp(-t / 0.009)
      + body * mass[i] * Math.exp(-t / 0.058)
    );
  }
  return samples;
}

// Irregular surface contacts suggest moving teeth and sliding metal.
// Amplitude follows contact pressure, without a pitched motor or servo tone.
function friction({ duration, random, lowHz = 130, highHz = 2200, gain = 1 }) {
  const samples = bandNoise(Math.ceil(duration * SAMPLE_RATE), random, lowHz, highHz);
  let contactPressure = 0.5;
  let nextPressure = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    if (i >= nextPressure) {
      contactPressure = 0.3 + (random() + 1) * 0.28;
      nextPressure = i + Math.round((0.008 + (random() + 1) * 0.016) * SAMPLE_RATE);
    }
    const contour = smooth(t / 0.045) * smooth((duration - t) / 0.075);
    samples[i] *= gain * contour * contactPressure;
  }
  return samples;
}

const BOLT_MODES = [
  [83, 0.3, 0.043], [179, 0.19, 0.036], [367, 0.12, 0.027],
  [791, 0.065, 0.019], [1579, 0.027, 0.009],
];
const PAWL_MODES = [[283, 0.05, 0.012], [671, 0.034, 0.009], [1439, 0.017, 0.005]];

function openingCandidate() {
  const samples = new Float64Array(Math.ceil(4.2 * SAMPLE_RATE));
  const random = seededNoise(0x72a9e103);

  // A geared collar turns against a load; irregular pawl contacts remain in
  // the friction bed rather than becoming foreground electronic pips.
  mix(samples, metalContact({ duration: 0.15, random, modes: BOLT_MODES, bite: 0.25, body: 0.2 }), 0.12, 0.36);
  mix(samples, friction({ duration: 1.3, random, lowHz: 110, highHz: 1900, gain: 0.3 }), 0.18);
  const teeth = [0.25, 0.36, 0.48, 0.63, 0.77, 0.88, 1.06, 1.23, 1.39];
  teeth.forEach((start, index) => {
    mix(samples, metalContact({ duration: 0.065, random, modes: PAWL_MODES, bite: 0.18, body: 0.07 }), start, index % 3 === 0 ? 0.83 : 0.55);
  });

  // Two independent bolts slide into their housing and meet different stops.
  mix(samples, friction({ duration: 0.27, random, lowHz: 170, highHz: 2750, gain: 0.42 }), 1.49);
  mix(samples, metalContact({ duration: 0.27, random, modes: BOLT_MODES, bite: 0.5, body: 0.7 }), 1.74, 0.65);
  mix(samples, friction({ duration: 0.23, random, lowHz: 130, highHz: 2400, gain: 0.36 }), 1.85);
  mix(samples, metalContact({ duration: 0.26, random, modes: BOLT_MODES, bite: 0.4, body: 0.8, damping: 0.83 }), 2.06, 0.53);
  mix(samples, metalContact({ duration: 0.19, random, modes: PAWL_MODES, bite: 0.35, body: 0.3 }), 2.31, 0.64);

  // The seal breaks: broad air noise, fast pressure onset and dissipating tail.
  // Fixed filter bands; no whistle, chirp or pitch movement.
  const air = bandNoise(Math.ceil(1.58 * SAMPLE_RATE), random, 240, 5700);
  const turbulence = bandNoise(air.length, random, 45, 510);
  let flutter = 0;
  for (let i = 0; i < air.length; i += 1) {
    const t = i / SAMPLE_RATE;
    flutter += 0.0015 * (random() - flutter);
    const pressure = smooth(t / 0.055) * Math.exp(-t / 0.42) * smooth((1.58 - t) / 0.35);
    air[i] = (air[i] * 0.9 + turbulence[i] * 0.7) * pressure * (0.88 + flutter * 0.4);
  }
  mix(samples, air, 2.37);
  return master(samples, 0.46);
}

function closingCandidate() {
  const samples = new Float64Array(Math.ceil(2.35 * SAMPLE_RATE));
  const random = seededNoise(0x913c5e27);
  // A heavy plate contacts its frame. Inharmonic modes give metal colour;
  // high modes die sooner than the low, damped mass of the lid.
  const lidModes = [
    [71, 0.33, 0.072], [133, 0.27, 0.10], [227, 0.24, 0.15],
    [361, 0.20, 0.19], [569, 0.14, 0.145], [811, 0.10, 0.12],
    [1187, 0.075, 0.092], [1699, 0.045, 0.07], [2381, 0.032, 0.045],
    [3299, 0.017, 0.027], [4723, 0.009, 0.017],
  ];
  mix(samples, metalContact({ duration: 0.92, random, modes: lidModes, bite: 1.45, body: 1.5 }), 0.18);
  // Damped secondary contacts belong to the impact, rather than an echo effect.
  mix(samples, metalContact({ duration: 0.15, random, modes: BOLT_MODES, bite: 0.3, body: 0.4 }), 0.199, 0.17);
  mix(samples, metalContact({ duration: 0.12, random, modes: BOLT_MODES, bite: 0.2, body: 0.3 }), 0.223, 0.08);

  // A distinct, lower, drier locking clunk after the lid has seated and rung.
  mix(samples, friction({ duration: 0.19, random, lowHz: 120, highHz: 1900, gain: 0.32 }), 1.02);
  mix(samples, metalContact({ duration: 0.32, random, modes: BOLT_MODES, bite: 0.75, body: 1.4 }), 1.25, 1.3);
  mix(samples, metalContact({ duration: 0.14, random, modes: PAWL_MODES, bite: 0.4, body: 0.2 }), 1.326, 0.75);
  return master(samples, 0.5);
}

function master(samples, peakLimit) {
  // Remove subsonic/DC content and leave at least 6 dB peak headroom.
  // No compressor, loudness maximizer, hard clipping or reverb wash.
  const coefficient = Math.exp(-TAU * 24 / SAMPLE_RATE);
  let previousInput = 0, previousOutput = 0, peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const input = samples[i];
    const output = coefficient * (previousOutput + input - previousInput);
    previousInput = input; previousOutput = output;
    samples[i] = output * smooth(i / (SAMPLE_RATE * 0.008))
      * smooth((samples.length - 1 - i) / (SAMPLE_RATE * 0.08));
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const gain = peak > 0 ? peakLimit / peak : 1;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
  return samples;
}

function writeWave(filePath, samples) {
  const dataBytes = samples.length * 2;
  const output = Buffer.alloc(44 + dataBytes);
  output.write("RIFF", 0); output.writeUInt32LE(36 + dataBytes, 4);
  output.write("WAVEfmt ", 8); output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20); output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24); output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32); output.writeUInt16LE(16, 34);
  output.write("data", 36); output.writeUInt32LE(dataBytes, 40);
  let peak = 0, power = 0, mean = 0;
  for (let i = 0; i < samples.length; i += 1) {
    if (!Number.isFinite(samples[i]) || Math.abs(samples[i]) > 0.501) throw Error("Invalid or over-level audio sample");
    const pcm = Math.round(samples[i] * 32767);
    output.writeInt16LE(pcm, 44 + i * 2);
    const sample = pcm / 32768;
    peak = Math.max(peak, Math.abs(sample)); power += sample * sample; mean += sample;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
  return { file: path.basename(filePath), seconds: samples.length / SAMPLE_RATE,
    peakDbfs: +(20 * Math.log10(peak)).toFixed(2), rmsDbfs: +(10 * Math.log10(power / samples.length)).toFixed(2),
    dcOffset: +(mean / samples.length).toFixed(7), sampleRate: SAMPLE_RATE, channels: 1, bits: 16 };
}

if (require.main === module) {
  const outputDirectory = path.resolve(__dirname, "../docs/time-capsule-sound-candidates");
  console.log(JSON.stringify([
    writeWave(path.join(outputDirectory, "opening-candidate.wav"), openingCandidate()),
    writeWave(path.join(outputDirectory, "closing-candidate.wav"), closingCandidate()),
  ], null, 2));
}
module.exports = { SAMPLE_RATE, openingCandidate, closingCandidate, writeWave };
