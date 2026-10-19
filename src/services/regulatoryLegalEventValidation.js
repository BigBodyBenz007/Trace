// Legal actions and cited qualifications only; no product or scientific verdicts.
const { JURISDICTIONS, validateSourceReference, validateSourceRegistry } = require("./regulatorySourceValidation");
const ACTION_TYPES = Object.freeze(["authorization", "authorization-amendment", "authorization-revocation",
  "administrative-stay", "stay-lifted"]);
const PROCEDURAL_ACTIONS = ["administrative-stay", "stay-lifted"];
const LEGAL_DOCUMENTS = ["regulation", "consolidated-regulation", "amendment", "final-rule"];
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim() === v && v.length > 0;
const identifier = (v) => text(v) && /^[A-Za-z0-9][A-Za-z0-9:._/-]*$/.test(v);
const list = (v) => Array.isArray(v) ? Array.from(v) : [];
const result = (errors) => ({ valid: errors.length === 0, errors });

function date(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v.startsWith("0000")) return false;
  const time = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === v;
}

function fields(value, allowed, label, errors) {
  if (!object(value)) { errors.push(`${label} must be an object`); return; }
  Object.keys(value).forEach((field) => {
    if (!allowed.includes(field)) errors.push(`${label}: unsupported field ${field}`);
  });
}

