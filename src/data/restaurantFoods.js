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
const CATALOG_EXPANSION_CHECKED_AT = "2026-09-09";
const CURRENT_EXPANSION_CHECKED_AT = "2026-09-10";

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

function officialFood(chain, id, name, description, nutrients, sourceUrl, sourceReference, servingOptions, verification = {}) {
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
        status: verification.status || "complete",
        sourceType: verification.sourceType || "official-restaurant",
        sourceUrl,
        accessedAt: verification.accessedAt || SOURCE_CHECKED_AT,
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
const sonicExpansionFood = (id, name, description, nutrients, sourceReference) => officialFood(
  sonic,
  id,
  name,
  description,
  nutrients,
  SONIC_SOURCE,
  sourceReference,
  undefined,
  { accessedAt: CATALOG_EXPANSION_CHECKED_AT }
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
  sonicExpansionFood("original-sonic-smasher-double", "Original SONIC Smasher\u2122 (Double)", "1 double burger: two Angus beef patties, two American cheese slices, Smasher sauce, pickles and diced onions on a potato bun", { calories: 600, protein: 35, carbohydrates: 30, fat: 37, sodium: 1530 }, "SONIC August 2026 National Nutritional Brochure; current standard double recipe"),
  sonicExpansionFood("all-american-sonic-smasher-double", "All-American SONIC Smasher\u2122 (Double)", "1 double burger: two Angus beef patties, two American cheese slices, ketchup, mustard, pickles and diced onions on a potato bun", { calories: 610, protein: 35, carbohydrates: 32, fat: 37, sodium: 1650 }, "SONIC August 2026 National Nutritional Brochure; current standard double recipe"),
  sonicExpansionFood("jr-bacon-cheeseburger", "Jr Bacon Cheeseburger", "1 junior burger: beef patty, American cheese, bacon, pickles, ketchup and mustard on a toasted bun", { calories: 400, protein: 17, carbohydrates: 27, fat: 26, sodium: 1440 }, "SONIC August 2026 National Nutritional Brochure; current standard recipe"),
  sonicExpansionFood("grilled-cheese-sandwich", "Grilled Cheese Sandwich", "1 sandwich: American cheese on grilled Texas toast", { calories: 390, protein: 13, carbohydrates: 42, fat: 20, sodium: 1130 }, "SONIC August 2026 National Nutritional Brochure; standard sandwich recipe"),
  sonicExpansionFood("chili-cheese-coney", "Chili Cheese Coney", "1 coney: beef hot dog, chili and shredded cheddar cheese in a bakery bun", { calories: 470, protein: 18, carbohydrates: 34, fat: 29, sodium: 1200 }, "SONIC August 2026 National Nutritional Brochure; standard coney recipe"),
  sonicExpansionFood("breakfast-toaster-bacon", "Bacon BREAKFAST TOASTER\u00ae", "1 sandwich: bacon, eggs and American cheese on Texas toast", { calories: 470, protein: 22, carbohydrates: 42, fat: 24, sodium: 1940 }, "SONIC August 2026 National Nutritional Brochure; bacon standard recipe"),
  sonicExpansionFood("breakfast-toaster-sausage", "Sausage BREAKFAST TOASTER\u00ae", "1 sandwich: sausage, eggs and American cheese on Texas toast", { calories: 570, protein: 23, carbohydrates: 42, fat: 34, sodium: 1960 }, "SONIC August 2026 National Nutritional Brochure; sausage standard recipe"),
  sonicExpansionFood("french-toast-sticks-4-without-syrup", "French Toast Sticks", "4 sticks without syrup", { calories: 480, protein: 8, carbohydrates: 54, fat: 25, sodium: 460 }, "SONIC August 2026 National Nutritional Brochure; 4-piece value explicitly excludes syrup"),
  sonicExpansionFood("supersonic-breakfast-burrito", "SuperSONIC\u00ae Breakfast Burrito", "1 burrito: sausage, eggs, cheese, tots, onions, tomatoes and jalape\u00f1os", { calories: 590, protein: 24, carbohydrates: 49, fat: 33, sodium: 1770 }, "SONIC August 2026 National Nutritional Brochure; current standard recipe"),
  sonicExpansionFood("ultimate-meat-cheese-breakfast-burrito", "Ultimate Meat & Cheese Breakfast Burrito\u2122", "1 burrito: sausage, bacon, eggs, cheese, tots and cheese sauce", { calories: 820, protein: 29, carbohydrates: 47, fat: 56, sodium: 2190 }, "SONIC August 2026 National Nutritional Brochure; current standard recipe"),
];

const braums = { id: "braums", name: "Braum's" };
const BRAUMS_REFERENCE = "2018 Nutritional Chart (for web), still linked by Braum's current website; current-menu identity checked 2026-08-18";
const braumsFood = (id, name, description, nutrients, servingOptions) => officialFood(braums, id, name, description, nutrients, BRAUMS_SOURCE, BRAUMS_REFERENCE, servingOptions);
const braumsOption = (id, description, nutrients, amount = 1) => officialOption(braums.id, id, description, nutrients, amount, BRAUMS_SOURCE, BRAUMS_REFERENCE);
const braumsExpansionFood = (id, name, description, nutrients, sourceReference) => officialFood(
  braums,
  id,
  name,
  description,
  nutrients,
  BRAUMS_SOURCE,
  sourceReference,
  undefined,
  { accessedAt: CATALOG_EXPANSION_CHECKED_AT }
);

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
  braumsExpansionFood("quarter-lb-bacon-cheeseburger", "Quarter lb. Bacon Cheeseburger", "1 standard burger (273 g) with a quarter-pound beef patty, cheese and bacon", { calories: 630, protein: 36, carbohydrates: 40, fat: 36, sodium: 1720 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; burger-menu identity checked 2026-09-09"),
  { ...braumsExpansionFood("jalapeno-pepper-jack-cheeseburger", "Jalape\u00f1o Pepper Jack Cheeseburger", "1 standard burger (275 g) with a beef patty, pepper jack cheese and jalape\u00f1os", { calories: 640, protein: 37, carbohydrates: 38, fat: 38, sodium: 1190 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; burger-menu identity checked 2026-09-09"), searchAliases: ["Jalapeno Pepper Jack Cheeseburger"] },
  braumsExpansionFood("sixth-lb-junior-cheeseburger", "Sixth lb. Junior Cheeseburger", "1 standard junior cheeseburger (149 g)", { calories: 390, protein: 20, carbohydrates: 37, fat: 18, sodium: 1230 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; burger-menu identity checked 2026-09-09"),
  braumsExpansionFood("double-junior-cheeseburger", "Double Junior Cheeseburger", "1 standard double junior cheeseburger (196 g)", { calories: 520, protein: 32, carbohydrates: 37, fat: 27, sodium: 1260 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; combo-menu identity checked 2026-09-09"),
  braumsExpansionFood("chicken-club-sandwich-crispy", "Chicken Club Sandwich Crispy", "1 crispy chicken club sandwich (340 g) with bacon and cheese", { calories: 800, protein: 40, carbohydrates: 63, fat: 43, sodium: 2010 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; chicken-menu identity checked 2026-09-09"),
  braumsExpansionFood("chicken-club-sandwich-grilled", "Chicken Club Sandwich Grilled", "1 grilled chicken club sandwich (326 g) with bacon and cheese", { calories: 640, protein: 45, carbohydrates: 41, fat: 34, sodium: 2050 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; chicken-menu identity checked 2026-09-09"),
  braumsExpansionFood("bowl-of-chili", "Bowl of Chili", "1 bowl (425 g), without cheese or sour cream", { calories: 420, protein: 27, carbohydrates: 45, fat: 15, sodium: 1050 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; current Chili with Beans identity checked 2026-09-09"),
  braumsExpansionFood("biscuit-sausage-egg-cheese", "Biscuit with Sausage, Egg & Cheese", "1 biscuit sandwich (199 g): sausage, egg and cheese", { calories: 600, protein: 23, carbohydrates: 34, fat: 39, sodium: 1470 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; breakfast-menu identity checked 2026-09-09"),
  braumsExpansionFood("english-muffin-ham-egg-cheese", "English Muffin with Ham, Egg & Cheese", "1 English muffin sandwich (160 g): ham, egg and cheese", { calories: 330, protein: 21, carbohydrates: 27, fat: 16, sodium: 600 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; breakfast-menu identity checked 2026-09-09"),
  braumsExpansionFood("plain-bagel-bacon-egg-cheese", "Plain Bagel with Bacon, Egg & Cheese", "1 plain bagel sandwich (156 g): bacon, egg and cheese", { calories: 400, protein: 21, carbohydrates: 38, fat: 18, sodium: 890 }, "Braum's official 2018 Nutritional Chart, still linked by the current website; breakfast-menu identity checked 2026-09-09"),
];

const TACO_BELL_SOURCE = "https://www.tacobell.com/nutrition/info";
const CHICK_FIL_A_SOURCE = "https://www.chick-fil-a.com/nutrition-allergens";
const WHATABURGER_SOURCE = "https://whataburger.com/menu";

const tacoBell = { id: "taco-bell", name: "Taco Bell" };
const tacoBellFood = (id, name, description, nutrients) => officialFood(tacoBell, id, name, description, nutrients, TACO_BELL_SOURCE, "Taco Bell Full Nutrition Info; displayed values from the nutrition menu embedded by Taco Bell");
const tacoBellExpansionFood = (id, name, description, calories, sourceUrl, sourceReference) => officialFood(
  tacoBell,
  id,
  name,
  description,
  { calories, protein: null, carbohydrates: null, fat: null, sodium: null },
  sourceUrl,
  `${sourceReference}; the current item page publishes calories and standard components, while full nutrient values were unavailable from Taco Bell's nutrition endpoint`,
  undefined,
  { status: "partial", accessedAt: CATALOG_EXPANSION_CHECKED_AT }
);
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
  tacoBellExpansionFood("crunchy-taco-supreme", "Crunchy Taco Supreme\u00ae", "1 taco: crunchy shell, seasoned beef, reduced-fat sour cream, lettuce, tomatoes and cheddar cheese", 190, "https://www.tacobell.com/food/tacos/crunchy-taco-supreme", "Taco Bell current U.S. Crunchy Taco Supreme item page"),
  tacoBellExpansionFood("soft-taco-supreme", "Soft Taco Supreme\u00ae", "1 taco: flour tortilla, seasoned beef, reduced-fat sour cream, lettuce, tomatoes and cheddar cheese", 200, "https://www.tacobell.com/food/tacos/soft-taco-supreme", "Taco Bell current U.S. Soft Taco Supreme item page"),
  tacoBellExpansionFood("nacho-cheese-doritos-locos-tacos-supreme", "Nacho Cheese Doritos\u00ae Locos Tacos Supreme\u00ae", "1 taco: Nacho Cheese Doritos shell, seasoned beef, reduced-fat sour cream, lettuce, tomatoes and cheddar cheese", 190, "https://www.tacobell.com/food/tacos/nacho-cheese-doritos-locos-tacos-supreme", "Taco Bell current U.S. Nacho Cheese Doritos Locos Tacos Supreme item page"),
  tacoBellExpansionFood("spicy-potato-soft-taco", "Spicy Potato Soft Taco", "1 taco: flour tortilla, seasoned potatoes, chipotle sauce, lettuce and cheddar cheese", 240, "https://www.tacobell.com/food/luxe-value-menu/spicy-potato-soft-taco", "Taco Bell current U.S. Spicy Potato Soft Taco item page"),
  tacoBellExpansionFood("cheesy-bean-and-rice-burrito", "Cheesy Bean and Rice Burrito", "1 burrito: flour tortilla, beans, seasoned rice, nacho cheese sauce and creamy jalape\u00f1o sauce", 400, "https://www.tacobell.com/food/burritos/cheesy-bean-and-rice-burrito", "Taco Bell current U.S. Cheesy Bean and Rice Burrito item page"),
  tacoBellExpansionFood("cheesy-roll-up", "Cheesy Roll Up", "1 roll up: flour tortilla with melted mozzarella, pepper jack and cheddar cheeses", 170, "https://www.tacobell.com/food/sides/cheesy-roll-up", "Taco Bell current U.S. Cheesy Roll Up item page"),
  tacoBellExpansionFood("chips-and-nacho-cheese-sauce", "Chips and Nacho Cheese Sauce", "1 order: tortilla chips with one side of nacho cheese sauce", 220, "https://www.tacobell.com/food/sides-sweets/chips-and-nacho-cheese-sauce", "Taco Bell current U.S. Chips and Nacho Cheese Sauce item page"),
  tacoBellExpansionFood("black-beans-and-rice", "Black Beans and Rice", "1 order: slow-simmered black beans with seasoned rice", 160, "https://www.tacobell.com/food/sides-sweets/black-beans-and-rice", "Taco Bell current U.S. Black Beans and Rice item page"),
  tacoBellExpansionFood("cinnabon-delights-2-pack", "Cinnabon Delights\u00ae 2 Pack", "2 pastries with Cinnabon frosting filling and cinnamon-sugar coating", 170, "https://www.tacobell.com/food/sides-sweets/cinnabon-delights-2-pack", "Taco Bell current U.S. Cinnabon Delights 2 Pack item page"),
  tacoBellExpansionFood("black-bean-crunchwrap-supreme", "Black Bean Crunchwrap Supreme\u00ae", "1 Crunchwrap: flour tortilla, black beans, nacho cheese sauce, tostada shell, lettuce, tomatoes and reduced-fat sour cream", 520, "https://www.tacobell.com/food/specialties/black-bean-crunchwrap-supreme", "Taco Bell current U.S. Black Bean Crunchwrap Supreme item page"),
];

const chickFilA = { id: "chick-fil-a", name: "Chick-fil-A" };
const CHICK_FIL_A_REFERENCE = "Chick-fil-A Nutrition & Allergens guide";
const chickFilAFood = (id, name, description, nutrients, servingOptions) => officialFood(chickFilA, id, name, description, nutrients, CHICK_FIL_A_SOURCE, CHICK_FIL_A_REFERENCE, servingOptions);
const chickFilAOption = (id, description, nutrients, amount = 1) => officialOption(chickFilA.id, id, description, nutrients, amount, CHICK_FIL_A_SOURCE, CHICK_FIL_A_REFERENCE);
const chickFilAExpansionFood = (id, name, description, nutrients, sourceReference) => officialFood(
  chickFilA,
  id,
  name,
  description,
  nutrients,
  CHICK_FIL_A_SOURCE,
  sourceReference,
  undefined,
  { accessedAt: CATALOG_EXPANSION_CHECKED_AT }
);
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
  chickFilAExpansionFood("grilled-chicken-sandwich", "Grilled Chicken Sandwich", "1 sandwich (206 g): grilled chicken, lettuce and tomato on a multigrain bun; sauce packet not included", { calories: 390, protein: 28, carbohydrates: 45, fat: 11, sodium: 765 }, "Chick-fil-A Nutrition & Allergens guide; standard sandwich recipe without the separately packaged Honey Roasted BBQ Sauce"),
  chickFilAExpansionFood("grilled-chicken-club-colby-jack", "Grilled Chicken Club Sandwich w/ Colby Jack", "1 sandwich (237 g): grilled chicken, Colby Jack cheese, bacon, lettuce and tomato on a multigrain bun; sauce packet not included", { calories: 520, protein: 37, carbohydrates: 45, fat: 22, sodium: 1055 }, "Chick-fil-A Nutrition & Allergens guide; Colby Jack standard recipe without the separately packaged Honey Roasted BBQ Sauce"),
  chickFilAExpansionFood("cool-wrap", "Chick-fil-A Cool Wrap\u00ae", "1 wrap (231 g): sliced grilled chicken, green leaf lettuce and Monterey Jack/Cheddar in a flaxseed flatbread; dressing not included", { calories: 660, protein: 43, carbohydrates: 32, fat: 45, sodium: 1420 }, "Chick-fil-A Nutrition & Allergens guide; wrap only, dressing listed separately"),
  chickFilAExpansionFood("spicy-deluxe-sandwich-pepper-jack", "Spicy Deluxe Sandwich w/ Pepper Jack", "1 sandwich (259 g): spicy chicken, Pepper Jack cheese, lettuce, tomato and pickles on a toasted bun", { calories: 540, protein: 34, carbohydrates: 47, fat: 26, sodium: 1880 }, "Chick-fil-A Nutrition & Allergens guide; Pepper Jack standard recipe"),
  chickFilAExpansionFood("egg-white-grill", "Egg White Grill", "1 sandwich (172 g): grilled chicken, egg whites and American cheese on an English muffin", { calories: 300, protein: 27, carbohydrates: 29, fat: 8, sodium: 990 }, "Chick-fil-A Nutrition & Allergens guide; standard breakfast recipe"),
  chickFilAExpansionFood("hash-brown-scramble-bowl-nuggets", "Hash Brown Scramble Bowl with Nuggets", "1 bowl (233 g): nuggets, hash browns, scrambled eggs and Monterey Jack/Cheddar; salsa packet not included", { calories: 470, protein: 29, carbohydrates: 19, fat: 30, sodium: 1350 }, "Chick-fil-A Nutrition & Allergens guide; bowl only, Jalape\u00f1o Salsa packet listed separately"),
  chickFilAExpansionFood("honey-roasted-bbq-sauce", "Honey Roasted BBQ Sauce", "1 packet (12 g)", { calories: 60, protein: 0, carbohydrates: 3, fat: 5, sodium: 75 }, "Chick-fil-A Nutrition & Allergens guide; one separately packaged sauce packet"),
  chickFilAExpansionFood("zesty-buffalo-sauce", "Zesty Buffalo Sauce", "1 container (21 g)", { calories: 25, protein: 0, carbohydrates: 1, fat: 2.5, sodium: 570 }, "Chick-fil-A Nutrition & Allergens guide; one sauce container"),
  chickFilAExpansionFood("sweet-spicy-sriracha-sauce", "Sweet & Spicy Sriracha Sauce", "1 packet (28 g)", { calories: 45, protein: 0, carbohydrates: 11, fat: 0, sodium: 380 }, "Chick-fil-A Nutrition & Allergens guide; one separately packaged sauce packet"),
  chickFilAExpansionFood("garden-herb-ranch-sauce", "Garden Herb Ranch Sauce", "1 container (21 g)", { calories: 100, protein: 0, carbohydrates: 1, fat: 11, sodium: 170 }, "Chick-fil-A Nutrition & Allergens guide; one sauce container"),
];

const mcdonalds = { id: "mcdonalds", name: "McDonald's" };
const MCDONALDS_PARTIAL_REFERENCE = "McDonald's current official US product page; page-published calories and listed standard components. The site's nutrition notice is dated January 2022 unless otherwise stated; detailed nutrient values were unavailable in the accessible page response, so they remain unknown";
const mcdonaldsPartialFood = (id, name, description, calories, sourceUrl) => officialFood(
  mcdonalds,
  id,
  name,
  description,
  { calories, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null },
  sourceUrl,
  MCDONALDS_PARTIAL_REFERENCE,
  undefined,
  { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const mcdonaldsExpansionFoods = [
  officialFood(
    mcdonalds,
    "surf-and-turf",
    "Surf And Turf",
    "1 sandwich: regular bun, fish filet patty, beef patty, one American cheese slice plus one half slice, tartar sauce, pickles, ketchup, onions and mustard",
    { calories: 830, protein: 41, carbohydrates: 73, fat: 42, sodium: 1710, fiber: 3, totalSugar: 12, addedSugar: 8 },
    "https://www.mcdonalds.com/us/en-us/product/surf-and-turf.html",
    "McDonald's official US product page; complete nutrition summary and all 10 listed components",
    undefined,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  ),
  mcdonaldsPartialFood("filet-o-fish", "Filet-O-Fish\u00ae", "1 sandwich: crispy wild-caught Alaskan Pollock filet, American cheese and tartar sauce on a steamed bun", 380, "https://www.mcdonalds.com/us/en-us/product/filet-o-fish.html"),
  mcdonaldsPartialFood("double-filet-o-fish", "Double Filet-O-Fish\u00ae", "1 sandwich: two crispy wild-caught Alaskan Pollock filets, American cheese and tartar sauce on a steamed bun", 530, "https://www.mcdonalds.com/us/en-us/product/double-filet-o-fish.html"),
  mcdonaldsPartialFood("mccrispy", "McCrispy\u00ae", "1 sandwich: southern-style fried chicken filet and crinkle-cut pickles on a toasted, buttered potato roll", 470, "https://www.mcdonalds.com/us/en-us/product/mccrispy-chicken-sandwich.html"),
  mcdonaldsPartialFood("spicy-mccrispy", "Spicy McCrispy\u00ae", "1 sandwich: southern-style fried chicken filet and Spicy Pepper Sauce on a toasted potato roll", 530, "https://www.mcdonalds.com/us/en-us/product/spicy-mccrispy-chicken-sandwich.html"),
  mcdonaldsPartialFood("hot-n-spicy-mcchicken", "Hot 'n Spicy McChicken\u00ae", "1 sandwich: seasoned chicken patty, shredded lettuce and mayonnaise on a toasted bun", 390, "https://www.mcdonalds.com/us/en-us/product/hot-n-spicy-mcchicken.html"),
  mcdonaldsPartialFood("spicy-snack-wrap", "Spicy Snack Wrap\u00ae", "1 wrap: one McCrispy Strip, shredded cheese, lettuce and Spicy Pepper Sauce in a soft flour tortilla", 390, "https://www.mcdonalds.com/us/en-us/product/spicy-snack-wrap.html"),
  mcdonaldsPartialFood("ranch-snack-wrap", "Ranch Snack Wrap\u00ae", "1 wrap: one McCrispy Strip, shredded cheese, lettuce and ranch sauce in a soft flour tortilla", 400, "https://www.mcdonalds.com/us/en-us/product/ranch-snack-wrap.html"),
  mcdonaldsPartialFood("sausage-burrito", "Sausage Burrito", "1 breakfast burrito: scrambled egg, pork sausage, cheese, green chiles and onion in a soft flour tortilla", 310, "https://www.mcdonalds.com/us/en-us/product/sausage-burrito.html"),
  mcdonaldsPartialFood("fruit-maple-oatmeal", "Fruit & Maple Oatmeal", "1 serving: whole-grain oats with cream, brown sugar, red and green apples, cranberries and two varieties of raisins", 320, "https://www.mcdonalds.com/us/en-us/product/fruit-maple-oatmeal.html"),
];

const wendys = { id: "wendys", name: "Wendy's" };
const WENDYS_PARTIAL_REFERENCE = "Wendy's official current US item page and national menu calorie listing; the detailed nutrient panel was unavailable in the accessible response, so unpublished nutrients remain unknown";
const wendysFood = (id, name, description, calories, sourceUrl) => officialFood(
  wendys,
  id,
  name,
  description,
  { calories, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null },
  sourceUrl,
  WENDYS_PARTIAL_REFERENCE,
  undefined,
  { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const wendysFoods = [
  wendysFood("daves-single", "Dave's Single®", "1 standard burger: quarter-pound beef patty (pre-cooked weight), American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 560, "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single"),
  wendysFood("baconator", "Baconator®", "1 standard burger: half-pound beef (pre-cooked weight), American cheese, 6 pieces of Applewood smoked bacon, ketchup and mayo on a potato bun", 890, "https://order.wendys.com/us/en/national/menu/hamburgers/baconator"),
  wendysFood("jr-bacon-cheeseburger", "Jr. Bacon Cheeseburger", "1 standard burger: beef patty, Applewood smoked bacon, American cheese, lettuce, tomato and mayo", 350, "https://order.wendys.com/us/en/national/menu/hamburgers/jr-bacon-cheeseburger"),
  wendysFood("classic-chicken-sandwich", "Classic Chicken Sandwich", "1 standard sandwich: crispy chicken breast, lettuce, tomato, mayo and pickles on a potato bun", 550, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/classic-chicken-sandwich"),
  wendysFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 standard sandwich: breaded spicy chicken breast, lettuce, pickles, tomato and mayo on a potato bun", 560, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/spicy-chicken-sandwich"),
  { ...wendysFood("grilled-chicken-ranch-wrap", "Grilled Chicken Ranch Wrap", "1 standard wrap: herb-marinated grilled chicken breast, shredded cheddar, romaine and ranch sauce in a warm tortilla", 420, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/grilled-chicken-wrap"), searchAliases: ["Grilled Chicken Wrap"] },
  wendysFood("10-piece-chicken-nuggets", "10 PC. Chicken Nuggets", "10 breaded all-white-meat chicken nuggets; dipping sauce is selected separately and is not included in this record", 430, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/10-pc-chicken-nuggets"),
  wendysFood("plain-baked-potato", "Plain Baked Potato", "1 plain baked potato with no toppings", 270, "https://order.wendys.com/us/en/national/menu/fries-sides/plain-baked-potato"),
  wendysFood("apple-bites", "Apple Bites", "1 side of sliced apple pieces", 35, "https://order.wendys.com/us/en/national/menu/fries-sides/apple-bites"),
  wendysFood("breakfast-baconator", "Breakfast Baconator®", "1 standard breakfast sandwich: grilled sausage, American cheese, Applewood smoked bacon, egg and Swiss cheese sauce on a potato bun", 630, "https://order.wendys.com/us/en/national/menu/classics/breakfast-baconator"),
];

const burgerKing = { id: "burger-king", name: "Burger King" };
const BURGER_KING_SOURCE = "https://origin.bk.com/pdfs/nutrition.pdf";
const BURGER_KING_REFERENCE = "Burger King USA Nutritionals: Core, Regional and Limited Time Offerings, April 2020; still published by Burger King when accessed. The chart identifies each standard item and serving weight but does not enumerate its components. Burger King's March 17, 2026 help guidance points to its Nutrition Explorer for the newest values, but that detailed explorer response was inaccessible, so this record uses the older official chart without combining sources. Burger King also announced February 2026 Whopper recipe refinements (https://news.bk.com/blog-posts/burger-king-elevates-its-most-iconic-product-the-whopper-r), adding formulation uncertainty to Whopper-family values";
const burgerKingFood = (id, name, description, nutrients) => officialFood(
  burgerKing,
  id,
  name,
  description,
  { ...nutrients, addedSugar: null },
  BURGER_KING_SOURCE,
  BURGER_KING_REFERENCE,
  undefined,
  { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const burgerKingFoods = [
  burgerKingFood("whopper", "WHOPPER\u00ae Sandwich", "1 standard sandwich (270 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 660, protein: 28, carbohydrates: 49, fat: 40, sodium: 980, fiber: 2, totalSugar: 11 }),
  burgerKingFood("whopper-with-cheese", "WHOPPER\u00ae Sandwich with Cheese", "1 standard sandwich with cheese (292 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 740, protein: 32, carbohydrates: 50, fat: 46, sodium: 1340, fiber: 2, totalSugar: 11 }),
  burgerKingFood("double-whopper", "DOUBLE WHOPPER\u00ae Sandwich", "1 standard double-patty sandwich (354 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 900, protein: 48, carbohydrates: 49, fat: 58, sodium: 1050, fiber: 2, totalSugar: 11 }),
  burgerKingFood("whopper-jr", "WHOPPER JR.\u00ae Sandwich", "1 standard junior sandwich (134 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 310, protein: 13, carbohydrates: 27, fat: 18, sodium: 390, fiber: 1, totalSugar: 7 }),
  burgerKingFood("bacon-king", "BACON KING\u2122 Sandwich", "1 standard sandwich (356 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 1150, protein: 61, carbohydrates: 49, fat: 79, sodium: 2150, fiber: 2, totalSugar: 10 }),
  burgerKingFood("impossible-whopper", "Impossible\u2122 WHOPPER\u00ae Sandwich", "1 standard plant-based sandwich (285 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 630, protein: 25, carbohydrates: 58, fat: 34, sodium: 1080, fiber: 4, totalSugar: 12 }),
  burgerKingFood("original-chicken-sandwich", "Original Chicken Sandwich", "1 standard sandwich (219 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 660, protein: 28, carbohydrates: 48, fat: 40, sodium: 1170, fiber: 2, totalSugar: 5 }),
  burgerKingFood("chicken-fries-9-piece", "Chicken Fries (9 Piece)", "9 Chicken Fries (91 g); dipping sauce is listed separately and is not included", { calories: 280, protein: 13, carbohydrates: 20, fat: 17, sodium: 850, fiber: 1, totalSugar: 1 }),
  burgerKingFood("sausage-egg-cheese-croissanwich", "Sausage, Egg & Cheese CROISSAN'WICH\u00ae", "1 breakfast sandwich (169 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 500, protein: 19, carbohydrates: 30, fat: 33, sodium: 930, fiber: 1, totalSugar: 4 }),
  burgerKingFood("hash-browns-small", "Hash Browns (Small)", "1 small order (84 g), as listed in Burger King's April 2020 US nutrition chart", { calories: 250, protein: 2, carbohydrates: 24, fat: 16, sodium: 580, fiber: 3, totalSugar: 0 }),
];

const subway = { id: "subway", name: "Subway" };
const SUBWAY_SOURCE = "https://media.subway.com/dam/urn:aaid:aem:2278372c-147b-42f2-8edc-7d8d94d1f07e/original/as/us-nutrition-en.pdf";
const subwayFood = (id, name, description, nutrients, menuUrl, discrepancy) => officialFood(
  subway,
  id,
  name,
  description,
  nutrients,
  SUBWAY_SOURCE,
  `Subway January 2026 U.S. Nutrition Information; standard 6-inch recipe checked against the current US menu at ${menuUrl}${discrepancy ? `; ${discrepancy}` : ""}`,
  undefined,
  { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const subwayFoods = [
  subwayFood("steak-philly-6-inch", "Steak Philly (6\")", "1 6-inch sandwich (192 g): steak, American cheese, mayo, green peppers and onions on toasted Artisan Italian bread; no add-ons", { calories: 510, protein: 28, carbohydrates: 43, fat: 25, sodium: 1320, fiber: 2, totalSugar: 5, addedSugar: 3 }, "https://www.subway.com/en-us/restaurant/12822-0/customizer/productsummary/13075/category/sandwiches"),
  subwayFood("grilled-chicken-6-inch", "Grilled Chicken (6\")", "1 6-inch sandwich (247 g): grilled chicken, Monterey cheddar, lettuce, tomatoes, onions and mayo on toasted Artisan Italian bread; no add-ons", { calories: 510, protein: 31, carbohydrates: 43, fat: 24, sodium: 830, fiber: 3, totalSugar: 5, addedSugar: 3 }, "https://www.subway.com/en-us/restaurant/42048-0/customizer/productsummary/12983/category/sandwiches"),
  subwayFood("chicken-bacon-ranch-6-inch", "Chicken & Bacon Ranch (6\")", "1 6-inch sandwich (262 g): rotisserie-style chicken, bacon, Monterey cheddar, Peppercorn Ranch, lettuce, tomatoes and onions on toasted Artisan Italian bread; no add-ons", { calories: 580, protein: 35, carbohydrates: 44, fat: 29, sodium: 1230, fiber: 3, totalSugar: 5, addedSugar: 4 }, "https://www.subway.com/en-us/restaurant/60960-0/customizer/productsummary/13072/category/sandwiches"),
  subwayFood("all-american-club-6-inch", "All American Club® (6\")", "1 6-inch sandwich (242 g): oven-roasted turkey, Black Forest ham, bacon, American cheese, lettuce, tomatoes, onions and mayo on Artisan Italian bread; no add-ons", { calories: 540, protein: 27, carbohydrates: 45, fat: 28, sodium: 1520, fiber: 3, totalSugar: 6, addedSugar: 4 }, "https://www.subway.com/en-us/restaurant/5432-0/customizer/productsummary/13067/category/sandwiches"),
  subwayFood("subway-club-6-inch", "Subway Club® (6\")", "1 6-inch sandwich (263 g): oven-roasted turkey, Black Forest ham, roast beef, American cheese, lettuce, tomatoes, onions and mayo on Hearty Multigrain bread; no add-ons", { calories: 500, protein: 31, carbohydrates: 43, fat: 24, sodium: 1520, fiber: 4, totalSugar: 8, addedSugar: 5 }, "https://www.subway.com/en-us/restaurant/201-0/customizer/productsummary/13065/category/sandwiches"),
  { ...subwayFood("bmt-6-inch", "B.M.T.\u00ae (6\")", "1 6-inch sandwich (240 g): pepperoni, Genoa salami, ham, provolone, lettuce, tomatoes, onions and mayo on Artisan Italian bread; no add-ons", { calories: 610, protein: 27, carbohydrates: 44, fat: 36, sodium: 1500, fiber: 2, totalSugar: 5, addedSugar: 3 }, "https://www.subway.com/en-us/restaurant/5905-0/customizer/productsummary/12988/category/6-99-meal-of-the-day", "current menu page displayed 590 calories versus the PDF's 610; this record retains the complete PDF value set"), searchAliases: ["BMT", "Italian BMT"] },
  subwayFood("spicy-italian-6-inch", "Spicy Italian (6\")", "1 6-inch sandwich (239 g): spicy pepperoni, Genoa salami, provolone, jalape\u00f1os, lettuce, tomatoes, onions and mayo on Artisan Italian bread; no add-ons", { calories: 680, protein: 27, carbohydrates: 44, fat: 44, sodium: 1690, fiber: 3, totalSugar: 5, addedSugar: 3 }, "https://www.subway.com/en-us/restaurant/13006-0/customizer/productsummary/12987/category/6-99-meal-of-the-day", "current menu page displayed 660 calories and 26 g protein versus the PDF's 680 calories and 27 g protein; this record retains the complete PDF value set"),
  subwayFood("meatball-marinara-6-inch", "Meatball Marinara (6\")", "1 6-inch sandwich (239 g): meatballs, marinara sauce, provolone and Parmesan on Artisan Italian bread; no add-ons", { calories: 570, protein: 27, carbohydrates: 53, fat: 28, sodium: 1370, fiber: 4, totalSugar: 7, addedSugar: 4 }, "https://www.subway.com/en-us/restaurant/10635-0/customizer/productsummary/12984/category/6-99-meal-of-the-day", "current menu page displayed 550 calories versus the PDF's 570; this record retains the complete PDF value set"),
  subwayFood("tuna-6-inch", "Tuna (6\")", "1 6-inch sandwich (236 g): wild-caught tuna salad, provolone, lettuce, tomatoes and onions on Artisan Italian bread; no add-ons or added sauce", { calories: 570, protein: 27, carbohydrates: 42, fat: 33, sodium: 950, fiber: 2, totalSugar: 4, addedSugar: 3 }, "https://www.subway.com/en-us/restaurant/32893-0/customizer/productsummary/13066/category/sandwiches", "current menu page displayed 560 calories versus the PDF's 570; this record retains the complete PDF value set"),
  subwayFood("veggie-delite-6-inch", "Veggie Delite\u00ae (6\")", "1 6-inch sandwich (191 g): provolone, spinach, cucumbers, green peppers, lettuce, tomatoes and onions on Hearty Multigrain bread; no add-ons or sauce", { calories: 320, protein: 17, carbohydrates: 41, fat: 10, sodium: 600, fiber: 4, totalSugar: 6, addedSugar: 4 }, "https://www.subway.com/en-us/restaurant/27667-0/customizer/productsummary/13064/category/sandwiches", "current menu page displayed 310 calories versus the PDF's 320; this record retains the complete PDF value set"),
];

const chipotle = { id: "chipotle", name: "Chipotle" };
const CHIPOTLE_SOURCE = "https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf";
const CHIPOTLE_REFERENCE = "Chipotle official US Nutrition Facts paper menu currently served from its nutrition site; exact standalone component portion (OCT-2024-US-PPS chart)";
const chipotleFood = (id, name, description, nutrients) => officialFood(
  chipotle,
  id,
  name,
  description,
  { ...nutrients, addedSugar: null },
  CHIPOTLE_SOURCE,
  CHIPOTLE_REFERENCE,
  undefined,
  { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const chipotleFoods = [
  chipotleFood("chicken-4oz", "Chicken", "1 standalone 4 oz serving of marinated, grilled chicken", { calories: 180, protein: 32, carbohydrates: 0, fat: 7, sodium: 310, fiber: 0, totalSugar: 0 }),
  chipotleFood("steak-4oz", "Steak", "1 standalone 4 oz serving of marinated, grilled steak", { calories: 150, protein: 21, carbohydrates: 1, fat: 6, sodium: 330, fiber: 1, totalSugar: 0 }),
  chipotleFood("barbacoa-4oz", "Barbacoa", "1 standalone 4 oz serving of braised, shredded beef barbacoa", { calories: 170, protein: 24, carbohydrates: 2, fat: 7, sodium: 530, fiber: 1, totalSugar: 0 }),
  chipotleFood("carnitas-4oz", "Carnitas", "1 standalone 4 oz serving of braised, shredded pork carnitas", { calories: 210, protein: 23, carbohydrates: 0, fat: 12, sodium: 450, fiber: 0, totalSugar: 0 }),
  chipotleFood("sofritas-4oz", "Sofritas", "1 standalone 4 oz serving of organic plant-based sofritas", { calories: 150, protein: 8, carbohydrates: 9, fat: 10, sodium: 560, fiber: 3, totalSugar: 5 }),
  chipotleFood("cilantro-lime-white-rice-4oz", "Cilantro-Lime White Rice", "1 standalone 4 oz serving", { calories: 210, protein: 4, carbohydrates: 40, fat: 4, sodium: 350, fiber: 1, totalSugar: 0 }),
  chipotleFood("black-beans-4oz", "Black Beans", "1 standalone 4 oz serving", { calories: 130, protein: 8, carbohydrates: 22, fat: 1.5, sodium: 210, fiber: 7, totalSugar: 2 }),
  chipotleFood("fajita-vegetables-2oz", "Fajita Vegetables", "1 standalone 2 oz serving", { calories: 20, protein: 1, carbohydrates: 5, fat: 0, sodium: 150, fiber: 1, totalSugar: 2 }),
  chipotleFood("guacamole-4oz", "Guacamole (Topping or Side)", "1 standalone 4 oz topping or side serving", { calories: 230, protein: 2, carbohydrates: 8, fat: 22, sodium: 370, fiber: 6, totalSugar: 1 }),
  chipotleFood("chips-regular-4oz", "Chips (Regular)", "1 regular 4 oz serving", { calories: 540, protein: 7, carbohydrates: 73, fat: 25, sodium: 390, fiber: 7, totalSugar: 1 }),
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
  ...mcdonaldsExpansionFoods,
  ...wendysFoods,
  ...burgerKingFoods,
  ...subwayFoods,
  ...chipotleFoods,
  ...sonicFoods,
  ...braumsFoods,
  ...tacoBellFoods,
  ...chickFilAFoods,
  ...whataburgerFoods,
];

export default restaurantFoods;
