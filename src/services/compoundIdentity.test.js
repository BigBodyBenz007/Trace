import starterCompounds from "../data/starterCompounds";
import { COMPOUND_CATEGORIES } from "./compoundIdentity";
import { normalizeCompoundName } from "./compoundCatalog";

const prohibitedKeys = new Set([
  "dose",
  "defaultDose",
  "typicalDose",
  "doseRange",
  "doseUnit",
  "route",
  "defaultRoute",
  "schedule",
  "frequency",
  "cycle",
  "stack",
  "titration",
  "instructions",
  "description",
  "confidence",
  "verification",
  "warnings",
  "usage",
  "purchasing",
  "controlled",
  "regulatoryStatus",
  "legalStatus",
  "approvalStatus",
  "investigationalStatus",
]);

function allKeys(value) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
}

test("starter catalog is useful, identity-only, and structurally valid", () => {
  expect(starterCompounds.length).toBeGreaterThanOrEqual(35);
  expect(starterCompounds.length).toBeLessThanOrEqual(50);

  starterCompounds.forEach((compound) => {
    expect(compound.id).toMatch(/^trace:compound:[a-z0-9-]+$/);
    expect(compound.schemaVersion).toBe(1);
    expect(compound.name.trim()).toBeTruthy();
    expect(Array.isArray(compound.aliases)).toBe(true);
    expect(COMPOUND_CATEGORIES.has(compound.category)).toBe(true);
    expect(compound.provenance).toEqual({
      source: "trace-catalog",
      sourceId: compound.id,
    });
    expect(allKeys(compound).filter((key) => prohibitedKeys.has(key))).toEqual([]);
  });
});

test("stable IDs and canonical identities are unique and aliases do not create records", () => {
  expect(new Set(starterCompounds.map(({ id }) => id)).size).toBe(starterCompounds.length);
  expect(
    new Set(starterCompounds.map(({ name }) => normalizeCompoundName(name))).size
  ).toBe(starterCompounds.length);
  expect(starterCompounds.some(({ aliases }) => aliases.length > 0)).toBe(true);
});

test("starter catalog represents every controlled category except optional other", () => {
  const categories = new Set(starterCompounds.map(({ category }) => category));
  [...COMPOUND_CATEGORIES]
    .filter((category) => category !== "other")
    .forEach((category) => expect(categories.has(category)).toBe(true));
});
