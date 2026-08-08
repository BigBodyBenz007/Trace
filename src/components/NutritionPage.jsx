import { useState } from "react";

function toNutritionNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function getCurrentLocalDateTime() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    date: `${now.getFullYear()}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function getLocalDateTimeFromTimestamp(loggedAt) {
  const date = new Date(loggedAt);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function isSameLocalDate(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function NutritionPage({
  onBack,
  nutritionEntries,
  saveNutritionEntry,
  updateNutritionEntry,
  deleteNutritionEntry,
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const initialDateTime = getCurrentLocalDateTime();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [fat, setFat] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [notes, setNotes] = useState("");
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);

  const sortedEntries = [...nutritionEntries].sort(
    (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
  );
  const today = new Date();
  const todayTotals = nutritionEntries.reduce(
    (totals, entry) => {
      if (!isSameLocalDate(new Date(entry.loggedAt), today)) {
        return totals;
      }

      return {
        calories: totals.calories + toNutritionNumber(entry.calories),
        protein: totals.protein + toNutritionNumber(entry.protein),
        carbohydrates:
          totals.carbohydrates + toNutritionNumber(entry.carbohydrates),
        fat: totals.fat + toNutritionNumber(entry.fat),
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }
  );

  function saveFood(event) {
    event.preventDefault();

    if (name.trim() === "") return;

    const fallbackDateTime = getCurrentLocalDateTime();

    const entry = {
      name: name.trim(),
      calories: toNutritionNumber(calories),
      protein: toNutritionNumber(protein),
      carbohydrates: toNutritionNumber(carbohydrates),
      fat: toNutritionNumber(fat),
      loggedAt: new Date(
        `${date || fallbackDateTime.date}T${time || fallbackDateTime.time}`
      ).toISOString(),
      notes: notes.trim(),
    };

    if (editingEntryId === null) {
      saveNutritionEntry(entry);
    } else {
      updateNutritionEntry(editingEntryId, entry);
    }

    resetForm();
  }

  function resetForm() {
    const currentDateTime = getCurrentLocalDateTime();

    setName("");
    setCalories("");
    setProtein("");
    setCarbohydrates("");
    setFat("");
    setDate(currentDateTime.date);
    setTime(currentDateTime.time);
    setNotes("");
    setIsDraftDirty(false);
    setEditingEntryId(null);
  }

  function editEntry(entry) {
    const localDateTime = getLocalDateTimeFromTimestamp(entry.loggedAt);

    setName(entry.name);
    setCalories(String(entry.calories));
    setProtein(String(entry.protein));
    setCarbohydrates(String(entry.carbohydrates));
    setFat(String(entry.fat));
    setDate(localDateTime.date);
    setTime(localDateTime.time);
    setNotes(entry.notes);
    setIsDraftDirty(false);
    setEditingEntryId(entry.id);
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this nutrition entry?")) return;

    deleteNutritionEntry(id);

    if (editingEntryId === id) {
      resetForm();
    }
  }

  function cancelEntry() {
    if (
      (editingEntryId !== null || isDraftDirty) &&
      !window.confirm("Discard this entry? Your unsaved changes will be lost.")
    ) {
      return;
    }

    resetForm();
  }

  const formInputStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "18px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "12px",
    width: "100%",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "10px" }}>Health & Nutrition</h1>

      <p style={{ color: "#bbb", marginBottom: "30px" }}>
        Track your food and nutrition here.
      </p>

      <section
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          maxWidth: "700px",
          padding: "24px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Today</h2>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          }}
        >
          <div>
            <strong>Calories</strong>
            <p style={{ marginBottom: 0 }}>{todayTotals.calories}</p>
          </div>
          <div>
            <strong>Protein (g)</strong>
            <p style={{ marginBottom: 0 }}>{todayTotals.protein}</p>
          </div>
          <div>
            <strong>Carbohydrates (g)</strong>
            <p style={{ marginBottom: 0 }}>{todayTotals.carbohydrates}</p>
          </div>
          <div>
            <strong>Fat (g)</strong>
            <p style={{ marginBottom: 0 }}>{todayTotals.fat}</p>
          </div>
        </div>
      </section>

      <form
        onSubmit={saveFood}
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          marginTop: "24px",
          maxWidth: "700px",
          padding: "24px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {editingEntryId === null ? "Log Food" : "Edit Food"}
        </h2>

        <label style={{ display: "block" }}>
          Food / meal name
          <input
            required
            style={formInputStyle}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setIsDraftDirty(true);
            }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            marginTop: "16px",
          }}
        >
          {[
            ["Calories", calories, setCalories],
            ["Protein (g)", protein, setProtein],
            ["Carbohydrates (g)", carbohydrates, setCarbohydrates],
            ["Fat (g)", fat, setFat],
          ].map(([label, value, setValue]) => (
            <label key={label} style={{ display: "block" }}>
              {label}
              <input
                type="number"
                min="0"
                step="any"
                style={formInputStyle}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setIsDraftDirty(true);
                }}
              />
            </label>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: "16px",
          }}
        >
          <label style={{ display: "block" }}>
            Date
            <input
              type="date"
              style={formInputStyle}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setIsDraftDirty(true);
              }}
            />
          </label>

          <label style={{ display: "block" }}>
            Time
            <input
              type="time"
              style={formInputStyle}
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setIsDraftDirty(true);
              }}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: "16px" }}>
          Notes (optional)
          <textarea
            style={{
              ...formInputStyle,
              height: "110px",
              resize: "vertical",
            }}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setIsDraftDirty(true);
            }}
          />
        </label>

        <button type="submit" style={buttonStyle}>
          {editingEntryId === null ? "Save Entry" : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={cancelEntry}
          style={{
            ...buttonStyle,
            backgroundColor: "#666",
            marginLeft: "10px",
          }}
        >
          Cancel Entry
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            ...buttonStyle,
            backgroundColor: "#666",
            marginLeft: "10px",
          }}
        >
          Back to Timeline
        </button>
      </form>

      <section
        style={{
          marginTop: "30px",
          maxWidth: "700px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2>Saved Entries</h2>

        {sortedEntries.length === 0 ? (
          <p style={{ color: "#bbb" }}>No food entries yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {sortedEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  background: "#1f2937",
                  borderRadius: "12px",
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
                  <h3 style={{ margin: 0 }}>{entry.name}</h3>
                  <span style={{ color: "#9ca3af" }}>
                    {new Date(entry.loggedAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ lineHeight: "1.6", marginBottom: 0 }}>
                  {entry.calories} calories · Protein {entry.protein}g ·
                  Carbohydrates {entry.carbohydrates}g · Fat {entry.fat}g
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
        )}
      </section>

    </div>
  );
}

export default NutritionPage;
