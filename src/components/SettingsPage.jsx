import { useEffect, useRef, useState } from "react";
import {
  APP_THEMES,
  normalizeAppThemeId,
} from "../services/appThemes";
import {
  HOME_MODULES,
  normalizeHomeVisibility,
} from "../services/homeModules";
import {
  MOTION_PREFERENCES,
  normalizeMotionPreference,
} from "../services/appSettings";
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

  function changeTheme(themeId) {
    saveSettings({ ...settings, themeId });
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

  function changeMotionPreference(motionPreference) {
    if (motionPreference === selectedMotionPreference) return;
    saveSettings({ ...settings, motionPreference });
  }

  const selectedThemeId = normalizeAppThemeId(settings?.themeId);
  const homeVisibility = normalizeHomeVisibility(settings?.homeVisibility);
  const selectedMotionPreference = normalizeMotionPreference(settings?.motionPreference);

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
    <section aria-labelledby="app-theme-heading" className="life-current-theme-settings app-theme-settings">
      <h2 id="app-theme-heading">App Theme</h2>
      <p className="life-current-theme-settings__intro">Choose Trace&apos;s presentation throughout the app.</p>
      <div aria-labelledby="app-theme-heading" className="life-current-theme-options" role="radiogroup">
        {APP_THEMES.map((theme) => {
          const selected = selectedThemeId === theme.id;
          const descriptionId = `app-theme-${theme.id}-description`;
          return (
            <label
              className="life-current-theme-option"
              data-selected={selected ? "true" : "false"}
              key={theme.id}
            >
              <input
                aria-describedby={descriptionId}
                checked={selected}
                name="app-theme"
                onChange={() => changeTheme(theme.id)}
                type="radio"
                value={theme.id}
              />
              <span aria-hidden="true" className={`life-current-theme-swatch life-current-theme-swatch--${theme.id}`} />
              <span className="life-current-theme-option__copy">
                <span className="life-current-theme-option__heading">
                  <strong>{theme.label}</strong>
                  {selected && <span className="life-current-theme-option__selected">✓ Selected</span>}
                </span>
                <span id={descriptionId} className="life-current-theme-option__description">{theme.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
    <section aria-labelledby="motion-effects-heading" className="motion-preference-settings">
      <h2 id="motion-effects-heading">Motion &amp; Effects</h2>
      <p className="motion-preference-settings__intro">Choose how much nonessential movement Trace uses.</p>
      <div aria-labelledby="motion-effects-heading" className="motion-preference-options" role="radiogroup">
        {[
          {
            description: "Uses normal Trace motion when your device permits it.",
            label: "Standard motion",
            value: MOTION_PREFERENCES.STANDARD,
          },
          {
            description: "Minimizes nonessential movement while keeping feedback and progress clear.",
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
