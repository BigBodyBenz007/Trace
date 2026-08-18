const MCD_SOURCE = "https://www.mcdonalds.com/us/en-us/mcdonalds-app/nutrition.html";

function foodRecord(id, name, slug, calories, nutrients = {}, serving = "1 sandwich", verification = {}) {
  const sourceUrl = `https://www.mcdonalds.com/us/en-us/product/${slug}.html`;
  return {
    id: `restaurant:mcdonalds:${id}`,
    restaurant: { id: "mcdonalds", name: "McDonald's" },
    name,
    serving: { amount: 1, unit: "item", description: serving },
    nutrients: { calories, protein: null, carbohydrates: null, fat: null, sodium: null, ...nutrients },
    provenance: { source: verification.source || "official-restaurant", sourceId: verification.sourceId || `mcdonalds:${id}`, confidence: verification.confidence || "official-source", verification: { status: verification.status || "partial", sourceType: verification.sourceType || "official-restaurant", sourceUrl: verification.sourceUrl === undefined ? sourceUrl : verification.sourceUrl, ...(verification.sourceReference ? { sourceReference: verification.sourceReference } : {}) } },
  };
}

function menuOption(id, description, calories, sourceUrl, nutrients = {}, amount = 1, status = "partial", sourceType = "official-restaurant", source = "official-restaurant", sourceReference) {
  return {
    id: `restaurant:mcdonalds:${id}`,
    serving: { amount, unit: "item", description },
    nutrients: { calories, protein: null, carbohydrates: null, fat: null, sodium: null, ...nutrients },
    provenance: { source, sourceId: `mcdonalds:${id}`, confidence: sourceType === "trusted-third-party" ? "trusted-source" : "official-source", verification: { status, sourceType, sourceUrl, ...(sourceReference ? { sourceReference } : {}) } },
  };
}

const mcnuggetOptions = [
  menuOption("chicken-mcnuggets:4-piece", "4 piece serving", 170, MCD_SOURCE, { protein: 9, carbohydrates: 10, fat: 10, sodium: 340 }, 4, "complete", "official-restaurant-app"),
  menuOption("chicken-mcnuggets:6-piece", "6 piece serving", 250, "https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-6-piece.html", { protein: 14, carbohydrates: 15, fat: 15, sodium: 470 }, 6, "complete", "trusted-third-party", "trusted-third-party", "Recent trusted third-party source matching McDonald’s current 250-calorie U.S. serving; supplied audit"),
  menuOption("chicken-mcnuggets:10-piece", "10 piece serving", 410, "https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-10-piece.html", { protein: 23, carbohydrates: 25, fat: 24, sodium: 750 }, 10, "complete", "trusted-third-party", "trusted-third-party", "Recent trusted third-party source matching McDonald’s current 410-calorie U.S. serving; supplied audit"),
  menuOption("chicken-mcnuggets:20-piece", "20 piece serving", 830, "https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-20-piece.html", { protein: 44, carbohydrates: 54, fat: 50, sodium: 1560 }, 20, "complete", "trusted-third-party", "trusted-third-party", "Trusted July 2026 source using McDonald’s U.S. nutrition data and matching the current official 830-calorie serving; supplied audit"),
  menuOption("chicken-mcnuggets:40-piece", "40 piece serving", 1650, "https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-40-piece.html", { protein: 92, carbohydrates: 102, fat: 98, sodium: 3400 }, 40, "complete", "trusted-third-party", "trusted-third-party", "Trusted 2026 source matched to McDonald’s current 1650-calorie serving; supplied audit"),
];

const mcnuggets = {
  id: "restaurant:mcdonalds:chicken-mcnuggets",
  restaurant: { id: "mcdonalds", name: "McDonald's" },
  name: "Chicken McNuggets",
  serving: mcnuggetOptions[0].serving,
  nutrients: mcnuggetOptions[0].nutrients,
  servingOptions: mcnuggetOptions,
  provenance: { source: "official-restaurant", sourceId: mcnuggetOptions[0].provenance.sourceId, confidence: "official-source", verification: { status: "complete", sourceType: "official-restaurant-app", sourceUrl: MCD_SOURCE } },
};

