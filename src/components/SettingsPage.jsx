import { useEffect, useRef, useState } from "react";
import {
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "../services/lifeCurrentThemes";
import {
  HOME_MODULES,
  normalizeHomeVisibility,
} from "../services/homeModules";
import ConfirmationMessage from "./ConfirmationMessage";

const OPTIONS = [
  { key: "weight", label: "Body Weight", values: [["lb", "Pounds (lb)"], ["kg", "Kilograms (kg)"]] },
  { key: "height", label: "Height", values: [["ft-in", "Feet + inches (ft/in)"], ["cm", "Centimeters (cm)"]] },
  { key: "circumference", label: "Body Measurements / Circumference", values: [["in", "Inches (in)"], ["cm", "Centimeters (cm)"]] },
];

export default function SettingsPage({ settings, updateSettings, onBack, onOpenBackup, buttonStyle, containerStyle }) {
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

  function changeHomeVisibility(moduleId, visible) {
    saveSettings({
      ...settings,
      homeVisibility: {
        ...normalizeHomeVisibility(settings?.homeVisibility),
        [moduleId]: visible,
      },
    });
  }

  const selectedThemeId = normalizeLifeCurrentThemeId(settings?.lifeCurrentThemeId);
  const homeVisibility = normalizeHomeVisibility(settings?.homeVisibility);

  return <main className="trace-feature-page trace-feature-page--settings" data-testid="settings-page" style={{ ...containerStyle, justifyContent: "flex-start" }}>
    <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Trace preferences</p>
      <h1>Settings</h1>
      <p className="trace-feature-page__lede">Choose how Trace presents your records.</p>
    </header>
    <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
    <ConfirmationMessage message={status} />
    <section className="trace-feature-section trace-settings-backup" aria-labelledby="backup-settings-heading">
      <h2 id="backup-settings-heading">Backup &amp; Restore</h2>
      <p>Save a private copy of your Trace data or restore a previously created backup.</p>
      <button className="trace-action trace-action--primary" type="button" onClick={onOpenBackup} style={buttonStyle}>Backup &amp; Restore</button>
    </section>
    <section className="trace-feature-section trace-settings-home" aria-labelledby="customize-home-heading">
      <h2 id="customize-home-heading">Customize Home</h2>
      <h3>Make Trace yours</h3>
      <p>Choose which tools appear on your Home screen. Hiding a tool won&apos;t delete your information, and you can bring it back anytime.</p>
      <div className="trace-home-visibility-options">
        {HOME_MODULES.map((module) => {
          const visible = homeVisibility[module.id];
          return (
            <label className="trace-home-visibility-option" data-visible={visible ? "true" : "false"} key={module.id}>
              <span>{module.label}</span>
              <span className="trace-home-visibility-option__control">
                <input
                  aria-label={`Show ${module.label} on Home`}
                  checked={visible}
                  onChange={(event) => changeHomeVisibility(module.id, event.target.checked)}
                  role="switch"
                  type="checkbox"
                />
                <span aria-hidden="true" className="trace-home-visibility-option__track" />
                <span className="trace-home-visibility-option__state">{visible ? "Shown" : "Hidden"}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
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
    <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#4b5563", fontSize: "16px", marginTop: "24px", minHeight: "44px", padding: "10px 14px" }}>Back to Timeline</button>
  </main>;
}
