import {
  FEATURE_ACCESS_MODES,
  TRACE_FEATURES,
  createFeatureAccessProvider,
  traceFeatureAccess,
} from "./featureAccess";

test("exposes barcode scanning as a free, available beta feature", () => {
  expect(traceFeatureAccess.getAccess(TRACE_FEATURES.BARCODE_SCANNER)).toEqual({
    feature: TRACE_FEATURES.BARCODE_SCANNER,
    available: true,
    mode: FEATURE_ACCESS_MODES.PREVIEW,
    label: "Barcode Scanner Beta",
    message: "Barcode scanning is free for everyone and is currently in beta.",
  });
});

test("supports an injectable access decision and safely rejects malformed access", () => {
  const entitled = createFeatureAccessProvider({
    resolve: (feature) => ({
      feature,
      available: true,
      mode: FEATURE_ACCESS_MODES.ENTITLED,
      label: "Enabled",
      message: "Available.",
    }),
  });
  expect(entitled.getAccess(TRACE_FEATURES.BARCODE_SCANNER).mode).toBe("entitled");

  const malformed = createFeatureAccessProvider({ resolve: () => ({ available: true }) });
  expect(malformed.getAccess(TRACE_FEATURES.BARCODE_SCANNER)).toMatchObject({
    available: false,
    mode: FEATURE_ACCESS_MODES.UNAVAILABLE,
  });
});
