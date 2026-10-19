const data = require("../data/regulatorySourceRegistry");
const { validateSourceRegistry } = require("./regulatorySourceValidation");

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function createRegulatorySourceRegistry(input, options) {
  const validation = validateSourceRegistry(input, options);
  if (!validation.valid) throw new Error(`Invalid regulatory source registry: ${validation.errors.join("; ")}`);
  // Own an immutable snapshot: callers cannot change validated data afterwards.
  const snapshot = freeze(JSON.parse(JSON.stringify(input)));
  const sources = new Map(snapshot.sources.map((source) => [JSON.stringify([source.sourceId, source.editionId]), source]));
  const bindings = new Map(snapshot.referenceBindings.map((binding) => [JSON.stringify([binding.sourceId, binding.referenceVersion]), binding]));
  function getSource(reference) {
    if (typeof reference?.sourceId !== "string" || typeof reference?.editionId !== "string") return null;
    return sources.get(JSON.stringify([reference.sourceId, reference.editionId])) || null;
  }
  function getReferenceSource(reference) {
    if (typeof reference?.sourceId !== "string" || typeof reference?.referenceVersion !== "string") return null;
    const binding = bindings.get(JSON.stringify([reference.sourceId, reference.referenceVersion]));
    if (!binding) return null;
    const source = getSource(binding);
    // These fields exist on saved name references. Never endorse conflicting provenance.
    if ((reference.sourcePublicationDate !== undefined && reference.sourcePublicationDate !== source.citation.publicationDate)
      || (reference.jurisdiction !== undefined && reference.jurisdiction !== source.citation.jurisdiction)
      || (reference.language !== undefined && reference.language !== source.citation.language)) return null;
    return source.citation;
  }
  return Object.freeze({ data: snapshot, getSource, getReferenceSource });
}

const REGULATORY_SOURCE_REGISTRY = createRegulatorySourceRegistry(data);
module.exports = {
  createRegulatorySourceRegistry,
  REGULATORY_SOURCE_REGISTRY,
  getRegulatorySource: REGULATORY_SOURCE_REGISTRY.getSource,
  getReferenceSource: REGULATORY_SOURCE_REGISTRY.getReferenceSource,
};
