import {
  MEDICATION_COMPOUNDS_STORAGE_KEY,
  addCompoundDefinition,
  createCompoundDefinition,
  readCompoundDefinitions,
  updateCompoundDefinition,
  writeCompoundDefinitions,
} from "./compoundCatalog";

const baseDraft = {
  name: "SS-31",
  defaultDoseAmount: "",
  doseUnit: "mg",
  customDoseUnit: "",
  route: "subcutaneous",
  customRoute: "",
};

beforeEach(() => localStorage.clear());

test("creates a reusable compound without a default amount", () => {
  const compound = createCompoundDefinition(
    baseDraft,
    new Date("2026-08-09T12:00:00.000Z")
  );

  expect(compound).toMatchObject({
    id: "user-saved:ss-31",
    schemaVersion: 1,
    name: "SS-31",
    defaults: {
      dose: { unit: "mg" },
      route: { code: "subcutaneous" },
    },
  });
  expect(compound.defaults.dose).not.toHaveProperty("amount");
});

test("stores an explicitly entered decimal default amount without conversion", () => {
  const compound = createCompoundDefinition({
    ...baseDraft,
    defaultDoseAmount: "3.5",
  });

  expect(compound.defaults.dose).toEqual({ amount: 3.5, unit: "mg" });
});

test("supports custom units and routes and validates optional amounts", () => {
  const compound = createCompoundDefinition({
    ...baseDraft,
    doseUnit: "custom",
    customDoseUnit: "sprays",
    route: "other",
    customRoute: "Recorded route",
  });

  expect(compound.defaults).toEqual({
    dose: { unit: "custom", customUnit: "sprays" },
    route: { code: "other", customLabel: "Recorded route" },
  });
  expect(
    createCompoundDefinition({ ...baseDraft, defaultDoseAmount: "0" })
  ).toBeNull();
});

test("classifies exact and conflicting normalized-name duplicates", () => {
  const original = createCompoundDefinition(baseDraft);
  const exact = createCompoundDefinition({ ...baseDraft, name: "  ss-31  " });
  const conflict = createCompoundDefinition({
    ...baseDraft,
    name: "SS-31",
    route: "oral",
  });

  expect(addCompoundDefinition([original], exact)).toMatchObject({
    compounds: [original],
    added: false,
    existingCompound: original,
    matchesDefinition: true,
  });
  expect(addCompoundDefinition([original], conflict)).toMatchObject({
    compounds: [original],
    added: false,
    existingCompound: original,
    matchesDefinition: false,
  });
});

test("persists compounds separately and reads them back", () => {
  const compound = createCompoundDefinition(baseDraft);
  writeCompoundDefinitions(localStorage, [compound]);

  expect(
    JSON.parse(localStorage.getItem(MEDICATION_COMPOUNDS_STORAGE_KEY))
  ).toEqual([compound]);
  expect(readCompoundDefinitions(localStorage)).toEqual([compound]);
});

test("edits defaults while preserving id and createdAt and updating updatedAt", () => {
  const original = createCompoundDefinition(
    baseDraft,
    new Date("2026-08-09T12:00:00.000Z")
  );
  const result = updateCompoundDefinition(
    [original],
    original.id,
    {
      ...baseDraft,
      defaultDoseAmount: "20",
      doseUnit: "mcg",
      route: "oral",
    },
    new Date("2026-08-10T12:00:00.000Z")
  );

  expect(result.error).toBe("");
  expect(result.updatedCompound).toMatchObject({
    id: original.id,
    createdAt: original.createdAt,
    updatedAt: "2026-08-10T12:00:00.000Z",
    defaults: {
      dose: { amount: 20, unit: "mcg" },
      route: { code: "oral" },
    },
  });
});

test("can change and remove a saved default amount", () => {
  const original = createCompoundDefinition({
    ...baseDraft,
    defaultDoseAmount: "3.5",
  });
  const changed = updateCompoundDefinition(
    [original],
    original.id,
    { ...baseDraft, defaultDoseAmount: "5" }
  ).updatedCompound;
  const removed = updateCompoundDefinition(
    [changed],
    changed.id,
    { ...baseDraft, defaultDoseAmount: "" }
  ).updatedCompound;

  expect(changed.defaults.dose.amount).toBe(5);
  expect(removed.defaults.dose).not.toHaveProperty("amount");
});

test("edits custom units and routes", () => {
  const original = createCompoundDefinition(baseDraft);
  const updated = updateCompoundDefinition([original], original.id, {
    ...baseDraft,
    doseUnit: "custom",
    customDoseUnit: "sprays",
    route: "other",
    customRoute: "Recorded route",
  }).updatedCompound;

  expect(updated.defaults).toEqual({
    dose: { unit: "custom", customUnit: "sprays" },
    route: { code: "other", customLabel: "Recorded route" },
  });
});

test("prevents normalized-name collisions without changing the catalog", () => {
  const first = createCompoundDefinition(baseDraft);
  const second = createCompoundDefinition({ ...baseDraft, name: "Compound B" });
  const result = updateCompoundDefinition([first, second], second.id, {
    ...baseDraft,
    name: "  ss-31  ",
  });

  expect(result).toEqual({
    compounds: [first, second],
    updatedCompound: null,
    error: "Another saved compound already uses that name.",
  });
});
