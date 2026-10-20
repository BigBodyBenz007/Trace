/* Inspect the real opt-in CRA development preview. No server/bundle/dependencies.
 * Start npm start on localhost:3000 first, then node scripts/verify-nutrition-pilot.cjs.
 * One headless Chrome process; seven themes checked serially, five screenshots
 * plus three generic-produce screenshots with --produce.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const produce = process.argv.includes('--produce');
const output = path.join(root, produce ? 'artifacts/usda-produce-fallback-20261020' : 'artifacts/nutrition-calibration-20261020');
const base = 'http://localhost:3000';
const themes = ['modern-heirloom', 'river', 'haunted-forest', 'gnome-village', 'desert-journey', 'outer-space-journey', 'to-kingdoms-ahead'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(url) {
  const socket = new WebSocket(url), pending = new Map(); let id = 0;
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => { const m = JSON.parse(data), job = pending.get(m.id);
    if (job) { pending.delete(m.id); clearTimeout(job.timer); m.error ? job.reject(new Error(JSON.stringify(m.error))) : job.resolve(m.result); } };
  return { close: () => socket.close(), send: (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id, timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000);
    pending.set(next, { resolve, reject, timer }); socket.send(JSON.stringify({ id: next, method, params }));
  }) };
}
function contrast(a, b) {
  const light = c => { const rgb = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
    const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  }); return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722; };
  const x = light(a), y = light(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
async function main() {
  assert((await fetch(base)).ok, 'Start the existing CRA dev app on port 3000 first.');
  fs.mkdirSync(output, { recursive: true });
  const profile = path.join(output, `chrome-${Date.now()}`);
  const browser = spawn(process.env.TRACE_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let c;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await wait(200);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    c = await connect(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    const evaluate = async expression => { const r = await c.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const navigate = async url => {
      await c.send('Page.navigate', { url });
      for (let i = 0; i < 150; i++) { if (await evaluate('Boolean(document.querySelector(".nutrition-pilot"))')) return; await wait(200); }
      throw new Error('Pilot did not mount: ' + url);
    };
    const capture = async filename => { const shot = await c.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, filename), Buffer.from(shot.data, 'base64')); };
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate(`${base}/?nutritionPilot=1`);
    await evaluate('document.fonts.ready');
    assert.equal(await evaluate(`document.querySelector('[aria-label="Nutrition rating"]').textContent`), '84/100');
    assert.equal(await evaluate(`/Nutri-Score [A-E]\\b|Letter:|A=90|A to E/.test(document.querySelector('.nutrition-pilot').textContent)`), false);
    assert(await evaluate(`document.querySelector('[aria-label="Source and formulation confidence"]').getBoundingClientRect().bottom < 844`), 'Source confidence visible on opening mobile screen');
    assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Combined rating"]'))`), false);
    assert(await evaluate('document.querySelector(".nutrition-pilot__additive-link").getBoundingClientRect().bottom < 844'), 'Additive summary must be visible with the score on mobile');
    assert.equal(await evaluate('document.querySelector(".trace-barcode-ingredients__toggle").getAttribute("aria-expanded")'), 'false');
    await capture('pilot-mobile-390x844.png');
    const reports = [];
    for (const theme of themes) {
      await evaluate(`(() => { const s = document.querySelectorAll('.nutrition-pilot select')[1]; s.value = ${JSON.stringify(theme)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await wait(80);
      const state = await evaluate(`(() => { const card = document.querySelector('.nutrition-pilot__card');
        const style = getComputedStyle(card), muted = getComputedStyle(card.querySelector('.nutrition-pilot__muted'));
        return { theme: document.documentElement.dataset.traceShellTheme, background: style.backgroundColor,
          foreground: style.color, secondary: muted.color, viewport: innerWidth, scroll: document.documentElement.scrollWidth,
          ingredientButtonHeight: document.querySelector('.trace-barcode-ingredients__toggle').getBoundingClientRect().height,
          score: document.querySelector('[aria-label="Nutrition rating"]').textContent }; })()`);
      assert.equal(state.theme, theme); assert(state.scroll <= state.viewport + 1, `${theme}: page overflow`);
      assert(state.ingredientButtonHeight >= 44, `${theme}: ingredient control touch target`);
      state.primaryContrast = contrast(state.foreground, state.background);
      state.secondaryContrast = contrast(state.secondary, state.background);
      assert(state.primaryContrast >= 4.5 && state.secondaryContrast >= 4.5, `${theme}: insufficient text contrast`);
      reports.push(state);
    }
    assert.equal(new Set(reports.map(r => r.background)).size, 7, 'All seven themes must apply their own tokens');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
    await navigate(`${base}/?nutritionPilot=1&theme=modern-heirloom`);
    await wait(200);
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop page overflow');
    await capture('pilot-desktop-1280x960.png');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate(`${base}/?nutritionPilot=1&profile=reported-additives`);
    await evaluate('document.querySelector("#pilot-ingredients details").open = true; document.querySelector(".trace-barcode-ingredients__toggle").click(); document.querySelector("#pilot-ingredients").scrollIntoView()');
    await wait(100); await capture('pilot-additives-390x844.png');
    assert(await evaluate('document.querySelector("#pilot-ingredients").textContent.includes("Name not in the verified reference")'));
    await navigate(`${base}/?nutritionPilot=1&profile=regular-soda`);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Nutrition rating"]').textContent`), '18/100');
    await capture('pilot-soda-390x844.png');
    await navigate(`${base}/?nutritionPilot=1&profile=sweetened-yogurt`);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Nutrition rating"]').textContent`), 'Not available');
    assert(await evaluate(`document.querySelector('[aria-label="Possible nutrition score"]').textContent.includes('80–85/100')`));
    await capture('pilot-uncertain-390x844.png');
    if (produce) {
      await navigate(`${base}/?nutritionPilot=1`);
      await evaluate(`document.querySelector('.nutrition-pilot__produce').open = true; document.querySelector('.nutrition-pilot__produce').scrollIntoView()`);
      assert.equal(await evaluate(`document.querySelector('.nutrition-pilot__produce button').disabled`), true);
      assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Generic nutrition rating"]'))`), false);
      await evaluate(`document.querySelector('.nutrition-pilot__produce input').click()`);
      await wait(100);
      await evaluate(`document.querySelector('.nutrition-pilot__produce button').click()`);
      await wait(100);
      assert.equal(await evaluate(`document.querySelector('[aria-label="Generic nutrition rating"]').textContent`), '82/100');
      assert.equal(await evaluate(`document.querySelector('[aria-label="Nutrition rating"]').textContent`), '84/100');
      assert(await evaluate(`document.querySelector('[aria-label="USDA produce estimate"]').textContent.includes('Package additives: unknown')`));
      assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Produce mobile overflow');
      await evaluate(`document.querySelector('[aria-label="USDA produce estimate"]').scrollIntoView()`);
      await wait(100);
      await capture('produce-apple-mobile-390x844.png');
      await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
      await evaluate(`document.querySelector('.nutrition-pilot__produce').scrollIntoView()`);
      await wait(100);
      assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Produce desktop overflow');
      await capture('produce-apple-desktop-1280x960.png');
      await evaluate(`(() => { const s = document.querySelector('.nutrition-pilot__produce select'); s.value = 'produce-1750341'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await wait(100);
      assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="USDA produce estimate"]'))`), false);
      assert.equal(await evaluate(`document.querySelector('.nutrition-pilot__produce input').checked`), false);
      await evaluate(`document.querySelector('.nutrition-pilot__produce input').click()`);
      await wait(100);
      await evaluate(`document.querySelector('.nutrition-pilot__produce button').click()`);
      await wait(100);
      assert.equal(await evaluate(`document.querySelector('[aria-label="Generic nutrition rating"]').textContent`), 'Not available');
      await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await evaluate(`document.querySelector('[aria-label="USDA produce estimate"]').scrollIntoView()`);
      await wait(100);
      await capture('produce-gala-mobile-390x844.png');
    }
    // No opt-in must mount the ordinary application, never the pilot.
    await c.send('Page.navigate', { url: base + '/' });
    for (let i = 0; i < 100 && !await evaluate('Boolean(document.querySelector("#root")?.textContent)'); i++) await wait(100);
    await wait(200);
    assert.equal(await evaluate('Boolean(document.querySelector(".nutrition-pilot"))'), false);
    const report = { testedUrl: base + '/?nutritionPilot=1', mobile: '390x844', desktop: '1280x960',
      themes: reports, ordinaryAppWithoutOptIn: true, physicalDeviceTest: false, screenshots: produce ? 8 : 5,
      genericProduceChecks: produce, letterRatingsAbsent: true };
    fs.writeFileSync(path.join(output, 'visual-checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { if (c) { try { await c.send('Browser.close'); } catch { /* already closed */ } c.close(); }
    if (browser.exitCode === null) browser.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
