import { useEffect, useRef, useState } from "react";
import {
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "../services/lifeCurrentThemes";
import {
  MOTION_PREFERENCES,
  normalizeMotionPreference,
} from "../services/appSettings";

const OPTIONS = [
  { key: "weight", label: "Body Weight", values: [["lb", "Pounds (lb)"], ["kg", "Kilograms (kg)"]] },
  { key: "height", label: "Height", values: [["ft-in", "Feet + inches (ft/in)"], ["cm", "Centimeters (cm)"]] },
  { key: "circumference", label: "Body Measurements / Circumference", values: [["in", "Inches (in)"], ["cm", "Centimeters (cm)"]] },
];

export default function SettingsPage({
  settings,
  updateSettings,
  onBack,
  onMotionPreferenceSaved = () => {},
  buttonStyle,
  containerStyle,
}) {
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

  function changeMotionPreference(motionPreference) {
    if (motionPreference === selectedMotionPreference) return;
    const saved = updateSettings({ ...settings, motionPreference });
    if (saved) onMotionPreferenceSaved();
  }

  const selectedThemeId = normalizeLifeCurrentThemeId(settings?.lifeCurrentThemeId);
  const selectedMotionPreference = normalizeMotionPreference(settings?.motionPreference);

  return <main className="trace-feature-page trace-feature-page--settings" data-testid="settings-page" style={{ ...containerStyle, justifyContent: "flex-start" }}>
    <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Trace preferences</p>
      <h1>Settings</h1>
      <p className="trace-feature-page__lede">Choose how Trace presents your records.</p>
    </header>
    <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
    {status && <p className="trace-status trace-status--success" role="status" style={{ background: "#14532d", borderRadius: "10px", color: "white", maxWidth: "620px", padding: "10px 12px", width: "100%" }}>{status}</p>}
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
    <section className="trace-feature-section trace-settings-units" aria-labelledby="units-heading" style={{ marginTop: "32px", maxWidth: "620px", textAlign: "left", width: "100%" }}>
      <h2 id="units-heading">Units</h2>
      <div style={{ display: "grid", gap: "14px" }}>{OPTIONS.map((option) => <fieldset key={option.key} style={{ border: "1px solid #374151", borderRadius: "12px", boxSizing: "border-box", margin: 0, padding: "14px", width: "100%" }}>
        <legend>{option.label}</legend>
        <div style={{ display: "grid", gap: "10px" }}>{option.values.map(([value, label]) => <label key={value} style={{ alignItems: "center", display: "flex", gap: "10px", minHeight: "44px" }}><input type="radio" name={option.key} value={value} checked={settings.units[option.key] === value} onChange={() => changeUnit(option.key, value)} />{label}</label>)}</div>
      </fieldset>)}</div>
    </section>
    <section aria-labelledby="motion-effects-heading" className="motion-preference-settings">
      <h2 id="motion-effects-heading">Motion &amp; Effects</h2>
      <p className="motion-preference-settings__intro">Choose how much nonessential movement Trace uses.</p>
      <div aria-labelledby="motion-effects-heading" className="motion-preference-options" role="radiogroup">
        {[
          {
            description: "Keeps Trace's full movement and visual effects.",
            label: "Standard motion",
            value: MOTION_PREFERENCES.STANDARD,
          },
          {
            description: "Softens nonessential movement while keeping feedback and progress clear.",
            label: "Reduced motion",
            value: MOTION_PREFERENCES.REDUCED,
          },
        ].map((option) => {
          const selected = selectedMotionPreference === option.value;
          const descriptionId = `motion-preference-${option.value}-description`;
          return (
            <label
              className="motion-preference-option"
              data-selected={selected ? "true" : "false"}
              key={option.value}
            >
              <input
                aria-describedby={descriptionId}
                checked={selected}
                name="motion-preference"
                onChange={() => changeMotionPreference(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="motion-preference-option__copy">
                <span className="motion-preference-option__heading">
                  <strong>{option.label}</strong>
                  {selected && <span className="motion-preference-option__selected">Selected</span>}
                </span>
                <span className="motion-preference-option__description" id={descriptionId}>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
    <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", marginTop: "24px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
  </main>;
}
