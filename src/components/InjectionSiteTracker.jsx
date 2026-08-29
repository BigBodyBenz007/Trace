import { useEffect, useMemo, useRef, useState } from "react";
import { INJECTION_BODY_STYLE_ASSETS } from "../assets/injection-body-styles";
import {
  BODY_STYLE_OPTIONS,
  createInjectionId,
  deriveInjectionSiteLabel,
  injectionHistory,
  injectionSiteRecency,
  localDateTimeParts,
  localDateTimeToIso,
  shotDraftError,
} from "../services/injectionSite";

const BODY_WIDTH = 600;
const BODY_HEIGHT = 1100;
const UNLINKED_FILTER = "__unlinked__";
const RECENCY = {
  today: { className: "trace-injection-marker--today", label: "Today" },
  week: { className: "trace-injection-marker--week", label: "Within 7 days" },
  month: { className: "trace-injection-marker--month", label: "Within 30 days" },
};

function protocolName(shot, protocols) {
  if (!shot.protocolId) return "One-time / Unlinked";
  return protocols.find(({ id }) => id === shot.protocolId)?.name
    || shot.protocolName
    || `Deleted Protocol (${shot.protocolId})`;
}

function formatLocalDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatAmount(shot) {
  return shot.amount == null ? "" : `${shot.amount}${shot.unit ? ` ${shot.unit}` : ""}`;
}

function markerTransform(x, y) {
  return `translate(${Number((x * BODY_WIDTH).toFixed(6))} ${Number((y * BODY_HEIGHT).toFixed(6))})`;
}

function reducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollBehavior() {
  return reducedMotion() ? "auto" : "smooth";
}

function MarkerShape({ recency, html = false }) {
  if (html) return <span aria-hidden="true" className={`trace-injection-legend-shape ${RECENCY[recency].className}`} />;
  if (recency === "week") {
    return <>
      <path className="trace-injection-marker__halo" d="M0 -18 L18 0 L0 18 L-18 0 Z" />
      <path className="trace-injection-marker__core" d="M0 -10 L10 0 L0 10 L-10 0 Z" />
    </>;
  }
  return <>
    <circle className="trace-injection-marker__halo" r="16" />
    <circle className="trace-injection-marker__core" r={recency === "today" ? 8 : 9} />
  </>;
}

function pixelIsOpaque(image, x, y, canvasRef) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;
  const canvas = canvasRef.current || document.createElement("canvas");
  canvasRef.current = canvas;
  if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight || canvas.dataset.source !== image.currentSrc) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    canvas.dataset.source = image.currentSrc;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  const pixelX = Math.min(canvas.width - 1, Math.max(0, Math.floor(x * canvas.width)));
  const pixelY = Math.min(canvas.height - 1, Math.max(0, Math.floor(y * canvas.height)));
  return context.getImageData(pixelX, pixelY, 1, 1).data[3] > 24;
}

