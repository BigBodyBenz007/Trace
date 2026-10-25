// Synthetic API/store contracts, not a claim that Supabase was provisioned.
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {handle,COOKIE,publicVersion}=require('../api/labels/_service.cjs'),V=require('../api/labels/_validation.cjs');
const {profile}=require('../src/services/__fixtures__/personalPackageLabel.json');
const env={TRACE_LABELS_ENABLED:'true',VERCEL_ENV:'preview',SUPABASE_URL:'https://constructed.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'server-test-only',SUPABASE_ANON_KEY:'anon-test-only',TRACE_LABEL_OWNER_ID:'00000000-0000-4000-8000-000000000001',
 TRACE_LABEL_OWNER_EMAIL:'owner@example.test',TRACE_LABEL_RATE_SECRET:'x'.repeat(32)};
const json=v=>JSON.parse(JSON.stringify(v));
function store() {
 const rows=new Map(),versions=[];
 const rpc=async(action,p)=>{
  if(action==='rate')return true;
  if(action==='start'){if(rows.has(p.id)){const old=rows.get(p.id);if(old.proof!==p.proof||JSON.stringify(old.panel)!==JSON.stringify(p.panel))throw V.fail('retry-conflict',409);return json(old);}
   const row={...p,status:'uploading',revision:0,photos:[],history:[],submitted_at:null};rows.set(p.id,row);return json(row);}
  const row=rows.get(p.id);if(!row)throw V.fail('not-found',404);
  if(['check-upload','photo','finish'].includes(action)&&row.proof!==p.proof)throw V.fail('not-found',404);
  if(action==='check-upload')return json(row);
  if(action==='photo'){row.photos.push(p.photo);row.revision++;return json(row);}
  if(action==='finish'){if(['barcode','package','nutrition',...(row.panel.ingredientsConfirmed?['ingredients']:[])].some(r=>!row.photos.some(f=>f.role===r)))throw V.fail('missing-evidence',400);row.status='pending';row.revision++;row.submitted_at=new Date().toISOString();return json(row);}
  if(action==='decide'){if(row.revision!==p.revision)throw V.fail('revision-conflict',409);
   if(p.action==='approve'){assert.equal(row.status,'pending');row.status='approved';versions.push({id:crypto.randomUUID(),submission_id:row.id,barcode:p.panel.barcode,panel:p.panel,active:true,published_at:new Date().toISOString()});}
   if(p.action==='reject')row.status='rejected';
   if(p.action==='withdraw'){versions.find(v=>v.id===p.versionId).active=false;row.status='withdrawn';}
   if(p.action==='restore'){const old=versions.find(v=>v.id===p.versionId);versions.push({...old,id:crypto.randomUUID(),active:true,reinstates:old.id});row.status='approved';}
   row.history.push({...p});row.revision++;return json(row);}
  throw Error(action);
 };
 const blobs=new Map();
 return {rpc,rows,published:versions,blobs,submission:async id=>json(rows.get(id)),submissions:async()=>json([...rows.values()]),
  versions:async code=>json(versions.filter(v=>v.barcode===code)),upload:async(p,b)=>{blobs.set(p,b);},remove:async p=>blobs.delete(p),photo:async p=>blobs.get(p)};
}
async function invoke(kind,{method='GET',body={},query={},headers={}}={},options={}) {
 const result={};const res={setHeader:(k,v)=>{result[k]=v;},status:n=>{result.status=n;return res;},json:data=>{result.body=data;return res;},send:data=>{result.bytes=data;return res;}};
 await handle(kind,{method,body,query,headers:{host:'trace.test',origin:'https://trace.test',...headers}},res,{env,...options});return result;
}
const auth=async(url)=>({ok:true,json:async()=>({id:env.TRACE_LABEL_OWNER_ID,email:env.TRACE_LABEL_OWNER_EMAIL,email_confirmed_at:'2026-10-24'})});
const ownerHeaders={cookie:COOKIE+'=synthetic-owner-token'};
test('all unconfigured and Production endpoints fail closed, including forged owner roles',async()=>{
 for(const kind of ['submissions','review','evidence','versions','session'])for(const configuration of [{},{...env,VERCEL_ENV:'production'}]) {
  const r=await invoke(kind,{method:'POST',body:{role:'owner',action:'approve'}},{env:configuration});assert.equal(r.status,503);assert.equal(r.body.available,false);}
});
test('cross-origin writes, oversized bodies, invalid GTIN/NaN, unconsented uploads and unauthorized photos fail',async()=>{
 const s=store();
 assert.equal((await invoke('submissions',{method:'POST',headers:{origin:'https://attacker.test'}},{store:s})).status,403);
 assert.equal((await invoke('submissions',{method:'POST',body:{x:'a'.repeat(3000001)}},{store:s})).status,413);
 for(const p of [{...profile,barcode:'050400740281'},{...profile,nutrients:{...profile.nutrients,sodium:NaN}}])assert.throws(()=>V.panel(p));
 for(const kind of ['review','evidence']) {
  assert.equal((await invoke(kind,{query:{id:crypto.randomUUID(),role:'nutrition'},body:{role:'owner'}},{store:s})).status,401);
  assert.equal((await invoke(kind,{headers:ownerHeaders},{store:s,fetchImpl:async()=>({ok:true,json:async()=>({id:'not-owner',email:env.TRACE_LABEL_OWNER_EMAIL,email_confirmed_at:'yes'})})})).status,403);}
 const r=await invoke('submissions',{method:'POST',body:{id:crypto.randomUUID(),secret:'a'.repeat(64),action:'start',panel:profile}},{store:s});
 assert.equal(r.status,400);assert.equal(s.rows.size,0);
});
test('real image decoder strips metadata, rejects disguised/corrupt files and validates pixel bounds',async()=>{
 const sharp=require('sharp');
 const bytes=await sharp({create:{width:40,height:30,channels:3,background:'#fff'}}).jpeg().withMetadata({exif:{IFD0:{Artist:'PRIVATE TEST METADATA'}}}).toBuffer();
 const cleaned=await V.image(bytes.toString('base64'));assert.equal(cleaned.mimeType,'image/jpeg');
 const metadata=await sharp(cleaned.buffer).metadata();assert.equal(metadata.exif,undefined);assert.equal(metadata.width,40);
 await assert.rejects(V.image(Buffer.from('<svg>not a label</svg>').toString('base64')));
 await assert.rejects(V.image('a'.repeat(2800004)));
 const huge=await sharp({create:{width:6000,height:5000,channels:3,background:'#fff'}}).png().toBuffer();
 await assert.rejects(V.image(huge.toString('base64')));
});
test('API submission retry, private evidence, corrected approval, stale decision, withdrawal and republish contracts',async()=>{
 const s=store(),options={store:s,fetchImpl:auth},key={id:crypto.randomUUID(),secret:'b'.repeat(64)};
 const start={...key,action:'start',panel:{...profile,providerObservation:{private:'must not upload'},unrelated:'omit'},consent:true,completePanelConfirmed:true,clearPhotosConfirmed:true};
 let r=await invoke('submissions',{method:'POST',body:start},options);assert.equal(r.body.status,'uploading');
 assert.equal((await invoke('submissions',{method:'POST',body:start},options)).body.id,key.id);assert.equal(s.rows.size,1);
 assert.equal(s.rows.get(key.id).panel.providerObservation,undefined);
 assert.equal((await invoke('submissions',{method:'POST',body:{...start,secret:'c'.repeat(64)}},options)).status,409);
 const sharp=require('sharp'),photo=(await sharp({create:{width:50,height:50,channels:3,background:'#fff'}}).png().toBuffer()).toString('base64');
 for(const role of ['barcode','package','nutrition'])assert.equal((await invoke('submissions',{method:'POST',body:{...key,action:'photo',role,base64:photo}},options)).status,200);
 assert.equal((await invoke('submissions',{method:'POST',body:{...key,action:'photo',role:'nutrition',base64:photo}},options)).status,200);
 assert.equal(s.rows.get(key.id).photos.length,3);
 r=await invoke('submissions',{method:'POST',body:{...key,action:'finish'}},options);assert.equal(r.body.status,'pending');
 assert.equal((await invoke('versions',{query:{barcode:profile.barcode}},options)).body.versions.length,0);
 r=await invoke('evidence',{query:{id:key.id,role:'nutrition'},headers:ownerHeaders},options);assert.equal(r.status,200);assert(Buffer.isBuffer(r.bytes));assert.equal(r['Cache-Control'],'private, no-store');
 const pending=json(s.rows.get(key.id)),panel={...pending.panel,nutrients:{...pending.panel.nutrients,sodium:345}};
 const decision={id:key.id,revision:pending.revision,action:'approve',reason:'Corrected a transcription from the photo; package review completed.',panel,evidenceReviewed:true};
 r=await invoke('review',{method:'POST',body:decision,headers:ownerHeaders},options);assert.equal(r.status,200);
 assert.equal(s.rows.get(key.id).panel.nutrients.sodium,340);assert.equal(s.published[0].panel.nutrients.sodium,345);
 assert.equal((await invoke('review',{method:'POST',body:decision,headers:ownerHeaders},options)).status,409);
 const v=(await invoke('versions',{query:{barcode:profile.barcode}},options)).body.versions[0];assert.equal(v.panel.nutrients.sodium,345);assert.equal(v.photos,undefined);assert.equal(v.owner_id,undefined);
 r=await invoke('review',{method:'POST',headers:ownerHeaders,body:{id:key.id,revision:s.rows.get(key.id).revision,action:'withdraw',versionId:v.id,reason:'Questionable evidence; withdraw.'}},options);assert.equal(r.status,200);
 assert.equal((await invoke('versions',{query:{barcode:profile.barcode}},options)).body.versions.length,0);
 await invoke('review',{method:'POST',headers:ownerHeaders,body:{id:key.id,revision:s.rows.get(key.id).revision,action:'restore',versionId:v.id,reason:'Prior edition re-reviewed.'}},options);
 assert.equal(s.published.length,2);assert.equal(s.published[0].active,false);assert.equal(s.rows.get(key.id).history.length,3);
});
test('ingredient publication requires separate photo; hints do not replace numbers or prove authenticity',async()=>{
 const s=store(),id=crypto.randomUUID();
 s.rows.set(id,{id,status:'pending',revision:0,panel:V.panel(profile),photos:['barcode','package','nutrition'].map(role=>({role})),history:[]});
 const r=await invoke('review',{method:'POST',headers:ownerHeaders,body:{id,revision:0,action:'approve',panel:{...profile,ingredientsConfirmed:true,ingredients:'Wheat, water.'},reason:'reviewed',evidenceReviewed:true}},{store:s,fetchImpl:auth});
 assert.equal(r.status,400);assert.equal(s.published.length,0);
 const {reviewFlags}=require('../api/labels/_reviewPolicy.cjs');
 const p=V.panel({...profile,nutrients:{...profile.nutrients,addedSugar:99,totalSugar:5}});
 assert.equal(p.nutrients.addedSugar,99);
 assert(reviewFlags({panel:p,photos:[],id},profile).flags.some(f=>f.code==='sugar-conflict'));
});
test('public DTO excludes evidence/session/internal fields; SQL denies browser roles and locks decisions',()=>{
 const safe=publicVersion({id:'v',panel:profile,active:true,owner_id:'private',photos:['private'],proof:'private'});
 assert.equal(safe.photos,undefined);assert.equal(safe.proof,undefined);assert.equal(safe.owner_id,undefined);
 const sql=fs.readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20261024_shared_package_labels.sql'),'utf8');
 assert(sql.includes('from public,anon,authenticated'));assert(sql.includes('for update'));
 assert(sql.includes("s.revision<>(p_data->>'revision')::integer"));assert(sql.includes("set active=false"));assert(sql.includes("reinstates"));
});

