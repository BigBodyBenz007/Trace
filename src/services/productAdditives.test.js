import {
  MAX_ADDITIVE_TAGS, MAX_ADDITIVE_TAG_LENGTH,
  normalizeOpenFoodFactsAdditives, normalizeProductAdditives,
} from "./productAdditives";

const OFF = "open-food-facts";

test("retains structured provider identifiers and never asserts independent verification", () => {
  const tags = ["en:e330", "en:e150d", "en:e500ii", "en:e330", " EN:E322 "];
  const data = normalizeOpenFoodFactsAdditives(tags);
  expect(data.status).toBe("reported");
  expect(data.sourceField).toBe("additives_tags");
  expect(data.items.map((item) => item.standardizedIdentifier)).toEqual(["E330", "E150d", "E500ii", "E322"]);
  expect(data.items.map((item) => item.providerIdentifier)).toEqual([...new Set(tags)]);
  data.items.forEach((item) => {
    expect(item).toMatchObject({ name: null, source: OFF, identification: "provider-reported" });
    expect(Object.isFrozen(item)).toBe(true);
  });
  expect(Object.isFrozen(data.items)).toBe(true);
  expect(Object.isFrozen(data)).toBe(true);
  expect(normalizeProductAdditives(JSON.parse(JSON.stringify(data)), OFF)).toEqual(data);
});

test("distinguishes legacy absence, unknown data, and an explicitly empty provider list", () => {
  expect(normalizeProductAdditives(undefined, OFF)).toBeUndefined();
  expect(normalizeOpenFoodFactsAdditives(undefined)).toMatchObject({ status: "unknown", items: null });
  expect(normalizeOpenFoodFactsAdditives([])).toMatchObject({ status: "reported", items: [] });
});

test.each([null, {}, "en:e330", [null], ["en:e330", 42], [""], [" "], Array(1),
  Array(MAX_ADDITIVE_TAGS + 1).fill("en:e330"), ["x".repeat(MAX_ADDITIVE_TAG_LENGTH + 1)],
])("malformed or oversized tags stay unknown: %p", (tags) => {
  expect(normalizeOpenFoodFactsAdditives(tags)).toMatchObject({ status: "unknown", items: null });
});

test("retains unrecognized tags without guessing an identifier or name", () => {
  const tags = ["en:unrecognized-tag", "citric acid", "E330", "fr:e330", "en:e0330", "en:e330-extra"];
  const data = normalizeOpenFoodFactsAdditives(tags);
  expect(data.items.map((item) => item.providerIdentifier)).toEqual(tags);
  data.items.forEach((item) => expect(item.standardizedIdentifier).toBeNull());
});

test("rejects cross-provider claims and does not trust cached names or verification flags", () => {
  const data = JSON.parse(JSON.stringify(normalizeOpenFoodFactsAdditives(["en:e330"])));
  data.items[0].identification = "independently-verified";
  data.items[0].standardizedIdentifier = "E100";
  data.items[0].name = "Invented label";
  expect(normalizeProductAdditives(data, OFF)).toEqual(normalizeOpenFoodFactsAdditives(["en:e330"]));
  expect(normalizeProductAdditives(data, "usda-fdc")).toMatchObject({ source: "usda-fdc", status: "unknown", items: null });
  expect(normalizeProductAdditives({ ...data, sourceField: "ingredients_text" }, OFF).items).toBeNull();
  expect(normalizeProductAdditives({ ...data, items: [null] }, OFF).items).toBeNull();
});
