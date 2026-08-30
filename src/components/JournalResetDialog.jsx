import { useCallback, useState } from "react";
import PrivacyDialog from "./PrivacyDialog";

const RESET_CONFIRMATION = "ERASE JOURNAL";

export default function JournalResetDialog({ onCancel, onReset, onDownloadBackup }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [error, setError] = useState("");
  const cancel = useCallback(() => { if (!busy) onCancel(); }, [busy, onCancel]);

  async function downloadBackup() {
    setBackupStatus("");
    setError("");
    try {
      await onDownloadBackup();
      setBackupStatus("Trace backup download started.");
    } catch (backupError) {
      setError("Trace could not create the backup. Nothing was erased.");
    }
  }

  async function reset(event) {
    event.preventDefault();
    if (confirmation !== RESET_CONFIRMATION) return;
    setBusy(true);
    setError("");
    try {
      await onReset();
    } catch (resetError) {
      setError("Journal could not be erased safely. Its stored data was restored when possible.");
      setBusy(false);
    }
  }

  return (
    <PrivacyDialog title="Reset Journal and start fresh?" description="Erasing the Journal permanently destroys the existing encrypted Journal and starts a new empty one." onCancel={cancel}>
      <p>Existing encrypted Journal entries and the draft cannot be recovered. Everything else in Trace will remain unchanged.</p>
      <p>An encrypted backup does not bypass the need for the Journal password or recovery phrase associated with that backup.</p>
      <p><strong>Trace has no way to retrieve either credential. Trace support, an administrator, or reinstalling the app cannot recover the encrypted Journal. This action cannot be undone from the current device.</strong></p>
      <button className="trace-action trace-action--secondary" disabled={busy} onClick={downloadBackup} type="button">Download Trace Backup First</button>
      {backupStatus && <p role="status">{backupStatus}</p>}
      <form onSubmit={reset}>
        <label className="journal-privacy-field" htmlFor="journal-reset-confirmation">
          <span>Type <strong>{RESET_CONFIRMATION}</strong> to confirm</span>
          <input autoComplete="off" id="journal-reset-confirmation" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
        </label>
        {error && <p className="journal-error" role="alert">{error}</p>}
        <div className="journal-actions">
          <button className="trace-action trace-action--danger" disabled={busy || confirmation !== RESET_CONFIRMATION} type="submit">{busy ? "Erasing Journal…" : "Erase Journal and Start Fresh"}</button>
          <button className="trace-action trace-action--secondary" disabled={busy} type="button" onClick={cancel}>Cancel</button>
        </div>
      </form>
    </PrivacyDialog>
  );
}
