export const BRANDED_PACKAGED_CEREAL_OATMEAL_CATALOG_VERSION = 1;
export const CEREAL_OATMEAL_PHASE_1B_BATCH = "cereal-oatmeal-phase-1b";
export const CEREAL_OATMEAL_PHASE_1B_ACCESSED_AT = "2026-09-03";

const source = (sourceType, sourceUrl, sourceReference, extra = {}) => ({
  sourceType,
  sourceUrl,
  sourceReference,
  accessedAt: CEREAL_OATMEAL_PHASE_1B_ACCESSED_AT,
  ...extra,
});

const official = (sourceUrl, sourceReference, secondarySources = []) => ({
  source: "official-manufacturer",
  sourceId: sourceReference,
  confidence: secondarySources.length ? "manufacturer-and-secondary-match" : "official-source",
  label: "Manufacturer",
  catalogVersion: BRANDED_PACKAGED_CEREAL_OATMEAL_CATALOG_VERSION,
  catalogBatch: CEREAL_OATMEAL_PHASE_1B_BATCH,
  verification: {
    status: "complete",
    sourceType: "official-manufacturer",
    sourceUrl,
    sourceReference,
    accessedAt: CEREAL_OATMEAL_PHASE_1B_ACCESSED_AT,
    secondarySources,
  },
});

const retailer = (sourceUrl, sourceReference, identifierSourceValue, identifierNormalization) => source(
  "trusted-retailer",
  sourceUrl,
  sourceReference,
  { identifierSourceValue, identifierNormalization }
);

const food = ({
  slug, brand, name, category, aliases, description, grams, packageSize,
  servingsPerContainer, nutrients, gtin, provenance,
}) => ({
  id: `packaged-food:${slug}`,
  brand,
  name,
  category,
  searchAliases: aliases,
  serving: { amount: 1, unit: "serving", description, grams },
  nutrients,
  packaged: { packageSize, servingsPerContainer },
  identifiers: [{ scheme: "gtin", value: gtin }],
  provenance,
});

const generalMills = (brandPath, productPath, reference, gtin, secondarySources = []) => official(
  `https://www.${brandPath}.com/products/${productPath}`,
  reference,
  [
    source("manufacturer-smartlabel", `https://smartlabel.generalmills.com/${gtin.replace(/^0+/, "")}`, `${reference} SmartLabel`),
    ...secondarySources,
  ]
);

const wkKellogg = (gtin, reference) => official(
  `https://smartlabel.wkkellogg.com/Product/Index?gtin=${gtin}`,
  `${reference} SmartLabel`
);

const postSpec = (packageUpcBody, reference) => source(
  "manufacturer-specification",
  "https://www.postconsumerbrands.com/wp-content/uploads/2025/09/Post-Foodservice-Item-Specifications-May-2025.pdf",
  reference,
  {
    identifierSourceValue: packageUpcBody,
    identifierNormalization: "Removed display hyphens, restored the UPC-A GS1 check digit, and padded to GTIN-14.",
  }
);

const post = (brandPath, productPath, reference, packageUpcBody) => official(
  `https://www.postconsumerbrands.com/brands/${brandPath}/products/${productPath}/`,
  reference,
  [postSpec(packageUpcBody, `${reference} package UPC and item specification`)]
);

const quaker = (productPath, reference, secondarySources = []) => official(
  `https://www.quakeroats.com/products/hot-cereals/${productPath}`,
  reference,
  secondarySources
);

const krogerPaddedIdentifier = (slug, value, reference) => retailer(
  `https://www.kroger.com/p/${slug}/${value}`,
  reference,
  value,
  "Removed Kroger's two retailer-padding zeros and restored the UPC-A GS1 check digit."
);

const target = (id, reference, upc) => retailer(
  `https://www.target.com/p/-/A-${id}`,
  reference,
  upc,
  "Padded the published UPC-A value with two leading zeros to store its equivalent GTIN-14."
);

