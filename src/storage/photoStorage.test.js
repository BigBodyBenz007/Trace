import {
  createLegacyMigrationPlan,
  dataUrlToBlob,
  hasLegacyPhotos,
} from "./photoStorage";

test("converts base64 data URLs to binary blobs", () => {
  const blob = dataUrlToBlob("data:text/plain;base64,SGVsbG8=");

  expect(blob.type).toBe("text/plain");
  expect(blob.size).toBe(5);
});

test("creates stable photo references without mutating legacy memories", () => {
  const legacyPhoto = "data:image/png;base64,AA==";
  const memories = [
    {
      id: "memory-1",
      title: "Existing memory",
      images: [legacyPhoto, legacyPhoto],
    },
  ];

  const plan = createLegacyMigrationPlan(memories);

  expect(plan.compactMemories[0].images).toEqual([
    "legacy:memory-1:0",
    "legacy:memory-1:1",
  ]);
  expect(plan.photos.map((photo) => photo.id)).toEqual([
    "legacy:memory-1:0",
    "legacy:memory-1:1",
  ]);
  expect(memories[0].images).toEqual([legacyPhoto, legacyPhoto]);
});

test("detects legacy photos and rejects malformed data URLs", () => {
  expect(
    hasLegacyPhotos([{ id: "memory-1", images: ["data:image/jpeg;base64,AA=="] }])
  ).toBe(true);
  expect(hasLegacyPhotos([{ id: "memory-1", images: ["photo-id"] }])).toBe(
    false
  );
  expect(() => dataUrlToBlob("not-a-data-url")).toThrow(
    "A legacy photo has an invalid data URL."
  );
});