function validateLegalEvent(event, sources, { asOf = null } = {}) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  if (!object(event)) return result(["event must be an object"]);
  fields(event, ["eventId", "substance", "jurisdiction", "authority", "action", "affectedUses", "dates",
    "qualifications", "sourceReferences", "evidence", "relationships", "useScope"], "event", errors);
  check(identifier(event.eventId), "eventId is required");
  const substance = object(event.substance) ? event.substance : {};
  fields(event.substance, ["id", "name"], "substance", errors);
  check(identifier(substance.id) && text(substance.name), "substance requires a stable id and name");
  check(JURISDICTIONS.includes(event.jurisdiction), "unknown jurisdiction");
  check(text(event.authority), "authority is required");
  const action = object(event.action) ? event.action : {};
  fields(event.action, ["type", "stage", "target"], "action", errors);
  check(ACTION_TYPES.includes(action.type), "unsupported action type");
  check(action.stage === "final", "only final actions are supported");
  check(text(action.target), "action target is required");
  const procedural = PROCEDURAL_ACTIONS.includes(action.type);
  if (event.useScope !== undefined || procedural) {
    fields(event.useScope, ["domain", "provision"], "useScope", errors);
    check(event.useScope?.domain === "food" && text(event.useScope?.provision)
      && event.useScope.provision === action.target, "useScope requires food and the exact affected provision");
  }
  check(Array.isArray(event.affectedUses) && event.affectedUses.length > 0
    && list(event.affectedUses).every(text), "affectedUses requires explicit food uses");

  const dates = object(event.dates) ? event.dates : {};
  fields(event.dates, ["publishedOn", "effectiveOn", "complianceOn", "complianceNote", "sourceReferenceId",
    "effectiveNote", "complianceSourceReferenceId"], "dates", errors);
  check(date(dates.publishedOn), "publishedOn requires a real ISO date");
  check(date(dates.effectiveOn), "effectiveOn requires a real ISO date");
  check(dates.complianceOn === null || date(dates.complianceOn), "complianceOn requires an ISO date or explicit null");
  check(text(dates.complianceNote), "complianceNote must explain the deadline or its absence");
  const ordered = (a, b, message) => { if (date(a) && date(b)) check(a <= b, message); };
  // A later notice can explicitly report an earlier automatic stay. Ordinary
  // final actions still cannot acquire retroactive effect by adding a note.
  if (action.type !== "administrative-stay") {
    ordered(dates.publishedOn, dates.effectiveOn, "publication must not follow effect in this schema");
  }
  ordered(dates.effectiveOn, dates.complianceOn, "compliance must not precede effect in this schema");
  if (dates.effectiveNote !== undefined || procedural) check(text(dates.effectiveNote), "effectiveNote is required for procedural dates");
  if (procedural) check(dates.complianceOn === null, "procedural events must not create or copy compliance deadlines");

  const evidence = object(event.evidence) ? event.evidence : {};
  fields(event.evidence, ["status", "lastReviewedOn", "scope", "limitations"], "evidence", errors);
  check(evidence.status === "verified", "only directly verified legal events are supported");
  check(date(evidence.lastReviewedOn), "lastReviewedOn requires a real ISO date");
  check(text(evidence.scope), "evidence scope is required");
  check(Array.isArray(evidence.limitations) && list(evidence.limitations).every(text), "evidence limitations must be a text array");
  check(asOf === null || date(asOf), "invalid asOf date");
  ordered(dates.publishedOn, evidence.lastReviewedOn, "review must not precede publication");
  ordered(evidence.lastReviewedOn, asOf, "review must not exceed snapshot/asOf");

  const references = new Map();
  let primary = null;
  let primaryCount = 0;
  check(Array.isArray(event.sourceReferences) && event.sourceReferences.length > 0, "sourceReferences are required");
  list(event.sourceReferences).forEach((ref) => {
    fields(ref, ["referenceId", "role", "sourceId", "editionId", "provisions"], "source reference", errors);
    if (!object(ref)) return;
    check(identifier(ref.referenceId), "referenceId is required");
    check(!references.has(ref.referenceId), "duplicate/conflicting referenceId");
    references.set(ref.referenceId, ref);
    check(["primary", "supporting"].includes(ref.role), "invalid source role");
    check(Array.isArray(ref.provisions) && ref.provisions.length > 0
      && list(ref.provisions).every(text), "source provisions are required");
    const validation = validateSourceReference(ref, sources, asOf === null ? undefined : { asOf });
    errors.push(...validation.errors.map((error) => `source reference: ${error}`));
    if (ref.role === "primary") primaryCount += 1;
    if (!validation.valid) return;
    const source = sources.find((s) => s.sourceId === ref.sourceId && s.editionId === ref.editionId);
    check(source.verification.status === "verified" && source.verification.evidenceType === "official-text",
      "event sources require verified official-text evidence");
    check(source.citation.jurisdiction === event.jurisdiction, "source jurisdiction must match event");
    check(LEGAL_DOCUMENTS.includes(source.documentType)
      || (ref.role === "supporting" && source.documentType === "regulatory-announcement"),
    "source must support a final legal action, not a proposal or scientific assessment");
    ordered(source.verification.lastVerifiedOn, evidence.lastReviewedOn, "event review precedes source verification");
    if (ref.role === "primary") {
      primary = ref;
      check(source.citation.publisher === event.authority, "authority must match primary source issuer");
      check(source.citation.publicationDate === dates.publishedOn, "publication must match primary source edition");
    }
  });
  check(primaryCount === 1, "exactly one primary source is required");
  check(primary !== null && dates.sourceReferenceId === primary.referenceId, "dates must cite the primary legal source");
  const cite = (id) => check(identifier(id) && references.has(id), "qualification/relationship source reference is missing");
  if (dates.complianceSourceReferenceId !== undefined || (event.useScope && date(dates.complianceOn))) {
    cite(dates.complianceSourceReferenceId);
  }

  const qualificationIds = new Set();
  check(Array.isArray(event.qualifications) && event.qualifications.length > 0, "reviewed qualifications are required");
  list(event.qualifications).forEach((q) => {
    fields(q, ["id", "kind", "text", "sourceReferenceId", "conditions", "verificationStatus"], "qualification", errors);
    if (!object(q)) return;
    check(identifier(q.id) && !qualificationIds.has(q.id), "qualification id is missing or duplicated");
    qualificationIds.add(q.id);
    check(["scope", "statutory-qualification", "transition", "prior-certified-use"].includes(q.kind), "unsupported qualification kind");
    check(text(q.text), "qualification text is required");
    cite(q.sourceReferenceId);
    if (q.kind === "prior-certified-use") {
      check(action.type === "authorization-revocation" && event.useScope?.domain === "food",
        "prior-certified-use requires an explicit food revocation scope");
      check(q.verificationStatus === "verified", "prior-certified-use requires verified qualification evidence");
      check(Array.isArray(q.conditions) && q.conditions.length === 1
        && q.conditions[0] === "color-used-while-certificate-effective", "prior-certified-use requires the certificate condition");
      check(references.get(q.sourceReferenceId)?.role === "primary", "prior-certified-use must cite the primary legal act");
    } else {
      check(q.conditions === undefined && q.verificationStatus === undefined,
        "conditional-use fields require a supported qualification kind");
    }
  });
  check(list(event.qualifications).some((q) => q?.kind === "scope"), "an explicit scope qualification is required");
  if (date(dates.complianceOn)) {
    check(list(event.qualifications).some((q) => q?.kind === "transition"), "a dated compliance deadline requires a transition qualification");
  }

  const targets = new Set();
  check(Array.isArray(event.relationships), "relationships must be an explicit array");
  list(event.relationships).forEach((relation) => {
    fields(relation, ["type", "eventId", "sourceReferenceId"], "relationship", errors);
    if (!object(relation)) return;
    const allowed = action.type === "administrative-stay" ? ["stays"]
      : action.type === "stay-lifted" ? ["lifts-stay", "confirms"] : ["supersedes", "amends"];
    check(allowed.includes(relation.type), "unsupported relationship type for action");
    check(identifier(relation.eventId) && relation.eventId !== event.eventId, "invalid/self event relationship");
    check(!targets.has(relation.eventId), "duplicate/conflicting relationship target");
    targets.add(relation.eventId);
    cite(relation.sourceReferenceId);
    if (procedural) check(relation.sourceReferenceId === primary?.referenceId, "procedural relationships must cite the primary legal notice");
  });
  if (action.type === "administrative-stay") {
    check(event.relationships?.length === 1 && event.relationships[0]?.type === "stays", "administrative-stay requires exactly one stays relationship");
  }
  if (action.type === "stay-lifted") {
    check(event.relationships?.length === 2 && list(event.relationships).some((r) => r?.type === "lifts-stay")
      && list(event.relationships).some((r) => r?.type === "confirms"), "stay-lifted requires lifts-stay and confirms relationships");
  }
  return result(errors);
}

