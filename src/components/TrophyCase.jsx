import { useMemo } from "react";

function timestampValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function compareEntries(first, second) {
  const addedDifference = timestampValue(second.addedToTrophyCaseAt) - timestampValue(first.addedToTrophyCaseAt);
  if (addedDifference !== 0) return addedDifference;
  return String(first.id).localeCompare(String(second.id));
}

function TrophyCase({
  trophyEntries = [],
  removeTrophyCaseEntry = () => false,
  buttonStyle = {},
  headingLevel = "h2",
  heading = "Trophy Case",
  headingId = "trophy-case-heading",
  description = "",
  emptyMessage = "No trophies yet. Achievements you choose to celebrate will appear here.",
}) {
  const trophies = useMemo(() => [...trophyEntries].sort(compareEntries), [trophyEntries]);
  const Heading = headingLevel;
  const actionStyle = {
    ...buttonStyle,
    backgroundColor: "#4b5563",
    fontSize: "16px",
    marginTop: "14px",
    minHeight: "44px",
    padding: "10px 14px",
  };

  return (
    <section aria-labelledby={headingId} style={{ marginTop: "36px", maxWidth: "760px", minWidth: 0, textAlign: "left", width: "100%" }}>
      <Heading id={headingId}>{heading}</Heading>
      {description && <p style={{ color: "#bbb" }}>{description}</p>}
      {trophies.length === 0 ? (
        <p style={{ color: "#bbb" }}>{emptyMessage}</p>
      ) : (
        <div data-testid="trophy-card-list" style={{ display: "grid", gap: "14px", minWidth: 0, width: "100%" }}>
          {trophies.map((entry) => (
            <div
              key={entry.id}
              role="group"
              aria-label={`${entry.title} trophy`}
              data-source-key={entry.sourceKey}
              style={{
                background: "linear-gradient(145deg, #1f2937, #172033)",
                border: "1px solid #a16207",
                borderRadius: "14px",
                boxSizing: "border-box",
                minWidth: 0,
                overflow: "hidden",
                overflowWrap: "anywhere",
                padding: "16px",
                width: "100%",
              }}
            >
              <h3 style={{ margin: 0 }}>{entry.title}</h3>
              <strong style={{ color: "#fde68a", display: "block", marginTop: "10px" }}>🏆 {entry.sourceSnapshot?.recordLabel || "Achievement"}</strong>
              <span style={{ display: "block", fontSize: "20px", fontWeight: 700, marginTop: "6px" }}>
                {entry.sourceSnapshot?.recordValue || entry.description}
              </span>
              <span style={{ color: "#d1d5db", display: "block", marginTop: "6px" }}>
                Achieved: {formatDate(entry.achievedAt)}
                {entry.sourceSnapshot?.workoutTitle ? ` · ${entry.sourceSnapshot.workoutTitle}` : ""}
              </span>
              <button type="button" onClick={() => removeTrophyCaseEntry(entry.id)} style={actionStyle}>
                Remove from Trophy Case
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default TrophyCase;
