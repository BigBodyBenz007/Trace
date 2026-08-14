import { useEffect, useMemo, useRef, useState } from "react";
import { HEALTH_MEASUREMENT_FIELDS, validateHealthMeasurementDraft } from "../services/healthMeasurements";
import { DEFAULT_APP_SETTINGS } from "../services/appSettings";

function localDateTime(value = new Date()) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}

function emptyMeasurements(settings) {
  return Object.fromEntries(HEALTH_MEASUREMENT_FIELDS.map((field) => [field.key, {
    value: "",
    unit: field.key === "weight" ? settings.units.weight : field.key === "bodyFat" ? "%" : settings.units.circumference,
  }]));
}

function initialDraft(settings) {
  return { ...localDateTime(), measurements: emptyMeasurements(settings), height: { unit: settings.units.height, feet: "", inches: "", centimeters: "" }, notes: "" };
}

export default function HealthPage({ onBack, entries, settings = DEFAULT_APP_SETTINGS, saveEntry, updateEntry, deleteEntry, buttonStyle, inputStyle, containerStyle }) {
  const [draft, setDraft] = useState(() => initialDraft(settings));
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const editorRef = useRef(null);
  const entryRefs = useRef(new Map());
  const pendingHistoryScrollRef = useRef(null);
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)), [entries]);
  const fieldByKey = Object.fromEntries(HEALTH_MEASUREMENT_FIELDS.map((field) => [field.key, field]));

  useEffect(() => {
    const id = pendingHistoryScrollRef.current;
    if (!id) return;
    const target = entryRefs.current.get(id);
    if (!target) return;
    pendingHistoryScrollRef.current = null;
    target.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [entries]);

  const fieldInputStyle = { ...inputStyle, boxSizing: "border-box", fontSize: "16px", marginTop: "4px", minHeight: "44px", padding: "8px", width: "100%" };
  const measurementInputStyle = { ...fieldInputStyle, maxWidth: "112px" };
  const imperialHeightInputStyle = { ...fieldInputStyle, maxWidth: "64px", minWidth: 0 };
  const measurementFieldGroupStyle = { display: "block", maxWidth: "100%", textAlign: "left", width: "fit-content" };
  const smallButtonStyle = { ...buttonStyle, fontSize: "16px", marginTop: 0, minHeight: "44px", padding: "10px 14px" };

  function changeMeasurement(key, property, value) {
    setDraft((current) => ({ ...current, measurements: { ...current.measurements, [key]: { ...current.measurements[key], [property]: value } } }));
  }

  function resetDraft() {
    setDraft(initialDraft(settings));
    setEditingId(null);
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    const validation = validateHealthMeasurementDraft(draft);
    if (validation.error) { setError(validation.error); return; }
    const saved = editingId ? updateEntry(editingId, draft) : saveEntry(draft);
    if (!saved) return;
    pendingHistoryScrollRef.current = saved.id;
    resetDraft();
  }

  function beginEdit(entry) {
    const dateTime = localDateTime(entry.occurredAt);
    const measurements = emptyMeasurements(settings);
    Object.entries(entry.measurements || {}).forEach(([key, measurement]) => {
      if (measurements[key]) measurements[key] = { value: String(measurement.value), unit: measurement.unit };
    });
    const storedHeight = entry.measurements?.height;
    const height = storedHeight?.unit === "ft-in"
      ? { unit: "ft-in", feet: String(storedHeight.feet), inches: String(storedHeight.inches), centimeters: "" }
      : storedHeight?.unit === "cm"
        ? { unit: "cm", feet: "", inches: "", centimeters: String(storedHeight.value) }
        : { unit: settings.units.height, feet: "", inches: "", centimeters: "" };
    setDraft({ ...dateTime, measurements, height, notes: entry.notes || "" });
    setEditingId(entry.id);
    setError("");
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function remove(entry) {
    if (!window.confirm("Delete this body measurement entry?")) return;
    if (deleteEntry(entry.id) && editingId === entry.id) resetDraft();
  }

  function measurementInput(field) {
    return <label key={field.key} data-measurement-field={field.key} style={measurementFieldGroupStyle}>{field.label}<span style={{ display: "grid", gap: "6px", gridTemplateColumns: "minmax(0, 112px) auto", maxWidth: "100%", width: "fit-content" }}><input aria-label={field.label} type="number" min="0" step="any" inputMode="decimal" value={draft.measurements[field.key].value} onChange={(e) => changeMeasurement(field.key, "value", e.target.value)} style={measurementInputStyle} /><span aria-label={`${field.label} unit`} style={{ alignSelf: "center", fontSize: "18px", paddingTop: "6px" }}>{draft.measurements[field.key].unit}</span></span></label>;
  }

  return (
    <main style={{ ...containerStyle, justifyContent: "flex-start" }}>
      <h1>Health</h1>
      <p style={{ color: "#bbb", marginTop: 0 }}>Record longitudinal health information without interpretation.</p>
      <button type="button" onClick={onBack} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Back to Trace</button>

      <section ref={editorRef} aria-labelledby="body-measurements-heading" style={{ marginTop: "32px", maxWidth: "700px", scrollMarginTop: "16px", width: "100%" }}>
        <h2 id="body-measurements-heading">Body Measurements</h2>
        <form onSubmit={submit} noValidate style={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px", boxSizing: "border-box", padding: "16px", width: "100%" }}>
          <div data-testid="measurement-header" style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <label>Date<input aria-label="Date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={fieldInputStyle} /></label>
            <label>Time<input aria-label="Time" type="time" required value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={fieldInputStyle} /></label>
          </div>
          <div data-testid="measurement-fields" style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "14px" }}>
            <div data-testid="weight-height-row" style={{ display: "grid", gap: "10px", gridColumn: "1 / -1", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {measurementInput(fieldByKey.weight)}
              <label data-measurement-field="height" style={measurementFieldGroupStyle}>Height
              {draft.height.unit === "ft-in" ? <span style={{ display: "grid", gap: "4px", gridTemplateColumns: "minmax(0, 64px) auto minmax(0, 64px) auto", maxWidth: "100%", width: "fit-content" }}><input aria-label="Height feet" type="number" min="0" step="1" inputMode="numeric" value={draft.height.feet} onChange={(e) => setDraft({ ...draft, height: { ...draft.height, feet: e.target.value } })} style={imperialHeightInputStyle} /><span style={{ alignSelf: "center" }}>ft</span><input aria-label="Height inches" type="number" min="0" max="11.99" step="any" inputMode="decimal" value={draft.height.inches} onChange={(e) => setDraft({ ...draft, height: { ...draft.height, inches: e.target.value } })} style={imperialHeightInputStyle} /><span style={{ alignSelf: "center" }}>in</span></span> : <span style={{ display: "grid", gap: "6px", gridTemplateColumns: "minmax(0, 112px) auto", maxWidth: "100%", width: "fit-content" }}><input aria-label="Height centimeters" type="number" min="0" step="any" inputMode="decimal" value={draft.height.centimeters} onChange={(e) => setDraft({ ...draft, height: { ...draft.height, centimeters: e.target.value } })} style={measurementInputStyle} /><span style={{ alignSelf: "center" }}>cm</span></span>}
            </label>
            </div>
            {measurementInput(fieldByKey.bodyFat)}
            {measurementInput(fieldByKey.chest)}
            {measurementInput(fieldByKey.waist)}
            {measurementInput(fieldByKey.neck)}
            {measurementInput(fieldByKey.leftArm)}
            {measurementInput(fieldByKey.rightArm)}
            {measurementInput(fieldByKey.leftThigh)}
            {measurementInput(fieldByKey.rightThigh)}
            {measurementInput(fieldByKey.leftCalf)}
            {measurementInput(fieldByKey.rightCalf)}
          </div>
          <label style={{ display: "block", marginTop: "12px" }}>Notes<textarea aria-label="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...fieldInputStyle, minHeight: "90px", resize: "vertical" }} /></label>
          {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
            <button type="submit" style={{ ...smallButtonStyle, backgroundColor: "#2563eb" }}>{editingId ? "Save Changes" : "Save Measurement"}</button>
            {editingId && <button type="button" onClick={resetDraft} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Cancel Edit</button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="measurement-history-heading" style={{ marginTop: "32px", maxWidth: "700px", width: "100%" }}>
        <h2 id="measurement-history-heading">Body Measurement History</h2>
        {sortedEntries.length === 0 ? <p style={{ color: "#bbb" }}>No body measurements yet.</p> : <div style={{ display: "grid", gap: "12px" }}>{sortedEntries.map((entry) => (
          <article key={entry.id} ref={(node) => { if (node) entryRefs.current.set(entry.id, node); else entryRefs.current.delete(entry.id); }} data-entry-id={entry.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px", boxSizing: "border-box", overflowWrap: "anywhere", padding: "16px", scrollMarginTop: "16px", width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>{new Date(entry.occurredAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</h3>
            <p style={{ color: "#bbb" }}>{new Date(entry.occurredAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>
            <dl>{HEALTH_MEASUREMENT_FIELDS.filter((field) => entry.measurements?.[field.key]).map((field) => <div key={field.key} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><dt>{field.label}:</dt><dd style={{ margin: 0 }}>{entry.measurements[field.key].value} {entry.measurements[field.key].unit}</dd></div>)}{entry.measurements?.height && <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><dt>Height:</dt><dd style={{ margin: 0 }}>{entry.measurements.height.unit === "ft-in" ? `${entry.measurements.height.feet} ft ${entry.measurements.height.inches} in` : `${entry.measurements.height.value} cm`}</dd></div>}</dl>
            {entry.notes && <p style={{ whiteSpace: "pre-wrap" }}>{entry.notes}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}><button type="button" onClick={() => beginEdit(entry)} style={{ ...smallButtonStyle, backgroundColor: "#374151" }}>Edit</button><button type="button" onClick={() => remove(entry)} style={{ ...smallButtonStyle, backgroundColor: "#b91c1c" }}>Delete</button></div>
          </article>
        ))}</div>}
      </section>
    </main>
  );
}
