import { useState, useEffect, useLayoutEffect, useRef } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";
import NutritionPage from "./components/NutritionPage";
import HealthPage from "./components/HealthPage";
import SettingsPage from "./components/SettingsPage";
import MedicationPage from "./components/MedicationPage";
import ProtocolsPage from "./components/ProtocolsPage";
import WorkoutPage from "./components/WorkoutPage";
import TrophyPlacementCeremony from "./components/TrophyPlacementCeremony";
import TrophyCasePage from "./components/TrophyCasePage";
import BackupPage, { createBackupFile, downloadWithAnchor } from "./components/BackupPage";
import JournalPage from "./components/JournalPage";
import JournalUnlockPage from "./components/JournalUnlockPage";
import TodayPage from "./components/TodayPage";
import ConfirmationMessage from "./components/ConfirmationMessage";
import { parseDateOnlyLocal } from "./services/dateOnly";
import { detectMemoryAchievement } from "./services/memoryAchievement";
import {
  addExerciseDefinition,
  createExerciseDefinition,
  readSavedExercises,
  updateExerciseDefinition as updateExerciseInCatalog,
  writeSavedExercises,
} from "./services/exerciseCatalog";
import {
  addCompoundDefinition,
  createCompoundDefinition,
  readCompoundDefinitions,
  updateCompoundDefinition as updateCompoundInCatalog,
  writeCompoundDefinitions,
} from "./services/compoundCatalog";
import {
  addUserFood,
  createUserFood,
  readUserFoods,
  writeUserFoods,
} from "./services/userFoodCatalog";
import {
  clearCompletedMigrationBackup,
  dataUrlToBlob,
  deletePhotos,
  getPhoto,
  hasLegacyPhotos,
  markLegacyMigrationComplete,
  migrateLegacyPhotos,
  openPhotoDatabase,
  putPhotos,
} from "./storage/photoStorage";
import {
  addCuratedTrophy,
  readTrophyCaseEntries,
  reconcileWorkoutTrophyEntries,
  writeTrophyCaseEntries,
} from "./services/trophyCase";
import {
  createProtocol,
  endProtocol as createEndedProtocol,
  getProtocolError,
  readProtocols,
  writeProtocols,
} from "./services/protocol";
import { resolveTrophySource } from "./services/trophySourceNavigation";
import {
  createHealthMeasurementEntry,
  readHealthMeasurementEntries,
  updateHealthMeasurementEntry,
  writeHealthMeasurementEntries,
} from "./services/healthMeasurements";
import { readAppSettings, writeAppSettings } from "./services/appSettings";
import { useReducedMotion } from "./services/motionPreference";
import { createPhotoUrlLoader } from "./services/photoUrlLoader";
import {
  JOURNAL_DRAFT_STORAGE_KEY,
  JOURNAL_ENTRY_STORAGE_KEY,
  JOURNAL_SCHEMA_VERSION,
  clearJournalDraft,
  createJournalEntry,
  readJournalEntries,
  updateJournalEntry,
  writeJournalDraft,
  writeJournalEntries,
} from "./services/journalEntry";
import {
  changeJournalVaultPassphrase,
  disableJournalVault,
  enableJournalVault,
  journalDraftFromVaultPayload,
  journalEntriesFromVaultPayload,
  journalVaultStorageState,
  persistUnlockedJournalVault,
  recoverJournalVaultAccess,
  recoverJournalVaultTransaction,
  resetJournalVault,
  rotateJournalVaultRecovery,
  unlockJournalVault,
  updateJournalVaultDomain,
  JOURNAL_VAULT_STORAGE_KEY,
  JOURNAL_VAULT_TRANSACTION_KEY,
} from "./services/journalVault";
import { createTraceBackup } from "./services/traceBackup";
import {
  appendPlannedWorkoutExercise as appendExerciseToPlannedWorkout,
  createPlannedWorkout as createPlannedWorkoutRecord,
  getPlannedWorkoutError,
  readPlannedWorkouts,
  removePlannedWorkoutExercise as removeExerciseFromPlannedWorkout,
  restorePlannedWorkoutAtIndex,
  skipPlannedWorkoutForDate,
  updatePlannedWorkout as updatePlannedWorkoutRecord,
  writePlannedWorkouts,
} from "./services/plannedWorkout";
import {
  createWorkoutDraftFromPlannedWorkout,
  readWorkoutDraft,
  writeWorkoutDraft,
} from "./services/workoutDraft";
import {
  completeDailyAction as createCompletedDailyAction,
  createDailyAction as createDailyActionRecord,
  getDailyActionError,
  readDailyActions,
  skipDailyAction as createSkippedDailyAction,
  updateDailyAction as updateDailyActionRecord,
  writeDailyActions,
} from "./services/dailyAction";
import {
  completeProtocolOccurrence as createCompletedProtocolOccurrence,
  findProtocolOccurrence,
  readProtocolOccurrences,
  skipProtocolOccurrence as createSkippedProtocolOccurrence,
  upsertProtocolOccurrence,
  writeProtocolOccurrences,
} from "./services/protocolOccurrence";
import {
  createMedicationDoseSchedule,
  deleteMedicationDoseSchedule as createDeletedMedicationDoseSchedule,
  endMedicationDoseSchedule as createEndedMedicationDoseSchedule,
  findMedicationDoseDuplicate,
  findMedicationDoseOccurrenceDuplicate,
  getMedicationDoseScheduleError,
  medicationDoseDateKey,
  persistMedicationDoseCompletion,
  persistMedicationDoseCompletionUndo,
  readMedicationDoseOccurrences,
  readMedicationDoseSchedules,
  recoverPendingMedicationDoseCompletion,
  removeMedicationDoseOccurrence as createRemovedMedicationDoseOccurrence,
  rescheduleMedicationDoseOccurrence as createRescheduledMedicationDoseOccurrence,
  skipMedicationDoseOccurrence as createSkippedMedicationDoseOccurrence,
  updateMedicationDoseSchedule as createUpdatedMedicationDoseSchedule,
  upsertMedicationDoseOccurrence,
  writeMedicationDoseOccurrences,
  writeMedicationDoseSchedules,
} from "./services/medicationDoseSchedule";
import {
  persistProtocolCompoundResults,
  persistProtocolCompoundUndo,
  readProtocolCompoundOutcomes,
  recoverPendingProtocolCompoundTransaction,
} from "./services/protocolCompoundOutcome";
import {
  appendInjectionSession,
  createInjectionSession,
  defaultInjectionSiteSettings,
  deleteInjectionShotData,
  emptyInjectionSiteCollection,
  readInjectionSiteData,
  readInjectionSiteSettings,
  updateInjectionShotData,
  writeInjectionSiteData,
  writeInjectionSiteSettings,
} from "./services/injectionSite";

const DEFAULT_NUTRITION_GOALS = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  sodium: 0,
};

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function createId(existingIds = new Set()) {
  let id;

  do {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } while (existingIds.has(id));

  return id;
}

function memoryMetadata(memories) {
  return memories.map((memory) => ({
    ...memory,
    images: (memory.images || []).map((image) =>
      typeof image === "string" ? image : image.id || image.legacyDataUrl
    ),
  }));
}

function workoutMetadata(entries) {
  return entries.map((entry) => ({
    ...entry,
    ...(Array.isArray(entry.photos)
      ? { photos: entry.photos.map((photo) => typeof photo === "string" ? photo : photo.id).filter(Boolean) }
      : {}),
  }));
}

function storageMessage(action) {
  return `Trace couldn't ${action} because browser storage is unavailable or full. Your existing data has not been intentionally removed.`;
}

function memoryDisplayMetadata(memories) {
  return memories.map((memory) => ({
    ...memory,
    images: (Array.isArray(memory.images) ? memory.images : []).map((image) => {
      if (typeof image !== "string") return image;
      if (image.startsWith("data:")) {
        return { id: null, legacyDataUrl: image, url: image };
      }
      return { id: image };
    }),
  }));
}

export function localCalendarDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function readStoredWorkoutEntries(storage, {
  getDatabase,
  onCreateObjectUrl,
}) {
  const savedWorkoutEntries = storage.getItem("workoutEntries");
  if (!savedWorkoutEntries) return null;
  const parsedEntries = JSON.parse(savedWorkoutEntries);
  if (!Array.isArray(parsedEntries)) throw new Error("Invalid workout data.");
  if (!parsedEntries.some((entry) => Array.isArray(entry.photos) && entry.photos.length > 0)) {
    return parsedEntries;
  }
  return getDatabase().then((database) => Promise.all(parsedEntries.map(async (entry) => ({
      ...entry,
      ...(Array.isArray(entry.photos) ? { photos: (await Promise.all(entry.photos.map(async (value) => {
        const id = typeof value === "string" ? value : value?.id;
        if (!id) return null;
        const photo = await getPhoto(database, id);
        if (!photo?.blob) return { id };
        const url = URL.createObjectURL(photo.blob);
        onCreateObjectUrl(url);
        return { id, url };
      }))).filter(Boolean) } : {}),
    }))));
}

function initializeJournalPrivacy(storage) {
  try {
    recoverJournalVaultTransaction(storage);
    const state = journalVaultStorageState(storage);
    return {
      enabled: state.enabled,
      unlocked: false,
      malformed: state.malformed,
      recoveryFormat: state.recoveryFormat,
    };
  } catch (error) {
    return {
      enabled: storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== null ||
        storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null,
      unlocked: false,
      malformed: true,
      recoveryFormat: null,
    };
  }
}

