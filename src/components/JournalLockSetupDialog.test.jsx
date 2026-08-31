import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import JournalLockSetupDialog from "./JournalLockSetupDialog";
import { JOURNAL_PASSWORD_ACKNOWLEDGMENT } from "./JournalPasswordSaveControls";

function SetupHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open setup</button>
      {open && (
        <JournalLockSetupDialog
          onCancel={() => setOpen(false)}
          onEnable={jest.fn(async () => {})}
        />
      )}
    </>
  );
}

beforeEach(() => {
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn(async () => {}) },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("setup initializes focus once, preserves confirmation typing, and reapplies initial focus only after reopening", async () => {
  const focusSpy = jest.spyOn(HTMLElement.prototype, "focus");
  render(<SetupHarness />);
  const trigger = screen.getByRole("button", { name: "Open setup" });
  trigger.focus();
  fireEvent.click(trigger);

  const password = screen.getByLabelText("Journal password");
  const confirmation = screen.getByLabelText("Confirm Journal password");
  expect(password).toHaveFocus();
  const initialPasswordFocusCount = focusSpy.mock.instances.filter((node) => node === password).length;
  expect(initialPasswordFocusCount).toBe(1);

  const completePassword = "every confirmation character 12!";
  fireEvent.change(password, { target: { value: completePassword } });
  confirmation.focus();
  let typed = "";
  for (const character of completePassword) {
    typed += character;
    fireEvent.change(confirmation, { target: { value: typed } });
    expect(confirmation).toHaveFocus();
  }
  expect(confirmation).toHaveValue(completePassword);
  expect(confirmation.selectionStart).toBe(completePassword.length);
  expect(focusSpy.mock.instances.filter((node) => node === password)).toHaveLength(initialPasswordFocusCount);

  const showConfirmation = screen.getByRole("button", { name: "Show confirm journal password" });
  showConfirmation.focus();
  fireEvent.click(showConfirmation);
  expect(confirmation).toHaveFocus();
  expect(confirmation).toHaveAttribute("type", "text");
  expect(password).not.toHaveFocus();

  const showPassword = screen.getByRole("button", { name: "Show journal password" });
  showPassword.focus();
  fireEvent.click(showPassword);
  expect(password).toHaveFocus();
  expect(password).toHaveAttribute("type", "text");
  expect(confirmation).not.toHaveFocus();

  password.setSelectionRange(5, 5);
  const copy = screen.getByRole("button", { name: "Copy Journal Password" });
  fireEvent.pointerDown(copy);
  fireEvent.mouseDown(copy);
  copy.focus();
  fireEvent.click(copy);
  await waitFor(() => expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(completePassword));
  expect(password).toHaveFocus();
  expect(password.selectionStart).toBe(5);

  const acknowledgment = screen.getByLabelText(JOURNAL_PASSWORD_ACKNOWLEDGMENT);
  acknowledgment.focus();
  fireEvent.click(acknowledgment);
  expect(acknowledgment).toHaveFocus();

  confirmation.focus();
  fireEvent.change(confirmation, { target: { value: `${completePassword} mismatch` } });
  const continueButton = screen.getByRole("button", { name: "Continue" });
  continueButton.focus();
  fireEvent.click(continueButton);
  expect(screen.getByRole("alert")).toHaveTextContent("do not match");
  expect(continueButton).toHaveFocus();
  expect(password).toHaveValue(completePassword);
  expect(confirmation).toHaveValue(`${completePassword} mismatch`);

  const cancel = screen.getByRole("button", { name: "Cancel" });
  cancel.focus();
  fireEvent.click(cancel);
  expect(screen.queryByRole("dialog", { name: "Set up Journal Lock" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();

  fireEvent.click(trigger);
  const reopenedPassword = screen.getByLabelText("Journal password");
  expect(reopenedPassword).toHaveFocus();
  expect(reopenedPassword).toHaveValue("");
});
