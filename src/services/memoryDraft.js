export const MEMORY_DRAFT_STORAGE_KEY = "memoryDraft";
export const MEMORY_DRAFT_SCHEMA_VERSION = 1;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validId(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizePhoto(value) {
  if (!object(value) || !validId(value.id)) return null;
  const photo = { id: value.id.trim() };
  if (typeof value.name === "string") photo.name = value.name;
  ["originalBytes", "storedBytes", "width", "height"].forEach((field) => {
    if (Number.isFinite(value[field]) && value[field] >= 0) photo[field] = value[field];
  });
  ["optimized", "converted"].forEach((field) => {
    if (typeof value[field] === "boolean") photo[field] = value[field];
  });
  return photo;
}

export function normalizeMemoryDraft(value) {
  if (!object(value) || value.schemaVersion !== MEMORY_DRAFT_SCHEMA_VERSION) return null;
  if (!validId(value.id) || !validId(value.memoryId) || !validDate(value.initialDate)) return null;
  if (!object(value.form)) return null;
  const { title, description, date, categories } = value.form;
  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    (date !== "" && !validDate(date)) ||
    !Array.isArray(categories) ||
    categories.some((category) => typeof category !== "string") ||
    new Set(categories).size !== categories.length ||
    !Array.isArray(value.photos)
  ) return null;
  const photos = value.photos.map(normalizePhoto);
  if (photos.some((photo) => !photo) || new Set(photos.map(({ id }) => id)).size !== photos.length) {
    return null;
  }
  if (
    !value.createdAt || Number.isNaN(Date.parse(value.createdAt)) ||
    !value.updatedAt || Number.isNaN(Date.parse(value.updatedAt))
  ) return null;
  return {
    schemaVersion: MEMORY_DRAFT_SCHEMA_VERSION,
    id: value.id.trim(),
    memoryId: value.memoryId.trim(),
    initialDate: value.initialDate,
    form: { title, description, date, categories: [...categories] },
    photos,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createMemoryDraft({
  id,
  memoryId,
  initialDate,
  form,
  photos = [],
  createdAt,
}, now = new Date()) {
  const timestamp = now.toISOString();
  return normalizeMemoryDraft({
    schemaVersion: MEMORY_DRAFT_SCHEMA_VERSION,
    id,
    memoryId,
    initialDate,
    form,
    photos,
    createdAt: createdAt || timestamp,
    updatedAt: timestamp,
  });
}

export function memoryDraftPhoto(value) {
  return normalizePhoto(value);
}

export function memoryDraftHasMeaningfulWork(draft) {
  const normalized = normalizeMemoryDraft(draft);
  if (!normalized) return false;
  return Boolean(
    normalized.form.title.trim() ||
    normalized.form.description.trim() ||
    normalized.form.date !== normalized.initialDate ||
    normalized.form.categories.length ||
    normalized.photos.length
  );
}

export function readMemoryDraft(storage = localStorage) {
  try {
    const raw = storage.getItem(MEMORY_DRAFT_STORAGE_KEY);
    return raw === null ? null : normalizeMemoryDraft(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

export function writeMemoryDraft(storage = localStorage, draft) {
  const normalized = normalizeMemoryDraft(draft);
  if (!normalized) throw new Error("The unfinished Memory draft is invalid.");
  storage.setItem(MEMORY_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearMemoryDraft(storage = localStorage) {
  storage.removeItem(MEMORY_DRAFT_STORAGE_KEY);
}
