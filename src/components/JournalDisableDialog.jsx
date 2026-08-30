import { useCallback, useState } from "react";
import JournalCredentialField from "./JournalCredentialField";
import PrivacyDialog from "./PrivacyDialog";

export default function JournalDisableDialog({ onCancel, onDisable, onComplete, recoveryFormat }) {
  const [credentialType, setCredentialType] = useState("passphrase");
  const [credentialValue, setCredentialValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = useCallback(() => { if (!busy) onCancel(); }, [busy, onCancel]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onDisable({ type: credentialType, value: credentialValue });
      setCredentialValue("");
      onComplete?.();
    } catch (disableError) {
      setCredentialValue("");
      setError("Journal Lock could not be turned off safely. It remains on and your Journal remains unlocked in this tab.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PrivacyDialog title="Turn Off Journal Lock" description="Your Journal entries will remain intact, but they will no longer be encrypted on this device or in future plaintext backups." onCancel={cancel}>
      <form onSubmit={submit}>
        <p>This preserves your entries and draft. It does not erase your Journal.</p>
        <JournalCredentialField idPrefix="journal-disable" recoveryFormat={recoveryFormat} setType={setCredentialType} setValue={setCredentialValue} type={credentialType} value={credentialValue} />
        {error && <p className="journal-error" role="alert">{error}</p>}
        <div className="journal-actions">
          <button className="trace-action trace-action--brass" disabled={busy} type="submit">{busy ? "Turning Off Journal Lock…" : "Turn Off Journal Lock"}</button>
          <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={cancel}>Cancel</button>
        </div>
      </form>
    </PrivacyDialog>
  );
}
