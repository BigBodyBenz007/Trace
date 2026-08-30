import { fireEvent, render, screen, within } from "@testing-library/react";
import MedicationPage from "./MedicationPage";
import { createCompoundDefinition } from "../services/compoundCatalog";
import { formatDateOnly } from "../services/dateOnly";
import {
  completeMedicationDoseOccurrence,
  createMedicationDoseSchedule,
  deleteMedicationDoseSchedule as deleteDoseScheduleRecord,
  endMedicationDoseSchedule as endDoseScheduleRecord,
  medicationDoseDateKey,
  medicationDoseOccurrenceItem,
  removeMedicationDoseOccurrence,
  shiftMedicationDoseDate,
  skipMedicationDoseOccurrence,
  undoMedicationDoseCompletion,
} from "../services/medicationDoseSchedule";

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
    saveMedicationEntry: jest.fn((entry) => ({ ...entry, id: "entry:saved" })),
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

test("uses the scoped regimen presentation with distinct search and entry surfaces", () => {
  renderMedicationPage();
  expect(screen.getByTestId("medication-page")).toHaveClass("trace-feature-page--medications");
  expect(screen.getByRole("heading", { name: "Search Compounds" }).closest("section")).toHaveClass("trace-compound-search");
  expect(screen.getByRole("heading", { name: "Add Entry" }).closest("form")).toHaveClass("trace-medication-entry");
});

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
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: name },
  });
  fireEvent.click(
    screen.getByRole("button", { name: `Select saved compound ${name}` })
  );
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
  expect(screen.queryByRole("form", { name: /Schedule dose for/ })).not.toBeInTheDocument();
  expect(form.getByLabelText("Name")).toHaveValue("");
});

test("Save & Schedule opens a prefilled direct scheduler without logging a history entry", () => {
  const saveMedicationEntry = jest.fn();
  const saveMedicationDoseSchedule = jest.fn((record) => saveDoseResult(record, "schedule:from-add-entry"));
  renderMedicationPage({ saveMedicationEntry, saveMedicationDoseSchedule });
  fireEvent.change(screen.getByLabelText("Compound search"), { target: { value: "metformin" } });
  fireEvent.click(screen.getByRole("button", { name: "Select Trace compound Metformin" }));
  const form = entryForm();
  fillRequiredFields(form, { name: "Metformin", doseAmount: "2.5", route: "subcutaneous" });
  fireEvent.change(form.getByLabelText("Notes (optional)"), { target: { value: "After breakfast" } });
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));

  expect(saveMedicationEntry).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Review and confirm the dose schedule below. No dose has been logged yet."
  );
  const scheduler = screen.getByRole("form", { name: "Schedule dose for Metformin" });
  expect(screen.getByRole("heading", { name: "Schedule Dose" })).toHaveFocus();
  expect(within(scheduler).getByLabelText("Medication or supplement classification")).toHaveValue("medication");
  expect(within(scheduler).getByLabelText("Dose amount")).toHaveValue(2.5);
  expect(within(scheduler).getByLabelText("Dose unit")).toHaveValue("mg");
  expect(within(scheduler).getByLabelText("Saved route")).toHaveValue("Subcutaneous (SC)");
  expect(within(scheduler).getByLabelText("Saved route")).toHaveAttribute("readonly");
  expect(within(scheduler).getByLabelText("Schedule notes (optional)")).toHaveValue("After breakfast");
  expect(within(scheduler).getByLabelText("Start date")).toHaveValue(medicationDoseDateKey());
  expect(within(scheduler).getByLabelText("Scheduled time")).toHaveValue("");

  fireEvent.change(within(scheduler).getByLabelText("Scheduled time"), { target: { value: "09:30" } });
  fireEvent.click(within(scheduler).getByRole("button", { name: "Schedule Dose" }));
  expect(saveMedicationDoseSchedule).toHaveBeenCalledWith(expect.objectContaining({
    classification: "medication",
    source: {
      type: "direct-entry",
      id: expect.stringMatching(/^medication-dose-source:/),
    },
    compoundReference: expect.objectContaining({
      source: "trace-catalog",
      category: "medication",
      modified: false,
    }),
  }), false);
  expect(saveMedicationEntry).not.toHaveBeenCalled();
  expect(entryForm().getByLabelText("Name")).toHaveValue("");
});

