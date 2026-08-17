import { act, fireEvent, render, screen } from "@testing-library/react";
import SettingsPage from "./SettingsPage";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

test("renders compact global unit controls and saves each preference", () => {
  const updateSettings = jest.fn();
  render(<SettingsPage settings={DEFAULT_APP_SETTINGS} updateSettings={updateSettings} onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Units" })).toBeInTheDocument();
  expect(screen.getByLabelText("Pounds (lb)")).toBeChecked();
  expect(screen.getByLabelText("Feet + inches (ft/in)")).toBeChecked();
  expect(screen.getByLabelText("Inches (in)")).toBeChecked();
  fireEvent.click(screen.getByLabelText("Kilograms (kg)"));
  expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ units: expect.objectContaining({ weight: "kg" }) }));
  expect(screen.getAllByRole("button", { name: "Back to Timeline" })).toHaveLength(2);
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
