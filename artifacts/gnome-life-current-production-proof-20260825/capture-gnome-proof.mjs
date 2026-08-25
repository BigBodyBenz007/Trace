import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

const [widthText, heightText, outputDirectory] = process.argv.slice(2);
const width = Number(widthText);
const height = Number(heightText);
if (!width || !height || !outputDirectory) {
  throw new Error("Usage: node capture-gnome-proof.mjs <width> <height> <output-directory>");
}

const progressStops = [0, 0.16, 0.32, 0.43, 0.49, 0.54, 0.59, 0.64, 0.78, 0.94];
const memories = Array.from({ length: 20 }, (_, index) => ({
  categories: ["Reflection"],
  date: `${1980 + index * 2}-06-15`,
  description: `Visual verification memory ${index + 1}`,
  favorite: false,
  id: `gnome-proof-${index + 1}`,
  images: [],
  title: `Gnome proof ${index + 1}`,
}));
const settings = {
  lifeCurrentThemeId: "gnome-village",
  schemaVersion: 1,
  units: { circumference: "in", height: "ft-in", weight: "lb" },
};

const buildRoot = path.resolve("build");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);
const server = createServer(async (request, response) => {
  try {
    const requestedPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
    let filePath = path.resolve(buildRoot, relativePath);
    if (!filePath.startsWith(`${buildRoot}${path.sep}`) || !(await stat(filePath)).isFile()) {
      filePath = path.join(buildRoot, "index.html");
    }
    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    createReadStream(path.join(buildRoot, "index.html")).pipe(response);
  }
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(3001, "127.0.0.1", resolve);
});

await mkdir(outputDirectory, { recursive: true });
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = path.join(os.tmpdir(), `trace-gnome-cdp-${process.pid}-${Date.now()}`);
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
  process.stderr.write("Waiting for Chrome DevTools...\n");
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
  process.stderr.write("Waiting for the built Gnome timeline...\n");

  const readyExpression = `document.readyState === "complete" &&
    Boolean(document.querySelector('[data-life-current-renderer="gnome-village"]')) &&
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
  if (!ready) throw new Error("Gnome Village preview did not become ready.");
  process.stderr.write("Capturing Gnome timeline stops...\n");

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedMotion = await send("Runtime.evaluate", {
    expression: `getComputedStyle(document.querySelector('[data-gnome-section]')).transitionDuration`,
    returnByValue: true,
  });
  await send("Emulation.setEmulatedMedia", { features: [] });

  const diagnostics = [];
  for (const progress of progressStops) {
    process.stderr.write(`  progress ${progress}\n`);
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
          '[data-life-current-renderer="gnome-village"] img'
        )];
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
        await new Promise((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(resolve)));
      })()`,
    });

    const diagnostic = await send("Runtime.evaluate", {
      expression: `(() => {
        const gnome = document.querySelector('[data-life-current-renderer="gnome-village"]');
        const scene = gnome?.querySelector('[data-testid="life-current-gnome-scenery"]');
        const viewport = document.querySelector('[data-testid="memory-timeline-viewport"]');
        const sections = [...(gnome?.querySelectorAll("[data-gnome-section]") || [])];
        const boxes = sections.map((section) => {
          const box = section.getBoundingClientRect();
          return { id: section.dataset.gnomeSection, left: box.left, right: box.right, width: box.width };
        });
        return {
          bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          currentSection: gnome?.dataset.currentGnomeSection,
          geometricGaps: boxes.slice(1).some((box, index) => box.left > boxes[index].right),
          imageReady: sections.every((section) => section.dataset.imageReady === "true"),
          imagesComplete: [...(gnome?.querySelectorAll("img") || [])]
            .every((image) => image.complete && image.naturalWidth === 1672 && image.naturalHeight === 941),
          loadedSections: gnome?.dataset.loadedGnomeSections,
          openerMounts: sections.filter((section) => section.dataset.gnomeSection === "book-beginning").length,
          reducedMotionTransition: ${JSON.stringify("placeholder")},
          sceneHeight: scene?.getBoundingClientRect().height,
          sectionBoxes: boxes,
          timelineClientWidth: viewport?.clientWidth,
          timelineScrollLeft: viewport?.scrollLeft,
          timelineScrollWidth: viewport?.scrollWidth,
        };
      })()`,
      returnByValue: true,
    });
    diagnostics.push({
      progress,
      ...diagnostic.result.value,
      reducedMotionTransition: reducedMotion.result.value,
    });

    const capture = await send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      format: "png",
      fromSurface: true,
    });
    const suffix = String(Math.round(progress * 100)).padStart(3, "0");
    const outputPath = path.join(outputDirectory, `gnome-${width}x${height}-p${suffix}.png`);
    await writeFile(outputPath, Buffer.from(capture.data, "base64"));
  }

  process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
  await send("Browser.close");
} finally {
  socket?.close();
  if (child.exitCode === null) child.kill();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}
