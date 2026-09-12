// Pure choreography: approved recordings establish the mechanical cue times.
export const durations = Object.freeze({ open: 6, close: 5.4 });
export const audioOffsets = Object.freeze({ open: 0, close: 2.345 });
export const cues = Object.freeze({ air: 1.82, contact: 2.6, boltTravel: 3.615, lockContact: 3.89 });
const MAX_ANGLE = 102 * Math.PI / 180;
const CRACK = 1.7 * Math.PI / 180;
const clamp = (v, low = 0, high = 1) => Math.min(high, Math.max(low, v));
const smooth = v => v*v*v*(v*(v*6-15)+10);
const progress = (t,a,b) => smooth(clamp((t-a)/(b-a)));
const interiorLight = a => smooth(clamp(a/(24*Math.PI/180)));
function openPose(t) {
  // Retracted bolts first; an actual narrow hinge gap breaks the gasket seal.
  const angle = t < 2.18 ? CRACK*progress(t,1.72,1.96)
    : CRACK+(MAX_ANGLE-CRACK)*progress(t,2.18,5.35);
  let phase='Sealed';
  if(t>=.12)phase='Turning lock';
  if(t>=.57)phase='Retracting bolts';
  if(t>=1.43)phase='Releasing seal';
  if(t>=1.82)phase='Venting the lid seam';
  if(t>=2.18)phase='Lifting on damped supports';
  if(t>=5.35)phase='Open';
  return {angle,bolts:1-progress(t,.57,1.40),dial:1-progress(t,.12,.57),valve:0,
    light:interiorLight(angle),pressure:progress(t,1.82,1.94)*(1-progress(t,3.22,4.17)),phase};
}
function closePose(t) {
  // Gravity-like acceleration followed by the supports' resistance. The final
  // approach retains velocity until contact; no slow hover, bounce or lid reversal.
  const u=clamp((t-.30)/(2.6-.30));
  const remaining=1-(1.8*u*u-.8*u*u*u);
  const angle=MAX_ANGLE*remaining;
  let phase='Open';
  if(t>=.30)phase='Lowering the lid';
  if(t>=2.40)phase='Approaching the gasket';
  if(t>=2.60)phase='Lid contact';
  if(t>=3.615)phase='Engaging locking bolts';
  if(t>=3.89)phase='Lock engagement';
  if(t>=4.10)phase='Sealed';
  return {angle,bolts:progress(t,3.615,3.89),dial:progress(t,3.65,4.10),valve:0,
    // Closing keeps the cavity lit during descent, then powers down at seating.
    // It does not play the opening's angle-driven warm-up backwards.
    light:1-progress(t,2.45,2.60),pressure:0,phase};
}
export function sampleMotion(kind, seconds=0) {
  if(kind!=='open'&&kind!=='close')throw new TypeError(`Unknown capsule motion: ${kind}`);
  const supplied=Number(seconds),time=clamp(Number.isNaN(supplied)?0:supplied,0,durations[kind]);
  return {...(kind==='open'?openPose(time):closePose(time)),done:time>=durations[kind]};
}
