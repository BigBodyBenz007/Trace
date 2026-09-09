export const MEBIBYTE = 1024 * 1024;

// New-photo policy only. Existing IndexedDB photos and legacy migrations are never re-encoded.
export const PHOTO_INGESTION_POLICY = Object.freeze({
  maxPhotosPerEntry: 12,
  optimizeAboveBytes: 6 * MEBIBYTE,
  maxInputBytesPerPhoto: 30 * MEBIBYTE,
  maxInputBytesPerSelection: 90 * MEBIBYTE,
  maxStoredBytesPerPhoto: 10 * MEBIBYTE,
  maxStoredBytesPerSelection: 48 * MEBIBYTE,
  maxLongEdgePixels: 4096,
  lossyQuality: 0.9,
  maxResizeAttempts: 6,
});

export class PhotoIngestionError extends Error {
  constructor(message, code = "photo-ingestion-failed") {
    super(message);
    this.name = "PhotoIngestionError";
    this.code = code;
  }
}

function bytesLabel(bytes) {
  const mib = bytes / MEBIBYTE;
  return `${mib >= 10 ? Math.round(mib) : mib.toFixed(1)} MiB`;
}

function fileLabel(file, index) {
  return file?.name?.trim() || `Photo ${index + 1}`;
}

function inferredImageType(file) {
  const declared = String(file?.type || "").toLowerCase();
  if (declared.startsWith("image/")) return declared;
  const extension = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic" || extension === "heif") return `image/${extension}`;
  return "";
}

function outputTypeFor(inputType) {
  if (inputType === "image/png") return "image/png";
  if (inputType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function scaledDimensions(width, height, maxLongEdge) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function globalImageEnvironment() {
  const windowObject = typeof window === "undefined" ? null : window;
  return {
    createImageBitmap: typeof windowObject?.createImageBitmap === "function"
      ? windowObject.createImageBitmap.bind(windowObject)
      : null,
    documentObject: typeof document === "undefined" ? null : document,
    ImageConstructor: typeof Image === "undefined" ? null : Image,
    urlObject: typeof URL === "undefined" ? null : URL,
  };
}

async function decodeWithImageElement(file, environment) {
  const { ImageConstructor, urlObject } = environment;
  if (
    typeof ImageConstructor !== "function" ||
    typeof urlObject?.createObjectURL !== "function" ||
    typeof urlObject?.revokeObjectURL !== "function"
  ) {
    throw new Error("This browser cannot safely decode selected photos.");
  }
  const objectUrl = urlObject.createObjectURL(file);
  try {
    const image = new ImageConstructor();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("The selected image could not be decoded."));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      close: () => urlObject.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    urlObject.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function decodePhoto(file, environment) {
  if (typeof environment.decodeImage === "function") {
    return environment.decodeImage(file, { imageOrientation: "from-image" });
  }
  if (typeof environment.createImageBitmap === "function") {
    const bitmap = await environment.createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  }
  return decodeWithImageElement(file, environment);
}

async function canvasBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type, quality });
  }
  if (typeof canvas.toBlob !== "function") {
    throw new Error("This browser cannot safely optimize selected photos.");
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The optimized photo could not be created.")),
      type,
      quality
    );
  });
}

async function renderPhoto(source, width, height, type, quality, environment) {
  if (typeof environment.renderImage === "function") {
    return environment.renderImage({ source, width, height, type, quality });
  }
  const canvas = environment.documentObject?.createElement?.("canvas");
  const context = canvas?.getContext?.("2d", { alpha: type !== "image/jpeg" });
  if (!canvas || !context) throw new Error("This browser cannot safely optimize selected photos.");
  canvas.width = width;
  canvas.height = height;
  context.drawImage(source, 0, 0, width, height);
  return canvasBlob(canvas, type, quality);
}

async function optimizePhoto(file, decoded, inputType, policy, environment) {
  const outputType = outputTypeFor(inputType);
  let dimensions = scaledDimensions(decoded.width, decoded.height, policy.maxLongEdgePixels);
  let output;

  for (let attempt = 0; attempt < policy.maxResizeAttempts; attempt += 1) {
    output = await renderPhoto(
      decoded.source,
      dimensions.width,
      dimensions.height,
      outputType,
      policy.lossyQuality,
      environment
    );
    if (!(output instanceof Blob) || !output.type.startsWith("image/")) {
      throw new Error("The browser returned an invalid optimized image.");
    }
    if (
      (inputType === "image/png" || inputType === "image/webp") &&
      output.type !== "image/png" &&
      output.type !== "image/webp"
    ) {
      throw new Error("This browser could not preserve the photo's transparency safely.");
    }
    if (output.size <= policy.maxStoredBytesPerPhoto) break;
    const scale = Math.min(0.88, Math.sqrt(policy.maxStoredBytesPerPhoto / output.size) * 0.96);
    const next = {
      width: Math.max(1, Math.floor(dimensions.width * scale)),
      height: Math.max(1, Math.floor(dimensions.height * scale)),
    };
    if (next.width === dimensions.width && next.height === dimensions.height) break;
    dimensions = next;
  }

  if (!output || output.size > policy.maxStoredBytesPerPhoto) {
    throw new PhotoIngestionError(
      `${file.name || "This photo"} could not be reduced below ${bytesLabel(policy.maxStoredBytesPerPhoto)} without risking its quality. Choose a smaller photo.`,
      "stored-photo-too-large"
    );
  }

  return {
    blob: output,
    width: dimensions.width,
    height: dimensions.height,
    optimized: true,
    converted: Boolean(inputType && output.type !== inputType),
  };
}

