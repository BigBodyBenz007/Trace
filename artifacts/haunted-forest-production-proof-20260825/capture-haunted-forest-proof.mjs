import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const [widthText, heightText, outputDirectory] = process.argv.slice(2);
const width = Number(widthText);
const height = Number(heightText);
if (!width || !height || !outputDirectory) {
  throw new Error("Usage: node capture-haunted-forest-proof.mjs <width> <height> <output-directory>");
}

const progressStops = [0, 0.33, 0.66, 1];
const memories = Array.from({ length: 12 }, (_, index) => ({
  categories: ["Reflection"],
  date: `${1980 + index * 4}-06-15`,
  description: `Visual verification memory ${index + 1}`,
  favorite: false,
  id: `forest-proof-${index + 1}`,
  images: [],
  title: `Forest proof ${index + 1}`,
}));
const settings = {
  lifeCurrentThemeId: "haunted-forest",
  schemaVersion: 1,
  units: { circumference: "in", height: "ft-in", weight: "lb" },
};

await mkdir(outputDirectory, { recursive: true });
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = path.join(os.tmpdir(), `trace-forest-cdp-${process.pid}-${Date.now()}`);
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
    const targets = await fetch(`http://127.0.0.1:${port}/json`)
      .then((response) => response.json());
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
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("appSettings", ${JSON.stringify(JSON.stringify(settings))});
      localStorage.setItem("memories", ${JSON.stringify(JSON.stringify(memories))});
    `,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:3001/" });

  const readyExpression = `document.readyState === "complete" &&
    Boolean(document.querySelector('[data-life-current-renderer="forest-path"]')) &&
    [...document.images].every((image) => image.complete)`;
  let ready = false;
  for (let attempt = 0; attempt < 160 && !ready; attempt += 1) {
    const result = await send("Runtime.evaluate", {
      expression: readyExpression,
      returnByValue: true,
    });
    ready = Boolean(result.result.value);
    if (!ready) await delay(100);
  }
  if (!ready) throw new Error("Haunted Forest preview did not become ready.");

  const diagnostics = [];
  for (const progress of progressStops) {
    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(async () => {
        const viewport = document.querySelector('[data-testid="memory-timeline-viewport"]');
        viewport.scrollLeft = ${progress} * (viewport.scrollWidth - viewport.clientWidth);
        viewport.dispatchEvent(new Event("scroll"));
        document.getElementById("trace-timeline-heading")?.scrollIntoView({ block: "start" });
        await new Promise((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const images = [...document.querySelectorAll(
          '[data-life-current-renderer="forest-path"] img'
        )];
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
        await new Promise((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(resolve)));
      })()`,
    });

    const diagnostic = await send("Runtime.evaluate", {
      expression: `(() => {
        const forest = document.querySelector('[data-life-current-renderer="forest-path"]');
        const scene = forest?.querySelector('[data-testid="life-current-forest-scenery"]');
        const viewport = document.querySelector('[data-testid="memory-timeline-viewport"]');
        const sections = [...(forest?.querySelectorAll("[data-forest-section]") || [])];
        const boxes = sections.map((section) => {
          const box = section.getBoundingClientRect();
          return { id: section.dataset.forestSection, left: box.left, right: box.right, width: box.width };
        });
        return {
          bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          currentSection: forest?.dataset.currentForestSection,
          geometricGaps: boxes.slice(1).some((box, index) => box.left > boxes[index].right),
          imageReady: sections.every((section) => section.dataset.imageReady === "true"),
          imagesComplete: [...(forest?.querySelectorAll("img") || [])]
            .every((image) => image.complete && image.naturalWidth === 1600 && image.naturalHeight === 900),
          loadedSections: forest?.dataset.loadedForestSections,
          sceneHeight: scene?.getBoundingClientRect().height,
          sectionBoxes: boxes,
          timelineClientWidth: viewport?.clientWidth,
          timelineScrollLeft: viewport?.scrollLeft,
          timelineScrollWidth: viewport?.scrollWidth,
        };
      })()`,
      returnByValue: true,
    });
    diagnostics.push({ progress, ...diagnostic.result.value });

    const capture = await send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      format: "png",
      fromSurface: true,
    });
    const suffix = String(Math.round(progress * 100)).padStart(3, "0");
    const outputPath = path.join(outputDirectory, `forest-${width}x${height}-p${suffix}.png`);
    await writeFile(outputPath, Buffer.from(capture.data, "base64"));
  }

  process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
  await send("Browser.close");
} finally {
  socket?.close();
  if (child.exitCode === null) child.kill();
}
