import { useEffect, useRef, useState } from "react";
import {
  WATER_UNITS,
  calculateWaterSummary,
  formatWaterAmount,
  millilitersToWaterAmount,
  waterAmountToMilliliters,
} from "../services/waterTracker";
import {
  clearFormDraft,
  clearFormDraftsForContext,
  formDraftFingerprint,
  readFormDraft,
  writeFormDraft,
} from "../services/formDrafts";

const QUICK_AMOUNTS = Object.freeze({
  [WATER_UNITS.OUNCES]: [8, 12, 16],
  [WATER_UNITS.MILLILITERS]: [250, 500, 750],
});
const HISTORY_BATCH_SIZE = 10;

function dateTimeFields(loggedAt) {
  const date = new Date(loggedAt);
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function localTimestamp(dateValue, timeValue) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!dateMatch || !timeMatch) return null;
  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );
  if (
    value.getFullYear() !== Number(dateMatch[1]) ||
    value.getMonth() !== Number(dateMatch[2]) - 1 ||
    value.getDate() !== Number(dateMatch[3]) ||
    value.getHours() !== Number(timeMatch[1]) ||
    value.getMinutes() !== Number(timeMatch[2])
  ) return null;
  return value.toISOString();
}

function editableAmount(amountMl, unit) {
  const amount = millilitersToWaterAmount(amountMl, unit);
  return unit === WATER_UNITS.OUNCES
    ? String(Number(amount.toFixed(2)))
    : String(Number(amount.toFixed(1)));
}

function convertedDraftAmount(amount, fromUnit, toUnit) {
  const amountMl = waterAmountToMilliliters(amount, fromUnit);
  return amountMl === null ? amount : editableAmount(amountMl, toUnit);
}

