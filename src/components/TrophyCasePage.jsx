import { TrophyCabinet } from "./TrophyCase";

function TrophyCasePage({
  onBack,
  trophyEntries = [],
  removeTrophyCaseEntry = () => false,
  buttonStyle,
  containerStyle,
  onViewSource,
  sourceAvailable,
  restoreTrophyId,
  onRestoreComplete,
  allowRemoval = true,
}) {
  return (
    <div className="trace-feature-page trace-feature-page--trophy-case" style={containerStyle}>
      <button
        className="trace-action trace-action--secondary"
        type="button"
        onClick={onBack}
        style={{ ...buttonStyle, backgroundColor: "#666", marginTop: 0 }}
      >
        Back to Timeline
      </button>

      <header className="trace-feature-page__identity trace-trophy-identity">
      <p className="trace-feature-page__kicker">Achievements preserved</p>
      <h1>Trophy Case</h1>
      <p className="trace-feature-page__lede" style={{ color: "#bbb", maxWidth: "760px" }}>
        Your Trophy Case is personal and user-curated. You decide which achievements matter enough to keep here.
      </p>
      </header>

      {trophyEntries.length === 0 ? (
        <p className="trace-trophy-empty-state" style={{ color: "#bbb" }}>
          No trophies yet. Achievements you choose to celebrate will appear here.
        </p>
      ) : (
        <TrophyCabinet
          allowRemoval={allowRemoval}
          onRestoreComplete={onRestoreComplete}
          onViewSource={onViewSource}
          removeTrophyCaseEntry={removeTrophyCaseEntry}
          restoreTrophyId={restoreTrophyId}
          sourceAvailable={sourceAvailable}
          trophyEntries={trophyEntries}
        />
      )}
      <button className="trace-action trace-action--secondary" type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#666", marginTop: "24px" }}>Back to Timeline</button>
    </div>
  );
}

export default TrophyCasePage;
