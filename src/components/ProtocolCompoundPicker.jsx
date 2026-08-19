import { useEffect, useMemo, useRef, useState } from "react";
import { searchUnifiedCompounds } from "../services/compoundSearch";
import { formatCompoundCategory } from "../services/compoundIdentity";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";

function blankItem(name, reference) {
  return {
    compound: { name, ...(reference ? { reference } : {}) },
    dose: { amount: "", unit: "", customUnit: "" },
    route: { code: "", customLabel: "" },
    schedule: { type: "weekly-days", weekdays: [] },
    notes: "",
  };
}

function ProtocolCompoundPicker({ compounds = [], onSelect, onCancel, inputStyle = {} }) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const results = useMemo(
    () => searchUnifiedCompounds(query, compounds),
    [query, compounds]
  );
  const saved = results.filter(({ source }) => source === "saved");
  const trace = results.filter(({ source }) => source === "trace-catalog");
  const customName = query.trim().replace(/\s+/g, " ");
  const meaningful = /[a-z0-9]/i.test(customName);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (!searchFocused) return undefined;
    const viewport = window.visualViewport;
    const isNarrow = (viewport?.width || window.innerWidth) <= 768;
    if (!isNarrow) return undefined;

    let frame = null;
    function keepSearchVisible() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const input = searchRef.current;
        if (!input || document.activeElement !== input) return;
        const bounds = input.getBoundingClientRect();
        const top = (viewport?.offsetTop || 0) + 16;
        const bottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - 24;
        if (bounds.top < top || bounds.bottom > bottom) {
          input.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }
      });
    }

    // The first frame follows focus; viewport resize/scroll events handle the
    // later iOS keyboard geometry change without reacting to every keystroke.
    keepSearchVisible();
    viewport?.addEventListener?.("resize", keepSearchVisible);
    viewport?.addEventListener?.("scroll", keepSearchVisible);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      viewport?.removeEventListener?.("resize", keepSearchVisible);
      viewport?.removeEventListener?.("scroll", keepSearchVisible);
    };
  }, [searchFocused]);

  function selectSaved(compound) {
    onSelect({
      ...blankItem(compound.name, {
        source: "user-saved",
        sourceId: compound.id,
        modified: false,
      }),
      dose: {
        amount:
          compound.defaults.dose.amount === undefined
            ? ""
            : String(compound.defaults.dose.amount),
        unit: compound.defaults.dose.unit,
        customUnit: compound.defaults.dose.customUnit || "",
      },
      route: {
        code: compound.defaults.route.code,
        customLabel: compound.defaults.route.customLabel || "",
      },
    });
  }

  function selectTrace(compound) {
    onSelect(
      blankItem(compound.name, {
        source: "trace-catalog",
        sourceId: compound.id,
        category: compound.category,
        modified: false,
      })
    );
  }

  return (
    <section className="trace-feature-surface trace-protocol-picker" aria-label="Protocol compound picker" style={{ background: "#111827", border: "1px solid #4b5563", borderRadius: "12px", padding: "16px" }}>
      <h3 style={{ marginTop: 0 }}>Add Protocol Item</h3>
      <p style={{ color: "#d1d5db" }}>
        Saved values are your logging defaults. Trace Database results provide identity only.
      </p>
      <label style={{ display: "block" }}>
        Protocol compound search
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search compounds..."
          style={{ ...inputStyle, boxSizing: "border-box", marginTop: "8px", padding: "10px", scrollMarginBlock: "24px", width: "100%" }}
        />
      </label>

      {saved.length > 0 && (
        <section aria-label="Protocol Saved Compounds" style={{ marginTop: "16px" }}>
          <h4>Your Saved Compounds</h4>
          {saved.map(({ compound }) => (
            <div className="trace-search-result" key={compound.id} style={{ background: "#1f2937", borderRadius: "8px", marginTop: "8px", padding: "12px" }}>
              <strong>{compound.name}</strong>
              <span style={{ color: "#9ca3af", display: "block", marginTop: "4px" }}>
                Your saved defaults: {compound.defaults.dose.amount ?? "No amount"}{" "}
                {formatDoseUnit(compound.defaults.dose)} · {formatRoute(compound.defaults.route)}
              </span>
              <button className="trace-action trace-action--primary" type="button" aria-label={`Select saved protocol compound ${compound.name}`} onClick={() => selectSaved(compound)}>
                Select Saved Compound
              </button>
            </div>
          ))}
        </section>
      )}

      {trace.length > 0 && (
        <section aria-label="Protocol Trace Compound Database" style={{ marginTop: "16px" }}>
          <h4>Trace Compound Database</h4>
          {trace.map(({ compound, matchedAlias }) => (
            <div className="trace-search-result" key={compound.id} style={{ background: "#1f2937", borderRadius: "8px", marginTop: "8px", padding: "12px" }}>
              <strong>{compound.name}</strong>
              <span style={{ color: "#9ca3af", display: "block" }}>
                {formatCompoundCategory(compound.category)}
              </span>
              {matchedAlias && <span style={{ color: "#9ca3af", display: "block" }}>Matched alias: {matchedAlias}</span>}
              <button className="trace-action trace-action--primary" type="button" aria-label={`Select Trace protocol compound ${compound.name}`} onClick={() => selectTrace(compound)}>
                Select Trace Compound
              </button>
            </div>
          ))}
        </section>
      )}

      {meaningful && (
        <button className="trace-action trace-action--secondary" type="button" onClick={() => onSelect(blankItem(customName))} style={{ marginTop: "16px" }}>
          Use “{customName}” as Custom Compound
        </button>
      )}
      <button className="trace-action trace-action--secondary" type="button" onClick={onCancel} style={{ marginLeft: "8px", marginTop: "16px" }}>
        Cancel Add Item
      </button>
    </section>
  );
}

export default ProtocolCompoundPicker;
