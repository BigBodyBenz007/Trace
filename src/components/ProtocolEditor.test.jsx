import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ProtocolEditor from "./ProtocolEditor";

let raf;
let originalInnerWidth;
beforeEach(() => {
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
  render(<ProtocolEditor onSave={onSave} onCancel={onCancel} />);
  expect(screen.getAllByRole("button", { name: "Save Protocol" })).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "Cancel Protocol" })).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "Plan" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save Protocol" })[0]);
  expect(screen.getByRole("alert")).toHaveTextContent("at least one");
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[1]);
  expect(onCancel).toHaveBeenCalled();
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