test("Save & Schedule validation creates neither history nor scheduler", () => {
  const saveMedicationEntry = jest.fn(() => false);
  renderMedicationPage({ saveMedicationEntry });
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Name"), { target: { value: "Ipamorelin" } });
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));
  expect(saveMedicationEntry).not.toHaveBeenCalled();
  expect(form.getByRole("alert")).toHaveTextContent("Enter a dose amount greater than zero.");
  expect(form.getByLabelText("Amount / dose")).toHaveFocus();
  expect(screen.queryByRole("form", { name: /Schedule dose for/ })).not.toBeInTheDocument();

  fillRequiredFields(form, { name: "Ipamorelin" });
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));
  expect(saveMedicationEntry).not.toHaveBeenCalled();
  expect(screen.getByRole("form", { name: "Schedule dose for Ipamorelin" })).toBeInTheDocument();
});

test("canceling direct scheduling creates nothing, preserves Add Entry values, and restores focus", () => {
  const scroll = installDeferredScrollMocks();
  const saveMedicationEntry = jest.fn();
  const saveMedicationDoseSchedule = jest.fn();
  renderMedicationPage({ saveMedicationEntry, saveMedicationDoseSchedule });
  const form = entryForm();
  fillRequiredFields(form, { name: "Ipamorelin", doseAmount: "2.5" });
  fireEvent.change(form.getByLabelText("Notes (optional)"), { target: { value: "Keep this draft" } });
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  scroll.flush();

  const restoredForm = entryForm();
  expect(saveMedicationEntry).not.toHaveBeenCalled();
  expect(saveMedicationDoseSchedule).not.toHaveBeenCalled();
  expect(restoredForm.getByLabelText("Name")).toHaveValue("Ipamorelin");
  expect(restoredForm.getByLabelText("Amount / dose")).toHaveValue(2.5);
  expect(restoredForm.getByLabelText("Notes (optional)")).toHaveValue("Keep this draft");
  expect(restoredForm.getByRole("button", { name: "Save & Schedule" })).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Scheduling canceled. No dose was logged.");
  scroll.restore();
});

test("a direct scheduling failure keeps its scheduler draft without creating history", () => {
  const saveMedicationEntry = jest.fn();
  const saveMedicationDoseSchedule = jest.fn(() => ({
    status: "error",
    message: "Storage is unavailable.",
  }));
  renderMedicationPage({ saveMedicationEntry, saveMedicationDoseSchedule });
  const form = entryForm();
  fillRequiredFields(form, { name: "Ipamorelin" });
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));
  const scheduler = screen.getByRole("form", { name: "Schedule dose for Ipamorelin" });
  fireEvent.change(within(scheduler).getByLabelText("Medication or supplement classification"), { target: { value: "medication" } });
  fireEvent.change(within(scheduler).getByLabelText("Scheduled time"), { target: { value: "10:45" } });
  fireEvent.click(within(scheduler).getByRole("button", { name: "Schedule Dose" }));
  fireEvent.click(within(scheduler).getByRole("button", { name: "Schedule Dose" }));

  expect(within(scheduler).getByRole("alert")).toHaveTextContent("Storage is unavailable.");
  expect(within(scheduler).getByLabelText("Scheduled time")).toHaveValue("10:45");
  expect(saveMedicationDoseSchedule).toHaveBeenCalledTimes(2);
  expect(saveMedicationEntry).not.toHaveBeenCalled();
});

