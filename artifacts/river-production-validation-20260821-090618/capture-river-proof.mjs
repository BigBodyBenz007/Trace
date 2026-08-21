import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const [widthText, heightText, outputPath, progressText = "1"] = process.argv.slice(2);
const width = Number(widthText);
const height = Number(heightText);
const scrollProgress = Math.max(0, Math.min(1, Number(progressText)));
if (!width || !height || !outputPath) {
  throw new Error("Usage: node capture-river-proof.mjs <width> <height> <output>");
}

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = path.join(os.tmpdir(), `trace-river-cdp-${process.pid}-${Date.now()}`);
await mkdir(profile, { recursive: true });

const child = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function devToolsPort() {
  const activePort = path.join(profile, "DevToolsActivePort");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const [port] = (await readFile(activePort, "utf8")).trim().split(/\r?\n/);
      if (port) return port;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome did not publish a DevTools port.");
}

let socket;
try {
  const port = await devToolsPort();
  let target;
  for (let attempt = 0; attempt < 80 && !target; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
    target = targets.find((candidate) => candidate.type === "page");
    if (!target) await delay(100);
  }
  if (!target) throw new Error("Chrome did not create a page target.");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { reject, resolve });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height,
    mobile: width <= 390,
    screenHeight: height,
    screenWidth: width,
    width,
  });
  await send("Page.navigate", {
    url: "http://127.0.0.1:3000/?syntheticLife=1#trace-timeline-heading",
  });

  const readyExpression = `document.readyState === "complete" &&
    Boolean(document.querySelector('[data-life-current-renderer="river-current"]')) &&
    [...document.images].every((image) => image.complete)`;
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
    const result = await send("Runtime.evaluate", {
      expression: readyExpression,
      returnByValue: true,
    });
    ready = Boolean(result.result.value);
    if (!ready) await delay(100);
  }
  if (!ready) throw new Error("River preview did not become ready.");

  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(async () => {
      const viewport = document.querySelector('[data-testid="memory-timeline-viewport"]');
      if (viewport) {
        viewport.scrollLeft = ${scrollProgress} * (viewport.scrollWidth - viewport.clientWidth);
        viewport.dispatchEvent(new Event("scroll"));
      }
      document.getElementById("trace-timeline-heading")?.scrollIntoView({ block: "start" });
      await new Promise((resolve) => requestAnimationFrame(() =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))));
    })()`,
  });

  const diagnostics = await send("Runtime.evaluate", {
    expression: `(() => {
      const river = document.querySelector('[data-life-current-renderer="river-current"]');
      const viewport = document.querySelector('[data-testid="memory-timeline-viewport"]');
      return {
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        currentSection: river?.dataset.currentRiverSection,
        imagesComplete: [...(river?.querySelectorAll("img") || [])].every((image) => image.complete),
        loadedSections: river?.dataset.loadedRiverSections,
        timelineClientWidth: viewport?.clientWidth,
        timelineScrollLeft: viewport?.scrollLeft,
        timelineScrollWidth: viewport?.scrollWidth,
      };
    })()`,
    returnByValue: true,
  });

  const capture = await send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  await writeFile(outputPath, Buffer.from(capture.data, "base64"), { flag: "wx" });
  process.stdout.write(`${JSON.stringify(diagnostics.result.value)}\n${outputPath}\n`);
  await send("Browser.close");
} finally {
  socket?.close();
  if (child.exitCode === null) child.kill();
}
