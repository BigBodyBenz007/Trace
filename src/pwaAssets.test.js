import fs from "fs";
import path from "path";

const publicPath = (...parts) => path.join(process.cwd(), "public", ...parts);

test("manifest identifies Trace as a standalone installable app", () => {
  const manifest = JSON.parse(fs.readFileSync(publicPath("manifest.json"), "utf8"));
  expect(manifest).toMatchObject({
    name: "Trace",
    short_name: "Trace",
    display: "standalone",
    start_url: ".",
    scope: ".",
    theme_color: "#111827",
    background_color: "#111827",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    { src: "trace-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "trace-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ]));
  expect(manifest.icons).toHaveLength(2);
});

test("HTML supplies iPhone standalone and safe-area viewport metadata", () => {
  const html = fs.readFileSync(publicPath("index.html"), "utf8");
  expect(html).toContain("viewport-fit=cover");
  expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
  expect(html).toContain('name="apple-mobile-web-app-title" content="Trace"');
  expect(html).toContain('<link rel="icon" type="image/png" href="%PUBLIC_URL%/trace-icon-192.png" />');
  expect(html).toContain('<link rel="apple-touch-icon" href="%PUBLIC_URL%/trace-apple-touch-icon.png" />');
  expect(html).not.toMatch(/favicon\.ico|logo192\.png|logo512\.png/);
  expect(html).toContain("<title>Trace</title>");
});

test("HTML applies a fail-safe app theme before React starts", () => {
  const html = fs.readFileSync(publicPath("index.html"), "utf8");
  expect(html).toContain('var fallbackTheme = "modern-heirloom"');
  expect(html).toContain('window.localStorage.getItem("appSettings")');
  expect(html).toContain("settings && settings.themeId");
  expect(html).toContain("settings && settings.lifeCurrentThemeId");
  expect(html).toContain('document.documentElement.setAttribute("data-trace-theme", themeId)');
  expect(html).toContain('"data-trace-shell-theme"');
  expect(html).toContain('meta[name="theme-color"]');
  expect(html.indexOf("data-trace-theme")).toBeLessThan(html.indexOf('<div id="root"></div>'));
});

test("pre-paint theme bootstrap preserves legacy selection and survives malformed storage", () => {
  const html = fs.readFileSync(publicPath("index.html"), "utf8");
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  localStorage.setItem("appSettings", JSON.stringify({ lifeCurrentThemeId: "gnome-village" }));
  window.eval(bootstrap);
  expect(document.documentElement).toHaveAttribute("data-trace-theme", "gnome-village");
  expect(document.documentElement).toHaveAttribute("data-trace-shell-theme", "modern-heirloom");
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#07131f");

  localStorage.setItem("appSettings", "not-json");
  window.eval(bootstrap);
  expect(document.documentElement).toHaveAttribute("data-trace-theme", "modern-heirloom");
  expect(document.documentElement).toHaveAttribute("data-trace-shell-theme", "modern-heirloom");
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#07131f");
  localStorage.clear();
});

test("pre-paint theme bootstrap restores To Kingdoms Ahead without a wrong-theme flash", () => {
  const html = fs.readFileSync(publicPath("index.html"), "utf8");
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  localStorage.setItem("appSettings", JSON.stringify({ themeId: "to-kingdoms-ahead" }));
  window.eval(bootstrap);
  expect(document.documentElement).toHaveAttribute(
    "data-trace-theme",
    "to-kingdoms-ahead"
  );
  expect(document.documentElement).toHaveAttribute(
    "data-trace-shell-theme",
    "to-kingdoms-ahead"
  );
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#171712");
  localStorage.clear();
});

test.each([
  ["trace-icon-192.png", 192],
  ["trace-icon-512.png", 512],
  ["trace-apple-touch-icon.png", 180],
])("supplies the approved square PNG asset %s", (filename, expectedSize) => {
  const image = fs.readFileSync(publicPath(filename));
  expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(image.readUInt32BE(16)).toBe(expectedSize);
  expect(image.readUInt32BE(20)).toBe(expectedSize);
});

test("service worker caches only shell assets and never accesses user storage", () => {
  const worker = fs.readFileSync(publicPath("service-worker.js"), "utf8");
  expect(worker).toContain('url.pathname.includes("/static/")');
  expect(worker).toContain('request.mode === "navigate"');
  expect(worker).toContain("cacheApplicationShell");
  expect(worker).toContain("__trace_offline_shell__");
  expect(worker).toContain("if (!response || !response.ok)");
  expect(worker).toContain('const CACHE_NAME = `${CACHE_PREFIX}v3`');
  expect(worker).toContain('new URL("./trace-icon-192.png", scopeUrl).href');
  expect(worker).toContain('new URL("./trace-icon-512.png", scopeUrl).href');
  expect(worker).toContain('new URL("./trace-apple-touch-icon.png", scopeUrl).href');
  expect(worker).not.toMatch(/favicon\.ico|logo192\.png|logo512\.png/);
  expect(worker).not.toMatch(/indexedDB|localStorage|tracePhotoStorage/);
  expect(worker).not.toContain("caches.delete(CACHE_NAME)");
});
