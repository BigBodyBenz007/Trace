import sourceData from "../data/regulatorySourceRegistry";
import historical from "../data/additiveNameReference.json";
import { validateSourceRecord, validateSourceReference, validateSourceRegistry } from "./regulatorySourceValidation";
import { createRegulatorySourceRegistry, REGULATORY_SOURCE_REGISTRY, getRegulatorySource } from "./regulatorySourceRegistry";
import { resolveAdditiveName, getAdditiveNameSource } from "./additiveNameReference";

const copy = (value) => JSON.parse(JSON.stringify(value));
const original = () => copy(sourceData.sources[0]);
const ref = { sourceId: "CELEX:32012R0231", editionId: "original-2012-03-22" };

test("bundled historical and partial sources validate without inventing current legal coverage", () => {
  expect(validateSourceRegistry(sourceData)).toEqual({ valid: true, errors: [] });
  const source = getRegulatorySource(ref);
  expect(source.citation).toEqual(historical.source);
  expect(source.verification).toMatchObject({ status: "verified", currency: "historical", verifiedThrough: null });
  expect(getRegulatorySource({ sourceId: "CELEX:02012R0231-20260818", editionId: "consolidated-2026-08-18" }).verification)
    .toMatchObject({ status: "partial", currency: "undetermined", lastVerifiedOn: null, verifiedThrough: null, evidenceType: "indexed-excerpt" });
  expect(REGULATORY_SOURCE_REGISTRY.data.sources.filter((item) => item.verification.currency === "current-as-of")).toEqual([]);
});

test.each([
  ["missing id", (s) => { delete s.sourceId; }],
  ["mismatched id", (s) => { s.citation.id = "other"; }],
  ["missing edition", (s) => { delete s.edition; }],
  ["unknown edition kind", (s) => { s.edition.kind = "latest"; }],
  ["conflicting edition label", (s) => { s.edition.label = "latest"; }],
  ["missing issuer", (s) => { delete s.citation.publisher; }],
  ["missing title", (s) => { delete s.citation.title; }],
  ["unknown jurisdiction", (s) => { s.citation.jurisdiction = "US"; }],
  ["unsafe URL", (s) => { s.citation.url = "file:///regulation.html"; }],
  ["URL credentials", (s) => { s.citation.url = "https://user:secret@example.org/source"; }],
  ["missing attribution", (s) => { delete s.citation.attribution; }],
  ["missing reuse information", (s) => { delete s.citation.reuseBasis; }],
  ["missing publication", (s) => { delete s.citation.publicationDate; }],
  ["unexplained unknown publication", (s) => { s.citation.publicationDate = null; }],
  ["missing verification", (s) => { delete s.verification; }],
  ["unknown verification status", (s) => { s.verification.status = "approved"; }],
  ["unknown currency", (s) => { s.verification.currency = "current"; }],
  ["missing scope", (s) => { delete s.verification.scope; }],
  ["no verification date", (s) => { s.verification.lastVerifiedOn = null; }],
  ["no evidence", (s) => { s.verification.evidenceLocator = null; }],
  ["indexed evidence promoted to verified", (s) => { s.verification.evidenceType = "indexed-excerpt"; }],
  ["historical coverage claim", (s) => { s.verification.verifiedThrough = "2026-10-19"; }],
  ["URL accessibility promoted to current", (s) => { s.verification.currency = "current-as-of"; }],
  ["unsupported safety claim", (s) => { s.safe = true; }],
])("rejects incomplete or malformed provenance: %s", (_, change) => {
  const source = original();
  change(source);
  expect(validateSourceRecord(source).valid).toBe(false);
});

test.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-10-00",
  "2026-1-01", "19/10/2026", "2026-10-19T00:00:00Z", "0000-01-01", "", 20261019])(
  "rejects impossible and non-ISO dates: %p", (date) => {
    const source = original();
    source.edition.date = date;
    expect(validateSourceRecord(source).valid).toBe(false);
  }
);

test.each([
  (s) => { s.citation.publicationDate = "2013-01-01"; },
  (s) => { s.edition.date = "2026-10-20"; },
  (s) => { s.verification.lastAttemptedOn = "2026-10-18"; },
  (s) => { s.verification.lastVerifiedOn = "2011-01-01"; },
])("rejects inconsistent provenance dates %#", (change) => {
  const source = original();
  change(source);
  expect(validateSourceRecord(source).errors.join(" ")).toContain("inconsistent dates");
});

