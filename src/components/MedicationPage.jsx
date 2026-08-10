import { useRef, useState } from "react";
import {
  DOSE_UNIT_OPTIONS,
  ROUTE_OPTIONS,
} from "../constants/medicationOptions";
import {
  createMedicationEntry,
  formatDoseUnit,
  formatRoute,
  getMedicationEntryError,
} from "../services/medicationEntry";

function getCurrentLocalDateTime() {
  const now = new Date();

  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`,
  };
}

function getLocalDateTimeFromTimestamp(timestamp) {
  const date = new Date(timestamp);

  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`,
  };
}

function MedicationPage({
  onBack,
  medicationEntries,
  saveMedicationEntry,
  updateMedicationEntry,
  deleteMedicationEntry,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const initialDateTime = getCurrentLocalDateTime();
  const [name, setName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState("");
  const [customDoseUnit, setCustomDoseUnit] = useState("");
  const [route, setRoute] = useState("");
  const [customRoute, setCustomRoute] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [notes, setNotes] = useState("");
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const pageTopRef = useRef(null);
  const formRef = useRef(null);

  const sortedEntries = [...medicationEntries].sort(
    (firstEntry, secondEntry) =>
      new Date(secondEntry.occurredAt) - new Date(firstEntry.occurredAt)
  );

  const formInputStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "18px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "12px",
    width: "100%",
  };

  function draft() {
    return {
      name,
      doseAmount,
      doseUnit,
      customDoseUnit,
      route,
      customRoute,
      date,
      time,
      notes,
    };
  }

  function resetForm() {
    const currentDateTime = getCurrentLocalDateTime();

    setName("");
    setDoseAmount("");
    setDoseUnit("");
    setCustomDoseUnit("");
    setRoute("");
    setCustomRoute("");
    setDate(currentDateTime.date);
    setTime(currentDateTime.time);
    setNotes("");
    setEditingEntryId(null);
    setIsDraftDirty(false);
    setFormError("");
  }

  function saveEntry(event) {
    event.preventDefault();

    const entryDraft = draft();
    const validationError = getMedicationEntryError(entryDraft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const existingEntry = medicationEntries.find(
      (entry) => entry.id === editingEntryId
    );
    const entry = createMedicationEntry(entryDraft, existingEntry);

    if (editingEntryId === null) {
      if (!saveMedicationEntry(entry)) return;
    } else if (!updateMedicationEntry(editingEntryId, entry)) {
      return;
    }

    resetForm();
    pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function editEntry(entry) {
    const localDateTime = getLocalDateTimeFromTimestamp(entry.occurredAt);

    setName(entry.name);
    setDoseAmount(String(entry.dose.amount));
    setDoseUnit(entry.dose.unit);
    setCustomDoseUnit(entry.dose.customUnit || "");
    setRoute(entry.route.code);
    setCustomRoute(entry.route.customLabel || "");
    setDate(localDateTime.date);
    setTime(localDateTime.time);
    setNotes(entry.notes || "");
    setEditingEntryId(entry.id);
    setIsDraftDirty(false);
    setFormError("");
    formRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this medication entry?")) return;
    if (!deleteMedicationEntry(id)) return;

    if (editingEntryId === id) resetForm();
  }

  function cancelEntry() {
    if (
      (editingEntryId !== null || isDraftDirty) &&
      !window.confirm("Discard this entry? Your unsaved changes will be lost.")
    ) {
      return;
    }

    resetForm();
    window.requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
    });
  }

  function changeDraft(setValue, value) {
    setValue(value);
    setIsDraftDirty(true);
    setFormError("");
  }

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#666",
  };

  return (
    <div ref={pageTopRef} data-testid="medication-page" style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Medications & Supplements</h1>
      <p style={{ color: "#bbb", marginBottom: "12px" }}>
        Log medications, peptides, supplements, and similar compounds.
      </p>
      <p style={{ color: "#d1d5db", marginBottom: "24px" }}>
        Trace records the information you enter. It does not provide dosing or
        medical advice.
      </p>

      <button
        type="button"
        onClick={onBack}
        style={{ ...backButtonStyle, marginBottom: "24px", marginTop: 0 }}
      >
        Back to Timeline
      </button>

      <form
        ref={formRef}
        onSubmit={saveEntry}
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          maxWidth: "700px",
          padding: "24px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {editingEntryId === null ? "Add Entry" : "Edit Entry"}
        </h2>

        <label style={{ display: "block" }}>
          Name
          <input
            maxLength={120}
            required
            style={formInputStyle}
            value={name}
            onChange={(event) => changeDraft(setName, event.target.value)}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
            marginTop: "16px",
          }}
        >
          <label style={{ display: "block" }}>
            Amount / dose
            <input
              type="number"
              min="0"
              step="any"
              style={formInputStyle}
              value={doseAmount}
              onChange={(event) =>
                changeDraft(setDoseAmount, event.target.value)
              }
            />
          </label>

          <label style={{ display: "block" }}>
            Dose unit
            <select
              style={formInputStyle}
              value={doseUnit}
              onChange={(event) => changeDraft(setDoseUnit, event.target.value)}
            >
              <option value="">Select a unit...</option>
              {DOSE_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {doseUnit === "custom" && (
          <label style={{ display: "block", marginTop: "16px" }}>
            Custom dose unit
            <input
              maxLength={30}
              required
              style={formInputStyle}
              value={customDoseUnit}
              onChange={(event) =>
                changeDraft(setCustomDoseUnit, event.target.value)
              }
            />
          </label>
        )}

        <label style={{ display: "block", marginTop: "16px" }}>
          Method / route
          <select
            style={formInputStyle}
            value={route}
            onChange={(event) => changeDraft(setRoute, event.target.value)}
          >
            <option value="">Select a method or route...</option>
            {ROUTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {route === "other" && (
          <label style={{ display: "block", marginTop: "16px" }}>
            Other method / route
            <input
              maxLength={80}
              required
              style={formInputStyle}
              value={customRoute}
              onChange={(event) =>
                changeDraft(setCustomRoute, event.target.value)
              }
            />
          </label>
        )}

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
            marginTop: "16px",
          }}
        >
          <label style={{ display: "block" }}>
            Date
            <input
              type="date"
              style={formInputStyle}
              value={date}
              onChange={(event) => changeDraft(setDate, event.target.value)}
            />
          </label>

          <label style={{ display: "block" }}>
            Time
            <input
              type="time"
              style={formInputStyle}
              value={time}
              onChange={(event) => changeDraft(setTime, event.target.value)}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: "16px" }}>
          Notes (optional)
          <textarea
            maxLength={2000}
            style={{ ...formInputStyle, height: "110px", resize: "vertical" }}
            value={notes}
            onChange={(event) => changeDraft(setNotes, event.target.value)}
          />
        </label>

        {formError && (
          <p role="alert" style={{ color: "#fca5a5" }}>
            {formError}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button type="submit" style={buttonStyle}>
            {editingEntryId === null ? "Save Entry" : "Save Changes"}
          </button>
          <button type="button" onClick={cancelEntry} style={backButtonStyle}>
            Cancel Entry
          </button>
        </div>
      </form>

      <section
        style={{ marginTop: "30px", maxWidth: "700px", textAlign: "left", width: "100%" }}
      >
        <h2>Logged Entries</h2>
        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No medication entries yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {sortedEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  background: "#1f2937",
                  borderRadius: "12px",
                  overflowWrap: "anywhere",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    alignItems: "baseline",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{entry.name}</h3>
                  <span style={{ color: "#9ca3af" }}>
                    {new Date(entry.occurredAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ lineHeight: 1.6, marginBottom: 0 }}>
                  {entry.dose.amount} {formatDoseUnit(entry.dose)} ·{" "}
                  {formatRoute(entry.route)}
                </p>
                {entry.notes && (
                  <p style={{ color: "#d1d5db", whiteSpace: "pre-wrap" }}>
                    {entry.notes}
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => editEntry(entry)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    style={{
                      background: "#dc2626",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onBack}
        style={{ ...backButtonStyle, marginTop: "24px" }}
      >
        Back to Timeline
      </button>
    </div>
  );
}

export default MedicationPage;