function validateLegalEventRegistry(data, sourceData) {
  if (!object(data) || data.schemaVersion !== 1 || !identifier(data.referenceVersion)
    || !date(data.snapshotDate) || !Array.isArray(data.events)) return result(["invalid legal-event manifest"]);
  const errors = [];
  fields(data, ["schemaVersion", "referenceVersion", "snapshotDate", "events"], "manifest", errors);
  const sourceValidation = validateSourceRegistry(sourceData, { asOf: data.snapshotDate });
  if (!sourceValidation.valid) return result(sourceValidation.errors.map((e) => `source registry: ${e}`));
  const events = new Map();
  const actions = new Set();
  list(data.events).forEach((event, index) => {
    const validation = validateLegalEvent(event, sourceData.sources, { asOf: data.snapshotDate });
    errors.push(...validation.errors.map((e) => `events[${index}]: ${e}`));
    if (!object(event)) return;
    if (events.has(event.eventId)) errors.push(`duplicate/conflicting eventId: ${event.eventId}`);
    events.set(event.eventId, event);
    const primary = list(event.sourceReferences).find((r) => r?.role === "primary");
    const identity = JSON.stringify([event.substance?.id, event.jurisdiction, event.action?.type,
      event.action?.target, primary?.sourceId, primary?.editionId]);
    if (actions.has(identity)) errors.push("duplicate/conflicting legal action under different event IDs");
    actions.add(identity);
  });
  const liftedStays = new Set();
  events.forEach((event) => list(event.relationships).forEach((relation) => {
    const target = events.get(relation?.eventId);
    if (!target) { errors.push("unresolved relationship target"); return; }
    if (target.jurisdiction !== event.jurisdiction || target.substance?.id !== event.substance?.id) {
      errors.push("relationship crosses jurisdiction or substance");
    }
    if (date(target.dates?.publishedOn) && date(event.dates?.publishedOn)
      && target.dates.publishedOn > event.dates.publishedOn) errors.push("relationship target published after its amendment/supersession");
    if (["stays", "lifts-stay", "confirms"].includes(relation?.type)) {
      const expectedType = relation.type === "lifts-stay" ? "administrative-stay" : "authorization-revocation";
      if (target.action?.type !== expectedType) errors.push("invalid procedural relationship target action");
      if (!event.useScope || !target.useScope || event.useScope.domain !== target.useScope.domain
        || event.useScope.provision !== target.useScope.provision || event.action?.target !== target.action?.target
        || event.authority !== target.authority || JSON.stringify(event.affectedUses) !== JSON.stringify(target.affectedUses)) {
        errors.push("procedural relationship must preserve authority and exact food-use scope");
      }
      if (relation.type === "stays" && date(event.dates?.effectiveOn) && date(target.dates?.publishedOn)
        && event.dates.effectiveOn < target.dates.publishedOn) errors.push("stay cannot begin before the original act was published");
      if (relation.type === "lifts-stay") {
        if (date(event.dates?.effectiveOn) && date(target.dates?.effectiveOn)
          && event.dates.effectiveOn < target.dates.effectiveOn) errors.push("stay lifting cannot precede the stay");
        if (liftedStays.has(target.eventId)) errors.push("conflicting stay-lifting records");
        liftedStays.add(target.eventId);
        const confirmed = list(event.relationships).find((r) => r?.type === "confirms");
        const stayed = list(target.relationships).find((r) => r?.type === "stays");
        if (!confirmed || !stayed || confirmed.eventId !== stayed.eventId) errors.push("confirmed action must be the action originally stayed");
      }
    }
  }));
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push("cyclic event relationships"); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    list(events.get(id)?.relationships).forEach((r) => { if (events.has(r?.eventId)) visit(r.eventId); });
    visiting.delete(id);
    visited.add(id);
  }
  events.forEach((_, id) => visit(id));
  return result(errors);
}

module.exports = { ACTION_TYPES, validateLegalEvent, validateLegalEventRegistry };
