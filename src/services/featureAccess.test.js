import {
  FEATURE_ACCESS_MODES,
  TRACE_FEATURES,
  createFeatureAccessProvider,
  traceFeatureAccess,
} from "./featureAccess";

test("exposes barcode scanning as an available Premium Preview without entitlement state", () => {
  expect(traceFeatureAccess.getAccess(TRACE_FEATURES.BARCODE_SCANNER)).toEqual({
    feature: TRACE_FEATURES.BARCODE_SCANNER,
    available: true,
    mode: FEATURE_ACCESS_MODES.PREVIEW,
    label: "Premium Preview",
    message: "Barcode scanning is available during Trace beta as a Premium Preview.",
  });
});

test("supports an injectable future entitlement decision and safely rejects malformed access", () => {
  const entitled = createFeatureAccessProvider({
    resolve: (feature) => ({
      feature,
      available: true,
      mode: FEATURE_ACCESS_MODES.ENTITLED,
      label: "Premium",
      message: "Included with Premium.",
    }),
  });
  expect(entitled.getAccess(TRACE_FEATURES.BARCODE_SCANNER).mode).toBe("entitled");

  const malformed = createFeatureAccessProvider({ resolve: () => ({ available: true }) });
  expect(malformed.getAccess(TRACE_FEATURES.BARCODE_SCANNER)).toMatchObject({
    available: false,
    mode: FEATURE_ACCESS_MODES.UNAVAILABLE,
  });
});