test('owner email code produces only an HttpOnly secure session; wrong subject cannot obtain it and logout expires it',async()=>{
 const s=store(),calls=[];
 const fetchImpl=async(url,options)=>{calls.push({url,body:JSON.parse(options.body||'{}')});
  return {ok:true,json:async()=>({access_token:'test-jwt',expires_in:3600,user:{id:env.TRACE_LABEL_OWNER_ID,email:env.TRACE_LABEL_OWNER_EMAIL,email_confirmed_at:'2026-10-24'}})};};
 let r=await invoke('session',{method:'POST',body:{action:'send-code',email:env.TRACE_LABEL_OWNER_EMAIL}},{store:s,fetchImpl});
 assert.equal(r.status,200);assert.equal(calls[0].body.create_user,false);
 r=await invoke('session',{method:'POST',body:{action:'verify-code',email:env.TRACE_LABEL_OWNER_EMAIL,code:'123456'}},{store:s,fetchImpl});
 assert.equal(r.status,200);assert(!JSON.stringify(r.body).includes('test-jwt'));assert(r['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Strict'));
 r=await invoke('session',{method:'POST',body:{action:'verify-code',email:env.TRACE_LABEL_OWNER_EMAIL,code:'123456'}},{store:s,fetchImpl:async()=>({ok:true,json:async()=>({access_token:'test',user:{id:'different'}})})});
 assert.equal(r.status,403);assert.equal(r['Set-Cookie'],undefined);
 r=await invoke('session',{method:'POST',body:{action:'logout'}},{store:s});assert(r['Set-Cookie'].includes('Max-Age=0'));
});

