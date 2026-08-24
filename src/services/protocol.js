import { DOSE_UNIT_OPTIONS, ROUTE_OPTIONS } from "../constants/medicationOptions";

export const PROTOCOLS_STORAGE_KEY = "protocols";
export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const DOSE_UNITS = new Set(DOSE_UNIT_OPTIONS.map(({ value }) => value));
const ROUTES = new Set(ROUTE_OPTIONS.map(({ value }) => value));
const STATUSES = new Set(["active", "ended"]);

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

export function createProtocolId(prefix = "protocol") {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

export function isValidLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function normalizeWeekdays(weekdays) {
  if (!Array.isArray(weekdays)) return [];
  return [...new Set(weekdays.map(Number))].sort((first, second) => first - second);
}

export function formatProtocolSchedule(schedule) {
  const weekdays = normalizeWeekdays(schedule?.weekdays);
  if (schedule?.type !== "weekly-days" || weekdays.length === 0) return "No schedule";
  if (weekdays.length === 7 && weekdays.every((day, index) => day === index + 1)) {
    return "Every day";
  }
  const labels = new Map(WEEKDAYS.map(({ value, label }) => [value, label]));
  return weekdays.map((day) => labels.get(day)).filter(Boolean).join(", ");
}

function getItemError(item) {
  if (!meaningfulText(item?.compound?.name)) return "Each protocol item needs a compound name.";
  const amount = Number(item?.dose?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Each protocol item needs a dose greater than zero.";
  if (!DOSE_UNITS.has(item?.dose?.unit)) return "Each protocol item needs a valid dose unit.";
  if (item.dose.unit === "custom" && !meaningfulText(item.dose.customUnit)) {
    return "Enter a meaningful custom dose unit for each custom item.";
  }
  if (!ROUTES.has(item?.route?.code)) return "Each protocol item needs a valid route.";
  if (item.route.code === "other" && !meaningfulText(item.route.customLabel)) {
    return "Enter a meaningful custom route for each custom item.";
  }
  if (item?.schedule?.type !== "weekly-days") return "Each protocol item needs a supported schedule.";
  if (!Array.isArray(item.schedule.weekdays) || item.schedule.weekdays.length === 0) {
    return "Select at least one weekday for each protocol item.";
  }
  const weekdays = item.schedule.weekdays.map(Number);
  if (new Set(weekdays).size !== weekdays.length) return "Protocol weekdays must be unique.";
  if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    return "Protocol weekdays must be valid ISO weekdays from 1 through 7.";
  }
  return "";
}

export function getProtocolError(draft) {
  if (!meaningfulText(draft?.name)) return "Enter a protocol name.";
  if (!isValidLocalDate(draft?.startDate)) return "Enter a valid protocol start date.";
  if (draft?.endDate && !isValidLocalDate(draft.endDate)) return "Enter a valid protocol end date.";
  if (draft?.endDate && draft.endDate < draft.startDate) {
    return "Protocol end date cannot be before its start date.";
  }
  if (!STATUSES.has(draft?.status || "active")) return "Choose a valid protocol status.";
  if (!Array.isArray(draft?.items) || draft.items.length === 0) {
    return "Add at least one valid protocol item.";
  }
  const itemIds = draft.items.map(({ id }) => id).filter(Boolean);
  if (new Set(itemIds).size !== itemIds.length) return "Protocol item IDs must be unique.";
  for (const item of draft.items) {
    const error = getItemError(item);
    if (error) return error;
  }
  return "";
}

function snapshotItem(item) {
  const weekdays = normalizeWeekdays(item.schedule.weekdays);
  return {
    id: item.id || createProtocolId("protocol-item"),
    compound: {
      name: String(item.compound.name).trim().replace(/\s+/g, " "),
      ...(item.compound.reference
        ? { reference: { ...item.compound.reference } }
        : {}),
    },
    dose: {
      amount: Number(item.dose.amount),
      unit: item.dose.unit,
      ...(item.dose.unit === "custom"
        ? { customUnit: String(item.dose.customUnit).trim().replace(/\s+/g, " ") }
        : {}),
    },
    route: {
      code: item.route.code,
      ...(item.route.code === "other"
        ? { customLabel: String(item.route.customLabel).trim().replace(/\s+/g, " ") }
        : {}),
    },
    schedule: { type: "weekly-days", weekdays },
    notes: String(item.notes || "").trim(),
  };
}

export function createProtocol(draft, existingProtocol = null, now = new Date()) {
  if (getProtocolError(draft)) return null;
  const timestamp = now.toISOString();
  return {
    id: existingProtocol?.id || draft.id || createProtocolId("protocol"),
    schemaVersion: 1,
    name: String(draft.name).trim().replace(/\s+/g, " "),
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    status: existingProtocol?.status || draft.status || "active",
    notes: String(draft.notes || "").trim(),
    items: draft.items.map(snapshotItem),
    createdAt: existingProtocol?.createdAt || timestamp,
    updatedAt: timestamp,
    endedAt: existingProtocol?.endedAt || null,
  };
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function protocolItemsScheduledForDate(protocols, date = new Date()) {
  if (!Array.isArray(protocols) || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return [];
  }

  const dateKey = localDateKey(date);
  const isoWeekday = date.getDay() || 7;

  return protocols.flatMap((protocol) => {
    if (
      protocol?.status !== "active" ||
      !isValidLocalDate(protocol.startDate) ||
      protocol.startDate > dateKey ||
      (protocol.endDate &&
        (!isValidLocalDate(protocol.endDate) || protocol.endDate < dateKey)) ||
      !Array.isArray(protocol.items)
    ) {
      return [];
    }

    return protocol.items
      .filter(
        (item) =>
          item?.schedule?.type === "weekly-days" &&
          normalizeWeekdays(item.schedule.weekdays).includes(isoWeekday)
      )
      .map((item) => ({ protocol, item }));
  });
}

export function endProtocol(protocol, now = new Date()) {
  if (!protocol || protocol.status !== "active") return null;
  const timestamp = now.toISOString();
  const actionDate = localDateKey(now);
  return {
    ...protocol,
    status: "ended",
    // An upcoming plan cannot end before its own calendar start boundary.
    endDate: actionDate < protocol.startDate ? protocol.startDate : actionDate,
    endedAt: timestamp,
    updatedAt: timestamp,
    items: protocol.items.map((item) => ({
      ...item,
      compound: {
        ...item.compound,
        ...(item.compound.reference
          ? { reference: { ...item.compound.reference } }
          : {}),
      },
      dose: { ...item.dose },
      route: { ...item.route },
      schedule: { ...item.schedule, weekdays: [...item.schedule.weekdays] },
    })),
  };
}

export function readProtocols(storage) {
  const saved = storage.getItem(PROTOCOLS_STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) throw new Error("Invalid protocol data.");
  return parsed;
}

export function writeProtocols(storage, protocols) {
  storage.setItem(PROTOCOLS_STORAGE_KEY, JSON.stringify(protocols));
}
