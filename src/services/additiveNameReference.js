// Shared by the gateway and browser; no requests, storage writes, or inference.
const data = require("../data/additiveNameReference.json");

function freeze(value) {
  Object.values(value).forEach((item) => {
    if (item && typeof item === "object") freeze(item);
  });
  return Object.freeze(value);
}

const ADDITIVE_NAME_REFERENCE = freeze(data);
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
  return nameReference?.referenceVersion === data.referenceVersion
    && nameReference?.sourceId === data.source.id ? data.source : null;
}

module.exports = { ADDITIVE_NAME_REFERENCE, resolveAdditiveName, getAdditiveNameSource };
