import {
  createMedicationEntry,
  formatDoseUnit,
  formatRoute,
  getMedicationEntryError,
  localDateTimeToIso,
} from "./medicationEntry";

const validDraft = {
  name: "Medication A",
  doseAmount: "1.25",
  doseUnit: "mg",
  customDoseUnit: "",
  route: "subcutaneous",
  customRoute: "",
  date: "2026-08-09",
  time: "14:30",
  notes: "  Historical note  ",
};

test("creates a versioned historical snapshot without converting the dose", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");
  const entry = createMedicationEntry(validDraft, null, now);

  expect(entry).toEqual({
    schemaVersion: 1,
    name: "Medication A",
    dose: { amount: 1.25, unit: "mg" },
    route: { code: "subcutaneous" },
    occurredAt: localDateTimeToIso("2026-08-09", "14:30"),
    notes: "Historical note",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
});

test("allows a valid future occurrence timestamp without scheduling behavior", () => {
  const futureDraft = { ...validDraft, date: "2099-12-31", time: "23:59" };

  expect(createMedicationEntry(futureDraft)?.occurredAt).toBe(
    localDateTimeToIso("2099-12-31", "23:59")
  );
});

test("preserves custom unit and route snapshots", () => {
  const entry = createMedicationEntry({
    ...validDraft,
    doseUnit: "custom",
    customDoseUnit: "  sprays  ",
    route: "other",
    customRoute: "  User-entered route  ",
  });

  expect(entry.dose).toEqual({
    amount: 1.25,
    unit: "custom",
    customUnit: "sprays",
  });
  expect(entry.route).toEqual({
    code: "other",
    customLabel: "User-entered route",
  });
  expect(formatDoseUnit(entry.dose)).toBe("sprays");
  expect(formatRoute(entry.route)).toBe("User-entered route");
});

test("requires a trimmed name and a finite positive dose", () => {
  expect(getMedicationEntryError({ ...validDraft, name: "---" })).toBe(
    "Enter a medication or compound name."
  );
  expect(getMedicationEntryError({ ...validDraft, doseAmount: "0" })).toBe(
    "Enter a dose amount greater than zero."
  );
  expect(getMedicationEntryError({ ...validDraft, doseAmount: "invalid" })).toBe(
    "Enter a dose amount greater than zero."
  );
});

test("requires controlled units and routes plus meaningful custom labels", () => {
  expect(getMedicationEntryError({ ...validDraft, doseUnit: "drops" })).toBe(
    "Choose a valid dose unit."
  );
  expect(
    getMedicationEntryError({
      ...validDraft,
      doseUnit: "custom",
      customDoseUnit: "---",
    })
  ).toBe("Enter a meaningful custom dose unit.");
  expect(getMedicationEntryError({ ...validDraft, route: "unknown" })).toBe(
    "Choose a valid method or route."
  );
  expect(
    getMedicationEntryError({
      ...validDraft,
      route: "other",
      customRoute: "---",
    })
  ).toBe("Enter a meaningful custom method or route.");
});

test("rejects invalid local dates and preserves createdAt during edits", () => {
  expect(localDateTimeToIso("2026-02-30", "12:00")).toBeNull();
  expect(getMedicationEntryError({ ...validDraft, time: "25:00" })).toBe(
    "Enter a valid date and time."
  );

  const existingEntry = {
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const updated = createMedicationEntry(
    validDraft,
    existingEntry,
    new Date("2026-08-11T00:00:00.000Z")
  );
  expect(updated.createdAt).toBe(existingEntry.createdAt);
  expect(updated.updatedAt).toBe("2026-08-11T00:00:00.000Z");
});

test("copies an optional compound reference without replacing the snapshot", () => {
  const compoundReference = {
    source: "user-saved",
    sourceId: "user-saved:ss-31",
    modified: true,
  };
  const entry = createMedicationEntry({ ...validDraft, compoundReference });

  expect(entry.compoundReference).toEqual(compoundReference);
  expect(entry).toMatchObject({
    name: "Medication A",
    dose: { amount: 1.25, unit: "mg" },
    route: { code: "subcutaneous" },
  });
  expect(entry.compoundReference).not.toBe(compoundReference);
});