function BodyMap({
  bodyHitTest,
  bodyStyle,
  entries,
  now,
  onMarkerActivate,
  onSelect,
  pending,
  protocols,
  view,
}) {
  const imageRef = useRef(null);
  const hitCanvasRef = useRef(null);
  const styleLabel = BODY_STYLE_OPTIONS.find(({ id }) => id === bodyStyle)?.label || "Neutral — Average";
  const imageSource = INJECTION_BODY_STYLE_ASSETS[bodyStyle]?.[view];

  function selectPoint(event) {
    if (event.target.closest?.("[data-entry-id]")) return;
    const svg = event.currentTarget;
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    let viewBoxX = ((event.clientX - bounds.left) / bounds.width) * BODY_WIDTH;
    let viewBoxY = ((event.clientY - bounds.top) / bounds.height) * BODY_HEIGHT;
    if (typeof svg.createSVGPoint === "function" && typeof svg.getScreenCTM === "function") {
      const matrix = svg.getScreenCTM();
      if (matrix && typeof matrix.inverse === "function") {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const transformed = point.matrixTransform(matrix.inverse());
        viewBoxX = transformed.x;
        viewBoxY = transformed.y;
      }
    }
    const x = Math.min(1, Math.max(0, viewBoxX / BODY_WIDTH));
    const y = Math.min(1, Math.max(0, viewBoxY / BODY_HEIGHT));
    const opaque = bodyHitTest
      ? bodyHitTest({ image: imageRef.current, view, x, y, bodyStyle })
      : pixelIsOpaque(imageRef.current, x, y, hitCanvasRef);
    if (!opaque) return;
    onSelect({ view, x, y, siteLabel: deriveInjectionSiteLabel(view, x, y) });
  }

  return (
    <section className="trace-injection-figure" aria-label={`${view === "front" ? "Front" : "Back"} body map`}>
      <h2>{view === "front" ? "Front" : "Back"}</h2>
      <div className="trace-injection-body-frame">
        <img
          alt={`${styleLabel}, ${view} view`}
          className="trace-injection-body-art"
          data-testid={`${view}-body-art`}
          ref={imageRef}
          src={imageSource}
        />
        <svg
          aria-label={`${view === "front" ? "Front" : "Back"} full-body injection site map`}
          className="trace-injection-body"
          data-testid={`${view}-body-map`}
          onClick={selectPoint}
          role="group"
          viewBox={`0 0 ${BODY_WIDTH} ${BODY_HEIGHT}`}
        >
          <rect className="trace-injection-body__hit-plane" data-testid={`${view}-silhouette`} height={BODY_HEIGHT} width={BODY_WIDTH} />
          {entries.map((shot) => {
            const recency = injectionSiteRecency(shot.occurredAt, now);
            if (!recency) return null;
            const label = `${RECENCY[recency].label}, ${shot.substanceName}, ${shot.siteLabel}, ${protocolName(shot, protocols)}, ${formatLocalDateTime(shot.occurredAt)}`;
            return (
              <g
                aria-label={label}
                className={`trace-injection-marker ${RECENCY[recency].className}`}
                data-entry-id={shot.id}
                key={shot.id}
                onClick={(event) => { event.stopPropagation(); onMarkerActivate(shot.id); }}
                onFocus={() => onMarkerActivate(shot.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onMarkerActivate(shot.id);
                  }
                }}
                role="button"
                tabIndex="0"
                transform={markerTransform(shot.x, shot.y)}
              >
                <title>{label}</title>
                <circle className="trace-injection-marker__touch" r="18" />
                <circle className="trace-injection-marker__focus" r="28" />
                <MarkerShape recency={recency} />
              </g>
            );
          })}
          {pending?.view === view && (
            <g className="trace-injection-marker trace-injection-marker--pending" data-testid="pending-marker" transform={markerTransform(pending.x, pending.y)}>
              <circle r="18" />
              <path d="M-10 0 H10 M0 -10 V10" />
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}

function initialEditorState(entry, initialProtocolId, protocols) {
  const protocolId = entry?.protocolId || initialProtocolId || "";
  const protocol = protocols.find(({ id }) => id === protocolId);
  const item = protocol?.items?.find(({ id }) => id === entry?.protocolItemId)
    || (protocol?.items?.length === 1 ? protocol.items[0] : null);
  const unit = item?.dose?.unit === "custom" ? item.dose.customUnit : item?.dose?.unit;
  return {
    source: protocolId || UNLINKED_FILTER,
    itemId: entry?.protocolItemId || item?.id || "",
    substanceName: entry?.substanceName || item?.compound?.name || "",
    amount: entry?.amount ?? item?.dose?.amount ?? "",
    unit: entry?.unit || unit || "",
    notes: entry?.notes || "",
  };
}

function ShotEditor({
  editing,
  initialProtocolId,
  location,
  onAddAnother,
  onCancel,
  onDelete,
  onFinish,
  protocols,
  sessionDate,
  sessionShotCount,
  sessionTime,
  setSessionDate,
  setSessionTime,
}) {
  const initial = initialEditorState(editing, initialProtocolId, protocols);
  const [source, setSource] = useState(initial.source);
  const [itemId, setItemId] = useState(initial.itemId);
  const [substanceName, setSubstanceName] = useState(initial.substanceName);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState(initial.unit);
  const [notes, setNotes] = useState(initial.notes);
  const [error, setError] = useState("");
  const linkedProtocol = protocols.find(({ id }) => id === source) || null;

  function chooseSource(value) {
    setSource(value);
    setError("");
    if (value === UNLINKED_FILTER) {
      setItemId("");
      setSubstanceName("");
      setAmount("");
      setUnit("");
      return;
    }
    const protocol = protocols.find(({ id }) => id === value);
    const onlyItem = protocol?.items?.length === 1 ? protocol.items[0] : null;
    chooseItem(onlyItem?.id || "", protocol);
  }

  function chooseItem(value, protocol = linkedProtocol) {
    setItemId(value);
    const item = protocol?.items?.find(({ id }) => id === value);
    setSubstanceName(item?.compound?.name || "");
    setAmount(item?.dose?.amount ?? "");
    setUnit(item?.dose?.unit === "custom" ? item.dose.customUnit || "" : item?.dose?.unit || "");
  }

  function currentDraft() {
    const protocol = protocols.find(({ id }) => id === source);
    return {
      view: location.view,
      x: location.x,
      y: location.y,
      siteLabel: location.siteLabel,
      substanceName,
      protocolId: protocol?.id || null,
      protocolName: protocol?.name || null,
      protocolItemId: protocol ? itemId || null : null,
      amount,
      unit,
      notes,
    };
  }

  function validate(action) {
    if (linkedProtocol?.items?.length && !itemId) {
      setError("Choose the specific Protocol fluid or compound.");
      return;
    }
    const draft = currentDraft();
    const draftError = shotDraftError(draft);
    if (draftError) {
      setError(draftError);
      return;
    }
    const occurredAt = localDateTimeToIso(sessionDate, sessionTime);
    if (!occurredAt) {
      setError("Enter a valid local date and time.");
      return;
    }
    const result = action(draft, occurredAt);
    if (result?.status && result.status !== "saved") {
      setError(result.message || "Trace could not save this injection. Your unsaved shots are still here.");
    }
  }

  return (
    <section className="trace-feature-surface trace-injection-form-sheet" aria-label={editing ? "Edit shot" : "Log shot"}>
      <div className="trace-injection-form-sheet__heading">
        <div>
          <p className="trace-feature-page__kicker">{editing ? "Saved shot" : "Selected site"}</p>
          <h2>{editing ? "Edit Shot" : "Log Shot"}</h2>
        </div>
        <button className="trace-action trace-action--secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <p><strong>{location.siteLabel}</strong> · {location.view === "front" ? "Front" : "Back"} view</p>
      <div className="trace-injection-form-grid trace-injection-form-grid--time">
        <label>Date
          <input aria-label="Injection date" type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
        </label>
        <label>Time
          <input aria-label="Injection time" type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
        </label>
      </div>
      {editing && sessionShotCount > 1 && <p className="trace-injection-shared-time">Changing this date or time updates all {sessionShotCount} shots in the session.</p>}
      <label className="trace-injection-source">Source
        <select aria-label="Injection source" value={source} onChange={(event) => chooseSource(event.target.value)}>
          <option value={UNLINKED_FILTER}>One-time / Not in a Protocol</option>
          {protocols.map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.name}</option>)}
        </select>
      </label>
      {linkedProtocol?.items?.length > 0 && (
        <label className="trace-injection-source">Protocol fluid / compound
          <select aria-label="Protocol fluid or compound" value={itemId} onChange={(event) => chooseItem(event.target.value)}>
            <option value="">Choose the specific item</option>
            {linkedProtocol.items.map((item) => <option key={item.id} value={item.id}>{item.compound.name}</option>)}
          </select>
        </label>
      )}
      <label className="trace-injection-source">What did you inject?
        <input
          aria-label="What did you inject?"
          onChange={(event) => setSubstanceName(event.target.value)}
          readOnly={Boolean(linkedProtocol)}
          required
          type="text"
          value={substanceName}
        />
      </label>
      <div className="trace-injection-form-grid trace-injection-form-grid--dose">
        <label>Amount (optional)
          <input aria-label="Injection amount" min="0" onChange={(event) => setAmount(event.target.value)} step="any" type="number" value={amount} />
        </label>
        <label>Unit
          <input aria-label="Injection unit" onChange={(event) => setUnit(event.target.value)} type="text" value={unit} />
        </label>
      </div>
      <label className="trace-injection-notes">Notes (optional)
        <textarea aria-label="Injection notes" rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {error && <p className="trace-status trace-status--error" role="alert">{error}</p>}
      <div className="trace-injection-form-actions">
        {editing ? (
          <>
            <button className="trace-action trace-action--primary" type="button" onClick={() => validate(onFinish)}>Save Changes</button>
            <button className="trace-action trace-action--danger" type="button" onClick={() => onDelete(editing.id)}>Delete Shot</button>
          </>
        ) : (
          <>
            <button className="trace-action trace-action--secondary" type="button" onClick={() => validate(onAddAnother)}>Add Another Shot</button>
            <button className="trace-action trace-action--primary" type="button" onClick={() => validate(onFinish)}>Finish &amp; Save</button>
          </>
        )}
      </div>
    </section>
  );
}

