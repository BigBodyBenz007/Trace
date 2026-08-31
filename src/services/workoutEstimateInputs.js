import { parseDateOnlyLocal } from "./dateOnly";

const POUNDS_TO_KILOGRAMS = 0.45359237;

function validDateTime(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  const dateOnly = parseDateOnlyLocal(value);
  if (dateOnly) return dateOnly;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function deriveAgeOnDate(dateOfBirth, workoutDateTime) {
  const birthDate = parseDateOnlyLocal(dateOfBirth);
  const workoutDate = validDateTime(workoutDateTime);
  if (!birthDate || !workoutDate || workoutDate < birthDate) return null;

  let age = workoutDate.getFullYear() - birthDate.getFullYear();
  const birthdayHasOccurred = workoutDate.getMonth() > birthDate.getMonth()
    || (
      workoutDate.getMonth() === birthDate.getMonth()
      && workoutDate.getDate() >= birthDate.getDate()
    );
  if (!birthdayHasOccurred) age -= 1;
  return age;
}

export function resolveHistoricalBodyWeight(entries, workoutDateTime) {
  const workoutDate = validDateTime(workoutDateTime);
  if (!workoutDate) return null;
  const workoutTime = workoutDate.getTime();

  let selected = null;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const occurredAt = validDateTime(entry?.occurredAt);
    const measurement = entry?.measurements?.weight;
    const value = Number(measurement?.value);
    if (
      !occurredAt
      || occurredAt.getTime() > workoutTime
      || !Number.isFinite(value)
      || value <= 0
      || !["lb", "kg"].includes(measurement?.unit)
    ) continue;

    if (!selected || occurredAt.getTime() > selected.occurredAt) {
      selected = {
        occurredAt: occurredAt.getTime(),
        result: {
          value: measurement.unit === "lb" ? value * POUNDS_TO_KILOGRAMS : value,
          unit: "kg",
          sourceEntryId: entry.id ?? null,
        },
      };
    }
  }

  return selected?.result || null;
}
