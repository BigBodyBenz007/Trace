import { createCompoundDefinition } from "./compoundCatalog";
import {
  DEFAULT_COMPOUND_RESULT_LIMIT,
  searchCompounds,
  searchUnifiedCompounds,
} from "./compoundSearch";

function compound(name) {
  return createCompoundDefinition({
    name,
    defaultDoseAmount: "",
    doseUnit: "mg",
    route: "oral",
  });
}

test("normalizes search and ranks prefixes before alphabetical substrings", () => {
  const compounds = [
    compound("Alpha SS-31"),
    compound("SS-31 Beta"),
    compound("SS-31 Alpha"),
  ];

  expect(searchCompounds("  ss-31  ", compounds).map(({ name }) => name)).toEqual([
    "SS-31 Alpha",
    "SS-31 Beta",
    "Alpha SS-31",
  ]);
});

test("returns no results for empty or meaningless input", () => {
  expect(searchCompounds("", [compound("SS-31")])).toEqual([]);
  expect(searchCompounds("---", [compound("SS-31")])).toEqual([]);
});

test("limits visible results", () => {
  const compounds = Array.from({ length: 10 }, (_, index) =>
    compound(`Compound ${index}`)
  );

  expect(searchCompounds("compound", compounds)).toHaveLength(
    DEFAULT_COMPOUND_RESULT_LIMIT
  );
  expect(searchCompounds("compound", compounds, 2)).toHaveLength(2);
});

function builtIn(id, name, aliases = []) {
  return {
    id: `trace:compound:${id}`,
    schemaVersion: 1,
    name,
    aliases,
    category: "other",
    provenance: { source: "trace-catalog", sourceId: `trace:compound:${id}` },
  };
}

test("unified search ranks canonical and alias match types in the required order", () => {
  const builtIns = [
    builtIn("alias-substring", "Zulu", ["X target Y"]),
    builtIn("canonical-substring", "X target Y", []),
    builtIn("alias-prefix", "Echo", ["Target alias"]),
    builtIn("canonical-prefix", "Target canonical", []),
    builtIn("alias-exact", "Bravo", ["Target"]),
    builtIn("canonical-exact", "Target", []),
  ];

  expect(
    searchUnifiedCompounds("  TARGET ", [], builtIns).map(
      ({ compound: item, matchedAlias }) => [item.id, matchedAlias]
    )
  ).toEqual([
    ["trace:compound:canonical-exact", null],
    ["trace:compound:alias-exact", "Target"],
    ["trace:compound:canonical-prefix", null],
    ["trace:compound:alias-prefix", "Target alias"],
    ["trace:compound:canonical-substring", null],
    ["trace:compound:alias-substring", "X target Y"],
  ]);
});

test("saved results always precede same-name built-ins and remain distinct", () => {
  const saved = compound("Retatrutide");
  const trace = builtIn("retatrutide", "Retatrutide", ["LY3437943"]);
  const results = searchUnifiedCompounds("retatrutide", [saved], [trace]);

  expect(results.map(({ source }) => source)).toEqual(["saved", "trace-catalog"]);
  expect(results.map(({ compound: item }) => item)).toEqual([saved, trace]);
});

test("uses canonical name then stable id for deterministic ties", () => {
  const results = searchUnifiedCompounds("same", [], [
    builtIn("z", "Same Name"),
    builtIn("a", "Same Name"),
  ]);
  expect(results.map(({ compound: item }) => item.id)).toEqual([
    "trace:compound:a",
    "trace:compound:z",
  ]);
});

test("limits each source independently so built-ins cannot hide saved matches", () => {
  const saved = Array.from({ length: 4 }, (_, index) => compound(`Match Saved ${index}`));
  const builtIns = Array.from({ length: 4 }, (_, index) =>
    builtIn(`match-${index}`, `Match Trace ${index}`)
  );
  const results = searchUnifiedCompounds("match", saved, builtIns, 2);

  expect(results.filter(({ source }) => source === "saved")).toHaveLength(2);
  expect(results.filter(({ source }) => source === "trace-catalog")).toHaveLength(2);
});

test("unified search is immutable and rejects empty or meaningless queries", () => {
  const saved = [compound("Saved")];
  const builtIns = [builtIn("trace", "Trace")];
  const savedSnapshot = JSON.parse(JSON.stringify(saved));
  const builtInSnapshot = JSON.parse(JSON.stringify(builtIns));

  expect(searchUnifiedCompounds("", saved, builtIns)).toEqual([]);
  expect(searchUnifiedCompounds("---", saved, builtIns)).toEqual([]);
  searchUnifiedCompounds("a", saved, builtIns);
  expect(saved).toEqual(savedSnapshot);
  expect(builtIns).toEqual(builtInSnapshot);
});
