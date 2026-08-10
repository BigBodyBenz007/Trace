import { fireEvent, render, screen, within } from "@testing-library/react";
import MedicationPage from "./MedicationPage";

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
  const props = {
    onBack: jest.fn(),
    medicationEntries: [],
    saveMedicationEntry: jest.fn(() => true),
    updateMedicationEntry: jest.fn(() => true),
    deleteMedicationEntry: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };

  render(<MedicationPage {...props} />);
  return props;
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