const foods = [
  // General Mills — ready-to-eat cereal (10)
  food({
    slug: "cheerios-original-8-9oz", brand: "Cheerios", name: "Original Cheerios", category: "cereal",
    aliases: ["plain Cheerios", "General Mills Cheerios", "whole grain oat cereal"], description: "1 1/2 cups", grams: 39, packageSize: "8.9 oz box", servingsPerContainer: 6,
    nutrients: { calories: 140, protein: 5, carbohydrates: 29, fat: 2.5, fiber: 4, sodium: 190, totalSugar: 2, addedSugar: 1 }, gtin: "00016000275263",
    provenance: generalMills("cheerios", "original-cheerios", "Original Cheerios 8.9 oz", "00016000275263"),
  }),
  food({
    slug: "cheerios-honey-nut-10-8oz", brand: "Cheerios", name: "Honey Nut Cheerios", category: "cereal",
    aliases: ["General Mills Honey Nut", "honey cereal", "sweetened oat cereal"], description: "1 cup", grams: 37, packageSize: "10.8 oz box", servingsPerContainer: null,
    nutrients: { calories: 140, protein: 3, carbohydrates: 30, fat: 2, fiber: 3, sodium: 210, totalSugar: 12, addedSugar: 12 }, gtin: "00016000124790",
    provenance: generalMills("cheerios", "honey-nut-cheerios", "Honey Nut Cheerios 10.8 oz", "00016000124790", [krogerPaddedIdentifier("honey-nut-cheerios-cereal", "0001600012479", "Exact 10.8 oz package and identifier")]),
  }),
  food({
    slug: "cheerios-apple-cinnamon-19oz", brand: "Cheerios", name: "Apple Cinnamon Cheerios", category: "cereal",
    aliases: ["General Mills apple cereal", "apple cinnamon oat cereal", "flavored Cheerios"], description: "1 cup", grams: 37, packageSize: "19 oz box", servingsPerContainer: 14,
    nutrients: { calories: 140, protein: 3, carbohydrates: 30, fat: 2, fiber: 3, sodium: 150, totalSugar: 12, addedSugar: 12 }, gtin: "00016000169159",
    provenance: generalMills("cheerios", "apple-cinnamon-cheerios", "Apple Cinnamon Cheerios 19 oz", "00016000169159"),
  }),
  food({
    slug: "cheerios-protein-cinnamon-11-2oz", brand: "Cheerios", name: "Protein Cinnamon Cheerios", category: "cereal",
    aliases: ["General Mills protein cereal", "high protein Cheerios", "cinnamon protein cereal"], description: "1 cup", grams: 37, packageSize: "11.2 oz box", servingsPerContainer: 8,
    nutrients: { calories: 150, protein: 8, carbohydrates: 24, fat: 2.5, fiber: 2, sodium: 210, totalSugar: 12, addedSugar: 12 }, gtin: "00016000226364",
    provenance: generalMills("cheerios", "cinnamon-cheerios-protein", "Protein Cinnamon Cheerios 11.2 oz", "00016000226364"),
  }),
  food({
    slug: "cinnamon-toast-crunch-original-12oz", brand: "Cinnamon Toast Crunch", name: "Original Cinnamon Toast Crunch", category: "cereal",
    aliases: ["CTC cereal", "General Mills cinnamon cereal", "cinnamon squares"], description: "1 cup", grams: 41, packageSize: "12 oz box", servingsPerContainer: 8,
    nutrients: { calories: 170, protein: 2, carbohydrates: 33, fat: 4, fiber: 3, sodium: 230, totalSugar: 12, addedSugar: 12 }, gtin: "00016000122543",
    provenance: generalMills("cinnamontoastcrunch", "cinnamon-toast-crunch", "Cinnamon Toast Crunch 12 oz", "00016000122543"),
  }),
  food({
    slug: "reeses-puffs-16-7oz", brand: "Reese's Puffs", name: "Reese's Puffs Cereal", category: "cereal",
    aliases: ["Reeses cereal", "General Mills peanut butter cereal", "chocolate peanut butter cereal"], description: "1 cup", grams: 39, packageSize: "16.7 oz box", servingsPerContainer: null,
    nutrients: { calories: 160, protein: 3, carbohydrates: 30, fat: 4.5, fiber: 2, sodium: 220, totalSugar: 12, addedSugar: 12 }, gtin: "00016000121850",
    provenance: generalMills("reesespuffs", "reeses-puffs-cereal", "Reese's Puffs 16.7 oz", "00016000121850"),
  }),
  food({
    slug: "chex-rice-12oz", brand: "Chex", name: "Rice Chex", category: "cereal",
    aliases: ["General Mills rice cereal", "gluten free Chex", "plain rice cereal"], description: "1 1/3 cups", grams: 40, packageSize: "12 oz box", servingsPerContainer: 8,
    nutrients: { calories: 160, protein: 3, carbohydrates: 35, fat: 1, fiber: 2, sodium: 330, totalSugar: 3, addedSugar: 3 }, gtin: "00016000487949",
    provenance: generalMills("chex", "rice-chex", "Rice Chex 12 oz", "00016000487949"),
  }),
  food({
    slug: "chex-corn-12oz", brand: "Chex", name: "Corn Chex", category: "cereal",
    aliases: ["General Mills corn cereal", "gluten free Chex", "plain corn cereal"], description: "1 1/4 cups", grams: 39, packageSize: "12 oz box", servingsPerContainer: 8,
    nutrients: { calories: 150, protein: 3, carbohydrates: 33, fat: 1, fiber: 2, sodium: 280, totalSugar: 4, addedSugar: 4 }, gtin: "00016000487963",
    provenance: generalMills("chex", "corn-chex", "Corn Chex 12 oz", "00016000487963"),
  }),
  food({
    slug: "chex-wheat-14oz", brand: "Chex", name: "Wheat Chex", category: "cereal",
    aliases: ["General Mills wheat cereal", "whole grain Chex", "high fiber wheat cereal"], description: "1 cup", grams: 59, packageSize: "14 oz box", servingsPerContainer: 6,
    nutrients: { calories: 210, protein: 6, carbohydrates: 51, fat: 1, fiber: 8, sodium: 340, totalSugar: 6, addedSugar: 6 }, gtin: "00016000275492",
    provenance: generalMills("chex", "wheat-chex", "Wheat Chex 14 oz", "00016000275492"),
  }),
  food({
    slug: "fiber-one-original-bran-19-6oz", brand: "Fiber One", name: "Original Bran Cereal", category: "cereal",
    aliases: ["General Mills bran cereal", "high fiber cereal", "Fiber One original"], description: "2/3 cup", grams: 40, packageSize: "19.6 oz box", servingsPerContainer: 14,
    nutrients: { calories: 90, protein: 3, carbohydrates: 33, fat: 1, fiber: 18, sodium: 140, totalSugar: null, addedSugar: 0 }, gtin: "00016000157620",
    provenance: generalMills("fiberone", "cereal-original-bran", "Fiber One Original Bran 19.6 oz", "00016000157620", [krogerPaddedIdentifier("fiber-one-original-bran-cereal", "0001600015762", "Exact 19.6 oz package and identifier")]),
  }),

  // WK Kellogg — ready-to-eat cereal (8)
  food({
    slug: "kelloggs-corn-flakes-18oz", brand: "Kellogg's", name: "Corn Flakes", category: "cereal",
    aliases: ["Kelloggs Corn Flakes", "plain corn cereal", "classic cereal"], description: "1 1/2 cups", grams: 42, packageSize: "18 oz box", servingsPerContainer: null,
    nutrients: { calories: 150, protein: 3, carbohydrates: 36, fat: 0, fiber: 1, sodium: 300, totalSugar: 4, addedSugar: 4 }, gtin: "00038000001208",
    provenance: wkKellogg("00038000001208", "Kellogg's Corn Flakes 18 oz"),
  }),
  food({
    slug: "kelloggs-rice-krispies-18oz", brand: "Kellogg's", name: "Rice Krispies", category: "cereal",
    aliases: ["Kelloggs Rice Krispies", "plain rice cereal", "crisped rice cereal"], description: "1 1/2 cups", grams: 40, packageSize: "18 oz box", servingsPerContainer: null,
    nutrients: { calories: 150, protein: 3, carbohydrates: 36, fat: 0, fiber: 0, sodium: 200, totalSugar: 4, addedSugar: 4 }, gtin: "00038000200038",
    provenance: wkKellogg("00038000200038", "Kellogg's Rice Krispies 18 oz"),
  }),
  food({
    slug: "kelloggs-frosted-flakes-13-5oz", brand: "Kellogg's", name: "Frosted Flakes", category: "cereal",
    aliases: ["Kelloggs Frosted Flakes", "frosted corn cereal", "sweet corn flakes"], description: "1 cup", grams: 37, packageSize: "13.5 oz box", servingsPerContainer: null,
    nutrients: { calories: 130, protein: 2, carbohydrates: 33, fat: 0, fiber: 1, sodium: 190, totalSugar: 12, addedSugar: 12 }, gtin: "00038000199042",
    provenance: wkKellogg("00038000199042", "Kellogg's Frosted Flakes 13.5 oz"),
  }),
  food({
    slug: "kelloggs-froot-loops-19-4oz", brand: "Kellogg's", name: "Froot Loops", category: "cereal",
    aliases: ["Kelloggs fruit loops", "fruity cereal", "sweetened multigrain cereal"], description: "1 1/3 cups", grams: 39, packageSize: "19.4 oz box", servingsPerContainer: 6,
    nutrients: { calories: 150, protein: 2, carbohydrates: 34, fat: 1.5, fiber: 3, sodium: 210, totalSugar: 12, addedSugar: 12 }, gtin: "00038000181719",
    provenance: wkKellogg("00038000181719", "Kellogg's Froot Loops 19.4 oz"),
  }),
  food({
    slug: "special-k-original-18oz", brand: "Special K", name: "Original Cereal", category: "cereal",
    aliases: ["Kelloggs Special K", "Special K plain", "high protein rice wheat cereal"], description: "1 1/4 cups", grams: 39, packageSize: "18 oz box", servingsPerContainer: 7,
    nutrients: { calories: 150, protein: 7, carbohydrates: 29, fat: 0.5, fiber: null, sodium: 270, totalSugar: 5, addedSugar: 4 }, gtin: "00038000016219",
    provenance: wkKellogg("00038000016219", "Special K Original 18 oz"),
  }),
  food({
    slug: "frosted-mini-wheats-bite-size-18oz", brand: "Frosted Mini-Wheats", name: "Bite Size Original", category: "cereal",
    aliases: ["Kelloggs Mini Wheats", "frosted shredded wheat", "high fiber cereal"], description: "25 biscuits", grams: 60, packageSize: "18 oz box", servingsPerContainer: null,
    nutrients: { calories: 210, protein: 5, carbohydrates: 51, fat: 1.5, fiber: 6, sodium: 10, totalSugar: 12, addedSugar: 12 }, gtin: "00038000199349",
    provenance: wkKellogg("00038000199349", "Frosted Mini-Wheats Bite Size 18 oz"),
  }),
  food({
    slug: "kelloggs-complete-bran-15-6oz", brand: "Kellogg's", name: "Complete Bran Wheat Flakes", category: "cereal",
    aliases: ["Kelloggs bran flakes", "Complete cereal", "high fiber bran cereal"], description: "1 cup", grams: 37, packageSize: "15.6 oz box", servingsPerContainer: 12,
    nutrients: { calories: 120, protein: 4, carbohydrates: 30, fat: 1, fiber: 6, sodium: 260, totalSugar: 7, addedSugar: 6 }, gtin: "00038000293788",
    provenance: wkKellogg("00038000293788", "Kellogg's Complete Bran 15.6 oz"),
  }),
  food({
    slug: "kelloggs-raisin-bran-crunch-24-5oz", brand: "Kellogg's", name: "Raisin Bran Crunch", category: "cereal",
    aliases: ["Kelloggs raisin cereal", "raisin bran", "bran flakes with raisins"], description: "1 cup", grams: 55, packageSize: "24.5 oz box", servingsPerContainer: 12,
    nutrients: { calories: 190, protein: 4, carbohydrates: 46, fat: 1, fiber: 4, sodium: 200, totalSugar: 19, addedSugar: 13 }, gtin: "00041192103360",
    provenance: wkKellogg("00041192103360", "Kellogg's Raisin Bran Crunch 24.5 oz"),
  }),

  // Post Consumer Brands — ready-to-eat cereal (10)
  food({
    slug: "honey-bunches-oats-honey-roasted-12oz", brand: "Honey Bunches of Oats", name: "Honey Roasted", category: "cereal",
    aliases: ["Post Honey Bunches", "honey oat clusters", "honey cereal"], description: "1 cup", grams: 41, packageSize: "12 oz box", servingsPerContainer: null,
    nutrients: { calories: 160, protein: 3, carbohydrates: 34, fat: 2, fiber: 2, sodium: 190, totalSugar: 9, addedSugar: 8 }, gtin: "00884912359155",
    provenance: post("honey-bunches-of-oats", "honey-bunches-of-oats-honey-roasted-cereal", "Honey Bunches of Oats Honey Roasted 12 oz", "8-84912-35915"),
  }),
  food({
    slug: "honey-bunches-oats-almonds-12oz", brand: "Honey Bunches of Oats", name: "With Almonds", category: "cereal",
    aliases: ["Post Honey Bunches almonds", "almond oat clusters", "almond cereal"], description: "1 cup", grams: 42, packageSize: "12 oz box", servingsPerContainer: null,
    nutrients: { calories: 170, protein: 3, carbohydrates: 33, fat: 3, fiber: 2, sodium: 180, totalSugar: 9, addedSugar: 8 }, gtin: "00884912359162",
    provenance: post("honey-bunches-of-oats", "honey-bunches-of-oats-with-almonds-cereal", "Honey Bunches of Oats With Almonds 12 oz", "8-84912-35916"),
  }),
  food({
    slug: "fruity-pebbles-11oz", brand: "Pebbles", name: "Fruity Pebbles", category: "cereal",
    aliases: ["Post Fruity Pebbles", "fruit rice cereal", "fruity cereal"], description: "1 cup", grams: 36, packageSize: "11 oz box", servingsPerContainer: null,
    nutrients: { calories: 140, protein: 1, carbohydrates: 31, fat: 1.5, fiber: 0, sodium: 190, totalSugar: 12, addedSugar: 12 }, gtin: "00884912129710",
    provenance: post("pebbles", "fruity-pebbles-cereal", "Fruity Pebbles 11 oz", "8-84912-12971"),
  }),
  food({
    slug: "cocoa-pebbles-11oz", brand: "Pebbles", name: "Cocoa Pebbles", category: "cereal",
    aliases: ["Post Cocoa Pebbles", "chocolate rice cereal", "cocoa cereal"], description: "1 cup", grams: 36, packageSize: "11 oz box", servingsPerContainer: null,
    nutrients: { calories: 140, protein: 2, carbohydrates: 31, fat: 1.5, fiber: 1, sodium: 220, totalSugar: 12, addedSugar: 12 }, gtin: "00884912129512",
    provenance: post("pebbles", "cocoa-pebbles-cereal", "Cocoa Pebbles 11 oz", "8-84912-12951"),
  }),
  food({
    slug: "grape-nuts-original-20-5oz", brand: "Grape-Nuts", name: "The Original", category: "cereal",
    aliases: ["Post Grape Nuts", "crunchy wheat barley cereal", "plain whole grain cereal"], description: "1/2 cup", grams: 58, packageSize: "20.5 oz box", servingsPerContainer: 10,
    nutrients: { calories: 200, protein: 6, carbohydrates: 47, fat: 1, fiber: 7, sodium: 280, totalSugar: 5, addedSugar: 0 }, gtin: "00884912004710",
    provenance: official("https://www.grapenuts.com/product/the-original/", "Grape-Nuts Original 20.5 oz", [postSpec("8-84912-00471", "Grape-Nuts Original 20.5 oz package UPC and item specification")]),
  }),
  food({
    slug: "post-raisin-bran-16-6oz", brand: "Post", name: "Raisin Bran", category: "cereal",
    aliases: ["Post raisin cereal", "bran flakes raisins", "high fiber raisin bran"], description: "1 cup", grams: 59, packageSize: "16.6 oz box", servingsPerContainer: null,
    nutrients: { calories: 190, protein: 5, carbohydrates: 46, fat: 1, fiber: 8, sodium: 200, totalSugar: 16, addedSugar: 8 }, gtin: "00884912378118",
    provenance: post("raisin-bran", "post-raisin-bran-cereal", "Post Raisin Bran 16.6 oz", "8-84912-37811"),
  }),
  food({
    slug: "post-shredded-wheat-spoon-size-16-4oz", brand: "Post", name: "Shredded Wheat Original Spoon Size", category: "cereal",
    aliases: ["Post shredded wheat", "plain shredded wheat", "unsweetened wheat cereal"], description: "1 1/3 cups", grams: 60, packageSize: "16.4 oz box", servingsPerContainer: null,
    nutrients: { calories: 210, protein: 7, carbohydrates: 49, fat: 1, fiber: 8, sodium: 0, totalSugar: 0, addedSugar: 0 }, gtin: "00884912180629",
    provenance: post("shredded-wheat", "shredded-wheat-original-spoon-size-cereal", "Post Shredded Wheat Original Spoon Size 16.4 oz", "8-84912-18062"),
  }),
  food({
    slug: "post-honey-comb-12-5oz", brand: "Honey-Comb", name: "Original Cereal", category: "cereal",
    aliases: ["Post Honeycomb", "honey corn oat cereal", "Honey Comb cereal"], description: "1 3/4 cups", grams: 40, packageSize: "12.5 oz box", servingsPerContainer: null,
    nutrients: { calories: 160, protein: 2, carbohydrates: 35, fat: 1, fiber: 1, sodium: 190, totalSugar: 13, addedSugar: 12 }, gtin: "00884912111715",
    provenance: post("honeycomb", "honeycomb-cereal", "Honey-Comb Original 12.5 oz", "8-84912-11171"),
  }),
  food({
    slug: "great-grains-raisins-dates-pecans-16oz", brand: "Great Grains", name: "Raisins, Dates & Pecans", category: "cereal",
    aliases: ["Post Great Grains", "raisin date pecan cereal", "fruit nut cereal"], description: "3/4 cup", grams: 54, packageSize: "16 oz box", servingsPerContainer: null,
    nutrients: { calories: 200, protein: 4, carbohydrates: 40, fat: 4, fiber: 4, sodium: 140, totalSugar: 13, addedSugar: 4 }, gtin: "00884912126115",
    provenance: post("great-grains", "great-grains-raisins-dates-pecans-cereal", "Great Grains Raisins, Dates & Pecans 16 oz", "8-84912-12611"),
  }),
  food({
    slug: "premier-protein-chocolate-almond-cereal-9oz", brand: "Premier Protein", name: "Chocolate Almond Cereal", category: "cereal",
    aliases: ["Post Premier Protein cereal", "high protein chocolate cereal", "protein almond cereal"], description: "1 cup", grams: 42, packageSize: "9 oz box", servingsPerContainer: null,
    nutrients: { calories: 180, protein: 20, carbohydrates: 14, fat: 5, fiber: 1, sodium: 270, totalSugar: 5, addedSugar: 4 }, gtin: "00884912377500",
    provenance: post("premier-protein", "premier-protein-chocolate-almond-cereal", "Premier Protein Chocolate Almond Cereal 9 oz", "8-84912-37750"),
  }),

  // Oatmeal / hot cereal (12)
  food({
    slug: "quaker-old-fashioned-oats-42oz", brand: "Quaker", name: "Old Fashioned Oats", category: "oatmeal",
    aliases: ["rolled oats", "plain oatmeal", "Quaker traditional oats"], description: "1/2 cup dry", grams: 40, packageSize: "42 oz canister", servingsPerContainer: 30,
    nutrients: { calories: 150, protein: 5, carbohydrates: 27, fat: 3, fiber: 4, sodium: 0, totalSugar: 1, addedSugar: 0 }, gtin: "00030000010402",
    provenance: quaker("old-fashioned-oats", "Quaker Old Fashioned Oats 42 oz", [target("13331320", "Exact 42 oz package, UPC, and Nutrition Facts", "030000010402")]),
  }),
  food({
    slug: "quaker-quick-one-minute-oats-42oz", brand: "Quaker", name: "Quick 1-Minute Oats", category: "oatmeal",
    aliases: ["quick oats", "plain quick oatmeal", "Quaker one minute oats"], description: "1/2 cup dry", grams: 40, packageSize: "42 oz canister", servingsPerContainer: 30,
    nutrients: { calories: 150, protein: 5, carbohydrates: 27, fat: 3, fiber: 4, sodium: 0, totalSugar: 1, addedSugar: 0 }, gtin: "00030000012000",
    provenance: quaker("quick-1-minute-oats", "Quaker Quick 1-Minute Oats 42 oz", [target("13331304", "Exact 42 oz package, UPC, and Nutrition Facts", "030000012000")]),
  }),
  food({
    slug: "quaker-instant-original-10ct", brand: "Quaker", name: "Instant Oatmeal Original", category: "oatmeal",
    aliases: ["plain instant oatmeal", "Quaker original packets", "instant oats"], description: "1 packet", grams: 28, packageSize: "10 packets (9.8 oz)", servingsPerContainer: 10,
    nutrients: { calories: 100, protein: 4, carbohydrates: 19, fat: 2, fiber: 3, sodium: 75, totalSugar: 0, addedSugar: 0 }, gtin: "00030000567319",
    provenance: quaker("instant-oatmeal/original", "Quaker Instant Oatmeal Original 10-count", [target("86434802", "Exact 10-count package, UPC, and Nutrition Facts", "030000567319")]),
  }),
  food({
    slug: "quaker-instant-maple-brown-sugar-8ct", brand: "Quaker", name: "Instant Oatmeal Maple & Brown Sugar", category: "oatmeal",
    aliases: ["maple oatmeal", "brown sugar oatmeal", "Quaker maple packets"], description: "1 packet", grams: 43, packageSize: "8 packets (12.1 oz)", servingsPerContainer: 8,
    nutrients: { calories: 160, protein: 4, carbohydrates: 33, fat: 2, fiber: 3, sodium: 260, totalSugar: 12, addedSugar: 12 }, gtin: "00030000567289",
    provenance: quaker("instant-oatmeal/maple-and-brown-sugar", "Quaker Instant Maple & Brown Sugar 8-count", [target("86434942", "Exact 8-count package, UPC, and Nutrition Facts", "030000567289")]),
  }),
  food({
    slug: "quaker-instant-apples-cinnamon-8ct", brand: "Quaker", name: "Instant Oatmeal Apples & Cinnamon", category: "oatmeal",
    aliases: ["apple cinnamon oatmeal", "Quaker apple packets", "flavored instant oatmeal"], description: "1 packet", grams: 43, packageSize: "8 packets (12.1 oz)", servingsPerContainer: 8,
    nutrients: { calories: 160, protein: 4, carbohydrates: 33, fat: 2, fiber: 4, sodium: 160, totalSugar: 11, addedSugar: 8 }, gtin: "00030000567296",
    provenance: quaker("instant-oatmeal/apples-and-cinnamon", "Quaker Instant Apples & Cinnamon 8-count", [target("86434939", "Exact 8-count package, UPC, and Nutrition Facts", "030000567296")]),
  }),
  food({
    slug: "quaker-lower-sugar-maple-brown-sugar-8ct", brand: "Quaker", name: "Lower Sugar Instant Oatmeal Maple & Brown Sugar", category: "oatmeal",
    aliases: ["less sugar oatmeal", "low sugar maple oatmeal", "Quaker lower sugar"], description: "1 packet", grams: 34, packageSize: "8 packets (9.5 oz)", servingsPerContainer: 8,
    nutrients: { calories: 120, protein: 4, carbohydrates: 24, fat: 2, fiber: 3, sodium: 240, totalSugar: 4, addedSugar: 4 }, gtin: "00030000568552",
    provenance: quaker("instant-oatmeal/lower-sugar/maple-and-brown-sugar", "Quaker Lower Sugar Maple & Brown Sugar 8-count", [target("82439014", "Exact 8-count package, UPC, and Nutrition Facts", "030000568552")]),
  }),
  food({
    slug: "quaker-protein-maple-brown-sugar-6ct", brand: "Quaker", name: "Protein Instant Oatmeal Maple & Brown Sugar", category: "oatmeal",
    aliases: ["high protein oatmeal", "protein maple oatmeal", "Quaker protein packets"], description: "1 packet", grams: 60, packageSize: "6 packets (12.6 oz)", servingsPerContainer: 6,
    nutrients: { calories: 220, protein: 12, carbohydrates: 38, fat: 3, fiber: 4, sodium: 200, totalSugar: 11, addedSugar: 11 }, gtin: "00030000570418",
    provenance: quaker("protein/maple-and-brown-sugar", "Quaker Protein Maple & Brown Sugar 6-count", [krogerPaddedIdentifier("quaker-maple-brown-sugar-protein-instant-oatmeal", "0003000057041", "Exact 6-count package, identifier, and Nutrition Facts")]),
  }),
  food({
    slug: "quaker-instant-cinnamon-spice-8ct", brand: "Quaker", name: "Instant Oatmeal Cinnamon & Spice", category: "oatmeal",
    aliases: ["cinnamon oatmeal", "spiced oatmeal", "Quaker cinnamon packets"], description: "1 packet", grams: 43, packageSize: "8 packets (12.1 oz)", servingsPerContainer: 8,
    nutrients: { calories: 160, protein: 4, carbohydrates: 32, fat: 2.5, fiber: 3, sodium: 200, totalSugar: 10, addedSugar: 10 }, gtin: "00030000567326",
    provenance: quaker("instant-oatmeal/cinnamon-and-spice", "Quaker Cinnamon & Spice 8-count", [source("manufacturer-smartlabel", "https://smartlabel.pepsico.info/030000567326-0001-en-US/index.html", "Quaker Cinnamon & Spice 8-count SmartLabel")]),
  }),
  food({
    slug: "quaker-instant-peaches-cream-12-3oz", brand: "Quaker", name: "Instant Oatmeal Peaches & Cream", category: "oatmeal",
    aliases: ["peach oatmeal", "fruit and cream oatmeal", "Quaker peaches cream"], description: "1 packet", grams: 35, packageSize: "12.3 oz box", servingsPerContainer: null,
    nutrients: { calories: 130, protein: 3, carbohydrates: 27, fat: 2.5, fiber: 2, sodium: 180, totalSugar: 12, addedSugar: null }, gtin: "0003000001800",
    provenance: quaker("instant-oatmeal/peaches-and-cream", "Quaker Peaches & Cream 12.3 oz", [krogerPaddedIdentifier("quaker-peaches-cream-instant-oatmeal", "0003000001800", "Exact 12.3 oz package, identifier, and Nutrition Facts")]),
  }),
  food({
    slug: "quaker-fiber-apples-cinnamon-8ct", brand: "Quaker", name: "Fiber Instant Oatmeal Apples & Cinnamon", category: "oatmeal",
    aliases: ["Fiber Boost oatmeal", "high fiber apple oatmeal", "Quaker fiber packets"], description: "1 packet", grams: 45, packageSize: "8 packets (12.6 oz)", servingsPerContainer: 8,
    nutrients: { calories: 160, protein: 4, carbohydrates: 35, fat: 2, fiber: 10, sodium: 125, totalSugar: 9, addedSugar: 7 }, gtin: "00030000579961",
    provenance: quaker("instant-oatmeal/high-fiber/apples-and-cinnamon", "Quaker Fiber Apples & Cinnamon 8-count", [target("94427357", "Exact 8-count package, UPC, and Nutrition Facts", "030000579961")]),
  }),
  food({
    slug: "premier-protein-apple-cinnamon-oatmeal-6ct", brand: "Premier Protein", name: "Apple Cinnamon Instant Oatmeal", category: "oatmeal",
    aliases: ["Post protein oatmeal", "high protein apple oatmeal", "Premier oatmeal"], description: "1 pouch", grams: 50, packageSize: "6 pouches (10.6 oz)", servingsPerContainer: 6,
    nutrients: { calories: 190, protein: 13, carbohydrates: 28, fat: 3, fiber: 3, sodium: 180, totalSugar: 8, addedSugar: 7 }, gtin: "00884912491190",
    provenance: official("https://www.postconsumerbrands.com/brands/premier-protein/products/premier-protein-apple-cinnamon-oatmeal/", "Premier Protein Apple Cinnamon Oatmeal 10.6 oz", [krogerPaddedIdentifier("premier-protein-apple-cinnamon-instant-oatmeal", "0088491249119", "Exact 10.6 oz package, identifier, and Nutrition Facts")]),
  }),
  food({
    slug: "premier-protein-maple-brown-sugar-oatmeal-6ct", brand: "Premier Protein", name: "Maple & Brown Sugar Instant Oatmeal", category: "oatmeal",
    aliases: ["Post protein oatmeal", "high protein maple oatmeal", "Premier oatmeal"], description: "1 pouch", grams: 50, packageSize: "6 pouches (10.6 oz)", servingsPerContainer: 6,
    nutrients: { calories: 190, protein: 13, carbohydrates: 28, fat: 2.5, fiber: 3, sodium: 190, totalSugar: 8, addedSugar: 7 }, gtin: "00884912491183",
    provenance: official("https://www.postconsumerbrands.com/brands/premier-protein/products/premier-protein-maple-brown-sugar-oatmeal/", "Premier Protein Maple & Brown Sugar Oatmeal 10.6 oz", [krogerPaddedIdentifier("premier-protein-maple-brown-sugar-instant-oatmeal", "0088491249118", "Exact 10.6 oz package, identifier, and Nutrition Facts")]),
  }),
];

export default Object.freeze(foods);
