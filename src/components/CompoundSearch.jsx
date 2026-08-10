import { useEffect, useMemo, useState } from "react";
import { searchCompounds } from "../services/compoundSearch";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";

function CompoundSearch({
  compounds,
  onSelectCompound,
  onEditCompound,
  inputStyle,
  resetKey,
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchCompounds(query, compounds),
    [query, compounds]
  );
  const hasMeaningfulQuery = /[a-z0-9]/i.test(query);

  useEffect(() => setQuery(""), [resetKey]);

  return (
    <section
      style={{
        background: "#1f2937",
        borderRadius: "16px",
        marginBottom: "24px",
        maxWidth: "700px",
        padding: "24px",
        textAlign: "left",
        width: "100%",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Find a Saved Compound</h2>
      <p style={{ color: "#d1d5db" }}>
        Search definitions you previously saved, or enter a new compound below.
      </p>
      <label style={{ display: "block" }}>
        Saved compound search
        <input
          type="search"
          placeholder="Search saved compounds by name..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            ...inputStyle,
            boxSizing: "border-box",
            fontSize: "18px",
            marginTop: "8px",
            maxWidth: "100%",
            padding: "12px",
            width: "100%",
          }}
        />
      </label>

      {results.length > 0 && (
        <div
          aria-label="Saved compound search results"
          style={{ display: "grid", gap: "10px", marginTop: "16px" }}
        >
          {results.map((compound) => {
            const defaultDose = compound.defaults.dose;

            return (
              <div
                key={compound.id}
                style={{
                  background: "#111827",
                  border: "1px solid #4b5563",
                  borderRadius: "12px",
                  overflowWrap: "anywhere",
                  padding: "14px",
                  width: "100%",
                }}
              >
                <strong>{compound.name}</strong>
                <span
                  style={{
                    color: "#9ca3af",
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  Saved defaults: {defaultDose.amount ?? "No amount"}{" "}
                  {formatDoseUnit(defaultDose)} ·{" "}
                  {formatRoute(compound.defaults.route)}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Select ${compound.name}`}
                    onClick={() => onSelectCompound(compound)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit saved compound ${compound.name}`}
                    onClick={() => onEditCompound(compound)}
                    style={{
                      background: "#4b5563",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Edit Saved Compound
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMeaningfulQuery && results.length === 0 && (
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          No saved compounds found. You can enter this compound manually below.
        </p>
      )}
    </section>
  );
}

export default CompoundSearch;
