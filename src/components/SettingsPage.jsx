import { useEffect, useRef, useState } from "react";
import {
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "../services/lifeCurrentThemes";

const OPTIONS = [
  { key: "weight", label: "Body Weight", values: [["lb", "Pounds (lb)"], ["kg", "Kilograms (kg)"]] },
  { key: "height", label: "Height", values: [["ft-in", "Feet + inches (ft/in)"], ["cm", "Centimeters (cm)"]] },
  { key: "circumference", label: "Body Measurements / Circumference", values: [["in", "Inches (in)"], ["cm", "Centimeters (cm)"]] },
];

export default function SettingsPage({ settings, updateSettings, onBack, buttonStyle, containerStyle }) {
  const [status, setStatus] = useState("");
  const statusTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(statusTimerRef.current), []);

  function saveSettings(nextSettings) {
    const saved = updateSettings(nextSettings);
    if (!saved) return;
    setStatus("Settings saved");
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(""), 2200);
  }

  function changeUnit(key, value) {
    saveSettings({ ...settings, units: { ...settings.units, [key]: value } });
  }

  function changeLifeCurrentTheme(lifeCurrentThemeId) {
    saveSettings({ ...settings, lifeCurrentThemeId });
  }

  const selectedThemeId = normalizeLifeCurrentThemeId(settings?.lifeCurrentThemeId);

  return <main data-testid="settings-page" style={{ ...containerStyle, justifyContent: "flex-start" }}>
    <h1>Settings</h1>
    <button type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
    {status && <p role="status" style={{ background: "#14532d", borderRadius: "10px", color: "white", maxWidth: "620px", padding: "10px 12px", width: "100%" }}>{status}</p>}
    <section aria-labelledby="life-current-theme-heading" className="life-current-theme-settings">
      <h2 id="life-current-theme-heading">Life Current Theme</h2>
      <p className="life-current-theme-settings__intro">Choose how your timeline journey is presented.</p>
      <div className="life-current-theme-options">
        {LIFE_CURRENT_THEMES.map((theme) => {
          const selected = selectedThemeId === theme.id;
          const descriptionId = `life-current-theme-${theme.id}-description`;
          return (
            <label
              className="life-current-theme-option"
              data-selected={selected ? "true" : "false"}
              key={theme.id}
            >
              <input
                aria-describedby={descriptionId}
                checked={selected}
                name="life-current-theme"
                onChange={() => changeLifeCurrentTheme(theme.id)}
                type="radio"
                value={theme.id}
              />
              <span aria-hidden="true" className={`life-current-theme-swatch life-current-theme-swatch--${theme.id}`} />
              <span className="life-current-theme-option__copy">
                <span className="life-current-theme-option__heading">
                  <strong>{theme.name}</strong>
                  {selected && <span className="life-current-theme-option__selected">✓ Selected</span>}
                </span>
                <span id={descriptionId} className="life-current-theme-option__description">{theme.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
    <section aria-labelledby="units-heading" style={{ marginTop: "32px", maxWidth: "620px", textAlign: "left", width: "100%" }}>
      <h2 id="units-heading">Units</h2>
      <div style={{ display: "grid", gap: "14px" }}>{OPTIONS.map((option) => <fieldset key={option.key} style={{ border: "1px solid #374151", borderRadius: "12px", boxSizing: "border-box", margin: 0, padding: "14px", width: "100%" }}>
        <legend>{option.label}</legend>
        <div style={{ display: "grid", gap: "10px" }}>{option.values.map(([value, label]) => <label key={value} style={{ alignItems: "center", display: "flex", gap: "10px", minHeight: "44px" }}><input type="radio" name={option.key} value={value} checked={settings.units[option.key] === value} onChange={() => changeUnit(option.key, value)} />{label}</label>)}</div>
      </fieldset>)}</div>
    </section>
    <button type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", marginTop: "24px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
  </main>;
}
