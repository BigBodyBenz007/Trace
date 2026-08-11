import { detectMemoryAchievement } from "./memoryAchievement";

test.each([
  ["After four years of night classes, I finally graduated today.", "education-milestone"],
  ["Finished my first marathon this morning.", "meaningful-goal-context"],
  ["Finished my first 5K today after training for three months.", "sustained-effort-context"],
  ["I hit a new personal best on bench press today: 225.", "explicit-personal-best"],
  ["After two years of work, I completed and published my first novel.", "completion-language"],
])("qualifies a high-confidence achievement: %s", (description, signal) => {
  const result = detectMemoryAchievement({ description });
  expect(result).toMatchObject({ isLikelyAchievement: true, confidence: "high" });
  expect(result.signals).toContain(signal);
});

test.each([
  "I finally went to the store.",
  "My phone finally broke.",
  "My car finally died.",
  "First thing I did was take a shower.",
  "First stop was Walmart.",
  "Won't finish this until tomorrow.",
  "I'm proud of my son for cleaning his room.",
])("does not qualify ambiguous or negative language: %s", (description) => {
  expect(detectMemoryAchievement({ description }).isLikelyAchievement).toBe(false);
});

test("returns medium confidence internally without marking it likely", () => {
  expect(detectMemoryAchievement({ description: "I finished a project today." })).toMatchObject({
    isLikelyAchievement: false,
    confidence: "medium",
  });
});
