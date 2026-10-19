import data from "../data/regulatoryLegalEvents.json";
import sourceData from "../data/regulatorySourceRegistry";
import { getRegulatorySource } from "./regulatorySourceRegistry";
import { createLegalEventRegistry, getLegalEventsForSubstance } from "./regulatoryLegalEvents";
import { validateLegalEvent, validateLegalEventRegistry } from "./regulatoryLegalEventValidation";

const copy = (v) => JSON.parse(JSON.stringify(v));
const revocationId = "us-fda-red3-food-2025-revocation";
const stayId = "us-fda-red3-food-2025-administrative-stay";
const liftedId = "us-fda-red3-food-2026-stay-lifted";
const event = (id) => copy(data.events.find((e) => e.eventId === id));
const stock = (e) => e.qualifications.find((q) => q.kind === "prior-certified-use");
const validate = (e, sources = sourceData.sources) => validateLegalEvent(e, sources, { asOf: data.snapshotDate });

test("records a future food removal with coincident effect/compliance, separate from publication and drug removal", () => {
  expect(validateLegalEventRegistry(data, sourceData)).toEqual({ valid: true, errors: [] });
  const e = event(revocationId);
  expect(e).toMatchObject({
    substance: { id: "erythrosine", name: "FD&C Red No. 3 (erythrosine)" },
    jurisdiction: "US-federal", authority: "US Food and Drug Administration",
    action: { type: "authorization-revocation", stage: "final", target: "21 CFR 74.303" },
    useScope: { domain: "food", provision: "21 CFR 74.303" },
    dates: { publishedOn: "2025-01-16", effectiveOn: "2027-01-15", complianceOn: "2027-01-15",
      sourceReferenceId: "red3-final-order", complianceSourceReferenceId: "red3-fda-summary" },
  });
  expect(e.affectedUses[0]).toContain("including dietary supplements");
  expect(e.qualifications.find((q) => q.id === "food-scope").text).toContain("outside this food event");
  const records = getLegalEventsForSubstance("erythrosine", "US-federal");
  expect(records).toHaveLength(3);
  expect(records.every((r) => r.action.target === "21 CFR 74.303" && r.useScope.domain === "food")).toBe(true);
  expect(records.some((r) => r.dates.effectiveOn === "2028-01-18" || r.dates.complianceOn === "2028-01-18")).toBe(false);
  expect(getLegalEventsForSubstance("erythrosine", "EU")).toEqual([]);
  expect(Object.isFrozen(records)).toBe(true);
  expect(Object.isFrozen(records[0].useScope)).toBe(true);
});

test("models the automatic stay retrospectively, not with a fabricated February publication", () => {
  const e = event(stayId);
  expect(e.action.type).toBe("administrative-stay");
  expect(e.dates).toMatchObject({ publishedOn: "2026-08-05", effectiveOn: "2025-02-18", complianceOn: null });
  expect(e.dates.effectiveNote).toContain("retrospectively reports");
  expect(e.relationships).toEqual([{ type: "stays", eventId: revocationId, sourceReferenceId: "red3-stay-order" }]);
  expect(e.qualifications.find((q) => q.id === "automatic-stay").text).toContain("701(e)(2) and 721(d)");
  expect(validate(e).valid).toBe(true);
});

test("August order lifts the stay and confirms the original food action instead of replacing its deadline", () => {
  const e = event(liftedId);
  expect(e.action.type).toBe("stay-lifted");
  expect(e.dates).toMatchObject({ publishedOn: "2026-08-05", effectiveOn: "2026-08-05", complianceOn: null });
  expect(e.relationships).toEqual([
    { type: "lifts-stay", eventId: stayId, sourceReferenceId: "red3-stay-order" },
    { type: "confirms", eventId: revocationId, sourceReferenceId: "red3-stay-order" },
  ]);
  expect(e.qualifications.find((q) => q.id === "food-scope").text).toContain("denies hearing requests");
  expect(e.dates.effectiveNote).toContain("food removal remains effective January 15, 2027");
  const registry = createLegalEventRegistry(data);
  expect(registry.getEvent(revocationId).dates.effectiveOn).toBe("2027-01-15");
  expect(registry.getEvent(revocationId).relationships).toEqual([]);
  expect(registry.getEvent(stayId)).toEqual(event(stayId));
});

test("preserves conditional prior certified use without an unconditional sell-through or safety verdict", () => {
  const q = stock(event(revocationId));
  expect(q).toMatchObject({ verificationStatus: "verified", conditions: ["color-used-while-certificate-effective"],
    sourceReferenceId: "red3-final-order" });
  expect(q.text).toContain("by reason of that color use");
  expect(q.text).toContain("not establish other product compliance or an unconditional sale permission");
  expect(q).not.toHaveProperty("productEligible");
  expect(q).not.toHaveProperty("retailRemovalOn");
});

