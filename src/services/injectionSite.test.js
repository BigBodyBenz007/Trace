import {
  BODY_STYLE_OPTIONS,
  appendInjectionSession,
  createInjectionSession,
  defaultInjectionSiteSettings,
  deleteInjectionShotData,
  deriveInjectionSiteLabel,
  emptyInjectionSiteCollection,
  injectionHistory,
  injectionSiteRecency,
  localDateTimeParts,
  localDateTimeToIso,
  normalizeInjectionSiteCollection,
  readInjectionSiteData,
  readInjectionSiteSettings,
  updateInjectionShotData,
  writeInjectionSiteData,
  writeInjectionSiteSettings,
} from "./injectionSite";

function shot(overrides = {}) {
  return {
    view: "front",
    x: 0.237891,
    y: 0.681234,
    siteLabel: "Right Thigh (Outer)",
    substanceName: "Vitamin B12",
    protocolId: null,
    protocolName: null,
    protocolItemId: null,
    amount: 1,
    unit: "mL",
    notes: "No irritation",
    ...overrides,
  };
}

function createdSession(shots = [shot()], overrides = {}) {
  return createInjectionSession({ occurredAt: "2026-08-27T13:24:00.000Z", shots, ...overrides }, {
    now: new Date("2026-08-27T14:00:00.000Z"),
    sessionId: "injection-session:one",
    shotIds: shots.map((value, index) => `injection-shot:${index + 1}`),
  });
}

test("defaults respectfully to Neutral — Average and persists every approved body-style choice", () => {
  expect(defaultInjectionSiteSettings()).toEqual({ schemaVersion: 1, bodyStyleId: "neutral-average" });
  expect(BODY_STYLE_OPTIONS.map(({ label }) => label)).toEqual([
    "Feminine — Average", "Feminine — Fuller", "Masculine — Average", "Masculine — Fuller", "Neutral — Average",
  ]);
  expect(BODY_STYLE_OPTIONS.map(({ label }) => label.toLowerCase()).join(" ")).not.toContain("fat");
  const storage = { value: null, getItem: jest.fn(() => storage.value), setItem: jest.fn((key, value) => { storage.value = value; }) };
  expect(readInjectionSiteSettings(storage)).toEqual(defaultInjectionSiteSettings());
  BODY_STYLE_OPTIONS.forEach(({ id }) => {
    expect(writeInjectionSiteSettings(storage, { schemaVersion: 1, bodyStyleId: id }).bodyStyleId).toBe(id);
    expect(readInjectionSiteSettings(storage).bodyStyleId).toBe(id);
  });
});

test("creates one atomic session containing multiple independently identified shots", () => {
  const result = createdSession([
    shot({ substanceName: "B12" }),
    shot({ view: "back", x: 0.7, y: 0.3, siteLabel: "Right Upper Back", substanceName: "Peptide", protocolId: "protocol:two", protocolName: "Recovery", protocolItemId: "item:peptide" }),
    shot({ x: 0.6, y: 0.7, siteLabel: "Left Thigh (Inner)", substanceName: "Iron", amount: null, unit: null }),
  ]);
  expect(result.session).toMatchObject({ id: "injection-session:one", schemaVersion: 1, occurredAt: "2026-08-27T13:24:00.000Z" });
  expect(result.shots.map(({ id, sessionId, substanceName }) => [id, sessionId, substanceName])).toEqual([
    ["injection-shot:1", "injection-session:one", "B12"],
    ["injection-shot:2", "injection-session:one", "Peptide"],
    ["injection-shot:3", "injection-session:one", "Iron"],
  ]);
});

test("requires an exact substance name but never requires a Protocol", () => {
  expect(createdSession([shot({ substanceName: "", protocolId: null })])).toBeNull();
  expect(createdSession([shot({ protocolId: null, protocolName: null, protocolItemId: null })])).not.toBeNull();
  expect(createdSession([shot({ x: 1.01 })])).toBeNull();
  expect(createdSession([shot({ amount: 1, unit: "" })])).toBeNull();
});

test("appends every shot together and writes the collection with one atomic storage mutation", () => {
  const appended = appendInjectionSession(emptyInjectionSiteCollection(), createdSession([shot(), shot({ substanceName: "Second" })]));
  const storage = { setItem: jest.fn() };
  expect(writeInjectionSiteData(storage, appended).shots).toHaveLength(2);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(JSON.parse(storage.setItem.mock.calls[0][1])).toEqual(appended);
});

