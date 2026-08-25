import { useMemo, useRef } from "react";
import { DAILY_ACTION_TYPES, dailyActionsForDate } from "../services/dailyAction";
import { parseDateOnlyLocal } from "../services/dateOnly";
import { protocolItemsScheduledForDate } from "../services/protocol";

export function localDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

export function localMonthKey(value = new Date()) {
  return localDateKey(value).slice(0, 7);
}

export function monthDate(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1
    ? date
    : null;
}

export function calendarDates(monthKey) {
  const first = monthDate(monthKey);
  if (!first) return [];
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => (
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  ));
}

const ACTION_LABELS = new Map(DAILY_ACTION_TYPES.map(({ value, label }) => [value, label]));
const MAX_CELL_SUMMARIES = 2;

function eventStartTime(event) {
  if (event.type === "daily-action") {
    return event.record.time || event.record.timeWindow?.start || null;
  }
  if (event.type === "protocol") {
    return event.record.schedule?.time || event.record.time || null;
  }
  return event.record.scheduledTime || event.record.time || null;
}

export function calendarEventSummariesForDate({ plannedWorkouts, protocols, dailyActions }, date) {
  const dateKey = localDateKey(date);
  const workouts = plannedWorkouts
    .filter(({ scheduledDate }) => scheduledDate === dateKey)
    .map((record, index) => ({ type: "workout", label: "Workout", record, sourceOrder: index }));
  const protocolItems = protocolItemsScheduledForDate(protocols, date)
    .map(({ item }, index) => ({
      type: "protocol",
      label: "Protocol",
      record: item,
      sourceOrder: workouts.length + index,
    }));
  const actions = dailyActionsForDate(dailyActions, dateKey).map((record, index) => ({
    type: record.actionType || "other",
    label: ACTION_LABELS.get(record.actionType) || "Other",
    record,
    sourceOrder: workouts.length + protocolItems.length + index,
  }));
  return [...workouts, ...protocolItems, ...actions].sort((first, second) => {
    const firstTime = eventStartTime(first);
    const secondTime = eventStartTime(second);
    if (firstTime && !secondTime) return -1;
    if (!firstTime && secondTime) return 1;
    if (firstTime && secondTime && firstTime !== secondTime) return firstTime.localeCompare(secondTime);
    return first.sourceOrder - second.sourceOrder;
  });
}

export function hasScheduleOnDate(sources, date) {
  return calendarEventSummariesForDate(sources, date).length > 0;
}

function shiftedMonth(monthKey, amount) {
  const current = monthDate(monthKey);
  return current
    ? localMonthKey(new Date(current.getFullYear(), current.getMonth() + amount, 1))
    : localMonthKey();
}

function shiftedDate(dateKey, amount) {
  const current = parseDateOnlyLocal(dateKey);
  return current
    ? localDateKey(new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount))
    : localDateKey();
}

function ScheduleCalendar({
  selectedDateKey,
  visibleMonthKey,
  onSelectDate,
  onOpenDate = null,
  onChangeMonth,
  plannedWorkouts = [],
  protocols = [],
  dailyActions = [],
  browserToday = new Date(),
}) {
  const dates = useMemo(() => calendarDates(visibleMonthKey), [visibleMonthKey]);
  const currentMonth = monthDate(visibleMonthKey) || new Date();
  const todayKey = localDateKey(browserToday);
  const dayButtonRefs = useRef(new Map());

  function selectDate(dateKey, focus = false, open = false, trigger = null) {
    const date = parseDateOnlyLocal(dateKey);
    if (!date) return;
    const nextMonthKey = localMonthKey(date);
    if (nextMonthKey !== visibleMonthKey) onChangeMonth(nextMonthKey);
    onSelectDate(dateKey);
    if (open) onOpenDate?.(dateKey, trigger);
    if (focus) {
      window.requestAnimationFrame(() => dayButtonRefs.current.get(dateKey)?.focus());
    }
  }

  function handleDayKeyDown(event, dateKey) {
    const offsets = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let nextDateKey = offsets[event.key] ? shiftedDate(dateKey, offsets[event.key]) : null;
    const date = parseDateOnlyLocal(dateKey);
    if (event.key === "Home" && date) nextDateKey = shiftedDate(dateKey, -date.getDay());
    if (event.key === "End" && date) nextDateKey = shiftedDate(dateKey, 6 - date.getDay());
    if (!nextDateKey) return;
    event.preventDefault();
    selectDate(nextDateKey, true);
  }

  const heading = currentMonth.toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <section className="trace-feature-surface trace-schedule-calendar" aria-label="Upcoming schedule calendar" data-testid="schedule-calendar">
      <div className="trace-schedule-calendar__toolbar">
        <button className="trace-action trace-action--secondary" type="button" aria-label="Previous month" onClick={() => onChangeMonth(shiftedMonth(visibleMonthKey, -1))}>Previous</button>
        <h2 aria-live="polite">{heading}</h2>
        <button className="trace-action trace-action--secondary" type="button" aria-label="Next month" onClick={() => onChangeMonth(shiftedMonth(visibleMonthKey, 1))}>Next</button>
        <button className="trace-action trace-action--brass trace-schedule-calendar__today" type="button" onClick={() => selectDate(todayKey)}>Today</button>
      </div>
      <div className="trace-schedule-calendar__weekdays" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="trace-schedule-calendar__grid" role="grid" aria-label={heading}>
        {dates.map((date) => {
          const dateKey = localDateKey(date);
          const summaries = calendarEventSummariesForDate({ plannedWorkouts, protocols, dailyActions }, date);
          const marked = summaries.length > 0;
          const visibleSummaries = summaries.slice(0, MAX_CELL_SUMMARIES);
          const additionalCount = summaries.length - visibleSummaries.length;
          const outsideMonth = localMonthKey(date) !== visibleMonthKey;
          const label = date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
          const summaryLabel = summaries.map(({ label: eventLabel }) => eventLabel).join(", ");
          return (
            <button
              className="trace-schedule-calendar__day"
              data-calendar-date={dateKey}
              data-has-schedule={marked ? "true" : "false"}
              data-outside-month={outsideMonth ? "true" : "false"}
              key={dateKey}
              type="button"
              aria-label={`${label}${marked ? `, scheduled: ${summaryLabel}` : ""}`}
              aria-current={dateKey === todayKey ? "date" : undefined}
              aria-pressed={dateKey === selectedDateKey}
              onClick={(event) => selectDate(dateKey, false, true, event.currentTarget)}
              onKeyDown={(event) => handleDayKeyDown(event, dateKey)}
              ref={(node) => {
                if (node) dayButtonRefs.current.set(dateKey, node);
                else dayButtonRefs.current.delete(dateKey);
              }}
            >
              <span className="trace-schedule-calendar__date-number">{date.getDate()}</span>
              {marked && (
                <span className="trace-schedule-calendar__events" aria-hidden="true">
                  {visibleSummaries.map((summary, index) => (
                    <span className={`trace-schedule-calendar__event trace-schedule-calendar__event--${summary.type}`} key={`${summary.type}:${index}`}>
                      {summary.label}
                    </span>
                  ))}
                  {additionalCount > 0 && <span className="trace-schedule-calendar__more">+{additionalCount} more</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ScheduleCalendar;
