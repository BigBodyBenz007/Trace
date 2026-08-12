import fs from "fs";
import path from "path";
import vm from "vm";

function loadWorker({ fetchImplementation, cachedShell }) {
  const listeners = {};
  const entries = new Map();
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
    match: jest.fn((key) => Promise.resolve(entries.get(typeof key === "string" ? key : key.url))),
  };
  const self = {
    registration: { scope: "https://trace.test/" },
    clients: { claim: jest.fn(() => Promise.resolve()) },
    skipWaiting: jest.fn(() => Promise.resolve()),
    addEventListener: jest.fn((type, listener) => { listeners[type] = listener; }),
  };
  const source = fs.readFileSync(path.join(process.cwd(), "public", "service-worker.js"), "utf8");
  vm.runInNewContext(source, { self, caches, fetch: jest.fn(fetchImplementation), URL, Promise, Error });
  return { listeners, caches, cache };
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
