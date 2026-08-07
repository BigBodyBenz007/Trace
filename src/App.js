import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import NewMemoryPage from "./components/NewMemoryPage";

function App() {
  const [page, setPage] = useState("home");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categories, setCategories] = useState([]);

  const [editingIndex, setEditingIndex] = useState(null);

  const [images, setImages] = useState([]);

  const [memories, setMemories] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);

  useEffect(() => {
    const savedMemories = localStorage.getItem("memories");

    if (savedMemories) {
      const parsedMemories = JSON.parse(savedMemories);
      setMemories(parsedMemories);
      setMemoryCount(parsedMemories.length);
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

    if (editingIndex !== null) {
      const updatedMemories = [...memories];

      updatedMemories[editingIndex] = {
        ...updatedMemories[editingIndex],
        title,
        description,
        date,
        images,
        categories,
      };

      setMemories(updatedMemories);
      localStorage.setItem("memories", JSON.stringify(updatedMemories));

      setEditingIndex(null);
    } else {
      const newMemory = {
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

  function toggleFavorite(index) {
    const updatedMemories = [...memories];

    updatedMemories[index].favorite =
      !updatedMemories[index].favorite;

    setMemories(updatedMemories);
    localStorage.setItem("memories", JSON.stringify(updatedMemories));
  }

  function deleteMemory(indexToDelete) {
    const updatedMemories = memories.filter(
      (_, index) => index !== indexToDelete
    );

    setMemories(updatedMemories);
    localStorage.setItem("memories", JSON.stringify(updatedMemories));
    setMemoryCount(updatedMemories.length);
  }

  function editMemory(indexToEdit) {
    const memory = memories[indexToEdit];

    setTitle(memory.title);
    setDescription(memory.description);
    setDate(memory.date);
    setImages(memory.images || []);
    setCategories(Array.isArray(memory.categories) ? memory.categories : []);

    setEditingIndex(indexToEdit);
    setPage("new");
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
          deleteMemory={deleteMemory}
          editMemory={editMemory}
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
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
        />
      )}
    </div>
  );
}

export default App;
