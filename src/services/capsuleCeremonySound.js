const SILENT_CONTROLLER = Object.freeze({ stop() {} });

let sharedContext = null;

function audioContext(windowObject) {
  if (sharedContext && sharedContext.state !== "closed") return sharedContext;
  const Context = windowObject?.AudioContext || windowObject?.webkitAudioContext;
  if (!Context) return null;
  try {
    sharedContext = new Context();
    return sharedContext;
  } catch (error) {
    return null;
  }
}

export function prepareCapsuleCeremonyAudio(enabled = true, windowObject = typeof window === "undefined" ? null : window) {
  if (!enabled) return null;
  const context = audioContext(windowObject);
  if (!context) return null;
  let ready = Promise.resolve(context.state === "running");
  if (context.state === "suspended" && typeof context.resume === "function") {
    try { ready = Promise.resolve(context.resume()).then(() => context.state === "running").catch(() => false); }
    catch (error) { ready = Promise.resolve(false); }
  }
  return { context, ready };
}

function connectEnvelope(context, destination, volume, start, attack, release, end) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), Math.max(start + attack, end - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(destination);
  return gain;
}

function tone(context, destination, nodes, { start, end, from, to = from, type = "sine", volume = 0.08, attack = 0.03, release = 0.12 }) {
  const oscillator = context.createOscillator();
  const gain = connectEnvelope(context, destination, volume, start, attack, release, end);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, end);
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.03);
  nodes.push(oscillator, gain);
}

function noise(context, destination, nodes, { start, duration, volume = 0.05, highpass = 0, lowpass = 1800 }) {
  const sampleRate = context.sampleRate || 44100;
  const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    const fade = 1 - index / samples.length;
    samples[index] = (Math.random() * 2 - 1) * fade;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  let output = source;
  if (highpass) {
    const filter = context.createBiquadFilter();
    filter.type = "highpass"; filter.frequency.value = highpass;
    output.connect(filter); output = filter; nodes.push(filter);
  }
  if (lowpass) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = lowpass;
    output.connect(filter); output = filter; nodes.push(filter);
  }
  const gain = connectEnvelope(context, destination, volume, start, 0.01, Math.min(0.3, duration / 2), start + duration);
  output.connect(gain);
  source.start(start);
  source.stop(start + duration + 0.03);
  nodes.push(source, gain);
}

function scheduleOpening(context, destination, nodes, start) {
  tone(context, destination, nodes, { start, end: start + 2.3, from: 62, to: 142, type: "sawtooth", volume: 0.055, attack: 0.16, release: 0.35 });
  tone(context, destination, nodes, { start: start + 0.08, end: start + 2.45, from: 124, to: 284, volume: 0.035, attack: 0.18, release: 0.5 });
  [0.42, 0.68].forEach((offset, index) => {
    tone(context, destination, nodes, { start: start + offset, end: start + offset + 0.1, from: 780 - index * 120, to: 330, type: "square", volume: 0.055, attack: 0.006, release: 0.07 });
  });
  noise(context, destination, nodes, { start: start + 1.18, duration: 1.05, volume: 0.075, highpass: 450, lowpass: 3600 });
  tone(context, destination, nodes, { start: start + 1.65, end: start + 3.05, from: 196, to: 392, volume: 0.045, attack: 0.3, release: 0.55 });
}

function scheduleSealing(context, destination, nodes, start) {
  tone(context, destination, nodes, { start, end: start + 1.65, from: 126, to: 46, type: "sawtooth", volume: 0.065, attack: 0.08, release: 0.2 });
  tone(context, destination, nodes, { start: start + 0.15, end: start + 1.5, from: 72, to: 38, type: "triangle", volume: 0.065, attack: 0.06, release: 0.18 });
  noise(context, destination, nodes, { start: start + 1.12, duration: 0.22, volume: 0.09, lowpass: 520 });
  tone(context, destination, nodes, { start: start + 1.1, end: start + 1.42, from: 92, to: 42, type: "sine", volume: 0.1, attack: 0.008, release: 0.2 });
  tone(context, destination, nodes, { start: start + 1.72, end: start + 2.14, from: 68, to: 34, type: "square", volume: 0.075, attack: 0.008, release: 0.3 });
  noise(context, destination, nodes, { start: start + 1.74, duration: 0.16, volume: 0.05, lowpass: 360 });
}

export async function playCapsuleCeremonySound(kind, prepared) {
  if (!prepared?.context || !["opening", "sealing"].includes(kind)) return SILENT_CONTROLLER;
  let ready = false;
  try { ready = await prepared.ready; } catch (error) { return SILENT_CONTROLLER; }
  const context = prepared.context;
  if (!ready || context.state !== "running") return SILENT_CONTROLLER;
  const nodes = [];
  try {
    const master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    nodes.push(master);
    const start = context.currentTime + 0.025;
    if (kind === "opening") scheduleOpening(context, master, nodes, start);
    else scheduleSealing(context, master, nodes, start);
    let stopped = false;
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        nodes.forEach((node) => {
          try { node.stop?.(); } catch (error) {}
          try { node.disconnect?.(); } catch (error) {}
        });
      },
    };
  } catch (error) {
    nodes.forEach((node) => { try { node.disconnect?.(); } catch (reason) {} });
    return SILENT_CONTROLLER;
  }
}

export function resetCapsuleCeremonyAudioForTests() {
  sharedContext = null;
}
