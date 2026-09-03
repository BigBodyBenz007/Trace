export const BRANDED_PACKAGED_CATALOG_VERSION = 1;
export const YOGURT_DAIRY_PHASE_1A_BATCH = "yogurt-dairy-phase-1a";
export const YOGURT_DAIRY_PHASE_1A_ACCESSED_AT = "2026-09-03";

const kroger = (path, reference) => ({
  sourceType: "trusted-retailer",
  sourceUrl: `https://www.kroger.com/p/${path}`,
  sourceReference: reference,
  identifierSourceValue: path.split("/").pop(),
  identifierNormalization: "Removed Kroger's two retailer-padding zeros and restored the UPC-A GS1 check digit.",
  accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
});

const official = (sourceUrl, sourceReference, secondarySources = []) => ({
  source: "official-manufacturer",
  sourceId: sourceReference,
  confidence: secondarySources.length ? "manufacturer-and-secondary-match" : "official-source",
  label: "Manufacturer",
  catalogVersion: BRANDED_PACKAGED_CATALOG_VERSION,
  catalogBatch: YOGURT_DAIRY_PHASE_1A_BATCH,
  verification: {
    status: "complete",
    sourceType: "official-manufacturer",
    sourceUrl,
    sourceReference,
    accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
    secondarySources,
  },
});

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

const yoplaitSource = (slug, reference, secondarySources) => official(
  `https://www.yoplait.com/products/${slug}`,
  reference,
  secondarySources
);

const oikosSource = (slug, reference, retailerPath) => official(
  `https://www.oikos.com/all-products/${slug}`,
  reference,
  [kroger(retailerPath, `${reference} exact package and UPC`)]
);

const chobaniSource = (slug, reference, retailerPath) => official(
  `https://www.chobani.com/products/yogurt/${slug}`,
  reference,
  [kroger(retailerPath, `${reference} exact package, UPC, and Nutrition Facts`)]
);

const goodCultureSpec = (organic = false) => ({
  sourceType: "manufacturer-specification",
  sourceUrl: organic
    ? "https://goodculture.com/wp-content/uploads/2025/03/gc_onesheeter-organic-cottage-cheese_030724.pdf"
    : "https://goodculture.com/wp-content/uploads/2025/03/gc_onesheeter-simply-cottage-cheese_111723.pdf",
  sourceReference: organic ? "Good Culture organic cottage cheese specification" : "Good Culture Simply cottage cheese specification",
  accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
});

const goodCultureSource = (slug, reference, organic = false) => official(
  `https://goodculture.com/product/${slug}/`,
  reference,
  [goodCultureSpec(organic)]
);

const sargentoSource = (slug, reference, retailerPath) => official(
  `https://www.sargento.com/our-cheese/snack-cheese/${slug}`,
  reference,
  [kroger(retailerPath, `${reference} exact package, UPC, and added sugar`)]
);

const babybelSource = (slug, reference, retailerPath) => official(
  `https://babybel.com/product/${slug}/`,
  reference,
  [kroger(retailerPath, `${reference} exact package and UPC`)]
);

