import { useState, useEffect, useRef } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";
import NutritionPage from "./components/NutritionPage";
import MedicationPage from "./components/MedicationPage";
import WorkoutPage from "./components/WorkoutPage";
import TrophyPlacementCeremony from "./components/TrophyPlacementCeremony";
import TrophyCasePage from "./components/TrophyCasePage";
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

const DEFAULT_NUTRITION_GOALS = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
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

function storageMessage(action) {
  return `Trace couldn't ${action} because browser storage is unavailable or full. Your existing data has not been intentionally removed.`;
}

function App() {
  const [page, setPage] = useState("home");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [images, setImages] = useState([]);

  const [memories, setMemories] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [nutritionEntries, setNutritionEntries] = useState([]);
  const [medicationEntries, setMedicationEntries] = useState([]);
  const [workoutEntries, setWorkoutEntries] = useState([]);
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
  const photoDatabaseRef = useRef(null);
  const initializationStartedRef = useRef(false);
  const activeObjectUrlsRef = useRef(new Set());

  useEffect(() => {
    if (initializationStartedRef.current) return;
    initializationStartedRef.current = true;

    async function loadMemories() {
      let rawMemories;
      let parsedMemories;

      try {
        rawMemories = localStorage.getItem("memories");
        if (!rawMemories) {
          photoDatabaseRef.current = await openPhotoDatabase();
          return;
        }
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

      try {
        const database = await openPhotoDatabase();
        photoDatabaseRef.current = database;
        let compactMemories = memoriesWithIds;

        if (hasLegacyPhotos(memoriesWithIds)) {
          compactMemories = await migrateLegacyPhotos(
            database,
            rawMemories,
            memoriesWithIds
          );
          localStorage.setItem("memories", JSON.stringify(compactMemories));
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

        let hasMissingPhoto = false;
        const hydratedMemories = await Promise.all(
          compactMemories.map(async (memory) => ({
            ...memory,
            images: await Promise.all(
              (Array.isArray(memory.images) ? memory.images : []).map(
                async (imageId) => {
                  const photo = await getPhoto(database, imageId);
                  if (!photo?.blob) {
                    hasMissingPhoto = true;
                    return { id: imageId, url: "", unavailable: true };
                  }
                  const url = URL.createObjectURL(photo.blob);
                  activeObjectUrlsRef.current.add(url);
                  return { id: imageId, url };
                }
              )
            ),
          }))
        );

        setMemories(hydratedMemories);
        setMemoryCount(hydratedMemories.length);
        if (!hasLegacyPhotos(memoriesWithIds)) {
          await clearCompletedMigrationBackup(database).catch(() => {});
        }
        if (hasMissingPhoto) {
          setStorageError(
            "One or more saved photos could not be loaded. Trace kept their references and did not delete them."
          );
        }
      } catch (error) {
        setMemories(
          memoriesWithIds.map((memory) => ({
            ...memory,
            images: (memory.images || []).map((image) => ({
              id: null,
              url: image,
              legacyDataUrl: image,
            })),
          }))
        );
        setMemoryCount(memoriesWithIds.length);
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
      activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      activeObjectUrls.clear();
    };
  }, []);

  useEffect(() => {
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
      const savedWorkoutEntries = localStorage.getItem("workoutEntries");
      if (!savedWorkoutEntries) return;
      const parsedEntries = JSON.parse(savedWorkoutEntries);
      if (!Array.isArray(parsedEntries)) throw new Error("Invalid workout data.");
      setWorkoutEntries(parsedEntries);
    } catch (error) {
      setStorageError(
        "Trace couldn't read the saved workouts. The stored value was left unchanged."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setTrophyCaseEntries(readTrophyCaseEntries(localStorage));
    } catch (error) {
      setStorageError("Trace couldn't read the Trophy Case because its stored data is malformed. The stored value was left unchanged.");
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

    await putPhotos(photoDatabaseRef.current, photosToStore);
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
      setMemoryCount(updatedMemories.length);
      setEditingId(null);
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

  function editMemory(idToEdit) {
    const memory = memories.find((item) => item.id === idToEdit);

    if (!memory) return;

    setTitle(memory.title);
    setDescription(memory.description);
    setDate(memory.date);
    setImages(memory.images || []);
    setCategories(Array.isArray(memory.categories) ? memory.categories : []);

    setEditingId(idToEdit);
    setPage("new");
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

  function saveWorkoutEntry(entry) {
    const newEntry = {
      ...entry,
      id: createId(new Set(workoutEntries.map((item) => item.id))),
    };
    const updatedEntries = [...workoutEntries, newEntry];

    try {
      localStorage.setItem("workoutEntries", JSON.stringify(updatedEntries));
      setWorkoutEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save this workout"));
      return false;
    }
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
    const updatedEntries = workoutEntries.map((existingEntry) =>
      existingEntry.id === id
        ? { ...existingEntry, ...entry, id: existingEntry.id }
        : existingEntry
    );

    try {
      localStorage.setItem("workoutEntries", JSON.stringify(updatedEntries));
      setWorkoutEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("update this workout"));
      return false;
    }
  }

  function deleteWorkoutEntry(id) {
    const updatedEntries = workoutEntries.filter((entry) => entry.id !== id);

    try {
      localStorage.setItem("workoutEntries", JSON.stringify(updatedEntries));
      setWorkoutEntries(updatedEntries);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("delete this workout"));
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

  return (
    <div
      style={{
        background: "#111827",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        flexDirection: "column",
        fontFamily: "Arial",
      }}
    >
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
      {page === "home" ? (
        <HomePage
          memoryCount={memoryCount}
          memories={memories}
          setMemories={setMemories}
          toggleFavorite={toggleFavorite}
          onAddMemory={() => setPage("new")}
          onOpenNutrition={() => setPage("nutrition")}
          onOpenMedications={() => setPage("medications")}
          onOpenWorkouts={() => setPage("workouts")}
          onOpenTrophyCase={() => setPage("trophy-case")}
          deleteMemory={deleteMemory}
          editMemory={editMemory}
          trophyEntries={trophyCaseEntries}
          addTrophyCaseEntry={addTrophyCaseEntry}
          memoryAchievementSuggestion={memoryAchievementSuggestion}
          dismissMemoryAchievementSuggestion={() => setMemoryAchievementSuggestion(null)}
          buttonStyle={buttonStyle}
          inputStyle={inputStyle}
          containerStyle={containerStyle}
        />
      ) : page === "nutrition" ? (
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
        />
      ) : page === "trophy-case" ? (
        <TrophyCasePage
          onBack={() => setPage("home")}
          trophyEntries={trophyCaseEntries}
          removeTrophyCaseEntry={removeTrophyCaseEntry}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
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
          saveMemory={saveMemory}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
          containerStyle={containerStyle}
          setPage={setPage}
          editingIndex={editingId}
          setEditingIndex={setEditingId}
        />
      )}
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
