import fs from "fs";
import path from "path";
import vm from "vm";
import { Headers, Response } from "whatwg-fetch";

function loadWorker({ fetchImplementation, cachedShell, cachedAssets = [] }) {
  const listeners = {};
  const entries = new Map(cachedAssets);
  if (cachedShell) entries.set("https://trace.test/__trace_offline_shell__", cachedShell);
  const cache = {
    addAll: jest.fn(),
    put: jest.fn((key, value) => {
      entries.set(typeof key === "string" ? key : key.url, value);
      return Promise.resolve();
    }),
  };
  const caches = {
    open: jest.fn(() => Promise.resolve(cache)),
    keys: jest.fn(() => Promise.resolve([])),
    delete: jest.fn(() => Promise.resolve(true)),
    match: jest.fn((key) => {
      const response = entries.get(typeof key === "string" ? key : key.url);
      return Promise.resolve(response instanceof Response ? response.clone() : response);
    }),
  };
  const self = {
    registration: { scope: "https://trace.test/" },
    clients: { claim: jest.fn(() => Promise.resolve()) },
    skipWaiting: jest.fn(() => Promise.resolve()),
    addEventListener: jest.fn((type, listener) => { listeners[type] = listener; }),
  };
  const source = fs.readFileSync(path.join(process.cwd(), "public", "service-worker.js"), "utf8");
  const fetch = jest.fn(fetchImplementation);
  vm.runInNewContext(source, { self, caches, fetch, URL, Promise, Error, Headers, Response });
  return { listeners, caches, cache, fetch, self };
}

async function dispatchNavigation(listener) {
  let responsePromise;
  listener({
    request: { method: "GET", mode: "navigate", url: "https://trace.test/timeline?from=home" },
    respondWith(value) { responsePromise = value; },
  });
  return responsePromise;
}

test("offline navigation returns the canonical cached application shell", async () => {
  const cachedShell = { marker: "cached Trace shell" };
  const { listeners, caches } = loadWorker({
    fetchImplementation: () => Promise.reject(new Error("offline")),
    cachedShell,
  });
  await expect(dispatchNavigation(listeners.fetch)).resolves.toBe(cachedShell);
  expect(caches.match).toHaveBeenCalledWith("https://trace.test/__trace_offline_shell__");
});

test("resolved failed navigation responses also use the cached shell", async () => {
  const cachedShell = { marker: "cached Trace shell" };
  const { listeners } = loadWorker({
    fetchImplementation: () => Promise.resolve({ ok: false, status: 503 }),
    cachedShell,
  });
  await expect(dispatchNavigation(listeners.fetch)).resolves.toBe(cachedShell);
});

test("successful navigation refreshes both canonical shell cache keys", async () => {
  const clones = [];
  const response = {
    ok: true,
    clone: jest.fn(() => {
      const clone = { cloneNumber: clones.length + 1 };
      clones.push(clone);
      return clone;
    }),
  };
  const { listeners, cache } = loadWorker({ fetchImplementation: () => Promise.resolve(response) });
  await expect(dispatchNavigation(listeners.fetch)).resolves.toBe(response);
  expect(cache.put).toHaveBeenCalledWith("https://trace.test/index.html", clones[0]);
  expect(cache.put).toHaveBeenCalledWith("https://trace.test/__trace_offline_shell__", clones[1]);
});

function dispatchInstall(listener) {
  let installation;
  listener({ waitUntil(value) { installation = value; } });
  return installation;
}

function dispatchAsset(listener, headers = {}) {
  let response;
  listener({
    request: {
      method: "GET", mode: "cors", url: "https://trace.test/static/media/ceremony-open.hash.mp4",
      headers: new Headers(headers),
    },
    respondWith(value) { response = value; },
  });
  return response;
}

