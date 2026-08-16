import { formatDateOnly, parseDateOnlyLocal } from "./dateOnly";

test.each([
  ["2007-04-17", 2007, 3, 17],
  ["2000-01-01", 2000, 0, 1],
  ["1999-12-31", 1999, 11, 31],
])("parses %s as a local calendar date", (value, year, month, day) => {
  const date = parseDateOnlyLocal(value);
  expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([year, month, day]);
});

test("rejects invalid date-only values", () => {
  expect(parseDateOnlyLocal("2007-04-31")).toBeNull();
  expect(formatDateOnly("2007-04-17")).toBe("April 17, 2007");
});