export default function InjectionSiteTracker({
  bodyHitTest,
  bodyStyleId = "neutral-average",
  containerStyle = {},
  data,
  deleteShot = () => false,
  initialProtocolId = "",
  now = new Date(),
  onBack,
  saveSession = () => ({ status: "error" }),
  updateBodyStyle = () => false,
  updateShot = () => ({ status: "error" }),
  protocols = [],
}) {
  const validInitialProtocolId = protocols.some(({ id }) => id === initialProtocolId) ? initialProtocolId : "";
  const [filter, setFilter] = useState(validInitialProtocolId);
  const [pending, setPending] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [queuedShots, setQueuedShots] = useState([]);
  const [editingShot, setEditingShot] = useState(null);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const initialDateTime = localDateTimeParts(now);
  const [sessionDate, setSessionDate] = useState(initialDateTime.date);
  const [sessionTime, setSessionTime] = useState(initialDateTime.time);
  const instructionRef = useRef(null);
  const mapsRef = useRef(null);
  const logButtonRef = useRef(null);
  const allHistory = useMemo(() => injectionHistory(data), [data]);
  const filtered = allHistory.filter((shot) => filter === UNLINKED_FILTER ? !shot.protocolId : !filter || shot.protocolId === filter);
  const mapped = filtered.filter((shot) => injectionSiteRecency(shot.occurredAt, now));
  const activeMarker = allHistory.find(({ id }) => id === activeMarkerId) || null;
  const editingSessionShots = editingShot ? allHistory.filter(({ sessionId }) => sessionId === editingShot.sessionId) : [];
  const hasUnsaved = Boolean(pending || formOpen || queuedShots.length);

  useEffect(() => {
    if (!hasUnsaved) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  function focusLogButton() {
    window.requestAnimationFrame(() => {
      const button = logButtonRef.current;
      if (!button) return;
      button.focus({ preventScroll: true });
      const bounds = button.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        button.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
      }
    });
  }

  function selectLocation(location) {
    setEditingShot(null);
    setFormOpen(false);
    setPending(location);
    focusLogButton();
  }

  function focusBodyMaps() {
    window.requestAnimationFrame(() => {
      mapsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      instructionRef.current?.focus({ preventScroll: true });
    });
  }

  function addAnother(shot) {
    setQueuedShots((existing) => [...existing, { ...shot, id: createInjectionId("queued-shot") }]);
    setPending(null);
    setFormOpen(false);
    focusBodyMaps();
  }

  function finish(currentShot, occurredAt) {
    if (editingShot) {
      const result = updateShot(editingShot.id, currentShot, occurredAt);
      if (result?.status === "saved") {
        setEditingShot(null);
        setFormOpen(false);
      }
      return result;
    }
    const result = saveSession({ occurredAt, shots: [...queuedShots, currentShot].map(({ id, ...shot }) => shot) });
    if (result?.status === "saved") {
      setQueuedShots([]);
      setPending(null);
      setFormOpen(false);
      const reset = localDateTimeParts(now);
      setSessionDate(reset.date);
      setSessionTime(reset.time);
    }
    return result;
  }

  function removeShot(id) {
    if (!window.confirm("Delete this shot? Other shots in the same session will remain.")) return;
    if (deleteShot(id)) {
      setEditingShot(null);
      setFormOpen(false);
      setActiveMarkerId(null);
    }
  }

  function leaveTracker() {
    if (hasUnsaved && !window.confirm("Leave the Injection Site Tracker? Unsaved shots will be discarded.")) return;
    onBack();
  }

  function edit(shot) {
    const parts = localDateTimeParts(shot.occurredAt);
    setSessionDate(parts.date);
    setSessionTime(parts.time);
    setEditingShot(shot);
    setPending(null);
    setFormOpen(false);
  }

  return (
    <main className="trace-feature-page trace-feature-page--injection-sites" data-testid="injection-site-tracker" style={containerStyle}>
      <header className="trace-feature-page__identity">
        <p className="trace-feature-page__kicker">Protocols · Site history</p>
        <h1>Injection Site Tracker</h1>
        <p className="trace-feature-page__lede" ref={instructionRef} tabIndex="-1">Tap anywhere on the body to mark the exact location.</p>
      </header>
      <nav className="trace-injection-navigation" aria-label="Injection Site Tracker navigation">
        <button className="trace-action trace-action--secondary" type="button" onClick={leaveTracker}>Back to Protocols</button>
        <label>Injection filter
          <select aria-label="Injection filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">All Injections</option>
            <option value={UNLINKED_FILTER}>One-time / Unlinked</option>
            {protocols.map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.name}</option>)}
          </select>
        </label>
        <label>Body Style
          <select aria-label="Body Style" value={bodyStyleId} onChange={(event) => updateBodyStyle(event.target.value)}>
            {BODY_STYLE_OPTIONS.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
          </select>
        </label>
      </nav>

      <div className="trace-injection-body-grid" aria-label="Front and back body maps" ref={mapsRef}>
        {(["front", "back"]).map((view) => <BodyMap
          bodyHitTest={bodyHitTest}
          bodyStyle={bodyStyleId}
          entries={mapped.filter((shot) => shot.view === view)}
          key={`${bodyStyleId}:${view}`}
          now={now}
          onMarkerActivate={setActiveMarkerId}
          onSelect={selectLocation}
          pending={pending}
          protocols={protocols}
          view={view}
        />)}
      </div>

      {pending && <p className="trace-injection-pending-copy" role="status">Selected: <strong>{pending.siteLabel}</strong> · Tap again to move the pending marker.</p>}
      {queuedShots.length > 0 && <p className="trace-injection-queue" role="status"><strong>{queuedShots.length}</strong> {queuedShots.length === 1 ? "shot" : "shots"} queued for this session.</p>}
      {activeMarker && <p className="trace-injection-marker-detail" role="status"><strong>{activeMarker.substanceName}</strong> · {activeMarker.siteLabel} · {protocolName(activeMarker, protocols)} · {formatLocalDateTime(activeMarker.occurredAt)}</p>}

      <button
        className="trace-action trace-action--primary trace-injection-log-action"
        disabled={!pending || formOpen || Boolean(editingShot)}
        ref={logButtonRef}
        type="button"
        onClick={() => setFormOpen(true)}
      >
        <span aria-hidden="true">＋</span> Log Injection
      </button>

      {(formOpen || editingShot) && <ShotEditor
        editing={editingShot}
        initialProtocolId={filter !== UNLINKED_FILTER ? filter || validInitialProtocolId : ""}
        key={editingShot?.id || `${pending?.view}:${pending?.x}:${pending?.y}:${queuedShots.length}`}
        location={editingShot || pending}
        onAddAnother={addAnother}
        onCancel={() => { setFormOpen(false); setEditingShot(null); }}
        onDelete={removeShot}
        onFinish={finish}
        protocols={protocols}
        sessionDate={sessionDate}
        sessionShotCount={editingSessionShots.length}
        sessionTime={sessionTime}
        setSessionDate={setSessionDate}
        setSessionTime={setSessionTime}
      />}

      <section className="trace-injection-legend" aria-labelledby="injection-recency-heading">
        <h2 id="injection-recency-heading">Recently Used</h2>
        <div>{Object.entries(RECENCY).map(([key, value]) => <p key={key}><MarkerShape html recency={key} /><span>{value.label}</span></p>)}</div>
        <p className="trace-injection-safety-copy">Marker colors and shapes show recency only. They do not indicate whether a location is medically safe.</p>
      </section>

      <section className="trace-injection-recent" aria-labelledby="recent-sites-heading">
        <h2 id="recent-sites-heading">Recent Sites</h2>
        {filtered.length === 0 ? <p>No injections recorded for this filter.</p> : <div className="trace-injection-recent__list">
          {filtered.map((shot) => {
            const recency = injectionSiteRecency(shot.occurredAt, now);
            return <button
              aria-label={`Edit ${shot.substanceName} injection at ${shot.siteLabel}, ${formatLocalDateTime(shot.occurredAt)}`}
              className="trace-injection-recent__row"
              key={shot.id}
              onClick={() => edit(shot)}
              type="button"
            >
              <span className="trace-injection-recent__marker">{recency ? <MarkerShape html recency={recency} /> : <span aria-hidden="true" className="trace-injection-history-mark">•</span>}</span>
              <span>
                <strong>{shot.substanceName}</strong>
                <small>{shot.siteLabel}</small>
                <small>{protocolName(shot, protocols)}{formatAmount(shot) ? ` · ${formatAmount(shot)}` : ""}</small>
              </span>
              <time dateTime={shot.occurredAt}>{formatLocalDateTime(shot.occurredAt)}</time>
              <span aria-hidden="true">›</span>
            </button>;
          })}
        </div>}
      </section>
    </main>
  );
}
