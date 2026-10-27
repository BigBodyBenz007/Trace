const crypto=require('node:crypto');
const V=require('./_validation.cjs');
const {reviewFlags,fingerprint}=require('./_reviewPolicy.cjs');
const COOKIE='__Host-trace-label-owner';
const BUCKET='trace-label-evidence';
function config(env=process.env) {
  if(env.TRACE_LABELS_ENABLED!=='true'||env.VERCEL_ENV==='production') return null;
  const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY','TRACE_LABEL_OWNER_ID','TRACE_LABEL_OWNER_EMAIL','TRACE_LABEL_RATE_SECRET'];
  if(keys.some(k=>!env[k])||!V.uuid(env.TRACE_LABEL_OWNER_ID)||env.TRACE_LABEL_RATE_SECRET.length<32) return null;
  const url=new URL(env.SUPABASE_URL);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')) return null;
  return {url:url.origin,key:env.SUPABASE_SERVICE_ROLE_KEY,anon:env.SUPABASE_ANON_KEY,
    owner:env.TRACE_LABEL_OWNER_ID,email:env.TRACE_LABEL_OWNER_EMAIL.toLowerCase(),secret:env.TRACE_LABEL_RATE_SECRET};
}
function createStore(c,fetchImpl=fetch) {
  async function request(path,options={}) {
    const res=await fetchImpl(c.url+path,{...options,signal:AbortSignal.timeout(10000),headers:{apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+c.key}),...options.headers}});
    if(!res.ok) {
      const detail=await res.json().catch(()=>({}));
      const known={'retry-conflict':[409,'The submission changed. Reopen it or retry the original upload.'],'revision-conflict':[409,'Another review changed this submission. Reopen it before deciding.'],
        'not-found':[404,'Submission not found.'],'upload-limit':[429,'Private review storage or submission limits have been reached. Try later.'],
        'upload-expired':[409,'This unfinished upload expired. Start a new submission.'],'missing-evidence':[400,'Required package photos are missing.']};
      const match=known[detail.message];
      throw V.fail(match?match[1]:'The private label service could not complete this request. Please retry.',match?match[0]:503);
    }
    if(options.binary) return Buffer.from(await res.arrayBuffer());
    return res.status===204?null:res.json();
  }
  return {
    rpc:(action,data)=>request('/rest/v1/rpc/trace_labels_command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_action:action,p_data:data})}),
    duplicates:async fingerprint=>request('/rest/v1/trace_label_submissions?select=id,panel&fingerprint=eq.'+fingerprint+'&limit=20'),
    submissions:async(status)=>request('/rest/v1/trace_label_submissions?select=id,status,revision,panel,photos,metadata,submitted_at,history,fingerprint&order=submitted_at.desc&limit=100'+(status?'&status=eq.'+encodeURIComponent(status):'')),
    submission:async id=>(await request('/rest/v1/trace_label_submissions?select=*&id=eq.'+id))[0],
    versions:async code=>request('/rest/v1/trace_label_versions?select=*&barcode=eq.'+code+'&order=published_at.desc&limit=50'),
    version:async id=>(await request('/rest/v1/trace_label_versions?select=*&id=eq.'+id))[0],
    photo:async path=>request('/storage/v1/object/'+BUCKET+'/'+path,{binary:true}),
    upload:async(path,buffer)=>request('/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'Content-Type':'image/jpeg','x-upsert':'false'},body:buffer}),
    remove:async path=>request('/storage/v1/object/'+BUCKET,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})})
  };
}
function publicVersion(row) {
  return {id:row.id,submissionId:row.submission_id,panel:row.panel,publishedAt:row.published_at,
    reviewedAt:row.published_at,status:'active',source:'Reviewed by Trace',
    limitation:'Owner-reviewed package evidence; not manufacturer certification or a guaranteed match to your package.'};
}
function sameOrigin(req) {
  const origin=req.headers?.origin,host=req.headers?.host;
  if(!origin||!host) throw V.fail('Open this action from the Trace page.',403);
  let parsed;try {parsed=new URL(origin);} catch {throw V.fail('Invalid origin.',403);}
  if(parsed.host!==host||!['https:','http:'].includes(parsed.protocol)) throw V.fail('Cross-site requests are not allowed.',403);
}
async function owner(req,c,fetchImpl=fetch) {
  const match=(req.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
  const token=match?.slice(COOKIE.length+1);
  if(!token||token.length>6000) throw V.fail('Owner sign-in is required.',401);
  let response;
  try { response=await fetchImpl(c.url+'/auth/v1/user',{headers:{apikey:c.anon,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)}); }
  catch {throw V.fail('Owner authentication is temporarily unavailable.',503);}
  if(!response.ok) throw V.fail('Owner sign-in expired.',401);
  const user=await response.json();
  if(user.id!==c.owner||user.email?.toLowerCase()!==c.email||!user.email_confirmed_at) throw V.fail('Owner authorization is required.',403);
  return user.id;
}
function body(req,max=3000000) {
  const raw=req.body;
  if(Buffer.byteLength(typeof raw==='string'?raw:JSON.stringify(raw||{}))>max) throw V.fail('Request too large.',413);
  try {return typeof raw==='string'?JSON.parse(raw):raw||{};} catch {throw V.fail('Invalid request.');}
}
async function handle(kind,req,res,{env=process.env,fetchImpl=fetch,store:injectedStore}={}) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Type','application/json');
  const send=(status,data)=>res.status(status).json(data);
  try {
    if(!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return send(405,{available:false,status:'unavailable'});}
    const c=config(env);
    if(!c) return send(503,{available:false,status:'unavailable',code:'private_label_review_not_configured',
      message:'Shared review is not configured. Your personal labels still work; nothing was uploaded.'});
    const store=injectedStore||createStore(c,fetchImpl);
    if(req.method==='POST') sameOrigin(req);
    const data=req.method==='POST'?body(req):req.query||{};
    // Persisted, atomic limits survive serverless instances. Never store an IP.
    const ip=req.headers?.['x-vercel-forwarded-for']||'local';
    const key=crypto.createHmac('sha256',c.secret).update(String(ip).split(',')[0].trim()).digest('hex');
    if(!(await store.rpc('rate',{key,kind:kind==='session'?'auth':kind==='submissions'?'upload':'read'}))) throw V.fail('Too many requests. Please try later.',429);
    if(kind==='submissions') {
      if(req.method==='GET') return send(200,{available:true,maxPhotoBytes:2097152,requiredPhotos:['barcode','package','nutrition'],message:'Only explicitly submitted label evidence is uploaded.'});
      if(!V.uuid(data.id)||typeof data.secret!=='string'||! /^[a-f0-9]{64}$/.test(data.secret)) throw V.fail('A valid retry key is required.');
      const proof=V.hash(data.secret);
      if(data.action==='start') {
        if(data.consent!==true||data.completePanelConfirmed!==true||data.clearPhotosConfirmed!==true) throw V.fail('Confirm the label, required photos and upload consent.');
        const p=V.panel(data.panel);
        const submission=await store.rpc('start',{id:data.id,proof,panel:p,metadata:{...V.metadata(data.metadata),comparison:V.comparison(data.comparison),consent:{accepted:true,acceptedAt:new Date().toISOString(),scope:'Confirmed label fields, relevant provider comparison and private label photos; possible reviewed-value publication'},declarations:{clearPhotosConfirmed:true,completePanelConfirmed:true}},fingerprint:fingerprint(p)});
        return send(200,{id:submission.id,status:submission.status,revision:submission.revision});
      }
      if(data.action==='photo') {
        if(!V.ROLES.includes(data.role)) throw V.fail('Unknown photo role.');
        const current=await store.rpc('check-upload',{id:data.id,proof});
        if(current.status!=='uploading') return send(200,{id:current.id,status:current.status});
        const photo=await V.image(data.base64);
        const retained=current.photos.find(p=>p.role===data.role);
        if(retained) {if(retained.hash!==photo.hash) throw V.fail('Evidence changed. Start a new submission.',409);return send(200,{id:current.id,status:'uploading',role:data.role});}
        const path=data.id+'/'+crypto.randomUUID()+'.jpg';
        await store.upload(path,photo.buffer);
        try { await store.rpc('photo',{id:data.id,proof,photo:{role:data.role,path,hash:photo.hash,bytes:photo.buffer.length,mimeType:photo.mimeType,uploadedAt:new Date().toISOString()}}); }
        catch(error) {await store.remove(path).catch(()=>{});throw error;}
        return send(200,{id:data.id,status:'uploading',role:data.role});
      }
      if(data.action==='finish') {
        const result=await store.rpc('finish',{id:data.id,proof});
        return send(200,{id:result.id,status:result.status,submittedAt:result.submitted_at});
      }
      throw V.fail('Unsupported submission action.');
    }
    if(kind==='session') {
      if(req.method==='GET') {await owner(req,c,fetchImpl);return send(200,{owner:true});}
      if(data.action==='logout') {res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return send(200,{owner:false});}
      if(data.action!=='sign-in') throw V.fail('Unsupported sign-in action.');
      if(data.email?.toLowerCase()!==c.email) throw V.fail('Use the configured owner address.',403);
      if(typeof data.password!=='string'||!data.password.length||Buffer.byteLength(data.password,'utf8')>4096) throw V.fail('Enter your owner password.');
      // Supabase verifies the existing owner's password. No email delivery,
      // browser-side password comparison or application-stored password is used.
      let response;
      try {
        response=await fetchImpl(c.url+'/auth/v1/token?grant_type=password',{method:'POST',
          headers:{apikey:c.anon,'Content-Type':'application/json'},
          body:JSON.stringify({email:c.email,password:data.password}),signal:AbortSignal.timeout(10000)});
      } catch {throw V.fail('Owner authentication is temporarily unavailable.',503);}
      if(!response.ok) {
        if(response.status===429) throw V.fail('Too many sign-in attempts. Please try later.',429);
        if(response.status>=500) throw V.fail('Owner authentication is temporarily unavailable.',503);
        throw V.fail('Owner sign-in failed. Check your email and password.',401);
      }
      const session=await response.json(),user=session.user;
      if(user?.id!==c.owner||user.email?.toLowerCase()!==c.email||!user.email_confirmed_at
        ||typeof session.access_token!=='string'||!session.access_token.length||session.access_token.length>6000) throw V.fail('Owner authorization is required.',403);
      const lifetime=Number.isFinite(session.expires_in)&&session.expires_in>=1?Math.min(Math.floor(session.expires_in),3600):3600;
      res.setHeader('Set-Cookie',COOKIE+'='+session.access_token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+lifetime);
      return send(200,{owner:true});
    }
    if(kind==='versions') {
      if(req.method!=='GET') throw V.fail('Read-only endpoint.',405);
      const rows=await store.versions(V.barcode(data.barcode));
      return send(200,{versions:rows.filter(v=>v.active).map(publicVersion),checkedAt:new Date().toISOString()});
    }
    const actor=await owner(req,c,fetchImpl); // Every review and photo request is authenticated on the server.
    if(kind==='evidence') {
      if(req.method!=='GET'||!V.uuid(data.id)||!V.ROLES.includes(data.role)) throw V.fail('Invalid evidence request.');
      const submission=await store.submission(data.id),photo=submission?.photos?.find(p=>p.role===data.role);
      if(!photo) throw V.fail('Evidence not found.',404);
      const bytes=await store.photo(photo.path);
      res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'self'");
      return res.status(200).send(bytes);
    }
    if(kind==='review') {
      if(req.method==='GET') {
        if(data.id) {
          if(!V.uuid(data.id)) throw V.fail('Invalid submission.');
          const submission=await store.submission(data.id);
          if(!submission) throw V.fail('Submission not found.',404);
          const versions=await store.versions(V.barcode(submission.panel.barcode));
          const peers=store.duplicates?await store.duplicates(submission.fingerprint):await store.submissions();
          const existing=versions.find(v=>v.active)?.panel || submission.metadata?.comparison;
          delete submission.proof;
          return send(200,{submission,versions,review:reviewFlags({ ...submission,ocrDraft:submission.metadata?.ocrDraft},existing,peers)});
        }
        if(data.status&&!['pending','approved','rejected','withdrawn','uploading'].includes(data.status)) throw V.fail('Unknown status.');
        return send(200,{submissions:await store.submissions(data.status)});
      }
      if(!V.uuid(data.id)||!Number.isInteger(data.revision)||!['approve','reject','withdraw','restore'].includes(data.action)) throw V.fail('Invalid decision.');
      const reason=typeof data.reason==='string'&&data.reason.trim().length<=2000?data.reason.trim():'';
      if(!reason) throw V.fail('Record a reason, including any transcription edits or qualifications.');
      const current=await store.submission(data.id);
      if(!current) throw V.fail('Submission not found.',404);
      const finalPanel=data.action==='approve'?V.panel(data.panel):null;
      if(finalPanel&&finalPanel.barcode!==V.barcode(current.panel.barcode)) throw V.fail('A changed barcode requires a separate submission.');
      if(data.action==='approve' && (data.evidenceReviewed!==true||['barcode','package','nutrition',...(finalPanel.ingredientsConfirmed?['ingredients']:[])].some(role=>!current.photos.some(p=>p.role===role)))) throw V.fail('Review all required package evidence before approval.');
      if(['withdraw','restore'].includes(data.action)&&!V.uuid(data.versionId)) throw V.fail('Choose a reviewed version.');
      const result=await store.rpc('decide',{id:data.id,revision:data.revision,action:data.action,actor,reason,
        panel:finalPanel,versionId:data.versionId||null});
      return send(200,{submission:result});
    }
    throw V.fail('Not found.',404);
  } catch(error) {
    // Do not expose backend responses, service keys, email tokens, photos or raw submissions.
    return send(error.status||503,{available:false,status:'unavailable',message:error.status?error.message:'The private label service is unavailable. Your personal labels are unchanged.'});
  }
}
module.exports={handle,config,createStore,owner,sameOrigin,publicVersion,COOKIE};
