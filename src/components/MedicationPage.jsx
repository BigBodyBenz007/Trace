import { useEffect, useRef, useState } from "react";
import CompoundSearch from "./CompoundSearch";
import SavedCompoundEditor from "./SavedCompoundEditor";
import MedicationDoseScheduler from "./MedicationDoseScheduler";
import { motionScrollBehavior } from "../services/motionPreference";
import {
  DOSE_UNIT_OPTIONS,
  ROUTE_OPTIONS,
} from "../constants/medicationOptions";
import {
  createMedicationEntry,
  formatDoseUnit,
  formatRoute,
  getMedicationEntryError,
  localDateTimeToIso,
} from "../services/medicationEntry";
import { getCompoundDefinitionError } from "../services/compoundCatalog";
import {
  formatMedicationHistoryDate,
  getMedicationEntryLocalDateKey,
  getVisibleMedicationHistory,
} from "../services/medicationHistory";
import { formatDateOnly } from "../services/dateOnly";
import {
  currentMedicationDoseRevision,
  formatMedicationDoseRepeat,
  medicationDoseDateKey,
  medicationDoseDirectSourceId,
  medicationDoseRestartDraft,
  medicationDoseSchedulePresentation,
  medicationDoseScheduleOccursOnDate,
} from "../services/medicationDoseSchedule";

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

