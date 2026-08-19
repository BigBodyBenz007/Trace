import { useEffect, useMemo, useRef, useState } from "react";

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

function stableHash(value) {
  return [...String(value || "")].reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    2166136261
  );
}

export function getTrophyVariant(entry) {
  if (entry?.sourceType === "workout-pr") {
    if (entry.sourceRecordType === "heaviest-weight") return "championship-cup";
    if (entry.sourceRecordType === "reps-at-weight") return "handled-cup";
    if (entry.sourceRecordType === "bodyweight-reps") return "medal";
    return "crystal";
  }

  const lifeVariants = ["laurel-star", "crystal", "plaque", "medal"];
  return lifeVariants[stableHash(entry?.sourceKey || entry?.id || entry?.title) % lifeVariants.length];
}

export function TrophyAwardGraphic({ entry, variant }) {
  const safeId = String(entry.id || entry.sourceKey || "award").replace(/[^a-zA-Z0-9_-]/g, "-");
  const goldId = `trace-award-gold-${safeId}`;
  const silverId = `trace-award-silver-${safeId}`;
  const crystalId = `trace-award-crystal-${safeId}`;
  const pedestal = (
    <>
      <path d="M47 104h26l4 12H43l4-12Z" fill={`url(#${goldId})`} />
      <rect x="36" y="116" width="48" height="10" rx="2" fill="#6c482a" stroke="#d3a85f" strokeWidth="2" />
      <rect x="30" y="126" width="60" height="8" rx="2" fill="#3d291d" stroke="#9d7545" strokeWidth="2" />
    </>
  );

  return (
    <svg aria-hidden="true" className={`trace-award-graphic trace-award-graphic--${variant}`} focusable="false" viewBox="0 0 120 140">
      <defs>
        <linearGradient id={goldId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f3d592" />
          <stop offset="0.48" stopColor="#b98236" />
          <stop offset="1" stopColor="#70451f" />
        </linearGradient>
        <linearGradient id={silverId} x1="0" x2="1">
          <stop offset="0" stopColor="#f2f0e9" />
          <stop offset="0.5" stopColor="#a9b2b8" />
          <stop offset="1" stopColor="#65747d" />
        </linearGradient>
        <linearGradient id={crystalId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d9fffb" stopOpacity="0.94" />
          <stop offset="0.5" stopColor="#6fc5c5" stopOpacity="0.76" />
          <stop offset="1" stopColor="#a4b7d1" stopOpacity="0.58" />
        </linearGradient>
      </defs>

      {variant === "handled-cup" && (
        <>
          <path d="M38 29h44l-5 38c-2 16-10 25-17 25s-15-9-17-25l-5-38Z" fill={`url(#${goldId})`} stroke="#f0ce87" strokeWidth="2" />
          <path d="M40 39H27c-12 0-12 28 9 31M80 39h13c12 0 12 28-9 31" fill="none" stroke="#c9964d" strokeWidth="7" />
          <path d="M60 91v17" stroke="#c9964d" strokeWidth="8" />
          {pedestal}
        </>
      )}

      {variant === "championship-cup" && (
        <>
          <path d="M34 20h52l-7 35c-3 17-10 27-19 27S44 72 41 55l-7-35Z" fill={`url(#${goldId})`} stroke="#f3d592" strokeWidth="2" />
          <path d="M36 29H23c-12 0-12 27 12 34M84 29h13c12 0 12 27-12 34" fill="none" stroke="#bd873d" strokeWidth="7" />
          <path d="M60 81v25" stroke="#c9964d" strokeWidth="7" />
          <circle cx="60" cy="49" r="11" fill="#725022" stroke="#f1d18c" strokeWidth="2" />
          <path d="m60 39 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill="#f5dc9e" />
          {pedestal}
        </>
      )}

      {variant === "medal" && (
        <>
          <path d="M39 16h18l8 48-18 5-8-53Z" fill="#6c2940" stroke="#b86a79" strokeWidth="2" />
          <path d="M63 16h18L73 69l-18-5 8-48Z" fill="#243f66" stroke="#6f8db5" strokeWidth="2" />
          <circle cx="60" cy="78" r="28" fill={`url(#${goldId})`} stroke="#f2d38b" strokeWidth="3" />
          <circle cx="60" cy="78" r="20" fill="#8b622e" stroke="#e8c477" strokeWidth="2" />
          <path d="m60 63 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" fill="#f4d892" />
          <rect x="35" y="116" width="50" height="10" rx="2" fill="#3d291d" stroke="#9d7545" strokeWidth="2" />
        </>
      )}

      {variant === "laurel-star" && (
        <>
          <path d="M37 91c-17-18-17-46 2-65M83 91c17-18 17-46-2-65" fill="none" stroke="#c79548" strokeLinecap="round" strokeWidth="7" />
          <path d="M31 40 19 35M28 55l-13 2M30 71l-12 7M89 40l12-5M92 55l13 2M90 71l12 7" stroke="#d8ab63" strokeLinecap="round" strokeWidth="5" />
          <path d="m60 29 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3 9-19Z" fill={`url(#${goldId})`} stroke="#f3d592" strokeWidth="2" />
          <path d="M60 86v21" stroke="#c9964d" strokeWidth="7" />
          {pedestal}
        </>
      )}

      {variant === "crystal" && (
        <>
          <path d="m60 14 27 32-12 59H45L33 46 60 14Z" fill={`url(#${crystalId})`} stroke="#d8f2ee" strokeWidth="2" />
          <path d="m60 14-7 32 7 59M33 46h54M53 46l-8 59M67 46l8 59" fill="none" stroke="#eefcf9" strokeOpacity="0.68" strokeWidth="1.5" />
          <path d="M43 105h34l7 13H36l7-13Z" fill={`url(#${silverId})`} stroke="#d8e0e2" strokeWidth="2" />
          <rect x="30" y="118" width="60" height="12" rx="2" fill="#273642" stroke="#9daab0" strokeWidth="2" />
        </>
      )}

      {variant === "plaque" && (
        <>
          <path d="M31 27 42 16h36l11 11v69l-11 11H42L31 96V27Z" fill="#6d4729" stroke="#d3a85f" strokeWidth="3" />
          <path d="M39 32h42v57l-8 9H47l-8-9V32Z" fill={`url(#${goldId})`} stroke="#f1d18c" strokeWidth="2" />
          <path d="m60 43 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z" fill="#69451f" />
          <path d="M48 82h24" stroke="#765023" strokeLinecap="round" strokeWidth="4" />
          <rect x="27" y="114" width="66" height="12" rx="2" fill="#3d291d" stroke="#9d7545" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function awardTypeLabel(entry) {
  return entry.sourceSnapshot?.recordLabel
    || (entry.sourceType === "memory" ? "Life Achievement" : "Workout Achievement");
}

function awardAccessibleName(entry) {
  if (entry.sourceType === "memory") return `Open achievement: ${entry.title}`;
  return `Open workout achievement: ${entry.title}, ${awardTypeLabel(entry).toLowerCase()}`;
}

function TrophyBay({ entries, heading, headingId, emptyMessage, onOpen, triggerRefs }) {
  const slotCount = Math.max(3, Math.ceil((entries.length + 1) / 3) * 3);
  const slots = Array.from({ length: slotCount }, (_, index) => entries[index] || null);

  return (
    <section className="trace-trophy-bay" aria-labelledby={headingId}>
      <h2 className="trace-trophy-bay__label" id={headingId}>{heading}</h2>
      <div className="trace-trophy-shelves" data-testid={`${headingId}-shelves`}>
        {slots.map((entry, index) => entry ? (
          <article className="trace-trophy-position" key={entry.id} role="group" aria-label={`${entry.title} trophy`}>
            <button
              aria-label={awardAccessibleName(entry)}
              className="trace-trophy-object"
              data-award-variant={getTrophyVariant(entry)}
              data-source-key={entry.sourceKey}
              onClick={() => onOpen(entry)}
              ref={(node) => {
                if (node) triggerRefs.current.set(entry.id, node);
                else triggerRefs.current.delete(entry.id);
              }}
              type="button"
            >
              <TrophyAwardGraphic entry={entry} variant={getTrophyVariant(entry)} />
              <span className="trace-trophy-plaque">
                <strong title={entry.title}>{entry.title}</strong>
                <span>{entry.sourceSnapshot?.recordValue || entry.description || "Achievement"}</span>
                <time dateTime={entry.achievedAt}>{formatDate(entry.achievedAt)}</time>
              </span>
            </button>
          </article>
        ) : (
          <div aria-hidden="true" className="trace-trophy-position trace-trophy-position--empty" key={`empty-${index}`} />
        ))}
      </div>
      {entries.length === 0 && <p className="trace-trophy-bay__empty">{emptyMessage}</p>}
    </section>
  );
}

export function TrophyCabinet({
  trophyEntries = [],
  removeTrophyCaseEntry = () => false,
  onViewSource = null,
  sourceAvailable = () => false,
  restoreTrophyId = null,
  onRestoreComplete = () => {},
  allowRemoval = true,
}) {
  const trophies = useMemo(() => [...trophyEntries].sort(compareEntries), [trophyEntries]);
  const lifeAchievements = trophies.filter(({ sourceType }) => sourceType === "memory");
  const workoutAchievements = trophies.filter(({ sourceType }) => sourceType !== "memory");
  const [selectedId, setSelectedId] = useState(null);
  const triggerRefs = useRef(new Map());
  const detailRef = useRef(null);
  const selected = trophies.find(({ id }) => id === selectedId) || null;
  const selectedIsLifeAchievement = selected?.sourceType === "memory";
  const selectedLifeDescription = selected?.description || selected?.sourceSnapshot?.description || "";

  useEffect(() => {
    if (!selected) return;
    detailRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  useEffect(() => {
    if (!restoreTrophyId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const trigger = triggerRefs.current.get(restoreTrophyId);
      if (!trigger) return;
      trigger.scrollIntoView?.({ behavior: "smooth", block: "center" });
      trigger.focus({ preventScroll: true });
      onRestoreComplete(restoreTrophyId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [onRestoreComplete, restoreTrophyId, trophies]);

  function openDetail(entry) {
    setSelectedId(entry.id);
  }

  function closeDetail() {
    const trigger = triggerRefs.current.get(selectedId);
    setSelectedId(null);
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }

  function removeSelected() {
    if (!selected) return;
    const removed = removeTrophyCaseEntry(selected.id);
    if (removed !== false) closeDetail();
  }

  return (
    <div className="trace-trophy-cabinet" data-testid="trophy-cabinet">
      <div aria-hidden="true" className="trace-trophy-cabinet__crown">
        <span>Trace</span>
        <strong>Collection of Distinction</strong>
      </div>
      <div className="trace-trophy-cabinet__interior" data-testid="trophy-source-groups">
        <TrophyBay entries={lifeAchievements} heading="Life Achievements" headingId="life-achievements-heading" emptyMessage="No Life Achievements curated yet." onOpen={openDetail} triggerRefs={triggerRefs} />
        <TrophyBay entries={workoutAchievements} heading="Workout Achievements" headingId="workout-achievements-heading" emptyMessage="No Workout Achievements curated yet." onOpen={openDetail} triggerRefs={triggerRefs} />
      </div>

      {selected && (
        <section
          aria-labelledby="selected-trophy-heading"
          className="trace-trophy-detail"
          data-testid="trophy-detail"
          ref={detailRef}
          tabIndex="-1"
        >
          <div className="trace-trophy-detail__heading">
            <div>
              <p>{awardTypeLabel(selected)}</p>
              <h2 id="selected-trophy-heading">{selected.title}</h2>
            </div>
            <button className="trace-action trace-action--secondary" onClick={closeDetail} type="button">Close achievement details</button>
          </div>
          {selectedIsLifeAchievement ? (
            <div className="trace-trophy-detail__life">
              <p className="trace-trophy-detail__life-date">
                <span>Achieved</span>
                <time dateTime={selected.achievedAt}>{formatDate(selected.achievedAt)}</time>
              </p>
              {selectedLifeDescription && <p className="trace-trophy-detail__description">{selectedLifeDescription}</p>}
            </div>
          ) : (
            <dl className="trace-trophy-detail__facts">
              <div><dt>Record</dt><dd>{selected.sourceSnapshot?.recordValue || selected.description || "Achievement"}</dd></div>
              <div><dt>Achieved</dt><dd>{formatDate(selected.achievedAt)}</dd></div>
              {selected.sourceSnapshot?.workoutTitle && <div><dt>Workout</dt><dd>{selected.sourceSnapshot.workoutTitle}</dd></div>}
            </dl>
          )}
          <div className="trace-trophy-detail__actions">
            {onViewSource && (
              <button className="trace-action trace-action--brass" disabled={!sourceAvailable(selected)} onClick={() => onViewSource(selected)} type="button">
                {selected.sourceType === "memory" ? "View Memory" : "View Workout"}
              </button>
            )}
            {onViewSource && !sourceAvailable(selected) && <span className="trace-trophy-detail__unavailable">Source no longer available</span>}
            {allowRemoval && <button className="trace-action trace-action--danger" onClick={removeSelected} type="button">Remove from Trophy Case</button>}
          </div>
        </section>
      )}
    </div>
  );
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
  onViewSource = null,
  sourceAvailable = () => false,
  restoreTrophyId = null,
  onRestoreComplete = () => {},
  allowRemoval = true,
}) {
  const trophies = useMemo(() => [...trophyEntries].sort(compareEntries), [trophyEntries]);
  const Heading = headingLevel;
  const cardRefs = useRef(new Map());
  useEffect(() => {
    if (!restoreTrophyId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const card = cardRefs.current.get(restoreTrophyId);
      if (!card) return;
      card.scrollIntoView?.({ behavior: "smooth", block: "center" });
      onRestoreComplete(restoreTrophyId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [onRestoreComplete, restoreTrophyId, trophies]);
  const actionStyle = {
    ...buttonStyle,
    backgroundColor: "#4b5563",
    fontSize: "16px",
    marginTop: "14px",
    minHeight: "44px",
    padding: "10px 14px",
  };

  return (
    <section className="trace-trophy-section" aria-labelledby={headingId} style={{ marginTop: "36px", maxWidth: "760px", minWidth: 0, textAlign: "left", width: "100%" }}>
      <Heading id={headingId}>{heading}</Heading>
      {description && <p style={{ color: "#bbb" }}>{description}</p>}
      {trophies.length === 0 ? (
        <p style={{ color: "#bbb" }}>{emptyMessage}</p>
      ) : (
        <div data-testid="trophy-card-list" style={{ display: "grid", gap: "14px", minWidth: 0, width: "100%" }}>
          {trophies.map((entry) => (
            <div
              className="trace-trophy-card"
              key={entry.id}
              ref={(node) => {
                if (node) cardRefs.current.set(entry.id, node);
                else cardRefs.current.delete(entry.id);
              }}
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
              {onViewSource && (
                <>
                  <button
                    className="trace-action trace-action--brass"
                    type="button"
                    disabled={!sourceAvailable(entry)}
                    onClick={() => onViewSource(entry)}
                    style={actionStyle}
                  >
                    {entry.sourceType === "memory" ? "View Memory" : "View Workout"}
                  </button>
                  {!sourceAvailable(entry) && (
                    <span style={{ color: "#9ca3af", display: "block", marginTop: "8px" }}>
                      Source no longer available
                    </span>
                  )}
                </>
              )}
              {allowRemoval && (
                <button className="trace-action trace-action--secondary" type="button" onClick={() => removeTrophyCaseEntry(entry.id)} style={actionStyle}>
                  Remove from Trophy Case
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default TrophyCase;
