import { useEffect, useRef, useState } from "react";
import CompoundSearch from "./CompoundSearch";
import SavedCompoundEditor from "./SavedCompoundEditor";
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
import { getCompoundDefinitionError } from "../services/compoundCatalog";
import {
  formatMedicationHistoryDate,
  getMedicationEntryLocalDateKey,
  getVisibleMedicationHistory,
} from "../services/medicationHistory";

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
  compounds = [],
  saveMedicationEntry,
  saveCompoundDefinition = () => ({
    status: "error",
    compound: null,
    matchesDefinition: false,
  }),
  updateCompoundDefinition = () => ({
    status: "error",
    message: "The saved compound could not be updated.",
  }),
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
  const [compoundReference, setCompoundReference] = useState(null);
  const [saveAsReusableCompound, setSaveAsReusableCompound] = useState(false);
  const [defaultDoseAmount, setDefaultDoseAmount] = useState("");
  const [compoundSearchResetKey, setCompoundSearchResetKey] = useState(0);
  const [entryStatusMessage, setEntryStatusMessage] = useState("");
  const [editingCompound, setEditingCompound] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [formNavigationRequest, setFormNavigationRequest] = useState(0);
  const pageTopRef = useRef(null);
  const editHeadingRef = useRef(null);
  const compoundSearchRef = useRef(null);
  const historyTopRef = useRef(null);
  const historyEntryRefs = useRef(new Map());
  const historyGroupRefs = useRef(new Map());
  const editOriginRef = useRef(null);
  const selectionOriginRef = useRef(false);
  const visibleHistoryGroups = getVisibleMedicationHistory(
    medicationEntries,
    historyQuery
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

  useEffect(() => {
    if (formNavigationRequest === 0) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      editHeadingRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [formNavigationRequest]);

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
      compoundReference,
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
    setCompoundReference(null);
    setSaveAsReusableCompound(false);
    setDefaultDoseAmount("");
  }

  function scrollToHistoryContext({ entryId, dateKey } = {}) {
    window.requestAnimationFrame(() => {
      const target =
        historyEntryRefs.current.get(entryId) ||
        historyGroupRefs.current.get(dateKey) ||
        historyTopRef.current;
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
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
    let resolvedCompoundReference = compoundReference;
    let compoundResult = null;

    if (!compoundReference && saveAsReusableCompound) {
      const compoundDraft = {
        name,
        defaultDoseAmount,
        doseUnit,
        customDoseUnit,
        route,
        customRoute,
      };
      const compoundError = getCompoundDefinitionError(compoundDraft);
      if (compoundError) {
        setFormError(compoundError);
        return;
      }

      compoundResult = saveCompoundDefinition(compoundDraft);

      if (
        compoundResult?.compound &&
        (compoundResult.status === "added" || compoundResult.matchesDefinition)
      ) {
        resolvedCompoundReference = {
          source: "user-saved",
          sourceId: compoundResult.compound.id,
          modified: false,
        };
      }
    }

    const entry = createMedicationEntry(
      { ...entryDraft, compoundReference: resolvedCompoundReference },
      existingEntry
    );

    const wasEditing = editingEntryId !== null;
    if (!wasEditing) {
      if (!saveMedicationEntry(entry)) return;
    } else if (!updateMedicationEntry(editingEntryId, entry)) {
      return;
    }

    if (compoundResult?.status === "duplicate") {
      setEntryStatusMessage(
        `Entry logged. Your existing saved ${compoundResult.compound.name} was kept.`
      );
    } else if (compoundResult?.status === "error") {
      setEntryStatusMessage(
        "Entry logged, but the reusable compound could not be saved."
      );
    } else {
      setEntryStatusMessage("");
    }

    resetForm();
    setCompoundSearchResetKey((currentKey) => currentKey + 1);
    if (wasEditing) {
      scrollToHistoryContext({
        entryId: editingEntryId,
        dateKey: getMedicationEntryLocalDateKey(entry),
      });
      editOriginRef.current = null;
    } else {
      pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
    selectionOriginRef.current = false;
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
    setCompoundReference(
      entry.compoundReference ? { ...entry.compoundReference } : null
    );
    setSaveAsReusableCompound(false);
    setDefaultDoseAmount("");
    editOriginRef.current = {
      entryId: entry.id,
      dateKey: getMedicationEntryLocalDateKey(entry),
    };
    selectionOriginRef.current = false;
    setFormNavigationRequest((request) => request + 1);
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this medication entry?")) return;
    const entry = medicationEntries.find((item) => item.id === id);
    if (!deleteMedicationEntry(id)) return;

    if (editingEntryId === id) resetForm();
    scrollToHistoryContext({ dateKey: getMedicationEntryLocalDateKey(entry) });
  }

  function cancelEntry() {
    if (
      (editingEntryId !== null || isDraftDirty) &&
      !window.confirm("Discard this entry? Your unsaved changes will be lost.")
    ) {
      return;
    }

    const origin = editOriginRef.current;
    const returnToSearch = selectionOriginRef.current;
    resetForm();
    if (origin) {
      setCompoundSearchResetKey((currentKey) => currentKey + 1);
      scrollToHistoryContext(origin);
      editOriginRef.current = null;
      selectionOriginRef.current = false;
    } else if (returnToSearch) {
      selectionOriginRef.current = false;
      window.requestAnimationFrame(() => {
        compoundSearchRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "start",
        });
      });
    } else {
      setCompoundSearchResetKey((currentKey) => currentKey + 1);
      window.requestAnimationFrame(() => {
        pageTopRef.current?.scrollIntoView?.({ behavior: "smooth" });
      });
    }
  }

  function markCompoundModified(changeType) {
    setCompoundReference((currentReference) =>
      currentReference &&
      !(
        currentReference.source === "trace-catalog" &&
        changeType === "logging-default"
      )
        ? { ...currentReference, modified: true }
        : currentReference
    );
  }

  function changeDraft(setValue, value, compoundChangeType = null) {
    setValue(value);
    setIsDraftDirty(true);
    setFormError("");
    if (compoundChangeType) markCompoundModified(compoundChangeType);
  }

  function selectCompound(compound) {
    const defaultDose = compound.defaults.dose;

    setName(compound.name);
    setDoseAmount(
      defaultDose.amount === undefined ? "" : String(defaultDose.amount)
    );
    setDoseUnit(defaultDose.unit);
    setCustomDoseUnit(defaultDose.customUnit || "");
    setRoute(compound.defaults.route.code);
    setCustomRoute(compound.defaults.route.customLabel || "");
    setCompoundReference({
      source: "user-saved",
      sourceId: compound.id,
      modified: false,
    });
    setSaveAsReusableCompound(false);
    setDefaultDoseAmount("");
    setIsDraftDirty(true);
    setFormError("");
    setEntryStatusMessage("");
    setEditingCompound(null);
    selectionOriginRef.current = true;
    setFormNavigationRequest((request) => request + 1);
  }

  function selectBuiltInCompound(compound) {
    setName(compound.name);
    setDoseAmount("");
    setDoseUnit("");
    setCustomDoseUnit("");
    setRoute("");
    setCustomRoute("");
    setCompoundReference({
      source: "trace-catalog",
      sourceId: compound.id,
      category: compound.category,
      modified: false,
    });
    setSaveAsReusableCompound(false);
    setDefaultDoseAmount("");
    setIsDraftDirty(true);
    setFormError("");
    setEntryStatusMessage("");
    setEditingCompound(null);
    selectionOriginRef.current = true;
    setFormNavigationRequest((request) => request + 1);
  }

  function useCustomCompound(customName) {
    setName(customName);
    setDoseAmount("");
    setDoseUnit("");
    setCustomDoseUnit("");
    setRoute("");
    setCustomRoute("");
    setCompoundReference(null);
    setSaveAsReusableCompound(false);
    setDefaultDoseAmount("");
    setIsDraftDirty(true);
    setFormError("");
    setEntryStatusMessage("");
    setEditingCompound(null);
    selectionOriginRef.current = true;
    setFormNavigationRequest((request) => request + 1);
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

      {editingEntryId === null && (
        <div
          ref={compoundSearchRef}
          data-testid="compound-search-context"
          style={{
            display: "flex",
            justifyContent: "center",
            scrollMarginTop: "24px",
            width: "100%",
          }}
        >
          <CompoundSearch
            compounds={compounds}
            onSelectCompound={selectCompound}
            onSelectBuiltInCompound={selectBuiltInCompound}
            onUseCustomCompound={useCustomCompound}
            onEditCompound={setEditingCompound}
            inputStyle={inputStyle}
            resetKey={compoundSearchResetKey}
          />
        </div>
      )}

      {editingEntryId === null && editingCompound && (
        <SavedCompoundEditor
          key={editingCompound.id}
          compound={editingCompound}
          onSave={updateCompoundDefinition}
          onCancel={() => setEditingCompound(null)}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
        />
      )}

      {entryStatusMessage && (
        <p
          role="status"
          style={{ color: "#d1d5db", maxWidth: "700px", width: "100%" }}
        >
          {entryStatusMessage}
        </p>
      )}

      <form
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
        <h2
          ref={editHeadingRef}
          style={{ marginTop: 0, scrollMarginTop: "24px" }}
        >
          {editingEntryId === null ? "Add Entry" : "Edit Entry"}
        </h2>

        <label style={{ display: "block" }}>
          Name
          <input
            maxLength={120}
            required
            style={formInputStyle}
            value={name}
            onChange={(event) =>
              changeDraft(setName, event.target.value, "identity")
            }
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
              onChange={(event) =>
                changeDraft(setDoseUnit, event.target.value, "logging-default")
              }
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
                changeDraft(
                  setCustomDoseUnit,
                  event.target.value,
                  "logging-default"
                )
              }
            />
          </label>
        )}

        <label style={{ display: "block", marginTop: "16px" }}>
          Method / route
          <select
            style={formInputStyle}
            value={route}
            onChange={(event) =>
              changeDraft(setRoute, event.target.value, "logging-default")
            }
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
                changeDraft(
                  setCustomRoute,
                  event.target.value,
                  "logging-default"
                )
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

        {!compoundReference && (
          <fieldset
            style={{
              border: "1px solid #4b5563",
              borderRadius: "12px",
              marginTop: "16px",
              padding: "16px",
            }}
          >
            <legend>Reusable compound</legend>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={saveAsReusableCompound}
                onChange={(event) => {
                  setSaveAsReusableCompound(event.target.checked);
                  setDefaultDoseAmount("");
                  setIsDraftDirty(true);
                  setFormError("");
                }}
              />{" "}
              Save as reusable compound
            </label>

            {saveAsReusableCompound && (
              <label style={{ display: "block", marginTop: "12px" }}>
                Default dose amount (optional)
                <input
                  type="number"
                  min="0"
                  step="any"
                  style={formInputStyle}
                  value={defaultDoseAmount}
                  onChange={(event) => {
                    setDefaultDoseAmount(event.target.value);
                    setIsDraftDirty(true);
                    setFormError("");
                  }}
                />
              </label>
            )}
          </fieldset>
        )}

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
        ref={historyTopRef}
        data-testid="medication-history"
        style={{ marginTop: "30px", maxWidth: "700px", textAlign: "left", width: "100%" }}
      >
        <h2>Logged Entries</h2>
        {medicationEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No medication entries yet.</p>
        ) : (
          <>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block" }}>
                Search logged entries
                <input
                  type="search"
                  placeholder="Search history by name..."
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  style={formInputStyle}
                />
              </label>
              {historyQuery && (
                <button
                  type="button"
                  onClick={() => setHistoryQuery("")}
                  style={{ ...backButtonStyle, marginTop: "10px" }}
                >
                  Clear History Search
                </button>
              )}
            </div>
            {visibleHistoryGroups.length === 0 ? (
              <p role="status" style={{ color: "#bbb" }}>
                No matching logged entries.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "22px" }}>
                {visibleHistoryGroups.map((group) => (
                  <section
                    key={group.dateKey}
                    ref={(element) => {
                      if (element) {
                        historyGroupRefs.current.set(group.dateKey, element);
                      } else {
                        historyGroupRefs.current.delete(group.dateKey);
                      }
                    }}
                    data-testid={`medication-history-group-${group.dateKey}`}
                  >
                    <h3 style={{ color: "#d1d5db", marginTop: 0 }}>
                      {formatMedicationHistoryDate(group.dateKey)}
                    </h3>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {group.entries.map((entry) => (
                        <article
                          key={entry.id}
                          ref={(element) => {
                            if (element) {
                              historyEntryRefs.current.set(entry.id, element);
                            } else {
                              historyEntryRefs.current.delete(entry.id);
                            }
                          }}
                          data-entry-id={entry.id}
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
                  <h4 style={{ fontSize: "1.17em", margin: 0 }}>{entry.name}</h4>
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
                  </section>
                ))}
              </div>
            )}
          </>
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
