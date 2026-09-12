const CACHE_PREFIX = "trace-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const scopeUrl = new URL(self.registration.scope);
const shellUrl = new URL("./", scopeUrl).href;
const indexUrl = new URL("./index.html", scopeUrl).href;
const offlineShellUrl = new URL("./__trace_offline_shell__", scopeUrl).href;
const shellAssets = [
  shellUrl,
  indexUrl,
  new URL("./manifest.json", scopeUrl).href,
  new URL("./trace-icon-192.png", scopeUrl).href,
  new URL("./trace-icon-512.png", scopeUrl).href,
  new URL("./trace-apple-touch-icon.png", scopeUrl).href,
];

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(shellAssets);
  const indexResponse = await fetch(indexUrl, { cache: "no-cache" });
  if (!indexResponse.ok) throw new Error("Trace application shell was unavailable.");
  await cache.put(indexUrl, indexResponse.clone());
  await cache.put(offlineShellUrl, indexResponse.clone());
  const html = await indexResponse.text();
  const buildAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], indexUrl))
    .filter((url) => url.origin === scopeUrl.origin && url.pathname.includes("/static/"))
    .map((url) => url.href);
  // Imported recordings and endpoint images are absent from index.html. Cache
  // those clips and their endpoint art before activating so the first capsule
  // also works offline. Other theme art keeps its existing runtime caching.
  const manifestResponse = await fetch(new URL("./asset-manifest.json", scopeUrl).href, { cache: "no-cache" });
  if (!manifestResponse.ok) throw new Error("Trace asset manifest was unavailable.");
  const manifest = await manifestResponse.json();
  const importedAssets = Object.entries(manifest.files || {})
    .filter(([name, asset]) => typeof asset === "string" && (
      /\.(?:js|css)$/.test(name)
      || /(?:^|\/)(?:ceremony-(?:open|close)\.mp4|vault-(?:opened|sealed)\.png|recording-credits\.txt)$/.test(name)
    ))
    .map(([, asset]) => new URL(asset, indexUrl))
    .filter((url) => url.origin === scopeUrl.origin
      && url.pathname.includes("/static/")
      && !url.pathname.endsWith(".map"))
    .map((url) => url.href);
  await cache.addAll([...new Set([...buildAssets, ...importedAssets])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (!response || !response.ok) throw new Error("Trace navigation was unavailable.");
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([
      cache.put(indexUrl, response.clone()),
      cache.put(offlineShellUrl, response.clone()),
    ]);
    return response;
  } catch (error) {
    const cachedShell = (await caches.match(offlineShellUrl))
      || (await caches.match(indexUrl, { ignoreSearch: true }))
      || (await caches.match(shellUrl, { ignoreSearch: true }));
    if (cachedShell) return cachedShell;
    throw error;
  }
}

async function cachedRangeResponse(request, cached) {
  const range = request.headers.get("range");
  if (!range || cached.status !== 200) return cached;
  const ifRange = request.headers.get("if-range");
  if (ifRange && ifRange !== cached.headers.get("etag")
    && ifRange !== cached.headers.get("last-modified")) return cached;

  // Safari requests byte ranges even for short, completely cached MP4 files.
  // Unsupported/malformed range formats can safely receive the full response.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return cached;
  const bytes = await cached.arrayBuffer();
  const length = bytes.byteLength;
  const suffixLength = match[1] ? null : Number(match[2]);
  const start = match[1] ? Number(match[1]) : Math.max(0, length - suffixLength);
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  const headers = new Headers(cached.headers);
  headers.set("Accept-Ranges", "bytes");
  // The fetched body has already been decoded; the new body is a byte slice.
  headers.delete("Content-Encoding");
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || start >= length || start > end || suffixLength === 0) {
    headers.set("Content-Range", `bytes */${length}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, statusText: "Range Not Satisfiable", headers });
  }
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(bytes.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cachedRangeResponse(request, cached);
  const response = await fetch(request);
  // CacheStorage rejects partial responses. A network range response must also
  // never replace the complete recording used by later offline requests.
  if (response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.put(request, response.clone()); } catch (_) { /* Network playback can continue if storage is full. */ }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scopeUrl.origin) return;

  const isBuildAsset = url.pathname.includes("/static/");
  const isKnownShellAsset = shellAssets.includes(url.href);
  // Credits and other build files can be opened in a tab. Never replace the
  // offline application shell with a recording, image, or attribution file.
  if (isBuildAsset) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isKnownShellAsset) {
    event.respondWith(cacheFirstStatic(request));
  }
});
