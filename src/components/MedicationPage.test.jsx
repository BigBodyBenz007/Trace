import { fireEvent, render, screen, within } from "@testing-library/react";
import MedicationPage from "./MedicationPage";
import { createCompoundDefinition } from "../services/compoundCatalog";

function localTimestamp(year, month, day, hour = 12, minute = 0) {
  return new Date(year, month, day, hour, minute).toISOString();
}

function savedEntry(overrides = {}) {
  return {
    id: "entry-1",
    schemaVersion: 1,
    name: "Medication A",
    dose: { amount: 1.25, unit: "mg" },
    route: { code: "subcutaneous" },
    occurredAt: localTimestamp(2026, 7, 9),
    notes: "Historical note",
    createdAt: "2026-08-09T12:00:00.000Z",
    updatedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function renderMedicationPage(overrides = {}) {
  const saveCompoundDefinition = jest.fn((draft) => {
    const compound = createCompoundDefinition(draft);
    return { status: "added", compound, matchesDefinition: true };
  });
  const props = {
    onBack: jest.fn(),
    medicationEntries: [],
    saveMedicationEntry: jest.fn(() => true),
    saveCompoundDefinition,
    updateCompoundDefinition: jest.fn(() => ({ status: "updated" })),
    updateMedicationEntry: jest.fn(() => true),
    deleteMedicationEntry: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };

  const view = render(<MedicationPage {...props} />);
  Object.defineProperty(props, "rerenderPage", {
    enumerable: false,
    value(nextOverrides = {}) {
      Object.assign(props, nextOverrides);
      view.rerender(<MedicationPage {...props} />);
    },
  });
  return props;
}

function historyEntry(id) {
  return document.querySelector(`[data-entry-id="${id}"]`);
}

function installDeferredScrollMocks() {
  const callbacks = [];
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  window.requestAnimationFrame = jest.fn((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  Element.prototype.scrollIntoView = jest.fn();

  return {
    flush() {
      callbacks.splice(0).forEach((callback) => callback());
    },
    restore() {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      Element.prototype.scrollIntoView = originalScrollIntoView;
    },
  };
}

function savedCompound(overrides = {}) {
  return createCompoundDefinition({
    name: "SS-31",
    defaultDoseAmount: "",
    doseUnit: "mg",
    customDoseUnit: "",
    route: "subcutaneous",
    customRoute: "",
    ...overrides,
  });
}

function selectSavedCompound(name = "SS-31") {
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: `Select ${name}` }));
}

function entryForm() {
  return within(
    screen.getByRole("heading", { name: /(?:Add|Edit) Entry/ }).closest("form")
  );
}

function fillRequiredFields(form, overrides = {}) {
  fireEvent.change(form.getByLabelText("Name"), {
    target: { value: overrides.name || "Medication A" },
  });
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: overrides.doseAmount || "1.25" },
  });
  fireEvent.change(form.getByLabelText("Dose unit"), {
    target: { value: overrides.doseUnit || "mg" },
  });
  fireEvent.change(form.getByLabelText("Method / route"), {
    target: { value: overrides.route || "subcutaneous" },
  });
}

test("shows the historical-record boundary and matching navigation controls", () => {
  const props = renderMedicationPage();

  expect(
    screen.getByText(
      "Trace records the information you enter. It does not provide dosing or medical advice."
    )
  ).toBeInTheDocument();
  expect(screen.queryByText(/recommended dose|protocol/i)).not.toBeInTheDocument();

  const backButtons = screen.getAllByRole("button", {
    name: "Back to Timeline",
  });
  expect(backButtons).toHaveLength(2);
  fireEvent.click(backButtons[0]);
  fireEvent.click(backButtons[1]);
  expect(props.onBack).toHaveBeenCalledTimes(2);
});

test("saves a trimmed historical entry with decimal precision", () => {
  const props = renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form, { name: "  Medication   A  " });
  fireEvent.change(form.getByLabelText("Notes (optional)"), {
    target: { value: "  User note  " },
  });

  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      schemaVersion: 1,
      name: "Medication A",
      dose: { amount: 1.25, unit: "mg" },
      route: { code: "subcutaneous" },
      occurredAt: expect.any(String),
      notes: "User note",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  );
  expect(form.getByLabelText("Name")).toHaveValue("");
});

