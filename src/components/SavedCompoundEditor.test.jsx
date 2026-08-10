import { fireEvent, render, screen } from "@testing-library/react";
import SavedCompoundEditor from "./SavedCompoundEditor";
import { createCompoundDefinition } from "../services/compoundCatalog";

function compound(overrides = {}) {
  return createCompoundDefinition({
    name: "Retatrutide",
    defaultDoseAmount: "",
    doseUnit: "mg",
    route: "subcutaneous",
    ...overrides,
  });
}

test("adds, changes, and removes an explicitly entered saved default amount", () => {
  const onSave = jest.fn(() => ({ status: "updated" }));
  const onCancel = jest.fn();
  const { rerender } = render(
    <SavedCompoundEditor
      compound={compound()}
      onSave={onSave}
      onCancel={onCancel}
      buttonStyle={{}}
      inputStyle={{}}
    />
  );
  fireEvent.change(screen.getByLabelText("Saved default dose amount (optional)"), {
    target: { value: "20" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Compound" }));
  expect(onSave).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ defaultDoseAmount: "20" })
  );

  onSave.mockClear();
  rerender(
    <SavedCompoundEditor
      key="with-amount"
      compound={compound({ defaultDoseAmount: "20" })}
      onSave={onSave}
      onCancel={onCancel}
      buttonStyle={{}}
      inputStyle={{}}
    />
  );
  fireEvent.change(screen.getByLabelText("Saved default dose amount (optional)"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Compound" }));
  expect(onSave).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ defaultDoseAmount: "" })
  );
});

test("edits custom unit and route values", () => {
  const onSave = jest.fn(() => ({ status: "updated" }));
  render(
    <SavedCompoundEditor
      compound={compound()}
      onSave={onSave}
      onCancel={jest.fn()}
      buttonStyle={{}}
      inputStyle={{}}
    />
  );
  fireEvent.change(screen.getByLabelText("Saved dose unit"), {
    target: { value: "custom" },
  });
  fireEvent.change(screen.getByLabelText("Saved custom dose unit"), {
    target: { value: "sprays" },
  });
  fireEvent.change(screen.getByLabelText("Saved method / route"), {
    target: { value: "other" },
  });
  fireEvent.change(screen.getByLabelText("Saved other method / route"), {
    target: { value: "Recorded route" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Compound" }));

  expect(onSave).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      doseUnit: "custom",
      customDoseUnit: "sprays",
      route: "other",
      customRoute: "Recorded route",
    })
  );
});

test("shows a neutral catalog collision error and stays open", () => {
  const onCancel = jest.fn();
  render(
    <SavedCompoundEditor
      compound={compound()}
      onSave={jest.fn(() => ({
        status: "collision",
        message: "Another saved compound already uses that name.",
      }))}
      onCancel={onCancel}
      buttonStyle={{}}
      inputStyle={{}}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Save Saved Compound" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Another saved compound already uses that name."
  );
  expect(onCancel).not.toHaveBeenCalled();
});

test("keeps the editor open when catalog persistence fails", () => {
  const onCancel = jest.fn();
  render(
    <SavedCompoundEditor
      compound={compound()}
      onSave={jest.fn(() => ({
        status: "error",
        message: "The saved compound could not be updated.",
      }))}
      onCancel={onCancel}
      buttonStyle={{}}
      inputStyle={{}}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Save Saved Compound" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "The saved compound could not be updated."
  );
  expect(onCancel).not.toHaveBeenCalled();
});
