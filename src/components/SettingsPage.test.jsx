import { act, fireEvent, render, screen } from "@testing-library/react";
import SettingsPage from "./SettingsPage";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

test("uses the scoped quiet-utility presentation and selected-state controls", () => {
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={jest.fn()} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByTestId("settings-page")).toHaveClass("trace-feature-page--settings");
  expect(screen.getByRole("radio", { name: /River/ }).closest("label")).toHaveAttribute("data-selected", "true");
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
  expect(screen.getByRole("radio", { name: /River/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).not.toBeChecked();
  expect(screen.getByText("A flowing current through your timeline.")).toBeInTheDocument();
  expect(screen.getByText("A winding path through a darker world.")).toBeInTheDocument();
  expect(screen.getByText("✓ Selected")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ units: expect.objectContaining({ weight: "kg" }) }));
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);
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

test("offers one responsive Backup & Restore entry and opens it from Settings", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const onOpenBackup = jest.fn();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  try {
    render(
      <SettingsPage
        settings={DEFAULT_APP_SETTINGS}
        updateSettings={jest.fn()}
        onBack={jest.fn()}
        onOpenBackup={onOpenBackup}
        buttonStyle={{}}
        containerStyle={{}}
      />
    );
    const actions = screen.getAllByRole("button", { name: "Backup & Restore" });
    const section = screen.getByRole("heading", { name: "Backup & Restore" }).closest("section");
    expect(actions).toHaveLength(1);
    expect(section).toHaveClass("trace-settings-backup");
    expect(actions[0]).toHaveClass("trace-action--primary");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    fireEvent.click(actions[0]);
    expect(onOpenBackup).toHaveBeenCalledTimes(1);
  } finally {
    if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
  }
});