test("logs medication, peptide, and supplement names without classification", () => {
  const props = renderMedicationPage();
  const form = entryForm();

  ["Medication A", "Peptide B", "Supplement C"].forEach((name) => {
    fillRequiredFields(form, { name });
    fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  });

  expect(props.saveMedicationEntry.mock.calls.map(([entry]) => entry.name)).toEqual([
    "Medication A",
    "Peptide B",
    "Supplement C",
  ]);
  props.saveMedicationEntry.mock.calls.forEach(([entry]) => {
    expect(entry).not.toHaveProperty("classification");
  });
});

test("reusable creation defaults off and saves without a default amount", () => {
  const props = renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form, { name: "SS-31" });

  expect(form.getByLabelText("Save as reusable compound")).not.toBeChecked();
  expect(
    form.queryByLabelText("Default dose amount (optional)")
  ).not.toBeInTheDocument();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  expect(form.getByLabelText("Default dose amount (optional)")).toHaveValue(
    null
  );
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveCompoundDefinition).toHaveBeenCalledWith({
    name: "SS-31",
    defaultDoseAmount: "",
    doseUnit: "mg",
    customDoseUnit: "",
    route: "subcutaneous",
    customRoute: "",
  });
  expect(props.saveMedicationEntry.mock.calls[0][0]).toMatchObject({
    name: "SS-31",
    dose: { amount: 1.25, unit: "mg" },
    compoundReference: {
      source: "user-saved",
      sourceId: "user-saved:ss-31",
      modified: false,
    },
  });
});

test("reusable creation stores only an explicitly entered default amount", () => {
  const props = renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form, { name: "SS-31", doseAmount: "4" });
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.change(form.getByLabelText("Default dose amount (optional)"), {
    target: { value: "3.5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveCompoundDefinition).toHaveBeenCalledWith(
    expect.objectContaining({ defaultDoseAmount: "3.5" })
  );
  expect(props.saveMedicationEntry.mock.calls[0][0].dose.amount).toBe(4);
});

test("selecting a compound without a default amount leaves dose amount blank", () => {
  renderMedicationPage({ compounds: [savedCompound()] });

  selectSavedCompound();
  const form = entryForm();

  expect(form.getByLabelText("Name")).toHaveValue("SS-31");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(null);
  expect(form.getByLabelText("Dose unit")).toHaveValue("mg");
  expect(form.getByLabelText("Method / route")).toHaveValue("subcutaneous");
  expect(
    form.queryByLabelText("Save as reusable compound")
  ).not.toBeInTheDocument();
});

test("selected saved amount prefills but changing it affects only the log", () => {
  const props = renderMedicationPage({
    compounds: [savedCompound({ defaultDoseAmount: "3.5" })],
  });
  selectSavedCompound();
  const form = entryForm();

  expect(form.getByLabelText("Amount / dose")).toHaveValue(3.5);
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "4.25" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry.mock.calls[0][0]).toMatchObject({
    dose: { amount: 4.25, unit: "mg" },
    compoundReference: {
      source: "user-saved",
      sourceId: "user-saved:ss-31",
      modified: false,
    },
  });
  expect(props.saveCompoundDefinition).not.toHaveBeenCalled();
});

test("name, unit, and route overrides mark a selected reference modified", () => {
  const props = renderMedicationPage({ compounds: [savedCompound()] });
  selectSavedCompound();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Name"), {
    target: { value: "SS-31 personal label" },
  });
  fireEvent.change(form.getByLabelText("Dose unit"), {
    target: { value: "mcg" },
  });
  fireEvent.change(form.getByLabelText("Method / route"), {
    target: { value: "oral" },
  });
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "2" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(
    props.saveMedicationEntry.mock.calls[0][0].compoundReference.modified
  ).toBe(true);
});

test("selecting saved custom defaults restores custom fields", () => {
  renderMedicationPage({
    compounds: [
      savedCompound({
        doseUnit: "custom",
        customDoseUnit: "sprays",
        route: "other",
        customRoute: "Recorded route",
      }),
    ],
  });
  selectSavedCompound();
  const form = entryForm();

  expect(form.getByLabelText("Dose unit")).toHaveValue("custom");
  expect(form.getByLabelText("Custom dose unit")).toHaveValue("sprays");
  expect(form.getByLabelText("Method / route")).toHaveValue("other");
  expect(form.getByLabelText("Other method / route")).toHaveValue(
    "Recorded route"
  );
});

