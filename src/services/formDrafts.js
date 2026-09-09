export const FORM_DRAFTS_STORAGE_KEY = "formDrafts";
export const FORM_DRAFTS_SCHEMA_VERSION = 1;

function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validText(value, maximum = 240) {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= maximum;
}

function validTimestamp(value) {
  return typeof value === "string" && Boolean(value) && !Number.isNaN(Date.parse(value));
}

function cloneJsonValue(value, depth = 0) {
  if (depth > 40) throw new Error("An unfinished form draft is too deeply nested.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : cloneJsonValue(item, depth + 1));
  if (object(value)) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => {
      if (!validText(key, 240)) throw new Error("An unfinished form draft contains an invalid field name.");
      return [key, cloneJsonValue(item, depth + 1)];
    }));
  }
  throw new Error("An unfinished form draft contains unsupported data.");
}

function normalizeEntry(value) {
  if (!object(value) || !validText(value.domain, 80) || !validText(value.context, 240)) return null;
  if (value.sourceFingerprint !== null && typeof value.sourceFingerprint !== "string") return null;
  if (!validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt)) return null;
  try {
    return {
      domain: value.domain.trim(),
      context: value.context.trim(),
      sourceFingerprint: value.sourceFingerprint,
      initialValue: cloneJsonValue(value.initialValue),
      value: cloneJsonValue(value.value),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  } catch (error) {
    return null;
  }
}

export function emptyFormDraftCollection() {
  return { schemaVersion: FORM_DRAFTS_SCHEMA_VERSION, entries: [] };
}

export function normalizeFormDraftCollection(value) {
  if (!object(value) || value.schemaVersion !== FORM_DRAFTS_SCHEMA_VERSION || !Array.isArray(value.entries)) {
    return null;
  }
  const entries = value.entries.map(normalizeEntry);
  if (entries.some((entry) => !entry)) return null;
  const identities = entries.map(({ domain, context, sourceFingerprint }) => (
    `${domain}\u0000${context}\u0000${sourceFingerprint ?? ""}`
  ));
  if (new Set(identities).size !== identities.length) return null;
  return { schemaVersion: FORM_DRAFTS_SCHEMA_VERSION, entries };
}

function normalizeContext(value) {
  if (!object(value) || !validText(value.domain, 80) || !validText(value.context, 240)) {
    throw new Error("The unfinished form draft context is invalid.");
  }
  if (value.sourceFingerprint !== undefined && value.sourceFingerprint !== null && typeof value.sourceFingerprint !== "string") {
    throw new Error("The unfinished form draft source is invalid.");
  }
  return {
    domain: value.domain.trim(),
    context: value.context.trim(),
    sourceFingerprint: value.sourceFingerprint ?? null,
  };
}

function sameIdentity(entry, context) {
  return entry.domain === context.domain &&
    entry.context === context.context &&
    entry.sourceFingerprint === context.sourceFingerprint;
}

function readCollectionState(storage) {
  const raw = storage.getItem(FORM_DRAFTS_STORAGE_KEY);
  if (raw === null) return { status: "missing", collection: emptyFormDraftCollection() };
  try {
    const collection = normalizeFormDraftCollection(JSON.parse(raw));
    return collection
      ? { status: "valid", collection }
      : { status: "malformed", collection: null };
  } catch (error) {
    return { status: "malformed", collection: null };
  }
}

export function readFormDraftCollection(storage = localStorage) {
  const state = readCollectionState(storage);
  return state.status === "malformed" ? null : state.collection;
}

export function formDraftFingerprint(value) {
  return JSON.stringify(cloneJsonValue(value));
}

export function formDraftHasMeaningfulWork(entry) {
  const normalized = normalizeEntry(entry);
  if (!normalized) return false;
  return formDraftFingerprint(normalized.value) !== formDraftFingerprint(normalized.initialValue);
}