function App() {
  const [page, setPage] = useState("home");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [retainHomeDuringMemoryEdit, setRetainHomeDuringMemoryEdit] = useState(false);
  const [homePageGeneration, setHomePageGeneration] = useState(0);

  const [images, setImages] = useState([]);
  const [timelineTargetMemoryId, setTimelineTargetMemoryId] = useState(null);

  const [memories, setMemories] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [nutritionEntries, setNutritionEntries] = useState([]);
  const [healthMeasurementEntries, setHealthMeasurementEntries] = useState([]);
  const [appSettings, setAppSettings] = useState(() => readAppSettings(localStorage));
  const reducedMotion = useReducedMotion(appSettings.motionPreference);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-trace-theme", appSettings.themeId);
  }, [appSettings.themeId]);
  const [medicationEntries, setMedicationEntries] = useState([]);
  const [medicationDoseSchedules, setMedicationDoseSchedules] = useState([]);
  const [medicationDoseOccurrences, setMedicationDoseOccurrences] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [protocolOccurrences, setProtocolOccurrences] = useState([]);
  const [protocolCompoundOutcomes, setProtocolCompoundOutcomes] = useState([]);
  const [injectionSiteData, setInjectionSiteData] = useState(() => emptyInjectionSiteCollection());
  const [injectionSiteSettings, setInjectionSiteSettings] = useState(() => defaultInjectionSiteSettings());
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [dailyActions, setDailyActions] = useState([]);
  const [workoutEntries, setWorkoutEntries] = useState([]);
  const [activeWorkoutDraft, setActiveWorkoutDraft] = useState(() =>
    readWorkoutDraft(localStorage)
  );
  const [workoutEntryTargetId, setWorkoutEntryTargetId] = useState(null);
  const [workoutOriginPage, setWorkoutOriginPage] = useState(null);
  const [workoutOriginCalendar, setWorkoutOriginCalendar] = useState(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => localCalendarDateKey());
  const [calendarVisibleMonth, setCalendarVisibleMonth] = useState(() => localCalendarDateKey().slice(0, 7));
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false);
  const [journalPrivacy, setJournalPrivacy] = useState(() => initializeJournalPrivacy(localStorage));
  const [journalEntries, setJournalEntries] = useState([]);
  const [trophyCaseEntries, setTrophyCaseEntries] = useState([]);
  const [ceremonyEntry, setCeremonyEntry] = useState(null);
  const [memoryAchievementSuggestion, setMemoryAchievementSuggestion] = useState(null);
  const [savedExercises, setSavedExercises] = useState([]);
  const [medicationCompounds, setMedicationCompounds] = useState([]);
  const [userFoods, setUserFoods] = useState([]);
  const [nutritionGoals, setNutritionGoals] = useState(
    DEFAULT_NUTRITION_GOALS
  );
  const [storageError, setStorageError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const confirmationTimerRef = useRef(null);
  const confirmationIdRef = useRef(0);
  const [trophySourceNavigation, setTrophySourceNavigation] = useState(null);
  const photoDatabaseRef = useRef(null);
  const photoDatabasePromiseRef = useRef(null);
  const initializationStartedRef = useRef(false);
  const activeObjectUrlsRef = useRef(new Set());
  const photoUrlLoaderRef = useRef(null);
  const skipNextPageTopScrollRef = useRef(false);
  const memoryEditorFolioRef = useRef(null);
  const completedPlannedWorkoutIdsRef = useRef(new Set());
  const pendingPlannedWorkoutIdsRef = useRef(new Set());
  const journalSessionContextRef = useRef(null);
  const journalSaveQueueRef = useRef(Promise.resolve());
  const journalSaveErrorRef = useRef(null);
  const journalPrivacyChannelRef = useRef(null);
  const journalLockRef = useRef(null);

  function ensurePhotoDatabase() {
    if (photoDatabaseRef.current) return Promise.resolve(photoDatabaseRef.current);
    if (!photoDatabasePromiseRef.current) {
      photoDatabasePromiseRef.current = openPhotoDatabase()
        .then((database) => {
          photoDatabaseRef.current = database;
          return database;
        })
        .catch((error) => {
          photoDatabasePromiseRef.current = null;
          throw error;
        });
    }
    return photoDatabasePromiseRef.current;
  }

  if (!photoUrlLoaderRef.current) {
    photoUrlLoaderRef.current = createPhotoUrlLoader({
      readPhoto: async (id) => getPhoto(await ensurePhotoDatabase(), id),
      onCreateUrl: (url) => activeObjectUrlsRef.current.add(url),
      onRevokeUrl: (url) => activeObjectUrlsRef.current.delete(url),
      onUnavailable: () => setStorageError(
        "One or more saved photos could not be loaded. Trace kept their references and did not delete them."
      ),
    });
  }
  const photoUrlLoader = photoUrlLoaderRef.current;

  function showConfirmation(message, destinationPage = page) {
    confirmationIdRef.current += 1;
    setConfirmation({ id: confirmationIdRef.current, message, page: destinationPage });
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = setTimeout(() => setConfirmation(null), 3200);
  }

  useEffect(() => () => clearTimeout(confirmationTimerRef.current), []);

  useEffect(() => {
    if (!confirmation || confirmation.page === page) return;
    clearTimeout(confirmationTimerRef.current);
    setConfirmation(null);
  }, [confirmation, page]);

  function medicationEntryConfirmation(entry, wasEditing = false) {
    const reference = entry?.compoundReference;
    const category =
      reference?.source === "trace-catalog" && reference.modified === false
        ? reference.category
        : null;
    const action = wasEditing ? "updated" : "traced";

    if (category === "medication") return `Medication ${action}`;
    if (category === "supplement") return `Supplement ${action}`;
    return `Compound ${action}`;
  }

  useEffect(() => {
    if (initializationStartedRef.current) return;
    initializationStartedRef.current = true;

    async function loadMemories() {
      let rawMemories;
      let parsedMemories;

      try {
        rawMemories = localStorage.getItem("memories");
        if (!rawMemories) return;
        parsedMemories = JSON.parse(rawMemories);
        if (!Array.isArray(parsedMemories)) throw new Error("Invalid memories data.");
      } catch (error) {
        setStorageError(
          "Trace couldn't read the saved memories because their stored data is malformed. The stored value was left unchanged."
        );
        return;
      }

      const existingIds = new Set();
      let didAssignIds = false;
      const memoriesWithIds = parsedMemories.map((memory) => {
        if (memory.id && !existingIds.has(memory.id)) {
          existingIds.add(memory.id);
          return memory;
        }

        const id = createId(existingIds);
        existingIds.add(id);
        didAssignIds = true;
        return { ...memory, id };
      });

      setMemories(memoryDisplayMetadata(memoriesWithIds));
      setMemoryCount(memoriesWithIds.length);

      try {
        const database = await ensurePhotoDatabase();
        let compactMemories = memoriesWithIds;

        if (hasLegacyPhotos(memoriesWithIds)) {
          compactMemories = await migrateLegacyPhotos(
            database,
            rawMemories,
            memoriesWithIds
          );
          localStorage.setItem("memories", JSON.stringify(compactMemories));
          setMemories(memoryDisplayMetadata(compactMemories));
          await markLegacyMigrationComplete(database).catch(() => {
            setStorageError(
              "Trace migrated the saved photos, but couldn't finalize its migration backup yet. It will safely retry later."
            );
          });
        } else {
          if (didAssignIds) {
            localStorage.setItem("memories", JSON.stringify(compactMemories));
          }
        }

        if (!hasLegacyPhotos(memoriesWithIds)) {
          await clearCompletedMigrationBackup(database).catch(() => {});
        }
      } catch (error) {
        setStorageError(
          "Trace couldn't migrate saved photos to device photo storage. The original saved memories were left unchanged."
        );
      }
    }

    loadMemories();
  }, []);

  useEffect(() => {
    const activeObjectUrls = activeObjectUrlsRef.current;

    return () => {
      photoUrlLoader.dispose();
      activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      activeObjectUrls.clear();
    };
  }, [photoUrlLoader]);

  useEffect(() => {
    if (skipNextPageTopScrollRef.current) {
      skipNextPageTopScrollRef.current = false;
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [page]);

  useEffect(() => {
    try {
      const savedNutritionGoals = localStorage.getItem("nutritionGoals");
      if (!savedNutritionGoals) return;
      const savedGoals = JSON.parse(savedNutritionGoals);

      setNutritionGoals({
        calories: toNonNegativeNumber(savedGoals.calories),
        protein: toNonNegativeNumber(savedGoals.protein),
        carbohydrates: toNonNegativeNumber(savedGoals.carbohydrates),
        fat: toNonNegativeNumber(savedGoals.fat),
        sodium: toNonNegativeNumber(savedGoals.sodium),
      });
    } catch (error) {
      setStorageError("Trace couldn't read the saved nutrition goals. The stored value was left unchanged.");
    }
  }, []);

  useEffect(() => {
    try {
      setUserFoods(readUserFoods(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved user food catalog. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedNutritionEntries = localStorage.getItem("nutritionEntries");
      if (!savedNutritionEntries) return;
      const parsedEntries = JSON.parse(savedNutritionEntries);
      if (!Array.isArray(parsedEntries)) throw new Error("Invalid nutrition data.");
      setNutritionEntries(parsedEntries);
    } catch (error) {
      setStorageError("Trace couldn't read the saved nutrition entries. The stored value was left unchanged.");
    }
  }, []);

  useEffect(() => {
    try {
      setHealthMeasurementEntries(readHealthMeasurementEntries(localStorage));
    } catch (error) {
      setStorageError("Trace couldn't read the saved Health measurements. The stored value was left unchanged.");
    }
  }, []);

  useEffect(() => {
    try {
      recoverPendingMedicationDoseCompletion(localStorage);
      recoverPendingProtocolCompoundTransaction(localStorage);
    } catch (error) {
      setStorageError(
        "Trace couldn't recover an interrupted medication or Protocol result update. The pending data was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedMedicationEntries = localStorage.getItem("medicationEntries");
      if (!savedMedicationEntries) return;
      const parsedEntries = JSON.parse(savedMedicationEntries);
      if (!Array.isArray(parsedEntries)) {
        throw new Error("Invalid medication data.");
      }
      setMedicationEntries(parsedEntries);
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved medication entries. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setProtocols(readProtocols(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved protocols. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedMedicationDoseSchedules = readMedicationDoseSchedules(localStorage);
      const savedMedicationDoseOccurrences = readMedicationDoseOccurrences(localStorage);
      setMedicationDoseSchedules(savedMedicationDoseSchedules);
      setMedicationDoseOccurrences(savedMedicationDoseOccurrences);
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved medication dose schedules. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setProtocolOccurrences(readProtocolOccurrences(localStorage));
      setProtocolCompoundOutcomes(readProtocolCompoundOutcomes(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved protocol occurrence results. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setInjectionSiteData(readInjectionSiteData(localStorage, readProtocols(localStorage)));
      setInjectionSiteSettings(readInjectionSiteSettings(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved injection-site history. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setPlannedWorkouts(readPlannedWorkouts(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved planned workouts. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setDailyActions(readDailyActions(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved daily actions because their stored data is malformed. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    async function loadWorkouts() {
      try {
        const storedWorkoutEntries = readStoredWorkoutEntries(localStorage, {
          getDatabase: ensurePhotoDatabase,
          onCreateObjectUrl: (url) => activeObjectUrlsRef.current.add(url),
        });
        if (storedWorkoutEntries && typeof storedWorkoutEntries.then === "function") {
          setWorkoutEntries(await storedWorkoutEntries);
        } else if (storedWorkoutEntries) {
          setWorkoutEntries(storedWorkoutEntries);
        }
      } catch (error) {
        setStorageError("Trace couldn't read the saved workouts or their photos. The stored value was left unchanged.");
      }
    }
    loadWorkouts();
  }, []);

  useEffect(() => {
    completedPlannedWorkoutIdsRef.current = new Set(
      workoutEntries
        .map(({ plannedWorkoutId }) => plannedWorkoutId)
        .filter(Boolean)
    );
  }, [workoutEntries]);

  useEffect(() => {
    try {
      setTrophyCaseEntries(readTrophyCaseEntries(localStorage));
    } catch (error) {
      setStorageError("Trace couldn't read the Trophy Case because its stored data is malformed. The stored value was left unchanged.");
    }
  }, []);

  useEffect(() => {
    if (journalPrivacy.enabled) return;
    try {
      setJournalEntries(readJournalEntries(localStorage));
    } catch (error) {
      setStorageError("Trace couldn't read the saved Journal entries because their stored data is malformed. The stored value was left unchanged.");
    }
  }, [journalPrivacy.enabled]);

  useEffect(() => {
    function clearLocalSession(nextState) {
      if (journalSessionContextRef.current) journalSessionContextRef.current.invalidated = true;
      journalSessionContextRef.current = null;
      setJournalEntries([]);
      setJournalPrivacy(nextState);
    }

    function synchronizePrivacyStorage() {
      const state = journalVaultStorageState(localStorage);
      if (state.enabled) {
        clearLocalSession({
          enabled: true,
          unlocked: false,
          malformed: state.malformed,
          recoveryFormat: state.recoveryFormat,
        });
      } else {
        clearLocalSession({
          enabled: false,
          unlocked: false,
          malformed: false,
          recoveryFormat: null,
        });
        try {
          setJournalEntries(readJournalEntries(localStorage));
        } catch (error) {
          setStorageError("Trace couldn't read the saved Journal entries after Journal privacy changed in another tab.");
        }
      }
    }

    function receiveMessage(event) {
      const message = event?.data;
      if (!message || message.schemaVersion !== 1 || ![
        "lock",
        "disabled",
        "vault-replaced",
        "passphrase-changed",
        "recovery-rotated",
        "backup-restored",
        "journal-reset",
      ].includes(message.type)) return;
      synchronizePrivacyStorage();
    }

    function storageChanged(event) {
      if (event.key === JOURNAL_VAULT_STORAGE_KEY) synchronizePrivacyStorage();
    }

    if (typeof BroadcastChannel === "function") {
      const channel = new BroadcastChannel("trace-journal-privacy-v1");
      journalPrivacyChannelRef.current = channel;
      channel.addEventListener?.("message", receiveMessage);
      if (!channel.addEventListener) channel.onmessage = receiveMessage;
    }
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener("storage", storageChanged);
      const channel = journalPrivacyChannelRef.current;
      channel?.removeEventListener?.("message", receiveMessage);
      channel?.close?.();
      journalPrivacyChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!journalPrivacy.unlocked) return undefined;
    let timerId;
    const timeout = appSettings.journalPrivacy.autoLockMinutes * 60 * 1000;
    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        void journalLockRef.current?.({ automatic: true });
      }, timeout);
    };
    const lockForBackground = () => {
      if (document.visibilityState === "hidden") void journalLockRef.current?.({ automatic: true });
    };
    const lockForPageHide = () => void journalLockRef.current?.({ automatic: true });
    resetTimer();
    window.addEventListener("pointerdown", resetTimer, { passive: true });
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("touchstart", resetTimer, { passive: true });
    document.addEventListener("visibilitychange", lockForBackground);
    window.addEventListener("pagehide", lockForPageHide);
    return () => {
      clearTimeout(timerId);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      document.removeEventListener("visibilitychange", lockForBackground);
      window.removeEventListener("pagehide", lockForPageHide);
    };
  }, [appSettings.journalPrivacy.autoLockMinutes, journalPrivacy.unlocked]);

  useEffect(() => {
    const reconciled = reconcileWorkoutTrophyEntries(
      trophyCaseEntries,
      workoutEntries
    );
    if (reconciled === trophyCaseEntries) return;
    try {
      writeTrophyCaseEntries(localStorage, reconciled);
      setTrophyCaseEntries(reconciled);
      setStorageError("");
    } catch (error) {
      setStorageError(storageMessage("refresh Trophy Case achievements"));
    }
  }, [trophyCaseEntries, workoutEntries]);

  useEffect(() => {
    try {
      setSavedExercises(readSavedExercises(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved exercise catalog. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setMedicationCompounds(readCompoundDefinitions(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved compound catalog. The stored value was left unchanged."
      );
    }
  }, []);

  const buttonStyle = {
    padding: "15px 40px",
    fontSize: "clamp(18px, 5vw, 24px)",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#5ec8ff",
    color: "white",
    cursor: "pointer",
    marginTop: "20px",
    maxWidth: "100%",
  };

  const inputStyle = {
    padding: "15px",
    boxSizing: "border-box",
    width: "min(500px, 100%)",
    maxWidth: "100%",
    fontSize: "clamp(18px, 5vw, 24px)",
    borderRadius: "12px",
    border: "2px solid #ccc",
    marginTop: "20px",
  };

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial",
    textAlign: "center",
    padding: "clamp(12px, 4vw, 20px)",
    boxSizing: "border-box",
    maxWidth: "100%",
    overflowX: "hidden",
    width: "100%",
  };

  async function prepareMemoryImages(memoryId, draftImages) {
    const photosToStore = [];
    const preparedImages = draftImages.map((image) => {
      if (image.id) return image;
      const id = createId();
      const blob = image.blob || dataUrlToBlob(image.legacyDataUrl || image.url);
      photosToStore.push({ id, memoryId, blob });
      return { id, url: image.url };
    });

    if (photosToStore.length > 0) {
      await putPhotos(await ensurePhotoDatabase(), photosToStore);
    }
    return {
      preparedImages,
      newPhotoIds: photosToStore.map((photo) => photo.id),
    };
  }

  async function saveMemory() {
    if (title.trim() === "") return false;

    try {
      const memoryId =
        editingId || createId(new Set(memories.map((item) => item.id)));
      const { preparedImages, newPhotoIds } = await prepareMemoryImages(
        memoryId,
        images
      );
      const previousMemory = memories.find((memory) => memory.id === editingId);
      let updatedMemories;

      if (editingId !== null) {
        updatedMemories = memories.map((memory) =>
          memory.id === editingId
            ? {
                ...memory,
                title,
                description,
                date,
                images: preparedImages,
                categories,
              }
            : memory
        );
      } else {
        const newMemory = {
          id: memoryId,
          title,
          description,
          date,
          images: preparedImages,
          categories,
          favorite: false,
        };

        updatedMemories = [...memories, newMemory];
      }

      try {
        localStorage.setItem(
          "memories",
          JSON.stringify(memoryMetadata(updatedMemories))
        );
      } catch (error) {
        await deletePhotos(photoDatabaseRef.current, newPhotoIds).catch(() => {});
        throw error;
      }

      setMemories(updatedMemories);
      showConfirmation("Memory traced", "home");
      setMemoryCount(updatedMemories.length);
      if (editingId !== null) {
        setHomePageGeneration((generation) => generation + 1);
      }
      setEditingId(null);
      setRetainHomeDuringMemoryEdit(false);
      setStorageError("");

      const retainedIds = new Set(preparedImages.map((image) => image.id));
      const removedImages = (previousMemory?.images || []).filter(
        (image) => image.id && !retainedIds.has(image.id)
      );
      await deletePhotos(
        photoDatabaseRef.current,
        removedImages.map((image) => image.id)
      ).catch(() =>
        setStorageError("The memory was saved, but Trace couldn't finish cleaning up removed photo data.")
      );

      removedImages.forEach((image) => {
        photoUrlLoader.evict(image);
        if (image.url) {
          URL.revokeObjectURL(image.url);
          activeObjectUrlsRef.current.delete(image.url);
        }
      });

      preparedImages.forEach((image) => {
        if (image.url?.startsWith("blob:")) activeObjectUrlsRef.current.add(image.url);
      });
      const savedMemory = updatedMemories.find((memory) => memory.id === memoryId);
      try {
        const detection = detectMemoryAchievement(savedMemory);
        const alreadyCurated = trophyCaseEntries.some(
          ({ sourceKey }) => sourceKey === `memory|${memoryId}`
        );
        setMemoryAchievementSuggestion(
          detection.confidence === "high" && !alreadyCurated
            ? { memory: savedMemory, detection }
            : null
        );
      } catch (error) {
        setMemoryAchievementSuggestion(null);
      }
      setTitle("");
      setDescription("");
      setDate("");
      setImages([]);
      setCategories([]);
      setTimelineTargetMemoryId(memoryId);
      skipNextPageTopScrollRef.current = true;
      setPage("home");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save this memory"));
      return false;
    }
  }

  function toggleFavorite(id) {
    const updatedMemories = memories.map((memory) =>
      memory.id === id
        ? { ...memory, favorite: !memory.favorite }
        : memory
    );

    try {
      localStorage.setItem("memories", JSON.stringify(memoryMetadata(updatedMemories)));
      setMemories(updatedMemories);
      setStorageError("");
    } catch (error) {
      setStorageError(storageMessage("update this favorite"));
    }
  }

  async function deleteMemory(idToDelete) {
    const updatedMemories = memories.filter((memory) => memory.id !== idToDelete);
    const deletedMemory = memories.find((memory) => memory.id === idToDelete);

    try {
      localStorage.setItem("memories", JSON.stringify(memoryMetadata(updatedMemories)));
      setMemories(updatedMemories);
      setMemoryCount(updatedMemories.length);
      setStorageError("");
      await deletePhotos(
        photoDatabaseRef.current,
        (deletedMemory?.images || []).map((image) => image.id).filter(Boolean)
      ).catch(() =>
        setStorageError("The memory was deleted, but Trace couldn't finish cleaning up its photo data.")
      );
      (deletedMemory?.images || []).forEach((image) => {
        photoUrlLoader.evict(image);
        if (image.url) {
          URL.revokeObjectURL(image.url);
          activeObjectUrlsRef.current.delete(image.url);
        }
      });
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this memory"));
      return false;
    }
  }

  function editMemory(idToEdit, { retainHome = true } = {}) {
    const memory = memories.find((item) => item.id === idToEdit);

    if (!memory) return;

    setTitle(memory.title);
    setDescription(memory.description);
    setDate(memory.date);
    setImages(memory.images || []);
    setCategories(Array.isArray(memory.categories) ? memory.categories : []);

    if (retainHome) skipNextPageTopScrollRef.current = true;
    setRetainHomeDuringMemoryEdit(retainHome);
    setEditingId(idToEdit);
    setPage("new");
  }

  function openNewMemory() {
    setRetainHomeDuringMemoryEdit(false);
    setEditingId(null);
    setDate(localCalendarDateKey());
    setPage("new");
  }

  function cancelExistingMemoryEdit() {
    skipNextPageTopScrollRef.current = true;
    setRetainHomeDuringMemoryEdit(false);
    setPage("home");
  }

  function saveNutritionEntry(entry) {
    const newEntry = {
      ...entry,
      id: createId(new Set(nutritionEntries.map((item) => item.id))),
    };
    const updatedEntries = [...nutritionEntries, newEntry];

    try {
      localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
      setNutritionEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save this nutrition entry"));
      return false;
    }
  }

  function saveHealthMeasurement(draft) {
    const result = createHealthMeasurementEntry(draft, {
      id: createId(new Set(healthMeasurementEntries.map((entry) => entry.id))),
    });
    if (result.error) return false;
    const updatedEntries = [...healthMeasurementEntries, result.value];
    try {
      writeHealthMeasurementEntries(localStorage, updatedEntries);
      setHealthMeasurementEntries(updatedEntries);
      showConfirmation("Measurement traced");
      setStorageError("");
      return result.value;
    } catch (error) {
      setStorageError(storageMessage("save this Health measurement"));
      return false;
    }
  }

  function updateAppSettings(settings) {
    try {
      const saved = writeAppSettings(localStorage, settings);
      setAppSettings(saved);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save Settings"));
      return false;
    }
  }

  async function synchronizeRestoredAppState() {
    try {
      recoverPendingMedicationDoseCompletion(localStorage);
      recoverPendingProtocolCompoundTransaction(localStorage);
      const restoredMedicationEntriesRaw = localStorage.getItem("medicationEntries");
      const restoredMedicationEntries = restoredMedicationEntriesRaw
        ? JSON.parse(restoredMedicationEntriesRaw)
        : [];
      if (!Array.isArray(restoredMedicationEntries)) throw new Error("Invalid medication data.");
      const restoredAppSettings = readAppSettings(localStorage);
      const restoredJournalPrivacyState = journalVaultStorageState(localStorage);
      const restoredJournalEntries = restoredJournalPrivacyState.enabled
        ? []
        : readJournalEntries(localStorage);
      const restoredPlannedWorkouts = readPlannedWorkouts(localStorage);
      const restoredDailyActions = readDailyActions(localStorage);
      const restoredProtocols = readProtocols(localStorage);
      const restoredProtocolOccurrences = readProtocolOccurrences(localStorage);
      const restoredProtocolCompoundOutcomes = readProtocolCompoundOutcomes(localStorage);
      const restoredMedicationDoseSchedules = readMedicationDoseSchedules(localStorage);
      const restoredMedicationDoseOccurrences = readMedicationDoseOccurrences(localStorage);
      const restoredMedicationCompounds = readCompoundDefinitions(localStorage);
      const restoredInjectionSiteData = readInjectionSiteData(localStorage, restoredProtocols);
      const restoredInjectionSiteSettings = readInjectionSiteSettings(localStorage);
      const restoredWorkoutDraft = readWorkoutDraft(localStorage);
      const restoredWorkoutEntries = (await Promise.resolve(readStoredWorkoutEntries(localStorage, {
        getDatabase: ensurePhotoDatabase,
        onCreateObjectUrl: (url) => activeObjectUrlsRef.current.add(url),
      }))) || [];
      setAppSettings(restoredAppSettings);
      setJournalEntries(restoredJournalEntries);
      setJournalPrivacy({
        enabled: restoredJournalPrivacyState.enabled,
        unlocked: false,
        malformed: restoredJournalPrivacyState.malformed,
        recoveryFormat: restoredJournalPrivacyState.recoveryFormat,
      });
      setMedicationEntries(restoredMedicationEntries);
      setMedicationCompounds(restoredMedicationCompounds);
      setMedicationDoseSchedules(restoredMedicationDoseSchedules);
      setMedicationDoseOccurrences(restoredMedicationDoseOccurrences);
      setPlannedWorkouts(restoredPlannedWorkouts);
      setDailyActions(restoredDailyActions);
      setProtocols(restoredProtocols);
      setProtocolOccurrences(restoredProtocolOccurrences);
      setProtocolCompoundOutcomes(restoredProtocolCompoundOutcomes);
      setInjectionSiteData(restoredInjectionSiteData);
      setInjectionSiteSettings(restoredInjectionSiteSettings);
      setActiveWorkoutDraft(restoredWorkoutDraft);
      setWorkoutEntries(restoredWorkoutEntries);
      setStorageError("");
    } catch (error) {
      setStorageError(storageMessage("refresh restored data"));
    }
  }

  function updateHealthMeasurement(id, draft) {
    const existing = healthMeasurementEntries.find((entry) => entry.id === id);
    if (!existing) return false;
    const result = updateHealthMeasurementEntry(existing, draft);
    if (result.error) return false;
    const updatedEntries = healthMeasurementEntries.map((entry) => entry.id === id ? result.value : entry);
    try {
      writeHealthMeasurementEntries(localStorage, updatedEntries);
      setHealthMeasurementEntries(updatedEntries);
      setStorageError("");
      return result.value;
    } catch (error) {
      setStorageError(storageMessage("update this Health measurement"));
      return false;
    }
  }

  function deleteHealthMeasurement(id) {
    const updatedEntries = healthMeasurementEntries.filter((entry) => entry.id !== id);
    try {
      writeHealthMeasurementEntries(localStorage, updatedEntries);
      setHealthMeasurementEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this Health measurement"));
      return false;
    }
  }

  function saveUserFood({ name, nutrients, serving, brand, category, notes }) {
    const userFood = createUserFood(name, nutrients, serving, {
      brand,
      category,
      notes,
    });
    const result = addUserFood(userFoods, userFood);

    if (!result.added) {
      return {
        status: "duplicate",
        food: result.existingFood,
        matchesDefinition: result.matchesDefinition,
      };
    }

    try {
      writeUserFoods(localStorage, result.foods);
      setUserFoods(result.foods);
      setStorageError("");
      return {
        status: "added",
        food: userFood,
        matchesDefinition: true,
      };
    } catch (error) {
      setStorageError(storageMessage("save this reusable food"));
      return { status: "error", food: null, matchesDefinition: false };
    }
  }

  function updateNutritionEntry(id, entry) {
    const updatedEntries = nutritionEntries.map((existingEntry) =>
      existingEntry.id === id
        ? { ...existingEntry, ...entry, id: existingEntry.id }
        : existingEntry
    );

    try {
      localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
      setNutritionEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("update this nutrition entry"));
      return false;
    }
  }

  function deleteNutritionEntry(id) {
    const updatedEntries = nutritionEntries.filter((entry) => entry.id !== id);

    try {
      localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
      setNutritionEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this nutrition entry"));
      return false;
    }
  }

  function saveNutritionGoals(goals) {
    const updatedGoals = {
      calories: toNonNegativeNumber(goals.calories),
      protein: toNonNegativeNumber(goals.protein),
      carbohydrates: toNonNegativeNumber(goals.carbohydrates),
      fat: toNonNegativeNumber(goals.fat),
      sodium: toNonNegativeNumber(goals.sodium),
    };

    try {
      localStorage.setItem("nutritionGoals", JSON.stringify(updatedGoals));
      setNutritionGoals(updatedGoals);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save these nutrition goals"));
      return false;
    }
  }

  function saveMedicationEntry(entry) {
    const newEntry = {
      ...entry,
      id: createId(new Set(medicationEntries.map((item) => item.id))),
    };
    const updatedEntries = [...medicationEntries, newEntry];

    try {
      localStorage.setItem(
        "medicationEntries",
        JSON.stringify(updatedEntries)
      );
      setMedicationEntries(updatedEntries);
      showConfirmation(medicationEntryConfirmation(newEntry));
      setStorageError("");
      return newEntry;
    } catch (error) {
      setStorageError(storageMessage("save this medication entry"));
      return false;
    }
  }

  function saveCompoundDefinition(draft) {
    const compound = createCompoundDefinition(draft);
    const result = addCompoundDefinition(medicationCompounds, compound);

    if (!result.added) {
      return {
        status: "duplicate",
        compound: result.existingCompound,
        matchesDefinition: result.matchesDefinition,
      };
    }

    try {
      writeCompoundDefinitions(localStorage, result.compounds);
      setMedicationCompounds(result.compounds);
      setStorageError("");
      return {
        status: "added",
        compound,
        matchesDefinition: true,
      };
    } catch (error) {
      setStorageError(storageMessage("save this reusable compound"));
      return { status: "error", compound: null, matchesDefinition: false };
    }
  }

  function updateSavedCompound(id, draft) {
    const result = updateCompoundInCatalog(
      medicationCompounds,
      id,
      draft
    );

    if (result.error) {
      return { status: "invalid", message: result.error };
    }

    try {
      writeCompoundDefinitions(localStorage, result.compounds);
      setMedicationCompounds(result.compounds);
      setStorageError("");
      return { status: "updated", compound: result.updatedCompound };
    } catch (error) {
      setStorageError(storageMessage("update this reusable compound"));
      return {
        status: "error",
        message: "The saved compound could not be updated.",
      };
    }
  }

  function updateMedicationEntry(id, entry) {
    const updatedEntries = medicationEntries.map((existingEntry) =>
      existingEntry.id === id
        ? { ...existingEntry, ...entry, id: existingEntry.id }
        : existingEntry
    );

    try {
      localStorage.setItem(
        "medicationEntries",
        JSON.stringify(updatedEntries)
      );
      setMedicationEntries(updatedEntries);
      showConfirmation(medicationEntryConfirmation(entry, true));
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("update this medication entry"));
      return false;
    }
  }

  function deleteMedicationEntry(id) {
    const updatedEntries = medicationEntries.filter((entry) => entry.id !== id);

    try {
      localStorage.setItem(
        "medicationEntries",
        JSON.stringify(updatedEntries)
      );
      setMedicationEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this medication entry"));
      return false;
    }
  }

  function saveProtocol(draft) {
    const protocol = createProtocol(draft);
    if (!protocol) {
      return { status: "invalid", message: getProtocolError(draft) };
    }
    const updatedProtocols = [...protocols, protocol];
    try {
      writeProtocols(localStorage, updatedProtocols);
      setProtocols(updatedProtocols);
      showConfirmation("Protocol traced");
      setStorageError("");
      return { status: "saved", protocol };
    } catch (error) {
      setStorageError(storageMessage("save this protocol"));
      return { status: "error", message: "The protocol could not be saved." };
    }
  }

  function updateProtocol(id, draft) {
    const existing = protocols.find((protocol) => protocol.id === id);
    if (!existing || existing.status !== "active") {
      return { status: "invalid", message: "Only an active protocol can be edited." };
    }
    const protocol = createProtocol(draft, existing);
    if (!protocol) {
      return { status: "invalid", message: getProtocolError(draft) };
    }
    const updatedProtocols = protocols.map((item) => item.id === id ? protocol : item);
    try {
      writeProtocols(localStorage, updatedProtocols);
      setProtocols(updatedProtocols);
      showConfirmation("Protocol updated");
      setStorageError("");
      return { status: "saved", protocol };
    } catch (error) {
      setStorageError(storageMessage("update this protocol"));
      return { status: "error", message: "The protocol could not be updated." };
    }
  }

  function finishProtocol(id) {
    const existing = protocols.find((protocol) => protocol.id === id);
    const ended = createEndedProtocol(existing);
    if (!ended) return false;
    const updatedProtocols = protocols.map((item) => item.id === id ? ended : item);
    try {
      writeProtocols(localStorage, updatedProtocols);
      setProtocols(updatedProtocols);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("end this protocol"));
      return false;
    }
  }

  function deleteProtocol(id) {
    const updatedProtocols = protocols.filter((protocol) => protocol.id !== id);
    try {
      writeProtocols(localStorage, updatedProtocols);
      setProtocols(updatedProtocols);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this protocol"));
      return false;
    }
  }

  function createPlannedWorkout(draft) {
    const plannedWorkout = createPlannedWorkoutRecord(draft);
    if (!plannedWorkout) {
      return { status: "invalid", message: getPlannedWorkoutError(draft) };
    }
    if (plannedWorkouts.some(({ id }) => id === plannedWorkout.id)) {
      return {
        status: "invalid",
        message: "A planned workout already uses that ID.",
      };
    }
    try {
      const saved = writePlannedWorkouts(localStorage, [
        ...plannedWorkouts,
        plannedWorkout,
      ]);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "saved", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("save this planned workout"));
      return {
        status: "error",
        message: "The planned workout could not be saved.",
      };
    }
  }

  function updatePlannedWorkout(id, draft) {
    const existing = plannedWorkouts.find((plannedWorkout) => plannedWorkout.id === id);
    const plannedWorkout = updatePlannedWorkoutRecord(existing, draft);
    if (!plannedWorkout) {
      return { status: "invalid", message: getPlannedWorkoutError(draft) };
    }
    const updated = plannedWorkouts.map((item) =>
      item.id === id ? plannedWorkout : item
    );
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "saved", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("update this planned workout"));
      return {
        status: "error",
        message: "The planned workout could not be updated.",
      };
    }
  }

  function appendPlannedWorkoutExercise(id, exerciseDraft) {
    const existing = plannedWorkouts.find((plannedWorkout) => plannedWorkout.id === id);
    const plannedWorkout = appendExerciseToPlannedWorkout(existing, exerciseDraft);
    if (!plannedWorkout) {
      return {
        status: "invalid",
        message: "The exercise could not be added to this planned workout.",
      };
    }
    const updated = plannedWorkouts.map((item) =>
      item.id === id ? plannedWorkout : item
    );
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "saved", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("add this planned exercise"));
      return {
        status: "error",
        message: "The exercise could not be added to this planned workout.",
      };
    }
  }

  function removePlannedWorkoutExercise(id, exerciseId) {
    const existing = plannedWorkouts.find((plannedWorkout) => plannedWorkout.id === id);
    const plannedWorkout = removeExerciseFromPlannedWorkout(existing, exerciseId);
    if (!plannedWorkout) {
      return {
        status: "invalid",
        message: "The exercise could not be removed from this planned workout.",
      };
    }
    const updated = plannedWorkouts.map((item) =>
      item.id === id ? plannedWorkout : item
    );
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "saved", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("remove this planned exercise"));
      return {
        status: "error",
        message: "The exercise could not be removed from this planned workout.",
      };
    }
  }

  function deletePlannedWorkout(id) {
    if (!plannedWorkouts.some((plannedWorkout) => plannedWorkout.id === id)) {
      return false;
    }
    const updated = plannedWorkouts.filter((plannedWorkout) => plannedWorkout.id !== id);
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this planned workout"));
      return false;
    }
  }

  function saveMedicationDoseSchedule(draft, duplicateConfirmed = false) {
    const schedule = createMedicationDoseSchedule(draft);
    if (!schedule) {
      return { status: "invalid", message: getMedicationDoseScheduleError(draft) };
    }
    const duplicate = findMedicationDoseDuplicate(
      medicationDoseSchedules,
      medicationDoseOccurrences,
      schedule
    );
    if (duplicate && !duplicateConfirmed) return { status: "duplicate", duplicate };
    try {
      const saved = writeMedicationDoseSchedules(localStorage, [
        ...medicationDoseSchedules,
        schedule,
      ]);
      setMedicationDoseSchedules(saved);
      setStorageError("");
      showConfirmation("Dose scheduled");
      return { status: "saved", schedule };
    } catch (error) {
      setStorageError(storageMessage("schedule this dose"));
      return { status: "error", message: "The dose schedule could not be saved." };
    }
  }

  function updateMedicationDoseSeries(id, draft, duplicateConfirmed = false) {
    const existing = medicationDoseSchedules.find((schedule) => schedule.id === id);
    const effectiveFrom = medicationDoseDateKey();
    const schedule = createUpdatedMedicationDoseSchedule(
      existing,
      draft,
      effectiveFrom
    );
    if (!schedule) {
      return { status: "invalid", message: getMedicationDoseScheduleError(draft) };
    }
    const duplicate = findMedicationDoseDuplicate(
      medicationDoseSchedules,
      medicationDoseOccurrences,
      schedule,
      { excludeScheduleId: id }
    );
    if (duplicate && !duplicateConfirmed) return { status: "duplicate", duplicate };
    const updated = medicationDoseSchedules.map((item) => item.id === id ? schedule : item);
    try {
      const saved = writeMedicationDoseSchedules(localStorage, updated);
      setMedicationDoseSchedules(saved);
      setStorageError("");
      showConfirmation("Dose schedule updated");
      return { status: "saved", schedule };
    } catch (error) {
      setStorageError(storageMessage("update this dose schedule"));
      return { status: "error", message: "The dose schedule could not be updated." };
    }
  }

  function endMedicationDoseSeries(id) {
    const existing = medicationDoseSchedules.find((schedule) => schedule.id === id);
    const schedule = createEndedMedicationDoseSchedule(existing, medicationDoseDateKey());
    if (!schedule) return false;
    try {
      const saved = writeMedicationDoseSchedules(
        localStorage,
        medicationDoseSchedules.map((item) => item.id === id ? schedule : item)
      );
      setMedicationDoseSchedules(saved);
      setStorageError("");
      showConfirmation("Dose schedule ended");
      return true;
    } catch (error) {
      setStorageError(storageMessage("end this dose schedule"));
      return false;
    }
  }

  function deleteMedicationDoseSeries(id) {
    const existing = medicationDoseSchedules.find((schedule) => schedule.id === id);
    const schedule = createDeletedMedicationDoseSchedule(existing, medicationDoseDateKey());
    if (!schedule) return false;
    try {
      const saved = writeMedicationDoseSchedules(
        localStorage,
        medicationDoseSchedules.map((item) => item.id === id ? schedule : item)
      );
      setMedicationDoseSchedules(saved);
      setStorageError("");
      showConfirmation("Dose schedule deleted");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this dose schedule"));
      return false;
    }
  }

  function medicationDoseActionIsAllowed(item, activeOnly = false) {
    const schedule = medicationDoseSchedules.find(({ id }) => id === item?.scheduleId);
    if (!schedule || schedule.status === "deleted") return false;
    if (activeOnly && schedule.status !== "active") return false;
    if (!schedule.inactiveFrom) return true;
    return schedule.status === "ended"
      ? item.scheduledDate <= schedule.inactiveFrom
      : item.scheduledDate < schedule.inactiveFrom;
  }

  function completeScheduledMedicationDose(item) {
    if (!medicationDoseActionIsAllowed(item)) {
      return { status: "error", message: "This dose is no longer available because its schedule ended or was deleted." };
    }
    try {
      const result = persistMedicationDoseCompletion({
        storage: localStorage,
        medicationEntries,
        occurrences: medicationDoseOccurrences,
        item,
      });
      if (!result) {
        return { status: "error", message: "The scheduled dose could not be completed." };
      }
      if (!result.alreadyCompleted) {
        setMedicationEntries(result.medicationEntries);
        setMedicationDoseOccurrences(result.occurrences);
      }
      setStorageError("");
      return { status: "saved", occurrence: result.occurrence, historyEntry: result.historyEntry };
    } catch (error) {
      setStorageError(storageMessage("complete this scheduled dose"));
      return { status: "error", message: error.message || "The scheduled dose could not be completed." };
    }
  }

  function undoCompletedScheduledMedicationDose(item) {
    try {
      const result = persistMedicationDoseCompletionUndo({
        storage: localStorage,
        medicationEntries,
        occurrences: medicationDoseOccurrences,
        item,
      });
      if (!result) {
        return { status: "error", message: "The medication dose completion could not be undone." };
      }
      if (!result.alreadyUndone) {
        setMedicationEntries(result.medicationEntries);
        setMedicationDoseOccurrences(result.occurrences);
      }
      setStorageError("");
      return { status: "saved", occurrence: result.occurrence };
    } catch (error) {
      setStorageError(storageMessage("undo this medication dose completion"));
      return {
        status: "error",
        message: error.message || "The medication dose completion could not be undone.",
      };
    }
  }

  function saveMedicationDoseOccurrence(occurrence, action) {
    const updated = occurrence && upsertMedicationDoseOccurrence(
      medicationDoseOccurrences,
      occurrence
    );
    if (!updated) return { status: "error", message: `The scheduled dose could not be ${action}.` };
    try {
      const saved = writeMedicationDoseOccurrences(localStorage, updated);
      setMedicationDoseOccurrences(saved);
      setStorageError("");
      return { status: "saved", occurrence };
    } catch (error) {
      setStorageError(storageMessage(`${action} this scheduled dose`));
      return { status: "error", message: `The scheduled dose could not be ${action}.` };
    }
  }

  function skipScheduledMedicationDose(item, reason = "", customReason = "") {
    if (!medicationDoseActionIsAllowed(item)) {
      return { status: "error", message: "This dose is no longer available because its schedule ended or was deleted." };
    }
    return saveMedicationDoseOccurrence(
      createSkippedMedicationDoseOccurrence(item, reason, customReason),
      "skipped"
    );
  }

  function rescheduleScheduledMedicationDose(item, date, time, duplicateConfirmed = false) {
    if (!medicationDoseActionIsAllowed(item, true)) {
      return { status: "error", message: "Only an active dose schedule can be rescheduled." };
    }
    const duplicate = findMedicationDoseOccurrenceDuplicate(
      medicationDoseSchedules,
      medicationDoseOccurrences,
      { ...item, scheduledDate: date, time },
      { excludeOccurrenceId: item.id }
    );
    if (duplicate && !duplicateConfirmed) return { status: "duplicate", duplicate };
    return saveMedicationDoseOccurrence(
      createRescheduledMedicationDoseOccurrence(item, date, time),
      "rescheduled"
    );
  }

  function removeScheduledMedicationDose(item) {
    if (!medicationDoseActionIsAllowed(item)) {
      return { status: "error", message: "This dose is no longer available because its schedule ended or was deleted." };
    }
    return saveMedicationDoseOccurrence(
      createRemovedMedicationDoseOccurrence(item),
      "removed"
    );
  }

  function restorePlannedWorkout(plannedWorkout, originalIndex) {
    if (plannedWorkouts.some(({ id }) => id === plannedWorkout?.id)) {
      return {
        status: "conflict",
        message: "The planned workout could not be restored because its ID is already in use.",
      };
    }
    const updated = restorePlannedWorkoutAtIndex(
      plannedWorkouts,
      plannedWorkout,
      originalIndex
    );
    if (!updated) {
      return {
        status: "invalid",
        message: "The planned workout could not be restored.",
      };
    }
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "restored", plannedWorkout: saved[originalIndex] };
    } catch (error) {
      setStorageError(storageMessage("restore this planned workout"));
      return {
        status: "error",
        message: "The planned workout could not be restored.",
      };
    }
  }

  function skipPlannedWorkout(id, date, reason = "") {
    const existing = plannedWorkouts.find((plannedWorkout) => plannedWorkout.id === id);
    const plannedWorkout = skipPlannedWorkoutForDate(
      existing,
      date,
      new Date(),
      reason
    );
    if (!plannedWorkout) {
      return {
        status: "invalid",
        message: "The planned workout could not be skipped.",
      };
    }
    const updated = plannedWorkouts.map((item) =>
      item.id === id ? plannedWorkout : item
    );
    try {
      const saved = writePlannedWorkouts(localStorage, updated);
      setPlannedWorkouts(saved);
      setStorageError("");
      return { status: "skipped", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("skip this planned workout"));
      return {
        status: "error",
        message: "The planned workout could not be skipped.",
      };
    }
  }

  function saveDailyAction(draft) {
    const dailyAction = createDailyActionRecord(draft);
    if (!dailyAction) {
      return { status: "invalid", message: getDailyActionError(draft) };
    }
    try {
      const saved = writeDailyActions(localStorage, [...dailyActions, dailyAction]);
      setDailyActions(saved);
      setStorageError("");
      return { status: "saved", dailyAction };
    } catch (error) {
      setStorageError(storageMessage("save this daily action"));
      return { status: "error", message: "The daily action could not be saved." };
    }
  }

  function updateDailyAction(id, draft) {
    const existing = dailyActions.find((action) => action.id === id);
    const dailyAction = updateDailyActionRecord(existing, draft);
    if (!dailyAction) {
      return { status: "invalid", message: getDailyActionError(draft) };
    }
    try {
      const saved = writeDailyActions(localStorage, dailyActions.map((action) =>
        action.id === id ? dailyAction : action
      ));
      setDailyActions(saved);
      setStorageError("");
      return { status: "saved", dailyAction };
    } catch (error) {
      setStorageError(storageMessage("update this daily action"));
      return { status: "error", message: "The daily action could not be updated." };
    }
  }

  function deleteDailyAction(id) {
    if (!dailyActions.some((action) => action.id === id)) return false;
    try {
      const saved = writeDailyActions(localStorage, dailyActions.filter((action) => action.id !== id));
      setDailyActions(saved);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this daily action"));
      return false;
    }
  }

  function completeDailyAction(id) {
    const existing = dailyActions.find((action) => action.id === id);
    const dailyAction = createCompletedDailyAction(existing);
    if (!dailyAction) return { status: "error", message: "The daily action could not be completed." };
    try {
      const saved = writeDailyActions(localStorage, dailyActions.map((action) =>
        action.id === id ? dailyAction : action
      ));
      setDailyActions(saved);
      setStorageError("");
      return { status: "saved", dailyAction };
    } catch (error) {
      setStorageError(storageMessage("complete this daily action"));
      return { status: "error", message: "The daily action could not be completed." };
    }
  }

  function skipDailyAction(id, reason = "", customReason = "") {
    const existing = dailyActions.find((action) => action.id === id);
    const dailyAction = createSkippedDailyAction(existing, reason, customReason);
    if (!dailyAction) return { status: "error", message: "The daily action could not be skipped." };
    try {
      const saved = writeDailyActions(localStorage, dailyActions.map((action) =>
        action.id === id ? dailyAction : action
      ));
      setDailyActions(saved);
      setStorageError("");
      return { status: "saved", dailyAction };
    } catch (error) {
      setStorageError(storageMessage("skip this daily action"));
      return { status: "error", message: "The daily action could not be skipped." };
    }
  }

  function saveProtocolOccurrenceStatus(protocolId, itemId, date, status, reason = "", customReason = "") {
    const identity = { protocolId, itemId, date };
    const existing = findProtocolOccurrence(protocolOccurrences, protocolId, itemId, date);
    const occurrence = status === "completed"
      ? createCompletedProtocolOccurrence(existing, identity)
      : createSkippedProtocolOccurrence(existing, identity, reason, customReason);
    const updated = occurrence && upsertProtocolOccurrence(protocolOccurrences, occurrence);
    if (!updated) {
      return { status: "error", message: "The protocol occurrence status could not be saved." };
    }
    try {
      const saved = writeProtocolOccurrences(localStorage, updated);
      setProtocolOccurrences(saved);
      setStorageError("");
      return { status: "saved", occurrence };
    } catch (error) {
      setStorageError(storageMessage("save this protocol occurrence status"));
      return { status: "error", message: "The protocol occurrence status could not be saved." };
    }
  }

  function completeProtocolOccurrence(protocolId, itemId, date) {
    return saveProtocolOccurrenceStatus(protocolId, itemId, date, "completed");
  }

  function skipProtocolOccurrence(protocolId, itemId, date, reason = "", customReason = "") {
    return saveProtocolOccurrenceStatus(protocolId, itemId, date, "skipped", reason, customReason);
  }

  function saveProtocolCompoundResults(candidate, decisions) {
    try {
      const result = persistProtocolCompoundResults({
        storage: localStorage,
        outcomes: protocolCompoundOutcomes,
        protocolOccurrences,
        medicationEntries,
        candidate,
        decisions,
      });
      if (!result) {
        return { status: "error", message: "The Protocol compound results could not be saved." };
      }
      setMedicationEntries(result.medicationEntries);
      setProtocolCompoundOutcomes(result.outcomes);
      setProtocolOccurrences(result.protocolOccurrences);
      setStorageError("");
      return { status: "saved", outcome: result.outcome, completionStatus: result.status };
    } catch (error) {
      setStorageError(storageMessage("save these Protocol compound results"));
      return { status: "error", message: error.message || "The Protocol compound results could not be saved." };
    }
  }

  function undoProtocolCompoundResult(outcomeId, componentId) {
    try {
      const result = persistProtocolCompoundUndo({
        storage: localStorage,
        outcomes: protocolCompoundOutcomes,
        protocolOccurrences,
        medicationEntries,
        outcomeId,
        componentId,
      });
      if (!result) {
        return { status: "error", message: "The Protocol compound result could not be undone." };
      }
      if (!result.alreadyUndone) {
        setMedicationEntries(result.medicationEntries);
        setProtocolCompoundOutcomes(result.outcomes);
        setProtocolOccurrences(result.protocolOccurrences);
      }
      setStorageError("");
      return { status: "saved", outcome: result.outcome };
    } catch (error) {
      setStorageError(storageMessage("undo this Protocol compound result"));
      return { status: "error", message: error.message || "The Protocol compound result could not be undone." };
    }
  }

  function saveInjectionSession(draft) {
    const created = createInjectionSession(draft);
    const updated = created && appendInjectionSession(injectionSiteData, created);
    if (!updated) return { status: "invalid", message: "Complete every shot before saving this session." };
    try {
      const saved = writeInjectionSiteData(localStorage, updated);
      setInjectionSiteData(saved);
      const count = created.shots.length;
      showConfirmation(`${count} ${count === 1 ? "shot" : "shots"} traced`, "protocols");
      setStorageError("");
      return { status: "saved", session: created.session, shots: created.shots };
    } catch (error) {
      setStorageError(storageMessage("save this injection session"));
      return { status: "error", message: "No shots were saved. The injection session could not be stored." };
    }
  }

  function updateInjectionShot(id, draft, occurredAt) {
    const updated = updateInjectionShotData(injectionSiteData, id, draft, occurredAt);
    if (!updated) return { status: "invalid", message: "The shot could not be updated." };
    try {
      const saved = writeInjectionSiteData(localStorage, updated);
      setInjectionSiteData(saved);
      showConfirmation("Injection updated", "protocols");
      setStorageError("");
      return { status: "saved", shot: saved.shots.find((shot) => shot.id === id) };
    } catch (error) {
      setStorageError(storageMessage("update this injection"));
      return { status: "error", message: "The shot could not be updated." };
    }
  }

  function deleteInjectionShot(id) {
    const updated = deleteInjectionShotData(injectionSiteData, id);
    if (!updated) return false;
    try {
      const saved = writeInjectionSiteData(localStorage, updated);
      setInjectionSiteData(saved);
      showConfirmation("Injection deleted", "protocols");
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this injection"));
      return false;
    }
  }

  function updateInjectionBodyStyle(bodyStyleId) {
    try {
      const saved = writeInjectionSiteSettings(localStorage, {
        ...injectionSiteSettings,
        bodyStyleId,
      });
      setInjectionSiteSettings(saved);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save this injection body style"));
      return false;
    }
  }

  function startPlannedWorkout(id, conflictAction = null, navigationContext = null) {
    const plannedWorkout = plannedWorkouts.find((plan) => plan.id === id);
    if (!plannedWorkout) {
      return {
        status: "error",
        message: "The planned workout could not be found.",
      };
    }
    const completedWorkout = workoutEntries.find(
      (entry) => entry.plannedWorkoutId === id
    );
    if (completedWorkout) {
      return { status: "completed", workoutEntry: completedWorkout };
    }

    const existingDraft = readWorkoutDraft(localStorage);
    const originPage = navigationContext?.originPage === "calendar" ? "calendar" : "today";
    const originCalendar = originPage === "calendar" ? {
      selectedDate: navigationContext.selectedDate,
      visibleMonth: navigationContext.visibleMonth,
    } : null;
    const draftWithOrigin = (draft) => {
      const context = { ...(draft.context || {}), originPage };
      if (originCalendar) {
        context.selectedDate = originCalendar.selectedDate;
        context.visibleMonth = originCalendar.visibleMonth;
      } else {
        delete context.selectedDate;
        delete context.visibleMonth;
      }
      return { ...draft, context };
    };
    if (existingDraft?.plannedWorkoutId === id) {
      const resumedDraft = draftWithOrigin(existingDraft);
      try {
        writeWorkoutDraft(localStorage, resumedDraft);
      } catch (error) {
        setStorageError(storageMessage("preserve this workout's schedule return"));
        return { status: "error", message: "The workout return context could not be saved." };
      }
      setActiveWorkoutDraft(resumedDraft);
      setWorkoutEntryTargetId(null);
      setWorkoutOriginPage(originPage);
      setWorkoutOriginCalendar(originCalendar);
      setPage("workouts");
      return { status: "resumed", plannedWorkout };
    }
    if (existingDraft && conflictAction === null) {
      return {
        status: "draft-conflict",
        existingDraftTitle: existingDraft.form.title || "Untitled workout",
      };
    }
    if (existingDraft && conflictAction === "resume") {
      const resumedDraft = draftWithOrigin(existingDraft);
      try {
        writeWorkoutDraft(localStorage, resumedDraft);
      } catch (error) {
        setStorageError(storageMessage("preserve this workout's schedule return"));
        return { status: "error", message: "The workout return context could not be saved." };
      }
      setActiveWorkoutDraft(resumedDraft);
      setWorkoutEntryTargetId(null);
      setWorkoutOriginPage(originPage);
      setWorkoutOriginCalendar(originCalendar);
      setPage("workouts");
      return { status: "resumed-existing" };
    }
    if (existingDraft && conflictAction !== "discard") {
      return { status: "cancelled" };
    }

    const workoutDraft = createWorkoutDraftFromPlannedWorkout(
      plannedWorkout,
      new Date(),
      {
        originPage,
        selectedDate: originCalendar?.selectedDate,
        visibleMonth: originCalendar?.visibleMonth,
      }
    );
    if (!workoutDraft) {
      return {
        status: "error",
        message: "The planned workout could not be opened.",
      };
    }
    try {
      writeWorkoutDraft(localStorage, workoutDraft);
      setActiveWorkoutDraft(workoutDraft);
      setWorkoutEntryTargetId(null);
      setWorkoutOriginPage(originPage);
      setWorkoutOriginCalendar(originCalendar);
      setStorageError("");
      setPage("workouts");
      return { status: "started", plannedWorkout };
    } catch (error) {
      setStorageError(storageMessage("start this planned workout"));
      return {
        status: "error",
        message: "The planned workout could not be started.",
      };
    }
  }

  function openCompletedWorkout(id, navigationContext = null) {
    if (!workoutEntries.some((entry) => entry.id === id)) return false;
    skipNextPageTopScrollRef.current = true;
    setWorkoutEntryTargetId(id);
    const originPage = navigationContext?.originPage === "calendar" ? "calendar" : "today";
    setWorkoutOriginPage(originPage);
    setWorkoutOriginCalendar(originPage === "calendar" ? {
      selectedDate: navigationContext.selectedDate,
      visibleMonth: navigationContext.visibleMonth,
    } : null);
    setPage("workouts");
    return true;
  }

  async function prepareWorkoutPhotos(entry, workoutId, existingEntry = null) {
    const incomingPhotos = entry.photos || [];
    const existingPhotos = existingEntry?.photos || [];
    if (incomingPhotos.length === 0 && existingPhotos.length === 0) {
      return { prepared: [], newIds: [], removed: [] };
    }
    const database = await ensurePhotoDatabase();
    const existingById = new Map(existingPhotos.filter(({ id }) => id).map((photo) => [photo.id, photo]));
    const newRecords = [];
    const prepared = [];
    for (const photo of incomingPhotos) {
      if (photo.id && existingById.has(photo.id)) { prepared.push(existingById.get(photo.id)); continue; }
      if (!photo.blob) continue;
      const id = createId(new Set([...existingById.keys(), ...newRecords.map((record) => record.id)]));
      newRecords.push({ id, workoutId, blob: photo.blob });
      const url = URL.createObjectURL(photo.blob);
      activeObjectUrlsRef.current.add(url);
      prepared.push({ id, url });
    }
    await putPhotos(database, newRecords);
    const retained = new Set(prepared.map(({ id }) => id));
    const removed = existingPhotos.filter(({ id }) => id && !retained.has(id));
    return { prepared, newIds: newRecords.map(({ id }) => id), removed };
  }

  function saveWorkoutEntry(entry) {
    const plannedWorkoutId = entry.plannedWorkoutId || null;
    if (
      plannedWorkoutId &&
      (
        completedPlannedWorkoutIdsRef.current.has(plannedWorkoutId) ||
        pendingPlannedWorkoutIdsRef.current.has(plannedWorkoutId)
      )
    ) {
      setStorageError(
        "This planned workout is already linked to a completed workout. Trace did not create a duplicate."
      );
      return false;
    }
    if (plannedWorkoutId) {
      pendingPlannedWorkoutIdsRef.current.add(plannedWorkoutId);
    }
    const finishPlannedWorkoutSave = (saved) => {
      if (!plannedWorkoutId) return;
      pendingPlannedWorkoutIdsRef.current.delete(plannedWorkoutId);
      if (saved) completedPlannedWorkoutIdsRef.current.add(plannedWorkoutId);
    };
    const id = createId(new Set(workoutEntries.map((item) => item.id)));
    const persist = async (photoResult) => {
      const newEntry = {
        ...entry,
        id,
        ...(photoResult.prepared.length ? { photos: photoResult.prepared } : {}),
      };
      const updatedEntries = [...workoutEntries, newEntry];
      try {
        localStorage.setItem("workoutEntries", JSON.stringify(workoutMetadata(updatedEntries)));
        setWorkoutEntries(updatedEntries);
        setStorageError("");
        finishPlannedWorkoutSave(true);
        return true;
      } catch (error) {
        if (photoResult.newIds.length) {
          await Promise.resolve(deletePhotos(photoDatabaseRef.current, photoResult.newIds)).catch(() => {});
        }
        setStorageError(storageMessage("save this workout"));
        finishPlannedWorkoutSave(false);
        return false;
      }
    };
    if (!(entry.photos || []).length) {
      const newEntry = { ...entry, id };
      const updatedEntries = [...workoutEntries, newEntry];
      try {
        localStorage.setItem("workoutEntries", JSON.stringify(workoutMetadata(updatedEntries)));
        setWorkoutEntries(updatedEntries);
        setStorageError("");
        finishPlannedWorkoutSave(true);
        return true;
      } catch (error) {
        setStorageError(storageMessage("save this workout"));
        finishPlannedWorkoutSave(false);
        return false;
      }
    }
    return prepareWorkoutPhotos(entry, id)
      .then(persist)
      .catch(() => {
        setStorageError(storageMessage("save these workout photos"));
        finishPlannedWorkoutSave(false);
        return false;
      });
  }

  function saveExerciseDefinitions(drafts) {
    let nextExercises = savedExercises;
    let addedAny = false;
    const results = drafts.map((draft) => {
      const definition = createExerciseDefinition(draft);
      const result = addExerciseDefinition(nextExercises, definition);
      if (result.added) {
        nextExercises = result.exercises;
        addedAny = true;
        return {
          status: "added",
          exercise: definition,
          matchesDefinition: true,
        };
      }
      return {
        status: "duplicate",
        exercise: result.existingExercise,
        matchesDefinition: result.matchesDefinition,
      };
    });

    if (!addedAny) return results;
    try {
      writeSavedExercises(localStorage, nextExercises);
      setSavedExercises(nextExercises);
      setStorageError("");
      return results;
    } catch (error) {
      setStorageError(storageMessage("save these reusable exercises"));
      return results.map((result) =>
        result.status === "added"
          ? {
              status: "error",
              exercise: null,
              matchesDefinition: false,
            }
          : result
      );
    }
  }

  function updateSavedExercise(id, draft) {
    const result = updateExerciseInCatalog(savedExercises, id, draft);
    if (result.error) {
      return { status: "invalid", message: result.error };
    }
    try {
      writeSavedExercises(localStorage, result.exercises);
      setSavedExercises(result.exercises);
      setStorageError("");
      return { status: "updated", exercise: result.updatedExercise };
    } catch (error) {
      setStorageError(storageMessage("update this reusable exercise"));
      return {
        status: "error",
        message: "The saved exercise could not be updated.",
      };
    }
  }

  function updateWorkoutEntry(id, entry) {
    const existingEntry = workoutEntries.find((item) => item.id === id);
    const hasPhotos = (entry.photos || []).length > 0 || (existingEntry?.photos || []).length > 0;
    if (!hasPhotos) {
      const updatedEntries = workoutEntries.map((item) => item.id === id ? { ...item, ...entry, id: item.id } : item);
      try {
        localStorage.setItem("workoutEntries", JSON.stringify(workoutMetadata(updatedEntries)));
        setWorkoutEntries(updatedEntries);
        setStorageError("");
        return true;
      } catch (error) {
        setStorageError(storageMessage("update this workout"));
        return false;
      }
    }
    return prepareWorkoutPhotos(entry, id, existingEntry).then(async (photoResult) => {
      const updatedEntries = workoutEntries.map((item) => item.id === id
        ? { ...item, ...entry, photos: photoResult.prepared, id: item.id }
        : item);
      try {
        localStorage.setItem("workoutEntries", JSON.stringify(workoutMetadata(updatedEntries)));
        setWorkoutEntries(updatedEntries);
        const removedIds = photoResult.removed.map(({ id }) => id);
        if (removedIds.length) await Promise.resolve(deletePhotos(photoDatabaseRef.current, removedIds)).catch(() => setStorageError("The workout was saved, but Trace couldn't clean up removed photos."));
        photoResult.removed.forEach(({ url }) => { if (url) { URL.revokeObjectURL(url); activeObjectUrlsRef.current.delete(url); } });
        setStorageError("");
        return true;
      } catch (error) {
        if (photoResult.newIds.length) await Promise.resolve(deletePhotos(photoDatabaseRef.current, photoResult.newIds)).catch(() => {});
        setStorageError(storageMessage("update this workout"));
        return false;
      }
    }).catch(() => {
      setStorageError(storageMessage("update these workout photos"));
      return false;
    });
  }

  function deleteWorkoutEntry(id) {
    const updatedEntries = workoutEntries.filter((entry) => entry.id !== id);
    const deleted = workoutEntries.find((entry) => entry.id === id);

    try {
      localStorage.setItem("workoutEntries", JSON.stringify(workoutMetadata(updatedEntries)));
      setWorkoutEntries(updatedEntries);
      if (deleted?.plannedWorkoutId) {
        completedPlannedWorkoutIdsRef.current.delete(deleted.plannedWorkoutId);
      }
      const photoIds = (deleted?.photos || []).map(({ id }) => id).filter(Boolean);
      if (photoIds.length) Promise.resolve(deletePhotos(photoDatabaseRef.current, photoIds)).catch(() => setStorageError("The workout was deleted, but Trace couldn't clean up its photos."));
      (deleted?.photos || []).forEach(({ url }) => { if (url) { URL.revokeObjectURL(url); activeObjectUrlsRef.current.delete(url); } });
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this workout"));
      return false;
    }
  }

  function broadcastJournalPrivacy(type) {
    try {
      journalPrivacyChannelRef.current?.postMessage({ schemaVersion: 1, type });
    } catch (error) {
      // Cross-tab invalidation is also backed by the storage event.
    }
  }

  function installJournalSession(session) {
    journalSessionContextRef.current = { invalidated: false, session };
    journalSaveQueueRef.current = Promise.resolve();
    journalSaveErrorRef.current = null;
    setJournalEntries(journalEntriesFromVaultPayload(session.payload));
    setJournalPrivacy({
      enabled: true,
      unlocked: true,
      malformed: false,
      recoveryFormat: journalVaultStorageState(localStorage).recoveryFormat,
    });
  }

  function queueJournalVaultDomainWrite(key, rawValue) {
    const context = journalSessionContextRef.current;
    if (!context || context.invalidated) {
      return Promise.reject(new Error("Journal is locked."));
    }
    const operation = journalSaveQueueRef.current.then(async () => {
      if (context.invalidated) throw new Error("Journal session was invalidated.");
      const nextPayload = updateJournalVaultDomain(context.session.payload, key, rawValue);
      context.session = await persistUnlockedJournalVault(
        localStorage,
        context.session,
        nextPayload
      );
      journalSaveErrorRef.current = null;
      return { context, session: context.session };
    });
    journalSaveQueueRef.current = operation.catch((error) => {
      journalSaveErrorRef.current = error;
    });
    return operation;
  }

  async function flushJournalSaves() {
    await journalSaveQueueRef.current;
    if (journalSaveErrorRef.current) throw journalSaveErrorRef.current;
  }

  function persistJournalDraft(draft) {
    if (!journalPrivacy.enabled) {
      writeJournalDraft(localStorage, draft);
      return true;
    }
    return queueJournalVaultDomainWrite(
      JOURNAL_DRAFT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: JOURNAL_SCHEMA_VERSION, ...draft })
    );
  }

  function removeJournalDraft() {
    if (!journalPrivacy.enabled) {
      clearJournalDraft(localStorage);
      return true;
    }
    return queueJournalVaultDomainWrite(JOURNAL_DRAFT_STORAGE_KEY, null);
  }

  async function enableJournalPrivacy({ passphrase, recoveryPhrase }) {
    const session = await enableJournalVault({ storage: localStorage, passphrase, recoveryPhrase });
    installJournalSession(session);
    broadcastJournalPrivacy("vault-replaced");
  }

  async function unlockJournalPrivacy(passphrase) {
    const session = await unlockJournalVault(
      localStorage,
      { type: "passphrase", value: passphrase }
    );
    installJournalSession(session);
  }

  async function recoverJournalPrivacy({
    recoveryCredential,
    newPassphrase,
    rotateRecovery,
    nextRecoveryPhrase,
  }) {
    const session = await recoverJournalVaultAccess(
      localStorage,
      recoveryCredential,
      newPassphrase,
      { rotateRecovery, nextRecoveryPhrase }
    );
    installJournalSession(session);
    broadcastJournalPrivacy("vault-replaced");
  }

  async function changeJournalPassphrase(credential, newPassphrase) {
    await flushJournalSaves();
    const session = await changeJournalVaultPassphrase(
      localStorage,
      credential,
      newPassphrase
    );
    installJournalSession(session);
    broadcastJournalPrivacy("passphrase-changed");
  }

  async function rotateJournalRecovery(credential, recoveryPhrase) {
    await flushJournalSaves();
    const session = await rotateJournalVaultRecovery(
      localStorage,
      credential,
      recoveryPhrase
    );
    installJournalSession(session);
    broadcastJournalPrivacy("recovery-rotated");
  }

  async function lockJournal({ automatic = false, broadcast = true, confirmationPage = page } = {}) {
    const context = journalSessionContextRef.current;
    if (!context) return true;
    if (!automatic) {
      try {
        await flushJournalSaves();
      } catch (error) {
        setStorageError("Trace could not safely finish encrypting the latest Journal changes. The Journal remains unlocked so you can retry.");
        throw error;
      }
      context.invalidated = true;
    }
    journalSessionContextRef.current = null;
    setJournalEntries([]);
    setJournalPrivacy((current) => ({ ...current, enabled: true, unlocked: false }));
    if (broadcast) broadcastJournalPrivacy("lock");
    showConfirmation(automatic ? "Journal locked automatically" : "Journal locked.", confirmationPage);
    return true;
  }

  async function lockJournalFromJournal() {
    await lockJournal({ confirmationPage: "home" });
    setPage("home");
  }

  journalLockRef.current = lockJournal;

  async function disableJournalPrivacy(credential) {
    await flushJournalSaves();
    const result = await disableJournalVault(localStorage, credential);
    if (journalSessionContextRef.current) journalSessionContextRef.current.invalidated = true;
    journalSessionContextRef.current = null;
    setJournalEntries(result.entries);
    setJournalPrivacy({
      enabled: false,
      unlocked: false,
      malformed: false,
      recoveryFormat: null,
    });
    broadcastJournalPrivacy("disabled");
  }

  async function downloadTraceBackupForJournalReset() {
    const backup = await createTraceBackup();
    downloadWithAnchor(createBackupFile(backup));
  }

  async function resetJournalPrivacy() {
    resetJournalVault(localStorage);
    if (journalSessionContextRef.current) journalSessionContextRef.current.invalidated = true;
    journalSessionContextRef.current = null;
    journalSaveQueueRef.current = Promise.resolve();
    journalSaveErrorRef.current = null;
    setJournalEntries([]);
    setJournalPrivacy({
      enabled: false,
      unlocked: false,
      malformed: false,
      recoveryFormat: null,
    });
    broadcastJournalPrivacy("journal-reset");
  }

  function invalidateJournalForRestore() {
    if (journalSessionContextRef.current) journalSessionContextRef.current.invalidated = true;
    journalSessionContextRef.current = null;
    setJournalEntries([]);
    setJournalPrivacy((current) => ({ ...current, unlocked: false }));
  }

  function saveJournalEntry(draft, editingJournalId = null) {
    const existingEntry = editingJournalId
      ? journalEntries.find((entry) => entry.id === editingJournalId)
      : null;
    if (editingJournalId && !existingEntry) return false;
    const result = existingEntry
      ? updateJournalEntry(existingEntry, draft)
      : createJournalEntry(draft, {
          id: createId(new Set(journalEntries.map((entry) => entry.id))),
        });
    if (result.error) return false;
    const updatedEntries = existingEntry
      ? journalEntries.map((entry) => entry.id === existingEntry.id ? result.value : entry)
      : [...journalEntries, result.value];
    function finishSave() {
      setJournalEntries(updatedEntries);
      setStorageError("");
      showConfirmation(existingEntry ? "Journal entry updated" : "Journal entry traced");
      return result.value;
    }
    function failSave() {
      setStorageError(storageMessage(existingEntry ? "update this Journal entry" : "save this Journal entry"));
      return false;
    }
    if (journalPrivacy.enabled) {
      return queueJournalVaultDomainWrite(JOURNAL_ENTRY_STORAGE_KEY, JSON.stringify(updatedEntries))
        .then(({ context }) => journalSessionContextRef.current === context ? finishSave() : result.value)
        .catch(failSave);
    }
    try {
        writeJournalEntries(localStorage, updatedEntries);
      return finishSave();
    } catch (error) {
      return failSave();
    }
  }

  function deleteJournalEntry(id) {
    const updatedEntries = journalEntries.filter((entry) => entry.id !== id);
    if (updatedEntries.length === journalEntries.length) return false;
    function finishDelete() {
      setJournalEntries(updatedEntries);
      setStorageError("");
      showConfirmation("Journal entry deleted");
      return true;
    }
    function failDelete() {
      setStorageError(storageMessage("delete this Journal entry"));
      return false;
    }
    if (journalPrivacy.enabled) {
      return queueJournalVaultDomainWrite(JOURNAL_ENTRY_STORAGE_KEY, JSON.stringify(updatedEntries))
        .then(({ context }) => journalSessionContextRef.current === context ? finishDelete() : true)
        .catch(failDelete);
    }
    try {
        writeJournalEntries(localStorage, updatedEntries);
      return finishDelete();
    } catch (error) {
      return failDelete();
    }
  }

  function addTrophyCaseEntry(candidate) {
    const result = addCuratedTrophy(trophyCaseEntries, candidate, {
      id: createId(new Set(trophyCaseEntries.map((entry) => entry.id))),
      addedToTrophyCaseAt: new Date().toISOString(),
    });
    if (result.status === "duplicate") return null;
    try {
      writeTrophyCaseEntries(localStorage, result.entries);
      setTrophyCaseEntries(result.entries);
      setCeremonyEntry(result.entry);
      setStorageError("");
      return result.entry;
    } catch (error) {
      setStorageError(storageMessage("add this trophy"));
      return false;
    }
  }

  function removeTrophyCaseEntry(id) {
    const updatedEntries = trophyCaseEntries.filter((entry) => entry.id !== id);
    try {
      writeTrophyCaseEntries(localStorage, updatedEntries);
      setTrophyCaseEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("remove this trophy"));
      return false;
    }
  }

  function getTrophySource(entry) {
    return resolveTrophySource(entry, { memories, workouts: workoutEntries });
  }

  function openTrophySource(entry) {
    const target = getTrophySource(entry);
    if (!target) return false;
    setTrophySourceNavigation({ originTrophyId: entry.id, sourceType: entry.sourceType, target });
    skipNextPageTopScrollRef.current = true;
    if (entry.sourceType === "memory") {
      setPage("home");
    } else {
      setWorkoutEntryTargetId(target.workoutId);
      setWorkoutOriginPage("trophy-case");
      setWorkoutOriginCalendar(null);
      setPage("workouts");
    }
    return true;
  }

  function returnToTrophyCase() {
    skipNextPageTopScrollRef.current = true;
    setWorkoutEntryTargetId(null);
    setWorkoutOriginPage(null);
    setWorkoutOriginCalendar(null);
    setPage("trophy-case");
  }

  return (
    <div
      aria-hidden={ceremonyEntry ? "true" : undefined}
      className="trace-app-shell"
      data-motion={reducedMotion ? "reduced" : "standard"}
      data-trace-theme={appSettings.themeId}
      data-testid="trace-app-shell"
      data-planned-workout-count={plannedWorkouts.length}
      inert={Boolean(ceremonyEntry)}
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        flexDirection: "column",
      }}
    >
      <ConfirmationMessage
        key={confirmation?.id}
        message={confirmation?.page === page ? confirmation.message : ""}
      />
      {storageError && (
        <div
          role="alert"
          style={{
            background: "#7f1d1d",
            border: "1px solid #fca5a5",
            borderRadius: "10px",
            color: "white",
            margin: "12px auto 0",
            maxWidth: "700px",
            padding: "12px 16px",
            width: "calc(100% - 24px)",
          }}
        >
          {storageError}
        </div>
      )}
      {(page === "home" || (
        page === "new" && editingId !== null && retainHomeDuringMemoryEdit
      )) && (
        <HomePage
          key={`home-${homePageGeneration}`}
          active={page === "home"}
          inactiveScrollTargetRef={
            retainHomeDuringMemoryEdit ? memoryEditorFolioRef : null
          }
          memoryCount={memoryCount}
          memories={memories}
          photoLoader={photoUrlLoader}
          timelineTargetMemoryId={timelineTargetMemoryId}
          onTimelineTargetShown={() => setTimelineTargetMemoryId(null)}
          setMemories={setMemories}
          toggleFavorite={toggleFavorite}
          onAddMemory={openNewMemory}
          onOpenNutrition={() => setPage("nutrition")}
          onOpenHealth={() => setPage("health")}
          onOpenSettings={() => setPage("settings")}
          onOpenMedications={() => setPage("medications")}
          onOpenProtocols={() => setPage("protocols")}
          onOpenToday={() => setPage("today")}
          onOpenWorkouts={() => {
            setWorkoutEntryTargetId(null);
            setWorkoutOriginPage(null);
            setWorkoutOriginCalendar(null);
            setPage("workouts");
          }}
          onOpenTrophyCase={() => setPage("trophy-case")}
          onOpenJournal={() => setPage("journal")}
          journalLocked={journalPrivacy.enabled && !journalPrivacy.unlocked}
          deleteMemory={deleteMemory}
          editMemory={editMemory}
          trophyEntries={trophyCaseEntries}
          nutritionEntries={nutritionEntries}
          healthMeasurementEntries={healthMeasurementEntries}
          workoutEntries={workoutEntries}
          medicationEntries={medicationEntries}
          journalEntries={journalPrivacy.enabled && !journalPrivacy.unlocked ? [] : journalEntries}
          themeId={appSettings.themeId}
          homeVisibility={appSettings.homeVisibility}
          reducedMotion={reducedMotion}
          addTrophyCaseEntry={addTrophyCaseEntry}
          memoryAchievementSuggestion={memoryAchievementSuggestion}
          dismissMemoryAchievementSuggestion={() => setMemoryAchievementSuggestion(null)}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
          trophySourceTarget={trophySourceNavigation?.sourceType === "memory" ? trophySourceNavigation.target : null}
          onReturnToTrophyCase={returnToTrophyCase}
          onExitTrophySource={() => setTrophySourceNavigation(null)}
        />
      )}
      {page !== "home" && (page === "nutrition" ? (
        <NutritionPage
          onBack={() => setPage("home")}
          nutritionEntries={nutritionEntries}
          userFoods={userFoods}
          nutritionGoals={nutritionGoals}
          saveNutritionEntry={saveNutritionEntry}
          saveUserFood={saveUserFood}
          updateNutritionEntry={updateNutritionEntry}
          deleteNutritionEntry={deleteNutritionEntry}
          saveNutritionGoals={saveNutritionGoals}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "today" || page === "calendar" ? (
        <TodayPage
          onBack={() => { setCalendarOverlayOpen(false); setPage("home"); }}
          onOpenCalendar={() => {
            const today = localCalendarDateKey();
            setCalendarSelectedDate(today);
            setCalendarVisibleMonth(today.slice(0, 7));
            setCalendarOverlayOpen(false);
            setPage("calendar");
          }}
          onOpenToday={() => { setCalendarOverlayOpen(false); setPage("today"); }}
          scheduleView={page === "calendar" ? "calendar" : "today"}
          currentDate={page === "calendar"
            ? parseDateOnlyLocal(calendarSelectedDate) || new Date()
            : new Date()}
          selectedDateKey={calendarSelectedDate}
          visibleMonthKey={calendarVisibleMonth}
          onSelectCalendarDate={setCalendarSelectedDate}
          onChangeCalendarMonth={setCalendarVisibleMonth}
          calendarOverlayOpen={page === "calendar" ? calendarOverlayOpen : null}
          onCalendarOverlayOpenChange={setCalendarOverlayOpen}
          plannedWorkouts={plannedWorkouts}
          protocols={protocols}
          protocolOccurrences={protocolOccurrences}
          protocolCompoundOutcomes={protocolCompoundOutcomes}
          workoutEntries={workoutEntries}
          activeWorkoutDraft={activeWorkoutDraft}
          dailyActions={dailyActions}
          medicationDoseSchedules={medicationDoseSchedules}
          medicationDoseOccurrences={medicationDoseOccurrences}
          savedExercises={savedExercises}
          saveExerciseDefinitions={saveExerciseDefinitions}
          createPlannedWorkout={createPlannedWorkout}
          updatePlannedWorkout={updatePlannedWorkout}
          appendPlannedWorkoutExercise={appendPlannedWorkoutExercise}
          removePlannedWorkoutExercise={removePlannedWorkoutExercise}
          deletePlannedWorkout={deletePlannedWorkout}
          restorePlannedWorkout={restorePlannedWorkout}
          skipPlannedWorkout={skipPlannedWorkout}
          startPlannedWorkout={startPlannedWorkout}
          openCompletedWorkout={openCompletedWorkout}
          createDailyAction={saveDailyAction}
          updateDailyAction={updateDailyAction}
          deleteDailyAction={deleteDailyAction}
          completeDailyAction={completeDailyAction}
          skipDailyAction={skipDailyAction}
          completeProtocolOccurrence={completeProtocolOccurrence}
          skipProtocolOccurrence={skipProtocolOccurrence}
          saveProtocolCompoundResults={saveProtocolCompoundResults}
          undoProtocolCompoundResult={undoProtocolCompoundResult}
          completeMedicationDoseOccurrence={completeScheduledMedicationDose}
          undoMedicationDoseCompletion={undoCompletedScheduledMedicationDose}
          skipMedicationDoseOccurrence={skipScheduledMedicationDose}
          rescheduleMedicationDoseOccurrence={rescheduleScheduledMedicationDose}
          removeMedicationDoseOccurrence={removeScheduledMedicationDose}
          showToast={showConfirmation}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "health" ? (
        <HealthPage
          onBack={() => setPage("home")}
          entries={healthMeasurementEntries}
          settings={appSettings}
          saveEntry={saveHealthMeasurement}
          updateEntry={updateHealthMeasurement}
          deleteEntry={deleteHealthMeasurement}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "settings" ? (
        <SettingsPage
          settings={appSettings}
          updateSettings={updateAppSettings}
          onBack={() => setPage("home")}
          onOpenBackup={() => setPage("backup")}
          journalPrivacy={journalPrivacy}
          onEnableJournalPrivacy={enableJournalPrivacy}
          onChangeJournalPassphrase={changeJournalPassphrase}
          onRotateJournalRecovery={rotateJournalRecovery}
          onLockJournal={() => lockJournal()}
          onDisableJournalPrivacy={disableJournalPrivacy}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
        />
      ) : page === "medications" ? (
        <MedicationPage
          onBack={() => setPage("home")}
          medicationEntries={medicationEntries}
          compounds={medicationCompounds}
          medicationDoseSchedules={medicationDoseSchedules}
          medicationDoseOccurrences={medicationDoseOccurrences}
          saveMedicationDoseSchedule={saveMedicationDoseSchedule}
          updateMedicationDoseSchedule={updateMedicationDoseSeries}
          endMedicationDoseSchedule={endMedicationDoseSeries}
          deleteMedicationDoseSchedule={deleteMedicationDoseSeries}
          onOpenToday={() => setPage("today")}
          saveMedicationEntry={saveMedicationEntry}
          saveCompoundDefinition={saveCompoundDefinition}
          updateCompoundDefinition={updateSavedCompound}
          updateMedicationEntry={updateMedicationEntry}
          deleteMedicationEntry={deleteMedicationEntry}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "workouts" ? (
        <WorkoutPage
          onBack={() => setPage("home")}
          navigationOriginPage={workoutOriginPage}
          navigationOriginCalendar={workoutOriginCalendar}
          onReturnToToday={() => {
            setCalendarOverlayOpen(false);
            setWorkoutEntryTargetId(null);
            setWorkoutOriginPage(null);
            setWorkoutOriginCalendar(null);
            setPage("today");
          }}
          onReturnToCalendar={() => {
            const origin = workoutOriginCalendar || activeWorkoutDraft?.context;
            if (origin?.selectedDate) setCalendarSelectedDate(origin.selectedDate);
            if (origin?.visibleMonth) setCalendarVisibleMonth(origin.visibleMonth);
            setCalendarOverlayOpen(true);
            setWorkoutEntryTargetId(null);
            setWorkoutOriginPage(null);
            setWorkoutOriginCalendar(null);
            setPage("calendar");
          }}
          workoutEntries={workoutEntries}
          onWorkoutDraftChange={setActiveWorkoutDraft}
          trophyEntries={trophyCaseEntries}
          savedExercises={savedExercises}
          saveWorkoutEntry={saveWorkoutEntry}
          showToast={showConfirmation}
          saveExerciseDefinitions={saveExerciseDefinitions}
          updateSavedExercise={updateSavedExercise}
          updateWorkoutEntry={updateWorkoutEntry}
          deleteWorkoutEntry={deleteWorkoutEntry}
          addTrophyCaseEntry={addTrophyCaseEntry}
          removeTrophyCaseEntry={removeTrophyCaseEntry}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
          onReturnToTrophyCase={returnToTrophyCase}
          workoutEntryTargetId={workoutEntryTargetId}
          onWorkoutEntryTargetShown={() => setWorkoutEntryTargetId(null)}
        />
      ) : page === "protocols" ? (
        <ProtocolsPage
          onBack={() => setPage("home")}
          protocols={protocols}
          compounds={medicationCompounds}
          saveProtocol={saveProtocol}
          updateProtocol={updateProtocol}
          endProtocol={finishProtocol}
          deleteProtocol={deleteProtocol}
          injectionSiteData={injectionSiteData}
          injectionSiteSettings={injectionSiteSettings}
          saveInjectionSession={saveInjectionSession}
          updateInjectionShot={updateInjectionShot}
          deleteInjectionShot={deleteInjectionShot}
          updateInjectionBodyStyle={updateInjectionBodyStyle}
          reducedMotion={reducedMotion}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "backup" ? (
        <BackupPage
          onBack={() => setPage("home")}
          journalLockEnabled={journalPrivacy.enabled}
          journalVaultSession={journalSessionContextRef.current?.session || null}
          onRestoreStarting={invalidateJournalForRestore}
          onRestoreComplete={async (summary) => {
            await synchronizeRestoredAppState(summary);
            broadcastJournalPrivacy("backup-restored");
          }}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
        />
      ) : page === "journal" ? (
        journalPrivacy.enabled && !journalPrivacy.unlocked ? (
          <JournalUnlockPage
            unavailable={journalPrivacy.malformed}
            recoveryFormat={journalPrivacy.recoveryFormat}
            onUnlock={unlockJournalPrivacy}
            onRecover={recoverJournalPrivacy}
            onReset={resetJournalPrivacy}
            onDownloadBackup={downloadTraceBackupForJournalReset}
            onBack={() => setPage("home")}
          />
        ) : (
          <JournalPage
            entries={journalEntries}
            journalPrivacyEnabled={journalPrivacy.enabled}
            journalPrivacyUnlocked={journalPrivacy.unlocked}
            initialDraft={journalPrivacy.enabled
              ? journalDraftFromVaultPayload(journalSessionContextRef.current.session.payload)
              : undefined}
            persistDraft={persistJournalDraft}
            removeDraft={removeJournalDraft}
            onBack={() => setPage("home")}
            onEnablePrivacy={enableJournalPrivacy}
            onLock={journalPrivacy.enabled ? lockJournalFromJournal : undefined}
            onDisable={journalPrivacy.enabled ? disableJournalPrivacy : undefined}
            recoveryFormat={journalPrivacy.recoveryFormat}
            saveEntry={saveJournalEntry}
            deleteEntry={deleteJournalEntry}
            onDraftStorageError={() => setStorageError(journalPrivacy.enabled
              ? "Trace could not safely encrypt the latest unfinished Journal draft. Keep this page open and retry."
              : storageMessage("save this unfinished Journal draft"))}
            buttonStyle={buttonStyle}
            inputStyle={inputStyle}
            containerStyle={containerStyle}
          />
        )
      ) : page === "trophy-case" ? (
        <TrophyCasePage
          onBack={() => setPage("home")}
          trophyEntries={trophyCaseEntries}
          removeTrophyCaseEntry={removeTrophyCaseEntry}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
          onViewSource={openTrophySource}
          sourceAvailable={(entry) => Boolean(getTrophySource(entry))}
          restoreTrophyId={trophySourceNavigation?.originTrophyId || null}
          onRestoreComplete={() => setTrophySourceNavigation(null)}
        />
      ) : (
        <NewMemoryPage
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          date={date}
          setDate={setDate}
          categories={categories}
          setCategories={setCategories}
          images={images}
          setImages={setImages}
          photoLoader={photoUrlLoader}
          saveMemory={saveMemory}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
          setPage={setPage}
          editingIndex={editingId}
          setEditingIndex={setEditingId}
          onCancelExistingMemory={cancelExistingMemoryEdit}
          folioRef={
            editingId !== null && retainHomeDuringMemoryEdit
              ? memoryEditorFolioRef
              : null
          }
        />
      ))}
      {ceremonyEntry && (
        <TrophyPlacementCeremony
          entry={ceremonyEntry}
          onClose={() => setCeremonyEntry(null)}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

export default App;
