import data from "../data/regulatoryLegalEvents.json";
import sourceData from "../data/regulatorySourceRegistry";
import { getRegulatorySource } from "./regulatorySourceRegistry";
import { validateLegalEvent, validateLegalEventRegistry } from "./regulatoryLegalEventValidation";
import { createLegalEventRegistry, LEGAL_EVENT_REGISTRY, getLegalEvent, getLegalEventsForSubstance } from "./regulatoryLegalEvents";

const copy = (value) => JSON.parse(JSON.stringify(value));
const bvo = () => copy(data.events[0]);
const validate = (event, sources = sourceData.sources) => validateLegalEvent(event, sources, { asOf: data.snapshotDate });

test("ships one verified, scoped US BVO final action with separate publication, effect and compliance dates", () => {
  expect(validateLegalEventRegistry(data, sourceData)).toEqual({ valid: true, errors: [] });
  expect(data.events).toHaveLength(1);
  expect(getLegalEvent("us-fda-bvo-2024-revocation")).toMatchObject({
    substance: { id: "brominated-vegetable-oil", name: "Brominated vegetable oil" },
    jurisdiction: "US-federal", authority: "US Food and Drug Administration",
    action: { type: "authorization-revocation", stage: "final", target: "21 CFR 180.30" },
    affectedUses: ["Stabilizer for flavoring oils in fruit-flavored beverages"],
    dates: { publishedOn: "2024-07-03", effectiveOn: "2024-08-02", complianceOn: "2025-08-02" },
    evidence: { status: "verified", lastReviewedOn: "2026-10-19" }, relationships: [],
  });
  expect(bvo().dates.complianceNote).toContain("derived from that interval");
  const qualifications = bvo().qualifications;
  expect(qualifications.map((q) => q.kind)).toEqual(["scope", "statutory-qualification", "transition"]);
  expect(qualifications[0].text).toContain("15 ppm finished-beverage limit is historical");
  expect(qualifications[1].text).toContain("201(s)(1)-(6)");
  expect(qualifications[1].text).toContain("does not assert that any particular exception applies");
  expect(qualifications[2].text).toContain("No further sell-through entitlement");
});

test("binds the final rule's exact edition, official URL, provisions and historical verification without replacing name sources", () => {
  const ref = bvo().sourceReferences[0];
  expect(ref).toEqual({ referenceId: "bvo-final-rule", role: "primary", sourceId: "FR:2024-14300",
    editionId: "published-2024-07-03", provisions: ["Summary and DATES", "V, responses 1 and 3", "VI-VII",
      "Amendatory instruction 2: remove 21 CFR 180.30"] });
  const source = getRegulatorySource(ref);
  expect(source.citation).toMatchObject({
    publisher: "US Food and Drug Administration", jurisdiction: "US-federal", publicationDate: "2024-07-03",
    url: "https://www.govinfo.gov/content/pkg/FR-2024-07-03/pdf/2024-14300.pdf", version: "Publication 2024-07-03",
  });
  expect(source.verification).toMatchObject({ status: "verified", currency: "historical",
    lastVerifiedOn: "2026-10-19", verifiedThrough: null, currentnessBasis: null, evidenceType: "official-text" });
  expect(source.citation.attribution).toContain("89 FR 55040");
  expect(source.citation.reuseBasis).toBeTruthy();
  expect(sourceData.sources[0].editionId).toBe("original-2012-03-22");
  expect(sourceData.sources[1].verification.status).toBe("partial");
  expect(sourceData.sources.some((s) => s.verification.currency === "current-as-of")).toBe(false);
});

test("unknown substances and jurisdictions have no inferred events or guessed identity", () => {
  expect(getLegalEvent("unknown")).toBeNull();
  expect(getLegalEvent(null)).toBeNull();
  expect(getLegalEventsForSubstance("brominated-vegetable-oil", "US-federal")).toHaveLength(1);
  expect(getLegalEventsForSubstance("brominated-vegetable-oil", "EU")).toEqual([]);
  expect(getLegalEventsForSubstance("unknown", "US-federal")).toEqual([]);
  expect(getLegalEventsForSubstance("brominated-vegetable-oil")).toEqual([]);
  expect(bvo().substance).toEqual({ id: "brominated-vegetable-oil", name: "Brominated vegetable oil" });
});