const friesSource = "https://www.mcdonalds.com/us/en-us/product/medium-french-fries.html";
const fries = {
  id: "restaurant:mcdonalds:french-fries",
  restaurant: { id: "mcdonalds", name: "McDonald's" },
  name: "French Fries",
  serving: { amount: 1, unit: "item", description: "Small fries" },
  nutrients: { calories: 230, protein: 3, carbohydrates: 31, fat: 11, sodium: 190 },
  servingOptions: [
    menuOption("french-fries:small", "Small fries", 230, "https://www.mcdonalds.com/us/en-us/product/small-french-fries.html", { protein: 3, carbohydrates: 31, fat: 11, sodium: 190 }, 1, "complete", "official-restaurant"),
    menuOption("french-fries:medium", "Medium fries", 320, friesSource, { protein: 5, carbohydrates: 43, fat: 15, sodium: 260 }, 1, "complete", "trusted-third-party", "trusted-third-party", "Trusted current nutrition source matching McDonald’s official 320-calorie serving; supplied audit"),
    menuOption("french-fries:large", "Large fries", 480, "https://www.mcdonalds.com/us/en-us/product/large-french-fries.html", { protein: 7, carbohydrates: 65, fat: 23, sodium: 400 }, 1, "complete", "trusted-third-party", "trusted-third-party", "Trusted 2026 source matching McDonald’s official 480-calorie serving; supplied audit"),
  ],
  provenance: { source: "official-restaurant", sourceId: "mcdonalds:french-fries:small", confidence: "official-source", verification: { status: "complete", sourceType: "official-restaurant", sourceUrl: "https://www.mcdonalds.com/us/en-us/product/small-french-fries.html" } },
};

const cocaCola = {
  id: "restaurant:mcdonalds:coca-cola",
  restaurant: { id: "mcdonalds", name: "McDonald's" },
  name: "Coca-Cola",
  serving: { amount: 1, unit: "item", description: "Medium Coca-Cola" },
  nutrients: { calories: 270, protein: 0, carbohydrates: 70, fat: 0, sodium: 65 },
  servingOptions: [
    menuOption("coca-cola:small", "Small Coca-Cola", 200, "https://www.mcdonalds.com/us/en-us/product/coca-cola-small.html", { protein: 0, carbohydrates: 53, fat: 0, sodium: null }, 1, "complete", "official-restaurant"),
    menuOption("coca-cola:medium", "Medium Coca-Cola", 270, "https://www.mcdonalds.com/us/en-us/product/coca-cola-medium.html", { protein: 0, carbohydrates: 70, fat: 0, sodium: 65 }, 1, "complete", "trusted-third-party", "trusted-third-party", "Trusted current source matched to McDonald’s official 270-calorie serving; supplied audit"),
    menuOption("coca-cola:large", "Large Coca-Cola", 380, "https://www.mcdonalds.com/us/en-us/product/coca-cola-large.html", { protein: 0, carbohydrates: 100, fat: 0, sodium: 90 }, 1, "complete", "trusted-third-party", "trusted-third-party", "Trusted current source matched to McDonald’s official 380-calorie serving; supplied audit"),
  ],
  provenance: { source: "trusted-third-party", sourceId: "mcdonalds:coca-cola:medium", confidence: "trusted-source", verification: { status: "complete", sourceType: "trusted-third-party", sourceUrl: "https://www.mcdonalds.com/us/en-us/product/coca-cola-medium.html", sourceReference: "Trusted current source matched to McDonald’s official 270-calorie serving; supplied audit" } },
};

const SONIC_SOURCE = "https://assets.ctfassets.net/whnlxz6bna9d/1Wtr8uYNYWyb2JzoSQg1rF/60a8a009073b4e9319bb7fb138a1f176/August_2026_National_Nutritional_Brochure.pdf";
const BRAUMS_SOURCE = "https://www.braums.com/wp-content/uploads/2022/08/2018-Nutritional-Chart-for-web.pdf";
const SOURCE_CHECKED_AT = "2026-08-18";

function officialOption(chainId, id, description, nutrients, amount = 1, sourceUrl, sourceReference) {
  return {
    id: `restaurant:${chainId}:${id}`,
    serving: { amount, unit: "item", description },
    nutrients: { calories: null, protein: null, carbohydrates: null, fat: null, sodium: null, ...nutrients },
    provenance: {
      source: "official-restaurant",
      sourceId: `${chainId}:${id}`,
      confidence: "official-source",
      verification: {
        status: "complete",
        sourceType: "official-restaurant",
        sourceUrl,
        accessedAt: SOURCE_CHECKED_AT,
        ...(sourceReference ? { sourceReference } : {}),
      },
    },
  };
}

function officialFood(chain, id, name, description, nutrients, sourceUrl, sourceReference, servingOptions) {
  const firstOption = servingOptions?.[0];
  return {
    id: `restaurant:${chain.id}:${id}`,
    restaurant: chain,
    name,
    serving: firstOption?.serving || { amount: 1, unit: "item", description },
    nutrients: firstOption?.nutrients || { calories: null, protein: null, carbohydrates: null, fat: null, sodium: null, ...nutrients },
    ...(servingOptions ? { servingOptions } : {}),
    provenance: {
      source: "official-restaurant",
      sourceId: firstOption?.provenance.sourceId || `${chain.id}:${id}`,
      confidence: "official-source",
      verification: {
        status: "complete",
        sourceType: "official-restaurant",
        sourceUrl,
        accessedAt: SOURCE_CHECKED_AT,
        ...(sourceReference ? { sourceReference } : {}),
      },
    },
  };
}