const foods = [
  food({
    slug: "yoplait-protein-vanilla-5-3oz", brand: "Yoplait", name: "Protein Vanilla Fat Free Yogurt", category: "yogurt",
    aliases: ["Yoplait vanilla yogurt", "high protein yogurt", "fat free yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 120, protein: 13, carbohydrates: 15, fat: 0, fiber: 0, sodium: 55, totalSugar: 11, addedSugar: 7 }, gtin: "00070470238029",
    provenance: yoplaitSource("yoplait-protein-vanilla-single-serve", "Yoplait Protein Vanilla 5.3 oz", [{ sourceType: "usda-fooddata-central", sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/2774961/nutrients", sourceReference: "FDC 2774961 exact GTIN", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-protein-strawberry-5-3oz", brand: "Yoplait", name: "Protein Strawberry Fat Free Yogurt", category: "yogurt",
    aliases: ["Yoplait strawberry yogurt", "high protein yogurt", "fat free yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 120, protein: 13, carbohydrates: 15, fat: 0, fiber: 0, sodium: 55, totalSugar: 11, addedSugar: 7 }, gtin: "00070470238043",
    provenance: yoplaitSource("yoplait-protein-strawberry-single-serve", "Yoplait Protein Strawberry 5.3 oz", [{ sourceType: "usda-fooddata-central", sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/2774959/nutrients", sourceReference: "FDC 2774959 exact GTIN", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-protein-mixed-berry-5-3oz", brand: "Yoplait", name: "Protein Mixed Berry Fat Free Yogurt", category: "yogurt",
    aliases: ["Yoplait mixed berry yogurt", "high protein yogurt", "fat free yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 120, protein: 13, carbohydrates: 15, fat: 0, fiber: 0, sodium: 55, totalSugar: 11, addedSugar: 7 }, gtin: "00070470238050",
    provenance: yoplaitSource("yoplait-protein-mixed-berry-single-serve", "Yoplait Protein Mixed Berry 5.3 oz", [{ sourceType: "usda-fooddata-central", sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/2774949/nutrients", sourceReference: "FDC 2774949 exact GTIN", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-protein-peach-5-3oz", brand: "Yoplait", name: "Protein Peach Fat Free Yogurt", category: "yogurt",
    aliases: ["Yoplait peach yogurt", "high protein yogurt", "fat free yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 120, protein: 13, carbohydrates: 15, fat: 0, fiber: 0, sodium: 55, totalSugar: 11, addedSugar: 7 }, gtin: "00070470238036",
    provenance: yoplaitSource("yoplait-protein-peach-single-serve", "Yoplait Protein Peach 5.3 oz", [{ sourceType: "usda-fooddata-central", sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/2774960/nutrients", sourceReference: "FDC 2774960 exact GTIN", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-original-strawberry-6oz", brand: "Yoplait", name: "Original Strawberry Low Fat Yogurt", category: "yogurt",
    aliases: ["Yoplait strawberry", "traditional yogurt", "low fat yogurt"], description: "1 container (6 oz)", grams: 170, packageSize: "6 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 5, carbohydrates: 26, fat: 1.5, fiber: 0, sodium: 85, totalSugar: 18, addedSugar: 13 }, gtin: "00070470003009",
    provenance: yoplaitSource("original-single-serve-strawberry", "Yoplait Original Strawberry 6 oz", [{ sourceType: "manufacturer-smartlabel", sourceUrl: "https://smartlabel.generalmills.com/70470003009", sourceReference: "General Mills SmartLabel 70470003009", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-original-strawberry-kiwi-6oz", brand: "Yoplait", name: "Original Strawberry Kiwi Low Fat Yogurt", category: "yogurt",
    aliases: ["Yoplait strawberry kiwi", "traditional yogurt", "low fat yogurt"], description: "1 container (6 oz)", grams: 170, packageSize: "6 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 5, carbohydrates: 27, fat: 1.5, fiber: 0, sodium: 85, totalSugar: 19, addedSugar: 14 }, gtin: "00070470003177",
    provenance: yoplaitSource("original-single-serve-strawberry-kiwi", "Yoplait Original Strawberry Kiwi 6 oz", [{ sourceType: "manufacturer-smartlabel", sourceUrl: "https://smartlabel.generalmills.com/70470003177", sourceReference: "General Mills SmartLabel 70470003177", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-original-french-vanilla-6oz", brand: "Yoplait", name: "Original French Vanilla Low Fat Yogurt", category: "yogurt",
    aliases: ["Yoplait French vanilla", "traditional yogurt", "low fat yogurt"], description: "1 container (6 oz)", grams: 170, packageSize: "6 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 5, carbohydrates: 26, fat: 1.5, fiber: 0, sodium: 80, totalSugar: 19, addedSugar: 14 }, gtin: "00070470003238",
    provenance: yoplaitSource("original-single-serve-french-vanilla", "Yoplait Original French Vanilla 6 oz", [{ sourceType: "manufacturer-smartlabel", sourceUrl: "https://smartlabel.generalmills.com/70470003238", sourceReference: "General Mills SmartLabel 70470003238", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),
  food({
    slug: "yoplait-original-cherry-orchard-6oz", brand: "Yoplait", name: "Original Cherry Orchard Low Fat Yogurt", category: "yogurt",
    aliases: ["Yoplait cherry yogurt", "traditional yogurt", "low fat yogurt"], description: "1 container (6 oz)", grams: 170, packageSize: "6 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 5, carbohydrates: 27, fat: 1.5, fiber: 0, sodium: 80, totalSugar: 19, addedSugar: 12 }, gtin: "00070470003030",
    provenance: yoplaitSource("original-single-serve-cherry-orchard", "Yoplait Original Cherry Orchard 6 oz", [{ sourceType: "manufacturer-smartlabel", sourceUrl: "https://smartlabel.generalmills.com/70470003030", sourceReference: "General Mills SmartLabel 70470003030", accessedAt: YOGURT_DAIRY_PHASE_1A_ACCESSED_AT }]),
  }),

  food({
    slug: "oikos-triple-zero-vanilla-4x5-3oz", brand: "Oikos", name: "Triple Zero Vanilla Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos vanilla", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "4 x 5.3 oz cups", servingsPerContainer: 4,
    nutrients: { calories: 90, protein: 15, carbohydrates: 7, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "036632019530",
    provenance: oikosSource("triple-zero/product/vanilla/", "Oikos Triple Zero Vanilla 4-pack", "oikos-triple-zero-vanilla-greek-yogurt-cup/0003663201953"),
  }),
  food({
    slug: "oikos-triple-zero-strawberry-5-3oz", brand: "Oikos", name: "Triple Zero Strawberry Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos strawberry", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 90, protein: 15, carbohydrates: 6, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "036632008367",
    provenance: oikosSource("triple-zero/product/strawberry/", "Oikos Triple Zero Strawberry 5.3 oz", "oikos-triple-zero-strawberry-nonfat-greek-yogurt/0003663200836"),
  }),
  food({
    slug: "oikos-triple-zero-mixed-berry-5-3oz", brand: "Oikos", name: "Triple Zero Mixed Berry Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos mixed berry", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 90, protein: 15, carbohydrates: 7, fat: 0, fiber: 0, sodium: 60, totalSugar: 5, addedSugar: 0 }, gtin: "036632008350",
    provenance: oikosSource("triple-zero/product/mixed-berry/", "Oikos Triple Zero Mixed Berry 5.3 oz", "oikos-triple-zero-mixed-berry-greek-yogurt-cup/0003663200835"),
  }),
  food({
    slug: "oikos-triple-zero-peach-4x5-3oz", brand: "Oikos", name: "Triple Zero Peach Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos peach", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "4 x 5.3 oz cups", servingsPerContainer: 4,
    nutrients: { calories: 90, protein: 15, carbohydrates: 7, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "036632019875",
    provenance: oikosSource("triple-zero/product/peach/", "Oikos Triple Zero Peach 4-pack", "oikos-triple-zero-peach-blended-nonfat-greek-yogurt-cup/0003663201987"),
  }),
  food({
    slug: "oikos-triple-zero-blueberry-4x5-3oz", brand: "Oikos", name: "Triple Zero Blueberry Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos blueberry", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "4 x 5.3 oz cups", servingsPerContainer: 4,
    nutrients: { calories: 90, protein: 15, carbohydrates: 7, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "036632020369",
    provenance: oikosSource("triple-zero/product/blueberry/", "Oikos Triple Zero Blueberry 4-pack", "oikos-triple-zero-blueberry-nonfat-greek-yogurt-cups/0003663202036"),
  }),
  food({
    slug: "oikos-triple-zero-lemon-tart-5-3oz", brand: "Oikos", name: "Triple Zero Lemon Tart Nonfat Greek Yogurt", category: "yogurt",
    aliases: ["Oikos lemon", "Greek yogurt", "zero added sugar yogurt", "high protein yogurt"], description: "1 cup (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 90, protein: 15, carbohydrates: 7, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "036632020178",
    provenance: oikosSource("triple-zero/product/lemon-tart/", "Oikos Triple Zero Lemon Tart 5.3 oz", "oikos-lemon-tart-triple-zero-greek-yogurt/0003663202017"),
  }),
  food({
    slug: "oikos-blended-plain-nonfat-32oz", brand: "Oikos", name: "Blended Plain Greek Nonfat Yogurt", category: "yogurt",
    aliases: ["Oikos plain", "plain Greek yogurt", "Greek yogurt tub"], description: "3/4 cup", grams: 170, packageSize: "32 oz tub", servingsPerContainer: 5,
    nutrients: { calories: 100, protein: 18, carbohydrates: 7, fat: 0, fiber: 0, sodium: 60, totalSugar: 7, addedSugar: 0 }, gtin: "036632020826",
    provenance: oikosSource("blended-greek-nonfat-yogurt/product/plain-quart/", "Oikos Blended Plain 32 oz", "oikos-blended-plain-greek-nonfat-yogurt-tub/0003663202082"),
  }),
  food({
    slug: "oikos-blended-vanilla-bean-nonfat-32oz", brand: "Oikos", name: "Blended Vanilla Bean Greek Nonfat Yogurt", category: "yogurt",
    aliases: ["Oikos vanilla bean", "vanilla Greek yogurt", "Greek yogurt tub"], description: "3/4 cup", grams: 170, packageSize: "32 oz tub", servingsPerContainer: 5,
    nutrients: { calories: 120, protein: 16, carbohydrates: 14, fat: 0, fiber: 0, sodium: 55, totalSugar: 13, addedSugar: 7 }, gtin: "036632020819",
    provenance: oikosSource("blended-greek-nonfat-yogurt/product/vanilla-bean-quart/", "Oikos Blended Vanilla Bean 32 oz", "oikos-vanilla-bean-nonfat-blended-greek-yogurt-tub/0003663202081"),
  }),

  food({
    slug: "chobani-nonfat-plain-5-3oz", brand: "Chobani", name: "Nonfat Plain Greek Yogurt", category: "yogurt",
    aliases: ["Chobani plain", "plain Greek yogurt", "nonfat yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 80, protein: 14, carbohydrates: 6, fat: 0, fiber: 0, sodium: 55, totalSugar: 5, addedSugar: 0 }, gtin: "894700010014",
    provenance: chobaniSource("greek/nonfat-plain-cup", "Chobani Nonfat Plain 5.3 oz", "chobani-nonfat-plain-greek-yogurt/0089470001001"),
  }),
  food({
    slug: "chobani-nonfat-vanilla-5-3oz", brand: "Chobani", name: "Nonfat Vanilla Greek Yogurt", category: "yogurt",
    aliases: ["Chobani vanilla", "vanilla Greek yogurt", "nonfat yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 110, protein: 12, carbohydrates: 15, fat: 0, fiber: 0, sodium: 50, totalSugar: 14, addedSugar: 9 }, gtin: "894700010021",
    provenance: chobaniSource("greek/vanilla-cup", "Chobani Nonfat Vanilla 5.3 oz", "chobani-vanilla-nonfat-greek-yogurt-cup/0089470001002"),
  }),
  food({
    slug: "chobani-nonfat-strawberry-5-3oz", brand: "Chobani", name: "Nonfat Strawberry on the Bottom Greek Yogurt", category: "yogurt",
    aliases: ["Chobani strawberry", "strawberry Greek yogurt", "fruit on the bottom yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 110, protein: 11, carbohydrates: 15, fat: 0, fiber: 1, sodium: 60, totalSugar: 14, addedSugar: 9 }, gtin: "894700010045",
    provenance: chobaniSource("greek/strawberry-cup", "Chobani Nonfat Strawberry 5.3 oz", "chobani-non-fat-strawberry-on-the-bottom-yogurt-5-3-oz/0089470001004"),
  }),
  food({
    slug: "chobani-nonfat-blueberry-5-3oz", brand: "Chobani", name: "Nonfat Blueberry on the Bottom Greek Yogurt", category: "yogurt",
    aliases: ["Chobani blueberry", "blueberry Greek yogurt", "fruit on the bottom yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 110, protein: 12, carbohydrates: 15, fat: 0, fiber: 1, sodium: 60, totalSugar: 13, addedSugar: 8 }, gtin: "894700010052",
    provenance: chobaniSource("greek/blueberry-cup", "Chobani Nonfat Blueberry 5.3 oz", "chobani-blueberry-on-the-bottom-nonfat-greek-yogurt-cup/0089470001005"),
  }),
  food({
    slug: "chobani-zero-sugar-vanilla-5-3oz", brand: "Chobani", name: "Zero Sugar Vanilla Greek Yogurt", category: "yogurt",
    aliases: ["Chobani zero sugar vanilla", "sugar free yogurt", "Greek yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 60, protein: 12, carbohydrates: 5, fat: 0, fiber: 0, sodium: 65, totalSugar: 0, addedSugar: 0 }, gtin: "818290018281",
    provenance: chobaniSource("zero-sugar/vanilla-cup", "Chobani Zero Sugar Vanilla 5.3 oz", "chobani-zero-sugar-vanilla-greek-yogurt-cup/0081829001828"),
  }),
  food({
    slug: "chobani-zero-sugar-blueberry-5-3oz", brand: "Chobani", name: "Zero Sugar Blueberry Greek Yogurt", category: "yogurt",
    aliases: ["Chobani zero sugar blueberry", "sugar free yogurt", "Greek yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 60, protein: 12, carbohydrates: 5, fat: 0, fiber: 0, sodium: 65, totalSugar: 0, addedSugar: 0 }, gtin: "818290018311",
    provenance: chobaniSource("zero-sugar/blueberry-cup", "Chobani Zero Sugar Blueberry 5.3 oz", "chobani-zero-sugar-blueberry-yogurt-cup/0081829001831"),
  }),
  food({
    slug: "chobani-zero-sugar-strawberry-cheesecake-5-3oz", brand: "Chobani", name: "Zero Sugar Strawberry Cheesecake Greek Yogurt", category: "yogurt",
    aliases: ["Chobani strawberry cheesecake", "sugar free yogurt", "Greek yogurt"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 60, protein: 12, carbohydrates: 5, fat: 0, fiber: 0, sodium: 70, totalSugar: 0, addedSugar: 0 }, gtin: "818290018687",
    provenance: chobaniSource("zero-sugar/strawberry-cheesecake-cup", "Chobani Zero Sugar Strawberry Cheesecake 5.3 oz", "chobani-with-zero-sugar-strawberry-cheesecake-yogurt/0081829001868"),
  }),
  food({
    slug: "chobani-high-protein-vanilla-20g-6-7oz", brand: "Chobani", name: "20g Protein Lowfat Greek Yogurt Vanilla", category: "yogurt",
    aliases: ["Chobani high protein vanilla", "20 gram protein yogurt", "Greek yogurt"], description: "1 container (6.7 oz)", grams: 190, packageSize: "6.7 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 20, carbohydrates: 9, fat: 3, fiber: 2, sodium: 100, totalSugar: 7, addedSugar: 0 }, gtin: "818290015150",
    provenance: chobaniSource("high-protein/vanilla-20g", "Chobani 20g Protein Vanilla 6.7 oz", "chobani-20g-protein-lowfat-greek-yogurt-vanilla/0081829001515"),
  }),

  food({
    slug: "good-culture-simply-lowfat-classic-16oz", brand: "Good Culture", name: "Simply 2% Low-Fat Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture 2 percent cottage cheese", "low fat cottage cheese"], description: "1/2 cup", grams: 110, packageSize: "16 oz tub", servingsPerContainer: 4,
    nutrients: { calories: 90, protein: 14, carbohydrates: 4, fat: 2, fiber: 0, sodium: 380, totalSugar: 4, addedSugar: 0 }, gtin: "859977005279",
    provenance: goodCultureSource("simply-cottage-cheese-16-oz-lowfat-classic", "Good Culture Simply 2% Classic 16 oz"),
  }),
  food({
    slug: "good-culture-simply-whole-milk-classic-16oz", brand: "Good Culture", name: "Simply 4% Whole Milk Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture 4 percent cottage cheese", "whole milk cottage cheese"], description: "1/2 cup", grams: 110, packageSize: "16 oz tub", servingsPerContainer: 4,
    nutrients: { calories: 100, protein: 14, carbohydrates: 2, fat: 4.5, fiber: 0, sodium: 380, totalSugar: 2, addedSugar: 0 }, gtin: "859977005125",
    provenance: goodCultureSource("simply-cottage-cheese-16-oz-whole-milk-classic", "Good Culture Simply 4% Classic 16 oz"),
  }),
  food({
    slug: "good-culture-simply-lowfat-classic-24oz", brand: "Good Culture", name: "Simply 2% Low-Fat Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture 2 percent cottage cheese", "family size cottage cheese"], description: "1/2 cup", grams: 110, packageSize: "24 oz tub", servingsPerContainer: 6,
    nutrients: { calories: 90, protein: 14, carbohydrates: 4, fat: 2, fiber: 0, sodium: 380, totalSugar: 4, addedSugar: 0 }, gtin: "850011288375",
    provenance: goodCultureSource("simply-cottage-cheese-24-oz-lowfat-classic", "Good Culture Simply 2% Classic 24 oz"),
  }),
  food({
    slug: "good-culture-simply-lowfat-classic-5-3oz", brand: "Good Culture", name: "Simply 2% Low-Fat Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture cottage cheese cup", "single serve cottage cheese"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 130, protein: 19, carbohydrates: 5, fat: 3, fiber: 0, sodium: 520, totalSugar: 5, addedSugar: 0 }, gtin: "859977005149",
    provenance: goodCultureSource("simply-cottage-cheese-5-3-oz-lowfat-classic", "Good Culture Simply 2% Classic 5.3 oz"),
  }),
  food({
    slug: "good-culture-simply-whole-milk-classic-5-3oz", brand: "Good Culture", name: "Simply 4% Whole Milk Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture cottage cheese cup", "single serve cottage cheese"], description: "1 container (5.3 oz)", grams: 150, packageSize: "5.3 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 19, carbohydrates: 3, fat: 6, fiber: 0, sodium: 520, totalSugar: 3, addedSugar: 0 }, gtin: "859977005545",
    provenance: goodCultureSource("simply-cottage-cheese-5-3-oz-whole-milk-classic", "Good Culture Simply 4% Classic 5.3 oz"),
  }),
  food({
    slug: "good-culture-simply-lactose-free-lowfat-15oz", brand: "Good Culture", name: "Simply Lactose Free 2% Low-Fat Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture lactose free", "lactose free cottage cheese"], description: "1/2 cup", grams: 110, packageSize: "15 oz tub", servingsPerContainer: 4,
    nutrients: { calories: 90, protein: 14, carbohydrates: 4, fat: 2, fiber: 0, sodium: 380, totalSugar: 4, addedSugar: 0 }, gtin: "850011288252",
    provenance: goodCultureSource("simply-cottage-cheese-15-oz-lactose-free", "Good Culture Simply Lactose Free 2% 15 oz"),
  }),
  food({
    slug: "good-culture-organic-lowfat-classic-5oz", brand: "Good Culture", name: "Organic 2% Low-Fat Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture organic cottage cheese", "organic low fat cottage cheese"], description: "1 container (5 oz)", grams: 142, packageSize: "5 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 120, protein: 18, carbohydrates: 5, fat: 3, fiber: 0, sodium: 490, totalSugar: 5, addedSugar: 0 }, gtin: "859977005484",
    provenance: goodCultureSource("organic-cottage-cheese-5-oz-low-fat-classic", "Good Culture Organic 2% Classic 5 oz", true),
  }),
  food({
    slug: "good-culture-organic-whole-milk-classic-5oz", brand: "Good Culture", name: "Organic 4% Whole Milk Classic Cottage Cheese", category: "cottage-cheese",
    aliases: ["Good Culture organic cottage cheese", "organic whole milk cottage cheese"], description: "1 container (5 oz)", grams: 142, packageSize: "5 oz cup", servingsPerContainer: 1,
    nutrients: { calories: 140, protein: 18, carbohydrates: 3, fat: 6, fiber: 0, sodium: 490, totalSugar: 3, addedSugar: 0 }, gtin: "859977005088",
    provenance: goodCultureSource("organic-cottage-cheese-5-oz-whole-milk-classic", "Good Culture Organic 4% Classic 5 oz", true),
  }),

  food({
    slug: "sargento-mozzarella-string-cheese-12ct", brand: "Sargento", name: "Mozzarella String Cheese Sticks", category: "cheese-snack",
    aliases: ["Sargento string cheese", "mozzarella cheese stick", "cheese snack"], description: "1 piece", grams: 28, packageSize: "12 sticks (12 oz)", servingsPerContainer: 12,
    nutrients: { calories: 90, protein: 7, carbohydrates: 1, fat: 6, fiber: 0, sodium: 190, totalSugar: 0, addedSugar: 0 }, gtin: "046100007150",
    provenance: sargentoSource("sargento-natural-string-cheese-snacks", "Sargento Mozzarella String Cheese 12-count", "sargento-mozzarella-string-cheese-/0004610000715"),
  }),
  food({
    slug: "sargento-light-string-cheese-12ct", brand: "Sargento", name: "Reduced Fat Light String Cheese", category: "cheese-snack",
    aliases: ["Sargento light string cheese", "reduced fat mozzarella stick", "cheese snack"], description: "1 piece", grams: 21, packageSize: "12 sticks (9 oz)", servingsPerContainer: 12,
    nutrients: { calories: 50, protein: 6, carbohydrates: 1, fat: 2.5, fiber: 0, sodium: 160, totalSugar: 0, addedSugar: 0 }, gtin: "046100007174",
    provenance: sargentoSource("sargento-reduced-fat-low-moisture-part-skim-mozzarella-natural-cheese-light-string-cheese-snacks", "Sargento Light String Cheese 12-count", "sargento-light-mozzarella-string-cheese/0004610000717"),
  }),
  food({
    slug: "sargento-fiesta-pepper-string-cheese-12ct", brand: "Sargento", name: "Fiesta Pepper String Cheese", category: "cheese-snack",
    aliases: ["Sargento pepper cheese stick", "pepper jack string cheese", "cheese snack"], description: "1 piece", grams: 24, packageSize: "12 sticks (10 oz)", servingsPerContainer: 12,
    nutrients: { calories: 70, protein: 6, carbohydrates: 0, fat: 5, fiber: 0, sodium: 180, totalSugar: 0, addedSugar: 0 }, gtin: "046100356852",
    provenance: sargentoSource("sargento-fiesta-pepper-string-cheese-natural-cheese-snacks-12-pack", "Sargento Fiesta Pepper String Cheese 12-count", "sargento-fiesta-pepper-string-cheese/0004610035685"),
  }),
  food({
    slug: "sargento-smokehouse-string-cheese-12ct", brand: "Sargento", name: "Smokehouse String Cheese", category: "cheese-snack",
    aliases: ["Sargento smokehouse cheese stick", "smoked string cheese", "cheese snack"], description: "1 piece", grams: 24, packageSize: "12 sticks (10 oz)", servingsPerContainer: 12,
    nutrients: { calories: 70, protein: 6, carbohydrates: 1, fat: 4.5, fiber: 0, sodium: 160, totalSugar: 0, addedSugar: 0 }, gtin: "046100356845",
    provenance: sargentoSource("sargento-smokehouse-string-cheese-natural-cheese-snacks-12-pack", "Sargento Smokehouse String Cheese 12-count", "sargento-smokehouse-string-cheese-sticks/0004610035684"),
  }),
  food({
    slug: "babybel-original-12ct", brand: "Babybel", name: "Original Snack Cheese", category: "cheese-snack",
    aliases: ["Mini Babybel original", "Babybel red", "cheese snack"], description: "1 piece", grams: 20, packageSize: "12 pieces (8.5 oz)", servingsPerContainer: 12,
    nutrients: { calories: 70, protein: 4, carbohydrates: 0, fat: 5, fiber: 0, sodium: 150, totalSugar: 0, addedSugar: 0 }, gtin: "041757025755",
    provenance: babybelSource("babybel-original-cheese", "Babybel Original 12-count", "babybel-original-snack-cheese/0004175702575"),
  }),
  food({
    slug: "babybel-light-12ct", brand: "Babybel", name: "Reduced Fat Snack Cheese", category: "cheese-snack",
    aliases: ["Mini Babybel light", "Babybel reduced fat", "cheese snack"], description: "1 piece", grams: 20, packageSize: "12 pieces (8.5 oz)", servingsPerContainer: 12,
    nutrients: { calories: 50, protein: 5, carbohydrates: 0, fat: 3, fiber: 0, sodium: 150, totalSugar: 0, addedSugar: 0 }, gtin: "041757026066",
    provenance: babybelSource("babybel-light-cheese", "Babybel Light 12-count", "mini-babybel-light-snack-cheese-12-pack-8-5-oz-/0004175702606"),
  }),
  food({
    slug: "babybel-gouda-12ct", brand: "Babybel", name: "Gouda Variety Snack Cheese", category: "cheese-snack",
    aliases: ["Mini Babybel Gouda", "Babybel brown", "cheese snack"], description: "1 piece", grams: 20, packageSize: "12 pieces (8.5 oz)", servingsPerContainer: 12,
    nutrients: { calories: 70, protein: 4, carbohydrates: 0, fat: 6, fiber: 0, sodium: 150, totalSugar: 0, addedSugar: 0 }, gtin: "041757025984",
    provenance: babybelSource("babybel-gouda-cheese", "Babybel Gouda 12-count", "babybel-mini-gouda-cheese-pack/0004175702598"),
  }),
  food({
    slug: "babybel-white-cheddar-12ct", brand: "Babybel", name: "White Cheddar Variety Snack Cheese", category: "cheese-snack",
    aliases: ["Mini Babybel white cheddar", "Babybel cheddar", "cheese snack"], description: "1 piece", grams: 20, packageSize: "12 pieces (8.5 oz)", servingsPerContainer: 12,
    nutrients: { calories: 70, protein: 4, carbohydrates: 0, fat: 6, fiber: 0, sodium: 135, totalSugar: 0, addedSugar: 0 }, gtin: "041757680411",
    provenance: babybelSource("babybel-white-cheddar-cheese", "Babybel White Cheddar 12-count", "babybel-white-cheddar-snack-cheese/0004175768041"),
  }),
];

export default Object.freeze(foods);