test.each([
  ["event identifier", (e) => { delete e.eventId; }],
  ["substance identifier", (e) => { delete e.substance.id; }],
  ["jurisdiction", (e) => { e.jurisdiction = "US"; }],
  ["authority", (e) => { e.authority = "Other authority"; }],
  ["action type", (e) => { e.action.type = "unsafe"; }],
  ["proposed action", (e) => { e.action.stage = "proposed"; }],
  ["target", (e) => { delete e.action.target; }],
  ["food uses", (e) => { e.affectedUses = []; }],
  ["publication", (e) => { delete e.dates.publishedOn; }],
  ["effect", (e) => { delete e.dates.effectiveOn; }],
  ["compliance", (e) => { delete e.dates.complianceOn; }],
  ["deadline basis", (e) => { delete e.dates.complianceNote; }],
  ["publication/source mismatch", (e) => { e.dates.publishedOn = "2024-07-04"; }],
  ["effect before publication", (e) => { e.dates.effectiveOn = "2024-07-02"; }],
  ["compliance before effect", (e) => { e.dates.complianceOn = "2024-08-01"; }],
  ["missing review", (e) => { delete e.evidence.lastReviewedOn; }],
  ["review before publication", (e) => { e.evidence.lastReviewedOn = "2024-07-02"; }],
  ["review before source verification", (e) => { e.evidence.lastReviewedOn = "2026-10-18"; }],
  ["review after snapshot", (e) => { e.evidence.lastReviewedOn = "2026-10-20"; }],
  ["partial evidence", (e) => { e.evidence.status = "partial"; }],
  ["missing evidence scope", (e) => { delete e.evidence.scope; }],
  ["missing sources", (e) => { e.sourceReferences = []; }],
  ["unknown source", (e) => { e.sourceReferences[0].sourceId = "FR:unknown"; }],
  ["wrong edition", (e) => { e.sourceReferences[0].editionId = "latest"; }],
  ["missing provisions", (e) => { e.sourceReferences[0].provisions = []; }],
  ["missing primary", (e) => { e.sourceReferences[0].role = "supporting"; }],
  ["duplicate primary", (e) => { e.sourceReferences.push(copy(e.sourceReferences[0])); }],
  ["dates without source", (e) => { delete e.dates.sourceReferenceId; }],
  ["missing qualifications", (e) => { delete e.qualifications; }],
  ["empty qualifications", (e) => { e.qualifications = []; }],
  ["blank qualification", (e) => { e.qualifications[0].text = " "; }],
  ["uncited qualification", (e) => { e.qualifications[0].sourceReferenceId = "unknown"; }],
  ["duplicate qualification", (e) => { e.qualifications.push(copy(e.qualifications[0])); }],
  ["missing scope qualification", (e) => { e.qualifications.shift(); }],
  ["missing compliance qualification", (e) => { e.qualifications.pop(); }],
  ["missing relationship state", (e) => { delete e.relationships; }],
  ["safety verdict", (e) => { e.safe = false; }],
  ["scientific date substitution", (e) => { e.dates.scientificAssessmentOn = e.dates.effectiveOn; delete e.dates.effectiveOn; }],
])("rejects missing or unsupported legal claims: %s", (_, change) => {
  const event = bvo();
  change(event);
  const result = validate(event);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  const manifest = copy(data);
  manifest.events = [event];
  expect(() => createLegalEventRegistry(manifest)).toThrow("Invalid legal-event registry");
});

test.each(["2025-02-29", "2024-04-31", "0000-01-01", "2024-8-02", "2024-08-02T00:00:00Z", "", null, 20240802])(
  "rejects invalid effective dates without substituting publication or compliance: %p", (date) => {
    const event = bvo();
    event.dates.effectiveOn = date;
    expect(validate(event).valid).toBe(false);
  }
);

test("accepts a real leap date, a future deadline and explicitly absent compliance without using the phone clock", () => {
  const event = bvo();
  event.dates.effectiveOn = "2028-02-29";
  event.dates.complianceOn = "2029-02-28";
  expect(validate(event).valid).toBe(true);
  event.dates.complianceOn = null;
  event.dates.complianceNote = "Synthetic fixture: no separate compliance deadline established by the source.";
  expect(validate(event).valid).toBe(true);
  expect(validateLegalEvent(event, sourceData.sources, { asOf: "invalid" }).valid).toBe(false);
});

test.each(["partial", "unverified", "unavailable"])("does not promote a %s source to verified legal evidence", (status) => {
  const sources = copy(sourceData.sources);
  const source = sources.find((s) => s.sourceId === "FR:2024-14300");
  Object.assign(source.verification, { status, currency: "undetermined", lastVerifiedOn: null,
    evidenceType: status === "partial" ? "indexed-excerpt" : "none",
    evidenceLocator: status === "partial" ? "Synthetic indexed evidence" : null });
  expect(validate(bvo(), sources).errors.join(" ")).toContain("require verified official-text");
});

test.each(["proposed-rule", "scientific-assessment", "regulatory-announcement"])("rejects %s as the primary final legal source", (documentType) => {
  const sources = copy(sourceData.sources);
  sources.find((s) => s.sourceId === "FR:2024-14300").documentType = documentType;
  expect(validate(bvo(), sources).errors.join(" ")).toContain("final legal action");
});

test("rejects a legal source from a different jurisdiction", () => {
  const sources = copy(sourceData.sources);
  sources.find((s) => s.sourceId === "FR:2024-14300").citation.jurisdiction = "EU";
  expect(validate(bvo(), sources).errors.join(" ")).toContain("jurisdiction must match");
});

