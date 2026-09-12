// Local authoring helper; never connects to a personal browser profile.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(port = 9224) {
  let targets;
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); }
  catch {
    const profile = path.resolve('artifacts/time-capsule-combined-review/chrome');
    fs.mkdirSync(profile, { recursive: true });
    const chrome = process.env.TRACE_PREVIEW_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--autoplay-policy=no-user-gesture-required', 'about:blank'],
    { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 60; i++) {
      await pause(250);
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { /* Starting. */ }
    }
  }
  if (!targets) throw Error('Isolated authoring Chrome did not start. Set TRACE_PREVIEW_CHROME if needed.');
  // Open our own tab even when another preview tool uses the same debug browser.
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data), handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); message.error ? handler.reject(Error(JSON.stringify(message.error))) : handler.resolve(message.result); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable'); await send('Runtime.enable');
  return {
    send,
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    },
    async close() { try { await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`); } finally { ws.close(); } },
  };
}
module.exports = { connect, pause };
