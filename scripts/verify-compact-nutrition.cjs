/* Focused visual proof: bundles the real NutritionPage and shared theme styles.
 * Uses a disposable Chrome profile; never reads the user's browser storage.
 * Run: node scripts/verify-compact-nutrition.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const webpack = require("webpack");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/compact-nutrition-20261019");
const scratch = path.join(root, ".tmp-browser/compact-nutrition");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });

async function bundle() {
  fs.writeFileSync(path.join(scratch, "entry.jsx"), `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import ${JSON.stringify(path.join(root, "src/appThemes.css"))};
    import ${JSON.stringify(path.join(root, "src/index.css"))};
    import NutritionPage from ${JSON.stringify(path.join(root, "src/components/NutritionPage.jsx"))};
    const theme = new URLSearchParams(location.search).get('theme') || 'modern-heirloom';
    document.documentElement.dataset.traceShellTheme = theme;
    function Preview() {
      const [entries, setEntries] = useState([]);
      const [water, setWater] = useState([]);
      const [goals, setGoals] = useState({ calories: 1800, protein: 90, carbohydrates: 180, fat: 60, sodium: 2000, waterGoalMl: 0 });
      window.setNutritionPreviewEntries = setEntries;
      return <div className="trace-app-shell" data-motion="reduced" data-trace-shell-theme={theme}>
        <NutritionPage nutritionEntries={entries} nutritionGoals={goals} waterEntries={water} waterUnit="oz"
          saveNutritionGoals={(value) => { setGoals(value); return true; }}
          saveNutritionEntry={(value) => { setEntries((items) => [...items, { ...value, id: String(Date.now()) }]); return true; }}
          updateNutritionEntry={() => true} deleteNutritionEntry={() => true}
          saveWaterEntry={(value) => { setWater((items) => [...items, { ...value, id: String(Date.now()) }]); return true; }}
          onBack={() => {}} buttonStyle={{}} inputStyle={{}}
          containerStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }} />
      </div>;
    }
    createRoot(document.getElementById('root')).render(<Preview />);
  `);
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "development", devtool: false, entry: path.join(scratch, "entry.jsx"),
      output: { path: scratch, filename: "preview.js", publicPath: "/" },
      resolve: { extensions: [".js", ".jsx", ".json"] },
      module: { rules: [
        { test: /\.jsx?$/, exclude: /node_modules/, use: { loader: require.resolve("babel-loader"), options: { presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]] } } },
        { test: /\.css$/, use: [require.resolve("style-loader"), require.resolve("css-loader")] },
        { test: /\.(png|jpe?g|webp|svg|woff2?|mp3|wav)$/i, type: "asset/resource" },
      ] },
    });
    compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  });
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
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
      const timer = setTimeout(() => { pending.delete(next); reject(new Error(`Timed out: ${method}`)); }, 60000);
      pending.set(next, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: next, method, params }));
    }),
  };
}

async function main() {
  process.env.NODE_ENV = "development";
  if (!process.argv.includes("--reuse-bundle")) await bundle();
  const server = http.createServer((request, response) => {
    const filename = path.basename(new URL(request.url, "http://localhost").pathname);
    if (!filename) {
      response.setHeader("Content-Type", "text/html");
      response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
      return;
    }
    const file = path.join(scratch, filename);
    if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
    if (filename.endsWith(".js")) response.setHeader("Content-Type", "text/javascript");
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const chromePath = process.env.TRACE_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const profile = path.join(scratch, `profile-${Date.now()}`);
  const browserLog = fs.openSync(path.join(output, "browser.log"), "w");
  const browser = spawn(chromePath, ["--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--enable-logging=stderr", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", browserLog] });
  let client;
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let tries = 0; !fs.existsSync(portFile) && tries < 100; tries++) await wait(200);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    client = await connect(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
    console.log("Browser connected:", (await client.send("Browser.getVersion")).product);
    const evaluate = async (expression) => {
      const result = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const report = [];
    const selectedTheme = process.argv.find((arg) => arg.startsWith("--theme="))?.slice(8);
    for (const theme of selectedTheme ? [selectedTheme] : ["modern-heirloom", "to-kingdoms-ahead", "river", "haunted-forest", "gnome-village", "desert-journey", "outer-space-journey"]) {
      for (const width of [390, 1440]) {
        const height = width === 390 ? 844 : 1000;
        await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width === 390 });
        await client.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/?theme=${theme}` });
        for (let tries = 0; tries < 100; tries++) {
          if (await evaluate("Boolean(document.querySelector('.trace-nutrition-details-toggle'))")) break;
          await wait(100);
        }
        await evaluate("document.fonts.ready");
        for (const expanded of [false, true]) {
          if (expanded) await evaluate("document.querySelector('.trace-nutrition-details-toggle').click()");
          await wait(150);
          const layout = await evaluate(`(() => {
            const actions = document.querySelector('.trace-nutrition-quick-actions').getBoundingClientRect();
            return { overflow: document.documentElement.scrollWidth > innerWidth, actionBottom: actions.bottom, expanded: document.querySelector('.trace-nutrition-details-toggle').getAttribute('aria-expanded') };
          })()`);
          assert.equal(layout.overflow, false, `${theme} ${width}: horizontal overflow`);
          assert.equal(layout.expanded, String(expanded));
          if (!expanded) assert.ok(layout.actionBottom <= height, `${theme}: actions below the fold`);
          const filename = `${theme}-${width}x${height}-${expanded ? "expanded" : "collapsed"}.png`;
          const { data } = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          fs.writeFileSync(path.join(output, filename), Buffer.from(data, "base64"));
          report.push({ theme, width, height, ...layout, filename });
        }
        if (theme === "modern-heirloom" && width === 390) {
          await evaluate(`window.setNutritionPreviewEntries([
            { id: 'known', name: 'Preview meal', loggedAt: new Date().toISOString(), calories: 450.56, protein: 22.56, carbohydrates: 45.67, fat: 15, sodium: 500, fiber: 3, totalSugar: 5, addedSugar: 0 },
            { id: 'missing', name: 'Incomplete preview food', loggedAt: new Date().toISOString(), calories: null, protein: 0 }
          ])`);
          await wait(150);
          assert.ok(await evaluate("document.querySelector('.trace-nutrition-summary').textContent.includes('Remaining unknown')"));
          const labels = await evaluate("Array.from(document.querySelectorAll('.trace-nutrition-metric__label'), label => label.textContent)");
          assert.ok(labels.includes("Protein") && labels.includes("Carbs"));
          assert.ok(!labels.some((label) => /Known Protein|Known Carbohydrates|Known Carbs/.test(label)));
          const displayedValues = await evaluate("Array.from(document.querySelectorAll('.trace-nutrition-metric__value > span:first-child'), value => value.textContent)");
          assert.ok(["451", "22.6", "45.7"].every((value) => displayedValues.includes(value)), "Summary rounding mismatch");
          assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
          assert.ok(await evaluate("document.querySelector('.trace-nutrition-quick-actions').getBoundingClientRect().bottom <= innerHeight"), "Partial-data actions below the fold");
          const { data } = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          fs.writeFileSync(path.join(output, "modern-heirloom-390x844-partial-data.png"), Buffer.from(data, "base64"));
        }
        // Exercise the actual food-search and scanner entry points.
        await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Add Food').click()");
        assert.equal(await evaluate("document.activeElement.type"), "search");
        await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Scan Barcode').click()");
        await wait(100);
        assert.ok(await evaluate("Boolean(document.querySelector('[role=dialog]'))"));
      }
    }
    fs.writeFileSync(path.join(output, selectedTheme ? `report-${selectedTheme}.json` : "report.json"), JSON.stringify(report, null, 2));
    console.log(`Saved ${report.length} screenshots and layout checks to ${output}`);
  } finally {
    if (client) { await client.send("Browser.close").catch(() => {}); client.close(); }
    browser.kill();
    fs.closeSync(browserLog);
    server.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
