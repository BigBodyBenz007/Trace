// Shared by the Node gateway and browser. This formats provider identifiers;
// it does not parse ingredient text or verify membership in an additive registry.
const OFF = "open-food-facts";
const MAX_ADDITIVE_TAGS = 100;
const MAX_ADDITIVE_TAG_LENGTH = 128;

function standardizedIdentifier(value) {
  const match = /^en:e([1-9]\d{2,3})([a-h]?)(i{1,3}|iv|v|vi{1,3}|ix)?$/i.exec(value.trim());
  return match ? `E${match[1]}${match[2].toLowerCase()}${(match[3] || "").toLowerCase()}` : null;
}

function unknownAdditives(source) {
  return Object.freeze({
    status: "unknown",
    source,
    sourceField: source === OFF ? "additives_tags" : null,
    items: null,
  });
}

function normalizeOpenFoodFactsAdditives(tags) {
  // Reject a malformed list as unknown, never silently turn it into an empty list.
  if (!Array.isArray(tags) || tags.length > MAX_ADDITIVE_TAGS
    || Array.from(tags).some((tag) => typeof tag !== "string" || !tag.trim()
      || tag.length > MAX_ADDITIVE_TAG_LENGTH)) return unknownAdditives(OFF);
  return Object.freeze({
    status: "reported",
    source: OFF,
    sourceField: "additives_tags",
    items: Object.freeze([...new Set(tags)].map((providerIdentifier) => Object.freeze({
      standardizedIdentifier: standardizedIdentifier(providerIdentifier),
      name: null, // The product's tags do not supply reliable display names.
      providerIdentifier,
      source: OFF,
      identification: "provider-reported",
    }))),
  });
}

function normalizeProductAdditives(value, providerId) {
  // Legacy cache and saved snapshots retain absence without a migration.
  if (value === undefined) return undefined;
  // Reconstruct from the supported source field. Cached labels or verification
  // claims cannot promote provider data into independently verified information.
  if (providerId !== OFF || value?.source !== OFF
    || value?.sourceField !== "additives_tags" || value?.status !== "reported"
    || !Array.isArray(value.items) || value.items.length > MAX_ADDITIVE_TAGS) return unknownAdditives(providerId);
  return normalizeOpenFoodFactsAdditives(value.items.map((item) => item?.providerIdentifier));
}

module.exports = {
  MAX_ADDITIVE_TAGS,
  MAX_ADDITIVE_TAG_LENGTH,
  normalizeOpenFoodFactsAdditives,
  normalizeProductAdditives,
  unknownAdditives,
};
