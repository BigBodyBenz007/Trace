import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ProtocolsPage from "./ProtocolsPage";

const item = { id: "item:1", compound: { name: "Creatine", reference: { source: "missing", sourceId: "gone" } }, dose: { amount: 5, unit: "g" }, route: { code: "oral" }, schedule: { type: "weekly-days", weekdays: [1,3,5] }, notes: "snapshot" };
const active = { id: "protocol:1", schemaVersion: 1, name: "Training plan", startDate: "2026-08-20", endDate: null, status: "active", notes: "Mine", items: [item], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", endedAt: null };
const ended = { ...active, id: "protocol:2", name: "Old plan", status: "ended", endDate: "2026-08-10", endedAt: "2026-08-10T00:00:00.000Z" };

beforeEach(() => {
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  Element.prototype.scrollIntoView = jest.fn();
});

function renderPage(overrides = {}) {
  const props = { onBack: jest.fn(), protocols: [], compounds: [], saveProtocol: jest.fn(), updateProtocol: jest.fn(), endProtocol: jest.fn(), deleteProtocol: jest.fn(), ...overrides };
  render(<ProtocolsPage {...props} />);
  return props;
}

test("shows tracking-only copy, intentional empty states, and Timeline navigation", () => {
  const props = renderPage();
  expect(screen.getByRole("heading", { name: "Protocols" })).toBeInTheDocument();
  expect(screen.getByText(/does not recommend protocols/)).toBeInTheDocument();
  expect(screen.getByText("No current or upcoming protocols yet.")).toBeInTheDocument();
  expect(screen.getByText("No ended protocols yet.")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[1]);
  expect(props.onBack).toHaveBeenCalled();
});

test("groups active and ended protocols without deriving status and renders summaries", () => {
  renderPage({ protocols: [active, ended] });
  expect(screen.getByLabelText("Current & Upcoming Protocols")).toHaveTextContent("Training plan");
  expect(screen.getByLabelText("Ended Protocols")).toHaveTextContent("Old plan");
  expect(screen.getAllByText(/Monday, Wednesday, Friday/)).toHaveLength(2);
});

test("opens snapshot detail, restores its row, and ended detail is read-only", () => {
  renderPage({ protocols: [active, ended] });
  fireEvent.click(screen.getAllByRole("button", { name: "View Protocol" })[0]);
  expect(screen.getByTestId("protocol-detail")).toHaveTextContent("Creatine");
  expect(screen.getByTestId("protocol-detail")).toHaveTextContent("snapshot");
  expect(screen.getAllByRole("button", { name: "Back to Protocols" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Protocols" })[1]);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "View Protocol" })[1]);
  expect(screen.queryByRole("button", { name: "Edit Protocol" })).not.toBeInTheDocument();
});

test("confirms end and delete actions", () => {
  window.confirm = jest.fn(() => true);
  const props = renderPage({ protocols: [active], endProtocol: jest.fn(() => true), deleteProtocol: jest.fn(() => true) });
  fireEvent.click(screen.getByRole("button", { name: "View Protocol" }));
  fireEvent.click(screen.getAllByRole("button", { name: "End Protocol" })[0]);
  expect(props.endProtocol).toHaveBeenCalledWith(active.id);
});

test("detail and list navigation scroll only after destination render and restores the exact row", () => {
  const frames = [];
  window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  renderPage({ protocols: [active, { ...active, id: "protocol:three", name: "Second plan" }] });
  const rows = screen.getAllByRole("article").filter((element) => element.dataset.protocolId);
  const originRow = rows[1];
  fireEvent.click(screen.getAllByRole("button", { name: "View Protocol" })[1]);
  const detail = screen.getByTestId("protocol-detail");
  expect(detail).toHaveTextContent("Second plan");
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  act(() => frames.shift()());
  expect(detail.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Protocols" })[0]);
  expect(screen.getByText("Second plan")).toBeInTheDocument();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  act(() => frames.shift()());
  expect(originRow.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
});

test("bottom Back to Protocols and Create use the same render-aware restoration", () => {
  const frames = [];
  window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  renderPage({ protocols: [active] });
  fireEvent.click(screen.getByRole("button", { name: "Create Protocol" }));
  const editor = screen.getByTestId("protocol-editor-context");
  expect(editor).toHaveTextContent("Create Protocol");
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  act(() => frames.shift()());
  expect(editor.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  fireEvent.click(screen.getAllByRole("button", { name: "Cancel Protocol" })[0]);
  act(() => frames.shift()());
  expect(screen.getByRole("button", { name: "Create Protocol" }).scrollIntoView).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "View Protocol" }));
  act(() => frames.shift()());
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Protocols" })[1]);
  act(() => frames.shift()());
  expect(screen.getByText("Training plan")).toBeInTheDocument();
});

test("a removed originating row falls back deterministically to its list section", () => {
  const frames = [];
  window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  window.confirm = jest.fn(() => true);
  function Harness() {
    const [entries, setEntries] = useState([active]);
    return <ProtocolsPage
      protocols={entries}
      compounds={[]}
      onBack={jest.fn()}
      saveProtocol={jest.fn()}
      updateProtocol={jest.fn()}
      endProtocol={jest.fn()}
      deleteProtocol={() => { setEntries([]); return true; }}
    />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "View Protocol" }));
  act(() => frames.shift()());
  fireEvent.click(screen.getAllByRole("button", { name: "Delete Protocol" })[0]);
  const section = screen.getByLabelText("Current & Upcoming Protocols");
  expect(section).toHaveTextContent("No current or upcoming protocols yet.");
  act(() => frames.shift()());
  expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});
