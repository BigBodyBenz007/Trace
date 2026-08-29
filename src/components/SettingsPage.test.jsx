import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./SettingsPage";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

test("uses the scoped quiet-utility presentation and selected-state controls", () => {
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={jest.fn()} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByTestId("settings-page")).toHaveClass("trace-feature-page--settings");
  expect(screen.getByRole("radio", { name: /Modern Heirloom/ }).closest("label")).toHaveAttribute("data-selected", "true");
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
  expect(screen.getByRole("heading", { name: "App Theme" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Motion & Effects" })).toBeInTheDocument();
  const themes = within(screen.getByRole("radiogroup", { name: "App Theme" })).getAllByRole("radio");
  expect(themes).toHaveLength(6);
  expect(screen.getByRole("radio", { name: /Modern Heirloom/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /^River/ })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: /Gnome Village/ })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: /Desert Journey/ })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: /Outer Space Journey/ })).not.toBeChecked();
  expect(screen.getByText("Trace's classic, non-illustrated presentation with a quiet brass Life Current.")).toBeInTheDocument();
  expect(screen.getByText("A flowing current through your timeline.")).toBeInTheDocument();
  expect(screen.getByText("A winding path through a darker world.")).toBeInTheDocument();
  expect(screen.getByText("A storybook path through a lived-in woodland village.")).toBeInTheDocument();
  expect(screen.getByText("One connected golden-ochre road through an ancient desert world."))
    .toBeInTheDocument();
  expect(screen.getByText("A continuous expedition through an ancient alien world."))
    .toBeInTheDocument();
  expect(screen.getByText("✓ Selected")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ units: expect.objectContaining({ weight: "kg" }) }));
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);
});

test("Motion & Effects offers exactly two accessible keyboard-operated choices", () => {
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  const group = screen.getByRole("radiogroup", { name: "Motion & Effects" });
  const choices = within(group).getAllByRole("radio");
  const standard = screen.getByRole("radio", { name: /Standard motion/ });
  const reduced = screen.getByRole("radio", { name: /Reduced motion/ });
  expect(choices).toEqual([standard, reduced]);
  expect(standard).toBeChecked();
  expect(reduced).not.toBeChecked();
  expect(reduced).toHaveAttribute("aria-describedby", "motion-preference-reduced-description");
  reduced.focus();
  userEvent.keyboard("{space}");
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    motionPreference: "reduced",
  });

  rerender(
    <SettingsPage
      settings={{ ...DEFAULT_APP_SETTINGS, motionPreference: "reduced" }}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("radio", { name: /Reduced motion/ })).toBeChecked();
  expect(screen.getByText("Selected").closest("label")).toHaveAttribute("data-selected", "true");
});

test("theme controls expose accessible checked states and preserve unrelated settings on save", () => {
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(
    <SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />
  );
  const forest = screen.getByRole("radio", { name: /Haunted Forest/ });
  expect(forest).toHaveAttribute("aria-describedby", "app-theme-haunted-forest-description");
  fireEvent.click(forest);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    themeId: "haunted-forest",
  });

  rerender(
    <SettingsPage
      settings={{ ...DEFAULT_APP_SETTINGS, themeId: "haunted-forest" }}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("radio", { name: /Haunted Forest/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Modern Heirloom/ })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: /^River/ })).not.toBeChecked();
  expect(screen.getByText("✓ Selected").closest("label")).toHaveAttribute("data-selected", "true");
});

test("Modern Heirloom remains a selectable choice distinct from River", () => {
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(
    <SettingsPage
      settings={{ ...DEFAULT_APP_SETTINGS, themeId: "river" }}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("radio", { name: /^River/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Modern Heirloom/ })).not.toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: /Modern Heirloom/ }));
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    themeId: "modern-heirloom",
  });

  rerender(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("radio", { name: /Modern Heirloom/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /^River/ })).not.toBeChecked();
});

test("selects Gnome Village through the shared theme control", () => {
  const updateSettings = jest.fn(() => true);
  render(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  const gnome = screen.getByRole("radio", { name: /Gnome Village/ });
  expect(gnome).toHaveAttribute("aria-describedby", "app-theme-gnome-village-description");
  fireEvent.click(gnome);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    themeId: "gnome-village",
  });
});

test("selects Desert Journey through the shared theme control", () => {
  const updateSettings = jest.fn(() => true);
  render(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  const desert = screen.getByRole("radio", { name: /Desert Journey/ });
  expect(desert).toHaveAttribute("aria-describedby", "app-theme-desert-journey-description");
  fireEvent.click(desert);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    themeId: "desert-journey",
  });
});

test("selects Outer Space Journey through the shared theme control", () => {
  const updateSettings = jest.fn(() => true);
  render(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  const outerSpace = screen.getByRole("radio", { name: /Outer Space Journey/ });
  expect(outerSpace).toHaveAttribute(
    "aria-describedby",
    "app-theme-outer-space-journey-description"
  );
  fireEvent.click(outerSpace);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    themeId: "outer-space-journey",
  });
});

test("shows transient confirmation only after Settings save succeeds", () => {
  jest.useFakeTimers();
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  const confirmation = screen.getByRole("status");
  expect(confirmation).toHaveTextContent("Settings saved");
  expect(confirmation).toHaveClass("trace-save-confirmation");
  expect(confirmation).toHaveAttribute("data-placement", "viewport-edge");
  expect(confirmation).toHaveStyle({ position: "fixed" });
  expect(confirmation).toHaveAttribute("data-testid", "save-confirmation");
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

test("offers accessible Home visibility switches and saves reversible choices", () => {
  const updateSettings = jest.fn(() => true);
  const { rerender } = render(
    <SettingsPage
      settings={DEFAULT_APP_SETTINGS}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );

  expect(screen.getByRole("heading", { name: "Customize Home" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Make Trace yours" })).toBeInTheDocument();
  expect(screen.getByText(/Hiding a tool won't delete your information/)).toBeInTheDocument();
  expect(screen.getAllByRole("switch")).toHaveLength(8);
  const workouts = screen.getByRole("switch", { name: "Show Workouts on Home" });
  expect(workouts).toBeChecked();
  fireEvent.click(workouts);
  expect(updateSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_APP_SETTINGS,
    homeVisibility: { ...DEFAULT_APP_SETTINGS.homeVisibility, workouts: false },
  });

  rerender(
    <SettingsPage
      settings={{
        ...DEFAULT_APP_SETTINGS,
        homeVisibility: { ...DEFAULT_APP_SETTINGS.homeVisibility, workouts: false },
      }}
      updateSettings={updateSettings}
      onBack={jest.fn()}
      buttonStyle={{}}
      containerStyle={{}}
    />
  );
  expect(screen.getByRole("switch", { name: "Show Workouts on Home" })).not.toBeChecked();
  expect(screen.getByText("Hidden").closest("label")).toHaveAttribute("data-visible", "false");
  fireEvent.click(screen.getByRole("switch", { name: "Show Workouts on Home" }));
  expect(updateSettings).toHaveBeenLastCalledWith(DEFAULT_APP_SETTINGS);
});