async function preparePhoto(file, index, policy, environment) {
  const label = fileLabel(file, index);
  const inputType = inferredImageType(file);
  if (!(file instanceof Blob) || !inputType) {
    throw new PhotoIngestionError(
      `${label} is not a supported image. Choose a JPEG, PNG, WebP, HEIC, or another browser-readable photo.`,
      "unsupported-photo"
    );
  }
  if (file.size > policy.maxInputBytesPerPhoto) {
    throw new PhotoIngestionError(
      `${label} is ${bytesLabel(file.size)}. Choose a photo no larger than ${bytesLabel(policy.maxInputBytesPerPhoto)}.`,
      "input-photo-too-large"
    );
  }

  let decoded;
  try {
    decoded = await decodePhoto(file, environment);
    if (!Number.isFinite(decoded?.width) || !Number.isFinite(decoded?.height) || decoded.width < 1 || decoded.height < 1) {
      throw new Error("The selected image has invalid dimensions.");
    }
    const needsOptimization =
      file.size > policy.optimizeAboveBytes ||
      Math.max(decoded.width, decoded.height) > policy.maxLongEdgePixels;
    if (!needsOptimization) {
      return {
        blob: file,
        name: label,
        originalBytes: file.size,
        storedBytes: file.size,
        width: decoded.width,
        height: decoded.height,
        optimized: false,
        converted: false,
      };
    }
    const optimized = await optimizePhoto(file, decoded, inputType, policy, environment);
    if (
      file.size <= policy.maxStoredBytesPerPhoto &&
      Math.max(decoded.width, decoded.height) <= policy.maxLongEdgePixels &&
      optimized.blob.size >= file.size
    ) {
      return {
        blob: file,
        name: label,
        originalBytes: file.size,
        storedBytes: file.size,
        width: decoded.width,
        height: decoded.height,
        optimized: false,
        converted: false,
      };
    }
    return {
      ...optimized,
      name: label,
      originalBytes: file.size,
      storedBytes: optimized.blob.size,
    };
  } catch (error) {
    if (error instanceof PhotoIngestionError) throw error;
    throw new PhotoIngestionError(
      `${label} could not be decoded or safely prepared. Try exporting it as a JPEG, PNG, or WebP and select it again.`,
      "photo-decode-failed"
    );
  } finally {
    decoded?.close?.();
  }
}

export async function ingestPhotoFiles(files, {
  existingCount = 0,
  existingDraftBytes = 0,
  policy = PHOTO_INGESTION_POLICY,
  imageEnvironment = globalImageEnvironment(),
} = {}) {
  const selected = Array.from(files || []);
  if (existingCount + selected.length > policy.maxPhotosPerEntry) {
    const remaining = Math.max(0, policy.maxPhotosPerEntry - existingCount);
    throw new PhotoIngestionError(
      remaining === 0
        ? `This entry already has its ${policy.maxPhotosPerEntry}-photo limit. Remove a photo before adding another.`
        : `Choose ${remaining} or fewer photos this time. Each entry can keep up to ${policy.maxPhotosPerEntry}.`,
      "photo-count-limit"
    );
  }
  const inputBytes = selected.reduce((total, file) => total + (Number(file?.size) || 0), 0);
  if (inputBytes > policy.maxInputBytesPerSelection) {
    throw new PhotoIngestionError(
      `This selection is ${bytesLabel(inputBytes)}. Choose a batch no larger than ${bytesLabel(policy.maxInputBytesPerSelection)}.`,
      "input-selection-too-large"
    );
  }

  const prepared = [];
  for (let index = 0; index < selected.length; index += 1) {
    prepared.push(await preparePhoto(selected[index], index, policy, imageEnvironment));
  }
  const storedBytes = prepared.reduce((total, photo) => total + photo.storedBytes, 0);
  if (existingDraftBytes + storedBytes > policy.maxStoredBytesPerSelection) {
    throw new PhotoIngestionError(
      `These prepared photos would exceed the ${bytesLabel(policy.maxStoredBytesPerSelection)} draft limit. Remove a photo or add fewer at a time.`,
      "stored-selection-too-large"
    );
  }
  return {
    photos: prepared,
    inputBytes,
    storedBytes,
    optimizedCount: prepared.filter(({ optimized }) => optimized).length,
  };
}

export function photoSelectionSuccessMessage(result) {
  const count = result?.photos?.length || 0;
  const optimized = result?.optimizedCount || 0;
  if (optimized > 0) {
    const names = result.photos
      .filter((photo) => photo.optimized)
      .slice(0, 3)
      .map((photo) => photo.name)
      .join(", ");
    const remaining = optimized > 3 ? ` and ${optimized - 3} more` : "";
    return `${count} photo${count === 1 ? "" : "s"} ready. ${names}${remaining} ${optimized === 1 ? "was" : "were"} optimized at high quality for reliable storage.`;
  }
  return `${count} photo${count === 1 ? "" : "s"} ready. Original file${count === 1 ? " was" : "s were"} preserved.`;
}
