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
    expect.objectContaining({ sizes: "192x192", type: "image/png" }),
    expect.objectContaining({ sizes: "512x512", type: "image/png" }),
  ]));
});

test("HTML supplies iPhone standalone and safe-area viewport metadata", () => {
  const html = fs.readFileSync(publicPath("index.html"), "utf8");
  expect(html).toContain("viewport-fit=cover");
  expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
  expect(html).toContain('name="apple-mobile-web-app-title" content="Trace"');
  expect(html).toContain("<title>Trace</title>");
});

test("service worker caches only shell assets and never accesses user storage", () => {
  const worker = fs.readFileSync(publicPath("service-worker.js"), "utf8");
  expect(worker).toContain('url.pathname.includes("/static/")');
  expect(worker).toContain('request.mode === "navigate"');
  expect(worker).toContain("cacheApplicationShell");
  expect(worker).toContain("__trace_offline_shell__");
  expect(worker).toContain("if (!response || !response.ok)");
  expect(worker).not.toMatch(/indexedDB|localStorage|tracePhotoStorage/);
  expect(worker).not.toContain("caches.delete(CACHE_NAME)");
});
