import { normalizeCompoundName } from "./compoundCatalog";
import starterCompounds from "../data/starterCompounds";

export const DEFAULT_COMPOUND_RESULT_LIMIT = 6;

export function searchCompounds(
  query,
  compounds = [],
  limit = DEFAULT_COMPOUND_RESULT_LIMIT
) {
  const normalizedQuery = normalizeCompoundName(query);
  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) return [];

  return compounds
    .filter((compound) =>
      normalizeCompoundName(compound.name).includes(normalizedQuery)
    )
    .sort((firstCompound, secondCompound) => {
      const firstName = normalizeCompoundName(firstCompound.name);
      const secondName = normalizeCompoundName(secondCompound.name);
      const firstStartsWith = firstName.startsWith(normalizedQuery);
      const secondStartsWith = secondName.startsWith(normalizedQuery);

      if (firstStartsWith !== secondStartsWith) return firstStartsWith ? -1 : 1;
      return firstName.localeCompare(secondName);
    })
    .slice(0, Math.max(0, limit));
}

function getMatch(query, compound, includeAliases) {
  const canonicalName = normalizeCompoundName(compound.name);
  const aliases = includeAliases
    ? (compound.aliases || []).map((alias) => ({
        alias,
        normalized: normalizeCompoundName(alias),
      }))
    : [];

  if (canonicalName === query) return { rank: 0, matchedAlias: null };
  const exactAlias = aliases.find(({ normalized }) => normalized === query);
  if (exactAlias) return { rank: 1, matchedAlias: exactAlias.alias };
  if (canonicalName.startsWith(query)) return { rank: 2, matchedAlias: null };
  const prefixAlias = aliases.find(({ normalized }) => normalized.startsWith(query));
  if (prefixAlias) return { rank: 3, matchedAlias: prefixAlias.alias };
  if (canonicalName.includes(query)) return { rank: 4, matchedAlias: null };
  const substringAlias = aliases.find(({ normalized }) => normalized.includes(query));
  if (substringAlias) return { rank: 5, matchedAlias: substringAlias.alias };
  return null;
}

function compareUnifiedCompoundResults(first, second) {
  if (first.rank !== second.rank) return first.rank - second.rank;
  const nameComparison = first.compound.name.localeCompare(second.compound.name);
  if (nameComparison !== 0) return nameComparison;
  return String(first.compound.id).localeCompare(String(second.compound.id));
}

export function searchUnifiedCompounds(
  query,
  savedCompounds = [],
  builtInCompounds = starterCompounds,
  limitPerSource = DEFAULT_COMPOUND_RESULT_LIMIT
) {
  const normalizedQuery = normalizeCompoundName(query);
  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) return [];

  const sourceLimit = Math.max(0, limitPerSource);
  const savedResults = savedCompounds
    .map((compound) => ({
      source: "saved",
      compound,
      ...getMatch(normalizedQuery, compound, false),
    }))
    .filter(({ rank }) => rank !== undefined)
    .sort(compareUnifiedCompoundResults)
    .slice(0, sourceLimit);
  const builtInResults = builtInCompounds
    .map((compound) => ({
      source: "trace-catalog",
      compound,
      ...getMatch(normalizedQuery, compound, true),
    }))
    .filter(({ rank }) => rank !== undefined)
    .sort(compareUnifiedCompoundResults)
    .slice(0, sourceLimit);

  return [...savedResults, ...builtInResults];
}
