import { useEffect, useRef, useState } from "react";
import ProtocolCompoundPicker from "./ProtocolCompoundPicker";
import { DOSE_UNIT_OPTIONS, ROUTE_OPTIONS } from "../constants/medicationOptions";
import { createProtocolId, getProtocolError, WEEKDAYS } from "../services/protocol";

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const DISPLAY_WEEKDAYS = [WEEKDAYS[6], ...WEEKDAYS.slice(0, 6)];

function editableItems(protocol) {
  return (protocol?.items || []).map((item) => ({
    id: item.id,
    compound: {
      name: item.compound.name,
      ...(item.compound.reference ? { reference: { ...item.compound.reference } } : {}),
    },
    dose: {
      amount: String(item.dose.amount),
      unit: item.dose.unit,
      customUnit: item.dose.customUnit || "",
    },
    route: { code: item.route.code, customLabel: item.route.customLabel || "" },
    schedule: { type: "weekly-days", weekdays: [...item.schedule.weekdays] },
    notes: item.notes || "",
  }));
}

function ProtocolEditor({ protocol = null, compounds = [], onSave, onCancel, buttonStyle = {}, inputStyle = {} }) {
  const [name, setName] = useState(protocol?.name || "");
  const [startDate, setStartDate] = useState(protocol?.startDate || todayKey());
  const [endDate, setEndDate] = useState(protocol?.endDate || "");
  const [notes, setNotes] = useState(protocol?.notes || "");
  const [items, setItems] = useState(() => editableItems(protocol));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const pickerRef = useRef(null);
  const addItemRef = useRef(null);
  const itemSectionRef = useRef(null);
  const itemRefs = useRef(new Map());
  const everyDaySnapshotsRef = useRef(new Map());

  useEffect(() => {
    if (!pickerOpen) return undefined;
    pickerRef.current?.querySelector('input[type="search"]')?.focus();
    const frame = window.requestAnimationFrame(() => {
      pickerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pickerOpen]);

  function updateItem(id, updater) {
    setItems((current) =>
      current.map((item) => (item.id === id ? updater(item) : item))
    );
    setError("");
  }

  function selectCompound(itemDraft) {
    const item = { ...itemDraft, id: createProtocolId("protocol-item") };
    setItems((current) => [...current, item]);
    setPickerOpen(false);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(item.id)?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function cancelPicker() {
    setPickerOpen(false);
    window.requestAnimationFrame(() => {
      addItemRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }

  function removeItem(id) {
    everyDaySnapshotsRef.current.delete(id);
    const index = items.findIndex((item) => item.id === id);
    const remaining = items.filter((item) => item.id !== id);
    const fallback = remaining[Math.min(index, remaining.length - 1)]?.id;
    setItems(remaining);
    window.requestAnimationFrame(() => {
      const target = itemRefs.current.get(fallback) || itemSectionRef.current;
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }

  function toggleEveryDay(id) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const isEveryDay = current.schedule.weekdays.length === 7;
    const snapshot = everyDaySnapshotsRef.current.get(id);
    if (isEveryDay && !snapshot) return;

    const weekdays = isEveryDay
      ? [...snapshot]
      : [1, 2, 3, 4, 5, 6, 7];
    if (isEveryDay) {
      everyDaySnapshotsRef.current.delete(id);
    } else {
      everyDaySnapshotsRef.current.set(id, [...current.schedule.weekdays]);
    }
    updateItem(id, (item) => ({
      ...item,
      schedule: { type: "weekly-days", weekdays },
    }));
  }

  function toggleWeekday(id, value, checked) {
    everyDaySnapshotsRef.current.delete(id);
    updateItem(id, (current) => ({
      ...current,
      schedule: {
        type: "weekly-days",
        weekdays: checked
          ? [...current.schedule.weekdays, value]
          : current.schedule.weekdays.filter((day) => day !== value),
      },
    }));
  }

  function submit(event) {
    event.preventDefault();
    const draft = {
      name,
      startDate,
      endDate,
      status: protocol?.status || "active",
      notes,
      items,
    };
    const validationError = getProtocolError(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const result = onSave(draft);
    if (result?.status !== "saved") {
      setError(result?.message || "The protocol could not be saved.");
    }
  }

  const formInput = { ...inputStyle, boxSizing: "border-box", marginTop: "8px", padding: "10px", width: "100%" };
  const actions = (position) => (
    <div aria-label={`${position} protocol editor actions`} style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
      <button type="submit" style={buttonStyle}>Save Protocol</button>
      <button type="button" onClick={onCancel} style={{ ...buttonStyle, backgroundColor: "#666" }}>Cancel Protocol</button>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ background: "#1f2937", borderRadius: "16px", maxWidth: "800px", padding: "24px", textAlign: "left", width: "100%" }}>
      <h2 style={{ marginTop: 0 }}>{protocol ? "Edit Protocol" : "Create Protocol"}</h2>
      {actions("Top")}
      <label style={{ display: "block", marginTop: "16px" }}>
        Protocol name
        <input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} style={formInput} />
      </label>
      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", marginTop: "16px" }}>
        <label>Start date<input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setError(""); }} style={formInput} /></label>
        <label>End date (optional)<input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setError(""); }} style={formInput} /></label>
      </div>
      <label style={{ display: "block", marginTop: "16px" }}>
        Protocol notes (optional)
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} style={{ ...formInput, minHeight: "90px" }} />
      </label>

      <section ref={itemSectionRef} aria-label="Protocol items" style={{ marginTop: "24px" }}>
        <h3>Protocol Items</h3>
        {items.length === 0 && <p style={{ color: "#bbb" }}>No protocol items added yet.</p>}
        {items.map((item, index) => (
          <article
            key={item.id}
            ref={(element) => {
              if (element) itemRefs.current.set(item.id, element);
              else itemRefs.current.delete(item.id);
            }}
            data-protocol-item-id={item.id}
            aria-label={`Protocol item ${index + 1}: ${item.compound.name}`}
            style={{ background: "#111827", borderRadius: "12px", marginTop: "12px", padding: "16px" }}
          >
            <h4 style={{ marginTop: 0 }}>{item.compound.name}</h4>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))" }}>
              <label>Dose amount<input type="number" min="0" step="any" value={item.dose.amount} onChange={(event) => updateItem(item.id, (current) => ({ ...current, dose: { ...current.dose, amount: event.target.value } }))} style={formInput} /></label>
              <label>Dose unit<select value={item.dose.unit} onChange={(event) => updateItem(item.id, (current) => ({ ...current, dose: { ...current.dose, unit: event.target.value, customUnit: "" } }))} style={formInput}><option value="">Select a unit...</option>{DOSE_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label>Route<select value={item.route.code} onChange={(event) => updateItem(item.id, (current) => ({ ...current, route: { code: event.target.value, customLabel: "" } }))} style={formInput}><option value="">Select a route...</option>{ROUTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            {item.dose.unit === "custom" && <label style={{ display: "block", marginTop: "12px" }}>Custom dose unit<input value={item.dose.customUnit} onChange={(event) => updateItem(item.id, (current) => ({ ...current, dose: { ...current.dose, customUnit: event.target.value } }))} style={formInput} /></label>}
            {item.route.code === "other" && <label style={{ display: "block", marginTop: "12px" }}>Custom route<input value={item.route.customLabel} onChange={(event) => updateItem(item.id, (current) => ({ ...current, route: { ...current.route, customLabel: event.target.value } }))} style={formInput} /></label>}
            <fieldset style={{ border: "1px solid #4b5563", marginTop: "14px" }}>
              <legend>Weekdays</legend>
              <button
                type="button"
                aria-pressed={item.schedule.weekdays.length === 7}
                onClick={() => toggleEveryDay(item.id)}
              >
                Every day
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                {DISPLAY_WEEKDAYS.map(({ value, label }) => (
                  <label key={value}>
                    <input type="checkbox" checked={item.schedule.weekdays.includes(value)} onChange={(event) => toggleWeekday(item.id, value, event.target.checked)} /> {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label style={{ display: "block", marginTop: "12px" }}>Item notes (optional)<textarea value={item.notes} onChange={(event) => updateItem(item.id, (current) => ({ ...current, notes: event.target.value }))} style={{ ...formInput, minHeight: "70px" }} /></label>
            <button type="button" onClick={() => removeItem(item.id)} style={{ marginTop: "12px" }}>Remove Item</button>
          </article>
        ))}

        {!pickerOpen && <button ref={addItemRef} type="button" onClick={() => setPickerOpen(true)} style={{ ...buttonStyle, marginTop: "16px" }}>Add Protocol Item</button>}
        {pickerOpen && <div ref={pickerRef} style={{ marginTop: "16px", scrollMarginTop: "24px" }}><ProtocolCompoundPicker compounds={compounds} onSelect={selectCompound} onCancel={cancelPicker} inputStyle={inputStyle} /></div>}
      </section>
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
      {actions("Bottom")}
    </form>
  );
}

export default ProtocolEditor;
