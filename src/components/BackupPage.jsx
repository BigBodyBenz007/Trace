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

export async function handoffTraceBackup(backup, {
  navigatorObject = navigator,
  urlApi = URL,
  documentObject = document,
  scheduleCleanup = (callback) => setTimeout(callback, 60000),
} = {}) {
  const filename = traceBackupFilename(new Date(backup.createdAt));
  const json = JSON.stringify(backup);
  const file = typeof File === "function"
    ? new File([json], filename, { type: "application/json" })
    : new Blob([json], { type: "application/json" });
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigatorObject.userAgent || "") ||
    (navigatorObject.platform === "MacIntel" && navigatorObject.maxTouchPoints > 1);
  if (isAppleMobile && typeof navigatorObject.share === "function" && typeof navigatorObject.canShare === "function" && navigatorObject.canShare({ files: [file] })) {
    await navigatorObject.share({ files: [file], title: "Trace Backup" });
    return { method: "share", file };
  }
  const url = urlApi.createObjectURL(file);
  const link = documentObject.createElement("a");
  link.href = url;
  link.download = filename;
  documentObject.body.appendChild(link);
  link.click();
  link.remove();
  scheduleCleanup(() => urlApi.revokeObjectURL(url));
  return { method: "download", file, url };
}

export default function BackupPage({
  onBack,
  buttonStyle,
  containerStyle,
  onRestoreComplete = () => window.location.reload(),
  onExportSuccess = () => {},
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);

  async function exportBackup() {
    if (isExporting) return;
    setIsExporting(true);
    setError("");
    setStatus("Preparing backup…");
    try {
      const backup = await createTraceBackup();
      await handoffTraceBackup(backup);
      setStatus("");
      onExportSuccess();
    } catch (exportError) {
      setStatus("");
      setError(`Trace could not create the backup: ${exportError.message}`);
    } finally {
      setIsExporting(false);
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
      setStatus("Restore complete. Trace will reload now.");
      onRestoreComplete();
    } catch (restoreError) {
      setStatus("");
      setError(restoreError.message);
    }
  }

  const summary = preview?.summary;
  return (
    <main style={containerStyle}>
      <h1>Backup & Restore</h1>
      <p style={{ color: "#bbb", maxWidth: "700px" }}>
        Download a private copy of your Trace data, including photos, or fully restore a previously created Trace backup.
      </p>
      <button type="button" disabled={isExporting} style={buttonStyle} onClick={exportBackup}>{isExporting ? "Preparing Trace Backupâ€¦" : "Download Trace Backup"}</button>
      <button type="button" style={{ ...buttonStyle, backgroundColor: "#475569" }} onClick={() => fileInputRef.current?.click()}>
        Select Backup to Restore
      </button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={selectBackup} hidden />
      {status && <p role="status">{status}</p>}
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
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
      <button type="button" style={{ ...buttonStyle, backgroundColor: "#374151" }} onClick={onBack}>Back to Timeline</button>
    </main>
  );
}
