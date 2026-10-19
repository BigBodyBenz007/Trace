const data = require("../data/regulatoryLegalEvents.json");
const { REGULATORY_SOURCE_REGISTRY } = require("./regulatorySourceRegistry");
const { validateLegalEventRegistry } = require("./regulatoryLegalEventValidation");

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function createLegalEventRegistry(input, sourceData = REGULATORY_SOURCE_REGISTRY.data) {
  const validation = validateLegalEventRegistry(input, sourceData);
  if (!validation.valid) throw new Error(`Invalid legal-event registry: ${validation.errors.join("; ")}`);
  const snapshot = freeze(JSON.parse(JSON.stringify(input)));
  const events = new Map(snapshot.events.map((event) => [event.eventId, event]));
  const empty = Object.freeze([]);
  return Object.freeze({
    data: snapshot,
    getEvent: (eventId) => typeof eventId === "string" ? events.get(eventId) || null : null,
    getEventsForSubstance: (substanceId, jurisdiction) => {
      if (typeof substanceId !== "string" || typeof jurisdiction !== "string") return empty;
      return Object.freeze(snapshot.events.filter((event) => event.substance.id === substanceId
        && event.jurisdiction === jurisdiction));
    },
  });
}

// This service is not part of product lookup, persistence or nutrition math.
const LEGAL_EVENT_REGISTRY = createLegalEventRegistry(data);
module.exports = { createLegalEventRegistry, LEGAL_EVENT_REGISTRY,
  getLegalEvent: LEGAL_EVENT_REGISTRY.getEvent,
  getLegalEventsForSubstance: LEGAL_EVENT_REGISTRY.getEventsForSubstance };
