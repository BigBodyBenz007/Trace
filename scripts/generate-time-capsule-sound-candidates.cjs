const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;

function seededNoise(seed = 0x5eedc0de) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0xffffffff * 2 - 1;
  };
}

function envelope(time, start, end, attack = 0.02, release = 0.12) {
  if (time < start || time >= end) return 0;
  return Math.min(1, (time - start) / attack, (end - time) / release);
}

function addTone(samples, { start, end, from, to = from, volume, harmonics = [1], attack, release }) {
  let phase = 0;
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const last = Math.min(samples.length, Math.ceil(end * SAMPLE_RATE));
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE;
    const progress = (time - start) / (end - start);
    const frequency = from * Math.pow(to / from, Math.max(0, Math.min(1, progress)));
    phase += Math.PI * 2 * frequency / SAMPLE_RATE;
    const wave = harmonics.reduce((sum, harmonic, harmonicIndex) =>
      sum + Math.sin(phase * harmonic) / (harmonicIndex + 1), 0) / harmonics.length;
    samples[index] += wave * volume * envelope(time, start, end, attack, release);
  }
}

function addNoise(samples, random, { start, end, volume, attack = 0.02, release = 0.2, smoothing = 0.12 }) {
  let filtered = 0;
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const last = Math.min(samples.length, Math.ceil(end * SAMPLE_RATE));
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE;
    filtered += (random() - filtered) * smoothing;
    samples[index] += filtered * volume * envelope(time, start, end, attack, release);
  }
}

function addImpact(samples, random, start, volume, pitch = 58) {
  const end = start + 0.48;
  let phase = 0;
  for (let index = Math.floor(start * SAMPLE_RATE); index < Math.min(samples.length, Math.ceil(end * SAMPLE_RATE)); index += 1) {
    const time = index / SAMPLE_RATE - start;
    const decay = Math.exp(-time * 10);
    phase += Math.PI * 2 * (pitch * Math.exp(-time * 1.8)) / SAMPLE_RATE;
    samples[index] += (Math.sin(phase) * 0.78 + random() * 0.22) * volume * decay;
  }
}

function normalize(samples) {
  let peak = 0;
  samples.forEach((sample) => { peak = Math.max(peak, Math.abs(sample)); });
  const gain = peak > 0 ? 0.82 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
  return samples;
}

function openingCandidate() {
  const samples = new Float32Array(Math.ceil(3.25 * SAMPLE_RATE));
  const random = seededNoise(0x0a11ce);
  addTone(samples, { start: 0, end: 1.72, from: 48, to: 118, volume: 0.36, harmonics: [1, 2, 3], attack: 0.16, release: 0.26 });
  addTone(samples, { start: 0.08, end: 1.9, from: 97, to: 236, volume: 0.18, harmonics: [1, 2], attack: 0.22, release: 0.35 });
  [0.34, 0.62, 0.88].forEach((start, index) => {
    addTone(samples, { start, end: start + 0.095, from: 1480 - index * 170, to: 510, volume: 0.34, harmonics: [1, 2, 4], attack: 0.004, release: 0.075 });
  });
  addNoise(samples, random, { start: 1.02, end: 2.46, volume: 0.5, attack: 0.12, release: 0.52, smoothing: 0.3 });
  addTone(samples, { start: 1.3, end: 3.17, from: 154, to: 328, volume: 0.23, harmonics: [1, 2], attack: 0.38, release: 0.62 });
  addTone(samples, { start: 1.62, end: 2.95, from: 312, to: 418, volume: 0.1, harmonics: [1], attack: 0.35, release: 0.55 });
  return normalize(samples);
}

function closingCandidate() {
  const samples = new Float32Array(Math.ceil(2.65 * SAMPLE_RATE));
  const random = seededNoise(0xc105ed);
  addTone(samples, { start: 0, end: 1.46, from: 132, to: 43, volume: 0.38, harmonics: [1, 2, 3], attack: 0.1, release: 0.18 });
  addTone(samples, { start: 0.12, end: 1.52, from: 71, to: 36, volume: 0.26, harmonics: [1, 2], attack: 0.12, release: 0.2 });
  addNoise(samples, random, { start: 0.38, end: 1.54, volume: 0.3, attack: 0.2, release: 0.22, smoothing: 0.075 });
  addImpact(samples, random, 1.48, 0.82, 52);
  addTone(samples, { start: 1.9, end: 2.08, from: 930, to: 310, volume: 0.34, harmonics: [1, 2, 3], attack: 0.004, release: 0.13 });
  addTone(samples, { start: 2.13, end: 2.48, from: 73, to: 35, volume: 0.47, harmonics: [1, 2], attack: 0.006, release: 0.28 });
  addNoise(samples, random, { start: 2.12, end: 2.34, volume: 0.2, release: 0.18, smoothing: 0.16 });
  return normalize(samples);
}

function writeWave(filePath, samples) {
  const dataBytes = samples.length * 2;
  const output = Buffer.alloc(44 + dataBytes);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + dataBytes, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
}

const outputDirectory = path.resolve(__dirname, "../docs/time-capsule-sound-candidates");
writeWave(path.join(outputDirectory, "opening-candidate.wav"), openingCandidate());
writeWave(path.join(outputDirectory, "closing-candidate.wav"), closingCandidate());
console.log(`Wrote Time Capsule sound candidates to ${outputDirectory}`);
