import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import JournalPage from "./JournalPage";

const baseProps = {
  entries: [],
  onBack: jest.fn(),
  saveEntry: jest.fn(),
  deleteEntry: jest.fn(),
  buttonStyle: {},
  inputStyle: {},
  containerStyle: {},
};

function entry(overrides = {}) {
  return {
    id: "journal-1",
    schemaVersion: 1,
    visibility: "private",
    title: "Quiet evening",
    body: "A private reflection.",
    date: "2026-08-18",
    time: "20:30",
    mood: "Calm",
    tags: ["Reflection"],
    createdAt: "2026-08-19T01:30:00.000Z",
    updatedAt: "2026-08-19T01:30:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  Element.prototype.scrollIntoView = jest.fn();
});

test("renders the private Journal header, conventional back navigation, and no social controls", () => {
  render(<JournalPage {...baseProps} />);
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  expect(screen.getByText(/Private reflections in Trace/)).toBeInTheDocument();
  expect(screen.getByLabelText("Tags").closest("label")).toHaveTextContent("Topics (optional)");
  expect(screen.getByLabelText("Tags")).toHaveAttribute("placeholder", "Work, family, goals…");
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /share|public|follower|reaction/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" })[0]);
  expect(baseProps.onBack).toHaveBeenCalledTimes(1);
});

test("validates body, preserves the draft, and saves optional fields", async () => {
  const saved = entry();
  const saveEntry = jest.fn(() => saved);
  render(<JournalPage {...baseProps} saveEntry={saveEntry} />);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Quiet evening" } });
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Write something");
  expect(saveEntry).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem("journalDraft")).form.title).toBe("Quiet evening");

  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "A private reflection." } });
  fireEvent.click(screen.getByRole("button", { name: "Calm" }));
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Reflection, home" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  expect(saveEntry).toHaveBeenCalledWith(expect.objectContaining({ title: "Quiet evening", body: "A private reflection.", mood: "Calm", tags: "Reflection, home" }), null);
  await waitFor(() => expect(localStorage.getItem("journalDraft")).toBeNull());
});

test("restores a draft through remount and confirmed discard clears it", () => {
  const first = render(<JournalPage {...baseProps} />);
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Do not lose this" } });
  first.unmount();
  render(<JournalPage {...baseProps} />);
  expect(screen.getByLabelText("Entry")).toHaveValue("Do not lose this");
  expect(screen.getByRole("status")).toHaveTextContent("draft was restored");
  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
  expect(screen.getByLabelText("Entry")).toHaveValue("Do not lose this");
  window.confirm.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
  expect(localStorage.getItem("journalDraft")).toBeNull();
  expect(screen.getByLabelText("Entry")).toHaveValue("");
});

test("failed persistence keeps the unfinished draft", () => {
  render(<JournalPage {...baseProps} saveEntry={() => false} />);
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Keep this safe" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  expect(screen.getByLabelText("Entry")).toHaveValue("Keep this safe");
  expect(JSON.parse(localStorage.getItem("journalDraft")).form.body).toBe("Keep this safe");
});

test("history is newest-first, searchable, previews long text, and opens the full entry", () => {
  const old = entry({ id: "old", title: "Old", date: "2020-01-01", body: "Earlier" });
  const longBody = `Needle ${"unbroken".repeat(60)}`;
  const newest = entry({ id: "new", title: "Newest", body: longBody, tags: ["Special"] });
  render(<JournalPage {...baseProps} entries={[old, newest]} />);
  const cards = document.querySelectorAll("[data-journal-entry-id]");
  expect(cards[0]).toHaveAttribute("data-journal-entry-id", "new");
  expect(within(cards[0]).getByText(/Needle/).textContent.length).toBeLessThan(longBody.length);
  fireEvent.click(within(cards[0]).getByRole("button", { name: "Read full entry" }));
  expect(within(cards[0]).getByText(longBody)).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search Journal..."), { target: { value: "Special" } });
  expect(screen.getByText("Newest")).toBeInTheDocument();
  expect(screen.queryByText("Old")).not.toBeInTheDocument();
});

test("edit is explicit and delete requires confirmation", () => {
  const original = entry();
  const updated = entry({ body: "Updated text", updatedAt: "2026-08-20T00:00:00.000Z" });
  const saveEntry = jest.fn(() => updated);
  const deleteEntry = jest.fn(() => true);
  render(<JournalPage {...baseProps} entries={[original]} saveEntry={saveEntry} deleteEntry={deleteEntry} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("heading", { name: "Edit Journal Entry" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "Updated text" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(saveEntry).toHaveBeenCalledWith(expect.objectContaining({ body: "Updated text" }), original.id);

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(deleteEntry).not.toHaveBeenCalled();
  window.confirm.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(window.confirm).toHaveBeenCalledWith("Delete this Journal entry?");
  expect(deleteEntry).toHaveBeenCalledWith(original.id);
});