const sonic = { id: "sonic", name: "Sonic Drive-In" };
const sonicFood = (id, name, description, nutrients, servingOptions) => officialFood(
  sonic,
  id,
  name,
  description,
  nutrients,
  SONIC_SOURCE,
  "SONIC August 2026 National Nutritional Brochure",
  servingOptions
);
const sonicOption = (id, description, nutrients, amount = 1) => officialOption(
  sonic.id,
  id,
  description,
  nutrients,
  amount,
  SONIC_SOURCE,
  "SONIC August 2026 National Nutritional Brochure"
);

const sonicFoods = [
  sonicFood("sonic-cheeseburger-ketchup-mayo", "SONIC Cheeseburger with Ketchup & Mayo", "1 cheeseburger", { calories: 700, protein: 30, carbohydrates: 52, fat: 41, sodium: 1360 }),
  sonicFood("supersonic-double-cheeseburger-ketchup-mayo", "SuperSONIC Double Cheeseburger with Ketchup & Mayo", "1 double cheeseburger", { calories: 1040, protein: 50, carbohydrates: 54, fat: 68, sodium: 1970 }),
  sonicFood("crispy-chicken-sandwich", "Crispy Chicken Sandwich", "1 sandwich", { calories: 520, protein: 24, carbohydrates: 52, fat: 24, sodium: 1470 }),
  sonicFood("crispy-tenders", "Crispy Tenders", null, null, [
    sonicOption("crispy-tenders:3-piece", "3 piece serving", { calories: 260, protein: 21, carbohydrates: 16, fat: 12, sodium: 730 }, 3),
    sonicOption("crispy-tenders:5-piece", "5 piece serving", { calories: 430, protein: 35, carbohydrates: 27, fat: 20, sodium: 1210 }, 5),
  ]),
  sonicFood("all-american-hot-dog", "All-American Hot Dog", "1 hot dog", { calories: 410, protein: 13, carbohydrates: 42, fat: 21, sodium: 1150 }),
  sonicFood("footlong-quarter-pound-coney", "Footlong Quarter Pound Coney", "1 footlong coney", { calories: 770, protein: 31, carbohydrates: 54, fat: 48, sodium: 2160 }),
  sonicFood("corn-dog", "Corn Dog", "1 corn dog", { calories: 230, protein: 6, carbohydrates: 23, fat: 13, sodium: 480 }),
  sonicFood("groovy-fries", "Groovy Fries", null, null, [
    sonicOption("groovy-fries:small", "Small Groovy Fries", { calories: 260, protein: 2, carbohydrates: 28, fat: 16, sodium: 570 }),
    sonicOption("groovy-fries:medium", "Medium Groovy Fries", { calories: 370, protein: 3, carbohydrates: 39, fat: 22, sodium: 790 }),
    sonicOption("groovy-fries:large", "Large Groovy Fries", { calories: 520, protein: 4, carbohydrates: 56, fat: 31, sodium: 1110 }),
  ]),
  sonicFood("tots", "Tots", null, null, [
    sonicOption("tots:small", "Small Tots", { calories: 250, protein: 2, carbohydrates: 30, fat: 13, sodium: 620 }),
    sonicOption("tots:medium", "Medium Tots", { calories: 360, protein: 3, carbohydrates: 43, fat: 19, sodium: 890 }),
    sonicOption("tots:large", "Large Tots", { calories: 580, protein: 5, carbohydrates: 69, fat: 31, sodium: 1450 }),
  ]),
  sonicFood("mozzarella-sticks", "Mozzarella Sticks", null, null, [
    sonicOption("mozzarella-sticks:4-piece", "4 piece (Small)", { calories: 370, protein: 15, carbohydrates: 36, fat: 19, sodium: 790 }, 4),
    sonicOption("mozzarella-sticks:6-piece", "6 piece (Medium)", { calories: 560, protein: 22, carbohydrates: 54, fat: 28, sodium: 1190 }, 6),
    sonicOption("mozzarella-sticks:8-piece", "8 piece (Large)", { calories: 750, protein: 30, carbohydrates: 72, fat: 38, sodium: 1590 }, 8),
  ]),
  sonicFood("breakfast-burrito-bacon", "Breakfast Burrito Bacon", "1 burrito", { calories: 470, protein: 25, carbohydrates: 35, fat: 25, sodium: 1540 }),
  sonicFood("breakfast-burrito-sausage", "Breakfast Burrito Sausage", "1 burrito", { calories: 490, protein: 23, carbohydrates: 35, fat: 28, sodium: 1450 }),
];

