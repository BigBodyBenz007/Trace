# Food search ordering and pagination

Search first matches every query token against the existing names, aliases,
brands, chains and categories. It retains the existing relevance and source
priorities, including saved foods and packaged beverages. Before applying a
caller's limit, it uses `src/data/foodSearchFamilies.js` to place reviewed basics
before specialty members of the same family.

Families list existing record IDs, explicit defaults, food terms, and optional
chain/brand qualifiers. A query must contain a complete family term, and every
query word must belong to that term or its qualifiers. Additional words disable
that preference, so raw/cooked, allergens, decaf, diet/zero, flavors, sizes and
unrecognized attributes keep their existing relevance. A narrow family can
require an attribute: `vanilla frosty` only reorders vanilla records, with plain
Vanilla Frosty before vanilla mix-ins. It never brings Chocolate Frosty into a
vanilla search.

Ordering only refills that family's existing result positions within the same
source type. Saved records and unrelated results keep their positions. Defaults
retain their previous relative order, as do specialties; the previous stable
name ordering resolves remaining ties. Food objects, serving options, nutrient
values, unknowns, provenance and saved data are not changed.

Reviewed examples include IHOP pancakes, Wendy's Frosty, Braum's and Sonic
limeade, Pepsi and Mountain Dew, Original Cheerios, and plain Quaker instant
oatmeal. Both IHOP full and short original stacks are basics; this does not
invent a new portion. No default is inferred from words such as `original`,
`plain` or `classic`. Families with ambiguous choices are left alone, including
USDA raw/cooked ingredients, yogurt fat levels, Chex grains and Gatorade flavors.

To extend this behavior, add or update metadata with reviewed existing IDs and
the terms that describe their shared family. Include specialty members in
`memberIds` and basics in `defaultIds`, and verify the catalog regression check
for missing IDs. Use a narrower term when a requested flavor/preparation defines
its own family. Do not add query-specific conditionals to the ranking service or
allow flavor/allergen words as optional qualifiers merely to trigger ordering.

The search service retains its explicit result-limit API and default limit of
six for other callers. The FoodSearch component requests the complete matching
set with `Infinity`, then reveals ten at a time through Show more. Catalog
deduplication and family ordering happen before UI pagination. Pagination resets
when the query or meaningful result data changes, while ordinary selection and
unrelated renders preserve the revealed count.

The reported IHOP records were already present: full/short stacks originally
ranked seventh/eighth among ten matches. Wendy's Chocolate Frosty originally
ranked eighth among fifteen. FoodSearch called the service with its default
six-result limit, so later matches never reached the UI. The catalog already
ranked its full matching set before deduplication and that final service limit.
Neither missing nutrition records nor missing IHOP aliases caused the issue.
