const CACHE_PREFIX = "trace-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
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
  await cache.addAll([...new Set(buildAssets)]);
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

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scopeUrl.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const isBuildAsset = url.pathname.includes("/static/");
  const isKnownShellAsset = shellAssets.includes(url.href);
  if (isBuildAsset || isKnownShellAsset) {
    event.respondWith(cacheFirstStatic(request));
  }
});
