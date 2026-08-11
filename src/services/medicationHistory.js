export function normalizeMedicationHistoryQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getMedicationEntryLocalDateKey(entry) {
  const date = new Date(entry.occurredAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function compareMedicationEntriesNewestFirst(firstEntry, secondEntry) {
  const timestampDifference =
    new Date(secondEntry.occurredAt).getTime() - new Date(firstEntry.occurredAt).getTime();
  if (timestampDifference !== 0) return timestampDifference;
  return String(firstEntry.id).localeCompare(String(secondEntry.id));
}

export function getVisibleMedicationHistory(entries, query = "") {
  const normalizedQuery = normalizeMedicationHistoryQuery(query);
  const visibleEntries = entries
    .filter((entry) =>
      normalizeMedicationHistoryQuery(entry.name).includes(normalizedQuery)
    )
    .slice()
    .sort(compareMedicationEntriesNewestFirst);
  const groups = [];

  visibleEntries.forEach((entry) => {
    const dateKey = getMedicationEntryLocalDateKey(entry);
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.dateKey === dateKey) currentGroup.entries.push(entry);
    else groups.push({ dateKey, entries: [entry] });
  });

  return groups;
}

export function formatMedicationHistoryDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
