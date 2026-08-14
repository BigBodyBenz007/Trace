import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import HealthPage from "./HealthPage";
import { createHealthMeasurementEntry, updateHealthMeasurementEntry } from "../services/healthMeasurements";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

let ids;
beforeEach(() => {
  ids = 0;
  Element.prototype.scrollIntoView = jest.fn();
  window.confirm = jest.fn(() => true);
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
});

function Harness({ initialEntries = [], settings = DEFAULT_APP_SETTINGS }) {
  const [entries, setEntries] = useState(initialEntries);
  const saveEntry = (draft) => {
    const entry = createHealthMeasurementEntry(draft, { id: `entry-${++ids}`, now: () => new Date("2026-08-14T12:00:00Z") }).value;
    setEntries((current) => [...current, entry]);
    return entry;
  };
  const updateEntry = (id, draft) => {
    const saved = updateHealthMeasurementEntry(entries.find((entry) => entry.id === id), draft).value;
    setEntries((current) => current.map((entry) => entry.id === id ? saved : entry));
    return saved;
  };
  const deleteEntry = (id) => { setEntries((current) => current.filter((entry) => entry.id !== id)); return true; };
  return <HealthPage onBack={jest.fn()} entries={entries} settings={settings} saveEntry={saveEntry} updateEntry={updateEntry} deleteEntry={deleteEntry} buttonStyle={{}} inputStyle={{}} containerStyle={{}} />;
}

function enter(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test("creates partial histories, preserves units, accumulates, and renders only populated values newest first", () => {
  render(<Harness settings={{ ...DEFAULT_APP_SETTINGS, units: { ...DEFAULT_APP_SETTINGS.units, circumference: "cm" } }} />);
  enter("Date", "2026-08-01"); enter("Time", "08:00"); enter("Weight", "260");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  enter("Date", "2026-08-08"); enter("Time", "09:15"); enter("Waist", "41.5");
  enter("Notes", "Measured after breakfast");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  const articles = screen.getAllByRole("article");
  expect(articles).toHaveLength(2);
  expect(articles[0]).toHaveTextContent("41.5 cm");
  expect(articles[0]).toHaveTextContent("Measured after breakfast");
  expect(articles[0]).not.toHaveTextContent("Weight:");
  expect(articles[1]).toHaveTextContent("260 lb");
});

test("supports body-fat-only and multiple-measurement entries", () => {
  render(<Harness settings={{ ...DEFAULT_APP_SETTINGS, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  enter("Body Fat", "27.5");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("article")).toHaveTextContent("27.5 %");
  enter("Weight", "80"); enter("Chest", "100");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  const combinedEntry = screen.getByText("80 kg").closest("article");
  expect(combinedEntry).toHaveTextContent("100 cm");
});

test("rejects notes-only and invalid values", () => {
  render(<Harness />);
  enter("Notes", "Just a note");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("alert")).toHaveTextContent("at least one");
  enter("Weight", "-2");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("alert")).toHaveTextContent("greater than 0");
  enter("Weight", ""); enter("Body Fat", "101");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("alert")).toHaveTextContent("between 0 and 100");
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});

test("edit scrolls to the editor, preserves identity, then scrolls to the updated entry", () => {
  const original = createHealthMeasurementEntry({ date: "2026-08-01", time: "08:00", measurements: { weight: { value: "260", unit: "lb" } } }, { id: "stable-id", now: () => new Date("2026-01-01") }).value;
  render(<Harness initialEntries={[original]} />);
  fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: "Edit" }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  Element.prototype.scrollIntoView.mockClear();
  enter("Weight", "257");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  const article = screen.getByRole("article");
  expect(article).toHaveAttribute("data-entry-id", "stable-id");
  expect(article).toHaveTextContent("257 lb");
  expect(article.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});

