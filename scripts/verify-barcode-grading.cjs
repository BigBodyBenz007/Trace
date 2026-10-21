/* Offline synthetic review of the real NutritionPage and barcode dialog.
 * node scripts/verify-barcode-grading.cjs [--serve] [--reuse-bundle]
 * Synthetic data, stub camera, memory-only saved entries; no provider calls.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const webpack = require('webpack');
const { normalizeOpenFoodFactsProduct } = require('../api/nutrition/_barcodeGateway.cjs');
const { barcodeGradingRecord, BARCODE, RETRIEVED_AT } = require('../src/development/__fixtures__/barcodeGrading.cjs');
const root = path.resolve(__dirname, '..');
const simpleReview = process.argv.includes('--simple-review');
const refinement = simpleReview || process.argv.includes('--screening-refinement');
const overallReview = refinement || process.argv.includes('--overall-review');
const output = path.join(root, simpleReview ? 'artifacts/food-grade-simplification-20261020' : refinement ? 'artifacts/additive-screening-refinement-20261020' : overallReview ? 'artifacts/trace-overall-food-quality-20261020' : 'artifacts/barcode-explanations-polish-20261020');
const scratch = path.join(root, overallReview ? '.tmp-browser/barcode-overall' : '.tmp-browser/barcode-grading');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const job = pending.get(message.id);
    if (!job) return;
    pending.delete(message.id);
    clearTimeout(job.timer);
    message.error ? job.reject(new Error(JSON.stringify(message.error))) : job.resolve(message.result);
  };
  return {
    close: () => socket.close(),
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const next = ++id;
      const timer = setTimeout(() => { pending.delete(next); reject(new Error(`Timed out: ${method}`)); }, 30000);
      pending.set(next, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: next, method, params }));
    }),
  };
}

async function compile(production = false) {
  process.env.NODE_ENV = production ? 'production' : 'development';
  const entry = path.join(scratch, production ? 'production-entry.jsx' : 'entry.jsx');
  if (production) fs.writeFileSync(entry, `import Dialog from ${JSON.stringify(path.join(root, 'src/components/BarcodeScannerDialog.jsx'))}; window.dialog = Dialog;`);
  else {
    const products = Object.fromEntries(['eligible', 'unresolved', 'unknown-additives'].map(scenario =>
      [scenario, normalizeOpenFoodFactsProduct(barcodeGradingRecord(scenario), BARCODE, RETRIEVED_AT)]));
    if (overallReview) {
      const archive = require('../docs/barcode-grading-grocery-pilot-2026-10-20/results.json');
      products.almonds = archive.observations.find(row => row.barcode === '00041570003831').lookup.food;
      products.quest = archive.observations.find(row => row.barcode === '00888849000012').lookup.food;
      products.teddy = require('../docs/trace-nutrition-v2-teddy-2026-10-20.json').lookup.food;
      products.stouffers = archive.observations.find(row => row.barcode === '00013800103215').lookup.food;
      // Replay the already-approved v2 qualifier recovery, not the legacy
      // pre-repair cache. Raw nutrient values and basis must match exactly.
      for (const [scenario, barcode] of [['quest', '00888849000012'], ['stouffers', '00013800103215']]) {
        products[scenario] = JSON.parse(JSON.stringify(products[scenario]));
        const row = require('../docs/trace-nutrition-v2-comparison-2026-10-20.json').products.find(row => row.barcode === barcode);
        const approved = row.qualificationReview && row.after.evidence.originalDataset;
        if (!approved) continue;
        const retained = products[scenario].assessmentInputs.datasets.find(d => d.id === approved.id);
        assert(retained);
        for (const entry of retained.observations) {
          const verified = approved.observations.find(o => o.field === entry.field);
          assert(verified); assert.deepEqual(entry.rawValue, verified.rawValue); assert.equal(entry.enteredUnit, verified.enteredUnit);
          entry.derivation = verified.derivation;
        }
      }
    }
    fs.writeFileSync(entry, `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import ${JSON.stringify(path.join(root, 'src/appThemes.css'))};
      import ${JSON.stringify(path.join(root, 'src/index.css'))};
      import NutritionPage from ${JSON.stringify(path.join(root, 'src/components/NutritionPage.jsx'))};
      const products = ${JSON.stringify(products)};
      const params = new URLSearchParams(location.search);
      document.documentElement.dataset.traceShellTheme = params.get('theme') || 'modern-heirloom';
      const lookup = { lookup: async () => ({ status: 'found', food: products[params.get('scenario')] || products.eligible }) };
      const camera = { start: async () => ({ devices: [], stop() {} }) };
      function Preview() {
        const [entries, setEntries] = useState([]);
        return <div className="trace-app-shell trace-feature-page trace-feature-page--nutrition">
          <p>{['almonds', 'quest', 'teddy', 'stouffers'].includes(params.get('scenario')) ? 'Archived provider observation; current package not independently verified. Enter ' + ({quest:'00888849000012', almonds:'00041570003831', teddy:'044000045586', stouffers:'00013800103215'}[params.get('scenario')]) + ' after Scan Barcode.' : 'Synthetic review controls — no real product assessment. Enter ${BARCODE} after Scan Barcode.'}</p>
          <NutritionPage onBack={() => {}} nutritionEntries={entries} nutritionGoals={{ calories: 0, protein: 0, carbohydrates: 0, fat: 0 }}
            saveNutritionEntry={entry => { const saved = { ...entry, id: 'synthetic-' + Date.now() }; window.previewSavedEntry = saved; setEntries([...entries, saved]); return true; }}
            saveNutritionGoals={() => true} barcodeLookupService={lookup} barcodeCamera={camera}
            lifecycleAdapter={{ subscribe: () => () => {} }} buttonStyle={{}} inputStyle={{}} containerStyle={{}} />
        </div>;
      }
      createRoot(document.getElementById('root')).render(<Preview />);
    `);
  }
  const stats = await new Promise((resolve, reject) => {
    const compiler = webpack({ mode: production ? 'production' : 'development', devtool: false, entry,
      output: { path: scratch, filename: production ? 'production.js' : 'preview.js', publicPath: '/' },
      optimization: { minimize: false, concatenateModules: false },
      resolve: { extensions: ['.js', '.jsx', '.json'] },
      module: { rules: [
        { test: /\.jsx?$/, exclude: /node_modules/, use: { loader: require.resolve('babel-loader'), options: { presets: [[require.resolve('babel-preset-react-app'), { runtime: 'automatic' }]] } } },
        { test: /\.css$/, use: [require.resolve('style-loader'), require.resolve('css-loader')] },
        { test: /\.(png|jpe?g|webp|svg|woff2?|mp3|wav)$/i, type: 'asset/resource' },
      ] },
    });
    compiler.run((error, result) => compiler.close(() => error || result.hasErrors()
      ? reject(error || new Error(result.toString({ all: false, errors: true }))) : resolve(result)));
  });
  if (production) {
    const modules = stats.toJson({ all: false, modules: true }).modules.map(module => module.name);
    assert(!modules.some(name => /BarcodeNutritionReview|barcodeNutritionAssessment|traceNutritionConversion|updatedNutritionScoring|traceOverallFoodQuality|traceUsNutritionScoring|additiveScreeningPolicy/.test(name)), 'Experimental modules must be absent from production dependency graph');
    fs.writeFileSync(path.join(output, 'production-gating.json'), JSON.stringify({ target: 'real BarcodeScannerDialog', experimentalModulesAbsent: true, modules: modules.length }, null, 2));
    console.log('Targeted production gating passed; experimental modules absent.');
  }
}

async function main() {
  if (process.argv.includes('--production-check')) { await compile(true); return; }
  if (!process.argv.includes('--reuse-bundle')) await compile();
  const server = http.createServer((request, response) => {
    const filename = path.basename(new URL(request.url, 'http://localhost').pathname);
    if (!filename) { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>'); return; }
    const file = path.join(scratch, filename);
    if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
    if (filename.endsWith('.js')) response.setHeader('Content-Type', 'text/javascript');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(process.argv.includes('--serve') ? 4175 : 0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  if (process.argv.includes('--serve')) { console.log(`Synthetic integrated preview: ${base}/?barcodeGrading=1 — Scan Barcode, enter ${BARCODE}. Ctrl+C stops it.`); return; }
  const profile = path.join(scratch, `chrome-${Date.now()}`);
  const browser = spawn(process.env.TRACE_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let client;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await wait(200);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    client = await connect(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    const evaluate = async expression => { const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const until = async expression => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await wait(100); } throw new Error('Timed out: ' + expression); };
    const click = text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const review = async (scenario = 'eligible', theme = 'modern-heirloom', flag = true) => {
      const lookupCode = { almonds: '00041570003831', quest: '00888849000012', teddy: '044000045586', stouffers: '00013800103215' }[scenario] || BARCODE;
      await client.send('Page.navigate', { url: `${base}/?scenario=${scenario}&theme=${theme}${flag ? '&barcodeGrading=1' : ''}` });
      await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Scan Barcode')`);
      await click('Scan Barcode');
      await until(`Boolean(document.querySelector('.trace-barcode-dialog__manual input'))`);
      await evaluate(`(() => { const el = document.querySelector('.trace-barcode-dialog__manual input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '${lookupCode}'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await wait(80); await click('Look Up Barcode');
      await until(`Boolean(document.querySelector('[aria-label="Barcode product review"]'))`);
      await wait(100);
    };
    const capture = async file => { const r = await client.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(output, file), Buffer.from(r.data, 'base64')); };
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await review();
    assert(await evaluate(`Array.from(document.querySelectorAll('.trace-barcode-grade details, .trace-barcode-additives')).every(el => !el.open) && Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Ingredients').getAttribute('aria-expanded') === 'false'`), 'All disclosures start collapsed');
    assert(await evaluate(String.raw`/^\d+\/100$/.test((document.querySelector('[aria-label="Experimental overall rating"]') || document.querySelector('[aria-label="Experimental nutrition rating"]')).textContent)`));
    assert(await evaluate(`document.querySelector('[aria-label="Experimental nutrition assessment"]').getBoundingClientRect().bottom < 844`), 'Score and confidence should be visible on the opening mobile review');
    await capture('mobile-eligible-390x844.png');
    await evaluate(`document.querySelector('.trace-barcode-additives').open = true; document.querySelector('.trace-barcode-additives').scrollIntoView({block:'nearest'})`);
    await wait(100); await capture('mobile-additives-390x844.png');
    assert(await evaluate(`document.querySelector('.trace-barcode-additives').textContent.includes('en:e330')`));
    const controls = await evaluate(`(() => {
      const content = document.querySelector('.trace-barcode-dialog__content'); content.scrollTop = content.scrollHeight;
      const footer = document.querySelector('.trace-barcode-dialog__footer').getBoundingClientRect();
      return Array.from(document.querySelectorAll('button')).filter(b => ['Use This Food', 'Scan Again'].includes(b.textContent.trim())).map(b => {
        const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { name: b.textContent.trim(), top: r.top, bottom: r.bottom, footerTop: footer.top, unobstructed: b.contains(hit) && r.bottom <= footer.top };
      });
    })()`);
    assert.equal(controls.length, 2);
    assert(controls.every(control => control.unobstructed), 'Return to Food Search must not obstruct logging controls');
    await capture('mobile-controls-390x844.png');
    if (overallReview) {
      await review('almonds');
      assert.equal(await evaluate(`document.querySelector('[aria-label="Experimental overall rating"]').textContent`), '95/100');
      assert(await evaluate(`document.querySelector('[aria-label="Experimental nutrition rating"]').textContent.includes('Nutrition 95/100 · additive deduction 0 points')`));
      assert(await evaluate(`Array.from(document.querySelectorAll('.trace-barcode-grade details, .trace-barcode-additives')).every(el => !el.open)`));
      await capture('mobile-overall-390x844.png');
      await review('quest');
      assert.equal(await evaluate(`document.querySelector('[aria-label="Experimental overall rating"]').textContent`), '52/100');
      assert(await evaluate(`document.querySelector('[aria-label="Provisional overall score"]').textContent.toLowerCase().includes('provisional')`));
      assert(await evaluate(`document.querySelector('[aria-label="Experimental nutrition rating"]').textContent.includes('Nutrition 54/100 · additive deduction 2 points')`));
      assert(await evaluate(`document.querySelector('[aria-label="Additive deduction reasons"]').textContent.includes('Erythritol')`));
      assert(await evaluate(`(() => { const subtotal=document.querySelector('[aria-label="Experimental nutrition rating"]'); return subtotal.closest('details')?.open===false && !document.querySelector('[aria-label="Opening score summary"]').contains(subtotal); })()`), 'Nutrition breakdown must be inside the collapsed details, outside the opening summary');
      assert(await evaluate(`(() => { const score = document.querySelector('[aria-label="Experimental overall rating"]'); const denominator = score.querySelector('small').getBoundingClientRect(); const line = score.getBoundingClientRect(); return line.height < 50 && denominator.height < 25 && denominator.right <= score.parentElement.getBoundingClientRect().right; })()`), 'Whole score denominator must remain on one line');
      assert(await evaluate(`Array.from(document.querySelectorAll('.trace-barcode-grade details, .trace-barcode-additives')).every(el => !el.open)`));
      await capture('mobile-provisional-390x844.png');
      if (refinement) {
        await review('teddy');
        assert.equal(await evaluate(`document.querySelector('[aria-label="Experimental overall rating"]').textContent`), '46/100');
        assert(await evaluate(`document.querySelector('[aria-label="Experimental nutrition rating"]').textContent.includes('Nutrition 46/100 · additive deduction 0 points')`));
        assert(await evaluate(`(() => { const opening=document.querySelector('[aria-label="Opening score summary"]'); return opening.querySelectorAll('li').length<=3 && opening.textContent.trim().split(/\\s+/).length<90 && !/baking soda|premenopausal|deduction|HR 1.48/i.test(opening.textContent); })()`));
        assert(await evaluate(`document.querySelector('[aria-label="Provisional overall score"]') && Array.from(document.querySelectorAll('.trace-barcode-grade details, .trace-barcode-additives')).every(el => !el.open)`));
        assert(await evaluate(`document.querySelector('[aria-label="Experimental nutrition assessment"]').getBoundingClientRect().bottom < 844`));
        await capture('mobile-teddy-390x844.png');
        await evaluate(`document.querySelector('.trace-barcode-additives').open = true; document.querySelector('.trace-barcode-additives').scrollIntoView({block:'start'})`);
        assert.equal(await evaluate(`document.querySelector('[aria-label="Grouped provider additives"]').children.length`), 2);
        assert(await evaluate(`document.querySelector('[aria-label="Grouped provider additives"]').textContent.includes('en:e500; en:e500ii')`));
        await capture('mobile-teddy-additives-390x844.png');
        if (simpleReview) {
          await review('stouffers');
          assert.equal(await evaluate(`document.querySelector('[aria-label="Experimental overall rating"]').textContent`), '70/100');
          assert(await evaluate(`document.querySelector('[aria-label="Main nutrition factors"]').children.length <= 3`));
          await capture('mobile-stouffers-390x844.png');
        }
      }
    }
    await review('unresolved');
    assert.equal(await evaluate(`document.querySelector('[aria-label="Experimental nutrition rating"]').textContent`), 'Score unavailable');
    await capture('mobile-unresolved-390x844.png');
    await review(); await click('Use This Food');
    await until(`!document.querySelector('[role="dialog"]')`);
    await evaluate(`(() => { const el = Array.from(document.querySelectorAll('input')).find(i => i.labels?.[0]?.textContent.includes('Number of servings')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '2'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await wait(100); await click('Save Entry');
    await until('Boolean(window.previewSavedEntry)');
    const saved = await evaluate('window.previewSavedEntry');
    assert.equal(saved.calories, 240); assert(!/nutritionScore100|overallScore100|concernBurden|additiveDeduction|methodVersion|"grade"|scoreReady/.test(JSON.stringify(saved)));
    const themes = ['modern-heirloom', 'river', 'haunted-forest', 'gnome-village', 'desert-journey', 'outer-space-journey', 'to-kingdoms-ahead'];
    const themeBackgrounds = [];
    for (const theme of themes) {
      await review(refinement ? 'teddy' : 'eligible', theme);
      assert(await evaluate(`Array.from(document.querySelectorAll('.trace-barcode-grade details, .trace-barcode-additives')).every(el => !el.open)`), theme + ': collapsed');
      assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth && document.querySelector('.trace-barcode-dialog__content').scrollWidth <= document.querySelector('.trace-barcode-dialog__content').clientWidth + 1`), theme + ': overflow');
      assert.equal(await evaluate('document.documentElement.dataset.traceShellTheme'), theme);
      themeBackgrounds.push(await evaluate(`getComputedStyle(document.querySelector('.trace-barcode-grade')).backgroundColor`));
    }
    assert.equal(new Set(themeBackgrounds).size, 7, 'All seven theme palettes must apply to the new panel');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
    await review(); await capture('desktop-review-1280x960.png');
    if (overallReview) { await review('quest'); await capture('desktop-provisional-1280x960.png'); }
    if (refinement) { await review('teddy'); await capture('desktop-teddy-1280x960.png'); }
    if (simpleReview) { await review('stouffers'); await capture('desktop-stouffers-1280x960.png'); }
    await review('eligible', 'modern-heirloom', false);
    assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Experimental nutrition assessment"]'))`), false);
    const report = { mobile: '390x844', desktop: '1280x960', screenshots: simpleReview ? 13 : refinement ? 11 : overallReview ? 8 : 5, themes, controls, disclosuresStartCollapsed: true, foodLoggingAndServing: true, scoresAbsentFromSavedEntry: true, noFlagExcludesGrading: true, synthetic: true, archivedAlmondComparison: overallReview, archivedNonzeroQuestScreen: overallReview, archivedTeddyScreen: refinement, archivedStouffersScreen: simpleReview, physicalDeviceTest: false };
    fs.writeFileSync(path.join(output, 'visual-checks.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } finally { if (client) { try { await client.send('Browser.close'); } catch { /* already closed */ } client.close(); } if (browser.exitCode === null) browser.kill(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