test("exact duplicate keeps and references the existing definition", () => {
  const existing = savedCompound();
  const saveCompoundDefinition = jest.fn(() => ({
    status: "duplicate",
    compound: existing,
    matchesDefinition: true,
  }));
  const props = renderMedicationPage({ saveCompoundDefinition });
  const form = entryForm();
  fillRequiredFields(form, { name: "  ss-31  " });
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry.mock.calls[0][0].compoundReference).toEqual({
    source: "user-saved",
    sourceId: existing.id,
    modified: false,
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged. Your existing saved SS-31 was kept."
  );
});

test("conflicting duplicate logs its snapshot without a misleading reference", () => {
  const existing = savedCompound();
  const saveCompoundDefinition = jest.fn(() => ({
    status: "duplicate",
    compound: existing,
    matchesDefinition: false,
  }));
  const props = renderMedicationPage({ saveCompoundDefinition });
  const form = entryForm();
  fillRequiredFields(form, { name: "SS-31", route: "oral" });
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  const loggedEntry = props.saveMedicationEntry.mock.calls[0][0];
  expect(loggedEntry).toMatchObject({
    name: "SS-31",
    dose: { amount: 1.25, unit: "mg" },
    route: { code: "oral" },
  });
  expect(loggedEntry).not.toHaveProperty("compoundReference");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged. Your existing saved SS-31 was kept."
  );
});

test("shows and saves custom unit and route fields only when selected", () => {
  const props = renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form, { doseUnit: "custom", route: "other" });

  expect(form.getByLabelText("Custom dose unit")).toBeInTheDocument();
  expect(form.getByLabelText("Other method / route")).toBeInTheDocument();
  fireEvent.change(form.getByLabelText("Custom dose unit"), {
    target: { value: "sprays" },
  });
  fireEvent.change(form.getByLabelText("Other method / route"), {
    target: { value: "Recorded route" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry.mock.calls[0][0]).toMatchObject({
    dose: { amount: 1.25, unit: "custom", customUnit: "sprays" },
    route: { code: "other", customLabel: "Recorded route" },
  });
});

test("rejects invalid doses and missing custom descriptions", () => {
  const props = renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form);
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "0" },
  });
  fireEvent.submit(form.getByRole("button", { name: "Save Entry" }).closest("form"));
  expect(form.getByRole("alert")).toHaveTextContent(
    "Enter a dose amount greater than zero."
  );

  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "1" },
  });
  fireEvent.change(form.getByLabelText("Dose unit"), {
    target: { value: "custom" },
  });
  fireEvent.submit(form.getByRole("button", { name: "Save Entry" }).closest("form"));
  expect(form.getByRole("alert")).toHaveTextContent(
    "Enter a meaningful custom dose unit."
  );
  expect(props.saveMedicationEntry).not.toHaveBeenCalled();
});

test("edits from the historical snapshot and preserves creation time", () => {
  const entry = savedEntry();
  const props = renderMedicationPage({ medicationEntries: [entry] });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.getByLabelText("Name")).toHaveValue("Medication A");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(1.25);
  expect(form.getByLabelText("Dose unit")).toHaveValue("mg");
  expect(form.getByLabelText("Method / route")).toHaveValue("subcutaneous");

  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "2.5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateMedicationEntry).toHaveBeenCalledWith(
    entry.id,
    expect.objectContaining({
      dose: { amount: 2.5, unit: "mg" },
      createdAt: entry.createdAt,
      updatedAt: expect.any(String),
    })
  );
  expect(props.updateMedicationEntry.mock.calls[0][1]).not.toHaveProperty(
    "compoundReference"
  );
});

test("editing a Phase 1 entry can save it as a reusable compound", () => {
  const entry = savedEntry({ name: "SS-31" });
  const props = renderMedicationPage({ medicationEntries: [entry] });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.getByLabelText("Save as reusable compound")).not.toBeChecked();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.saveCompoundDefinition).toHaveBeenCalledWith({
    name: "SS-31",
    defaultDoseAmount: "",
    doseUnit: "mg",
    customDoseUnit: "",
    route: "subcutaneous",
    customRoute: "",
  });
  expect(props.updateMedicationEntry).toHaveBeenCalledWith(
    entry.id,
    expect.objectContaining({
      name: "SS-31",
      dose: entry.dose,
      route: entry.route,
      compoundReference: {
        source: "user-saved",
        sourceId: "user-saved:ss-31",
        modified: false,
      },
    })
  );
});

