import TrophyCase from "./TrophyCase";

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
  const lifeAchievements = trophyEntries.filter(
    ({ sourceType }) => sourceType === "memory"
  );
  const workoutAchievements = trophyEntries.filter(
    ({ sourceType }) => sourceType !== "memory"
  );

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={onBack}
        style={{ ...buttonStyle, backgroundColor: "#666", marginTop: 0 }}
      >
        Back to Timeline
      </button>

      <h1>Trophy Case</h1>
      <p style={{ color: "#bbb", maxWidth: "760px" }}>
        Your Trophy Case is personal and user-curated. You decide which achievements matter enough to keep here.
      </p>

      {trophyEntries.length === 0 ? (
        <p style={{ color: "#bbb" }}>
          No trophies yet. Achievements you choose to celebrate will appear here.
        </p>
      ) : (
        <div
          data-testid="trophy-source-groups"
          style={{
            alignItems: "start",
            display: "grid",
            gap: "24px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            maxWidth: "1100px",
            width: "100%",
          }}
        >
          <TrophyCase
            trophyEntries={lifeAchievements}
            removeTrophyCaseEntry={removeTrophyCaseEntry}
            buttonStyle={buttonStyle}
            heading="Life Achievements"
            headingId="life-achievements-heading"
            emptyMessage="No Life Achievements curated yet."
            onViewSource={onViewSource}
            sourceAvailable={sourceAvailable}
            restoreTrophyId={restoreTrophyId}
            onRestoreComplete={onRestoreComplete}
            allowRemoval={allowRemoval}
          />
          <TrophyCase
            trophyEntries={workoutAchievements}
            removeTrophyCaseEntry={removeTrophyCaseEntry}
            buttonStyle={buttonStyle}
            heading="Workout Achievements"
            headingId="workout-achievements-heading"
            emptyMessage="No Workout Achievements curated yet."
            onViewSource={onViewSource}
            sourceAvailable={sourceAvailable}
            restoreTrophyId={restoreTrophyId}
            onRestoreComplete={onRestoreComplete}
            allowRemoval={allowRemoval}
          />
        </div>
      )}
      <button type="button" onClick={onBack} style={{ ...buttonStyle, backgroundColor: "#666", marginTop: "24px" }}>Back to Timeline</button>
    </div>
  );
}

export default TrophyCasePage;