test.each([false, true])("rejects duplicate event IDs even when the records %s conflict", (conflict) => {
  const manifest = copy(data);
  const duplicate = bvo();
  if (conflict) duplicate.dates.complianceOn = "2025-08-03";
  manifest.events.push(duplicate);
  expect(validateLegalEventRegistry(manifest, sourceData).errors.join(" ")).toContain("duplicate/conflicting eventId");
});

test("rejects the same legal action disguised under another event ID", () => {
  const manifest = copy(data);
  manifest.events.push({ ...bvo(), eventId: "another-id" });
  expect(validateLegalEventRegistry(manifest, sourceData).errors.join(" ")).toContain("under different event IDs");
});

// Synthetic future acts test relationship behavior; these are not shipped legal claims.
function futureFixture(type = "amends") {
  const manifest = copy(data);
  const sources = copy(sourceData);
  const source = copy(sources.sources.find((s) => s.sourceId === "FR:2024-14300"));
  source.sourceId = source.citation.id = "test:future-act";
  source.editionId = "test-2025-01-01";
  source.citation.publicationDate = source.edition.date = "2025-01-01";
  source.citation.version = source.edition.label = "Synthetic 2025 test edition";
  sources.sources.push(source);
  const event = bvo();
  event.eventId = "test-future-event";
  event.action.type = "authorization-amendment";
  event.dates.publishedOn = "2025-01-01";
  event.dates.effectiveOn = "2025-02-01";
  event.dates.complianceOn = "2025-03-01";
  Object.assign(event.sourceReferences[0], { sourceId: source.sourceId, editionId: source.editionId });
  event.relationships = [{ type, eventId: bvo().eventId, sourceReferenceId: "bvo-final-rule" }];
  manifest.events.push(event);
  return { manifest, sources, event };
}

test.each(["amends", "supersedes"])("supports a future %s relationship while preserving the original event", (type) => {
  const { manifest, sources } = futureFixture(type);
  const registry = createLegalEventRegistry(manifest, sources);
  expect(registry.getEventsForSubstance("brominated-vegetable-oil", "US-federal")).toHaveLength(2);
  expect(registry.getEvent(bvo().eventId)).toEqual(bvo());
  expect(registry.getEvent("test-future-event").relationships[0].type).toBe(type);
  // Input mutation cannot rewrite the validated immutable snapshot.
  manifest.events[0].dates.complianceOn = "1900-01-01";
  expect(registry.getEvent(bvo().eventId).dates.complianceOn).toBe("2025-08-02");
  expect(Object.isFrozen(registry.getEvent(bvo().eventId).qualifications)).toBe(true);
  expect(Object.isFrozen(registry.data.events[0].dates)).toBe(true);
  expect(Object.isFrozen(LEGAL_EVENT_REGISTRY.data)).toBe(true);
});

test.each([
  ["unresolved", ({ event }) => { event.relationships[0].eventId = "unknown"; }, "unresolved relationship target"],
  ["self", ({ event }) => { event.relationships[0].eventId = event.eventId; }, "invalid/self event relationship"],
  ["unsupported", ({ event }) => { event.relationships[0].type = "overrules"; }, "unsupported relationship type"],
  ["uncited", ({ event }) => { event.relationships[0].sourceReferenceId = "unknown"; }, "source reference is missing"],
  ["duplicate", ({ event }) => { event.relationships.push(copy(event.relationships[0])); }, "duplicate/conflicting relationship target"],
  ["different substance", ({ event }) => { event.substance.id = "another-substance"; }, "relationship crosses jurisdiction or substance"],
  ["different jurisdiction", ({ event }) => { event.jurisdiction = "EU"; }, "relationship crosses jurisdiction or substance"],
  ["later target", ({ manifest }) => { manifest.events[0].dates.publishedOn = "2026-01-01"; }, "relationship target published after"],
  ["cycle", ({ manifest, event }) => {
    manifest.events[0].relationships.push({ type: "supersedes", eventId: event.eventId, sourceReferenceId: "bvo-final-rule" });
  }, "cyclic event relationships"],
])("rejects %s event relationships", (_, change, expectedError) => {
  const fixture = futureFixture();
  change(fixture);
  expect(validateLegalEventRegistry(fixture.manifest, fixture.sources).errors.join(" ")).toContain(expectedError);
});

test("rejects malformed manifests and sparse records without crashing or filling missing provenance", () => {
  [null, {}, { ...data, schemaVersion: 2 }, { ...data, events: [null] },
    { ...data, events: Array(1) }, { ...data, snapshotDate: "2026-02-29" }].forEach((manifest) => {
    expect(validateLegalEventRegistry(manifest, sourceData).valid).toBe(false);
  });
  ["sourceReferences", "qualifications", "affectedUses", "relationships"].forEach((field) => {
    const event = bvo();
    event[field] = Array(1);
    expect(validate(event).valid).toBe(false);
  });
  const sources = copy(sourceData);
  sources.sources.push(copy(sources.sources[0]));
  expect(validateLegalEventRegistry(data, sources).errors.join(" ")).toContain("source registry:");
});