test("edit-to-reusable supports an optional user-entered default amount", () => {
  const entry = savedEntry({ name: "SS-31", dose: { amount: 5, unit: "mg" } });
  const props = renderMedicationPage({ medicationEntries: [entry] });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.change(form.getByLabelText("Default dose amount (optional)"), {
    target: { value: "3.5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.saveCompoundDefinition).toHaveBeenCalledWith(
    expect.objectContaining({ defaultDoseAmount: "3.5" })
  );
  expect(props.updateMedicationEntry.mock.calls[0][1].dose.amount).toBe(5);
});

test("edit-to-reusable exact duplicate attaches the existing reference", () => {
  const entry = savedEntry({ name: "SS-31" });
  const existing = savedCompound();
  const saveCompoundDefinition = jest.fn(() => ({
    status: "duplicate",
    compound: existing,
    matchesDefinition: true,
  }));
  const props = renderMedicationPage({
    medicationEntries: [entry],
    saveCompoundDefinition,
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateMedicationEntry.mock.calls[0][1].compoundReference).toEqual({
    source: "user-saved",
    sourceId: existing.id,
    modified: false,
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged. Your existing saved SS-31 was kept."
  );
});

test("edit-to-reusable conflict preserves snapshot without attaching a reference", () => {
  const entry = savedEntry({
    name: "SS-31",
    dose: { amount: 7, unit: "mg" },
    route: { code: "oral" },
  });
  const existing = savedCompound();
  const saveCompoundDefinition = jest.fn(() => ({
    status: "duplicate",
    compound: existing,
    matchesDefinition: false,
  }));
  const props = renderMedicationPage({
    medicationEntries: [entry],
    saveCompoundDefinition,
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  const updatedEntry = props.updateMedicationEntry.mock.calls[0][1];
  expect(updatedEntry).toMatchObject({
    name: "SS-31",
    dose: { amount: 7, unit: "mg" },
    route: { code: "oral" },
  });
  expect(updatedEntry).not.toHaveProperty("compoundReference");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged. Your existing saved SS-31 was kept."
  );
});

test("a referenced historical edit does not offer or update reusable saving", () => {
  const entry = savedEntry({
    name: "Historical name",
    dose: { amount: 8, unit: "mg" },
    route: { code: "oral" },
    compoundReference: {
      source: "user-saved",
      sourceId: "user-saved:ss-31",
      modified: false,
    },
  });
  const props = renderMedicationPage({
    medicationEntries: [entry],
    compounds: [savedCompound({ defaultDoseAmount: "3.5" })],
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(
    form.queryByLabelText("Save as reusable compound")
  ).not.toBeInTheDocument();
  expect(form.getByLabelText("Name")).toHaveValue("Historical name");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(8);
  expect(form.getByLabelText("Method / route")).toHaveValue("oral");
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "9" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.saveCompoundDefinition).not.toHaveBeenCalled();
  expect(props.updateMedicationEntry.mock.calls[0][1]).toMatchObject({
    name: "Historical name",
    dose: { amount: 9, unit: "mg" },
    route: { code: "oral" },
    compoundReference: {
      source: "user-saved",
      sourceId: "user-saved:ss-31",
      modified: false,
    },
  });
});

test("compound persistence failure does not block the historical edit", () => {
  const entry = savedEntry({ name: "SS-31" });
  const saveCompoundDefinition = jest.fn(() => ({
    status: "error",
    compound: null,
    matchesDefinition: false,
  }));
  const props = renderMedicationPage({
    medicationEntries: [entry],
    saveCompoundDefinition,
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  fireEvent.click(form.getByLabelText("Save as reusable compound"));
  fireEvent.change(form.getByLabelText("Amount / dose"), {
    target: { value: "2" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateMedicationEntry).toHaveBeenCalledWith(
    entry.id,
    expect.objectContaining({ dose: { amount: 2, unit: "mg" } })
  );
  expect(props.updateMedicationEntry.mock.calls[0][1]).not.toHaveProperty(
    "compoundReference"
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged, but the reusable compound could not be saved."
  );
});

test("editing a referenced entry uses its historical snapshot without catalog lookup", () => {
  const entry = savedEntry({
    name: "Historical SS-31",
    dose: { amount: 5, unit: "mg" },
    route: { code: "oral" },
    compoundReference: {
      source: "user-saved",
      sourceId: "user-saved:ss-31",
      modified: true,
    },
  });
  renderMedicationPage({
    medicationEntries: [entry],
    compounds: [savedCompound({ defaultDoseAmount: "3.5" })],
  });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  expect(form.getByLabelText("Name")).toHaveValue("Historical SS-31");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(5);
  expect(form.getByLabelText("Method / route")).toHaveValue("oral");
  expect(
    screen.queryByLabelText("Saved compound search")
  ).not.toBeInTheDocument();
});

test("confirms deletion before removing an entry", () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const entry = savedEntry();
  const props = renderMedicationPage({ medicationEntries: [entry] });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(window.confirm).toHaveBeenCalledWith("Delete this medication entry?");
  expect(props.deleteMedicationEntry).toHaveBeenCalledWith(entry.id);
  window.confirm = originalConfirm;
});

test("displays entries newest occurredAt first", () => {
  renderMedicationPage({
    medicationEntries: [
      savedEntry({ id: "older", name: "Older entry", occurredAt: localTimestamp(2026, 7, 8) }),
      savedEntry({ id: "newer", name: "Newer entry", occurredAt: localTimestamp(2026, 7, 10) }),
    ],
  });

  const articles = screen.getAllByRole("article");
  expect(within(articles[0]).getByText("Newer entry")).toBeInTheDocument();
  expect(within(articles[1]).getByText("Older entry")).toBeInTheDocument();
});

test("searches names with normalized case and whitespace, stays grouped, and clears", () => {
  const entries = [
    savedEntry({ id: "older", name: "Alpha   Peptide", occurredAt: localTimestamp(2026, 7, 8) }),
    savedEntry({ id: "newer", name: "Alpha Peptide", occurredAt: localTimestamp(2026, 7, 10) }),
    savedEntry({ id: "other", name: "Vitamin D", occurredAt: localTimestamp(2026, 7, 9) }),
  ];
  const snapshot = JSON.parse(JSON.stringify(entries));
  renderMedicationPage({ medicationEntries: entries });

  fireEvent.change(screen.getByLabelText("Search logged entries"), {
    target: { value: "  ALPHA    peptide " },
  });

  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getAllByRole("article").map((article) => article.dataset.entryId)).toEqual([
    "newer",
    "older",
  ]);
  expect(screen.getAllByTestId(/medication-history-group-/)).toHaveLength(2);
  expect(entries).toEqual(snapshot);

  fireEvent.click(screen.getByRole("button", { name: "Clear History Search" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
});

test("distinguishes no search matches from an entirely empty history", () => {
  const props = renderMedicationPage({ medicationEntries: [savedEntry()] });
  fireEvent.change(screen.getByLabelText("Search logged entries"), {
    target: { value: "not present" },
  });
  expect(screen.getByText("No matching logged entries.")).toBeInTheDocument();
  expect(screen.queryByText("No medication entries yet.")).not.toBeInTheDocument();

  props.rerenderPage({ medicationEntries: [] });
  expect(screen.getByText("No medication entries yet.")).toBeInTheDocument();
  expect(screen.queryByText("No matching logged entries.")).not.toBeInTheDocument();
});

test("filtered edit saves the correct entry and returns to its updated group", () => {
  const scroll = installDeferredScrollMocks();
  const first = savedEntry({ id: "first", name: "Peptide One" });
  const second = savedEntry({ id: "second", name: "Peptide Two" });
  const props = renderMedicationPage({ medicationEntries: [first, second] });
  fireEvent.change(screen.getByLabelText("Search logged entries"), {
    target: { value: "two" },
  });

  fireEvent.click(within(historyEntry("second")).getByRole("button", { name: "Edit" }));
  const editHeading = screen.getByRole("heading", { name: "Edit Entry" });
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  scroll.flush();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  });
  expect(Element.prototype.scrollIntoView.mock.instances[0]).toBe(editHeading);
  expect(editHeading).toHaveStyle({ scrollMarginTop: "24px" });
  fireEvent.change(entryForm().getByLabelText("Date"), { target: { value: "2026-08-12" } });
  fireEvent.click(entryForm().getByRole("button", { name: "Save Changes" }));
  const updated = { ...second, ...props.updateMedicationEntry.mock.calls[0][1] };
  props.rerenderPage({ medicationEntries: [first, updated] });
  scroll.flush();

  expect(props.updateMedicationEntry).toHaveBeenCalledWith("second", expect.any(Object));
  expect(screen.getByLabelText("Search logged entries")).toHaveValue("two");
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
    behavior: "smooth",
    block: "center",
  });
  expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(historyEntry("second"));
  expect(historyEntry("second").closest("section")).toHaveAttribute(
    "data-testid",
    "medication-history-group-2026-08-12"
  );
  scroll.restore();
});

test("cancel preserves search and returns to the exact originating entry", () => {
  const scroll = installDeferredScrollMocks();
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  renderMedicationPage({
    medicationEntries: [
      savedEntry({ id: "first", name: "Shared name" }),
      savedEntry({ id: "second", name: "Shared name", occurredAt: localTimestamp(2026, 7, 8) }),
    ],
  });
  fireEvent.change(screen.getByLabelText("Search logged entries"), { target: { value: "shared" } });
  fireEvent.click(within(historyEntry("second")).getByRole("button", { name: "Edit" }));
  fireEvent.click(entryForm().getByRole("button", { name: "Cancel Entry" }));
  scroll.flush();

  expect(screen.getByLabelText("Search logged entries")).toHaveValue("shared");
  expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(historyEntry("second"));
  window.confirm = originalConfirm;
  scroll.restore();
});

test("a renamed filtered edit keeps search and returns to the history context", () => {
  const scroll = installDeferredScrollMocks();
  const entry = savedEntry({ id: "target", name: "Matching medicine" });
  const props = renderMedicationPage({ medicationEntries: [entry] });
  fireEvent.change(screen.getByLabelText("Search logged entries"), { target: { value: "matching" } });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(entryForm().getByLabelText("Name"), { target: { value: "Renamed" } });
  fireEvent.click(entryForm().getByRole("button", { name: "Save Changes" }));
  const updated = { ...entry, ...props.updateMedicationEntry.mock.calls[0][1] };
  props.rerenderPage({ medicationEntries: [updated] });
  scroll.flush();

  expect(screen.getByLabelText("Search logged entries")).toHaveValue("matching");
  expect(screen.getByText("No matching logged entries.")).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(
    screen.getByTestId("medication-history")
  );
  scroll.restore();
});

test("filtered deletion removes only its entry and restores nearby history context", () => {
  const scroll = installDeferredScrollMocks();
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const compound = savedCompound();
  const first = savedEntry({ id: "first", name: "Vitamin A" });
  const second = savedEntry({ id: "second", name: "Vitamin B" });
  const props = renderMedicationPage({ medicationEntries: [first, second], compounds: [compound] });
  fireEvent.change(screen.getByLabelText("Search logged entries"), { target: { value: "vitamin" } });
  fireEvent.click(within(historyEntry("second")).getByRole("button", { name: "Delete" }));
  props.rerenderPage({ medicationEntries: [first] });
  scroll.flush();

  expect(props.deleteMedicationEntry).toHaveBeenCalledWith("second");
  expect(historyEntry("first")).toBeInTheDocument();
  expect(screen.getByLabelText("Search logged entries")).toHaveValue("vitamin");
  expect(props.compounds).toEqual([compound]);
  expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(
    screen.getByTestId("medication-history-group-2026-08-09")
  );
  window.confirm = originalConfirm;
  scroll.restore();
});

test("cancel resets the form without navigating away", () => {
  const originalConfirm = window.confirm;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  window.confirm = jest.fn(() => true);
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  const props = renderMedicationPage();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Name"), {
    target: { value: "Draft" },
  });

  fireEvent.click(form.getByRole("button", { name: "Cancel Entry" }));

  expect(form.getByLabelText("Name")).toHaveValue("");
  expect(props.onBack).not.toHaveBeenCalled();
  expect(
    screen.getByRole("heading", { name: "Medications & Supplements" })
  ).toBeInTheDocument();
  window.confirm = originalConfirm;
  window.requestAnimationFrame = originalRequestAnimationFrame;
});