test("Save & Schedule uses reduced-motion scrolling and mobile-safe Add Entry actions", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = jest.fn();
  const shell = document.createElement("div");
  shell.className = "trace-app-shell";
  shell.dataset.motion = "reduced";
  document.body.appendChild(shell);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderMedicationPage();
  const form = entryForm();
  fillRequiredFields(form, { name: "Ipamorelin" });
  const actions = form.getByRole("button", { name: "Save & Schedule" }).closest("div");
  expect(actions).toHaveClass("trace-medication-entry__actions");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  fireEvent.click(form.getByRole("button", { name: "Save & Schedule" }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });

  shell.remove();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
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

test("saved selection navigates to the form heading only after defaults render", () => {
  const scroll = installDeferredScrollMocks();
  renderMedicationPage({
    compounds: [savedCompound({ defaultDoseAmount: "3.5" })],
  });
  selectSavedCompound();

  const heading = screen.getByRole("heading", { name: "Add Entry" });
  expect(entryForm().getByLabelText("Amount / dose")).toHaveValue(3.5);
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  scroll.flush();
  expect(Element.prototype.scrollIntoView.mock.instances[0]).toBe(heading);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  });
  scroll.restore();
});

test("Trace catalog selection identifies only, navigates after render, and snapshots the reference", () => {
  const scroll = installDeferredScrollMocks();
  const props = renderMedicationPage();
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "LY3437943" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select Trace compound Retatrutide" })
  );

  const form = entryForm();
  const heading = screen.getByRole("heading", { name: "Add Entry" });
  expect(form.getByLabelText("Name")).toHaveValue("Retatrutide");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(null);
  expect(form.getByLabelText("Dose unit")).toHaveValue("");
  expect(form.getByLabelText("Method / route")).toHaveValue("");
  expect(screen.queryByLabelText(/schedule|frequency/i)).not.toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  scroll.flush();
  expect(Element.prototype.scrollIntoView.mock.instances[0]).toBe(heading);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  });

  fireEvent.change(form.getByLabelText("Amount / dose"), { target: { value: "2.5" } });
  fireEvent.change(form.getByLabelText("Dose unit"), { target: { value: "mg" } });
  fireEvent.change(form.getByLabelText("Method / route"), {
    target: { value: "subcutaneous" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Retatrutide",
      dose: { amount: 2.5, unit: "mg" },
      route: { code: "subcutaneous" },
      compoundReference: {
        source: "trace-catalog",
        sourceId: "trace:compound:retatrutide",
        category: "peptide",
        modified: false,
      },
    })
  );
  scroll.restore();
});

test("renaming a Trace identity marks its reference modified", () => {
  const props = renderMedicationPage();
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "retatrutide" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select Trace compound Retatrutide" })
  );
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Name"), { target: { value: "My label" } });
  fireEvent.change(form.getByLabelText("Amount / dose"), { target: { value: "1" } });
  fireEvent.change(form.getByLabelText("Dose unit"), { target: { value: "mg" } });
  fireEvent.change(form.getByLabelText("Method / route"), { target: { value: "oral" } });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveMedicationEntry.mock.calls[0][0].compoundReference).toMatchObject({
    source: "trace-catalog",
    sourceId: "trace:compound:retatrutide",
    modified: true,
  });
});

test("custom continuation prefills only the name and remains a manual entry", () => {
  const props = renderMedicationPage();
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "  My   Custom  " },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Use “My Custom” as Custom Compound",
    })
  );
  const form = entryForm();
  expect(form.getByLabelText("Name")).toHaveValue("My Custom");
  expect(form.getByLabelText("Amount / dose")).toHaveValue(null);
  expect(form.getByLabelText("Save as reusable compound")).not.toBeChecked();
  fillRequiredFields(form, { name: "My Custom" });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  expect(props.saveMedicationEntry.mock.calls[0][0]).not.toHaveProperty(
    "compoundReference"
  );
});

test("canceling a catalog selection preserves and returns to compound search", () => {
  const scroll = installDeferredScrollMocks();
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  renderMedicationPage();
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "retatrutide" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select Trace compound Retatrutide" })
  );
  scroll.flush();
  fireEvent.click(entryForm().getByRole("button", { name: "Cancel Entry" }));
  scroll.flush();

  expect(screen.getByLabelText("Compound search")).toHaveValue("retatrutide");
  expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(
    screen.getByTestId("compound-search-context")
  );
  window.confirm = originalConfirm;
  scroll.restore();
});

