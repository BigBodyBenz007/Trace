import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";
import NutritionPage from "./components/NutritionPage";

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
  const [nutritionGoals, setNutritionGoals] = useState(
    DEFAULT_NUTRITION_GOALS
  );

  useEffect(() => {
    const savedMemories = localStorage.getItem("memories");

    if (savedMemories) {
      const parsedMemories = JSON.parse(savedMemories);
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

      setMemories(memoriesWithIds);
      setMemoryCount(memoriesWithIds.length);

      if (didAssignIds) {
        localStorage.setItem("memories", JSON.stringify(memoriesWithIds));
      }
    }
  }, []);

  useEffect(() => {
    const savedNutritionGoals = localStorage.getItem("nutritionGoals");

    if (savedNutritionGoals) {
      const savedGoals = JSON.parse(savedNutritionGoals);

      setNutritionGoals({
        calories: toNonNegativeNumber(savedGoals.calories),
        protein: toNonNegativeNumber(savedGoals.protein),
        carbohydrates: toNonNegativeNumber(savedGoals.carbohydrates),
        fat: toNonNegativeNumber(savedGoals.fat),
      });
    }
  }, []);

  useEffect(() => {
    const savedNutritionEntries = localStorage.getItem("nutritionEntries");

    if (savedNutritionEntries) {
      setNutritionEntries(JSON.parse(savedNutritionEntries));
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

  function saveMemory() {
    if (title.trim() === "") return;

    if (editingId !== null) {
      const updatedMemories = memories.map((memory) =>
        memory.id === editingId
          ? {
              ...memory,
              title,
              description,
              date,
              images,
              categories,
            }
          : memory
      );

      setMemories(updatedMemories);
      localStorage.setItem("memories", JSON.stringify(updatedMemories));

      setEditingId(null);
    } else {
      const newMemory = {
        id: createId(new Set(memories.map((memory) => memory.id))),
        title,
        description,
        date,
        images,
        categories,
        favorite: false,
      };

      const newMemories = [...memories, newMemory];

      setMemories(newMemories);
      localStorage.setItem("memories", JSON.stringify(newMemories));

      setMemoryCount(newMemories.length);
    }

    setTitle("");
    setDescription("");
    setDate("");
    setImages([]);
    setCategories([]);

    setPage("home");
  }

  function toggleFavorite(id) {
    const updatedMemories = memories.map((memory) =>
      memory.id === id
        ? { ...memory, favorite: !memory.favorite }
        : memory
    );

    setMemories(updatedMemories);
    localStorage.setItem("memories", JSON.stringify(updatedMemories));
  }

  function deleteMemory(idToDelete) {
    const updatedMemories = memories.filter((memory) => memory.id !== idToDelete);

    setMemories(updatedMemories);
    localStorage.setItem("memories", JSON.stringify(updatedMemories));
    setMemoryCount(updatedMemories.length);
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

    setNutritionEntries(updatedEntries);
    localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
  }

  function updateNutritionEntry(id, entry) {
    const updatedEntries = nutritionEntries.map((existingEntry) =>
      existingEntry.id === id
        ? { ...existingEntry, ...entry, id: existingEntry.id }
        : existingEntry
    );

    setNutritionEntries(updatedEntries);
    localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
  }

  function deleteNutritionEntry(id) {
    const updatedEntries = nutritionEntries.filter((entry) => entry.id !== id);

    setNutritionEntries(updatedEntries);
    localStorage.setItem("nutritionEntries", JSON.stringify(updatedEntries));
  }

  function saveNutritionGoals(goals) {
    const updatedGoals = {
      calories: toNonNegativeNumber(goals.calories),
      protein: toNonNegativeNumber(goals.protein),
      carbohydrates: toNonNegativeNumber(goals.carbohydrates),
      fat: toNonNegativeNumber(goals.fat),
    };

    setNutritionGoals(updatedGoals);
    localStorage.setItem("nutritionGoals", JSON.stringify(updatedGoals));
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
          nutritionGoals={nutritionGoals}
          saveNutritionEntry={saveNutritionEntry}
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
