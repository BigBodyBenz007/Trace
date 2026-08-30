import { useEffect, useMemo, useRef, useState } from "react";
import { DOSE_UNIT_OPTIONS } from "../constants/medicationOptions";
import { formatRoute } from "../services/medicationEntry";
import { motionScrollBehavior } from "../services/motionPreference";
import {
  MAX_MEDICATION_DOSE_INTERVAL_DAYS,
  MEDICATION_DOSE_REPEAT_OPTIONS,
  getMedicationDoseScheduleError,
  medicationDoseDateKey,
} from "../services/medicationDoseSchedule";

const WEEKDAYS = [
  { value: 7, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function inferredClassification(seed) {
  if (["medication", "supplement"].includes(seed.classification)) return seed.classification;
  const category = seed.compoundReference?.category;
  if (category === "medication") return "medication";
  if (["supplement", "vitamin-mineral"].includes(category)) return "supplement";
  return "";
}

function initialDraft(seed) {
  return {
    name: seed.name,
    classification: inferredClassification(seed),
    doseAmount: seed.dose?.amount == null ? "" : String(seed.dose.amount),
    doseUnit: seed.dose?.unit || "",
    customDoseUnit: seed.dose?.customUnit || "",
    route: { ...seed.route },
    notes: seed.notes || "",
    source: { ...seed.source },
    compoundReference: seed.compoundReference ? { ...seed.compoundReference } : null,
    repeatType: seed.repeat?.type || "once",
    weekdays: seed.repeat?.weekdays ? [...seed.repeat.weekdays] : [],
    intervalDays: seed.repeat?.intervalDays == null ? "2" : String(seed.repeat.intervalDays),
    startDate: seed.startDate || medicationDoseDateKey(),
    endDate: seed.endDate || "",
    time: seed.time || "",
  };
}

function recordDraft(draft) {
  return {
    name: draft.name,
    classification: draft.classification,
    dose: {
      amount: draft.doseAmount,
      unit: draft.doseUnit,
      ...(draft.doseUnit === "custom" ? { customUnit: draft.customDoseUnit } : {}),
    },
    route: { ...draft.route },
    notes: draft.notes,
    source: { ...draft.source },
    ...(draft.compoundReference ? { compoundReference: { ...draft.compoundReference } } : {}),
    repeat: draft.repeatType === "weekdays"
      ? { type: "weekdays", weekdays: draft.weekdays }
      : draft.repeatType === "interval"
        ? { type: "interval", intervalDays: draft.intervalDays }
        : { type: draft.repeatType },
    startDate: draft.startDate,
    endDate: draft.repeatType === "once" ? null : draft.endDate || null,
    time: draft.time,
  };
}

export default function MedicationDoseScheduler({
  seed,
  editing = false,
  onSave,
  onCancel,
  onSaved,
  buttonStyle = {},
  inputStyle = {},
}) {
  const [draft, setDraft] = useState(() => initialDraft(seed));
  const [error, setError] = useState("");
  const headingRef = useRef(null);
  const classificationRef = useRef(null);
  const doseAmountRef = useRef(null);
  const doseUnitRef = useRef(null);
  const customUnitRef = useRef(null);
  const startDateRef = useRef(null);
  const timeRef = useRef(null);
  const intervalRef = useRef(null);
  const firstWeekdayRef = useRef(null);
  const endDateRef = useRef(null);
  const initial = useMemo(() => JSON.stringify(initialDraft(seed)), [seed]);
  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "10px",
    width: "100%",
  };

  useEffect(() => {
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "start" });
  }, []);

  function change(values) {
    setDraft((current) => ({ ...current, ...values }));
    setError("");
  }

  function focusFirstInvalid(record) {
    let target = null;
    if (!record.classification) target = classificationRef.current;
    else if (!(Number(record.dose.amount) > 0)) target = doseAmountRef.current;
    else if (!record.dose.unit) target = doseUnitRef.current;
    else if (record.dose.unit === "custom" && !String(record.dose.customUnit || "").trim()) {
      target = customUnitRef.current;
    } else if (!record.startDate) target = startDateRef.current;
    else if (!record.time) target = timeRef.current;
    else if (record.repeat.type === "weekdays" && record.repeat.weekdays.length === 0) {
      target = firstWeekdayRef.current;
    } else if (
      record.repeat.type === "interval"
      && (!Number.isInteger(Number(record.repeat.intervalDays))
        || Number(record.repeat.intervalDays) < 1
        || Number(record.repeat.intervalDays) > MAX_MEDICATION_DOSE_INTERVAL_DAYS)
    ) {
      target = intervalRef.current;
    } else if (record.endDate && record.endDate < record.startDate) target = endDateRef.current;
    target?.focus();
  }

  function save(event) {
    event.preventDefault();
    const record = recordDraft(draft);
    const validationError = getMedicationDoseScheduleError(record);
    if (validationError) {
      setError(validationError);
      focusFirstInvalid(record);
      return;
    }
    let result = onSave(record, false);
    if (result?.status === "duplicate") {
      const duplicate = result.duplicate;
      const confirmed = window.confirm(
        `A dose of ${draft.name} is already scheduled for ${duplicate.date} at ${duplicate.time}. Add another dose?`
      );
      if (!confirmed) return;
      result = onSave(record, true);
    }
    if (result?.status !== "saved") {
      setError(result?.message || "The dose schedule could not be saved.");
      return;
    }
    onSaved(result.schedule);
  }

  function cancel() {
    if (
      JSON.stringify(draft) !== initial
      && !window.confirm("Cancel scheduling this dose? Your unsaved changes will be lost.")
    ) return;
    onCancel();
  }

  function toggleWeekday(value, checked) {
    change({
      weekdays: checked
        ? [...new Set([...draft.weekdays, value])]
        : draft.weekdays.filter((day) => day !== value),
    });
  }

  return (
    <form className="trace-feature-surface trace-feature-form trace-medication-dose-scheduler" aria-label={editing ? `Edit dose schedule for ${draft.name}` : `Schedule dose for ${draft.name}`} onSubmit={save}>
      <h2 ref={headingRef} tabIndex="-1" style={{ scrollMarginTop: "24px" }}>
        {editing ? "Edit Dose Schedule" : "Schedule Dose"}
      </h2>
      <p className="trace-medication-dose-scheduler__name"><strong>{draft.name}</strong></p>
      <div className="trace-medication-dose-scheduler__grid">
        <label>
          Classification
          <select ref={classificationRef} aria-label="Medication or supplement classification" value={draft.classification} onChange={(event) => change({ classification: event.target.value })} style={fieldStyle}>
            <option value="">Select classification...</option>
            <option value="medication">Medication</option>
            <option value="supplement">Supplement</option>
          </select>
        </label>
        <label>
          Dose amount
          <input ref={doseAmountRef} type="number" min="0" step="any" value={draft.doseAmount} onChange={(event) => change({ doseAmount: event.target.value })} style={fieldStyle} />
        </label>
        <label>
          Dose unit
          <select ref={doseUnitRef} value={draft.doseUnit} onChange={(event) => change({ doseUnit: event.target.value, customDoseUnit: "" })} style={fieldStyle}>
            <option value="">Select a unit...</option>
            {DOSE_UNIT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {draft.doseUnit === "custom" && (
          <label>
            Custom dose unit
            <input ref={customUnitRef} value={draft.customDoseUnit} onChange={(event) => change({ customDoseUnit: event.target.value })} maxLength={30} style={fieldStyle} />
          </label>
        )}
        <label>
          Saved route
          <input value={formatRoute(draft.route)} readOnly aria-readonly="true" style={fieldStyle} />
        </label>
        <label>
          Repeat
          <select aria-label="Dose recurrence" value={draft.repeatType} onChange={(event) => change({ repeatType: event.target.value, endDate: event.target.value === "once" ? "" : draft.endDate })} style={fieldStyle}>
            {MEDICATION_DOSE_REPEAT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Start date
          <input ref={startDateRef} type="date" value={draft.startDate} onChange={(event) => change({ startDate: event.target.value })} style={fieldStyle} />
        </label>
        <label>
          Scheduled time
          <input ref={timeRef} type="time" value={draft.time} onChange={(event) => change({ time: event.target.value })} style={fieldStyle} />
        </label>
        {draft.repeatType === "interval" && (
          <label>
            Repeat every number of days
            <input ref={intervalRef} type="number" min="1" max={MAX_MEDICATION_DOSE_INTERVAL_DAYS} step="1" value={draft.intervalDays} onChange={(event) => change({ intervalDays: event.target.value })} style={fieldStyle} />
          </label>
        )}
        {draft.repeatType !== "once" && (
          <label>
            End date (optional)
            <input ref={endDateRef} type="date" value={draft.endDate} onChange={(event) => change({ endDate: event.target.value })} style={fieldStyle} />
          </label>
        )}
      </div>
      {draft.repeatType === "weekdays" && (
        <fieldset className="trace-medication-dose-scheduler__weekdays">
          <legend>Selected weekdays</legend>
          {WEEKDAYS.map(({ value, label }, index) => (
            <label key={value}>
              <input ref={index === 0 ? firstWeekdayRef : undefined} type="checkbox" checked={draft.weekdays.includes(value)} onChange={(event) => toggleWeekday(value, event.target.checked)} /> {label}
            </label>
          ))}
        </fieldset>
      )}
      <label className="trace-medication-dose-scheduler__notes">
        Schedule notes (optional)
        <textarea value={draft.notes} onChange={(event) => change({ notes: event.target.value })} rows={3} maxLength={2000} style={fieldStyle} />
      </label>
      {error && <p role="alert" className="trace-medication-dose-scheduler__error">{error}</p>}
      <div className="trace-medication-dose-scheduler__actions">
        <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>Schedule Dose</button>
        <button className="trace-action trace-action--secondary" type="button" onClick={cancel} style={buttonStyle}>Cancel</button>
      </div>
    </form>
  );
}
