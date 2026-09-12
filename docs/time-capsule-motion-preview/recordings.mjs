// Development-only review player. Picture and sound share the MP4 media clock.
const get = id => document.getElementById(id);
const films = { open: get('open-film'), close: get('close-film') };
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const frame = 1 / 30;
let kind = 'open';
let phase = 'ready';
let action = 0;
let inspectionMuted = false;
let restartOnResume = false;
let pending = null;
let listeners = null;
let destroyed = false;
const lifecycle = new AbortController();
const active = () => films[kind];
get('film-reduced').checked = preference.matches;

function say(message) {
  if (get('film-status').textContent !== message) get('film-status').textContent = message;
}

function endpoint(film) {
  return Number.isFinite(film.duration) ? Math.max(0, film.duration - frame) : 0;
}

function update() {
  const film = active();
  get('film-scrub').max = Math.max(frame, endpoint(film));
  get('film-scrub').value = film.currentTime;
  get('film-time').value = `${film.currentTime.toFixed(2)} s`;
  get('film-pause').textContent = phase === 'playing' ? 'Pause' : 'Resume';
  get('film-pause').disabled = ['preparing', 'seeking', 'ended', 'reduced', 'error'].includes(phase);
  get('film-state').textContent = kind === 'open' ? 'OPENING STUDY' : 'CLOSING STUDY';
}

function syncSound() {
  const volume = Number(get('film-volume').value) / 100;
  const silent = !get('film-sound').checked || inspectionMuted || get('film-slow').checked || get('film-reduced').checked;
  for (const film of Object.values(films)) {
    film.volume = volume;
    film.muted = silent || film !== active() || phase !== 'playing';
  }
  get('film-volume-value').value = `${Math.round(volume * 100)}%`;
  get('film-audio-status').textContent = get('film-reduced').checked
    ? 'Reduced Motion · silent resting pose'
    : (inspectionMuted || get('film-slow').checked)
      ? 'Inspection muted · replay at 1× for sound'
      : !get('film-sound').checked || volume === 0
        ? 'Sound off'
        : `Sound on · ${Math.round(volume * 100)}% · page session only`;
}

function abortError() {
  return new DOMException('A newer action replaced this request.', 'AbortError');
}

function begin(nextPhase) {
  ++action;
  pending?.abort();
  pending = new AbortController();
  for (const film of Object.values(films)) film.pause();
  phase = nextPhase;
  get('film-stage').classList.remove('is-preparing');
  syncSound();
  update();
  return { token: action, signal: pending.signal };
}

const current = request => request.token === action && !request.signal.aborted && !destroyed;

function waitFor(film, events, test, signal, milliseconds = 10000) {
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      for (const event of events) film.removeEventListener(event, check);
      film.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancelled);
    };
    const finish = error => { cleanup(); error ? reject(error) : resolve(); };
    const check = () => { if (test()) finish(); };
    const failed = () => finish(Error('The recording could not be loaded or decoded.'));
    const cancelled = () => finish(abortError());
    for (const event of events) film.addEventListener(event, check);
    film.addEventListener('error', failed);
    signal.addEventListener('abort', cancelled, { once: true });
    timer = setTimeout(() => finish(Error('The recording took too long to load. Try Replay.')), milliseconds);
    if (signal.aborted) cancelled();
    else if (film.error) failed();
    else check();
  });
}

async function seek(film, time, request) {
  await waitFor(film, ['loadedmetadata'], () => film.readyState >= 1, request.signal);
  if (!current(request)) throw abortError();
  if (!Number.isFinite(film.duration) || film.duration <= 0) throw Error('The recording has no readable duration.');
  const destination = Math.min(Math.max(0, time === 'end' ? endpoint(film) : time), endpoint(film));
  film.currentTime = destination;
  await waitFor(film, ['seeked', 'loadeddata', 'canplay'], () => !film.seeking && film.readyState >= 2 && Math.abs(film.currentTime - destination) < .07, request.signal);
  if (!current(request)) throw abortError();
  update();
}

function expectedPlayback(film) {
  return !destroyed && !document.hidden && phase === 'playing' && film === active() && !get('film-reduced').checked;
}

