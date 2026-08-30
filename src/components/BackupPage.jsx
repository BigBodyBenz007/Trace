import { useRef, useState } from "react";
import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  traceBackupFilename,
} from "../services/traceBackup";
import { JOURNAL_RECOVERY_FORMAT_LEGACY } from "../services/journalVaultCrypto";

function readFileText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Trace could not read the selected file."));
    reader.readAsText(file);
  });
}

function isIOSDevice(browserNavigator = navigator) {
  const userAgent = browserNavigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent) || (
    browserNavigator.platform === "MacIntel" && browserNavigator.maxTouchPoints > 1
  );
}

export function createBackupFile(backup) {
  const filename = traceBackupFilename(new Date(backup.createdAt));
  const file = typeof File === "function"
    ? new File([JSON.stringify(backup)], filename, { type: "application/json" })
    : new Blob([JSON.stringify(backup)], { type: "application/json" });
  if (file.name !== filename) {
    Object.defineProperty(file, "name", { configurable: true, value: filename });
  }
  return file;
}

export function downloadWithAnchor(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function BackupPage({
  onBack,
  onRestoreComplete = () => {},
  onRestoreStarting = () => {},
  journalLockEnabled = false,
  journalVaultSession = null,
  buttonStyle,
  containerStyle,
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [iosBackup, setIosBackup] = useState(null);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const [backupCredentialType, setBackupCredentialType] = useState("passphrase");
  const [backupCredentialValue, setBackupCredentialValue] = useState("");
  const fileInputRef = useRef(null);
  const summary = preview?.summary;
  const backupUsesLegacyRecovery = summary?.journalRecoveryFormat === JOURNAL_RECOVERY_FORMAT_LEGACY;
  const backupRecoveryLabel = backupUsesLegacyRecovery ? "legacy recovery key" : "recovery phrase";

  async function exportBackup() {
    setError("");
    setStatus("Preparing backup…");
    try {
      const backup = await createTraceBackup();
      if (isIOSDevice()) {
        setIosBackup(backup);
        setStatus("Backup is ready. Tap Save Backup to Files to open the iPhone share sheet.");
      } else {
        downloadWithAnchor(createBackupFile(backup));
        setStatus("Trace backup downloaded. Your current data was not changed.");
      }
    } catch (exportError) {
      setStatus("");
      setError(`Trace could not create the backup: ${exportError.message}`);
    }
  }

  async function saveBackupToFiles() {
    if (!iosBackup) return;
    const file = createBackupFile(iosBackup);
    const shareData = { files: [file] };
    if (
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function" ||
      !navigator.canShare(shareData)
    ) {
      setStatus("This iPhone browser cannot open the Save to Files sheet. Open Trace in Safari and try again.");
      return;
    }
    setError("");
    setRestoreComplete(false);
    try {
      await navigator.share(shareData);
      setIosBackup(null);
      setStatus("Trace backup is ready in the share sheet. Choose Save to Files to keep it.");
    } catch (shareError) {
      if (shareError?.name === "AbortError") {
        setStatus("Trace backup sharing was canceled. Your current data was not changed.");
      } else {
        setStatus("");
        setError(`Trace could not open the Save to Files sheet: ${shareError.message}`);
      }
    }
  }

  async function selectBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setStatus("Validating backup…");
    try {
      const parsed = parseTraceBackupText(await readFileText(file));
      setPreview(parsed);
      setBackupCredentialType("passphrase");
      setBackupCredentialValue("");
      setStatus("");
    } catch (validationError) {
      setPreview(null);
      setStatus("");
      setError(`Trace could not use this backup: ${validationError.message}`);
    }
  }

  async function confirmRestore() {
    if (!preview) return;
    const backupJournalCredential = preview.summary.encryptedJournal
      ? { type: backupCredentialType, value: backupCredentialValue }
      : null;
    if (backupJournalCredential && !backupJournalCredential.value.trim()) {
      setError(`Enter the backup Journal ${backupCredentialType === "recovery-key" ? backupRecoveryLabel : "password"} before restoring.`);
      return;
    }
    if (journalLockEnabled && !preview.summary.encryptedJournal && !journalVaultSession) {
      setError("Unlock the current Journal before restoring a backup that contains plaintext Journal data.");
      return;
    }
    const draftEffect = preview.summary.activeWorkoutDraft
      ? "Any current active workout draft will be replaced by the active draft in this backup."
      : "Any current active workout draft will be removed because this backup has none.";
    const journalEffect = preview.summary.encryptedJournal
      ? ` The encrypted Journal in the backup will replace the current Journal and will require that backup's Journal password or ${backupRecoveryLabel}.`
      : "";
    if (!window.confirm(`Replace all current Trace data with this backup? ${draftEffect}${journalEffect} This cannot be merged.`)) {
      setBackupCredentialValue("");
      return;
    }
    setError("");
    setStatus("Restoring Trace…");
    try {
      const activeSession = journalVaultSession;
      setBackupCredentialValue("");
      onRestoreStarting();
      const restoredSummary = await restoreTraceBackup(preview.backup, {
        confirmed: true,
        journalVaultSession: activeSession,
        ...(backupJournalCredential ? { backupJournalCredential } : {}),
      });
      await onRestoreComplete(restoredSummary);
      setPreview(null);
      setStatus("");
      setRestoreComplete(true);
    } catch (restoreError) {
      setStatus("");
      setRestoreComplete(false);
      setError(`Trace restore could not be completed. ${restoreError.message}`);
    }
  }

  return (
    <main className="trace-feature-page trace-feature-page--backup" style={containerStyle}>
      <header className="trace-feature-page__identity">
      <p className="trace-feature-page__kicker">Private archive</p>
      <h1>Backup & Restore</h1>
      <p className="trace-feature-page__lede" style={{ color: "#bbb", maxWidth: "700px" }}>
        Download a private copy of your Trace data, including photos, or fully restore a previously created Trace backup.
      </p>
      </header>
      <nav aria-label="Backup navigation" className="trace-backup-navigation">
        <button className="trace-action trace-action--secondary" type="button" style={{ ...buttonStyle, backgroundColor: "#374151" }} onClick={onBack}>Back to Timeline</button>
      </nav>
      <section aria-label="Archive actions" className="trace-backup-actions">
        <button className="trace-action trace-action--primary" type="button" style={buttonStyle} onClick={exportBackup}>Download Trace Backup</button>
        <button className="trace-action trace-action--brass" type="button" style={{ ...buttonStyle, backgroundColor: "#475569" }} onClick={() => fileInputRef.current?.click()}>
          Select Backup to Restore
        </button>
        {iosBackup && <button className="trace-action trace-action--primary trace-backup-actions__save" type="button" style={buttonStyle} onClick={saveBackupToFiles}>Save Backup to Files</button>}
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={selectBackup} hidden />
      </section>
      {status && <p className="trace-status" role="status">{status}</p>}
      {error && <p className="trace-status trace-status--error" role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
      {restoreComplete && (
        <section className="trace-feature-surface trace-backup-success" role="status" aria-label="Restore complete" style={{ background: "#14532d", borderRadius: "12px", marginTop: "24px", padding: "18px" }}>
          <h2>✓ Trace restored successfully</h2>
          <p>Your backup has been completely restored.</p>
          <button className="trace-action trace-action--secondary" type="button" style={{ ...buttonStyle, backgroundColor: "#374151" }} onClick={onBack}>Back to Timeline</button>
        </section>
      )}
      {summary && (
        <section className="trace-feature-surface trace-backup-preview" aria-label="Restore preview" style={{ background: "#1f2937", borderRadius: "12px", marginTop: "24px", padding: "18px" }}>
          <h2>Review Backup</h2>
          <p>No Trace data has been changed yet.</p>
          <ul>
            <li>Memories: {summary.memories}</li><li>Photos: {summary.photos}</li>
            <li>Nutrition entries: {summary.nutritionEntries}</li><li>Health measurements: {summary.healthMeasurementEntries || 0}</li><li>Planned workouts: {summary.plannedWorkouts || 0}</li><li>Daily actions: {summary.dailyActions || 0}</li><li>Workouts: {summary.workouts}</li>
            <li>Active workout draft: {summary.activeWorkoutDraft ? "Included — it will replace any current active workout draft" : "None — any current active workout draft will be removed"}</li>
            <li>Medication & supplement entries: {summary.medicationEntries}</li><li>Scheduled doses: {summary.medicationDoseSchedules || 0}</li><li>Dose occurrence changes: {summary.medicationDoseOccurrences || 0}</li><li>Protocols: {summary.protocols}</li><li>Protocol daily statuses: {summary.protocolOccurrences || 0}</li><li>Protocol compound results: {summary.protocolCompoundOutcomes || 0}</li><li>Injection shots: {summary.injectionSiteEntries || 0}</li>
            <li>Trophy Case entries: {summary.trophyCaseEntries}</li><li>Saved exercises: {summary.savedExercises}</li>
            <li>Saved compounds: {summary.savedCompounds}</li><li>Saved foods: {summary.userFoods}</li>
            <li>{summary.encryptedJournal ? "Encrypted Journal included" : `Journal entries: ${summary.journalEntries || 0}`}</li>
          </ul>
          {summary.encryptedJournal && (
            <>
              <p><strong>Restoring this encrypted Journal replaces the current Journal. The backup&apos;s Journal password or {backupRecoveryLabel} will be required.</strong></p>
              <fieldset className="journal-privacy-credential">
                <legend>Verify the encrypted Journal backup</legend>
                <label>
                  <input
                    type="radio"
                    name="backup-journal-credential"
                    value="passphrase"
                    checked={backupCredentialType === "passphrase"}
                    onChange={() => {
                      setBackupCredentialType("passphrase");
                      setBackupCredentialValue("");
                    }}
                  />
                  Backup Journal password
                </label>
                <label>
                  <input
                    type="radio"
                    name="backup-journal-credential"
                    value="recovery-key"
                    checked={backupCredentialType === "recovery-key"}
                    onChange={() => {
                      setBackupCredentialType("recovery-key");
                      setBackupCredentialValue("");
                    }}
                  />
                  {backupUsesLegacyRecovery ? "Backup legacy recovery key" : "Backup recovery phrase"}
                </label>
                <label className="journal-privacy-field" htmlFor="backup-journal-credential-value">
                  {backupCredentialType === "recovery-key" ? `Backup Journal ${backupRecoveryLabel}` : "Backup Journal password"}
                  {backupCredentialType === "recovery-key" ? <textarea
                    id="backup-journal-credential-value"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={backupCredentialValue}
                    onChange={(event) => setBackupCredentialValue(event.target.value)}
                  /> : <input
                    id="backup-journal-credential-value"
                    type="password"
                    autoComplete="current-password"
                    value={backupCredentialValue}
                    onChange={(event) => setBackupCredentialValue(event.target.value)}
                  />}
                </label>
                <p>This credential is used only to verify the backup before Trace changes any current data. It is not stored.</p>
              </fieldset>
            </>
          )}
          <button className="trace-action trace-action--danger" type="button" style={{ ...buttonStyle, backgroundColor: "#b91c1c" }} onClick={confirmRestore}>Confirm Full Restore</button>
          <button className="trace-action trace-action--secondary" type="button" style={{ ...buttonStyle, backgroundColor: "#4b5563" }} onClick={() => {
            setBackupCredentialValue("");
            setPreview(null);
          }}>Cancel Restore</button>
        </section>
      )}
    </main>
  );
}