test("unknown Trace references remain readable from their historical snapshot", () => {
  const entry = savedEntry({
    name: "Historical Catalog Name",
    compoundReference: {
      source: "trace-catalog",
      sourceId: "trace:compound:no-longer-present",
      category: "other",
      modified: false,
    },
  });
  renderMedicationPage({ medicationEntries: [entry] });

  expect(screen.getByText("Historical Catalog Name")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(entryForm().getByLabelText("Name")).toHaveValue(
    "Historical Catalog Name"
  );
  expect(entryForm().getByLabelText("Amount / dose")).toHaveValue(1.25);
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
    screen.queryByLabelText("Compound search")
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

function saveDoseResult(record, id = "schedule:test") {
  const schedule = createMedicationDoseSchedule(record, {
    id,
    now: new Date("2026-08-29T12:00:00.000Z"),
  });
  return schedule
    ? { status: "saved", schedule }
    : { status: "invalid", message: "Invalid schedule" };
}

function doseScheduleForDisplay(repeat = { type: "once" }, id = "schedule:display") {
  return createMedicationDoseSchedule({
    name: "Ipamorelin",
    classification: "medication",
    dose: { amount: 5, unit: "mg" },
    route: { code: "subcutaneous" },
    notes: "Display snapshot",
    source: { type: "medication-entry", id: "entry-ipamorelin" },
    repeat,
    startDate: medicationDoseDateKey(),
    endDate: null,
    time: "08:15",
  }, { id, now: new Date("2026-08-29T12:00:00.000Z") });
}

test("completed one-time schedule displays Taken after rerender from its linked occurrence", () => {
  const schedule = doseScheduleForDisplay();
  const completed = completeMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(schedule, medicationDoseDateKey()),
    new Date("2026-08-29T13:00:00.000Z")
  );
  const props = renderMedicationPage({
    medicationDoseSchedules: [schedule],
    medicationDoseOccurrences: [completed],
  });
  const card = screen.getByRole("heading", { name: "Ipamorelin" }).closest("article");
  expect(within(card).getByLabelText("Dose status: Taken")).toHaveTextContent("Taken");
  expect(within(card).queryByText("Active")).not.toBeInTheDocument();

  props.rerenderPage({ medicationDoseOccurrences: [completed] });
  expect(within(card).getByLabelText("Dose status: Taken")).toHaveTextContent("Taken");

  const restored = undoMedicationDoseCompletion(completed, new Date("2026-08-29T14:00:00.000Z"));
  props.rerenderPage({ medicationDoseOccurrences: [restored] });
  expect(within(card).getByLabelText("Dose status: Scheduled")).toHaveTextContent("Scheduled");
});

test.each([
  ["Scheduled", (item) => null],
  ["Skipped", (item) => skipMedicationDoseOccurrence(item, "Travel", "", new Date("2026-08-29T13:00:00.000Z"))],
  ["Removed", (item) => removeMedicationDoseOccurrence(item, new Date("2026-08-29T13:00:00.000Z"))],
])("one-time schedule displays %s from its occurrence state", (label, occurrenceFromItem) => {
  const schedule = doseScheduleForDisplay();
  const item = medicationDoseOccurrenceItem(schedule, medicationDoseDateKey());
  const occurrence = occurrenceFromItem(item);
  renderMedicationPage({
    medicationDoseSchedules: [schedule],
    medicationDoseOccurrences: occurrence ? [occurrence] : [],
  });
  const card = screen.getByRole("heading", { name: "Ipamorelin" }).closest("article");
  expect(within(card).getByLabelText(`Dose status: ${label}`)).toHaveTextContent(label);
});

test("recurring schedule prioritizes Taken today, keeps lifecycle text, next dose, and rerender state", () => {
  const schedule = doseScheduleForDisplay({ type: "daily" }, "schedule:daily-display");
  const completed = completeMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(schedule, medicationDoseDateKey()),
    new Date("2026-08-29T13:00:00.000Z")
  );
  const props = renderMedicationPage({
    medicationDoseSchedules: [schedule],
    medicationDoseOccurrences: [completed],
  });
  const card = screen.getByRole("heading", { name: "Ipamorelin" }).closest("article");
  expect(within(card).getByLabelText("Dose status: Taken today")).toHaveTextContent("Taken today");
  expect(within(card).getByText("Schedule active")).toBeInTheDocument();
  const nextDose = within(card).getByText((content, element) => (
    element.tagName === "P" && content.startsWith("Next dose:")
  ));
  expect(nextDose).toHaveTextContent(formatDateOnly(shiftMedicationDoseDate(medicationDoseDateKey(), 1)));
  expect(nextDose).toHaveTextContent("8:15");

  props.rerenderPage({ medicationDoseOccurrences: [completed] });
  expect(within(card).getByLabelText("Dose status: Taken today")).toBeInTheDocument();

  const restored = undoMedicationDoseCompletion(completed, new Date("2026-08-29T14:00:00.000Z"));
  props.rerenderPage({ medicationDoseOccurrences: [restored] });
  expect(within(card).getByLabelText("Dose status: Scheduled today")).toBeInTheDocument();
  expect(within(card).getByText("Schedule active")).toBeInTheDocument();
});

test.each([
  ["Scheduled today", (item) => null],
  ["Skipped today", (item) => skipMedicationDoseOccurrence(item, "Travel", "", new Date("2026-08-29T13:00:00.000Z"))],
  ["Removed today", (item) => removeMedicationDoseOccurrence(item, new Date("2026-08-29T13:00:00.000Z"))],
])("recurring schedule uses %s as its primary current badge", (label, occurrenceFromItem) => {
  const schedule = doseScheduleForDisplay({ type: "daily" }, `schedule:${label}`);
  const item = medicationDoseOccurrenceItem(schedule, medicationDoseDateKey());
  const occurrence = occurrenceFromItem(item);
  renderMedicationPage({
    medicationDoseSchedules: [schedule],
    medicationDoseOccurrences: occurrence ? [occurrence] : [],
  });
  const card = screen.getByRole("heading", { name: "Ipamorelin" }).closest("article");
  expect(within(card).getByLabelText(`Dose status: ${label}`)).toHaveTextContent(label);
  expect(within(card).getByText("Schedule active")).toBeInTheDocument();
});

test("recurring schedule without an occurrence today uses lifecycle as its primary badge", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWeekday = tomorrow.getDay() === 0 ? 7 : tomorrow.getDay();
  const schedule = doseScheduleForDisplay(
    { type: "weekdays", weekdays: [tomorrowWeekday] },
    "schedule:no-occurrence-today"
  );
  renderMedicationPage({ medicationDoseSchedules: [schedule] });
  const card = screen.getByRole("heading", { name: "Ipamorelin" }).closest("article");
  expect(within(card).getByLabelText("Dose status: Active schedule")).toHaveTextContent("Active schedule");
  expect(within(card).getByText("Schedule active")).toBeInTheDocument();
});

