import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./SettingsPage";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

test("uses the scoped quiet-utility presentation and selected-state controls", () => {
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={jest.fn()} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByTestId("settings-page")).toHaveClass("trace-feature-page--settings");
  expect(screen.getByRole("radio", { name: /River/ }).closest("label")).toHaveAttribute("data-selected", "true");
  expect(screen.getByRole("radio", { name: /Standard motion/ }).closest("label")).toHaveAttribute("data-selected", "true");
});

test("renders compact global unit controls and saves each preference", () => {
  const updateSettings = jest.fn();
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Units" })).toBeInTheDocument();
  expect(screen.getByLabelText("Pounds (lb)")).toBeChecked();
  expect(screen.getByLabelText("Feet + inches (ft/in)")).toBeChecked();
  expect(screen.getByLabelText("Inches (in)")).toBeChecked();
  expect(screen.getByRole("heading", { name: "Life Current Theme" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Motion & Effects" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /River/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).not.toBeChecked();
  expect(screen.getByText("A flowing current through your timeline.")).toBeInTheDocument();
  expect(screen.getByText("A winding path through a darker world.")).toBeInTheDocument();
  expect(screen.getByText("Keeps Trace's full movement and visual effects.")).toBeInTheDocument();
  expect(screen.getByText("Softens nonessential movement while keeping feedback and progress clear.")).toBeInTheDocument();
  expect(screen.getByText("✓ Selected")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ units: expect.objectContaining({ weight: "kg" }) }));
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);
});

test("renders Data & Backup and opens the established backup experience", () => {
  const onOpenBackup = jest.fn();
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={jest.fn()} onBack={jest.fn()} onOpenBackup={onOpenBackup} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByRole("heading", { name: "Data & Backup" })).toBeInTheDocument();
  expect(screen.getByText("Download a copy of your Trace data or restore a previous backup.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Manage Backup & Restore" }));
  expect(onOpenBackup).toHaveBeenCalledTimes(1);
});

test("motion controls form an accessible keyboard-operable radio group and preserve unrelated settings", () => {
  const updateSettings = jest.fn(() => true);
  const onMotionPreferenceSaved = jest.fn();
  const { rerender } = render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onMotionPreferenceSaved={onMotionPreferenceSaved} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  const group = screen.getByRole("radiogroup", { name: "Motion & Effects" });
  const standard = screen.getByRole("radio", { name: /Standard motion/ });
  const reduced = screen.getByRole("radio", { name: /Reduced motion/ });
  expect(group).toContainElement(standard);
  expect(group).toContainElement(reduced);
  expect(standard).toBeChecked();
  expect(reduced).not.toBeChecked();
  expect(reduced).toHaveAttribute("aria-describedby", "motion-preference-reduced-description");
  expect(onMotionPreferenceSaved).not.toHaveBeenCalled();
  reduced.focus();
  expect(reduced).toHaveFocus();
  userEvent.keyboard("{space}");
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    motionPreference: "reduced",
  });
  expect(onMotionPreferenceSaved).toHaveBeenCalledTimes(1);

  rerender(<SettingsPage settings={{ ...DEFAULT_APP_SETTINGS, motionPreference: "reduced" }} updateSettings={updateSettings} onMotionPreferenceSaved={onMotionPreferenceSaved} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.click(screen.getByRole("radio", { name: /Reduced motion/ }));
  expect(updateSettings).toHaveBeenCalledTimes(1);
  expect(onMotionPreferenceSaved).toHaveBeenCalledTimes(1);
});

test("theme controls expose accessible checked states and preserve unrelated settings on save", () => {
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(
    <SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />
  );
  const forest = screen.getByRole("radio", { name: /Haunted Forest/ });
  expect(forest).toHaveAttribute("aria-describedby", "life-current-theme-haunted-forest-description");
  fireEvent.click(forest);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    lifeCurrentThemeId: "haunted-forest",
  });

  rerender(
    <SettingsPage
      settings={{ ...DEFAULT_APP_SETTINGS, lifeCurrentThemeId: "haunted-forest" }}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /River/ })).not.toBeChecked();
  expect(screen.getByText("✓ Selected").closest("label")).toHaveAttribute("data-selected", "true");
});

test("shows transient confirmation only after Settings save succeeds", () => {
  jest.useFakeTimers();
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(screen.getByRole("status")).toHaveTextContent("Settings saved");
  expect(updateSettings).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(2200));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  rerender(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={() => false} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  jest.useRealTimers();
});
