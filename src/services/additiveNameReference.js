// Shared by the gateway and browser; no requests, storage writes, or inference.
const data = require("../data/additiveNameReference.json");
const { getReferenceSource } = require("./regulatorySourceRegistry");

function freeze(value) {
  Object.values(value).forEach((item) => {
    if (item && typeof item === "object") freeze(item);
  });
  return Object.freeze(value);
}

const source = getReferenceSource({ sourceId: data.source.id, referenceVersion: data.referenceVersion });
if (!source) throw new Error("Additive name reference requires a registered source edition");
// Keep this shared CommonJS module free of injected ESM spread helpers.
const ADDITIVE_NAME_REFERENCE = freeze(Object.assign({}, data, { source }));
const names = new Map(data.entries.map((entry) => [entry.identifier, Object.freeze({
  name: entry.name,
  nameReference: Object.freeze({
    verification: "exact-source-name",
    referenceVersion: data.referenceVersion,
    sourceId: data.source.id,
    sourcePublicationDate: data.source.publicationDate,
    sourceIdentifier: entry.sourceIdentifier,
    jurisdiction: data.source.jurisdiction,
    language: data.source.language,
  }),
})]));

function resolveAdditiveName(identifier) {
  // Only an exact standardized identifier can match. No parent/subtype,
  // ingredient-name, INS, CAS, or jurisdiction conversion is attempted.
  return typeof identifier === "string" ? names.get(identifier) || null : null;
}

function getAdditiveNameSource(nameReference) {
  return getReferenceSource(nameReference);
}

module.exports = { ADDITIVE_NAME_REFERENCE, resolveAdditiveName, getAdditiveNameSource };
