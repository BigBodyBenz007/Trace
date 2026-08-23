import { useState, useEffect, useRef } from "react";
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
import BackupPage from "./components/BackupPage";
import JournalPage from "./components/JournalPage";
import TodayPage from "./components/TodayPage";
import ConfirmationMessage from "./components/ConfirmationMessage";
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
import { createPhotoUrlLoader } from "./services/photoUrlLoader";
import {
  createJournalEntry,
  readJournalEntries,
  updateJournalEntry,
  writeJournalEntries,
} from "./services/journalEntry";
import {
  appendPlannedWorkoutExercise as appendExerciseToPlannedWorkout,
  createPlannedWorkout as createPlannedWorkoutRecord,
  getPlannedWorkoutError,
  readPlannedWorkouts,
  removePlannedWorkoutExercise as removeExerciseFromPlannedWorkout,
  updatePlannedWorkout as updatePlannedWorkoutRecord,
  writePlannedWorkouts,
} from "./services/plannedWorkout";
import {
  createWorkoutDraftFromPlannedWorkout,
  readWorkoutDraft,
  writeWorkoutDraft,
} from "./services/workoutDraft";

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
  const [medicationEntries, setMedicationEntries] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [workoutEntries, setWorkoutEntries] = useState([]);
  const [workoutEntryTargetId, setWorkoutEntryTargetId] = useState(null);
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

  function showConfirmation(message) {
    confirmationIdRef.current += 1;
    setConfirmation({ id: confirmationIdRef.current, message });
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = setTimeout(() => setConfirmation(null), 3200);
  }

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
      setPlannedWorkouts(readPlannedWorkouts(localStorage));
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved planned workouts. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    async function loadWorkouts() {
      try {
      const savedWorkoutEntries = localStorage.getItem("workoutEntries");
      if (!savedWorkoutEntries) return;
      const parsedEntries = JSON.parse(savedWorkoutEntries);
      if (!Array.isArray(parsedEntries)) throw new Error("Invalid workout data.");
      if (!parsedEntries.some((entry) => Array.isArray(entry.photos) && entry.photos.length > 0)) {
        setWorkoutEntries(parsedEntries);
        return;
      }
      const database = await ensurePhotoDatabase();
      const hydrated = await Promise.all(parsedEntries.map(async (entry) => ({
        ...entry,
        ...(Array.isArray(entry.photos) ? { photos: (await Promise.all(entry.photos.map(async (value) => {
          const id = typeof value === "string" ? value : value?.id;
          if (!id) return null;
          const photo = await getPhoto(database, id);
          if (!photo?.blob) return { id };
          const url = URL.createObjectURL(photo.blob);
          activeObjectUrlsRef.current.add(url);
          return { id, url };
        }))).filter(Boolean) } : {}),
      })));
      setWorkoutEntries(hydrated);
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
    try {
      setJournalEntries(readJournalEntries(localStorage));
    } catch (error) {
      setStorageError("Trace couldn't read the saved Journal entries because their stored data is malformed. The stored value was left unchanged.");
    }
  }, []);

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
      showConfirmation("Memory traced");
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

  function synchronizeRestoredAppState() {
    try {
      const restoredAppSettings = readAppSettings(localStorage);
      const restoredPlannedWorkouts = readPlannedWorkouts(localStorage);
      setAppSettings(restoredAppSettings);
      setPlannedWorkouts(restoredPlannedWorkouts);
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

  function saveUserFood({ name, nutrients, serving }) {
    const userFood = createUserFood(name, nutrients, serving);
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
      return true;
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

  function startPlannedWorkout(id, conflictAction = null) {
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
    if (existingDraft?.plannedWorkoutId === id) {
      setWorkoutEntryTargetId(null);
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
      setWorkoutEntryTargetId(null);
      setPage("workouts");
      return { status: "resumed-existing" };
    }
    if (existingDraft && conflictAction !== "discard") {
      return { status: "cancelled" };
    }

    const workoutDraft = createWorkoutDraftFromPlannedWorkout(plannedWorkout);
    if (!workoutDraft) {
      return {
        status: "error",
        message: "The planned workout could not be opened.",
      };
    }
    try {
      writeWorkoutDraft(localStorage, workoutDraft);
      setWorkoutEntryTargetId(null);
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

  function openCompletedWorkout(id) {
    if (!workoutEntries.some((entry) => entry.id === id)) return false;
    skipNextPageTopScrollRef.current = true;
    setWorkoutEntryTargetId(id);
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
    try {
      writeJournalEntries(localStorage, updatedEntries);
      setJournalEntries(updatedEntries);
      setStorageError("");
      showConfirmation(existingEntry ? "Journal entry updated" : "Journal entry traced");
      return result.value;
    } catch (error) {
      setStorageError(storageMessage(existingEntry ? "update this Journal entry" : "save this Journal entry"));
      return false;
    }
  }

  function deleteJournalEntry(id) {
    const updatedEntries = journalEntries.filter((entry) => entry.id !== id);
    if (updatedEntries.length === journalEntries.length) return false;
    try {
      writeJournalEntries(localStorage, updatedEntries);
      setJournalEntries(updatedEntries);
      setStorageError("");
      showConfirmation("Journal entry deleted");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this Journal entry"));
      return false;
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
    setPage(entry.sourceType === "memory" ? "home" : "workouts");
    return true;
  }

  function returnToTrophyCase() {
    skipNextPageTopScrollRef.current = true;
    setPage("trophy-case");
  }

  return (
    <div
      aria-hidden={ceremonyEntry ? "true" : undefined}
      className="trace-app-shell"
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
        message={confirmation?.message || ""}
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
            setPage("workouts");
          }}
          onOpenTrophyCase={() => setPage("trophy-case")}
          onOpenBackup={() => setPage("backup")}
          onOpenJournal={() => setPage("journal")}
          deleteMemory={deleteMemory}
          editMemory={editMemory}
          trophyEntries={trophyCaseEntries}
          nutritionEntries={nutritionEntries}
          healthMeasurementEntries={healthMeasurementEntries}
          workoutEntries={workoutEntries}
          medicationEntries={medicationEntries}
          journalEntries={journalEntries}
          lifeCurrentThemeId={appSettings.lifeCurrentThemeId}
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
      ) : page === "today" ? (
        <TodayPage
          onBack={() => setPage("home")}
          plannedWorkouts={plannedWorkouts}
          workoutEntries={workoutEntries}
          savedExercises={savedExercises}
          createPlannedWorkout={createPlannedWorkout}
          updatePlannedWorkout={updatePlannedWorkout}
          appendPlannedWorkoutExercise={appendPlannedWorkoutExercise}
          removePlannedWorkoutExercise={removePlannedWorkoutExercise}
          deletePlannedWorkout={deletePlannedWorkout}
          startPlannedWorkout={startPlannedWorkout}
          openCompletedWorkout={openCompletedWorkout}
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
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
        />
      ) : page === "medications" ? (
        <MedicationPage
          onBack={() => setPage("home")}
          medicationEntries={medicationEntries}
          compounds={medicationCompounds}
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
          workoutEntries={workoutEntries}
          trophyEntries={trophyCaseEntries}
          savedExercises={savedExercises}
          saveWorkoutEntry={saveWorkoutEntry}
          saveExerciseDefinitions={saveExerciseDefinitions}
          updateSavedExercise={updateSavedExercise}
          updateWorkoutEntry={updateWorkoutEntry}
          deleteWorkoutEntry={deleteWorkoutEntry}
          addTrophyCaseEntry={addTrophyCaseEntry}
          removeTrophyCaseEntry={removeTrophyCaseEntry}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
          trophySourceTarget={trophySourceNavigation?.sourceType === "workout-pr" ? trophySourceNavigation.target : null}
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
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "backup" ? (
        <BackupPage
          onBack={() => setPage("home")}
          onRestoreComplete={synchronizeRestoredAppState}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
        />
      ) : page === "journal" ? (
        <JournalPage
          entries={journalEntries}
          onBack={() => setPage("home")}
          saveEntry={saveJournalEntry}
          deleteEntry={deleteJournalEntry}
          onDraftStorageError={() => setStorageError(storageMessage("save this unfinished Journal draft"))}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
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
        />
      )}
    </div>
  );
}

export default App;
