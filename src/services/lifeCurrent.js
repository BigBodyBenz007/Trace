export const LIFE_CURRENT_TUNING = Object.freeze({
  memory: Object.freeze({ first: 1, additional: 0.25, dailyCap: 1.5 }),
  workout: Object.freeze({ first: 0.65, additional: 0.15, dailyCap: 0.8 }),
  nutrition: Object.freeze({ dailyPresence: 0.3 }),
  health: Object.freeze({ dailyPresence: 0.3 }),
  medication: Object.freeze({ dailyPresence: 0.3 }),
  trophy: Object.freeze({ each: 0.2, dailyCap: 0.4 }),
  intensitySaturation: 2,
});

const DOMAIN_KEYS = ["memory", "workout", "nutrition", "health", "medication", "trophy"];

function compareText(first, second) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function validLocalDateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { dateKey: `${match[1]}-${match[2]}-${match[3]}`, year, month, day };
}

function localPartsFromTimestamp(value) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year,
    month,
    day,
  };
}

function stableSourceId(domain, entry, dateKey) {
  if (entry?.id !== undefined && entry?.id !== null && String(entry.id)) {
    return String(entry.id);
  }
  const timestamp = entry?.occurredAt || entry?.loggedAt || entry?.date || dateKey;
  const label = entry?.title || entry?.name || entry?.type || "entry";
  return `legacy:${domain}:${String(timestamp)}:${String(label)}`;
}

function createWorkingBucket(parts) {
  return {
    ...parts,
    sources: Object.fromEntries(DOMAIN_KEYS.map((domain) => [domain, new Set()])),
  };
}

function addSource(dayMap, parts, domain, sourceId) {
  let bucket = dayMap.get(parts.dateKey);
  if (!bucket) {
    bucket = createWorkingBucket(parts);
    dayMap.set(parts.dateKey, bucket);
  }
  bucket.sources[domain].add(sourceId);
}

function cappedProgression(count, { first, additional, dailyCap }) {
  if (count <= 0) return 0;
  return Math.min(dailyCap, first + Math.max(0, count - 1) * additional);
}

function calculateContributions(sources) {
  const counts = Object.fromEntries(
    DOMAIN_KEYS.map((domain) => [domain, sources[domain].size])
  );
  return {
    memory: cappedProgression(counts.memory, LIFE_CURRENT_TUNING.memory),
    workout: cappedProgression(counts.workout, LIFE_CURRENT_TUNING.workout),
    nutrition: counts.nutrition > 0 ? LIFE_CURRENT_TUNING.nutrition.dailyPresence : 0,
    health: counts.health > 0 ? LIFE_CURRENT_TUNING.health.dailyPresence : 0,
    medication: counts.medication > 0 ? LIFE_CURRENT_TUNING.medication.dailyPresence : 0,
    trophy: Math.min(
      LIFE_CURRENT_TUNING.trophy.dailyCap,
      counts.trophy * LIFE_CURRENT_TUNING.trophy.each
    ),
  };
}

function calculateIntensity(rawActivity) {
  if (!Number.isFinite(rawActivity) || rawActivity <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, 1 - Math.exp(-rawActivity / LIFE_CURRENT_TUNING.intensitySaturation))
  );
}

function finalizeDay(bucket) {
  const values = calculateContributions(bucket.sources);
  const rawActivity = DOMAIN_KEYS.reduce((sum, domain) => sum + values[domain], 0);
  return {
    dateKey: bucket.dateKey,
    year: bucket.year,
    month: bucket.month,
    day: bucket.day,
    datePrecision: "day",
    contributions: Object.fromEntries(
      DOMAIN_KEYS.map((domain) => [
        domain,
        {
          count: bucket.sources[domain].size,
          value: values[domain],
          sourceIds: [...bucket.sources[domain]].sort(compareText),
        },
      ])
    ),
    rawActivity,
    intensity: calculateIntensity(rawActivity),
  };
}

function emptyAggregateContributions() {
  return Object.fromEntries(
    DOMAIN_KEYS.map((domain) => [domain, { eventCount: 0, activeDays: 0, value: 0 }])
  );
}

function addDayToAggregate(aggregate, day) {
  aggregate.populatedDayCount += 1;
  aggregate.totalRawActivity += day.rawActivity;
  aggregate.totalIntensity += day.intensity;
  aggregate.peakIntensity = Math.max(aggregate.peakIntensity, day.intensity);
  DOMAIN_KEYS.forEach((domain) => {
    const contribution = day.contributions[domain];
    aggregate.contributions[domain].eventCount += contribution.count;
    aggregate.contributions[domain].value += contribution.value;
    if (contribution.count > 0) aggregate.contributions[domain].activeDays += 1;
  });
}

function finalizeAggregate(aggregate) {
  const { totalIntensity, ...result } = aggregate;
  return {
    ...result,
    averageRawActivity: result.populatedDayCount
      ? result.totalRawActivity / result.populatedDayCount
      : 0,
    averageIntensity: result.populatedDayCount
      ? totalIntensity / result.populatedDayCount
      : 0,
  };
}

