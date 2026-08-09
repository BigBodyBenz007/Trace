import { useState, useEffect, useRef } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";
import NutritionPage from "./components/NutritionPage";
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

  function saveUserFood({ name, nutrients }) {
    const userFood = createUserFood(name, nutrients);
    const result = addUserFood(userFoods, userFood);

    if (!result.added) return true;

    try {
      writeUserFoods(localStorage, result.foods);
      setUserFoods(result.foods);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(storageMessage("save this reusable food"));
      return false;
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
          deleteMemory={deleteMemory}
          editMemory={editMemory}
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
    </div>
  );
}

export default App;
