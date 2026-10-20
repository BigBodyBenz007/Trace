/* Real production-build smoke test in a new isolated Chrome profile.
 * No existing browser profile, user storage or service-worker state is accessed.
 * node scripts/verify-production-startup.cjs <build-directory>
 */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts/production-startup-repair-20261020');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function connect(url, onEvent) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    onEvent(message);
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

async function main() {
  const build = path.resolve(process.argv[2] || path.join(output, 'production-build'));
  assert(fs.existsSync(path.join(build, 'index.html')), 'Provide a completed production build directory.');
  const manifest = JSON.parse(fs.readFileSync(path.join(build, 'asset-manifest.json')));
  const mainFile = path.join(build, manifest.files['main.js'].replace(/^\//, ''));
  const source = fs.readFileSync(mainFile, 'utf8');
  assert(!source.includes('trace-experimental-updated-nutrition-numeric'), 'Experimental grading engine must be absent from production.');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = path.resolve(build, relative || 'index.html');
    if (file !== build && !file.startsWith(build + path.sep)) { response.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(relative)) { response.writeHead(404).end(); return; }
      file = path.join(build, 'index.html');
    }
    const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = path.join(output, `production-browser-${Date.now()}`);
  const browser = spawn(process.env.TRACE_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' });
  const exceptions = [];
  let client;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await wait(200);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    client = await connect(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl,
      event => { if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails); });
    await client.send('Runtime.enable');
    const evaluate = async expression => {
      const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value;
    };
    const until = async expression => {
      for (let i = 0; i < 200; i++) {
        if (exceptions.length) throw new Error(JSON.stringify(exceptions));
        if (await evaluate(expression)) return;
        await wait(100);
      }
      throw new Error('Timed out: ' + expression);
    };
    const capture = async filename => {
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, filename), Buffer.from(shot.data, 'base64'));
    };
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
    await client.send('Page.navigate', { url: `${base}/?nutritionPilot=1&barcodeGrading=1` });
    await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Nutrition')`);
    assert.equal(await evaluate('Boolean(document.querySelector(".nutrition-pilot"))'), false);
    const records = await evaluate(`JSON.stringify(['nutritionEntries','userFoods'].map(key => [key, localStorage.getItem(key)]))`);
    await capture('production-home-desktop.png');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Nutrition').click()`);
    await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Scan Barcode')`);
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await capture('production-nutrition-mobile.png');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Scan Barcode').click()`);
    await until(`Boolean(document.querySelector('[aria-label="Close barcode scanner"]'))`);
    assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Experimental nutrition assessment"]'))`), false);
    await evaluate(`document.querySelector('[aria-label="Close barcode scanner"]').click()`);
    assert.equal(await evaluate(`JSON.stringify(['nutritionEntries','userFoods'].map(key => [key, localStorage.getItem(key)]))`), records, 'Opening Nutrition/scanner must not change saved food records');
    await wait(800);
    assert.equal(exceptions.length, 0, 'No uncaught production exceptions');
    const report = { build, main: manifest.files['main.js'], homeMounted: true, nutritionMounted: true,
      scannerOpenedAndClosed: true, uncaughtExceptions: exceptions, experimentalEngineAbsent: true,
      productionFlagsCannotEnablePreview: true, savedFoodRecordsUnchanged: true,
      isolatedBrowserProfile: true, existingUserBrowserStorageAccessed: false, serviceWorkerDataCleared: false };
    fs.writeFileSync(path.join(output, 'production-browser-smoke.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(path.join(output, 'production-browser-exceptions.json'), JSON.stringify(exceptions, null, 2));
    if (client) { try { await client.send('Browser.close'); } catch { /* already closed */ } client.close(); }
    if (browser.exitCode === null) browser.kill(); server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
