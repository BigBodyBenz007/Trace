// Structural validation cannot replace human source or legal review.
const JURISDICTIONS = Object.freeze(["EU", "US-federal", "international"]);
const DOCUMENT_TYPES = ["regulation", "consolidated-regulation", "amendment", "final-rule",
  "proposed-rule", "scientific-assessment", "inventory", "regulatory-announcement"];
const STATUSES = ["verified", "partial", "unverified", "unavailable"];
const CURRENCIES = ["historical", "current-as-of", "undetermined"];
const EVIDENCE_TYPES = ["official-text", "indexed-excerpt", "none"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const isIdentifier = (value) => isText(value) && /^[A-Za-z0-9][A-Za-z0-9:._/-]*$/.test(value);
const key = (sourceId, editionId) => JSON.stringify([sourceId, editionId]);

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function isHttpsUrl(value) {
  if (!isText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function result(errors) {
  return { valid: errors.length === 0, errors };
}

function checkFields(value, allowed, label, errors) {
  if (!isObject(value)) return;
  Object.keys(value).forEach((field) => {
    if (!allowed.includes(field)) errors.push(`${label}: unsupported field ${field}`);
  });
}

function validateSourceRecord(record, { asOf = null } = {}) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!isObject(record)) return result(["source must be an object"]);
  checkFields(record, ["sourceId", "editionId", "citation", "documentType", "edition", "verification"], "source", errors);
  check(asOf === null || isDate(asOf), "asOf must be a real ISO date");
  check(isIdentifier(record.sourceId), "sourceId is required and must be a stable identifier");
  check(isIdentifier(record.editionId), "editionId is required and must be a stable identifier");
  check(DOCUMENT_TYPES.includes(record.documentType), "unknown documentType");
  const citation = isObject(record.citation) ? record.citation : {};
  checkFields(citation, ["id", "title", "publisher", "jurisdiction", "language", "publicationDate",
    "publicationDateNote", "version", "url", "reviewedOn", "attribution", "reuseBasis", "reuseNoticeUrl",
    "reuseDecisionUrl", "changes", "scope"], "citation", errors);
  check(citation.id === record.sourceId && isIdentifier(citation.id), "citation.id must match sourceId");
  ["title", "publisher", "language", "version", "attribution", "reuseBasis", "changes", "scope"].forEach((field) => {
    check(isText(citation[field]), `citation.${field} is required`);
  });
  check(JURISDICTIONS.includes(citation.jurisdiction), "unknown jurisdiction");
  check(isHttpsUrl(citation.url), "citation.url must be an HTTPS URL without credentials");
  check(isHttpsUrl(citation.reuseNoticeUrl), "citation.reuseNoticeUrl must be an HTTPS URL");
  check(isDate(citation.publicationDate) || (citation.publicationDate === null
    && isText(citation.publicationDateNote)), "publicationDate requires a real ISO date or explicit null with a reason");
  if (citation.reviewedOn !== undefined) check(isDate(citation.reviewedOn), "invalid citation.reviewedOn");
  if (citation.reuseDecisionUrl !== undefined) check(isHttpsUrl(citation.reuseDecisionUrl), "invalid reuseDecisionUrl");

  const edition = isObject(record.edition) ? record.edition : {};
  checkFields(edition, ["kind", "date", "label"], "edition", errors);
  check(["original", "consolidated", "revision", "snapshot"].includes(edition.kind), "unknown edition kind");
  check(isDate(edition.date), "edition.date must be a real ISO date");
  check(isText(edition.label) && edition.label === citation.version, "edition label must match citation.version");
  if (record.documentType === "consolidated-regulation") {
    check(edition.kind === "consolidated", "consolidated regulations require a consolidated edition");
  }

  const verification = isObject(record.verification) ? record.verification : {};
  checkFields(verification, ["status", "currency", "lastAttemptedOn", "lastVerifiedOn", "verifiedThrough",
    "evidenceType", "scope", "evidenceLocator", "currentnessBasis", "limitations"], "verification", errors);
  check(STATUSES.includes(verification.status), "unknown verification status");
  check(CURRENCIES.includes(verification.currency), "unknown source currency");
  check(EVIDENCE_TYPES.includes(verification.evidenceType), "unknown evidenceType");
  ["lastAttemptedOn", "lastVerifiedOn", "verifiedThrough"].forEach((field) => {
    check(verification[field] === null || isDate(verification[field]), `verification.${field} requires an ISO date or explicit null`);
  });
  check(isText(verification.scope), "verification.scope is required");
  check(verification.evidenceLocator === null || isText(verification.evidenceLocator), "invalid evidenceLocator");
  check(verification.currentnessBasis === null || isText(verification.currentnessBasis), "invalid currentnessBasis");
  check(Array.isArray(verification.limitations) && Array.from(verification.limitations).every(isText), "limitations must be a text array");

  if (verification.status === "verified") {
    check(isDate(verification.lastVerifiedOn) && isDate(verification.lastAttemptedOn), "verified sources require completed and attempted review dates");
    check(verification.evidenceType === "official-text" && isText(verification.evidenceLocator), "verified sources require located official-text evidence");
  } else {
    check(verification.lastVerifiedOn === null && verification.verifiedThrough === null, "incomplete verification must not claim completed verification or coverage");
    check(Array.isArray(verification.limitations) && verification.limitations.length > 0, "incomplete verification requires limitations");
  }
  if (verification.status === "partial") {
    check(isDate(verification.lastAttemptedOn) && verification.evidenceType !== "none"
      && isText(verification.evidenceLocator), "partial verification requires dated, located evidence");
  }
  if (verification.status === "unavailable") {
    check(isDate(verification.lastAttemptedOn), "unavailable sources require an attempted review date");
  }
  if (verification.currency === "current-as-of") {
    check(verification.status === "verified" && isDate(verification.verifiedThrough)
      && isText(verification.currentnessBasis), "current-as-of requires completed official review, coverage date and currentness basis");
  } else {
    check(verification.verifiedThrough === null && verification.currentnessBasis === null, "noncurrent sources cannot claim current coverage");
  }

  const ordered = (before, after, label) => {
    if (isDate(before) && isDate(after)) check(before <= after, `inconsistent dates: ${label}`);
  };
  ordered(citation.publicationDate, edition.date, "publication after edition");
  ordered(edition.date, verification.lastAttemptedOn, "edition after review attempt");
  ordered(edition.date, verification.lastVerifiedOn, "edition after verification");
  ordered(verification.lastVerifiedOn, verification.lastAttemptedOn, "verification after review attempt");
  ordered(edition.date, verification.verifiedThrough, "coverage before edition");
  ordered(verification.verifiedThrough, verification.lastVerifiedOn, "coverage after verification");
  ordered(verification.lastAttemptedOn, asOf, "review attempt in the future");
  if (citation.reviewedOn !== undefined) ordered(citation.reviewedOn, verification.lastAttemptedOn, "citation review after latest attempt");
  return result(errors);
}

function validateSourceReference(reference, sources, options) {
  if (!isObject(reference) || !isIdentifier(reference.sourceId) || !isIdentifier(reference.editionId)) {
    return result(["source reference requires sourceId and editionId"]);
  }
  if (!Array.isArray(sources)) return result(["sources must be an array"]);
  const matches = sources.filter((source) => source?.sourceId === reference.sourceId && source?.editionId === reference.editionId);
  if (matches.length !== 1) return result(["source reference is unknown or ambiguous"]);
  return validateSourceRecord(matches[0], options);
}

function validateSourceRegistry(data, options) {
  if (!isObject(data) || data.schemaVersion !== 1 || !isIdentifier(data.registryVersion)
    || !isDate(data.snapshotDate)
    || !Array.isArray(data.sources) || !Array.isArray(data.referenceBindings)) {
    return result(["registry requires schemaVersion 1, registryVersion, snapshotDate, sources and referenceBindings"]);
  }
  const errors = [];
  checkFields(data, ["schemaVersion", "registryVersion", "snapshotDate", "sources", "referenceBindings"], "registry", errors);
  if (options?.asOf !== undefined && (!isDate(options.asOf) || data.snapshotDate > options.asOf)) {
    errors.push("registry snapshotDate exceeds or has an invalid asOf date");
  }
  // Deterministic bundled validation must not depend on a phone's wall clock.
  const reviewOptions = { asOf: data.snapshotDate };
  const editions = new Set();
  const identities = new Map();
  Array.from(data.sources).forEach((source, index) => {
    errors.push(...validateSourceRecord(source, reviewOptions).errors.map((error) => `sources[${index}]: ${error}`));
    if (!isObject(source)) return;
    const editionKey = key(source.sourceId, source.editionId);
    if (editions.has(editionKey)) errors.push(`duplicate/conflicting source edition: ${editionKey}`);
    editions.add(editionKey);
    const identity = JSON.stringify([source.citation?.publisher, source.citation?.jurisdiction, source.documentType]);
    if (identities.has(source.sourceId) && identities.get(source.sourceId) !== identity) {
      errors.push(`conflicting source identity: ${source.sourceId}`);
    }
    identities.set(source.sourceId, identity);
  });
  const bindings = new Set();
  Array.from(data.referenceBindings).forEach((binding, index) => {
    checkFields(binding, ["referenceVersion", "sourceId", "editionId"], `referenceBindings[${index}]`, errors);
    errors.push(...validateSourceReference(binding, data.sources, reviewOptions).errors.map((error) => `referenceBindings[${index}]: ${error}`));
    if (!isObject(binding) || !isIdentifier(binding.referenceVersion)) {
      errors.push(`referenceBindings[${index}]: referenceVersion is required`);
      return;
    }
    const bindingKey = key(binding.sourceId, binding.referenceVersion);
    const target = data.sources.find((source) => source?.sourceId === binding.sourceId && source?.editionId === binding.editionId);
    if (target?.verification?.status !== "verified") errors.push(`referenceBindings[${index}]: name references require verified source evidence`);
    if (bindings.has(bindingKey)) errors.push(`duplicate/conflicting reference binding: ${bindingKey}`);
    bindings.add(bindingKey);
  });
  return result(errors);
}

module.exports = { JURISDICTIONS, validateSourceRecord, validateSourceReference, validateSourceRegistry };
