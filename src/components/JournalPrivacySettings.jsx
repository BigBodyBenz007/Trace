import { useCallback, useState } from "react";
import { JOURNAL_AUTO_LOCK_MINUTES } from "../services/appSettings";
import {
  generateRecoveryPhrase,
  JOURNAL_RECOVERY_FORMAT_LEGACY,
} from "../services/journalVaultCrypto";
import JournalCredentialField, { JournalPasswordField } from "./JournalCredentialField";
import JournalDisableDialog from "./JournalDisableDialog";
import JournalLockSetupDialog, { journalPrivacySetupAvailable } from "./JournalLockSetupDialog";
import JournalPasswordSaveControls from "./JournalPasswordSaveControls";
import JournalRecoveryKey from "./JournalRecoveryKey";
import PrivacyDialog from "./PrivacyDialog";

function credential(type, value) {
  return { type, value };
}

export default function JournalPrivacySettings({
  enabled,
  unlocked,
  malformed = false,
  recoveryFormat,
  autoLockMinutes = 5,
  onAutoLockChange,
  onEnable,
  onChangePassphrase,
  onRotateRecovery,
  onLock,
  onDisable,
}) {
  const [dialog, setDialog] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [passwordAcknowledged, setPasswordAcknowledged] = useState(false);
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [credentialType, setCredentialType] = useState("passphrase");
  const [credentialValue, setCredentialValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const closeDialog = useCallback(() => {
    if (busy) return;
    setDialog(null);
    setPassphrase("");
    setConfirmPassphrase("");
    setRecoveryPhrase("");
    setPasswordAcknowledged(false);
    setRecoveryAcknowledged(false);
    setCredentialValue("");
    setCredentialType("passphrase");
    setError("");
  }, [busy]);

  function open(nextDialog) {
    setStatus("");
    setError("");
    setDialog(nextDialog);
    if (nextDialog === "change-passphrase") {
      setPasswordAcknowledged(false);
    }
    if (nextDialog === "rotate") {
      try {
        setRecoveryPhrase(generateRecoveryPhrase());
        setRecoveryAcknowledged(false);
      } catch (cryptoError) {
        setDialog(null);
        setStatus("Secure browser cryptography is unavailable. Journal privacy cannot be changed here.");
      }
    }
  }

  async function changePassphrase(event) {
    event.preventDefault();
    if (passphrase.length < 12) {
      setError("Use a new Journal password of at least 12 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("The new Journal passwords do not match.");
      return;
    }
    if (!passwordAcknowledged) {
      setError("Confirm that you saved your Journal password before changing it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onChangePassphrase(credential(credentialType, credentialValue), passphrase);
      setStatus("Journal password changed.");
      setDialog(null);
      setCredentialValue("");
      setPassphrase("");
      setConfirmPassphrase("");
      setPasswordAcknowledged(false);
    } catch (changeError) {
      setError("Journal credentials could not be verified. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateRecovery(event) {
    event.preventDefault();
    if (!recoveryAcknowledged) {
      setError("Confirm that you saved your recovery phrase before replacing recovery access.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onRotateRecovery(credential(credentialType, credentialValue), recoveryPhrase);
      setStatus("Recovery phrase replaced. The previous recovery credential no longer works.");
      setDialog(null);
      setCredentialValue("");
      setRecoveryPhrase("");
      setRecoveryAcknowledged(false);
    } catch (rotationError) {
      setCredentialValue("");
      setRecoveryPhrase("");
      setRecoveryAcknowledged(false);
      setDialog(null);
      setStatus("Recovery phrase was not changed. The previous recovery credential remains active.");
    } finally {
      setBusy(false);
    }
  }

  async function lockNow() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      await onLock();
    } catch (lockError) {
      setStatus("Journal could not finish encrypting its latest changes. It remains unlocked so you can retry.");
    } finally {
      setBusy(false);
    }
  }

  const cryptoAvailable = journalPrivacySetupAvailable();
  const legacy = recoveryFormat === JOURNAL_RECOVERY_FORMAT_LEGACY;

  return (
    <section className="trace-feature-section journal-privacy-settings" aria-labelledby="journal-privacy-heading">
      <h2 id="journal-privacy-heading">Journal Privacy</h2>
      <p>Encrypts your Journal on this device. You’ll need your Journal password or recovery phrase to unlock it.</p>
      <p><strong>Trace cannot recover your Journal password or recovery phrase. If you lose both, your existing encrypted Journal is permanently unrecoverable. Your only option will be to erase it and start over.</strong></p>
      <p className="journal-privacy-state">Journal Lock: <strong>{enabled ? "On" : "Off"}</strong>{enabled && !unlocked ? " · Locked" : enabled ? " · Unlocked in this tab" : ""}</p>
      {malformed && <p className="journal-error" role="alert">The encrypted Journal is unavailable. Its stored data was left unchanged.</p>}
      {status && <p role="status">{status}</p>}

      {!enabled ? (
        <button className="trace-action trace-action--primary" disabled={!cryptoAvailable} type="button" onClick={() => open("setup")}>Set up Journal Lock</button>
      ) : (
        <>
          <label className="journal-privacy-field journal-auto-lock" htmlFor="journal-auto-lock">
            <span>Auto-lock while visible</span>
            <select id="journal-auto-lock" value={autoLockMinutes} onChange={(event) => onAutoLockChange(Number(event.target.value))}>
              {JOURNAL_AUTO_LOCK_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{minutes} {minutes === 1 ? "minute" : "minutes"}{minutes === 5 ? " (default)" : ""}</option>)}
            </select>
          </label>
          {unlocked && !malformed && (
            <div className="journal-actions">
              <button className="trace-action trace-action--secondary" type="button" onClick={() => open("change-passphrase")}>Change Journal Password</button>
              <button className="trace-action trace-action--secondary" type="button" onClick={() => open("rotate")}>{legacy ? "Replace with 12-Word Recovery Phrase" : "Replace Recovery Phrase"}</button>
              <button className="trace-action trace-action--brass" disabled={busy} type="button" onClick={lockNow}>Lock Now</button>
              <button className="trace-action trace-action--brass" type="button" onClick={() => open("disable")}>Turn Off Journal Lock</button>
            </div>
          )}
          {!unlocked && !malformed && <p>Unlock Journal to change credentials, replace recovery access, or turn off the lock.</p>}
        </>
      )}

      {!cryptoAvailable && !enabled && <p role="alert">Secure browser cryptography is unavailable, so Journal Lock cannot be set up in this browser.</p>}

      {dialog === "setup" && (
        <JournalLockSetupDialog
          onCancel={closeDialog}
          onComplete={() => {
            setStatus("Journal Lock enabled. Your Journal is encrypted and unlocked in this tab.");
            setDialog(null);
          }}
          onEnable={onEnable}
        />
      )}

      {dialog === "change-passphrase" && (
        <PrivacyDialog title="Change Journal Password" description="Verify access, then create a new Journal password. Journal content will not be re-encrypted." onCancel={closeDialog}>
          <form onSubmit={changePassphrase}>
            <JournalCredentialField type={credentialType} setType={setCredentialType} value={credentialValue} setValue={setCredentialValue} recoveryFormat={recoveryFormat} />
            <JournalPasswordField id="journal-new-passphrase" label="New Journal password" value={passphrase} setValue={(value) => { setPassphrase(value); setPasswordAcknowledged(false); }} autoComplete="new-password" copyable />
            <JournalPasswordField id="journal-confirm-new-passphrase" label="Confirm new Journal password" value={confirmPassphrase} setValue={setConfirmPassphrase} autoComplete="new-password" />
            <JournalPasswordSaveControls acknowledged={passwordAcknowledged} setAcknowledged={setPasswordAcknowledged} />
            {error && <p className="journal-error" role="alert">{error}</p>}
            <div className="journal-actions"><button className="trace-action trace-action--primary" disabled={busy} type="submit">Change Journal Password</button><button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={closeDialog}>Cancel</button></div>
          </form>
        </PrivacyDialog>
      )}

      {dialog === "rotate" && (
        <PrivacyDialog title={legacy ? "Replace with 12-Word Recovery Phrase" : "Replace Recovery Phrase"} description="Save the new phrase before Trace atomically invalidates the previous recovery credential." onCancel={closeDialog}>
          <form onSubmit={rotateRecovery}>
            <JournalCredentialField type={credentialType} setType={setCredentialType} value={credentialValue} setValue={setCredentialValue} recoveryFormat={recoveryFormat} />
            <JournalRecoveryKey recoveryPhrase={recoveryPhrase} acknowledged={recoveryAcknowledged} setAcknowledged={setRecoveryAcknowledged} />
            {error && <p className="journal-error" role="alert">{error}</p>}
            <div className="journal-actions"><button className="trace-action trace-action--primary" disabled={busy || !recoveryAcknowledged} type="submit">Confirm New Recovery Phrase</button><button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={closeDialog}>Cancel</button></div>
          </form>
        </PrivacyDialog>
      )}

      {dialog === "disable" && (
        <JournalDisableDialog
          onCancel={closeDialog}
          onComplete={() => { setStatus("Journal Lock turned off."); setDialog(null); }}
          onDisable={onDisable}
          recoveryFormat={recoveryFormat}
        />
      )}
    </section>
  );
}
