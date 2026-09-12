import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CAPSULE_RECORDING_CREDITS } from "../services/capsulePresentation";
import "./CreditsPage.css";

function inlineText(text) {
  return text.split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" aria-label={`${link[1].replace(/`/g, "")} (source options)`}>{inlineText(link[1])}</a>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// Render the bundled attribution document without HTML injection or a second,
// independently maintained copy of its source links and modification notices.
function CreditDocument({ text }) {
  // The source document also records checkout-only audition instructions.
  // Keep its attribution, modifications and every source link in the app,
  // while leaving development commands in the original bundled audit file.
  const appText = text
    .replace(/The original audition page remains at `docs\/time-capsule-sound-preview\.html`[\s\S]*?(?=The source files, exact download URLs)/, "")
    .replace("The player mutes quarter-speed playback and frame inspection. ", "");
  const lines = appText.split(/\r?\n/);
  const content = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const key = index;
    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      index += 1;
      content.push(<pre key={key}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const Heading = `h${heading[1].length + 1}`;
      content.push(<Heading key={key}>{inlineText(heading[2])}</Heading>);
      index += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        const cells = lines[index++].split("|").slice(1, -1).map(cell => cell.trim());
        if (!cells.every(cell => /^:?-+:?$/.test(cell))) rows.push(cells);
      }
      const [headings, ...records] = rows;
      content.push(<div className="trace-credits-records" key={key}>{records.map((cells, row) => <section className="trace-credits-record" key={row}>
        <h4>{inlineText(cells[0])}</h4>
        <dl>{cells.slice(1).map((cell, column) => <div key={column}><dt>{headings[column + 1]}</dt><dd>{inlineText(cell)}</dd></div>)}</dl>
      </section>)}</div>);
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) items.push(lines[index++].slice(2));
      content.push(<ul key={key}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ul>);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim()) paragraph.push(lines[index++]);
    content.push(<p key={key}>{inlineText(paragraph.join(" "))}</p>);
  }
  return content;
}

function ExternalSourceDialog({ source, onClose }) {
  const dialogRef = useRef(null);
  const addressRef = useRef(null);
  const [notice, setNotice] = useState("");
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute("open", "");
    return () => { source.origin?.focus({ preventScroll: true }); };
  }, [source]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(source.href);
      setNotice("Link copied.");
    } catch {
      addressRef.current?.focus();
      addressRef.current?.select();
      setNotice("Select and copy the address above.");
    }
  }

  return <dialog ref={dialogRef} className="trace-credits-external" aria-labelledby="credits-source-heading" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="credits-source-heading">Open source or license</h2>
    <p>{source.label}</p>
    <p>You can copy this address or open it in your browser. The browser controls how external pages are displayed.</p>
    <textarea ref={addressRef} aria-label="Source address" readOnly rows={3} value={source.href} />
    <div className="trace-credits-external__actions">
      <button className="trace-action trace-action--secondary" type="button" onClick={onClose} autoFocus>Back to credits</button>
      <button className="trace-action trace-action--secondary" type="button" onClick={copyLink}>Copy link</button>
      <button className="trace-action trace-action--primary" type="button" onClick={() => window.open(source.href, "_blank", "noopener,noreferrer")}>Open in browser</button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </dialog>;
}

export default function CreditsPage({ onBackToSettings }) {
  const headingRef = useRef(null);
  const [document, setDocument] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [externalSource, setExternalSource] = useState(null);
  useLayoutEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setError(false);
    fetch(CAPSULE_RECORDING_CREDITS, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Credits unavailable"); return response.text(); })
      .then(text => { if (current) setDocument(text); })
      .catch(() => { if (current) setError(true); });
    return () => { current = false; controller.abort(); };
  }, [attempt]);

  return <main className="trace-feature-page trace-credits-page" data-testid="credits-page">
    <nav className="trace-credits-navigation" aria-label="Credits navigation">
      <button className="trace-action trace-action--secondary" type="button" onClick={onBackToSettings}>Back to Settings</button>
    </nav>
    <article className="trace-feature-surface trace-credits-document" aria-labelledby="credits-heading" onClick={event => {
      const link = event.target.closest("a");
      if (!link || !link.href.startsWith("https://")) return;
      event.preventDefault();
      setExternalSource({ href: link.href, label: link.textContent, origin: link });
    }}>
      <header className="trace-feature-page__identity">
        <p className="trace-feature-page__kicker">About Trace</p>
        <h1 id="credits-heading" ref={headingRef} tabIndex={-1}>Credits &amp; licenses</h1>
        <p>Credits, source recordings, and notices for the Time Capsule presentation.</p>
        <p>Select a source or license to copy its address or open it in your browser.</p>
      </header>
      {document ? <CreditDocument text={document} /> : error ? <section role="alert"><p>Credits could not be loaded. You can return to Settings or try again.</p><button className="trace-action trace-action--secondary" type="button" onClick={() => setAttempt(value => value + 1)}>Retry credits</button></section> : <p role="status">Loading credits…</p>}
    </article>
    {externalSource && <ExternalSourceDialog source={externalSource} onClose={() => setExternalSource(null)} />}
  </main>;
}