test("delete removes only the selected entry without scrolling", () => {
  const make = (id, day) => createHealthMeasurementEntry({ date: `2026-08-${day}`, time: "08:00", measurements: { weight: { value: day, unit: "lb" } } }, { id }).value;
  render(<Harness initialEntries={[make("one", "01"), make("two", "02")]} />);
  const articles = screen.getAllByRole("article");
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(within(articles[0]).getByRole("button", { name: "Delete" }));
  expect(window.confirm).toHaveBeenCalledWith("Delete this body measurement entry?");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article")).toHaveAttribute("data-entry-id", "one");
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("uses global defaults without redundant unit selects and keeps the form hierarchy", () => {
  render(<Harness settings={{ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  const header = screen.getByTestId("measurement-header");
  const fields = screen.getByTestId("measurement-fields");
  expect([...header.querySelectorAll("input")].map((input) => input.getAttribute("aria-label"))).toEqual(["Date", "Time"]);
  expect(within(fields).getAllByRole("spinbutton").slice(0, 3).map((input) => input.getAttribute("aria-label"))).toEqual(["Weight", "Height centimeters", "Body Fat"]);
  expect(screen.getByLabelText("Weight unit")).toHaveTextContent("kg");
  expect(screen.getByLabelText("Waist unit")).toHaveTextContent("cm");
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

test("saves and edits imperial height faithfully under metric current settings", () => {
  const historical = createHealthMeasurementEntry({ date: "2026-08-01", time: "08:00", measurements: { weight: { value: "250", unit: "lb" }, waist: { value: "40", unit: "in" } }, height: { unit: "ft-in", feet: "6", inches: "2" } }, { id: "imperial" }).value;
  render(<Harness initialEntries={[historical]} settings={{ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Weight")).toHaveValue(250);
  expect(screen.getByLabelText("Weight unit")).toHaveTextContent("lb");
  expect(screen.getByLabelText("Waist unit")).toHaveTextContent("in");
  expect(screen.getByLabelText("Height feet")).toHaveValue(6);
  expect(screen.getByLabelText("Height inches")).toHaveValue(2);
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(screen.getByRole("article")).toHaveTextContent("6 ft 2 in");
  expect(screen.getByRole("article")).toHaveTextContent("250 lb");
});

test("height-only metric entry is valid and renders historically", () => {
  render(<Harness settings={{ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  enter("Height centimeters", "188");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("article")).toHaveTextContent("188 cm");
});

test("keeps Weight and compact imperial Height together", () => {
  render(<Harness />);
  const row = screen.getByTestId("weight-height-row");
  expect(within(row).getByLabelText("Weight")).toBeInTheDocument();
  expect(within(row).getByLabelText("Height feet")).toBeInTheDocument();
  expect(within(row).getByLabelText("Height inches")).toBeInTheDocument();
  expect(row).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
  expect(within(row).getByLabelText("Weight")).toHaveStyle({ maxWidth: "112px", minHeight: "44px" });
  expect(within(row).getByLabelText("Height feet")).toHaveStyle({ maxWidth: "64px", minHeight: "44px" });
  expect(within(row).getByLabelText("Height inches")).toHaveStyle({ maxWidth: "64px", minHeight: "44px" });
});

test("keeps metric Height and paired measurements compact", () => {
  render(<Harness settings={{ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  expect(screen.getByLabelText("Height centimeters")).toHaveStyle({ maxWidth: "112px", minHeight: "44px" });
  expect(screen.getByLabelText("Body Fat")).toHaveStyle({ maxWidth: "112px", minHeight: "44px" });
  expect(screen.getByLabelText("Right Calf")).toHaveStyle({ maxWidth: "112px", minHeight: "44px" });
});

test("groups every measurement label directly above its compact control", () => {
  const { container } = render(<Harness />);
  const expectedFields = ["weight", "height", "bodyFat", "chest", "waist", "neck", "leftArm", "rightArm", "leftThigh", "rightThigh", "leftCalf", "rightCalf"];
  const groups = [...container.querySelectorAll("[data-measurement-field]")];
  expect(groups.map((group) => group.dataset.measurementField)).toEqual(expectedFields);
  groups.forEach((group) => {
    expect(group.tagName).toBe("LABEL");
    expect(group).toHaveStyle({ display: "block", textAlign: "left", width: "fit-content", maxWidth: "100%" });
    expect(group.querySelector("input")).toBeInTheDocument();
  });
});

test("calf-only entries use global units and preserve historical units through editing", () => {
  render(<Harness settings={{ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }} />);
  expect(screen.getByLabelText("Left Calf unit")).toHaveTextContent("cm");
  enter("Left Calf", "39.5");
  fireEvent.click(screen.getByRole("button", { name: "Save Measurement" }));
  expect(screen.getByRole("article")).toHaveTextContent("Left Calf:39.5 cm");
  fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Left Calf")).toHaveValue(39.5);
  expect(screen.getByLabelText("Left Calf unit")).toHaveTextContent("cm");
  enter("Left Calf", "40");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(screen.getByRole("article")).toHaveTextContent("Left Calf:40 cm");
});

test("legacy Health entries without calves continue to edit", () => {
  const legacy = createHealthMeasurementEntry({ date: "2026-08-01", time: "08:00", measurements: { waist: { value: "40", unit: "in" } } }, { id: "legacy" }).value;
  render(<Harness initialEntries={[legacy]} />);
  expect(screen.getByRole("article")).not.toHaveTextContent("Calf");
  fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Left Calf")).toHaveValue(null);
});
