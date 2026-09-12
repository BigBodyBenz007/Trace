const get=id=>document.getElementById(id);
const films={open:get('open-film'),close:get('close-film')};
const preference=matchMedia('(prefers-reduced-motion: reduce)');
get('film-reduced').checked=preference.matches;
let kind='open',action=0;
const active=()=>films[kind];
function say(message){if(get('film-status').textContent!==message)get('film-status').textContent=message;}
function update(){const film=active();get('film-scrub').max=Number.isFinite(film.duration)?film.duration:8.6;get('film-scrub').value=film.currentTime;get('film-time').textContent=`${film.currentTime.toFixed(2)} s`;}
async function ready(film){if(film.readyState>=1)return;await new Promise((resolve,reject)=>{const cleanup=()=>{film.removeEventListener('loadedmetadata',loaded);film.removeEventListener('error',failed);};const loaded=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('This browser could not decode the recording.'));};film.addEventListener('loadedmetadata',loaded);film.addEventListener('error',failed);if(film.error)failed();});}
async function finish(){const token=++action;const film=active();film.pause();try{await ready(film);if(token!==action)return;film.currentTime=Math.max(0,film.duration-1/30);say(kind==='open'?'Open · resting endpoint':'Sealed · resting endpoint');update();}catch(error){say(error.message);}}
async function play(next=kind){const token=++action;Object.values(films).forEach(f=>f.pause());kind=next;const film=active();try{await ready(film);if(token!==action)return;Object.entries(films).forEach(([name,f])=>f.hidden=name!==kind);get('film-state').textContent=kind==='open'?'OPENING STUDY':'CLOSING STUDY';film.playbackRate=get('film-slow').checked?.25:1;film.currentTime=0;if(get('film-reduced').checked){await finish();return;}await film.play();if(token===action)say(kind==='open'?'Opening · rendered sequence':'Closing · rendered sequence');}catch(error){say(error.message+' Try the direct file link below.');}}
get('film-open').onclick=()=>play('open');get('film-close').onclick=()=>play('close');get('film-replay').onclick=()=>play();get('film-skip').onclick=finish;
get('film-pause').onclick=()=>{const film=active();if(get('film-reduced').checked){finish();return;}if(film.paused)film.play().then(()=>say('Playing')).catch(()=>say('Playback unavailable. Try the direct file link.'));else{film.pause();say('Paused · inspect the frame');}};
get('film-slow').onchange=()=>{active().playbackRate=get('film-slow').checked?.25:1;};
get('film-reduced').onchange=()=>{if(get('film-reduced').checked)finish();};
get('film-scrub').oninput=async e=>{const token=++action,film=active(),time=Number(e.target.value);film.pause();try{await ready(film);if(token!==action)return;film.currentTime=Math.min(time,film.duration-1/30);say('Paused · inspect the frame');update();}catch(error){say(error.message);}};
const changed=e=>{get('film-reduced').checked=e.matches;if(e.matches)finish();};preference.addEventListener('change',changed);
for(const film of Object.values(films)){film.addEventListener('timeupdate',()=>{if(film===active())update();});film.addEventListener('loadedmetadata',update);film.addEventListener('ended',()=>{if(film===active())say(kind==='open'?'Open · resting endpoint':'Sealed · resting endpoint');});film.addEventListener('error',()=>say('Recording unavailable in this browser. Try the live inspector or direct file link.'));}
document.addEventListener('visibilitychange',()=>{if(document.hidden){++action;Object.values(films).forEach(f=>f.pause());say('Paused · press resume when ready');}});
window.addEventListener('pagehide',()=>{++action;Object.values(films).forEach(f=>f.pause());});