function aggregateMonths(days) {
  const monthMap = new Map();
  days.forEach((day) => {
    const monthKey = `${day.year}-${String(day.month).padStart(2, "0")}`;
    let month = monthMap.get(monthKey);
    if (!month) {
      month = {
        monthKey,
        year: day.year,
        month: day.month,
        populatedDayCount: 0,
        totalRawActivity: 0,
        totalIntensity: 0,
        peakIntensity: 0,
        contributions: emptyAggregateContributions(),
      };
      monthMap.set(monthKey, month);
    }
    addDayToAggregate(month, day);
  });
  return [...monthMap.values()].map(finalizeAggregate);
}

function aggregateYears(days, months) {
  const yearMap = new Map();
  days.forEach((day) => {
    let year = yearMap.get(day.year);
    if (!year) {
      year = {
        year: day.year,
        populatedMonthCount: 0,
        populatedDayCount: 0,
        totalRawActivity: 0,
        totalIntensity: 0,
        peakIntensity: 0,
        contributions: emptyAggregateContributions(),
      };
      yearMap.set(day.year, year);
    }
    addDayToAggregate(year, day);
  });
  months.forEach((month) => {
    yearMap.get(month.year).populatedMonthCount += 1;
  });
  return [...yearMap.values()].map(finalizeAggregate);
}

function trophyDateParts(trophy, memoryById, workoutById) {
  const snapshot = trophy?.sourceSnapshot || {};
  if (trophy?.sourceType === "memory") {
    const memoryId = trophy.sourceId || snapshot.memoryId;
    const memory = memoryById.get(String(memoryId));
    return (
      validLocalDateParts(memory?.date) ||
      validLocalDateParts(snapshot.date) ||
      localPartsFromTimestamp(trophy.achievedAt)
    );
  }
  if (trophy?.sourceType === "workout-pr") {
    const workoutId = trophy.sourceId || snapshot.workoutId;
    const workout = workoutById.get(String(workoutId));
    return (
      localPartsFromTimestamp(workout?.occurredAt) ||
      localPartsFromTimestamp(snapshot.performedAt) ||
      localPartsFromTimestamp(trophy.achievedAt)
    );
  }
  return null;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

export function deriveLifeCurrent({
  memories = [],
  nutritionEntries = [],
  healthMeasurementEntries = [],
  workoutEntries = [],
  medicationEntries = [],
  trophyCaseEntries = [],
} = {}) {
  const sources = {
    memories: arrayOrEmpty(memories),
    nutritionEntries: arrayOrEmpty(nutritionEntries),
    healthMeasurementEntries: arrayOrEmpty(healthMeasurementEntries),
    workoutEntries: arrayOrEmpty(workoutEntries),
    medicationEntries: arrayOrEmpty(medicationEntries),
    trophyCaseEntries: arrayOrEmpty(trophyCaseEntries),
  };
  const dayMap = new Map();
  const unbucketed = { memories: [], trophies: [] };

  sources.memories.forEach((memory) => {
    const parts = validLocalDateParts(memory?.date);
    const sourceId = stableSourceId("memory", memory, parts?.dateKey || "undated");
    if (!parts) {
      unbucketed.memories.push({ sourceId, reason: memory?.date ? "invalid-date" : "missing-date" });
      return;
    }
    addSource(dayMap, parts, "memory", sourceId);
  });

  const timestampDomains = [
    ["workout", sources.workoutEntries, "occurredAt"],
    ["nutrition", sources.nutritionEntries, "loggedAt"],
    ["health", sources.healthMeasurementEntries, "occurredAt"],
    ["medication", sources.medicationEntries, "occurredAt"],
  ];
  timestampDomains.forEach(([domain, entries, timestampField]) => {
    entries.forEach((entry) => {
      const parts = localPartsFromTimestamp(entry?.[timestampField]);
      if (!parts) return;
      addSource(dayMap, parts, domain, stableSourceId(domain, entry, parts.dateKey));
    });
  });

  const memoryById = new Map(
    sources.memories.filter(({ id }) => id !== undefined && id !== null).map((item) => [String(item.id), item])
  );
  const workoutById = new Map(
    sources.workoutEntries.filter(({ id }) => id !== undefined && id !== null).map((item) => [String(item.id), item])
  );
  const seenTrophySources = new Set();
  sources.trophyCaseEntries.forEach((trophy) => {
    const sourceIdentity = trophy?.sourceKey || (trophy?.id ? `legacy-trophy:${trophy.id}` : null);
    if (!sourceIdentity || seenTrophySources.has(sourceIdentity)) return;
    seenTrophySources.add(sourceIdentity);
    const parts = trophyDateParts(trophy, memoryById, workoutById);
    if (!parts) {
      unbucketed.trophies.push({ sourceId: String(trophy?.id || sourceIdentity), reason: "unresolved-date" });
      return;
    }
    addSource(dayMap, parts, "trophy", String(sourceIdentity));
  });

  unbucketed.memories.sort((first, second) => compareText(first.sourceId, second.sourceId));
  unbucketed.trophies.sort((first, second) => compareText(first.sourceId, second.sourceId));
  const days = [...dayMap.values()]
    .sort((first, second) => compareText(first.dateKey, second.dateKey))
    .map(finalizeDay);
  const months = aggregateMonths(days);
  const years = aggregateYears(days, months);

  return {
    days,
    months,
    years,
    bounds: {
      earliestDateKey: days[0]?.dateKey || null,
      latestDateKey: days[days.length - 1]?.dateKey || null,
    },
    unbucketed,
  };
}
