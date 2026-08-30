import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ScheduleCalendar, {
  calendarDates,
  calendarEventSummariesForDate,
  localDateKey,
} from "./ScheduleCalendar";
import {
  createMedicationDoseSchedule,
  deleteMedicationDoseSchedule,
  endMedicationDoseSchedule,
} from "../services/medicationDoseSchedule";

function protocolForWednesday() {
  return {
    id: "protocol:calendar",
    name: "Calendar protocol",
    startDate: "2026-08-01",
    endDate: null,
    status: "active",
    items: [{
      id: "protocol-item:calendar",
      schedule: { type: "weekly-days", weekdays: [3] },
    }],
  };
}

function renderCalendar(overrides = {}) {
  const props = {
    selectedDateKey: "2026-08-12",
    visibleMonthKey: "2026-08",
    onSelectDate: jest.fn(),
    onChangeMonth: jest.fn(),
    plannedWorkouts: [],
    protocols: [],
    dailyActions: [],
    browserToday: new Date(2026, 7, 24, 23, 30),
    ...overrides,
  };
  render(<ScheduleCalendar {...props} />);
  return props;
}

test("builds month cells with local calendar fields and no UTC date conversion", () => {
  const dates = calendarDates("2026-08");
  expect(dates).toHaveLength(42);
  expect(localDateKey(dates[0])).toBe("2026-07-26");
  expect(localDateKey(new Date(2026, 7, 24, 23, 59))).toBe("2026-08-24");
});

test("navigates months and returns to the browser-local current day", () => {
  function CalendarHarness() {
    const [selectedDateKey, setSelectedDateKey] = useState("2026-08-12");
    const [visibleMonthKey, setVisibleMonthKey] = useState("2026-08");
    return (
      <ScheduleCalendar
        selectedDateKey={selectedDateKey}
        visibleMonthKey={visibleMonthKey}
        onSelectDate={setSelectedDateKey}
        onChangeMonth={setVisibleMonthKey}
        browserToday={new Date(2026, 7, 24, 23, 30)}
      />
    );
  }
  render(<CalendarHarness />);
  expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(document.querySelector('[data-calendar-date="2026-08-24"]')).toHaveAttribute("aria-pressed", "true");
});

test("marks dates from planned workouts, protocols, and recurring daily actions", () => {
  renderCalendar({
    plannedWorkouts: [{ scheduledDate: "2026-08-11" }],
    protocols: [protocolForWednesday()],
    dailyActions: [{
      id: "daily-action:calendar",
      schemaVersion: 1,
      title: "Recurring action",
      actionType: "personal",
      date: "2026-08-01",
      time: null,
      timeWindow: null,
      durationMinutes: null,
      location: "",
      notes: "",
      recurrence: { type: "weekly", weekdays: [4], until: null },
      status: "scheduled",
      completedAt: null,
      skippedAt: null,
      skipReason: "",
      customSkipReason: "",
      createdAt: "2026-08-01T12:00:00.000Z",
      updatedAt: "2026-08-01T12:00:00.000Z",
    }],
  });

  expect(document.querySelector('[data-calendar-date="2026-08-11"]')).toHaveAttribute("data-has-schedule", "true");
  expect(document.querySelector('[data-calendar-date="2026-08-12"]')).toHaveAttribute("data-has-schedule", "true");
  expect(document.querySelector('[data-calendar-date="2026-08-13"]')).toHaveAttribute("data-has-schedule", "true");
  expect(document.querySelector('[data-calendar-date="2026-08-14"]')).toHaveAttribute("data-has-schedule", "false");
});

test("day buttons support selection and arrow-key navigation", () => {
  const onOpenDate = jest.fn();
  const props = renderCalendar({ onOpenDate });
  const selected = document.querySelector('[data-calendar-date="2026-08-12"]');
  expect(selected).toHaveAttribute("aria-pressed", "true");
  selected.focus();
  fireEvent.keyDown(selected, { key: "ArrowRight" });
  expect(props.onSelectDate).toHaveBeenCalledWith("2026-08-13");
  expect(props.onChangeMonth).not.toHaveBeenCalled();

  fireEvent.click(document.querySelector('[data-calendar-date="2026-08-15"]'));
  expect(props.onSelectDate).toHaveBeenLastCalledWith("2026-08-15");
  expect(onOpenDate).toHaveBeenCalledWith("2026-08-15", expect.any(HTMLButtonElement));
});

