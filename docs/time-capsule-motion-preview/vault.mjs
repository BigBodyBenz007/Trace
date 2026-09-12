import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Geometry uses metres, Y up, Z toward the viewer. All moving lid parts share
// ONE parent whose origin is the rear hinge axis. No image assets are used.
export function createVault(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x101518);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3.6, -3.6, .1, 70);
  camera.position.set(5.6, 10.5, 14);
  camera.lookAt(0, 2.8, 0);
  const body = new THREE.Group(); scene.add(body);
  const lid = new THREE.Group(); lid.position.set(0, 2.16, -1.94); scene.add(lid);
  const shell = new THREE.Group(); shell.position.z=.34; lid.add(shell);
  const resources = new Set();
  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, material); m.position.set(...position);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const boxes = new Map();
  function box(w, h, d, r, mat, parent, p) {
    const key = [w,h,d,r].join(',');
    if (!boxes.has(key)) boxes.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
    return mesh(boxes.get(key), mat, parent, p);
  }
  function cylinder(radius, length, mat, parent, p, axis = 'z') {
    const m = mesh(new THREE.CylinderGeometry(radius, radius, length, 40), mat, parent, p);
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    return m;
  }
  function ring(radius, tube, mat, parent, p, axis = 'z') {
    const m = mesh(new THREE.TorusGeometry(radius, tube, 8, 48), mat, parent, p);
    if (axis === 'x') m.rotation.y = Math.PI / 2;
    return m;
  }
  function roundedPath(w, h, r, Path = THREE.Shape) {
    const s = new Path(), x=-w/2, y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function frame(w,d,r,wall,height,mat,parent,y,z=0) {
    const shape=roundedPath(w,d,r);
    shape.holes.push(roundedPath(w-wall*2,d-wall*2,Math.max(.06,r-wall),THREE.Path));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025,curveSegments:12});
    geometry.rotateX(-Math.PI/2);
    return mesh(geometry,mat,parent,[0,y,z]);
  }
  function slab(w,d,r,height,mat,parent,y,z=0) {
    const geometry=new THREE.ExtrudeGeometry(roundedPath(w,d,r),{depth:height,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025,curveSegments:12});
    geometry.rotateX(-Math.PI/2);return mesh(geometry,mat,parent,[0,y,z]);
  }
  // Deterministic procedural surface authoring; no generated/baked object art.
  let seed=19;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const surface=document.createElement('canvas');surface.width=surface.height=512;
  const ctx=surface.getContext('2d');ctx.fillStyle='#72787b';ctx.fillRect(0,0,512,512);
  for(let i=0;i<40000;i++){const n=Math.floor(random()*58+81);ctx.fillStyle=`rgba(${n},${n+4},${n+6},.24)`;ctx.fillRect(random()*512,random()*512,1+random()*3,1);}
  for(let i=0;i<1600;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=i%4?'rgba(24,30,34,.24)':'rgba(208,195,157,.3)';ctx.lineWidth=.3+random()*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*10-5,y+random()*3);ctx.stroke();}
  const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(.24,.24);resources.add(texture);
  const steel=new THREE.MeshStandardMaterial({color:0xc5d1da,map:texture,metalness:.78,roughness:.43,bumpMap:texture,bumpScale:.014});
  const brass=new THREE.MeshStandardMaterial({color:0xba8d47,metalness:.82,roughness:.32,bumpMap:texture,bumpScale:.009});
  const edge=new THREE.MeshStandardMaterial({color:0x6f7982,metalness:.88,roughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:0x151c21,metalness:.62,roughness:.5});
  const rubber=new THREE.MeshStandardMaterial({color:0x070b0c,roughness:.92});
  const liner=new THREE.MeshStandardMaterial({color:0x292927,roughness:.94});
  const inner=new THREE.MeshStandardMaterial({color:0x736044,metalness:.72,roughness:.52});
  const lamp=new THREE.MeshStandardMaterial({color:0xdac49b,emissive:0xffc773,emissiveIntensity:0,roughness:.38});
  // A studio environment provides metal reflections independently of effects.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x515b66);
  const panels=[[[-4,6,4],[4,7,1],0xffffff,4],[[5,4,-4],[3,6,1],0xd5bc8c,3],[[0,7,0],[7,1,4],0xffffff,2]];
  for(const [position,scale,color,intensity] of panels){const p=new THREE.Mesh(new THREE.BoxGeometry(...scale),new THREE.MeshBasicMaterial({color}));p.material.color.multiplyScalar(intensity);p.position.set(...position);p.lookAt(0,1,0);studio.add(p);}
  const pmrem=new THREE.PMREMGenerator(renderer), environment=pmrem.fromScene(studio,.06);scene.environment=environment.texture;scene.environmentIntensity=.85;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xb9ccd7,0x3b3025,1.5));
  const key=new THREE.DirectionalLight(0xffe5bd,4.2);key.position.set(-4,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=7;key.shadow.camera.bottom=-4;key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
  const fill=new THREE.DirectionalLight(0xaac8e0,1.7);fill.position.set(5,5,-4);scene.add(fill);
  const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x030608,roughness:1}),scene,[0,.04,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  // Hollow shell. Rim, walls, floor and lid share the same footprint.
  slab(6.4,3.2,.57,.24,steel,body,.42);
  frame(6.4,3.2,.57,.22,1.35,steel,body,.68);
  frame(6.42,3.22,.58,.14,.08,brass,body,2.03);
  frame(6.15,2.95,.45,.06,.045,rubber,body,2.13);
  frame(5.9,2.7,.34,.055,1.13,inner,body,.76);
  box(5.68,.09,2.48,.15,liner,body,[0,.79,0]);
  frame(6.43,3.23,.57,.13,.1,dark,body,.67);
  for(const x of [-2.65,2.65]) {
    for(const z of [-1.05,1.05]){box(.64,.37,.63,.12,dark,body,[x,.29,z]);box(.65,.12,.66,.05,brass,body,[x,.45,z]);}
    box(.18,1.38,.09,.025,brass,body,[x,1.34,1.6]);
    box(.12,1.22,.06,.015,edge,body,[x+.17,1.33,1.61]);
  }
  for(const s of [-1,1]) {
    cylinder(.67,.15,dark,body,[s*3.18,1.32,0],'x');
    ring(.56,.065,brass,body,[s*3.28,1.32,0],'x');
    cylinder(.41,.09,steel,body,[s*3.29,1.32,0],'x');
    ring(.3,.035,edge,body,[s*3.36,1.32,0],'x');
    cylinder(.2,.12,brass,body,[s*3.35,1.32,0],'x');
  }
  // Lid cavity, shell and inset underside remain solid, opaque meshes.
  slab(6.4,3.2,.57,.2,steel,shell,.19,1.6);
  frame(6.4,3.2,.57,.25,.18,steel,shell,.04,1.6);
  frame(6.42,3.22,.57,.12,.065,brass,shell,.015,1.6);
  box(5.79,.055,2.59,.2,inner,shell,[0,.17,1.6]);
  box(5.25,.035,2.08,.16,dark,shell,[0,.128,1.6]);
  box(4.92,.025,1.77,.12,steel,shell,[0,.105,1.6]);
  slab(5.56,2.36,.3,.055,dark,shell,.39,1.6);
  slab(5.3,2.12,.23,.035,steel,shell,.455,1.6);
  for(const x of [-2.7,2.7]) { box(.15,.08,2.79,.03,brass,shell,[x,.4,1.6]);box(.065,.05,1.8,.018,lamp,shell,[x,.045,1.6]); }
  // Two interleaved bearing assemblies lie on the exact rotation axis.
  for(const x of [-2.27,2.27]) {
    for(const dx of [-.23,.23]){cylinder(.19,.2,brass,body,[x+dx,2.16,-1.94],'x');box(.2,.3,.55,.025,brass,body,[x+dx,1.94,-1.7]);}
    cylinder(.145,.24,edge,lid,[x,0,0],'x');
    box(.25,.12,.46,.03,steel,lid,[x,.045,.3]);
    cylinder(.073,.81,dark,body,[x,2.16,-1.94],'x');
  }
  // Visible bolt guides, vertical locking bolts and matching lid sockets.
  const bolts=[];
  for(const x of [-2,2]) {
    box(.36,.68,.18,.05,dark,body,[x,1.66,1.64]);
    for(const y of [1.45,1.87])box(.32,.12,.24,.025,brass,body,[x,y,1.71]);
    const bolt=new THREE.Group();body.add(bolt);bolts.push(bolt);
    box(.15,.76,.12,.03,brass,bolt,[x,1.96,1.72]);
    cylinder(.13,.075,edge,bolt,[x,1.69,1.83]);
    box(.32,.18,.18,.03,brass,shell,[x,.17,3.26]);
    box(.18,.08,.025,.01,dark,shell,[x,.14,3.36]);
    box(1.18,.13,.1,.025,brass,body,[x*.59,1.39,1.66]);
    box(1.15,.06,.1,.02,dark,body,[x*.6,1.56,1.65]);
  }
  cylinder(.56,.14,dark,body,[0,1.41,1.64]);ring(.5,.062,brass,body,[0,1.41,1.75]);
  cylinder(.397,.15,steel,body,[0,1.41,1.75]);ring(.31,.028,edge,body,[0,1.41,1.85]);
  const dial=new THREE.Group();dial.position.set(0,1.41,1.87);body.add(dial);
  cylinder(.238,.09,brass,dial,[0,0,0]);box(.058,.31,.08,.015,dark,dial,[0,0,.06]);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=box(.018,.06,.018,.005,brass,body,[Math.sin(a)*.41,1.41+Math.cos(a)*.41,1.864]);tick.rotation.z=-a;}
  // Vent is separate from the hinge and front locks; emission originates here.
  cylinder(.145,.1,dark,body,[2.8,1.9,1.54]);
  const valve=cylinder(.093,.11,brass,body,[2.8,1.9,1.61]);
  for(let i=-1;i<=1;i++)box(.13,.015,.016,.005,rubber,body,[2.8,1.9+i*.046,1.675]);
  const screwGeo=new THREE.CylinderGeometry(.035,.035,.025,10);screwGeo.rotateX(Math.PI/2);
  const screwPoints=[];
  for(const x of [-2.72,-2.4,-1.67,-.73,.73,1.67,2.4,2.72])for(const y of [.87,1.99])screwPoints.push([x,y,1.626]);
  const screws=new THREE.InstancedMesh(screwGeo,brass,screwPoints.length),matrix=new THREE.Matrix4();
  screwPoints.forEach((p,i)=>{matrix.makeTranslation(...p);screws.setMatrixAt(i,matrix);});body.add(screws);
  // Synthetic keepsakes stay physically inside the same cavity throughout.
  const cardCanvas=document.createElement('canvas');cardCanvas.width=512;cardCanvas.height=320;
  const c=cardCanvas.getContext('2d');c.fillStyle='#d8cfb9';c.fillRect(0,0,512,320);c.fillStyle='#42585c';c.fillRect(22,22,468,215);c.fillStyle='#9c9b7c';c.beginPath();c.moveTo(22,237);c.lineTo(165,80);c.lineTo(300,237);c.fill();c.fillStyle='#728981';c.beginPath();c.moveTo(160,237);c.lineTo(350,64);c.lineTo(490,237);c.fill();c.fillStyle='#3f413b';c.font='17px Georgia';c.fillText('A PLACE TO REMEMBER',25,280);c.font='11px sans-serif';c.fillText('SYNTHETIC STUDY / 01',330,300);
  const cardTexture=new THREE.CanvasTexture(cardCanvas);cardTexture.colorSpace=THREE.SRGBColorSpace;resources.add(cardTexture);
  const paper=new THREE.MeshStandardMaterial({color:0xd6cbb0,roughness:.93});
  const envelope=box(2.35,.075,1.3,.035,paper,body,[-.7,.91,-.38]);envelope.rotation.y=-.13;
  const card=mesh(new THREE.BoxGeometry(1.88,.035,1.18),[paper,paper,new THREE.MeshStandardMaterial({map:cardTexture,roughness:.88}),paper,paper,paper],body,[.72,1,-.38]);card.rotation.y=.18;
  const interiorLights=[];
  for(const x of [-2.55,2.55]){box(.045,.7,.06,.01,lamp,body,[x,1.48,-1.2]);const light=new THREE.PointLight(0xffc77d,0,3,2);light.position.set(x,1.85,0);body.add(light);interiorLights.push(light);}
  const vaporCanvas=document.createElement('canvas');vaporCanvas.width=vaporCanvas.height=64;const v=vaporCanvas.getContext('2d');const gradient=v.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(189,202,204,.35)');gradient.addColorStop(.4,'rgba(189,202,204,.13)');gradient.addColorStop(1,'rgba(189,202,204,0)');v.fillStyle=gradient;v.fillRect(0,0,64,64);const vaporTexture=new THREE.CanvasTexture(vaporCanvas);resources.add(vaporTexture);
  const vapor=Array.from({length:9},()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:vaporTexture,transparent:true,depthWrite:false,opacity:0}));scene.add(s);return s;});
  let lastPose;
  function apply(pose,effects=true,time=0) {
    lastPose=pose;lid.rotation.x=-pose.angle;
    for(const b of bolts)b.position.y=-(1-pose.bolts)*.43;
    dial.rotation.z=(1-pose.dial)*Math.PI*.7;
    valve.position.z=1.61+pose.valve*.07;
    lamp.emissiveIntensity=effects?pose.light*2.4:0;
    for(const l of interiorLights)l.intensity=effects?pose.light*2:0;
    vapor.forEach((s,i)=>{const age=((time*1.35+i/9)%1+1)%1;s.position.set(2.81+age*.32,1.93+age*.55,1.7+age*.65);s.scale.setScalar(.1+age*.55);s.material.opacity=effects?pose.pressure*Math.sin(age*Math.PI)*.28:0;s.visible=s.material.opacity>.001;});
    scene.updateMatrixWorld(true);
  }
  // Fit the union of both poses once, then retain identical framing throughout.
  camera.updateMatrixWorld(true);
  const projected=new THREE.Box3();
  for(const angle of [0,102*Math.PI/180]) {
    lid.rotation.x=-angle;scene.updateMatrixWorld(true);
    for(const root of [body,lid])root.traverse(o=>{if(!o.geometry)return;const points=o.geometry.attributes.position;for(let i=0;i<points.count;i++){const point=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);projected.expandByPoint(point);}});
  }
  lid.rotation.x=0;
  const fitCenter=projected.getCenter(new THREE.Vector3()),fitSize=projected.getSize(new THREE.Vector3());
  function resize(width,height) {
    const aspect=width/height, viewHeight=Math.max(fitSize.y*1.16,fitSize.x*1.16/aspect);
    camera.left=fitCenter.x-viewHeight*aspect/2;camera.right=fitCenter.x+viewHeight*aspect/2;camera.top=fitCenter.y+viewHeight/2;camera.bottom=fitCenter.y-viewHeight/2;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  function render(){renderer.render(scene,camera);}
  function diagnostics(){const hingeOrigin=new THREE.Vector3();lid.getWorldPosition(hingeOrigin);return {hinge:hingeOrigin.toArray(),lidAngle:lid.rotation.x,bodyMatrix:body.matrixWorld.elements.slice(),camera:camera.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pose:lastPose};}
  function dispose(){const geometries=new Set(),materials=new Set();scene.traverse(o=>{o.shadow?.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());resources.forEach(t=>t.dispose());environment.dispose();renderer.dispose();}
  return {apply,resize,render,diagnostics,dispose};
}
