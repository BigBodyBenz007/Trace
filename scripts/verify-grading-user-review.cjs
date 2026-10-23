/* Local-only visual review of the real App, NutritionPage and barcode dialog.
 * Replays existing evidence at the lookup boundary; no live product requests.
 * node scripts/verify-grading-user-review.cjs [--presentation | --concise | --protein-boundary | --light-theme | --button-contrast] [--reuse-bundle]
 * No user profile, camera, production build or application policy is changed.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
const buttonContrast = process.argv.includes('--button-contrast');
const lightTheme = process.argv.includes('--light-theme');
const presentation = process.argv.includes('--presentation');
const proteinBoundary = process.argv.includes('--protein-boundary');
const concise = process.argv.includes('--concise') || proteinBoundary || lightTheme || buttonContrast;
const runId = 'run-' + new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, buttonContrast ? 'artifacts/modern-heirloom-buttons-20261023' : lightTheme ? 'artifacts/modern-heirloom-light-20261023' : proteinBoundary ? 'artifacts/protein-supplement-boundary-20261022' : concise ? 'artifacts/grading-plain-language-preview-20261022' : presentation ? 'artifacts/grading-presentation-review-20261022' : 'artifacts/grading-user-review-20261021', runId);
const scratch = path.join(root, buttonContrast ? '.tmp-browser/modern-heirloom-buttons' : lightTheme ? '.tmp-browser/modern-heirloom-light' : proteinBoundary ? '.tmp-browser/protein-supplement-boundary' : concise ? '.tmp-browser/grading-plain-language-review' : presentation ? '.tmp-browser/grading-presentation-review' : '.tmp-browser/grading-user-review');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' });
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(scratch, { recursive: true });
const progress = value => fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify(value, null, 2) + '\n');
function preservationState() {
  // Git inventories this checkout, including its real unrelated changes. Hash
  // project code, fixtures, configuration and documents, not private media or
  // ignored backup/browser/artifact directories. Missing tracked files stay null.
  const files = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))].sort();
  const relevant = files.filter(file => /\.(?:[cm]?js|jsx|json|css|md|html|txt|ya?ml)$/.test(file)
    && (/^(?:src|api|scripts|docs|public)\//.test(file) || !file.includes('/')));
  return { head: git(['rev-parse', 'HEAD']).trim(),
    status: git(['status', '--porcelain=v1', '--untracked-files=all']),
    index: crypto.createHash('sha256').update(git(['ls-files', '--stage', '-z'])).digest('hex'),
    hashes: Object.fromEntries(relevant.map(file => [file, fs.existsSync(path.join(root, file))
      ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') : null])) };
}
const baseline = preservationState();
fs.writeFileSync(path.join(output, 'baseline.json'), JSON.stringify(baseline, null, 2));
function checkPreservation() {
  assert.deepEqual(preservationState(), baseline, 'Review must preserve Git state and project files');
  fs.writeFileSync(path.join(output, 'preservation.json'), JSON.stringify({ passed: true, head: baseline.head,
    gitEntries: baseline.status.trimEnd().split('\n').filter(Boolean).length,
    relevantFileHashes: Object.keys(baseline.hashes).length }, null, 2));
}
const { normalizeOpenFoodFactsProduct } = require('../api/nutrition/_barcodeGateway.cjs');
function cases() {
  if (concise) return require('../src/development/__fixtures__/barcodePresentationCases.cjs').barcodePresentationCases();
  const captured = fs.readFileSync(path.join(root, 'docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const normalized = code => {
    const row = captured.find(row => row.barcode === code);
    const food = normalizeOpenFoodFactsProduct(row.responses.find(r => r.body?.product).body.product, code, row.capturedAt);
    return { status: food.logReady ? 'found' : 'incomplete', identifier: { scheme: 'gtin', value: code }, food };
  };
  const provider = read('src/services/__fixtures__/manufacturerProviderLookups.json').observations;
  const milk = read('docs/nutrition-v2-calibration-2026-10-21.json').references.find(row => row.id === 'nonfat-milk');
  const milkResult = unknown => ({ status: 'found', identifier: { scheme: 'gtin', value: '00012345600012' }, food: {
    id: 'packaged-food:review-milk-reference' + (unknown ? '-unknown' : ''), sourceType: 'packaged-food', dataType: 'branded',
    name: milk.name + (unknown ? ' — constructed unknown-added-sugar comparison' : ''), brand: 'Umpqua Dairy',
    category: 'calibration-reference', categoryLabel: 'Fluid dairy milk reference', identifiers: [],
    categories: [{ field: 'official-product-page.section', values: ['fluid-dairy-milk'] }],
    serving: { ...milk.basis, description: '1 cup (240 mL)' },
    nutrients: Object.fromEntries(Object.entries(milk.nutrients).map(([key, entry]) => [key, unknown && key === 'addedSugar' ? null : entry.value])),
    packaged: { packageSize: 'Not established by reference', servingsPerContainer: null },
    providerSourceSnapshot: { ingredients: milk.ingredients },
    provenance: { source: 'official-manufacturer', sourceId: milk.source.url, confidence: 'calibration-reference',
      label: milk.source.attribution + (unknown ? ' — constructed missing-data comparison' : ' — reliable calibration reference'),
      sourceUrl: milk.source.url, catalogVersion: 'review-fixture-only', catalogBatch: '2026-10-21',
      verification: { sourceUrl: milk.source.url, secondarySources: [] } },
  } });
  const corpus = read('docs/barcode-source-fallback-2026-10-21/after.json');
  const unavailable = corpus.products.find(row => row.nutritionScore === null && row.logReady && row.nutritionReasons.some(reason => /Saturated fat is missing/i.test(reason)));
  assert(unavailable, 'Reuse an existing unavailable captured case.');
  return [
    { id: 'quest', title: 'Quest — complete manufacturer reference', code: '888849000012', kind: 'Captured USDA lookup; existing exact-product manufacturer panel/ingredients replace effective data.',
      result: provider.find(row => row.request.body.barcode === '888849000012').response, quantity: 1.25 },
    { id: 'spam', title: 'SPAM Classic — low score and additive concern', code: '037600138727', kind: 'Captured raw OFF response, normalized by the current gateway; existing manufacturer replacement applies.', result: normalized('00037600138727'), quantity: .5 },
    { id: 'teddy', title: 'Teddy Grahams — partial correction / reference score', code: '044000045586', kind: 'Captured USDA lookup; partial sugar correction for logging, separate manufacturer-reference assessment.',
      result: provider.find(row => row.request.body.barcode === '044000045586').response, quantity: 2 },
    { id: 'milk-zero', title: 'Reliable nonfat milk — declared added-sugar zero', code: '00012345600012', kind: 'Official Umpqua calibration panel via constructed local reference transport. Test identifier only; no GTIN or live provider match is established.', result: milkResult(false), quantity: 1 },
    { id: 'milk-unknown', title: 'Same milk — constructed unknown added sugar', code: '00012345600012', kind: 'Constructed comparison: only the reliable reference’s added sugar is changed to unknown. No real reformulated product or live lookup.', result: milkResult(true) },
    { id: 'cheerios', title: 'Honey Nut Cheerios — grade available, logging blocked', code: '0016000124790', kind: 'Captured raw OFF response, normalized by the current gateway. Labeled-serving carbohydrates are missing; no replacement values supplied.', result: normalized('0016000124790') },
    { id: 'unavailable', title: unavailable.selectedName + ' — insufficient nutrition evidence', code: unavailable.barcode, kind: 'Existing captured raw OFF response; nutrition assessment remains unavailable.', result: normalized(unavailable.barcode) },
  ];
}
async function compile(records) {
  process.env.NODE_ENV = 'development';
  const wrapper = path.join(scratch, 'NutritionReviewBoundary.jsx');
  fs.writeFileSync(wrapper, `import React from 'react';
    import NutritionPage from ${JSON.stringify(path.join(root, 'src/components/NutritionPage.jsx'))};
    const cases = ${JSON.stringify(records)};
    const params = new URLSearchParams(location.search), selected = cases.find(c => c.id === params.get('case')) || cases[0];
    import {createBarcodeNutritionCandidate} from ${JSON.stringify(path.join(root, 'src/services/barcodeNutritionSelection.js'))};
    import {assessBarcodeNutrition} from ${JSON.stringify(path.join(root, 'src/development/barcodeNutritionAssessment.js'))};
    import {assessOverallFoodQuality} from ${JSON.stringify(path.join(root, 'src/development/traceOverallFoodQuality.js'))};
    import {getNutritionHighlights} from ${JSON.stringify(path.join(root, 'src/development/barcodeReviewInformation.js'))};
    import {formatNutrientValue} from ${JSON.stringify(path.join(root, 'src/services/nutritionDisplay.js'))};
    window.reviewCase = selected; window.reviewLookups = [];
    const candidate=createBarcodeNutritionCandidate(selected.result), nutrition=assessBarcodeNutrition(candidate,selected.result.identifier);
    window.reviewExpected={candidate,nutrition,overall:assessOverallFoodQuality(candidate,nutrition),highlights:getNutritionHighlights(nutrition.result)};
    window.reviewFormat=(key,value)=>value==null?'':formatNutrientValue(value,key);
    const lookup = {lookup: async code => { if(code !== selected.code) throw Error('Unexpected review fixture code'); window.reviewLookups.push({code, evidence:selected.kind}); return selected.result; }};
    const camera = {start: async () => ({devices:[],stop(){}})};
    export default function Boundary(props) {return <NutritionPage {...props} barcodeLookupService={lookup} barcodeCamera={camera} />;}
  `);
  const entry = path.join(scratch, 'entry.jsx');
  fs.writeFileSync(entry, `import React from 'react';import {createRoot} from 'react-dom/client';
    import App from ${JSON.stringify(path.join(root, 'src/App.js'))};
    import ${JSON.stringify(path.join(root, 'src/index.css'))};
    createRoot(document.getElementById('root')).render(<App/>);`);
  const stats = await new Promise((resolve, reject) => {
    const compiler = webpack({ mode: 'development', devtool: false, entry,
      cache: false,
      output: { path: scratch, filename: 'review.js', publicPath: '/' },
      optimization: { minimize: false }, resolve: { extensions: ['.js', '.jsx', '.json'] },
      plugins: [new webpack.DefinePlugin({
        'process.env.REACT_APP_TRACE_DEPLOYMENT_ENV': JSON.stringify(''),
        'process.env.REACT_APP_TRACE_GRADING_PREVIEW': JSON.stringify('false'),
      }), new webpack.NormalModuleReplacementPlugin(/^\.\/components\/NutritionPage$/, wrapper)],
      module: { rules: [
        { test: /\.jsx?$/, exclude: /node_modules/, use: { loader: require.resolve('babel-loader'), options: { presets: [[require.resolve('babel-preset-react-app'), { runtime: 'automatic' }]] } } },
        { test: /\.css$/, use: [require.resolve('style-loader'), require.resolve('css-loader')] },
        { test: /\.(png|jpe?g|webp|avif|svg|woff2?|mp3|wav|mp4)$/i, type: 'asset/resource' },
        { test: /\.txt$/i, type: 'asset/source' },
      ] },
    });
    compiler.run((error, result) => compiler.close(() => error || result.hasErrors() ? reject(error || Error(result.toString({ all: false, errors: true }))) : resolve(result)));
  });
  fs.writeFileSync(path.join(output, 'bundle.json'), JSON.stringify({ developmentOnly: true, realApp: true,
    boundary: 'Only NutritionPage lookup and camera adapters injected; App save/edit/storage/navigation and all actual UI components retained.',
    modules: stats.toJson({ all: false, modules: true }).modules.length }, null, 2));
}
async function connect(url, onEvent) {
  const socket = new WebSocket(url); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = ({data}) => { const msg = JSON.parse(data); onEvent(msg); const job = pending.get(msg.id); if (!job) return;
    pending.delete(msg.id); clearTimeout(job.timer); msg.error ? job.reject(Error(JSON.stringify(msg.error))) : job.resolve(msg.result); };
  return { close: () => socket.close(), send: (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id, timer = setTimeout(() => { pending.delete(next); reject(Error('CDP timeout: '+method)); }, 30000);
    pending.set(next, {resolve,reject,timer}); socket.send(JSON.stringify({id:next,method,params}));
  }) };
}
async function main() {
  const records = cases(); fs.writeFileSync(path.join(output, 'cases.json'), JSON.stringify(records.map(({result,...rest}) => rest),null,2));
  progress({ phase: 'compiling-real-development-app', head: git(['rev-parse','HEAD']).trim() });
  if (!process.argv.includes('--reuse-bundle')) await compile(records);
  const server = http.createServer((request,response) => {
    const url = new URL(request.url, 'http://localhost'), relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!relative){response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/appThemes.css"></head><body><div id="root"></div><script src="/review.js"></script></body></html>');return;}
    // Match src/index.js theme foundation ordering without rebuilding the App.
    if(relative==='appThemes.css'){response.setHeader('Content-Type','text/css');fs.createReadStream(path.join(root,'src/appThemes.css')).pipe(response);return;}
    const file = [path.resolve(scratch, relative), path.resolve(root,'public',relative),
      ...(relative.startsWith('assets/') ? [path.resolve(root,'src',relative)] : [])]
      .find(file => (file.startsWith(scratch+path.sep)||file.startsWith(path.join(root,'public')+path.sep)||file.startsWith(path.join(root,'src/assets')+path.sep))&&fs.existsSync(file)&&fs.statSync(file).isFile());
    if(!file){response.writeHead(404).end();return;}
    response.setHeader('Content-Type', file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':/\.jpe?g$/.test(file)?'image/jpeg':file.endsWith('.avif')?'image/avif':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); const base = 'http://127.0.0.1:'+server.address().port;
  const profile = path.join(output, 'isolated-browser-'+Date.now());
  const browser = cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let client; const exceptions=[], consoleErrors=[];
  try {
    const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await wait(200);
    const port=fs.readFileSync(portFile,'utf8').split('\n')[0],tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    client=await connect(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl,event=>{
      if(event.method==='Runtime.exceptionThrown')exceptions.push(event.params.exceptionDetails);
      if(event.method==='Runtime.consoleAPICalled'&&event.params.type==='error')consoleErrors.push(event.params.args.map(arg=>arg.value??arg.description));
    });
    await client.send('Runtime.enable');await client.send('Page.enable');await client.send('Network.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument',{source:`(() => {
      const theme = new URLSearchParams(location.search).get('theme') || 'modern-heirloom';
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');localStorage.setItem('appSettings',JSON.stringify({...settings,themeId:theme}));
      Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});
      if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(Error('Camera disabled in isolated review')),configurable:true});
    })()`});
    const evaluate=async expression=>{const r=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const until=async expression=>{for(let i=0;i<200;i++){if(exceptions.length)throw Error(JSON.stringify(exceptions));if(await evaluate(expression))return;await wait(100);}throw Error('Timed out: '+expression);};
    const click=text=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
    const input=async(selector,value)=>{await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(80);};
    const capture=async file=>{
      // Flush style, layout, fonts and compositing before capturing the viewport.
      await evaluate(`(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
      await wait(180);
      const image=await client.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
      fs.writeFileSync(path.join(output,file),Buffer.from(image.data,'base64'));return file;
    };
    const open=async(record,theme='modern-heirloom')=>{
      await client.send('Page.navigate',{url:base+'/?case='+record.id+'&theme='+theme+'&barcodeGrading=1'});
      await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await click('Nutrition');
      await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Scan Barcode')`);await click('Scan Barcode');
      await until(`Boolean(document.querySelector('.trace-barcode-dialog__manual input'))`);await input('.trace-barcode-dialog__manual input',record.code);await click('Look Up Barcode');
      await until(`Boolean(document.querySelector('[aria-label="Experimental nutrition assessment"]'))`);
      // Initial-state assertions must run at the natural review origin; never
      // scroll controls into view to satisfy acceptance checks.
      await evaluate(`document.querySelector('.trace-barcode-dialog__content').scrollTop=0`);
      await wait(120);
    };
    // Remaining visual/flow steps live in the helper below for resumability.
    const checks = require('./lib/grading-user-review-checks.cjs');
    const run = buttonContrast ? checks.runButtonContrast : lightTheme ? checks.runLightTheme : concise ? checks.runConcise : checks;
    await run({records,client,evaluate,until,click,input,capture,open,output,progress,wait,exceptions,consoleErrors,base});
  } finally {
    fs.writeFileSync(path.join(output,'browser-errors.json'),JSON.stringify({exceptions,consoleErrors},null,2));
    if(client){try{await client.send('Browser.close');}catch{}client.close();}if(browser.exitCode===null)browser.kill();server.close();
  }
}
main().finally(checkPreservation).catch(error=>{console.error(error);progress({phase:'interrupted-or-failed',error:error.message});process.exitCode=1;});