function localTimeLabel(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2]))
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  medicationDoseSchedules = [],
  medicationDoseOccurrences = [],
  saveMedicationDoseSchedule = () => ({ status: "error", message: "The dose schedule could not be saved." }),
  updateMedicationDoseSchedule = () => ({ status: "error", message: "The dose schedule could not be updated." }),
  endMedicationDoseSchedule = () => false,
  deleteMedicationDoseSchedule = () => false,
  onOpenToday = null,
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
  const [scheduleSeed, setScheduleSeed] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [restartingScheduleId, setRestartingScheduleId] = useState(null);
  const [scheduledDoseMessage, setScheduledDoseMessage] = useState("");
  const [scheduleActionError, setScheduleActionError] = useState("");
  const [endedSchedulesExpanded, setEndedSchedulesExpanded] = useState(false);
  const [entrySaveInProgress, setEntrySaveInProgress] = useState(false);
  const pageTopRef = useRef(null);
  const editHeadingRef = useRef(null);
  const compoundSearchRef = useRef(null);
  const historyTopRef = useRef(null);
  const historyEntryRefs = useRef(new Map());
  const historyGroupRefs = useRef(new Map());
  const editOriginRef = useRef(null);
  const selectionOriginRef = useRef(false);
  const scheduleOriginRef = useRef(null);
  const entrySaveInProgressRef = useRef(false);
  const nameRef = useRef(null);
  const doseAmountRef = useRef(null);
  const doseUnitRef = useRef(null);
  const customDoseUnitRef = useRef(null);
  const routeRef = useRef(null);
  const customRouteRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const saveAndScheduleRef = useRef(null);
  const activeSchedulesHeadingRef = useRef(null);
  const endedSchedulesToggleRef = useRef(null);
  const visibleHistoryGroups = getVisibleMedicationHistory(
    medicationEntries,
    historyQuery
  );
  const activeDoseSchedules = medicationDoseSchedules.filter(({ status }) => status === "active");
  const endedDoseSchedules = medicationDoseSchedules.filter(({ status }) => status === "ended");

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
        behavior: motionScrollBehavior(),
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
      target?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "center" });
    });
  }

  function focusFirstInvalidEntry(entryDraft) {
    let target = null;
    if (!/[a-z0-9]/i.test(String(entryDraft.name || "").trim())) target = nameRef.current;
    else if (!(Number(entryDraft.doseAmount) > 0)) target = doseAmountRef.current;
    else if (!entryDraft.doseUnit) target = doseUnitRef.current;
    else if (entryDraft.doseUnit === "custom" && !/[a-z0-9]/i.test(String(entryDraft.customDoseUnit || "").trim())) {
      target = customDoseUnitRef.current;
    } else if (!entryDraft.route) target = routeRef.current;
    else if (entryDraft.route === "other" && !/[a-z0-9]/i.test(String(entryDraft.customRoute || "").trim())) {
      target = customRouteRef.current;
    } else if (!localDateTimeToIso(entryDraft.date, entryDraft.time)) {
      target = localDateTimeToIso(entryDraft.date, "12:00") ? timeRef.current : dateRef.current;
    }
    target?.focus();
  }

  function saveEntry(event, intent = "save") {
    event.preventDefault();
    if (entrySaveInProgressRef.current) return;
    setEntryStatusMessage("");

    const entryDraft = draft();
    const validationError = getMedicationEntryError(entryDraft);
    if (validationError) {
      setFormError(validationError);
      focusFirstInvalidEntry(entryDraft);
      return;
    }

    const scheduleDirectly = editingEntryId === null && intent === "save-and-schedule";

    const existingEntry = medicationEntries.find(
      (entry) => entry.id === editingEntryId
    );
    let resolvedCompoundReference = compoundReference;
    let compoundResult = null;
    entrySaveInProgressRef.current = true;
    setEntrySaveInProgress(true);

    try {
      if (scheduleDirectly) {
        const entry = createMedicationEntry(entryDraft);
        openDoseScheduler({
          name: entry.name,
          dose: { ...entry.dose },
          route: { ...entry.route },
          notes: entry.notes || "",
          source: { type: "direct-entry", id: medicationDoseDirectSourceId() },
          ...(entry.compoundReference
            ? { compoundReference: { ...entry.compoundReference } }
            : {}),
        }, saveAndScheduleRef.current);
        setEntryStatusMessage(
          "Review and confirm the dose schedule below. No dose has been logged yet."
        );
        return;
      }

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
        const saveResult = saveMedicationEntry(entry);
        if (!saveResult) return;
      } else if (!updateMedicationEntry(editingEntryId, entry)) {
        return;
      }

      let statusMessage = "";
      if (compoundResult?.status === "duplicate") {
        statusMessage = `Entry logged. Your existing saved ${compoundResult.compound.name} was kept.`;
      } else if (compoundResult?.status === "error") {
        statusMessage = "Entry logged, but the reusable compound could not be saved.";
      }
      setEntryStatusMessage(statusMessage);

      resetForm();
      setCompoundSearchResetKey((currentKey) => currentKey + 1);
      if (wasEditing) {
        scrollToHistoryContext({
          entryId: editingEntryId,
          dateKey: getMedicationEntryLocalDateKey(entry),
        });
        editOriginRef.current = null;
      } else {
        pageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
      }
      selectionOriginRef.current = false;
    } finally {
      entrySaveInProgressRef.current = false;
      setEntrySaveInProgress(false);
    }
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
          behavior: motionScrollBehavior(),
          block: "start",
        });
      });
    } else {
      setCompoundSearchResetKey((currentKey) => currentKey + 1);
      window.requestAnimationFrame(() => {
        pageTopRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior() });
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

  function openDoseScheduler(seed, trigger = null, scheduleId = null, restartScheduleId = null) {
    scheduleOriginRef.current = trigger || document.activeElement;
    setScheduleSeed(seed);
    setEditingScheduleId(scheduleId);
    setRestartingScheduleId(restartScheduleId);
    setScheduledDoseMessage("");
    setScheduleActionError("");
    setEditingCompound(null);
  }

  function scheduleSavedCompound(compound, trigger) {
    openDoseScheduler({
      name: compound.name,
      dose: { ...compound.defaults.dose },
      route: { ...compound.defaults.route },
      notes: "",
      source: { type: "saved-compound", id: compound.id },
      compoundReference: {
        source: "user-saved",
        sourceId: compound.id,
        modified: false,
      },
    }, trigger);
  }

  function scheduleLoggedEntry(entry, trigger) {
    openDoseScheduler({
      name: entry.name,
      dose: { ...entry.dose },
      route: { ...entry.route },
      notes: entry.notes || "",
      source: { type: "medication-entry", id: entry.id },
      ...(entry.compoundReference
        ? { compoundReference: { ...entry.compoundReference } }
        : {}),
    }, trigger);
  }

  function editDoseSchedule(schedule, trigger) {
    const revision = currentMedicationDoseRevision(schedule);
    if (!revision) return;
    openDoseScheduler({
      ...revision,
      dose: { ...revision.dose },
      route: { ...revision.route },
      source: { ...revision.source },
      repeat: {
        ...revision.repeat,
        ...(revision.repeat.weekdays ? { weekdays: [...revision.repeat.weekdays] } : {}),
      },
      ...(revision.compoundReference
        ? { compoundReference: { ...revision.compoundReference } }
        : {}),
    }, trigger, schedule.id);
  }

  function restoreScheduleFocus() {
    const target = scheduleOriginRef.current;
    window.requestAnimationFrame(() => {
      const focusTarget = target instanceof HTMLElement && target.isConnected
        ? target
        : saveAndScheduleRef.current;
      focusTarget?.focus();
      const bounds = focusTarget?.getBoundingClientRect?.();
      if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
        focusTarget.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "nearest" });
      }
    });
  }

  function restartSourceError(revision) {
    if (revision.source.type === "medication-entry") {
      const entry = medicationEntries.find((candidate) => candidate?.id === revision.source.id);
      if (!entry) return "The linked medication or supplement entry is missing.";
      const local = getLocalDateTimeFromTimestamp(entry.occurredAt);
      const error = getMedicationEntryError({
        name: entry.name,
        doseAmount: entry.dose?.amount,
        doseUnit: entry.dose?.unit,
        customDoseUnit: entry.dose?.customUnit,
        route: entry.route?.code,
        customRoute: entry.route?.customLabel,
        date: local.date,
        time: local.time,
      });
      if (error) return "The linked medication or supplement entry is invalid.";
    }
    if (revision.source.type === "saved-compound") {
      const compound = compounds.find((candidate) => candidate?.id === revision.source.id);
      const error = compound && getCompoundDefinitionError({
        name: compound.name,
        defaultDoseAmount: compound.defaults?.dose?.amount ?? "",
        doseUnit: compound.defaults?.dose?.unit,
        customDoseUnit: compound.defaults?.dose?.customUnit,
        route: compound.defaults?.route?.code,
        customRoute: compound.defaults?.route?.customLabel,
      });
      if (!compound) return "The linked saved compound is missing.";
      if (error) return "The linked saved compound is invalid.";
    }
    return "";
  }

  function restartDoseSchedule(schedule, trigger) {
    const revision = currentMedicationDoseRevision(schedule);
    const sourceError = revision ? restartSourceError(revision) : "The ended schedule is invalid.";
    const seed = sourceError
      ? null
      : medicationDoseRestartDraft(schedule, medicationDoseDateKey());
    if (!seed) {
      setScheduleActionError(
        `${sourceError || "The ended schedule could not be reused."} ` +
        "The ended schedule and dose history were left unchanged. Use Schedule Dose to create a replacement."
      );
      setScheduledDoseMessage("");
      trigger?.focus();
      return;
    }
    setEndedSchedulesExpanded(true);
    openDoseScheduler(seed, trigger, null, schedule.id);
  }

  function focusScheduleManagement(targetRef) {
    window.requestAnimationFrame(() => {
      const target = targetRef.current;
      if (!target) return;
      target.focus();
      const bounds = target.getBoundingClientRect?.();
      if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
        target.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "nearest" });
      }
    });
  }

  function closeDoseScheduler() {
    if (scheduleSeed?.source?.type === "direct-entry") {
      setEntryStatusMessage("Scheduling canceled. No dose was logged.");
    }
    setScheduleSeed(null);
    setEditingScheduleId(null);
    setRestartingScheduleId(null);
    restoreScheduleFocus();
  }

  function doseScheduleSaved(schedule) {
    const revision = currentMedicationDoseRevision(schedule);
    if (revision?.source?.type === "direct-entry") {
      resetForm();
      setCompoundSearchResetKey((currentKey) => currentKey + 1);
    }
    setScheduleSeed(null);
    setEditingScheduleId(null);
    const restarted = Boolean(restartingScheduleId);
    setRestartingScheduleId(null);
    setEntryStatusMessage("");
    setScheduleActionError("");
    setScheduledDoseMessage(
      `${revision?.name || "Dose"} ${restarted ? "schedule restarted" : "scheduled"}.`
    );
    restoreScheduleFocus();
  }

  function endDoseSchedule(schedule) {
    const revision = currentMedicationDoseRevision(schedule);
    if (!window.confirm(`End the dose schedule for “${revision?.name || "this dose"}” today? Past occurrence records and Medication History will be preserved.`)) return;
    if (endMedicationDoseSchedule(schedule.id)) {
      setEndedSchedulesExpanded(false);
      setScheduledDoseMessage(`${revision.name} schedule ended. Future doses were removed; any pending dose today remains available.`);
      focusScheduleManagement(endedSchedulesToggleRef);
    }
  }

  function deleteDoseSchedule(schedule) {
    const revision = currentMedicationDoseRevision(schedule);
    if (!window.confirm(`Delete future occurrences in the dose schedule for “${revision?.name || "this dose"}”? Past occurrence records and Medication History will be preserved.`)) return;
    if (deleteMedicationDoseSchedule(schedule.id)) {
      setScheduledDoseMessage(`${revision.name} schedule deleted. Its untouched Today and upcoming doses were removed.`);
      focusScheduleManagement(activeSchedulesHeadingRef);
    }
  }

  function renderDoseScheduleCard(schedule) {
    const revision = currentMedicationDoseRevision(schedule);
    if (!revision) return null;
    const presentation = medicationDoseSchedulePresentation(
      schedule,
      medicationDoseOccurrences,
      medicationDoseDateKey()
    );
    if (!presentation) return null;
    const statusLabel = schedule.status === "ended"
      ? "Ended schedule"
      : presentation.type === "once"
        ? presentation.statusLabel
        : presentation.primaryStatusLabel;
    return (
      <article className="trace-data-card trace-medication-dose-schedule" key={schedule.id}>
        <div className="trace-medication-dose-schedule__heading">
          <h3>{revision.name}</h3>
          <span aria-label={`Dose status: ${statusLabel}`}>{statusLabel}</span>
        </div>
        <p>{revision.dose.amount} {formatDoseUnit(revision.dose)} · {formatRoute(revision.route)}</p>
        <p>{formatMedicationDoseRepeat(revision.repeat)} · {revision.time} · starts {revision.startDate}{revision.endDate ? ` · ends ${revision.endDate}` : ""}</p>
        {(presentation.type === "recurring" || schedule.status === "ended") && (
          <p>{schedule.status === "ended" ? "Schedule ended" : presentation.lifecycleText}</p>
        )}
        {presentation.nextOccurrence && (
          <p>
            Next dose: {formatDateOnly(presentation.nextOccurrence.scheduledDate)} at {localTimeLabel(presentation.nextOccurrence.time)}
          </p>
        )}
        {revision.notes && <p className="trace-medication-dose-schedule__notes">{revision.notes}</p>}
        <div className="trace-medication-dose-schedule__actions">
          {schedule.status === "active" && (
            <>
              <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit dose schedule for ${revision.name}`} onClick={(event) => editDoseSchedule(schedule, event.currentTarget)}>Edit Schedule</button>
              {revision.repeat.type !== "once" && <button className="trace-action trace-action--secondary" type="button" aria-label={`End dose schedule for ${revision.name}`} onClick={() => endDoseSchedule(schedule)}>End Schedule</button>}
            </>
          )}
          {schedule.status === "ended" && (
            <button className="trace-action trace-action--secondary" type="button" aria-label={`Restart dose schedule for ${revision.name}`} onClick={(event) => restartDoseSchedule(schedule, event.currentTarget)}>Restart Schedule</button>
          )}
          <button className="trace-action trace-action--danger" type="button" aria-label={`Delete dose schedule for ${revision.name}`} onClick={() => deleteDoseSchedule(schedule)}>Delete Schedule</button>
        </div>
      </article>
    );
  }

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#666",
  };

  return (
    <div className="trace-feature-page trace-feature-page--medications" ref={pageTopRef} data-testid="medication-page" style={containerStyle}>
      <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Personal regimen</p>
      <h1 style={{ marginBottom: "10px" }}>Medications & Supplements</h1>
      <p className="trace-feature-page__lede" style={{ color: "#bbb", marginBottom: "12px" }}>
        Log medications, peptides, supplements, and similar compounds.
      </p>
      <p style={{ color: "#d1d5db", marginBottom: "24px" }}>
        Trace records the information you enter. It does not provide dosing or
        medical advice.
      </p>
      </header>

      <button
        className="trace-action trace-action--secondary"
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
            onScheduleCompound={scheduleSavedCompound}
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
          aria-live="polite"
          style={{ color: "#d1d5db", maxWidth: "700px", width: "100%" }}
        >
          {entryStatusMessage}
        </p>
      )}

      {scheduledDoseMessage && (
        <div className="trace-medication-dose-status" role="status" aria-live="polite">
          <span>{scheduledDoseMessage}</span>
          {onOpenToday && medicationDoseSchedules.some((schedule) =>
            schedule.status === "active" && medicationDoseScheduleOccursOnDate(schedule, medicationDoseDateKey())
          ) && (
            <button className="trace-action trace-action--secondary" type="button" onClick={onOpenToday}>
              View Today&apos;s Schedule
            </button>
          )}
        </div>
      )}

      {scheduleActionError && (
        <p className="trace-medication-dose-scheduler__error" role="alert">
          {scheduleActionError}
        </p>
      )}

      {scheduleSeed && (
        <MedicationDoseScheduler
          key={`${editingScheduleId || restartingScheduleId || "new"}:${scheduleSeed.source.id}`}
          seed={scheduleSeed}
          editing={Boolean(editingScheduleId)}
          restarting={Boolean(restartingScheduleId)}
          onSave={(draft, confirmed) => editingScheduleId
            ? updateMedicationDoseSchedule(editingScheduleId, draft, confirmed)
            : saveMedicationDoseSchedule(draft, confirmed)}
          onCancel={closeDoseScheduler}
          onSaved={doseScheduleSaved}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
        />
      )}

      {!scheduleSeed && <form
        className="trace-feature-surface trace-feature-form trace-medication-entry"
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
              ref={nameRef}
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
              ref={doseAmountRef}
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
              ref={doseUnitRef}
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
                ref={customDoseUnitRef}
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
            ref={routeRef}
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
              ref={customRouteRef}
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
                ref={dateRef}
                type="date"
              style={formInputStyle}
              value={date}
              onChange={(event) => changeDraft(setDate, event.target.value)}
            />
          </label>

          <label style={{ display: "block" }}>
            Time
              <input
                ref={timeRef}
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

        <div className="trace-medication-entry__actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button className="trace-action trace-action--primary" type="submit" disabled={entrySaveInProgress} style={buttonStyle}>
            {editingEntryId === null ? "Save Entry" : "Save Changes"}
          </button>
          {editingEntryId === null && (
            <button
              ref={saveAndScheduleRef}
              className="trace-action trace-action--brass"
              type="button"
              disabled={entrySaveInProgress}
              onClick={(event) => saveEntry(event, "save-and-schedule")}
              style={buttonStyle}
            >
              Save &amp; Schedule
            </button>
          )}
          <button className="trace-action trace-action--secondary" type="button" disabled={entrySaveInProgress} onClick={cancelEntry} style={backButtonStyle}>
            Cancel Entry
          </button>
        </div>
      </form>}

      <section className="trace-feature-section trace-medication-dose-schedules">
        <h2 ref={activeSchedulesHeadingRef} tabIndex={-1}>Scheduled Doses</h2>
        {activeDoseSchedules.length === 0 ? (
          <p style={{ color: "#bbb" }}>No active dose schedules.</p>
        ) : (
          <div className="trace-medication-dose-schedules__list">
            {activeDoseSchedules.map((schedule) => {
              const revision = currentMedicationDoseRevision(schedule);
              if (!revision) return null;
              const presentation = medicationDoseSchedulePresentation(
                schedule,
                medicationDoseOccurrences,
                medicationDoseDateKey()
              );
              if (!presentation) return null;
              return (
                <article className="trace-data-card trace-medication-dose-schedule" key={schedule.id}>
                  <div className="trace-medication-dose-schedule__heading">
                    <h3>{revision.name}</h3>
                    <span aria-label={`Dose status: ${presentation.type === "once" ? presentation.statusLabel : presentation.primaryStatusLabel}`}>
                      {presentation.type === "once" ? presentation.statusLabel : presentation.primaryStatusLabel}
                    </span>
                  </div>
                  <p>{revision.dose.amount} {formatDoseUnit(revision.dose)} · {formatRoute(revision.route)}</p>
                  <p>{formatMedicationDoseRepeat(revision.repeat)} · {revision.time} · starts {revision.startDate}{revision.endDate ? ` · ends ${revision.endDate}` : ""}</p>
                  {presentation.type === "recurring" && <p>{presentation.lifecycleText}</p>}
                  {presentation.nextOccurrence && (
                    <p>
                      Next dose: {formatDateOnly(presentation.nextOccurrence.scheduledDate)} at {localTimeLabel(presentation.nextOccurrence.time)}
                    </p>
                  )}
                  {revision.notes && <p className="trace-medication-dose-schedule__notes">{revision.notes}</p>}
                  {schedule.status === "active" && (
                    <div className="trace-medication-dose-schedule__actions">
                      <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit dose schedule for ${revision.name}`} onClick={(event) => editDoseSchedule(schedule, event.currentTarget)}>Edit Schedule</button>
                      {revision.repeat.type !== "once" && <button className="trace-action trace-action--secondary" type="button" aria-label={`End dose schedule for ${revision.name}`} onClick={() => endDoseSchedule(schedule)}>End Schedule</button>}
                      <button className="trace-action trace-action--danger" type="button" aria-label={`Delete dose schedule for ${revision.name}`} onClick={() => deleteDoseSchedule(schedule)}>Delete Schedule</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {endedDoseSchedules.length > 0 && (
          <section className="trace-medication-dose-schedules__ended" aria-labelledby="trace-ended-dose-schedules-toggle">
            <button
              id="trace-ended-dose-schedules-toggle"
              ref={endedSchedulesToggleRef}
              className="trace-medication-dose-schedules__disclosure"
              type="button"
              aria-expanded={endedSchedulesExpanded}
              aria-controls="trace-ended-dose-schedules"
              onClick={() => setEndedSchedulesExpanded((expanded) => !expanded)}
            >
              Ended schedules ({endedDoseSchedules.length})
            </button>
            {endedSchedulesExpanded && (
              <div id="trace-ended-dose-schedules" className="trace-medication-dose-schedules__list">
                {endedDoseSchedules.map(renderDoseScheduleCard)}
              </div>
            )}
          </section>
        )}
      </section>

      <section
        className="trace-feature-section trace-feature-history trace-medication-history"
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
                          className="trace-data-card"
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  <button
                    className="trace-action trace-action--secondary"
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
                    className="trace-action trace-action--danger"
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
                  <button
                    className="trace-action trace-action--brass"
                    type="button"
                    aria-label={`Schedule dose from logged entry ${entry.name}`}
                    onClick={(event) => scheduleLoggedEntry(entry, event.currentTarget)}
                  >
                    Schedule Dose
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
        className="trace-action trace-action--secondary"
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
