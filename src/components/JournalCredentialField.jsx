import { useState } from "react";
import { JOURNAL_RECOVERY_FORMAT_LEGACY } from "../services/journalVaultCrypto";

export async function copyTextToClipboard(value, {
  browserDocument = document,
  browserNavigator = window.navigator,
} = {}) {
  try {
    if (!browserNavigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await browserNavigator.clipboard.writeText(value);
    return;
  } catch (clipboardError) {
    const temporary = browserDocument.createElement("textarea");
    temporary.setAttribute("aria-hidden", "true");
    temporary.setAttribute("readonly", "");
    temporary.setAttribute("tabindex", "-1");
    temporary.style.fontSize = "16px";
    temporary.style.opacity = "0";
    temporary.style.position = "fixed";
    temporary.style.inset = "0 auto auto 0";
    temporary.value = value;
    browserDocument.body.appendChild(temporary);
    try {
      temporary.focus();
      temporary.select();
      temporary.setSelectionRange(0, temporary.value.length);
      if (!browserDocument.execCommand?.("copy")) throw new Error("Clipboard fallback unavailable");
    } finally {
      temporary.remove();
    }
  }
}

export function JournalPasswordField({
  id,
  label,
  value,
  setValue,
  autoComplete = "current-password",
  copyable = false,
}) {
  const [visible, setVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  function changeValue(event) {
    setCopyStatus("");
    setValue(event.target.value);
  }

  async function copyPassword() {
    try {
      await copyTextToClipboard(value);
      setCopyStatus("Journal password copied. Save it in your password manager before continuing.");
    } catch (copyError) {
      setCopyStatus("Journal password could not be copied. Show it and copy it manually before continuing.");
    }
  }

  return (
    <div className="journal-privacy-field">
      <label htmlFor={id}>{label}</label>
      <div className="journal-privacy-password">
        <input autoComplete={autoComplete} id={id} name="password" onChange={changeValue} type={visible ? "text" : "password"} value={value} />
        <button aria-controls={id} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)} type="button">{visible ? "Hide" : "Show"}</button>
      </div>
      {copyable && (
        <div className="journal-password-copy">
          <button className="trace-action trace-action--secondary" disabled={!value} onClick={copyPassword} type="button">Copy Journal Password</button>
          {copyStatus && <p aria-live="polite" role="status">{copyStatus}</p>}
        </div>
      )}
    </div>
  );
}

export default function JournalCredentialField({ type, setType, value, setValue, recoveryFormat, idPrefix = "journal-current" }) {
  const legacy = recoveryFormat === JOURNAL_RECOVERY_FORMAT_LEGACY;
  return (
    <fieldset className="journal-privacy-credential">
      <legend>Verify with</legend>
      <label><input checked={type === "passphrase"} name={`${idPrefix}-credential-type`} onChange={() => { setType("passphrase"); setValue(""); }} type="radio" /> Use current Journal password</label>
      <label><input checked={type === "recovery-key"} name={`${idPrefix}-credential-type`} onChange={() => { setType("recovery-key"); setValue(""); }} type="radio" /> {legacy ? "Use legacy recovery key" : "Use recovery phrase"}</label>
      {type === "passphrase" ? (
        <JournalPasswordField id={`${idPrefix}-passphrase`} label="Current Journal password" value={value} setValue={setValue} />
      ) : (
        <label className="journal-privacy-field" htmlFor={`${idPrefix}-recovery`}>
          <span>{legacy ? "Legacy recovery key" : "Recovery phrase"}</span>
          <textarea id={`${idPrefix}-recovery`} autoComplete="off" autoCapitalize="none" spellCheck="false" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
      )}
    </fieldset>
  );
}
