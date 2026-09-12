// Real production-App checks in a dedicated disposable Chrome profile and origin.
// npm run build && node scripts/check-time-capsule-production.cjs
// --only=desktop|mobile|resilience|credits|offline selects a suite; --resume skips completed
// suites only when the build and this harness have identical fingerprints.
// --check-cleanup checks isolated runner startup/shutdown without changing results.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { startServer } = require('./serve-time-capsule-production.cjs');
const ORIGIN = 'http://127.0.0.1:4180';
const PORT = 9227;
const output = path.resolve(__dirname, '../artifacts/time-capsule-audio-activation/browser');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = JSON.stringify;
const ACTIVE = '[data-capsule-ceremony]';
const FILM = `${ACTIVE} .trace-capsule-film__video`;

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
  const pending = new Map(), errors = [], dialogs = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Page.javascriptDialogOpening') { dialogs.push(message.params); send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); }
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
  return { send, evaluate, errors, dialogs, async close() {
    // Chrome may close its socket before acknowledging Browser.close.
    try { await Promise.race([send('Browser.close'), pause(2000)]); } catch {}
    socket.close(); chrome.kill();
  } };
}

function fixture({ sound = true, reduced = false, volume } = {}) {
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
    localStorage.setItem('appSettings', JSON.stringify(${quote({ capsuleSounds: sound, motionPreference: reduced ? 'reduced' : 'standard', ...(volume === undefined ? {} : { capsuleVolume: volume }) })}));
    localStorage.setItem('timeCapsules', JSON.stringify([capsule]));
    localStorage.setItem('timeCapsuleReminders', JSON.stringify([{schemaVersion:1,capsuleId:capsule.id,state:'pending',remindOn:null,updatedAt:stamp}]));
    const database = await new Promise((resolve,reject) => {const request=indexedDB.open('tracePhotoStorage',2); request.onupgradeneeded=()=>{for(const [name,keyPath] of [['photos','id'],['media','id'],['migrations','key']])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    await new Promise((resolve,reject)=>{const transaction=database.transaction('media','readwrite');transaction.objectStore('media').put({...item,capsuleId:capsule.id,blob});transaction.objectStore('media').put({...audioItem,capsuleId:capsule.id,blob:audioBlob});transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});database.close();
    return capsule;
  }`;
}

// Observe the off-DOM gesture prime as well as the later visible success play.
// These probes do not alter normal play promises, gain values, or media timing.
function installMediaProbe() {
  window.__filmEvents = [];
  window.__playCalls = [];
  window.__ceremonyPhases = [];
  window.__capsuleGains = [];
  window.__seenVideos = [];
  const identities = new WeakMap(), routes = new WeakMap();
  const identity = media => {
    if (!identities.has(media)) { identities.set(media, window.__seenVideos.length + 1); window.__seenVideos.push(media); }
    return identities.get(media);
  };
  if (window.AudioContext) {
    const gain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () { const node = gain.call(this); window.__capsuleGains.push(node); return node; };
    const source = AudioContext.prototype.createMediaElementSource;
    AudioContext.prototype.createMediaElementSource = function (media) { const node = source.call(this, media); routes.set(media, this); return node; };
  }
  const snapshot = media => {
    const context = routes.get(media);
    const gain = window.__capsuleGains.filter(node => node.context === context).at(-1);
    return { id: identity(media), clock: performance.now(), src: media.currentSrc || media.src, time: media.currentTime, duration: Number.isFinite(media.duration) ? media.duration : null, muted: media.muted, volume: media.volume, gain: gain?.gain.value ?? null, context: context?.state ?? null, active: Boolean(document.querySelector('[data-capsule-ceremony]')), activation: navigator.userActivation?.isActive, records: JSON.parse(localStorage.getItem('timeCapsules') || '[]').map(({ id, openedAt }) => ({ id, openedAt })) };
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!(this instanceof HTMLVideoElement)) return play.call(this);
    const call = snapshot(this);
    window.__playCalls.push(call);
    const result = window.__blockMediaPlay === 'all' || (window.__blockMediaPlay === 'unmuted' && !this.muted)
      ? Promise.reject(new DOMException('Injected playback restriction', window.__blockMediaPlay === 'all' ? 'NotSupportedError' : 'NotAllowedError'))
      : play.call(this);
    result?.then(() => { call.resolved = performance.now(); }, error => { call.error = error.name; });
    return result;
  };
  for (const name of ['play', 'playing', 'pause', 'ended', 'error', 'waiting', 'stalled', 'timeupdate']) {
    document.addEventListener(name, event => {
      const media = event.target;
      if (media instanceof HTMLVideoElement && media.classList.contains('trace-capsule-film__video')) window.__filmEvents.push({ event: name, ...snapshot(media) });
    }, true);
  }
  let previousFigure = null, previousPhase = '';
  new MutationObserver(() => {
    const figure = document.querySelector('[data-capsule-ceremony]');
    const phase = figure?.dataset.capsulePlayback || (figure ? 'mounted' : 'removed');
    if ((figure || previousFigure) && (figure !== previousFigure || phase !== previousPhase)) window.__ceremonyPhases.push({ phase, kind: figure?.dataset.capsuleCeremony || previousFigure?.dataset.capsuleCeremony, clock: performance.now() });
    previousFigure = figure; previousPhase = phase;
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-capsule-playback'] });
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
      const point = await evaluate(`(()=>{const element=${expression};if(!element)throw Error('Missing click target');let r=element.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)element.scrollIntoView({block:'nearest',behavior:'instant'});const rects=[...element.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);r=rects.find(rect=>rect.top>=0&&rect.bottom<=innerHeight)||rects[0]||element.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    };
    const buttonExpression = label => `[...document.querySelectorAll('button')].find(element=>element.textContent.trim()===${quote(label)})`;
    const click = async label => { await wait(`Boolean(${buttonExpression(label)})`, label); await clickExpression(buttonExpression(label)); };
    const changeField = async (label, value) => evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(element=>element.textContent.startsWith(${quote(label)}));const field=label?.querySelector('input,textarea');if(!field)throw Error('Missing field');const prototype=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(field,${quote(value)});field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const noPrivate = () => assert(`!document.querySelector('[aria-label="Opened capsule contents"]') && !document.body.textContent.includes('PRIVATE SYNTHETIC CAPSULE CONTENT')`, 'Private contents leaked before reveal');
    const record = () => evaluate(`JSON.parse(localStorage.getItem('timeCapsules'))[0]`);
    const ready = async settings => {
      await send('Page.navigate', { url: ORIGIN });
      await wait(`document.readyState==='complete' && Boolean(document.querySelector('.trace-app-shell'))`, 'App bootstrap');
      await evaluate(`(${fixture(settings)})()`);
      await send('Page.reload');
      await wait(`Boolean(${buttonExpression('Open now')})`, 'today-ready reminder');
      await evaluate(`(${installMediaProbe.toString()})()`);
      await noPrivate();
      await click('Open now');
      await wait(`Boolean(${buttonExpression('Open Capsule')})`, 'explicit opening action');
      await noPrivate();
      if ((await record()).openedAt !== null) throw Error('Home Open now changed persisted openedAt');
      await assert(`!document.querySelector(${quote(ACTIVE)}) && window.__playCalls.length===0`, 'Home navigation started or primed ceremony');
      await assert(`![...document.querySelectorAll('a')].some(link=>/capsule sound credits/i.test(link.textContent))`, 'Capsule detail still links to sound credits');
    };
    const markAction = async () => evaluate(`window.__actionMark=performance.now();true;`);
    const beginOpening = async () => {
      await markAction();
      await click('Open Capsule');
      await wait(`Boolean(document.querySelector(${quote(ACTIVE)}))`, 'opening ceremony mounted');
      if (!(await record()).openedAt) throw Error('Opening started before persistence');
      await noPrivate();
    };
    const photo = async () => {
      await wait(`(()=>{const image=document.querySelector('img[alt="Synthetic capsule photo.png"]');return image?.complete && image.naturalWidth===360;})()`, 'stored synthetic photo display');
      await assert(`document.body.textContent.includes('PRIVATE SYNTHETIC CAPSULE CONTENT')`, 'Private message missing after opening');
      await assert(`[...document.querySelectorAll('.trace-capsule-media audio,.trace-capsule-media video')].every(media=>media.paused)`, 'User attachment started automatically');
    };
    const waitVideoTime = async time => wait(`document.querySelector(${quote(FILM)})?.currentTime>=${time}`, `video reaches ${time}s`);
    const complete = async () => wait(`!document.querySelector(${quote(ACTIVE)})`, 'ceremony completion', 18000);
    const audioInitialized = async (expectedVolume = 0.65, enabled = true) => {
      await assert(`(()=>{const calls=window.__playCalls.filter(call=>call.clock>=window.__actionMark);const prime=calls.find(call=>!call.active);const active=calls.find(call=>call.active&&!call.error);return Boolean(prime&&active&&prime.id===active.id&&prime.activation && (prime.muted||prime.volume===0||prime.gain===0) && ${enabled ? `!active.muted && active.context==='running' && Math.abs((active.gain??active.volume)-${expectedVolume})<0.001` : `(active.muted || (active.gain??active.volume)===0)`});})()`, 'Gesture prime, same-element ownership, or initial sound level incorrect');
      await assert(`!document.querySelector(${quote(ACTIVE)}+' input[type="range"]') && ![...document.querySelectorAll(${quote(ACTIVE)}+' button')].some(button=>/enable sound/i.test(button.textContent))`, 'Ceremony still requires sound controls');
    };
    const completeNormally = async (kind, name) => {
      await complete();
      const timing = await evaluate(`(()=>{const calls=window.__playCalls.filter(call=>call.clock>=window.__actionMark);const success=calls.find(call=>call.active&&!call.error);const ended=window.__filmEvents.find(event=>event.id===success?.id && event.event==='ended' && event.clock>=success.clock);const removed=window.__ceremonyPhases.find(phase=>phase.clock>=window.__actionMark&&phase.phase==='removed');return {calls,ended,removed,playMs:ended&&ended.clock-success.clock,settledMs:ended&&removed&&removed.clock-ended.clock};})()`);
      const duration = kind === 'opening' ? 6 : 5.4;
      if (!timing.ended || Math.abs(timing.ended.time-duration)>0.01 || timing.playMs<duration*1000-250 || timing.settledMs<740) throw Error(`Full clip/final pose was truncated: ${JSON.stringify(timing)}`);
      results.timing ||= {};
      results.timing[name] = timing;
      checkpoint();
    };
    const viewport = async mobile => { await send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile }); };
    const overflow = () => assert(`document.documentElement.scrollWidth <= innerWidth + 1`, 'Horizontal viewport overflow');
    const visibleControls = () => assert(`(()=>{const bounds=document.querySelector('.trace-capsule-film__caption').getBoundingClientRect();return bounds.top>=0 && bounds.bottom<=innerHeight+1 && bounds.left>=0 && bounds.right<=innerWidth+1;})()`, 'Ceremony controls extend outside viewport');
    const reseal = async () => {
      await wait(`Boolean(document.querySelector('.trace-capsule-media audio'))`, 'stored user audio loaded');
      await evaluate(`window.__userAudio=document.querySelector('.trace-capsule-media audio');window.__userAudio.muted=true;window.__userAudio.play();`);
      await wait(`!window.__userAudio.paused`, 'user audio playback started');
      await click('Seal again for later'); await markAction(); await click('Confirm seal again');
      await wait(`Boolean(document.querySelector(${quote(ACTIVE)}))`, 'closing ceremony mounted');
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
        await audioInitialized();
        await waitVideoTime(2.8); await screenshot('desktop-opening-vapor'); await noPrivate();
        await completeNormally('opening', 'desktop-opening'); await photo(); await screenshot('desktop-opened');
        await click('Back to Time Capsules'); await click('View Time Capsule'); await photo();
        await assert(`!document.querySelector(${quote(ACTIVE)})`, 'Opened revisit replayed ceremony');
        await reseal(); await waitVideoTime(1.5); await screenshot('desktop-closing-lid');
        await audioInitialized();
        await assert(`Math.abs(document.querySelector(${quote(FILM)}).duration-5.4)<0.02`, 'Closing timing mismatch');
        await waitVideoTime(3.9); await screenshot('desktop-closing-lock');
        await completeNormally('sealing', 'desktop-reseal'); await noPrivate(); await screenshot('desktop-resealed'); await overflow();
        await assert(`JSON.parse(localStorage.getItem('timeCapsuleReminders'))[0].state==='pending'`, 'Reseal reminder missing');
        await click('Back to Time Capsules'); await click('Create Time Capsule');
        await changeField('Visible capsule name', 'New synthetic capsule'); await changeField('Private message', 'NEW PRIVATE SYNTHETIC CONTENT');
        const today = await evaluate(`(()=>{const date=new Date();return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');})()`);
        await changeField('Custom date', today);
        await click('Seal Time Capsule');
        await assert(`!document.querySelector(${quote(ACTIVE)}) && !window.__playCalls.some(call=>call.clock>window.__ceremonyPhases.at(-1).clock)`, 'Initial seal confirmation already played ceremony');
        await markAction(); await click('Confirm seal Time Capsule');
        await wait(`Boolean(document.querySelector(${quote(ACTIVE)}))`, 'initial seal ceremony'); await waitVideoTime(0.35);
        await audioInitialized();
        await assert(`JSON.parse(localStorage.getItem('timeCapsules')).some(item=>item.name==='New synthetic capsule'&&item.openedAt===null)`, 'Initial seal ceremony preceded persistence');
        await completeNormally('sealing', 'desktop-initial-seal');
        await wait(`Boolean(${buttonExpression('Open Capsule')})`, 'today-sealed capsule immediately ready');
        if (browser.dialogs.length) throw Error('Sealing used a native confirmation dialog');
        return { opening: 'Full 6 seconds plus settled pose; same video primed in original gesture with gain zero, then default gain initialized without slider interaction', closing: 'Full 5.4 seconds plus settled pose; both initial seal and reseal use final DOM confirmation gesture', photo: 'IndexedDB Blob loaded after opening and unmount/revisit; no attachment autoplay', privacy: 'Home navigation, failed/confirmed sealing boundaries remain private' };
      },
      async mobile() {
        await viewport(true); await ready({ sound: false }); await screenshot('mobile-ready');
        await beginOpening(); await waitVideoTime(2.7); await screenshot('mobile-opening-vapor');
        await visibleControls();
        await audioInitialized(0.65, false);
        await assert(`document.querySelector(${quote(FILM)}).muted && !document.querySelector(${quote(FILM)}).paused`, 'Muted preference prevented visual playback');
        await overflow(); await click('Skip animation'); await photo();
        await assert(`document.activeElement !== document.body && document.activeElement.isConnected`, 'Skip lost accessible focus');
        await screenshot('mobile-opened');
        await reseal(); await waitVideoTime(2.55); await screenshot('mobile-closing-contact'); await visibleControls(); await overflow();
        await completeNormally('sealing', 'mobile-muted-reseal'); await noPrivate(); await screenshot('mobile-resealed');
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
        await evaluate(`window.__blockMediaPlay='all';`);
        await click('Open Capsule');
        await wait(`Boolean(${buttonExpression('Continue')})`, 'failed playback Continue');
        await noPrivate(); await screenshot('playback-failure-fallback');
        await click('Continue'); await photo();
        await ready();
        await evaluate(`window.__blockMediaPlay='unmuted';`);
        await beginOpening(); await waitVideoTime(0.5);
        await assert(`document.querySelector(${quote(FILM)}).muted && !Boolean(${buttonExpression('Enable sound')})`, 'Gesture denial did not recover without repeated sound prompts');
        await click('Skip animation'); await photo();
        await ready();
        await evaluate(`window.__savedSetItem=Storage.prototype.setItem;window.__failSave=true;Storage.prototype.setItem=function(key,value){if(key==='timeCapsules'&&window.__failSave){window.__failSave=false;throw new DOMException('Injected storage failure','QuotaExceededError');}return window.__savedSetItem.call(this,key,value);};`);
        await click('Open Capsule');
        await wait(`document.body.textContent.includes('contents remain sealed')`, 'failed persistence recovery');
        await noPrivate();
        await assert(`!document.querySelector(${quote(ACTIVE)}) && !window.__playCalls.some(call=>call.active) && window.__playCalls.every(call=>call.muted||call.volume===0||call.gain===0) && window.__seenVideos.every(video=>video.paused)`, 'Failed persistence produced success sound or ceremony');
        await assert(`JSON.parse(localStorage.getItem('timeCapsules'))[0].openedAt===null`, 'Failed opening changed saved state');
        await ready({ volume: 0.67 }); await beginOpening(); await waitVideoTime(0.5); await audioInitialized(0.67);
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
        return { reducedMotion: 'Static endpoint, no active video', failedPlayback: 'Injected native play rejection; static Continue safely reveals persisted content', autoplay: 'Injected NotAllowedError retries muted visuals without prompts', persistence: 'Failed write leaves only silent gesture priming; no success presentation', savedVolume: '0.67 applied to initial success playback without slider interaction', watchdog: 'Paused clip with no ended event releases controls through fallback', navigation: 'Detached video paused; no replay on revisit', background: 'Synthetic visibility interruption stops playback and returns to persisted state' };
      },
      async credits() {
        const findings = [];
        for (const mobile of [false, true]) {
          await viewport(mobile); await ready(); await click('Back to Timeline');
          await clickExpression(`document.querySelector('button[aria-label="Settings"]')`);
          await wait(`Boolean(document.querySelector('input[aria-label="Capsule volume"]'))`, 'Settings sound control');
          await evaluate(`(()=>{const slider=document.querySelector('input[aria-label="Capsule volume"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,'37');slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));window.__settingsNode=document.querySelector('[data-testid="settings-page"]');})()`);
          await assert(`JSON.parse(localStorage.getItem('appSettings')).capsuleVolume===0.37`, 'Settings volume was not saved');
          const enter = async () => {
            await evaluate(`document.querySelector('a[href="/#credits"]').addEventListener('click',()=>{window.__settingsScroll=scrollY;},{once:true,capture:true});`);
            await clickExpression(`document.querySelector('a[href="/#credits"]')`);
            await wait(`Boolean(document.querySelector('[data-testid="credits-page"]')) && document.body.textContent.includes('Robert')`, 'in-app credits loaded');
            await assert(`location.origin===${quote(ORIGIN)} && location.hash==='#credits' && document.activeElement.id==='credits-heading'`, 'Credits entry route/focus incorrect');
            await assert(`(()=>{const text=document.querySelector('.trace-credits-document').textContent;const links=[...document.querySelectorAll('.trace-credits-document a')].map(link=>link.href);return !text.includes('Start-Process')&&!text.includes('Users\\\\benma')&&!text.includes('quarter-speed')&&['151133','151142','151134','151123','524260'].every(id=>links.some(link=>link.includes('/sounds/'+id+'/')));})()`, 'Credits expose audition instructions or omit recorded-source links');
          };
          const returned = async () => {
            await wait(`!document.querySelector('[data-testid="credits-page"]') && Math.abs(scrollY-window.__settingsScroll)<3`, 'Settings scroll restored');
            await assert(`window.__settingsNode===document.querySelector('[data-testid="settings-page"]') && document.querySelector('input[aria-label="Capsule volume"]').value==='37' && document.activeElement.textContent==='Credits & licenses'`, 'Credits return lost Settings state/focus');
          };
          await enter(); await screenshot(`${mobile ? 'mobile' : 'desktop'}-credits-top`);
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
          await assert(`document.activeElement.textContent==='Back to Settings'`, 'Credits keyboard return inaccessible');
          await evaluate(`window.scrollTo(0,document.documentElement.scrollHeight);`);
          await assert(`(()=>{const r=document.querySelector('.trace-credits-navigation button').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=44;})()`, 'Credits return control not sticky/visible');
          await overflow(); await screenshot(`${mobile ? 'mobile' : 'desktop'}-credits-bottom`);
          await click('Back to Settings'); await returned();
          await enter();
          const history = await send('Page.getNavigationHistory');
          await send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
          await returned();
          await enter();
          await clickExpression(`document.querySelector('.trace-credits-document a[href^="https://"]')`);
          await wait(`Boolean(document.querySelector('dialog[open]'))`, 'source link dialog');
          await overflow(); await screenshot(`${mobile ? 'mobile' : 'desktop'}-credit-source`);
          const beforeTargets = new Set((await send('Target.getTargets')).targetInfos.map(target => target.targetId));
          await click('Open in browser');
          let external;
          for (let attempt = 0; attempt < 40; attempt++) {
            external = (await send('Target.getTargets')).targetInfos.find(target => !beforeTargets.has(target.targetId) && target.type === 'page' && target.url.startsWith('https://'));
            if (external) break;
            await pause(100);
          }
          if (!external) throw Error('External source did not open a separate browser page');
          await assert(`location.hash==='#credits' && Boolean(document.querySelector('[data-testid="credits-page"]'))`, 'External source replaced the Trace page');
          await send('Target.closeTarget', { targetId: external.targetId }); await send('Page.bringToFront');
          await click('Back to credits'); await click('Back to Settings'); await returned();
          findings.push({ viewport: mobile ? '390x844' : '1440x1000', volume: 0.37, return: 'Sticky button and browser Back preserve Settings DOM, volume, focus, and scroll', external: 'Explicit source action opens a separate page; Trace remains on credits' });
        }
        return findings;
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
        await evaluate(`(${installMediaProbe.toString()})()`);
        const ranges = await evaluate(`Promise.all(${quote(assets.filter(asset => asset.endsWith('.mp4')))}.map(async path=>{const response=await fetch(path,{headers:{Range:'bytes=0-63'}});return {path,status:response.status,range:response.headers.get('Content-Range'),bytes:(await response.arrayBuffer()).byteLength};}))`);
        if (ranges.some(item => item.status !== 206 || item.bytes !== 64)) throw Error('Offline MP4 ranges failed');
        const credits = assets.find(asset => asset.endsWith('.txt'));
        await assert(`fetch(${quote(credits)}).then(response=>response.text()).then(text=>text.includes('Robert')&&text.includes('creativecommons.org'))`, 'Sound attribution unavailable offline');
        await click('Open now'); await beginOpening(); await waitVideoTime(2.7); await screenshot('offline-opening');
        await completeNormally('opening', 'offline-opening'); await photo(); await screenshot('offline-photo');
        await click('Back to Timeline'); await clickExpression(`document.querySelector('button[aria-label="Settings"]')`);
        await clickExpression(`document.querySelector('a[href="/#credits"]')`);
        await wait(`Boolean(document.querySelector('[data-testid="credits-page"]')) && document.body.textContent.includes('Robert')`, 'offline in-app credits');
        await screenshot('offline-credits'); await click('Back to Settings');
        await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        server = await startServer();
        return { availability, ranges, offline: 'App reload, complete opening/final pose, IndexedDB photo, and in-app credits/return succeeded with network disabled and HTTP server stopped' };
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
        fs.writeFileSync(path.join(output, `${name}-failure-video-events.json`), JSON.stringify(await evaluate('({events:window.__filmEvents||[],calls:window.__playCalls||[],phases:window.__ceremonyPhases||[]})'), null, 2));
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