async function startMedia(film, request) {
  if (!current(request) || document.hidden) throw abortError();
  phase = 'playing';
  syncSound();
  update();
  // An abort also releases our wait if a browser leaves play() pending indefinitely.
  await new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', cancelled); };
    const cancelled = () => { cleanup(); reject(abortError()); };
    request.signal.addEventListener('abort', cancelled, { once: true });
    timer = setTimeout(() => { cleanup(); reject(Error('Playback did not start. Try Replay or the direct clip.')); }, 10000);
    Promise.resolve().then(() => {
      if (!current(request) || !expectedPlayback(film)) throw abortError();
      return film.play();
    }).then(() => {
      cleanup();
      // Do not pause a newer request that now owns this same media element.
      if (!expectedPlayback(film)) film.pause();
      current(request) ? resolve() : reject(abortError());
    }, error => { cleanup(); reject(error); });
  });
}

function fail(error, request) {
  if (!current(request) || error.name === 'AbortError') return;
  for (const film of Object.values(films)) film.pause();
  phase = 'error';
  syncSound();
  get('film-stage').classList.remove('is-preparing');
  say(error.name === 'NotAllowedError' ? 'Playback was blocked. Try Replay or the direct clip below.' : error.message);
  update();
}

async function select(next = kind) {
  if (!films[next] || destroyed) return;
  const request = begin('preparing');
  kind = next;
  restartOnResume = true;
  inspectionMuted = get('film-slow').checked;
  const film = active();
  Object.entries(films).forEach(([name, item]) => { item.hidden = name !== kind; });
  film.playbackRate = get('film-slow').checked ? .25 : 1;
  get('film-stage').classList.add('is-preparing');
  syncSound();
  update();
  say(get('film-reduced').checked ? 'Preparing the resting pose…' : 'Preparing the starting pose…');
  try {
    await seek(film, get('film-reduced').checked ? 'end' : 0, request);
    if (!current(request)) return;
    restartOnResume = false;
    get('film-stage').classList.remove('is-preparing');
    if (get('film-reduced').checked) {
      phase = 'reduced';
      say(kind === 'open' ? 'Open · silent resting endpoint' : 'Sealed · silent resting endpoint');
    } else if (document.hidden) {
      phase = 'paused';
      say('Paused · press Resume when ready');
    } else {
      await startMedia(film, request);
      if (!current(request)) return;
      say(kind === 'open' ? 'Opening · picture and sound share one clock' : 'Closing · picture and sound share one clock');
    }
    update();
  } catch (error) { fail(error, request); }
}

async function goTo(time, nextPhase, message) {
  if (destroyed) return;
  const request = begin('seeking');
  restartOnResume = false;
  inspectionMuted = true;
  syncSound();
  try {
    await seek(active(), time, request);
    if (!current(request)) return;
    phase = nextPhase;
    say(message);
    update();
  } catch (error) { fail(error, request); }
}

function skip() {
  return goTo('end', get('film-reduced').checked ? 'reduced' : 'ended', kind === 'open' ? 'Open · silent resting endpoint' : 'Sealed · silent resting endpoint');
}

function stop() {
  return get('film-reduced').checked
    ? skip()
    : goTo(0, 'stopped', 'Stopped · starting pose');
}

function scrub(time) {
  if (!Number.isFinite(Number(time))) return;
  if (get('film-reduced').checked) return skip();
  return goTo(Number(time), 'paused', 'Frame inspection · muted until a normal-speed replay');
}

async function pauseResume() {
  if (destroyed) return;
  if (get('film-reduced').checked) return skip();
  if (phase === 'playing') {
    begin('paused');
    say('Paused · press Resume to continue');
    return;
  }
  if (['preparing', 'seeking', 'ended', 'reduced', 'error'].includes(phase)) return;
  if (restartOnResume) return select();
  const request = begin('paused');
  syncSound();
  try {
    await waitFor(active(), ['loadeddata', 'canplay'], () => active().readyState >= 2, request.signal);
    if (!current(request)) return;
    await startMedia(active(), request);
    if (current(request)) say(inspectionMuted || get('film-slow').checked ? 'Playing · silent inspection' : 'Playing · picture and sound share one clock');
  } catch (error) { fail(error, request); }
}

