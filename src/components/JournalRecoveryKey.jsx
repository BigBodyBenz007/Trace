import { useState } from "react";

export function recoveryPhraseWords(recoveryPhrase) {
  return String(recoveryPhrase || "").trim().split(/\s+/u).filter(Boolean);
}

export default function JournalRecoveryKey({
  recoveryPhrase,
  acknowledged,
  setAcknowledged,
}) {
  const [status, setStatus] = useState("");
  const words = recoveryPhraseWords(recoveryPhrase);

  async function copyPhrase() {
    try {
      if (!window.navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await window.navigator.clipboard.writeText(recoveryPhrase);
      setStatus("Recovery phrase copied.");
    } catch (error) {
      setStatus("Copy failed. Select and copy the recovery phrase manually below.");
    }
  }

  return (
    <section className="journal-recovery-key-step" aria-labelledby="journal-recovery-phrase-heading">
      <h3 id="journal-recovery-phrase-heading">Your Journal Recovery Phrase</h3>
      <p>This 12-word phrase is shown only now. Save it somewhere private and offline, or in a trusted password manager.</p>
      <ol className="journal-recovery-words" data-testid="journal-recovery-phrase">
        {words.map((word, index) => <li key={`${index}-${word}`}><span>{word}</span></li>)}
      </ol>
      <label className="journal-recovery-manual" htmlFor="journal-recovery-phrase-manual">
        Recovery phrase for manual selection
        <textarea
          id="journal-recovery-phrase-manual"
          readOnly
          rows="3"
          spellCheck="false"
          value={recoveryPhrase}
        />
      </label>
      <div className="journal-actions">
        <button type="button" className="trace-action trace-action--secondary" onClick={copyPhrase}>
          Copy Recovery Phrase
        </button>
      </div>
      {status && <p role="status">{status}</p>}
      <p className="journal-recovery-warning"><strong>Trace cannot recover your Journal password or recovery phrase. If you lose both, your existing encrypted Journal is permanently unrecoverable. Your only option will be to erase it and start over.</strong></p>
      <label className="journal-privacy-check">
        <input
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          type="checkbox"
        />
        I saved my recovery phrase and understand that if I lose both it and my Journal password, my existing Journal cannot be recovered.
      </label>
    </section>
  );
}
