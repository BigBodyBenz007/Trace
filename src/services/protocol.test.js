import {
  createProtocol,
  endProtocol,
  formatProtocolSchedule,
  getProtocolError,
  normalizeWeekdays,
  protocolItemsScheduledForDate,
  readProtocols,
  writeProtocols,
} from "./protocol";

function item(overrides = {}) {
  return {
    id: "protocol-item:one",
    compound: { name: "Retatrutide", reference: { source: "trace-catalog", sourceId: "trace:compound:retatrutide", category: "peptide", modified: false } },
    dose: { amount: "2.5", unit: "mg" },
    route: { code: "subcutaneous" },
    schedule: { type: "weekly-days", weekdays: [5, 1, 3] },
    notes: " Item note ",
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    id: "protocol:one",
    name: " My Protocol ",
    startDate: "2026-09-01",
    endDate: "",
    status: "active",
    notes: " Plan note ",
    items: [item()],
    ...overrides,
  };
}

test("creates an immutable open-ended snapshot with stable IDs and sorted weekdays", () => {
  const input = draft();
  const copy = JSON.parse(JSON.stringify(input));
  const protocol = createProtocol(input, null, new Date("2026-08-20T12:00:00.000Z"));
  expect(protocol).toEqual({
    id: "protocol:one",
    schemaVersion: 1,
    name: "My Protocol",
    startDate: "2026-09-01",
    endDate: null,
    status: "active",
    notes: "Plan note",
    items: [{
      id: "protocol-item:one",
      compound: input.items[0].compound,
      dose: { amount: 2.5, unit: "mg" },
      route: { code: "subcutaneous" },
      schedule: { type: "weekly-days", weekdays: [1, 3, 5] },
      notes: "Item note",
    }],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    endedAt: null,
  });
  expect(input).toEqual(copy);
  expect(protocol.items[0].compound.reference).not.toBe(input.items[0].compound.reference);
});

test("supports multiple items, custom units/routes, and preserves existing IDs on edit", () => {
  const original = createProtocol(draft(), null, new Date("2026-08-20T12:00:00.000Z"));
  const second = item({
    id: "protocol-item:two",
    compound: { name: "Custom" },
    dose: { amount: 1, unit: "custom", customUnit: "scoops" },
    route: { code: "other", customLabel: "Recorded method" },
    schedule: { type: "weekly-days", weekdays: [7] },
  });
  const updated = createProtocol(
    draft({ name: "Updated", items: [item(), second] }),
    original,
    new Date("2026-08-21T12:00:00.000Z")
  );
  expect(updated.id).toBe(original.id);
  expect(updated.createdAt).toBe(original.createdAt);
  expect(updated.items.map(({ id }) => id)).toEqual(["protocol-item:one", "protocol-item:two"]);
  expect(updated.items[1]).toMatchObject({
    dose: { amount: 1, unit: "custom", customUnit: "scoops" },
    route: { code: "other", customLabel: "Recorded method" },
  });
});

test("validates dates, status, items, positive doses, units, routes, and weekdays", () => {
  expect(getProtocolError(draft({ startDate: "2026-02-30" }))).toMatch(/valid protocol start/i);
  expect(getProtocolError(draft({ endDate: "2026-08-31" }))).toMatch(/before/i);
  expect(getProtocolError(draft({ status: "scheduled" }))).toMatch(/status/i);
  expect(getProtocolError(draft({ items: [] }))).toMatch(/at least one/i);
  expect(getProtocolError(draft({ items: [item({ dose: { amount: 0, unit: "mg" } })] }))).toMatch(/greater than zero/i);
  expect(getProtocolError(draft({ items: [item({ dose: { amount: 1, unit: "bad" } })] }))).toMatch(/dose unit/i);
  expect(getProtocolError(draft({ items: [item({ route: { code: "bad" } })] }))).toMatch(/route/i);
  expect(getProtocolError(draft({ items: [item({ schedule: { type: "weekly-days", weekdays: [] } })] }))).toMatch(/weekday/i);
  expect(getProtocolError(draft({ items: [item({ schedule: { type: "weekly-days", weekdays: [1, 1] } })] }))).toMatch(/unique/i);
  expect(getProtocolError(draft({ items: [item({ schedule: { type: "weekly-days", weekdays: [8] } })] }))).toMatch(/ISO weekdays/i);
});

test("formats one, several, and every day from structured schedules", () => {
  expect(formatProtocolSchedule({ type: "weekly-days", weekdays: [1] })).toBe("Monday");
  expect(formatProtocolSchedule({ type: "weekly-days", weekdays: [5, 1, 3] })).toBe("Monday, Wednesday, Friday");
  expect(formatProtocolSchedule({ type: "weekly-days", weekdays: [7, 6, 5, 4, 3, 2, 1] })).toBe("Every day");
  expect(normalizeWeekdays([3, 1, 3])).toEqual([1, 3]);
});

test("selects only active protocol items inside inclusive date boundaries for the local weekday", () => {
  const current = createProtocol(draft({
    startDate: "2026-08-22",
    endDate: "2026-08-22",
    items: [item({ schedule: { type: "weekly-days", weekdays: [6] } })],
  }));
  const wrongWeekday = createProtocol(draft({
    id: "protocol:wrong-weekday",
    startDate: "2026-08-01",
    items: [item({
      id: "protocol-item:wrong-weekday",
      schedule: { type: "weekly-days", weekdays: [7] },
    })],
  }));
  const ended = { ...current, id: "protocol:ended", status: "ended" };

  const scheduled = protocolItemsScheduledForDate(
    [current, wrongWeekday, ended],
    new Date(2026, 7, 22, 23, 30)
  );

  expect(scheduled).toEqual([{ protocol: current, item: current.items[0] }]);
});

test("ending records the actual local end date and preserves the full snapshot", () => {
  const protocol = createProtocol(draft({ endDate: "2026-12-31" }), null, new Date("2026-08-20T12:00:00.000Z"));
  const ended = endProtocol(protocol, new Date(2026, 8, 15, 10));
  expect(ended).toMatchObject({ status: "ended", endDate: "2026-09-15" });
  expect(ended.endedAt).toBe(new Date(2026, 8, 15, 10).toISOString());
  expect(ended.items).toEqual(protocol.items);
  expect(ended.items).not.toBe(protocol.items);
});

test("ending an upcoming protocol preserves valid calendar boundaries", () => {
  const protocol = createProtocol(draft({ startDate: "2026-09-20" }), null, new Date("2026-08-20T12:00:00.000Z"));
  const ended = endProtocol(protocol, new Date(2026, 8, 15, 10));
  expect(ended.endDate).toBe("2026-09-20");
  expect(ended.endedAt).toBe(new Date(2026, 8, 15, 10).toISOString());
});

test("persists protocols under their own collection key", () => {
  const storage = { getItem: jest.fn(), setItem: jest.fn() };
  const protocols = [createProtocol(draft())];
  writeProtocols(storage, protocols);
  expect(storage.setItem).toHaveBeenCalledWith("protocols", JSON.stringify(protocols));
  storage.getItem.mockReturnValue(JSON.stringify(protocols));
  expect(readProtocols(storage)).toEqual(protocols);
});
