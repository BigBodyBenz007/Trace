import { useRef, useState } from "react";
import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  traceBackupFilename,
} from "../services/traceBackup";

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

function createBackupFile(backup) {
  const filename = traceBackupFilename(new Date(backup.createdAt));
  const file = typeof File === "function"
    ? new File([JSON.stringify(backup)], filename, { type: "application/json" })
    : new Blob([JSON.stringify(backup)], { type: "application/json" });
  if (file.name !== filename) {
    Object.defineProperty(file, "name", { configurable: true, value: filename });
  }
  return file;
}

function downloadWithAnchor(file) {
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
  buttonStyle,
  containerStyle,
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [iosBackup, setIosBackup] = useState(null);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const fileInputRef = useRef(null);

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
      setStatus("");
    } catch (validationError) {
      setPreview(null);
      setStatus("");
      setError(`Trace could not use this backup: ${validationError.message}`);
    }
  }

  async function confirmRestore() {
    if (!preview || !window.confirm("Replace all current Trace data with this backup? This cannot be merged.")) return;
    setError("");
    setStatus("Restoring Trace…");
    try {
      await restoreTraceBackup(preview.backup, { confirmed: true });
      setPreview(null);
      setStatus("");
      setRestoreComplete(true);
    } catch (restoreError) {
      setStatus("");
      setRestoreComplete(false);
      setError(`Trace restore could not be completed. ${restoreError.message}`);
    }
  }

  const summary = preview?.summary;
  return (
    <main style={containerStyle}>
      <h1>Backup & Restore</h1>
      <p style={{ color: "#bbb", maxWidth: "700px" }}>
        Download a private copy of your Trace data, including photos, or fully restore a previously created Trace backup.
      </p>
      <button type="button" style={{ ...buttonStyle, backgroundColor: "#374151" }} onClick={onBack}>Back to Timeline</button>
      <button type="button" style={buttonStyle} onClick={exportBackup}>Download Trace Backup</button>
      {iosBackup && <button type="button" style={buttonStyle} onClick={saveBackupToFiles}>Save Backup to Files</button>}
      <button type="button" style={{ ...buttonStyle, backgroundColor: "#475569" }} onClick={() => fileInputRef.current?.click()}>
        Select Backup to Restore
      </button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={selectBackup} hidden />
      {status && <p role="status">{status}</p>}
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
      {restoreComplete && (
        <section role="status" aria-label="Restore complete" style={{ background: "#14532d", borderRadius: "12px", marginTop: "24px", padding: "18px" }}>
          <h2>✓ Trace restored successfully</h2>
          <p>Your backup has been completely restored.</p>
          <button type="button" style={{ ...buttonStyle, backgroundColor: "#374151" }} onClick={onBack}>Back to Timeline</button>
        </section>
      )}
      {summary && (
        <section aria-label="Restore preview" style={{ background: "#1f2937", borderRadius: "12px", marginTop: "24px", padding: "18px" }}>
          <h2>Review Backup</h2>
          <p>No Trace data has been changed yet.</p>
          <ul>
            <li>Memories: {summary.memories}</li><li>Photos: {summary.photos}</li>
            <li>Nutrition entries: {summary.nutritionEntries}</li><li>Health measurements: {summary.healthMeasurementEntries || 0}</li><li>Workouts: {summary.workouts}</li>
            <li>Medication & supplement entries: {summary.medicationEntries}</li><li>Protocols: {summary.protocols}</li>
            <li>Trophy Case entries: {summary.trophyCaseEntries}</li><li>Saved exercises: {summary.savedExercises}</li>
            <li>Saved compounds: {summary.savedCompounds}</li><li>Saved foods: {summary.userFoods}</li>
          </ul>
          <button type="button" style={{ ...buttonStyle, backgroundColor: "#b91c1c" }} onClick={confirmRestore}>Confirm Full Restore</button>
          <button type="button" style={{ ...buttonStyle, backgroundColor: "#4b5563" }} onClick={() => setPreview(null)}>Cancel Restore</button>
        </section>
      )}
    </main>
  );
}
