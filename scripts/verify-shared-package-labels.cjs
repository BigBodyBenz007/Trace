/* Actual components, synthetic local transport, disposable Chrome storage only.
 * No Supabase account, user archive, real provider or hosted data is touched.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict'),webpack=require('webpack');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/shared-package-labels-20261024'),scratch=path.join(root,'.tmp-browser/shared-package-labels');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(scratch,{recursive:true});
const {profile}=require('../src/services/__fixtures__/personalPackageLabel.json');
const {normalizeUsdaFood}=require('../api/nutrition/_barcodeGateway.cjs'),capture=require('../src/services/__fixtures__/barcodeServingEvidence.json').bun;
const raw=normalizeUsdaFood(capture.detail.body,profile.barcode,capture.detail.capturedAt);
const panel=Object.fromEntries(['barcode','name','brand','variant','packageDescription','serving','servingsPerContainer','nutrients','ingredientsConfirmed','ingredients','confirmedAt'].map(k=>[k,profile[k]]));
const version={id:'constructed-reviewed-edition',status:'active',panel,publishedAt:'2026-10-24T17:00:00Z'};
const submission={id:'00000000-0000-4000-8000-000000000002',status:'pending',revision:3,panel,
 photos:['barcode','package','nutrition'].map(role=>({role,uploadedAt:'2026-10-24T17:00:00Z'})),submitted_at:'2026-10-24T17:01:00Z',history:[],metadata:{comparison:{nutrients:raw.nutrients,serving:raw.serving,attribution:'Captured USDA provider; edition unverified'}}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(url,event){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=({data})=>{const m=JSON.parse(data);event(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.t);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result)};
 return{close:()=>ws.close(),send:(method,params={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>j(Error('CDP timeout '+method)),30000);pending.set(n,{r,j,t});ws.send(JSON.stringify({id:n,method,params}))})};}
async function main(){
 const entry=path.join(scratch,'entry.jsx');
 fs.writeFileSync(entry,'import React from "react";import {createRoot} from "react-dom/client";import App from '+JSON.stringify(path.join(root,'src/App.js'))+
 ';import Owner from '+JSON.stringify(path.join(root,'src/components/SharedLabelReviewPage.jsx'))+
 ';import Submission from '+JSON.stringify(path.join(root,'src/components/SharedLabelSubmission.jsx'))+
 ';import '+JSON.stringify(path.join(root,'src/index.css'))+';import '+JSON.stringify(path.join(root,'src/appThemes.css'))+
 ';const mode=new URLSearchParams(location.search).get("mode");const profile='+JSON.stringify({...profile,photos:submission.photos})+
 ';createRoot(document.getElementById("root")).render(mode==="owner"?<Owner/>:mode==="submit"?<main className="trace-label-owner"><h1>Synthetic submission visual check</h1><Submission profile={profile}/></main>:<App/>);');
 if(!process.argv.includes('--reuse-bundle'))await new Promise((resolve,reject)=>{
 const compiler=webpack({mode:'development',devtool:false,entry,output:{path:scratch,filename:'review.js',publicPath:'/'},optimization:{minimize:false},resolve:{extensions:['.js','.jsx','.json']},
 module:{rules:[{test:/\.jsx?$/,exclude:/node_modules/,use:{loader:require.resolve('babel-loader'),options:{presets:[[require.resolve('babel-preset-react-app'),{runtime:'automatic'}]]}}},{test:/\.css$/,use:[require.resolve('style-loader'),require.resolve('css-loader')]},{test:/\.(png|jpe?g|webp|avif|svg|woff2?|mp3|wav|mp4)$/i,type:'asset/resource'},{test:/\.txt$/i,type:'asset/source'}]}});
 compiler.run((e,s)=>compiler.close(()=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));});
 const sharp=require('sharp'),image=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="500"><rect width="700" height="500" fill="white"/><text x="30" y="70" font-size="28">SYNTHETIC TEST EVIDENCE</text><text x="30" y="150" font-size="24">Nutrition Facts - 1 test bun (65 g)</text><text x="30" y="220" font-size="24">Calories 190 / Sodium 340 mg</text><text x="30" y="290" font-size="24">Not a photographed retail label</text></svg>')).png().toBuffer();
 const posts=[];
 const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');let body='';for await(const c of req)body+=c;const data=body?JSON.parse(body):{};
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/api/labels/evidence'){res.setHeader('Content-Type','image/png');return res.end(image);}
  if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');let result={};
   if(req.method==='POST')posts.push({path:url.pathname,data});
   if(url.pathname==='/api/nutrition/barcode')result={status:'found',identifier:{scheme:'gtin',value:profile.barcode},food:raw};
   if(url.pathname==='/api/labels/submissions')result={available:true};
   if(url.pathname==='/api/labels/session')result={owner:true};
   if(url.pathname==='/api/labels/versions')result={versions:[version],checkedAt:new Date().toISOString()};
   if(url.pathname==='/api/labels/review')result=url.searchParams.has('id')?{submission,versions:[],review:{flags:[{message:'Compare the captured provider serving with the package. A photo does not prove authenticity.'}],changes:[{field:'sodium',previous:370,submitted:340,major:false}]}}:{submissions:[submission]};
   return res.end(JSON.stringify(result));}
  const target=path.resolve(scratch,url.pathname.slice(1));
  if(target.startsWith(scratch+path.sep)&&fs.existsSync(target)&&fs.statSync(target).isFile()){res.setHeader('Content-Type',target.endsWith('.js')?'application/javascript':target.endsWith('.svg')?'image/svg+xml':'application/octet-stream');return fs.createReadStream(target).pipe(res);}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-trace-theme="modern-heirloom" data-trace-shell-theme="modern-heirloom"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script src="/review.js"></script></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const chromeProfile=path.join(scratch,'isolated-'+Date.now());fs.mkdirSync(chromeProfile,{recursive:true});
 const chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0','--user-data-dir='+chromeProfile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let c;const report={mode:'actual-components-synthetic-local-API-not-hosted-Supabase',runtimeErrors:[],consoleErrors:[],screenshots:[],checks:[]};
 try{
  const portFile=path.join(chromeProfile,'DevToolsActivePort');
  for(let i=0;i<150&&!fs.existsSync(portFile);i++)await wait(100);const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]),target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page');
  c=await connect(target.webSocketDebuggerUrl,m=>{if(m.method==='Runtime.exceptionThrown')report.runtimeErrors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.consoleErrors.push(m.params.args.map(a=>a.value||a.description));});
  for(const m of ['Page.enable','Runtime.enable','Network.enable'])await c.send(m);
  await c.send('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:base});
  const ev=async(expression)=>{const r=await c.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async expression=>{for(let i=0;i<400;i++){if(await ev(expression))return;await wait(100);}throw Error('Timed out '+expression);};
  const click=text=>ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==='+JSON.stringify(text)+').click()');
  const shot=async name=>{const s=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name),Buffer.from(s.data,'base64'));report.screenshots.push(name);assert(!await ev('document.documentElement.scrollWidth>innerWidth'),'No horizontal overflow: '+name);};
  const size=async(w,h)=>c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});
  await size(390,844);await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  await c.send('Page.navigate',{url:base+'/?mode=owner'});await until('Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("Seeded Jumbo"))');
  await click('Seeded Jumbo Burger Buns - Seeded - pending');
  await until('Boolean(document.querySelector("[aria-label=\\"Submission review\\"]"))');await shot('mobile-owner-evidence.png');
  await ev('document.querySelector("[aria-label=\\"sodium (mg)\\"]").scrollIntoView({block:"center"})');await shot('mobile-owner-values.png');
  await size(1440,1000);await ev('scrollTo(0,0)');await shot('desktop-owner-evidence.png');
  await c.send('Page.navigate',{url:base+'/?mode=submit'});await until('Boolean(document.querySelector("summary"))');await ev('document.querySelector("details").open=true');await size(390,844);await shot('mobile-submission-consent.png');
  assert(await ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Submit for owner review").disabled'));
  await size(1440,1000);await shot('desktop-submission-consent.png');
  await c.send('Page.navigate',{url:base+'/'});await until('Boolean(document.querySelector(".trace-home-page h1"))');await click('Nutrition');await until('Array.from(document.querySelectorAll("button")).some(b=>b.textContent==="Scan Barcode")');await click('Scan Barcode');
  await ev('(function(){var e=document.querySelector(".trace-barcode-dialog__manual input");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,"050400740280");e.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Look Up Barcode');
  await until('Boolean(document.querySelector("[aria-label=\\"Barcode product review\\"]"))');await ev('Array.from(document.querySelectorAll("summary")).find(e=>e.textContent==="Trace-reviewed package editions").parentElement.open=true');
  await click('Compare this package edition');await size(390,844);await shot('mobile-edition-choice.png');await click('My package matches - use this edition');
  await ev('document.querySelector(".trace-barcode-dialog__content").scrollTop=0');await shot('mobile-reviewed-food.png');
  assert(await ev('document.querySelector("[aria-label=\\"Score evidence scope\\"]").textContent.includes("Owner review does not certify authenticity")'));
  await click('Use This Food');await until('Boolean(document.querySelector("input[aria-label=\\"Calories\\"]"))');assert.equal(await ev('document.querySelector("input[aria-label=\\"Calories\\"]").value'),'190');
  report.checks.push('Owner photos/values/diffs at mobile and desktop; dark system appearance','Submission consent defaults off and upload disabled','Explicit reviewed edition selection -> actual Nutrition form; no saved entries');
  assert.equal(await ev('JSON.parse(localStorage.getItem("nutritionEntries")||"[]").length'),0);
  assert.equal(report.runtimeErrors.length,0);assert.equal(report.consoleErrors.length,0);report.success=true;
 }finally{fs.writeFileSync(path.join(out,'visual-result.json'),JSON.stringify(report,null,2));if(c){try{await c.send('Browser.close')}catch{}c.close()}if(chrome.exitCode===null)chrome.kill();server.close();}
 console.log(JSON.stringify({output:out,success:report.success,screenshots:report.screenshots}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
