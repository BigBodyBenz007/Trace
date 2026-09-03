export const PRODUCT_IDENTIFIER_SCHEME = "gtin";
export const SUPPORTED_GTIN_LENGTHS = Object.freeze([8, 12, 13, 14]);

const SUPPORTED_GTIN_LENGTH_SET = new Set(SUPPORTED_GTIN_LENGTHS);

/**
 * Normalize a GTIN-family value without converting it to a number.
 *
 * Supported representations are GTIN-8, UPC-A/GTIN-12, EAN-13/GTIN-13,
 * and GTIN-14. Spaces and hyphens are accepted for manual entry and removed.
 * The returned string keeps every source leading zero and has a valid GS1
 * modulo-10 check digit. All other input returns null.
 */
export function normalizeGtin(value) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/[\s-]+/g, "");
  if (!/^\d+$/.test(normalized) || !SUPPORTED_GTIN_LENGTH_SET.has(normalized.length)) {
    return null;
  }

  return hasValidGtinCheckDigit(normalized) ? normalized : null;
}

export function hasValidGtinCheckDigit(value) {
  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value) ||
    !SUPPORTED_GTIN_LENGTH_SET.has(value.length)
  ) return false;

  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reduceRight(
    (total, digit, index) =>
      total + digit * ((digits.length - 1 - index) % 2 === 0 ? 3 : 1),
    0
  );

  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function canonicalGtinKey(value) {
  const normalized = normalizeGtin(value);
  return normalized ? `${PRODUCT_IDENTIFIER_SCHEME}:${normalized.padStart(14, "0")}` : null;
}

/**
 * The optional record contract is:
 *   identifiers: [{ scheme: "gtin", value: "00012000001291" }]
 *
 * Missing identifiers normalize to an empty list. A malformed list, unknown
 * scheme, invalid check digit, or equivalent duplicate returns null so callers
 * can reject the containing record instead of silently dropping bad data.
 */
export function normalizeProductIdentifiers(identifiers) {
  if (identifiers === undefined || identifiers === null) return Object.freeze([]);
  if (!Array.isArray(identifiers)) return null;

  const seen = new Set();
  const normalized = [];

  for (const identifier of identifiers) {
    if (
      !identifier ||
      typeof identifier !== "object" ||
      Array.isArray(identifier) ||
      identifier.scheme !== PRODUCT_IDENTIFIER_SCHEME
    ) return null;

    const value = normalizeGtin(identifier.value);
    const key = canonicalGtinKey(value);
    if (!value || seen.has(key)) return null;

    seen.add(key);
    normalized.push(Object.freeze({
      scheme: PRODUCT_IDENTIFIER_SCHEME,
      value,
    }));
  }

  return Object.freeze(normalized);
}

export function createProductIdentifierIndex(foods) {
  const index = new Map();

  (Array.isArray(foods) ? foods : []).forEach((food) => {
    const identifiers = normalizeProductIdentifiers(food?.identifiers);
    if (identifiers === null) {
      throw new Error(`Invalid product identifiers for ${food?.id || "unknown food"}.`);
    }

    identifiers.forEach((identifier) => {
      const key = canonicalGtinKey(identifier.value);
      const existing = index.get(key);
      if (existing && existing !== food) {
        throw new Error(
          `Product identifier collision for ${key}: ${existing.id} and ${food.id}.`
        );
      }
      index.set(key, food);
    });
  });

  return index;
}
