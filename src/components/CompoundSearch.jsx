import { useEffect, useMemo, useState } from "react";
import { searchUnifiedCompounds } from "../services/compoundSearch";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";
import { formatCompoundCategory } from "../services/compoundIdentity";

function CompoundSearch({
  compounds,
  onSelectCompound,
  onSelectBuiltInCompound = () => {},
  onUseCustomCompound = () => {},
  onEditCompound,
  inputStyle,
  resetKey,
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchUnifiedCompounds(query, compounds),
    [query, compounds]
  );
  const savedResults = results.filter(({ source }) => source === "saved");
  const builtInResults = results.filter(
    ({ source }) => source === "trace-catalog"
  );
  const customName = query.trim().replace(/\s+/g, " ");
  const hasMeaningfulQuery = /[a-z0-9]/i.test(customName);

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
      <h2 style={{ marginTop: 0 }}>Search Compounds</h2>
      <p style={{ color: "#d1d5db" }}>
        Search your saved logging defaults and the Trace Compound Database, or
        continue with a custom compound.
      </p>
      <label style={{ display: "block" }}>
        Compound search
        <input
          type="search"
          placeholder="Search compounds..."
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

      {savedResults.length > 0 && (
        <section aria-label="Your Saved Compounds" style={{ marginTop: "20px" }}>
          <h3>Your Saved Compounds</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {savedResults.map(({ compound }) => {
              const defaultDose = compound.defaults.dose;
              return (
                <div key={compound.id} style={{ background: "#111827", border: "1px solid #4b5563", borderRadius: "12px", overflowWrap: "anywhere", padding: "14px" }}>
                  <span style={{ background: "#374151", borderRadius: "999px", color: "#dbeafe", display: "inline-block", fontSize: "12px", marginBottom: "6px", padding: "3px 8px" }}>
                    Saved Compound
                  </span>
                  <strong style={{ display: "block" }}>{compound.name}</strong>
                  <span style={{ color: "#9ca3af", display: "block", marginTop: "6px" }}>
                    Saved defaults: {defaultDose.amount ?? "No amount"}{" "}
                    {formatDoseUnit(defaultDose)} · {formatRoute(compound.defaults.route)}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                    <button type="button" aria-label={`Select saved compound ${compound.name}`} onClick={() => onSelectCompound(compound)} style={{ background: "#2563eb", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", padding: "8px 16px" }}>
                      Select
                    </button>
                    <button type="button" aria-label={`Edit saved compound ${compound.name}`} onClick={() => onEditCompound(compound)} style={{ background: "#4b5563", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", padding: "8px 16px" }}>
                      Edit Saved Compound
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {builtInResults.length > 0 && (
        <section aria-label="Trace Compound Database" style={{ marginTop: "20px" }}>
          <h3>Trace Compound Database</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {builtInResults.map(({ compound, matchedAlias }) => (
              <div key={compound.id} style={{ background: "#111827", border: "1px solid #1e3a5f", borderRadius: "12px", overflowWrap: "anywhere", padding: "14px" }}>
                <span style={{ background: "#1e3a5f", borderRadius: "999px", color: "#dbeafe", display: "inline-block", fontSize: "12px", marginBottom: "6px", padding: "3px 8px" }}>
                  Trace Database
                </span>
                <strong style={{ display: "block" }}>{compound.name}</strong>
                <span style={{ color: "#9ca3af", display: "block", marginTop: "6px" }}>
                  {formatCompoundCategory(compound.category)}
                </span>
                {matchedAlias && (
                  <span style={{ color: "#9ca3af", display: "block", marginTop: "4px" }}>
                    Matched alias: {matchedAlias}
                  </span>
                )}
                <button type="button" aria-label={`Select Trace compound ${compound.name}`} onClick={() => onSelectBuiltInCompound(compound)} style={{ background: "#2563eb", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", marginTop: "10px", padding: "8px 16px" }}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasMeaningfulQuery && savedResults.length === 0 && builtInResults.length === 0 && (
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>No matching compounds found.</p>
      )}

      {hasMeaningfulQuery && (
        <section aria-label="Create New Compound" style={{ borderTop: "1px solid #4b5563", marginTop: "20px", paddingTop: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Create New Compound</h3>
          <p style={{ color: "#d1d5db" }}>
            Continue with your own entry. Nothing is created or saved automatically.
          </p>
          <button type="button" onClick={() => onUseCustomCompound(customName)} style={{ background: "#4b5563", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", padding: "8px 16px" }}>
            Use “{customName}” as Custom Compound
          </button>
        </section>
      )}
    </section>
  );
}

export default CompoundSearch;