test("permits a documented unknown publication date and a real leap day without substitution", () => {
  const source = original();
  source.citation.publicationDate = null;
  source.citation.publicationDateNote = "Publication date has not been established.";
  source.edition.date = "2024-02-29";
  expect(validateSourceRecord(source).valid).toBe(true);
  expect(source.citation.publicationDate).toBeNull();
});

test("current-as-of is a dated reviewed scope, not a claim of evergreen currency", () => {
  // Synthetic fixture: no current source is shipped by this task.
  const source = original();
  Object.assign(source.verification, {
    currency: "current-as-of", verifiedThrough: "2026-10-18",
    currentnessBasis: "Synthetic fixture: applicable amendments checked through this date.",
  });
  expect(validateSourceRecord(source).valid).toBe(true);
  source.verification.verifiedThrough = "2026-10-20";
  expect(validateSourceRecord(source).valid).toBe(false);
  source.verification.verifiedThrough = "2011-01-01";
  expect(validateSourceRecord(source).valid).toBe(false);
});

test.each(["unverified", "unavailable"])("preserves %s rather than assigning a verification date", (status) => {
  const source = original();
  Object.assign(source.verification, {
    status, currency: "undetermined", lastVerifiedOn: null, evidenceType: "none",
    evidenceLocator: null, limitations: ["Source review could not be completed."],
  });
  expect(validateSourceRecord(source).valid).toBe(true);
  source.verification.currency = "current-as-of";
  expect(validateSourceRecord(source).valid).toBe(false);
});

test("partial evidence cannot become completed verification or lose its limitations", () => {
  const source = copy(sourceData.sources[1]);
  source.verification.lastVerifiedOn = "2026-10-19";
  expect(validateSourceRecord(source).valid).toBe(false);
  source.verification.lastVerifiedOn = null;
  source.verification.limitations = [];
  expect(validateSourceRecord(source).valid).toBe(false);
});

test("review dates cannot be in the future relative to an explicit validation date", () => {
  expect(validateSourceRecord(original(), { asOf: "2026-10-18" }).errors.join(" ")).toContain("review attempt in the future");
  expect(validateSourceRecord(original(), { asOf: "2026-10-19" }).valid).toBe(true);
  expect(validateSourceRecord(original(), { asOf: "invalid" }).valid).toBe(false);
});

test("name-reference bindings cannot elevate partially reviewed evidence", () => {
  const data = copy(sourceData);
  data.referenceBindings = [{ sourceId: data.sources[1].sourceId, editionId: data.sources[1].editionId, referenceVersion: "test-v2" }];
  expect(validateSourceRegistry(data).errors.join(" ")).toContain("name references require verified source evidence");
});

test("registry review dates are bounded by its snapshot rather than a device clock", () => {
  const data = copy(sourceData);
  data.snapshotDate = "2026-10-18";
  expect(validateSourceRegistry(data).valid).toBe(false);
  expect(validateSourceRegistry(sourceData, { asOf: "2026-10-18" }).valid).toBe(false);
  expect(validateSourceRegistry(sourceData, { asOf: "2026-10-19" }).valid).toBe(true);
});

test("sparse records and limitations are rejected rather than silently dropped", () => {
  expect(validateSourceRegistry({ ...sourceData, sources: Array(1) }).valid).toBe(false);
  expect(validateSourceRegistry({ ...sourceData, referenceBindings: Array(1) }).valid).toBe(false);
  const source = original();
  source.verification.limitations = Array(1);
  expect(validateSourceRecord(source).valid).toBe(false);
});

test("the schema supports US and scientific sources without importing conclusions", () => {
  const source = original();
  source.sourceId = "TEST:US-scientific-source";
  source.citation.id = source.sourceId;
  source.citation.publisher = "US Food and Drug Administration";
  source.citation.jurisdiction = "US-federal";
  source.documentType = "scientific-assessment";
  expect(validateSourceRecord(source).valid).toBe(true);
});

test.each([null, undefined, [], "source", 12])("malformed sources fail without throwing: %p", (source) => {
  expect(validateSourceRecord(source).valid).toBe(false);
});

