import data from "../data/regulatoryLegalEvents.json";
import sources from "../data/regulatorySourceRegistry";
import { getRegulatorySource } from "./regulatorySourceRegistry";
import { createLegalEventRegistry, getLegalEvent, getLegalEventsForSubstance } from "./regulatoryLegalEvents";
import { validateLegalEvent, validateLegalEventRegistry } from "./regulatoryLegalEventValidation";
import { ADDITIVE_NAME_REFERENCE, resolveAdditiveName } from "./additiveNameReference";

const copy = (v) => JSON.parse(JSON.stringify(v));
const id = "eu-ec-e171-food-2022-withdrawal";
const e171 = () => copy(data.events.find((e) => e.eventId === id));
const validate = (e, sourceRecords = sources.sources) => validateLegalEvent(e, sourceRecords, { asOf: data.snapshotDate });

test("records the verified EU act's publication and entry into force separately from conditional market placement", () => {
  expect(validateLegalEventRegistry(data, sources)).toEqual({ valid: true, errors: [] });
  const e = e171();
  expect(e).toMatchObject({ jurisdiction: "EU", authority: "European Commission",
    action: { type: "authorization-revocation", stage: "final" }, useScope: { domain: "food" },
    dates: { publishedOn: "2022-01-18", effectiveOn: "2022-02-07", complianceOn: null },
    marketTransition: { productionRulesBefore: "2022-02-07", placementUntil: "2022-08-07",
      stockEndBasis: "product-minimum-durability-or-use-by", verificationStatus: "verified", sourceReferenceId: "e171-withdrawal" },
  });
  expect(e.dates.effectiveNote).toContain("twentieth day");
  expect(e.affectedUses[0]).toContain("Parts D and E");
  expect(e.affectedUses.some((s) => s.includes("04.2.4.1"))).toBe(true);
  expect(e.affectedUses.some((s) => s.includes("09.2"))).toBe(true);
  expect(e.qualifications.find((q) => q.id === "medicinal-context").text).toContain("do not reinstate food use");
});

test("preserves the prior-rules condition rather than inventing a manufacture-before cutoff or universal stock date", () => {
  const e = e171();
  const transition = e.qualifications.find((q) => q.id === "conditional-market-transition");
  expect(transition.text).toContain("not a requirement that manufacture occurred before February 7");
  expect(e.marketTransition).not.toHaveProperty("manufacturedBefore");
  expect(e.marketTransition).not.toHaveProperty("stockUntil");
  expect(e.marketTransition).not.toHaveProperty("sellThroughPermitted");
  const stock = e.qualifications.find((q) => q.id === "finished-food-stock");
  expect(stock.sourceReferenceId).toBe("e171-commission");
  expect(stock.text).toContain("without further transformation");
  expect(stock.text).toContain("No unconditional stock permission or product eligibility");
});

test("keeps cited local identity metadata separate from the eight additive-name mappings and provider presence", () => {
  expect(e171().substance).toEqual({ id: "titanium-dioxide", name: "Titanium dioxide",
    identifiers: [{ scheme: "EU-E-number", value: "E171" }], synonyms: ["TiO2"], sourceReferenceId: "e171-commission" });
  expect(ADDITIVE_NAME_REFERENCE.entries).toHaveLength(8);
  expect(resolveAdditiveName("E171")).toBeNull();
  expect(getLegalEventsForSubstance("titanium-dioxide", "US-federal")).toEqual([]);
  expect(getLegalEventsForSubstance("unknown", "EU")).toEqual([]);
  expect(Object.isFrozen(getLegalEvent(id).marketTransition)).toBe(true);
  expect(Object.isFrozen(getLegalEvent(id).substance.identifiers[0])).toBe(true);
});

