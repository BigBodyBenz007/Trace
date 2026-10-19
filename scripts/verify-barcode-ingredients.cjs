/* Isolated visual checks of the real barcode review and ingredient disclosure.
 * Run: node scripts/verify-barcode-ingredients.cjs
 * Optional: --reuse-bundle, --theme=modern-heirloom, --serve (manual preview).
 * Synthetic products use the real normalizer/cache; no camera or provider calls.
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const webpack = require("webpack");
const { normalizeOpenFoodFactsProduct } = require("../api/nutrition/_barcodeGateway.cjs");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts/barcode-ingredients-disclosure-20261019");
const scratch = path.join(root, ".tmp-browser/barcode-ingredients");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const barcode = "00012345600012";
const rawText = "Cultured milk, cream, cocoa (2%), cane sugar, strawberries, blueberries, natural vanilla flavour, pectin, live cultures.\nMade with ingredients listed by the provider.";
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });

async function bundle() {
  const food = normalizeOpenFoodFactsProduct({
    code: barcode, product_name: "Cocoa berry yogurt", brands: "Example Brand",
    ingredients_text: rawText, lang: "en", quantity: "100 g cup",
    serving_size: "1 cup (100 g)", serving_quantity: 100, serving_quantity_unit: "g",
    servings_per_container: 1, nutrition_data_per: "serving", last_modified_datetime: "2026-10-19T12:00:00Z",
    nutriments: { "energy-kcal_serving": 112.6666666666671, proteins_serving: 20,
      carbohydrates_serving: 6, fat_serving: 3, fiber_serving: 0,
      sodium_serving: 0.045, sodium_unit: "g", sugars_serving: 3, "added-sugars_serving": 0 },
  }, barcode, "2026-10-19T12:00:00.000Z");
  fs.writeFileSync(path.join(scratch, "entry.jsx"), `
    import React, { useMemo } from 'react';
    import { createRoot } from 'react-dom/client';
    import ${JSON.stringify(path.join(root, "src/appThemes.css"))};
    import ${JSON.stringify(path.join(root, "src/index.css"))};
    import BarcodeScannerDialog from ${JSON.stringify(path.join(root, "src/components/BarcodeScannerDialog.jsx"))};
    import { createRemoteBarcodeLookup } from ${JSON.stringify(path.join(root, "src/services/remoteBarcodeLookup.js"))};
    import { createRemoteBarcodeCache } from ${JSON.stringify(path.join(root, "src/services/remoteBarcodeCache.js"))};
    const params = new URLSearchParams(location.search);
    const theme = params.get('theme') || 'modern-heirloom';
    const scenario = params.get('scenario') || 'normal';
    document.documentElement.dataset.traceShellTheme = theme;
    function Preview() {
      const lookup = useMemo(() => {
        const food = ${JSON.stringify(food)};
        if (scenario === 'legacy') delete food.ingredients;
        if (scenario === 'missing') food.ingredients = { text: null, language: null };
        if (scenario === 'long') food.ingredients.text = 'Ingredient-with-an-unbroken-provider-name'.repeat(140) + '\\n' + food.ingredients.text;
        window.expectedIngredientText = food.ingredients?.text;
        const cache = createRemoteBarcodeCache({ storage: localStorage });
        cache.set('${barcode}', { status: 'found', identifier: { scheme: 'gtin', value: '${barcode}' }, food });
        return createRemoteBarcodeLookup({ storage: localStorage, localLookup: () => ({ status: 'not-found', food: null }),
          runtime: { isWeb: true, isOnline: false }, fetchImpl: () => { throw new Error('Preview must remain offline'); } });
      }, []);
      return <div className="trace-app-shell trace-feature-page trace-feature-page--nutrition" data-motion="reduced" data-trace-shell-theme={theme}>
        <BarcodeScannerDialog access={{ available: true, label: 'Barcode Scanner Beta', message: 'Review a product.' }}
          barcodeLookup={lookup} camera={{ start: async () => ({ devices: [], stop() {} }) }}
          lifecycleAdapter={{ subscribe: () => () => {} }}
          onClose={() => {}} onUseFood={(food) => { window.lastUsedFood = food; return false; }} />
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

function contrast(foreground, background) {
  const luminance = (value) => {
    const channels = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((n) => {
      const c = n / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function main() {
  process.env.NODE_ENV = "development";
  if (!process.argv.includes("--reuse-bundle")) { console.log("Bundling real barcode review for isolated preview..."); await bundle(); }
  const server = http.createServer((request, response) => {
    const filename = path.basename(new URL(request.url, "http://localhost").pathname);
    if (!filename) {
      response.setHeader("Content-Type", "text/html");
      response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
      return;
    }
    const file = path.join(scratch, filename);
    if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
    if (filename.endsWith(".js")) response.setHeader("Content-Type", "text/javascript");
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(process.argv.includes("--serve") ? 4174 : 0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  if (process.argv.includes("--serve")) { console.log(`Ingredient review preview: ${base}. Enter ${barcode} and choose Look Up Barcode. Ctrl+C stops it.`); return; }
  const profile = path.join(scratch, `profile-${Date.now()}`);
  const browserLog = fs.openSync(path.join(output, "browser.log"), "w");
  const browser = spawn(process.env.TRACE_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ["--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { windowsHide: true, stdio: ["ignore", "ignore", browserLog] });
  let client;
  const report = [];
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let tries = 0; !fs.existsSync(portFile) && tries < 100; tries++) await wait(200);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    client = await connect(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
    await client.send("Page.bringToFront");
    await client.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const evaluate = async (expression) => {
      const result = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    async function review(theme, width, scenario = "normal") {
      const height = width === 390 ? 844 : 1000;
      await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width === 390 });
      await client.send("Page.navigate", { url: `${base}/?theme=${theme}&scenario=${scenario}` });
      for (let tries = 0; tries < 100 && !await evaluate("Boolean(document.querySelector('.trace-barcode-dialog__manual'))"); tries++) await wait(100);
      await evaluate(`(() => { const input = document.querySelector('.trace-barcode-dialog__manual input');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${barcode}');
        input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await wait(50);
      await evaluate("document.querySelector('.trace-barcode-dialog__manual').requestSubmit()");
      for (let tries = 0; tries < 100 && !await evaluate("Boolean(document.querySelector('.trace-barcode-ingredients__toggle'))"); tries++) await wait(100);
      assert.ok(await evaluate("Boolean(document.querySelector('.trace-barcode-ingredients__toggle'))"), "Product review missing");
      await evaluate("document.fonts.ready");
      for (const expanded of scenario === "normal" ? [false, true] : [true]) {
        if (expanded) {
          await evaluate("document.querySelector('.trace-barcode-ingredients__toggle').focus()");
          await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r" });
          await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        }
        await wait(100);
        await evaluate("document.querySelector('.trace-barcode-ingredients').scrollIntoView({ block: 'end', behavior: 'instant' })");
        const metrics = await evaluate(`(() => {
          const section = document.querySelector('.trace-barcode-ingredients');
          const toggle = section.querySelector('button'); const text = section.querySelector('[aria-label="Ingredient text"]');
          const meta = section.querySelector('.trace-barcode-ingredients__metadata');
          const content = document.querySelector('.trace-barcode-dialog__content');
          return { expanded: toggle.getAttribute('aria-expanded'), overflow: document.documentElement.scrollWidth > innerWidth || content.scrollWidth > content.clientWidth + 1,
            disclosureVisible: section.getBoundingClientRect().bottom <= content.getBoundingClientRect().bottom + 1,
            toggleHeight: toggle.getBoundingClientRect().height, background: getComputedStyle(section).backgroundColor,
            color: getComputedStyle(toggle).color, metadataColor: meta && getComputedStyle(meta).color,
            textOverflow: text ? text.scrollWidth > text.clientWidth + 1 : false,
            textHeight: text && text.clientHeight, textScrollHeight: text && text.scrollHeight,
            rawTextPreserved: text ? text.textContent === window.expectedIngredientText : true,
            unavailable: section.textContent.includes('Ingredient information unavailable.'),
            language: section.textContent.includes('Language: en'), textFont: text && parseFloat(getComputedStyle(text).fontSize) };
        })()`);
        assert.equal(metrics.expanded, String(expanded)); assert.equal(metrics.overflow, false); assert.equal(metrics.textOverflow, false);
        assert.ok(metrics.disclosureVisible, "Ingredient section must be visible in the screenshot");
        assert.ok(metrics.toggleHeight >= 44); assert.ok(metrics.rawTextPreserved);
        metrics.textContrast = contrast(metrics.color, metrics.background); assert.ok(metrics.textContrast >= 4.5, `${theme}: text contrast`);
        if (metrics.metadataColor) { metrics.metadataContrast = contrast(metrics.metadataColor, metrics.background); assert.ok(metrics.metadataContrast >= 4.5, `${theme}: metadata contrast`); }
        if (expanded && ["missing", "legacy"].includes(scenario)) { assert.ok(metrics.unavailable); assert.equal(metrics.language, false); }
        if (expanded && scenario === "long") assert.ok(metrics.textScrollHeight > metrics.textHeight);
        if (expanded && scenario === "normal") { assert.ok(metrics.language); assert.ok(metrics.textFont >= 14); }
        const filename = `${theme}-${width}x${height}-${scenario === "normal" ? expanded ? "expanded" : "collapsed" : scenario}.png`;
        const { data } = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        fs.writeFileSync(path.join(output, filename), Buffer.from(data, "base64"));
        report.push({ theme, width, height, scenario, filename, ...metrics });
        fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
        if (expanded) {
          await evaluate("document.querySelector('.trace-barcode-ingredients__toggle').focus()");
          await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
          await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
          await wait(50);
          assert.equal(await evaluate("document.querySelector('.trace-barcode-ingredients__toggle').getAttribute('aria-expanded')"), "false", "Space collapses disclosure");
        }
      }
      console.log(`Verified ${theme} ${width}px ${scenario}`);
    }
    const selected = process.argv.find((arg) => arg.startsWith("--theme="))?.slice(8);
    for (const theme of selected ? [selected] : ["modern-heirloom", "to-kingdoms-ahead", "river", "haunted-forest", "gnome-village", "desert-journey", "outer-space-journey"]) {
      for (const width of [390, 1440]) await review(theme, width);
    }
    for (const scenario of ["missing", "legacy", "long"]) await review("modern-heirloom", 390, scenario);
    console.log(`Saved ${report.length} screenshots and layout/contrast checks to ${output}`);
  } finally {
    if (client) { await client.send("Browser.close").catch(() => {}); client.close(); }
    browser.kill(); fs.closeSync(browserLog); server.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
