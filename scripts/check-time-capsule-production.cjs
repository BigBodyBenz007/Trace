// Real production-App checks in a dedicated disposable Chrome profile and origin.
// npm run build && node scripts/check-time-capsule-production.cjs
// --only=desktop|mobile|resilience|offline selects a suite; --resume skips completed
// suites only when the build and this harness have identical fingerprints.
// --check-cleanup checks isolated runner startup/shutdown without changing results.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { startServer } = require('./serve-time-capsule-production.cjs');
const ORIGIN = 'http://127.0.0.1:4180';
const PORT = 9227;
const output = path.resolve(__dirname, '../artifacts/time-capsule-production-integration/browser');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = JSON.stringify;
const FILM = '.trace-capsule-film__video';

async function connect() {
  // A new profile per invocation prevents accidental reuse of anyone's app data.
  const profile = path.join(output, `chrome-${Date.now()}`);
  fs.mkdirSync(profile, { recursive: true });
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(1000) }); throw Error(`Debug port ${PORT} is occupied; stop that isolated check before continuing.`); }
  catch (error) { if (error.message.includes('occupied')) throw error; }
  const chrome = spawn(process.env.TRACE_PREVIEW_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let targets;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(350) })).json(); break; } catch { await pause(250); }
  }
  if (!targets) { chrome.kill(); throw Error('Isolated Chrome did not start.'); }
  const target = targets.find(item => item.type === 'page');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map(), errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(Error(JSON.stringify(message.error))) : request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  return { send, evaluate, errors, async close() {
    // Chrome may close its socket before acknowledging Browser.close.
    try { await Promise.race([send('Browser.close'), pause(2000)]); } catch {}
    socket.close(); chrome.kill();
  } };
}