test.each([null, {}, { schemaVersion: 2 }, { ...sourceData, referenceBindings: null }])(
  "rejects invalid registry manifests: %p", (data) => expect(validateSourceRegistry(data).valid).toBe(false)
);

test("rejects exact duplicates and conflicting source editions rather than choosing one", () => {
  const data = copy(sourceData);
  data.sources.push(copy(data.sources[0]));
  expect(validateSourceRegistry(data).errors.join(" ")).toContain("duplicate/conflicting source edition");
  data.sources[2].citation.title = "Conflicting title";
  expect(() => createRegulatorySourceRegistry(data)).toThrow("duplicate/conflicting source edition");
  data.sources[2].editionId = "another-edition";
  data.sources[2].citation.jurisdiction = "US-federal";
  expect(validateSourceRegistry(data).errors.join(" ")).toContain("conflicting source identity");
});

test("source references require exact, unambiguous identifiers and valid target provenance", () => {
  expect(validateSourceReference(ref, sourceData.sources).valid).toBe(true);
  expect(validateSourceReference({ sourceId: ref.sourceId }, sourceData.sources).valid).toBe(false);
  expect(validateSourceReference({ ...ref, editionId: "latest" }, sourceData.sources).valid).toBe(false);
  expect(validateSourceReference(ref, [...sourceData.sources, original()]).valid).toBe(false);
  const malformed = original();
  delete malformed.citation.attribution;
  expect(validateSourceReference(ref, [malformed]).valid).toBe(false);
  expect(getRegulatorySource({ ...ref, editionId: "latest" })).toBeNull();
  expect(getRegulatorySource(null)).toBeNull();
});

test("rejects missing, dangling and conflicting name-reference bindings", () => {
  const data = copy(sourceData);
  data.referenceBindings[0].editionId = "missing-edition";
  expect(validateSourceRegistry(data).valid).toBe(false);
  data.referenceBindings = [null];
  expect(validateSourceRegistry(data).valid).toBe(false);
  data.referenceBindings = [copy(sourceData.referenceBindings[0]), copy(sourceData.referenceBindings[0])];
  expect(validateSourceRegistry(data).errors.join(" ")).toContain("duplicate/conflicting reference binding");
});

test("adding a future name edition leaves old saved references and their citations resolvable", () => {
  const data = copy(sourceData);
  const newer = original();
  newer.editionId = "synthetic-revision";
  newer.edition = { kind: "revision", date: "2020-01-01", label: "Synthetic test edition" };
  newer.citation.version = newer.edition.label;
  data.sources.push(newer);
  data.referenceBindings.push({ sourceId: ref.sourceId, editionId: newer.editionId, referenceVersion: "test-v2" });
  const registry = createRegulatorySourceRegistry(data);
  const savedReference = JSON.parse(JSON.stringify(resolveAdditiveName("E330").nameReference));
  expect(registry.getReferenceSource(savedReference)).toEqual(historical.source);
  expect(registry.getReferenceSource({ sourceId: ref.sourceId, referenceVersion: "test-v2" }).version).toBe("Synthetic test edition");
  expect(registry.getReferenceSource({ ...savedReference, referenceVersion: "unknown" })).toBeNull();
  data.sources[0].citation.title = "Mutation after validation";
  expect(registry.getSource(ref).citation.title).toBe(historical.source.title);
  expect(Object.isFrozen(registry.data.sources[0].verification.limitations)).toBe(true);
});

test("saved name provenance resolves through the registry without accepting conflicting metadata", () => {
  const saved = JSON.parse(JSON.stringify(resolveAdditiveName("E330").nameReference));
  expect(getAdditiveNameSource(saved)).toEqual(historical.source);
  expect(getAdditiveNameSource({ ...saved, jurisdiction: "US-federal" })).toBeNull();
  expect(getAdditiveNameSource({ ...saved, sourcePublicationDate: "2026-08-18" })).toBeNull();
  expect(getAdditiveNameSource({ ...saved, language: "fr" })).toBeNull();
  expect(getAdditiveNameSource({ sourceId: "CELEX:02012R0231-20260818", referenceVersion: saved.referenceVersion })).toBeNull();
});