test("resolves exact official order editions and the supporting FDA deadline snapshot with bounded currency", () => {
  const final = getRegulatorySource(event(revocationId).sourceReferences[0]);
  const notice = getRegulatorySource(event(stayId).sourceReferences[0]);
  const summary = getRegulatorySource(event(revocationId).sourceReferences[1]);
  expect([final.sourceId, final.editionId, final.citation.publicationDate]).toEqual([
    "FR:2025-00830", "published-2025-01-16", "2025-01-16"]);
  expect([notice.sourceId, notice.editionId, notice.citation.publicationDate]).toEqual([
    "FR:2026-15920", "published-2026-08-05", "2026-08-05"]);
  expect(final.citation.url).toBe("https://www.govinfo.gov/content/pkg/FR-2025-01-16/pdf/2025-00830.pdf");
  expect(notice.citation.url).toBe("https://www.govinfo.gov/content/pkg/FR-2026-08-05/pdf/2026-15920.pdf");
  expect(notice.verification.evidenceLocator).toContain("V. Summary and Conclusions (50481)");
  expect(summary).toMatchObject({ sourceId: "FDA:Red3", editionId: "snapshot-2026-10-19",
    citation: { publicationDate: null }, verification: { currency: "undetermined" } });
  [final, notice, summary].forEach((source) => {
    expect(source.verification).toMatchObject({ status: "verified", evidenceType: "official-text",
      lastVerifiedOn: "2026-10-19", verifiedThrough: null });
    expect(source.citation.attribution).toBeTruthy();
  });
  expect(final.verification.currency).toBe("historical");
  expect(notice.verification.currency).toBe("historical");
});

test.each([
  ["food scope", (e) => { delete e.useScope; }],
  ["drug scope", (e) => { e.useScope.domain = "ingested-drug"; }],
  ["scope provision mismatch", (e) => { e.useScope.provision = "21 CFR 74.1303"; }],
  ["earlier effective date", (e) => { e.dates.effectiveOn = "2025-01-15"; e.dates.effectiveNote = "A note cannot create retroactive effect."; }],
  ["food deadline before effect", (e) => { e.dates.complianceOn = "2025-01-15"; }],
  ["drug effect with food deadline", (e) => { e.dates.effectiveOn = "2028-01-18"; }],
  ["invalid leap day", (e) => { e.dates.effectiveOn = "2027-02-29"; }],
  ["missing deadline source", (e) => { delete e.dates.complianceSourceReferenceId; }],
  ["dangling deadline source", (e) => { e.dates.complianceSourceReferenceId = "unknown"; }],
  ["unverified qualification", (e) => { stock(e).verificationStatus = "partial"; }],
  ["missing qualification verification", (e) => { delete stock(e).verificationStatus; }],
  ["missing stock condition", (e) => { delete stock(e).conditions; }],
  ["empty stock condition", (e) => { stock(e).conditions = []; }],
  ["guessed stock permission", (e) => { stock(e).conditions = ["made-before-deadline-is-always-lawful"]; }],
  ["additional unverified exception", (e) => { stock(e).conditions.push("animal-feed-exemption"); }],
  ["uncited stock claim", (e) => { stock(e).sourceReferenceId = "unknown"; }],
  ["summary substituted for legal stock condition", (e) => { stock(e).sourceReferenceId = "red3-fda-summary"; }],
  ["unconditional stock flag", (e) => { stock(e).sellThroughPermitted = true; }],
  ["conditions smuggled into ordinary qualification", (e) => { stock(e).kind = "transition"; }],
  ["missing official source", (e) => { e.sourceReferences[0].sourceId = "FR:unknown"; }],
  ["unknown source version", (e) => { e.sourceReferences[0].editionId = "latest"; }],
])("rejects unsupported Red No. 3 claims: %s", (_, change) => {
  const e = event(revocationId);
  change(e);
  expect(validate(e).valid).toBe(false);
});

test.each([stayId, liftedId])("procedural event %s requires exact food scope, date basis and no invented deadline", (id) => {
  const e = event(id);
  delete e.useScope;
  expect(validate(e).valid).toBe(false);
  const noBasis = event(id);
  delete noBasis.dates.effectiveNote;
  expect(validate(noBasis).valid).toBe(false);
  const withDeadline = event(id);
  withDeadline.dates.complianceOn = "2027-01-15";
  expect(validate(withDeadline).errors.join(" ")).toContain("must not create or copy compliance deadlines");
});

