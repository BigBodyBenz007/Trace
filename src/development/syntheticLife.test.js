import { deriveLifeCurrent } from "../services/lifeCurrent";
import { deriveLifeCurrentLayout } from "../services/lifeCurrentLayout";
import { resolveTrophySource } from "../services/trophySourceNavigation";
import { generateSyntheticLife, SYNTHETIC_LIFE_SEED, SYNTHETIC_MAJOR_EVENTS } from "./syntheticLife";

function countsByMonth(memories) {
  return memories.reduce((counts, memory) => {
    const key = memory.date.slice(0, 7);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

let dataset;

beforeAll(() => {
  dataset = generateSyntheticLife();
});

test("generation is deterministic with stable unique IDs and configured bounds", () => {
  const first = dataset;
  const second = generateSyntheticLife();
  expect(first.seed).toBe(SYNTHETIC_LIFE_SEED);
  expect(first.memories.map(({ id }) => id)).toEqual(second.memories.map(({ id }) => id));
  expect(first.workoutEntries).toEqual(second.workoutEntries);
  expect(first.trophyCaseEntries).toEqual(second.trophyCaseEntries);
  expect(new Set(first.memories.map(({ id }) => id)).size).toBe(first.memories.length);
  expect(first.memories[0].date.startsWith("1996")).toBe(true);
  expect(first.memories[first.memories.length - 1].date.startsWith("2026")).toBe(true);
});

test("creates a nonuniform 600–900 Memory biography with quiet and dense months", () => {
  const { memories } = dataset;
  expect(memories.length).toBeGreaterThanOrEqual(600);
  expect(memories.length).toBeLessThanOrEqual(900);
  const counts = countsByMonth(memories);
  expect([...counts.values()].some((count) => count >= 10)).toBe(true);
  expect(counts.size).toBeLessThan(31 * 12 - 4);
  expect(SYNTHETIC_MAJOR_EVENTS.every((event) =>
    memories.some((memory) => memory.title === event.title && memory.date === event.date)
  )).toBe(true);
});

test("photo metadata includes realistic variation and bounded deterministic stress cases", () => {
  const { memories, metrics } = dataset;
  const counts = memories.map(({ images }) => images.length);
  expect(counts).toContain(0);
  expect(counts).toContain(1);
  expect(counts.some((count) => count >= 20)).toBe(true);
  expect(counts.some((count) => count >= 50)).toBe(true);
  expect(metrics.photoCount).toBe(counts.reduce((sum, count) => sum + count, 0));
  const reunion = memories.find(({ title }) => title === "Ellison family reunion");
  expect(reunion.images).toHaveLength(64);
  expect(reunion.images[0].url.startsWith("data:image/svg+xml,")).toBe(true);
});

test("workouts contain distinct training eras, long gaps, and within-era progression", () => {
  const { workoutEntries } = dataset;
  expect(workoutEntries.length).toBeGreaterThan(300);
  const years = new Set(workoutEntries.map(({ occurredAt }) => occurredAt.slice(0, 4)));
  expect(years.has("2005")).toBe(false);
  expect(years.has("2015")).toBe(false);
  expect(years.has("2020")).toBe(false);
  const firstEra = workoutEntries.filter(({ occurredAt }) => occurredAt.startsWith("2002"));
  expect(firstEra[firstEra.length - 1].exercises[0].sets[0].load.amount)
    .toBeGreaterThan(firstEra[0].exercises[0].sets[0].load.amount);
  expect(new Set(workoutEntries.map(({ id }) => id)).size).toBe(workoutEntries.length);
});

test("Trophies remain limited and curated across Memory and workout sources", () => {
  const { trophyCaseEntries } = dataset;
  expect(trophyCaseEntries.length).toBeGreaterThanOrEqual(15);
  expect(trophyCaseEntries.length).toBeLessThanOrEqual(30);
  expect(trophyCaseEntries.some(({ sourceType }) => sourceType === "memory")).toBe(true);
  expect(trophyCaseEntries.some(({ sourceType }) => sourceType === "workout-pr")).toBe(true);
  trophyCaseEntries.forEach((entry) => {
    expect(resolveTrophySource(entry, {
      memories: dataset.memories,
      workouts: dataset.workoutEntries,
    })).not.toBeNull();
  });
});

test("nutrition and medication data occur in selected logging eras only", () => {
  expect(dataset.nutritionEntries.length).toBe(146);
  expect(new Set(dataset.nutritionEntries.map(({ loggedAt }) => loggedAt.slice(0, 4))))
    .toEqual(new Set(["2019", "2024"]));
  expect(dataset.medicationEntries.length).toBe(94);
  expect(new Set(dataset.medicationEntries.map(({ occurredAt }) => occurredAt.slice(0, 4))))
    .toEqual(new Set(["2015", "2025"]));
  expect(dataset.protocols).toEqual([]);
});

test("generated sources work with Life Current and layout without ground-truth input", () => {
  const current = deriveLifeCurrent(dataset);
  const layout = deriveLifeCurrentLayout(current);
  expect(current.days.length).toBeGreaterThan(500);
  expect(layout.points).toHaveLength(current.days.length);
  expect(current.bounds.earliestDateKey.startsWith("1996")).toBe(true);
  expect(current.bounds.latestDateKey.startsWith("2026")).toBe(true);
  expect(dataset).not.toHaveProperty("groundTruth");
  expect(JSON.stringify(dataset)).not.toMatch(/thriving|struggling|grieving|emotional/i);
});

test("generation does not mutate supplied application data or browser storage", () => {
  localStorage.setItem("memories", JSON.stringify([{ id: "real-memory" }]));
  const before = localStorage.getItem("memories");
  const generated = generateSyntheticLife();
  generated.memories.pop();
  expect(localStorage.getItem("memories")).toBe(before);
  expect(JSON.parse(before)).toEqual([{ id: "real-memory" }]);
});

test("representative synthetic Memories retain bounded Timeline photo previews", () => {
  const stressMemory = dataset.memories.find(({ images }) => images.length >= 50);
  expect(stressMemory).toBeTruthy();
  expect(stressMemory.images.slice(0, 3)).toHaveLength(3);
  expect(stressMemory.images.length - 3).toBeGreaterThan(0);
});
