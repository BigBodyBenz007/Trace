import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseSearch from "./ExerciseSearch";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { getExerciseDefinitionError } from "../services/exerciseCatalog";
import { formatDateOnly } from "../services/dateOnly";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";
import {
  getPlannedWorkoutError,
  isPlannedWorkoutSkippedOnDate,
} from "../services/plannedWorkout";
import {
  formatProtocolSchedule,
  protocolItemsScheduledForDate,
} from "../services/protocol";
import { createWorkoutItemId } from "../services/workoutEntry";
import {
  DAILY_ACTION_SKIP_REASONS,
  DAILY_ACTION_TYPES,
  dailyActionsForDate,
} from "../services/dailyAction";
import { findProtocolOccurrence } from "../services/protocolOccurrence";

export function localScheduledDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function emptyPlannedExercise() {
  return {
    id: createWorkoutItemId("planned-exercise"),
    name: "",
    notes: "",
    targetSets: [],
  };
}

function emptyTargetSet(inheritedLoad = null) {
  return {
    id: createWorkoutItemId("planned-set"),
    setType: "working",
    reps: "",
    load: inheritedLoad ? { ...inheritedLoad } : null,
    notes: "",
  };
}

function copyPlanForEditing(plan) {
  return {
    ...plan,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      exerciseReference: exercise.exerciseReference
        ? { ...exercise.exerciseReference }
        : undefined,
      targetSets: exercise.targetSets.map((target) => ({
        ...target,
        load: target.load ? { ...target.load } : null,
      })),
    })),
  };
}

function emptyActionDraft(date) {
  return {
    title: "",
    actionType: "meeting",
    date,
    timingMode: "none",
    time: "",
    windowStart: "",
    windowEnd: "",
    durationMinutes: "",
    location: "",
    notes: "",
    recurrence: null,
  };
}

function actionDraftFromRecord(action) {
  return {
    title: action.title,
    actionType: action.actionType,
    date: action.date,
    timingMode: action.time ? "time" : action.timeWindow ? "window" : "none",
    time: action.time || "",
    windowStart: action.timeWindow?.start || "",
    windowEnd: action.timeWindow?.end || "",
    durationMinutes: action.durationMinutes == null ? "" : String(action.durationMinutes),
    location: action.location || "",
    notes: action.notes || "",
    recurrence: action.recurrence ? { ...action.recurrence } : null,
  };
}

function actionRecordDraft(draft) {
  return {
    title: draft.title,
    actionType: draft.actionType,
    date: draft.date,
    time: draft.timingMode === "time" ? draft.time : null,
    timeWindow: draft.timingMode === "window"
      ? { start: draft.windowStart, end: draft.windowEnd }
      : null,
    durationMinutes: draft.durationMinutes,
    location: draft.location,
    notes: draft.notes,
    recurrence: draft.recurrence,
  };
}

function dailyActionTypeLabel(type) {
  return DAILY_ACTION_TYPES.find(({ value }) => value === type)?.label || "Other";
}

function localTimeLabel(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2]))
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dailyActionTimeLabel(action) {
  if (action.time) return localTimeLabel(action.time);
  if (action.timeWindow) {
    return `${localTimeLabel(action.timeWindow.start)}–${localTimeLabel(action.timeWindow.end)}`;
  }
  return "";
}

function plannedSetPreview(target) {
  const setType = target.setType === "warm-up" ? "Warm-up" : "Working";
  const reps = target.reps === undefined ? "reps open" : target.reps;
  if (!target.load) return `${setType} · No weight target × ${reps}`;
  if (target.load.mode === "bodyweight") return `${setType} · Bodyweight × ${reps}`;
  const weight = target.load.amount === undefined
    ? "Weight open"
    : `${target.load.amount} ${target.load.unit}`;
  return `${setType} · ${weight} × ${reps}`;
}

function plannedWorkoutVolume(exercises) {
  const sets = exercises.flatMap((exercise) => exercise.targetSets || []);
  const warmUp = sets.filter(({ setType }) => setType === "warm-up").length;
  return {
    total: sets.length,
    warmUp,
    working: sets.length - warmUp,
  };
}

