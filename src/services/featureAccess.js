export const TRACE_FEATURES = Object.freeze({
  BARCODE_SCANNER: "barcode-scanner",
});

export const FEATURE_ACCESS_MODES = Object.freeze({
  PREVIEW: "preview",
  ENTITLED: "entitled",
  UNAVAILABLE: "unavailable",
});

const BARCODE_PREVIEW_ACCESS = Object.freeze({
  feature: TRACE_FEATURES.BARCODE_SCANNER,
  available: true,
  mode: FEATURE_ACCESS_MODES.PREVIEW,
  label: "Premium Preview",
  message: "Barcode scanning is available during Trace beta as a Premium Preview.",
});

function normalizeAccess(feature, access) {
  if (
    !access
    || access.feature !== feature
    || typeof access.available !== "boolean"
    || !Object.values(FEATURE_ACCESS_MODES).includes(access.mode)
  ) return Object.freeze({
    feature,
    available: false,
    mode: FEATURE_ACCESS_MODES.UNAVAILABLE,
    label: "Unavailable",
    message: "This feature is unavailable.",
  });

  return Object.freeze({
    feature,
    available: access.available,
    mode: access.mode,
    label: String(access.label || "").trim() || "Unavailable",
    message: String(access.message || "").trim() || "This feature is unavailable.",
  });
}

export function createFeatureAccessProvider({ resolve } = {}) {
  return Object.freeze({
    getAccess(feature) {
      const resolved = typeof resolve === "function"
        ? resolve(feature)
        : feature === TRACE_FEATURES.BARCODE_SCANNER
          ? BARCODE_PREVIEW_ACCESS
          : null;
      return normalizeAccess(feature, resolved);
    },
  });
}

export const traceFeatureAccess = createFeatureAccessProvider();
