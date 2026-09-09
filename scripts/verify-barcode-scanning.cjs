/* Run after npm run build. Install Playwright locally in .tmp-browser first.
 * All fixtures, browser downloads, and output stay inside this workspace.
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const webpack = require("webpack");
const root = path.resolve(__dirname, "..");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tmp-browser/browsers");
const { chromium, webkit } = require(path.join(root, ".tmp-browser/node_modules/playwright"));
const fixture = require("../src/services/__fixtures__/barcode.json");
const output = path.join(root, "artifacts/barcode-photo-20260908");
const harness = path.join(root, ".tmp-browser/barcode-validation");
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(harness, { recursive: true });

async function bundleHarness() {
  fs.writeFileSync(path.join(harness, "entry.js"), `
    import { decodeBarcodePhoto } from ${JSON.stringify(path.join(root, "src/services/barcodePhoto.js"))};
    window.decodeBarcodePhoto = decodeBarcodePhoto;
  `);
  await new Promise((resolve, reject) => webpack({
    mode: "development", entry: path.join(harness, "entry.js"), devtool: false,
    output: { path: harness, filename: "harness.js", publicPath: "/harness/", uniqueName: "traceBarcodeValidation" },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString())) : resolve()));
}

function makeFixture({ bars, variant }) {
  const source = document.createElement("canvas");
  source.width = 900;
  source.height = 600;
  const ctx = source.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 900, 600);
  if (variant === "blank") return source.toDataURL("image/png");
  ctx.translate(450, 300);
  if (variant === "rotated") ctx.rotate(Math.PI / 2);
  if (variant === "angled") ctx.rotate(Math.PI / 12);
  if (variant === "blurred") ctx.filter = "blur(0.7px)";
  const scale = variant === "small" ? 1.5 : 4;
  ctx.fillStyle = variant === "contrast" ? "#989898" : "black";
  for (let i = 0; i < bars.length; i += 1) {
    if (bars[i] === "1") ctx.fillRect((i - bars.length / 2) * scale, -65, scale, 130);
  }
  if (variant === "glare") {
    ctx.fillStyle = "white";
    ctx.fillRect(-210, -20, 420, 30);
  }
  return source.toDataURL("image/png");
}

function remoteResult() {
  const nutrients = { calories: 30, protein: 3, carbohydrates: 6, fat: 0, fiber: null, sodium: 15, totalSugar: 2.4, addedSugar: null };
  return { status: "found", identifier: { scheme: "gtin", value: fixture.value }, food: {
    sourceType: "remote-barcode", dataType: "branded", identifiers: [{ scheme: "gtin", value: fixture.value }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Browser Fixture", name: "Example Yogurt", packageQuantity: "30 g cup",
    serving: { description: "1 cup (30 g)", amount: 30, unit: "g", grams: 30 }, servingsPerContainer: 1,
    nutrients, dataBasis: "serving", nutritionBasis: {
      kind: "provider-serving", source: "labelNutrients", sourceBasis: "serving",
      sourceQuantity: { amount: 1, unit: "serving", dimension: null },
      servingQuantity: { amount: 30, unit: "g", dimension: "mass" }, conversionFactor: null, sourceNutrients: nutrients,
    }, completeness: "partial", unknownFields: ["nutrients.fiber", "nutrients.addedSugar", "provenance.revisionDate"], logReady: true,
    provenance: { sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/123/nutrients", provider: "usda-fdc",
      providerRecordId: "123", attribution: "USDA FoodData Central", revisionDate: null, retrievedAt: "2026-09-08T12:00:00.000Z" },
  } };
}

// Insert a minimal EXIF orientation tag into a JPEG (rotate 90 degrees clockwise).
function exifJpeg(jpeg) {
  const exif = Buffer.from("45786966000049492a0008000000010012010300010000000600000000000000", "hex");
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xffe1);
  marker.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, exif, jpeg.subarray(2)]);
}

async function verify(browserType, label, viewport) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  const lookups = [];
  currentLookups = lookups;
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(base) && !request.url().startsWith("blob:") && !request.url().startsWith("data:")) external.push(request.url());
  });
  await page.addInitScript(() => {
    window.cameraRequests = [];
    window.stoppedTracks = 0;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      enumerateDevices: async () => [],
      getUserMedia: async (constraints) => {
        window.cameraRequests.push(constraints);
        if (window.denyCamera) throw new DOMException("Denied", "NotAllowedError");
        const canvas = document.createElement("canvas");
        if (!canvas.captureStream) throw new DOMException("Simulated camera unavailable", "NotFoundError");
        canvas.width = 900;
        canvas.height = 600;
        const ctx = canvas.getContext("2d");
        const timer = setInterval(() => {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, 900, 600);
          if (window.liveBarcode) ctx.drawImage(window.liveBarcode, 0, 0, 900, 600);
        }, 100);
        const stream = canvas.captureStream(10);
        stream.getTracks().forEach((track) => {
          const stop = track.stop.bind(track);
          track.stop = () => { window.stoppedTracks += 1; clearInterval(timer); stop(); };
        });
        return stream;
      },
    } });
  });
  const results = { label, viewport, photos: [] };
  try {
    await page.goto(base);
    const simulatedCamera = await page.evaluate(() => typeof HTMLCanvasElement.prototype.captureStream === "function");
    results.liveCamera = simulatedCamera ? "simulated stream" : "unavailable: Windows WebKit has no canvas.captureStream";
    await page.addScriptTag({ url: `${base}/harness/harness.js` });
    const photos = {};
    for (const variant of ["normal", "rotated", "angled", "small", "blurred", "contrast", "glare", "blank"]) {
      photos[variant] = await page.evaluate(makeFixture, { bars: fixture.bars, variant });
    }
    const jpeg = await page.evaluate(async (url) => {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg");
    }, photos.normal);
    photos.exif = `data:image/jpeg;base64,${exifJpeg(Buffer.from(jpeg.split(",")[1], "base64")).toString("base64")}`;
    for (const [variant, url] of Object.entries(photos)) {
      const decoded = await page.evaluate(async ({ url, variant }) => {
        const blob = await (await fetch(url)).blob();
        const start = performance.now();
        const result = await window.decodeBarcodePhoto(new File([blob], `${variant}.jpg`, { type: blob.type }));
        return { ...result, ms: Math.round(performance.now() - start) };
      }, { url, variant });
      assert.equal(decoded.status, variant === "blank" ? "not-found" : "found", `${label}: ${variant}: ${JSON.stringify(decoded)}`);
      if (variant !== "blank") assert.equal(decoded.value, fixture.value);
      results.photos.push({ variant, ...decoded });
    }
    console.log(`${label}: all photo fixtures decoded as expected`);
    await page.getByRole("button", { name: "Nutrition", exact: true }).click();
    await page.getByRole("button", { name: "Scan Barcode", exact: true }).click();
    if (simulatedCamera) await page.getByRole("status").filter({ hasText: "Camera active" }).waitFor();
    else await page.getByRole("alert").filter({ hasText: "camera could not be opened" }).waitFor();
    const photoButton = page.getByRole("button", { name: "Scan from Photo", exact: true });
    if (simulatedCamera) assert.equal(await page.getByRole("alert").count(), 0, "Blank live frames do not report decoder errors");
    const bounds = await photoButton.boundingBox();
    assert(bounds && bounds.y + bounds.height <= viewport.height && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, "Photo action visible without scrolling");
    await page.screenshot({ path: path.join(output, `${label}-${simulatedCamera ? "live" : "camera-unavailable"}.png`) });
    if (simulatedCamera) {
      await page.getByRole("button", { name: "Use Front Camera", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Camera active" }).waitFor();
      assert.equal(await page.evaluate(() => window.cameraRequests.at(-1).video.facingMode.ideal), "user");
    }
    const picker = page.waitForEvent("filechooser");
    await photoButton.click();
    await picker;
    const input = page.getByLabel("Barcode photo", { exact: true });
    const file = (variant) => ({ name: `${variant}.png`, mimeType: "image/png", buffer: Buffer.from(photos[variant].split(",")[1], "base64") });
    await input.setInputFiles(file("blank"));
    await page.getByRole("alert").filter({ hasText: "No barcode detected" }).waitFor();
    await page.screenshot({ path: path.join(output, `${label}-no-barcode.png`) });
    await input.setInputFiles(file("blank"));
    await page.getByRole("status").filter({ hasText: "Reading photo" }).waitFor();
    await page.getByRole("alert").filter({ hasText: "No barcode detected" }).waitFor();
    await input.setInputFiles({ name: "broken.heic", mimeType: "image/heic", buffer: Buffer.from("unreadable") });
    await page.getByRole("alert").filter({ hasText: "unreadable or unsupported" }).waitFor();
    await input.setInputFiles(file("blank"));
    await page.getByRole("button", { name: "Cancel Photo Scan", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Photo scan canceled" }).waitFor();
    await input.setInputFiles(file("rotated"));
    await page.getByRole("article", { name: "Barcode product review" }).waitFor();
    assert.deepEqual(lookups, [{ barcode: fixture.value }]);
    assert.equal(await page.evaluate(() => document.querySelector('input[type="file"][aria-label="Barcode photo"]').value), "");
    await page.screenshot({ path: path.join(output, `${label}-photo-review.png`) });
    await page.getByRole("button", { name: "Use This Food", exact: true }).click();
    const calories = page.locator('input[aria-label="Calories"]');
    assert.equal(await calories.inputValue(), "30");
    await page.getByLabel("Number of servings", { exact: true }).fill("2");
    assert.equal(await calories.inputValue(), "60");
    await page.screenshot({ path: path.join(output, `${label}-nutrition.png`) });
    await page.getByRole("button", { name: "Save Entry", exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nutritionEntries")));
    assert.equal(saved[0].calories, 60);
    assert.equal(saved[0].foodReference.dataBasis, "serving");
    if (simulatedCamera) {
      await page.getByRole("button", { name: "Scan Barcode", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Camera active" }).waitFor();
      await page.evaluate(async (url) => { const image = new Image(); image.src = url; await image.decode(); window.liveBarcode = image; }, photos.rotated);
      await page.getByRole("article", { name: "Barcode product review" }).waitFor();
      assert.equal(lookups.length, 1, "Existing cache reused for live result");
      await page.getByRole("button", { name: "Close barcode scanner", exact: true }).click();
    }
    await page.evaluate(() => { window.liveBarcode = null; window.denyCamera = true; });
    await page.getByRole("button", { name: "Scan Barcode", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "permission was denied" }).waitFor();
    await page.screenshot({ path: path.join(output, `${label}-permission.png`) });
    const capturePicker = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Take Photo", exact: true }).click();
    const captureChooser = await capturePicker;
    await captureChooser.setFiles(file("normal"));
    await page.getByRole("article", { name: "Barcode product review" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    results.lookups = lookups;
    results.stoppedTracks = await page.evaluate(() => window.stoppedTracks);
    results.status = "passed";
    console.log(JSON.stringify(results));
    return results;
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${label}-failure.png`) }).catch(() => {});
    console.error(JSON.stringify({ label, lookups, errors, external }));
    console.error(await page.locator("body").innerText());
    throw error;
  } finally {
    await browser.close();
  }
}

let base;
let currentLookups;
async function main() {
  await bundleHarness();
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/nutrition/barcode" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        currentLookups.push(JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(remoteResult()));
      });
      return;
    }
    const folder = pathname.startsWith("/harness/") ? harness : path.join(root, "build");
    let file = path.resolve(folder, `.${pathname.startsWith("/harness/") ? pathname.slice(8) : pathname}`);
    if (!file.startsWith(folder + path.sep) && file !== folder) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "build/index.html");
    const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  try {
    const results = [];
    for (const [name, browser] of [["chromium", chromium], ["webkit", webkit]]) {
      for (const [size, viewport] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 1000 }]]) {
        const label = `${name}-${size}`;
        if (process.argv.length > 2 && !process.argv.slice(2).includes(label)) continue;
        results.push(await verify(browser, label, viewport));
      }
    }
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  } finally {
    server.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