function scheduleTimeLabel(item) {
  const time = item?.schedule?.time || item?.time;
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function protocolActionSummary(item) {
  return [
    item.compound.name,
    `${item.dose.amount} ${formatDoseUnit(item.dose)}`,
    scheduleTimeLabel(item),
  ].filter(Boolean).join(" · ");
}

function scheduleStartTime(scheduleItem) {
  if (scheduleItem.type === "daily-action") {
    return scheduleItem.action.time || scheduleItem.action.timeWindow?.start || null;
  }
  if (scheduleItem.type === "protocol") {
    return scheduleItem.item?.schedule?.time || scheduleItem.item?.time || null;
  }
  return scheduleItem.plan?.scheduledTime || scheduleItem.plan?.time || null;
}

export function sortTodayScheduleItems(items) {
  return items
    .map((item, index) => ({ ...item, sourceOrder: item.sourceOrder ?? index }))
    .sort((first, second) => {
      const firstTime = scheduleStartTime(first);
      const secondTime = scheduleStartTime(second);
      if (firstTime && !secondTime) return -1;
      if (!firstTime && secondTime) return 1;
      if (firstTime && secondTime && firstTime !== secondTime) {
        return firstTime.localeCompare(secondTime);
      }
      return first.sourceOrder - second.sourceOrder;
    });
}

const STATUS_LABELS = {
  planned: "Planned",
  scheduled: "Scheduled",
  started: "Started",
  completed: "Completed",
  skipped: "Skipped",
};

function TodayStatus({ status }) {
  return (
    <span className={`trace-today-item-status trace-today-item-status--${status}`} data-today-status={status}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function skipProvenanceLabel(record, completed = false) {
  if (!record?.skipReason && !record?.customSkipReason) return "";
  const reason = record.skipReason === "Other"
    ? record.customSkipReason || "Other"
    : record.skipReason;
  return `${completed ? "Previously skipped" : "Reason"}: ${reason}`;
}

function SkipReasonDialog({
  ariaLabel,
  prompt,
  reason,
  customReason,
  setReason,
  setCustomReason,
  onSave,
  onSkipWithoutReason,
  onCancel,
  fieldStyle,
  buttonStyle,
}) {
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    reasonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      ) || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div className="trace-skip-overlay">
      <section
        ref={dialogRef}
        className="trace-feature-surface trace-skip-reason"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <h2>Optional reason</h2>
        <p>{prompt}</p>
        <label>
          Skip reason
          <select ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} style={fieldStyle}>
            <option value="">No reason</option>
            {DAILY_ACTION_SKIP_REASONS.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            <option value="Other">Other / custom reason</option>
          </select>
        </label>
        {reason === "Other" && <label>Custom reason<input value={customReason} onChange={(event) => setCustomReason(event.target.value)} style={fieldStyle} /></label>}
        <div className="trace-skip-reason__actions">
          <button className="trace-action trace-action--primary" type="button" onClick={onSave} style={buttonStyle}>Save skip</button>
          <button className="trace-action trace-action--secondary" type="button" onClick={onSkipWithoutReason} style={buttonStyle}>Skip without reason</button>
          <button className="trace-action trace-action--secondary" type="button" onClick={onCancel} style={buttonStyle}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function TodayPage({
  onBack,
  plannedWorkouts = [],
  protocols = [],
  protocolOccurrences = [],
  workoutEntries = [],
  activeWorkoutDraft = null,
  dailyActions = [],
  savedExercises = [],
  saveExerciseDefinitions = () => [],
  createPlannedWorkout,
  updatePlannedWorkout,
  deletePlannedWorkout,
  restorePlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be restored.",
  }),
  skipPlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be skipped.",
  }),
  startPlannedWorkout = () => ({
    status: "error",
    message: "The planned workout could not be started.",
  }),
  openCompletedWorkout = () => false,
  createDailyAction = () => ({ status: "error", message: "The daily action could not be saved." }),
  updateDailyAction = () => ({ status: "error", message: "The daily action could not be updated." }),
  deleteDailyAction = () => false,
  completeDailyAction = () => ({ status: "error", message: "The daily action could not be completed." }),
  skipDailyAction = () => ({ status: "error", message: "The daily action could not be skipped." }),
  completeProtocolOccurrence = () => ({ status: "error", message: "The protocol occurrence could not be completed." }),
  skipProtocolOccurrence = () => ({ status: "error", message: "The protocol occurrence could not be skipped." }),
  showToast = () => {},
  currentDate = new Date(),
  buttonStyle = {},
  inputStyle = {},
  containerStyle = {},
}) {
  const todayKey = localScheduledDate(currentDate);
  const todaysPlans = useMemo(
    () => plannedWorkouts.filter(({ scheduledDate }) => scheduledDate === todayKey),
    [plannedWorkouts, todayKey]
  );
  const todaysProtocolItems = useMemo(
    () => protocolItemsScheduledForDate(protocols, currentDate),
    [protocols, currentDate]
  );
  const todaysDailyActions = useMemo(
    () => dailyActionsForDate(dailyActions, todayKey),
    [dailyActions, todayKey]
  );
  const completedWorkoutByPlanId = useMemo(() => {
    const completed = new Map();
    workoutEntries.forEach((entry) => {
      if (entry.plannedWorkoutId && !completed.has(entry.plannedWorkoutId)) {
        completed.set(entry.plannedWorkoutId, entry);
      }
    });
    return completed;
  }, [workoutEntries]);
  const scheduleItems = useMemo(() => sortTodayScheduleItems([
    ...todaysPlans.map((plan, index) => ({
      id: plan.id,
      type: "workout",
      sourceType: "planned-workout",
      sourceId: plan.id,
      sourceOrder: index,
      title: plan.title,
      plan,
      status: completedWorkoutByPlanId.has(plan.id)
        ? "completed"
        : activeWorkoutDraft?.plannedWorkoutId === plan.id
          ? "started"
          : isPlannedWorkoutSkippedOnDate(plan, todayKey) ? "skipped" : "planned",
    })),
    ...todaysProtocolItems.map(({ protocol, item }, index) => {
      const occurrence = findProtocolOccurrence(protocolOccurrences, protocol.id, item.id, todayKey);
      return {
      id: `${protocol.id}:${item.id}`,
      type: "protocol",
      sourceType: "protocol-item",
      sourceId: item.id,
      sourceOrder: todaysPlans.length + index,
      title: protocolActionSummary(item),
      subtitle: `${protocol.name} · ${formatRoute(item.route)}`,
      protocol,
      item,
      occurrence,
      status: occurrence?.status || "scheduled",
    };
    }),
    ...todaysDailyActions.map((action, index) => ({
      id: action.id,
      type: "daily-action",
      sourceType: "daily-action",
      sourceId: action.id,
      sourceOrder: todaysPlans.length + todaysProtocolItems.length + index,
      title: action.title,
      action,
      status: action.status,
    })),
  ]), [todaysPlans, todaysProtocolItems, todaysDailyActions, completedWorkoutByPlanId, activeWorkoutDraft, protocolOccurrences, todayKey]);
  const remainingScheduleItems = useMemo(
    () => scheduleItems.filter(({ status }) => status !== "completed"),
    [scheduleItems]
  );
  const completedScheduleItems = useMemo(
    () => scheduleItems.filter(({ status }) => status === "completed"),
    [scheduleItems]
  );
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeSearchExerciseId, setActiveSearchExerciseId] = useState(null);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [draftConflict, setDraftConflict] = useState(null);
  const [previewPlanId, setPreviewPlanId] = useState(null);
  const [pendingSkipPlan, setPendingSkipPlan] = useState(null);
  const [skipReason, setSkipReason] = useState("");
  const [customSkipReason, setCustomSkipReason] = useState("");
  const [actionDraft, setActionDraft] = useState(null);
  const [actionEditingId, setActionEditingId] = useState(null);
  const [focusedScheduleItem, setFocusedScheduleItem] = useState(null);
  const [pendingActionSkip, setPendingActionSkip] = useState(null);
  const [actionSkipReason, setActionSkipReason] = useState("");
  const [actionCustomSkipReason, setActionCustomSkipReason] = useState("");
  const [pendingProtocolSkip, setPendingProtocolSkip] = useState(null);
  const [protocolSkipReason, setProtocolSkipReason] = useState("");
  const [protocolCustomSkipReason, setProtocolCustomSkipReason] = useState("");
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const initialDraftRef = useRef(null);
  const initialActionDraftRef = useRef(null);
  const conflictResumeButtonRef = useRef(null);
  const startButtonRefs = useRef(new Map());
  const restoreStartFocusPlanIdRef = useRef(null);
  const previewPlan = plannedWorkouts.find(({ id }) => id === previewPlanId) || null;
  const activePlannedWorkoutId = activeWorkoutDraft?.plannedWorkoutId || null;
  const focusedItem = focusedScheduleItem
    ? scheduleItems.find(({ type, id }) => type === focusedScheduleItem.type && id === focusedScheduleItem.id) || null
    : null;

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (draftConflict) {
      conflictResumeButtonRef.current?.focus();
      return;
    }
    const planId = restoreStartFocusPlanIdRef.current;
    if (!planId) return;
    restoreStartFocusPlanIdRef.current = null;
    startButtonRefs.current.get(planId)?.focus();
  }, [draftConflict]);

  function openCreate() {
    const nextDraft = {
      scheduledDate: todayKey,
      title: "",
      notes: "",
      exercises: [emptyPlannedExercise()],
    };
    initialDraftRef.current = JSON.stringify(nextDraft);
    setDraft(nextDraft);
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
    setDraftConflict(null);
    setPreviewPlanId(null);
    setFocusedScheduleItem(null);
  }

  function openEdit(plan) {
    const nextDraft = copyPlanForEditing(plan);
    initialDraftRef.current = JSON.stringify(nextDraft);
    setDraft(nextDraft);
    setEditingId(plan.id);
    setActiveSearchExerciseId(null);
    setFormError("");
    setDraftConflict(null);
    setPreviewPlanId(null);
  }

  function closeEditor() {
    setDraft(null);
    setEditingId(null);
    setActiveSearchExerciseId(null);
    setFormError("");
    initialDraftRef.current = null;
  }

  function openPreview(plan) {
    setFocusedScheduleItem(null);
    setPreviewPlanId(plan.id);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
    setFormError("");
  }

  function closePreview() {
    setPreviewPlanId(null);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
  }

  function openActionCreate() {
    const nextDraft = emptyActionDraft(todayKey);
    initialActionDraftRef.current = JSON.stringify(nextDraft);
    setActionDraft(nextDraft);
    setActionEditingId(null);
    setFocusedScheduleItem(null);
    setFormError("");
  }

  function openActionEdit(action) {
    const nextDraft = actionDraftFromRecord(action);
    initialActionDraftRef.current = JSON.stringify(nextDraft);
    setActionDraft(nextDraft);
    setActionEditingId(action.id);
    setFocusedScheduleItem({ type: "daily-action", id: action.id });
    setFormError("");
  }

  function closeActionEditor() {
    setActionDraft(null);
    setActionEditingId(null);
    initialActionDraftRef.current = null;
    setFormError("");
  }

  function cancelActionEditor() {
    const hasUnsavedChanges = actionDraft
      && JSON.stringify(actionDraft) !== initialActionDraftRef.current;
    if (
      hasUnsavedChanges
      && !window.confirm("Cancel this daily action? Your unsaved changes will be lost.")
    ) return;
    closeActionEditor();
  }

  function returnToTodaySchedule() {
    if (
      draft
      && JSON.stringify(draft) !== initialDraftRef.current
      && !window.confirm("Cancel planning this workout? Your unsaved changes will be lost.")
    ) return;
    if (
      actionDraft
      && JSON.stringify(actionDraft) !== initialActionDraftRef.current
      && !window.confirm("Cancel this daily action? Your unsaved changes will be lost.")
    ) return;
    if (draft) closeEditor();
    if (actionDraft) closeActionEditor();
    closePreview();
    closeFocusedItem();
  }

  function saveAction(event) {
    event.preventDefault();
    const recordDraft = actionRecordDraft(actionDraft);
    const result = actionEditingId
      ? updateDailyAction(actionEditingId, recordDraft)
      : createDailyAction(recordDraft);
    if (result?.status !== "saved") {
      setFormError(result?.message || "The daily action could not be saved.");
      return;
    }
    const wasEditing = Boolean(actionEditingId);
    const savedId = result.dailyAction.id;
    closeActionEditor();
    setFocusedScheduleItem(wasEditing ? { type: "daily-action", id: savedId } : null);
    showToast(wasEditing ? "Daily action updated." : "Added to Today.");
  }

  function focusProtocol(scheduleItem) {
    setFocusedScheduleItem({ type: "protocol", id: scheduleItem.id });
    setFormError("");
  }

  function focusDailyAction(scheduleItem) {
    setFocusedScheduleItem({ type: "daily-action", id: scheduleItem.id });
    setFormError("");
  }

  function closeFocusedItem() {
    setFocusedScheduleItem(null);
    setPendingActionSkip(null);
    setActionSkipReason("");
    setActionCustomSkipReason("");
    setPendingProtocolSkip(null);
    setProtocolSkipReason("");
    setProtocolCustomSkipReason("");
    setFormError("");
  }

  function markProtocolComplete(scheduleItem) {
    const result = completeProtocolOccurrence(
      scheduleItem.protocol.id,
      scheduleItem.item.id,
      todayKey
    );
    if (result?.status !== "saved") {
      setFormError(result?.message || "The protocol occurrence could not be completed.");
      return;
    }
    setFormError("");
    showToast(`${scheduleItem.item.compound.name} completed.`);
  }

  function requestProtocolSkip(scheduleItem) {
    setPendingSkipPlan(null);
    setPendingActionSkip(null);
    setPendingProtocolSkip(scheduleItem);
    setProtocolSkipReason("");
    setProtocolCustomSkipReason("");
  }

  function confirmProtocolSkip(withoutReason = false) {
    if (!pendingProtocolSkip) return;
    const reason = withoutReason ? "" : protocolSkipReason;
    const customReason = reason === "Other" ? protocolCustomSkipReason : "";
    const result = skipProtocolOccurrence(
      pendingProtocolSkip.protocol.id,
      pendingProtocolSkip.item.id,
      todayKey,
      reason,
      customReason
    );
    if (result?.status !== "saved") {
      setFormError(result?.message || "The protocol occurrence could not be skipped.");
      return;
    }
    setPendingProtocolSkip(null);
    setProtocolSkipReason("");
    setProtocolCustomSkipReason("");
    setFormError("");
    showToast(`${pendingProtocolSkip.item.compound.name} skipped.`);
  }

  function markActionComplete(action) {
    const result = completeDailyAction(action.id);
    if (result?.status !== "saved") {
      setFormError(result?.message || "The daily action could not be completed.");
      return;
    }
    setFormError("");
    showToast(`${action.title} completed.`);
  }

  function requestActionSkip(action) {
    setPendingSkipPlan(null);
    setPendingProtocolSkip(null);
    setPendingActionSkip(action);
    setActionSkipReason("");
    setActionCustomSkipReason("");
  }

  function confirmActionSkip(withoutReason = false) {
    if (!pendingActionSkip) return;
    const reason = withoutReason ? "" : actionSkipReason;
    const customReason = reason === "Other" ? actionCustomSkipReason : "";
    const result = skipDailyAction(pendingActionSkip.id, reason, customReason);
    if (result?.status !== "saved") {
      setFormError(result?.message || "The daily action could not be skipped.");
      return;
    }
    setPendingActionSkip(null);
    setActionSkipReason("");
    setActionCustomSkipReason("");
    setFormError("");
    showToast(`${pendingActionSkip.title} skipped.`);
  }

  function removeDailyAction(action) {
    if (!window.confirm(`Delete the daily action “${action.title}”?`)) return;
    if (!deleteDailyAction(action.id)) {
      setFormError("The daily action could not be deleted.");
      return;
    }
    closeActionEditor();
    closeFocusedItem();
    showToast("Daily action deleted.");
  }

  function cancelEditor() {
    const hasUnsavedChanges = draft
      && JSON.stringify(draft) !== initialDraftRef.current;
    if (
      hasUnsavedChanges
      && !window.confirm("Cancel planning this workout? Your unsaved changes will be lost.")
    ) {
      return;
    }
    closeEditor();
  }

  function startPlan(plan, conflictAction = null) {
    const result = startPlannedWorkout(plan.id, conflictAction);
    if (result?.status === "draft-conflict") {
      setDraftConflict({
        planId: plan.id,
        existingDraftTitle: result.existingDraftTitle,
      });
      setFormError("");
      return;
    }
    if (result?.status === "error") {
      setFormError(
        result.message || "The planned workout could not be started."
      );
      return;
    }
    if (result?.status === "completed" && result.workoutEntry) {
      openCompletedWorkout(result.workoutEntry.id);
      return;
    }
    setDraftConflict(null);
    setFormError("");
  }

  function cancelDraftConflict() {
    restoreStartFocusPlanIdRef.current = draftConflict?.planId || null;
    setDraftConflict(null);
  }

  function updateExercise(exerciseId, update) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? update(exercise) : exercise
      ),
    }));
  }

  function changeExerciseName(exerciseId, name) {
    updateExercise(exerciseId, (exercise) => {
      const changed = { ...exercise, name };
      delete changed.exerciseId;
      if (exercise.exerciseReference) {
        changed.exerciseReference = {
          ...exercise.exerciseReference,
          modified: true,
        };
      }
      return changed;
    });
  }

  function selectSavedExercise(exerciseId, exerciseDefinition) {
    updateExercise(exerciseId, (exercise) => {
      const selected = {
        ...exercise,
        name: exerciseDefinition.name,
        exerciseReference: {
          source: "user-saved",
          sourceId: exerciseDefinition.id,
          modified: false,
        },
      };
      delete selected.exerciseId;
      return selected;
    });
    setActiveSearchExerciseId(null);
  }

  function selectBuiltInExercise(exerciseId, builtInExercise) {
    updateExercise(exerciseId, (exercise) => {
      const selected = {
        ...exercise,
        name: builtInExercise.name,
        exerciseId: builtInExercise.id,
      };
      delete selected.exerciseReference;
      return selected;
    });
    setActiveSearchExerciseId(null);
  }

  function addExercise() {
    setDraft((current) => ({
      ...current,
      exercises: [...current.exercises, emptyPlannedExercise()],
    }));
    setActiveSearchExerciseId(null);
    setSearchResetKey((current) => current + 1);
  }

  function removeExercise(exerciseId) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter(({ id }) => id !== exerciseId),
    }));
    if (activeSearchExerciseId === exerciseId) setActiveSearchExerciseId(null);
  }

  function moveExercise(index, direction) {
    setDraft((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[destination]] = [exercises[destination], exercises[index]];
      return { ...current, exercises };
    });
  }

  function updateTarget(exerciseId, targetId, values) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: exercise.targetSets.map((target) =>
        target.id === targetId ? { ...target, ...values } : target
      ),
    }));
  }

  function addTarget(exerciseId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: [
        ...exercise.targetSets,
        emptyTargetSet(exercise.targetSets[exercise.targetSets.length - 1]?.load),
      ],
    }));
  }

  function saveReusableExercise(exercise, exerciseIndex) {
    const inheritedLoad = exercise.targetSets.find(({ load }) => load)?.load;
    const definition = {
      name: exercise.name,
      defaultLoadMode: inheritedLoad?.mode || "external",
      defaultWeightUnit: inheritedLoad?.mode === "external"
        ? inheritedLoad.unit
        : "lb",
    };
    const error = getExerciseDefinitionError(definition);
    if (error) {
      setFormError(`Exercise ${exerciseIndex + 1}: ${error}`);
      return;
    }
    const result = saveExerciseDefinitions([definition])?.[0];
    if (result?.status === "added") {
      setFormError("");
      showToast(`${exercise.name.trim()} saved as a reusable exercise.`);
      return;
    }
    if (result?.status === "duplicate" && result.matchesDefinition) {
      setFormError("");
      showToast(`${exercise.name.trim()} is already saved for reuse.`);
      return;
    }
    setFormError(
      result?.status === "duplicate"
        ? `A reusable exercise named ${exercise.name.trim()} already exists with different defaults.`
        : "The reusable exercise could not be saved."
    );
  }

  function removeTarget(exerciseId, targetId) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      targetSets: exercise.targetSets.filter(({ id }) => id !== targetId),
    }));
  }

  function savePlan(event) {
    event.preventDefault();
    const error = getPlannedWorkoutError(draft);
    if (error) {
      setFormError(error);
      return;
    }
    const result = editingId
      ? updatePlannedWorkout(editingId, draft)
      : createPlannedWorkout(draft);
    if (result?.status !== "saved") {
      setFormError(result?.message || "The planned workout could not be saved.");
      return;
    }
    setPendingDeletion(null);
    showToast(editingId ? "Planned workout updated." : "Planned workout created.");
    closeEditor();
  }

  function removePlan(plan) {
    if (!window.confirm(`Delete the planned workout “${plan.title}”? Completed workout history will not be changed.`)) {
      return;
    }
    if (!deletePlannedWorkout(plan.id)) {
      setFormError("The planned workout could not be deleted.");
      return;
    }
    setPendingDeletion({
      plannedWorkout: plan,
      originalIndex: plannedWorkouts.findIndex(({ id }) => id === plan.id),
    });
    if (editingId === plan.id) closeEditor();
    setFormError("");
    showToast("Planned workout deleted.");
  }

  function requestSkipPlan(plan) {
    setPendingActionSkip(null);
    setPendingProtocolSkip(null);
    setPendingSkipPlan(plan);
    setSkipReason("");
    setCustomSkipReason("");
    return true;
  }

  function confirmSkipPlan(reason) {
    if (!pendingSkipPlan) return;
    const selectedReason = reason === null
      ? ""
      : (reason || (skipReason === "Other" ? customSkipReason : skipReason));
    const result = skipPlannedWorkout(pendingSkipPlan.id, todayKey, selectedReason.trim());
    if (result?.status !== "skipped") {
      setFormError(result?.message || "The planned workout could not be skipped.");
      return;
    }
    setFormError("");
    showToast(`${pendingSkipPlan.title} marked skipped for today.`);
    setPendingSkipPlan(null);
    setSkipReason("");
    setCustomSkipReason("");
  }

  function undoPlanDeletion() {
    if (!pendingDeletion) return;
    const result = restorePlannedWorkout(
      pendingDeletion.plannedWorkout,
      pendingDeletion.originalIndex
    );
    setPendingDeletion(null);
    if (result?.status !== "restored") {
      setFormError(result?.message || "The planned workout could not be restored.");
      return;
    }
    setFormError("");
    showToast("Planned workout restored.");
  }

  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "8px",
    padding: "10px",
    width: "100%",
  };
  const compactButtonStyle = {
    ...buttonStyle,
    fontSize: "15px",
    marginTop: 0,
    padding: "9px 12px",
  };
  const backStyle = { ...buttonStyle, backgroundColor: "#666" };

  function renderCompactScheduleItem(scheduleItem) {
    if (scheduleItem.type === "workout") {
      const volume = plannedWorkoutVolume(scheduleItem.plan.exercises);
      const actionable = ["planned", "started", "skipped"].includes(scheduleItem.status);
      return (
        <li className="trace-today-summary__card" data-schedule-item-type="workout" key={scheduleItem.id}>
          <button className="trace-today-summary__item" type="button" aria-label={`Open workout preview ${scheduleItem.title}`} onClick={() => openPreview(scheduleItem.plan)}>
            <span className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--workout">Workout</span><TodayStatus status={scheduleItem.status} /></span>
            <span className="trace-today-summary__copy"><strong>{scheduleItem.title}</strong><small>{volume.total} {volume.total === 1 ? "set" : "sets"} · {volume.warmUp} warm-up · {volume.working} working</small></span>
          </button>
          {actionable && (
            <div className="trace-today-summary__actions" aria-label={`${scheduleItem.title} actions`}>
              <button className="trace-action trace-action--brass" type="button" aria-label={`${scheduleItem.status === "started" ? "Continue workout" : "Start workout"} ${scheduleItem.title}`} onClick={() => startPlan(scheduleItem.plan)} style={compactButtonStyle}>{scheduleItem.status === "started" ? "Continue" : "Start"}</button>
              <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip workout ${scheduleItem.title}`} onClick={() => requestSkipPlan(scheduleItem.plan)} style={compactButtonStyle}>Skip</button>
            </div>
          )}
        </li>
      );
    }
    if (scheduleItem.type === "protocol") {
      const actionable = scheduleItem.status === "scheduled" || scheduleItem.status === "skipped";
      return (
        <li className="trace-today-summary__card" data-schedule-item-type="protocol" key={scheduleItem.id}>
          <button className="trace-today-summary__item" type="button" aria-label={`Open protocol ${scheduleItem.item.compound.name}`} onClick={() => focusProtocol(scheduleItem)}>
            <span className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--protocol">Protocol</span><TodayStatus status={scheduleItem.status} /></span>
            <span className="trace-today-summary__copy"><strong>{scheduleItem.title}</strong><small>{scheduleItem.subtitle}</small></span>
          </button>
          {actionable && (
            <div className="trace-today-summary__actions" aria-label={`${scheduleItem.item.compound.name} actions`}>
              <button className="trace-action trace-action--primary" type="button" aria-label={`Complete protocol ${scheduleItem.item.compound.name}`} onClick={() => markProtocolComplete(scheduleItem)} style={compactButtonStyle}>Complete</button>
              <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip protocol ${scheduleItem.item.compound.name}`} onClick={() => requestProtocolSkip(scheduleItem)} style={compactButtonStyle}>Skip</button>
            </div>
          )}
        </li>
      );
    }
    const action = scheduleItem.action;
    const details = [dailyActionTimeLabel(action), action.location, action.notes]
      .filter(Boolean).join(" · ");
    const actionable = scheduleItem.status === "scheduled" || scheduleItem.status === "skipped";
    return (
      <li className="trace-today-summary__card" data-schedule-item-type="daily-action" key={scheduleItem.id}>
        <button className="trace-today-summary__item" type="button" aria-label={`Open daily action ${action.title}`} onClick={() => focusDailyAction(scheduleItem)}>
          <span className="trace-today-item__meta"><span className={`trace-today-summary__type trace-today-summary__type--${action.actionType}`}>{dailyActionTypeLabel(action.actionType)}</span><TodayStatus status={scheduleItem.status} /></span>
          <span className="trace-today-summary__copy"><strong>{action.title}</strong>{details && <small>{details}</small>}</span>
        </button>
        {actionable && (
          <div className="trace-today-summary__actions" aria-label={`${action.title} actions`}>
            <button className="trace-action trace-action--primary" type="button" aria-label={`Complete ${dailyActionTypeLabel(action.actionType)} ${action.title}`} onClick={() => markActionComplete(action)} style={compactButtonStyle}>Complete</button>
            <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip ${dailyActionTypeLabel(action.actionType)} ${action.title}`} onClick={() => requestActionSkip(action)} style={compactButtonStyle}>Skip</button>
          </div>
        )}
      </li>
    );
  }

  function renderExpandedScheduleItem(scheduleItem) {
    if (scheduleItem.type === "protocol") {
      const { protocol, item } = scheduleItem;
      return (
        <article className="trace-data-card trace-today-protocol" data-schedule-item-type="protocol" key={scheduleItem.id}>
          <div className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--protocol">Protocol</span><TodayStatus status={scheduleItem.status} /></div>
          <h3><button className="trace-today-plan__open" type="button" aria-label={`Open protocol ${item.compound.name}`} onClick={() => focusProtocol(scheduleItem)}>{item.compound.name}</button></h3>
          <p className="trace-today-protocol__action-summary">{protocolActionSummary(item)}</p>
          <dl className="trace-today-protocol__details">
            <div><dt>Protocol</dt><dd>{protocol.name}</dd></div>
            <div><dt>Dose</dt><dd>{item.dose.amount} {formatDoseUnit(item.dose)}</dd></div>
            <div><dt>Route / method</dt><dd>{formatRoute(item.route)}</dd></div>
            <div><dt>Schedule</dt><dd>{formatProtocolSchedule(item.schedule)}{scheduleTimeLabel(item) ? ` · ${scheduleTimeLabel(item)}` : ""}</dd></div>
          </dl>
          {item.notes && <p className="trace-today-protocol__notes"><strong>Item notes:</strong> <span>{item.notes}</span></p>}
          {protocol.notes && <p className="trace-today-protocol__notes"><strong>Protocol notes:</strong> <span>{protocol.notes}</span></p>}
          {skipProvenanceLabel(scheduleItem.occurrence, scheduleItem.status === "completed") && <p className="trace-today-plan__skipped">{skipProvenanceLabel(scheduleItem.occurrence, scheduleItem.status === "completed")}</p>}
          {["scheduled", "skipped"].includes(scheduleItem.status) && <div className="trace-today-exercise__actions"><button className="trace-action trace-action--primary" type="button" onClick={() => markProtocolComplete(scheduleItem)} style={compactButtonStyle}>Complete</button><button className="trace-action trace-action--secondary" type="button" onClick={() => requestProtocolSkip(scheduleItem)} style={compactButtonStyle}>Skip</button></div>}
        </article>
      );
    }
    if (scheduleItem.type === "daily-action") {
      const action = scheduleItem.action;
      return (
        <article className="trace-data-card trace-today-daily-action" data-schedule-item-type="daily-action" data-action-status={action.status} key={action.id}>
          <div className="trace-today-item__meta"><span className={`trace-today-summary__type trace-today-summary__type--${action.actionType}`}>{dailyActionTypeLabel(action.actionType)}</span><TodayStatus status={scheduleItem.status} /></div>
          <h3><button className="trace-today-plan__open" type="button" aria-label={`Open daily action ${action.title}`} onClick={() => focusDailyAction(scheduleItem)}>{action.title}</button></h3>
          {dailyActionTimeLabel(action) && <p className="trace-today-plan__schedule">{dailyActionTimeLabel(action)}</p>}
          {action.location && <p className="trace-today-plan__notes">{action.location}</p>}
          {action.notes && <p className="trace-today-plan__notes">{action.notes}</p>}
          {skipProvenanceLabel(action, action.status === "completed") && <p className="trace-today-plan__skipped">{skipProvenanceLabel(action, action.status === "completed")}</p>}
          {["scheduled", "skipped"].includes(action.status) && <div className="trace-today-exercise__actions"><button className="trace-action trace-action--primary" type="button" onClick={() => markActionComplete(action)} style={compactButtonStyle}>Complete</button><button className="trace-action trace-action--secondary" type="button" onClick={() => requestActionSkip(action)} style={compactButtonStyle}>Skip</button></div>}
        </article>
      );
    }
    const plan = scheduleItem.plan;
    const completedWorkout = completedWorkoutByPlanId.get(plan.id);
    const skipped = scheduleItem.status === "skipped";
    const started = scheduleItem.status === "started";
    const hasDraftConflict = draftConflict?.planId === plan.id;
    return (
      <article className="trace-data-card trace-today-plan" data-draft-collision={hasDraftConflict ? "open" : "closed"} data-schedule-item-type="workout" key={plan.id}>
        <div className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--workout">Workout</span><TodayStatus status={scheduleItem.status} /></div>
        <h3><button className="trace-today-plan__open" type="button" aria-label={`Open workout preview ${plan.title}`} onClick={() => openPreview(plan)}>{plan.title}</button></h3>
        <p className="trace-today-plan__schedule">Scheduled {formatDateOnly(plan.scheduledDate)}</p>
        {plan.notes && <p className="trace-today-plan__notes">{plan.notes}</p>}
        {completedWorkout && <p className="trace-today-plan__completion">Completed {new Date(completedWorkout.occurredAt).toLocaleString()}</p>}
        {skipped && !completedWorkout && <p className="trace-today-plan__skipped">Skipped for today{plan.skipReasons?.[todayKey] ? ` · ${plan.skipReasons[todayKey]}` : ""}</p>}
        {!hasDraftConflict && <div className="trace-today-exercise__actions">
          {completedWorkout ? <button className="trace-action trace-action--primary" type="button" aria-label={`Open completed workout ${plan.title}`} onClick={() => openCompletedWorkout(completedWorkout.id)} style={compactButtonStyle}>View completed workout</button> : <button className="trace-action trace-action--brass" type="button" aria-label={`${started ? "Continue workout" : "Start planned workout"} ${plan.title}`} onClick={() => startPlan(plan)} ref={(node) => { if (node) startButtonRefs.current.set(plan.id, node); else startButtonRefs.current.delete(plan.id); }} style={compactButtonStyle}>{started ? "Continue workout" : "Start workout"}</button>}
          <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit planned workout ${plan.title}`} onClick={() => openEdit(plan)} style={compactButtonStyle}>Edit plan</button>
          {!completedWorkout && <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip workout ${plan.title}`} onClick={() => requestSkipPlan(plan)} style={compactButtonStyle}>Skip workout</button>}
          <button className="trace-action trace-action--danger" type="button" aria-label={`Delete planned workout ${plan.title}`} onClick={() => removePlan(plan)} style={compactButtonStyle}>Delete plan</button>
        </div>}
        {hasDraftConflict && <div aria-label="Workout already in progress" className="trace-feature-surface trace-today-draft-conflict" onKeyDown={(event) => { if (event.key === "Escape") cancelDraftConflict(); }} role="dialog"><h4>Workout already in progress</h4><p>Resume {draftConflict.existingDraftTitle}, discard it and start this plan, or cancel.</p><div className="trace-today-exercise__actions"><button ref={conflictResumeButtonRef} className="trace-action trace-action--primary" type="button" onClick={() => startPlan(plan, "resume")} style={compactButtonStyle}>Resume current workout</button><button className="trace-action trace-action--danger" type="button" onClick={() => startPlan(plan, "discard")} style={compactButtonStyle}>Discard and start plan</button><button className="trace-action trace-action--secondary" type="button" onClick={cancelDraftConflict} style={compactButtonStyle}>Cancel</button></div></div>}
      </article>
    );
  }

  return (
    <div
      className="trace-feature-page trace-feature-page--today"
      data-editor-mode={draft ? (editingId ? "edit" : "create") : actionDraft ? (actionEditingId ? "action-edit" : "action-create") : "closed"}
      data-layout={isMobile ? "mobile" : "desktop"}
      data-testid="today-page"
      style={containerStyle}
    >
      <header className="trace-feature-page__identity">
        <p className="trace-feature-page__kicker">Daily planning</p>
        <h1>Today&apos;s Schedule</h1>
        <p className="trace-feature-page__lede">
          Review today&apos;s workouts, protocols, and daily actions. Each source stays separate from completed workout history.
        </p>
      </header>

      <nav className="trace-today-page__actions" aria-label={(draft || actionDraft || previewPlan || focusedScheduleItem) ? "Focused event navigation" : "Today navigation"}>
        <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>
          Back to Timeline
        </button>
        {(draft || actionDraft || previewPlan || focusedScheduleItem) && (
          <button className="trace-action trace-action--secondary" type="button" onClick={returnToTodaySchedule} style={backStyle}>
            Back to Today&apos;s Schedule
          </button>
        )}
        {!draft && !actionDraft && !previewPlan && !focusedItem && (
          <button className="trace-action trace-action--brass" type="button" onClick={openActionCreate} style={buttonStyle}>
            Add to Today
          </button>
        )}
        {!draft && !actionDraft && !previewPlan && !focusedItem && (
          <button className="trace-action trace-action--primary" type="button" onClick={openCreate} style={buttonStyle}>
            Create planned workout
          </button>
        )}
      </nav>

      {pendingDeletion && (
        <div className="trace-today-page__status">
          <button
            className="trace-action trace-action--secondary"
            type="button"
            onClick={undoPlanDeletion}
            style={{ ...buttonStyle, fontSize: "15px", marginTop: 0, padding: "7px 12px" }}
          >
            Undo
          </button>
        </div>
      )}
      {!draft && !actionDraft && formError && <p role="alert" className="trace-today-page__error">{formError}</p>}

      {draft && (
        <form className="trace-feature-surface trace-feature-form trace-today-editor" aria-label={editingId ? "Edit planned workout" : "Create planned workout"} onSubmit={savePlan}>
          <h2>{editingId ? "Edit planned workout" : "Create planned workout"}</h2>
          <div className="trace-today-editor__details" data-testid="planned-workout-details" style={{ gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}>
            <label>
              Planned workout title
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={160} style={fieldStyle} />
            </label>
            <label>
              Scheduled date
              <input type="date" value={draft.scheduledDate} onChange={(event) => setDraft((current) => ({ ...current, scheduledDate: event.target.value }))} style={fieldStyle} />
            </label>
          </div>
          <label style={{ display: "block", marginTop: "14px" }}>
            Planned workout notes (optional)
            <textarea value={draft.notes || ""} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} style={fieldStyle} />
          </label>

          <section aria-label="Planned exercises" className="trace-today-editor__exercises">
            <div className="trace-today-editor__section-heading">
              <h3>Exercises</h3>
              <span>{draft.exercises.length} planned</span>
            </div>
            {draft.exercises.map((exercise, exerciseIndex) => (
              <fieldset className="trace-data-card trace-today-exercise" key={exercise.id}>
                <legend>Exercise {exerciseIndex + 1}</legend>
                <div className="trace-today-exercise__actions">
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-expanded={activeSearchExerciseId === exercise.id} aria-label={`Find an exercise for exercise ${exerciseIndex + 1}`} onClick={() => setActiveSearchExerciseId((current) => current === exercise.id ? null : exercise.id)} style={compactButtonStyle}>
                    Find an Exercise
                  </button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Move exercise ${exerciseIndex + 1} up`} disabled={exerciseIndex === 0} onClick={() => moveExercise(exerciseIndex, -1)} style={compactButtonStyle}>Move up</button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Move exercise ${exerciseIndex + 1} down`} disabled={exerciseIndex === draft.exercises.length - 1} onClick={() => moveExercise(exerciseIndex, 1)} style={compactButtonStyle}>Move down</button>
                  <button className="trace-action trace-action--danger" type="button" aria-label={`Remove exercise ${exerciseIndex + 1}`} disabled={draft.exercises.length === 1} onClick={() => removeExercise(exercise.id)} style={compactButtonStyle}>Remove exercise</button>
                  <button className="trace-action trace-action--secondary trace-today-exercise-action" type="button" aria-label={`Save exercise ${exerciseIndex + 1} as reusable`} onClick={() => saveReusableExercise(exercise, exerciseIndex)} style={compactButtonStyle}>Save as reusable exercise</button>
                </div>
                {activeSearchExerciseId === exercise.id && (
                  <ExerciseSearch
                    autoFocus
                    exercises={savedExercises}
                    onSelectExercise={(selected) => selectSavedExercise(exercise.id, selected)}
                    onSelectBuiltInExercise={(selected) => selectBuiltInExercise(exercise.id, selected)}
                    inputStyle={inputStyle}
                    resetKey={searchResetKey}
                  />
                )}
                <div className="trace-today-editor__details" style={{ gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}>
                  <label>
                    Exercise {exerciseIndex + 1} name
                    <input value={exercise.name} onChange={(event) => changeExerciseName(exercise.id, event.target.value)} maxLength={120} style={fieldStyle} />
                  </label>
                  <label>
                    Exercise {exerciseIndex + 1} notes (optional)
                    <input value={exercise.notes || ""} onChange={(event) => updateExercise(exercise.id, (current) => ({ ...current, notes: event.target.value }))} maxLength={240} style={fieldStyle} />
                  </label>
                </div>

                <div className="trace-today-targets">
                  <div className="trace-today-editor__section-heading">
                    <strong>Target sets</strong>
                    {exercise.targetSets.length > 0 && (
                      <button className="trace-action trace-action--secondary" type="button" aria-label={`Add target set to exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                    )}
                  </div>
                  {exercise.targetSets.length === 0 ? (
                    <button className="trace-action trace-action--secondary trace-today-add-target" type="button" aria-label={`Add target set to exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                  ) : exercise.targetSets.map((target, targetIndex) => (
                    <fieldset className="trace-today-target" key={target.id}>
                      <legend>Target set {targetIndex + 1}</legend>
                      <div
                        className="trace-today-target__fields"
                        data-layout={isMobile ? "mobile" : "desktop"}
                        data-testid={`target-fields-${exerciseIndex + 1}-${targetIndex + 1}`}
                        style={{
                          gridTemplateColumns: isMobile
                            ? "minmax(0, 1fr)"
                            : "minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(130px, 1fr) minmax(70px, 0.55fr)",
                        }}
                      >
                        <label>
                          Set type
                          <select aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} type`} value={target.setType || "working"} onChange={(event) => updateTarget(exercise.id, target.id, { setType: event.target.value })} style={fieldStyle}>
                            <option value="working">Working</option>
                            <option value="warm-up">Warm-up</option>
                          </select>
                        </label>
                        <label>
                          Intended reps
                          <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended reps`} type="number" min="0" step="1" value={target.reps ?? ""} onChange={(event) => updateTarget(exercise.id, target.id, { reps: event.target.value })} placeholder="Optional" style={fieldStyle} />
                        </label>
                        <label>
                          Intended load
                          <select aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended load`} value={target.load?.mode || ""} onChange={(event) => {
                            const mode = event.target.value;
                            updateTarget(exercise.id, target.id, {
                              load: mode === "" ? null : mode === "bodyweight" ? { mode } : { mode, unit: target.load?.unit || "lb", ...(target.load?.amount === undefined ? {} : { amount: target.load.amount }) },
                            });
                          }} style={fieldStyle}>
                            <option value="">No load target</option>
                            {WORKOUT_LOAD_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="trace-today-target__amount-label-text">Intended weight</span>
                          <input
                            aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} intended weight`}
                            type="number"
                            min="0"
                            step="any"
                            value={target.load?.mode === "external" ? (target.load.amount ?? "") : ""}
                            disabled={target.load?.mode === "bodyweight"}
                            onChange={(event) => updateTarget(exercise.id, target.id, {
                              load: {
                                mode: "external",
                                amount: event.target.value,
                                unit: target.load?.unit || "lb",
                              },
                            })}
                            placeholder="Enter weight"
                            style={fieldStyle}
                          />
                        </label>
                        <label>
                          Unit
                          <select
                            aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} unit`}
                            value={target.load?.unit || "lb"}
                            disabled={target.load?.mode === "bodyweight"}
                            onChange={(event) => updateTarget(exercise.id, target.id, {
                              load: {
                                mode: "external",
                                unit: event.target.value,
                                ...(target.load?.amount === undefined ? {} : { amount: target.load.amount }),
                              },
                            })}
                            style={fieldStyle}
                          >
                            {WORKOUT_WEIGHT_UNITS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label style={{ display: "block", marginTop: "10px" }}>
                        Target set notes (optional)
                        <input aria-label={`Exercise ${exerciseIndex + 1} target set ${targetIndex + 1} notes`} value={target.notes || ""} onChange={(event) => updateTarget(exercise.id, target.id, { notes: event.target.value })} style={fieldStyle} />
                      </label>
                      <div className="trace-today-target__actions">
                        <button className="trace-action trace-action--secondary" type="button" aria-label={`Add target set after set ${targetIndex + 1} in exercise ${exerciseIndex + 1}`} onClick={() => addTarget(exercise.id)} style={compactButtonStyle}>Add target set</button>
                        <button className="trace-action trace-action--danger" type="button" aria-label={`Remove target set ${targetIndex + 1} from exercise ${exerciseIndex + 1}`} onClick={() => removeTarget(exercise.id, target.id)} style={compactButtonStyle}>Remove target set</button>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </fieldset>
            ))}
            <button className="trace-action trace-action--brass trace-today-add-exercise" type="button" onClick={addExercise} style={buttonStyle}>
              Add exercise
            </button>
          </section>

          {formError && <p role="alert" className="trace-today-page__error">{formError}</p>}
          <div className="trace-today-page__actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>{editingId ? "Save changes" : "Save planned workout"}</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={cancelEditor} style={backStyle}>Cancel</button>
          </div>
        </form>
      )}

      {!draft && actionDraft && (
        <form className="trace-feature-surface trace-feature-form trace-daily-action-editor" aria-label={actionEditingId ? "Edit daily action" : "Add to Today"} onSubmit={saveAction}>
          <h2>{actionEditingId ? "Edit daily action" : "Add to Today"}</h2>
          <div className="trace-daily-action-editor__grid">
            <label>
              Action type
              <select value={actionDraft.actionType} onChange={(event) => setActionDraft((current) => ({ ...current, actionType: event.target.value }))} style={fieldStyle}>
                {DAILY_ACTION_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Title
              <input value={actionDraft.title} onChange={(event) => setActionDraft((current) => ({ ...current, title: event.target.value }))} maxLength={160} style={fieldStyle} />
            </label>
            <label>
              Date
              <input type="date" value={actionDraft.date} onChange={(event) => setActionDraft((current) => ({ ...current, date: event.target.value }))} style={fieldStyle} />
            </label>
            <label>
              Timing
              <select value={actionDraft.timingMode} onChange={(event) => setActionDraft((current) => ({ ...current, timingMode: event.target.value }))} style={fieldStyle}>
                <option value="none">No time</option>
                <option value="time">Specific time</option>
                <option value="window">Time window</option>
              </select>
            </label>
            {actionDraft.timingMode === "time" && (
              <label>
                Time
                <input type="time" value={actionDraft.time} onChange={(event) => setActionDraft((current) => ({ ...current, time: event.target.value }))} style={fieldStyle} />
              </label>
            )}
            {actionDraft.timingMode === "window" && (
              <>
                <label>
                  Window start
                  <input type="time" value={actionDraft.windowStart} onChange={(event) => setActionDraft((current) => ({ ...current, windowStart: event.target.value }))} style={fieldStyle} />
                </label>
                <label>
                  Window end
                  <input type="time" value={actionDraft.windowEnd} onChange={(event) => setActionDraft((current) => ({ ...current, windowEnd: event.target.value }))} style={fieldStyle} />
                </label>
              </>
            )}
            <label>
              Duration in minutes (optional)
              <input type="number" min="1" step="1" value={actionDraft.durationMinutes} onChange={(event) => setActionDraft((current) => ({ ...current, durationMinutes: event.target.value }))} style={fieldStyle} />
            </label>
            {["meeting", "appointment", "errand", "personal"].includes(actionDraft.actionType) && (
              <label>
                Location (optional)
                <input value={actionDraft.location} onChange={(event) => setActionDraft((current) => ({ ...current, location: event.target.value }))} maxLength={240} style={fieldStyle} />
              </label>
            )}
          </div>
          <label className="trace-daily-action-editor__notes">
            Notes (optional)
            <textarea value={actionDraft.notes} onChange={(event) => setActionDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} style={fieldStyle} />
          </label>
          {formError && <p role="alert" className="trace-today-page__error">{formError}</p>}
          <div className="trace-today-page__actions">
            <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>{actionEditingId ? "Save changes" : "Save daily action"}</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={cancelActionEditor} style={backStyle}>Cancel</button>
          </div>
        </form>
      )}

      {!draft && !actionDraft && previewPlan && (
        <section className="trace-feature-surface trace-workout-preview" aria-label={`Workout preview ${previewPlan.title}`}>
          <div className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--workout">Workout</span><TodayStatus status={completedWorkoutByPlanId.get(previewPlan.id) ? "completed" : activePlannedWorkoutId === previewPlan.id ? "started" : isPlannedWorkoutSkippedOnDate(previewPlan, todayKey) ? "skipped" : "planned"} /></div>
          <h2>{previewPlan.title}</h2>
          {previewPlan.notes && <p className="trace-today-plan__notes">{previewPlan.notes}</p>}
          {(() => {
            const volume = plannedWorkoutVolume(previewPlan.exercises);
            return (
              <ul className="trace-workout-volume" aria-label="Workout set summary">
                <li><strong>{volume.total}</strong> total {volume.total === 1 ? "set" : "sets"}</li>
                <li><strong>{volume.warmUp}</strong> warm-up</li>
                <li><strong>{volume.working}</strong> working</li>
              </ul>
            );
          })()}
          <div className="trace-workout-preview__exercises">
            {previewPlan.exercises.map((exercise) => (
              <article className="trace-data-card trace-workout-preview__exercise" key={exercise.id}>
                <h3>{exercise.name}</h3>
                <p>{exercise.targetSets.length} {exercise.targetSets.length === 1 ? "set" : "sets"}</p>
                {exercise.targetSets.length > 0 ? (
                  <ul aria-label={`${exercise.name} planned sets`}>
                    {exercise.targetSets.map((target) => <li key={target.id}>{plannedSetPreview(target)}</li>)}
                  </ul>
                ) : <p className="trace-today-page__muted">No target sets planned.</p>}
              </article>
            ))}
          </div>
          <div className="trace-workout-preview__actions" data-testid="workout-preview-actions">
            {completedWorkoutByPlanId.get(previewPlan.id) ? (
              <button className="trace-action trace-action--primary" type="button" onClick={() => openCompletedWorkout(completedWorkoutByPlanId.get(previewPlan.id).id)} style={compactButtonStyle}>View completed workout</button>
            ) : (
              <>
                <button className="trace-action trace-action--brass" type="button" aria-label={`${activePlannedWorkoutId === previewPlan.id ? "Continue workout" : "Start planned workout"} ${previewPlan.title}`} onClick={() => startPlan(previewPlan)} style={compactButtonStyle}>{activePlannedWorkoutId === previewPlan.id ? "Continue workout" : "Start"}</button>
                <button className="trace-action trace-action--secondary" type="button" aria-label={`Edit planned workout ${previewPlan.title}`} onClick={() => openEdit(previewPlan)} style={compactButtonStyle}>Edit</button>
                <button className="trace-action trace-action--secondary" type="button" aria-label={`Skip workout ${previewPlan.title}`} onClick={() => requestSkipPlan(previewPlan)} style={compactButtonStyle}>Skip</button>
              </>
            )}
          </div>
        </section>
      )}

      {!draft && !actionDraft && !previewPlan && focusedItem?.type === "protocol" && (
        <section className="trace-feature-surface trace-today-focused" aria-label={`Protocol details ${focusedItem.item.compound.name}`}>
          <article className="trace-data-card trace-today-protocol" data-schedule-item-type="protocol">
            <div className="trace-today-item__meta"><span className="trace-today-summary__type trace-today-summary__type--protocol">Protocol</span><TodayStatus status={focusedItem.status} /></div>
            <h2>{focusedItem.item.compound.name}</h2>
            <p className="trace-today-protocol__action-summary">{protocolActionSummary(focusedItem.item)}</p>
            <dl className="trace-today-protocol__details">
              <div><dt>Protocol</dt><dd>{focusedItem.protocol.name}</dd></div>
              <div><dt>Dose</dt><dd>{focusedItem.item.dose.amount} {formatDoseUnit(focusedItem.item.dose)}</dd></div>
              <div><dt>Route / method</dt><dd>{formatRoute(focusedItem.item.route)}</dd></div>
              <div><dt>Schedule</dt><dd>{formatProtocolSchedule(focusedItem.item.schedule)}{scheduleTimeLabel(focusedItem.item) ? ` · ${scheduleTimeLabel(focusedItem.item)}` : ""}</dd></div>
            </dl>
            {focusedItem.item.notes && <p className="trace-today-protocol__notes"><strong>Item notes:</strong> <span>{focusedItem.item.notes}</span></p>}
            {focusedItem.protocol.notes && <p className="trace-today-protocol__notes"><strong>Protocol notes:</strong> <span>{focusedItem.protocol.notes}</span></p>}
            {skipProvenanceLabel(focusedItem.occurrence, focusedItem.status === "completed") && <p className="trace-today-plan__skipped">{skipProvenanceLabel(focusedItem.occurrence, focusedItem.status === "completed")}</p>}
            {["scheduled", "skipped"].includes(focusedItem.status) && <div className="trace-today-exercise__actions"><button className="trace-action trace-action--primary" type="button" onClick={() => markProtocolComplete(focusedItem)} style={compactButtonStyle}>Complete</button><button className="trace-action trace-action--secondary" type="button" onClick={() => requestProtocolSkip(focusedItem)} style={compactButtonStyle}>Skip</button></div>}
          </article>
        </section>
      )}

      {!draft && !actionDraft && !previewPlan && focusedItem?.type === "daily-action" && (
        <section className="trace-feature-surface trace-today-focused" aria-label={`Daily action ${focusedItem.action.title}`}>
          <article className="trace-data-card trace-today-daily-action" data-schedule-item-type="daily-action" data-action-status={focusedItem.action.status}>
            <div className="trace-today-item__meta"><span className={`trace-today-summary__type trace-today-summary__type--${focusedItem.action.actionType}`}>{dailyActionTypeLabel(focusedItem.action.actionType)}</span><TodayStatus status={focusedItem.status} /></div>
            <h2>{focusedItem.action.title}</h2>
            <dl className="trace-today-protocol__details">
              <div><dt>Date</dt><dd>{formatDateOnly(focusedItem.action.date)}</dd></div>
              {dailyActionTimeLabel(focusedItem.action) && <div><dt>Time</dt><dd>{dailyActionTimeLabel(focusedItem.action)}</dd></div>}
              {focusedItem.action.durationMinutes && <div><dt>Duration</dt><dd>{focusedItem.action.durationMinutes} minutes</dd></div>}
              {focusedItem.action.location && <div><dt>Location</dt><dd>{focusedItem.action.location}</dd></div>}
            </dl>
            {focusedItem.action.notes && <p className="trace-today-protocol__notes"><strong>Notes:</strong> <span>{focusedItem.action.notes}</span></p>}
            {skipProvenanceLabel(focusedItem.action, focusedItem.action.status === "completed") && <p className="trace-today-plan__skipped">{skipProvenanceLabel(focusedItem.action, focusedItem.action.status === "completed")}</p>}
            <div className="trace-today-exercise__actions">
              {["scheduled", "skipped"].includes(focusedItem.action.status) && <button className="trace-action trace-action--primary" type="button" onClick={() => markActionComplete(focusedItem.action)} style={compactButtonStyle}>Complete</button>}
              {["scheduled", "skipped"].includes(focusedItem.action.status) && <button className="trace-action trace-action--secondary" type="button" onClick={() => requestActionSkip(focusedItem.action)} style={compactButtonStyle}>Skip</button>}
              <button className="trace-action trace-action--secondary" type="button" onClick={() => openActionEdit(focusedItem.action)} style={compactButtonStyle}>Edit</button>
              <button className="trace-action trace-action--danger" type="button" onClick={() => removeDailyAction(focusedItem.action)} style={compactButtonStyle}>Delete</button>
            </div>
          </article>
        </section>
      )}

      {!draft && !actionDraft && !previewPlan && !focusedItem && (
        <>
          <section className="trace-feature-surface trace-today-schedule" aria-label="Today's schedule" data-expanded={isScheduleExpanded ? "true" : "false"} data-testid="today-schedule-dashboard">
            <div className="trace-today-schedule__header">
              <div>
                <p className="trace-today-schedule__eyebrow">Today</p>
                <h2>{formatDateOnly(todayKey)}</h2>
                <p className="trace-today-schedule__count">{scheduleItems.length === 0 ? "No scheduled items" : `${scheduleItems.length} scheduled ${scheduleItems.length === 1 ? "item" : "items"}`}</p>
              </div>
              <button className="trace-action trace-action--secondary trace-today-schedule__toggle" type="button" aria-controls="today-schedule-details" aria-expanded={isScheduleExpanded} onClick={() => setIsScheduleExpanded((current) => !current)} style={compactButtonStyle}>{isScheduleExpanded ? "Hide details" : "Show details"}</button>
            </div>
            {scheduleItems.length === 0 ? (
              <div className="trace-today-empty"><h3>Nothing scheduled for today.</h3><p>Add a daily action, create a workout plan, or choose another date.</p></div>
            ) : (
              <div className="trace-today-schedule__sections">
                {remainingScheduleItems.length > 0 && <section className="trace-today-schedule__group" aria-label="Remaining today"><h3 className="trace-today-schedule__group-title">Remaining today</h3><ul className="trace-today-summary" aria-label="Today's schedule summary">{remainingScheduleItems.map(renderCompactScheduleItem)}</ul></section>}
                {completedScheduleItems.length > 0 && <section className="trace-today-schedule__group" aria-label="Completed today"><h3 className="trace-today-schedule__group-title">Completed today</h3><ul className="trace-today-summary" aria-label="Completed today summary">{completedScheduleItems.map(renderCompactScheduleItem)}</ul></section>}
              </div>
            )}
            {isScheduleExpanded && scheduleItems.length > 0 && (
              <section id="today-schedule-details" className="trace-today-schedule__details" aria-label="Today's actionable items">
                {remainingScheduleItems.length > 0 && <section className="trace-today-schedule__group" aria-label="Remaining today details"><h3 className="trace-today-schedule__group-title">Remaining today</h3><div className="trace-today-schedule__list">{remainingScheduleItems.map(renderExpandedScheduleItem)}</div></section>}
                {completedScheduleItems.length > 0 && <section className="trace-today-schedule__group" aria-label="Completed today details"><h3 className="trace-today-schedule__group-title">Completed today</h3><div className="trace-today-schedule__list">{completedScheduleItems.map(renderExpandedScheduleItem)}</div></section>}
              </section>
            )}
          </section>
          <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={backStyle}>Back to Timeline</button>
        </>
      )}

      {!draft && pendingSkipPlan && (
        <SkipReasonDialog
          ariaLabel={`Skip workout ${pendingSkipPlan.title}`}
          prompt="Why are you skipping this workout?"
          reason={skipReason}
          customReason={customSkipReason}
          setReason={setSkipReason}
          setCustomReason={setCustomSkipReason}
          onSave={() => confirmSkipPlan()}
          onSkipWithoutReason={() => confirmSkipPlan(null)}
          onCancel={() => setPendingSkipPlan(null)}
          fieldStyle={fieldStyle}
          buttonStyle={compactButtonStyle}
        />
      )}

      {!draft && !actionDraft && pendingProtocolSkip && (
        <SkipReasonDialog
          ariaLabel={`Skip protocol ${pendingProtocolSkip.item.compound.name}`}
          prompt="Why are you skipping this protocol item today?"
          reason={protocolSkipReason}
          customReason={protocolCustomSkipReason}
          setReason={setProtocolSkipReason}
          setCustomReason={setProtocolCustomSkipReason}
          onSave={() => confirmProtocolSkip(false)}
          onSkipWithoutReason={() => confirmProtocolSkip(true)}
          onCancel={() => setPendingProtocolSkip(null)}
          fieldStyle={fieldStyle}
          buttonStyle={compactButtonStyle}
        />
      )}

      {!draft && !actionDraft && pendingActionSkip && (
        <SkipReasonDialog
          ariaLabel={`Skip ${dailyActionTypeLabel(pendingActionSkip.actionType)} ${pendingActionSkip.title}`}
          prompt="Why are you skipping this action?"
          reason={actionSkipReason}
          customReason={actionCustomSkipReason}
          setReason={setActionSkipReason}
          setCustomReason={setActionCustomSkipReason}
          onSave={() => confirmActionSkip(false)}
          onSkipWithoutReason={() => confirmActionSkip(true)}
          onCancel={() => setPendingActionSkip(null)}
          fieldStyle={fieldStyle}
          buttonStyle={compactButtonStyle}
        />
      )}
    </div>
  );
}

export default TodayPage;