export function formDraftValueMatchesShape(value, template) {
  if (template === null) return value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || object(value);
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return false;
    if (!template.length) return true;
    return value.every((item) => template.some((sample) => formDraftValueMatchesShape(item, sample)));
  }
  if (object(template)) {
    if (!object(value)) return false;
    return Object.keys(template).filter((key) => template[key] !== undefined).every((key) => (
      Object.prototype.hasOwnProperty.call(value, key) && formDraftValueMatchesShape(value[key], template[key])
    ));
  }
  if (typeof template === "number") {
    return (typeof value === "number" && Number.isFinite(value)) || typeof value === "string";
  }
  return typeof value === typeof template;
}

function stringOrFiniteNumber(value) {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function nullableObject(value) {
  return value === null || object(value);
}

function validReferenceShape(value) {
  return value === undefined || value === null || object(value);
}

function validTargetSetShape(target) {
  return object(target)
    && typeof target.id === "string"
    && (target.setType === undefined || typeof target.setType === "string")
    && (target.reps === undefined || stringOrFiniteNumber(target.reps))
    && (target.notes === undefined || typeof target.notes === "string")
    && (target.load === undefined || target.load === null || (
      object(target.load)
      && typeof target.load.mode === "string"
      && (target.load.amount === undefined || stringOrFiniteNumber(target.load.amount))
      && (target.load.unit === undefined || typeof target.load.unit === "string")
    ));
}

function validPlannedExerciseShape(exercise) {
  return object(exercise)
    && typeof exercise.id === "string"
    && typeof exercise.name === "string"
    && (exercise.notes === undefined || typeof exercise.notes === "string")
    && (exercise.exerciseId === undefined || exercise.exerciseId === null || typeof exercise.exerciseId === "string")
    && validReferenceShape(exercise.exerciseReference)
    && Array.isArray(exercise.targetSets)
    && exercise.targetSets.every(validTargetSetShape);
}

function validProtocolItemShape(item) {
  return object(item)
    && typeof item.id === "string"
    && object(item.compound)
    && typeof item.compound.name === "string"
    && validReferenceShape(item.compound.reference)
    && object(item.dose)
    && stringOrFiniteNumber(item.dose.amount)
    && typeof item.dose.unit === "string"
    && (item.dose.customUnit === undefined || typeof item.dose.customUnit === "string")
    && object(item.route)
    && typeof item.route.code === "string"
    && (item.route.customLabel === undefined || typeof item.route.customLabel === "string")
    && object(item.schedule)
    && typeof item.schedule.type === "string"
    && Array.isArray(item.schedule.weekdays)
    && item.schedule.weekdays.every((day) => Number.isInteger(day))
    && typeof item.notes === "string";
}

function validInjectionLocationShape(value) {
  return object(value)
    && typeof value.view === "string"
    && Number.isFinite(value.x)
    && Number.isFinite(value.y)
    && typeof value.siteLabel === "string";
}

function validInjectionEditorShape(value) {
  return object(value)
    && typeof value.source === "string"
    && typeof value.itemId === "string"
    && typeof value.substanceName === "string"
    && stringOrFiniteNumber(value.amount)
    && typeof value.unit === "string"
    && typeof value.notes === "string";
}

function validQueuedInjectionShape(value) {
  return object(value)
    && validInjectionLocationShape(value)
    && typeof value.substanceName === "string"
    && (value.protocolId === null || typeof value.protocolId === "string")
    && (value.protocolName === null || typeof value.protocolName === "string")
    && (value.protocolItemId === null || typeof value.protocolItemId === "string")
    && stringOrFiniteNumber(value.amount)
    && typeof value.unit === "string"
    && typeof value.notes === "string";
}

function validKnownDomainShape(domain, value) {
  if (!object(value)) return false;
  if (domain === "protocol") {
    return value.items === undefined || (Array.isArray(value.items) && value.items.every(validProtocolItemShape));
  }
  if (domain === "planned-workout" || domain === "workout-template") {
    return value.exercises === undefined || (Array.isArray(value.exercises) && value.exercises.every(validPlannedExerciseShape));
  }
  if (domain === "medication-dose-schedule") {
    return value.weekdays === undefined || (Array.isArray(value.weekdays) && value.weekdays.every((day) => Number.isInteger(day)));
  }
  if (domain === "injection-session" || domain === "injection-shot") {
    return (value.pending === undefined || value.pending === null || validInjectionLocationShape(value.pending))
      && (value.queuedShots === undefined || (Array.isArray(value.queuedShots) && value.queuedShots.every(validQueuedInjectionShape)))
      && (value.shotDraft === undefined || value.shotDraft === null || validInjectionEditorShape(value.shotDraft));
  }
  if (domain === "nutrition-entry") {
    return (value.foodReference === undefined || nullableObject(value.foodReference))
      && (value.portionBasis === undefined || nullableObject(value.portionBasis))
      && (value.nutritionBasis === undefined || nullableObject(value.nutritionBasis))
      && (value.unknownNutritionKeys === undefined || (
        Array.isArray(value.unknownNutritionKeys)
        && value.unknownNutritionKeys.every((key) => typeof key === "string")
      ))
      && (value.restaurantServingOptions === undefined || (
        Array.isArray(value.restaurantServingOptions)
        && value.restaurantServingOptions.every((option) => (
        object(option)
        && typeof option.id === "string"
        && object(option.serving)
        && typeof option.serving.description === "string"
        ))
      ));
  }
  if (domain === "daily-action") {
    return value.recurrence === undefined || nullableObject(value.recurrence);
  }
  if (domain === "medication-entry") {
    return value.compoundReference === undefined || nullableObject(value.compoundReference);
  }
  return true;
}

function formDraftValueMatchesDomainShape(domain, value, template) {
  if (domain === "workout-template" && object(template) && Array.isArray(template.exercises)) {
    return formDraftValueMatchesShape(value, { ...template, exercises: [] });
  }
  return formDraftValueMatchesShape(value, template);
}

export function readFormDraft(storage = localStorage, requestedContext, expectedShape) {
  let context;
  try {
    context = normalizeContext(requestedContext);
  } catch (error) {
    return { status: "invalid-context", entry: null, value: null };
  }
  const state = readCollectionState(storage);
  if (state.status === "malformed") return { status: "malformed", entry: null, value: null };
  const entry = state.collection.entries.find((candidate) => sameIdentity(candidate, context));
  const conflictingEntry = state.collection.entries.find((candidate) => (
    candidate.domain === context.domain && candidate.context === context.context
  ));
  if (!entry && conflictingEntry) return { status: "conflict", entry: conflictingEntry, value: null };
  if (!entry) return { status: "missing", entry: null, value: null };
  if (expectedShape !== undefined && (
    !formDraftValueMatchesDomainShape(context.domain, entry.initialValue, expectedShape) ||
    !formDraftValueMatchesDomainShape(context.domain, entry.value, expectedShape)
  )) {
    return { status: "invalid-value", entry, value: null };
  }
  if (!validKnownDomainShape(context.domain, entry.initialValue)
    || !validKnownDomainShape(context.domain, entry.value)) {
    return { status: "invalid-value", entry, value: null };
  }
  return { status: "restored", entry, value: cloneJsonValue(entry.value) };
}

export function writeFormDraft(storage = localStorage, requestedContext, initialValue, value, now = new Date()) {
  const context = normalizeContext(requestedContext);
  const safeInitialValue = cloneJsonValue(initialValue);
  const safeValue = cloneJsonValue(value);
  const state = readCollectionState(storage);
  if (state.status === "malformed") {
    throw new Error("Trace could not safely update the stored unfinished form drafts because they are malformed.");
  }
  const existing = state.collection.entries.find((entry) => sameIdentity(entry, context));
  if (existing && (
    !formDraftValueMatchesDomainShape(context.domain, existing.initialValue, safeInitialValue)
    || !formDraftValueMatchesDomainShape(context.domain, existing.value, safeInitialValue)
    || !validKnownDomainShape(context.domain, existing.initialValue)
    || !validKnownDomainShape(context.domain, existing.value)
  )) {
    throw new Error("Trace could not safely replace the stored unfinished form draft because its value is malformed.");
  }
  const remaining = state.collection.entries.filter((entry) => !sameIdentity(entry, context));
  if (formDraftFingerprint(safeValue) === formDraftFingerprint(safeInitialValue)) {
    if (existing) storage.setItem(FORM_DRAFTS_STORAGE_KEY, JSON.stringify({
      schemaVersion: FORM_DRAFTS_SCHEMA_VERSION,
      entries: remaining,
    }));
    return null;
  }
  const timestamp = now.toISOString();
  const entry = {
    ...context,
    initialValue: safeInitialValue,
    value: safeValue,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  storage.setItem(FORM_DRAFTS_STORAGE_KEY, JSON.stringify({
    schemaVersion: FORM_DRAFTS_SCHEMA_VERSION,
    entries: [...remaining, entry],
  }));
  return entry;
}

export function clearFormDraft(storage = localStorage, requestedContext) {
  const context = normalizeContext(requestedContext);
  const state = readCollectionState(storage);
  if (state.status === "malformed") {
    throw new Error("Trace could not safely clear the stored unfinished form draft because the draft collection is malformed.");
  }
  const entries = state.collection.entries.filter((entry) => !sameIdentity(entry, context));
  if (entries.length === state.collection.entries.length) return false;
  storage.setItem(FORM_DRAFTS_STORAGE_KEY, JSON.stringify({
    schemaVersion: FORM_DRAFTS_SCHEMA_VERSION,
    entries,
  }));
  return true;
}

export function clearFormDraftsForContext(storage = localStorage, domain, context) {
  const normalizedDomain = String(domain || "").trim();
  const normalizedContext = String(context || "").trim();
  if (!validText(normalizedDomain, 80) || !validText(normalizedContext, 240)) {
    throw new Error("The unfinished form draft cleanup context is invalid.");
  }
  const state = readCollectionState(storage);
  if (state.status === "malformed") {
    throw new Error("Trace could not safely clear the stored unfinished form drafts because the draft collection is malformed.");
  }
  const entries = state.collection.entries.filter((entry) => !(
    entry.domain === normalizedDomain && entry.context === normalizedContext
  ));
  if (entries.length === state.collection.entries.length) return false;
  storage.setItem(FORM_DRAFTS_STORAGE_KEY, JSON.stringify({
    schemaVersion: FORM_DRAFTS_SCHEMA_VERSION,
    entries,
  }));
  return true;
}

export function clearFormDraftsForContextPrefix(storage = localStorage, domain, contextPrefix) {
  const normalizedDomain = String(domain || "").trim();
  const normalizedPrefix = String(contextPrefix || "").trim();
  if (!validText(normalizedDomain, 80) || !validText(normalizedPrefix, 240)) {
    throw new Error("The unfinished form draft cleanup context is invalid.");
  }
  const state = readCollectionState(storage);
  if (state.status === "malformed") {
    throw new Error("Trace could not safely clear the stored unfinished form drafts because the draft collection is malformed.");
  }
  const entries = state.collection.entries.filter((entry) => !(
    entry.domain === normalizedDomain && entry.context.startsWith(normalizedPrefix)
  ));
  if (entries.length === state.collection.entries.length) return false;
  storage.setItem(FORM_DRAFTS_STORAGE_KEY, JSON.stringify({
    schemaVersion: FORM_DRAFTS_SCHEMA_VERSION,
    entries,
  }));
  return true;
}