function setSlow(enabled) {
  get('film-slow').checked = Boolean(enabled);
  if (enabled) inspectionMuted = true;
  for (const film of Object.values(films)) film.playbackRate = enabled ? .25 : 1;
  syncSound();
}

function setReduced(enabled) {
  get('film-reduced').checked = Boolean(enabled);
  syncSound();
  if (enabled) return skip();
  if (phase === 'reduced') phase = 'ended';
  say('Ready · choose Open, Close, or Replay');
  update();
}

function suspend(message = 'Paused · press Resume when ready') {
  const inactive = ['ready', 'stopped', 'ended', 'reduced', 'error'].includes(phase);
  begin(inactive ? phase : 'paused');
  if (!inactive) say(message);
}

function bind() {
  if (listeners || destroyed) return;
  listeners = new AbortController();
  const on = (target, event, callback) => target.addEventListener(event, callback, { signal: listeners.signal });
  on(get('film-open'), 'click', () => select('open'));
  on(get('film-close'), 'click', () => select('close'));
  on(get('film-replay'), 'click', () => select());
  on(get('film-stop'), 'click', stop);
  on(get('film-skip'), 'click', skip);
  on(get('film-pause'), 'click', pauseResume);
  on(get('film-scrub'), 'input', event => scrub(event.target.value));
  on(get('film-slow'), 'change', event => setSlow(event.target.checked));
  on(get('film-reduced'), 'change', event => setReduced(event.target.checked));
  on(get('film-sound'), 'change', syncSound);
  on(get('film-volume'), 'input', syncSound);
  on(preference, 'change', event => setReduced(event.matches));
  on(document, 'visibilitychange', () => {
    if (document.hidden) suspend();
    else if (get('film-reduced').checked) skip();
  });
  on(document, 'freeze', () => suspend());
  for (const film of Object.values(films)) {
    on(film, 'play', () => { if (!expectedPlayback(film)) film.pause(); });
    on(film, 'timeupdate', () => { if (film === active() && phase !== 'seeking') update(); });
    on(film, 'loadedmetadata', () => { if (film === active()) update(); });
    on(film, 'ended', () => {
      if (film !== active() || phase !== 'playing' || film.currentTime < endpoint(film) - .1) return;
      phase = 'ended';
      syncSound();
      say(kind === 'open' ? 'Open · resting endpoint' : 'Sealed · resting endpoint');
      update();
    });
    on(film, 'error', () => {
      if (film !== active()) return;
      begin('error');
      say('Recording unavailable. Try reloading this page or use the direct clip below.');
    });
  }
}

function pageHide() {
  suspend();
  listeners?.abort();
  listeners = null;
}

function pageShow(event) {
  bind();
  if (event.persisted) {
    suspend();
    syncSound();
    if (get('film-reduced').checked) skip();
  }
}

function destroy() {
  pageHide();
  destroyed = true;
  pending?.abort();
  lifecycle.abort();
}

window.addEventListener('pagehide', pageHide, { signal: lifecycle.signal });
window.addEventListener('pageshow', pageShow, { signal: lifecycle.signal });
bind();
syncSound();
update();
if (get('film-reduced').checked) skip();

// Read-only diagnostics plus the same actions as the controls, for local validation.
window.capsuleFilms = Object.freeze({
  play: select, stop, skip, scrub, pauseResume, setSlow, setReduced, destroy,
  setSound(enabled) { get('film-sound').checked = Boolean(enabled); syncSound(); },
  setVolume(value) { get('film-volume').value = Math.min(100, Math.max(0, Number(value) || 0)); syncSound(); },
  getState() {
    return {
      kind, phase, action, inspectionMuted, slow: get('film-slow').checked,
      reduced: get('film-reduced').checked, soundEnabled: get('film-sound').checked,
      volume: Number(get('film-volume').value) / 100, hidden: document.hidden,
      bound: Boolean(listeners), destroyed,
      films: Object.fromEntries(Object.entries(films).map(([name, film]) => [name, {
        paused: film.paused, muted: film.muted, currentTime: film.currentTime,
        duration: film.duration, playbackRate: film.playbackRate, hidden: film.hidden,
        readyState: film.readyState, error: film.error?.code ?? null,
      }])),
    };
  },
});
