// Sample editing only. Input: 44.1 kHz mono float32 LE PCM decoded from sources.json.
// Usage: node docs/time-capsule-sound-candidates/edit-recordings.cjs <decoded-directory>
// Each input is <source-id>.f32; the checked-in MP3 references remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const recipe = require('./edit-recipe.json');
const manifest = require('./sources.json');
const rate = recipe.sampleRate;
const dbGain = db => 10 ** (db / 20);

function filter(data, type, frequency) {
  // Fixed second-order Butterworth EQ, with no resonant boost or frequency sweeps.
  const w = 2 * Math.PI * frequency / rate;
  const c = Math.cos(w), alpha = Math.sin(w) / Math.SQRT2;
  const a0 = 1 + alpha, a1 = -2 * c / a0, a2 = (1 - alpha) / a0;
  const b0 = (type === 'highpass' ? (1 + c) : (1 - c)) / 2 / a0;
  const b1 = (type === 'highpass' ? -(1 + c) : (1 - c)) / a0;
  const b2 = b0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return Float64Array.from(data, x => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  });
}

function render(decoded) {
  const reports = {};
  for (const name of ['opening', 'closing']) {
    const sequence = recipe[name];
    const mix = new Float64Array(Math.round(sequence.duration * rate));
    for (const layer of sequence.layers) {
      const original = decoded[layer.source];
      if (!original || Math.round(layer.to * rate) > original.length) throw Error(`Missing/short source: ${layer.source}`);
      // Filter before cutting, preserving filter history at the edit point.
      const processed = filter(filter(original, 'highpass', layer.highpassHz), 'lowpass', layer.lowpassHz);
      const start = Math.round(layer.from * rate), end = Math.round(layer.to * rate);
      const offset = Math.round(layer.at * rate), length = end - start;
      if (offset + length > mix.length) throw Error(`Layer exceeds ${name}`);
      for (let i = 0; i < length; i++) {
        const fadeIn = Math.min(1, i / (layer.fadeIn * rate));
        const fadeOut = Math.min(1, (length - 1 - i) / (layer.fadeOut * rate));
        const envelope = Math.sin(fadeIn * Math.PI / 2) ** 2 * Math.sin(fadeOut * Math.PI / 2) ** 2;
        mix[offset + i] += processed[start + i] * dbGain(layer.gainDb) * envelope;
      }
    }
    let peak = 0;
    for (const sample of mix) { if (!Number.isFinite(sample)) throw Error('Invalid sample'); peak = Math.max(peak, Math.abs(sample)); }
    // Shared maximum: only attenuate when necessary; do not normalize quiet sequences up.
    const attenuation = Math.min(1, dbGain(recipe.peakCeilingDbfs) / peak);
    const wav = Buffer.alloc(44 + mix.length * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
    wav.writeUInt32LE(mix.length * 2, 40);
    let energy = 0, dc = 0;
    for (let i = 0; i < mix.length; i++) {
      const sample = mix[i] * attenuation;
      wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
      energy += sample * sample; dc += sample;
    }
    fs.writeFileSync(path.join(__dirname, `${name}-candidate.wav`), wav);
    reports[name] = { duration: sequence.duration, sampleRate: rate, channels: 1, bitsPerSample: 16,
      peakDbfs: +(20 * Math.log10(peak * attenuation)).toFixed(2),
      rmsDbfs: +(20 * Math.log10(Math.sqrt(energy / mix.length))).toFixed(2),
      dcOffset: dc / mix.length, attenuationDb: +(20 * Math.log10(attenuation)).toFixed(2),
      sha256: crypto.createHash('sha256').update(wav).digest('hex') };
  }
  fs.writeFileSync(path.join(__dirname, 'render-report.json'), JSON.stringify(reports, null, 2) + '\n');
  return reports;
}

if (require.main === module) {
  if (!process.argv[2]) throw Error('Pass directory containing decoded <source-id>.f32 files. See README.');
  const decoded = {};
  for (const source of manifest.sources) {
    const mp3 = fs.readFileSync(path.join(__dirname, source.file));
    if (crypto.createHash('sha256').update(mp3).digest('hex') !== source.sha256) throw Error(`Source hash mismatch: ${source.id}`);
    const bytes = fs.readFileSync(path.join(process.argv[2], `${source.id}.f32`));
    if (bytes.length % 4) throw Error(`Invalid float PCM: ${source.id}`);
    decoded[source.id] = Float32Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
  }
  console.log(JSON.stringify(render(decoded), null, 2));
}
module.exports = { render };
