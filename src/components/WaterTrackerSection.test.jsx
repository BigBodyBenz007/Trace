import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import WaterTrackerSection from "./WaterTrackerSection";
import { waterAmountToMilliliters } from "../services/waterTracker";

function Harness({ initialEntries = [], initialUnit = "oz", spies = {} }) {
  const [entries, setEntries] = useState(initialEntries);
  const [unit, setUnit] = useState(initialUnit);
  function saveEntry(entry) {
    spies.saveEntry?.(entry);
    setEntries((current) => [...current, { ...entry, id: `water-${current.length + 1}` }]);
    return true;
  }
  function updateEntry(id, update) {
    spies.updateEntry?.(id, update);
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...update, id } : entry));
    return true;
  }
  function deleteEntry(id) {
    spies.deleteEntry?.(id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
    return true;
  }
  return <WaterTrackerSection
    entries={entries}
    unit={unit}
    changeUnit={(nextUnit) => { setUnit(nextUnit); return true; }}
    saveEntry={saveEntry}
    updateEntry={updateEntry}
    deleteEntry={deleteEntry}
    showConfirmation={spies.showConfirmation}
  />;
}

function todaySummary() {
  return within(screen.getByLabelText("Water intake summary")).getByText("Today").closest("article");
}

function historyEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `water-history-${index + 1}`,
    amountMl: 100 + index,
    loggedAt: new Date(2026, 7, index + 1, 12).toISOString(),
  }));
}

function visibleHistoryEntries() {
  return [...document.querySelectorAll(".trace-water__history-entry")];
}

test("quick-add logs water immediately and updates today's total", () => {
  const spies = { saveEntry: jest.fn(), showConfirmation: jest.fn() };
  render(<Harness spies={spies} />);
  expect(todaySummary()).toHaveTextContent("0 oz");

  fireEvent.click(screen.getByRole("button", { name: "Log 8 oz water" }));

  expect(spies.saveEntry).toHaveBeenCalledWith(expect.objectContaining({
    amountMl: waterAmountToMilliliters(8, "oz"),
  }));
  expect(todaySummary()).toHaveTextContent("8 oz");
  expect(spies.showConfirmation).toHaveBeenCalledWith("Water traced");
});

test("custom amount accepts oz and mL input", () => {
  const ozSpies = { saveEntry: jest.fn() };
  const first = render(<Harness spies={ozSpies} />);
  fireEvent.click(screen.getByRole("button", { name: "Custom Amount" }));
  fireEvent.change(screen.getByLabelText("Custom water amount in oz"), { target: { value: "20" } });
  fireEvent.click(screen.getByRole("button", { name: "Log Water" }));
  expect(ozSpies.saveEntry).toHaveBeenCalledWith(expect.objectContaining({
    amountMl: waterAmountToMilliliters(20, "oz"),
  }));
  first.unmount();

  const mlSpies = { saveEntry: jest.fn() };
  render(<Harness initialUnit="mL" spies={mlSpies} />);
  fireEvent.click(screen.getByRole("button", { name: "Custom Amount" }));
  fireEvent.change(screen.getByLabelText("Custom water amount in mL"), { target: { value: "425" } });
  fireEvent.click(screen.getByRole("button", { name: "Log Water" }));
  expect(mlSpies.saveEntry).toHaveBeenCalledWith(expect.objectContaining({ amountMl: 425 }));
});

test("switching display units never mutates an entry's canonical amount", () => {
  const amountMl = waterAmountToMilliliters(8, "oz");
  const entry = { id: "stable", amountMl, loggedAt: new Date().toISOString() };
  const spies = { updateEntry: jest.fn() };
  render(<Harness initialEntries={[entry]} spies={spies} />);
  expect(todaySummary()).toHaveTextContent("8 oz");

  fireEvent.click(screen.getByRole("button", { name: "Display water in milliliters" }));
  expect(todaySummary()).toHaveTextContent("237 mL");
  fireEvent.click(screen.getByRole("button", { name: "Display water in fluid ounces" }));
  expect(todaySummary()).toHaveTextContent("8 oz");
  expect(spies.updateEntry).not.toHaveBeenCalled();
});