const braums = { id: "braums", name: "Braum's" };
const BRAUMS_REFERENCE = "2018 Nutritional Chart (for web), still linked by Braum's current website; current-menu identity checked 2026-08-18";
const braumsFood = (id, name, description, nutrients, servingOptions) => officialFood(braums, id, name, description, nutrients, BRAUMS_SOURCE, BRAUMS_REFERENCE, servingOptions);
const braumsOption = (id, description, nutrients, amount = 1) => officialOption(braums.id, id, description, nutrients, amount, BRAUMS_SOURCE, BRAUMS_REFERENCE);

const braumsFoods = [
  braumsFood("quarter-lb-cheeseburger", "Quarter lb. Cheeseburger", "1 cheeseburger", { calories: 530, protein: 29, carbohydrates: 40, fat: 28, sodium: 1420 }),
  braumsFood("double-quarter-lb-cheeseburger", "Double Quarter lb. Cheeseburger", "1 double cheeseburger", { calories: 730, protein: 47, carbohydrates: 40, fat: 41, sodium: 1470 }),
  braumsFood("deluxe-sixth-lb-cheeseburger", "Deluxe ⅙ lb. Cheeseburger", "1 cheeseburger", { calories: 420, protein: 21, carbohydrates: 39, fat: 20, sodium: 1210 }),
  braumsFood("chicken-sandwich-crispy", "Chicken Sandwich Crispy", "1 sandwich", { calories: 590, protein: 28, carbohydrates: 60, fat: 27, sodium: 1220 }),
  braumsFood("chicken-sandwich-grilled", "Chicken Sandwich Grilled", "1 sandwich", { calories: 430, protein: 32, carbohydrates: 38, fat: 18, sodium: 1260 }),
  braumsFood("chicken-strips", "Chicken Strips", null, null, [
    braumsOption("chicken-strips:4-piece", "4 piece serving", { calories: 490, protein: 28, carbohydrates: 29, fat: 29, sodium: 1350 }, 4),
    braumsOption("chicken-strips:6-piece", "6 piece serving", { calories: 740, protein: 41, carbohydrates: 44, fat: 44, sodium: 2030 }, 6),
  ]),
  braumsFood("french-fries", "French Fries", null, null, [
    braumsOption("french-fries:small", "Small French Fries", { calories: 210, protein: 3, carbohydrates: 29, fat: 9, sodium: 140 }),
    braumsOption("french-fries:medium", "Medium French Fries", { calories: 310, protein: 4, carbohydrates: 43, fat: 14, sodium: 220 }),
    braumsOption("french-fries:large", "Large French Fries", { calories: 420, protein: 5, carbohydrates: 58, fat: 18, sodium: 290 }),
  ]),
  braumsFood("grilled-chicken-salad", "Grilled Chicken Salad", "1 salad", { calories: 460, protein: 30, carbohydrates: 33, fat: 24, sodium: 930 }),
  braumsFood("breakfast-burrito", "Breakfast Burrito", "1 burrito", { calories: 450, protein: 20, carbohydrates: 39, fat: 23, sodium: 840 }),
  braumsFood("hash-browns", "Hash Browns", null, null, [
    braumsOption("hash-browns:small-3oz", "Small (3 oz)", { calories: 330, protein: 2, carbohydrates: 24, fat: 25, sodium: 470 }),
    braumsOption("hash-browns:large-5oz", "Large (5 oz)", { calories: 550, protein: 4, carbohydrates: 40, fat: 42, sodium: 790 }),
  ]),
];

const TACO_BELL_SOURCE = "https://www.tacobell.com/nutrition/info";
const CHICK_FIL_A_SOURCE = "https://www.chick-fil-a.com/nutrition-allergens";
const WHATABURGER_SOURCE = "https://whataburger.com/menu";

