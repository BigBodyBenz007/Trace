export const HEALTH_MEASUREMENT_SCHEMA_VERSION = 1;
export const HEALTH_MEASUREMENT_STORAGE_KEY = "healthMeasurementEntries";

export const HEALTH_MEASUREMENT_FIELDS = Object.freeze([
  { key: "weight", label: "Weight", units: ["lb", "kg"] },
  { key: "bodyFat", label: "Body Fat", units: ["%"], max: 100 },
  { key: "waist", label: "Waist", units: ["in", "cm"] },
  { key: "chest", label: "Chest", units: ["in", "cm"] },
  { key: "leftArm", label: "Left Arm", units: ["in", "cm"] },
  { key: "rightArm", label: "Right Arm", units: ["in", "cm"] },
  { key: "leftThigh", label: "Left Thigh", units: ["in", "cm"] },
  { key: "rightThigh", label: "Right Thigh", units: ["in", "cm"] },
  { key: "leftCalf", label: "Left Calf", units: ["in", "cm"] },
  { key: "rightCalf", label: "Right Calf", units: ["in", "cm"] },
  { key: "neck", label: "Neck", units: ["in", "cm"] },
]);

function validateHeight(height) {
  if (!height) return {};
  if (height.unit === "ft-in") {
    const feetRaw = String(height.feet ?? "").trim();
    const inchesRaw = String(height.inches ?? "").trim();
    if (!feetRaw && !inchesRaw) return {};
    const feet = Number(feetRaw);
    const inches = Number(inchesRaw || 0);
    if (!Number.isInteger(feet) || feet < 0 || !Number.isFinite(inches) || inches < 0 || inches >= 12 || feet * 12 + inches <= 0) return { error: "Enter a valid height with inches from 0 to less than 12." };
    return { value: { unit: "ft-in", feet, inches } };
  }
  if (height.unit === "cm") {
    const raw = String(height.centimeters ?? "").trim();
    if (!raw) return {};
    const centimeters = Number(raw);
    if (!Number.isFinite(centimeters) || centimeters <= 0) return { error: "Enter a valid height greater than 0." };
    return { value: { unit: "cm", value: centimeters } };
  }
  return { error: "Select a valid height unit." };
}

function localTimestamp(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day || value.getHours() !== hour || value.getMinutes() !== minute) return null;
  return value.toISOString();
}

export function validateHealthMeasurementDraft(draft) {
  const occurredAt = localTimestamp(draft?.date, draft?.time);
  if (!occurredAt) return { error: "Enter a valid date and time." };
  const measurements = {};
  const height = validateHeight(draft?.height);
  if (height.error) return height;
  if (height.value) measurements.height = height.value;
  for (const field of HEALTH_MEASUREMENT_FIELDS) {
    const raw = String(draft?.measurements?.[field.key]?.value ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || (field.max && value > field.max)) {
      return { error: `Enter a valid ${field.label.toLowerCase()} value${field.max ? ` between 0 and ${field.max}` : " greater than 0"}.` };
    }
    const unit = draft?.measurements?.[field.key]?.unit || field.units[0];
    if (!field.units.includes(unit)) return { error: `Select a valid unit for ${field.label.toLowerCase()}.` };
    measurements[field.key] = { value, unit };
  }
  if (Object.keys(measurements).length === 0) return { error: "Enter at least one body measurement." };
  return { value: { occurredAt, measurements, notes: String(draft?.notes || "").trim() } };
}

export function createHealthMeasurementEntry(draft, { id, now = () => new Date() } = {}) {
  const validation = validateHealthMeasurementDraft(draft);
  if (validation.error) return validation;
  return { value: { id, schemaVersion: HEALTH_MEASUREMENT_SCHEMA_VERSION, createdAt: now().toISOString(), ...validation.value } };
}

export function updateHealthMeasurementEntry(existing, draft) {
  const validation = validateHealthMeasurementDraft(draft);
  if (validation.error) return validation;
  return { value: { ...existing, schemaVersion: HEALTH_MEASUREMENT_SCHEMA_VERSION, ...validation.value, id: existing.id, createdAt: existing.createdAt } };
}

export function readHealthMeasurementEntries(storage = localStorage) {
  const raw = storage.getItem(HEALTH_MEASUREMENT_STORAGE_KEY);
  if (!raw) return [];
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error("Invalid Health measurement data.");
  return entries;
}

export function writeHealthMeasurementEntries(storage, entries) {
  storage.setItem(HEALTH_MEASUREMENT_STORAGE_KEY, JSON.stringify(entries));
}