test("installation caches imported capsule clips and endpoint art before activating", async () => {
  const { listeners, cache, fetch, self, caches } = loadWorker({
    fetchImplementation: (url) => Promise.resolve(url.endsWith("asset-manifest.json")
      ? new Response(JSON.stringify({ files: {
        "main.js": "/static/js/main.hash.js",
        "static/js/lazy.hash.chunk.js": "/static/js/lazy.hash.chunk.js",
        "static/media/ceremony-open.mp4": "/static/media/ceremony-open.hash.mp4",
        "static/media/ceremony-close.mp4": "/static/media/ceremony-close.hash.mp4",
        "static/media/vault-opened.png": "/static/media/vault-opened.hash.png",
        "static/media/vault-sealed.png": "/static/media/vault-sealed.hash.png",
        "static/media/recording-credits.txt": "/static/media/recording-credits.hash.txt",
        "static/media/large-theme-art.png": "/static/media/large-theme-art.hash.png",
        "main.js.map": "/static/js/main.hash.js.map",
        "index.html": "/index.html",
        "remote.js": "https://example.com/static/remote.js",
      } }))
      : new Response('<script src="/static/js/main.hash.js"></script><link href="/static/css/main.hash.css" />')),
  });
  await dispatchInstall(listeners.install);
  expect(caches.open).toHaveBeenCalledWith("trace-app-shell-v5");
  expect(fetch).toHaveBeenCalledWith("https://trace.test/asset-manifest.json", { cache: "no-cache" });
  expect(cache.addAll).toHaveBeenLastCalledWith([
    "https://trace.test/static/js/main.hash.js",
    "https://trace.test/static/css/main.hash.css",
    "https://trace.test/static/js/lazy.hash.chunk.js",
    "https://trace.test/static/media/ceremony-open.hash.mp4",
    "https://trace.test/static/media/ceremony-close.hash.mp4",
    "https://trace.test/static/media/vault-opened.hash.png",
    "https://trace.test/static/media/vault-sealed.hash.png",
    "https://trace.test/static/media/recording-credits.hash.txt",
  ]);
  expect(self.skipWaiting).toHaveBeenCalledTimes(1);
});

test("a missing asset manifest prevents an incomplete offline cache from activating", async () => {
  const { listeners, self } = loadWorker({
    fetchImplementation: (url) => Promise.resolve(url.endsWith("asset-manifest.json")
      ? new Response("missing", { status: 404 }) : new Response("<html></html>")),
  });
  await expect(dispatchInstall(listeners.install)).rejects.toThrow("Trace asset manifest was unavailable.");
  expect(self.skipWaiting).not.toHaveBeenCalled();
});

function cachedRecordingWorker() {
  return loadWorker({
    fetchImplementation: () => Promise.reject(new Error("offline")),
    cachedAssets: [["https://trace.test/static/media/ceremony-open.hash.mp4",
      new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer, {
        headers: { "Content-Type": "video/mp4", "Content-Length": "10", ETag: '"clip-hash"' },
      })]],
  });
}