const tacoBell = { id: "taco-bell", name: "Taco Bell" };
const tacoBellFood = (id, name, description, nutrients) => officialFood(tacoBell, id, name, description, nutrients, TACO_BELL_SOURCE, "Taco Bell Full Nutrition Info; displayed values from the nutrition menu embedded by Taco Bell");
const tacoBellFoods = [
  tacoBellFood("crunchy-taco", "Crunchy Taco", "1 taco", { calories: 170, protein: 7, carbohydrates: 13, fat: 9, sodium: 310 }),
  tacoBellFood("soft-taco", "Soft Taco", "1 taco", { calories: 180, protein: 9, carbohydrates: 18, fat: 8, sodium: 500 }),
  tacoBellFood("nacho-cheese-doritos-locos-tacos", "Nacho Cheese Doritos\u00ae Locos Tacos", "1 taco", { calories: 170, protein: 7, carbohydrates: 13, fat: 10, sodium: 370 }),
  tacoBellFood("bean-burrito", "Bean Burrito", "1 burrito", { calories: 360, protein: 13, carbohydrates: 54, fat: 10, sodium: 1080 }),
  tacoBellFood("beefy-5-layer-burrito", "Beefy 5-Layer Burrito", "1 burrito", { calories: 490, protein: 17, carbohydrates: 65, fat: 18, sodium: 1290 }),
  tacoBellFood("burrito-supreme-beef", "Burrito Supreme\u00ae - Beef", "1 burrito", { calories: 390, protein: 16, carbohydrates: 52, fat: 14, sodium: 1160 }),
  tacoBellFood("crunchwrap-supreme", "Crunchwrap Supreme\u00ae", "1 Crunchwrap", { calories: 530, protein: 15, carbohydrates: 74, fat: 20, sodium: 1210 }),
  tacoBellFood("mexican-pizza", "Mexican Pizza", "1 order", { calories: 530, protein: 19, carbohydrates: 51, fat: 27, sodium: 1000 }),
  tacoBellFood("quesadilla-chicken", "Quesadilla - Chicken", "1 quesadilla", { calories: 490, protein: 26, carbohydrates: 44, fat: 23, sodium: 1240 }),
  tacoBellFood("quesadilla-steak", "Quesadilla - Steak", "1 quesadilla", { calories: 500, protein: 26, carbohydrates: 44, fat: 24, sodium: 1260 }),
  tacoBellFood("nachos-bellgrande-beef", "Nachos BellGrande\u00ae - Beef", "1 order", { calories: 730, protein: 17, carbohydrates: 81, fat: 38, sodium: 1180 }),
  tacoBellFood("cheesy-fiesta-potatoes", "Cheesy Fiesta Potatoes", "1 order", { calories: 240, protein: 3, carbohydrates: 29, fat: 12, sodium: 520 }),
  tacoBellFood("cinnamon-twists", "Cinnamon Twists", "1 order", { calories: 170, protein: 2, carbohydrates: 27, fat: 6, sodium: 150 }),
  tacoBellFood("cheesy-gordita-crunch", "Cheesy Gordita Crunch", "1 gordita", { calories: 480, protein: 20, carbohydrates: 44, fat: 26, sodium: 830 }),
  tacoBellFood("chalupa-supreme", "Chalupa Supreme\u00ae", "1 chalupa", { calories: 350, protein: 12, carbohydrates: 32, fat: 20, sodium: 570 }),
];

