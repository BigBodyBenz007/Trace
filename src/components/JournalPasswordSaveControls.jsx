export const JOURNAL_PASSWORD_SAVE_HELPER = "If your device offers to save this password, accept it. If it does not, use Copy Journal Password and save it in your password manager before continuing.";

export const JOURNAL_PASSWORD_LOSS_WARNING = "Trace cannot recover your Journal password. If you lose it and your recovery phrase, your existing encrypted Journal is permanently unrecoverable.";

export const JOURNAL_PASSWORD_ACKNOWLEDGMENT = "I saved my Journal password and understand that Trace cannot recover it.";

export default function JournalPasswordSaveControls({ acknowledged, setAcknowledged }) {
  return (
    <section className="journal-password-save" aria-label="Save your Journal password">
      <p>{JOURNAL_PASSWORD_SAVE_HELPER}</p>
      <p className="journal-recovery-warning"><strong>{JOURNAL_PASSWORD_LOSS_WARNING}</strong></p>
      <label className="journal-privacy-check">
        <input
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          type="checkbox"
        />
        {JOURNAL_PASSWORD_ACKNOWLEDGMENT}
      </label>
    </section>
  );
}