function fixture({ sound = true, reduced = false } = {}) {
  return `async () => {
    if (location.origin !== ${quote(ORIGIN)}) throw Error('Fixture origin guard failed');
    const now = new Date(), stamp = now.toISOString();
    const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 240;
    const context = canvas.getContext('2d'); context.fillStyle = '#254b65'; context.fillRect(0,0,360,240);
    context.fillStyle = '#deb66b'; context.fillRect(35,35,290,170); context.fillStyle = '#1a2934'; context.font = '22px sans-serif'; context.fillText('Synthetic capsule photo', 52,125);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const item = {id:'browser-capsule-photo',kind:'photo',name:'Synthetic capsule photo.png',mimeType:'image/png',bytes:blob.size};
    const wav = new ArrayBuffer(80044), header = new DataView(wav);
    const word = (offset,value) => [...value].forEach((letter,index)=>header.setUint8(offset+index,letter.charCodeAt(0)));
    word(0,'RIFF');header.setUint32(4,80036,true);word(8,'WAVE');word(12,'fmt ');header.setUint32(16,16,true);header.setUint16(20,1,true);header.setUint16(22,1,true);header.setUint32(24,8000,true);header.setUint32(28,16000,true);header.setUint16(32,2,true);header.setUint16(34,16,true);word(36,'data');header.setUint32(40,80000,true);
    const audioBlob = new Blob([wav],{type:'audio/wav'});
    const audioItem = {id:'browser-capsule-audio',kind:'audio',name:'Synthetic silent user recording.wav',mimeType:'audio/wav',bytes:audioBlob.size,durationMs:5000};
    const capsule = {schemaVersion:1,id:'browser-capsule',name:'Browser review capsule',text:'PRIVATE SYNTHETIC CAPSULE CONTENT',openOn:today,media:[item,audioItem],createdAt:stamp,updatedAt:stamp,sealedAt:stamp,openedAt:null,sealCycle:{number:1,sealedAt:stamp},openingHistory:[]};
    localStorage.clear();
    localStorage.setItem('appSettings', JSON.stringify({capsuleSounds:${sound}, motionPreference:${quote(reduced ? 'reduced' : 'standard')}}));
    localStorage.setItem('timeCapsules', JSON.stringify([capsule]));
    localStorage.setItem('timeCapsuleReminders', JSON.stringify([{schemaVersion:1,capsuleId:capsule.id,state:'pending',remindOn:null,updatedAt:stamp}]));
    const database = await new Promise((resolve,reject) => {const request=indexedDB.open('tracePhotoStorage',2); request.onupgradeneeded=()=>{for(const [name,keyPath] of [['photos','id'],['media','id'],['migrations','key']])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    await new Promise((resolve,reject)=>{const transaction=database.transaction('media','readwrite');transaction.objectStore('media').put({...item,capsuleId:capsule.id,blob});transaction.objectStore('media').put({...audioItem,capsuleId:capsule.id,blob:audioBlob});transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});database.close();
    return capsule;
  }`;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const fingerprint = crypto.createHash('sha256')
    .update(fs.readFileSync(path.resolve(__dirname, '../build/asset-manifest.json')))
    .update(fs.readFileSync(path.resolve(__dirname, '../build/service-worker.js')))
    .update(fs.readFileSync(path.resolve(__dirname, 'serve-time-capsule-production.cjs')))
    .update(fs.readFileSync(__filename)).digest('hex');
  const resultPath = path.join(output, 'results.json');
  let results = { fingerprint, startedAt: new Date().toISOString(), browser: 'Headless desktop Chrome; mobile viewport emulation is not physical iPhone/Safari.', suites: {}, screenshots: [] };
  if (process.argv.includes('--resume') && fs.existsSync(resultPath)) { const prior = JSON.parse(fs.readFileSync(resultPath)); if (prior.fingerprint === fingerprint) results = prior; }
  const checkpoint = () => fs.writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`);
  let server = await startServer();
  let browser;
  try {
    browser = await connect();
    if (process.argv.includes('--check-cleanup')) {
      console.log('Isolated runner connected; checking shutdown.');
      return;
    }
    const { send, evaluate } = browser;
    const wait = async (expression, label, timeout = 12000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await pause(80); }
      throw Error(`Timed out: ${label}`);
    };
    const assert = async (expression, label) => { if (!await evaluate(expression)) throw Error(label); };
    const screenshot = async name => {
      const state = await evaluate(`({width:innerWidth,height:innerHeight,videoTime:document.querySelector(${quote(FILM)})?.currentTime ?? null})`);
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(capture.data, 'base64'));
      results.screenshots.push({ name, ...state }); checkpoint();
    };
    const clickExpression = async expression => {
      const point = await evaluate(`(()=>{const element=${expression};if(!element)throw Error('Missing click target');let r=element.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)element.scrollIntoView({block:'nearest',behavior:'instant'});r=element.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    };
    const buttonExpression = label => `[...document.querySelectorAll('button')].find(element=>element.textContent.trim()===${quote(label)})`;
    const click = async label => { await wait(`Boolean(${buttonExpression(label)})`, label); await clickExpression(buttonExpression(label)); };
    const noPrivate = () => assert(`!document.querySelector('[aria-label="Opened capsule contents"]') && !document.body.textContent.includes('PRIVATE SYNTHETIC CAPSULE CONTENT')`, 'Private contents leaked before reveal');
    const record = () => evaluate(`JSON.parse(localStorage.getItem('timeCapsules'))[0]`);
    const ready = async settings => {
      await send('Page.navigate', { url: ORIGIN });
      await wait(`document.readyState==='complete' && Boolean(document.querySelector('.trace-app-shell'))`, 'App bootstrap');
      await evaluate(`(${fixture(settings)})()`);
      await send('Page.reload');
      await wait(`Boolean(${buttonExpression('Open now')})`, 'today-ready reminder');
      await evaluate(`window.__filmEvents=[];for(const name of ['play','playing','pause','ended','error','waiting','stalled','timeupdate'])document.addEventListener(name,event=>{const video=event.target;if(!video.matches?.(${quote(FILM)}))return;const bounds=video.getBoundingClientRect();window.__filmEvents.push({event:name,clock:performance.now(),time:video.currentTime,muted:video.muted,ready:video.readyState,top:bounds.top,bottom:bounds.bottom,visibility:document.visibilityState,error:video.error?.code});},true);`);
      await evaluate(`window.__capsuleGains=[];if(window.AudioContext){const original=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){const node=original.call(this);window.__capsuleGains.push(node);return node;};}`);
      await noPrivate();
      await click('Open now');
      await wait(`Boolean(${buttonExpression('Open Capsule')})`, 'explicit opening action');
      await noPrivate();
      if ((await record()).openedAt !== null) throw Error('Home Open now changed persisted openedAt');
      await assert(`!document.querySelector(${quote(FILM)})`, 'Home navigation started ceremony');
    };
    const beginOpening = async () => {
      await click('Open Capsule');
      await wait(`Boolean(document.querySelector(${quote(FILM)}))`, 'opening video mounted');
      if (!(await record()).openedAt) throw Error('Opening started before persistence');
      await noPrivate();
    };
    const photo = async () => {
      await wait(`(()=>{const image=document.querySelector('img[alt="Synthetic capsule photo.png"]');return image?.complete && image.naturalWidth===360;})()`, 'stored synthetic photo display');
      await assert(`document.body.textContent.includes('PRIVATE SYNTHETIC CAPSULE CONTENT')`, 'Private message missing after opening');
    };
    const waitVideoTime = async time => wait(`document.querySelector(${quote(FILM)})?.currentTime>=${time}`, `video reaches ${time}s`);
    const complete = async () => wait(`!document.querySelector(${quote(FILM)}) && !document.querySelector('.trace-capsule-ceremony')`, 'ceremony completion', 18000);
    const viewport = async mobile => { await send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile }); };
    const overflow = () => assert(`document.documentElement.scrollWidth <= innerWidth + 1`, 'Horizontal viewport overflow');
    const visibleControls = () => assert(`(()=>{const bounds=document.querySelector('.trace-capsule-film__caption').getBoundingClientRect();return bounds.top>=0 && bounds.bottom<=innerHeight+1 && bounds.left>=0 && bounds.right<=innerWidth+1;})()`, 'Ceremony controls extend outside viewport');
    const reseal = async () => {
      await wait(`Boolean(document.querySelector('.trace-capsule-media audio'))`, 'stored user audio loaded');
      await evaluate(`window.__userAudio=document.querySelector('.trace-capsule-media audio');window.__userAudio.muted=true;window.__userAudio.play();`);
      await wait(`!window.__userAudio.paused`, 'user audio playback started');
      await click('Seal again for later'); await click('Confirm seal again');
      await wait(`Boolean(document.querySelector(${quote(FILM)}))`, 'closing video mounted');
      await assert(`window.__userAudio.paused`, 'User media audio overlaps closing ceremony');
      const stored = await record();
      if (stored.openedAt !== null || stored.sealCycle.number !== 2 || stored.openingHistory.length !== 1 || stored.media[0].id !== 'browser-capsule-photo') throw Error('Reseal identity/history/media mismatch');
      await noPrivate();
    };
    const suites = {
      async desktop() {
        await viewport(false); await ready(); await screenshot('desktop-ready');
        await beginOpening();
        await waitVideoTime(0.35);
        await assert(`(()=>{const video=document.querySelector(${quote(FILM)});return !video.paused && video.playsInline && Math.abs(video.duration-6)<0.02;})()`, 'Opening timing/inline playback mismatch');
        await visibleControls();
        await clickExpression(`document.querySelector('input[aria-label="Capsule ceremony volume"]')`);
        await assert(`(()=>{const value=Number(document.querySelector('input[aria-label="Capsule ceremony volume"]').value);return value!==65 && Math.abs(window.__capsuleGains.at(-1).gain.value-value/100)<0.001;})()`, 'Volume control did not change the recording gain');
        await waitVideoTime(2.8); await screenshot('desktop-opening-vapor'); await noPrivate();
        await complete(); await photo(); await screenshot('desktop-opened');
        await click('Back to Time Capsules'); await click('View Time Capsule'); await photo();
        await assert(`!document.querySelector(${quote(FILM)})`, 'Opened revisit replayed ceremony');
        await reseal(); await waitVideoTime(1.5); await screenshot('desktop-closing-lid');
        await assert(`Math.abs(document.querySelector(${quote(FILM)}).duration-5.4)<0.02`, 'Closing timing mismatch');
        await waitVideoTime(3.9); await screenshot('desktop-closing-lock');
        await complete(); await noPrivate(); await screenshot('desktop-resealed'); await overflow();
        await assert(`JSON.parse(localStorage.getItem('timeCapsuleReminders'))[0].state==='pending'`, 'Reseal reminder missing');
        return { opening: '6 seconds, persisted before reveal; native volume slider changes Web Audio gain', closing: '5.4 seconds, preserved identity/history/photo/reminder; user audio paused first', photo: 'IndexedDB Blob loaded after opening and after unmount/revisit', privacy: 'Home navigation and resealed contents remain private' };
      },
      async mobile() {
        await viewport(true); await ready({ sound: false }); await screenshot('mobile-ready');
        await beginOpening(); await waitVideoTime(2.7); await screenshot('mobile-opening-vapor');
        await visibleControls();
        await assert(`document.querySelector(${quote(FILM)}).muted && !document.querySelector(${quote(FILM)}).paused`, 'Muted preference prevented visual playback');
        await overflow(); await click('Skip animation'); await photo();
        await assert(`document.activeElement !== document.body && document.activeElement.isConnected`, 'Skip lost accessible focus');
        await screenshot('mobile-opened');
        await reseal(); await waitVideoTime(2.55); await screenshot('mobile-closing-contact'); await visibleControls(); await overflow();
        await complete(); await noPrivate(); await screenshot('mobile-resealed');
        await assert(`JSON.parse(localStorage.getItem('appSettings')).capsuleSounds===false`, 'Saved mute preference changed');
        return { viewport: '390 x 844', mute: 'Visual playback advances while saved sounds remain disabled', skip: 'Completes to contents and connected focus', layout: 'No horizontal overflow' };
      },
      async resilience() {
        await viewport(true); await ready({ reduced: true }); await click('Open Capsule');
        await assert(`!document.querySelector(${quote(FILM)})`, 'Reduced Motion mounted video');
        if (await evaluate(`Boolean(${buttonExpression('Continue')})`)) await click('Continue');
        else if (await evaluate(`Boolean(${buttonExpression('Skip animation')})`)) await click('Skip animation');
        await photo(); await screenshot('reduced-motion-opened');
        await ready();
        await evaluate(`window.__originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Injected decoder failure','NotSupportedError'));};`);
        await click('Open Capsule');
        await wait(`Boolean(${buttonExpression('Continue')})`, 'failed playback Continue');
        await noPrivate(); await screenshot('playback-failure-fallback');
        await click('Continue'); await photo();
        await ready();
        await evaluate(`window.__originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(!this.muted)return Promise.reject(new DOMException('Injected gesture policy','NotAllowedError'));return window.__originalPlay.call(this);};`);
        await beginOpening(); await waitVideoTime(0.5);
        await assert(`document.querySelector(${quote(FILM)}).muted && Boolean(${buttonExpression('Enable sound')})`, 'Gesture denial did not recover to muted visuals');
        await evaluate(`HTMLMediaElement.prototype.play=window.__originalPlay;`);
        await click('Enable sound');
        await assert(`!document.querySelector(${quote(FILM)}).muted`, 'Enable sound gesture failed to unmute');
        await click('Skip animation'); await photo();
        await ready(); await beginOpening(); await waitVideoTime(0.5);
        await evaluate(`document.querySelector(${quote(FILM)}).pause();`);
        await wait(`Boolean(${buttonExpression('Continue')})`, 'watchdog completion without ended', 15000);
        await click('Continue'); await photo();
        await ready(); await beginOpening(); await waitVideoTime(0.5);
        await evaluate(`window.__interruptedVideo=document.querySelector(${quote(FILM)});true;`);
        await click('Back to Time Capsules');
        await assert(`window.__interruptedVideo.paused && !document.querySelector(${quote(FILM)})`, 'Navigation left video playing');
        await click('View Time Capsule'); await photo();
        await assert(`!document.querySelector(${quote(FILM)})`, 'Interrupted opening replayed on revisit');
        await ready(); await beginOpening(); await waitVideoTime(0.5);
        await evaluate(`window.__interruptedVideo=document.querySelector(${quote(FILM)});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));`);
        await wait(`window.__interruptedVideo.paused`, 'background video paused');
        await evaluate(`delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));`);
        await photo(); await screenshot('background-return');
        return { reducedMotion: 'Static endpoint, no video', failedPlayback: 'Injected native play rejection; static Continue safely reveals persisted content', autoplay: 'Injected NotAllowedError retries muted visuals; explicit Enable sound succeeds', watchdog: 'Paused clip with no ended event still releases controls through fallback', navigation: 'Detached video paused; no replay on revisit', background: 'Synthetic visibility interruption stops playback and returns to persisted state' };
      },
      async offline() {
        await viewport(true);
        // This suite runs in its own fresh profile when invoked with --only=offline.
        await send('Page.navigate', { url: ORIGIN });
        await wait(`document.readyState==='complete' && Boolean(document.querySelector('.trace-app-shell'))`, 'offline App bootstrap');
        await wait(`Boolean(navigator.serviceWorker.controller)`, 'service worker controls initial App', 30000);
        const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../build/asset-manifest.json')));
        const assets = [...new Set(Object.values(manifest.files).filter(asset => /(?:ceremony-(?:open|close)|vault-(?:sealed|opened)|recording-credits).*(?:\.mp4|\.png|\.txt)$/.test(asset)))];
        if (assets.filter(asset => asset.endsWith('.mp4')).length !== 2 || assets.filter(asset => asset.endsWith('.png')).length < 2) throw Error('Capsule recordings/endpoints absent from build manifest');
        const availability = await evaluate(`Promise.all(${quote(assets)}.map(async path=>{const response=await caches.match(new URL(path,location.href).href);return {path,status:response?.status,bytes:response?(await response.arrayBuffer()).byteLength:0};}))`);
        if (availability.some(asset => asset.status !== 200 || !asset.bytes)) throw Error('Capsule assets not fully cached on first installation');
        await evaluate(`(${fixture({ sound: false })})()`);
        // Also stop the HTTP server: worker-thread fetches must have no live
        // network source, regardless of CDP's target-level emulation behavior.
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        server = null;
        await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await send('Page.reload');
        await wait(`Boolean(${buttonExpression('Open now')})`, 'offline App reload');
        const ranges = await evaluate(`Promise.all(${quote(assets.filter(asset => asset.endsWith('.mp4')))}.map(async path=>{const response=await fetch(path,{headers:{Range:'bytes=0-63'}});return {path,status:response.status,range:response.headers.get('Content-Range'),bytes:(await response.arrayBuffer()).byteLength};}))`);
        if (ranges.some(item => item.status !== 206 || item.bytes !== 64)) throw Error('Offline MP4 ranges failed');
        const credits = assets.find(asset => asset.endsWith('.txt'));
        await assert(`fetch(${quote(credits)}).then(response=>response.text()).then(text=>text.includes('Robert')&&text.includes('creativecommons.org'))`, 'Sound attribution unavailable offline');
        await click('Open now'); await beginOpening(); await waitVideoTime(2.7); await screenshot('offline-opening');
        await complete(); await photo(); await screenshot('offline-photo');
        await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        server = await startServer();
        return { availability, ranges, offline: 'App reload, opening video, and IndexedDB photo succeeded with network disabled and HTTP server stopped' };
      },
    };
    const selected = process.argv.find(argument => argument.startsWith('--only='))?.slice(7);
    if (selected && !suites[selected]) throw Error(`Unknown suite: ${selected}`);
    for (const [name, suite] of Object.entries(suites)) {
      if (selected && selected !== name) continue;
      if (results.suites[name]?.passed && process.argv.includes('--resume')) { console.log(`RESUME ${name}: already passed this build`); continue; }
      console.log(`RUN ${name}`);
      try { const details = await suite(); results.suites[name] = { passed: true, completedAt: new Date().toISOString(), details }; console.log(`PASS ${name}`); checkpoint(); }
      catch (error) {
        results.suites[name] = { passed: false, error: error.message };
        results.browserErrors = browser.errors;
        fs.writeFileSync(path.join(output, `${name}-failure-video-events.json`), JSON.stringify(await evaluate('window.__filmEvents || []'), null, 2));
        await screenshot(`${name}-failure`).catch(() => {});
        fs.writeFileSync(path.join(output, `${name}-failure-dom.txt`), await evaluate('document.body.innerText').catch(() => 'Unavailable'));
        checkpoint(); throw error;
      }
    }
    results.browserErrors = browser.errors; checkpoint();
    console.log(`Results: ${resultPath}`);
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (process.argv.includes('--check-cleanup')) console.log('PASS isolated runner shutdown');
  }
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
