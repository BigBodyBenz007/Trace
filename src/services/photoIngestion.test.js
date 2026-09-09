import {
  ingestPhotoFiles,
  PHOTO_INGESTION_POLICY,
  PhotoIngestionError,
} from "./photoIngestion";

function policy(overrides = {}) {
  return { ...PHOTO_INGESTION_POLICY, ...overrides };
}

function imageEnvironment({ width = 1600, height = 1200, renderImage } = {}) {
  const close = jest.fn();
  const decodeImage = jest.fn(async () => ({ source: { decoded: true }, width, height, close }));
  return {
    environment: {
      decodeImage,
      renderImage: renderImage || jest.fn(async ({ type }) => new Blob(["optimized"], { type })),
    },
    decodeImage,
    close,
  };
}

test("a valid small JPEG remains the exact original File byte-for-byte", async () => {
  const original = new File([new Uint8Array([1, 2, 3, 4])], "memory.jpg", { type: "image/jpeg" });
  const { environment, decodeImage, close } = imageEnvironment();

  const result = await ingestPhotoFiles([original], { imageEnvironment: environment });

  expect(result.photos[0].blob).toBe(original);
  expect(result.photos[0]).toMatchObject({ optimized: false, storedBytes: 4 });
  expect(decodeImage).toHaveBeenCalledWith(original, { imageOrientation: "from-image" });
  expect(close).toHaveBeenCalledTimes(1);
});

test("an oversized oriented JPEG is reduced without upscaling", async () => {
  const original = new File(["123456789"], "portrait.jpg", { type: "image/jpeg" });
  const renderImage = jest.fn(async ({ type }) => new Blob(["small"], { type }));
  const { environment } = imageEnvironment({ width: 6000, height: 4000, renderImage });

  const result = await ingestPhotoFiles([original], {
    imageEnvironment: environment,
    policy: policy({
      optimizeAboveBytes: 5,
      maxInputBytesPerPhoto: 20,
      maxInputBytesPerSelection: 20,
      maxStoredBytesPerPhoto: 10,
      maxStoredBytesPerSelection: 20,
      maxLongEdgePixels: 4096,
    }),
  });

  expect(result.photos[0].blob).not.toBe(original);
  expect(result.photos[0]).toMatchObject({
    optimized: true,
    width: 4096,
    height: 2731,
    storedBytes: 5,
  });
  expect(renderImage).toHaveBeenCalledWith(expect.objectContaining({
    width: 4096,
    height: 2731,
    type: "image/jpeg",
    quality: 0.9,
  }));
});

test.each([
  ["image/png", "transparent.png"],
  ["image/webp", "transparent.webp"],
])("oversized %s keeps an alpha-capable output type", async (type, name) => {
  const original = new File(["oversized"], name, { type });
  const renderImage = jest.fn(async ({ type: outputType }) => new Blob(["safe"], { type: outputType }));
  const { environment } = imageEnvironment({ width: 5000, height: 3000, renderImage });
  const result = await ingestPhotoFiles([original], {
    imageEnvironment: environment,
    policy: policy({
      optimizeAboveBytes: 5,
      maxInputBytesPerPhoto: 20,
      maxInputBytesPerSelection: 20,
      maxStoredBytesPerPhoto: 10,
      maxStoredBytesPerSelection: 20,
    }),
  });

  expect(result.photos[0].blob.type).toBe(type);
  expect(renderImage).toHaveBeenCalledWith(expect.objectContaining({ type }));
});

test("a corrupt file fails the complete selection without returning partial prepared photos", async () => {
  const files = [
    new File(["good"], "good.jpg", { type: "image/jpeg" }),
    new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
  ];
  const decodeImage = jest.fn(async (file) => {
    if (file.name === "bad.jpg") throw new Error("decoder rejected bytes");
    return { source: {}, width: 100, height: 100, close: jest.fn() };
  });

  await expect(ingestPhotoFiles(files, { imageEnvironment: { decodeImage } })).rejects.toMatchObject({
    code: "photo-decode-failed",
    message: expect.stringMatching(/bad\.jpg.*could not be decoded/i),
  });
});

test("count, per-file, raw-selection, and prepared-selection limits reject instead of truncating", async () => {
  const { environment } = imageEnvironment();
  const tinyPolicy = policy({
    maxPhotosPerEntry: 2,
    maxInputBytesPerPhoto: 5,
    maxInputBytesPerSelection: 8,
    optimizeAboveBytes: 2,
    maxStoredBytesPerPhoto: 4,
    maxStoredBytesPerSelection: 6,
  });
  await expect(ingestPhotoFiles([new File(["x"], "x.jpg", { type: "image/jpeg" })], {
    existingCount: 2,
    policy: tinyPolicy,
    imageEnvironment: environment,
  })).rejects.toMatchObject({ code: "photo-count-limit" });
  await expect(ingestPhotoFiles([new File(["123456"], "large.jpg", { type: "image/jpeg" })], {
    policy: tinyPolicy,
    imageEnvironment: environment,
  })).rejects.toMatchObject({ code: "input-photo-too-large" });
  await expect(ingestPhotoFiles([
    new File(["1234"], "one.jpg", { type: "image/jpeg" }),
    new File(["5678"], "two.jpg", { type: "image/jpeg" }),
    new File(["9"], "three.jpg", { type: "image/jpeg" }),
  ], {
    policy: { ...tinyPolicy, maxPhotosPerEntry: 3 },
    imageEnvironment: environment,
  })).rejects.toMatchObject({ code: "input-selection-too-large" });

  const outputEnvironment = imageEnvironment({
    renderImage: jest.fn(async ({ type }) => new Blob(["1234"], { type })),
  }).environment;
  await expect(ingestPhotoFiles([
    new File(["123"], "one.jpg", { type: "image/jpeg" }),
    new File(["456"], "two.jpg", { type: "image/jpeg" }),
  ], {
    existingDraftBytes: 1,
    policy: { ...tinyPolicy, maxInputBytesPerSelection: 20 },
    imageEnvironment: outputEnvironment,
  })).rejects.toMatchObject({ code: "stored-selection-too-large" });
});

test("unsupported input fails with an actionable typed error", async () => {
  await expect(ingestPhotoFiles([new File(["text"], "notes.txt", { type: "text/plain" })]))
    .rejects.toBeInstanceOf(PhotoIngestionError);
});