test.each([
  ["bytes=0-1", "bytes 0-1/10", [0, 1]],
  ["bytes=3-6", "bytes 3-6/10", [3, 4, 5, 6]],
  ["bytes=7-", "bytes 7-9/10", [7, 8, 9]],
  ["bytes=-3", "bytes 7-9/10", [7, 8, 9]],
  ["bytes=8-999", "bytes 8-9/10", [8, 9]],
  ["bytes=-99", "bytes 0-9/10", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
])("offline cached recording serves range %s without contacting the network", async (range, contentRange, expectedBytes) => {
  const { listeners, fetch, cache } = cachedRecordingWorker();
  const response = await dispatchAsset(listeners.fetch, { Range: range });
  expect(response.status).toBe(206);
  expect(response.headers.get("Content-Type")).toBe("video/mp4");
  expect(response.headers.get("Accept-Ranges")).toBe("bytes");
  expect(response.headers.get("Content-Range")).toBe(contentRange);
  expect(response.headers.get("Content-Length")).toBe(String(expectedBytes.length));
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(expectedBytes);
  expect(fetch).not.toHaveBeenCalled();
  expect(cache.put).not.toHaveBeenCalled();
});

test.each(["bytes=10-", "bytes=8-4", "bytes=-0", "bytes=999999999999999999-", "bytes=0-999999999999999999"])(
  "offline byte-range request %s is bounded or rejected safely", async (range) => {
    const { listeners } = cachedRecordingWorker();
    const response = await dispatchAsset(listeners.fetch, { Range: range });
    if (range.startsWith("bytes=0-")) {
      expect(response.status).toBe(206);
      expect(response.headers.get("Content-Range")).toBe("bytes 0-9/10");
    } else {
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe("bytes */10");
      expect(response.headers.get("Content-Length")).toBe("0");
    }
  }
);

test.each([{}, { Range: "bytes=-" }, { Range: "bytes=0-1,8-9" }, { Range: "items=0-1" },
  { Range: "bytes=0-1", "If-Range": '"another-clip"' }])(
  "returns the complete cached recording for unsupported or inapplicable ranges %j", async (headers) => {
    const { listeners, fetch } = cachedRecordingWorker();
    const response = await dispatchAsset(listeners.fetch, headers);
    expect(response.status).toBe(200);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(fetch).not.toHaveBeenCalled();
  }
);

test("matching If-Range still receives the requested cached bytes", async () => {
  const { listeners } = cachedRecordingWorker();
  const response = await dispatchAsset(listeners.fetch, { Range: "bytes=0-1", "If-Range": '"clip-hash"' });
  expect(response.status).toBe(206);
});

test("network partial responses play without being stored as complete offline recordings", async () => {
  const partialResponse = new Response(new Uint8Array([0, 1]).buffer, {
    status: 206, headers: { "Content-Range": "bytes 0-1/10", "Content-Type": "video/mp4" },
  });
  const { listeners, cache } = loadWorker({ fetchImplementation: () => Promise.resolve(partialResponse) });
  await expect(dispatchAsset(listeners.fetch, { Range: "bytes=0-1" })).resolves.toBe(partialResponse);
  expect(cache.put).not.toHaveBeenCalled();
});

test("complete network recordings are cached but cache failures do not interrupt playback", async () => {
  const recording = new Response("complete recording", { headers: { "Content-Type": "video/mp4" } });
  const { listeners, cache } = loadWorker({ fetchImplementation: () => Promise.resolve(recording) });
  cache.put.mockRejectedValueOnce(new Error("quota exceeded"));
  await expect(dispatchAsset(listeners.fetch)).resolves.toBe(recording);
  expect(cache.put).toHaveBeenCalledTimes(1);
});

test.each([true, false])("opening sound credits in a tab preserves the offline app shell (cached: %s)", async (alreadyCached) => {
  const creditsUrl = "https://trace.test/static/media/recording-credits.hash.txt";
  const creditsText = "Time Capsule recording attribution";
  const { listeners, cache, caches, fetch } = loadWorker({
    cachedShell: { marker: "Trace app HTML" },
    cachedAssets: alreadyCached ? [[creditsUrl, new Response(creditsText)]] : [],
    fetchImplementation: () => alreadyCached
      ? Promise.reject(new Error("offline")) : Promise.resolve(new Response(creditsText)),
  });
  let response;
  listeners.fetch({
    request: { method: "GET", mode: "navigate", url: creditsUrl, headers: new Headers() },
    respondWith(value) { response = value; },
  });
  expect(await (await response).text()).toBe(creditsText);
  expect(await caches.match("https://trace.test/__trace_offline_shell__")).toEqual({ marker: "Trace app HTML" });
  expect(cache.put).not.toHaveBeenCalledWith("https://trace.test/index.html", expect.anything());
  expect(cache.put).not.toHaveBeenCalledWith("https://trace.test/__trace_offline_shell__", expect.anything());
  if (alreadyCached) expect(fetch).not.toHaveBeenCalled();
});
