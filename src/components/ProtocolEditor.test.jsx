import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ProtocolEditor from "./ProtocolEditor";
import { readFormDraftCollection, writeFormDraft } from "../services/formDrafts";

let raf;
let originalInnerWidth;
beforeEach(() => {
  localStorage.clear();
  raf = window.requestAnimationFrame;
  originalInnerWidth = window.innerWidth;
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  Element.prototype.scrollIntoView = jest.fn();
});
afterEach(() => {
  window.requestAnimationFrame = raf;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: originalInnerWidth });
});

function addCustom(name = "My Compound") {
  fireEvent.click(screen.getByRole("button", { name: "Add Protocol Item" }));
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Use.*${name}.*Custom`) }));
  return screen.getByRole("article", { name: new RegExp(name) });
}

function completeProtocol(name = "Complete protocol") {
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: name } });
  const item = addCustom("Draft compound");
  fireEvent.change(within(item).getByLabelText("Dose amount"), { target: { value: "2" } });
  fireEvent.change(within(item).getByLabelText("Dose unit"), { target: { value: "mg" } });
  fireEvent.change(within(item).getByLabelText("Route"), { target: { value: "oral" } });
  fireEvent.click(within(item).getByLabelText("Monday"));
}

test("creates multiple user-authored items with unselected schedules and every-day convenience", () => {
  const onSave = jest.fn(() => ({ status: "saved" }));
  render(<ProtocolEditor onSave={onSave} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "My plan" } });
  const first = addCustom("Alpha");
  expect(within(first).getByLabelText("Monday")).not.toBeChecked();
  fireEvent.change(within(first).getByLabelText("Dose amount"), { target: { value: "2.5" } });
  fireEvent.change(within(first).getByLabelText("Dose unit"), { target: { value: "mg" } });
  fireEvent.change(within(first).getByLabelText("Route"), { target: { value: "oral" } });
  fireEvent.click(within(first).getByRole("button", { name: "Every day" }));
  const second = addCustom("Beta");
  fireEvent.change(within(second).getByLabelText("Dose amount"), { target: { value: "1" } });
  fireEvent.change(within(second).getByLabelText("Dose unit"), { target: { value: "custom" } });
  fireEvent.change(within(second).getByLabelText("Custom dose unit"), { target: { value: "scoop" } });
  fireEvent.change(within(second).getByLabelText("Route"), { target: { value: "other" } });
  fireEvent.change(within(second).getByLabelText("Custom route"), { target: { value: "custom method" } });
  fireEvent.click(within(second).getByLabelText("Monday"));
  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  const draft = onSave.mock.calls[0][0];
  expect(draft.items).toHaveLength(2);
  expect(draft.items[0].schedule.weekdays).toEqual([1,2,3,4,5,6,7]);
  expect(draft.items[1].dose).toMatchObject({ amount: "1", unit: "custom", customUnit: "scoop" });
});

test("requires an item and a selected weekday and provides top and bottom controls", () => {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<ProtocolEditor onSave={onSave} onCancel={onCancel} />);
  expect(screen.getAllByRole("button", { name: "Save Protocol" })).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "Cancel Protocol" })).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "Plan" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  expect(screen.getByRole("alert")).toHaveTextContent("at least one");
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[1]);
  expect(confirm).toHaveBeenCalledWith("Cancel this Protocol? Your unsaved changes will be lost.");
  expect(onCancel).toHaveBeenCalled();
  confirm.mockRestore();
});

test("removing an item returns to the item section and does not mutate saved defaults", () => {
  const compounds = [{ id: "saved:1", name: "Creatine", defaults: { dose: { amount: 5, unit: "g" }, route: { code: "oral" } } }];
  const original = JSON.parse(JSON.stringify(compounds));
  render(<ProtocolEditor compounds={compounds} onSave={jest.fn()} onCancel={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Add Protocol Item" }));
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: "Creatine" } });
  fireEvent.click(screen.getByLabelText("Select saved protocol compound Creatine"));
  const item = screen.getByRole("article", { name: /Creatine/ });
  fireEvent.change(within(item).getByLabelText("Dose amount"), { target: { value: "10" } });
  fireEvent.click(within(item).getByRole("button", { name: "Remove Item" }));
  expect(compounds).toEqual(original);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
});

test("focuses each newly opened protocol item search input", () => {
  render(<ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Add Protocol Item" }));
  const firstSearch = screen.getByLabelText("Protocol compound search");
  expect(firstSearch).toHaveFocus();
  fireEvent.change(firstSearch, { target: { value: "First item" } });
  fireEvent.click(screen.getByRole("button", { name: /Use.*First item.*Custom/ }));

  fireEvent.click(screen.getByRole("button", { name: "Add Protocol Item" }));
  const secondSearch = screen.getByLabelText("Protocol compound search");
  expect(secondSearch).not.toBe(firstSearch);
  expect(secondSearch).toHaveFocus();
  expect(firstSearch).not.toHaveFocus();
});

test("renders Sunday first and Every day restores the exact prior weekday selection", () => {
  render(<ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />);
  const item = addCustom("Schedule item");
  const labels = within(item).getAllByRole("checkbox").map((input) => input.parentElement.textContent.trim());
  expect(labels).toEqual(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const everyDay = within(item).getByRole("button", { name: "Every day" });
  fireEvent.click(within(item).getByLabelText("Monday"));
  fireEvent.click(within(item).getByLabelText("Wednesday"));
  fireEvent.click(within(item).getByLabelText("Friday"));
  fireEvent.click(everyDay);
  expect(within(item).getAllByRole("checkbox").every((input) => input.checked)).toBe(true);
  fireEvent.click(everyDay);
  expect(within(item).getByLabelText("Monday")).toBeChecked();
  expect(within(item).getByLabelText("Wednesday")).toBeChecked();
  expect(within(item).getByLabelText("Friday")).toBeChecked();
  ["Sunday", "Tuesday", "Thursday", "Saturday"].forEach((day) => {
    expect(within(item).getByLabelText(day)).not.toBeChecked();
  });
  fireEvent.click(everyDay);
  expect(within(item).getAllByRole("checkbox").every((input) => input.checked)).toBe(true);
  fireEvent.click(everyDay);
  expect(within(item).getByLabelText("Monday")).toBeChecked();
  expect(within(item).getByLabelText("Wednesday")).toBeChecked();
  expect(within(item).getByLabelText("Friday")).toBeChecked();
});

test("manual weekday changes discard an Every day restore snapshot", () => {
  render(<ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />);
  const item = addCustom("Schedule reset item");
  const everyDay = within(item).getByRole("button", { name: "Every day" });
  fireEvent.click(within(item).getByLabelText("Monday"));
  fireEvent.click(everyDay);
  fireEvent.click(within(item).getByLabelText("Tuesday"));
  fireEvent.click(everyDay);
  fireEvent.click(everyDay);

  expect(within(item).getByLabelText("Monday")).toBeChecked();
  expect(within(item).getByLabelText("Tuesday")).not.toBeChecked();
});

test("restores a create draft after remount and Cancel is the explicit confirmed discard path", () => {
  const first = render(<ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "Unfinished protocol" } });
  fireEvent.change(screen.getByLabelText("End date (optional)"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Protocol notes (optional)"), { target: { value: "Exact notes" } });
  first.unmount();

  const onCancel = jest.fn();
  const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<ProtocolEditor onSave={jest.fn()} onCancel={onCancel} />);
  expect(screen.getByLabelText("Protocol name")).toHaveValue("Unfinished protocol");
  expect(screen.getByLabelText("Protocol notes (optional)")).toHaveValue("Exact notes");
  fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[0]);
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[0]);
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem("formDrafts")).entries).toHaveLength(0);
  confirm.mockRestore();
});

test("failed Protocol save preserves its complete draft and successful retry clears it", () => {
  const onSave = jest.fn(() => ({ status: "error", message: "Storage full" }));
  const onSaved = jest.fn();
  render(<ProtocolEditor onSave={onSave} onSaved={onSaved} onCancel={jest.fn()} />);
  completeProtocol();

  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent("Storage full");
  expect(readFormDraftCollection(localStorage).entries).toEqual([
    expect.objectContaining({ domain: "protocol", context: "create" }),
  ]);

  onSave.mockReturnValue({ status: "saved", protocol: { id: "protocol:saved" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(readFormDraftCollection(localStorage).entries).toHaveLength(0);
});

test("Protocol save and discard stay open with the recoverable draft when cleanup storage fails", () => {
  const onSaved = jest.fn();
  const onCancel = jest.fn();
  const view = render(<ProtocolEditor onSave={jest.fn(() => ({ status: "saved", protocol: { id: "saved" } }))} onSaved={onSaved} onCancel={onCancel} />);
  completeProtocol("Cleanup race");
  const originalBytes = localStorage.getItem("formDrafts");
  const writeFailure = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("saved, but Trace could not clear");
    expect(localStorage.getItem("formDrafts")).toBe(originalBytes);

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[0]);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("left available for recovery");
    expect(localStorage.getItem("formDrafts")).toBe(originalBytes);
  } finally {
    confirm.mockRestore();
    writeFailure.mockRestore();
    view.unmount();
  }
});

test("Protocol save accepts only one submission while save completion is in progress", () => {
  let form;
  const onSave = jest.fn(() => {
    fireEvent.submit(form);
    return { status: "saved", protocol: { id: "protocol:single" } };
  });
  const onSaved = jest.fn();
  render(<ProtocolEditor onSave={onSave} onSaved={onSaved} onCancel={jest.fn()} />);
  completeProtocol("Single save");
  form = screen.getByRole("heading", { name: "Create Protocol" }).closest("form");

  fireEvent.submit(form);

  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button", { name: "Save Protocol" }).every((button) => button.disabled)).toBe(true);
  expect(screen.getAllByRole("button", { name: "Cancel Protocol" }).every((button) => button.disabled)).toBe(true);
});

test("Protocol edit drafts stay record-specific and a newer saved baseline is not overwritten", () => {
  const base = {
    id: "protocol:one", name: "Original one", startDate: "2026-09-01", endDate: null,
    status: "active", notes: "saved one", items: [], updatedAt: "2026-09-01T00:00:00.000Z",
  };
  const first = render(<ProtocolEditor protocol={base} onSave={jest.fn()} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol notes (optional)"), { target: { value: "unfinished one" } });
  first.unmount();

  const secondRecord = { ...base, id: "protocol:two", name: "Original two", notes: "saved two" };
  const second = render(<ProtocolEditor protocol={secondRecord} onSave={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByLabelText("Protocol notes (optional)")).toHaveValue("saved two");
  second.unmount();

  render(<ProtocolEditor protocol={{ ...base, notes: "newer saved one", updatedAt: "2026-09-02T00:00:00.000Z" }} onSave={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByLabelText("Protocol notes (optional)")).toHaveValue("newer saved one");
  expect(screen.getByRole("alert")).toHaveTextContent("changed after an unfinished edit");
  expect(readFormDraftCollection(localStorage).entries.some(({ context }) => context === "edit:protocol:one")).toBe(true);
});

test("a malformed nested Protocol draft is quarantined without crashing or deleting recovery data", () => {
  const context = { domain: "protocol", context: "create", sourceFingerprint: null };
  const initial = { name: "", startDate: "2026-09-09", endDate: "", notes: "", items: [] };
  writeFormDraft(localStorage, context, initial, { ...initial, name: "Recoverable text", items: [{}] });

  render(<ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByLabelText("Protocol name")).toHaveValue("");
  expect(screen.getByRole("alert")).toHaveTextContent(/malformed unfinished form data|could not preserve/i);
  expect(readFormDraftCollection(localStorage).entries[0].value).toMatchObject({
    name: "Recoverable text",
    items: [{}],
  });
});

test.each([
  ["desktop", 1440],
  ["phone", 390],
])("Every day has identical undo transitions in %s conditions under Strict Mode", (_, width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  render(
    <StrictMode>
      <ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />
    </StrictMode>
  );
  const item = addCustom(`Responsive schedule ${width}`);
  ["Monday", "Wednesday", "Friday"].forEach((day) => {
    fireEvent.click(within(item).getByLabelText(day));
  });
  const everyDay = within(item).getByRole("button", { name: "Every day" });

  fireEvent.click(everyDay);
  expect(within(item).getAllByRole("checkbox").every(({ checked }) => checked)).toBe(true);

  fireEvent.click(everyDay);
  expect(within(item).getAllByRole("checkbox").filter(({ checked }) => checked)
    .map((input) => input.parentElement.textContent.trim()))
    .toEqual(["Monday", "Wednesday", "Friday"]);

  fireEvent.click(everyDay);
  expect(within(item).getAllByRole("checkbox").every(({ checked }) => checked)).toBe(true);
});

test.each([
  ["desktop", 1440],
  ["phone", 390],
])("manual weekday edits invalidate the Every day snapshot in %s conditions", (_, width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  render(
    <StrictMode>
      <ProtocolEditor onSave={jest.fn()} onCancel={jest.fn()} />
    </StrictMode>
  );
  const item = addCustom(`Manual schedule ${width}`);
  fireEvent.click(within(item).getByLabelText("Monday"));
  const everyDay = within(item).getByRole("button", { name: "Every day" });
  fireEvent.click(everyDay);
  fireEvent.click(within(item).getByLabelText("Tuesday"));
  fireEvent.click(everyDay);
  fireEvent.click(everyDay);

  expect(within(item).getByLabelText("Monday")).toBeChecked();
  expect(within(item).getByLabelText("Tuesday")).not.toBeChecked();
});