test('rejection keeps a pending label unpublished; invalid owner evidence never runs a decision',async()=>{
 const s=store(),id=crypto.randomUUID();s.rows.set(id,{id,status:'pending',revision:0,panel:V.panel(profile),photos:[],history:[]});
 const denied=await invoke('review',{method:'POST',body:{id,revision:0,action:'approve',role:'owner',panel:profile,reason:'forged',evidenceReviewed:true}},{store:s});
 assert.equal(denied.status,401);assert.equal(s.rows.get(id).history.length,0);
 const rejected=await invoke('review',{method:'POST',headers:ownerHeaders,body:{id,revision:0,action:'reject',reason:'Barcode photo is unreadable; evidence is not sufficient.'}},{store:s,fetchImpl:auth});
 assert.equal(rejected.status,200);assert.equal(s.rows.get(id).status,'rejected');assert.equal(s.published.length,0);
});

test('Supabase REST sends modern server keys as apikey only; legacy JWT compatibility remains server-side',async()=>{
 const {createStore}=require('../api/labels/_service.cjs'),requests=[];
 const transport=async(url,options)=>{requests.push(options.headers);return {ok:true,status:200,json:async()=>true};};
 await createStore({url:'https://constructed.supabase.co',key:'sb_secret_test_only'},transport).rpc('rate',{});
 assert.equal(requests[0].apikey,'sb_secret_test_only');assert.equal(requests[0].Authorization,undefined);
 await createStore({url:'https://constructed.supabase.co',key:'test.legacy.jwt'},transport).rpc('rate',{});
 assert.equal(requests[1].Authorization,'Bearer test.legacy.jwt');
});
