import { useState } from "react";
import {
  DOSE_UNIT_OPTIONS,
  ROUTE_OPTIONS,
} from "../constants/medicationOptions";
import { getCompoundDefinitionError } from "../services/compoundCatalog";

function SavedCompoundEditor({
  compound,
  onSave,
  onCancel,
  buttonStyle,
  inputStyle,
}) {
  const [name, setName] = useState(compound.name);
  const [defaultDoseAmount, setDefaultDoseAmount] = useState(
    compound.defaults.dose.amount === undefined
      ? ""
      : String(compound.defaults.dose.amount)
  );
  const [doseUnit, setDoseUnit] = useState(compound.defaults.dose.unit);
  const [customDoseUnit, setCustomDoseUnit] = useState(
    compound.defaults.dose.customUnit || ""
  );
  const [route, setRoute] = useState(compound.defaults.route.code);
  const [customRoute, setCustomRoute] = useState(
    compound.defaults.route.customLabel || ""
  );
  const [formError, setFormError] = useState("");

  const formInputStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "18px",
    marginTop: "8px",
    maxWidth: "100%",
    padding: "12px",
    width: "100%",
  };

  function save(event) {
    event.preventDefault();
    const draft = {
      name,
      defaultDoseAmount,
      doseUnit,
      customDoseUnit,
      route,
      customRoute,
    };
    const validationError = getCompoundDefinitionError(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const result = onSave(compound.id, draft);
    if (result?.status !== "updated") {
      setFormError(
        result?.message || "The saved compound could not be updated."
      );
      return;
    }

    onCancel();
  }

  function change(setValue, value) {
    setValue(value);
    setFormError("");
  }

  return (
    <form
      className="trace-feature-surface trace-feature-form trace-saved-compound-editor"
      onSubmit={save}
      style={{
        background: "#1f2937",
        border: "1px solid #4b5563",
        borderRadius: "16px",
        marginBottom: "24px",
        maxWidth: "700px",
        padding: "24px",
        textAlign: "left",
        width: "100%",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Edit Saved Compound</h2>
      <p style={{ color: "#d1d5db" }}>
        Changes apply only to this reusable definition. Historical entries are
        not changed.
      </p>

      <label style={{ display: "block" }}>
        Saved compound name
        <input
          maxLength={120}
          required
          style={formInputStyle}
          value={name}
          onChange={(event) => change(setName, event.target.value)}
        />
      </label>

      <div
        style={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
          marginTop: "16px",
        }}
      >
        <label style={{ display: "block" }}>
          Saved default dose amount (optional)
          <input
            type="number"
            min="0"
            step="any"
            style={formInputStyle}
            value={defaultDoseAmount}
            onChange={(event) =>
              change(setDefaultDoseAmount, event.target.value)
            }
          />
        </label>

        <label style={{ display: "block" }}>
          Saved dose unit
          <select
            style={formInputStyle}
            value={doseUnit}
            onChange={(event) => change(setDoseUnit, event.target.value)}
          >
            {DOSE_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {doseUnit === "custom" && (
        <label style={{ display: "block", marginTop: "16px" }}>
          Saved custom dose unit
          <input
            maxLength={30}
            required
            style={formInputStyle}
            value={customDoseUnit}
            onChange={(event) => change(setCustomDoseUnit, event.target.value)}
          />
        </label>
      )}

      <label style={{ display: "block", marginTop: "16px" }}>
        Saved method / route
        <select
          style={formInputStyle}
          value={route}
          onChange={(event) => change(setRoute, event.target.value)}
        >
          {ROUTE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {route === "other" && (
        <label style={{ display: "block", marginTop: "16px" }}>
          Saved other method / route
          <input
            maxLength={80}
            required
            style={formInputStyle}
            value={customRoute}
            onChange={(event) => change(setCustomRoute, event.target.value)}
          />
        </label>
      )}

      {formError && (
        <p role="alert" style={{ color: "#fca5a5" }}>
          {formError}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button className="trace-action trace-action--primary" type="submit" style={buttonStyle}>
          Save Saved Compound
        </button>
        <button
          className="trace-action trace-action--secondary"
          type="button"
          onClick={onCancel}
          style={{ ...buttonStyle, backgroundColor: "#666" }}
        >
          Cancel Saved Compound Edit
        </button>
      </div>
    </form>
  );
}

export default SavedCompoundEditor;
