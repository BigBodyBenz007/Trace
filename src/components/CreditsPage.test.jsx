import fs from "fs";
import path from "path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CreditsPage from "./CreditsPage";

const creditText = fs.readFileSync(path.join(process.cwd(), "src/assets/time-capsule/recording-credits.txt"), "utf8");
let previousFetch;
beforeEach(() => {
  previousFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(creditText) });
});
afterEach(() => { global.fetch = previousFetch; jest.restoreAllMocks(); });

test("renders the complete bundled attribution with safe links and a persistent accessible return", async () => {
  const onBackToSettings = jest.fn();
  render(<CreditsPage onBackToSettings={onBackToSettings} />);
  expect(screen.getByRole("heading", { name: "Credits & licenses" })).toHaveFocus();
  await screen.findByRole("heading", { name: "Original recordings" });
  const links = screen.getAllByRole("link");
  const sourceUrls = [...creditText.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
  sourceUrls.forEach(url => expect(links.some(link => link.href === url)).toBe(true));
  links.forEach(link => {
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
  expect(screen.getByText(/No synthesized sound layers were added/)).toBeInTheDocument();
  expect(screen.getByText(/Do not imply endorsement by the recordists/)).toBeInTheDocument();
  expect(screen.getByText(/5ab98530a4d5826996e306ce70b49112ca9cf8316e3ff0584b322d31e16be423/)).toBeInTheDocument();
  expect(screen.queryByText(/Start-Process|C:\\Users\\|standalone motion-preview server|quarter-speed playback/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Settings" }));
  expect(onBackToSettings).toHaveBeenCalledTimes(1);
});

test("source options allow copying without navigating away, safe external opening, and keyboard return", async () => {
  const previousClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const open = jest.spyOn(window, "open").mockImplementation(() => null);
  try {
    render(<CreditsPage onBackToSettings={jest.fn()} />);
    const source = await screen.findByRole("link", { name: /Prison Locks and Doors 2 Door slam/ });
    source.focus();
    fireEvent.click(source);
    const dialog = screen.getByRole("dialog", { name: "Open source or license" });
    expect(open).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy link" })); });
    expect(writeText).toHaveBeenCalledWith(source.href);
    expect(screen.getByText("Link copied.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open in browser" }));
    expect(open).toHaveBeenCalledWith(source.href, "_blank", "noopener,noreferrer");
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(source).toHaveFocus();
  } finally {
    if (previousClipboard) Object.defineProperty(navigator, "clipboard", previousClipboard);
    else delete navigator.clipboard;
  }
});

test("failed credit loading keeps Back available and supports a bounded retry", async () => {
  global.fetch.mockRejectedValueOnce(new Error("offline"));
  const onBackToSettings = jest.fn();
  render(<CreditsPage onBackToSettings={onBackToSettings} />);
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Back to Settings" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry credits" }));
  await screen.findByRole("heading", { name: "Original recordings" });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test("credits layout keeps return navigation sticky and contains long notices and URLs", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/components/CreditsPage.css"), "utf8");
  expect(css).toMatch(/\.trace-credits-navigation\s*\{[^}]*position:\s*sticky/s);
  expect(css).toContain("env(safe-area-inset-top)");
  expect(css).toContain("overflow-wrap: anywhere");
  expect(css).toContain("white-space: pre-wrap");
});
