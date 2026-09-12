import { createVault } from './vault.mjs';
import { durations, sampleMotion } from './motion.mjs';

const byId=id=>document.getElementById(id);
const controls=['open','close','replay','skip','slow','reduced','effects','scrub'].map(byId);
let vault;
try { vault=createVault(byId('vault')); }
catch(error) { byId('failure').hidden=false;byId('failure').textContent='This preview needs WebGL 2. Try a browser with graphics acceleration enabled. '+error.message;controls.forEach(c=>c.disabled=true);throw error; }
let kind='open', seconds=0, playing=false, frame=0, previous=0, samples=[];
const preference=matchMedia('(prefers-reduced-motion: reduce)');
byId('reduced').checked=preference.matches;
function draw(){
  const pose=sampleMotion(kind,seconds);
  vault.apply(pose,byId('effects').checked,seconds);vault.render();
  if(byId('phase').textContent!==pose.phase)byId('phase').textContent=pose.phase;
  byId('time').textContent=`${seconds.toFixed(2)} / ${durations[kind].toFixed(2)} s`;
  byId('scrub').max=durations[kind];byId('scrub').value=seconds;
  byId('angle').textContent=`Hinge ${Math.round(pose.angle*180/Math.PI)}°`;
  byId('endpoint').textContent=pose.angle===0?(pose.bolts===1?'SEALED':'LID SEATED'):pose.angle>=102*Math.PI/180?'OPEN':kind==='open'?'OPENING':'CLOSING';
  byId('skip').disabled=!playing;
}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=0;}
function tick(now){
  frame=0;
  if(!playing||document.hidden)return;
  // Suspension is a pause: a delayed frame never jumps to the end.
  const rawDelta=previous?(now-previous)/1000:0;previous=now;
  const delta=Math.min(rawDelta,.1);
  if(rawDelta>0)samples.push(rawDelta*1000);
  seconds=Math.min(durations[kind],seconds+delta*(byId('slow').checked?.25:1));
  if(seconds>=durations[kind])stop();
  draw();if(playing)frame=requestAnimationFrame(tick);
}
function play(nextKind=kind){
  stop();kind=nextKind;seconds=byId('reduced').checked?durations[kind]:0;samples=[];
  playing=!byId('reduced').checked;draw();if(playing)frame=requestAnimationFrame(tick);
}
function skip(){stop();seconds=durations[kind];draw();}
function seek(nextKind,time){stop();kind=nextKind;seconds=Math.min(durations[kind],Math.max(0,Number(time)||0));draw();}
byId('open').onclick=()=>play('open');byId('close').onclick=()=>play('close');
byId('replay').onclick=()=>play();byId('skip').onclick=skip;
byId('scrub').oninput=e=>seek(kind,e.target.value);
byId('reduced').onchange=()=>{if(byId('reduced').checked)skip();};
byId('effects').onchange=draw;
function preferenceChanged(e){byId('reduced').checked=e.matches;if(e.matches)skip();}
preference.addEventListener('change',preferenceChanged);
function visibilityChanged(){cancelAnimationFrame(frame);frame=0;previous=0;if(!document.hidden&&playing)frame=requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',visibilityChanged);
const resize=new ResizeObserver(([entry])=>{vault.resize(entry.contentRect.width,entry.contentRect.height);draw();});resize.observe(byId('viewport'));
const rect=byId('viewport').getBoundingClientRect();vault.resize(rect.width,rect.height);draw();
byId('vault').addEventListener('webglcontextlost',e=>{e.preventDefault();stop();byId('failure').hidden=false;byId('failure').textContent='Graphics playback was interrupted. Reload this preview to restore it.';controls.forEach(c=>c.disabled=true);});
window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;previous=0;if(!event.persisted){stop();resize.disconnect();preference.removeEventListener('change',preferenceChanged);document.removeEventListener('visibilitychange',visibilityChanged);vault.dispose();}});
window.addEventListener('pageshow',event=>{if(event.persisted){cancelAnimationFrame(frame);frame=0;previous=0;draw();if(playing)frame=requestAnimationFrame(tick);}});
// Read-only diagnostics and deterministic frame selection for this dev page.
window.capsulePreview={play,skip,seek,draw,inspect:()=>({kind,seconds,playing,slow:byId('slow').checked,reduced:byId('reduced').checked,effects:byId('effects').checked,frameTimes:samples.slice(),...vault.diagnostics()})};
