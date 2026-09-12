// Offline, interruption-safe 30fps rendering of the existing coherent 3D model.
// No generated/interpolated video frames; no changes to approved audio assets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { connect, pause } = require('./time-capsule-cdp.cjs');
const root = path.resolve(__dirname, '..');
const preview = path.join(root, 'docs/time-capsule-motion-preview');
const artifacts = path.join(root, 'artifacts/time-capsule-combined-review');
const fps = 30, width = 960, height = 840;
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const selected = process.argv[2] || 'both';
if (!['both', 'open', 'close'].includes(selected)) throw Error('Usage: node scripts/render-time-capsule.cjs [open|close|both]');
const url = process.env.TRACE_PREVIEW_URL || 'http://127.0.0.1:4174/';
const ffmpeg = process.env.TRACE_PREVIEW_FFMPEG || path.join(artifacts, 'tools/ffmpeg/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe');
function encode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-6000); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`FFmpeg exited ${code}: ${errors}`)));
  });
}
async function main() {
  const { durations, audioOffsets } = await import('../docs/time-capsule-motion-preview/motion.mjs');
  const sourceHashes = Object.fromEntries(['vault.mjs', 'motion.mjs', 'preview.mjs'].map(name => [name, sha(fs.readFileSync(path.join(preview, name)))]));
  const fingerprint = sha(JSON.stringify({ sourceHashes, fps, width, height })).slice(0, 16);
  const framesRoot = path.join(artifacts, `frames-${fingerprint}`);
  fs.mkdirSync(framesRoot, { recursive: true });
  const manifestPath = path.join(preview, 'recordings/render-manifest.json');
  const existing = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : {};
  const manifest = { approach: 'Exact-pose Three.js frames, H264 video and AAC audio in one MP4 clock.', fps, width, height, sourceHashes, fingerprint, clips: existing.fingerprint === fingerprint ? existing.clips : {} };
  const browser = await connect();
  try {
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1100, deviceScaleFactor: 1, mobile: false });
    await browser.send('Page.navigate', { url });
    let ready = false;
    for (let i = 0; i < 150; i++) { if (await browser.evaluate('!!window.capsulePreview')) { ready = true; break; } await pause(200); }
    if (!ready) throw Error('Live inspector failed to load; ensure the standalone preview server is running.');
    await browser.evaluate(`(async()=>{const p=document.getElementById('viewport');p.style.width='${width}px';p.style.height='${height}px';p.style.maxWidth='none';p.style.minHeight='0';document.getElementById('reduced').checked=false;document.getElementById('effects').checked=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
    for (const kind of selected === 'both' ? ['open', 'close'] : [selected]) {
      const folder = path.join(framesRoot, kind); fs.mkdirSync(folder, { recursive: true });
      const count = Math.round(durations[kind] * fps), started = Date.now();
      console.log(`${kind}: ${count} exact poses; resumable frames in ${folder}`);
      for (let i = 0; i < count; i++) {
        const file = path.join(folder, `frame-${String(i).padStart(5, '0')}.png`);
        if (!fs.existsSync(file)) {
          const data = await browser.evaluate(`(()=>{capsulePreview.seek('${kind}',${i / fps});const c=document.getElementById('vault');c.getContext('webgl2').finish();if(c.width!==${width}||c.height!==${height})throw Error('Wrong render size');return c.toDataURL('image/png').split(',')[1];})()`);
          fs.writeFileSync(file + '.partial', Buffer.from(data, 'base64'));
          fs.renameSync(file + '.partial', file);
        }
        if ((i + 1) % 30 === 0 || i + 1 === count) console.log(`${kind}: ${i + 1}/${count} frames saved, ${((Date.now() - started) / 1000).toFixed(1)}s wall time`);
      }
      const sound = path.join(root, `docs/time-capsule-sound-candidates/${kind === 'open' ? 'opening' : 'closing'}-candidate.wav`);
      const soundHash = sha(fs.readFileSync(sound));
      const approvedHashes = { open: '5ab98530a4d5826996e306ce70b49112ca9cf8316e3ff0584b322d31e16be423', close: '252042d0a4ba75362fe1a04d3d226b5d3299d0b06df1e07c9f63733c3ff05ee2' };
      if (soundHash !== approvedHashes[kind]) throw Error(`Approved ${kind} audio changed; stopping before encoding.`);
      const output = path.join(preview, `recordings/${kind}.mp4`), temporary = output + '.new.mp4';
      await encode(['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(folder, 'frame-%05d.png'),
        '-i', sound, '-filter_complex', `[1:a]adelay=${audioOffsets[kind] * 1000}:all=1,apad[a]`,
        '-map', '0:v', '-map', '[a]', '-t', String(durations[kind]), '-c:v', 'libx264', '-preset', 'fast', '-crf', '19',
        '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', temporary]);
      fs.renameSync(temporary, output);
      manifest.clips[kind] = { frames: count, duration: durations[kind], audioOffset: audioOffsets[kind], approvedAudioSha256: soundHash,
        file: `${kind}.mp4`, bytes: fs.statSync(output).size, sha256: sha(fs.readFileSync(output)) };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`Saved ${output}; approved audio offset ${audioOffsets[kind]}s.`);
    }
    for (const [kind, seconds, name] of [['open', 0, 'closed'], ['open', durations.open, 'open']]) {
      const data = await browser.evaluate(`(()=>{document.getElementById('effects').checked=false;capsulePreview.seek('${kind}',${seconds});const c=document.getElementById('vault');c.getContext('webgl2').finish();return c.toDataURL().split(',')[1];})()`);
      fs.writeFileSync(path.join(preview, `recordings/${name}-no-effects.png`), Buffer.from(data, 'base64'));
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
