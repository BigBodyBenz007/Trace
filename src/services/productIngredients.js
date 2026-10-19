// CommonJS keeps this small contract shared by the Node gateway and browser model.
const MAX_INGREDIENT_TEXT_LENGTH = 8192;

function normalizeProductIngredients(value) {
  // Older products/cache entries did not collect ingredient information.
  if (value === undefined) return undefined;
  const fields = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const text = typeof fields.text === "string"
    && fields.text.trim()
    && fields.text.length <= MAX_INGREDIENT_TEXT_LENGTH
    ? fields.text
    : null;
  const language = text !== null
    && typeof fields.language === "string"
    && fields.language.length <= 35
    && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(fields.language.trim())
    ? fields.language.trim()
    : null;

  // Keep original text verbatim. Missing/malformed/oversized data is unknown,
  // never an empty ingredient list or a reason to reject usable nutrition.
  // Provider identity and attribution remain on the containing product/reference.
  return Object.freeze({ text, language });
}

module.exports = { MAX_INGREDIENT_TEXT_LENGTH, normalizeProductIngredients };
