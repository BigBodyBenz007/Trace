import { useEffect, useRef, useState } from "react";
import {
  generateRecoveryPhrase,
  JOURNAL_RECOVERY_FORMAT_LEGACY,
} from "../services/journalVaultCrypto";
import { JournalPasswordField } from "./JournalCredentialField";
import JournalRecoveryKey from "./JournalRecoveryKey";
import JournalResetDialog from "./JournalResetDialog";

const GENERIC_ERROR = "Journal could not be unlocked. Check your credential and try again.";

export default function JournalUnlockPage({
  onUnlock,
  onRecover,
  onBack,
  onReset,
  onDownloadBackup,
  recoveryFormat,
  unavailable = false,
}) {
  const [mode, setMode] = useState("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [recoveryCredential, setRecoveryCredential] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [rotateRecovery, setRotateRecovery] = useState(true);
  const [nextRecoveryPhrase, setNextRecoveryPhrase] = useState("");
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failures, setFailures] = useState(0);
  const [delayed, setDelayed] = useState(false);
  const delayTimerRef = useRef(null);
  const legacy = recoveryFormat === JOURNAL_RECOVERY_FORMAT_LEGACY;

  useEffect(() => () => clearTimeout(delayTimerRef.current), []);

  function beginDelay(nextFailures) {
    if (nextFailures < 2) return;
    setDelayed(true);
    const milliseconds = Math.min(4000, 250 * (2 ** (nextFailures - 2)));
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = setTimeout(() => setDelayed(false), milliseconds);
  }

  async function submitPassphrase(event) {
    event.preventDefault();
    if (busy || delayed || unavailable) return;
    setBusy(true);
    setError("");
    try {
      await onUnlock(passphrase);
      setPassphrase("");
    } catch (unlockError) {
      const nextFailures = failures + 1;
      setFailures(nextFailures);
      setPassphrase("");
      setError(GENERIC_ERROR);
      beginDelay(nextFailures);
    } finally {
      setBusy(false);
    }
  }

  function createNextRecoveryPhrase() {
    try {
      setNextRecoveryPhrase(generateRecoveryPhrase());
      setRecoveryAcknowledged(false);
      return true;
    } catch (cryptoError) {
      setError("Secure browser cryptography is unavailable. A new recovery phrase cannot be generated here.");
      return false;
    }
  }

  function openRecovery() {
    setPassphrase("");
    setMode("recovery");
    setError("");
    if (!createNextRecoveryPhrase()) setRotateRecovery(false);
  }

  function returnToPassphrase() {
    setRecoveryCredential("");
    setNewPassphrase("");
    setConfirmPassphrase("");
    setNextRecoveryPhrase("");
    setRecoveryAcknowledged(false);
    setRotateRecovery(true);
    setError("");
    setMode("passphrase");
  }

  function changeRecoveryRotation(checked) {
    setRotateRecovery(checked);
    setRecoveryAcknowledged(false);
    if (!checked) {
      setNextRecoveryPhrase("");
      return;
    }
    if (!createNextRecoveryPhrase()) setRotateRecovery(false);
  }

  async function submitRecovery(event) {
    event.preventDefault();
    if (busy || delayed || unavailable) return;
    if (newPassphrase.length < 12) {
      setError("Use a new Journal password of at least 12 characters.");
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setError("The new Journal passwords do not match.");
      return;
    }
    if (rotateRecovery && !recoveryAcknowledged) {
      setError("Confirm that you saved your new recovery phrase.");
      return;
    }
    setBusy(true);
    setError("");
    const values = {
      recoveryCredential,
      newPassphrase,
      rotateRecovery,
      nextRecoveryPhrase,
    };
    try {
      await onRecover(values);
      setRecoveryCredential("");
      setNewPassphrase("");
      setConfirmPassphrase("");
      setNextRecoveryPhrase("");
      setRecoveryAcknowledged(false);
    } catch (unlockError) {
      const nextFailures = failures + 1;
      setFailures(nextFailures);
      setRecoveryCredential("");
      setNewPassphrase("");
      setConfirmPassphrase("");
      setNextRecoveryPhrase("");
      setRecoveryAcknowledged(false);
      setRotateRecovery(false);
      setError(GENERIC_ERROR);
      beginDelay(nextFailures);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="trace-feature-page trace-feature-page--journal journal-unlock-page">
      <header className="trace-feature-page__identity journal-page__header">
        <span aria-hidden="true" className="journal-lock-icon">🔒</span>
        <div className="journal-page__header-copy">
          <h1>Journal locked</h1>
          <p>Your encrypted Journal stays on this device until you unlock it in this tab.</p>
        </div>
      </header>

      {mode === "passphrase" ? (
        <form className="journal-privacy-card" onSubmit={submitPassphrase}>
          <JournalPasswordField id="journal-unlock-passphrase" label="Journal password" value={passphrase} setValue={setPassphrase} />
          {unavailable && <p role="alert">This encrypted Journal cannot be unlocked here. Its stored data was left unchanged.</p>}
          {error && <p className="journal-error" role="alert">{error}</p>}
          {delayed && <p role="status">Please wait briefly before trying again.</p>}
          <div className="journal-actions">
            <button className="trace-action trace-action--primary" disabled={busy || delayed || unavailable} type="submit">{busy ? "Unlocking…" : "Unlock Journal"}</button>
            <button className="trace-action trace-action--secondary" disabled={busy || unavailable} type="button" onClick={openRecovery}>{legacy ? "Use legacy recovery key" : "Use recovery phrase"}</button>
            <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={onBack}>Back to Timeline</button>
          </div>
        </form>
      ) : (
        <form className="journal-privacy-card" onSubmit={submitRecovery}>
          <p>Enter your {legacy ? "legacy recovery key" : "recovery phrase"} and create a new Journal password immediately.</p>
          <label className="journal-privacy-field" htmlFor="journal-recovery-input">
            <span>{legacy ? "Legacy recovery key" : "Recovery phrase"}</span>
            <textarea autoCapitalize="none" autoComplete="off" id="journal-recovery-input" onChange={(event) => setRecoveryCredential(event.target.value)} spellCheck="false" value={recoveryCredential} />
          </label>
          <JournalPasswordField id="journal-recovery-new-passphrase" label="New Journal password" value={newPassphrase} setValue={setNewPassphrase} autoComplete="new-password" />
          <JournalPasswordField id="journal-recovery-confirm-passphrase" label="Confirm new Journal password" value={confirmPassphrase} setValue={setConfirmPassphrase} autoComplete="new-password" />
          <label className="journal-privacy-check">
            <input checked={rotateRecovery} onChange={(event) => changeRecoveryRotation(event.target.checked)} type="checkbox" />
            Replace with a new 12-word recovery phrase (strongly recommended)
          </label>
          {rotateRecovery && nextRecoveryPhrase && (
            <JournalRecoveryKey recoveryPhrase={nextRecoveryPhrase} acknowledged={recoveryAcknowledged} setAcknowledged={setRecoveryAcknowledged} />
          )}
          <p><strong>Trace cannot recover your Journal password or recovery phrase. If you lose both, your existing encrypted Journal is permanently unrecoverable. Your only option will be to erase it and start over.</strong></p>
          {error && <p className="journal-error" role="alert">{error}</p>}
          {delayed && <p role="status">Please wait briefly before trying again.</p>}
          <div className="journal-actions">
            <button className="trace-action trace-action--primary" disabled={busy || delayed || (rotateRecovery && !recoveryAcknowledged)} type="submit">{busy ? "Recovering…" : "Recover and Unlock"}</button>
            <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={returnToPassphrase}>Back to Journal password</button>
            <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={onBack}>Back to Timeline</button>
          </div>
        </form>
      )}

      <section className="journal-reset-entry" aria-labelledby="journal-lost-credentials-heading">
        <h2 id="journal-lost-credentials-heading">Lost your Journal password and recovery phrase?</h2>
        <p>Trace has no way to retrieve either credential. Trace support, an administrator, or reinstalling the app cannot recover the encrypted Journal. An encrypted backup does not bypass the need for the Journal password or recovery phrase associated with that backup. Erasing the Journal permanently destroys the existing encrypted Journal and starts a new empty one. Everything else in Trace remains unchanged.</p>
        <button className="trace-action trace-action--danger" type="button" onClick={() => setResetOpen(true)}>Erase Journal and Start Fresh</button>
      </section>

      {resetOpen && (
        <JournalResetDialog
          onCancel={() => setResetOpen(false)}
          onDownloadBackup={onDownloadBackup}
          onReset={onReset}
        />
      )}
    </main>
  );
}
