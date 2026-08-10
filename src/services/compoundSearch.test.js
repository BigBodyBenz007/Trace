import { createCompoundDefinition } from "./compoundCatalog";
import {
  DEFAULT_COMPOUND_RESULT_LIMIT,
  searchCompounds,
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
