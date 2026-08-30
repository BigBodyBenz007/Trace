import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JournalPasswordField } from "./JournalCredentialField";

function PasswordHarness({ autoComplete = "new-password", copyable = true }) {
  const [value, setValue] = useState("");
  return (
    <form aria-label="Journal password form" onSubmit={(event) => event.preventDefault()}>
      <JournalPasswordField
        autoComplete={autoComplete}
        copyable={copyable}
        id="test-journal-password"
        label="Journal password"
        setValue={setValue}
        value={value}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

beforeEach(() => {
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: undefined });
  Object.defineProperty(document, "execCommand", { configurable: true, value: undefined });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("uses standards-based password metadata without a fake account identity", () => {
  render(<PasswordHarness />);
  const password = screen.getByLabelText("Journal password");
  expect(password).toHaveAttribute("type", "password");
  expect(password).toHaveAttribute("name", "password");
  expect(password).toHaveAttribute("autocomplete", "new-password");
  expect(password).toHaveAttribute("id", "test-journal-password");
  expect(screen.getByRole("form", { name: "Journal password form" })).toHaveFormValues({ password: "" });
  expect(document.querySelector('input[type="email"], input[autocomplete="username"], input[name="username"], input[name="email"]')).toBeNull();
});

test("Show and Hide preserve the complete generated or pasted password and remain keyboard focusable", () => {
  render(<PasswordHarness />);
  const password = screen.getByLabelText("Journal password");
  const generatedPassword = "Apple-generated pasted password 7!vQ";
  fireEvent.change(password, { target: { value: generatedPassword } });
  const show = screen.getByRole("button", { name: "Show journal password" });
  show.focus();
  expect(show).toHaveFocus();
  fireEvent.click(show);
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue(generatedPassword);
  fireEvent.click(screen.getByRole("button", { name: "Hide journal password" }));
  expect(password).toHaveAttribute("type", "password");
  expect(password).toHaveValue(generatedPassword);
});

test("Copy Journal Password uses the Clipboard API only after its explicit button gesture", async () => {
  const writeText = jest.fn(async () => {});
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<PasswordHarness />);
  const password = "clipboard-only Journal password 8!";
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: password } });
  expect(writeText).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Copy Journal Password" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(password));
  expect(await screen.findByRole("status")).toHaveTextContent("Journal password copied");
});

test("Copy Journal Password falls back to a transient selection and removes it immediately", async () => {
  const execCommand = jest.fn(() => true);
  Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
  render(<PasswordHarness />);
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "fallback Journal password 9!" } });
  fireEvent.click(screen.getByRole("button", { name: "Copy Journal Password" }));
  await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
  expect(await screen.findByRole("status")).toHaveTextContent("Journal password copied");
  expect(document.querySelector('textarea[aria-hidden="true"][readonly]')).toBeNull();
});

test("copy failure is accessible and does not expose the password in storage, URL, logs, or error feedback", async () => {
  const password = "never-leak-this-Journal-password-10!";
  const storageSpy = jest.spyOn(Storage.prototype, "setItem");
  const pushStateSpy = jest.spyOn(window.history, "pushState");
  const replaceStateSpy = jest.spyOn(window.history, "replaceState");
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  Object.defineProperty(document, "execCommand", { configurable: true, value: jest.fn(() => false) });

  render(<PasswordHarness />);
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Copy Journal Password" }));
  const status = await screen.findByRole("status");
  expect(status).toHaveTextContent("could not be copied");
  expect(status).not.toHaveTextContent(password);
  expect(JSON.stringify(storageSpy.mock.calls)).not.toContain(password);
  expect(JSON.stringify(pushStateSpy.mock.calls)).not.toContain(password);
  expect(JSON.stringify(replaceStateSpy.mock.calls)).not.toContain(password);
  expect(JSON.stringify(logSpy.mock.calls)).not.toContain(password);
  expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(password);
  expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(password);
  expect(window.location.href).not.toContain(encodeURIComponent(password));

});