test("edits an entry in place and updates the total", () => {
  const spies = { updateEntry: jest.fn(), showConfirmation: jest.fn() };
  render(<Harness initialEntries={[{
    id: "water-original",
    amountMl: waterAmountToMilliliters(8, "oz"),
    loggedAt: new Date().toISOString(),
  }]} spies={spies} />);
  fireEvent.click(screen.getByText("Water history (1)"));
  fireEvent.click(screen.getByRole("button", { name: /Edit 8 oz water entry/ }));
  fireEvent.change(screen.getByLabelText("Edit water amount in oz"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Water Changes" }));

  expect(spies.updateEntry).toHaveBeenCalledWith("water-original", expect.objectContaining({
    amountMl: waterAmountToMilliliters(12, "oz"),
  }));
  expect(todaySummary()).toHaveTextContent("12 oz");
  expect(screen.getByText("Water history (1)")).toBeInTheDocument();
});

test("confirms and deletes a water entry", () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const spies = { deleteEntry: jest.fn(), showConfirmation: jest.fn() };
  render(<Harness initialEntries={[{
    id: "water-delete",
    amountMl: 500,
    loggedAt: new Date().toISOString(),
  }]} initialUnit="mL" spies={spies} />);
  fireEvent.click(screen.getByText("Water history (1)"));
  fireEvent.click(screen.getByRole("button", { name: /Delete 500 mL water entry/ }));

  expect(window.confirm).toHaveBeenCalledWith("Delete this 500 mL water entry?");
  expect(spies.deleteEntry).toHaveBeenCalledWith("water-delete");
  expect(todaySummary()).toHaveTextContent("0 mL");
  expect(screen.getByText("Water history (0)")).toBeInTheDocument();
  window.confirm = originalConfirm;
});

test("shows the 10 newest history entries first and reveals older entries in a batch", () => {
  render(<Harness initialEntries={historyEntries(12)} initialUnit="mL" />);
  fireEvent.click(screen.getByText("Water history (12)"));

  expect(visibleHistoryEntries()).toHaveLength(10);
  expect(visibleHistoryEntries().map((entry) => entry.querySelector("strong").textContent))
    .toEqual(["111 mL", "110 mL", "109 mL", "108 mL", "107 mL", "106 mL", "105 mL", "104 mL", "103 mL", "102 mL"]);
  expect(screen.getByRole("button", { name: "Show 2 more older water entries" }))
    .toHaveTextContent("Show more (2 older)");

  fireEvent.click(screen.getByRole("button", { name: "Show 2 more older water entries" }));
  expect(visibleHistoryEntries()).toHaveLength(12);
  expect(visibleHistoryEntries()[11]).toHaveTextContent("100 mL");
  expect(screen.queryByRole("button", { name: /more older water entries/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("Water history (12)"));
  fireEvent.click(screen.getByText("Water history (12)"));
  expect(visibleHistoryEntries()).toHaveLength(10);
  expect(screen.getByRole("button", { name: "Show 2 more older water entries" })).toBeInTheDocument();
});

test("does not offer Show more when water history has 10 or fewer entries", () => {
  render(<Harness initialEntries={historyEntries(10)} initialUnit="mL" />);
  fireEvent.click(screen.getByText("Water history (10)"));

  expect(visibleHistoryEntries()).toHaveLength(10);
  expect(screen.queryByRole("button", { name: /more older water entries/ })).not.toBeInTheDocument();
});

test("editing and deleting update a limited history without altering older stored entries", () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  const spies = { updateEntry: jest.fn(), deleteEntry: jest.fn() };
  render(<Harness initialEntries={historyEntries(12)} initialUnit="mL" spies={spies} />);
  fireEvent.click(screen.getByText("Water history (12)"));

  fireEvent.click(screen.getByRole("button", { name: /Edit 111 mL water entry/ }));
  fireEvent.change(screen.getByLabelText("Edit water amount in mL"), { target: { value: "500" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Water Changes" }));
  expect(spies.updateEntry).toHaveBeenCalledWith("water-history-12", expect.objectContaining({ amountMl: 500 }));
  expect(visibleHistoryEntries()).toHaveLength(10);

  fireEvent.click(screen.getByRole("button", { name: /Delete 500 mL water entry/ }));
  expect(spies.deleteEntry).toHaveBeenCalledWith("water-history-12");
  expect(screen.getByText("Water history (11)")).toBeInTheDocument();
  expect(visibleHistoryEntries()).toHaveLength(10);
  expect(screen.getByRole("button", { name: "Show 1 more older water entries" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Show 1 more older water entries" }));
  expect(visibleHistoryEntries()).toHaveLength(11);
  expect(visibleHistoryEntries()[10]).toHaveTextContent("100 mL");
  window.confirm = originalConfirm;
});
