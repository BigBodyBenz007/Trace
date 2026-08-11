import { act, fireEvent, render, screen } from "@testing-library/react";
import ProtocolCompoundPicker from "./ProtocolCompoundPicker";
import { createCompoundDefinition } from "../services/compoundCatalog";

function saved(name = "Retatrutide") {
  return createCompoundDefinition({
    name,
    defaultDoseAmount: "2.5",
    doseUnit: "mg",
    route: "subcutaneous",
  });
}

test("keeps same-name saved and Trace results distinct and prefills only saved defaults", () => {
  const onSelect = jest.fn();
  const definition = saved();
  render(<ProtocolCompoundPicker compounds={[definition]} onSelect={onSelect} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: "retatrutide" } });
  expect(screen.getByRole("region", { name: "Protocol Saved Compounds" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Protocol Trace Compound Database" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Select saved protocol compound Retatrutide" }));
  expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
    compound: { name: "Retatrutide", reference: { source: "user-saved", sourceId: definition.id, modified: false } },
    dose: { amount: "2.5", unit: "mg", customUnit: "" },
    route: { code: "subcutaneous", customLabel: "" },
    schedule: { type: "weekly-days", weekdays: [] },
  }));
});

test("alias-selected Trace identity supplies no logging or schedule defaults", () => {
  const onSelect = jest.fn();
  render(<ProtocolCompoundPicker compounds={[]} onSelect={onSelect} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: "LY3437943" } });
  expect(screen.getByText("Matched alias: LY3437943")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select Trace protocol compound Retatrutide" }));
  expect(onSelect).toHaveBeenCalledWith({
    compound: { name: "Retatrutide", reference: { source: "trace-catalog", sourceId: "trace:compound:retatrutide", category: "peptide", modified: false } },
    dose: { amount: "", unit: "", customUnit: "" },
    route: { code: "", customLabel: "" },
    schedule: { type: "weekly-days", weekdays: [] },
    notes: "",
  });
});

test("custom selection provides only the normalized name and never creates a saved definition", () => {
  const onSelect = jest.fn();
  render(<ProtocolCompoundPicker compounds={[]} onSelect={onSelect} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Protocol compound search"), { target: { value: "  My   Compound " } });
  fireEvent.click(screen.getByRole("button", { name: "Use “My Compound” as Custom Compound" }));
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
    compound: { name: "My Compound" },
    dose: { amount: "", unit: "", customUnit: "" },
    route: { code: "", customLabel: "" },
    schedule: { type: "weekly-days", weekdays: [] },
  }));
});

test("Escape and visible cancel both dismiss the nested picker", () => {
  const onCancel = jest.fn();
  render(<ProtocolCompoundPicker compounds={[]} onSelect={jest.fn()} onCancel={onCancel} />);
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel Add Item" }));
  expect(onCancel).toHaveBeenCalledTimes(2);
});

test("narrow visual viewport keeps a hidden focused search visible after focus and viewport resize", () => {
  const listeners = {};
  const originalViewport = window.visualViewport;
  const originalWidth = window.innerWidth;
  const originalFrame = window.requestAnimationFrame;
  const originalCancelFrame = window.cancelAnimationFrame;
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: {
    width: 390, height: 400, offsetTop: 0,
    addEventListener: jest.fn((name, callback) => { listeners[name] = callback; }),
    removeEventListener: jest.fn(),
  } });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const inputScroll = jest.fn();
  render(<ProtocolCompoundPicker compounds={[]} onSelect={jest.fn()} onCancel={jest.fn()} />);
  const input = screen.getByLabelText("Protocol compound search");
  input.scrollIntoView = inputScroll;
  input.getBoundingClientRect = () => ({ top: 430, bottom: 470 });
  act(() => input.focus());
  fireEvent.focus(input);
  expect(inputScroll).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  inputScroll.mockClear();
  listeners.resize();
  expect(inputScroll).toHaveBeenCalled();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: originalViewport });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  window.requestAnimationFrame = originalFrame;
  window.cancelAnimationFrame = originalCancelFrame;
});

test("viewport handling does not scroll a visible mobile search or affect desktop", () => {
  const originalViewport = window.visualViewport;
  Object.defineProperty(window, "visualViewport", { configurable: true, value: { width: 1200, height: 800, offsetTop: 0, addEventListener: jest.fn(), removeEventListener: jest.fn() } });
  render(<ProtocolCompoundPicker compounds={[]} onSelect={jest.fn()} onCancel={jest.fn()} />);
  const input = screen.getByLabelText("Protocol compound search");
  input.scrollIntoView = jest.fn();
  fireEvent.focus(input);
  expect(input.scrollIntoView).not.toHaveBeenCalled();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: originalViewport });
});
