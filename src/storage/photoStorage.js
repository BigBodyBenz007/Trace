const DATABASE_NAME = "tracePhotoStorage";
const DATABASE_VERSION = 1;
const PHOTO_STORE = "photos";
const MIGRATION_STORE = "migrations";
const LEGACY_MIGRATION_KEY = "legacy-memory-photos";

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction was aborted."));
  });
}

export function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        database.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(MIGRATION_STORE)) {
        database.createObjectStore(MIGRATION_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open photo storage."));
    request.onblocked = () => reject(new Error("Photo storage upgrade is blocked by another Trace tab."));
  });
}

export function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);

  if (!match) throw new Error("A legacy photo has an invalid data URL.");

  const [, type = "application/octet-stream", isBase64, contents] = match;
  const binary = isBase64 ? atob(contents) : decodeURIComponent(contents);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

export function createLegacyMigrationPlan(memories) {
  const photos = [];
  const compactMemories = memories.map((memory) => ({
    ...memory,
    images: (Array.isArray(memory.images) ? memory.images : []).map(
      (image, index) => {
        if (typeof image !== "string" || !image.startsWith("data:")) {
          return image;
        }

        const id = `legacy:${memory.id}:${index}`;
        photos.push({ id, memoryId: memory.id, blob: dataUrlToBlob(image) });
        return id;
      }
    ),
  }));

  return { compactMemories, photos };
}

export async function migrateLegacyPhotos(database, rawMemories, memories) {
  const existingTransaction = database.transaction(MIGRATION_STORE, "readonly");
  const existingMigration = await requestResult(
    existingTransaction.objectStore(MIGRATION_STORE).get(LEGACY_MIGRATION_KEY)
  );

  if (
    existingMigration?.status === "ready" &&
    existingMigration.rawMemories === rawMemories
  ) {
    return existingMigration.compactMemories;
  }

  const plan = createLegacyMigrationPlan(memories);
  if (plan.photos.length === 0) return memories;

  const transaction = database.transaction(
    [PHOTO_STORE, MIGRATION_STORE],
    "readwrite"
  );
  const photoStore = transaction.objectStore(PHOTO_STORE);
  const migrationStore = transaction.objectStore(MIGRATION_STORE);

  migrationStore.put({
    key: LEGACY_MIGRATION_KEY,
    status: "staging",
    rawMemories,
  });
  plan.photos.forEach((photo) => photoStore.put(photo));
  migrationStore.put({
    key: LEGACY_MIGRATION_KEY,
    status: "ready",
    rawMemories,
    compactMemories: plan.compactMemories,
  });

  await transactionComplete(transaction);
  return plan.compactMemories;
}

export async function markLegacyMigrationComplete(database) {
  const readTransaction = database.transaction(MIGRATION_STORE, "readonly");
  const migration = await requestResult(
    readTransaction.objectStore(MIGRATION_STORE).get(LEGACY_MIGRATION_KEY)
  );
  if (!migration) return;

  const writeTransaction = database.transaction(MIGRATION_STORE, "readwrite");
  writeTransaction
    .objectStore(MIGRATION_STORE)
    .put({ ...migration, status: "complete" });
  await transactionComplete(writeTransaction);
}

export async function clearCompletedMigrationBackup(database) {
  const readTransaction = database.transaction(MIGRATION_STORE, "readonly");
  const migration = await requestResult(
    readTransaction.objectStore(MIGRATION_STORE).get(LEGACY_MIGRATION_KEY)
  );
  if (migration?.status !== "complete") return;

  const writeTransaction = database.transaction(MIGRATION_STORE, "readwrite");
  writeTransaction.objectStore(MIGRATION_STORE).delete(LEGACY_MIGRATION_KEY);
  await transactionComplete(writeTransaction);
}

export async function putPhotos(database, photos) {
  if (photos.length === 0) return;
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  const store = transaction.objectStore(PHOTO_STORE);
  photos.forEach((photo) => store.put(photo));
  await transactionComplete(transaction);
}

export async function getPhoto(database, id) {
  const transaction = database.transaction(PHOTO_STORE, "readonly");
  return requestResult(transaction.objectStore(PHOTO_STORE).get(id));
}

export async function getAllPhotos(database) {
  const transaction = database.transaction(PHOTO_STORE, "readonly");
  return requestResult(transaction.objectStore(PHOTO_STORE).getAll());
}

export async function replaceAllPhotos(database, photos) {
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  const store = transaction.objectStore(PHOTO_STORE);
  store.clear();
  photos.forEach((photo) => store.put(photo));
  await transactionComplete(transaction);
}

export async function deletePhotos(database, ids) {
  if (ids.length === 0) return;
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  const store = transaction.objectStore(PHOTO_STORE);
  ids.forEach((id) => store.delete(id));
  await transactionComplete(transaction);
}

export function hasLegacyPhotos(memories) {
  return memories.some((memory) =>
    (Array.isArray(memory.images) ? memory.images : []).some(
      (image) => typeof image === "string" && image.startsWith("data:")
    )
  );
}
