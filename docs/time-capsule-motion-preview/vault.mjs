import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Geometry uses metres, Y up, Z toward the viewer. All moving lid parts share
// ONE parent whose origin is the rear hinge axis. No image assets are used.
export function createVault(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x0b1117);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3.6, -3.6, .1, 70);
  camera.position.set(4.6, 9.5, 15);
  camera.lookAt(0, 2.8, 0);
  const body = new THREE.Group(); scene.add(body);
  const hingeZ = -1.79;
  const lid = new THREE.Group(); lid.position.set(0, 2.16, hingeZ); scene.add(lid);
  const shell = new THREE.Group(); shell.position.z=.19; lid.add(shell);
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
  const ctx=surface.getContext('2d');ctx.fillStyle='#77828a';ctx.fillRect(0,0,512,512);
  // Broad irregular patina below fine machining marks, independent of lighting.
  for(let i=0;i<2600;i++){const x=random()*512,y=random()*512,r=2+random()*24;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'rgba(18,28,37,.13)':'rgba(165,150,113,.17)');g.addColorStop(1,'rgba(80,87,91,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<40000;i++){const n=Math.floor(random()*58+81);ctx.fillStyle=`rgba(${n},${n+4},${n+6},.24)`;ctx.fillRect(random()*512,random()*512,1+random()*3,1);}
  for(let i=0;i<2200;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=i%4?'rgba(24,30,34,.3)':'rgba(208,195,157,.38)';ctx.lineWidth=.3+random()*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*18-9,y+random()*7-3);ctx.stroke();}
  const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(.24,.24);resources.add(texture);
  const steel=new THREE.MeshStandardMaterial({color:0xd4dde4,map:texture,metalness:.76,roughness:.41,bumpMap:texture,bumpScale:.022});
  const brass=new THREE.MeshStandardMaterial({color:0xc4a065,metalness:.78,roughness:.34,bumpMap:texture,bumpScale:.016});
  const polished=new THREE.MeshStandardMaterial({color:0xb99862,metalness:.9,roughness:.25});
  const edge=new THREE.MeshStandardMaterial({color:0x6f7982,metalness:.88,roughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:0x151c21,metalness:.62,roughness:.5});
  const rubber=new THREE.MeshStandardMaterial({color:0x070b0c,roughness:.92});
  const liner=new THREE.MeshStandardMaterial({color:0x292927,roughness:.94});
  const inner=new THREE.MeshStandardMaterial({color:0xb49967,metalness:.55,roughness:.45,bumpMap:texture,bumpScale:.008});
  const lamp=new THREE.MeshStandardMaterial({color:0xdac49b,emissive:0xffc773,emissiveIntensity:0,roughness:.38});
  // A studio environment provides metal reflections independently of effects.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x66717d);
  const panels=[[[-4,6,4],[4,7,1],0xffffff,4],[[5,4,-4],[3,6,1],0xd5bc8c,3],[[0,7,0],[7,1,4],0xffffff,2]];
  for(const [position,scale,color,intensity] of panels){const p=new THREE.Mesh(new THREE.BoxGeometry(...scale),new THREE.MeshBasicMaterial({color}));p.material.color.multiplyScalar(intensity);p.position.set(...position);p.lookAt(0,1,0);studio.add(p);}
  const pmrem=new THREE.PMREMGenerator(renderer), environment=pmrem.fromScene(studio,.06);scene.environment=environment.texture;scene.environmentIntensity=.85;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xb9ccd7,0x302820,1.2));
  const key=new THREE.DirectionalLight(0xffe5bd,3.4);key.position.set(-4,11,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=7;key.shadow.camera.bottom=-4;key.shadow.normalBias=.012;key.shadow.bias=-.00012;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xaac8e0,1.7);fill.position.set(5,5,-4);scene.add(fill);
  const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x030609,roughness:1}),scene,[0,.04,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  scene.fog=new THREE.FogExp2(0x0b1117,.027);
  // Hollow shell. Rim, walls, floor and lid share the same footprint.
  slab(6.4,3.2,.57,.24,steel,body,.42);
  frame(6.4,3.2,.57,.22,1.35,steel,body,.68);
  frame(6.42,3.22,.58,.14,.095,brass,body,2.03);
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
    for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(.045,.045,polished,body,[s*3.39,1.32+Math.sin(a)*.47,Math.cos(a)*.47],'x');}
    box(1.82,.83,.06,.08,dark,body,[s*1.55,1.32,1.612]);
    box(1.72,.73,.04,.065,steel,body,[s*1.55,1.32,1.654]);
    for(const z of [-1.12,1.12])box(.13,1.12,.18,.04,brass,body,[s*3.14,1.35,z]);
  }
  // Lid cavity, shell and inset underside remain solid, opaque meshes.
  slab(6.4,3.2,.57,.3,steel,shell,.19,1.6);
  frame(6.4,3.2,.57,.25,.18,steel,shell,.04,1.6);
  frame(6.42,3.22,.57,.12,.065,brass,shell,.015,1.6);
  box(5.79,.055,2.59,.2,inner,shell,[0,.17,1.6]);
  box(5.25,.035,2.08,.16,dark,shell,[0,.128,1.6]);
  box(4.92,.025,1.77,.12,inner,shell,[0,.105,1.6]);
  slab(5.56,2.36,.3,.055,dark,shell,.49,1.6);
  slab(5.3,2.12,.23,.04,steel,shell,.555,1.6);
  frame(5.08,1.92,.21,.035,.018,polished,shell,.594,1.6);
  for(const x of [-2.7,2.7]) { box(.2,.09,2.79,.035,brass,shell,[x,.50,1.6]);box(.065,.05,1.8,.018,lamp,shell,[x,.045,1.6]); }
  // Two interleaved bearing assemblies lie on the exact rotation axis.
  for(const x of [-2.27,2.27]) {
    for(const dx of [-.23,.23]){cylinder(.16,.2,brass,body,[x+dx,2.16,hingeZ],'x');box(.2,.38,.38,.025,brass,body,[x+dx,1.94,-1.66]);}
    cylinder(.145,.24,edge,lid,[x,0,0],'x');
    box(.25,.16,.40,.03,steel,lid,[x,.05,.16]);
    cylinder(.073,.81,dark,body,[x,2.16,hingeZ],'x');
  }
  // Visible bolt guides, vertical locking bolts and matching lid sockets.
  const bolts=[];
  for(const x of [-2,2]) {
    box(.36,.68,.18,.05,dark,body,[x,1.66,1.64]);
    // Hollow guide collars: the sliding bolt occupies a real clear channel.
    for(const y of [1.45,1.87]){
      box(.36,.12,.04,.008,brass,body,[x,y,1.625]);
      for(const side of [-1,1])box(.08,.12,.25,.008,brass,body,[x+side*.14,y,1.71]);
      box(.36,.12,.04,.008,brass,body,[x,y,1.825]);
    }
    const bolt=new THREE.Group();body.add(bolt);bolts.push(bolt);
    box(.19,.76,.14,.03,polished,bolt,[x,1.96,1.72]);
    cylinder(.13,.075,edge,bolt,[x,1.69,1.83]);
    // A three-sided lid socket and roof replace the former solid decorative block.
    // At contact its roof clears the bolt tip; retraction clears the entire socket.
    for(const side of [-1,1])box(.07,.18,.23,.008,brass,shell,[x+side*.14,.13,3.30]);
    box(.35,.05,.23,.008,brass,shell,[x,.215,3.30]);
    box(.35,.18,.05,.008,brass,shell,[x,.13,3.20]);
    box(1.18,.16,.1,.025,brass,body,[x*.59,1.39,1.66]);
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
  const stack=box(2.35,.24,1.3,.025,paper,body,[-.7,1.03,-.66]);stack.rotation.y=-.13;
  const envelope=box(2.35,.075,1.3,.035,paper,body,[-.7,1.187,-.66]);envelope.rotation.y=-.13;
  const card=mesh(new THREE.BoxGeometry(1.88,.035,1.18),[paper,paper,new THREE.MeshStandardMaterial({map:cardTexture,roughness:.88}),paper,paper,paper],body,[.12,1.246,-.66]);card.rotation.y=.18;
  const interiorLights=[];
  for(const x of [-2.55,2.55]){box(.045,.7,.06,.01,lamp,body,[x,1.48,-1.2]);const light=new THREE.PointLight(0xffc77d,0,3,2);light.position.set(x,1.85,0);body.add(light);interiorLights.push(light);}
  for(const x of [-2.30,2.30]){const light=new THREE.PointLight(0xffce85,0,4,2);light.position.set(x,-.12,1.7);shell.add(light);interiorLights.push(light);}
  // Telescopic lid supports have ball joints at BOTH ends, anchored in the cavity
  // and on the same rigid lid. They make the slow, damped motion mechanically legible.
  const supports=[];
  for(const sign of [-1,1]){
    const base=new THREE.Vector3(sign*2.76,.76,-.86);
    const attachment=new THREE.Vector3(sign*2.76,.025,.92);
    const barrel=cylinder(.095,1.23,dark,scene,[0,0,0],'y');
    const piston=cylinder(.048,1,edge,scene,[0,0,0],'y');
    const lower=mesh(new THREE.SphereGeometry(.13,16,10),brass,body,base.toArray());
    const upper=mesh(new THREE.SphereGeometry(.10,16,10),brass,lid,attachment.toArray());
    box(.20,.26,.23,.025,brass,body,[base.x,base.y,base.z]);
    supports.push({base,attachment,barrel,piston,lower,upper});
  }
  // Soft, irregular alpha clouds: entirely transparent at their square boundaries.
  // Particles originate on the front and side gasket seams in model coordinates.
  const vaporCanvas=document.createElement('canvas');vaporCanvas.width=vaporCanvas.height=128;
  const v=vaporCanvas.getContext('2d');
  for(let i=0;i<26;i++){
    const x=38+random()*52,y=38+random()*52,r=15+random()*21;
    const gradient=v.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,'rgba(213,220,218,.12)');gradient.addColorStop(.45,'rgba(213,220,218,.065)');gradient.addColorStop(1,'rgba(213,220,218,0)');
    v.fillStyle=gradient;v.fillRect(x-r,y-r,2*r,2*r);
  }
  const vaporTexture=new THREE.CanvasTexture(vaporCanvas);vaporTexture.colorSpace=THREE.SRGBColorSpace;resources.add(vaporTexture);
  const vapor=Array.from({length:64},(_,i)=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:vaporTexture,transparent:true,depthWrite:false,depthTest:true,opacity:0,rotation:random()*Math.PI}));
    scene.add(s);
    const front=i<48,side=i%2?1:-1;
    return {sprite:s,start:1.82+(i%16)/15*1.05,life:1.15+random()*.65,
      x:front?(random()-.5)*5.4:side*2.94,z:front?1.59:-.85+random()*2.1,
      vx:front?(random()-.5)*.3:side*(.24+random()*.15),vz:front?.30+random()*.3:(random()-.5)*.3,
      rise:.4+random()*.45,size:.62+random()*.42,rotation:random()*Math.PI};
  });
  let lastPose;
  function apply(pose,effects=true,time=0) {
    lastPose=pose;lid.rotation.x=-pose.angle;
    for(const b of bolts)b.position.y=-(1-pose.bolts)*.43;
    dial.rotation.z=(1-pose.dial)*Math.PI*.7;
    valve.position.z=1.61+pose.valve*.07;
    lamp.emissiveIntensity=effects?pose.light*2.4:0;
    for(const l of interiorLights)l.intensity=effects?pose.light*11:0;
    scene.updateMatrixWorld(true);
    for(const support of supports){
      const top=lid.localToWorld(support.attachment.clone()),delta=top.clone().sub(support.base),distance=delta.length(),direction=delta.normalize();
      support.barrel.position.copy(support.base).addScaledVector(direction,.615);
      support.barrel.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
      const rodLength=Math.max(.02,distance-1.12);
      support.piston.scale.y=rodLength;
      support.piston.position.copy(support.base).addScaledVector(direction,1.12+rodLength/2);
      support.piston.quaternion.copy(support.barrel.quaternion);
    }
    vapor.forEach(p=>{
      const age=time-p.start,u=age/p.life,s=p.sprite;
      s.visible=effects&&pose.pressure>0&&u>0&&u<1;
      if(!s.visible){s.material.opacity=0;return;}
      // At emission the lid is only ~1 degree ajar. The source remains at the
      // exposed gasket, not on an unrelated vent or on a screen-space overlay.
      s.position.set(p.x+p.vx*age+Math.sin(age*4+p.rotation)*.065,2.19+p.rise*age,p.z+p.vz*age);
      s.scale.setScalar(.13+p.size*Math.pow(u,.65));
      s.material.rotation=p.rotation+age*.13;
      s.material.opacity=Math.sin(Math.PI*u)**.65*.68*pose.pressure;
    });
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
    const aspect=width/height, viewHeight=Math.max(fitSize.y*1.10,fitSize.x*1.10/aspect);
    camera.left=fitCenter.x-viewHeight*aspect/2;camera.right=fitCenter.x+viewHeight*aspect/2;camera.top=fitCenter.y+viewHeight/2;camera.bottom=fitCenter.y-viewHeight/2;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  function render(){renderer.render(scene,camera);}
  function diagnostics(){const hingeOrigin=new THREE.Vector3();lid.getWorldPosition(hingeOrigin);return {hinge:hingeOrigin.toArray(),lidAngle:lid.rotation.x,bodyMatrix:body.matrixWorld.elements.slice(),camera:camera.position.toArray(),vaporVisible:vapor.filter(p=>p.sprite.visible).length,lidFront:lid.localToWorld(new THREE.Vector3(0,-.01,3.39)).toArray(),supports:supports.map(p=>({base:p.base.toArray(),top:lid.localToWorld(p.attachment.clone()).toArray()})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pose:lastPose};}
  function dispose(){const geometries=new Set(),materials=new Set();scene.traverse(o=>{o.shadow?.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());resources.forEach(t=>t.dispose());environment.dispose();renderer.dispose();}
  return {apply,resize,render,diagnostics,dispose};
}