test("shows compact chronological category summaries and an accessible overflow count", () => {
  const date = "2026-08-12";
  const protocols = [protocolForWednesday()];
  protocols[0].items[0].schedule.time = "08:00";
  const dailyActions = [
    { id: "meeting", schemaVersion: 1, date, title: "Standup", actionType: "meeting", time: "09:00", timeWindow: null, durationMinutes: null, location: "", notes: "", recurrence: null, status: "scheduled", completedAt: null, skippedAt: null, skipReason: "", customSkipReason: "", createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" },
    { id: "appointment", schemaVersion: 1, date, title: "Dentist", actionType: "appointment", time: "10:00", timeWindow: null, durationMinutes: null, location: "", notes: "", recurrence: null, status: "scheduled", completedAt: null, skippedAt: null, skipReason: "", customSkipReason: "", createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" },
  ];
  const plannedWorkouts = [{ id: "workout", scheduledDate: date, scheduledTime: "11:00" }];
  renderCalendar({ protocols, dailyActions, plannedWorkouts });

  const summaries = calendarEventSummariesForDate(
    { protocols, dailyActions, plannedWorkouts },
    new Date(2026, 7, 12, 23, 30)
  );
  expect(summaries.map(({ label }) => label)).toEqual(["Protocol", "Meeting", "Appointment", "Workout"]);

  const day = document.querySelector(`[data-calendar-date="${date}"]`);
  expect(day).toHaveAccessibleName(/scheduled: Protocol, Meeting, Appointment, Workout/);
  expect(within(day).getByText("Protocol")).toHaveClass("trace-schedule-calendar__event--protocol");
  expect(within(day).getByText("Meeting")).toHaveClass("trace-schedule-calendar__event--meeting");
  expect(within(day).getByText("+2 more")).toBeInTheDocument();
  expect(day.querySelectorAll(".trace-schedule-calendar__event")).toHaveLength(2);
});

test("calendar grid stays contained at exactly 390px", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderCalendar();
  expect(screen.getByTestId("schedule-calendar")).toHaveClass("trace-schedule-calendar");
  expect(screen.getByRole("grid", { name: "August 2026" }).children).toHaveLength(42);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
});

test("calendar labels medication and supplement dose snapshots without needing their sources", () => {
  const medicationDoseSchedules = [
    createMedicationDoseSchedule({
      name: "Morning medicine",
      classification: "medication",
      dose: { amount: 5, unit: "mg" },
      route: { code: "oral" },
      notes: "",
      source: { type: "medication-entry", id: "source-that-no-longer-exists" },
      repeat: { type: "daily" },
      startDate: "2026-08-12",
      endDate: null,
      time: "07:00",
    }, { id: "schedule:medicine", now: new Date("2026-08-01T12:00:00.000Z") }),
    createMedicationDoseSchedule({
      name: "Evening supplement",
      classification: "supplement",
      dose: { amount: 1, unit: "capsule" },
      route: { code: "oral" },
      notes: "",
      source: { type: "saved-compound", id: "another-deleted-source" },
      repeat: { type: "once" },
      startDate: "2026-08-12",
      endDate: null,
      time: "19:00",
    }, { id: "schedule:supplement", now: new Date("2026-08-01T12:00:00.000Z") }),
  ];
  renderCalendar({ medicationDoseSchedules });
  const day = document.querySelector('[data-calendar-date="2026-08-12"]');
  expect(day).toHaveAccessibleName(/scheduled: Medication, Supplement/);
  expect(within(day).getByText("Medication")).toHaveClass("trace-schedule-calendar__event--medication");
  expect(within(day).getByText("Supplement")).toHaveClass("trace-schedule-calendar__event--supplement");

  const summaries = calendarEventSummariesForDate(
    { plannedWorkouts: [], protocols: [], dailyActions: [], medicationDoseSchedules, medicationDoseOccurrences: [] },
    new Date(2026, 7, 12, 23, 30)
  );
  expect(summaries.map(({ label }) => label)).toEqual(["Medication", "Supplement"]);
});

test("calendar excludes deleted doses and dates beyond an ended schedule boundary", () => {
  const active = createMedicationDoseSchedule({
    name: "Calendar medicine",
    classification: "medication",
    dose: { amount: 5, unit: "mg" },
    route: { code: "oral" },
    notes: "",
    source: { type: "direct-entry", id: "medication-dose-source:calendar-lifecycle" },
    repeat: { type: "daily" },
    startDate: "2026-08-12",
    endDate: null,
    time: "07:00",
  }, { id: "schedule:calendar-lifecycle", now: new Date("2026-08-01T12:00:00.000Z") });
  const ended = endMedicationDoseSchedule(active, "2026-08-12");
  const deleted = deleteMedicationDoseSchedule(ended, "2026-08-12");
  const endedSources = {
    plannedWorkouts: [],
    protocols: [],
    dailyActions: [],
    medicationDoseSchedules: [ended],
    medicationDoseOccurrences: [],
  };

  expect(calendarEventSummariesForDate(endedSources, new Date(2026, 7, 12, 12))).toEqual([
    expect.objectContaining({ label: "Medication" }),
  ]);
  expect(calendarEventSummariesForDate(endedSources, new Date(2026, 7, 13, 12))).toEqual([]);
  expect(calendarEventSummariesForDate(
    { ...endedSources, medicationDoseSchedules: [deleted] },
    new Date(2026, 7, 12, 12)
  )).toEqual([]);
});
