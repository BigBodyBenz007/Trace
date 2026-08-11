import { useEffect, useRef, useState } from "react";
import ProtocolEditor from "./ProtocolEditor";
import { formatDoseUnit, formatRoute } from "../services/medicationEntry";
import { formatProtocolSchedule } from "../services/protocol";

function formatDate(dateKey) {
  if (!dateKey) return "Open-ended";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function protocolScheduleSummary(protocol) {
  return [...new Set(protocol.items.map(({ schedule }) => formatProtocolSchedule(schedule)))].join(" · ");
}

function ProtocolsPage({
  onBack,
  protocols = [],
  compounds = [],
  saveProtocol,
  updateProtocol,
  endProtocol,
  deleteProtocol,
  buttonStyle = {},
  inputStyle = {},
  containerStyle = {},
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [editorMode, setEditorMode] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const originRef = useRef(null);
  const pageTopRef = useRef(null);
  const listRef = useRef(null);
  const createRef = useRef(null);
  const editorRef = useRef(null);
  const detailRef = useRef(null);
  const currentSectionRef = useRef(null);
  const endedSectionRef = useRef(null);
  const rowRefs = useRef(new Map());
  const selected = protocols.find(({ id }) => id === selectedId) || null;
  const current = protocols.filter(({ status }) => status === "active");
  const ended = protocols.filter(({ status }) => status === "ended");

  useEffect(() => {
    if (!pendingNavigation) return undefined;
    const frame = window.requestAnimationFrame(() => {
      let target = null;
      let block = "center";
      if (pendingNavigation.type === "detail") {
        target = detailRef.current;
        block = "start";
      } else if (pendingNavigation.type === "editor") {
        target = editorRef.current;
        block = "start";
      } else if (pendingNavigation.type === "row") {
        target = rowRefs.current.get(pendingNavigation.id);
        if (!target) {
          target = pendingNavigation.status === "ended"
            ? endedSectionRef.current
            : currentSectionRef.current;
          block = "start";
        }
      } else if (pendingNavigation.type === "create-origin") {
        target = createRef.current || listRef.current;
      }
      target?.scrollIntoView?.({ behavior: "smooth", block });
      setPendingNavigation(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingNavigation, selectedId, editorMode, protocols]);

  function openDetail(id) {
    const protocol = protocols.find((entry) => entry.id === id);
    originRef.current = protocol ? { id, status: protocol.status } : { id, status: "active" };
    setSelectedId(id);
    setEditorMode(null);
    setPendingNavigation({ type: "detail" });
  }

  function closeDetail() {
    const origin = originRef.current || { id: selectedId, status: selected?.status || "active" };
    setSelectedId(null);
    setPendingNavigation({ type: "row", ...origin });
  }

  function openCreate() {
    setSelectedId(null);
    setEditorMode("create");
    setPendingNavigation({ type: "editor" });
  }

  function cancelCreate() {
    setEditorMode(null);
    setPendingNavigation({ type: "create-origin" });
  }

  function saveCreated(draft) {
    const result = saveProtocol(draft);
    if (result?.status === "saved") {
      setEditorMode(null);
      originRef.current = { id: result.protocol.id, status: result.protocol.status };
      setPendingNavigation({ type: "row", id: result.protocol.id, status: result.protocol.status });
    }
    return result;
  }

  function openEdit() {
    setEditorMode("edit");
    setPendingNavigation({ type: "editor" });
  }

  function cancelEdit() {
    setEditorMode(null);
    setPendingNavigation({ type: "detail" });
  }

  function saveEdited(draft) {
    const result = updateProtocol(selectedId, draft);
    if (result?.status === "saved") {
      setEditorMode(null);
      setPendingNavigation({ type: "detail" });
    }
    return result;
  }

  function finishProtocol() {
    if (!window.confirm("End this protocol today? Its saved plan will remain available.")) return;
    const id = selectedId;
    if (!endProtocol(id)) return;
    setSelectedId(null);
    setEditorMode(null);
    setPendingNavigation({ type: "row", id, status: "ended" });
  }

  function removeProtocol() {
    if (!window.confirm("Delete this protocol? Medication history will not be changed.")) return;
    if (!deleteProtocol(selectedId)) return;
    setSelectedId(null);
    setEditorMode(null);
    setPendingNavigation({ type: "row", ...(originRef.current || { id: selectedId, status: selected?.status || "active" }) });
  }

  const backStyle = { ...buttonStyle, backgroundColor: "#666" };
  const renderList = (title, entries, emptyCopy) => (
    <section
      ref={title === "Ended Protocols" ? endedSectionRef : currentSectionRef}
      aria-label={title}
      style={{ marginTop: "28px", maxWidth: "800px", scrollMarginTop: "24px", textAlign: "left", width: "100%" }}
    >
      <h2>{title}</h2>
      {entries.length === 0 ? (
        <p style={{ color: "#bbb" }}>{emptyCopy}</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {entries.map((protocol) => (
            <article
              key={protocol.id}
              ref={(element) => {
                if (element) rowRefs.current.set(protocol.id, element);
                else rowRefs.current.delete(protocol.id);
              }}
              data-protocol-id={protocol.id}
              style={{ background: "#1f2937", borderRadius: "12px", padding: "18px" }}
            >
              <h3 style={{ marginTop: 0 }}>{protocol.name}</h3>
              <p>Start: {formatDate(protocol.startDate)}{protocol.endDate ? ` · End: ${formatDate(protocol.endDate)}` : " · Open-ended"}</p>
              <p>{protocol.items.length} {protocol.items.length === 1 ? "compound" : "compounds"} · {protocolScheduleSummary(protocol)}</p>
              <button type="button" onClick={() => openDetail(protocol.id)}>View Protocol</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  if (editorMode) {
    return (
      <div ref={pageTopRef} data-testid="protocols-page" style={containerStyle}>
        <div ref={editorRef} data-testid="protocol-editor-context" style={{ display: "flex", justifyContent: "center", scrollMarginTop: "24px", width: "100%" }}>
          <ProtocolEditor
            protocol={editorMode === "edit" ? selected : null}
            compounds={compounds}
            onSave={editorMode === "edit" ? saveEdited : saveCreated}
            onCancel={editorMode === "edit" ? cancelEdit : cancelCreate}
            buttonStyle={buttonStyle}
            inputStyle={inputStyle}
          />
        </div>
      </div>
    );
  }

  if (selected) {
    const actions = (position) => (
      <div aria-label={`${position} protocol detail actions`} style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
        <button type="button" onClick={closeDetail} style={backStyle}>Back to Protocols</button>
        {selected.status === "active" && <button type="button" onClick={openEdit}>Edit Protocol</button>}
        {selected.status === "active" && <button type="button" onClick={finishProtocol}>End Protocol</button>}
        <button type="button" onClick={removeProtocol}>Delete Protocol</button>
      </div>
    );
    return (
      <div data-testid="protocols-page" style={containerStyle}>
        <article ref={detailRef} data-testid="protocol-detail" style={{ background: "#1f2937", borderRadius: "16px", maxWidth: "800px", padding: "24px", scrollMarginTop: "24px", textAlign: "left", width: "100%" }}>
          <h1 style={{ marginTop: 0 }}>{selected.name}</h1>
          {actions("Top")}
          <p><strong>Status:</strong> {selected.status === "active" ? "Current / Upcoming" : "Ended"}</p>
          <p><strong>Start:</strong> {formatDate(selected.startDate)}</p>
          <p><strong>End:</strong> {selected.endDate ? formatDate(selected.endDate) : "Open-ended"}</p>
          {selected.notes && <p style={{ whiteSpace: "pre-wrap" }}>{selected.notes}</p>}
          <section aria-label="Protocol detail items">
            <h2>Protocol Items</h2>
            {selected.items.map((item) => (
              <article key={item.id} style={{ background: "#111827", borderRadius: "10px", marginTop: "12px", padding: "14px" }}>
                <h3 style={{ marginTop: 0 }}>{item.compound.name}</h3>
                <p>{item.dose.amount} {formatDoseUnit(item.dose)} · {formatRoute(item.route)}</p>
                <p>{formatProtocolSchedule(item.schedule)}</p>
                {item.notes && <p style={{ whiteSpace: "pre-wrap" }}>{item.notes}</p>}
              </article>
            ))}
          </section>
          {actions("Bottom")}
        </article>
      </div>
    );
  }

  return (
    <div ref={pageTopRef} data-testid="protocols-page" style={containerStyle}>
      <h1>Protocols</h1>
      <p style={{ color: "#d1d5db", maxWidth: "800px" }}>
        Record a protocol you chose. Trace stores and displays what you enter; it does not recommend protocols, compounds, doses, routes, or schedules.
      </p>
      <button type="button" onClick={onBack} style={backStyle}>Back to Timeline</button>
      <button ref={createRef} type="button" onClick={openCreate} style={buttonStyle}>Create Protocol</button>
      <div ref={listRef} style={{ width: "100%" }}>
        {renderList("Current & Upcoming Protocols", current, "No current or upcoming protocols yet.")}
        {renderList("Ended Protocols", ended, "No ended protocols yet.")}
      </div>
      <button type="button" onClick={onBack} style={backStyle}>Back to Timeline</button>
    </div>
  );
}

export default ProtocolsPage;