test("binds the original act and supporting Commission snapshot, with EFSA retained separately as dated science", () => {
  const e = e171();
  const act = getRegulatorySource(e.sourceReferences[0]);
  const summary = getRegulatorySource(e.sourceReferences[1]);
  expect(act).toMatchObject({ sourceId: "CELEX:32022R0063", editionId: "original-2022-01-18",
    citation: { publisher: "European Commission", jurisdiction: "EU", publicationDate: "2022-01-18",
      url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R0063" },
    verification: { status: "verified", currency: "historical", lastVerifiedOn: "2026-10-19", verifiedThrough: null } });
  expect(e.sourceReferences[0].provisions).toContain("Articles 1-4");
  expect(act.citation.attribution).toBeTruthy();
  expect(summary).toMatchObject({ sourceId: "EC:FoodAdditiveReevaluation", editionId: "snapshot-2026-10-19",
    citation: { publicationDate: null }, verification: { status: "verified", currency: "undetermined" } });
  const science = getRegulatorySource({ sourceId: "DOI:10.2903/j.efsa.2021.6585", editionId: "published-2021-05-06" });
  expect(science).toMatchObject({ documentType: "scientific-assessment", citation: { publicationDate: "2021-05-06" },
    verification: { status: "verified", currency: "historical" } });
  expect(science.verification.evidenceLocator).toContain("section 7");
  expect(science.verification.evidenceLocator).toContain("25 March 2021");
  expect(e.sourceReferences.some((ref) => ref.sourceId === science.sourceId)).toBe(false);
  expect(sources.sources.some((s) => s.verification.currency === "current-as-of")).toBe(false);
  expect(e.evidence.limitations.join(" ")).toContain("coverage remain unverified");
});

test.each([
  ["missing rules cutoff", (e) => { delete e.marketTransition.productionRulesBefore; }],
  ["contradictory prior rules", (e) => { e.marketTransition.productionRulesBefore = "2022-02-08"; }],
  ["missing market deadline", (e) => { delete e.marketTransition.placementUntil; }],
  ["market deadline before entry", (e) => { e.marketTransition.placementUntil = "2022-02-06"; }],
  ["unsupported stock basis", (e) => { e.marketTransition.stockEndBasis = "unlimited-sale"; }],
  ["missing stock basis", (e) => { delete e.marketTransition.stockEndBasis; }],
  ["invented stock date", (e) => { e.marketTransition.stockUntil = "2022-08-07"; }],
  ["invented production cutoff", (e) => { e.marketTransition.manufacturedBefore = "2022-02-07"; }],
  ["unconditional sale flag", (e) => { e.marketTransition.sellThroughPermitted = true; }],
  ["unverified conditions", (e) => { e.marketTransition.verificationStatus = "unverified"; }],
  ["missing condition verification", (e) => { delete e.marketTransition.verificationStatus; }],
  ["uncited transition", (e) => { delete e.marketTransition.sourceReferenceId; }],
  ["summary substituted for law", (e) => { e.marketTransition.sourceReferenceId = "e171-commission"; }],
  ["general compliance conflation", (e) => { e.dates.complianceOn = "2022-08-07"; e.dates.complianceSourceReferenceId = "e171-withdrawal"; }],
  ["missing transition qualification", (e) => { e.qualifications = e.qualifications.filter((q) => q.kind !== "transition"); }],
  ["missing food scope", (e) => { delete e.useScope; }],
  ["wrong jurisdiction", (e) => { e.jurisdiction = "US-federal"; }],
  ["unsupported action", (e) => { e.action.type = "food-is-unsafe"; }],
  ["missing primary source", (e) => { e.sourceReferences.shift(); }],
  ["unrecognized source edition", (e) => { e.sourceReferences[0].editionId = "latest"; }],
  ["uncited identity", (e) => { delete e.substance.sourceReferenceId; }],
  ["unrecognized identity reference", (e) => { e.substance.sourceReferenceId = "unknown"; }],
  ["missing identifiers", (e) => { delete e.substance.identifiers; }],
  ["empty identifiers", (e) => { e.substance.identifiers = []; }],
  ["unsupported identifier scheme", (e) => { e.substance.identifiers[0].scheme = "guessed-CAS"; }],
  ["malformed identifier", (e) => { e.substance.identifiers[0].value = "171"; }],
  ["duplicate identifier", (e) => { e.substance.identifiers.push(copy(e.substance.identifiers[0])); }],
  ["missing synonym state", (e) => { delete e.substance.synonyms; }],
  ["duplicate synonym", (e) => { e.substance.synonyms.push("TiO2"); }],
  ["blank synonym", (e) => { e.substance.synonyms = [" "]; }],
  ["science date substituted for effect", (e) => { e.dates.effectiveOn = "2021-05-06"; }],
  ["science date inside legal schema", (e) => { e.dates.scientificAssessmentOn = "2021-03-25"; }],
  ["product safety claim", (e) => { e.safe = false; }],
])("rejects unsupported E171 claims: %s", (_, change) => {
  const e = e171();
  change(e);
  expect(validate(e).valid).toBe(false);
});

test.each([null, "2022-02-29", "2022-8-07", "2022-08-07T00:00:00Z", 20220807])(
  "rejects invalid market-placement dates without substituting another deadline: %p", (date) => {
    const e = e171();
    e.marketTransition.placementUntil = date;
    expect(validate(e).valid).toBe(false);
  }
);

test("scientific evidence cannot be substituted for primary or supporting legal evidence", () => {
  const e = e171();
  e.sourceReferences.push({ referenceId: "science", role: "supporting", sourceId: "DOI:10.2903/j.efsa.2021.6585",
    editionId: "published-2021-05-06", provisions: ["Section 7"] });
  expect(validate(e).errors.join(" ")).toContain("not a proposal or scientific assessment");
});

test.each(["partial", "unverified", "unavailable"])("does not promote a %s withdrawal source", (status) => {
  const records = copy(sources.sources);
  const act = records.find((s) => s.sourceId === "CELEX:32022R0063");
  Object.assign(act.verification, { status, currency: "undetermined", lastVerifiedOn: null,
    evidenceType: status === "partial" ? "indexed-excerpt" : "none" });
  expect(validate(e171(), records).valid).toBe(false);
});

test("duplicate events and cyclic supersession are rejected instead of selecting a current verdict", () => {
  const manifest = copy(data);
  manifest.events.push({ ...e171(), eventId: "duplicate-e171" });
  expect(validateLegalEventRegistry(manifest, sources).errors.join(" ")).toContain("under different event IDs");
  const cycle = e171();
  cycle.relationships = [{ type: "supersedes", eventId: id, sourceReferenceId: "e171-withdrawal" }];
  manifest.events = [cycle];
  expect(validateLegalEventRegistry(manifest, sources).errors.join(" ")).toContain("cyclic event relationships");
  expect(() => createLegalEventRegistry(manifest)).toThrow("Invalid legal-event registry");
});

test("original US-only bundles remain loadable without identity or market-transition fields", () => {
  const us = data.events.filter((e) => e.jurisdiction === "US-federal");
  expect(us).toHaveLength(4);
  const registry = createLegalEventRegistry({ ...copy(data), referenceVersion: "legal-events-2026-10-19-v2", events: copy(us) });
  expect(registry.getEventsForSubstance("titanium-dioxide", "EU")).toEqual([]);
  expect(registry.getEvent("us-fda-bvo-2024-revocation").dates.complianceOn).toBe("2025-08-02");
  expect(registry.getEvent("us-fda-red3-food-2025-revocation").dates).toMatchObject({
    effectiveOn: "2027-01-15", complianceOn: "2027-01-15",
  });
  expect(registry.getEvent("us-fda-red3-food-2026-stay-lifted").action.type).toBe("stay-lifted");
});
