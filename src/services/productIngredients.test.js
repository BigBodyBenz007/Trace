import { MAX_INGREDIENT_TEXT_LENGTH, normalizeProductIngredients } from "./productIngredients";

test("keeps original ingredient text, Unicode, spacing, and line breaks verbatim", () => {
  const text = "  Farine de blé (67,4%), cacao*;\n sel.  ";
  const normalized = normalizeProductIngredients({ text, language: "fr" });
  expect(normalized).toEqual({ text, language: "fr" });
  expect(Object.isFrozen(normalized)).toBe(true);
});

test("keeps legacy absence distinct from explicitly unknown ingredient data", () => {
  expect(normalizeProductIngredients(undefined)).toBeUndefined();
  expect(normalizeProductIngredients(null)).toEqual({ text: null, language: null });
  expect(normalizeProductIngredients({})).toEqual({ text: null, language: null });
});

test.each(["", " \n ", 123, ["Milk"], { milk: true }])("invalid or blank text %p remains unknown", (text) => {
  expect(normalizeProductIngredients({ text, language: "en" })).toEqual({ text: null, language: null });
});

test.each(["fr", "pt-BR", "en-US"])("preserves declared language %s", (language) => {
  expect(normalizeProductIngredients({ text: "Milk, salt", language }).language).toBe(language);
});

test.each([undefined, null, 1, "", "unknown language", "en_US"])("unusable language %p does not discard text", (language) => {
  expect(normalizeProductIngredients({ text: "Milk, salt", language }))
    .toEqual({ text: "Milk, salt", language: null });
});

test("bounds optional text without truncating it or interpreting warnings", () => {
  const text = "x".repeat(MAX_INGREDIENT_TEXT_LENGTH);
  expect(normalizeProductIngredients({ text }).text).toBe(text);
  expect(normalizeProductIngredients({ text: `${text}x` })).toEqual({ text: null, language: null });
  expect(normalizeProductIngredients({ allergens: "Milk", traces: "Peanuts" }).text).toBeNull();
});
