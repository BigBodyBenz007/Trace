import fs from "fs";
import path from "path";
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

test("uses the scoped reflective presentation while retaining the Journal paper", () => {
  render(<JournalPage {...baseProps} />);
  expect(screen.getByRole("heading", { name: "Journal" }).closest("main")).toHaveClass("trace-feature-page--journal", "journal-page");
  expect(screen.getByRole("heading", { name: "New Journal Entry" }).nextElementSibling).toHaveClass("journal-paper");
});

test("keeps the unlocked Lock Journal action inside the responsive Journal heading", () => {
  render(<JournalPage {...baseProps} journalPrivacyEnabled journalPrivacyUnlocked onLock={jest.fn()} />);
  const heading = screen.getByRole("heading", { name: "Journal" });
  const copy = heading.parentElement;
  const header = copy.parentElement;
  expect(header).toHaveClass("journal-page__header", "journal-page__header--with-action");
  expect(copy).toHaveClass("journal-page__header-copy");
  expect(header.firstElementChild).toMatchObject({ tagName: "svg" });
  expect(header.firstElementChild).toHaveAttribute("aria-hidden", "true");
  expect(within(header).getByRole("button", { name: "Lock Journal" })).toBeInTheDocument();
  const css = fs.readFileSync(path.join(process.cwd(), "src", "index.css"), "utf8");
  expect(css).toMatch(/\.journal-page__header--with-action\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(128px,\s*1fr\)\s+minmax\(0,\s*2fr\)\s+minmax\(128px,\s*1fr\)/);
  expect(css).toMatch(/\.journal-page__privacy-action\s*\{[^}]*max-width:\s*100%[^}]*white-space:\s*normal/);
});

test.each([390, 430])("stacks the privacy action below an uncompressed Journal heading at %ipx", (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  render(<JournalPage {...baseProps} onEnablePrivacy={jest.fn()} />);
  const heading = screen.getByRole("heading", { name: "Journal" });
  const copy = heading.parentElement;
  const header = copy.parentElement;
  const action = within(header).getByRole("button", { name: "Set Up Journal Lock" });
  expect(header).toHaveClass("journal-page__header--with-action");
  expect(action).toHaveClass("journal-page__privacy-action");
  expect(action.parentElement).toBe(header);
  expect(header.nextElementSibling).toHaveClass("journal-page__navigation");

  const css = fs.readFileSync(path.join(process.cwd(), "src", "index.css"), "utf8");
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-page__header--with-action\s*\{[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\)\s+38px[^}]*grid-template-rows:\s*auto\s+auto[^}]*row-gap:\s*14px/);
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-page__header--with-action \.journal-page__header-copy\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*1[^}]*overflow-wrap:\s*normal[^}]*padding-inline:\s*50px/);
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-page__header--with-action \.journal-page__header-copy h1\s*\{[^}]*white-space:\s*nowrap/);
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-page__header--with-action \.journal-page__privacy-action\s*\{[^}]*box-sizing:\s*border-box[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*2[^}]*justify-self:\s*center/);
});

test("keeps Set Up Journal Lock in the same responsive heading when privacy is disabled", () => {
  render(<JournalPage {...baseProps} onEnablePrivacy={jest.fn()} />);
  const header = screen.getByRole("heading", { name: "Journal" }).closest("header");
  expect(header).toHaveClass("journal-page__header--with-action");
  expect(within(header).getByRole("button", { name: "Set Up Journal Lock" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Lock Journal" })).not.toBeInTheDocument();
});

test("keeps native Journal date and time inputs contained without changing the 360px stack breakpoint", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src", "index.css"), "utf8");
  const inputRule = css.match(/\.journal-date-time input\s*\{([^}]*)\}/)?.[1] || "";
  expect(inputRule).toMatch(/box-sizing:\s*border-box/);
  expect(inputRule).toMatch(/inline-size:\s*100%/);
  expect(inputRule).toMatch(/max-inline-size:\s*100%/);
  expect(inputRule).toMatch(/min-inline-size:\s*0/);
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-date-time input\s*\{[^}]*padding-inline:\s*0\s*!important/);
  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)[\s\S]*?\.journal-date-time\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
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

test("unlocked Journal exposes a direct Lock Journal page action that persists the draft without confirmation", async () => {
  const draft = {
    editingId: null,
    form: {
      title: "Exact draft",
      body: "Preserve this unfinished thought",
      date: "2026-08-30",
      time: "09:45",
      mood: "Calm",
      tags: "private",
    },
  };
  const persistDraft = jest.fn(async () => true);
  const onLock = jest.fn(async () => {});
  render(
    <JournalPage
      {...baseProps}
      initialDraft={draft}
      journalPrivacyEnabled
      journalPrivacyUnlocked
      persistDraft={persistDraft}
      onLock={onLock}
    />
  );
  const lock = screen.getByRole("button", { name: "Lock Journal" });
  expect(lock.closest(".journal-page__header")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })[0].closest(".journal-page__navigation")).not.toContainElement(lock);
  fireEvent.click(lock);
  await waitFor(() => expect(persistDraft).toHaveBeenCalledWith(draft));
  await waitFor(() => expect(onLock).toHaveBeenCalledTimes(1));
  expect(window.confirm).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Lock Now" })).not.toBeInTheDocument();
});

test("unlocked Journal keeps Turn Off Journal Lock as a separate authenticated flow", async () => {
  const draft = {
    editingId: null,
    form: {
      title: "Exact draft",
      body: "Preserve this unfinished thought",
      date: "2026-08-30",
      time: "09:45",
      mood: "Calm",
      tags: "private",
    },
  };
  const persistDraft = jest.fn(async () => true);
  const onDisable = jest.fn(async () => {});
  render(
    <JournalPage
      {...baseProps}
      initialDraft={draft}
      persistDraft={persistDraft}
      onDisable={onDisable}
    />
  );
  expect(screen.getByRole("heading", { name: "Journal Lock: On" })).toBeInTheDocument();
  const turnOff = screen.getByRole("button", { name: "Turn Off Journal Lock" });
  expect(turnOff).not.toHaveClass("trace-action--danger");
  fireEvent.click(turnOff);
  expect(await screen.findByRole("dialog", { name: "Turn Off Journal Lock" })).toBeInTheDocument();
  expect(persistDraft).toHaveBeenCalledWith(draft);
  expect(screen.getByText(/entries will remain intact/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Current Journal password"), { target: { value: "current credential" } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Turn Off Journal Lock" }));
  await waitFor(() => expect(onDisable).toHaveBeenCalledWith({ type: "passphrase", value: "current credential" }));
  expect(screen.getByText("Journal Lock turned off.")).toHaveAttribute("role", "status");
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
});
