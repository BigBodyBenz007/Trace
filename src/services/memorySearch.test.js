import { getMemoryDateSearchTokens, matchesMemorySearch } from "./memorySearch";

const memory = {
  id: "dated",
  title: "A neutral title",
  description: "Nothing here contains a calendar value",
  date: "2026-06-12",
  categories: ["Family"],
};

test.each([
  "June",
  "jun",
  "2026",
  "June 2026",
  "Jun 2026",
  "June 12",
  "June 12 2026",
  "June 12, 2026",
  "Jun 12, 2026",
  "6/12/2026",
  "06/12/2026",
  "2026-06-12",
])("matches authoritative local date using %s", (query) => {
  expect(matchesMemorySearch(memory, query)).toBe(true);
});

test("preserves text, body, category, and tag matching", () => {
  expect(matchesMemorySearch(memory, "neutral")).toBe(true);
  expect(matchesMemorySearch(memory, "nothing here")).toBe(true);
  expect(matchesMemorySearch(memory, "family")).toBe(true);
  expect(matchesMemorySearch({ body: "Legacy body", tags: ["Road Trip"] }, "road trip"))
    .toBe(true);
});

test("does not shift local calendar dates through UTC conversion", () => {
  const tokens = getMemoryDateSearchTokens("2026-01-01");
  expect(tokens).toContain("January 1, 2026");
  expect(tokens).not.toContain("December 31, 2025");
});

test("rejects malformed dates and unrelated date queries", () => {
  expect(getMemoryDateSearchTokens("2026-02-30")).toEqual([]);
  expect(matchesMemorySearch(memory, "July 2026")).toBe(false);
  expect(matchesMemorySearch(memory, "2025")).toBe(false);
});
