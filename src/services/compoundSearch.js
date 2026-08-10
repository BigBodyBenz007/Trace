import { normalizeCompoundName } from "./compoundCatalog";

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
