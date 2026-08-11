const RECORD_DESCRIPTORS = {
  "heaviest-weight": {
    label: "Heaviest Weight",
    achievementLabel: "Heaviest Weight Record",
    sourceScope: ({ unit }) => unit,
    trackScope: ({ unit }) => unit,
    formatValue: ({ weight, unit, reps }) =>
      `${weight} ${unit} × ${reps} reps`,
    snapshot: ({ weight, unit, reps }) => ({
      loadMode: "external",
      weight,
      unit,
      reps,
    }),
  },
  "reps-at-weight": {
    label: "Reps at Weight",
    achievementLabel: "Reps-at-Weight Record",
    sourceScope: ({ unit }) => unit,
    trackScope: ({ unit, weight }) => `${unit}|${weight}`,
    formatValue: ({ weight, unit, reps }) =>
      `${weight} ${unit} × ${reps} reps`,
    snapshot: ({ weight, unit, reps }) => ({
      loadMode: "external",
      weight,
      unit,
      reps,
    }),
  },
  "bodyweight-reps": {
    label: "Bodyweight Reps",
    achievementLabel: "Bodyweight Reps Record",
    sourceScope: () => "bodyweight",
    trackScope: () => "bodyweight",
    formatValue: ({ reps }) => `${reps} reps`,
    snapshot: ({ reps }) => ({ loadMode: "bodyweight", reps }),
  },
};

export function getExerciseRecordDescriptor(recordType) {
  return RECORD_DESCRIPTORS[recordType] || null;
}

export function describeExerciseRecord(record, presentationStatus = null) {
  const descriptor = getExerciseRecordDescriptor(record?.recordType);
  const status = presentationStatus ||
    (record?.achievement === "matched" ? "matched" : "new");
  const statusPrefix = {
    current: "Current",
    former: "Former",
    matched: "Matched",
    new: "New",
  }[status] || "New";
  if (!descriptor) {
    return {
      label: "Personal Record",
      value: "Achievement",
      status: `${statusPrefix} Personal Record`,
    };
  }

  return {
    label: descriptor.label,
    value: descriptor.formatValue(record),
    status: `${statusPrefix} ${descriptor.achievementLabel}`,
  };
}

export function snapshotExerciseRecord(record) {
  const descriptor = getExerciseRecordDescriptor(record?.recordType);
  return descriptor?.snapshot ? descriptor.snapshot(record) : {};
}

export function getExerciseRecordSourceScope(record) {
  const descriptor = getExerciseRecordDescriptor(record?.recordType);
  return descriptor?.sourceScope?.(record) || record?.scope || "metric";
}

export function getExerciseRecordTrackKey(record) {
  const descriptor = getExerciseRecordDescriptor(record?.recordType);
  const scope = descriptor?.trackScope?.(record) || record?.trackScope || "metric";
  return `${record?.recordType || "unknown"}|${scope}`;
}