test.each([
  [stayId, (e) => { e.relationships = []; }],
  [stayId, (e) => { e.relationships[0].type = "amends"; }],
  [liftedId, (e) => { e.relationships.pop(); }],
  [liftedId, (e) => { e.relationships[0].type = "supersedes"; }],
  [liftedId, (e) => { e.relationships[0].sourceReferenceId = "unknown"; }],
])("rejects incomplete or unsupported procedural links for %s %#", (id, change) => {
  const e = event(id);
  change(e);
  expect(validate(e).valid).toBe(false);
});

test.each([
  [stayId, (e) => { e.dates.effectiveOn = "2024-01-01"; }, "stay cannot begin before"],
  [stayId, (e) => { e.relationships[0].eventId = "unknown"; }, "unresolved relationship target"],
  [stayId, (e) => { e.relationships[0].eventId = liftedId; }, "invalid procedural relationship target action"],
  [liftedId, (e) => { e.relationships[0].eventId = revocationId; }, "invalid procedural relationship target action"],
  [liftedId, (e) => { e.relationships[1].eventId = "us-fda-bvo-2024-revocation"; }, "confirmed action must be the action originally stayed"],
  [liftedId, (e) => { e.affectedUses = ["Ingested drug coloring"]; }, "exact food-use scope"],
  [stayId, (e) => { e.useScope.provision = e.action.target = "21 CFR 74.1303"; }, "exact food-use scope"],
  [stayId, (e) => { e.dates.effectiveOn = "2026-08-06"; }, "stay lifting cannot precede the stay"],
])("rejects inconsistent timeline links for %s %#", (id, change, message) => {
  const manifest = copy(data);
  change(manifest.events.find((e) => e.eventId === id));
  expect(validateLegalEventRegistry(manifest, sourceData).errors.join(" ")).toContain(message);
});

test.each(["partial", "unverified", "unavailable"])("rejects %s official notice evidence", (status) => {
  const sources = copy(sourceData.sources);
  Object.assign(sources.find((s) => s.sourceId === "FR:2026-15920").verification, {
    status, lastVerifiedOn: null, currency: "undetermined", evidenceType: status === "partial" ? "indexed-excerpt" : "none",
  });
  expect(validate(event(liftedId), sources).errors.join(" ")).toContain("verified official-text");
});

test("rejects duplicate/conflicting Red No. 3 events and cycles instead of choosing a current status", () => {
  const manifest = copy(data);
  const duplicate = event(liftedId);
  duplicate.eventId = "duplicate-lift";
  manifest.events.push(duplicate);
  expect(validateLegalEventRegistry(manifest, sourceData).errors.join(" ")).toContain("under different event IDs");
  expect(() => createLegalEventRegistry(manifest)).toThrow("Invalid legal-event registry");
  const cyclic = copy(data);
  cyclic.events.find((e) => e.eventId === revocationId).relationships.push({ type: "supersedes", eventId: liftedId,
    sourceReferenceId: "red3-final-order" });
  expect(validateLegalEventRegistry(cyclic, sourceData).errors.join(" ")).toContain("cyclic event relationships");
});

test("different official editions cannot assert conflicting liftings of the same stay", () => {
  const manifest = copy(data);
  const sources = copy(sourceData);
  const source = copy(sources.sources.find((s) => s.sourceId === "FR:2026-15920"));
  source.sourceId = source.citation.id = "test:another-notice";
  source.editionId = "test-2026-08-06";
  source.citation.publicationDate = source.edition.date = "2026-08-06";
  const e = event(liftedId);
  e.eventId = "test:contradictory-lift";
  e.dates.publishedOn = e.dates.effectiveOn = "2026-08-06";
  e.sourceReferences[0].sourceId = source.sourceId;
  e.sourceReferences[0].editionId = source.editionId;
  manifest.events.push(e);
  sources.sources.push(source);
  expect(validateLegalEventRegistry(manifest, sources).errors.join(" ")).toContain("conflicting stay-lifting records");
});

test("a legacy BVO-only manifest still loads with its original data and dates", () => {
  const manifest = { schemaVersion: 1, referenceVersion: "legal-events-2026-10-19-v1",
    snapshotDate: "2026-10-19", events: [copy(data.events[0])] };
  const registry = createLegalEventRegistry(manifest);
  expect(registry.getEvent("us-fda-bvo-2024-revocation")).toEqual(data.events[0]);
  expect(registry.getEvent("us-fda-bvo-2024-revocation").dates).toMatchObject({
    publishedOn: "2024-07-03", effectiveOn: "2024-08-02", complianceOn: "2025-08-02",
  });
  expect(registry.getEventsForSubstance("erythrosine", "US-federal")).toEqual([]);
});