const chickFilA = { id: "chick-fil-a", name: "Chick-fil-A" };
const CHICK_FIL_A_REFERENCE = "Chick-fil-A Nutrition & Allergens guide";
const chickFilAFood = (id, name, description, nutrients, servingOptions) => officialFood(chickFilA, id, name, description, nutrients, CHICK_FIL_A_SOURCE, CHICK_FIL_A_REFERENCE, servingOptions);
const chickFilAOption = (id, description, nutrients, amount = 1) => officialOption(chickFilA.id, id, description, nutrients, amount, CHICK_FIL_A_SOURCE, CHICK_FIL_A_REFERENCE);
const chickFilAFoods = [
  chickFilAFood("chicken-sandwich", "Chick-fil-A\u00ae Chicken Sandwich", "1 sandwich (183 g)", { calories: 420, protein: 29, carbohydrates: 41, fat: 18, sodium: 1460 }),
  chickFilAFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich (188 g)", { calories: 450, protein: 28, carbohydrates: 45, fat: 19, sodium: 1730 }),
  chickFilAFood("deluxe-sandwich-american", "Chick-fil-A\u00ae Deluxe Sandwich w/ American", "1 sandwich (247 g)", { calories: 490, protein: 32, carbohydrates: 43, fat: 22, sodium: 1700 }),
  chickFilAFood("nuggets", "Chick-fil-A\u00ae Nuggets", null, null, [
    chickFilAOption("nuggets:8-count", "8 count (113 g)", { calories: 250, protein: 27, carbohydrates: 11, fat: 11, sodium: 1210 }, 8),
    chickFilAOption("nuggets:12-count", "12 count (170 g)", { calories: 380, protein: 40, carbohydrates: 16, fat: 17, sodium: 1820 }, 12),
  ]),
  chickFilAFood("grilled-nuggets", "Grilled Nuggets", null, null, [
    chickFilAOption("grilled-nuggets:8-count", "8 count (95 g)", { calories: 130, protein: 25, carbohydrates: 1, fat: 3, sodium: 440 }, 8),
    chickFilAOption("grilled-nuggets:12-count", "12 count (142 g)", { calories: 200, protein: 38, carbohydrates: 2, fat: 4.5, sodium: 660 }, 12),
  ]),
  chickFilAFood("chick-n-strips", "Chick-fil-A Chick-n-Strips\u00ae", "3 count (136 g)", { calories: 310, protein: 29, carbohydrates: 16, fat: 14, sodium: 870 }),
  chickFilAFood("waffle-potato-fries", "Chick-fil-A Waffle Potato Fries\u00ae", null, null, [
    chickFilAOption("waffle-potato-fries:small", "Small (96 g)", { calories: 320, protein: 4, carbohydrates: 35, fat: 19, sodium: 190 }),
    chickFilAOption("waffle-potato-fries:medium", "Medium (125 g)", { calories: 420, protein: 5, carbohydrates: 45, fat: 24, sodium: 240 }),
    chickFilAOption("waffle-potato-fries:large", "Large (179 g)", { calories: 600, protein: 7, carbohydrates: 65, fat: 35, sodium: 340 }),
  ]),
  chickFilAFood("mac-and-cheese", "Mac & Cheese", "Medium (227 g)", { calories: 450, protein: 20, carbohydrates: 28, fat: 29, sodium: 1190 }),
  chickFilAFood("chicken-biscuit", "Chick-fil-A\u00ae Chicken Biscuit", "1 biscuit (153 g)", { calories: 460, protein: 19, carbohydrates: 45, fat: 23, sodium: 1510 }),
  chickFilAFood("chick-n-minis", "Chick-fil-A Chick-n-Minis\u00ae", "4 count (127 g)", { calories: 360, protein: 20, carbohydrates: 41, fat: 13, sodium: 1060 }),
  chickFilAFood("hash-browns", "Hash Browns", "1 small order (77 g)", { calories: 270, protein: 3, carbohydrates: 23, fat: 18, sodium: 440 }),
  chickFilAFood("chick-fil-a-sauce", "Chick-fil-A\u00ae Sauce", "1 packet (28 g)", { calories: 140, protein: 0, carbohydrates: 6, fat: 13, sodium: 170 }),
  chickFilAFood("polynesian-sauce", "Polynesian Sauce", "1 packet (28 g)", { calories: 110, protein: 0, carbohydrates: 14, fat: 6, sodium: 210 }),
  chickFilAFood("barbeque-sauce", "Barbeque Sauce", "1 packet (28 g)", { calories: 45, protein: 0, carbohydrates: 11, fat: 0, sodium: 200 }),
];