test("migrates each current Phase 1 entry into a single-shot session without changing coordinates or snapshots", () => {
  const legacy = { schemaVersion: 1, entries: [{
    schemaVersion: 1, id: "injection-site:legacy", protocolId: "protocol:one", protocolName: "Energy Phase 1",
    view: "front", x: 0.237891, y: 0.681234, siteLabel: "Right Thigh (Outer)",
    occurredAt: "2026-08-27T13:24:00.000Z", notes: "Keep me",
    createdAt: "2026-08-27T13:25:00.000Z", updatedAt: "2026-08-27T13:25:00.000Z",
  }] };
  const protocols = [{ id: "protocol:one", name: "Energy Phase 1", items: [{ id: "item:b12", compound: { name: "Vitamin B12" }, dose: { amount: 2, unit: "ml" } }] }];
  const migrated = normalizeInjectionSiteCollection(legacy, protocols);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.sessions).toHaveLength(1);
  expect(migrated.shots[0]).toMatchObject({
    x: 0.237891, y: 0.681234, substanceName: "Vitamin B12", protocolId: "protocol:one",
    protocolName: "Energy Phase 1", protocolItemId: "item:b12", amount: 2, unit: "ml", notes: "Keep me",
  });
  expect(injectionHistory(migrated)[0].occurredAt).toBe("2026-08-27T13:24:00.000Z");
});

test("lazy migration writes v2 safely while a failed migration write still returns readable data", () => {
  const legacy = { schemaVersion: 1, entries: [{
    schemaVersion: 1, id: "legacy", protocolId: "protocol:gone", protocolName: "Deleted Plan", view: "back",
    x: 0.4, y: 0.4, siteLabel: "Left Lower Back", occurredAt: "2026-08-20T12:00:00.000Z", notes: "",
    createdAt: "2026-08-20T12:00:00.000Z", updatedAt: "2026-08-20T12:00:00.000Z",
  }] };
  const storage = { getItem: () => JSON.stringify(legacy), setItem: jest.fn(() => { throw new Error("full"); }) };
  const migrated = readInjectionSiteData(storage, []);
  expect(migrated.shots[0]).toMatchObject({ substanceName: "Deleted Plan", protocolName: "Deleted Plan", x: 0.4, y: 0.4 });
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test("editing a session date updates its shared time without changing sibling shot details", () => {
  const original = appendInjectionSession(emptyInjectionSiteCollection(), createdSession([shot(), shot({ substanceName: "Sibling" })]));
  const updated = updateInjectionShotData(original, "injection-shot:1", shot({ substanceName: "Updated" }), "2026-08-28T15:00:00.000Z", new Date("2026-08-28T16:00:00.000Z"));
  expect(updated.sessions[0].occurredAt).toBe("2026-08-28T15:00:00.000Z");
  expect(updated.shots.find(({ id }) => id === "injection-shot:1").substanceName).toBe("Updated");
  expect(updated.shots.find(({ id }) => id === "injection-shot:2").substanceName).toBe("Sibling");
});

test("deleting one shot preserves siblings and removes the session only with its final shot", () => {
  const original = appendInjectionSession(emptyInjectionSiteCollection(), createdSession([shot(), shot({ substanceName: "Sibling" })]));
  const oneLeft = deleteInjectionShotData(original, "injection-shot:1");
  expect(oneLeft.sessions).toHaveLength(1);
  expect(oneLeft.shots.map(({ substanceName }) => substanceName)).toEqual(["Sibling"]);
  expect(deleteInjectionShotData(oneLeft, "injection-shot:2")).toEqual(emptyInjectionSiteCollection());
});

test("front and back labels retain anatomical left/right orientation", () => {
  expect(deriveInjectionSiteLabel("front", 0.24, 0.25)).toBe("Right Upper Arm");
  expect(deriveInjectionSiteLabel("front", 0.76, 0.25)).toBe("Left Upper Arm");
  expect(deriveInjectionSiteLabel("back", 0.24, 0.25)).toBe("Left Upper Arm (Back)");
  expect(deriveInjectionSiteLabel("back", 0.76, 0.25)).toBe("Right Upper Arm (Back)");
});

test("uses local calendar dates for the final marker boundaries", () => {
  const now = new Date(2026, 7, 27, 0, 10);
  expect(injectionSiteRecency(new Date(2026, 7, 27, 23, 55), now)).toBe("today");
  expect(injectionSiteRecency(new Date(2026, 7, 20, 0, 10), now)).toBe("week");
  expect(injectionSiteRecency(new Date(2026, 7, 19, 23, 59), now)).toBe("month");
  expect(injectionSiteRecency(new Date(2026, 6, 28, 12, 0), now)).toBe("month");
  expect(injectionSiteRecency(new Date(2026, 6, 27, 12, 0), now)).toBeNull();
});

test("round-trips editable local session date and time fields", () => {
  const iso = localDateTimeToIso("2026-08-27", "08:24");
  expect(localDateTimeParts(iso)).toEqual({ date: "2026-08-27", time: "08:24" });
  expect(localDateTimeToIso("2026-02-30", "08:24")).toBeNull();
});
