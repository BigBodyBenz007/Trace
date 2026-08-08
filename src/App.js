import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";
import NutritionPage from "./components/NutritionPage";

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
    const savedNutritionEntries = localStorage.getItem("nutritionEntries");

    if (savedNutritionEntries) {
      setNutritionEntries(JSON.parse(savedNutritionEntries));
    }
  }, []);

  const buttonStyle = {
    padding: "15px 40px",
    fontSize: "24px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#5ec8ff",
    color: "white",
    cursor: "pointer",
    marginTop: "20px",
  };

  const inputStyle = {
    padding: "15px",
    width: "500px",
    maxWidth: "90%",
    fontSize: "24px",
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
    padding: "20px",
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
          saveNutritionEntry={saveNutritionEntry}
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
