import { useState } from "react";
import { JOURNAL_RECOVERY_FORMAT_LEGACY } from "../services/journalVaultCrypto";

export function JournalPasswordField({ id, label, value, setValue, autoComplete = "current-password" }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="journal-privacy-field" htmlFor={id}>
      <span>{label}</span>
      <span className="journal-privacy-password">
        <input autoComplete={autoComplete} id={id} onChange={(event) => setValue(event.target.value)} type={visible ? "text" : "password"} value={value} />
        <button aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)} type="button">{visible ? "Hide" : "Show"}</button>
      </span>
    </label>
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
