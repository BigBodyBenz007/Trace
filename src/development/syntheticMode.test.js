import { shouldLoadSyntheticLife } from "./syntheticMode";

test("normal startup never enables synthetic history", () => {
  expect(shouldLoadSyntheticLife("development", "")).toBe(false);
  expect(shouldLoadSyntheticLife("development", "?other=1")).toBe(false);
  expect(shouldLoadSyntheticLife("production", "?syntheticLife=1")).toBe(false);
});

test("only an explicit development query enables synthetic history", () => {
  expect(shouldLoadSyntheticLife("development", "?syntheticLife=1")).toBe(true);
});