export default function WaterTrackerSection({
  entries = [],
  unit = WATER_UNITS.OUNCES,
  changeUnit = () => false,
  saveEntry = () => false,
  updateEntry = () => false,
  deleteEntry = () => false,
  showConfirmation = () => {},
}) {
  const customDraftContextRef = useRef({ domain: "water-custom", context: "create", sourceFingerprint: null });
  const baseCustomRef = useRef({ amount: "", unit });
  const restoredCustomRef = useRef(readFormDraft(localStorage, customDraftContextRef.current, baseCustomRef.current));
  const initialCustomRef = useRef(restoredCustomRef.current.status === "restored"
    ? restoredCustomRef.current.entry.initialValue
    : baseCustomRef.current);
  const restoredCustomAmount = restoredCustomRef.current.status === "restored"
    ? restoredCustomRef.current.value.unit === unit
      ? restoredCustomRef.current.value.amount
      : convertedDraftAmount(restoredCustomRef.current.value.amount, restoredCustomRef.current.value.unit, unit)
    : "";
  const [customExpanded, setCustomExpanded] = useState(restoredCustomRef.current.status === "restored");
  const [customAmount, setCustomAmount] = useState(restoredCustomAmount);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [error, setError] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_BATCH_SIZE);
  const previousUnitRef = useRef(unit);
  const editDraftContextRef = useRef(null);
  const initialEditRef = useRef(null);
  const customInputRef = useRef(null);
  const summary = calculateWaterSummary(entries);
  const sortedEntries = [...entries].sort(
    (first, second) => new Date(second.loggedAt) - new Date(first.loggedAt)
  );
  const visibleEntries = sortedEntries.slice(0, visibleHistoryCount);
  const remainingEntryCount = Math.max(0, sortedEntries.length - visibleEntries.length);
  const nextBatchCount = Math.min(HISTORY_BATCH_SIZE, remainingEntryCount);

  useEffect(() => {
    if (customExpanded) customInputRef.current?.focus();
  }, [customExpanded]);

  useEffect(() => {
    const previousUnit = previousUnitRef.current;
    if (previousUnit === unit) return;
    const convertDraft = (value) => {
      if (value === "") return "";
      const amountMl = waterAmountToMilliliters(value, previousUnit);
      return amountMl === null ? value : editableAmount(amountMl, unit);
    };
    setCustomAmount(convertDraft);
    setEditAmount(convertDraft);
    previousUnitRef.current = unit;
  }, [unit]);

  useEffect(() => {
    try {
      writeFormDraft(localStorage, customDraftContextRef.current, initialCustomRef.current, { amount: customAmount, unit });
    } catch (storageFailure) {
      setError("Trace could not preserve this unfinished custom water amount. Keep Nutrition open and try again.");
    }
  }, [customAmount, unit]);

  useEffect(() => {
    if (!editingId || !editDraftContextRef.current || !initialEditRef.current) return;
    try {
      writeFormDraft(localStorage, editDraftContextRef.current, initialEditRef.current, {
        amount: editAmount,
        date: editDate,
        time: editTime,
        unit,
      });
    } catch (storageFailure) {
      setError("Trace could not preserve this unfinished water edit. Keep Nutrition open and try again.");
    }
  }, [editingId, editAmount, editDate, editTime, unit]);

  function traceAmount(amount, loggedAt = new Date().toISOString()) {
    const amountMl = waterAmountToMilliliters(amount, unit);
    if (amountMl === null) {
      setError("Enter a water amount greater than zero.");
      return false;
    }
    if (!saveEntry({ amountMl, loggedAt })) return false;
    setError("");
    showConfirmation("Water traced");
    return true;
  }

  function saveCustom(event) {
    event.preventDefault();
    if (!traceAmount(customAmount)) return;
    try {
      clearFormDraft(localStorage, customDraftContextRef.current);
    } catch (storageFailure) {
      setError("The water entry was saved, but Trace could not clear its unfinished draft. Reload and verify it before logging again.");
      return;
    }
    setCustomAmount("");
    initialCustomRef.current = { amount: "", unit };
    setCustomExpanded(false);
  }

  function beginEdit(entry) {
    const fields = dateTimeFields(entry.loggedAt);
    const baseDraft = {
      amount: editableAmount(entry.amountMl, unit),
      date: fields.date,
      time: fields.time,
      unit,
    };
    const context = {
      domain: "water-entry",
      context: `edit:${entry.id}`,
      sourceFingerprint: formDraftFingerprint(entry),
    };
    const restored = readFormDraft(localStorage, context, baseDraft);
    const nextDraft = restored.status === "restored" ? restored.value : baseDraft;
    editDraftContextRef.current = context;
    initialEditRef.current = restored.status === "restored" ? restored.entry.initialValue : baseDraft;
    setEditingId(entry.id);
    setEditAmount(nextDraft.unit === unit
      ? nextDraft.amount
      : convertedDraftAmount(nextDraft.amount, nextDraft.unit, unit));
    setEditDate(nextDraft.date);
    setEditTime(nextDraft.time);
    setError(restored.status === "conflict"
      ? "This water entry changed after an unfinished edit was stored, so Trace did not apply the older draft."
      : restored.status === "malformed" || restored.status === "invalid-value"
        ? "Trace found malformed unfinished form data and left it unchanged."
        : "");
  }

  function saveEdit(event) {
    event.preventDefault();
    const amountMl = waterAmountToMilliliters(editAmount, unit);
    const loggedAt = localTimestamp(editDate, editTime);
    if (amountMl === null || !loggedAt) {
      setError("Enter a valid positive amount, local date, and local time.");
      return;
    }
    if (!updateEntry(editingId, { amountMl, loggedAt })) return;
    try {
      clearFormDraft(localStorage, editDraftContextRef.current);
    } catch (storageFailure) {
      setError("The water entry was updated, but Trace could not clear its unfinished draft. Reload and verify it before saving again.");
      return;
    }
    setEditingId(null);
    editDraftContextRef.current = null;
    initialEditRef.current = null;
    setError("");
    showConfirmation("Water updated");
  }

  function confirmDelete(entry) {
    if (!window.confirm(`Delete this ${formatWaterAmount(entry.amountMl, unit)} water entry?`)) return;
    if (!deleteEntry(entry.id)) return;
    try {
      clearFormDraftsForContext(localStorage, "water-entry", `edit:${entry.id}`);
    } catch (storageFailure) {
      setError("The water entry was deleted, but an older unfinished edit could not be cleared. It will not be restored without its saved record.");
    }
    if (editingId === entry.id) setEditingId(null);
    showConfirmation("Water entry deleted");
  }

  function cancelEdit() {
    const current = { amount: editAmount, date: editDate, time: editTime, unit };
    if (
      initialEditRef.current &&
      formDraftFingerprint(current) !== formDraftFingerprint(initialEditRef.current) &&
      !window.confirm("Cancel this water edit? Your unsaved changes will be lost.")
    ) return;
    try {
      if (editDraftContextRef.current) clearFormDraft(localStorage, editDraftContextRef.current);
    } catch (storageFailure) {
      setError("Trace could not discard this unfinished water edit. It was left available for recovery.");
      return;
    }
    setEditingId(null);
    editDraftContextRef.current = null;
    initialEditRef.current = null;
    setError("");
  }

  return (
    <section className="trace-feature-surface trace-water" aria-labelledby="water-heading">
      <div className="trace-water__heading">
        <div>
          <p className="trace-water__eyebrow">Hydration</p>
          <h2 id="water-heading">Water</h2>
        </div>
        <div aria-label="Water display unit" className="trace-water__units" role="group">
          {[WATER_UNITS.OUNCES, WATER_UNITS.MILLILITERS].map((option) => (
            <button
              aria-label={`Display water in ${option === WATER_UNITS.OUNCES ? "fluid ounces" : "milliliters"}`}
              aria-pressed={unit === option}
              key={option}
              onClick={() => changeUnit(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="trace-water__stats" aria-label="Water intake summary">
        <article className="trace-water__today">
          <span>Today</span>
          <strong>{formatWaterAmount(summary.todayMl, unit)}</strong>
        </article>
        <article>
          <span>7-day daily average</span>
          <strong>{formatWaterAmount(summary.sevenDayAverageMl, unit)}</strong>
        </article>
        <article>
          <span>30-day daily average</span>
          <strong>{formatWaterAmount(summary.thirtyDayAverageMl, unit)}</strong>
        </article>
      </div>

      <div className="trace-water__quick-add" aria-label="Quick add water">
        {QUICK_AMOUNTS[unit].map((amount) => (
          <button
            aria-label={`Log ${amount} ${unit} water`}
            className="trace-action trace-action--primary"
            key={amount}
            onClick={() => traceAmount(amount)}
            type="button"
          >
            + {amount} {unit}
          </button>
        ))}
        <button
          aria-expanded={customExpanded}
          className="trace-action trace-action--secondary"
          onClick={() => {
            setCustomExpanded((expanded) => !expanded);
            setError("");
          }}
          type="button"
        >
          Custom Amount
        </button>
      </div>

      {customExpanded && (
        <form className="trace-water__custom" onSubmit={saveCustom}>
          <label>
            Water amount ({unit})
            <input
              aria-label={`Custom water amount in ${unit}`}
              inputMode="decimal"
              min={unit === WATER_UNITS.OUNCES ? "0.1" : "1"}
              onChange={(event) => {
                setCustomAmount(event.target.value);
                setError("");
              }}
              ref={customInputRef}
              required
              step="any"
              type="number"
              value={customAmount}
            />
          </label>
          <button className="trace-action trace-action--primary" type="submit">Log Water</button>
        </form>
      )}

      {error && <p className="trace-water__error" role="alert">{error}</p>}

      <details
        className="trace-water__history"
        onToggle={(event) => {
          if (!event.currentTarget.open) setVisibleHistoryCount(HISTORY_BATCH_SIZE);
        }}
      >
        <summary
          onClick={(event) => {
            if (event.currentTarget.parentElement.open) {
              setVisibleHistoryCount(HISTORY_BATCH_SIZE);
            }
          }}
        >
          Water history ({entries.length})
        </summary>
        {sortedEntries.length === 0 ? (
          <p>No water entries yet.</p>
        ) : (
          <div className="trace-water__history-list">
            {visibleEntries.map((entry) => {
              const loggedDate = new Date(entry.loggedAt);
              const amountLabel = formatWaterAmount(entry.amountMl, unit);
              const dateLabel = loggedDate.toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              });
              const timeLabel = loggedDate.toLocaleTimeString([], {
                hour: "numeric", minute: "2-digit",
              });
              return (
                <article className="trace-water__history-entry" key={entry.id}>
                  {editingId === entry.id ? (
                    <form className="trace-water__edit" onSubmit={saveEdit}>
                      <label>
                        Water amount ({unit})
                        <input
                          aria-label={`Edit water amount in ${unit}`}
                          min={unit === WATER_UNITS.OUNCES ? "0.1" : "1"}
                          onChange={(event) => setEditAmount(event.target.value)}
                          required
                          step="any"
                          type="number"
                          value={editAmount}
                        />
                      </label>
                      <label>
                        Water date
                        <input onChange={(event) => setEditDate(event.target.value)} required type="date" value={editDate} />
                      </label>
                      <label>
                        Water time
                        <input onChange={(event) => setEditTime(event.target.value)} required type="time" value={editTime} />
                      </label>
                      <div className="trace-water__entry-actions">
                        <button className="trace-action trace-action--primary" type="submit">Save Water Changes</button>
                        <button className="trace-action trace-action--secondary" onClick={cancelEdit} type="button">Cancel Water Edit</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="trace-water__entry-copy">
                        <strong>{amountLabel}</strong>
                        <span>{dateLabel} · {timeLabel}</span>
                      </div>
                      <div className="trace-water__entry-actions">
                        <button aria-label={`Edit ${amountLabel} water entry from ${dateLabel} at ${timeLabel}`} className="trace-action trace-action--secondary" onClick={() => beginEdit(entry)} type="button">Edit</button>
                        <button aria-label={`Delete ${amountLabel} water entry from ${dateLabel} at ${timeLabel}`} className="trace-action trace-action--danger" onClick={() => confirmDelete(entry)} type="button">Delete</button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
            {remainingEntryCount > 0 && (
              <button
                aria-label={`Show ${nextBatchCount} more older water entries`}
                className="trace-action trace-action--secondary trace-water__show-more"
                onClick={() => setVisibleHistoryCount((count) => count + HISTORY_BATCH_SIZE)}
                type="button"
              >
                Show more ({remainingEntryCount} older)
              </button>
            )}
          </div>
        )}
      </details>
    </section>
  );
}