test("saved compounds open an inline one-time scheduler with editable dose and read-only route", () => {
  const compound = savedCompound({ defaultDoseAmount: "3.5" });
  const saveMedicationDoseSchedule = jest.fn((record) => saveDoseResult(record));
  renderMedicationPage({ compounds: [compound], saveMedicationDoseSchedule });
  fireEvent.change(screen.getByLabelText("Compound search"), { target: { value: "SS-31" } });
  const trigger = screen.getByRole("button", { name: "Schedule dose for saved compound SS-31" });
  fireEvent.click(trigger);

  const form = screen.getByRole("form", { name: "Schedule dose for SS-31" });
  expect(within(form).getByLabelText("Dose amount")).toHaveValue(3.5);
  expect(within(form).getByLabelText("Dose unit")).toHaveValue("mg");
  expect(within(form).getByLabelText("Saved route")).toHaveValue("Subcutaneous (SC)");
  expect(within(form).getByLabelText("Saved route")).toHaveAttribute("readonly");
  expect(within(form).getByLabelText("Medication or supplement classification")).toHaveValue("");
  expect(within(form).getByLabelText("Start date")).toHaveValue(medicationDoseDateKey());
  expect(within(form).getByLabelText("Scheduled time")).toHaveValue("");

  fireEvent.click(within(form).getByRole("button", { name: "Schedule Dose" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("Choose Medication or Supplement");
  expect(within(form).getByLabelText("Medication or supplement classification")).toHaveFocus();

  fireEvent.change(within(form).getByLabelText("Medication or supplement classification"), { target: { value: "supplement" } });
  fireEvent.change(within(form).getByLabelText("Dose amount"), { target: { value: "4" } });
  fireEvent.change(within(form).getByLabelText("Dose unit"), { target: { value: "custom" } });
  fireEvent.change(within(form).getByLabelText("Custom dose unit"), { target: { value: "micro scoop" } });
  fireEvent.change(within(form).getByLabelText("Scheduled time"), { target: { value: "08:30" } });
  fireEvent.click(within(form).getByRole("button", { name: "Schedule Dose" }));

  expect(saveMedicationDoseSchedule).toHaveBeenCalledWith(expect.objectContaining({
    name: "SS-31",
    classification: "supplement",
    dose: { amount: "4", unit: "custom", customUnit: "micro scoop" },
    route: { code: "subcutaneous" },
    repeat: { type: "once" },
    time: "08:30",
    source: { type: "saved-compound", id: compound.id },
  }), false);
  expect(screen.getByRole("status")).toHaveTextContent("SS-31 scheduled.");
});

test("logged history opens a prefilled recurring scheduler and infers a catalog medication", () => {
  const entry = savedEntry({
    name: "Catalog medicine",
    compoundReference: { source: "trace-catalog", sourceId: "catalog-med", category: "medication", modified: false },
  });
  const saveMedicationDoseSchedule = jest.fn((record) => saveDoseResult(record, "schedule:recurring"));
  renderMedicationPage({ medicationEntries: [entry], saveMedicationDoseSchedule });
  fireEvent.click(screen.getByRole("button", { name: "Schedule dose from logged entry Catalog medicine" }));

  const form = screen.getByRole("form", { name: "Schedule dose for Catalog medicine" });
  expect(within(form).getByLabelText("Medication or supplement classification")).toHaveValue("medication");
  expect(within(form).getByLabelText("Schedule notes (optional)")).toHaveValue("Historical note");
  fireEvent.change(within(form).getByLabelText("Dose recurrence"), { target: { value: "weekdays" } });
  expect(within(form).getByRole("group", { name: "Selected weekdays" })).toBeInTheDocument();
  fireEvent.click(within(form).getByLabelText("Monday"));
  fireEvent.change(within(form).getByLabelText("End date (optional)"), { target: { value: "2026-12-31" } });
  fireEvent.change(within(form).getByLabelText("Scheduled time"), { target: { value: "21:05" } });
  fireEvent.click(within(form).getByRole("button", { name: "Schedule Dose" }));

  expect(saveMedicationDoseSchedule).toHaveBeenCalledWith(expect.objectContaining({
    repeat: { type: "weekdays", weekdays: [1] },
    endDate: "2026-12-31",
    time: "21:05",
    source: { type: "medication-entry", id: entry.id },
  }), false);
});

test("dirty scheduler cancellation confirms and restores focus to its compound-specific trigger", () => {
  const scroll = installDeferredScrollMocks();
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => false);
  renderMedicationPage({ medicationEntries: [savedEntry()] });
  const trigger = screen.getByRole("button", { name: "Schedule dose from logged entry Medication A" });
  fireEvent.click(trigger);
  const form = screen.getByRole("form", { name: "Schedule dose for Medication A" });
  fireEvent.change(within(form).getByLabelText("Dose amount"), { target: { value: "2" } });
  fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
  expect(form).toBeInTheDocument();

  window.confirm.mockReturnValue(true);
  fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
  scroll.flush();
  expect(screen.queryByRole("form", { name: "Schedule dose for Medication A" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(window.confirm).toHaveBeenCalledWith("Cancel scheduling this dose? Your unsaved changes will be lost.");
  window.confirm = originalConfirm;
  scroll.restore();
});

test("duplicate scheduling warns, allows explicit confirmation, and surfaces storage failure", () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const saveMedicationDoseSchedule = jest.fn((record, confirmed) => confirmed
    ? saveDoseResult(record, "schedule:intentional-duplicate")
    : { status: "duplicate", duplicate: { date: record.startDate, time: record.time } });
  renderMedicationPage({ medicationEntries: [savedEntry()], saveMedicationDoseSchedule });
  fireEvent.click(screen.getByRole("button", { name: "Schedule dose from logged entry Medication A" }));
  const form = screen.getByRole("form", { name: "Schedule dose for Medication A" });
  fireEvent.change(within(form).getByLabelText("Medication or supplement classification"), { target: { value: "medication" } });
  fireEvent.change(within(form).getByLabelText("Scheduled time"), { target: { value: "12:45" } });
  fireEvent.click(within(form).getByRole("button", { name: "Schedule Dose" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Add another dose?"));
  expect(saveMedicationDoseSchedule.mock.calls.map((call) => call[1])).toEqual([false, true]);

  window.confirm = originalConfirm;
});

test("Scheduled Doses supports series edit, end, and destructive deletion without hiding history", () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const value = createMedicationDoseSchedule({
    name: "Managed dose",
    classification: "medication",
    dose: { amount: 5, unit: "mg" },
    route: { code: "oral" },
    notes: "Snapshot notes",
    source: { type: "medication-entry", id: "entry-managed" },
    repeat: { type: "daily" },
    startDate: "2026-08-29",
    endDate: null,
    time: "07:00",
  }, { id: "schedule:managed", now: new Date("2026-08-29T12:00:00.000Z") });
  const endMedicationDoseSchedule = jest.fn(() => true);
  const deleteMedicationDoseSchedule = jest.fn(() => true);
  renderMedicationPage({
    medicationEntries: [savedEntry()],
    medicationDoseSchedules: [value],
    endMedicationDoseSchedule,
    deleteMedicationDoseSchedule,
  });
  const section = screen.getByRole("heading", { name: "Scheduled Doses" }).closest("section");
  expect(within(section).getByText("Managed dose")).toBeInTheDocument();
  expect(within(section).getByText(/Every day/)).toBeInTheDocument();
  fireEvent.click(within(section).getByRole("button", { name: "Edit dose schedule for Managed dose" }));
  expect(screen.getByRole("form", { name: "Edit dose schedule for Managed dose" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(within(section).getByRole("button", { name: "End dose schedule for Managed dose" }));
  fireEvent.click(within(section).getByRole("button", { name: "Delete dose schedule for Managed dose" }));
  expect(endMedicationDoseSchedule).toHaveBeenCalledWith(value.id);
  expect(deleteMedicationDoseSchedule).toHaveBeenCalledWith(value.id);
  expect(screen.getByText("Medication A")).toBeInTheDocument();
  expect(window.confirm.mock.calls.join(" ")).toMatch(/Medication History will be preserved/);
  window.confirm = originalConfirm;
});

test("ending moves a schedule into an accessible collapsed section and deletion hides its card", () => {
  const originalConfirm = window.confirm;
  const originalBounds = Element.prototype.getBoundingClientRect;
  const shell = document.createElement("div");
  shell.className = "trace-app-shell";
  shell.dataset.motion = "reduced";
  document.body.appendChild(shell);
  window.confirm = jest.fn(() => true);
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    top: 900,
    bottom: 950,
    left: 0,
    right: 300,
    width: 300,
    height: 50,
  }));
  const scroll = installDeferredScrollMocks();
  const active = createMedicationDoseSchedule({
    name: "Lifecycle dose",
    classification: "medication",
    dose: { amount: 5, unit: "mg" },
    route: { code: "oral" },
    notes: "",
    source: { type: "medication-entry", id: "entry-lifecycle" },
    repeat: { type: "daily" },
    startDate: medicationDoseDateKey(),
    endDate: null,
    time: "07:00",
  }, { id: "schedule:lifecycle", now: new Date("2026-08-29T12:00:00.000Z") });
  const ended = endDoseScheduleRecord(active, medicationDoseDateKey());
  const deleted = deleteDoseScheduleRecord(ended, medicationDoseDateKey());
  const endMedicationDoseSchedule = jest.fn(() => true);
  const deleteMedicationDoseSchedule = jest.fn(() => true);
  const view = renderMedicationPage({
    medicationEntries: [savedEntry()],
    medicationDoseSchedules: [active],
    endMedicationDoseSchedule,
    deleteMedicationDoseSchedule,
  });

  fireEvent.click(screen.getByRole("button", { name: "End dose schedule for Lifecycle dose" }));
  view.rerenderPage({ medicationDoseSchedules: [ended] });
  scroll.flush();
  const disclosure = screen.getByRole("button", { name: "Ended schedules (1)" });
  expect(disclosure).toHaveAttribute("aria-expanded", "false");
  expect(disclosure).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "nearest" });
  expect(screen.queryByText("Lifecycle dose")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Future doses were removed");

  fireEvent.click(disclosure);
  expect(disclosure).toHaveAttribute("aria-expanded", "true");
  const endedCard = screen.getByText("Lifecycle dose").closest("article");
  expect(within(endedCard).getByLabelText("Dose status: Ended schedule")).toHaveTextContent("Ended schedule");
  expect(within(endedCard).getByText("Schedule ended")).toBeInTheDocument();
  expect(within(endedCard).queryByText(/Next dose:/)).not.toBeInTheDocument();
  expect(within(endedCard).getByRole("button", { name: "Delete dose schedule for Lifecycle dose" })).toBeInTheDocument();

  fireEvent.click(within(endedCard).getByRole("button", { name: "Delete dose schedule for Lifecycle dose" }));
  view.rerenderPage({ medicationDoseSchedules: [deleted] });
  scroll.flush();
  expect(screen.queryByText("Lifecycle dose")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Ended schedules/ })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Scheduled Doses" })).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Today and upcoming doses were removed");
  expect(screen.getByText("Medication A")).toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);

  scroll.restore();
  Element.prototype.getBoundingClientRect = originalBounds;
  window.confirm = originalConfirm;
  shell.remove();
});

test("scheduler reports save failures, uses reduced-motion scrolling, and remains contained at 390px and 320px", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = jest.fn();
  const shell = document.createElement("div");
  shell.className = "trace-app-shell";
  shell.dataset.motion = "reduced";
  document.body.appendChild(shell);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const longName = "A very long medication or supplement name that must wrap safely without widening the page";
  renderMedicationPage({
    medicationEntries: [savedEntry({
      name: longName,
      dose: { amount: 1, unit: "custom", customUnit: "an intentionally long custom unit name" },
    })],
    saveMedicationDoseSchedule: jest.fn(() => ({ status: "error", message: "Storage is unavailable." })),
  });
  fireEvent.click(screen.getByRole("button", { name: `Schedule dose from logged entry ${longName}` }));
  const form = screen.getByRole("form", { name: `Schedule dose for ${longName}` });
  expect(within(form).getByLabelText("Custom dose unit")).toHaveValue("an intentionally long custom unit name");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  fireEvent.change(within(form).getByLabelText("Medication or supplement classification"), { target: { value: "medication" } });
  fireEvent.change(within(form).getByLabelText("Scheduled time"), { target: { value: "12:45" } });
  fireEvent.click(within(form).getByRole("button", { name: "Schedule Dose" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("Storage is unavailable.");
  expect(screen.queryByText(`${longName} scheduled.`)).not.toBeInTheDocument();
  shell.remove();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});
