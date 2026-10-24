/* Actual Production-build / hosted release smoke in disposable Chrome storage.
 * Local: node scripts/verify-production-startup.cjs build
 * Hosted (never saves): node scripts/verify-production-startup.cjs --url https://trace-umber.vercel.app/
 * Local HTTP replays are explicitly captured observations, not live lookups.
 */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), live = process.argv.includes('--url');
const output = path.join(root, 'artifacts/production-release-20261023');
fs.mkdirSync(output, {recursive:true});
const report = { mode: live ? 'hosted-real-lookups-no-saves' : 'actual-production-build-captured-api-replays', rows:[], runtimeErrors:[], consoleErrors:[], requests:[] };
const persist = () => fs.writeFileSync(path.join(output,live?'hosted-smoke.json':'production-smoke.json'), JSON.stringify(report,null,2));
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function connect(url, event) {
 const socket=new WebSocket(url); await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;}); let id=0; const pending=new Map();
 socket.onmessage=({data})=>{const m=JSON.parse(data);event(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
 return {close:()=>socket.close(),send:(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout '+method));},30000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));})};
}
async function main(){
 let server,base;const responses=new Map();
 if(live) {base=process.argv[process.argv.indexOf('--url')+1];assert.equal(new URL(base).hostname,'trace-umber.vercel.app');}
 else {
  const build=path.resolve(process.argv[2]||'build');assert(fs.existsSync(path.join(build,'asset-manifest.json')),'Completed Production build required');
  const cases=require('../src/development/__fixtures__/barcodePresentationCases.cjs').barcodePresentationCases();for(const row of cases) responses.set(row.code,row.result);
  server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/nutrition/barcode') {let body='';for await(const chunk of req)body+=chunk;const code=JSON.parse(body).barcode;const row=responses.get(code);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(row||{status:'not-found',food:null}));return;}
   const rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),resolved=path.resolve(build,rel||'index.html');if(!resolved.startsWith(build+path.sep)){res.writeHead(403).end();return;}
   const file=fs.existsSync(resolved)&&fs.statSync(resolved).isFile()?resolved:path.join(build,'index.html');
   const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/';report.build=build;
 }
 const profile=path.join(output,(live?'hosted-':'local-')+Date.now());const browser=spawn(process.env.TRACE_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let client;const requests=new Map(),pendingBodies=new Set();
 try {
  let tabs;for(let i=0;i<120;i++){try{const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(tabs.some(t=>t.type==='page'))break;}catch{}await wait(150);}assert(tabs?.some(t=>t.type==='page'));
  client=await connect(tabs.find(t=>t.type==='page').webSocketDebuggerUrl,e=>{
   const p=e.params;if(e.method==='Page.javascriptDialogOpening')client.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
   if(e.method==='Runtime.exceptionThrown')report.runtimeErrors.push(p.exceptionDetails);
   if(e.method==='Runtime.consoleAPICalled'&&p.type==='error')report.consoleErrors.push(p.args.map(x=>x.value??x.description));
   if(e.method==='Log.entryAdded'&&p.entry.level==='error')report.consoleErrors.push(p.entry);
   if(e.method==='Network.requestWillBeSent'&&p.request.url.includes('/api/nutrition/barcode')){const r={id:p.requestId,body:p.request.postData};requests.set(p.requestId,r);report.requests.push(r);}
   if(e.method==='Network.loadingFinished'&&requests.has(p.requestId)){let task;task=client.send('Network.getResponseBody',{requestId:p.requestId}).then(r=>{const body=JSON.parse(r.base64Encoded?Buffer.from(r.body,'base64').toString():r.body);requests.get(p.requestId).provider=body.food?.provider?.id;requests.get(p.requestId).recordId=body.food?.provider?.recordId;}).finally(()=>pendingBodies.delete(task));pendingBodies.add(task);}
  });
  for(const method of ['Page.enable','Runtime.enable','Network.enable','Log.enable'])await client.send(method);
  await client.send('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:new URL(base).origin});
  const evaluate=async expression=>{const r=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async expression=>{for(let i=0;i<400;i++){if(await evaluate(expression))return;await wait(100);}throw Error('Timed out '+expression);};
  const click=text=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  const input=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const screen=async name=>{const r=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,(live?'hosted-':'local-')+name+'.png'),Buffer.from(r.data,'base64'));};
  const mobile=()=>client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
  const desktop=()=>client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,mobile:false,deviceScaleFactor:1});
  await mobile();await client.send('Page.navigate',{url:base});await until(`Boolean(document.querySelector('.trace-home-page h1'))`);assert.equal(await evaluate('location.search'),'');await screen('home-mobile');
  if(!live){await evaluate(`document.querySelector('[aria-label="Settings"]').click()`);await until(`Boolean(document.querySelector('input[name="app-theme"][value="river"]'))`);await evaluate(`document.querySelector('input[name="app-theme"][value="river"]').click()`);await client.send('Page.reload');await until(`Boolean(document.querySelector('.trace-home-page h1'))`);assert.equal(await evaluate('document.documentElement.dataset.traceShellTheme'),'river');await evaluate(`document.querySelector('[aria-label="Settings"]').click()`);await until(`Boolean(document.querySelector('input[name="app-theme"][value="modern-heirloom"]'))`);await evaluate(`document.querySelector('input[name="app-theme"][value="modern-heirloom"]').click()`);await client.send('Page.reload');await until(`Boolean(document.querySelector('.trace-home-page h1'))`);assert.equal(await evaluate('document.documentElement.dataset.traceShellTheme'),'modern-heirloom');report.themeSelectionPersists=true;}
  await click('Nutrition');await until(`Boolean(document.querySelector('.trace-nutrition-day-log'))`);
  const layout=await evaluate(`(()=>{const e=document.querySelector('.trace-nutrition-entry-disclosure'),w=document.querySelector('details.trace-water'),d=document.querySelector('.trace-nutrition-day-log');return{entryClosed:!e.open,waterClosed:!w.open,order:w.nextElementSibling===d&&d.nextElementSibling.classList.contains('trace-nutrition-averages'),title:d.querySelector('h2').textContent,empty:d.textContent.includes('No nutrition entries logged today.'),overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);assert(layout.entryClosed&&layout.waterClosed&&layout.order&&layout.empty&&!layout.overflow);report.layout=layout;await screen('nutrition-mobile');await desktop();await screen('nutrition-desktop');await mobile();
  const lookup=async code=>{await click('Scan Barcode');await until(`Boolean(document.querySelector('.trace-barcode-dialog__manual input'))`);await input('.trace-barcode-dialog__manual input',code);await click('Look Up Barcode');await until(`Boolean(document.querySelector('[aria-label="Barcode product review"]'))`);await wait(150);await Promise.all([...pendingBodies]);};
  for(const code of live?['888849000012','705016356201']:['888849000012','705016356201','044000045586','0856312002757']){
   await lookup(code);const row={code};
   row.review=await evaluate(`(()=>{const a=document.querySelector('[aria-label="Barcode product review"]'),n=a.querySelector('[aria-label="Package label notice"]');return {title:a.querySelector('h3').textContent,overall:a.querySelector('[aria-label="Experimental overall rating"]')?.textContent,nutrition:a.querySelector('[aria-label="Experimental nutrition rating"]')?.textContent,status:a.querySelector('[aria-label="Provisional overall score"]')?.textContent,text:a.innerText,notice:n.textContent.replace(/\\s+/g,' ').trim(),noticeOutsideDetails:!n.closest('details'),detailsClosed:[...a.querySelectorAll('details')].every(d=>!d.open),overflow:document.documentElement.scrollWidth>innerWidth+1,actions:[...document.querySelectorAll('.trace-barcode-dialog__footer button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled,bottom:b.getBoundingClientRect().bottom,top:b.getBoundingClientRect().top})),viewport:innerHeight};})()`);
   assert(row.review.noticeOutsideDetails&&row.review.detailsClosed&&!row.review.overflow);assert(row.review.notice.includes('Check your package label. Nutrition and ingredients come from external sources and may differ from your package.'));
   assert(row.review.actions.some(b=>b.text==='Use This Food'&&!b.disabled&&b.top>=0&&b.bottom<=row.review.viewport));
   if(code==='888849000012'){assert.equal(row.review.overall,'52/100');assert.equal(row.review.nutrition,'Nutrition 54/100.');assert.equal(row.review.status,'Provisional');}
   if(code==='705016356201'){assert(row.review.text.includes('Overall rating not available for protein supplements.'));assert.equal(row.review.overall,undefined);assert.equal(row.review.nutrition,undefined);}
   if(code==='044000045586'){assert.equal(row.review.overall,'20/100');assert(row.review.notice.includes('This reference score uses the separately identified manufacturer reference panel.'));assert(row.review.text.includes('other values from provider'));}
   if(code==='0856312002757'){assert.equal(row.review.nutrition,'Score unavailable');assert(row.review.text.includes('sodium and salt disagree'));}
   await screen(code+'-mobile');await desktop();await screen(code+'-desktop');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+1'),false);await mobile();
   await click('Use This Food');await until(`Boolean(document.querySelector('input[aria-label="Sodium (mg)"]'))`);row.selection=await evaluate(`Object.fromEntries([...document.querySelectorAll('.trace-nutrition-entry input[aria-label]')].map(e=>[e.getAttribute('aria-label'),e.value]))`);
   if(code==='888849000012')assert.equal(Number(row.selection['Sodium (mg)']),220);
   if(code==='044000045586'){assert.equal(Number(row.selection['Added Sugar (g)']),7);assert.equal(Number(row.selection['Total Sugar (g)']),7);}
   if(code==='0856312002757')assert.equal(row.selection['Sodium (mg)'],'');
   if(!live&&code==='888849000012'){
    await input('input[aria-describedby="serving-basis-description"]','1.25');await until(`document.querySelector('input[aria-label="Sodium (mg)"]').value==='275'`);assert.equal(Number(await evaluate(`document.querySelector('input[aria-label="Calories"]').value`)),237.5);await click('Save Entry');await until(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length===1`);
    const saved=await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries'))[0]`);assert.equal(saved.sodium,275);assert.equal(saved.calories,237.5);assert.equal(saved.portion.amount,1.25);assert(!JSON.stringify(saved).includes('overallScore100'));
    await client.send('Page.reload');await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await click('Nutrition');await until(`document.querySelector('.trace-nutrition-day-log').querySelectorAll('article').length===1`);
    await evaluate(`document.querySelector('.trace-nutrition-day-log button[aria-label^="Edit "]').click()`);await until(`Boolean(document.querySelector('input[aria-label="Sodium (mg)"]'))`);assert.equal(Number(await evaluate(`document.querySelector('input[aria-label="Sodium (mg)"]').value`)),275);assert.equal(await evaluate(`document.querySelector('input[aria-describedby="serving-basis-description"]').value`),'1.25');await click('Cancel Entry');
    const date=await evaluate(`(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})()`);await input('input[aria-label="Nutrition date"]',date);await until(`document.querySelector('.trace-nutrition-day-log h2').textContent.includes('Nutrition for')`);assert.equal(await evaluate(`document.querySelector('.trace-nutrition-day-log').querySelectorAll('article').length`),0);assert.equal(await evaluate(`document.querySelector('[aria-labelledby="nutrition-history-heading"]').querySelectorAll('article').length`),1);await client.send('Page.reload');await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await click('Nutrition');await until(`Boolean(document.querySelector('.trace-nutrition-day-log'))`);report.fractionalSaveReloadReopenAndDateFilter=true;
   }else await click('Cancel Entry');
   report.rows.push(row);persist();
  }
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length`),live?0:1);assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.consoleErrors,[]);report.noHostedSaves=true;report.passed=true;persist();console.log(JSON.stringify({passed:true,mode:report.mode,cases:report.rows.map(r=>({code:r.code,overall:r.review.overall,nutrition:r.review.nutrition})),runtimeErrors:0,consoleErrors:0}));
 }finally{persist();if(client){try{await client.send('Browser.close');}catch{}client.close();}for(let i=0;i<50&&browser.exitCode===null;i++)await wait(100);if(browser.exitCode===null)browser.kill();if(server)await new Promise(r=>server.close(r));}
}
main().catch(e=>{report.error=String(e.stack||e);report.passed=false;persist();console.error(e.message);process.exitCode=1;});
