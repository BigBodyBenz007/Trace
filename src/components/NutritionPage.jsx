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

function NutritionPage({
  onBack,
  nutritionEntries,
  saveNutritionEntry,
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

  const sortedEntries = [...nutritionEntries].sort(
    (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
  );

  function saveFood(event) {
    event.preventDefault();

    if (name.trim() === "") return;

    const fallbackDateTime = getCurrentLocalDateTime();

    saveNutritionEntry({
      name: name.trim(),
      calories: toNutritionNumber(calories),
      protein: toNutritionNumber(protein),
      carbohydrates: toNutritionNumber(carbohydrates),
      fat: toNutritionNumber(fat),
      loggedAt: new Date(
        `${date || fallbackDateTime.date}T${time || fallbackDateTime.time}`
      ).toISOString(),
      notes: notes.trim(),
    });

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
  }

  function cancelEntry() {
    if (
      isDraftDirty &&
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

      <form
        onSubmit={saveFood}
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          maxWidth: "700px",
          padding: "24px",
          textAlign: "left",
          width: "100%",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Log Food</h2>

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
          Save Food
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
              </article>
            ))}
          </div>
        )}
      </section>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: "#666",
        }}
        onClick={onBack}
      >
        Back to Timeline
      </button>
    </div>
  );
}

export default NutritionPage;