const whataburger = { id: "whataburger", name: "Whataburger" };
const WHATABURGER_REFERENCE = "Whataburger official menu/app; default recipe nutrition displayed for the current national menu";
const whataburgerFood = (id, name, description, nutrients, servingOptions) => officialFood(whataburger, id, name, description, nutrients, WHATABURGER_SOURCE, WHATABURGER_REFERENCE, servingOptions);
const whataburgerOption = (id, description, nutrients) => officialOption(whataburger.id, id, description, nutrients, 1, WHATABURGER_SOURCE, WHATABURGER_REFERENCE);
const whataburgerFoods = [
  whataburgerFood("whataburger", "Whataburger\u00ae", "1 burger", { calories: 590, protein: 29, carbohydrates: 62, fat: 25, sodium: 1220 }),
  whataburgerFood("double-meat-whataburger", "Double Meat Whataburger\u00ae", "1 burger", { calories: 835, protein: 47, carbohydrates: 62, fat: 44, sodium: 1470 }),
  whataburgerFood("triple-meat-whataburger", "Triple Meat Whataburger\u00ae", "1 burger", { calories: 1075, protein: 65, carbohydrates: 62, fat: 63, sodium: 1720 }),
  whataburgerFood("bacon-and-cheese-whataburger", "Bacon & Cheese Whataburger\u00ae", "1 burger", { calories: 750, protein: 39, carbohydrates: 62, fat: 37, sodium: 1910 }),
  whataburgerFood("jalapeno-and-cheese-whataburger", "Jalape\u00f1o & Cheese Whataburger\u00ae", "1 burger", { calories: 680, protein: 34, carbohydrates: 63, fat: 32, sodium: 1800 }),
  whataburgerFood("whataburger-jr", "Whataburger Jr.\u00ae", "1 burger", { calories: 310, protein: 14, carbohydrates: 36, fat: 11, sodium: 580 }),
  { ...whataburgerFood("premium-whatachickn-sandwich", "Premium Whatachick'n Sandwich", "1 sandwich", { calories: 515, protein: 33, carbohydrates: 66, fat: 14, sodium: 1860 }), searchAliases: ["Whata chicken sandwich", "Whatachick'n Sandwich"] },
  whataburgerFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich", { calories: 545, protein: 31, carbohydrates: 55, fat: 23, sodium: 1490 }),
  whataburgerFood("whatachickn-strips", "Whatachick'n\u00ae Strips", "3 piece serving", { calories: 550, protein: 25, carbohydrates: 40, fat: 32, sodium: 1370 }),
  whataburgerFood("honey-butter-chicken-biscuit", "Honey Butter Chicken Biscuit", "1 biscuit", { calories: 570, protein: 15, carbohydrates: 50, fat: 36, sodium: 1000 }),
  whataburgerFood("breakfast-on-a-bun-sausage", "Breakfast on a Bun\u00ae with Sausage", "1 sandwich", { calories: 525, protein: 26, carbohydrates: 34, fat: 32, sodium: 1190 }),
  whataburgerFood("taquito-with-cheese-sausage", "Taquito with Cheese - Sausage", "1 taquito", { calories: 435, protein: 19, carbohydrates: 28, fat: 26, sodium: 1050 }),
  whataburgerFood("french-fries", "French Fries", null, null, [
    whataburgerOption("french-fries:small", "Small French Fries", { calories: 280, protein: 3, carbohydrates: 35, fat: 14, sodium: 170 }),
    whataburgerOption("french-fries:medium", "Medium French Fries", { calories: 420, protein: 5, carbohydrates: 52, fat: 21, sodium: 260 }),
    whataburgerOption("french-fries:large", "Large French Fries", { calories: 560, protein: 7, carbohydrates: 70, fat: 28, sodium: 350 }),
  ]),
  whataburgerFood("onion-rings", "Onion Rings", "Medium Onion Rings", { calories: 300, protein: 4, carbohydrates: 32, fat: 17, sodium: 430 }),
  whataburgerFood("hash-brown-sticks", "Hash Brown Sticks", "1 order", { calories: 190, protein: 2, carbohydrates: 21, fat: 11, sodium: 500 }),
];

