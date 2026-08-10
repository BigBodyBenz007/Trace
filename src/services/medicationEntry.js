import {
  DOSE_UNIT_OPTIONS,
  ROUTE_OPTIONS,
} from "../constants/medicationOptions";

const DOSE_UNITS = new Set(DOSE_UNIT_OPTIONS.map(({ value }) => value));
const ROUTES = new Set(ROUTE_OPTIONS.map(({ value }) => value));

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

export function localDateTimeToIso(date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(time || ""));

  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes);

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hours ||
    localDate.getMinutes() !== minutes
  ) {
    return null;
  }

  return localDate.toISOString();
}

export function getMedicationEntryError(draft) {
  if (!meaningfulText(draft?.name)) return "Enter a medication or compound name.";

  const amount = Number(draft?.doseAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter a dose amount greater than zero.";
  }

  if (!DOSE_UNITS.has(draft?.doseUnit)) return "Choose a valid dose unit.";
  if (draft.doseUnit === "custom" && !meaningfulText(draft.customDoseUnit)) {
    return "Enter a meaningful custom dose unit.";
  }

  if (!ROUTES.has(draft?.route)) return "Choose a valid method or route.";
  if (draft.route === "other" && !meaningfulText(draft.customRoute)) {
    return "Enter a meaningful custom method or route.";
  }

  if (!localDateTimeToIso(draft?.date, draft?.time)) {
    return "Enter a valid date and time.";
  }

  return "";
}

export function createMedicationEntry(
  draft,
  existingEntry = null,
  now = new Date()
) {
  if (getMedicationEntryError(draft)) return null;

  const timestamp = now.toISOString();

  return {
    schemaVersion: 1,
    name: String(draft.name).trim().replace(/\s+/g, " "),
    dose: {
      amount: Number(draft.doseAmount),
      unit: draft.doseUnit,
      ...(draft.doseUnit === "custom"
        ? {
            customUnit: String(draft.customDoseUnit)
              .trim()
              .replace(/\s+/g, " "),
          }
        : {}),
    },
    route: {
      code: draft.route,
      ...(draft.route === "other"
        ? {
            customLabel: String(draft.customRoute)
              .trim()
              .replace(/\s+/g, " "),
          }
        : {}),
    },
    occurredAt: localDateTimeToIso(draft.date, draft.time),
    notes: String(draft.notes || "").trim(),
    createdAt: existingEntry?.createdAt || timestamp,
    updatedAt: timestamp,
    ...(draft.compoundReference
      ? { compoundReference: { ...draft.compoundReference } }
      : {}),
  };
}

export function formatDoseUnit(dose) {
  if (dose?.unit === "custom") return dose.customUnit || "custom";

  return (
    DOSE_UNIT_OPTIONS.find(({ value }) => value === dose?.unit)?.label ||
    dose?.unit ||
    ""
  );
}

export function formatRoute(route) {
  if (route?.code === "other") return route.customLabel || "Other";

  return (
    ROUTE_OPTIONS.find(({ value }) => value === route?.code)?.label ||
    route?.code ||
    ""
  );
}
