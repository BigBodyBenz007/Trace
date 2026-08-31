import { useState } from "react";
import { generateRecoveryPhrase } from "../services/journalVaultCrypto";
import { JournalPasswordField } from "./JournalCredentialField";
import JournalPasswordSaveControls from "./JournalPasswordSaveControls";
import JournalRecoveryKey from "./JournalRecoveryKey";
import PrivacyDialog from "./PrivacyDialog";

export function journalPrivacySetupAvailable() {
  return Boolean(window.crypto?.subtle && window.crypto?.getRandomValues);
}

export default function JournalLockSetupDialog({ onCancel, onComplete = () => {}, onEnable }) {
  const [step, setStep] = useState("credentials");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [passwordAcknowledged, setPasswordAcknowledged] = useState(false);
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function cancel() {
    if (!busy) onCancel();
  }

  function continueSetup(event) {
    event.preventDefault();
    if (passphrase.length < 12) {
      setError("Use a Journal password of at least 12 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("The Journal passwords do not match.");
      return;
    }
    if (!passwordAcknowledged) {
      setError("Confirm that you saved your Journal password before continuing.");
      return;
    }
    try {
      setRecoveryPhrase(generateRecoveryPhrase());
      setRecoveryAcknowledged(false);
      setError("");
      setStep("recovery");
    } catch (cryptoError) {
      setError("Secure browser cryptography is unavailable. Journal Lock was not enabled.");
    }
  }

  async function finishSetup(event) {
    event.preventDefault();
    if (!passwordAcknowledged) {
      setStep("credentials");
      setError("Confirm that you saved your Journal password before enabling Journal Lock.");
      return;
    }
    if (!recoveryAcknowledged) {
      setError("Confirm that you saved your recovery phrase before enabling Journal Lock.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onEnable({ passphrase, recoveryPhrase });
      setPassphrase("");
      setConfirmPassphrase("");
      setRecoveryPhrase("");
      setPasswordAcknowledged(false);
      setRecoveryAcknowledged(false);
      onComplete();
    } catch (setupError) {
      setError("Journal Lock could not be enabled. Your previous Journal data was left unchanged.");
      setStep("credentials");
      setRecoveryPhrase("");
      setRecoveryAcknowledged(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PrivacyDialog title="Set up Journal Lock" description="Choose a Journal password, then save the one-time recovery phrase." onCancel={cancel}>
      {step === "credentials" ? (
        <form onSubmit={continueSetup}>
          <JournalPasswordField id="journal-setup-passphrase" label="Journal password" value={passphrase} setValue={(value) => { setPassphrase(value); setPasswordAcknowledged(false); }} autoComplete="new-password" copyable />
          <JournalPasswordField id="journal-setup-confirm" label="Confirm Journal password" value={confirmPassphrase} setValue={setConfirmPassphrase} autoComplete="new-password" />
          <p>Use at least 12 characters. Long pasted password-manager values are welcome.</p>
          <JournalPasswordSaveControls acknowledged={passwordAcknowledged} setAcknowledged={setPasswordAcknowledged} />
          {error && <p className="journal-error" role="alert">{error}</p>}
          <div className="journal-actions">
            <button className="trace-action trace-action--primary" type="submit">Continue</button>
            <button className="trace-action trace-action--secondary" type="button" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <form onSubmit={finishSetup}>
          <JournalRecoveryKey recoveryPhrase={recoveryPhrase} acknowledged={recoveryAcknowledged} setAcknowledged={setRecoveryAcknowledged} />
          {error && <p className="journal-error" role="alert">{error}</p>}
          <div className="journal-actions">
            <button className="trace-action trace-action--primary" disabled={busy || !recoveryAcknowledged} type="submit">{busy ? "Encrypting Journal…" : "Confirm and Enable Lock"}</button>
            <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={cancel}>Cancel</button>
          </div>
        </form>
      )}
    </PrivacyDialog>
  );
}