const restaurantFoods = [
  mcnuggets,
  foodRecord("big-mac", "Big Mac", "big-mac", 580, { protein: 25, carbohydrates: 45, fat: 34, sodium: 1060 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  foodRecord("mcdouble", "McDouble", "mcdouble", 390, { protein: 22, carbohydrates: 32, fat: 20, sodium: 920 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:mcdouble:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 390-calorie McDouble; supplied audit" }),
  foodRecord("double-cheeseburger", "Double Cheeseburger", "double-cheeseburger", 440, { protein: 25, carbohydrates: 34, fat: 24, sodium: 1120 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  foodRecord("quarter-pounder-with-cheese", "Quarter Pounder with Cheese", "quarter-pounder-with-cheese", 520, { protein: 30, carbohydrates: 42, fat: 26, sodium: 1140 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  foodRecord("double-quarter-pounder-with-cheese", "Double Quarter Pounder with Cheese", "double-quarter-pounder-with-cheese", 740, { protein: 48, carbohydrates: 43, fat: 42, sodium: 1360 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  foodRecord("hamburger", "Hamburger", "hamburger", 250, { protein: 12, carbohydrates: 30, fat: 9, sodium: 510 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:hamburger:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 250-calorie Hamburger; supplied audit" }),
  foodRecord("cheeseburger", "Cheeseburger", "cheeseburger", 300, { protein: 15, carbohydrates: 32, fat: 13, sodium: 720 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:cheeseburger:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 300-calorie Cheeseburger; supplied audit" }),
  foodRecord("mcchicken", "McChicken", "mcchicken", 390, { protein: 14, carbohydrates: 38, fat: 21, sodium: 560 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  fries,
  foodRecord("egg-mcmuffin", "Egg McMuffin", "egg-mcmuffin", 310, { protein: 17, carbohydrates: 30, fat: 13, sodium: 770 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:egg-mcmuffin:trusted-recent-calorie-match", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceUrl: "https://www.mcdonalds.com/us/en-us/product/egg-mcmuffin.html", sourceReference: "Recent trusted third-party source matching McDonald’s current official 310-calorie U.S. item; supplied audit" }),
  foodRecord("sausage-mcmuffin-with-egg", "Sausage McMuffin with Egg", "sausage-mcmuffin-with-egg", 480, { protein: 20, carbohydrates: 30, fat: 31, sodium: 830 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:sausage-mcmuffin-with-egg:trusted-recent-calorie-match", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceUrl: "https://www.mcdonalds.com/us/en-us/product/sausage-mcmuffin-with-egg.html", sourceReference: "Recent trusted third-party source matching McDonald’s current official 480-calorie U.S. item; supplied audit" }),
  foodRecord("sausage-mcmuffin", "Sausage McMuffin", "sausage-mcmuffin", 400, { protein: 14, carbohydrates: 29, fat: 25, sodium: 760 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:sausage-mcmuffin:trusted-current", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted current nutrition source matched to current official 400-calorie item; supplied audit" }),
  foodRecord("sausage-biscuit-with-egg", "Sausage Biscuit with Egg", "sausage-biscuit-with-egg", 530, { protein: 17, carbohydrates: 38, fat: 35, sodium: 1190 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:sausage-biscuit-with-egg:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 530-calorie item; supplied audit" }),
  foodRecord("sausage-and-cheese-biscuit", "Sausage and Cheese Biscuit", "biscuit-sausage-and-cheese", 510, { protein: 13, carbohydrates: 38, fat: 34, sodium: 1300 }, "1 sandwich", { status: "complete", sourceType: "official-restaurant" }),
  foodRecord("bacon-egg-cheese-biscuit", "Bacon, Egg & Cheese Biscuit", "bacon-egg-cheese-biscuit", 460, { protein: 17, carbohydrates: 39, fat: 26, sodium: 1330 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:bacon-egg-cheese-biscuit:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 460-calorie item; supplied audit" }),
  foodRecord("bacon-egg-cheese-mcgriddles", "Bacon, Egg & Cheese McGriddles", "bacon-egg-cheese-mcgriddles", 430, { protein: 17, carbohydrates: 44, fat: 21, sodium: 1230 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:bacon-egg-cheese-mcgriddles:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 430-calorie item; supplied audit" }),
  foodRecord("sausage-mcgriddles", "Sausage McGriddles", "sausage-mcgriddles", 430, { protein: 11, carbohydrates: 41, fat: 24, sodium: 990 }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:sausage-mcgriddles:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 430-calorie item; supplied audit" }),
  foodRecord("sausage-egg-cheese-mcgriddles", "Sausage, Egg & Cheese McGriddles", "sausage-egg-cheese-mcgriddles", 550, { protein: 19, carbohydrates: 44, fat: 33, sodium: null }, "1 sandwich", { source: "trusted-third-party", sourceId: "mcdonalds:sausage-egg-cheese-mcgriddles:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 550-calorie item; sodium intentionally unresolved per supplied audit" }),
  foodRecord("hotcakes", "Hotcakes", "hotcakes", 580, { protein: 9, carbohydrates: 102, fat: 15, sodium: 530 }, "3 hotcakes with butter and syrup", { source: "trusted-third-party", sourceId: "mcdonalds:hotcakes:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 580-calorie item; supplied audit" }),
  foodRecord("hotcakes-and-sausage", "Hotcakes and Sausage", "hotcakes-and-sausage", 770, { protein: 15, carbohydrates: 102, fat: 33, sodium: 810 }, "3 hotcakes with sausage, butter and syrup", { source: "trusted-third-party", sourceId: "mcdonalds:hotcakes-and-sausage:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 770-calorie item; supplied audit" }),
  foodRecord("big-breakfast", "Big Breakfast", "big-breakfast", 760, { protein: 26, carbohydrates: 57, fat: 48, sodium: 1530 }, "1 serving", { source: "trusted-third-party", sourceId: "mcdonalds:big-breakfast:trusted-current", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted current nutrition source matched to current official 760-calorie item; supplied audit" }),
  foodRecord("big-breakfast-with-hotcakes", "Big Breakfast with Hotcakes", "big-breakfast-with-hotcakes", 1340, { protein: 36, carbohydrates: 158, fat: 63, sodium: 2070 }, "1 serving", { source: "trusted-third-party", sourceId: "mcdonalds:big-breakfast-with-hotcakes:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 1340-calorie item; supplied audit" }),
  foodRecord("hash-browns", "Hash Browns", "hash-browns", 140, { protein: 2, carbohydrates: 18, fat: 8, sodium: 310 }, "1 hash brown patty", { source: "trusted-third-party", sourceId: "mcdonalds:hash-browns:trusted-2026", confidence: "trusted-source", status: "complete", sourceType: "trusted-third-party", sourceReference: "Trusted 2026 source matched to current official 140-calorie Hash Browns; supplied audit" }),
  cocaCola,
  ...sonicFoods,
  ...braumsFoods,
  ...tacoBellFoods,
  ...chickFilAFoods,
  ...whataburgerFoods,
];

export default restaurantFoods;
