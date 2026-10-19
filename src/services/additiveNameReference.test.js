import { ADDITIVE_NAME_REFERENCE, resolveAdditiveName, getAdditiveNameSource } from "./additiveNameReference";

// Expected associations transcribed from the eight cited Annex headings,
// independent of the lookup implementation. Additions require source review.
test.each([
  ["E150d", "Sulphite ammonia caramel", "E 150d"],
  ["E202", "Potassium sorbate", "E 202"],
  ["E211", "Sodium benzoate", "E 211"],
  ["E300", "Ascorbic acid", "E 300"],
  ["E322", "Lecithins", "E 322"],
  ["E330", "Citric acid", "E 330"],
  ["E415", "Xanthan gum", "E 415"],
  ["E500ii", "Sodium hydrogen carbonate", "E 500 (ii)"],
])("%s resolves only to its cited EU name", (identifier, name, sourceIdentifier) => {
  const resolved = resolveAdditiveName(identifier);
  expect(resolved).toEqual({ name, nameReference: {
    verification: "exact-source-name", referenceVersion: "eu-231-2012-names-v1",
    sourceId: "CELEX:32012R0231", sourcePublicationDate: "2012-03-22",
    sourceIdentifier, jurisdiction: "EU", language: "en",
  } });
  expect(Object.isFrozen(resolved)).toBe(true);
  expect(Object.isFrozen(resolved.nameReference)).toBe(true);
  expect(getAdditiveNameSource(resolved.nameReference)).toBe(ADDITIVE_NAME_REFERENCE.source);
});

test.each([undefined, null, 330, {}, "", "E9999", "E500", "E500i", "E150", "E150a",
  "en:e330", "e330", "E 330", "330", "77-92-9", "citric acid", "constructor", "__proto__",
])("does not infer a name or a parent/subtype/cross-jurisdiction match for %p", (identifier) => {
  expect(resolveAdditiveName(identifier)).toBeNull();
});

test("the immutable local edition retains attribution, original wording, reuse terms, and scope", () => {
  const { source, entries } = ADDITIVE_NAME_REFERENCE;
  expect(entries).toHaveLength(8);
  expect(new Set(entries.map((entry) => entry.identifier)).size).toBe(8);
  expect(source).toMatchObject({
    publisher: "European Commission", jurisdiction: "EU", publicationDate: "2012-03-22",
    version: "Original Official Journal publication, OJ L 83, 22 March 2012",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32012R0231",
  });
  expect(source.attribution).toContain("European Union");
  expect(source.reuseBasis).toContain("2011/833/EU");
  expect(source.reuseNoticeUrl).toBe("https://eur-lex.europa.eu/content/legal-notice/legal-notice.html");
  expect(source.scope).toContain("no current authorization");
  expect(entries.find((entry) => entry.identifier === "E500ii").sourceHeading)
    .toBe("E 500 (ii) SODIUM HYDROGEN CARBONATE");
  expect(Object.isFrozen(entries[0])).toBe(true);
  expect(Object.isFrozen(source)).toBe(true);
  expect(getAdditiveNameSource({ sourceId: source.id, referenceVersion: "unreviewed-v2" })).toBeNull();
  expect(getAdditiveNameSource(null)).toBeNull();
});
