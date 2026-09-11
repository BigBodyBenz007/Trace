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
const sonicPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar,
});
const sonicCurrentOption = (id, description, nutrients, amount = 1) => {
  const option = officialOption(sonic.id, id, description, nutrients, amount, SONIC_SOURCE, "SONIC August 2026 National Nutritional Brochure");
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  return option;
};
const sonicCurrentFood = (id, name, description, nutrients, servingOptions, searchAliases) => {
  const food = officialFood(
    sonic,
    id,
    name,
    description,
    nutrients,
    SONIC_SOURCE,
    "SONIC August 2026 National Nutritional Brochure; published standard item or size-specific option",
    servingOptions,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const sonicSizedFood = (id, name, options, searchAliases) => sonicCurrentFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => sonicCurrentOption(`${id}:${optionId}`, description, nutrients, amount)),
  searchAliases
);
const sonicFiveSizeDrink = (id, name, values, searchAliases) => sonicSizedFood(
  id,
  name,
  ["wacky-pack", "small", "medium", "large", "rt44"].map((size, index) => [
    size,
    `${size === "wacky-pack" ? "Wacky Pack" : size === "rt44" ? "RT 44" : `${size[0].toUpperCase()}${size.slice(1)}`} ${name}`,
    sonicPublished(...values[index]),
  ]),
  searchAliases
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
  sonicCurrentFood("all-american-bacon-sonic-smasher-double", "All-American Bacon SONIC Smasher (Double)", "1 double burger with bacon and the published standard toppings", sonicPublished(670, 39, 32, 42, 1870, 2, 8)),
  sonicCurrentFood("all-american-bacon-sonic-smasher-triple", "All-American Bacon SONIC Smasher (Triple)", "1 triple burger with bacon and the published standard toppings", sonicPublished(860, 52, 33, 57, 2440, 2, 9)),
  sonicCurrentFood("all-american-sonic-smasher-triple", "All-American SONIC Smasher (Triple)", "1 triple burger with the published standard toppings", sonicPublished(790, 48, 33, 52, 2220, 2, 8)),
  sonicCurrentFood("original-sonic-smasher-triple", "Original SONIC Smasher (Triple)", "1 triple burger with Smasher sauce, pickles and onions", sonicPublished(780, 48, 31, 51, 2070, 1, 9)),
  sonicCurrentFood("jr-double-cheeseburger", "Jr Double Cheeseburger", "1 junior double cheeseburger", sonicPublished(390, 21, 25, 23, 870, 2, 6)),
  sonicCurrentFood("chicken-club-toaster", "Chicken Club TOASTER", "1 chicken club sandwich on Texas toast", sonicPublished(670, 33, 55, 36, 1890, 5, 6)),
  sonicCurrentFood("blt-toaster", "BLT TOASTER", "1 bacon, lettuce and tomato sandwich on Texas toast", sonicPublished(450, 16, 42, 25, 940, 3, 5)),
  sonicCurrentFood("cheesy-baja-crispy-tender-wrap", "Cheesy Baja Crispy Tender Wrap", "1 standard crispy tender wrap", sonicPublished(290, 12, 30, 14, 810, 2, 1)),
  sonicCurrentFood("garlic-parmesan-ranch-crispy-tender-wrap", "Garlic Parmesan Ranch Crispy Tender Wrap", "1 standard crispy tender wrap", sonicPublished(330, 12, 34, 16, 950, 1, 2)),
  sonicSizedFood("premium-chicken-bites", "Premium Chicken Bites", [
    ["small", "Small Premium Chicken Bites", sonicPublished(240, 13, 19, 12, 900, 1, 0)],
    ["medium", "Medium Premium Chicken Bites", sonicPublished(350, 19, 28, 18, 1320, 2, 0)],
    ["large", "Large Premium Chicken Bites", sonicPublished(510, 27, 41, 26, 1920, 3, 0)],
  ]),
  sonicCurrentFood("regular-hot-dog", "Regular Hot Dog", "1 plain regular hot dog in a bun", sonicPublished(360, 12, 31, 21, 800, 2, 4)),
  sonicCurrentFood("crispy-tenders-2-piece", "Crispy Tenders (Kids 2 Piece)", "2 piece kids serving", sonicPublished(170, 14, 11, 8, 490, 1, 0)),
  sonicCurrentFood("jr-burger", "Jr Burger", "1 kids junior burger", sonicPublished(270, 11, 24, 14, 580, 1, 6)),
  sonicCurrentFood("jr-cheeseburger", "Jr Cheeseburger", "1 kids junior cheeseburger", sonicPublished(290, 13, 25, 16, 800, 2, 6)),
  sonicCurrentFood("wacky-pack-white-milk", "Wacky Pack 1% White Milk", "1 kids milk serving", sonicPublished(110, 8, 12, 2.5, 125, 0, 12)),
  sonicCurrentFood("minute-maid-apple-juice-box", "Minute Maid 100% Apple Juice Box", "1 juice box (6 fl oz)", sonicPublished(80, 0, 21, 0, 15, 0, 19)),
  sonicCurrentFood("tree-top-applesauce", "Tree Top Applesauce", "1 kids applesauce serving", sonicPublished(45, 0, 13, 0, 0, 2, 11)),
  sonicCurrentFood("breakfast-burrito-ham", "Breakfast Burrito Ham", "1 breakfast burrito with ham", sonicPublished(440, 27, 38, 20, 1920, 1, 2)),
  sonicCurrentFood("jr-breakfast-burrito-bacon", "Jr Breakfast Burrito Bacon", "1 junior breakfast burrito", sonicPublished(270, 13, 22, 14, 870, 1, 0)),
  sonicCurrentFood("jr-breakfast-burrito-sausage", "Jr Breakfast Burrito Sausage", "1 junior breakfast burrito", sonicPublished(280, 12, 22, 16, 830, 1, 0)),
  ...[
    ["biscuit-sandwich-bacon", "Bacon Biscuit Sandwich", 480, 20, 40, 24, 2130, 1, 5],
    ["biscuit-sandwich-ham", "Ham Biscuit Sandwich", 500, 23, 43, 22, 2010, 1, 6],
    ["biscuit-sandwich-sausage", "Sausage Biscuit Sandwich", 580, 21, 40, 34, 2150, 1, 5],
    ["brioche-sandwich-bacon", "Bacon Brioche Breakfast Sandwich", 440, 20, 38, 23, 1820, 2, 9],
    ["brioche-sandwich-ham", "Ham Brioche Breakfast Sandwich", 450, 24, 41, 21, 1700, 2, 11],
    ["brioche-sandwich-sausage", "Sausage Brioche Breakfast Sandwich", 530, 22, 38, 33, 1840, 3, 9],
    ["croissonic-sandwich-bacon", "Bacon CroisSONIC Breakfast Sandwich", 430, 18, 29, 27, 1540, 1, 5],
    ["croissonic-sandwich-ham", "Ham CroisSONIC Breakfast Sandwich", 430, 22, 31, 23, 2000, 1, 6],
    ["croissonic-sandwich-sausage", "Sausage CroisSONIC Breakfast Sandwich", 530, 19, 29, 37, 1560, 1, 5],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, sugar]) => sonicCurrentFood(id, name, "1 breakfast sandwich", sonicPublished(calories, protein, carbohydrates, fat, sodium, fiber, sugar))),
  sonicSizedFood("ched-r-bites", "Ched 'R' Bites", [
    ["small", "Small Ched 'R' Bites", sonicPublished(280, 13, 22, 15, 740, 1, 0)],
    ["medium", "Medium Ched 'R' Bites", sonicPublished(410, 20, 32, 23, 1110, 2, 0)],
    ["large", "Large Ched 'R' Bites", sonicPublished(550, 27, 43, 30, 1480, 2, 0)],
  ]),
  sonicSizedFood("ched-r-peppers", "Ched 'R' Peppers", [
    ["4-piece", "4 piece (Small)", sonicPublished(330, 8, 36, 17, 1110, 2, 2), 4],
    ["6-piece", "6 piece (Medium)", sonicPublished(490, 12, 54, 25, 1660, 3, 2), 6],
    ["8-piece", "8 piece (Large)", sonicPublished(660, 17, 72, 34, 2220, 4, 3), 8],
  ]),
  ...[
    ["cheese-groovy-fries", "Cheese Groovy Fries", [[330, 6, 29, 21, 900, 4, 1], [460, 8, 40, 30, 1280, 5, 1], [650, 11, 57, 42, 1770, 7, 1]]],
    ["cheese-tots", "Cheese Tots", [[310, 6, 30, 19, 950, 3, 1], [450, 8, 43, 28, 1390, 4, 1], [840, 13, 86, 50, 2450, 8, 2]]],
    ["chili-cheese-groovy-fries", "Chili Cheese Groovy Fries", [[360, 7, 31, 23, 950, 4, 1], [540, 12, 44, 35, 1430, 6, 1], [760, 17, 62, 49, 2020, 9, 2]]],
    ["chili-cheese-tots", "Chili Cheese Tots", [[350, 8, 32, 22, 1030, 3, 1], [540, 13, 48, 33, 1580, 5, 2], [840, 19, 77, 51, 2420, 8, 3]]],
    ["onion-rings", "Onion Rings", [[440, 6, 55, 21, 430, 3, 14], [580, 8, 74, 29, 570, 4, 19], [800, 11, 101, 39, 790, 5, 26]]],
  ].map(([id, name, values]) => sonicSizedFood(id, name, ["small", "medium", "large"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${name}`, sonicPublished(...values[index])]))),
  sonicCurrentFood("soft-pretzel-twist", "Soft Pretzel Twist", "1 pretzel twist", sonicPublished(250, 7, 39, 7, 440, 2, 6)),
  ...[
    ["caramel-sundae", "Caramel Sundae", 430, 7, 71, 13, 400, 0, 57],
    ["chocolate-sundae", "Chocolate Sundae", 440, 7, 76, 12, 340, 0, 64],
    ["hot-fudge-sundae", "Hot Fudge Sundae", 460, 8, 73, 17, 360, 1, 60],
    ["strawberry-sundae", "Strawberry Sundae", 380, 7, 62, 12, 310, 1, 55],
    ["vanilla-soft-serve-cup", "Vanilla Soft Serve Cup", 300, 7, 47, 10, 300, 0, 40],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, sugar]) => sonicCurrentFood(id, name, "1 published serving", sonicPublished(calories, protein, carbohydrates, fat, sodium, fiber, sugar))),
  ...[
    ["banana-shake", "Banana Shake", [[390, 7, 62, 14, 260, 2, 49], [590, 12, 93, 21, 460, 2, 76], [750, 15, 124, 25, 570, 3, 98], [1100, 23, 185, 36, 870, 5, 146]]],
    ["caramel-shake", "Caramel Shake", [[380, 7, 56, 15, 320, 0, 47], [580, 11, 87, 22, 520, 0, 74], [730, 14, 112, 26, 690, 0, 94], [1070, 22, 166, 37, 1050, 0, 140]]],
    ["chocolate-shake", "Chocolate Shake", [[370, 7, 56, 15, 340, 1, 48], [570, 11, 87, 22, 540, 1, 75], [720, 14, 112, 27, 720, 1, 95], [1050, 22, 167, 39, 1100, 2, 142]]],
    ["hot-fudge-shake", "Hot Fudge Shake", [[410, 7, 59, 17, 290, 1, 50], [600, 11, 91, 24, 490, 1, 77], [780, 15, 119, 30, 630, 1, 100], [1150, 22, 178, 43, 960, 2, 150]]],
    ["peanut-butter-shake", "Peanut Butter Shake", [[440, 9, 51, 23, 330, 1, 43], [630, 14, 83, 30, 530, 1, 70], [840, 19, 103, 43, 700, 2, 86], [1240, 29, 154, 63, 1070, 3, 128]]],
    ["strawberry-shake", "Strawberry Shake", [[360, 6, 54, 14, 270, 0, 47], [560, 11, 85, 21, 460, 0, 74], [690, 14, 108, 25, 580, 1, 94], [1010, 21, 162, 36, 880, 1, 140]]],
    ["vanilla-shake", "Vanilla Shake", [[370, 7, 53, 15, 290, 0, 46], [570, 12, 85, 22, 490, 0, 74], [710, 15, 107, 27, 630, 0, 92], [1040, 23, 160, 39, 960, 0, 137]]],
  ].map(([id, name, values]) => sonicSizedFood(id, name, ["mini", "small", "medium", "large"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${name}`, sonicPublished(...values[index])]))),
  ...[
    ["oreo-blast", "SONIC Blast with OREO Cookie Pieces", [[370, 7, 58, 13, 390, 1, 45], [580, 11, 92, 21, 610, 1, 70], [770, 15, 121, 28, 800, 2, 93]]],
    ["mms-blast", "SONIC Blast with M&M'S Minis", [[490, 8, 73, 20, 290, 1, 64], [730, 13, 109, 29, 460, 2, 96], [960, 17, 144, 38, 620, 2, 126]]],
    ["reeses-blast", "SONIC Blast with Reese's Peanut Butter Cups", [[450, 10, 63, 20, 390, 1, 54], [680, 15, 96, 30, 600, 2, 83], [890, 20, 126, 39, 790, 2, 110]]],
    ["cookie-dough-blast", "SONIC Blast with Chocolate Chip Cookie Dough", [[410, 7, 66, 14, 300, 0, 49], [620, 11, 100, 22, 470, 1, 76], [820, 15, 134, 29, 630, 1, 101]]],
    ["chocolate-chunk-brownie-blast", "SONIC Blast with Chocolate Chunk Brownie", [[410, 7, 60, 17, 340, 0, 49], [620, 12, 92, 26, 520, 0, 76], [820, 15, 122, 34, 700, 0, 100]]],
    ["heath-toffee-blast", "SONIC Blast with Heath Toffee Pieces", [[430, 7, 61, 19, 360, 0, 54], [650, 11, 93, 29, 560, 1, 82], [860, 15, 123, 38, 740, 1, 109]]],
    ["turtle-truffle-nut-blast", "SONIC Blast with Turtle Truffle Nut", [[460, 8, 69, 19, 320, 0, 59], [700, 13, 104, 29, 510, 0, 90], [920, 17, 138, 38, 670, 0, 118]]],
  ].map(([id, name, values]) => sonicSizedFood(id, name, ["mini", "small", "medium"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${name}`, sonicPublished(...values[index])]))),
  sonicSizedFood("original-cold-brew-iced-coffee", "Original Cold Brew Iced Coffee", [
    ["small", "Small Original Cold Brew", sonicPublished(170, 4, 28, 5, 150, 0, 20)],
    ["medium", "Medium Original Cold Brew", sonicPublished(230, 6, 38, 7, 210, 0, 27)],
    ["large", "Large Original Cold Brew", sonicPublished(360, 9, 59, 11, 330, 0, 42)],
    ["rt44", "RT 44 Original Cold Brew", sonicPublished(500, 13, 82, 15, 460, 0, 58)],
  ]),
  sonicCurrentFood("hot-coffee", "Hot Coffee", "Regular (16 fl oz)", sonicPublished(0, 0, 0, 0, 0, 0, 0)),
  sonicSizedFood("coca-cola", "Coca-Cola", [
    ["wacky-pack", "Wacky Pack Coca-Cola", sonicPublished(70, 0, 18, 0, 15, 0, 18)],
    ["small", "Small Coca-Cola", sonicPublished(100, 0, 28, 0, 25, 0, 28)],
    ["medium", "Medium Coca-Cola", sonicPublished(170, 0, 47, 0, 40, 0, 47)],
    ["large", "Large Coca-Cola", sonicPublished(260, 0, 71, 0, 65, 0, 71)],
    ["rt44", "RT 44 Coca-Cola", sonicPublished(350, 0, 96, 0, 85, 0, 96)],
  ], ["Sonic Coke"]),
  sonicSizedFood("sprite", "Sprite", [
    ["wacky-pack", "Wacky Pack Sprite", sonicPublished(70, 0, 18, 0, 35, 0, 18)],
    ["small", "Small Sprite", sonicPublished(100, 0, 28, 0, 50, 0, 28)],
    ["medium", "Medium Sprite", sonicPublished(170, 0, 47, 0, 85, 0, 47)],
    ["large", "Large Sprite", sonicPublished(260, 0, 71, 0, 130, 0, 71)],
    ["rt44", "RT 44 Sprite", sonicPublished(350, 0, 96, 0, 170, 0, 96)],
  ]),
  sonicSizedFood("sweet-iced-tea", "Sweet Iced Tea", [
    ["wacky-pack", "Wacky Pack Sweet Iced Tea", sonicPublished(80, 0, 21, 0, 0, 0, 21)],
    ["small", "Small Sweet Iced Tea", sonicPublished(140, 0, 37, 0, 10, 0, 37)],
    ["medium", "Medium Sweet Iced Tea", sonicPublished(170, 0, 45, 0, 15, 0, 45)],
    ["large", "Large Sweet Iced Tea", sonicPublished(290, 0, 78, 0, 20, 0, 78)],
    ["rt44", "RT 44 Sweet Iced Tea", sonicPublished(360, 0, 96, 0, 25, 0, 96)],
  ]),
  sonicSizedFood("unsweet-iced-tea", "Unsweet Iced Tea", [
    ["wacky-pack", "Wacky Pack Unsweet Iced Tea", sonicPublished(0, 0, 0, 0, 0, 0, 0)],
    ["small", "Small Unsweet Iced Tea", sonicPublished(0, 0, 0, 0, 10, 0, 0)],
    ["medium", "Medium Unsweet Iced Tea", sonicPublished(0, 0, 0, 0, 15, 0, 0)],
    ["large", "Large Unsweet Iced Tea", sonicPublished(0, 0, 0, 0, 20, 0, 0)],
    ["rt44", "RT 44 Unsweet Iced Tea", sonicPublished(0, 0, 0, 0, 25, 0, 0)],
  ]),
  sonicSizedFood("cherry-limeade", "Cherry Limeade", [
    ["wacky-pack", "Wacky Pack Cherry Limeade", sonicPublished(110, 0, 29, 0, 40, 0, 29)],
    ["small", "Small Cherry Limeade", sonicPublished(140, 0, 39, 0, 60, 0, 39)],
    ["medium", "Medium Cherry Limeade", sonicPublished(240, 0, 65, 0, 95, 0, 64)],
    ["large", "Large Cherry Limeade", sonicPublished(360, 0, 99, 0, 140, 0, 98)],
    ["rt44", "RT 44 Cherry Limeade", sonicPublished(490, 0, 133, 0, 200, 0, 132)],
  ]),
  sonicSizedFood("all-natural-lemonade", "All-Natural Lemonade", [
    ["wacky-pack", "Wacky Pack All-Natural Lemonade", sonicPublished(100, 0, 27, 0, 0, 0, 25)],
    ["small", "Small All-Natural Lemonade", sonicPublished(160, 0, 42, 0, 0, 0, 38)],
    ["medium", "Medium All-Natural Lemonade", sonicPublished(270, 0, 69, 0, 0, 0, 64)],
    ["large", "Large All-Natural Lemonade", sonicPublished(400, 0, 105, 0, 10, 0, 97)],
    ["rt44", "RT 44 All-Natural Lemonade", sonicPublished(540, 0, 142, 0, 10, 0, 131)],
  ]),
  sonicSizedFood("french-vanilla-cold-brew-iced-coffee", "French Vanilla Cold Brew Iced Coffee", [
    ["small", "Small French Vanilla Cold Brew", sonicPublished(180, 4, 32, 5, 150, 0, 24)],
    ["medium", "Medium French Vanilla Cold Brew", sonicPublished(260, 6, 46, 7, 210, 0, 35)],
    ["large", "Large French Vanilla Cold Brew", sonicPublished(410, 9, 72, 11, 330, 0, 55)],
    ["rt44", "RT 44 French Vanilla Cold Brew", sonicPublished(570, 13, 100, 15, 460, 0, 75)],
  ]),
  ...[
    ["blue-coconut-cream-slush", "Blue Coconut Cream Slush", [[450, 6, 92, 9, 290, 0, 86], [630, 8, 128, 13, 400, 0, 120], [1000, 14, 205, 20, 650, 0, 190]]],
    ["cherry-cream-slush", "Cherry Cream Slush", [[410, 6, 81, 9, 280, 0, 75], [580, 8, 117, 13, 390, 0, 108], [940, 14, 187, 20, 640, 0, 173]]],
    ["strawberry-cream-slush", "Strawberry Cream Slush", [[480, 6, 100, 9, 290, 1, 93], [690, 8, 145, 13, 410, 2, 135], [1100, 14, 229, 20, 670, 3, 213]]],
  ].map(([id, name, values]) => sonicSizedFood(id, name, ["small", "medium", "large"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${name}`, sonicPublished(...values[index])]))),
  sonicCurrentFood("barqs-root-beer-float-small", "Barq\u2019s Root Beer Float (Small)", "Small published root beer float", sonicPublished(290, 5, 56, 7, 250, 0, 50), undefined, ["Barqs Root Beer Float"]),
  ...[
    ["barqs-root-beer", "Barq\u2019s Root Beer", [[70, 0, 18, 0, 35, 0, 18], [100, 0, 28, 0, 50, 0, 28], [170, 0, 47, 0, 85, 0, 47], [260, 0, 71, 0, 130, 0, 71], [350, 0, 96, 0, 190, 0, 96]], ["Barqs Root Beer"]],
    ["coca-cola-zero-sugar", "Coca-Cola Zero Sugar", [[0, 0, 0, 0, 15, 0, 0], [0, 0, 0, 0, 25, 0, 0], [0, 0, 0, 0, 40, 0, 0], [0, 0, 0, 0, 65, 0, 0], [0, 0, 0, 0, 85, 0, 0]], ["Sonic Coke Zero"]],
    ["diet-coke", "Diet Coke", [[0, 0, 0, 0, 25, 0, 0], [0, 0, 0, 0, 40, 0, 0], [0, 0, 0, 0, 65, 0, 0], [0, 0, 0, 0, 95, 0, 0], [0, 0, 0, 0, 130, 0, 0]]],
    ["dr-pepper", "Dr Pepper", [[60, 0, 18, 0, 20, 0, 18], [100, 0, 28, 0, 30, 0, 28], [160, 0, 46, 0, 55, 0, 46], [240, 0, 70, 0, 80, 0, 70], [330, 0, 94, 0, 110, 0, 94]], ["Dr. Pepper", "Sonic Dr Pepper"]],
    ["diet-dr-pepper", "Diet Dr Pepper", [[0, 0, 0, 0, 35, 0, 0], [0, 0, 0, 0, 55, 0, 0], [0, 0, 0, 0, 90, 0, 0], [0, 0, 0, 0, 135, 0, 0], [0, 0, 0, 0, 180, 0, 0]], ["Diet Dr. Pepper"]],
    ["fanta-orange", "Fanta Orange", [[70, 0, 18, 0, 15, 0, 18], [100, 0, 28, 0, 25, 0, 28], [170, 0, 47, 0, 40, 0, 47], [260, 0, 71, 0, 65, 0, 71], [350, 0, 96, 0, 85, 0, 96]]],
    ["hi-c-fruit-punch", "Hi-C Fruit Punch", [[70, 0, 20, 0, 35, 0, 20], [110, 0, 31, 0, 50, 0, 31], [190, 0, 51, 0, 85, 0, 51], [290, 0, 77, 0, 130, 0, 77], [390, 0, 105, 0, 170, 0, 105]], ["Hi C Fruit Punch"]],
    ["powerade-mountain-berry-blast", "Powerade Mountain Berry Blast", [[35, 0, 10, 0, 50, 0, 10], [50, 0, 15, 0, 75, 0, 15], [80, 0, 25, 0, 125, 0, 25], [130, 0, 39, 0, 190, 0, 39], [170, 0, 52, 0, 260, 0, 52]]],
    ["sprite-zero-sugar", "Sprite Zero Sugar", [[0, 0, 0, 0, 15, 0, 0], [0, 0, 0, 0, 25, 0, 0], [0, 0, 0, 0, 40, 0, 0], [0, 0, 0, 0, 65, 0, 0], [0, 0, 0, 0, 85, 0, 0]]],
    ["cranberry-limeade", "Cranberry Limeade", [[100, 0, 27, 0, 35, 0, 26], [140, 0, 37, 0, 50, 0, 36], [240, 0, 65, 0, 90, 0, 63], [360, 0, 98, 0, 135, 0, 95], [480, 0, 132, 0, 190, 0, 128]]],
    ["diet-cherry-limeade", "Diet Cherry Limeade", [[10, 0, 2, 0, 25, 0, 2], [10, 0, 2, 0, 35, 0, 2], [15, 0, 3, 0, 55, 0, 2], [15, 0, 3, 0, 80, 0, 2], [15, 0, 4, 0, 110, 0, 2]]],
    ["diet-limeade", "Diet Limeade", [[0, 0, 0, 0, 25, 0, 0], [5, 0, 0, 0, 35, 0, 0], [5, 0, 1, 0, 55, 0, 0], [10, 0, 1, 0, 85, 0, 0], [10, 0, 2, 0, 115, 0, 0]]],
    ["limeade", "Limeade", [[70, 0, 19, 0, 35, 0, 18], [100, 0, 29, 0, 55, 0, 28], [170, 0, 48, 0, 90, 0, 47], [260, 0, 72, 0, 140, 0, 71], [350, 0, 98, 0, 180, 0, 96]]],
    ["strawberry-limeade", "Strawberry Limeade", [[90, 0, 25, 0, 40, 1, 24], [130, 0, 35, 0, 55, 1, 34], [220, 0, 60, 0, 100, 1, 58], [330, 0, 90, 0, 150, 1, 88], [450, 0, 121, 0, 200, 2, 118]]],
    ["dirty-dr-pepper", "Dirty Dr Pepper", [[100, 1, 26, 1, 45, 0, 25], [140, 1, 36, 1, 55, 0, 35], [240, 1, 63, 1.5, 95, 0, 61], [370, 2, 95, 2.5, 150, 0, 92], [490, 2, 128, 3, 200, 0, 124]], ["Dirty Dr. Pepper"]],
    ["ocean-water", "Ocean Water", [[80, 0, 21, 0, 40, 0, 21], [110, 0, 31, 0, 60, 0, 31], [190, 0, 53, 0, 95, 0, 53], [300, 0, 80, 0, 150, 0, 80], [400, 0, 108, 0, 200, 0, 108]]],
  ].map(([id, name, values, aliases]) => sonicFiveSizeDrink(id, name, values, aliases)),
  sonicCurrentFood("simply-orange-juice-bottle", "Simply Orange Juice Bottle", "1 bottle (11.5 fl oz)", sonicPublished(160, 2, 37, 0, 0, 0, 33)),
  ...[
    ["asian-sweet-chili", "Asian-Style Sweet Chili", 60, 1, 13, 0, 370, 0, 11], ["bbq", "BBQ Sauce", 50, 0, 11, 0, 300, 0, 10],
    ["buffalo", "Buffalo Sauce", 60, 0, 1, 6, 720, 0, 0], ["garlic-parmesan-ranch", "Garlic Parmesan Ranch", 50, 0, 1, 5, 105, 0, 0],
    ["groovy-sauce", "Groovy Sauce", 110, 0, 2, 11, 200, 0, 2], ["honey-mustard", "Honey Mustard", 90, 0, 6, 8, 170, 0, 4],
    ["jalapeno-ranch", "Jalape\u00f1o Ranch", 130, 0, 2, 13, 170, 0, 1], ["ketchup", "Ketchup", 10, 0, 3, 0, 85, 0, 2],
    ["light-mayo", "Light Mayo", 40, 0, 3, 3, 105, 0, 2], ["marinara", "Marinara", 15, 0, 4, 0, 135, 0, 2],
    ["mustard", "Mustard", 5, 0, 0, 0, 95, 0, 0], ["ranch", "Ranch", 110, 0, 1, 11, 230, 0, 1],
    ["signature-cheese", "Signature Cheese Sauce", 130, 2, 6, 11, 720, 0, 3], ["smasher-sauce", "Smasher Sauce", 35, 0, 1, 3.5, 70, 0, 1],
    ["sweet-relish", "Sweet Relish", 10, 0, 3, 0, 55, 0, 2], ["syrup", "Breakfast Syrup", 90, 0, 22, 0, 0, 0, 15],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, sugar]) => sonicCurrentFood(id, name, "1 published condiment serving", sonicPublished(calories, protein, carbohydrates, fat, sodium, fiber, sugar), undefined, id === "jalapeno-ranch" ? ["Jalapeno Ranch"] : undefined)),
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
const braumsPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar,
});
const BRAUMS_CURRENT_REFERENCE = "Braum's official 2018 Nutritional Chart, still published on its website; matched to the current restaurant, breakfast, beverage, or ice-cream-counter menu on 2026-09-10";
const braumsCurrentOption = (id, description, nutrients, amount = 1) => {
  const option = officialOption(braums.id, id, description, nutrients, amount, BRAUMS_SOURCE, BRAUMS_CURRENT_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  return option;
};
const braumsCurrentFood = (id, name, description, nutrients, servingOptions, searchAliases) => {
  const food = officialFood(braums, id, name, description, nutrients, BRAUMS_SOURCE, BRAUMS_CURRENT_REFERENCE, servingOptions, { accessedAt: CURRENT_EXPANSION_CHECKED_AT });
  return searchAliases ? { ...food, searchAliases } : food;
};
const braumsSizedFood = (id, name, options, searchAliases) => braumsCurrentFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => braumsCurrentOption(`${id}:${optionId}`, description, nutrients, amount)),
  searchAliases
);

const braumsFoods = [
  braumsFood("quarter-lb-cheeseburger", "Quarter lb. Cheeseburger", "1 cheeseburger", { calories: 530, protein: 29, carbohydrates: 40, fat: 28, sodium: 1420 }),
  braumsFood("double-quarter-lb-cheeseburger", "Double Quarter lb. Cheeseburger", "1 double cheeseburger", { calories: 730, protein: 47, carbohydrates: 40, fat: 41, sodium: 1470 }),
  braumsFood("deluxe-sixth-lb-cheeseburger", "Deluxe ⅙ lb. Cheeseburger", "1 cheeseburger", { calories: 420, protein: 21, carbohydrates: 39, fat: 20, sodium: 1210 }),
  braumsFood("chicken-sandwich-crispy", "Chicken Sandwich Crispy", "1 sandwich", { calories: 590, protein: 28, carbohydrates: 60, fat: 27, sodium: 1220 }),
  braumsFood("chicken-sandwich-grilled", "Chicken Sandwich Grilled", "1 sandwich", { calories: 430, protein: 32, carbohydrates: 38, fat: 18, sodium: 1260 }),
  braumsFood("chicken-strips", "Chicken Strips", null, null, [
    braumsCurrentOption("chicken-strips:2-piece", "2 piece serving", { calories: 250, protein: 14, carbohydrates: 15, fat: 15, sodium: 680, fiber: 1, totalSugar: 0 }, 2),
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
  braumsCurrentFood("california-cheeseburger", "California Cheeseburger", "1 standard burger (268 g)", braumsPublished(680, 30, 42, 43, 1440, 4, 8)),
  braumsCurrentFood("triple-quarter-lb-cheeseburger", "Triple Quarter lb. Cheeseburger", "1 triple cheeseburger (427 g)", braumsPublished(1040, 71, 43, 64, 2020, 2, 12)),
  braumsCurrentFood("quarter-lb-bbq-bacon-cheeseburger", "Quarter lb. BBQ Bacon Cheeseburger", "1 limited-time burger (300 g)", braumsPublished(710, 39, 54, 37, 1770, 3, 16)),
  braumsCurrentFood("bowl-of-chili-cheese-sour-cream", "Bowl of Chili with Cheese & Sour Cream", "1 bowl (482 g), including cheese and sour cream", braumsPublished(600, 35, 47, 30, 1250, 8, 11)),
  braumsCurrentFood("garden-salad", "Garden Salad", "1 salad (310 g); dressing not included", braumsPublished(170, 10, 13, 10, 240, 4, 7)),
  braumsCurrentFood("crispy-chicken-salad", "Crispy Chicken Salad", "1 salad (430 g); dressing not included", braumsPublished(540, 30, 35, 32, 1250, 5, 7)),
  braumsSizedFood("biscuits-sausage-gravy", "Biscuits & Sausage Gravy", [
    ["single", "Single biscuit with sausage gravy (249 g)", braumsPublished(420, 8, 43, 21, 1480, 1, 2)],
    ["double", "Double biscuits with sausage gravy (499 g)", braumsPublished(840, 17, 87, 43, 2970, 3, 5)],
  ]),
  braumsCurrentFood("cinnamon-roll", "Cinnamon Roll", "1 cinnamon roll (152 g)", braumsPublished(530, 9, 83, 18, 540, 3, 42)),
  braumsCurrentFood("fruit-yogurt-swirl", "Fruit & Yogurt Swirl", "1 serving (308 g)", braumsPublished(280, 18, 44, 5, 60, 5, 27)),
  braumsSizedFood("hotcakes", "Hotcakes", [
    ["three", "3 hotcakes (188 g)", braumsPublished(340, 6, 65, 7, 1120, 1, 13), 3],
    ["three-sausage", "3 hotcakes with sausage (228 g)", braumsPublished(510, 13, 66, 21, 1460, 1, 13), 3],
  ]),
  braumsSizedFood("big-country-breakfast", "Big Country Breakfast", [
    ["standard", "Standard Big Country Breakfast (319 g)", braumsPublished(950, 29, 57, 65, 1730, 4, 3)],
    ["with-gravy", "Big Country Breakfast with gravy (489 g)", braumsPublished(1100, 32, 70, 74, 2460, 5, 4)],
  ]),
  braumsCurrentFood("breakfast-california-burrito", "California Breakfast Burrito", "1 burrito (257 g)", braumsPublished(580, 21, 42, 36, 1030, 4, 4)),
  braumsCurrentFood("breakfast-burrito-grande", "Grande Breakfast Burrito", "1 burrito (274 g)", braumsPublished(680, 24, 52, 41, 1190, 4, 3)),
  braumsCurrentFood("biscuit-bacon-egg-cheese", "Biscuit with Bacon, Egg & Cheese", "1 biscuit sandwich (170 g)", braumsPublished(490, 20, 33, 29, 1320, 1, 3)),
  braumsCurrentFood("biscuit-ham-egg-cheese", "Biscuit with Ham, Egg & Cheese", "1 biscuit sandwich (182 g)", braumsPublished(470, 21, 33, 26, 1140, 1, 3)),
  braumsCurrentFood("english-muffin-bacon-egg-cheese", "English Muffin with Bacon, Egg & Cheese", "1 English muffin sandwich (148 g)", braumsPublished(360, 20, 27, 19, 780, 2, 3)),
  braumsCurrentFood("plain-bagel-sausage-egg-cheese", "Plain Bagel with Sausage, Egg & Cheese", "1 plain bagel sandwich (185 g)", braumsPublished(510, 24, 38, 28, 1040, 2, 4)),
  braumsSizedFood("plain-breakfast-breads", "Plain Breakfast Breads", [
    ["biscuit", "Plain breakfast biscuit (80 g)", braumsPublished(270, 5, 31, 12, 760, 1, 1)],
    ["english-muffin", "Plain English muffin (58 g)", braumsPublished(130, 5, 25, 2, 220, 2, 2)],
    ["everything-bagel", "Everything bagel (65 g)", braumsPublished(180, 6, 35, 1.5, 450, 2, 3)],
    ["plain-bagel", "Plain bagel (65 g)", braumsPublished(170, 6, 35, 0.5, 310, 2, 3)],
  ]),
  ...[
    ["premium-vanilla-ice-cream", "Premium Vanilla Ice Cream", [[190, 3, 19, 11, 60, 0, 19], [280, 5, 28, 17, 90, 0, 28]]],
    ["premium-chocolate-ice-cream", "Premium Chocolate Ice Cream", [[190, 3, 21, 11, 55, 1, 19], [280, 5, 31, 17, 80, 1, 29]]],
    ["premium-strawberry-ice-cream", "Premium Strawberry Ice Cream", [[170, 3, 21, 9, 55, 1, 20], [260, 4, 32, 14, 80, 1, 30]]],
  ].map(([id, name, values]) => braumsSizedFood(id, name, [
    ["junior-3oz", `Junior dip (3 oz) ${name}`, braumsPublished(...values[0])],
    ["single-4-5oz", `Single dip (4.5 oz) ${name}`, braumsPublished(...values[1])],
  ])),
  ...[
    ["soft-serve-vanilla-cone", "Vanilla Soft Serve Cone", [[190, 4, 32, 6, 120, 1, 20], [260, 6, 38, 9, 180, 0, 27], [290, 7, 47, 9, 190, 1, 32], [560, 13, 89, 19, 360, 2, 62]]],
    ["soft-serve-chocolate-cone", "Chocolate Soft Serve Cone", [[190, 4, 32, 6, 115, 2, 22], [260, 6, 39, 9, 170, 1, 30], [290, 7, 48, 9, 180, 3, 35], [560, 13, 91, 18, 340, 5, 68]]],
    ["soft-serve-twist-cone", "Twist Soft Serve Cone", [[190, 4, 32, 6, 120, 1, 21], [260, 6, 39, 9, 170, 1, 28], [290, 7, 48, 9, 180, 2, 33], [560, 13, 90, 18, 350, 3, 65]]],
  ].map(([id, name, values]) => braumsSizedFood(id, name, [
    ["junior-sugar", `Junior sugar cone ${name}`, braumsPublished(...values[0])],
    ["small-cake", `Small cake cone ${name}`, braumsPublished(...values[1])],
    ["small-waffle", `Small waffle cone ${name}`, braumsPublished(...values[2])],
    ["large-waffle", `Large waffle cone ${name}`, braumsPublished(...values[3])],
  ])),
  ...[
    ["vanilla-soft-serve-dish", "Vanilla Soft Serve Dish", [[230, 6, 33, 9, 150, 0, 27], [460, 11, 65, 18, 290, 0, 53]]],
    ["chocolate-soft-serve-dish", "Chocolate Soft Serve Dish", [[230, 6, 34, 9, 135, 1, 30], [450, 12, 67, 17, 270, 3, 59]]],
    ["twist-soft-serve-dish", "Twist Soft Serve Dish", [[230, 6, 33, 9, 140, 1, 28], [450, 12, 66, 17, 280, 2, 56]]],
  ].map(([id, name, values]) => braumsSizedFood(id, name, [
    ["small", `Small ${name} (142 g)`, braumsPublished(...values[0])],
    ["large", `Large ${name} (284 g)`, braumsPublished(...values[1])],
  ])),
  ...[
    ["hot-fudge-sundae", "Hot Fudge Sundae", [[450, 8, 46, 27, 150, 1, 37], [860, 16, 89, 52, 290, 3, 72], [1310, 23, 136, 78, 440, 4, 109]]],
    ["hot-caramel-sundae", "Hot Caramel Sundae", [[450, 8, 52, 24, 160, 1, 44], [860, 16, 101, 45, 310, 2, 87], [1300, 24, 154, 69, 470, 3, 132]]],
    ["strawberry-sundae", "Strawberry Sundae", [[330, 5, 40, 17, 90, 1, 37], [620, 10, 77, 32, 180, 2, 72], [940, 15, 117, 49, 270, 3, 109]]],
    ["chocolate-sundae", "Chocolate Sundae", [[460, 10, 61, 22, 125, 3, 48], [890, 19, 118, 43, 240, 7, 94], [1350, 29, 178, 65, 360, 10, 142]]],
  ].map(([id, name, values]) => braumsSizedFood(id, name, ["single", "double", "triple"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)}-dip ${name}`, braumsPublished(...values[index])]))),
  ...[
    ["birthday-cake-fancy-sundae", "Birthday Cake Fancy Sundae", 600, 8, 94, 23, 300, 1, 70],
    ["black-forest-fancy-sundae", "Black Forest Fancy Sundae", 570, 8, 74, 29, 350, 2, 56],
    ["brownie-fudge-fancy-sundae", "Brownie Fudge Fancy Sundae", 740, 11, 86, 41, 310, 3, 64],
    ["german-chocolate-fancy-sundae", "German Chocolate Fancy Sundae", 620, 8, 67, 37, 250, 2, 52],
    ["molten-lava-fancy-sundae", "Molten Lava Fancy Sundae", 640, 11, 72, 36, 370, 2, 52],
    ["strawberry-shortcake-fancy-sundae", "Strawberry Shortcake Fancy Sundae", 460, 7, 63, 22, 260, 2, 51],
    ["turtle-fancy-sundae", "Turtle Fancy Sundae", 570, 9, 62, 34, 250, 1, 49],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, sugar]) => braumsCurrentFood(id, name, "1 single-dip fancy sundae", braumsPublished(calories, protein, carbohydrates, fat, sodium, fiber, sugar))),
  braumsSizedFood("premium-vanilla-malt", "Premium Vanilla Malt", [
    ["junior-12oz", "Junior Premium Vanilla Malt (12 fl oz)", braumsPublished(540, 19, 60, 26, 310, 0, 59)],
    ["small-16oz", "Small Premium Vanilla Malt (16 fl oz)", braumsPublished(710, 25, 80, 34, 420, 1, 77)],
    ["large-32oz", "Large Premium Vanilla Malt (32 fl oz)", braumsPublished(1430, 49, 160, 68, 840, 1, 155)],
  ]),
  ...[
    ["cherry-limeade", "Cherry Limeade", [[150, 0, 39, 0, 30, 0, 34], [230, 0, 60, 0, 45, 0, 53], [280, 0, 73, 0, 60, 0, 65], [410, 0, 105, 0, 75, 0, 92], [510, 0, 133, 0, 95, 1, 116]]],
    ["limeade", "Limeade", [[130, 0, 33, 0, 30, 0, 31], [200, 0, 50, 0, 50, 0, 46], [250, 0, 64, 0, 60, 0, 58], [340, 0, 87, 0, 80, 0, 79], [430, 0, 111, 0, 105, 1, 100]], ["Braums Limeade"]],
    ["coca-cola", "Coca-Cola", [[90, 0, 24, 0, 30, 0, 24], [140, 0, 37, 0, 45, 0, 37], [170, 0, 47, 0, 55, 0, 47], [240, 0, 65, 0, 75, 0, 65], [350, 0, 96, 0, 115, 0, 96]]],
    ["dr-pepper", "Dr Pepper", [[90, 0, 25, 0, 35, 0, 25], [140, 0, 38, 0, 50, 0, 38], [180, 0, 48, 0, 60, 0, 48], [250, 0, 66, 0, 85, 0, 66], [360, 0, 98, 0, 125, 0, 98]]],
    ["sprite", "Sprite", [[90, 0, 22, 0, 40, 0, 22], [130, 0, 34, 0, 60, 0, 34], [170, 0, 43, 0, 75, 0, 43], [230, 0, 59, 0, 105, 0, 59], [340, 0, 88, 0, 150, 0, 88]]],
    ["sweet-tea", "Sweet Tea", [[0, 0, 0, 0, 5, 0, 0], [150, 0, 39, 0, 10, 0, 38], [200, 0, 49, 0, 10, 0, 49], [270, 0, 68, 0, 15, 0, 67], [400, 0, 101, 0, 20, 0, 100]]],
    ["unsweet-tea", "Unsweet Tea", [[10, 0, 2, 0, 5, 0, 2], [0, 0, 0, 0, 10, 0, 0], [0, 0, 0, 0, 15, 0, 0], [0, 0, 0, 0, 20, 0, 0], [0, 0, 0, 0, 25, 0, 0]]],
  ].map(([id, name, values, aliases]) => braumsSizedFood(id, name, ["junior-12oz", "small-16oz", "medium-22oz", "large-32oz", "44oz"].map((size, index) => [size, `${name} ${size.replace("-", " ")}`, braumsPublished(...values[index])]), aliases)),
  braumsSizedFood("hot-coffee", "Hot Coffee", [
    ["small-12oz", "Small Hot Coffee (12 fl oz)", braumsPublished(0, 0, 0, 0, 0, 0, 0)],
    ["medium-16oz", "Medium Hot Coffee (16 fl oz)", braumsPublished(0, 0, 0, 0, 0, 0, 0)],
    ["large-20oz", "Large Hot Coffee (20 fl oz)", braumsPublished(0, 0, 0, 0, 0, 0, 0)],
  ]),
  braumsSizedFood("hot-chocolate", "Hot Chocolate", [
    ["small-12oz", "Small Hot Chocolate (12 fl oz)", braumsPublished(380, 11, 61, 12, 260, 3, 55)],
    ["medium-16oz", "Medium Hot Chocolate (16 fl oz)", braumsPublished(470, 15, 73, 16, 340, 3, 66)],
    ["large-20oz", "Large Hot Chocolate (20 fl oz)", braumsPublished(570, 19, 85, 19, 440, 4, 78)],
  ]),
  braumsSizedFood("iced-coffee", "Iced Coffee", [
    ["small-12oz", "Small Iced Coffee (12 fl oz)", braumsPublished(45, 5, 6, 0, 70, 0, 6)],
    ["medium-16oz", "Medium Iced Coffee (16 fl oz)", braumsPublished(50, 5, 7, 0, 80, 0, 7)],
    ["large-24oz", "Large Iced Coffee (24 fl oz)", braumsPublished(60, 6, 9, 0, 100, 0, 9)],
  ]),
];

const TACO_BELL_SOURCE = "https://www.tacobell.com/nutrition/info";
const CHICK_FIL_A_SOURCE = "https://www.chick-fil-a.com/nutrition-allergens";
const WHATABURGER_SOURCE = "https://whataburger.com/menu";
const WHATABURGER_NUTRITION_SOURCE = "https://wbimageserver.whataburger.com/Nutrition.pdf";

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
const TACO_BELL_CURRENT_REFERENCE = "Taco Bell current U.S. menu and item pages; the selected page publishes the standard item, size or piece count and calories, while the full nutrition endpoint was inaccessible, so unpublished nutrients remain unknown";
const tacoBellCurrentFood = (id, name, description, calories, sourcePath, searchAliases) => {
  const food = officialFood(
    tacoBell,
    id,
    name,
    description,
    { calories },
    sourcePath.startsWith("http") ? sourcePath : `https://www.tacobell.com/food/${sourcePath}`,
    TACO_BELL_CURRENT_REFERENCE,
    undefined,
    { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const tacoBellCurrentOption = (id, description, calories, sourcePath, amount = 1) => {
  const sourceUrl = sourcePath.startsWith("http") ? sourcePath : `https://www.tacobell.com/food/${sourcePath}`;
  const option = officialOption(tacoBell.id, id, description, { calories }, amount, sourceUrl, TACO_BELL_CURRENT_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  option.provenance.verification.status = "partial";
  return option;
};
const tacoBellSizedCurrentFood = (id, name, options, sourcePath, searchAliases) => {
  const sourceUrl = sourcePath.startsWith("http") ? sourcePath : `https://www.tacobell.com/food/${sourcePath}`;
  const food = officialFood(
    tacoBell,
    id,
    name,
    options[0][1],
    null,
    sourceUrl,
    TACO_BELL_CURRENT_REFERENCE,
    options.map(([optionId, description, calories, amount = 1]) => tacoBellCurrentOption(`${id}:${optionId}`, description, calories, sourcePath, amount)),
    { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
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
  ...[
    ["cantina-chicken-crispy-taco", "Cantina Chicken Crispy Taco", "1 taco: white-corn shell, slow-roasted chicken, three-cheese blend and Creamy Jalape\u00f1o sauce; separately served salsa packets are not included", 320, "tacos"],
    ["cantina-chicken-soft-taco", "Cantina Chicken Soft Taco", "1 taco: flour tortilla, slow-roasted chicken, lettuce, purple cabbage, pico de gallo and Avocado Ranch sauce; separately served salsa packets are not included", 260, "tacos"],
    ["black-bean-chalupa-supreme", "Black Bean Chalupa Supreme", "1 chalupa: flatbread shell, black beans, lettuce, tomatoes, three-cheese blend and reduced-fat sour cream", 340, "tacos"],
    ["doritos-cheesy-gordita-crunch", "Doritos\u00ae Cheesy Gordita Crunch - Nacho Cheese", "1 gordita: flatbread, three-cheese blend, Nacho Cheese Doritos shell, seasoned beef, Spicy Ranch, lettuce and cheddar cheese", 480, "tacos"],
    ["naked-chicken-chalupa", "Naked Chicken Chalupa", "1 current featured chalupa in Taco Bell's published standard configuration; customizations excluded", 430, "tacos"],
    ["tajin-taco", "Taj\u00edn\u00ae Taco", "1 current featured taco in Taco Bell's published standard configuration; customizations excluded", 210, "tacos", ["Tajin Taco"]],
    ["tajin-cheesy-gordita-crunch", "Taj\u00edn\u00ae Cheesy Gordita Crunch", "1 current featured gordita in Taco Bell's published standard configuration; customizations excluded", 460, "tacos", ["Tajin Cheesy Gordita Crunch"]],
    ["cantina-chicken-burrito", "Cantina Chicken Burrito", "1 burrito: flour tortilla, double slow-roasted chicken, Avocado Ranch, Creamy Chipotle sauce, lettuce, purple cabbage, pico de gallo and cheddar; salsa packet not included", 570, "burritos"],
    ["cheesy-double-beef-burrito", "Cheesy Double Beef Burrito", "1 burrito: flour tortilla, seasoned beef, reduced-fat sour cream, three-cheese blend, nacho cheese, seasoned rice and fiesta strips", 560, "burritos"],
    ["grilled-cheese-burrito", "Grilled Cheese Burrito", "1 burrito: flour tortilla, seasoned beef, nacho cheese, seasoned rice, fiesta strips, Creamy Chipotle sauce, reduced-fat sour cream and three-cheese blend grilled on top", 690, "burritos"],
    ["black-bean-grilled-cheese-burrito", "Black Bean Grilled Cheese Burrito", "1 burrito: flour tortilla, black beans, nacho cheese, seasoned rice, fiesta strips, Creamy Chipotle sauce, reduced-fat sour cream and three-cheese blend grilled on top", 680, "burritos"],
    ["chipotle-chicken-loaded-griller", "Chipotle Chicken Loaded Griller", "1 current published loaded griller in the standard configuration; customizations excluded", 450, "burritos"],
    ["quesarito", "Quesarito", "1 current published Quesarito in the standard configuration; customizations excluded", 610, "burritos"],
    ["beefy-crunch-burrito", "Beefy Crunch Burrito", "1 current published burrito in the standard configuration; customizations excluded", 450, "burritos"],
    ["beefy-potato-loaded-griller", "Beefy Potato Loaded Griller", "1 current published loaded griller in the standard configuration; customizations excluded", 480, "burritos"],
    ["chili-cheese-burrito", "Chili Cheese Burrito", "1 current published burrito with chili and cheese; customizations excluded", 380, "burritos"],
    ["melty-pepper-jack-steak-burrito", "Melty Pepper Jack Steak Burrito", "1 current published steak burrito in the standard configuration; customizations excluded", 440, "burritos"],
    ["fresca-pepper-jack-steak-burrito", "Fresca Pepper Jack Steak Burrito", "1 current published steak burrito in the standard configuration; customizations excluded", 500, "burritos"],
    ["cantina-chicken-rolled-quesadilla", "Cantina Chicken Rolled Quesadilla", "1 rolled quesadilla with slow-roasted chicken and Taco Bell's published standard fillings; customizations excluded", 650, "quesadillas"],
    ["cheese-quesadilla", "Cheese Quesadilla", "1 flour-tortilla quesadilla with Taco Bell's standard melted cheese blend and Creamy Jalape\u00f1o sauce", 440, "quesadillas"],
    ["cantina-chicken-bowl", "Cantina Chicken Bowl", "1 bowl: slow-roasted chicken, seasoned rice, black beans, Avocado Ranch, reduced-fat sour cream, lettuce, purple cabbage, pico de gallo, guacamole and cheddar; salsa packet not included", 520, "bowls"],
    ["veggie-bowl", "Veggie Bowl", "1 bowl: seasoned rice, black beans, lettuce, purple cabbage, pico de gallo, guacamole, Avocado Ranch, reduced-fat sour cream and cheddar", 410, "bowls"],
    ["chili-cheese-nacho-fries", "Chili Cheese Nacho Fries", "1 current published order of seasoned fries with chili and cheese; customizations excluded", 460, "specialties"],
    ["meximelt", "Meximelt\u00ae", "1 current published Meximelt in the standard configuration; customizations excluded", 250, "specialties"],
    ["chicken-enchilada-nacho-fries", "Chicken Enchilada Nacho Fries", "1 current published order of seasoned fries in the chicken enchilada configuration; customizations excluded", 500, "specialties"],
    ["mini-taco-salad", "Mini Taco Salad", "1 current published mini taco salad in the standard configuration; dressing or customizations not added", 280, "specialties"],
    ["avocado-ranch-chicken-stacker", "Avocado Ranch Chicken Stacker", "1 current published chicken stacker with Avocado Ranch sauce; customizations excluded", 350, "specialties"],
    ["three-cheese-chicken-flatbread-melt", "3 Cheese Chicken Flatbread Melt", "1 flatbread melt with chicken and three-cheese blend; customizations excluded", 320, "specialties", ["Three Cheese Chicken Flatbread Melt"]],
    ["veggie-mexican-pizza", "Veggie Mexican Pizza", "1 vegetarian Mexican Pizza in Taco Bell's published standard configuration; customizations excluded", 460, "specialties"],
    ["grande-nachos-seasoned-beef", "Grande Nachos - Seasoned Beef", "1 current featured order of Grande Nachos with seasoned beef in Taco Bell's published standard configuration; customizations excluded", 1110, "featured"],
    ["large-pineapple-freeze", "Large Pineapple Freeze", "1 large current featured Pineapple Freeze; custom additions excluded", 190, "featured"],
    ["large-mountain-dew-baja-midnight-dirty-soda", "Large MOUNTAIN DEW BAJA MIDNIGHT Dirty Soda", "1 large current featured dirty soda in Taco Bell's published standard configuration; customizations excluded", 470, "featured"],
    ["large-pepsi-dirty-soda", "Large PEPSI Dirty Soda", "1 large current featured dirty soda in Taco Bell's published standard configuration; customizations excluded", 430, "featured"],
    ["large-tropicana-original-dirty-lemonade", "Large TROPICANA Original Dirty Lemonade", "1 large current featured dirty lemonade in Taco Bell's published standard configuration; customizations excluded", 170, "featured"],
    ["caramel-apple-empanada", "Caramel Apple Empanada", "1 empanada", 290, "snacks-sweets"],
    ["chips-and-guacamole", "Chips and Guacamole", "1 order: tortilla chips with one side of guacamole", 230, "snacks-sweets"],
    ["chili-side", "Chili", "1 side order", 60, "snacks-sweets"],
    ["black-beans", "Black Beans", "1 side order", 50, "snacks-sweets"],
    ["pintos-n-cheese", "Pintos N Cheese", "1 side order", 170, "snacks-sweets", ["Pintos and Cheese"]],
    ["cinnabon-delights-12-pack", "Cinnabon Delights\u00ae 12 Pack", "12 pastries with Cinnabon frosting filling and cinnamon-sugar coating", 1010, "snacks-sweets"],
  ].map(([id, name, description, calories, sourcePath, searchAliases]) => tacoBellCurrentFood(id, name, description, calories, sourcePath, searchAliases)),
  tacoBellSizedCurrentFood("nacho-fries", "Nacho Fries", [
    ["regular", "Regular order of seasoned Nacho Fries; dipping sauce not included", 350],
    ["large", "Large order of seasoned Nacho Fries; dipping sauce not included", 500],
  ], "specialties", ["Taco Bell Nacho Fries"]),
  ...[
    ["avocado-verde-salsa-sauce-packet", "Avocado Verde Salsa Sauce Packet", 50],
    ["mild-sauce-packet", "Mild Sauce Packet", 0],
    ["hot-sauce-packet", "Hot Sauce Packet", 0],
    ["fire-sauce-packet", "Fire Sauce Packet", 0],
    ["diablo-sauce-packet", "Diablo Sauce Packet", 0],
    ["tajin-seasoning-packet", "Taj\u00edn\u00ae Seasoning Packet", 0, ["Tajin Seasoning Packet"]],
    ["jalapeno-peppers", "Jalape\u00f1o Peppers", 0, ["Jalapeno Peppers"]],
    ["chipotle-bacon-side", "Chipotle Bacon", 5],
    ["pepper-jack-sauce-side", "Pepper Jack Sauce", 200],
    ["nacho-cheese-sauce-side", "Nacho Cheese Sauce", 60],
    ["reduced-fat-sour-cream-side", "Reduced-Fat Sour Cream", 35],
    ["creamy-jalapeno-sauce-side", "Creamy Jalape\u00f1o Sauce", 180, ["Creamy Jalapeno Sauce"]],
    ["guacamole-side", "Guacamole", 70],
    ["chipotle-sauce-side", "Chipotle Sauce", 200],
    ["avocado-ranch-sauce-side", "Avocado Ranch Sauce", 220],
    ["spicy-ranch-side", "Spicy Ranch", 200],
    ["red-sauce-side", "Red Sauce", 15],
    ["mexican-pizza-sauce-side", "Mexican Pizza Sauce", 15],
  ].map(([id, name, calories, searchAliases]) => tacoBellCurrentFood(id, name, `1 separately sold side or packet of ${name}; no other food included`, calories, "snacks-sweets", searchAliases)),
  ...[
    ["cheesy-toasted-breakfast-burrito-bacon", "Cheesy Toasted Breakfast Burrito Bacon", "1 burrito: flour tortilla, eggs, nacho cheese sauce and bacon", 350],
    ["cheesy-toasted-breakfast-burrito-sausage", "Cheesy Toasted Breakfast Burrito Sausage", "1 burrito: flour tortilla, eggs, nacho cheese sauce and sausage", 350],
    ["cheesy-toasted-breakfast-burrito-potato", "Cheesy Toasted Breakfast Burrito Potato", "1 burrito: flour tortilla, eggs, nacho cheese sauce and potatoes", 340],
    ["grande-toasted-breakfast-burrito-steak", "Grande Toasted Breakfast Burrito Steak", "1 burrito: flour tortilla, eggs, potatoes, three-cheese blend, tomatoes and steak", 560],
    ["grande-toasted-breakfast-burrito-sausage", "Grande Toasted Breakfast Burrito Sausage", "1 burrito: flour tortilla, eggs, potatoes, three-cheese blend, tomatoes and sausage", 570],
    ["grande-toasted-breakfast-burrito-bacon", "Grande Toasted Breakfast Burrito Bacon", "1 burrito: flour tortilla, eggs, potatoes, three-cheese blend, tomatoes and bacon", 570],
    ["breakfast-quesadilla-sausage", "Breakfast Quesadilla Sausage", "1 flour-tortilla quesadilla with eggs, three-cheese blend and sausage", 500],
    ["breakfast-quesadilla-bacon", "Breakfast Quesadilla Bacon", "1 flour-tortilla quesadilla with eggs, three-cheese blend and bacon", 500],
    ["breakfast-quesadilla-steak", "Breakfast Quesadilla Steak", "1 flour-tortilla quesadilla with eggs, three-cheese blend and steak", 500],
    ["breakfast-california-crunchwrap", "Breakfast California Crunchwrap", "1 breakfast Crunchwrap with eggs, bacon, hash brown, guacamole, tomatoes and cheese", 640],
    ["breakfast-crunchwrap-bacon", "Breakfast Crunchwrap Bacon", "1 breakfast Crunchwrap with eggs, bacon, hash brown, cheese and Creamy Jalape\u00f1o sauce", 660],
    ["breakfast-crunchwrap-sausage", "Breakfast Crunchwrap Sausage", "1 breakfast Crunchwrap with eggs, sausage patty, hash brown, cheese and Creamy Jalape\u00f1o sauce", 740],
    ["hash-brown", "Hash Brown", "1 breakfast hash brown", 170],
    ["premium-hot-coffee", "Premium Hot Coffee", "1 restaurant cup, black; additions not included", 0],
    ["hot-cinnabon-delights-coffee", "Hot Cinnabon Delights\u00ae Coffee", "1 restaurant cup in the published standard flavored configuration", 160],
    ["regular-iced-coffee", "Regular Iced Coffee", "1 restaurant cup, unsweetened standard configuration; additions not included", 0],
    ["iced-cinnabon-delights-coffee", "Iced Cinnabon Delights\u00ae Coffee", "1 restaurant cup in the published standard flavored configuration", 160],
    ["breakfast-salsa", "Breakfast Salsa", "1 packet", 0],
  ].map(([id, name, description, calories]) => tacoBellCurrentFood(id, name, description, calories, "breakfast")),
  ...[
    ["large-pepsi", "Large Pepsi\u00ae", 380],
    ["large-diet-pepsi", "Large Diet Pepsi\u00ae", 0],
    ["large-pepsi-zero-sugar", "Large Pepsi\u00ae Zero Sugar", 0],
    ["large-cherry-pepsi", "Large Cherry Pepsi\u00ae", 390],
    ["large-mtn-dew", "Large MTN DEW\u00ae", 420, "Mountain Dew"],
    ["large-mtn-dew-zero", "Large MTN DEW\u00ae Zero", 5, "Mountain Dew"],
    ["large-mtn-dew-baja-blast", "Large MTN DEW\u00ae Baja Blast\u00ae", 410, "Mountain Dew"],
    ["large-mtn-dew-baja-blast-zero-sugar", "Large MTN DEW\u00ae Baja Blast\u00ae Zero Sugar", 15, "Mountain Dew"],
    ["large-mug-root-beer", "Large Mug\u00ae Root Beer", 360],
    ["large-starry", "Large Starry\u00ae", 370],
    ["large-g2-gatorade-fruit-punch", "Large G2 Gatorade\u00ae Fruit Punch", 80],
    ["large-tropicana-original-lemonade", "Large Tropicana\u00ae Original Lemonade", 120],
    ["large-brisk-mango-fiesta", "Large Brisk\u00ae Mango Fiesta", 170],
    ["large-lipton-unsweetened-iced-tea", "Large Lipton\u00ae Unsweetened Iced Tea", 0],
    ["tropicana-orange-juice", "Tropicana\u00ae Orange Juice", 140],
    ["aquafina-bottled-water", "Aquafina\u00ae Bottled Water", 0],
    ["large-mtn-dew-baja-blast-freeze", "Large MTN DEW\u00ae Baja Blast\u00ae Freeze", 190, "Mountain Dew"],
    ["large-blue-raspberry-freeze", "Large Blue Raspberry Freeze", 150],
  ].map(([id, name, calories, brand]) => {
    const food = tacoBellCurrentFood(id, name, name.includes("Large") ? "1 large restaurant fountain drink or Freeze; no custom flavor additions" : "1 published bottle or container", calories, "drinks");
    return brand ? { ...food, brand } : food;
  }),
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
const CHICK_FIL_A_CURRENT_REFERENCE = "Chick-fil-A current U.S. Nutrition & Allergens guide; values cover the named standard recipe, published size or count, and listed toppings where specified; separately selectable extras are excluded";
const chickFilAPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar: null,
});
const chickFilACurrentOption = (id, description, nutrients, amount = 1) => {
  const option = officialOption(chickFilA.id, id, description, { ...nutrients, addedSugar: null }, amount, CHICK_FIL_A_SOURCE, CHICK_FIL_A_CURRENT_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  option.provenance.verification.status = ["calories", "protein", "carbohydrates", "fat"].every((key) => nutrients[key] !== null && nutrients[key] !== undefined) ? "complete" : "partial";
  return option;
};
const chickFilACurrentFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = CHICK_FIL_A_CURRENT_REFERENCE) => {
  const selectedNutrients = nutrients || servingOptions?.[0]?.nutrients;
  const status = ["calories", "protein", "carbohydrates", "fat"].every((key) => selectedNutrients?.[key] !== null && selectedNutrients?.[key] !== undefined) ? "complete" : "partial";
  const food = officialFood(
    chickFilA,
    id,
    name,
    description,
    nutrients ? { ...nutrients, addedSugar: null } : null,
    CHICK_FIL_A_SOURCE,
    sourceReference,
    servingOptions,
    { status, accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const chickFilASizedFood = (id, name, options, searchAliases) => chickFilACurrentFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => chickFilACurrentOption(`${id}:${optionId}`, description, nutrients, amount)),
  searchAliases
);
const chickFilAFoods = [
  chickFilAFood("chicken-sandwich", "Chick-fil-A\u00ae Chicken Sandwich", "1 sandwich (183 g)", { calories: 420, protein: 29, carbohydrates: 41, fat: 18, sodium: 1460 }),
  chickFilAFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich (188 g)", { calories: 450, protein: 28, carbohydrates: 45, fat: 19, sodium: 1730 }),
  chickFilAFood("deluxe-sandwich-american", "Chick-fil-A\u00ae Deluxe Sandwich w/ American", "1 sandwich (247 g)", { calories: 490, protein: 32, carbohydrates: 43, fat: 22, sodium: 1700 }),
  chickFilAFood("nuggets", "Chick-fil-A\u00ae Nuggets", null, null, [
    chickFilAOption("nuggets:8-count", "8 count (113 g)", { calories: 250, protein: 27, carbohydrates: 11, fat: 11, sodium: 1210 }, 8),
    chickFilAOption("nuggets:12-count", "12 count (170 g)", { calories: 380, protein: 40, carbohydrates: 16, fat: 17, sodium: 1820 }, 12),
    chickFilACurrentOption("nuggets:5-count", "5 count (71 g)", chickFilAPublished(160, 17, 7, 7, 760, 0, 1), 5),
    chickFilACurrentOption("nuggets:30-count", "30 count (425 g)", chickFilAPublished(950, 100, 41, 43, 4550, 0, 4), 30),
  ]),
  chickFilAFood("grilled-nuggets", "Grilled Nuggets", null, null, [
    chickFilAOption("grilled-nuggets:8-count", "8 count (95 g)", { calories: 130, protein: 25, carbohydrates: 1, fat: 3, sodium: 440 }, 8),
    chickFilAOption("grilled-nuggets:12-count", "12 count (142 g)", { calories: 200, protein: 38, carbohydrates: 2, fat: 4.5, sodium: 660 }, 12),
    chickFilACurrentOption("grilled-nuggets:5-count", "5 count (59 g)", chickFilAPublished(80, 16, 1, 2, 270, 0, 0), 5),
    chickFilACurrentOption("grilled-nuggets:30-count", "30 count (369 g)", chickFilAPublished(510, 98, 4, 11, 1710, 1, 3), 30),
  ]),
  chickFilAFood("chick-n-strips", "Chick-fil-A Chick-n-Strips\u00ae", null, null, [
    chickFilAOption("chick-n-strips:3-count", "3 count (136 g)", { calories: 310, protein: 29, carbohydrates: 16, fat: 14, sodium: 870 }, 3),
    chickFilACurrentOption("chick-n-strips:2-count", "2 count (91 g)", chickFilAPublished(200, 19, 11, 9, 580, 0, 1), 2),
    chickFilACurrentOption("chick-n-strips:4-count", "4 count", chickFilAPublished(410, 39, 22, 19, null, null, null), 4),
    chickFilACurrentOption("chick-n-strips:10-count", "10 count", chickFilAPublished(1020, 96, 54, 46, null, null, null), 10),
  ]),
  chickFilAFood("waffle-potato-fries", "Chick-fil-A Waffle Potato Fries\u00ae", null, null, [
    chickFilAOption("waffle-potato-fries:small", "Small (96 g)", { calories: 320, protein: 4, carbohydrates: 35, fat: 19, sodium: 190 }),
    chickFilAOption("waffle-potato-fries:medium", "Medium (125 g)", { calories: 420, protein: 5, carbohydrates: 45, fat: 24, sodium: 240 }),
    chickFilAOption("waffle-potato-fries:large", "Large (179 g)", { calories: 600, protein: 7, carbohydrates: 65, fat: 35, sodium: 340 }),
  ]),
  chickFilAFood("mac-and-cheese", "Mac & Cheese", null, null, [
    chickFilAOption("mac-and-cheese:medium", "Medium (227 g)", { calories: 450, protein: 20, carbohydrates: 28, fat: 29, sodium: 1190 }),
    chickFilACurrentOption("mac-and-cheese:small", "Small (136 g)", chickFilAPublished(270, 12, 17, 17, 710, 2, 2)),
  ]),
  chickFilAFood("chicken-biscuit", "Chick-fil-A\u00ae Chicken Biscuit", "1 biscuit (153 g)", { calories: 460, protein: 19, carbohydrates: 45, fat: 23, sodium: 1510 }),
  chickFilAFood("chick-n-minis", "Chick-fil-A Chick-n-Minis\u00ae", null, null, [
    chickFilAOption("chick-n-minis:4-count", "4 count (127 g)", { calories: 360, protein: 20, carbohydrates: 41, fat: 13, sodium: 1060 }, 4),
    chickFilACurrentOption("chick-n-minis:10-count", "10 count (318 g)", chickFilAPublished(910, 49, 103, 34, 2640, 6, 19), 10),
  ]),
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
  ...[
    ["deluxe-sandwich-colby-jack", "Chick-fil-A\u00ae Deluxe Sandwich w/ Colby Jack", "1 sandwich (254 g): Chick-fil-A filet, Colby Jack, lettuce, tomato and pickles on a toasted bun", chickFilAPublished(510, 34, 43, 24, 1610, 1, 7)],
    ["spicy-deluxe-sandwich-american", "Spicy Deluxe Sandwich w/ American", "1 sandwich (252 g): spicy filet, American cheese, lettuce, tomato and pickles on a toasted bun", chickFilAPublished(510, 31, 47, 23, 1970, 2, 7)],
    ["spicy-chicken-biscuit", "Spicy Chicken Biscuit", "1 biscuit (153 g): spicy chicken filet on a buttermilk biscuit", chickFilAPublished(450, 19, 44, 22, 1570, 3, 5)],
    ["hash-brown-scramble-burrito-nuggets", "Hash Brown Scramble Burrito with Nuggets", "1 burrito (304 g): nuggets, hash browns, scrambled eggs and Monterey Jack/Cheddar in a flour tortilla; salsa packet not included", chickFilAPublished(700, 34, 51, 40, 1770, 3, 2)],
    ["hash-brown-scramble-burrito-sausage", "Hash Brown Scramble Burrito with Sausage", "1 burrito (283 g): sausage, hash browns, scrambled eggs and Monterey Jack/Cheddar in a flour tortilla; salsa packet not included", chickFilAPublished(720, 28, 46, 47, 1450, 3, 1)],
    ["hash-brown-scramble-bowl-sausage", "Hash Brown Scramble Bowl with Sausage", "1 bowl (212 g): sausage, hash browns, scrambled eggs and Monterey Jack/Cheddar; salsa packet not included", chickFilAPublished(480, 23, 15, 37, 1020, 2, 1)],
    ["chicken-egg-cheese-biscuit", "Chicken, Egg & Cheese Biscuit", "1 biscuit (211 g): chicken filet, folded egg and cheese on a buttermilk biscuit", chickFilAPublished(550, 27, 48, 28, 1870, 3, 7)],
    ["bacon-egg-cheese-biscuit", "Bacon, Egg & Cheese Biscuit", "1 biscuit (145 g): bacon, folded egg and cheese on a buttermilk biscuit", chickFilAPublished(420, 15, 38, 23, 1220, 2, 4)],
    ["sausage-egg-cheese-biscuit", "Sausage, Egg & Cheese Biscuit", "1 biscuit (192 g): sausage, folded egg and cheese on a buttermilk biscuit", chickFilAPublished(620, 22, 38, 42, 1510, 2, 4)],
    ["chicken-egg-cheese-muffin", "Chicken, Egg & Cheese Muffin", "1 sandwich (187 g): chicken filet, egg and cheese on an English muffin", chickFilAPublished(410, 27, 36, 18, 1320, 1, 4)],
    ["bacon-egg-cheese-muffin", "Bacon, Egg & Cheese Muffin", "1 sandwich: bacon, folded egg and American cheese on a toasted English muffin", chickFilAPublished(300, 16, 28, 13, 780, 1, 2)],
    ["sausage-egg-cheese-muffin", "Sausage, Egg & Cheese Muffin", "1 sandwich (173 g): sausage, egg and cheese on an English muffin", chickFilAPublished(490, 23, 29, 32, 1000, 1, 1)],
    ["chicken-waffles-breakfast-sandwich", "Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A\u00ae Filet", "1 limited-time breakfast sandwich (150 g): Chick-fil-A filet and breakfast waffle in the published configuration", chickFilAPublished(530, 22, 55, 26, 1160, 4, 27)],
    ["spicy-chicken-waffles-breakfast-sandwich", "Chicken & Waffles Breakfast Sandwich w/ Spicy Filet", "1 limited-time breakfast sandwich (150 g): spicy filet and breakfast waffle in the published configuration", chickFilAPublished(530, 23, 54, 25, 1220, 5, 26)],
    ["cobb-salad-nuggets", "Cobb Salad w/ Nuggets", "1 salad (411 g): mixed greens, Nuggets, roasted corn, tomatoes, cheese, bacon, egg, charred tomato peppers, crispy bell peppers and Avocado Lime Ranch dressing", chickFilAPublished(830, 41, 31, 60, 2180, 5, 8)],
    ["spicy-southwest-salad-spicy-grilled-filet", "Spicy Southwest Salad w/ Spicy Grilled Filet", "1 salad (424 g): greens, cold spicy grilled filet, tomatoes, Monterey Jack/Cheddar, corn-and-black-bean blend, tortilla strips, chili-lime pepitas and Creamy Salsa dressing", chickFilAPublished(680, 33, 27, 49, 1570, 7, 7)],
    ["market-salad-chick-fil-a-filet", "Market Salad w/ Chick-fil-A\u00ae Filet", "1 salad: greens, Chick-fil-A filet, blue cheese, apples, strawberries, blueberries, granola, almonds and the published dressing configuration", chickFilAPublished(460, 31, 37, 22, null, null, null)],
    ["kale-crunch-side", "Kale Crunch Side", "1 side (112 g): kale and cabbage in apple cider/Dijon vinaigrette with roasted almonds", chickFilAPublished(170, 4, 13, 12, 250, 4, 8)],
    ["side-salad", "Side Salad", "1 side (166 g) in the published standard configuration, including toppings and dressing", chickFilAPublished(470, 6, 14, 42, 700, 4, 5)],
    ["buddy-fruits-apple-sauce", "Buddy Fruits\u00ae Apple Sauce", "1 sealed pouch (90 g)", chickFilAPublished(45, 0, 12, 0, 0, 1, 8)],
    ["original-waffle-potato-chips", "Original Flavor Waffle Potato Chips", "1 bag (43 g)", chickFilAPublished(220, null, null, null, null, null, null)],
    ["chick-fil-a-sauce-waffle-potato-chips", "Chick-fil-A\u00ae Sauce Flavored Waffle Potato Chips", "1 bag (43 g)", chickFilAPublished(210, 3, 26, 12, 330, 2, 3)],
    ["chocolate-chunk-cookie", "Chocolate Chunk Cookie", "1 cookie (78 g)", chickFilAPublished(370, 5, 49, 17, 230, 3, 26)],
    ["chocolate-fudge-brownie", "Chocolate Fudge Brownie", "1 brownie (85 g)", chickFilAPublished(370, 4, 47, 21, 140, 2, 35)],
    ["frosted-lemonade", "Frosted Lemonade", "1 serving (383 g): Icedream blended with regular Chick-fil-A Lemonade", chickFilAPublished(350, 7, 67, 7, 135, 0, 65)],
    ["frosted-diet-lemonade", "Frosted Lemonade w/ Diet Lemonade", "1 serving (383 g): Icedream blended with Chick-fil-A Diet Lemonade", chickFilAPublished(280, 7, 50, 7, 140, 0, 48)],
    ["frosted-coffee", "Frosted Coffee", "1 serving (374 g): cold-brewed coffee blended with Icedream", chickFilAPublished(260, 7, 45, 7, 140, 0, 44)],
    ["cookies-and-cream-milkshake", "Cookies & Cream Milkshake", "1 shake (409 g) with whipped cream and cherry", chickFilAPublished(630, 13, 91, 25, 430, 1, 84)],
    ["chocolate-milkshake", "Chocolate Milkshake", "1 shake (409 g) with whipped cream and cherry", chickFilAPublished(600, 12, 93, 22, 350, 1, 90)],
    ["strawberry-milkshake", "Strawberry Milkshake", "1 shake (409 g) with whipped cream and cherry", chickFilAPublished(560, 10, 92, 18, 370, 1, 87)],
    ["vanilla-milkshake", "Vanilla Milkshake", "1 shake (409 g) with whipped cream and cherry", chickFilAPublished(580, 13, 82, 23, 390, 1, 80)],
    ["icedream-cone", "Chick-fil-A\u00ae Icedream\u00ae Cone", "1 cone (135 g)", chickFilAPublished(180, 4, 32, 4, 90, 0, 25)],
    ["icedream-cup", "Chick-fil-A\u00ae Icedream\u00ae Cup", "1 cup (122 g)", chickFilAPublished(140, 4, 24, 3.5, 75, 0, 24)],
    ["simply-orange", "Simply Orange\u00ae", "1 bottle (326 g)", chickFilAPublished(160, 2, 34, 0, 10, 0, 30)],
    ["one-percent-chocolate-milk", "1% Chocolate Milk", "1 bottle (198 g)", chickFilAPublished(140, 7, 23, 2, 160, 0, 21)],
    ["one-percent-milk", "1% Milk", "1 bottle (213 g)", chickFilAPublished(90, 7, 10, 2, 105, 0, 10)],
    ["honest-kids-apple-juice", "Honest Kids\u00ae Apple Juice", "1 juice box (170 g)", chickFilAPublished(35, 0, 9, 0, 15, 0, 8)],
    ["dasani-bottled-water", "DASANI\u00ae Bottled Water", "1 bottle", chickFilAPublished(0, 0, 0, 0, 0, 0, 0)],
    ["iced-coffee", "Iced Coffee", "1 container (661 g) in the published original configuration", chickFilAPublished(200, 7, 34, 4, 115, 0, 34)],
    ["vanilla-iced-coffee", "Vanilla Iced Coffee", "1 container (661 g)", chickFilAPublished(210, 7, 35, 4, 115, 0, 33)],
    ["caramel-iced-coffee", "Caramel Iced Coffee", "1 container (672 g)", chickFilAPublished(260, 8, 38, 9, 190, 0, 34)],
    ["hot-coffee", "Hot Coffee", "1 restaurant cup, black; additions not included", chickFilAPublished(0, null, null, null, null, null, null)],
  ].map(([id, name, description, nutrients]) => chickFilACurrentFood(id, name, description, nutrients)),
  chickFilASizedFood("fruit-cup", "Fruit Cup", [
    ["small", "Small Fruit Cup (107 g)", chickFilAPublished(60, 1, 14, 0, 0, 2, 11)],
    ["medium", "Medium Fruit Cup (125 g)", chickFilAPublished(70, 1, 16, 0, 0, 2, 12)],
    ["large", "Large Fruit Cup (215 g)", chickFilAPublished(120, 1, 28, 0, 0, 4, 21)],
  ]),
  chickFilASizedFood("chicken-noodle-soup", "Chicken Noodle Soup", [
    ["cup", "Cup (252 g)", chickFilAPublished(190, 11, 27, 4.5, 1290, 2, 2)],
    ["bowl", "Bowl (476 g)", chickFilAPublished(320, 20, 42, 8, 2280, 3, 3)],
  ]),
  chickFilASizedFood("berry-parfait", "Berry Parfait", [
    ["granola", "Berry Parfait with granola (206 g)", chickFilAPublished(270, 13, 35, 9, 85, 1, 26)],
    ["cookie-crumbs", "Berry Parfait with cookie crumbs (195 g)", chickFilAPublished(240, 12, 31, 8, 85, 1, 25)],
  ]),
  chickFilASizedFood("lemonade", "Chick-fil-A\u00ae Lemonade", [
    ["small", "Small (465 g)", chickFilAPublished(190, 0, 49, 0, 0, 0, 45)],
    ["medium", "Medium (612 g)", chickFilAPublished(260, 0, 66, 0, 0, 0, 60)],
    ["large", "Large (916 g)", chickFilAPublished(380, 1, 98, 0, 0, 1, 90)],
  ]),
  chickFilASizedFood("diet-lemonade", "Chick-fil-A\u00ae Diet Lemonade", [
    ["small", "Small (465 g)", chickFilAPublished(40, 0, 12, 0, 10, 0, 8)],
    ["medium", "Medium (612 g)", chickFilAPublished(60, 0, 15, 0, 10, 0, 11)],
    ["large", "Large (916 g)", chickFilAPublished(80, 0, 23, 0, 15, 0, 17)],
  ]),
  chickFilASizedFood("sunjoy-sweet-tea-lemonade", "Sunjoy\u00ae (1/2 Sweet Tea, 1/2 Lemonade)", [
    ["small", "Small (479 g)", chickFilAPublished(180, 0, 45, 0, 0, 0, 43)],
    ["medium", "Medium (641 g)", chickFilAPublished(240, 0, 60, 0, 0, 0, 57)],
    ["large", "Large (944 g)", chickFilAPublished(350, 0, 91, 0, 0, 0, 85)],
  ]),
  chickFilASizedFood("freshly-brewed-sweetened-iced-tea", "Freshly-Brewed Sweetened Iced Tea", [
    ["small", "Small (451 g)", chickFilAPublished(90, 0, 22, 0, 0, 0, 22)],
    ["medium", "Medium (604 g)", chickFilAPublished(120, 0, 31, 0, 0, 0, 30)],
    ["large", "Large (893 g)", chickFilAPublished(170, 0, 44, 0, 0, 0, 44)],
  ]),
  chickFilASizedFood("freshly-brewed-unsweetened-iced-tea", "Freshly-Brewed Unsweetened Iced Tea", [
    ["small", "Small (451 g)", chickFilAPublished(0, 0, 0, 0, 0, 0, 0)],
    ["medium", "Medium (604 g)", chickFilAPublished(0, 0, 0, 0, 0, 0, 0)],
    ["large", "Large (893 g)", chickFilAPublished(0, 0, 0, 0, 0, 0, 0)],
  ]),
  chickFilASizedFood("coca-cola", "Fountain Coca-Cola\u00ae", [
    ["small", "Small (451 g)", chickFilAPublished(130, 0, 35, 0, 35, 0, 35)],
    ["medium", "Medium (584 g)", chickFilAPublished(170, 0, 46, 0, 45, 0, 46)],
    ["large", "Large (859 g)", chickFilAPublished(250, 0, 68, 0, 65, 0, 68)],
  ], ["Chick-fil-A Coca-Cola", "Chick-fil-A Coke"]),
  chickFilASizedFood("dr-pepper", "Fountain Dr Pepper\u00ae", [
    ["small", "Small (451 g)", chickFilAPublished(130, 0, 34, 0, 40, 0, 34)],
    ["medium", "Medium (584 g)", chickFilAPublished(170, 0, 44, 0, 50, 0, 44)],
    ["large", "Large (859 g)", chickFilAPublished(250, 0, 64, 0, 75, 0, 64)],
  ], ["Chick-fil-A Dr Pepper"]),
  ...[
    ["honey-mustard-sauce", "Honey Mustard Sauce", 50],
    ["avocado-lime-ranch-dressing", "Avocado Lime Ranch Dressing", 310, chickFilAPublished(310, 1, 3, 32, 520, 1, 2)],
    ["creamy-salsa-dressing", "Creamy Salsa Dressing", 290, chickFilAPublished(290, 1, 2, 31, 630, 0, 1)],
    ["fat-free-honey-mustard-dressing", "Fat-Free Honey Mustard Dressing", 90],
    ["garden-herb-ranch-dressing", "Garden Herb Ranch Dressing", 280],
    ["light-balsamic-vinaigrette-dressing", "Light Balsamic Vinaigrette Dressing", 80],
    ["light-italian-dressing", "Light Italian Dressing", 25],
    ["zesty-apple-cider-vinaigrette-dressing", "Zesty Apple Cider Vinaigrette Dressing", 230],
  ].map(([id, name, calories, nutrients]) => chickFilACurrentFood(
    id,
    name,
    `1 packet or container of ${name}; no salad or entr\u00e9e included`,
    nutrients || { calories },
    undefined,
    undefined,
    `${CHICK_FIL_A_CURRENT_REFERENCE}; only calories are populated where the accessible official menu did not expose the remaining nutrient row`
  )),
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
const mcdonaldsPartialOption = (id, description, calories, sourceUrl, amount = 1) => ({
  id: `restaurant:mcdonalds:${id}`,
  serving: { amount, unit: "item", description },
  nutrients: { calories, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null },
  provenance: {
    source: "official-restaurant",
    sourceId: `mcdonalds:${id}`,
    confidence: "official-source",
    verification: {
      status: "partial",
      sourceType: "official-restaurant",
      sourceUrl,
      accessedAt: CURRENT_EXPANSION_CHECKED_AT,
      sourceReference: MCDONALDS_PARTIAL_REFERENCE,
    },
  },
});
const mcdonaldsSizedPartialFood = (id, name, description, options) => officialFood(
  mcdonalds,
  id,
  name,
  description,
  null,
  options[0][3],
  MCDONALDS_PARTIAL_REFERENCE,
  options.map(([optionId, optionDescription, calories, sourceUrl, amount = 1]) => (
    mcdonaldsPartialOption(`${id}:${optionId}`, optionDescription, calories, sourceUrl, amount)
  )),
  { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const mcdonaldsThreeSizePartialFood = (id, name, description, calories, productSlug = id) => {
  const food = mcdonaldsSizedPartialFood(id, name, description, ["small", "medium", "large"].map((size, index) => [
    size,
    `${size[0].toUpperCase()}${size.slice(1)} ${name.replace(/^McCaf\u00e9 /, "")}`,
    calories[index],
    `https://www.mcdonalds.com/us/en-us/product/${productSlug}-${size}.html`,
  ]));
  const unaccentedName = name.replace(/\u00e9/g, "e");
  return unaccentedName === name ? food : { ...food, searchAliases: [unaccentedName] };
};
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
  mcdonaldsPartialFood("sausage-biscuit", "Sausage Biscuit", "1 sandwich: sausage patty on a buttered buttermilk biscuit", 460, "https://www.mcdonalds.com/us/en-us/product/sausage-biscuit.html"),
  mcdonaldsPartialFood("bacon-egg-cheese-bagel", "Bacon, Egg & Cheese Bagel", "1 sandwich: toasted buttered bagel, bacon, folded egg, breakfast sauce and two American cheese slices", 590, "https://www.mcdonalds.com/us/en-us/product/bacon-egg-cheese-bagel.html"),
  mcdonaldsPartialFood("sausage-egg-cheese-bagel", "Sausage, Egg & Cheese Bagel", "1 sandwich: toasted bagel, sausage, folded egg, breakfast sauce and two American cheese slices", 710, "https://www.mcdonalds.com/us/en-us/product/sausage-egg-and-cheese-bagel.html"),
  mcdonaldsPartialFood("steak-egg-cheese-bagel", "Steak, Egg & Cheese Bagel", "1 sandwich: toasted buttered bagel, steak patty, folded egg, American cheese, breakfast sauce and grilled onions", 680, "https://www.mcdonalds.com/us/en-us/product/steak-egg-cheese-bagel.html"),
  mcdonaldsPartialFood("plain-bagel", "Bagel (plain)", "1 plain breakfast bagel", 270, "https://www.mcdonalds.com/us/en-us/product/bagel-plain.html"),
  mcdonaldsPartialFood("egg-cheese-bagel", "Egg and Cheese Bagel", "1 sandwich: bagel, folded egg, breakfast sauce and American cheese", 520, "https://www.mcdonalds.com/us/en-us/product/egg-and-cheese-bagel.html"),
  mcdonaldsPartialFood("egg-cheese-biscuit", "Egg Cheese Biscuit", "1 sandwich: buttered buttermilk biscuit, folded egg and American cheese", 390, "https://www.mcdonalds.com/us/en-us/product/egg-cheese-biscuit.html"),
  mcdonaldsPartialFood("quarter-pounder-cheese-deluxe", "Quarter Pounder with Cheese Deluxe", "1 burger: quarter-pound beef patty, two American cheese slices, lettuce, tomato, mayo, onions and pickles on a sesame bun", 630, "https://www.mcdonalds.com/us/en-us/product/deluxe-quarter-pounder-with-cheese.html"),
  mcdonaldsPartialFood("daily-double", "Daily Double", "1 burger: two beef patties, American cheese, lettuce, tomato, onions and mayo", 490, "https://www.mcdonalds.com/us/en-us/product/daily-double.html"),
  mcdonaldsPartialFood("bacon-quarter-pounder-cheese", "Bacon Quarter Pounder with Cheese", "1 burger: quarter-pound beef patty, bacon, two American cheese slices, onions and pickles on a sesame bun", 630, "https://www.mcdonalds.com/us/en-us/product/quarter-pounder-bacon.html"),
  mcdonaldsPartialFood("deluxe-mccrispy", "Deluxe McCrispy", "1 sandwich: fried chicken fillet, lettuce, tomato and mayo on a potato roll", 530, "https://www.mcdonalds.com/us/en-us/product/deluxe-mccrispy-chicken-sandwich.html"),
  mcdonaldsPartialFood("spicy-deluxe-mccrispy", "Spicy Deluxe McCrispy", "1 sandwich: fried chicken fillet, lettuce, tomato and Spicy Pepper Sauce on a potato roll", 530, "https://www.mcdonalds.com/us/en-us/product/spicy-deluxe-mccrispy-chicken-sandwich.html"),
  mcdonaldsPartialFood("spicy-chicken-mcnuggets-10-piece", "Spicy Chicken McNuggets", "10 piece limited-time serving; dipping sauce not included", 490, "https://www.mcdonalds.com/us/en-us/product/spicy-chicken-mcnuggets-10-piece.html"),
  mcdonaldsSizedPartialFood("mccrispy-strips", "McCrispy Strips", "all-white-meat chicken strips; dipping sauce not included", [
    ["3-piece", "3 piece serving", 400, "https://www.mcdonalds.com/us/en-us/product/mccrispy-strips-3-piece.html", 3],
    ["4-piece", "4 piece serving", 530, "https://www.mcdonalds.com/us/en-us/product/mccrispy-strips-4-piece.html", 4],
  ]),
  mcdonaldsPartialFood("apple-slices", "Apple Slices", "1 labelled serving of sliced apples", 15, "https://www.mcdonalds.com/us/en-us/product/apple-slices.html"),
  mcdonaldsSizedPartialFood("oreo-mcflurry", "OREO McFlurry", "vanilla soft serve with OREO cookie pieces", [
    ["mini", "Mini OREO McFlurry", 240, "https://www.mcdonalds.com/us/en-us/product/mini-mcflurry-with-oreo-cookies.html"],
    ["regular", "Regular OREO McFlurry", 410, "https://www.mcdonalds.com/us/en-us/product/mcflurry-with-oreo-cookies.html"],
  ]),
  mcdonaldsSizedPartialFood("mms-mcflurry", "M&M'S McFlurry", "vanilla soft serve with M&M'S Minis candies", [
    ["mini", "Mini M&M'S McFlurry", 340, "https://www.mcdonalds.com/us/en-us/product/mini-mm-candy-mcflurry.html"],
    ["regular", "Regular M&M'S McFlurry", 570, "https://www.mcdonalds.com/us/en-us/product/mm-candy-mcflurry.html"],
  ]),
  mcdonaldsPartialFood("vanilla-cone", "Vanilla Cone", "1 cone with vanilla soft serve", 200, "https://www.mcdonalds.com/us/en-us/product/vanilla-cone.html"),
  mcdonaldsSizedPartialFood("chocolate-shake", "Chocolate Shake", "soft serve with chocolate syrup and whipped light cream", [
    ["small", "Small Chocolate Shake", 520, "https://www.mcdonalds.com/us/en-us/product/chocolate-shake-small.html"],
    ["medium", "Medium Chocolate Shake", 650, "https://www.mcdonalds.com/us/en-us/product/chocolate-shake-medium.html"],
    ["large", "Large Chocolate Shake", 800, "https://www.mcdonalds.com/us/en-us/product/chocolate-shake-large.html"],
  ]),
  mcdonaldsSizedPartialFood("vanilla-shake", "Vanilla Shake", "soft serve with vanilla syrup and whipped light cream", [
    ["small", "Small Vanilla Shake", 480, "https://www.mcdonalds.com/us/en-us/product/vanilla-shake-small.html"],
    ["medium", "Medium Vanilla Shake", 570, "https://www.mcdonalds.com/us/en-us/product/vanilla-shake-medium.html"],
    ["large", "Large Vanilla Shake", 780, "https://www.mcdonalds.com/us/en-us/product/vanilla-shake-large.html"],
  ]),
  mcdonaldsSizedPartialFood("strawberry-shake", "Strawberry Shake", "soft serve with strawberry syrup and whipped light cream", [
    ["small", "Small Strawberry Shake", 470, "https://www.mcdonalds.com/us/en-us/product/strawberry-shake-small.html"],
    ["medium", "Medium Strawberry Shake", 600, "https://www.mcdonalds.com/us/en-us/product/strawberry-shake-medium.html"],
    ["large", "Large Strawberry Shake", 850, "https://www.mcdonalds.com/us/en-us/product/strawberry-shake-large.html"],
  ]),
  { ...mcdonaldsSizedPartialFood("premium-roast-coffee", "McCafé Premium Roast Coffee", "black 100% Arabica coffee; sugar, sweetener and dairy creamer not included", [
    ["small", "Small Premium Roast Coffee", 5, "https://www.mcdonalds.com/us/en-us/product/coffee-small.html"],
    ["medium", "Medium Premium Roast Coffee", 10, "https://www.mcdonalds.com/us/en-us/product/coffee-medium.html"],
    ["large", "Large Premium Roast Coffee", 10, "https://www.mcdonalds.com/us/en-us/product/coffee-large.html"],
  ]), searchAliases: ["McCafe Premium Roast Coffee"] },
  { ...mcdonaldsSizedPartialFood("premium-roast-decaf-coffee", "McCafé Premium Roast Decaf Coffee", "black decaffeinated 100% Arabica coffee; sugar, sweetener and dairy creamer not included", [
    ["small", "Small Premium Roast Decaf Coffee", 5, "https://www.mcdonalds.com/us/en-us/product/coffee-decaf-small.html"],
    ["medium", "Medium Premium Roast Decaf Coffee", 10, "https://www.mcdonalds.com/us/en-us/product/coffee-decaf-medium.html"],
    ["large", "Large Premium Roast Decaf Coffee", 15, "https://www.mcdonalds.com/us/en-us/product/coffee-decaf-large.html"],
  ]), searchAliases: ["McCafe Premium Roast Decaf Coffee"] },
  mcdonaldsThreeSizePartialFood("caramel-apple-pie-iced-coffee", "McCaf\u00e9 Caramel Apple Pie Iced Coffee", "limited-time iced coffee with caramel apple pie syrup, apple pie crumble and salted-caramel flavored whipped topping", [240, 290, 330], "caramel-apple-pie-iced-coffee"),
  mcdonaldsThreeSizePartialFood("iced-coffee", "McCaf\u00e9 Iced Coffee", "100% Arabica iced coffee with cream in the standard product-page configuration; optional flavor substitutions are not included", [150, 190, 270], "iced-coffee"),
  mcdonaldsThreeSizePartialFood("iced-black-coffee", "McCaf\u00e9 Iced Black Coffee", "100% Arabica coffee served over ice without cream or flavored syrup", [5, 10, 15], "iced-coffee-black"),
  mcdonaldsThreeSizePartialFood("iced-caramel-coffee", "McCaf\u00e9 Iced Caramel Coffee", "premium-roast iced coffee with caramel syrup and cream", [150, 200, 280], "iced-coffee-caramel"),
  mcdonaldsThreeSizePartialFood("iced-french-vanilla-coffee", "McCaf\u00e9 Iced French Vanilla Coffee", "premium-roast iced coffee with French vanilla flavor and cream", [150, 200, 280], "iced-coffee-french-vanilla"),
  mcdonaldsThreeSizePartialFood("hot-tea", "Hot Tea", "orange pekoe and pekoe-cut black tea in the standard product-page configuration", [10, 10, 15], "hot-tea"),
  mcdonaldsThreeSizePartialFood("hot-chocolate", "McCaf\u00e9 Hot Chocolate", "steamed whole milk and hot-chocolate syrup with whipped light cream and chocolate drizzle", [360, 440, 540], "hot-chocolate"),
  mcdonaldsThreeSizePartialFood("caramel-apple-pie-frappe", "McCaf\u00e9 Caramel Apple Pie Frapp\u00e9", "limited-time blended coffee with caramel apple pie syrup, apple pie crumble and salted-caramel flavored whipped topping", [530, 620, 840], "caramel-apple-frappe"),
  mcdonaldsThreeSizePartialFood("caramel-frappe", "McCaf\u00e9 Caramel Frapp\u00e9", "caramel-flavored blended coffee with ice and whipped light cream", [420, 490, 650], "frappe-caramel"),
  mcdonaldsThreeSizePartialFood("mocha-frappe", "McCaf\u00e9 Mocha Frapp\u00e9", "chocolate-flavored blended coffee with ice and whipped light cream", [430, 490, 660], "frappe-mocha"),
  mcdonaldsThreeSizePartialFood("caramel-macchiato", "McCaf\u00e9 Caramel Macchiato", "dark-roast espresso, caramel syrup and steamed whole milk", [260, 320, 400], "caramel-macchiato"),
  mcdonaldsThreeSizePartialFood("iced-caramel-macchiato", "McCaf\u00e9 Iced Caramel Macchiato", "dark-roast espresso, whole milk, caramel syrup and caramel drizzle served over ice", [200, 240, 360], "iced-caramel-macchiato"),
  mcdonaldsThreeSizePartialFood("mocha-latte", "McCaf\u00e9 Mocha Latte", "espresso, steamed whole milk and chocolate syrup", [290, 370, 460], "mocha-latte"),
  mcdonaldsThreeSizePartialFood("iced-mocha-latte", "McCaf\u00e9 Iced Mocha Latte", "espresso, whole milk and chocolate syrup over ice with whipped light cream and chocolate drizzle", [270, 320, 440], "iced-mocha"),
  mcdonaldsThreeSizePartialFood("caramel-apple-pie-latte", "McCaf\u00e9 Caramel Apple Pie Latte", "limited-time espresso and steamed milk with caramel apple pie syrup, apple pie crumble and salted-caramel flavored whipped topping", [340, 410, 490], "caramel-apple-pie-latte"),
  mcdonaldsThreeSizePartialFood("caramel-apple-pie-iced-latte", "McCaf\u00e9 Caramel Apple Pie Iced Latte", "limited-time espresso and cold milk over ice with caramel apple pie syrup, apple pie crumble and salted-caramel flavored whipped topping", [280, 310, 420], "caramel-apple-pie-iced-latte"),
  mcdonaldsThreeSizePartialFood("latte", "McCaf\u00e9 Latte", "espresso and steamed whole milk without added flavor syrup", [140, 190, 250], "latte"),
  mcdonaldsThreeSizePartialFood("caramel-latte", "McCaf\u00e9 Caramel Latte", "espresso, steamed whole milk and caramel syrup", [250, 320, 390], "latte-caramel"),
  mcdonaldsThreeSizePartialFood("french-vanilla-latte", "McCaf\u00e9 French Vanilla Latte", "espresso, steamed whole milk and French vanilla syrup", [250, 320, 400], "latte-french-vanilla"),
  mcdonaldsThreeSizePartialFood("iced-latte", "McCaf\u00e9 Iced Latte", "espresso and whole milk served over ice without added flavor syrup", [80, 120, 170], "iced-latte"),
  mcdonaldsThreeSizePartialFood("iced-caramel-latte", "McCaf\u00e9 Iced Caramel Latte", "espresso, whole milk and caramel syrup served over ice", [180, 220, 330], "iced-caramel-latte"),
  mcdonaldsThreeSizePartialFood("cappuccino", "McCaf\u00e9 Cappuccino", "espresso with steamed whole milk and foam without added flavor syrup", [110, 160, 200], "cappuccino"),
  mcdonaldsThreeSizePartialFood("french-vanilla-cappuccino", "McCaf\u00e9 French Vanilla Cappuccino", "espresso, steamed whole milk, foam and French vanilla flavor", [210, 260, 340], "french-vanilla-cappuccino"),
  mcdonaldsThreeSizePartialFood("caramel-cappuccino", "McCaf\u00e9 Caramel Cappuccino", "espresso, steamed whole milk, foam and caramel flavor", [210, 260, 340], "caramel-cappuccino"),
  mcdonaldsThreeSizePartialFood("americano", "McCaf\u00e9 Americano", "espresso and hot water without milk, sweetener or flavor syrup", [0, 5, 5], "espresso-americano-coffee"),
  mcdonaldsPartialFood("red-bull-dragonberry-energizer", "Red Bull Dragonberry Energizer", "1 published serving over ice: Red Bull, blue-raspberry flavor and freeze-dried dragon fruit; contains 80 mg caffeine", 200, "https://www.mcdonalds.com/us/en-us/product/red-bull-dragonberry-energizer.html"),
  mcdonaldsPartialFood("reduced-sugar-red-bull-dragonberry-energizer", "Reduced Sugar Red Bull Dragonberry Energizer", "1 published serving over ice: Red Bull Zero, blue-raspberry flavor and freeze-dried dragon fruit; contains 80 mg caffeine", 100, "https://www.mcdonalds.com/us/en-us/product/reduced-sugar-red-bull-dragonberry-energizer.html"),
  mcdonaldsThreeSizePartialFood("sprite-berry-blast", "Sprite Berry Blast", "Sprite with blue-raspberry flavor and chilled cold foam, served over ice", [210, 290, 390], "sprite-berry-blast"),
  mcdonaldsThreeSizePartialFood("strawberry-watermelon-refresher", "Strawberry Watermelon Refresher", "standard caffeinated configuration with strawberry and watermelon flavors, lemonade and freeze-dried strawberries over ice", [160, 210, 260], "strawberry-watermelon-refresher"),
  mcdonaldsThreeSizePartialFood("dirty-dr-pepper", "Dirty Dr Pepper", "Dr Pepper with vanilla flavor and chilled cold foam, served over ice", [220, 300, 410], "dirty-dr-pepper"),
  mcdonaldsThreeSizePartialFood("vanilla-swirl-coca-cola", "Vanilla Swirl with Coca-Cola", "Coca-Cola with vanilla flavor and chilled cold foam, served over ice", [250, 340, 430], "vanilla-swirl-with-coke"),
  mcdonaldsThreeSizePartialFood("reduced-sugar-vanilla-swirl-diet-coke", "Reduced Sugar Vanilla Swirl with Diet Coke", "Diet Coke with vanilla syrup and chilled cold foam, served over ice", [150, 190, 230], "reduced-sugar-vanilla-swirl-with-diet-coke"),
  mcdonaldsThreeSizePartialFood("mango-pineapple-refresher", "Mango Pineapple Refresher", "standard caffeinated configuration with mango and pineapple flavors, lemonade and strawberry popping boba over ice", [180, 250, 330], "mango-pineapple-refresher"),
  mcdonaldsThreeSizePartialFood("blackberry-passion-fruit-refresher", "Blackberry Passion Fruit Refresher", "standard caffeinated configuration with blackberry and passion-fruit flavors, lemonade and freeze-dried dragon fruit over ice", [170, 230, 270], "blackberry-passionfruit-refresher"),
  mcdonaldsThreeSizePartialFood("orange-dream-hi-c", "Orange Dream with Hi-C", "Hi-C Orange Lavaburst with vanilla flavor and chilled cold foam, served over ice", [230, 320, 430], "orange-dream"),
  mcdonaldsThreeSizePartialFood("orange-dream-fanta", "Orange Dream with Fanta", "Fanta with vanilla flavor and chilled cold foam, served over ice", [250, 340, 440], "orange-dream-with-fanta"),
  mcdonaldsSizedPartialFood("diet-coke", "Diet Coke", "fountain Diet Coke with standard ice fill", [
    ["extra-small", "Extra Small Diet Coke", 0, "https://www.mcdonalds.com/us/en-us/product/diet-coke-small.html"],
    ["small", "Small Diet Coke", 0, "https://www.mcdonalds.com/us/en-us/product/diet-coke-small.html"],
    ["medium", "Medium Diet Coke", 0, "https://www.mcdonalds.com/us/en-us/product/diet-coke-small.html"],
    ["large", "Large Diet Coke", 0, "https://www.mcdonalds.com/us/en-us/product/diet-coke-small.html"],
  ]),
  mcdonaldsSizedPartialFood("sprite", "Sprite", "fountain Sprite with standard ice fill", [
    ["extra-small", "Extra Small Sprite", 140, "https://www.mcdonalds.com/us/en-us/product/sprite-extra-small.html"],
    ["small", "Small Sprite", 190, "https://www.mcdonalds.com/us/en-us/product/sprite-small.html"],
    ["medium", "Medium Sprite", 250, "https://www.mcdonalds.com/us/en-us/product/sprite-medium.html"],
    ["large", "Large Sprite", 350, "https://www.mcdonalds.com/us/en-us/product/sprite-large.html"],
  ]),
  mcdonaldsSizedPartialFood("hi-c-orange-lavaburst", "Hi-C Orange Lavaburst", "fountain Hi-C Orange Lavaburst with standard ice fill", [
    ["extra-small", "Extra Small Hi-C Orange Lavaburst", 160, "https://www.mcdonalds.com/us/en-us/product/hi-c-orange-lavaburst-extra-small.html"],
    ["small", "Small Hi-C Orange Lavaburst", 220, "https://www.mcdonalds.com/us/en-us/product/hi-c-orange-lavaburst-small.html"],
    ["medium", "Medium Hi-C Orange Lavaburst", 280, "https://www.mcdonalds.com/us/en-us/product/hi-c-orange-lavaburst-medium.html"],
    ["large", "Large Hi-C Orange Lavaburst", 410, "https://www.mcdonalds.com/us/en-us/product/hi-c-orange-lavaburst-large.html"],
  ]),
  mcdonaldsSizedPartialFood("dr-pepper", "Dr Pepper", "fountain Dr Pepper with standard ice fill", [
    ["extra-small", "Extra Small Dr Pepper", 140, "https://www.mcdonalds.com/us/en-us/product/dr-pepper-extra-small.html"],
    ["small", "Small Dr Pepper", 190, "https://www.mcdonalds.com/us/en-us/product/dr-pepper-small.html"],
    ["medium", "Medium Dr Pepper", 250, "https://www.mcdonalds.com/us/en-us/product/dr-pepper-medium.html"],
    ["large", "Large Dr Pepper", 360, "https://www.mcdonalds.com/us/en-us/product/dr-pepper-large.html"],
  ]),
  mcdonaldsSizedPartialFood("lemonade", "Lemonade", "lemonade with real lemon juice, lemon pulp and cane sugar", [
    ["small", "Small Lemonade", 120, "https://www.mcdonalds.com/us/en-us/product/lemonade-small.html"],
    ["medium", "Medium Lemonade", 190, "https://www.mcdonalds.com/us/en-us/product/lemonade-medium.html"],
    ["large", "Large Lemonade", 270, "https://www.mcdonalds.com/us/en-us/product/lemonade-large.html"],
  ]),
  mcdonaldsSizedPartialFood("sweet-tea", "Sweet Tea", "sweetened orange pekoe and pekoe-cut black iced tea", [
    ["small", "Small Sweet Tea", 170, "https://www.mcdonalds.com/us/en-us/product/sweet-tea-small.html"],
  ]),
  mcdonaldsSizedPartialFood("unsweetened-iced-tea", "Unsweetened Iced Tea", "fresh-brewed orange pekoe black tea served over ice without sweetener", [
    ["extra-small", "Extra Small Unsweetened Iced Tea", 0, "https://www.mcdonalds.com/us/en-us/product/iced-tea-small.html"],
    ["small", "Small Unsweetened Iced Tea", 0, "https://www.mcdonalds.com/us/en-us/product/iced-tea-small.html"],
    ["medium", "Medium Unsweetened Iced Tea", 0, "https://www.mcdonalds.com/us/en-us/product/iced-tea-small.html"],
    ["large", "Large Unsweetened Iced Tea", 0, "https://www.mcdonalds.com/us/en-us/product/iced-tea-small.html"],
  ]),
  mcdonaldsPartialFood("dasani-water", "DASANI Water", "1 bottle of purified water enhanced with minerals", 0, "https://www.mcdonalds.com/us/en-us/product/dasani-water.html"),
  mcdonaldsPartialFood("low-fat-milk-jug", "1% Low Fat Milk Jug", "1 individual milk jug; standalone or Happy Meal drink component", 100, "https://www.mcdonalds.com/us/en-us/product/1-low-fat-milk-jug.html"),
  mcdonaldsPartialFood("reduced-sugar-chocolate-milk-jug", "Reduced Sugar Low Fat Chocolate Milk Jug", "1 individual chocolate milk jug; standalone or Happy Meal drink component", 130, "https://www.mcdonalds.com/us/en-us/product/reduced-sugar-low-fat-chocolate-milk-jug.html"),
  mcdonaldsSizedPartialFood("minute-maid-orange-juice", "Minute Maid Premium Orange Juice", "100% orange juice", [
    ["small", "Small Minute Maid Premium Orange Juice", 150, "https://www.mcdonalds.com/us/en-us/product/minute-maid-orange-juice-small.html"],
    ["medium", "Medium Minute Maid Premium Orange Juice", 190, "https://www.mcdonalds.com/us/en-us/product/minute-maid-orange-juice-medium-201248.html"],
    ["large", "Large Minute Maid Premium Orange Juice", 270, "https://www.mcdonalds.com/us/en-us/product/minute-maid-orange-juice-large.html"],
  ]),
  mcdonaldsPartialFood("honest-kids-appley-ever-after", "Honest Kids Appley Ever After Organic Juice Drink", "1 organic apple juice drink box; standalone or Happy Meal drink component", 35, "https://www.mcdonalds.com/us/en-us/product/honest-kids-appley-ever-after-6-fl-oz-drink-box.html"),
  mcdonaldsSizedPartialFood("frozen-hawaiian-punch", "Frozen Hawaiian Punch", "frozen Hawaiian Punch beverage", [
    ["small", "Small Frozen Hawaiian Punch", 60, "https://www.mcdonalds.com/us/en-us/product/frozen-hawaiian-punch-small.html"],
  ]),
  mcdonaldsSizedPartialFood("frozen-coke", "Frozen Coca-Cola Classic", "limited-time frozen Coca-Cola Classic beverage", [
    ["small", "Small Frozen Coca-Cola Classic", 60, "https://www.mcdonalds.com/us/en-us/product/frozen-coke-small.html"],
  ]),
  mcdonaldsSizedPartialFood("frozen-fanta-blue-raspberry", "Frozen Fanta Blue Raspberry", "limited-time frozen Fanta Blue Raspberry beverage", [
    ["small", "Small Frozen Fanta Blue Raspberry", 60, "https://www.mcdonalds.com/us/en-us/product/frozen-fanta-blue-raspberry-small.html"],
  ]),
  { ...mcdonaldsSizedPartialFood("strawberry-banana-smoothie", "McCaf\u00e9 Strawberry Banana Smoothie", "strawberry and banana fruit smoothie blended with low-fat yogurt and ice", [
    ["small", "Small Strawberry Banana Smoothie", 190, "https://www.mcdonalds.com/us/en-us/product/strawberry-banana-smoothie-small.html"],
  ]), searchAliases: ["McCafe Strawberry Banana Smoothie"] },
  { ...mcdonaldsSizedPartialFood("mango-pineapple-smoothie", "McCaf\u00e9 Mango Pineapple Smoothie", "mango and pineapple fruit smoothie blended with low-fat yogurt and ice", [
    ["small", "Small Mango Pineapple Smoothie", 200, "https://www.mcdonalds.com/us/en-us/product/mango-pineapple-smoothie-small.html"],
  ]), searchAliases: ["McCafe Mango Pineapple Smoothie"] },
  mcdonaldsPartialFood("hot-fudge-sundae", "Hot Fudge Sundae", "1 sundae: vanilla soft serve with hot fudge topping", 330, "https://www.mcdonalds.com/us/en-us/product/hot-fudge-sundae.html"),
  mcdonaldsPartialFood("baked-apple-pie", "Baked Apple Pie", "1 baked apple pie", 230, "https://www.mcdonalds.com/us/en-us/product/baked-hot-apple-pie.html"),
  mcdonaldsPartialFood("chocolate-chip-cookie", "Chocolate Chip Cookie", "1 cookie", 170, "https://www.mcdonalds.com/us/en-us/product/chocolate-chip-cookie.html"),
  ...[
    ["mighty-hot-sauce", "Mighty Hot Sauce", "1 dipping cup", 25, "mighty-hot-sauce-dip-cup"],
    ["creamy-chili-dip", "Creamy Chili McCrispy Strip Dip", "1 dipping cup", 110, "creamy-chili-sauce"],
    ["tangy-barbeque-sauce", "Tangy Barbeque Sauce", "1 sauce serving", 45, "tangy-barbeque-sauce"],
    ["spicy-buffalo-sauce", "Spicy Buffalo Sauce", "1 sauce serving", 30, "spicy-buffalo-sauce"],
    ["creamy-ranch-sauce", "Creamy Ranch Sauce", "1 sauce serving", 110, "creamy-ranch-sauce"],
    ["honey-mustard-sauce", "Honey Mustard Sauce", "1 sauce serving", 60, "honey-mustard-sauce"],
    ["sweet-n-sour-sauce", "Sweet 'N Sour Sauce", "1 sauce serving", 50, "sweet-n-sour-sauce"],
    ["ketchup-packet", "Ketchup Packet", "1 packet", 10, "ketchup-packet"],
    ["mayonnaise-packet", "Mayonnaise Packet", "1 packet", 90, "mayonnaise-packet"],
    ["mustard-packet", "Mustard Packet", "1 packet", 0, "mustard-package"],
    ["honey", "Honey", "1 sauce serving", 50, "honey"],
  ].map(([id, name, description, calories, slug]) => mcdonaldsPartialFood(id, name, description, calories, `https://www.mcdonalds.com/us/en-us/product/${slug}.html`)),
];

const wendys = { id: "wendys", name: "Wendy's" };
const WENDYS_PARTIAL_REFERENCE = "Wendy's official current US item page and national menu calorie listing; the detailed nutrient panel was unavailable in the accessible response, so unpublished nutrients remain unknown";
const WENDYS_DETAILED_REFERENCE = "Wendy's official current US item page nutritional-value panel; calories, fat, sodium, carbohydrate, fiber, total sugars and protein are recorded, while added sugars were not published and remain unknown";
const WENDYS_SAUCES_REFERENCE = "Wendy's official Sauces & Dressings page; published calories, fat, carbohydrate and protein are recorded, while serving weight, sodium, fiber and sugars were unavailable and remain unknown";
const wendysFood = (id, name, description, calories, sourceUrl, servingOptions, publishedNutrients = {}, sourceReference = WENDYS_PARTIAL_REFERENCE) => officialFood(
  wendys,
  id,
  name,
  description,
  { calories, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null, ...publishedNutrients },
  sourceUrl,
  sourceReference,
  servingOptions,
  { status: "partial", accessedAt: CURRENT_EXPANSION_CHECKED_AT }
);
const wendysOption = (id, description, calories, sourceUrl, amount = 1) => ({
  id: `restaurant:wendys:${id}`,
  serving: { amount, unit: "item", description },
  nutrients: { calories, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null },
  provenance: {
    source: "official-restaurant",
    sourceId: `wendys:${id}`,
    confidence: "official-source",
    verification: {
      status: "partial",
      sourceType: "official-restaurant",
      sourceUrl,
      accessedAt: CURRENT_EXPANSION_CHECKED_AT,
      sourceReference: WENDYS_PARTIAL_REFERENCE,
    },
  },
});
const wendysMenuUrl = (category, slug) => `https://order.wendys.com/us/en/national/menu/${category}/${slug}`;
const wendysSizedFood = (id, name, category, description, options, searchAliases) => {
  const sourceUrl = wendysMenuUrl(category, id);
  const food = wendysFood(id, name, description, null, sourceUrl, options.map(([optionId, optionDescription, calories, amount = 1]) => (
    wendysOption(`${id}:${optionId}`, optionDescription, calories, sourceUrl, amount)
  )));
  return searchAliases ? { ...food, searchAliases } : food;
};
const wendysFoods = [
  wendysFood("daves-single", "Dave's Single®", "1 standard burger: quarter-pound beef patty (pre-cooked weight), American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 560, "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single"),
  wendysFood("baconator", "Baconator®", "1 standard burger: half-pound beef (pre-cooked weight), American cheese, 6 pieces of Applewood smoked bacon, ketchup and mayo on a potato bun", 890, "https://order.wendys.com/us/en/national/menu/hamburgers/baconator"),
  wendysFood("jr-bacon-cheeseburger", "Jr. Bacon Cheeseburger", "1 standard burger: beef patty, Applewood smoked bacon, American cheese, lettuce, tomato and mayo", 350, "https://order.wendys.com/us/en/national/menu/hamburgers/jr-bacon-cheeseburger"),
  wendysFood("classic-chicken-sandwich", "Classic Chicken Sandwich", "1 standard sandwich: crispy chicken breast, lettuce, tomato, mayo and pickles on a potato bun", 550, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/classic-chicken-sandwich"),
  wendysFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 standard sandwich: breaded spicy chicken breast, lettuce, pickles, tomato and mayo on a potato bun", 560, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/spicy-chicken-sandwich"),
  { ...wendysFood("grilled-chicken-ranch-wrap", "Grilled Chicken Ranch Wrap", "1 standard wrap: herb-marinated grilled chicken breast, shredded cheddar, romaine and ranch sauce in a warm tortilla", 420, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/grilled-chicken-wrap"), searchAliases: ["Grilled Chicken Wrap"] },
  wendysFood("10-piece-chicken-nuggets", "10 PC. Chicken Nuggets", "Breaded all-white-meat chicken nuggets; dipping sauce is selected separately and is not included", 430, "https://order.wendys.com/us/en/national/menu/chicken-nuggets-more/10-pc-chicken-nuggets", [
    wendysOption("10-piece-chicken-nuggets:10-piece", "10 piece serving; dipping sauce not included", 430, wendysMenuUrl("chicken-nuggets-more", "10-pc-chicken-nuggets"), 10),
    wendysOption("10-piece-chicken-nuggets:4-piece", "4 piece serving; dipping sauce not included", 170, wendysMenuUrl("chicken-nuggets-more", "4-pc-chicken-nuggets"), 4),
    wendysOption("10-piece-chicken-nuggets:6-piece", "6 piece serving; dipping sauce not included", 260, wendysMenuUrl("chicken-nuggets-more", "6-pc-chicken-nuggets"), 6),
  ]),
  wendysFood("plain-baked-potato", "Plain Baked Potato", "1 plain baked potato with no toppings", 270, "https://order.wendys.com/us/en/national/menu/fries-sides/plain-baked-potato"),
  wendysFood("apple-bites", "Apple Bites", "1 side of sliced apple pieces", 35, "https://order.wendys.com/us/en/national/menu/fries-sides/apple-bites"),
  wendysFood("breakfast-baconator", "Breakfast Baconator®", "1 standard breakfast sandwich: grilled sausage, American cheese, Applewood smoked bacon, egg and Swiss cheese sauce on a potato bun", 630, "https://order.wendys.com/us/en/national/menu/classics/breakfast-baconator"),
  ...[
    ["pretzel-bacon-pub-cheeseburger", "Pretzel Bacon Pub Cheeseburger", "1 standard burger: quarter-pound beef patty, muenster, Applewood smoked bacon, beer cheese, crispy onions, pickles and smoky honey mustard on a pretzel bun", 780],
    ["pretzel-bacon-pub-double-cheeseburger", "Pretzel Bacon Pub Double Cheeseburger", "1 standard double burger with muenster, Applewood smoked bacon, beer cheese, crispy onions, pickles and smoky honey mustard on a pretzel bun", 1110],
    ["pretzel-bacon-pub-triple-cheeseburger", "Pretzel Bacon Pub Triple Cheeseburger", "1 standard triple burger with muenster, Applewood smoked bacon, beer cheese, crispy onions, pickles and smoky honey mustard on a pretzel bun", 1430],
    ["daves-double", "Dave's Double®", "1 standard burger: two beef patties, American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 810],
    ["daves-triple", "Dave's Triple®", "1 standard burger: three beef patties, American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 1100],
    ["son-of-baconator", "Son of Baconator®", "1 standard burger: two beef patties, American cheese, Applewood smoked bacon, ketchup and mayo on a potato bun", 590],
    ["big-bacon-classic", "Big Bacon Classic®", "1 standard burger: beef patty, Applewood smoked bacon, American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 610],
    ["big-bacon-classic-double", "Big Bacon Classic® Double", "1 standard double burger with Applewood smoked bacon, American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 860],
    ["big-bacon-classic-triple", "Big Bacon Classic® Triple", "1 standard triple burger with Applewood smoked bacon, American cheese, lettuce, tomato, pickle, ketchup, mustard, mayo and onion on a potato bun", 1140],
    ["bacon-double-stack-tm", "Bacon Double Stack™", "1 standard burger: two beef patties, Applewood smoked bacon, American cheese, ketchup, mustard, pickle and onion on a bun", 420],
    ["jr-cheeseburger-deluxe", "Jr. Cheeseburger Deluxe", "1 standard junior burger: beef patty, American cheese, pickles, onion, tomato, lettuce, ketchup, mustard and mayo on a bun", 330],
    ["jr-cheeseburger", "Jr. Cheeseburger", "1 standard junior burger: beef patty, American cheese, pickles, onion, ketchup and mustard on a bun", 270],
    ["double-stack-tm", "Double Stack™", "1 standard burger: two beef patties, American cheese, ketchup, mustard, pickle and onion on a bun", 380],
    ["jr-hamburger", "Jr. Hamburger", "1 standard junior burger: beef patty, pickles, onion, ketchup and mustard on a bun", 230],
  ].map(([id, name, description, calories]) => wendysFood(id, name, description, calories, wendysMenuUrl("hamburgers", id))),
  wendysFood("pretzel-bacon-pub-chicken-sandwich", "Pretzel Bacon Pub Chicken Sandwich", "1 standard sandwich: crispy chicken breast, muenster, Applewood smoked bacon, beer cheese, crispy onions, pickles and smoky honey mustard on a pretzel bun", 860, wendysMenuUrl("chicken-nuggets-more", "pretzel-bacon-pub-chicken-sandwich")),
  wendysFood("asiago-ranch-club-sandwich-classic", "Asiago Ranch Club Sandwich, Classic", "1 classic chicken sandwich with Asiago cheese, Applewood smoked bacon, lettuce, tomato and ranch; customizations excluded", 670, wendysMenuUrl("chicken-nuggets-more", "asiago-ranch-club-sandwich-classic")),
  wendysFood("asiago-ranch-club-sandwich-spicy", "Asiago Ranch Club Sandwich, Spicy", "1 spicy chicken sandwich with Asiago cheese, Applewood smoked bacon, lettuce, tomato and ranch; customizations excluded", 680, wendysMenuUrl("chicken-nuggets-more", "asiago-ranch-club-sandwich-spicy")),
  wendysFood("crispy-chicken-blt", "Crispy Chicken BLT", "1 standard crispy chicken sandwich with Applewood smoked bacon, American cheese, lettuce, tomato and mayo; customizations excluded", 420, wendysMenuUrl("chicken-nuggets-more", "crispy-chicken-blt")),
  wendysFood("crispy-chicken-sandwich", "Crispy Chicken Sandwich", "1 standard crispy chicken sandwich with lettuce and mayo; customizations excluded", 340, wendysMenuUrl("chicken-nuggets-more", "crispy-chicken-sandwich")),
  wendysFood("spicy-chicken-nuggets", "Spicy Chicken Nuggets", "Breaded spicy all-white-meat chicken nuggets; dipping sauce is selected separately and is not included", null, wendysMenuUrl("chicken-nuggets-more", "10-pc-spicy-chicken-nuggets"), [
    wendysOption("spicy-chicken-nuggets:10-piece", "10 piece serving; dipping sauce not included", 470, wendysMenuUrl("chicken-nuggets-more", "10-pc-spicy-chicken-nuggets"), 10),
    wendysOption("spicy-chicken-nuggets:4-piece", "4 piece serving; dipping sauce not included", 190, wendysMenuUrl("chicken-nuggets-more", "4-pc-spicy-chicken-nuggets"), 4),
    wendysOption("spicy-chicken-nuggets:6-piece", "6 piece serving; dipping sauce not included", 280, wendysMenuUrl("chicken-nuggets-more", "6-pc-spicy-chicken-nuggets"), 6),
  ]),
  wendysFood("tenders", "Chicken Tenders", "Breaded chicken tenders; dipping sauce is selected separately and is not included", null, wendysMenuUrl("tenders", "3-pc-tenders"), [
    wendysOption("tenders:3-piece", "3 piece serving; dipping sauce not included", 420, wendysMenuUrl("tenders", "3-pc-tenders"), 3),
    wendysOption("tenders:4-piece", "4 piece serving; dipping sauce not included", 560, wendysMenuUrl("tenders", "4-pc-tenders"), 4),
  ]),
  ...[
    ["parmesan-caesar-salad", "Parmesan Caesar Salad", 520],
    ["cobb-salad", "Cobb Salad", 660],
    ["apple-pecan-salad", "Apple Pecan Salad", 510],
    ["taco-salad", "Taco Salad", 610],
  ].map(([id, name, calories]) => wendysFood(id, name, "1 standard salad with its restaurant-listed toppings and dressing components; substitutions and extra dressing excluded", calories, wendysMenuUrl("fresh-made-salads", id))),
  wendysSizedFood("french-fries", "Natural-Cut French Fries", "fries-sides", "Natural-cut, skin-on fries with sea salt; customizations and combo components excluded", [
    ["junior", "Junior Natural-Cut Fries", 210],
    ["small", "Small Natural-Cut Fries", 260],
    ["medium", "Medium Natural-Cut Fries", 350],
    ["large", "Large Natural-Cut Fries", 470],
  ]),
  ...[
    ["baconator-fries", "Baconator Fries", "1 standard order of fries topped with cheese sauce, shredded cheddar and Applewood smoked bacon", 450],
    ["chili-cheese-fries", "Chili Cheese Fries", "1 standard order of fries topped with Wendy's chili and cheese sauce", 510],
    ["cheese-fries", "Cheese Fries", "1 standard order of fries topped with cheese sauce", 470],
    ["pub-fries", "Pub Fries", "1 standard order of fries with warm beer cheese, shredded cheddar and Applewood smoked bacon", 460],
    ["sour-cream-and-chive-baked-potato", "Sour Cream and Chive Baked Potato", "1 baked potato with sour cream and chives", 300],
    ["bacon-cheese-baked-potato", "Bacon Cheese Baked Potato", "1 baked potato with cheese sauce, shredded cheddar and Applewood smoked bacon", 420],
    ["cheese-baked-potato", "Cheese Baked Potato", "1 baked potato with cheese sauce and shredded cheddar", 440],
  ].map(([id, name, description, calories]) => wendysFood(id, name, description, calories, wendysMenuUrl("fries-sides", id))),
  wendysSizedFood("chili", "Chili", "fries-sides", "Wendy's beef-and-bean chili; crackers, cheese, onions and other add-ons are not included", [
    ["small", "Small Chili", 280],
    ["large", "Large Chili", 370],
  ]),
  wendysFood("maple-bacon-chicken-croissant", "Maple Bacon Chicken Croissant", "1 breakfast sandwich: chicken filet, Applewood smoked bacon and maple butter on a croissant bun", 540, wendysMenuUrl("croissants", "maple-bacon-chicken-croissant"), undefined, { protein: 19, carbohydrates: 48, fat: 30, sodium: 880, fiber: 3, totalSugar: 12 }, WENDYS_DETAILED_REFERENCE),
  wendysFood("honey-buddy-chicken-biscuit", "Honey Buddy Chicken Biscuit", "1 breakfast sandwich: chicken filet and honey butter on a buttermilk biscuit", 490, wendysMenuUrl("biscuits", "honey-buddy-chicken-biscuit")),
  wendysFood("honey-butter-biscuit", "Honey Butter Biscuit", "1 buttermilk biscuit with honey butter", 330, wendysMenuUrl("biscuits", "honey-butter-biscuit"), undefined, { protein: 5, carbohydrates: 39, fat: 17, sodium: 740, fiber: 2, totalSugar: 8 }, WENDYS_DETAILED_REFERENCE),
  wendysFood("sausage-biscuit", "Sausage Biscuit", "1 grilled sausage patty on a buttermilk biscuit", 470, wendysMenuUrl("biscuits", "sausage-biscuit")),
  wendysFood("homestyle-french-toast-sticks", "Homestyle French Toast Sticks", "French toast sticks; syrup is selected separately and is not included", null, wendysMenuUrl("classics", "homestyle-french-toast-sticks-4-pc"), [
    wendysOption("homestyle-french-toast-sticks:4-piece", "4 piece serving; syrup not included", 460, wendysMenuUrl("classics", "homestyle-french-toast-sticks-4-pc"), 4),
    wendysOption("homestyle-french-toast-sticks:6-piece", "6 piece serving; syrup not included", 630, wendysMenuUrl("classics", "homestyle-french-toast-sticks-6-pc"), 6),
  ]),
  wendysFood("breakfast-burrito-bacon", "Breakfast Burrito, Bacon", "1 burrito: eggs, Applewood smoked bacon, American cheese, seasoned potatoes and Swiss cheese sauce in a flour tortilla; Cholula packet is served on the side and not included", 700, wendysMenuUrl("breakfast-burrito", "breakfast-burrito-bacon"), undefined, { protein: 32, carbohydrates: 55, fat: 39, sodium: 2140, fiber: 2, totalSugar: 3 }, WENDYS_DETAILED_REFERENCE),
  wendysFood("breakfast-burrito-sausage", "Breakfast Burrito, Sausage", "1 burrito: eggs, grilled sausage, American cheese, seasoned potatoes and Swiss cheese sauce in a flour tortilla; Cholula packet is served on the side and not included", 820, wendysMenuUrl("breakfast-burrito", "breakfast-burrito-sausage")),
  wendysSizedFood("seasoned-potatoes", "Seasoned Potatoes", "sides-and-sweets", "Natural-cut, skin-on potatoes seasoned with cracked black pepper and garlic powder", [
    ["small", "Small Seasoned Potatoes", 280],
    ["medium", "Medium Seasoned Potatoes", 400],
    ["large", "Large Seasoned Potatoes", 510],
  ]),
  ...[
    ["cinnabon-pull-apart", "Cinnabon® Pull-Apart", "1 standard bakery serving", 550],
    ["chocolate-chunk-cookie", "Chocolate Chunk Cookie", "1 cookie", 330],
    ["sugar-cookie", "Sugar Cookie", "1 cookie", 330],
  ].map(([id, name, description, calories]) => wendysFood(id, name, description, calories, wendysMenuUrl("bakery", id))),
  ...[
    ["regular-hot-coffee", "Regular Hot Coffee", "coffee", [["small", "Small Regular Hot Coffee", 5], ["large", "Large Regular Hot Coffee", 5]]],
    ["cold-brew", "Cold Brew", "coffee", [["small", "Small Cold Brew", 20], ["medium", "Medium Cold Brew", 25], ["large", "Large Cold Brew", 40]]],
    ["vanilla-cold-brew-with-cream", "Vanilla Cold Brew with Cream", "coffee", [["small", "Small Vanilla Cold Brew with Cream", 120], ["medium", "Medium Vanilla Cold Brew with Cream", 190], ["large", "Large Vanilla Cold Brew with Cream", 270]]],
    ["caramel-cold-brew-with-cream", "Caramel Cold Brew with Cream", "coffee", [["small", "Small Caramel Cold Brew with Cream", 120], ["medium", "Medium Caramel Cold Brew with Cream", 190], ["large", "Large Caramel Cold Brew with Cream", 270]]],
    ["chocolate-cold-brew-with-cream", "Chocolate Cold Brew with Cream", "coffee", [["small", "Small Chocolate Cold Brew with Cream", 120], ["medium", "Medium Chocolate Cold Brew with Cream", 190], ["large", "Large Chocolate Cold Brew with Cream", 280]]],
    ["cold-brew-with-cream-and-sugar", "Cold Brew with Cream and Sugar", "coffee", [["small", "Small Cold Brew with Cream and Sugar", 110], ["medium", "Medium Cold Brew with Cream and Sugar", 190], ["large", "Large Cold Brew with Cream and Sugar", 270]]],
  ].map(([id, name, category, options]) => wendysSizedFood(id, name, category, "1 restaurant beverage in the selected published size; standard recipe and ice where applicable, with customizations excluded", options)),
  ...[
    ["watermelon-lemonade", "Watermelon Lemonade", [["small", "Small Watermelon Lemonade", 220], ["medium", "Medium Watermelon Lemonade", 330], ["large", "Large Watermelon Lemonade", 420]]],
    ["pineapple-mango-lemonade", "Pineapple Mango Lemonade", [["small", "Small Pineapple Mango Lemonade", 230], ["medium", "Medium Pineapple Mango Lemonade", 330], ["large", "Large Pineapple Mango Lemonade", 420]]],
    ["all-natural-lemonade", "All-Natural Lemonade", [["small", "Small All-Natural Lemonade", 190], ["medium", "Medium All-Natural Lemonade", 280], ["large", "Large All-Natural Lemonade", 330]]],
    ["strawberry-lemonade", "Strawberry Lemonade", [["small", "Small Strawberry Lemonade", 230], ["medium", "Medium Strawberry Lemonade", 330], ["large", "Large Strawberry Lemonade", 420]]],
    ["sprite-watermelon", "Sprite® Watermelon", [["small", "Small Sprite Watermelon", 170], ["medium", "Medium Sprite Watermelon", 260], ["large", "Large Sprite Watermelon", 370]]],
    ["watermelon-sparkling-energy", "Watermelon Sparkling Energy", [["small", "Small Watermelon Sparkling Energy", 190], ["medium", "Medium Watermelon Sparkling Energy", 280]]],
    ["pineapple-citrus-sparkling-energy", "Pineapple Citrus Sparkling Energy", [["small", "Small Pineapple Citrus Sparkling Energy", 160], ["medium", "Medium Pineapple Citrus Sparkling Energy", 230]]],
    ["coca-cola", "Coca-Cola®", [["small", "Small Coca-Cola", 180], ["medium", "Medium Coca-Cola", 250], ["large", "Large Coca-Cola", 320]], ["Wendy's Coke"]],
    ["coca-cola-zero-sugar", "Coca-Cola® Zero Sugar", [["small", "Small Coca-Cola Zero Sugar", 0], ["medium", "Medium Coca-Cola Zero Sugar", 0], ["large", "Large Coca-Cola Zero Sugar", 0]], ["Wendy's Coke Zero", "Wendy's Coca Cola Zero"]],
    ["diet-coke", "Diet Coke®", [["small", "Small Diet Coke", 0], ["medium", "Medium Diet Coke", 0], ["large", "Large Diet Coke", 0]]],
    ["sprite", "Sprite®", [["small", "Small Sprite", 160], ["medium", "Medium Sprite", 240], ["large", "Large Sprite", 300]]],
    ["dr-pepper", "Dr Pepper®", [["small", "Small Dr Pepper", 170], ["medium", "Medium Dr Pepper", 250], ["large", "Large Dr Pepper", 310]]],
    ["diet-dr-pepper", "Diet Dr Pepper®", [["small", "Small Diet Dr Pepper", 0], ["medium", "Medium Diet Dr Pepper", 0], ["large", "Large Diet Dr Pepper", 0]]],
    ["barqs-root-beer", "Barq's® Root Beer", [["small", "Small Barq's Root Beer", 180], ["medium", "Medium Barq's Root Beer", 260], ["large", "Large Barq's Root Beer", 330]]],
    ["fanta-orange", "Fanta® Orange", [["small", "Small Fanta Orange", 180], ["medium", "Medium Fanta Orange", 260], ["large", "Large Fanta Orange", 320]]],
    ["minute-maid-light-lemonade", "Minute Maid® Light Lemonade", [["small", "Small Minute Maid Light Lemonade", 10], ["medium", "Medium Minute Maid Light Lemonade", 10], ["large", "Large Minute Maid Light Lemonade", 15]]],
    ["hi-c-flashin-fruit-punch", "Hi-C® Flashin' Fruit Punch®", [["small", "Small Hi-C Flashin' Fruit Punch", 200], ["medium", "Medium Hi-C Flashin' Fruit Punch", 290], ["large", "Large Hi-C Flashin' Fruit Punch", 370]]],
  ].map(([id, name, options, aliases]) => wendysSizedFood(id, name, "beverages", "1 fountain beverage in the selected published size with Wendy's standard ice fill; ice customizations excluded", options, aliases)),
  ...[
    ["pure-life-bottled-water", "Pure Life® Bottled Water", 0],
    ["milk", "Milk", 90],
    ["chocolate-milk", "Chocolate Milk", 140],
    ["honest-kids-fruit-punch", "Honest Kids® Fruit Punch", 35],
    ["simply-orange-juice", "Simply Orange® Juice", 160],
  ].map(([id, name, calories]) => wendysFood(id, name, "1 restaurant-packaged beverage; no substitutions or combo components included", calories, wendysMenuUrl("beverages", id))),
  wendysSizedFood("classic-chocolate-frosty", "Classic Chocolate Frosty®", "frosty", "1 Classic Chocolate Frosty in the selected published size; toppings and mix-ins are not included", [
    ["junior", "Junior Classic Chocolate Frosty", 190], ["small", "Small Classic Chocolate Frosty", 310], ["medium", "Medium Classic Chocolate Frosty", 390], ["large", "Large Classic Chocolate Frosty", 510],
  ]),
  wendysSizedFood("vanilla-frosty", "Vanilla Frosty®", "frosty", "1 Vanilla Frosty in the selected published size; toppings and mix-ins are not included", [
    ["junior", "Junior Vanilla Frosty", 190], ["small", "Small Vanilla Frosty", 310], ["medium", "Medium Vanilla Frosty", 390], ["large", "Large Vanilla Frosty", 510],
  ]),
  ...[
    ["apple-crumble-frosty-fusion-vanilla", "Apple Crumble Frosty Fusion®, Vanilla", [390, 540, 680]],
    ["brownie-batter-chocolate-frosty-swirl-tm", "Brownie Batter Chocolate Frosty Swirl™", [500, 600, 710]],
    ["brownie-batter-vanilla-frosty-swirl-tm", "Brownie Batter Vanilla Frosty Swirl™", [500, 600, 710]],
    ["caramel-chocolate-frosty-swirl-tm", "Caramel Chocolate Frosty Swirl™", [380, 470, 570]],
    ["caramel-crunch-chocolate-frosty-fusion-tm", "Caramel Crunch Chocolate Frosty Fusion™", [420, 580, 740]],
    ["caramel-crunch-vanilla-frosty-fusion-tm", "Caramel Crunch Vanilla Frosty Fusion™", [420, 580, 740]],
    ["caramel-vanilla-frosty-swirl-tm", "Caramel Vanilla Frosty Swirl™", [380, 470, 570]],
    ["cookie-dough-frosty-fusion-chocolate", "Cookie Dough Frosty Fusion®, Chocolate", [540, 740, 930]],
    ["cookie-dough-frosty-fusion-vanilla", "Cookie Dough Frosty Fusion®, Vanilla", [540, 740, 930]],
    ["oreo-brownie-chocolate-frosty-fusion-tm", "OREO® Brownie Chocolate Frosty Fusion™", [520, 680, 850]],
    ["oreo-brownie-vanilla-frosty-fusion-tm", "OREO® Brownie Vanilla Frosty Fusion™", [520, 680, 850]],
    ["strawberry-chocolate-frosty-swirl-tm", "Strawberry Chocolate Frosty Swirl™", [330, 430, 530]],
    ["strawberry-vanilla-frosty-swirl-tm", "Strawberry Vanilla Frosty Swirl™", [330, 430, 530]],
  ].map(([id, name, calories]) => wendysSizedFood(id, name, "frosty", "1 current specialty Frosty in the selected published size and named base/configuration; customizations excluded", [
    ["small", `Small ${name}`, calories[0]], ["medium", `Medium ${name}`, calories[1]], ["large", `Large ${name}`, calories[2]],
  ])),
  ...[
    ["signature-sauce", "Wendy's Signature Sauce", 130, { protein: 0, carbohydrates: 4, fat: 13 }],
    ["scorchin-hot-sauce", "Scorchin' Hot Sauce", 150, { protein: 0, carbohydrates: 2, fat: 16 }],
    ["sweet-chili-sauce", "Sweet Chili Sauce", 80, { protein: 0, carbohydrates: 21, fat: 0 }],
    ["creamy-ranch-sauce", "Creamy Ranch Sauce", 130, { protein: 0, carbohydrates: 1, fat: 14 }],
    ["honey-bbq-sauce", "Honey BBQ Sauce", 70, { protein: 0, carbohydrates: 16, fat: 0 }],
    ["honey-mustard-sauce", "Honey Mustard Sauce", 110, { protein: 0, carbohydrates: 7, fat: 9 }],
    ["pomegranate-vinaigrette-dressing", "Pomegranate Vinaigrette Dressing", 90, { protein: 0, carbohydrates: 16, fat: 3 }],
    ["caesar-dressing", "Caesar Dressing", 240, { protein: 2, carbohydrates: 2, fat: 25 }],
    ["ranch-dressing", "Ranch Dressing", 250, { protein: 1, carbohydrates: 2, fat: 26 }],
    ["creamy-salsa-dressing", "Creamy Salsa Dressing", 150, { protein: 1, carbohydrates: 3, fat: 15 }],
    ["cheddar-cheese-sauce", "Cheddar Cheese Sauce", 70, { protein: 3, carbohydrates: 2, fat: 6 }],
  ].map(([id, name, calories, nutrients]) => wendysFood(id, name, "1 restaurant sauce or dressing serving; serving weight was not published on the accessible official page", calories, "https://www.wendys.com/sauces-dressings", undefined, nutrients, WENDYS_SAUCES_REFERENCE)),
];

const burgerKing = { id: "burger-king", name: "Burger King" };
const BURGER_KING_SOURCE = "https://origin.bk.com/pdfs/nutrition.pdf";
const BURGER_KING_REFERENCE = "Burger King USA Nutritionals: Core, Regional and Limited Time Offerings, April 2020; still published by Burger King when accessed. The chart identifies each standard item and serving weight but does not enumerate its components. Burger King's March 17, 2026 help guidance points to its Nutrition Explorer for the newest values, but that detailed explorer response was inaccessible, so this record uses the older official chart without combining sources. Burger King announced February 2026 Whopper recipe refinements (https://news.bk.com/blog-posts/burger-king-elevates-its-most-iconic-product-the-whopper-r) and a new nugget recipe plus refreshed sauce lineup effective September 1, 2026 (https://news.bk.com/blog-posts/burger-king-r-introduces-latest-innovation-inspired-by-guest-feedback---new-chicken-nuggets-and-sauces), adding formulation uncertainty to the chart's Whopper, nugget and sauce values";
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
const burgerKingOption = (id, description, nutrients, amount = 1) => ({
  id: `restaurant:burger-king:${id}`,
  serving: { amount, unit: "item", description },
  nutrients: { calories: null, protein: null, carbohydrates: null, fat: null, sodium: null, fiber: null, totalSugar: null, addedSugar: null, ...nutrients },
  provenance: {
    source: "official-restaurant",
    sourceId: `burger-king:${id}`,
    confidence: "official-source",
    verification: {
      status: ["calories", "protein", "carbohydrates", "fat"].every((key) => nutrients[key] !== null && nutrients[key] !== undefined) ? "complete" : "partial",
      sourceType: "official-restaurant",
      sourceUrl: BURGER_KING_SOURCE,
      accessedAt: CURRENT_EXPANSION_CHECKED_AT,
      sourceReference: BURGER_KING_REFERENCE,
    },
  },
});
const burgerKingSizedFood = (id, name, description, options, searchAliases) => {
  const food = officialFood(
    burgerKing,
    id,
    name,
    description,
    null,
    BURGER_KING_SOURCE,
    BURGER_KING_REFERENCE,
    options.map(([optionId, optionDescription, nutrients, amount = 1]) => burgerKingOption(`${id}:${optionId}`, optionDescription, nutrients, amount)),
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
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
  burgerKingSizedFood("hash-browns-small", "Hash Browns", "1 order in the selected published size, as listed in Burger King's April 2020 US nutrition chart", [
    ["small", "Small order (84 g)", { calories: 250, protein: 2, carbohydrates: 24, fat: 16, sodium: 580, fiber: 3, totalSugar: 0 }],
    ["medium", "Medium order (169 g)", { calories: 500, protein: 4, carbohydrates: 48, fat: 33, sodium: 1140, fiber: 7, totalSugar: 0 }],
    ["large", "Large order (225 g)", { calories: 670, protein: 5, carbohydrates: 65, fat: 44, sodium: 1530, fiber: 9, totalSugar: 0 }],
  ]),
  ...[
    ["bacon-cheese-whopper", "Bacon & Cheese WHOPPER® Sandwich", "1 standard sandwich (303 g)", { calories: 790, protein: 35, carbohydrates: 50, fat: 51, sodium: 1560, fiber: 2, totalSugar: 11 }],
    ["double-whopper-with-cheese", "DOUBLE WHOPPER® Sandwich with Cheese", "1 standard sandwich with cheese (377 g)", { calories: 980, protein: 52, carbohydrates: 50, fat: 64, sodium: 1410, fiber: 2, totalSugar: 11 }],
    ["triple-whopper", "TRIPLE WHOPPER® Sandwich", "1 standard triple-patty sandwich (438 g)", { calories: 1130, protein: 67, carbohydrates: 49, fat: 75, sodium: 1120, fiber: 2, totalSugar: 11 }],
    ["triple-whopper-with-cheese", "TRIPLE WHOPPER® Sandwich with Cheese", "1 standard triple-patty sandwich with cheese (461 g)", { calories: 1220, protein: 71, carbohydrates: 50, fat: 82, sodium: 1470, fiber: 2, totalSugar: 11 }],
    ["hamburger", "Hamburger", "1 standard hamburger (99 g)", { calories: 240, protein: 13, carbohydrates: 26, fat: 10, sodium: 380, fiber: 1, totalSugar: 6 }],
    ["cheeseburger", "Cheeseburger", "1 standard cheeseburger (111 g)", { calories: 280, protein: 15, carbohydrates: 27, fat: 13, sodium: 560, fiber: 1, totalSugar: 7 }],
    ["double-hamburger", "Double Hamburger", "1 standard double hamburger (136 g)", { calories: 350, protein: 21, carbohydrates: 26, fat: 18, sodium: 410, fiber: 1, totalSugar: 6 }],
    ["double-cheeseburger", "Double Cheeseburger", "1 standard double cheeseburger (148 g)", { calories: 390, protein: 23, carbohydrates: 27, fat: 21, sodium: 590, fiber: 1, totalSugar: 7 }],
    ["bacon-cheeseburger", "Bacon Cheeseburger", "1 standard bacon cheeseburger (118 g)", { calories: 320, protein: 17, carbohydrates: 27, fat: 16, sodium: 710, fiber: 1, totalSugar: 7 }],
    ["bacon-double-cheeseburger", "Bacon Double Cheeseburger", "1 standard bacon double cheeseburger (155 g)", { calories: 420, protein: 25, carbohydrates: 27, fat: 24, sodium: 740, fiber: 1, totalSugar: 7 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in Burger King's April 2020 US nutrition chart`, nutrients)),
  burgerKingSizedFood("chicken-nuggets", "Chicken Nuggets", "April 2020 breaded chicken nugget formulation in the selected published piece count; dipping sauce is not included; Burger King replaced the nugget recipe in September 2026 without accessible replacement nutrition values", [
    ["4-piece", "4 piece serving (58 g); dipping sauce not included", { calories: 170, protein: 8, carbohydrates: 11, fat: 11, sodium: 310, fiber: 1, totalSugar: 0 }, 4],
    ["6-piece", "6 piece serving (88 g); dipping sauce not included", { calories: 260, protein: 12, carbohydrates: 16, fat: 16, sodium: 470, fiber: 1, totalSugar: 0 }, 6],
    ["10-piece", "10 piece serving (146 g); dipping sauce not included", { calories: 430, protein: 20, carbohydrates: 27, fat: 27, sodium: 780, fiber: 2, totalSugar: 0 }, 10],
    ["20-piece", "20 piece serving (292 g); dipping sauce not included", { calories: 860, protein: 39, carbohydrates: 53, fat: 54, sodium: 1570, fiber: 3, totalSugar: 1 }, 20],
  ]),
  burgerKingSizedFood("spicy-chicken-nuggets", "Spicy Chicken Nuggets", "April 2020 breaded spicy chicken nugget formulation in the selected published piece count; dipping sauce is not included; current availability and replacement nutrition values were not accessible", [
    ["4-piece", "4 piece serving (66 g); dipping sauce not included", { calories: 210, protein: 8, carbohydrates: 11, fat: 15, sodium: 570, fiber: 2, totalSugar: 0 }, 4],
    ["6-piece", "6 piece serving (99 g); dipping sauce not included", { calories: 320, protein: 12, carbohydrates: 17, fat: 22, sodium: 850, fiber: 3, totalSugar: 0 }, 6],
    ["10-piece", "10 piece serving (165 g); dipping sauce not included", { calories: 530, protein: 20, carbohydrates: 28, fat: 37, sodium: 1420, fiber: 4, totalSugar: 1 }, 10],
    ["20-piece", "20 piece serving (330 g); dipping sauce not included", { calories: 1050, protein: 40, carbohydrates: 56, fat: 74, sodium: 2840, fiber: 9, totalSugar: 1 }, 20],
  ]),
  burgerKingFood("big-fish", "BIG FISH Sandwich", "1 standard fish sandwich (188 g), as listed in Burger King's April 2020 US nutrition chart; dipping sauce and combo components are not included", { calories: 510, protein: 16, carbohydrates: 51, fat: 28, sodium: 1180, fiber: 2, totalSugar: 7 }),
  ...[
    ["egg-cheese-croissanwich", "Egg & Cheese CROISSAN'WICH®", "1 breakfast sandwich (125 g)", { calories: 340, protein: 12, carbohydrates: 29, fat: 18, sodium: 610, fiber: 1, totalSugar: 4 }],
    ["ham-egg-cheese-croissanwich", "Ham, Egg & Cheese CROISSAN'WICH®", "1 breakfast sandwich (156 g)", { calories: 370, protein: 17, carbohydrates: 30, fat: 19, sodium: 1030, fiber: 1, totalSugar: 5 }],
    ["bacon-egg-cheese-croissanwich", "Bacon, Egg & Cheese CROISSAN'WICH®", "1 breakfast sandwich (132 g)", { calories: 370, protein: 14, carbohydrates: 30, fat: 21, sodium: 760, fiber: 1, totalSugar: 4 }],
    ["fully-loaded-croissanwich", "Fully Loaded CROISSAN'WICH®", "1 breakfast sandwich (218 g)", { calories: 610, protein: 28, carbohydrates: 31, fat: 40, sodium: 1680, fiber: 1, totalSugar: 5 }],
    ["double-croissanwich-sausage-bacon", "Double CROISSAN'WICH® with Sausage & Bacon", "1 breakfast sandwich (187 g)", { calories: 580, protein: 23, carbohydrates: 31, fat: 40, sodium: 1260, fiber: 1, totalSugar: 5 }],
    ["double-croissanwich-sausage", "Double Sausage CROISSAN'WICH®", "1 breakfast sandwich (224 g)", { calories: 710, protein: 29, carbohydrates: 31, fat: 52, sodium: 1420, fiber: 1, totalSugar: 5 }],
    ["double-croissanwich-ham-sausage", "Double CROISSAN'WICH® with Ham & Sausage", "1 breakfast sandwich (211 g)", { calories: 580, protein: 27, carbohydrates: 31, fat: 38, sodium: 1530, fiber: 1, totalSugar: 5 }],
    ["fully-loaded-biscuit", "Fully Loaded Biscuit", "1 breakfast sandwich (238 g)", { calories: 640, protein: 28, carbohydrates: 31, fat: 45, sodium: 2190, fiber: 1, totalSugar: 4 }],
    ["ham-egg-cheese-biscuit", "Ham, Egg & Cheese Biscuit", "1 breakfast sandwich (176 g)", { calories: 400, protein: 17, carbohydrates: 29, fat: 24, sodium: 1550, fiber: 1, totalSugar: 3 }],
    ["sausage-egg-cheese-biscuit", "Sausage, Egg & Cheese Biscuit", "1 breakfast sandwich (189 g)", { calories: 530, protein: 19, carbohydrates: 29, fat: 38, sodium: 1440, fiber: 1, totalSugar: 3 }],
    ["bacon-egg-cheese-biscuit", "Bacon, Egg & Cheese Biscuit", "1 breakfast sandwich (152 g)", { calories: 400, protein: 13, carbohydrates: 29, fat: 26, sodium: 1270, fiber: 1, totalSugar: 3 }],
    ["sausage-biscuit", "Sausage Biscuit", "1 breakfast sandwich (121 g)", { calories: 420, protein: 12, carbohydrates: 28, fat: 28, sodium: 1050, fiber: 1, totalSugar: 2 }],
    ["breakfast-burrito-jr", "Breakfast Burrito Jr.", "1 breakfast burrito (143 g)", { calories: 370, protein: 15, carbohydrates: 27, fat: 23, sodium: 930, fiber: 3, totalSugar: 2 }],
    ["egg-normous-burrito", "Egg-Normous Burrito", "1 breakfast burrito (310 g)", { calories: 780, protein: 32, carbohydrates: 68, fat: 42, sodium: 1960, fiber: 3, totalSugar: 4 }],
    ["bk-ultimate-breakfast-platter", "BK Ultimate Breakfast Platter", "1 platter (390 g)", { calories: 930, protein: 24, carbohydrates: 110, fat: 44, sodium: 2230, fiber: 4, totalSugar: 40 }],
    ["pancake-sausage-platter", "Pancake & Sausage Platter", "1 platter (217 g)", { calories: 610, protein: 12, carbohydrates: 72, fat: 31, sodium: 1010, fiber: 1, totalSugar: 30 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in Burger King's April 2020 US nutrition chart; syrup and other separately packaged condiments are not included unless named`, nutrients)),
  burgerKingSizedFood("french-toast-sticks", "French Toast Sticks", "French toast sticks in the selected published piece count; syrup is listed separately and is not included", [
    ["3-piece", "3 piece serving (65 g); syrup not included", { calories: 230, protein: 3, carbohydrates: 29, fat: 11, sodium: 260, fiber: 1, totalSugar: 8 }, 3],
    ["5-piece", "5 piece serving (109 g); syrup not included", { calories: 380, protein: 5, carbohydrates: 49, fat: 18, sodium: 430, fiber: 2, totalSugar: 13 }, 5],
  ]),
  burgerKingSizedFood("french-fries", "French Fries (Unsalted)", "French fries without added salt in the selected published size", [
    ["value", "Value French Fries, unsalted (89 g)", { calories: 220, protein: 2, carbohydrates: 34, fat: 9, sodium: 210, fiber: 3, totalSugar: 1 }],
    ["small", "Small French Fries, unsalted (128 g)", { calories: 320, protein: 4, carbohydrates: 49, fat: 13, sodium: 300, fiber: 5, totalSugar: 1 }],
    ["medium", "Medium French Fries, unsalted (153 g)", { calories: 380, protein: 4, carbohydrates: 58, fat: 16, sodium: 360, fiber: 6, totalSugar: 1 }],
    ["large", "Large French Fries, unsalted (173 g)", { calories: 430, protein: 5, carbohydrates: 66, fat: 18, sodium: 410, fiber: 7, totalSugar: 2 }],
  ]),
  burgerKingSizedFood("onion-rings", "Onion Rings", "Onion rings in the selected published size; dipping sauce is not included", [
    ["value", "Value Onion Rings (43 g)", { calories: 150, protein: 1, carbohydrates: 19, fat: 8, sodium: 400, fiber: 1, totalSugar: 2 }],
    ["small", "Small Onion Rings (91 g)", { calories: 320, protein: 3, carbohydrates: 41, fat: 16, sodium: 840, fiber: 3, totalSugar: 4 }],
    ["medium", "Medium Onion Rings (117 g)", { calories: 410, protein: 4, carbohydrates: 53, fat: 21, sodium: 1080, fiber: 4, totalSugar: 5 }],
    ["large", "Large Onion Rings (142 g)", { calories: 500, protein: 5, carbohydrates: 64, fat: 25, sodium: 1310, fiber: 5, totalSugar: 7 }],
  ]),
  ...[
    ["garden-chicken-salad-crispy-no-dressing", "Garden Chicken Salad with Crispy Chicken", "1 salad without dressing (287 g)", { calories: 440, protein: 25, carbohydrates: 31, fat: 25, sodium: 930, fiber: 3, totalSugar: 4 }],
    ["club-salad-crispy-no-dressing", "Club Salad with Crispy Chicken", "1 salad without dressing (308 g)", { calories: 540, protein: 31, carbohydrates: 31, fat: 33, sodium: 1380, fiber: 3, totalSugar: 5 }],
    ["garden-side-salad-no-dressing", "Garden Side Salad", "1 side salad without dressing (99 g)", { calories: 60, protein: 4, carbohydrates: 3, fat: 4, sodium: 95, fiber: 1, totalSugar: 2 }],
    ["kens-ranch-dressing", "Ken's Ranch Dressing", "1 packet (43 g)", { calories: 260, protein: 1, carbohydrates: 2, fat: 28, sodium: 240, fiber: 0, totalSugar: 2 }],
    ["kens-golden-italian-dressing", "Ken's Golden Italian Dressing", "1 packet (43 g)", { calories: 160, protein: 0, carbohydrates: 4, fat: 17, sodium: 380, fiber: 0, totalSugar: 3 }],
    ["kens-lite-honey-balsamic-vinaigrette", "Ken's Lite Honey Balsamic Vinaigrette", "1 packet (43 g)", { calories: 120, protein: 0, carbohydrates: 14, fat: 8, sodium: 220, fiber: 0, totalSugar: 11 }],
    ["buttery-garlic-croutons", "Buttery Garlic Croutons", "1 packet (14 g)", { calories: 60, protein: 1, carbohydrates: 9, fat: 2.5, sodium: 180, fiber: 0, totalSugar: 1 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in Burger King's April 2020 US nutrition chart`, nutrients)),
  ...[
    ["kids-oatmeal", "Kids Oatmeal", "1 serving (167 g)", { calories: 170, protein: 4, carbohydrates: 32, fat: 3, sodium: 260, fiber: 3, totalSugar: 12 }],
    ["motts-natural-applesauce", "Mott's® Natural Applesauce", "1 kids side (111 g)", { calories: 50, protein: 0, carbohydrates: 13, fat: 0, sodium: 0, fiber: 1, totalSugar: 11 }],
    ["fat-free-milk-8-fl-oz", "Fat Free Milk", "1 carton (8 fl oz)", { calories: 90, protein: 9, carbohydrates: 13, fat: 0, sodium: 125, fiber: 0, totalSugar: 12 }],
    ["low-fat-chocolate-milk-8-fl-oz", "1% Low Fat Chocolate Milk", "1 carton (8 fl oz)", { calories: 160, protein: 8, carbohydrates: 26, fat: 2.5, sodium: 150, fiber: 0, totalSugar: 25 }],
    ["capri-sun-apple-juice-6-fl-oz", "Capri Sun® 100% Apple Juice", "1 pouch (6 fl oz)", { calories: 80, protein: 0, carbohydrates: 20, fat: 0, sodium: 25, fiber: 0, totalSugar: 20 }],
    ["pbj-jamwich", "PB&J Jamwich", "1 sandwich (79 g)", { calories: 300, protein: 11, carbohydrates: 33, fat: 16, sodium: 290, fiber: 4, totalSugar: 11 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in the KING JR. section of Burger King's April 2020 US nutrition chart`, nutrients)),
  ...[
    ["dutch-apple-pie", "Dutch Apple Pie", "1 piece (107 g)", { calories: 340, protein: 3, carbohydrates: 51, fat: 14, sodium: 310, fiber: 1, totalSugar: 25 }],
    ["hershey-sundae-pie", "HERSHEY'S® Sundae Pie", "1 piece (79 g)", { calories: 310, protein: 3, carbohydrates: 32, fat: 19, sodium: 220, fiber: 1, totalSugar: 22 }],
    ["twix-pie", "TWIX® Pie", "1 piece (102 g)", { calories: 370, protein: 4, carbohydrates: 45, fat: 20, sodium: 330, fiber: 1, totalSugar: 30 }],
    ["oreo-cheesecake", "OREO® Cheesecake", "1 piece (92 g)", { calories: 350, protein: 6, carbohydrates: 41, fat: 18, sodium: 310, fiber: 1, totalSugar: 25 }],
    ["soft-serve-cone", "Soft Serve Cone", "1 cone (120 g)", { calories: 190, protein: 5, carbohydrates: 32, fat: 4.5, sodium: 150, fiber: 0, totalSugar: 24 }],
    ["soft-serve-cup", "Soft Serve Cup", "1 cup (115 g)", { calories: 170, protein: 5, carbohydrates: 28, fat: 4.5, sodium: 150, fiber: 0, totalSugar: 24 }],
    ["hersheys-chocolate-sundae", "HERSHEY'S® Chocolate Sundae", "1 sundae (149 g)", { calories: 260, protein: 5, carbohydrates: 49, fat: 5, sodium: 160, fiber: 1, totalSugar: 43 }],
    ["caramel-sundae", "Caramel Sundae", "1 sundae (137 g)", { calories: 240, protein: 5, carbohydrates: 42, fat: 5, sodium: 210, fiber: 0, totalSugar: 33 }],
    ["chocolate-chip-cookie", "Chocolate Chip Cookie", "1 cookie (38 g)", { calories: 160, protein: 2, carbohydrates: 24, fat: 8, sodium: 125, fiber: 1, totalSugar: 15 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in Burger King's April 2020 US nutrition chart`, nutrients)),
  ...[
    ["american-cheese-slice", "American Cheese Slice", "1 slice (11 g)", { calories: 40, protein: 2, carbohydrates: 1, fat: 3.5, sodium: 180, fiber: 0, totalSugar: 0 }],
    ["ketchup-packet", "Ketchup", "1 packet (10 g)", { calories: 10, protein: 0, carbohydrates: 3, fat: 0, sodium: 125, fiber: 0, totalSugar: 2 }],
    ["mayonnaise-packet", "Mayonnaise", "1 packet (12 g)", { calories: 80, protein: 0, carbohydrates: 1, fat: 9, sodium: 75, fiber: 0, totalSugar: 0 }],
    ["jam-packet", "Jam", "1 packet (12 g)", { calories: 30, protein: 0, carbohydrates: 7, fat: 0, sodium: 0, fiber: 0, totalSugar: 6 }],
    ["breakfast-syrup", "Breakfast Syrup", "1 packet (1 oz / 41 g)", { calories: 120, protein: 0, carbohydrates: 30, fat: 0, sodium: 15, fiber: 0, totalSugar: 18 }],
    ["bbq-dipping-sauce", "BBQ Dipping Sauce", "1 packet (1 oz / 28 g)", { calories: 40, protein: 0, carbohydrates: 11, fat: 0, sodium: 310, fiber: 0, totalSugar: 10 }],
    ["ranch-dipping-sauce", "Ranch Dipping Sauce", "1 packet (1 oz / 28 g)", { calories: 140, protein: 1, carbohydrates: 1, fat: 15, sodium: 85, fiber: 0, totalSugar: 1 }],
    ["buffalo-dipping-sauce", "Buffalo Dipping Sauce", "1 packet (1 oz / 28 g)", { calories: 80, protein: 0, carbohydrates: 2, fat: 8, sodium: 360, fiber: 0, totalSugar: 1 }],
    ["zesty-onion-ring-dipping-sauce", "Zesty Onion Ring Dipping Sauce", "1 packet (1 oz / 28 g)", { calories: 150, protein: 0, carbohydrates: 3, fat: 15, sodium: 240, fiber: 0, totalSugar: 0 }],
    ["honey-mustard-dipping-sauce", "Honey Mustard Dipping Sauce", "1 packet (1 oz / 28 g)", { calories: 90, protein: 0, carbohydrates: 8, fat: 6, sodium: 180, fiber: 0, totalSugar: 7 }],
  ].map(([id, name, description, nutrients]) => burgerKingFood(id, name, `${description}, as listed in Burger King's April 2020 US nutrition chart`, nutrients)),
  ...[
    ["oreo-shake", "OREO® Shake", 720, { protein: 16, carbohydrates: 118, fat: 20, sodium: 540, fiber: 1, totalSugar: 98 }],
    ["chocolate-oreo-shake", "Chocolate OREO® Shake", 740, { protein: 17, carbohydrates: 121, fat: 22, sodium: 680, fiber: 1, totalSugar: 101 }],
    ["vanilla-shake", "Vanilla Shake", 580, { protein: 14, carbohydrates: 98, fat: 15, sodium: 420, fiber: 0, totalSugar: 85 }],
    ["hersheys-chocolate-shake", "HERSHEY'S® Chocolate Shake", 610, { protein: 14, carbohydrates: 103, fat: 16, sodium: 500, fiber: 1, totalSugar: 88 }],
    ["strawberry-shake", "Strawberry Shake", 640, { protein: 14, carbohydrates: 113, fat: 15, sodium: 440, fiber: 0, totalSugar: 99 }],
    ["strawberry-banana-smoothie-16-fl-oz", "Strawberry Banana Smoothie", 310, { protein: 4, carbohydrates: 71, fat: 1, sodium: 55, fiber: 3, totalSugar: 50 }],
  ].map(([id, name, calories, nutrients]) => burgerKingFood(id, name, `1 restaurant beverage${id.endsWith("16-fl-oz") ? " (16 fl oz)" : "; serving size was not stated in the published chart"}`, { calories, ...nutrients })),
  ...[
    ["coca-cola", "Coca-Cola®", [[210, 50, 58, 58], [270, 60, 73, 73], [390, 85, 105, 105], [510, 115, 138, 138]], ["Burger King Coke"]],
    ["diet-coke", "Diet Coke®", [[0, 70, 0, 0], [0, 85, null, 0], [0, 120, null, 0], [0, 160, null, 0]]],
    ["sprite", "Sprite®", [[210, 95, 56, 56], [260, 120, 70, 70], [380, 170, 102, 102], [500, 230, 133, 133]]],
    ["dr-pepper", "Dr Pepper®", [[190, 60, 52, 51], [240, 75, 65, 64], [350, 105, 94, 93], [450, 140, 124, 121]]],
    ["barqs-root-beer", "Barq's® Root Beer", [[240, 100, 65, 65], [300, 120, 81, 81], [430, 180, 118, 118], [570, 230, 155, 155]]],
    ["cherry-coke", "Cherry Coke®", [[220, 55, 61, 61], [280, 70, 76, 76], [410, 100, 110, 110], [530, 130, 145, 145]]],
    ["fanta-orange", "Fanta® Orange", [[230, 60, 62, 61], [280, 70, 78, 77], [410, 105, 113, 111], [540, 135, 148, 146]]],
    ["hi-c-fruit-punch", "Hi-C® Fruit Punch", [[220, 75, 62, 60], [280, 95, 77, 75], [410, 135, 111, 109], [530, 180, 146, 143]]],
  ].map(([id, name, values, aliases]) => burgerKingSizedFood(id, name, "Soft drink without ice in the selected published cup size; these chart values must not be used for a standard-ice cup", [16, 20, 29, 38].map((ounces, index) => [
    `${ounces}-fl-oz-no-ice`,
    `${ounces} fl oz cup, no ice`,
    { calories: values[index][0], protein: 0, carbohydrates: values[index][2], fat: 0, sodium: values[index][1], fiber: 0, totalSugar: values[index][3] },
  ]), aliases)),
];

const subway = { id: "subway", name: "Subway" };
const SUBWAY_SOURCE = "https://media.subway.com/dam/urn:aaid:aem:2278372c-147b-42f2-8edc-7d8d94d1f07e/original/as/us-nutrition-en.pdf";
const SUBWAY_REFERENCE = "Subway January 2026 U.S. Nutrition Information";
const SUBWAY_MENU_URL = "https://www.subway.com/en-us/menu";
const subwayPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar,
});
const subwayOption = (id, description, nutrients) => {
  const option = officialOption(subway.id, id, description, nutrients, 1, SUBWAY_SOURCE, SUBWAY_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  return option;
};
const doubleSubwayPublished = (nutrients) => Object.fromEntries(
  Object.entries(nutrients).map(([key, value]) => [key, typeof value === "number" ? value * 2 : value])
);
const subwayFood = (id, name, description, nutrients, menuUrl = SUBWAY_MENU_URL, discrepancy) => {
  const reference = `${SUBWAY_REFERENCE}; standard 6-inch recipe checked against the current US menu at ${menuUrl}${discrepancy ? `; ${discrepancy}` : ""}`;
  const baseFood = officialFood(
    subway,
    id,
    name,
    description,
    nutrients,
    SUBWAY_SOURCE,
    reference,
    undefined,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  const gramMatch = description.match(/\((\d+) g\)/);
  const itemName = name.replace(/ \(6"\)$/, "");
  return {
    ...baseFood,
    servingOptions: [
      subwayOption(`${id}:6-inch`, description, nutrients),
      subwayOption(
        `${id}:footlong`,
        `1 footlong sandwich (published as two 6-inch servings${gramMatch ? `; ${Number(gramMatch[1]) * 2} g total` : ""}): standard ${itemName} recipe; no add-ons`,
        doubleSubwayPublished(nutrients)
      ),
    ],
    searchAliases: [`Subway ${itemName}`, `Subway footlong ${itemName}`],
  };
};
const subwayFormatFood = (id, name, description, nutrients, searchAliases) => {
  const food = officialFood(
    subway,
    id,
    name,
    description,
    nutrients,
    SUBWAY_SOURCE,
    `${SUBWAY_REFERENCE}; published standard configuration for the named menu format`,
    undefined,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const subwaySizedFood = (id, name, options, searchAliases) => {
  const servingOptions = options.map(([optionId, description, nutrients]) => subwayOption(`${id}:${optionId}`, description, nutrients));
  const food = officialFood(
    subway,
    id,
    name,
    servingOptions[0].serving.description,
    null,
    SUBWAY_SOURCE,
    `${SUBWAY_REFERENCE}; published size-specific options`,
    servingOptions,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
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
  ...[
    ["chipotle-philly-6-inch", "Chipotle Philly (6\")", 198, 490, 22, 1440, 44, 2, 5, 4, 30],
    ["cheesy-garlic-steak-6-inch", "Cheesy Garlic Steak (6\")", 199, 510, 23, 1190, 49, 3, 5, 4, 26],
    ["spicy-nacho-chicken-6-inch", "Spicy Nacho Chicken (6\")", 203, 440, 17, 1280, 49, 3, 5, 3, 24],
    ["honey-mustard-bbq-chicken-6-inch", "Honey Mustard BBQ Chicken (6\")", 273, 510, 20, 1350, 53, 3, 13, 11, 30],
    ["sweet-onion-teriyaki-chicken-6-inch", "Sweet Onion Teriyaki Chicken\u00ae (6\")", 256, 430, 11, 1250, 55, 4, 20, 16, 29],
    ["five-meat-italian-6-inch", "5 Meat Italian (6\")", 303, 680, 37, 1940, 46, 3, 6, 4, 40],
    ["meatball-pepperoni-6-inch", "Meatball Pepperoni (6\")", 268, 690, 38, 1860, 56, 4, 7, 5, 33],
    ["oven-roasted-turkey-6-inch", "Oven-Roasted Turkey (6\")", 233, 480, 23, 1150, 42, 3, 5, 3, 26],
    ["black-forest-ham-6-inch", "Black Forest Ham (6\")", 233, 490, 23, 1190, 44, 2, 5, 4, 25],
    ["roast-beef-6-inch", "Roast Beef (6\")", 247, 500, 23, 1120, 44, 2, 6, 4, 31],
    ["cold-cut-combo-6-inch", "Cold Cut Combo\u00ae (6\")", 240, 530, 29, 1320, 43, 2, 5, 3, 25],
    ["big-hot-pastrami-6-inch", "Big Hot Pastrami (6\")", 232, 550, 30, 2070, 44, 2, 5, 2, 30],
    ["blt-6-inch", "B.L.T. (6\")", 171, 480, 26, 800, 42, 2, 5, 4, 18],
    ["buffalo-chicken-6-inch", "Buffalo Chicken (6\")", 288, 510, 19, 1780, 55, 3, 7, 3, 31],
    ["oven-roasted-turkey-ham-6-inch", "Oven-Roasted Turkey & Ham (6\")", 233, 480, 23, 1140, 41, 4, 6, 4, 27],
    ["pizza-sub-6-inch", "Pizza Sub (6\")", 177, 490, 25, 1340, 45, 2, 5, 3, 22],
    ["veggie-patty-6-inch", "Veggie Patty (6\")", 263, 470, 19, 1100, 58, 12, 9, 4, 19],
    ["grilled-chicken-smashed-avocado-6-inch", "Grilled Chicken & Smashed Avocado (6\")", 311, 470, 19, 930, 44, 6, 8, 4, 35],
    ["grilled-chicken-fresh-avocado-6-inch", "Grilled Chicken & Fresh Avocado (6\")", 304, 450, 16, 800, 44, 6, 7, 4, 35],
    ["ham-turkey-stacker-6-inch", "Ham & Turkey Stacker (6\")", 226, 290, 5, 1000, 42, 4, 6, 4, 20],
    ["turkey-ranch-delite-6-inch", "Turkey & Ranch Delite (6\")", 254, 380, 13, 1140, 41, 5, 7, 5, 26],
    ["seasoned-steak-smashed-avocado-6-inch", "Seasoned Steak & Smashed Avocado (6\")", 297, 460, 16, 1170, 45, 6, 7, 5, 35],
    ["seasoned-steak-fresh-avocado-6-inch", "Seasoned Steak & Fresh Avocado (6\")", 290, 430, 14, 1040, 45, 6, 7, 5, 35],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFood(
    id,
    name,
    `1 6-inch sandwich (${grams} g), standard published recipe; item-specific bread, protein, cheese, vegetables and sauce are included as assembled by Subway; no add-ons`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["kids-veggie-delite-mini-sub", "Kids' Veggie Delite\u00ae Mini Sub", 108, 140, 2, 240, 27, 3, 4, 2, 6],
    ["kids-black-forest-ham-mini-sub", "Kids' Black Forest Ham Mini Sub", 137, 180, 3, 480, 28, 3, 4, 3, 11],
    ["kids-oven-roasted-turkey-mini-sub", "Kids' Oven-Roasted Turkey Mini Sub", 137, 170, 3, 470, 27, 3, 4, 3, 12],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 kids' mini sub (${grams} g) on mini multigrain bread with all published fresh vegetables`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["steak-philly-wrap", "Steak Philly Wrap", 295, 710, 35, 1970, 56, 3, 5, 3, 46],
    ["chipotle-philly-wrap", "Chipotle Philly Wrap", 300, 700, 32, 2090, 56, 3, 5, 3, 47],
    ["cheesy-garlic-steak-wrap", "Cheesy Garlic Steak Wrap", 302, 710, 33, 1840, 62, 3, 5, 3, 43],
    ["grilled-chicken-wrap", "Grilled Chicken Wrap", 349, 680, 31, 1240, 55, 3, 5, 1, 48],
    ["chicken-bacon-ranch-wrap", "Chicken & Bacon Ranch Wrap", 367, 830, 42, 1850, 56, 3, 7, 4, 56],
    ["spicy-nacho-chicken-wrap", "Spicy Nacho Chicken Wrap", 294, 610, 24, 1730, 59, 3, 6, 3, 40],
    ["honey-mustard-bbq-chicken-wrap", "Honey Mustard BBQ Chicken Wrap", 363, 680, 27, 1800, 63, 4, 14, 11, 46],
    ["sweet-onion-teriyaki-chicken-wrap", "Sweet Onion Teriyaki Chicken\u00ae Wrap", 360, 620, 16, 1690, 76, 3, 27, 22, 45],
    ["bmt-wrap", "B.M.T.\u00ae Wrap", 240, 610, 36, 1500, 44, 2, 5, 3, 27],
    ["spicy-italian-wrap", "Spicy Italian Wrap", 318, 1010, 69, 2670, 57, 3, 6, 3, 39],
    ["five-meat-italian-wrap", "5 Meat Italian Wrap", 450, 1000, 56, 3230, 60, 3, 8, 6, 66],
    ["meatball-marinara-wrap", "Meatball Marinara Wrap", 397, 890, 49, 2140, 76, 7, 12, 7, 40],
    ["meatball-pepperoni-wrap", "Meatball Pepperoni Wrap", 433, 1050, 63, 2730, 77, 7, 12, 7, 47],
    ["oven-roasted-turkey-wrap", "Oven-Roasted Turkey Wrap", 309, 610, 27, 1660, 53, 3, 6, 3, 38],
    ["black-forest-ham-wrap", "Black Forest Ham Wrap", 309, 630, 28, 1740, 57, 3, 7, 5, 36],
    ["roast-beef-wrap", "Roast Beef Wrap", 337, 660, 27, 1600, 57, 3, 8, 6, 48],
    ["cold-cut-combo-wrap", "Cold Cut Combo\u00ae Wrap", 323, 720, 40, 1990, 54, 3, 6, 3, 35],
    ["tuna-wrap", "Tuna Wrap", 330, 900, 59, 1310, 52, 3, 5, 3, 41],
    ["veggie-delite-wrap", "Veggie Delite\u00ae Wrap", 210, 400, 13, 690, 53, 3, 5, 2, 17],
    ["all-american-club-wrap", "All American Club\u00ae Wrap", 333, 760, 39, 2220, 57, 3, 9, 5, 44],
    ["subway-club-wrap", "Subway Club\u00ae Wrap", 374, 690, 30, 2300, 58, 3, 9, 6, 48],
    ["big-hot-pastrami-wrap", "Big Hot Pastrami Wrap", 365, 890, 54, 3050, 56, 3, 7, 2, 49],
    ["blt-wrap", "B.L.T. Wrap", 220, 710, 42, 1200, 53, 3, 7, 5, 30],
    ["turkey-ham-wrap", "Turkey & Ham Wrap", 309, 620, 28, 1700, 55, 3, 7, 4, 37],
    ["pizza-sub-wrap", "Pizza Sub Wrap", 232, 730, 42, 1980, 56, 3, 6, 3, 30],
    ["veggie-patty-wrap", "Veggie Patty Wrap", 367, 720, 30, 870, 87, 19, 10, 4, 25],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 published wrap (${grams} g): 12-inch wrap, cheese, select fresh vegetables and a footlong meat portion; no extra add-ons`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar),
    [name.replace("Wrap", "12-inch wrap")]
  )),
  ...[
    ["baja-chicken-protein-pocket", "Baja Chicken Protein Pocket", 184, 330, 13, 750, 30, 2, 2, 0, 24],
    ["italian-trio-protein-pocket", "Italian Trio Protein Pocket", 192, 480, 29, 1580, 32, 2, 2, 1, 22],
    ["peppercorn-ranch-chicken-protein-pocket", "Peppercorn Ranch Chicken Protein Pocket", 190, 330, 13, 800, 30, 2, 2, 0, 24],
    ["turkey-ham-protein-pocket", "Turkey & Ham Protein Pocket", 193, 320, 11, 1260, 32, 2, 4, 3, 21],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 protein pocket (${grams} g): 9-inch wrap, cheese, select fresh vegetables and the suggested sauce`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["steak-philly-salad", "Steak Philly Salad", 409, 450, 35, 1080, 13, 4, 6, 1, 24],
    ["chipotle-philly-salad", "Chipotle Philly Salad", 415, 400, 28, 1260, 15, 5, 7, 2, 25],
    ["cheesy-garlic-steak-salad", "Cheesy Garlic Steak Salad", 434, 460, 32, 1180, 21, 5, 8, 2, 23],
    ["grilled-chicken-salad", "Grilled Chicken Salad", 415, 440, 34, 590, 12, 4, 6, 0, 26],
    ["chicken-bacon-ranch-salad", "Chicken & Bacon Ranch Salad", 430, 490, 36, 1020, 14, 5, 7, 2, 30],
    ["spicy-nacho-chicken-salad", "Spicy Nacho Chicken Salad", 420, 320, 19, 1220, 20, 5, 8, 0, 20],
    ["honey-mustard-bbq-chicken-salad", "Honey Mustard BBQ Chicken Salad", 454, 420, 24, 1280, 31, 5, 22, 17, 25],
    ["sweet-onion-teriyaki-chicken-salad", "Sweet Onion Teriyaki Chicken\u00ae Salad", 423, 300, 10, 1100, 33, 4, 25, 19, 23],
    ["bmt-salad", "B.M.T.\u00ae Salad", 407, 540, 46, 1250, 13, 4, 6, 1, 22],
    ["spicy-italian-salad", "Spicy Italian Salad", 407, 610, 54, 1450, 13, 4, 5, 0, 22],
    ["five-meat-italian-salad", "5 Meat Italian Salad", 471, 610, 47, 1690, 14, 4, 7, 2, 35],
    ["meatball-marinara-salad", "Meatball Marinara Salad with MVP Parmesan Vinaigrette\u00ae", 484, 530, 39, 1360, 25, 7, 11, 4, 23],
    ["meatball-pepperoni-salad", "Meatball Pepperoni Salad with MVP Parmesan Vinaigrette\u00ae", 502, 610, 47, 1650, 26, 7, 11, 4, 26],
    ["oven-roasted-turkey-salad", "Oven-Roasted Turkey Salad", 400, 410, 33, 910, 11, 4, 5, 1, 21],
    ["black-forest-ham-salad", "Black Forest Ham Salad", 400, 420, 33, 950, 13, 4, 6, 1, 20],
    ["roast-beef-salad", "Roast Beef Salad", 415, 440, 33, 880, 13, 4, 6, 2, 26],
    ["cold-cut-combo-salad", "Cold Cut Combo\u00ae Salad", 408, 470, 39, 1080, 11, 4, 5, 0, 20],
    ["tuna-salad", "Tuna Salad", 390, 410, 32, 640, 10, 4, 5, 0, 22],
    ["veggie-delite-salad", "Veggie Delite\u00ae Salad", 316, 150, 9, 320, 10, 4, 5, 0, 10],
    ["all-american-club-salad", "All American Club\u00ae Salad", 410, 480, 39, 1270, 13, 4, 7, 2, 22],
    ["subway-club-salad", "Subway Club\u00ae Salad", 430, 440, 34, 1310, 14, 4, 7, 2, 24],
    ["big-hot-pastrami-salad", "Big Hot Pastrami Salad", 463, 410, 30, 1930, 15, 5, 7, 0, 26],
    ["blt-salad", "B.L.T. Salad", 345, 420, 36, 550, 11, 4, 6, 1, 13],
    ["turkey-ham-salad", "Turkey & Ham Salad", 400, 420, 33, 930, 12, 4, 6, 1, 21],
    ["pizza-sub-salad", "Pizza Sub Salad", 380, 330, 24, 1030, 15, 5, 7, 1, 17],
    ["veggie-patty-salad", "Veggie Patty Salad", 395, 300, 17, 820, 28, 12, 8, 0, 13],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 salad (${grams} g): lettuce, spinach, tomatoes, onions, green peppers, cucumbers, olives, named protein and cheese; dressing excluded unless named`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["steak-philly-protein-bowl", "Steak Philly Protein Bowl", 403, 630, 46, 1950, 14, 3, 7, 2, 43],
    ["chipotle-philly-protein-bowl", "Chipotle Philly Protein Bowl", 415, 600, 41, 2180, 16, 4, 7, 3, 46],
    ["cheesy-garlic-steak-protein-bowl", "Cheesy Garlic Steak Protein Bowl", 417, 630, 42, 1670, 27, 4, 8, 3, 39],
    ["grilled-chicken-protein-bowl", "Grilled Chicken Protein Bowl", 415, 620, 44, 960, 12, 3, 6, 0, 48],
    ["chicken-bacon-ranch-protein-bowl", "Chicken & Bacon Ranch Protein Bowl", 445, 760, 55, 1750, 14, 4, 7, 2, 55],
    ["spicy-nacho-chicken-protein-bowl", "Spicy Nacho Chicken Protein Bowl", 425, 510, 30, 1870, 26, 5, 9, 1, 35],
    ["honey-mustard-bbq-chicken-protein-bowl", "Honey Mustard BBQ Chicken Protein Bowl", 466, 620, 36, 2010, 31, 4, 22, 17, 45],
    ["sweet-onion-teriyaki-chicken-protein-bowl", "Sweet Onion Teriyaki Chicken\u00ae Protein Bowl", 432, 470, 18, 1860, 41, 3, 33, 26, 42],
    ["bmt-protein-bowl", "B.M.T.\u00ae Protein Bowl", 401, 820, 68, 2290, 14, 3, 6, 2, 40],
    ["spicy-italian-protein-bowl", "Spicy Italian Protein Bowl", 396, 960, 84, 2610, 14, 3, 5, 1, 39],
    ["five-meat-italian-protein-bowl", "5 Meat Italian Protein Bowl", 528, 960, 70, 3170, 17, 3, 8, 4, 66],
    ["meatball-marinara-protein-bowl", "Meatball Marinara Protein Bowl with MVP Parmesan Vinaigrette\u00ae", 553, 880, 65, 2340, 37, 8, 14, 6, 42],
    ["meatball-pepperoni-protein-bowl", "Meatball Pepperoni Protein Bowl with MVP Parmesan Vinaigrette\u00ae", 589, 1040, 79, 2930, 38, 8, 14, 6, 48],
    ["oven-roasted-turkey-protein-bowl", "Oven-Roasted Turkey Protein Bowl", 386, 560, 42, 1600, 10, 3, 5, 1, 38],
    ["black-forest-ham-protein-bowl", "Black Forest Ham Protein Bowl", 386, 580, 43, 1680, 14, 3, 7, 3, 36],
    ["roast-beef-protein-bowl", "Roast Beef Protein Bowl", 415, 610, 42, 1540, 14, 3, 7, 3, 48],
    ["cold-cut-combo-protein-bowl", "Cold Cut Combo\u00ae Protein Bowl", 401, 670, 55, 1930, 11, 3, 5, 1, 35],
    ["tuna-protein-bowl", "Tuna Protein Bowl", 394, 750, 62, 1190, 9, 3, 4, 0, 41],
    ["all-american-club-protein-bowl", "All American Club\u00ae Protein Bowl", 405, 690, 53, 2330, 15, 3, 9, 3, 40],
    ["subway-club-protein-bowl", "Subway Club\u00ae Protein Bowl", 418, 410, 21, 2280, 16, 3, 9, 3, 44],
    ["big-hot-pastrami-protein-bowl", "Big Hot Pastrami Protein Bowl", 512, 740, 57, 3430, 17, 4, 9, 0, 46],
    ["blt-protein-bowl", "B.L.T. Protein Bowl", 276, 560, 49, 890, 10, 3, 7, 3, 22],
    ["turkey-ham-protein-bowl", "Turkey & Ham Protein Bowl", 386, 570, 42, 1640, 12, 3, 6, 2, 37],
    ["pizza-sub-protein-bowl", "Pizza Sub Protein Bowl", 372, 600, 46, 1980, 18, 4, 8, 2, 31],
    ["veggie-patty-protein-bowl", "Veggie Patty Protein Bowl", 404, 540, 33, 1550, 44, 19, 10, 0, 22],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 protein bowl (${grams} g): footlong meat portion, lettuce, spinach, tomatoes, onions, green peppers, cucumbers and olives; dressing and cheese excluded unless named`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar),
    [name.replace("Protein Bowl", "No Bready Bowl")]
  )),
  ...[
    ["bacon-egg-cheese-breakfast", "Bacon, Egg & Cheese Breakfast Sandwich", 193, 550, 30, 1200, 43, 2, 4, 3, 26],
    ["black-forest-ham-egg-cheese-breakfast", "Black Forest Ham, Egg & Cheese Breakfast Sandwich", 207, 500, 25, 1270, 43, 2, 4, 3, 26],
    ["egg-cheese-breakfast", "Egg & Cheese Breakfast Sandwich", 178, 470, 24, 1020, 42, 2, 4, 2, 21],
    ["steak-egg-cheese-breakfast", "Steak, Egg & Cheese Breakfast Sandwich", 221, 540, 26, 1300, 43, 2, 4, 3, 31],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFood(
    id,
    `${name} (6")`,
    `1 6-inch sandwich (${grams} g): egg patty and American cheese on Artisan Italian bread with the named protein`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["bacon-egg-cheese-breakfast-wrap", "Bacon, Egg & Cheese Breakfast Wrap", 325, 900, 56, 1790, 57, 2, 5, 2, 42],
    ["black-forest-ham-egg-cheese-breakfast-wrap", "Black Forest Ham, Egg & Cheese Breakfast Wrap", 351, 810, 46, 1930, 58, 2, 5, 2, 42],
    ["egg-cheese-breakfast-wrap", "Egg & Cheese Breakfast Wrap", 295, 740, 44, 1440, 55, 2, 3, 1, 32],
    ["steak-egg-cheese-breakfast-wrap", "Steak, Egg & Cheese Breakfast Wrap", 366, 860, 48, 1890, 57, 2, 4, 2, 48],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id,
    name,
    `1 12-inch breakfast wrap (${grams} g): egg patty, American cheese and the named protein`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["cheese-pizza-8-inch", "Cheese Pizza (8\")", 293, 700, 22, 1370, 95, 4, 8, 3, 29],
    ["bacon-pizza-8-inch", "Bacon Pizza (8\")", 308, 780, 28, 1540, 96, 4, 9, 3, 34],
    ["meatball-pizza-8-inch", "Meatball Pizza (8\")", 330, 810, 31, 1590, 98, 5, 8, 3, 35],
    ["pepperoni-pizza-8-inch", "Pepperoni Pizza (8\")", 311, 780, 29, 1660, 96, 5, 8, 3, 33],
  ].map(([id, name, grams, calories, fat, sodium, carbohydrates, fiber, totalSugar, addedSugar, protein]) => subwayFormatFood(
    id, name, `1 published 8-inch pizza (${grams} g)`, subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["ham-jack-slider", "Ham & Jack Slider", "1 slider (71 g) with ham and Pepper Jack cheese", 160, 10, 21, 4, 550, null, 2, 2],
    ["italian-spice-slider", "Italian Spice Slider", "1 slider (72 g) with American cheese and MVP Parmesan Vinaigrette\u00ae", 250, 9, 21, 15, 740, null, 2, 2],
    ["little-cheesesteak-slider", "Little Cheesesteak Slider", "1 slider (71 g) with American cheese and Baja Chipotle sauce", 180, 8, 21, 7, 450, 1, 2, 2],
    ["turkey-slider", "Turkey Slider", "1 slider (88 g) with Pepper Jack cheese and mayonnaise", 230, 12, 20, 12, 690, 1, 2, 0],
  ].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar]) => subwayFormatFood(
    id, name, description, subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["artisan-italian-bread", "Artisan Italian Bread", 71, subwayPublished(210, 8, 39, 2, 380, 1, 3, 2)],
    ["hearty-multigrain-bread", "Hearty Multigrain Bread", 71, subwayPublished(200, 9, 36, 3, 350, 3, 4, 4)],
    ["jalapeno-cheddar-bread", "Jalape\u00f1o Cheddar Bread", 82, subwayPublished(240, 9, 39, 5, 500, 2, 3, 2)],
    ["artisan-flatbread", "Artisan Flatbread", 78, subwayPublished(220, 7, 40, 4, 360, 1, 2, 2)],
  ].map(([id, name, grams, nutrients]) => subwaySizedFood(id, name, [
    ["6-inch", `1 6-inch bread serving (${grams} g)`, nutrients],
    ["footlong", `1 footlong bread serving (published as two 6-inch servings; ${grams * 2} g total)`, doubleSubwayPublished(nutrients)],
  ], [`Subway 6 inch ${name}`, `Subway footlong ${name}`, name.replace("Jalape\u00f1o", "Jalapeno")])),
  ...[
    ["wrap-12-inch", "12-Inch Wrap", "1 wrap (102 g)", subwayPublished(300, 8, 50, 8, 580, 2, 2, 1)],
    ["protein-pocket-wrap-9-inch", "9-Inch Protein Pocket Wrap", "1 wrap (52 g)", subwayPublished(150, 4, 26, 3, 340, null, 0, 0)],
    ["mini-artisan-italian-bread", "Mini Artisan Italian Bread", "1 mini bread serving (47 g)", subwayPublished(140, 5, 26, 2, 250, null, 2, 2)],
    ["mini-hearty-multigrain-bread", "Mini Hearty Multigrain Bread", "1 mini bread serving (47 g)", subwayPublished(130, 6, 24, 2, 230, 2, 2, 2)],
  ].map(([id, name, description, nutrients]) => subwayFormatFood(id, name, description, nutrients)),
  ...[
    ["baja-chipotle-sauce", "Baja Chipotle Sauce", 14, 70, 0, 1, 7, 125, 0, 1, 0],
    ["bbq-sauce", "BBQ Sauce", 14, 25, 0, 6, 0, 115, 0, 5, 5],
    ["cheddar-cheese-sauce", "Cheddar Cheese Sauce", 18, 30, 1, 1, 3, 150, 0, 1, 0],
    ["creamy-sriracha", "Creamy Sriracha", 14, 40, 0, 2, 4, 240, 0, 1, 0],
    ["buffalo-sauce", "Buffalo Sauce", 14, 0, 0, 0, 0, 390, 0, 0, 0],
    ["giardiniera", "Giardiniera", 28, 80, 0, 1, 9, 340, 0, 1, 0],
    ["honey-mustard", "Honey Mustard", 14, 60, 0, 3, 5, 125, 0, 3, 3],
    ["hot-honey-sauce", "Hot Honey Sauce", 14, 30, 0, 8, 0, 120, 0, 8, 8],
    ["mayonnaise", "Mayonnaise", 14, 100, 0, 0, 11, 65, 0, 0, 0],
    ["yellow-mustard", "Yellow Mustard", 14, 10, 0, 1, 1, 170, 0, 0, 0],
    ["olive-oil-blend", "Olive Oil Blend", 5, 45, 0, 0, 5, 0, 0, 0, 0],
    ["olive-oil-vinegar", "Olive Oil Blend & Vinegar", 9, 45, 0, 0, 5, 0, 0, 0, 0],
    ["mvp-parmesan-vinaigrette", "MVP Parmesan Vinaigrette\u00ae", 14, 60, 0, 1, 6, 140, 0, 1, 1],
    ["peppercorn-ranch", "Peppercorn Ranch", 14, 80, 0, 1, 8, 100, 0, 1, 0],
    ["red-wine-vinegar", "Red Wine Vinegar", 4, 0, 0, 0, 0, 0, 0, 0, 0],
    ["roasted-garlic-aioli", "Roasted Garlic Aioli", 14, 80, 0, 1, 9, 150, 0, 1, 0],
    ["subkrunch", "Subkrunch\u2122", 11, 70, 1, 6, 5, 45, 0, 0, 0],
    ["sweet-onion-teriyaki-sauce", "Sweet Onion Teriyaki Sauce", 14, 30, 0, 7, 0, 130, 0, 6, 6],
  ].map(([id, name, grams, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar]) => subwayFormatFood(
    id,
    name,
    `1 published sandwich sauce portion (${grams} g); use two portions for the published salad-dressing amount`,
    subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["american-cheese", "American Cheese", 23, 80, 4, 1, 7, 420, 0, 1, 0],
    ["monterey-cheddar-cheese", "Shredded Monterey Cheddar", 28, 110, 7, 1, 9, 170, 0, 0, 0],
    ["grated-parmesan", "Grated Parmesan", 1, 5, 0, 0, 0, 25, 0, 0, 0],
    ["pepper-jack-cheese", "Pepper Jack Cheese", 28, 100, 5, 1, 8, 480, 0, 0, 0],
    ["provolone-cheese", "Provolone Cheese", 25, 90, 6, 1, 7, 220, 0, 0, 0],
  ].map(([id, name, grams, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar]) => subwayFormatFood(
    id, name, `1 published cheese portion (${grams} g)`, subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["all-american-club-meats", "All-American Club Meats", 72, 140, 15, 2, 8, 650, 0, 1, 1],
    ["bacon", "Bacon", 15, 80, 5, 1, 6, 170, 0, 1, 1],
    ["black-forest-ham-protein", "Black Forest Ham Protein", 57, 70, 10, 2, 2, 490, 0, 1, 1],
    ["cold-cut-combo-meats", "Cold Cut Combo\u00ae Meats", 64, 110, 9, 1, 8, 620, 0, 1, 0],
    ["egg-patty", "Egg Patty", 85, 180, 10, 2, 15, 220, 0, 0, 0],
    ["genoa-salami", "Genoa Salami", 18, 70, 3, 1, 6, 260, 0, 0, 0],
    ["grilled-chicken-protein", "Grilled Chicken Protein", 71, 80, 16, 1, 2, 210, 0, 1, 0],
    ["sweet-onion-teriyaki-chicken-protein", "Sweet Onion Teriyaki Glazed Chicken Protein", 85, 110, 16, 9, 2, 350, 0, 8, 7],
    ["meatballs-protein", "Meatballs", 139, 250, 12, 13, 18, 720, 2, 5, 2],
    ["oven-roasted-turkey-protein", "Oven-Roasted Turkey Protein", 57, 60, 11, 0, 2, 450, 0, 0, 0],
    ["pastrami-protein", "Pastrami Protein", 57, 130, 9, 1, 10, 470, 0, 1, 0],
    ["pepperoni", "Pepperoni", 18, 80, 3, 1, 7, 290, 0, 0, 0],
    ["roast-beef-protein", "Roast Beef Protein", 71, 80, 15, 2, 2, 420, 0, 2, 2],
    ["rotisserie-style-chicken-protein", "Rotisserie-Style Chicken Protein", 71, 90, 15, 0, 4, 400, 0, 0, 0],
    ["steak-protein", "Steak Protein", 71, 110, 17, 2, 5, 450, 0, 1, 1],
    ["subway-club-meats", "Subway Club\u00ae Meats", 92, 110, 17, 3, 3, 690, 0, 2, 2],
    ["tuna-protein", "Tuna Protein", 74, 250, 12, 0, 23, 310, 0, 0, 0],
    ["veggie-patty-protein", "Veggie Patty Protein", 85, 170, 6, 17, 9, 320, 8, 2, 0],
  ].map(([id, name, grams, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar]) => subwayFormatFood(
    id, name, `1 published 6-inch sandwich or salad protein portion (${grams} g); footlongs and wraps use two portions`, subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
  ...[
    ["chocolate-chip-cookie", "Chocolate Chip Cookie", "1 cookie (45 g)", 210, 2, 30, 10, 120, null, 18, 18],
    ["double-chocolate-cookie", "Double Chocolate Cookie", "1 cookie (45 g)", 210, 2, 29, 9, 125, 1, 20, 19],
    ["oatmeal-raisin-cookie", "Oatmeal Raisin Cookie", "1 cookie (45 g)", 200, 3, 30, 8, 110, 1, 16, 10],
    ["raspberry-cheesecake-cookie", "Naturally Flavored Raspberry Cheesecake Cookie", "1 cookie (45 g)", 210, 2, 29, 9, 115, 0, 16, 15],
    ["white-chip-macadamia-nut-cookie", "White Chip Macadamia Nut Cookie", "1 cookie (45 g)", 210, 2, 28, 10, 125, null, 17, 17],
    ["applesauce", "Applesauce", "1 side (90 g)", 70, 0, 16, 0, 0, 3, 13, 0],
    ["hash-browns", "Hash Browns", "1 side (108 g)", 190, 3, 24, 9, 600, 3, 1, 0],
    ["footlong-chocolate-chip-cookie", "Footlong Chocolate Chip Cookie", "1 footlong cookie (285 g)", 1330, 14, 181, 61, 690, 8, 101, 100],
    ["broccoli-cheddar-soup", "Broccoli Cheddar Soup", "1 8 oz bowl (227 g)", 200, 9, 16, 13, 960, null, 7, 0],
    ["chicken-noodle-soup", "Chicken Noodle Soup", "1 8 oz bowl (227 g)", 70, 7, 6, 3, 1160, null, 1, 0],
    ["loaded-baked-potato-soup", "Loaded Baked Potato with Bacon Soup", "1 8 oz bowl (227 g)", 200, 9, 17, 14, 910, 1, 4, 0],
  ].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar]) => subwayFormatFood(
    id, name, description, subwayPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar)
  )),
];

const chipotle = { id: "chipotle", name: "Chipotle" };
const CHIPOTLE_SOURCE = "https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf";
const CHIPOTLE_REFERENCE = "Chipotle official US Nutrition Facts paper menu currently served from its nutrition site; exact standalone component portion (OCT-2024-US-PPS chart)";
const chipotlePublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar: null,
});
const chipotleOption = (id, description, nutrients) => {
  const option = officialOption(chipotle.id, id, description, { ...nutrients, addedSugar: null }, 1, CHIPOTLE_SOURCE, CHIPOTLE_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  return option;
};
const chipotleFood = (id, name, description, nutrients, searchAliases) => {
  const food = officialFood(
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
  return searchAliases ? { ...food, searchAliases } : food;
};
const chipotleSizedFood = (id, name, options, searchAliases) => {
  const servingOptions = options.map(([optionId, description, nutrients]) => chipotleOption(`${id}:${optionId}`, description, nutrients));
  const food = officialFood(
    chipotle,
    id,
    name,
    servingOptions[0].serving.description,
    null,
    CHIPOTLE_SOURCE,
    `${CHIPOTLE_REFERENCE}; each option uses its separately published portion`,
    servingOptions,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const chipotleCalculatedFood = (id, name, description, nutrients) => officialFood(
  chipotle,
  id,
  name,
  description,
  { ...nutrients, addedSugar: null },
  CHIPOTLE_SOURCE,
  "Calculated configuration: exact named portions summed from the compatible adult component rows in Chipotle's OCT-2024-US-PPS official chart; not a universal bowl or burrito value",
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
  chipotleSizedFood("guacamole-4oz", "Guacamole", [
    ["topping-side-4oz", "1 topping or side (4 oz)", chipotlePublished(230, 2, 8, 22, 370, 6, 1)],
    ["large-8oz", "1 large side (8 oz)", chipotlePublished(460, 4, 16, 44, 740, 12, 2)],
  ]),
  chipotleSizedFood("chips-regular-4oz", "Chips", [
    ["regular-4oz", "1 regular serving (4 oz)", chipotlePublished(540, 7, 73, 25, 390, 7, 1)],
    ["large-6oz", "1 large serving (6 oz)", chipotlePublished(810, 11, 110, 38, 590, 11, 2)],
    ["kids-1oz", "1 kids' serving (1 oz)", chipotlePublished(140, 2, 18, 6, 95, 2, 0)],
  ]),
  chipotleFood("flour-tortilla-burrito", "Flour Tortilla (Burrito)", "1 standalone burrito-size flour tortilla", chipotlePublished(320, 8, 50, 9, 600, 3, 0)),
  chipotleFood("flour-tortilla-taco", "Flour Tortilla (Taco)", "1 standalone taco-size flour tortilla", chipotlePublished(80, 2, 13, 2.5, 160, null, 0)),
  chipotleFood("crispy-corn-tortilla", "Crispy Corn Tortilla", "1 standalone crispy corn tortilla", chipotlePublished(70, 1, 10, 3, 0, 1, 0)),
  chipotleFood("cilantro-lime-brown-rice-4oz", "Cilantro-Lime Brown Rice", "1 standalone 4 oz serving", chipotlePublished(210, 4, 36, 6, 190, 2, 0)),
  chipotleFood("pinto-beans-4oz", "Pinto Beans", "1 standalone 4 oz serving", chipotlePublished(130, 8, 21, 1.5, 210, 8, 1)),
  chipotleFood("fresh-tomato-salsa-4oz", "Fresh Tomato Salsa", "1 standalone 4 oz serving", chipotlePublished(25, 0, 4, 0, 550, 1, 1)),
  chipotleFood("roasted-chili-corn-salsa-4oz", "Roasted Chili-Corn Salsa", "1 standalone 4 oz serving", chipotlePublished(80, 3, 16, 1.5, 330, 3, 4), ["Chipotle corn salsa"]),
  chipotleFood("tomatillo-green-chili-salsa-2floz", "Tomatillo-Green Chili Salsa", "1 standalone 2 fl oz serving", chipotlePublished(15, 0, 4, 0, 260, 0, 2)),
  chipotleFood("tomatillo-red-chili-salsa-2floz", "Tomatillo-Red Chili Salsa", "1 standalone 2 fl oz serving", chipotlePublished(30, 0, 4, 0, 500, 1, 0)),
  chipotleFood("cheese-1oz", "Cheese", "1 standalone 1 oz serving", chipotlePublished(110, 6, 1, 8, 190, 0, 0)),
  chipotleFood("sour-cream-2oz", "Sour Cream", "1 standalone 2 oz adult serving", chipotlePublished(110, 2, 2, 9, 30, 0, 2)),
  chipotleSizedFood("queso-blanco", "Queso Blanco", [
    ["entree-2oz", "1 entr\u00e9e portion (2 oz)", chipotlePublished(120, 5, 4, 9, 250, 0, 1)],
    ["side-4oz", "1 side (4 oz)", chipotlePublished(240, 10, 7, 18, 490, 0, 2)],
    ["large-8oz", "1 large side (8 oz)", chipotlePublished(480, 20, 14, 37, 980, null, 5)],
  ]),
  chipotleFood("supergreens-salad-mix-3oz", "Supergreens Salad Mix", "1 standalone 3 oz serving", chipotlePublished(15, 1, 3, 0, 15, 2, 1)),
  chipotleFood("romaine-lettuce-tacos-1oz", "Romaine Lettuce (Tacos)", "1 standalone 1 oz serving", chipotlePublished(5, 0, 1, 0, 0, 1, 0)),
  chipotleFood("chipotle-honey-vinaigrette-2floz", "Chipotle-Honey Vinaigrette", "1 standalone 2 fl oz serving", chipotlePublished(220, 1, 18, 16, 850, 1, 12)),
  ...[
    ["barqs-root-beer", "Barq's Root Beer", [[280, 0, 85, 0, 130, 0, 85], [430, 0, 120, 0, 180, 0, 120]]],
    ["coca-cola-classic", "Coca-Cola Classic", [[260, 0, 70, 0, 85, 0, 70], [380, 0, 105, 0, 120, 0, 105]]],
    ["coca-cola-life", "Coca-Cola Life", [[170, 0, 44, 0, 70, 0, 44], [250, 0, 64, 0, 105, 0, 64]]],
    ["coca-cola-zero", "Coca-Cola Zero", [[0, 0, 0, 0, 75, 0, 0], [0, 0, 0, 0, 115, 0, 0]]],
    ["diet-coke", "Diet Coke", [[0, 0, 0, 0, 75, 0, 0], [0, 0, 0, 0, 115, 0, 0]]],
    ["caffeine-free-diet-coke", "Caffeine-Free Diet Coke", [[0, 0, 0, 0, 90, 0, 0], [0, 0, null, 0, 130, 0, 0]]],
    ["pibb-xtra", "Pibb Xtra", [[260, 0, 70, 0, 75, 0, 70], [380, 0, 105, 0, 115, 0, 105]]],
    ["sprite", "Sprite", [[260, 0, 70, 0, 120, 0, 70], [380, 0, 105, 0, 180, 0, 105]]],
    ["fanta-orange", "Fanta Orange", [[290, 0, 80, 0, 80, 0, 80], [430, 0, 120, 0, 140, 0, 120]]],
    ["minute-maid-lemonade", "Minute Maid Lemonade", [[280, 0, 75, 0, 95, 0, 75], [400, 0, 110, 0, 140, 0, 110]]],
    ["powerade-mountain-berry-blast", "Powerade Mountain Berry Blast", [[280, 0, 75, 0, 95, 0, 75], [400, 0, 110, 0, 140, 0, 110]]],
    ["mello-yello", "Mello Yello", [[290, 0, 80, 0, 100, 0, 100], [420, 0, 116, 0, 140, 0, 140]]],
    ["blue-sky-lemonade", "Blue Sky Lemonade", [[300, 0, 78, 0, 95, 0, 74], [440, 0, 113, 0, 135, 0, 108]]],
    ["blue-sky-mango-orange", "Blue Sky Mango Orange", [[300, 0, 75, 0, 80, 0, 74], [430, 0, 109, 0, 120, 0, 108]]],
    ["maine-root-root-beer", "Maine Root Root Beer", [[170, 0, 62, 0, 45, 0, 62], [240, 0, 90, 0, 65, 0, 90]]],
    ["iced-tea", "Chipotle Iced Tea", [[10, 0, 3, 0, 0, 0, 0], [15, 0, 4, 0, 0, 0, 0]]],
    ["sweet-iced-tea", "Chipotle Sweet Iced Tea", [[150, 0, 45, 0, 0, 0, 45], [220, 0, 65, 0, 0, 0, 65]]],
    ["tractor-berry-agua-fresca", "Tractor Berry Agua Fresca", [[200, 0, 50, 0, 10, 0, 49], [290, 0, 72, 0, 15, 0, 72]]],
    ["tractor-watermelon-limeade", "Tractor Watermelon Limeade", [[230, 0, 56, 0, 5, 0, 50], [330, 0, 82, 0, 10, 0, 72]]],
    ["tractor-lemonade", "Tractor Lemonade", [[170, 0, 43, 0, 10, 0, 37], [250, 0, 62, 0, 15, 0, 53]]],
    ["tractor-mandarin-agua-fresca", "Tractor Mandarin Agua Fresca", [[190, 0, 47, 0, 0, 0, 47], [280, 0, 69, 0, 5, 0, 69]]],
  ].map(([id, name, sizes]) => chipotleSizedFood(id, name, sizes.map((nutrients, index) => [
    index === 0 ? "22floz" : "32floz",
    `${index === 0 ? 22 : 32} fl oz fountain serving`,
    chipotlePublished(...nutrients),
  ]), [`Chipotle ${name}`])),
  ...[
    ["kids-mandarins", "Kids' Mandarins", "1 published kids' side", 35, 1, 9, 0, 0, 1, 7],
    ["kids-blueberries", "Kids' Blueberries", "1 published kids' side", 20, 1, 5, 0, 0, null, 3],
    ["kids-organic-milk", "Kids' Organic Milk", "1 carton (8 oz)", 110, 8, 12, 2.5, 125, 0, 12],
    ["kids-organic-chocolate-milk", "Kids' Organic Chocolate Milk", "1 carton (8 oz)", 160, 9, 24, 3, 220, 1, 22],
    ["kids-organic-apple-juice", "Kids' Organic Apple Juice", "1 container (6.75 oz)", 100, 0, 25, 0, 10, 0, 22],
  ].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => chipotleFood(
    id, name, description, chipotlePublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
  )),
  chipotleCalculatedFood(
    "calculated-chicken-burrito-white-rice-black-beans-salsa-cheese",
    "Chicken Burrito with White Rice, Black Beans, Fresh Tomato Salsa & Cheese (Calculated)",
    "Calculated exact configuration: 1 burrito flour tortilla + 4 oz white rice + 4 oz black beans + 4 oz chicken + 4 oz fresh tomato salsa + 1 oz cheese; no other toppings or sides",
    chipotlePublished(975, 58, 117, 29.5, 2210, 12, 3)
  ),
  chipotleCalculatedFood(
    "calculated-chicken-bowl-white-rice-black-beans-salsa-cheese",
    "Chicken Bowl with White Rice, Black Beans, Fresh Tomato Salsa & Cheese (Calculated)",
    "Calculated exact configuration: 4 oz white rice + 4 oz black beans + 4 oz chicken + 4 oz fresh tomato salsa + 1 oz cheese; no tortilla, other toppings or sides",
    chipotlePublished(655, 50, 67, 20.5, 1610, 9, 3)
  ),
  chipotleCalculatedFood(
    "calculated-sofritas-salad-black-beans-corn-salsa-guacamole",
    "Sofritas Salad with Black Beans, Corn Salsa & Guacamole (Calculated)",
    "Calculated exact configuration: 3 oz Supergreens + 4 oz sofritas + 4 oz black beans + 2 oz fajita vegetables + 4 oz roasted chili-corn salsa + 4 oz guacamole; no dressing or other toppings",
    chipotlePublished(625, 23, 63, 35, 1635, 22, 15)
  ),
];

const popeyes = { id: "popeyes", name: "Popeyes" };
const POPEYES_SOURCE = "https://plk-use1-prod.sites.rbictg.com/nutrition/PLK_Nutrition.pdf";
const POPEYES_REFERENCE = "Popeyes USA Nutrition Guide, August 2026; standard domestic menu item and published portion";
const popeyesPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar: null,
});
const popeyesOption = (id, description, nutrients, amount = 1) => {
  const option = officialOption(popeyes.id, id, description, nutrients, amount, POPEYES_SOURCE, POPEYES_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  return option;
};
const popeyesFood = (id, name, description, nutrients, searchAliases) => {
  const food = officialFood(
    popeyes,
    id,
    name,
    description,
    nutrients,
    POPEYES_SOURCE,
    POPEYES_REFERENCE,
    undefined,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const popeyesSizedFood = (id, name, options, searchAliases) => {
  const servingOptions = options.map(([optionId, description, nutrients, amount = 1]) => popeyesOption(`${id}:${optionId}`, description, nutrients, amount));
  const food = officialFood(
    popeyes,
    id,
    name,
    servingOptions[0].serving.description,
    null,
    POPEYES_SOURCE,
    `${POPEYES_REFERENCE}; each option uses its separately published size or piece count`,
    servingOptions,
    { accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const popeyesFoods = [
  popeyesSizedFood("signature-chicken-classic-or-spicy", "Signature Chicken (Classic or Spicy)", [
    ["wing", "1 bone-in wing", popeyesPublished(220, 14, 11, 15, 630, 1, 0)],
    ["leg", "1 bone-in leg", popeyesPublished(200, 15, 9, 12, 540, 1, 0)],
    ["thigh", "1 bone-in thigh", popeyesPublished(490, 25, 18, 34, 1120, 1, 0)],
    ["breast", "1 bone-in breast", popeyesPublished(620, 52, 17, 30, 1780, 2, 1)],
  ], ["Popeyes fried chicken", "Popeyes classic chicken", "Popeyes spicy chicken"]),
  popeyesSizedFood("tenders-classic-or-spicy", "Tenders (Classic or Spicy)", [
    ["3-piece", "3 tenders; sauce excluded", popeyesPublished(390, 35, 25, 19, 1700, 1, 0), 3],
    ["5-piece", "5 tenders; sauce excluded", popeyesPublished(650, 58, 41, 32, 2840, 2, 1), 5],
  ]),
  popeyesSizedFood("blackened-tenders", "Blackened Tenders", [
    ["3-piece", "3 blackened tenders; sauce excluded", popeyesPublished(170, 28, 2, 6, 860, 1, 0), 3],
    ["5-piece", "5 blackened tenders; sauce excluded", popeyesPublished(280, 47, 4, 9, 1430, 1, 0), 5],
  ]),
  ...[
    ["classic-bone-in-wings-6-piece", "Classic Bone-In Wings", 640, 35, 40, 38, 2430, 3, 1],
    ["buffalo-rub-bone-in-wings-6-piece", "Buffalo Rub Bone-In Wings", 670, 38, 31, 44, 2520, 3, 1],
    ["garlic-parmesan-rub-bone-in-wings-6-piece", "Garlic Parmesan Rub Bone-In Wings", 670, 38, 29, 44, 2020, 3, 1],
    ["lemon-pepper-rub-bone-in-wings-6-piece", "Lemon Pepper Rub Bone-In Wings", 670, 38, 30, 44, 2300, 2, 3],
    ["signature-hot-bone-in-wings-6-piece", "Signature Hot Bone-In Wings", 1150, 39, 48, 89, 2610, 4, 11],
    ["ghost-pepper-bone-in-wings-6-piece", "Ghost Pepper Bone-In Wings", 650, 35, 42, 38, 2930, 3, 1],
    ["honey-bbq-bone-in-wings-6-piece", "Honey BBQ Bone-In Wings", 850, 36, 90, 38, 3510, 3, 48],
    ["sweet-spicy-bone-in-wings-6-piece", "Sweet & Spicy Bone-In Wings", 870, 36, 96, 38, 3810, 3, 50],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => popeyesFood(
    id, name, "6 bone-in wings in the named published preparation; dipping sauce excluded", popeyesPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
  )),
  popeyesFood("butterfly-shrimp-8-piece", "Butterfly Shrimp", "8 breaded butterfly shrimp; sauce and side excluded", popeyesPublished(360, 14, 30, 21, 1140, 2, 1)),
  popeyesFood("classic-chicken-sandwich", "Classic Chicken Sandwich", "1 standard sandwich", popeyesPublished(700, 28, 50, 42, 1440, 2, 8)),
  popeyesFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 standard sandwich", popeyesPublished(700, 28, 50, 42, 1470, 2, 8)),
  popeyesFood("classic-tender-wrap", "Classic Tender Wrap", "1 standard wrap", popeyesPublished(480, 19, 31, 32, 1260, 2, 2)),
  popeyesFood("spicy-tender-wrap", "Spicy Tender Wrap", "1 standard wrap", popeyesPublished(480, 19, 32, 31, 1320, 2, 2)),
  popeyesFood("classic-tender-blackened-ranch-wrap", "Classic Tender Blackened Ranch Wrap", "1 standard wrap with Blackened Ranch", popeyesPublished(430, 19, 32, 25, 1340, 2, 3)),
  popeyesFood("biscuit", "Biscuit", "1 biscuit", popeyesPublished(230, 3, 24, 14, 520, 1, 2)),
  ...[
    ["cajun-fries", "Cajun Fries", [["regular", "Regular Cajun Fries", 270, 3, 31, 15, 620, 3, 0], ["large", "Large Cajun Fries", 740, 9, 86, 41, 1720, 8, 1]]],
    ["homestyle-mac-cheese", "Homestyle Mac & Cheese", [["regular", "Regular Homestyle Mac & Cheese", 280, 11, 16, 20, 510, 0, 3], ["large", "Large Homestyle Mac & Cheese", 850, 33, 48, 63, 1540, 1, 9]]],
    ["mashed-potatoes-cajun-gravy", "Mashed Potatoes with Cajun Gravy", [["regular", "Regular Mashed Potatoes with Cajun Gravy", 110, 3, 13, 6, 750, 0, 0], ["large", "Large Mashed Potatoes with Cajun Gravy", 310, 7, 39, 14, 2190, 4, 2]]],
    ["red-beans-rice", "Red Beans & Rice", [["regular", "Regular Red Beans & Rice", 260, 7, 29, 16, 580, 6, 1], ["large", "Large Red Beans & Rice", 640, 18, 73, 40, 1420, 13, 2]]],
    ["coleslaw", "Coleslaw", [["regular", "Regular Coleslaw", 160, 1, 12, 12, 210, 2, 10], ["large", "Large Coleslaw", 480, 3, 37, 37, 620, 6, 30]]],
    ["cajun-rice", "Cajun Rice", [["regular", "Regular Cajun Rice", 230, 9, 27, 10, 560, 1, 0], ["large", "Large Cajun Rice", 780, 31, 107, 26, 1650, 4, 1]]],
  ].map(([id, name, options]) => popeyesSizedFood(id, name, options.map(([optionId, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => [
    optionId, description, popeyesPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar),
  ]))),
  popeyesFood("cajun-gravy", "Cajun Gravy", "1 regular serving", popeyesPublished(160, 10, 2, 12, 820, 1, 1)),
  popeyesFood("jalapeno", "Jalape\u00f1o", "1 whole jalape\u00f1o", popeyesPublished(5, 0, 1, 0, 370, 1, 1), ["Popeyes Jalapeno"]),
  ...[
    ["bayou-buffalo-sauce", "Bayou Buffalo\u2122 Sauce", 50, 0, 2, 5, 400, 0, 0],
    ["boldbq-sauce", "BoldBQ\u2122 Sauce", 60, 0, 14, 0, 400, 0, 11],
    ["blackened-ranch-sauce", "Blackened Ranch Sauce", 110, 0, 2, 11, 230, 0, 1],
    ["buttermilk-ranch-sauce", "Buttermilk Ranch Sauce", 130, 0, 2, 14, 200, 0, 1],
    ["mardi-gras-mustard-sauce", "Mardi Gras Mustard\u2122 Sauce", 90, 1, 4, 8, 210, 1, 3],
    ["sweet-heat-sauce", "Sweet Heat\u00ae Sauce", 70, 0, 19, 0, 290, 0, 16],
    ["wild-honey-mustard-sauce", "Wild Honey Mustard Sauce", 110, 0, 5, 11, 140, 0, 4],
    ["cocktail-sauce", "Cocktail Sauce", 35, 1, 9, 0, 370, 1, 6],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => popeyesFood(
    id, name, "1 separately published dipping-sauce container; no food included", popeyesPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
  )),
  ...[
    ["chicken-biscuit", "Chicken Biscuit", 490, 17, 47, 26, 1280, 1, 2],
    ["sausage-biscuit", "Sausage Biscuit", 540, 13, 41, 36, 1100, 1, 2],
    ["egg-biscuit", "Egg Biscuit", 510, 13, 41, 29, 1160, 1, 2],
    ["egg-sausage-biscuit", "Egg & Sausage Biscuit", 690, 20, 43, 45, 1520, 1, 2],
    ["bacon-biscuit", "Bacon Biscuit", 400, 8, 37, 25, 780, 3, 2],
    ["sausage-gravy-biscuit", "Sausage & Gravy Biscuit", 510, 10, 42, 33, 1090, 3, 3],
    ["hash-rounds", "Hash Rounds", 360, 3, 41, 20, 450, 4, 0],
    ["coffee", "Coffee", 0, 0, 0, 0, 0, 0, 0],
    ["orange-juice", "Orange Juice", 140, 2, 33, 0, 20, 0, 30],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => popeyesFood(
    id, name, "1 published breakfast serving; breakfast is not available at all locations", popeyesPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
  )),
  ...[
    ["coke", "Coke", 240, 0, 65, 0, 60, 0, 65],
    ["diet-coke", "Diet Coke", 0, 0, 0, 0, 80, 0, 0],
    ["sprite", "Sprite", 230, 0, 61, 0, 115, 0, 61],
    ["fanta-strawberry", "Fanta Strawberry", 260, 0, 72, 0, 140, 0, 71],
    ["fanta-orange", "Fanta Orange", 250, 0, 66, 0, 65, 0, 66],
    ["mountain-dew", "Mountain Dew", 280, 0, 73, 0, 85, 0, 73],
    ["pepsi", "Pepsi", 250, 0, 69, 0, 55, 0, 69],
    ["diet-pepsi", "Diet Pepsi", 0, 0, 0, 0, 95, 0, 0],
    ["dr-pepper", "Dr Pepper", 240, 0, 65, 0, 75, 0, 64],
    ["minute-maid-lemonade", "Minute Maid Lemonade", 270, 0, 71, 0, 190, 0, 68],
    ["unsweetened-tea", "Unsweetened Tea", 0, 0, 0, 0, 10, 0, 0],
    ["sweet-tea", "Sweet Tea", 180, 0, 45, 0, 10, 0, 45],
    ["chilled-premium-lemonade", "Chilled Premium Lemonade", 300, 0, 79, 0, 5, 0, 75],
    ["frozen-premium-lemonade", "Frozen Premium Lemonade", 430, 0, 111, 0, 5, 0, 105],
  ].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => popeyesFood(
    id, name, "1 regular fountain beverage", popeyesPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar), [`Popeyes ${name}`]
  )),
  popeyesFood("cinnamon-apple-pie", "Cinnamon Apple Pie", "1 pie", popeyesPublished(280, 3, 35, 14, 260, 2, 14)),
  popeyesFood("strawberry-cream-cheese-pie", "Strawberry & Cream Cheese Pie", "1 pie", popeyesPublished(300, 4, 34, 17, 290, 1, 11)),
  popeyesFood("kids-classic-tender", "Kids' Classic Tender", "1 classic tender; kids' side, beverage and sauce excluded", popeyesPublished(130, 12, 8, 6, 570, 0, 0)),
  popeyesFood("kids-classic-leg", "Kids' Classic Chicken Leg", "1 classic bone-in leg; kids' side, beverage and sauce excluded", popeyesPublished(190, 12, 9, 11, 350, 0, 0)),
];

const CHICKEN_CHAIN_EXPANSION_ACCESSED_AT = "2026-09-10";
const KFC_SOURCE = "https://www.kfc.com/full-nutrition-guide";
const CANES_SOURCE = "https://raisingcanes.cdn.prismic.io/raisingcanes/IxTKraMRo_HyNWx2_Allergen%26NutritionalInformation_ALL_DIGITAL_8.26.pdf";
const WINGSTOP_SOURCE = "https://www.wingstop.com/nutrition";
const KFC_REFERENCE = "KFC official Full Nutrition Guide, current U.S. standard formulations; nutrition table updated June 6, 2025. Regional and limited-time availability can vary.";
const CANES_REFERENCE = "Raising Cane's official Allergen & Nutritional Information PDF linked from raisingcanes.com, file labeled 8.26; values are for the named standalone item or published drink size.";
const WINGSTOP_REFERENCE = "Wingstop official nutrition route and linked interactive nutrition table, updated March 24, 2025; each chicken value already includes the named sauce or dry rub.";

const chickenChainPublished = (calories, protein, carbohydrates, fat, sodium, fiber = null, totalSugar = null, addedSugar = null) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar,
});

function chickenChainOption(chainId, id, description, nutrients, amount, sourceUrl, sourceReference) {
  const option = officialOption(chainId, id, description, nutrients, amount, sourceUrl, sourceReference);
  option.provenance.verification.accessedAt = CHICKEN_CHAIN_EXPANSION_ACCESSED_AT;
  return option;
}

function chickenChainFood(chain, id, name, description, nutrients, sourceUrl, sourceReference, servingOptions, searchAliases) {
  const food = officialFood(
    chain,
    id,
    name,
    description,
    nutrients,
    sourceUrl,
    sourceReference,
    servingOptions,
    { accessedAt: CHICKEN_CHAIN_EXPANSION_ACCESSED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
}

const kfc = { id: "kfc", name: "KFC" };
const kfcFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = KFC_REFERENCE) => chickenChainFood(
  kfc, id, name, description, nutrients, KFC_SOURCE, sourceReference, servingOptions, searchAliases
);
const kfcOption = (id, description, nutrients, amount = 1, sourceReference = KFC_REFERENCE) => chickenChainOption(
  kfc.id, id, description, nutrients, amount, KFC_SOURCE, sourceReference
);
const kfcCalculatedOptions = (id, itemName, perPiece, counts) => counts.map((count) => kfcOption(
  `${id}:${count}-piece`,
  `${count} piece order; calculated as ${count} × the published per-piece ${itemName} nutrition`,
  Object.fromEntries(Object.entries(perPiece).map(([key, value]) => [key, value === null ? null : value * count])),
  count,
  `${KFC_REFERENCE} This option is calculated from the guide's explicit per-piece value.`
));

const kfcChickenStyles = [
  ["original-recipe", "Original Recipe", [
    ["breast", "Breast", chickenChainPublished(390, 39, 11, 21, 1190, 2, 0, 0)],
    ["drumstick", "Drumstick", chickenChainPublished(130, 12, 4, 8, 430, 1, 0, 0)],
    ["thigh", "Thigh", chickenChainPublished(280, 19, 8, 19, 910, 1, 0, 0)],
    ["whole-wing", "Whole Wing", chickenChainPublished(130, 10, 3, 8, 380, 0, 0, 0)],
  ]],
  ["extra-crispy", "Extra Crispy", [
    ["breast", "Breast", chickenChainPublished(530, 35, 18, 35, 1150, 0, 0, 0)],
    ["drumstick", "Drumstick", chickenChainPublished(170, 10, 5, 12, 390, 0, 0, 0)],
    ["thigh", "Thigh", chickenChainPublished(330, 22, 9, 23, 700, 0, 0, 0)],
    ["whole-wing", "Whole Wing", chickenChainPublished(170, 10, 5, 13, 340, 0, 0, 0)],
  ]],
  ["kentucky-grilled", "Kentucky Grilled Chicken", [
    ["breast", "Breast", chickenChainPublished(210, 38, 0, 7, 710, 0, 0, 0)],
    ["drumstick", "Drumstick", chickenChainPublished(80, 11, 0, 4, 220, 0, 0, 0)],
    ["thigh", "Thigh", chickenChainPublished(150, 17, 0, 9, 420, 0, 0, 0)],
    ["whole-wing", "Whole Wing", chickenChainPublished(70, 9, 0, 3, 180, 0, 0, 0)],
  ]],
  ["spicy-crispy", "Spicy Crispy Chicken", [
    ["breast", "Breast", chickenChainPublished(350, 30, 11, 20, 1100, 1, 0, 0)],
    ["drumstick", "Drumstick", chickenChainPublished(130, 9, 5, 8, 420, 1, 0, 0)],
    ["thigh", "Thigh", chickenChainPublished(270, 13, 10, 20, 720, 1, 0, 0)],
    ["whole-wing", "Whole Wing", chickenChainPublished(120, 7, 5, 8, 350, 0, 0, 0)],
  ]],
];

const kfcFoods = [
  ...kfcChickenStyles.flatMap(([styleId, styleName, cuts]) => cuts.map(([cutId, cutName, nutrients]) => kfcFood(
    `${styleId}-chicken-${cutId}`,
    `${styleName} ${cutName}`,
    `1 ${cutName.toLowerCase()} piece; ${styleName.toLowerCase()} preparation`,
    nutrients,
    undefined,
    [`Kentucky Fried Chicken ${styleName} ${cutName}`]
  ))),
  (() => {
    const nutrients = chickenChainPublished(170, 11, 20, 6, 400, 0, 0, 0);
    return kfcFood(
      "original-recipe-tenders",
      "Original Recipe Tenders",
      "1 Original Recipe tender; sauce and sides not included",
      nutrients,
      kfcCalculatedOptions("original-recipe-tenders", "Original Recipe Tender", nutrients, [1, 3, 4, 5]),
      ["KFC chicken tenders", "KFC 3 piece tenders", "KFC 4 piece tenders", "KFC 5 piece tenders"]
    );
  })(),
  (() => {
    const nutrients = chickenChainPublished(35, 3, 1, 1.5, 140, 0, 0, 0);
    return kfcFood(
      "kentucky-fried-nuggets",
      "Kentucky Fried Nuggets",
      "1 plain Kentucky Fried Nugget; sauce and sides not included",
      nutrients,
      kfcCalculatedOptions("kentucky-fried-nuggets", "Kentucky Fried Nugget", nutrients, [5, 8, 12, 36]),
      ["KFC nuggets", "KFC 5 piece nuggets", "KFC 8 piece nuggets", "KFC 12 piece nuggets", "KFC 36 piece nuggets"]
    );
  })(),
  ...[
    ["chipotle-ranch", "Chipotle Ranch", chickenChainPublished(50, 4, 1, 4, 160, 0, 0, 0)],
    ["honey-bbq", "Honey BBQ", chickenChainPublished(45, 4, 4, 1.5, 170, 0, 2, 0)],
    ["honey-garlic", "Honey Garlic", chickenChainPublished(40, 4, 3, 1.5, 160, 0, 1, 0)],
    ["korean-bbq", "Korean BBQ", chickenChainPublished(45, 4, 4, 1.5, 210, 0, 2, 0)],
    ["mango-habanero", "Mango Habanero", chickenChainPublished(40, 4, 3, 1.5, 170, 0, 1, 0)],
  ].map(([id, flavor, nutrients]) => kfcFood(
    `saucy-nuggets-${id}`,
    `Saucy Nuggets - ${flavor}`,
    `1 nugget with ${flavor} sauce already included; do not add a separate sauce serving`,
    nutrients,
    kfcCalculatedOptions(`saucy-nuggets-${id}`, `${flavor} Saucy Nugget`, nutrients, [5, 10]),
    [`KFC ${flavor} nuggets`]
  )),
  ...[
    ["classic-chicken-sandwich", "Classic Chicken Sandwich", "1 sandwich with crispy chicken, pickles and mayonnaise on a brioche-style bun", chickenChainPublished(650, 34, 49, 35, 1260, 1, 6, 0)],
    ["spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich with crispy chicken, pickles and spicy sauce on a brioche-style bun", chickenChainPublished(620, 34, 49, 33, 2140, 1, 6, 0)],
    ["chicken-little", "Chicken Little", "1 small chicken sandwich; side and drink not included", chickenChainPublished(350, 15, 39, 16, 730, null, 3, 0)],
    ["twister", "Twister", "1 published wrap configuration", chickenChainPublished(680, 29, 74, 31, 1360, null, 3, 0)],
    ["chipotle-ranch-chicken-sandwich", "Chipotle Ranch Chicken Sandwich", "1 limited-time sandwich with Chipotle Ranch sauce included", chickenChainPublished(670, 34, 49, 38, 1330, 1, 7, 0)],
    ["honey-bbq-chicken-sandwich", "Honey BBQ Chicken Sandwich", "1 limited-time sandwich with Honey BBQ sauce included", chickenChainPublished(600, 34, 58, 26, 1330, 1, 15, 5)],
    ["honey-garlic-chicken-sandwich", "Honey Garlic Chicken Sandwich", "1 limited-time sandwich with Honey Garlic sauce included", chickenChainPublished(610, 34, 61, 26, 1370, 1, 16, 0)],
    ["korean-bbq-chicken-sandwich", "Korean BBQ Chicken Sandwich", "1 limited-time sandwich with Korean BBQ sauce included", chickenChainPublished(620, 34, 61, 27, 1580, 1, 17, 5)],
    ["mango-habanero-chicken-sandwich", "Mango Habanero Chicken Sandwich", "1 limited-time sandwich with Mango Habanero sauce included", chickenChainPublished(590, 34, 56, 26, 1330, 1, 13, 0)],
  ].map(([id, name, description, nutrients]) => kfcFood(id, name, description, nutrients)),
  ...[
    ["chicken-pot-pie", "Chicken Pot Pie", "1 complete pot pie", chickenChainPublished(720, 26, 60, 41, 1750, 7, 5, 0)],
    ["famous-bowl", "Famous Bowl", "1 standard bowl with mashed potatoes, gravy, corn, cheese and chicken", chickenChainPublished(590, 31, 67, 22, 2160, 4, 3, 0)],
    ["mac-and-cheese-bowl", "Mac & Cheese Bowl", "1 limited-time bowl with macaroni and cheese, chicken and cheese", chickenChainPublished(480, 30, 42, 22, 1970, 2, 4, 0)],
    ["korean-bbq-mac-and-cheese-bowl", "Korean BBQ Mac & Cheese Bowl", "1 limited-time bowl with Korean BBQ sauce included", chickenChainPublished(530, 30, 52, 23, 2250, 2, 12, 0)],
    ["korean-bbq-loaded-fries-bowl", "Korean BBQ Loaded Fries Bowl", "1 limited-time loaded fries bowl with Korean BBQ sauce included", chickenChainPublished(770, 27, 76, 39, 2640, 8, 23, 0)],
    ["nashville-hot-mac-and-cheese-bowl", "Nashville Hot Mac & Cheese Bowl", "1 limited-time bowl with Nashville Hot seasoning included", chickenChainPublished(610, 30, 44, 36, 2180, 3, 5, 0)],
    ["nashville-hot-mashed-potato-bowl", "Nashville Hot Mashed Potato Bowl", "1 limited-time bowl with Nashville Hot seasoning included", chickenChainPublished(680, 29, 66, 34, 2230, 5, 3, 0)],
    ["nashville-hot-loaded-fries-bowl", "Nashville Hot Loaded Fries Bowl", "1 limited-time loaded fries bowl with Nashville Hot seasoning included", chickenChainPublished(910, 26, 63, 60, 2530, 8, 12, 0)],
  ].map(([id, name, description, nutrients]) => kfcFood(id, name, description, nutrients)),
  ...[
    ["bbq-baked-beans", "BBQ Baked Beans", chickenChainPublished(190, 11, 34, 1, 650, 7, 15, 0), chickenChainPublished(830, 47, 148, 5, 2810, 31, 63, 0)],
    ["coleslaw", "Coleslaw", chickenChainPublished(170, 1, 14, 12, 180, 4, 10, 0), chickenChainPublished(640, 4, 54, 46, 670, 14, 37, 0)],
    ["corn-on-the-cob", "Corn on the Cob", chickenChainPublished(70, 2, 17, 0.5, 0, 2, 3, 0), chickenChainPublished(280, 9, 67, 2, 15, 8, 11, 0)],
    ["green-beans", "Green Beans", chickenChainPublished(25, 1, 5, 0, 300, 3, 1, 0), chickenChainPublished(80, 4, 15, 0, 930, 9, 3, 0)],
    ["macaroni-and-cheese", "Macaroni & Cheese", chickenChainPublished(140, 5, 17, 6, 590, 1, 2, 0), chickenChainPublished(540, 18, 66, 23, 2220, 5, 8, 0)],
    ["mashed-potatoes", "Mashed Potatoes", chickenChainPublished(110, 2, 17, 3.5, 330, 1, 0, 0), chickenChainPublished(460, 9, 72, 15, 1410, 6, 0, 0)],
    ["mashed-potatoes-with-gravy", "Mashed Potatoes with Gravy", chickenChainPublished(130, 3, 20, 4.5, 520, 1, 0, 0), chickenChainPublished(590, 12, 88, 21, 2590, 6, 1, 0)],
    ["secret-recipe-fries", "Secret Recipe Fries", chickenChainPublished(320, 5, 41, 15, 1100, 3, 0, 0), chickenChainPublished(840, 13, 108, 40, 2890, 9, 0, 0)],
  ].map(([id, name, individual, family]) => kfcFood(
    id,
    name,
    `1 individual ${name.toLowerCase()} side`,
    individual,
    [
      kfcOption(`${id}:individual`, `Individual ${name} side`, individual),
      kfcOption(`${id}:family`, `Family ${name} side`, family),
    ],
    name === "Secret Recipe Fries" ? ["KFC fries"] : undefined
  )),
  ...[
    ["biscuit", "Biscuit", "1 biscuit", chickenChainPublished(180, 4, 22, 8, 520, 1, 1, 0)],
    ["cornbread-muffin", "Cornbread Muffin", "1 regional cornbread muffin", chickenChainPublished(210, 3, 28, 9, 240, 0, 11, 0)],
    ["sweet-kernel-corn", "Sweet Kernel Corn", "1 individual side", chickenChainPublished(70, 2, 16, 0.5, 0, 2, 2, 0)],
  ].map(([id, name, description, nutrients]) => kfcFood(id, name, description, nutrients)),
  ...[
    ["bbq-dipping-sauce", "BBQ Dipping Sauce", chickenChainPublished(45, 0, 11, 0, 150, 0, 11, 0)],
    ["buffalo-ranch-dipping-sauce", "Buffalo Ranch Dipping Sauce", chickenChainPublished(120, 1, 2, 13, 290, 0, 1, 0)],
    ["comeback-dipping-sauce", "Comeback Dipping Sauce", chickenChainPublished(120, 0, 2, 12, 340, 0, 2, 0)],
    ["honey-mustard-dipping-sauce", "Honey Mustard Dipping Sauce", chickenChainPublished(110, 0, 6, 9, 120, 0, 6, 0)],
    ["kfc-dipping-sauce", "KFC Sauce", chickenChainPublished(90, 0, 5, 8, 170, 0, 5, 0)],
    ["ranch-dipping-sauce", "Ranch Dipping Sauce", chickenChainPublished(130, 0, 2, 14, 240, 0, 1, 0)],
    ["sticky-chicky-sweet-and-sour", "Sticky Chicky Sweet & Sour Sauce", chickenChainPublished(45, 0, 11, 0, 180, 0, 10, 10)],
    ["honey-sauce-packet", "Honey Sauce Packet", chickenChainPublished(30, 0, 8, 0, 0, 0, 5, 0)],
    ["ketchup-packet", "Ketchup Packet", chickenChainPublished(30, 0, 8, 0, 250, 0, 6, 0)],
    ["colonels-buttery-spread", "Colonel's Buttery Spread", chickenChainPublished(35, 0, 0, 4, 35, 0, 0, 0)],
    ["grape-jelly-packet", "Grape Jelly Packet", chickenChainPublished(35, 0, 9, 0, 10, 0, 7, 0)],
    ["strawberry-jam-packet", "Strawberry Jam Packet", chickenChainPublished(35, 0, 9, 0, 0, 0, 6, 0)],
    ["lemon-juice-packet", "Lemon Juice Packet", chickenChainPublished(5, 0, 1, 0, 20, 0, 0, 0)],
  ].map(([id, name, nutrients]) => kfcFood(id, name, `1 separately listed ${name.toLowerCase()}; no chicken or side included`, nutrients)),
  ...[
    ["apple-pie-popper", "Apple Pie Popper", chickenChainPublished(80, 1, 9, 5, 55, 1, 3, 0)],
    ["cherry-pie-popper", "Cherry Pie Popper", chickenChainPublished(70, 1, 7, 4.5, 40, 0, 2, 0)],
    ["strawberry-cream-pie-popper", "Strawberry Cream Pie Popper", chickenChainPublished(70, 1, 7, 4.5, 40, 0, 2, 0)],
    ["apple-turnover", "Apple Turnover", chickenChainPublished(230, 2, 32, 10, 140, 0, 12, 0)],
    ["chocolate-chip-cake-slice", "Chocolate Chip Cake Slice", chickenChainPublished(300, 4, 39, 15, 260, 1, 27, 0)],
    ["lemon-cake-slice", "Lemon Cake Slice", chickenChainPublished(220, 2, 30, 10, 170, 0, 20, 0)],
    ["mini-chocolate-chip-cake", "Mini Chocolate Chip Cake", chickenChainPublished(300, 3, 49, 12, 190, 1, 35, 0)],
    ["mini-lemon-cake", "Mini Lemon Cake", chickenChainPublished(300, 3, 43, 13, 230, 0, 31, 0)],
  ].map(([id, name, nutrients]) => kfcFood(id, name, `1 ${name.toLowerCase()}; limited-time or market availability may vary`, nutrients)),
  ...[
    ["kids-applesauce", "Kids' Applesauce", "1 Musselman's applesauce pouch", chickenChainPublished(45, 0, 12, 0, 0, 1, 8, 0)],
    ["kids-capri-sun-fruit-punch", "Kids' Capri Sun Fruit Punch", "1 kids' juice pouch", chickenChainPublished(80, 0, 21, 0, 25, 0, 20, 0)],
    ["kids-1-percent-milk", "Kids' 1% Milk", "1 kids' milk container", chickenChainPublished(90, 7, 10, 2, 105, 0, 10, 0)],
    ["kids-1-percent-chocolate-milk", "Kids' 1% Chocolate Milk", "1 kids' chocolate milk container", chickenChainPublished(150, 7, 26, 2.5, 170, 0, 23, 0)],
  ].map(([id, name, description, nutrients]) => kfcFood(id, name, description, nutrients)),
  ...[
    ["pepsi", "Pepsi", [[12, 150, 41, 30, 41], [16, 200, 55, 45, 55], [20, 250, 69, 55, 69], [30, 380, 104, 80, 103]]],
    ["pepsi-zero-sugar", "Pepsi Zero Sugar", [[12, 0, 0, 35, 0], [16, 0, 0, 50, 0], [20, 0, 0, 60, 0], [30, 0, 1, 95, 0]]],
    ["mountain-dew", "Mountain Dew", [[12, 160, 44, 50, 44], [16, 220, 59, 70, 58], [20, 270, 73, 85, 73], [30, 410, 110, 125, 109]]],
    ["starry", "Starry", [[12, 150, 39, 35, 39], [16, 200, 52, 45, 52], [20, 240, 65, 55, 65], [30, 370, 97, 85, 97]]],
    ["dr-pepper", "Dr Pepper", [[12, 140, 39, 45, 38], [16, 190, 52, 60, 51], [20, 240, 65, 75, 64], [30, 360, 98, 110, 96]]],
    ["mug-root-beer", "Mug Root Beer", [[12, 140, 39, 45, 39], [16, 190, 52, 60, 52], [20, 240, 65, 75, 65], [30, 360, 98, 110, 98]]],
    ["wild-cherry-pepsi", "Wild Cherry Pepsi", [[12, 160, 42, 30, 42], [16, 210, 56, 40, 56], [20, 260, 70, 50, 70], [30, 390, 105, 80, 105]]],
    ["brisk-sweet-iced-tea", "Brisk Sweet Iced Tea", [[12, 80, 22, 45, 21], [16, 110, 29, 65, 29], [20, 130, 36, 80, 36], [30, 200, 54, 120, 54]]],
    ["brisk-unsweetened-iced-tea", "Brisk Unsweetened Iced Tea", [[12, 0, 0, 45, 0], [16, 0, 0, 60, 0], [20, 0, 0, 75, 0], [30, 0, 0, 115, 0]]],
    ["classic-lemonade", "Classic Lemonade", [[20, 140, 39, 130, 38], [64, 880, 234, 780, 228]]],
  ].map(([id, name, sizes]) => kfcFood(
    id,
    name,
    `${sizes[0][0]} fl oz fountain serving`,
    null,
    sizes.map(([ounces, calories, carbohydrates, sodium, totalSugar]) => kfcOption(
      `${id}:${ounces}oz`,
      ounces === 64 ? "1/2 gallon" : `${ounces} fl oz fountain serving`,
      chickenChainPublished(calories, 0, carbohydrates, 0, sodium, 0, totalSugar, name === "Starry" ? totalSugar : 0)
    )),
    [`KFC ${name}`]
  )),
];

const raisingCanes = { id: "raising-canes", name: "Raising Cane's" };
const canesFood = (id, name, description, nutrients, servingOptions, searchAliases) => chickenChainFood(
  raisingCanes, id, name, description, nutrients, CANES_SOURCE, CANES_REFERENCE, servingOptions, searchAliases
);
const canesOption = (id, description, nutrients, amount = 1, sourceReference = CANES_REFERENCE) => chickenChainOption(
  raisingCanes.id, id, description, nutrients, amount, CANES_SOURCE, sourceReference
);
const canesFoods = [
  (() => {
    const nutrients = chickenChainPublished(130, 13, 5, 7, 200, null, 0, null);
    return canesFood(
      "chicken-finger",
      "Chicken Finger",
      "1 hand-battered chicken finger (1.9 oz / 55 g); sauce and sides not included",
      nutrients,
      [1, 2, 3, 4, 6].map((count) => canesOption(
        `chicken-finger:${count}-piece`,
        `${count} chicken finger${count === 1 ? "" : "s"}; calculated as ${count} × the official per-finger value`,
        Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [key, value === null ? null : value * count])),
        count,
        `${CANES_REFERENCE} This option is calculated from the PDF's explicit per-finger serving.`
      )),
      ["Raising Canes tenders", "Canes chicken fingers", "Raising Canes 2 finger kids", "Raising Canes 3 fingers", "Raising Canes 4 fingers", "Raising Canes 6 fingers"]
    );
  })(),
  canesFood("crinkle-cut-fries", "Crinkle-Cut Fries", "1 standard order (5.1 oz / 144 g)", chickenChainPublished(400, 5, 50, 20, 310, 6, 0, null), undefined, ["Raising Canes fries"]),
  canesFood("texas-toast", "Texas Toast", "1 slice (1.7 oz / 48 g)", chickenChainPublished(150, 4, 23, 4.5, 300, 1, 4, null)),
  canesFood("coleslaw", "Coleslaw", "1 side (3.1 oz / 87 g)", chickenChainPublished(100, 1, 10, 6, 350, 2, 8, null)),
  canesFood("canes-sauce", "Cane's Sauce", "1 dipping sauce cup (1.5 oz / 43 g)", chickenChainPublished(190, 0, 6, 18, 590, null, 5, null), undefined, ["Raising Canes sauce"]),
  canesFood("chicken-sandwich", "Chicken Sandwich", "1 sandwich (10.4 oz / 296 g): 3 chicken fingers, Cane's Sauce and lettuce on a toasted bun", chickenChainPublished(830, 47, 69, 41, 1500, 5, 14, null)),
  ...[
    ["sweet-tea", "Sweet Tea", [[12, 130, 33, 15, 33], [22, 240, 61, 25, 61], [32, 340, 88, 35, 88], [128, 1360, 352, 140, 351]]],
    ["unsweet-tea", "Unsweet Tea", [[12, 0, 0, 15, 0], [22, 0, 0, 25, 0], [32, 0, 0, 35, 0], [128, 0, 0, 140, 0]]],
    ["lemonade", "Freshly Squeezed Lemonade", [[12, 160, 41, 10, 40], [22, 290, 76, 20, 73], [32, 420, 111, 35, 107], [128, 1700, 442, 130, 427]]],
    ["half-sweet-tea-half-lemonade", "Half Sweet Tea / Half Lemonade", [[12, 140, 37, 15, 37], [22, 260, 68, 25, 67], [32, 380, 99, 35, 97]]],
    ["half-unsweet-tea-half-lemonade", "Half Unsweet Tea / Half Lemonade", [[12, 80, 20, 15, 20], [22, 150, 38, 25, 37], [32, 210, 55, 35, 53]]],
    ["barqs-root-beer", "Barq's Root Beer", [[12, 150, 42, 70, 42], [22, 280, 77, 130, 77]]],
  ].map(([id, name, sizes]) => canesFood(
    id,
    name,
    `${sizes[0][0]} fl oz published serving`,
    null,
    sizes.map(([ounces, calories, carbohydrates, sodium, totalSugar]) => canesOption(
      `${id}:${ounces}oz`,
      ounces === 128 ? "1 gallon jug" : `${ounces} fl oz ${ounces === 12 ? "kids'" : ounces === 22 ? "regular" : "large"} serving`,
      chickenChainPublished(calories, ounces === 128 && id === "lemonade" ? 1 : 0, carbohydrates, 0, sodium, ounces === 128 && id === "lemonade" ? null : 0, totalSugar, null)
    )),
    [`Raising Canes ${name}`, `Raising Cane's ${name}`]
  )),
];

const wingstop = { id: "wingstop", name: "Wingstop" };
const wingstopFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = WINGSTOP_REFERENCE) => chickenChainFood(
  wingstop, id, name, description, nutrients, WINGSTOP_SOURCE, sourceReference, servingOptions, searchAliases
);
const wingstopOption = (id, description, nutrients, amount = 1, sourceReference = WINGSTOP_REFERENCE) => chickenChainOption(
  wingstop.id, id, description, nutrients, amount, WINGSTOP_SOURCE, sourceReference
);
const wingstopCountOptions = (id, itemName, perPiece, counts) => counts.map((count) => wingstopOption(
  `${id}:${count}-piece`,
  `${count} piece order; calculated as ${count} × the published per-piece ${itemName} value, with flavor already included`,
  Object.fromEntries(Object.entries(perPiece).map(([key, value]) => [key, value === null ? null : value * count])),
  count,
  `${WINGSTOP_REFERENCE} This option is calculated from the table's explicit per-piece flavored value.`
));

const wingstopFlavors = [
  ["atomic", "Atomic", [90, 10, 1, 5, 220, 0, 0], [90, 4, 7, 4.5, 380, 0, 0], [150, 10, 12, 7, 850, 0, 0], [650, 33, 74, 24, 3230, 2, 11]],
  ["cajun", "Cajun", [90, 10, 0, 5, 310, 0, 0], [80, 4, 6, 4.5, 450, 0, 0], [150, 10, 11, 7, 1020, 0, 0], [640, 33, 70, 25, 3940, 2, 11]],
  ["garlic-parmesan", "Garlic Parmesan", [120, 10, 1, 8, 75, 0, 0], [110, 4, 6, 7, 260, 0, 0], [210, 10, 11, 14, 550, 0, 0], [890, 34, 71, 52, 2060, 2, 11]],
  ["hawaiian", "Hawaiian", [100, 10, 3, 5, 85, 0, 2], [90, 4, 8, 4.5, 270, 0, 2], [160, 10, 16, 7, 580, 0, 5], [710, 33, 90, 24, 2150, 2, 30]],
  ["hickory-smoked-bbq", "Hickory Smoked BBQ", [100, 10, 4, 5, 150, 0, 3], [90, 5, 9, 4.5, 330, 0, 3], [170, 10, 17, 7, 710, 0, 6], [730, 34, 96, 24, 2680, 2, 36]],
  ["spicy-korean-q", "Spicy Korean Q", [100, 10, 3, 5, 135, 0, 3], [90, 5, 8, 4.5, 320, 0, 2], [170, 10, 16, 7, 680, 0, 6], [720, 34, 90, 24, 2570, 2, 32]],
  ["lemon-pepper", "Lemon Pepper", [120, 10, 0, 8, 210, 0, 0], [110, 4, 6, 7, 290, 0, 0], [200, 10, 10, 13, 620, 0, 0], [850, 32, 67, 50, 2320, 2, 10]],
  ["louisiana-rub", "Louisiana Rub", [110, 10, 0, 7, 140, 0, 0], [100, 4, 6, 6, 260, 0, 0], [180, 10, 10, 12, 540, 0, 0], [790, 32, 67, 43, 2020, 2, 10]],
  ["mango-habanero", "Mango Habanero", [100, 10, 4, 5, 80, 0, 3], [90, 4, 9, 4.5, 270, 0, 3], [170, 10, 17, 7, 570, 0, 7], [740, 32, 94, 24, 2120, 2, 7]],
  ["mild", "Mild", [120, 10, 0, 8, 160, 0, 0], [110, 4, 6, 7, 330, 0, 0], [200, 10, 10, 14, 730, 0, 0], [870, 32, 67, 52, 2750, 2, 10]],
  ["original-hot", "Original Hot", [90, 10, 0, 5, 230, 0, 0], [80, 4, 6, 4.5, 390, 0, 0], [140, 10, 10, 7, 870, 0, 0], [630, 32, 68, 25, 3340, 2, 10]],
  ["plain", "Plain", [90, 10, 0, 5, 30, 0, 0], [80, 4, 6, 4.5, 230, 0, 0], [140, 10, 10, 7, 470, 0, 0], [610, 32, 66, 24, 1720, 2, 10]],
  ["old-bay", "Old Bay", [100, 10, 0, 7, 110, 0, 1], [100, 4, 6, 6, 290, 0, 1], [170, 10, 10, 11, 420, 0, 2], null],
];
const wingstopFlavorNutrients = (values) => chickenChainPublished(...values, null);

const wingstopFoods = [
  ...wingstopFlavors.flatMap(([id, flavor, classicValues, bonelessValues, tenderValues]) => {
    const classic = wingstopFlavorNutrients(classicValues);
    const boneless = wingstopFlavorNutrients(bonelessValues);
    const tender = wingstopFlavorNutrients(tenderValues);
    return [
      wingstopFood(
        `classic-wings-${id}`,
        `Classic Bone-In Wings - ${flavor}`,
        `1 classic bone-in wing with ${flavor} flavor already included; dip not included`,
        classic,
        wingstopCountOptions(`classic-wings-${id}`, `${flavor} classic wing`, classic, [6, 8, 10, 15, 20, 30]),
        [
          `Wingstop bone in ${flavor} wings`,
          ...[6, 8, 10, 15, 20, 30].map((count) => `Wingstop ${count} piece ${flavor} bone in wings`),
        ]
      ),
      wingstopFood(
        `boneless-wings-${id}`,
        `Boneless Wings - ${flavor}`,
        `1 boneless wing with ${flavor} flavor already included; dip not included`,
        boneless,
        wingstopCountOptions(`boneless-wings-${id}`, `${flavor} boneless wing`, boneless, [6, 8, 10, 15, 20, 30]),
        [
          `Wingstop ${flavor} boneless wings`,
          ...[6, 8, 10, 15, 20, 30].map((count) => `Wingstop ${count} piece ${flavor} boneless wings`),
        ]
      ),
      wingstopFood(
        `crispy-tenders-${id}`,
        `Crispy Tenders - ${flavor}`,
        `1 crispy tender with ${flavor} flavor already included; dip not included`,
        tender,
        wingstopCountOptions(`crispy-tenders-${id}`, `${flavor} crispy tender`, tender, [3, 5, 10]),
        [
          `Wingstop ${flavor} tenders`,
          ...[3, 5, 10].map((count) => `Wingstop ${count} piece ${flavor} tenders`),
        ]
      ),
    ];
  }),
  ...wingstopFlavors.filter(([, , , , , sandwichValues]) => Boolean(sandwichValues)).map(([id, flavor, , , , sandwichValues]) => wingstopFood(
    `chicken-sandwich-${id}`,
    `Chicken Sandwich - ${flavor}`,
    `1 chicken sandwich with ${flavor} flavor already included; dip, fries and drink not included`,
    wingstopFlavorNutrients(sandwichValues),
    undefined,
    [`Wingstop ${flavor} chicken sandwich`]
  )),
  ...[
    ["seasoned-fries", "Seasoned Fries", ["Regular seasoned fries", chickenChainPublished(500, 8, 69, 21, 620, 0, 3, null)], ["Large seasoned fries", chickenChainPublished(900, 14, 126, 37, 1060, 0, 6, null)]],
    ["buffalo-ranch-fries", "Buffalo Ranch Fries", ["Regular Buffalo Ranch Fries", chickenChainPublished(610, 8, 71, 32, 1720, 0, 4, null)], ["Large Buffalo Ranch Fries", chickenChainPublished(1070, 15, 129, 55, 2710, 0, 8, null)]],
    ["louisiana-voodoo-fries", "Louisiana Voodoo Fries", ["Regular Louisiana Voodoo Fries", chickenChainPublished(680, 9, 75, 38, 1270, 0, 4, null)], ["Large Louisiana Voodoo Fries", chickenChainPublished(1180, 16, 133, 64, 1870, 0, 6, null)]],
    ["cheese-fries", "Cheese Fries", ["Regular Cheese Fries", chickenChainPublished(580, 9, 75, 27, 1190, 0, 4, null)], ["Large Cheese Fries", chickenChainPublished(1020, 15, 134, 47, 1910, 0, 8, null)]],
    ["cajun-fried-corn", "Cajun Fried Corn", ["Regular order (5 pieces)", chickenChainPublished(200, 6, 24, 9, 300, 0, 10, null)], ["Large order (10 pieces)", chickenChainPublished(400, 12, 48, 18, 600, 0, 19, null)]],
  ].map(([id, name, regular, large]) => wingstopFood(
    id,
    name,
    regular[0],
    null,
    [wingstopOption(`${id}:regular`, regular[0], regular[1]), wingstopOption(`${id}:large`, large[0], large[1])],
    name === "Seasoned Fries" ? ["Wingstop fries"] : undefined
  )),
  ...[
    ["carrot-sticks", "Carrot Sticks", "4 carrot sticks", chickenChainPublished(25, 1, 7, 0, 45, 2, 3, null)],
    ["celery-sticks", "Celery Sticks", "4 celery sticks", chickenChainPublished(10, 1, 2, 0, 45, 1, null, null)],
    ["ranch-dip", "Ranch Dip", "1 housemade dip cup", chickenChainPublished(320, 1, 2, 34, 870, 0, 2, null)],
    ["blue-cheese-dip", "Blue Cheese Dip", "1 dip cup", chickenChainPublished(330, 4, 4, 33, 570, 0, 2, null)],
    ["honey-mustard-dip", "Honey Mustard Dip", "1 dip cup", chickenChainPublished(390, 0, 18, 33, 660, 0, 18, null)],
    ["cheddar-cheese-sauce-dip", "Cheddar Cheese Sauce Dip", "1 dip cup", chickenChainPublished(120, 2, 8, 9, 850, 0, 2, null)],
    ["brownie", "Brownie", "1 brownie", chickenChainPublished(430, 6, 49, 24, 160, 3, 33, null)],
  ].map(([id, name, description, nutrients]) => wingstopFood(id, name, description, nutrients)),
  ...[
    ["coca-cola", "Coca-Cola", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 250, 68, 5, 68], ["large", "Large fountain serving (32 fl oz / 960 mL)", 400, 108, 10, 108]]],
    ["diet-coke", "Diet Coke", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 0, 1, 25, 1], ["large", "Large fountain serving (32 fl oz / 960 mL)", 0, 2, 40, 2]]],
    ["dr-pepper", "Dr Pepper", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 230, 65, 75, 65], ["large", "Large fountain serving (32 fl oz / 960 mL)", 360, 104, 120, 104]]],
    ["sprite", "Sprite", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 240, 65, 55, 65], ["large", "Large fountain serving (32 fl oz / 960 mL)", 390, 104, 90, 104]]],
    ["fanta-orange", "Fanta Orange", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 280, 75, 35, 75], ["large", "Large fountain serving (32 fl oz / 960 mL)", 440, 120, 55, 120]]],
    ["sweet-tea", "Sweet Tea", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 180, 45, 0, 45], ["large", "Large fountain serving (32 fl oz / 960 mL)", 280, 72, 0, 72]]],
    ["unsweetened-tea", "Unsweetened Tea", [["regular", "Regular fountain serving (20 fl oz / 600 mL)", 0, 0, 0, 0], ["large", "Large fountain serving (32 fl oz / 960 mL)", 0, 0, 0, 0]]],
  ].map(([id, name, sizes]) => wingstopFood(
    id,
    name,
    sizes[0][1],
    null,
    sizes.map(([optionId, description, calories, carbohydrates, sodium, totalSugar]) => wingstopOption(
      `${id}:${optionId}`,
      description,
      chickenChainPublished(calories, 0, carbohydrates, 0, sodium, 0, totalSugar, null)
    )),
    [`Wingstop ${name}`]
  )),
];

const NEXT_MENU_EXPANSION_ACCESSED_AT = "2026-09-10";
const menuPublished = (calories, protein, carbohydrates, fat, sodium, fiber = null, totalSugar = null, addedSugar = null) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar,
});
const expansionMenuOption = (chain, sourceUrl, sourceReference, id, description, nutrients, amount = 1) => {
  const option = officialOption(chain.id, id, description, nutrients, amount, sourceUrl, sourceReference);
  option.provenance.verification.accessedAt = NEXT_MENU_EXPANSION_ACCESSED_AT;
  option.provenance.verification.status = ["calories", "protein", "carbohydrates", "fat"].every((key) => nutrients?.[key] !== null && nutrients?.[key] !== undefined) ? "complete" : "partial";
  return option;
};
const menuFood = (chain, sourceUrl, sourceReference, id, name, description, nutrients, servingOptions, searchAliases) => {
  const selectedNutrients = nutrients || servingOptions?.[0]?.nutrients;
  const food = officialFood(
    chain,
    id,
    name,
    description,
    nutrients,
    sourceUrl,
    sourceReference,
    servingOptions,
    {
      status: ["calories", "protein", "carbohydrates", "fat"].every((key) => selectedNutrients?.[key] !== null && selectedNutrients?.[key] !== undefined) ? "complete" : "partial",
      accessedAt: NEXT_MENU_EXPANSION_ACCESSED_AT,
    }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const sumPublished = (left, right) => Object.fromEntries(Object.keys(left).map((key) => [
  key,
  left[key] === null || right[key] === null ? null : left[key] + right[key],
]));

const dairyQueen = { id: "dairy-queen", name: "Dairy Queen" };
const DAIRY_QUEEN_SOURCE = "https://www.dairyqueen.com/en-us/nutrition/food-treats/";
const DAIRY_QUEEN_REFERENCE = "Dairy Queen official U.S. Food & Treats Nutrition table, current as of August 26, 2024. Grill & Chill, treat-only, regional, and limited-time availability varies by location.";
const dqFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = DAIRY_QUEEN_REFERENCE) => menuFood(
  dairyQueen,
  DAIRY_QUEEN_SOURCE,
  sourceReference,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [`DQ ${name}`, ...(servingOptions || []).map((option) => `DQ ${option.serving.description} ${name}`), ...(searchAliases || [])]
);
const dqOption = (id, description, nutrients, amount = 1, sourceReference = DAIRY_QUEEN_REFERENCE) => expansionMenuOption(
  dairyQueen, DAIRY_QUEEN_SOURCE, sourceReference, id, description, nutrients, amount
);
const dqSizedFood = (id, name, category, sizes, searchAliases) => dqFood(
  id,
  name,
  sizes[0][1],
  null,
  sizes.map(([sizeId, description, nutrients]) => dqOption(`${id}:${sizeId}`, description, nutrients)),
  searchAliases,
  `${DAIRY_QUEEN_REFERENCE} Each option is a separately published ${category} size.`
);

const dqBurgerFoods = [
  ["bbq-smokehouse-cheddar-stackburger", "BBQ Smokehouse Cheddar Signature Stackburger", [["double", "Double Stackburger", menuPublished(760, 38, 55, 43, 1880, 2, 15)], ["triple", "Triple Stackburger", menuPublished(960, 49, 56, 59, 2280, 2, 16)]]],
  ["backyard-bacon-ranch-burger", "Backyard Bacon Ranch Burger", [["double", "Double burger", menuPublished(820, 38, 53, 51, 1900, 2, 15)], ["triple", "Triple burger", menuPublished(1020, 50, 54, 67, 2310, 2, 15)]]],
  ["bacon-two-cheese-deluxe-burger", "Bacon Two Cheese Deluxe Burger", [["double", "Double burger", menuPublished(720, 37, 39, 47, 1890, 2, 9)], ["triple", "Triple burger", menuPublished(920, 49, 40, 63, 2300, 2, 9)]]],
  ["flamethrower-burger", "FlameThrower Burger", [["double", "Double burger", menuPublished(720, 34, 37, 49, 1430, 2, 7)], ["triple", "Triple burger", menuPublished(910, 46, 38, 65, 1820, 2, 7)]]],
  ["hamburger", "Hamburger", [["single", "Single hamburger", menuPublished(320, 15, 36, 13, 870, 1, 7)], ["double", "Double hamburger", menuPublished(460, 24, 36, 25, 1030, 1, 7)], ["triple", "Triple hamburger", menuPublished(610, 33, 36, 37, 1190, 1, 7)]]],
  ["original-cheeseburger", "Original Cheeseburger", [["single", "Single cheeseburger", menuPublished(370, 17, 37, 18, 1120, 1, 8)], ["double", "Double cheeseburger", menuPublished(570, 29, 38, 34, 1530, 1, 8)], ["triple", "Triple cheeseburger", menuPublished(760, 40, 39, 50, 1940, 1, 9)]]],
  ["two-cheese-deluxe-burger", "Two Cheese Deluxe Burger", [["double", "Double burger", menuPublished(620, 29, 39, 39, 1510, 2, 9)], ["triple", "Triple burger", menuPublished(820, 41, 40, 55, 1930, 2, 9)]]],
].map(([id, name, sizes]) => dqSizedFood(id, name, "burger", sizes, [`DQ ${name}`]));

const dqFlatFoods = [
  ["chicken-strips", "Chicken Strips", "Plain chicken strips; basket sides, toast, sauce, and drink excluded", menuPublished(280, 13, 28, 13, 640, 1, 1), [["2-piece", "2 chicken strips", menuPublished(280, 13, 28, 13, 640, 1, 1), 2], ["3-piece", "3 chicken strips", menuPublished(430, 19, 41, 20, 950, 2, 2), 3]], ["DQ chicken tenders", "Dairy Queen 2 piece chicken strips", "Dairy Queen 3 piece chicken strips"]],
  ["original-chicken-strip-sandwich", "Original Chicken Strip Sandwich", "1 sandwich; side and drink excluded", menuPublished(550, 18, 62, 26, 990, 3, 6)],
  ["spicy-chicken-strip-sandwich", "Spicy Chicken Strip Sandwich", "1 sandwich; side and drink excluded", menuPublished(530, 18, 63, 23, 1060, 3, 8)],
  ["flamethrower-chicken-sandwich", "FlameThrower Chicken Sandwich", "1 limited-time sandwich; side and drink excluded", menuPublished(530, 18, 63, 23, 1060, 3, 8)],
  ["side-salad", "Side Salad", "1 salad; dressing and crunchy toppings excluded", menuPublished(20, 1, 4, 0, 10, 1, 3)],
  ["classic-hot-dog", "Classic Hot Dog", "1 plain hot dog in bun", menuPublished(330, 12, 25, 19, 820, 1, 3), undefined, ["Dairy Queen hot dog", "DQ hot dog"]],
  ["cheese-dog", "Cheese Dog", "1 hot dog with cheese", menuPublished(390, 16, 27, 24, 1000, 1, 3)],
  ["chili-dog", "Chili Dog", "1 hot dog with chili", menuPublished(390, 16, 29, 23, 1060, 1, 4)],
  ["chili-cheese-dog", "Chili Cheese Dog", "1 hot dog with chili and cheese", menuPublished(420, 18, 28, 26, 1070, 1, 4), [["1-dog", "1 chili cheese dog", menuPublished(420, 18, 28, 26, 1070, 1, 4)], ["2-dogs", "2 chili cheese dogs", menuPublished(850, 36, 56, 53, 2140, 2, 7), 2]]],
  ["bbq-sandwich", "BBQ Sandwich", "1 regional sandwich", menuPublished(280, 14, 39, 7, 750, 2, 12)],
  ["corn-dog", "Corn Dog", "1 corn dog", menuPublished(240, 6, 25, 13, 390, 2, 7)],
  ["mega-chili-cheese-dog", "Mega Chili Cheese Dog", "1 regional large chili cheese dog", menuPublished(760, 32, 49, 49, 1910, 2, 6)],
  ["pork-tenderloin-sandwich", "Pork Tenderloin Sandwich", "1 regional sandwich", menuPublished(600, 21, 52, 34, 990, 3, 7)],
  ["steakfinger-basket", "Steakfinger Basket", "1 regional published basket configuration", menuPublished(940, 23, 97, 51, 2120, 5, 3)],
  ["wild-alaskan-fish-sandwich", "Wild Alaskan Fish Sandwich", "1 seasonal sandwich", menuPublished(420, 17, 50, 16, 960, 1, 7)],
  ["kids-applesauce", "Kids' Applesauce", "1 kids' side", menuPublished(45, 0, 11, 0, 0, 2, 7)],
  ["kids-banana", "Kids' Banana", "1 banana", menuPublished(110, 1, 27, 0, 0, 3, 14)],
  ["kids-milk", "Kids' Milk", "1 published kids' milk container", menuPublished(110, 8, 12, 2.5, 130, 0, 12)],
  ["doritos-nacho-cheese-chips", "Doritos Nacho Cheese Tortilla Chips", "1 bag", menuPublished(240, 3, 28, 14, 360, 2, 0)],
  ["fry-rings", "Fry-Rings", "1 à la carte regional order", menuPublished(400, 7, 53, 18, 890, 3, 2)],
  ["lays-bbq-chips", "Lay's BBQ Potato Chips", "1 bag", menuPublished(230, 3, 23, 15, 230, 2, 3)],
  ["lays-original-chips", "Lay's Original Potato Chips", "1 bag", menuPublished(240, 3, 23, 16, 250, 2, 1)],
  ["baked-lays-original-crisps", "Oven Baked Lay's Original Potato Crisps", "1 bag", menuPublished(130, 2, 26, 2, 150, 2, 2)],
  ["soft-pretzel-sticks-zesty-queso", "Soft Pretzel Sticks with Zesty Queso", "1 published order with queso included", menuPublished(340, 10, 53, 10, 2130, 2, 7)],
  ["bbq-dipping-sauce", "BBQ Dipping Sauce", "1 sauce cup", menuPublished(90, 1, 21, 0, 430, 1, 16)],
  ["country-gravy-dipping-sauce", "Country Gravy Dipping Sauce", "1 sauce cup", menuPublished(70, 0, 6, 4.5, 360, 0, 1)],
  ["honey-mustard-dipping-sauce", "Honey Mustard Dipping Sauce", "1 sauce cup", menuPublished(240, 1, 15, 20, 450, 0, 14)],
  ["hidden-valley-ranch-dipping-sauce", "House Made Hidden Valley Ranch Dipping Sauce", "1 sauce cup", menuPublished(220, 1, 3, 22, 370, 0, 2), undefined, ["DQ ranch", "Dairy Queen ranch dip"]],
  ["kraft-fat-free-italian-dressing", "Kraft Fat Free Italian Dressing", "1 dressing packet; unpublished fiber remains unknown", menuPublished(25, 0, 4, 0, 380, null, 3)],
  ["kraft-honey-mustard-dressing", "Kraft Honey Mustard Dressing", "1 dressing packet; unpublished sugar remains unknown", menuPublished(130, 0, 12, 9, 330, 0, null)],
  ["banana-split", "Banana Split", "1 complete treat", menuPublished(520, 9, 94, 14, 150, 4, 74)],
  ["brownie-oreo-cupfection", "Brownie and OREO Cupfection", "1 complete treat", menuPublished(720, 10, 122, 23, 330, 2, 96)],
  ["peanut-buster-parfait", "Peanut Buster Parfait", "1 complete treat", menuPublished(710, 17, 95, 31, 340, 3, 68)],
  ["buster-bar-six-pack", "Buster Bar - 6 Pack", "1 published six-pack; manufacturing method varies", null, [["manufactured", "Manufactured 6-pack", menuPublished(2850, 61, 274, 177, 1090, 18, 223), 6], ["store-made", "Store-made 6-pack", menuPublished(2650, 63, 255, 161, 1160, 18, 201), 6]]],
  ["dilly-bar-six-pack", "Dilly Bar - 6 Pack", "1 published six-pack; manufacturing method varies", null, [["manufactured", "Manufactured 6-pack", menuPublished(1340, 20, 153, 74, 340, 4, 127), 6], ["store-made", "Store-made 6-pack", menuPublished(1210, 19, 128, 71, 300, 3, 108), 6]]],
  ["dq-sandwich-six-pack", "DQ Sandwich - 6 Pack", "1 published six-pack", menuPublished(1100, 23, 182, 31, 780, 3, 104)],
].map(([id, name, description, nutrients, options, aliases]) => dqFood(
  id,
  name,
  description,
  nutrients,
  options?.map(([optionId, optionDescription, optionNutrients, amount = 1]) => dqOption(`${id}:${optionId}`, optionDescription, optionNutrients, amount)),
  aliases
));

const dqSideFoods = [
  ["cheese-curds", "Cheese Curds", [["regular", "Regular order", menuPublished(500, 24, 26, 34, 990, 0, 1)], ["large", "Large order", menuPublished(1000, 49, 52, 67, 1960, 0, 3)]]],
  ["fries", "French Fries", [["kids", "Kids' fries", menuPublished(170, 3, 23, 8, 370, 2, 0)], ["regular", "Regular fries", menuPublished(280, 5, 36, 13, 590, 3, 0)], ["large", "Large fries", menuPublished(450, 8, 59, 21, 950, 4, 0)]]],
  ["onion-rings", "Onion Rings", [["regular", "Regular onion rings", menuPublished(290, 5, 39, 13, 680, 2, 3)], ["large", "Large onion rings", menuPublished(450, 7, 60, 20, 1050, 3, 4)]]],
].map(([id, name, sizes]) => dqSizedFood(id, name, "side", sizes, [`DQ ${name}`]));

const dqBlizzardRows = [
  ["butterfinger-blizzard", "Butterfinger Blizzard", [[350, 9, 52, 12, 150, 1, 41], [590, 15, 87, 21, 270, 1, 68], [800, 20, 118, 28, 360, 2, 91], [1060, 27, 155, 37, 480, 2, 119]]],
  ["choco-brownie-extreme-blizzard", "Choco Brownie Extreme Blizzard", [[420, 9, 58, 18, 190, 2, 46], [740, 15, 103, 33, 340, 4, 81], [980, 20, 137, 43, 460, 5, 106], [1330, 26, 184, 60, 620, 7, 142]]],
  ["chocolate-chip-cookie-dough-blizzard", "Chocolate Chip Cookie Dough Blizzard", [[410, 8, 60, 16, 210, 1, 46], [710, 13, 104, 27, 380, 1, 78], [1030, 18, 151, 40, 550, 2, 113], [1370, 23, 201, 54, 740, 3, 151]]],
  ["heath-blizzard", "Heath Blizzard", [[360, 8, 52, 14, 170, 0, 45], [640, 13, 91, 26, 310, 1, 79], [880, 17, 124, 37, 430, 1, 110], [1190, 23, 168, 49, 590, 2, 148]]],
  ["mms-chocolate-candy-blizzard", "M&M's Chocolate Candy Blizzard", [[370, 8, 58, 12, 125, 1, 50], [660, 14, 103, 21, 220, 1, 89], [880, 18, 135, 29, 290, 2, 117], [1160, 23, 183, 38, 380, 3, 159]]],
  ["oreo-cookie-blizzard", "OREO Cookie Blizzard", [[330, 7, 48, 12, 150, 0, 39], [600, 13, 89, 22, 280, 1, 70], [820, 17, 121, 30, 390, 1, 94], [1050, 22, 156, 39, 500, 1, 121]]],
  ["reeses-peanut-butter-cups-blizzard", "Reese's Peanut Butter Cups Blizzard", [[360, 9, 50, 14, 170, 1, 43], [610, 16, 84, 24, 300, 1, 72], [820, 21, 113, 34, 410, 2, 97], [1080, 28, 148, 45, 550, 3, 128]]],
  ["royal-new-york-cheesecake-blizzard", "Royal New York Cheesecake Blizzard Filled with Strawberry", [[450, 8, 65, 18, 220, 1, 53], [750, 14, 102, 32, 380, 2, 82], [1040, 19, 140, 46, 530, 2, 112], [1320, 25, 171, 60, 690, 2, 135]]],
  ["royal-ultimate-choco-brownie-blizzard", "Royal Ultimate Choco Brownie Blizzard Filled with Fudge", [[480, 9, 68, 21, 220, 2, 55], [770, 14, 107, 34, 350, 4, 86], [1040, 19, 146, 45, 480, 5, 117], [1340, 25, 186, 60, 620, 8, 148]]],
  ["snickers-blizzard", "Snickers Blizzard", [[350, 8, 53, 12, 150, 0, 45], [610, 14, 92, 20, 260, 1, 78], [800, 19, 120, 28, 340, 1, 102], [1060, 24, 162, 36, 450, 2, 138]]],
  ["turtle-pecan-cluster-blizzard", "Turtle Pecan Cluster Blizzard", [[430, 8, 51, 22, 160, 1, 42], [680, 14, 84, 34, 270, 2, 68], [1020, 18, 123, 52, 390, 3, 99], [1370, 24, 165, 71, 510, 4, 132]]],
];
const dqBlizzardFoods = dqBlizzardRows.map(([id, name, values]) => dqSizedFood(
  id,
  name,
  "Blizzard",
  ["mini", "small", "medium", "large"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${name}`, menuPublished(...values[index])]),
  [`DQ ${name}`, `Dairy Queen ${name}`]
));

const dqShakeRows = [
  ["banana", "Banana", [[470, 13, 64, 19, 190, 1, 53], [590, 16, 83, 22, 240, 1, 68], [750, 21, 109, 27, 310, 2, 88]]],
  ["caramel", "Caramel", [[550, 13, 79, 20, 240, 0, 65], [750, 17, 115, 25, 330, 0, 93], [980, 22, 154, 31, 450, 0, 124]]],
  ["chocolate", "Chocolate", [[530, 13, 77, 19, 220, 1, 67], [710, 16, 110, 23, 290, 1, 96], [920, 21, 147, 28, 390, 2, 128]]],
  ["hot-fudge", "Hot Fudge", [[550, 13, 75, 22, 240, 0, 61], [750, 17, 105, 30, 330, 1, 85], [990, 23, 140, 38, 440, 1, 112]]],
  ["peanut-butter", "Peanut Butter", [[640, 16, 67, 34, 370, 1, 54], [930, 22, 91, 53, 590, 3, 69], [1250, 30, 119, 72, 830, 4, 89]]],
  ["strawberry", "Strawberry", [[490, 13, 68, 19, 200, 0, 59], [630, 16, 92, 23, 260, 1, 80], [800, 21, 120, 27, 340, 1, 105]]],
  ["vanilla", "Vanilla", [[520, 13, 73, 19, 200, 0, 65], [660, 16, 97, 23, 260, 0, 85], [860, 22, 127, 29, 340, 0, 112]]],
];
const dqMaltAdds = [menuPublished(60, 1, 12, 0.5, 50, 0, 8), menuPublished(80, 1, 18, 1, 80, 1, 12), menuPublished(110, 2, 23, 1, 105, 1, 16)];
const dqShakeFoods = dqShakeRows.flatMap(([id, flavor, values]) => {
  const shakeSizes = ["small", "medium", "large"].map((size, index) => [size, `${size[0].toUpperCase()}${size.slice(1)} ${flavor} Shake`, menuPublished(...values[index])]);
  const maltSizes = shakeSizes.map(([size, , nutrients], index) => [
    size,
    `${size[0].toUpperCase()}${size.slice(1)} ${flavor} Malt; calculated from the published ${flavor} Shake plus published malt add-on for this size`,
    sumPublished(nutrients, dqMaltAdds[index]),
  ]);
  return [
    dqSizedFood(`${id}-shake`, `${flavor} Shake`, "shake", shakeSizes, [`DQ ${flavor} shake`]),
    dqSizedFood(`${id}-malt`, `${flavor} Malt`, "calculated malt configuration", maltSizes, [`DQ ${flavor} malt`, `Dairy Queen ${flavor} malt`]),
  ];
});

const dqTreatSizedFoods = [
  ["caramel-moolatte", "Caramel MooLatté", "frozen beverage", [["small", "Small Caramel MooLatté", menuPublished(490, 8, 81, 15, 190, 0, 69)], ["medium", "Medium Caramel MooLatté", menuPublished(620, 10, 103, 18, 240, 0, 87)], ["large", "Large Caramel MooLatté", menuPublished(780, 13, 135, 21, 320, 0, 113)]]],
  ["mocha-moolatte", "Mocha MooLatté", "frozen beverage", [["small", "Small Mocha MooLatté", menuPublished(500, 9, 76, 18, 180, 1, 67)], ["medium", "Medium Mocha MooLatté", menuPublished(620, 11, 94, 23, 240, 2, 82)], ["large", "Large Mocha MooLatté", menuPublished(780, 14, 121, 29, 310, 2, 106)]]],
  ["vanilla-moolatte", "Vanilla MooLatté", "frozen beverage", [["small", "Small Vanilla MooLatté", menuPublished(450, 7, 74, 14, 150, 0, 67)], ["medium", "Medium Vanilla MooLatté", menuPublished(560, 9, 93, 17, 190, 0, 84)], ["large", "Large Vanilla MooLatté", menuPublished(700, 12, 121, 19, 240, 0, 109)]]],
  ["misty-freeze", "Misty Freeze", "frozen beverage", [["small", "Small Misty Freeze", menuPublished(360, 8, 62, 10, 130, 0, 55)], ["medium", "Medium Misty Freeze", menuPublished(450, 10, 77, 12, 160, 0, 68)], ["large", "Large Misty Freeze", menuPublished(590, 12, 102, 15, 210, 0, 90)]]],
  ["misty-slush", "Misty Slush", "frozen beverage", [["small", "Small Misty Slush", menuPublished(200, 0, 50, 0, 35, 0, 50)], ["medium", "Medium Misty Slush", menuPublished(260, 0, 65, 0, 40, 0, 64)], ["large", "Large Misty Slush", menuPublished(340, 0, 86, 0, 55, 0, 85)]]],
  ["caramel-sundae", "Caramel Sundae", "sundae", [["small", "Small Caramel Sundae", menuPublished(300, 6, 50, 8, 130, 0, 40)], ["medium", "Medium Caramel Sundae", menuPublished(430, 9, 73, 11, 190, 0, 58)], ["large", "Large Caramel Sundae", menuPublished(600, 12, 102, 16, 260, 0, 81)]]],
  ["cherry-sundae", "Cherry Sundae", "sundae", [["small", "Small Cherry Sundae", menuPublished(250, 6, 42, 7, 95, 0, 36)], ["medium", "Medium Cherry Sundae", menuPublished(360, 8, 61, 9, 135, 0, 52)], ["large", "Large Cherry Sundae", menuPublished(510, 12, 86, 14, 200, 1, 73)]]],
  ["chocolate-sundae", "Chocolate Sundae", "sundae", [["small", "Small Chocolate Sundae", menuPublished(270, 6, 48, 7, 110, 1, 41)], ["medium", "Medium Chocolate Sundae", menuPublished(400, 8, 70, 10, 160, 1, 60)], ["large", "Large Chocolate Sundae", menuPublished(560, 12, 97, 14, 220, 1, 84)]]],
  ["hot-fudge-sundae", "Hot Fudge Sundae", "sundae", [["small", "Small Hot Fudge Sundae", menuPublished(300, 6, 46, 10, 125, 0, 36)], ["medium", "Medium Hot Fudge Sundae", menuPublished(430, 9, 66, 15, 190, 1, 52)], ["large", "Large Hot Fudge Sundae", menuPublished(610, 13, 93, 21, 260, 1, 73)]]],
  ["peanut-butter-sundae", "Peanut Butter Sundae", "sundae", [["small", "Small Peanut Butter Sundae", menuPublished(380, 9, 39, 22, 260, 1, 28)], ["medium", "Medium Peanut Butter Sundae", menuPublished(560, 13, 56, 32, 380, 2, 40)], ["large", "Large Peanut Butter Sundae", menuPublished(780, 18, 79, 44, 520, 3, 58)]]],
  ["pineapple-sundae", "Pineapple Sundae", "sundae", [["small", "Small Pineapple Sundae", menuPublished(230, 6, 38, 7, 85, 0, 33)], ["medium", "Medium Pineapple Sundae", menuPublished(330, 8, 54, 10, 120, 1, 47)], ["large", "Large Pineapple Sundae", menuPublished(480, 12, 77, 14, 170, 1, 67)]]],
  ["strawberry-sundae", "Strawberry Sundae", "sundae", [["small", "Small Strawberry Sundae", menuPublished(240, 6, 39, 7, 95, 0, 34)], ["medium", "Medium Strawberry Sundae", menuPublished(340, 8, 56, 10, 135, 1, 49)], ["large", "Large Strawberry Sundae", menuPublished(490, 12, 80, 14, 190, 1, 69)]]],
  ["vanilla-cone", "Vanilla Cone", "cone", [["kids", "Kids' Vanilla Cone", menuPublished(160, 4, 25, 4.5, 65, 0, 18)], ["small", "Small Vanilla Cone", menuPublished(220, 6, 34, 7, 90, 0, 26)], ["medium", "Medium Vanilla Cone", menuPublished(320, 8, 50, 10, 130, 0, 36)], ["large", "Large Vanilla Cone", menuPublished(450, 12, 71, 14, 180, 0, 52)]]],
  ["chocolate-cone", "Chocolate Cone", "cone", [["kids", "Kids' Chocolate Cone", menuPublished(160, 4, 25, 5, 60, 0, 17)], ["small", "Small Chocolate Cone", menuPublished(240, 6, 36, 7, 90, 0, 25)], ["medium", "Medium Chocolate Cone", menuPublished(340, 8, 52, 10, 130, 0, 35)], ["large", "Large Chocolate Cone", menuPublished(480, 12, 73, 15, 190, 0, 50)]]],
  ["cherry-dipped-cone", "Cherry Dipped Cone", "cone", [["kids", "Kids' Cherry Dipped Cone", menuPublished(210, 4, 28, 9, 65, 0, 20)], ["small", "Small Cherry Dipped Cone", menuPublished(320, 6, 40, 15, 95, 0, 31)], ["medium", "Medium Cherry Dipped Cone", menuPublished(460, 8, 58, 22, 140, 0, 44)], ["large", "Large Cherry Dipped Cone", menuPublished(550, 12, 76, 22, 190, 0, 57)]]],
  ["chocolate-dipped-cone", "Chocolate Dipped Cone", "cone", [["kids", "Kids' Chocolate Dipped Cone", menuPublished(200, 4, 28, 9, 65, 0, 20)], ["small", "Small Chocolate Dipped Cone", menuPublished(320, 6, 40, 15, 95, 1, 30)], ["medium", "Medium Chocolate Dipped Cone", menuPublished(460, 9, 58, 22, 140, 1, 43)], ["large", "Large Chocolate Dipped Cone", menuPublished(640, 13, 81, 30, 200, 1, 60)]]],
  ["mango-pineapple-smoothie", "Mango Pineapple Smoothie", "smoothie", [["small", "Small Mango Pineapple Smoothie", menuPublished(250, 4, 59, 0, 90, 1, 56)], ["medium", "Medium Mango Pineapple Smoothie", menuPublished(330, 6, 77, 0, 135, 1, 74)], ["large", "Large Mango Pineapple Smoothie", menuPublished(420, 8, 96, 0, 180, 1, 92)], ["extra-large", "Extra Large Mango Pineapple Smoothie", menuPublished(590, 10, 136, 0, 230, 1, 130)]]],
  ["strawberry-banana-smoothie", "Strawberry Banana Smoothie", "smoothie", [["small", "Small Strawberry Banana Smoothie", menuPublished(260, 4, 62, 0, 100, 2, 56)], ["medium", "Medium Strawberry Banana Smoothie", menuPublished(350, 6, 83, 0, 140, 3, 75)], ["large", "Large Strawberry Banana Smoothie", menuPublished(440, 8, 103, 0, 190, 3, 93)], ["extra-large", "Extra Large Strawberry Banana Smoothie", menuPublished(620, 11, 144, 0.5, 240, 5, 131)]]],
  ["tripleberry-smoothie", "Tripleberry Smoothie", "smoothie", [["small", "Small Tripleberry Smoothie", menuPublished(280, 4, 66, 0, 90, 1, 65)], ["medium", "Medium Tripleberry Smoothie", menuPublished(370, 6, 87, 0, 135, 2, 84)], ["large", "Large Tripleberry Smoothie", menuPublished(460, 8, 107, 0, 180, 2, 104)], ["extra-large", "Extra Large Tripleberry Smoothie", menuPublished(660, 10, 153, 0, 220, 3, 149)]]],
  ["orange-julius", "Orange Julius", "frozen beverage", [["medium", "Medium Orange Julius", menuPublished(260, 1, 65, 0, 45, 0, 62)], ["large", "Large Orange Julius", menuPublished(400, 2, 99, 0, 70, 0, 95)]]],
].map(([id, name, category, sizes]) => dqSizedFood(id, name, category, sizes, [`DQ ${name}`, `Dairy Queen ${name}`]));

const dairyQueenFoods = [
  ...dqBurgerFoods,
  ...dqFlatFoods,
  ...dqSideFoods,
  ...dqBlizzardFoods,
  ...dqShakeFoods,
  ...dqTreatSizedFoods,
];

const arbys = { id: "arbys", name: "Arby's" };
const ARBYS_SOURCE = "https://assets.ctfassets.net/o19mhvm9a2cm/3IMsOIRdaTuvoMTrhk6QcK/2b251ee91b6d44b13f95e457519371e4/Arbys_Nutritional_and_Allergen_FEB_2025.pdf";
const ARBYS_REFERENCE = "Arby's official U.S. Nutrition & Allergen Information guide, February 2025 edition; information effective January 2025. Availability varies and breakfast is regional.";
const arbysFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = ARBYS_REFERENCE) => menuFood(
  arbys,
  ARBYS_SOURCE,
  sourceReference,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [`Arbys ${name}`, ...(servingOptions || []).map((option) => `Arbys ${option.serving.description} ${name}`), ...(searchAliases || [])]
);
const arbysOption = (id, description, nutrients, amount = 1, sourceReference = ARBYS_REFERENCE) => expansionMenuOption(
  arbys, ARBYS_SOURCE, sourceReference, id, description, nutrients, amount
);
const arbysSizedFood = (id, name, category, options, aliases) => arbysFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => arbysOption(`${id}:${optionId}`, description, nutrients, amount)),
  aliases,
  `${ARBYS_REFERENCE} Each option is a separately published ${category} portion.`
);

const arbysMainFoods = [
  ["beef-n-cheddar", "Beef 'n Cheddar", "Roast beef with cheddar sauce and red ranch on an onion roll", [["classic", "Classic Beef 'n Cheddar", menuPublished(450, 23, 45, 20, 1280, 2, 9)], ["double", "Double Beef 'n Cheddar", menuPublished(630, 39, 48, 32, 2100, 2, 9)], ["half-pound", "Half Pound Beef 'n Cheddar", menuPublished(740, 49, 48, 39, 2530, 2, 9)]]],
  ["roast-beef", "Roast Beef Sandwich", "Roast beef on a sesame seed bun; sauce not included", [["classic", "Classic Roast Beef", menuPublished(360, 23, 37, 14, 970, 2, 5)], ["double", "Double Roast Beef", menuPublished(510, 38, 38, 24, 1610, 2, 5)], ["half-pound", "Half Pound Roast Beef", menuPublished(610, 48, 38, 30, 2040, 2, 5)]]],
].map(([id, name, description, options]) => arbysFood(
  id,
  name,
  description,
  null,
  options.map(([optionId, optionDescription, nutrients]) => arbysOption(`${id}:${optionId}`, optionDescription, nutrients)),
  [`Arbys ${name}`, `Arby's ${name}`]
));

const arbysFlatFoods = [
  ["classic-french-dip-and-swiss", "Classic French Dip & Swiss", "1 sandwich with Swiss cheese and published au jus included", menuPublished(530, 34, 50, 21, 2540, 2, 3)],
  ["deluxe-burger", "Deluxe Burger", "1 standard burger", menuPublished(600, 31, 45, 33, 1370, 3, 13)],
  ["bbq-bacon-burger", "BBQ Bacon Burger", "1 standard burger", menuPublished(710, 40, 45, 41, 1880, 1, 14)],
  ["big-cheesy-bacon-burger", "Big Cheesy Bacon Burger", "1 standard burger", menuPublished(710, 37, 50, 41, 1820, 0, 14)],
  ["crispy-chicken-sandwich", "Crispy Chicken Sandwich", "1 sandwich", menuPublished(530, 24, 59, 22, 1410, 4, 13)],
  ["buffalo-chicken-sandwich", "Buffalo Chicken Sandwich", "1 sandwich with Buffalo sauce included", menuPublished(530, 24, 59, 22, 2100, 4, 12)],
  ["chicken-bacon-swiss", "Chicken Bacon Swiss Sandwich", "1 sandwich", menuPublished(650, 35, 61, 30, 1760, 4, 14)],
  ["crispy-chicken-club-wrap", "Crispy Chicken Club Wrap", "1 complete wrap", menuPublished(880, 48, 64, 49, 1870, 5, 12)],
  ["buffalo-chicken-wrap", "Buffalo Chicken Wrap", "1 complete wrap with Buffalo sauce included", menuPublished(790, 39, 61, 45, 2490, 5, 7)],
  ["greek-gyro", "Greek Gyro", "1 complete gyro", menuPublished(700, 23, 55, 44, 1370, 4, 6)],
  ["roast-beef-gyro", "Roast Beef Gyro", "1 complete gyro", menuPublished(540, 24, 48, 29, 1300, 3, 5)],
  ["reuben", "Reuben", "1 complete sandwich", menuPublished(680, 37, 62, 31, 2420, 4, 5)],
  ["turkey-ranch-bacon-sandwich", "Turkey, Ranch & Bacon Sandwich", "1 complete sandwich", menuPublished(800, 43, 79, 35, 2430, 5, 16)],
  ["smokehouse-brisket", "Smokehouse Brisket", "1 complete sandwich", menuPublished(590, 35, 47, 29, 1200, 3, 12)],
  ["crispy-fish-sandwich", "Crispy Fish Sandwich", "1 seasonal sandwich", menuPublished(570, 20, 65, 25, 990, 3, 9)],
  ["fish-n-cheddar-sandwich", "Fish 'n Cheddar Sandwich", "1 seasonal sandwich", menuPublished(540, 20, 65, 22, 1030, 3, 7)],
  ["kings-hawaiian-fish-deluxe", "King's Hawaiian Fish Deluxe Sandwich", "1 seasonal sandwich", menuPublished(690, 25, 74, 34, 1000, 2, 19)],
  ["salted-caramel-chocolate-cookie", "Salted Caramel & Chocolate Cookie", "1 cookie", menuPublished(430, 4, 63, 18, 360, 1, 33)],
  ["apple-turnover", "Apple Turnover", "1 turnover", menuPublished(430, 4, 65, 18, 210, 2, 39)],
  ["cherry-turnover", "Cherry Turnover", "1 turnover", menuPublished(390, 4, 65, 13, 200, 2, 40)],
  ["roast-beef-slider", "Roast Beef Slider", "1 slider", menuPublished(180, 11, 18, 7, 520, 1, 4)],
  ["chicken-slider", "Chicken Slider", "1 slider", menuPublished(230, 11, 25, 9, 620, 1, 2)],
  ["buffalo-chicken-slider", "Buffalo Chicken Slider", "1 slider with Buffalo sauce included", menuPublished(260, 10, 26, 12, 910, 1, 3)],
  ["jalapeno-roast-beef-slider", "Jalapeño Roast Beef Slider", "1 slider", menuPublished(180, 10, 16, 7, 490, 1, 2), undefined, ["Arbys jalapeno roast beef slider", "Arby's jalapeño slider"]],
  ["value-ranch-chicken-wrap", "Value Ranch Chicken Wrap", "1 value-menu wrap", menuPublished(400, 16, 32, 23, 1000, 1, 1)],
  ["value-bbq-chicken-wrap", "Value BBQ Chicken Wrap", "1 value-menu wrap", menuPublished(350, 16, 36, 16, 980, 1, 5)],
  ["value-honey-mustard-chicken-wrap", "Value Honey Mustard Chicken Wrap", "1 value-menu wrap", menuPublished(390, 16, 33, 22, 930, 1, 3)],
  ["kids-applesauce", "Kids' Tree Top Applesauce", "1 pouch", menuPublished(45, 0, 13, 0, 0, 2, 11)],
  ["kids-apple-juice", "Kids' Honest Kids Apple Juice Drink", "1 pouch", menuPublished(45, 1, 12, 0, 0, 3, 8)],
  ["kids-lowfat-white-milk", "Kids' Lowfat White Milk", "1 carton", menuPublished(90, 7, 10, 2, 105, 0, 10)],
  ["kids-lowfat-chocolate-milk", "Kids' Lowfat Chocolate Milk", "1 carton", menuPublished(150, 7, 26, 2.5, 170, 1, 23)],
].map(([id, name, description, nutrients, options, aliases]) => arbysFood(id, name, description, nutrients, options, aliases));

const arbysPortionFoods = [
  ["premium-nuggets", "Premium Nuggets", "Plain nuggets; dipping sauce excluded", [["4-piece", "4-piece nuggets", menuPublished(210, 17, 12, 10, 600, 1, 1), 4], ["6-piece", "6-piece nuggets", menuPublished(310, 25, 18, 15, 910, 1, 1), 6], ["9-piece", "9-piece nuggets", menuPublished(470, 38, 28, 23, 1360, 2, 2), 9]]],
  ["chicken-tenders", "Chicken Tenders", "Plain tenders; dipping sauce excluded", [["3-piece", "3-piece chicken tenders", menuPublished(370, 23, 28, 18, 1190, 2, 0), 3], ["5-piece", "5-piece chicken tenders", menuPublished(610, 39, 47, 30, 1990, 3, 0), 5]]],
  ["curly-fries", "Curly Fries", "Seasoned curly fries", [["small", "Small Curly Fries", menuPublished(250, 3, 29, 13, 570, 3, 0)], ["medium", "Medium Curly Fries", menuPublished(410, 5, 49, 22, 940, 5, 0)], ["large", "Large Curly Fries", menuPublished(550, 6, 65, 29, 1250, 6, 0)]]],
  ["crinkle-fries", "Crinkle Fries", "Crinkle-cut fries", [["small", "Small Crinkle Fries", menuPublished(250, 3, 32, 12, 300, 0, 0)], ["medium", "Medium Crinkle Fries", menuPublished(390, 5, 49, 19, 460, 0, 0)], ["large", "Large Crinkle Fries", menuPublished(530, 7, 68, 26, 630, 0, 0)]]],
  ["mozzarella-sticks", "Mozzarella Sticks", "Fried mozzarella sticks; marinara excluded", [["4-piece", "4-piece mozzarella sticks", menuPublished(440, 19, 37, 23, 1410, 2, 3), 4], ["6-piece", "6-piece mozzarella sticks", menuPublished(650, 29, 56, 35, 2110, 3, 4), 6]]],
  ["jalapeno-bites", "Jalapeño Bites", "Fried jalapeño bites; Bronco Berry Sauce excluded", [["5-piece", "5-piece Jalapeño Bites", menuPublished(290, 5, 31, 17, 660, 2, 3), 5], ["8-piece", "8-piece Jalapeño Bites", menuPublished(470, 8, 50, 27, 1060, 3, 4), 8]], ["Arbys jalapeno bites", "Arby's jalapeño poppers"]],
  ["potato-cakes", "Potato Cakes", "Regional breakfast/side item", [["2-piece", "2 potato cakes", menuPublished(250, 2, 23, 14, 430, 2, 0), 2], ["3-piece", "3 potato cakes", menuPublished(370, 3, 35, 21, 650, 4, 0), 3], ["4-piece", "4 potato cakes", menuPublished(490, 4, 46, 28, 860, 5, 0), 4]]],
].map(([id, name, description, options, aliases]) => arbysFood(
  id,
  name,
  description,
  null,
  options.map(([optionId, optionDescription, nutrients, amount = 1]) => arbysOption(`${id}:${optionId}`, optionDescription, nutrients, amount)),
  aliases
));

const arbysShakeFoods = [
  ["jamocha-shake", "Jamocha Shake", [["regular", "Regular Jamocha Shake", menuPublished(530, 12, 85, 16, 320, 0, 71)], ["large", "Large Jamocha Shake", menuPublished(690, 15, 112, 20, 420, 0, 94)]]],
  ["chocolate-shake", "Chocolate Shake", [["regular", "Regular Chocolate Shake", menuPublished(520, 12, 83, 17, 320, 1, 72)], ["large", "Large Chocolate Shake", menuPublished(680, 16, 110, 21, 420, 1, 96)]]],
  ["vanilla-shake", "Vanilla Shake", [["regular", "Regular Vanilla Shake", menuPublished(480, 12, 70, 17, 300, 0, 64)], ["large", "Large Vanilla Shake", menuPublished(620, 16, 93, 21, 400, 0, 85)]]],
  ["mint-chocolate-shake", "Mint Chocolate Shake", [["regular", "Regular seasonal Mint Chocolate Shake", menuPublished(610, 12, 95, 21, 290, 1, 85)], ["large", "Large seasonal Mint Chocolate Shake", menuPublished(770, 16, 123, 25, 380, 1, 111)]]],
].map(([id, name, options]) => arbysSizedFood(id, name, "shake", options, [`Arbys ${name}`, `Arby's ${name}`]));

const arbysBreakfastFoods = [
  ["sausage-biscuit", "Sausage Biscuit", 500, 12, 36, 33, 1450, 1, 3],
  ["bacon-biscuit", "Bacon Biscuit", 340, 10, 36, 17, 1180, 1, 3],
  ["ham-biscuit", "Ham Biscuit", 340, 13, 37, 16, 1420, 1, 4],
  ["chicken-biscuit", "Chicken Biscuit", 390, 13, 44, 18, 1330, 2, 2],
  ["bacon-egg-cheese-sourdough", "Bacon, Egg & Cheese Sourdough", 470, 23, 46, 22, 1260, 2, 5],
  ["bacon-egg-cheese-croissant", "Bacon, Egg & Cheese Croissant", 430, 18, 29, 26, 1010, 1, 4],
  ["bacon-egg-cheese-biscuit", "Bacon, Egg & Cheese Biscuit", 470, 18, 37, 28, 1720, 1, 4],
  ["bacon-egg-cheese-wrap", "Bacon, Egg & Cheese Wrap", 410, 18, 29, 24, 1330, 1, 2],
  ["sausage-egg-cheese-sourdough", "Sausage, Egg & Cheese Sourdough", 630, 24, 47, 38, 1450, 2, 5],
  ["sausage-egg-cheese-croissant", "Sausage, Egg & Cheese Croissant", 580, 19, 30, 43, 1200, 1, 4],
  ["sausage-egg-cheese-biscuit", "Sausage, Egg & Cheese Biscuit", 630, 19, 39, 44, 1910, 1, 4],
  ["sausage-egg-cheese-wrap", "Sausage, Egg & Cheese Wrap", 550, 17, 30, 39, 1420, 1, 3],
  ["ham-egg-cheese-sourdough", "Ham, Egg & Cheese Sourdough", 460, 26, 47, 18, 1290, 2, 4],
  ["ham-egg-cheese-croissant", "Ham, Egg & Cheese Croissant", 410, 21, 30, 23, 1040, 1, 3],
  ["ham-egg-cheese-biscuit", "Ham, Egg & Cheese Biscuit", 460, 21, 38, 24, 1750, 1, 3],
  ["ham-egg-cheese-wrap", "Ham, Egg & Cheese Wrap", 400, 20, 31, 21, 1390, 1, 2],
  ["ham-swiss-croissant", "Ham & Swiss Croissant", 340, 17, 29, 17, 910, 1, 2],
  ["bacon-cheese-croissant", "Bacon & Cheese Croissant", 330, 14, 27, 19, 740, 1, 2],
  ["sausage-cheese-croissant", "Sausage & Cheese Croissant", 490, 15, 28, 35, 940, 1, 3],
  ["french-toast-sticks", "French Toast Sticks", 590, 8, 82, 25, 540, 3, 36],
  ["sausage-gravy-biscuit", "Sausage Gravy Biscuit", 480, 9, 48, 28, 1770, 1, 3],
  ["double-sausage-gravy-biscuit", "Double Sausage Gravy Biscuit", 960, 18, 95, 56, 3490, 3, 6],
  ["coffee-12oz", "Coffee", 0, 0, 0, 0, 5, 0, 0],
  ["simply-orange-juice", "Simply Orange Juice", 140, 2, 33, 0, 0, 1, 26],
].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => arbysFood(
  id,
  name,
  id === "coffee-12oz" ? "12 fl oz black coffee" : `1 regional breakfast-menu ${name.toLowerCase()}`,
  menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar),
  undefined,
  [`Arbys ${name}`, `Arby's ${name}`],
  `${ARBYS_REFERENCE} This item is listed in the guide's regional breakfast section.`
));

const arbysSauceFoods = [
  ["arbys-sauce", "Arby's Sauce", "1 packet (14 g)", 15, 0, 3, 0, 180, 0, 2],
  ["horsey-sauce", "Horsey Sauce", "1 packet (14 g)", 60, 0, 3, 5, 150, 0, 2],
  ["tangy-barbeque-dipping-sauce", "Tangy Barbeque Dipping Sauce", "1 cup (28 g)", 45, 0, 10, 0, 360, 0, 8],
  ["buffalo-dipping-sauce", "Buffalo Dipping Sauce", "1 cup (28 g)", 10, 0, 2, 1, 720, 0, 0],
  ["honey-mustard-dipping-sauce", "Honey Mustard Dipping Sauce", "1 cup (28 g)", 130, 0, 5, 13, 160, 0, 4],
  ["ranch-dipping-sauce", "Ranch Dipping Sauce", "1 cup (28 g)", 100, 1, 1, 10, 135, 0, 1],
  ["ketchup", "Ketchup", "1 packet (9 g)", 10, 0, 3, 0, 85, 0, 2],
  ["cheddar-cheese-sauce", "Cheddar Cheese Sauce", "1 cup (43 g)", 50, 1, 4, 3.5, 370, 0, 0],
  ["marinara-sauce", "Marinara Sauce", "1 cup (28 g)", 20, 1, 4, 0, 170, 1, 3],
  ["bronco-berry-sauce", "Bronco Berry Sauce", "1 cup (28 g)", 60, 0, 15, 0, 25, 0, 15],
  ["red-ranch-sauce", "Red Ranch Sauce", "0.5 oz portion", 70, 0, 5, 6, 105, 0, 4],
].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => arbysFood(
  id, name, description, menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar), undefined, [`Arbys ${name}`, `Arby's ${name}`]
));

const arbysDrinkRows = [
  ["barqs-root-beer", "Barq's Root Beer", [170, 0, 44, 0, 75, 0, 44], [240, 0, 62, 0, 105, 0, 62]],
  ["coca-cola", "Coca-Cola", [180, 0, 44, 0, 45, 0, 44], [250, 0, 62, 0, 60, 0, 62]],
  ["coca-cola-zero-sugar", "Coca-Cola Zero Sugar", [0, 0, 0, 0, 45, 0, 0], [0, 0, 0, 0, 60, 0, 0]],
  ["diet-coke", "Diet Coke", [0, 0, 0, 0, 50, 0, 0], [0, 0, 0, 0, 75, 0, 0]],
  ["fanta-orange", "Fanta Orange", [170, 0, 43, 0, 45, 0, 43], [240, 0, 61, 0, 60, 0, 61]],
  ["hi-c-fruit-punch", "Hi-C Flashin' Fruit Punch", [180, 0, 46, 0, 80, 0, 45], [250, 0, 65, 0, 110, 0, 63]],
  ["mello-yello", "Mello Yello", [180, 0, 47, 0, 55, 0, 47], [250, 0, 67, 0, 75, 0, 67]],
  ["minute-maid-zero-sugar-lemonade", "Minute Maid Zero Sugar Lemonade", [5, 0, 2, 0, 45, 0, 0], [10, 0, 3, 0, 65, 0, 0]],
  ["powerade-mountain-berry-blast", "POWERADE Mountain Berry Blast", [90, 0, 24, 0, 120, 0, 24], [130, 0, 34, 0, 170, 0, 34]],
  ["sprite", "Sprite", [160, 0, 41, 0, 75, 0, 41], [220, 0, 57, 0, 110, 0, 57]],
  ["dr-pepper", "Dr Pepper", [160, 0, 42, 0, 50, 0, 42], [220, 0, 60, 0, 65, 0, 59]],
  ["diet-dr-pepper", "Diet Dr Pepper", [0, 0, 0, 0, 80, 0, 0], [0, 0, 0, 0, 110, 0, 0]],
].map(([id, name, withIce, noIce]) => arbysFood(
  id,
  name,
  "Medium fountain serving; ice fill changes the published quantity",
  null,
  [
    arbysOption(`${id}:medium-with-ice`, "Medium fountain serving with 50% ice fill", menuPublished(...withIce)),
    arbysOption(`${id}:medium-no-ice`, "Medium fountain serving with no ice", menuPublished(...noIce)),
  ],
  [
    `Arbys ${name}`,
    `Arby's ${name}`,
    ...(id === "coca-cola-zero-sugar" ? ["Arbys Coke Zero", "Arby's Coke Zero"] : []),
  ],
  `${ARBYS_REFERENCE} The guide publishes medium fountain values with 50% ice and with no ice; small and large are only described by approximate multipliers and are not represented as exact options.`
));
const arbysOtherDrinks = [
  ["classic-lemonade", "Classic Lemonade", "Regular serving with 50% ice", menuPublished(150, 0, 38, 0, 10, 0, 35)],
  ["strawberry-lemonade", "Strawberry Lemonade", "Regular serving with 50% ice", menuPublished(110, 0, 29, 0, 10, 0, 27)],
  ["brewed-iced-tea", "Brewed Iced Tea", "Medium cup (358 g); sodium varies with local water", menuPublished(5, 0, 1, 0, null, 0, 0)],
  ["bottled-water", "Nestlé Pure Life Bottled Water", "479 g bottle; sodium varies with local water", menuPublished(0, 0, 0, 0, null, 0, 0)],
].map(([id, name, description, nutrients]) => arbysFood(id, name, description, nutrients, undefined, [`Arbys ${name}`, `Arby's ${name}`]));

const arbysFoods = [
  ...arbysMainFoods,
  ...arbysFlatFoods,
  ...arbysPortionFoods,
  ...arbysShakeFoods,
  ...arbysBreakfastFoods,
  ...arbysSauceFoods,
  ...arbysDrinkRows,
  ...arbysOtherDrinks,
];

const jackInTheBox = { id: "jack-in-the-box", name: "Jack in the Box" };
const JACK_IN_THE_BOX_SOURCE = "https://assets.ctfassets.net/5hs630wuugof/5YPXJN6p8U0Esf31agJxUK/26a003f0ab50ca9eb38d0e6a3f7f2bf5/Nutrition_Facts_2025.PDF";
const JACK_IN_THE_BOX_REFERENCE = "Jack in the Box official 2025 Nutrition Facts sheet; nutrient information effective November 2024. Regional availability and bun sesame formulation vary.";
const jackFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = JACK_IN_THE_BOX_REFERENCE) => menuFood(
  jackInTheBox,
  JACK_IN_THE_BOX_SOURCE,
  sourceReference,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [
    `Jackinthebox ${name}`,
    ...(servingOptions || []).map((option) => `Jackinthebox ${option.serving.description} ${name}`),
    ...(searchAliases || []),
  ]
);
const jackOption = (id, description, nutrients, amount = 1, sourceReference = JACK_IN_THE_BOX_REFERENCE) => expansionMenuOption(
  jackInTheBox, JACK_IN_THE_BOX_SOURCE, sourceReference, id, description, nutrients, amount
);
const jackSizedFood = (id, name, category, options, aliases) => jackFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => jackOption(`${id}:${optionId}`, description, nutrients, amount)),
  aliases,
  `${JACK_IN_THE_BOX_REFERENCE} Each option is a separately published ${category} portion.`
);

const jackBurgerFoods = [
  ["bacon-double-smashed-jack", "Bacon Double Smashed Jack", 1120, 45, 49, 83, 2070, 2, 9],
  ["bacon-swiss-buttery-jack", "Bacon & Swiss Buttery Jack", 800, 34, 48, 53, 1210, 3, 11],
  ["bacon-ultimate-cheeseburger", "Bacon Ultimate Cheeseburger", 930, 55, 32, 65, 1960, 1, 6],
  ["cheeseburger", "Cheeseburger", 370, 16, 30, 21, 880, 1, 4],
  ["classic-smashed-jack", "Classic Smashed Jack", 720, 26, 46, 48, 1380, 2, 7],
  ["classic-buttery-jack", "Classic Buttery Jack", 780, 31, 51, 51, 1030, 4, 13],
  ["double-jack", "Double Jack", 830, 46, 33, 58, 1430, 2, 7],
  ["hamburger", "Hamburger", 330, 13, 30, 18, 680, 1, 4],
  ["jr-bacon-cheeseburger", "Jr. Bacon Cheeseburger", 470, 18, 30, 31, 1000, 1, 5],
  ["jr-jumbo-jack", "Jr. Jumbo Jack", 400, 14, 31, 25, 700, 1, 5],
  ["jr-jumbo-jack-cheeseburger", "Jr. Jumbo Jack Cheeseburger", 440, 16, 31, 29, 900, 1, 5],
  ["jumbo-jack", "Jumbo Jack", 520, 23, 32, 33, 700, 2, 6],
  ["jumbo-jack-cheeseburger", "Jumbo Jack Cheeseburger", 600, 28, 33, 40, 1110, 2, 6],
  ["sourdough-jack", "Sourdough Jack", 690, 33, 39, 44, 1300, 3, 7],
  ["ultimate-cheeseburger", "Ultimate Cheeseburger", 840, 47, 31, 59, 1550, 1, 5],
].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => jackFood(
  id,
  name,
  "1 standard burger; fries and drink excluded",
  menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar),
  undefined,
  [`Jack in the Box ${name}`, `Jackinthebox ${name}`]
));

const jackChickenFoods = [
  ["chicken-sandwich", "Chicken Sandwich", "1 sandwich", 560, 15, 40, 38, 940, 2, 4],
  ["chicken-sandwich-with-bacon", "Chicken Sandwich with Bacon", "1 sandwich", 610, 19, 40, 42, 1150, 2, 4],
  ["fish-sandwich", "Fish Sandwich", "1 seasonal sandwich", 450, 16, 47, 23, 1000, 2, 6],
  ["homestyle-ranch-chicken-club", "Homestyle Ranch Chicken Club", "1 sandwich", 790, 35, 69, 42, 1930, 5, 6],
  ["jacks-spicy-chicken-sandwich", "Jack's Spicy Chicken Sandwich", "1 sandwich", 690, 27, 51, 42, 1360, 3, 4],
  ["jacks-spicy-chicken-sandwich-with-cheese", "Jack's Spicy Chicken Sandwich with Cheese", "1 sandwich", 720, 29, 51, 45, 1510, 3, 5],
  ["sourdough-grilled-chicken-club", "Sourdough Grilled Chicken Club", "1 sandwich", 500, 33, 40, 23, 1440, 3, 7],
  ["cluck-chicken-sandwich", "The Cluck Chicken Sandwich", "1 sandwich", 710, 28, 68, 37, 1610, 4, 5],
].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => jackFood(
  id, name, description, menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar), undefined, [`Jack in the Box ${name}`]
));
const jackChickenPortions = [
  ["chicken-nuggets", "Chicken Nuggets", "Plain nuggets; dipping sauce excluded", [["4-piece", "4 chicken nuggets", menuPublished(190, 8, 10, 13, 480, 1, 0), 4], ["8-piece", "8 chicken nuggets", menuPublished(380, 15, 20, 27, 970, 2, 0), 8]]],
  ["crispy-chicken-strips", "Crispy Chicken Strips", "Plain strips; dipping sauce excluded", [["2-piece", "2 crispy chicken strips", menuPublished(310, 22, 21, 15, 1170, 2, 1), 2], ["3-piece", "3 crispy chicken strips", menuPublished(470, 33, 32, 23, 1760, 3, 2), 3], ["5-piece", "5 crispy chicken strips", menuPublished(780, 54, 53, 38, 2940, 5, 3), 5]]],
].map(([id, name, description, options]) => jackFood(
  id,
  name,
  description,
  null,
  options.map(([optionId, optionDescription, nutrients, amount]) => jackOption(`${id}:${optionId}`, optionDescription, nutrients, amount)),
  [`Jack in the Box ${name}`]
));

const jackSaladFoods = [
  ["garden-salad-crispy-chicken", "Garden Salad with Crispy Chicken Strips", 410, 28, 28, 21, 1330, 4, 3],
  ["garden-salad-grilled-chicken", "Garden Salad with Grilled Chicken", 200, 25, 9, 7, 810, 3, 2],
  ["side-salad", "Side Salad", 50, 3, 3, 3.5, 90, 1, 1],
  ["southwest-salad-crispy-chicken", "Southwest Salad with Crispy Chicken Strips", 500, 32, 44, 22, 1340, 9, 6],
  ["southwest-salad-grilled-chicken", "Southwest Salad with Grilled Chicken", 280, 30, 25, 8, 810, 7, 5],
].map(([id, name, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => jackFood(
  id,
  name,
  "1 salad; dressing and crunchy toppings excluded",
  menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
));

const jackSideFoods = [
  ["egg-rolls", "Egg Rolls", "Egg rolls; dipping sauce excluded", [["1-piece", "1 egg roll", menuPublished(210, 7, 20, 12, 490, 2, 3), 1], ["3-piece", "3 egg rolls", menuPublished(570, 21, 60, 30, 1470, 6, 9), 3]]],
  ["french-fries", "French Fries", "Straight-cut fries", [["kids", "Kids' French Fries", menuPublished(220, 2, 30, 10, 410, 2, 0)], ["small", "Small French Fries", menuPublished(300, 3, 40, 14, 540, 3, 0)], ["medium", "Medium French Fries", menuPublished(430, 5, 58, 20, 780, 4, 0)], ["large", "Large French Fries", menuPublished(550, 6, 75, 25, 1010, 5, 1)]]],
  ["seasoned-curly-fries", "Seasoned Curly Fries", "Seasoned curly fries", [["kids", "Kids' Seasoned Curly Fries", menuPublished(200, 2, 21, 11, 440, 2, 0)], ["small", "Small Seasoned Curly Fries", menuPublished(280, 3, 30, 16, 610, 3, 0)], ["medium", "Medium Seasoned Curly Fries", menuPublished(430, 5, 46, 25, 940, 4, 0)], ["large", "Large Seasoned Curly Fries", menuPublished(480, 6, 52, 28, 1060, 4, 0)]]],
  ["stuffed-jalapenos", "Stuffed Jalapeños", "Cheese-filled jalapeños; dipping sauce excluded", [["3-piece", "3 stuffed jalapeños", menuPublished(220, 6, 21, 12, 730, 1, 2), 3], ["7-piece", "7 stuffed jalapeños", menuPublished(510, 14, 49, 29, 1690, 3, 5), 7]], ["Jack in the Box stuffed jalapenos"]],
].map(([id, name, description, options, aliases]) => jackFood(
  id,
  name,
  description,
  null,
  options.map(([optionId, optionDescription, nutrients, amount = 1]) => jackOption(`${id}:${optionId}`, optionDescription, nutrients, amount)),
  aliases
));
const jackFlatSides = [
  ["panko-onion-rings", "Panko Onion Rings", "1 order", 440, 6, 52, 24, 620, 3, 5],
  ["tiny-tacos", "Tiny Tacos", "13-piece order; sauce excluded", 460, 14, 53, 21, 670, 5, 2],
  ["sauced-loaded-tiny-tacos", "Sauced & Loaded Tiny Tacos", "1 complete published order", 600, 19, 59, 33, 1230, 6, 4],
  ["grilled-cheese-sandwich", "Grilled Cheese Sandwich", "1 sandwich", 330, 11, 34, 16, 800, 2, 3],
].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => jackFood(
  id, name, description, menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar)
));
const jackTacos = jackFood(
  "regular-tacos",
  "Regular Tacos",
  "Standard tacos with filling, cheese, lettuce, and taco sauce",
  null,
  [
    jackOption("regular-tacos:1-piece", "1 regular taco", menuPublished(170, 6, 16, 9, 360, 2, 1), 1),
    jackOption("regular-tacos:2-piece", "2 regular tacos", menuPublished(350, 12, 33, 19, 770, 5, 2), 2),
  ],
  ["Jack in the Box taco", "Jack in the Box two tacos"]
);

const jackBreakfastFoods = [
  ["bacon-breakfast-jack", "Bacon Breakfast Jack", "1 breakfast sandwich", menuPublished(380, 17, 30, 21, 850, 1, 4)],
  ["breakfast-jack", "Breakfast Jack", "1 breakfast sandwich", menuPublished(410, 16, 26, 25, 1180, 2, 3)],
  ["hash-brown", "Hash Brown", "1 hash brown patty", menuPublished(190, 2, 17, 13, 350, 2, 0)],
  ["loaded-breakfast-sandwich", "Loaded Breakfast Sandwich", "1 breakfast sandwich", menuPublished(690, 35, 36, 46, 1620, 2, 4)],
  ["ultimate-breakfast-sandwich", "Ultimate Breakfast Sandwich", "1 breakfast sandwich", menuPublished(510, 29, 30, 30, 1470, 1, 4)],
].map(([id, name, description, nutrients]) => jackFood(id, name, description, nutrients, undefined, [`Jack in the Box ${name}`]));
const jackFrenchToastFoods = [
  ["classic-french-toast-sticks", "Classic French Toast Sticks", [["3-piece", "3 French toast sticks; syrup excluded", menuPublished(230, 4, 26, 12, 240, 1, 6), 3], ["6-piece", "6 French toast sticks; syrup excluded", menuPublished(460, 9, 52, 24, 490, 3, 12), 6]]],
  ["classic-french-toast-platter", "Classic French Toast Sticks Platter", [["bacon", "Platter with bacon", menuPublished(620, 23, 44, 39, 1260, 3, 7)], ["sausage", "Platter with sausage", menuPublished(700, 21, 44, 48, 1110, 3, 7)], ["bacon-sausage", "Platter with bacon and sausage", menuPublished(780, 29, 45, 54, 1530, 3, 7)]]],
].map(([id, name, options]) => jackSizedFood(id, name, "breakfast", options, [`Jack in the Box ${name}`]));

const jackDessertFoods = [
  ["chocolate-overload-cake", "Chocolate Overload Cake", "1 slice", menuPublished(300, 4, 57, 7, 350, 2, 34)],
  ["mini-churros", "Mini Churros", "5-piece order", menuPublished(350, 4, 42, 18, 280, 2, 12)],
  ["new-york-style-cheesecake", "New York Style Cheesecake", "1 slice", menuPublished(310, 7, 32, 17, 260, 1, 22)],
].map(([id, name, description, nutrients]) => jackFood(id, name, description, nutrients));
const jackShakeFoods = [
  ["chocolate-shake", "Chocolate Shake with Whipped Topping", [["16oz", "16 fl oz Chocolate Shake with whipped topping", menuPublished(680, 13, 107, 23, 390, 0, 88)], ["24oz", "24 fl oz Chocolate Shake with whipped topping", menuPublished(970, 19, 155, 32, 570, 0, 128)]]],
  ["oreo-cookie-shake", "OREO Cookie Shake with Whipped Topping", [["16oz", "16 fl oz OREO Cookie Shake with whipped topping", menuPublished(690, 13, 100, 28, 470, 1, 78)], ["24oz", "24 fl oz OREO Cookie Shake with whipped topping", menuPublished(990, 19, 145, 39, 680, 1, 113)]]],
  ["strawberry-shake", "Strawberry Shake with Whipped Topping", [["16oz", "16 fl oz Strawberry Shake with whipped topping", menuPublished(650, 12, 100, 23, 340, 0, 85)], ["24oz", "24 fl oz Strawberry Shake with whipped topping", menuPublished(930, 17, 145, 32, 490, 0, 123)]]],
  ["vanilla-shake", "Vanilla Shake with Whipped Topping", [["16oz", "16 fl oz Vanilla Shake with whipped topping", menuPublished(580, 12, 83, 23, 340, 0, 68)], ["24oz", "24 fl oz Vanilla Shake with whipped topping", menuPublished(830, 17, 149, 32, 490, 0, 98)]]],
].map(([id, name, options]) => jackSizedFood(id, name, "shake", options, [`Jack in the Box ${name}`]));
const jackBobaShake = jackFood(
  "vanilla-boba-shake",
  "Vanilla Shake with Boba & Whipped Topping",
  "16 fl oz published serving",
  menuPublished(710, 13, 117, 22, 350, 0, 88)
);

const jackSauceFoods = [
  ["buttermilk-ranch-dressing", "Buttermilk Ranch Dressing", "1 packet (50 g)", 250, 1, 4, 26, 380, 0, 1],
  ["balsamic-vinaigrette-dressing", "Hidden Valley Balsamic Vinaigrette Dressing", "1 packet (43 g)", 150, 0, 4, 15, 250, 0, 4],
  ["creamy-southwest-dressing", "Creamy Southwest Dressing", "1 packet (50 g)", 190, 1, 3, 19, 740, 0, 1],
  ["bbq-sauce-dip-cup", "BBQ Sauce Dip Cup", "1 dip cup (21 g)", 40, 0, 9, 0, 140, 0, 8],
  ["buttermilk-house-dipping-sauce", "Buttermilk House Dipping Sauce", "1 dip cup (21 g)", 110, 0, 2, 11, 160, 0, 0],
  ["creamy-avocado-lime-dipping-sauce", "Creamy Avocado Lime Dipping Sauce", "1 dip cup (21 g)", 110, 0, 1, 12, 280, 0, 0],
  ["jacks-good-good-dipping-cup", "Jack's Good Good Dipping Cup", "1 dip cup (21 g)", 110, 0, 3, 11, 190, 0, 2, ["Jack in the Box Good Good Sauce", "Jackinthebox Good Good Sauce"]],
  ["honey-garlic-sriracha-dip-cup", "Honey Garlic Sriracha Dip Cup", "1 dip cup (21 g)", 35, 0, 7, 0, 180, 0, 6],
  ["honey-mustard-dip-cup", "Honey Mustard Dip Cup", "1 dip cup (21 g)", 45, 0, 8, 1.5, 180, 0, 7],
  ["pancake-syrup", "Pancake Syrup", "1 cup (28 g)", 80, 0, 21, 0, 15, 0, 14],
  ["sweet-n-sour-sauce", "Sweet 'N Sour Sauce", "1 cup (21 g)", 35, 0, 8, 0, 120, 0, 7],
  ["teriyaki-dipping-sauce", "Teriyaki Dipping Sauce", "1 cup (28 g)", 50, 1, 11, 1, 490, 0, 9],
  ["creamy-bacon-mayo", "Creamy Bacon Mayo", "0.68 oz portion", 120, 1, 1, 13, 190, 0, 0],
  ["creamy-ranch-sauce", "Creamy Ranch Sauce", "0.61 oz portion", 90, 0, 1, 10, 180, 0, 1],
  ["garlic-herb-butter", "Garlic Herb Butter", "0.50 oz portion", 90, 0, 1, 10, 70, 0, 0],
  ["ketchup-portion", "Ketchup", "0.57 oz portion", 20, 0, 5, 0, 160, 0, 3],
  ["mayonnaise", "Mayonnaise", "0.25 oz portion", 80, 0, 0, 8, 55, 0, 0],
  ["mustard", "Mustard", "0.19 oz portion", 5, 0, 0, 0, 65, 0, 0],
  ["tartar-sauce", "Tartar Sauce", "0.78 oz seasonal portion", 80, 0, 4, 7, 200, 0, 3],
  ["fire-roasted-salsa", "Fire Roasted Salsa", "1 fl oz cup", 10, 0, 2, 0, 120, 0, 1],
].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, aliases]) => jackFood(
  id, name, description, menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar), undefined, [`Jack in the Box ${name}`, ...(aliases || [])]
));

const jackDrinkFoods = [
  ["gold-peak-unsweet-iced-tea", "Gold Peak Fresh Brewed Iced Tea", [["16oz", "16 fl oz", menuPublished(5, 0, 1, 0, 15, 0, 0)], ["24oz", "24 fl oz", menuPublished(5, 0, 2, 0, 20, 0, 0)], ["32oz", "32 fl oz", menuPublished(10, 0, 3, 0, 25, 0, 0)], ["42oz", "42 fl oz", menuPublished(10, 0, 4, 0, 35, 0, 0)]]],
  ["high-mountain-arabica-coffee", "High Mountain Arabica Coffee", [["regular", "Regular black coffee", menuPublished(5, 0, 0, 0, 5, 0, 0)], ["large", "Large black coffee", menuPublished(5, 1, 0, 0, 10, 0, 0)]]],
  ["iced-black-coffee", "Iced Black Coffee", [["regular", "Regular iced black coffee", menuPublished(0, 0, 0, 0, 0, 0, 0)], ["large", "Large iced black coffee", menuPublished(5, 0, 0, 0, 10, 0, 0)]]],
  ["caramel-sweet-cream-iced-coffee", "Caramel Sweet Cream Iced Coffee", [["regular", "Regular Caramel Sweet Cream Iced Coffee", menuPublished(200, 4, 35, 5, 100, 0, 30)], ["large", "Large Caramel Sweet Cream Iced Coffee", menuPublished(300, 6, 52, 7, 150, 0, 46)]]],
  ["mocha-sweet-cream-iced-coffee", "Mocha Sweet Cream Iced Coffee", [["regular", "Regular Mocha Sweet Cream Iced Coffee", menuPublished(160, 3, 32, 3, 105, 0, 26)], ["large", "Large Mocha Sweet Cream Iced Coffee", menuPublished(280, 5, 54, 5, 180, 0, 44)]]],
  ["vanilla-sweet-cream-iced-coffee", "Vanilla Sweet Cream Iced Coffee", [["regular", "Regular Vanilla Sweet Cream Iced Coffee", menuPublished(150, 4, 23, 5, 100, 0, 19)], ["large", "Large Vanilla Sweet Cream Iced Coffee", menuPublished(220, 6, 34, 7, 150, 0, 28)]]],
].map(([id, name, options]) => jackSizedFood(id, name, "drink", options, [`Jack in the Box ${name}`]));
const jackFlatDrinks = [
  ["berry-purple-daze-red-bull", "Berry Purple Daze Red Bull Infusion", "1 published infusion with regular Red Bull", 160, 0, 41, 0, 110, 0, 38],
  ["berry-purple-daze-red-bull-sugarfree", "Berry Purple Daze Red Bull Sugarfree Infusion", "1 published infusion with sugarfree Red Bull", 60, 0, 15, 0, 110, 0, 12],
  ["strawberry-red-daze-red-bull", "Strawberry Red Daze Red Bull Infusion", "1 published infusion with regular Red Bull", 160, 0, 41, 0, 110, 0, 39],
  ["strawberry-red-daze-red-bull-sugarfree", "Strawberry Red Daze Red Bull Sugarfree Infusion", "1 published infusion with sugarfree Red Bull", 60, 0, 15, 0, 115, 0, 12],
  ["red-bull-energy-can", "Red Bull Energy Can", "1 can", 110, 0, 29, 0, 105, 0, 26],
  ["red-bull-sugarfree-can", "Red Bull Sugarfree Can", "1 can", 10, 0, 3, 0, 105, 0, 0],
  ["sweet-cream-iced-coffee-boba", "Sweet Cream Iced Coffee with Boba", "Regular published serving", 280, 4, 57, 5, 105, 0, 38],
  ["milk-tea-boba", "Milk Tea with Boba", "Regular published serving", 280, 3, 58, 5, 150, 0, 38],
  ["minute-maid-apple-juice", "Minute Maid Apple Juice", "1 bottle", 80, 0, 21, 0, 15, 0, 19],
  ["simply-orange-juice", "Simply Orange Juice", "1 bottle", 160, 2, 37, 0, 0, 0, 33],
  ["dasani-water", "Dasani Water Bottle", "500 g bottle", 0, 0, 0, 0, 0, 0, 0],
  ["milk", "Milk", "1 carton", 110, 9, 12, 2, 130, 0, 12],
].map(([id, name, description, calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => jackFood(
  id, name, description, menuPublished(calories, protein, carbohydrates, fat, sodium, fiber, totalSugar), undefined, [`Jack in the Box ${name}`]
));

const jackInTheBoxFoods = [
  ...jackBurgerFoods,
  ...jackChickenFoods,
  ...jackChickenPortions,
  ...jackSaladFoods,
  ...jackSideFoods,
  ...jackFlatSides,
  jackTacos,
  ...jackBreakfastFoods,
  ...jackFrenchToastFoods,
  ...jackDessertFoods,
  ...jackShakeFoods,
  jackBobaShake,
  ...jackSauceFoods,
  ...jackDrinkFoods,
  ...jackFlatDrinks,
];

const scalePublished = (nutrients, factor) => Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [
  key,
  value === null ? null : value * factor,
]));
const pizzaServingOptions = (chain, sourceUrl, sourceReference, foodId, configurations) => configurations.flatMap(([
  configurationId, description, slicesPerPizza, nutrients, basis = "published",
]) => {
  const sliceDescription = `1 slice — ${description} (${slicesPerPizza} slices per pizza${basis === "calculated" ? "; calculated configuration" : ""})`;
  const wholeDescription = `Whole ${description} pizza (${slicesPerPizza} slices; calculated from the published per-slice nutrition)`;
  return [
    expansionMenuOption(chain, sourceUrl, sourceReference, `${foodId}:${configurationId}:slice`, sliceDescription, nutrients),
    expansionMenuOption(chain, sourceUrl, `${sourceReference} Whole-pizza nutrition is calculated by multiplying the published per-slice serving by the published slice count.`, `${foodId}:${configurationId}:whole`, wholeDescription, scalePublished(nutrients, slicesPerPizza)),
  ];
});

const dominos = { id: "dominos", name: "Domino's" };
const DOMINOS_SOURCE = "https://www.dominos.com/cms/assets/7d2e19df-e360-41eb-a367-5ab794ab2ebc";
const DOMINOS_REFERENCE = "Domino's official U.S. Nutrition Guide, January 2026; serving fractions and nutrients are published for the named size, crust, and standard recipe.";
const dominosFood = (id, name, description, nutrients, servingOptions, aliases, sourceReference = DOMINOS_REFERENCE) => menuFood(
  dominos, DOMINOS_SOURCE, sourceReference, id, name, description, nutrients, servingOptions,
  [`Dominos ${name}`, `Domino's ${name}`, ...(aliases || [])]
);
const dominosOption = (id, description, nutrients, amount = 1, sourceReference = DOMINOS_REFERENCE) => expansionMenuOption(
  dominos, DOMINOS_SOURCE, sourceReference, id, description, nutrients, amount
);
const dominosPizzaFood = (id, name, configurations, aliases, sourceReference = DOMINOS_REFERENCE) => dominosFood(
  id,
  name,
  `Standard ${name}; choose a published size/crust slice or a calculated whole-pizza option`,
  null,
  pizzaServingOptions(dominos, DOMINOS_SOURCE, sourceReference, id, configurations),
  aliases,
  sourceReference
);

const dominosSpecialtyConfigurations = [
  ["ultimate-pepperoni", "Ultimate Pepperoni", [[360, 14, 38, 16, 700, 1, 3, 1], [390, 15, 39, 19, 780, 2, 4, 1], [340, 13, 35, 16, 680, 1, 3, 1], [450, 18, 46, 21, 900, 2, 4, 2]]],
  ["wisconsin-6-cheese", "Wisconsin 6 Cheese", [[400, 16, 38, 19, 900, 2, 3, 1], [440, 18, 40, 22, 1040, 2, 4, 1], [380, 16, 36, 19, 900, 2, 3, 1], [500, 21, 47, 25, 1220, 2, 4, 2]]],
  ["meatzza", "MeatZZa", [[350, 15, 39, 15, 780, 1, 4, 2], [380, 17, 40, 17, 910, 1, 5, 2], [330, 14, 36, 14, 760, 1, 4, 2], [430, 19, 47, 18, 1010, 2, 6, 2]]],
  ["memphis-bbq-chicken", "Memphis BBQ Chicken", [[390, 16, 38, 19, 870, 1, 3, 1], [420, 18, 38, 21, 1000, 1, 3, 1], [370, 15, 34, 18, 850, 1, 3, 1], [480, 20, 45, 24, 1160, 2, 4, 2]]],
  ["pacific-veggie", "Pacific Veggie", [[360, 15, 41, 14, 680, 1, 7, 5], [410, 18, 44, 17, 800, 1, 8, 7], [350, 15, 39, 14, 680, 1, 7, 6], [460, 20, 51, 18, 880, 2, 9, 7]]],
  ["philly-cheese-steak", "Philly Cheese Steak", [[330, 13, 38, 13, 620, 1, 3, 1], [360, 14, 39, 15, 730, 2, 4, 1], [310, 12, 35, 13, 630, 1, 3, 1], [400, 16, 46, 16, 790, 2, 4, 1]]],
  ["spicy-chicken-bacon-ranch", "Spicy Chicken Bacon Ranch", [[340, 14, 36, 15, 790, 1, 3, 1], [370, 15, 37, 16, 890, 1, 3, 1], [310, 13, 33, 13, 720, 1, 3, 1], [400, 17, 43, 17, 920, 2, 3, 1]]],
  ["spinach-feta", "Spinach & Feta", [[390, 16, 34, 21, 1110, 1, 2, 1], [480, 19, 38, 27, 1280, 1, 3, 1], [410, 16, 34, 22, 1090, 1, 3, 1], [530, 21, 44, 29, 1410, 1, 3, 1]]],
  ["honolulu-hawaiian", "Honolulu Hawaiian", [[340, 14, 36, 15, 620, 1, 2, 1], [370, 15, 37, 17, 710, 1, 2, 1], [320, 13, 33, 15, 610, 1, 2, 1], [420, 17, 43, 19, 770, 2, 3, 1]]],
  ["peoples-pizza-deluxe", "The People's Pizza — Deluxe", [[380, 16, 38, 18, 850, 1, 3, 1], [420, 17, 38, 21, 960, 1, 3, 1], [360, 15, 34, 18, 830, 1, 3, 1], [480, 20, 45, 23, 1110, 2, 4, 2]]],
  ["extravaganzza", "ExtravaganZZa", [[340, 14, 38, 14, 660, 1, 3, 1], [390, 17, 39, 18, 790, 1, 3, 1], [330, 14, 35, 15, 670, 1, 3, 1], [440, 19, 46, 19, 880, 2, 4, 2]]],
];
const dominosSpecialtyFoods = dominosSpecialtyConfigurations.map(([id, name, rows]) => dominosPizzaFood(
  id,
  name,
  [
    ["small-hand-tossed", `10" Small Hand Tossed ${name}`, 4, menuPublished(...rows[0])],
    ["medium-hand-tossed", `12" Medium Hand Tossed ${name}`, 5, menuPublished(...rows[1])],
    ["large-hand-tossed", `14" Large Hand Tossed ${name}`, 8, menuPublished(...rows[2])],
    ["xl-hand-tossed", `16" Extra Large Hand Tossed ${name}`, 8, menuPublished(...rows[3])],
  ]
));

const dominosBuildReference = `${DOMINOS_REFERENCE} Cheese and Pepperoni configurations are calculated only by summing the guide's matching crust, finish, sauce, cheese, and optional pepperoni rows for the same published serving fraction.`;
const dominosBuildRows = [
  ["xs-hand-tossed", "8\" Extra Small Hand Tossed", 2, [230, 7, 42, 3, 230, 1, 2, 0], [35, 0, 0, 3.5, 65, 0, 0, 0], [10, 0, 2, 0, 90, 0, 2, 1], [100, 6, 2, 7, 300, 0, 0, 0], [70, 4, 1, 5, 200, 0, 0, 0], [50, 2, 0, 4.5, 200, 0, 0, 0]],
  ["small-hand-tossed", "10\" Small Hand Tossed", 3, [220, 7, 40, 3, 230, 1, 2, 0], [25, 0, 0, 2.5, 50, 0, 0, 0], [15, 1, 3, 0, 120, 1, 2, 1], [130, 8, 3, 9, 400, 0, 0, 0], [90, 5, 2, 7, 280, 0, 0, 0], [50, 2, 0, 4.5, 220, 0, 0, 0]],
  ["small-thin", "10\" Small Crunchy Thin", 4, [110, 2, 15, 4.5, 40, 0, 0, 0], null, [10, 0, 2, 0, 90, 0, 2, 1], [100, 6, 2, 7, 300, 0, 0, 0], [70, 4, 1, 5, 210, 0, 0, 0], [40, 2, 0, 3.5, 170, 0, 0, 0]],
  ["small-gluten-free", "10\" Small Gluten Free", 3, [170, 2, 37, 1.5, 180, 1, 4, 4], null, [15, 1, 3, 0, 120, 1, 2, 1], [130, 8, 3, 9, 400, 0, 0, 0], [90, 5, 2, 7, 280, 0, 0, 0], [50, 2, 0, 4.5, 220, 0, 0, 0]],
  ["medium-hand-tossed", "12\" Medium Hand Tossed", 8, [110, 4, 21, 1.5, 115, 1, 1, 0], [10, 0, 0, 1, 20, 0, 0, 0], [10, 0, 2, 0, 65, 0, 1, 0], [70, 4, 1, 5, 220, 0, 0, 0], [50, 3, 1, 3.5, 150, 0, 0, 0], [30, 1, 0, 2.5, 125, 0, 0, 0]],
  ["medium-thin", "12\" Medium Crunchy Thin", 4, [150, 3, 20, 6, 55, 1, 0, 0], null, [15, 1, 3, 0, 125, 1, 2, 1], [150, 9, 3, 11, 450, 0, 0, 0], [100, 6, 2, 7, 300, 0, 0, 0], [60, 3, 0, 5, 250, 0, 0, 0]],
  ["large-hand-tossed", "14\" Large Hand Tossed", 8, [160, 5, 30, 2, 170, 1, 1, 0], [15, 0, 0, 1.5, 25, 0, 0, 0], [10, 0, 2, 0, 90, 0, 2, 1], [100, 6, 2, 7, 310, 0, 0, 0], [70, 4, 1, 5, 210, 0, 0, 0], [50, 2, 0, 4.5, 220, 0, 0, 0]],
  ["large-thin", "14\" Large Crunchy Thin", 8, [100, 2, 13, 4, 35, 0, 0, 0], null, [10, 0, 2, 0, 90, 0, 2, 1], [100, 6, 2, 7, 310, 0, 0, 0], [70, 4, 1, 5, 210, 0, 0, 0], [50, 2, 0, 4.5, 220, 0, 0, 0]],
  ["large-new-york", "14\" Large New York Style", 6, [150, 5, 28, 2, 160, 1, 1, 0], null, [15, 1, 3, 0, 120, 1, 2, 1], [110, 6, 2, 9, 300, 0, 0, 0], [110, 6, 2, 9, 300, 0, 0, 0], [50, 2, 0, 4.5, 220, 0, 0, 0]],
];
const sumMenuRows = (...rows) => rows.filter(Boolean).map((row) => menuPublished(...row)).reduce(sumPublished);
const dominosCheeseConfigurations = dominosBuildRows.map(([id, label, slices, crust, finish, sauce, cheese]) => [
  id, `${label} Cheese`, slices, sumMenuRows(crust, finish, sauce, cheese), "calculated",
]);
const dominosPepperoniConfigurations = dominosBuildRows.map(([id, label, slices, crust, finish, sauce, , toppingCheese, pepperoni]) => [
  id, `${label} Pepperoni`, slices, sumMenuRows(crust, finish, sauce, toppingCheese, pepperoni), "calculated",
]);

const dominosFlatRows = [
  ["garlic-bread-bites", "Garlic Bread Bites", "4 pieces", [210, 5, 27, 9, 200, 1, 1, 1], 4],
  ["parmesan-bread-bites", "Parmesan Bread Bites", "4 pieces", [210, 5, 27, 9, 220, 1, 1, 1], 4],
  ["stuffed-cheesy-bread", "Stuffed Cheesy Bread", "1 piece", [160, 5, 15, 8, 220, 0, 1, 0]],
  ["stuffed-cheesy-bread-bacon-jalapeno", "Bacon & Jalapeño Stuffed Cheesy Bread", "1 piece", [170, 6, 15, 10, 330, 0, 1, 0], 1, ["Dominos bacon jalapeno stuffed cheesy bread"]],
  ["stuffed-cheesy-bread-pepperoni", "Pepperoni Stuffed Cheesy Bread", "1 piece", [170, 6, 15, 10, 290, 0, 1, 0]],
  ["stuffed-cheesy-bread-spinach-feta", "Spinach & Feta Stuffed Cheesy Bread", "1 piece", [160, 6, 15, 9, 250, 0, 1, 0]],
  ["boneless-chicken", "Boneless Chicken", "3 plain pieces; dipping sauce excluded", [170, 9, 18, 7, 660, 0, 1, 1], 3],
  ["plain-wings", "Plain Wings", "4 bone-in wings; dipping sauce excluded", [250, 14, 8, 20, 720, 0, 0, 0], 4],
  ["honey-bbq-wings", "Honey BBQ Wings", "4 bone-in wings with Honey BBQ sauce; dipping cup excluded", [310, 15, 22, 20, 940, 0, 13, 12], 4],
  ["hot-buffalo-wings", "Hot Buffalo Wings", "4 bone-in wings with Hot Buffalo sauce; dipping cup excluded", [260, 15, 9, 20, 1520, 0, 0, 0], 4],
  ["mild-buffalo-wings", "Mild Buffalo Wings", "4 bone-in wings with Mild Buffalo sauce; dipping cup excluded", [260, 15, 10, 20, 1420, 0, 0, 0], 4],
  ["garlic-parmesan-wings", "Garlic Parmesan Wings", "4 bone-in wings with Garlic Parmesan sauce; dipping cup excluded", [390, 15, 10, 34, 960, 0, 1, 0], 4],
  ["mango-habanero-wings", "Mango Habanero Wings", "4 bone-in wings with Mango Habanero sauce; dipping cup excluded", [310, 15, 21, 20, 790, 0, 10, 10], 4],
  ["loaded-chicken-classic-hot-buffalo", "Loaded Chicken — Classic Hot Buffalo", "4 loaded boneless chicken pieces; named toppings included", [200, 10, 16, 11, 1080, 0, 1, 1], 4],
  ["loaded-chicken-crispy-bacon-tomato", "Loaded Chicken — Crispy Bacon & Tomato", "4 loaded boneless chicken pieces; named toppings included", [270, 12, 16, 18, 860, 0, 1, 1], 4],
  ["loaded-chicken-spicy-jalapeno-pineapple", "Loaded Chicken — Spicy Jalapeño Pineapple", "4 loaded boneless chicken pieces; named toppings included", [200, 9, 23, 8, 720, 0, 7, 6], 4],
  ["loaded-chicken-sweet-bbq-bacon", "Loaded Chicken — Sweet BBQ Bacon", "4 loaded boneless chicken pieces; named toppings included", [220, 11, 22, 11, 840, 0, 7, 7], 4],
  ["chicken-alfredo-pasta", "Chicken Alfredo Pasta", "1 complete pasta dish", [590, 24, 60, 28, 1020, 2, 5, 0]],
  ["five-cheese-mac-pasta", "Five Cheese Mac Pasta", "1 complete pasta dish", [830, 30, 64, 50, 1680, 2, 6, 0]],
  ["spicy-buffalo-five-cheese-mac-pasta", "Spicy Buffalo Five Cheese Mac Pasta", "1 complete pasta dish", [840, 31, 64, 50, 2090, 2, 6, 0]],
  ["chocolate-lava-crunch-cake", "Chocolate Lava Crunch Cake", "1 cake", [350, 4, 47, 17, 180, 1, 30, 29]],
  ["marbled-cookie-brownie", "Marbled Cookie Brownie", "1 brownie", [200, 2, 26, 10, 125, 1, 18, 18]],
  ["cinnamon-bread-bites", "Cinnamon Bread Bites", "4 pieces", [230, 5, 30, 9, 160, 1, 4, 4], 4],
];
const dominosDipRows = [
  ["honey-bbq-dipping-cup", "Honey BBQ Dipping Cup", [70, 0, 17, 0, 310, 1, 15, 14]],
  ["blue-cheese-dipping-cup", "Blue Cheese Dipping Cup", [200, 1, 2, 21, 270, 0, 1, 1]],
  ["garlic-dipping-cup", "Garlic Dipping Cup", [250, 0, 0, 28, 170, 0, 0, 0]],
  ["hot-buffalo-dipping-cup", "Hot Buffalo Dipping Cup", [15, 0, 1, 1, 860, 0, 0, 0]],
  ["marinara-dipping-cup", "Marinara Dipping Cup", [30, 0, 6, 0, 290, 0, 4, 1]],
  ["ranch-dipping-cup", "Ranch Dipping Cup", [160, 0, 1, 17, 300, 0, 1, 1]],
  ["icing-dipping-cup", "Icing Dipping Cup", [220, 0, 52, 4, 110, 0, 52, 52]],
  ["mango-habanero-dipping-cup", "Mango Habanero Dipping Cup", [70, 0, 17, 0, 65, 0, 13, 13]],
  ["nacho-cheese-dipping-cup", "Nacho Cheese Dipping Cup", [120, 6, 5, 8, 830, 0, 0, 0]],
];
const dominosHalfRows = [
  ["buffalo-chicken-sandwich", "Buffalo Chicken Sandwich", [420, 20, 39, 20, 1300, 0, 2, 0]],
  ["chicken-bacon-ranch-sandwich", "Chicken Bacon Ranch Sandwich", [450, 23, 37, 22, 1190, 0, 2, 1]],
  ["chicken-parmesan-sandwich", "Chicken Parmesan Sandwich", [400, 24, 38, 15, 1050, 0, 2, 0]],
  ["italian-sandwich", "Italian Sandwich", [420, 21, 37, 20, 1530, 0, 1, 0]],
  ["philly-cheese-steak-sandwich", "Philly Cheese Steak Sandwich", [380, 20, 38, 15, 1280, 0, 3, 1]],
  ["sweet-spicy-chicken-habanero-sandwich", "Sweet & Spicy Chicken Habanero Sandwich", [390, 21, 44, 14, 1080, 0, 6, 4]],
];
const dominosTotsRows = [
  ["loaded-tots-cheddar-bacon", "Loaded Tots — Cheddar Bacon", [240, 7, 17, 16, 590, 1, 1, 1]],
  ["loaded-tots-melty-three-cheese", "Loaded Tots — Melty 3-Cheese", [210, 6, 17, 13, 510, 1, 1, 0]],
  ["loaded-tots-philly-cheese-steak", "Loaded Tots — Philly Cheese Steak", [200, 6, 18, 12, 530, 1, 1, 0]],
];
const dominosFoods = [
  dominosPizzaFood("cheese-pizza", "Cheese Pizza", dominosCheeseConfigurations, ["Dominos plain cheese pizza"], dominosBuildReference),
  dominosPizzaFood("pepperoni-pizza", "Pepperoni Pizza", dominosPepperoniConfigurations, undefined, dominosBuildReference),
  ...dominosSpecialtyFoods,
  ...dominosFlatRows.map(([id, name, description, values, amount = 1, aliases]) => {
    const nutrients = menuPublished(...values);
    return amount === 1
      ? dominosFood(id, name, description, nutrients, undefined, aliases)
      : dominosFood(id, name, description, null, [dominosOption(`${id}:published-serving`, description, nutrients, amount)], aliases);
  }),
  ...dominosDipRows.map(([id, name, values]) => dominosFood(id, name, "1 separately packaged dipping cup", menuPublished(...values))),
  ...dominosHalfRows.map(([id, name, values]) => {
    const half = menuPublished(...values);
    return dominosFood(id, name, "Choose a published half-sandwich serving or calculated whole sandwich", null, [
      dominosOption(`${id}:half`, `Half ${name}`, half),
      dominosOption(`${id}:whole`, `Whole ${name}; calculated as two published half-sandwich servings`, scalePublished(half, 2)),
    ]);
  }),
  ...dominosTotsRows.map(([id, name, values]) => {
    const quarter = menuPublished(...values);
    return dominosFood(id, name, "Choose one published quarter-order serving or a calculated whole order", null, [
      dominosOption(`${id}:quarter`, `1/4 order of ${name}`, quarter),
      dominosOption(`${id}:whole`, `Whole order of ${name}; calculated as four published quarter-order servings`, scalePublished(quarter, 4)),
    ]);
  }),
];

const pizzaHut = { id: "pizza-hut", name: "Pizza Hut" };
const PIZZA_HUT_SOURCE = "https://www.nutritionix.com/pizza-hut/menu/premium";
const PIZZA_HUT_REFERENCE = "Pizza Hut official U.S. Nutrition page-linked full nutrition menu, operated by Nutritionix and updated September 10, 2026; values are for the named published size, crust, recipe, and serving.";
const pizzaHutFood = (id, name, description, nutrients, servingOptions, aliases, sourceReference = PIZZA_HUT_REFERENCE) => menuFood(
  pizzaHut, PIZZA_HUT_SOURCE, sourceReference, id, name, description, nutrients, servingOptions,
  [`Pizza Hut ${name}`, `PizzaHut ${name}`, ...(aliases || [])]
);
const pizzaHutOption = (id, description, nutrients, amount = 1, sourceReference = PIZZA_HUT_REFERENCE) => expansionMenuOption(
  pizzaHut, PIZZA_HUT_SOURCE, sourceReference, id, description, nutrients, amount
);
const pizzaHutRecipes = [
  ["backyard-bbq-chicken-pizza", "Backyard BBQ Chicken Pizza"],
  ["cheese-pizza", "Cheese Pizza"],
  ["chicken-sausage-bacon-classic-pizza", "Chicken Sausage & Bacon Classic Pizza"],
  ["double-pepperoni-pizza", "Double Pepperoni Pizza"],
  ["meat-lovers-pizza", "Meat Lover's Pizza"],
  ["pepperoni-pizza", "Pepperoni Pizza"],
  ["pepperoni-lovers-pizza", "Pepperoni Lover's Pizza"],
  ["pesto-margherita-pizza", "Pesto Margherita Pizza"],
  ["supreme-pizza", "Supreme Pizza"],
  ["the-ultimate-pizza", "The Ultimate Pizza"],
  ["veggie-lovers-pizza", "Veggie Lover's Pizza"],
];
const ph = (...values) => menuPublished(...values);
const pizzaHutConfigRows = [
  ["personal-pan", "Personal Pan", 4, [
    [190, 6, 27, 6, 350, null, 7], [160, 6, 19, 6, 310, 1, 1], [160, 6, 19, 6, 310, 1, 1], [160, 6, 19, 6, 310, 1, 1], [190, 7, 19, 9, 400, 1, 1], [160, 6, 19, 7, 320, 1, null], [190, 7, 19, 9, 380, 1, 1], [150, 5, 20, 6, 290, 1, 1], [170, 6, 20, 7, 330, 1, 1], [170, 6, 20, 7, 320, 1, 1], [150, 5, 20, 5, 290, 1, 1],
  ]],
  ["small-original-pan", "Small Original Pan", 8, [
    [140, 6, 18, 5, 250, null, 1], [140, 6, 17, 5, 280, 1, null], [150, 6, 18, 6, 300, 1, 1], [140, 5, 17, 6, 290, null, 1], [180, 7, 18, 9, 390, 1, 1], [150, 5, 17, 6, 290, null, null], [170, 7, 18, 8, 350, 1, null], [140, 5, 18, 5, 260, 1, 1], [150, 6, 18, 7, 310, 1, 1], [160, 6, 18, 7, 300, 1, 1], [130, 5, 18, 4.5, 270, 1, 1],
  ]],
  ["small-hand-tossed", "Small Hand Tossed", 8, [
    [150, 6, 21, 5, 280, null, 4], [140, 6, 17, 5, 280, null, 1], [140, 6, 17, 5, 290, 1, 1], [140, 5, 17, 6, 280, null, 1], [180, 7, 17, 9, 380, null, 1], [140, 5, 16, 6, 290, null, 1], [170, 7, 17, 8, 340, null, 1], [130, 5, 17, 5, 250, 1, 1], [150, 6, 17, 6, 300, 1, 1], [150, 6, 17, 7, 300, 1, 2], [130, 5, 17, 4.5, 260, 1, 1],
  ]],
  ["small-thin", "Small Thin 'N Crispy", 8, [
    [130, 6, 17, 4, 270, null, 5], [110, 5, 13, 4, 260, null, 2], [120, 6, 13, 4.5, 280, null, 2], [110, 5, 13, 4, 260, null, 2], [160, 7, 13, 9, 390, null, 2], [110, 5, 13, 4.5, 270, null, 2], [140, 7, 13, 7, 330, null, 2], [100, 4, 14, 3.5, 240, null, 2], [120, 6, 14, 5, 290, null, 2], [130, 6, 14, 6, 290, null, 2], [100, 5, 14, 3, 250, 1, 2],
  ]],
  ["medium-original-pan", "Medium Original Pan", 8, [
    [280, 11, 35, 11, 490, 1, 6], [260, 10, 30, 11, 480, 2, 1], [270, 10, 30, 12, 520, 2, 2], [270, 9, 29, 12, 490, 2, 1], [340, 13, 30, 19, 690, 2, 2], [270, 9, 29, 12, 500, 2, 1], [310, 12, 30, 16, 610, 2, 1], [250, 8, 31, 11, 440, 2, 2], [280, 10, 30, 13, 530, 2, 2], [290, 10, 30, 14, 520, 2, 2], [240, 8, 31, 10, 450, 2, 2],
  ]],
  ["medium-hand-tossed", "Medium Hand Tossed", 8, [
    [250, 10, 31, 9, 450, 1, 6], [220, 10, 26, 9, 440, 1, 2], [240, 10, 26, 10, 480, 2, 2], [230, 9, 26, 10, 450, 1, 2], [300, 12, 26, 16, 650, 1, 2], [230, 9, 26, 10, 460, 1, 2], [280, 12, 26, 14, 570, 1, 2], [220, 8, 27, 8, 400, 2, 2], [250, 10, 27, 11, 490, 2, 2], [250, 10, 27, 12, 480, 2, 2], [210, 8, 27, 7, 410, 2, 2],
  ]],
  ["medium-thin", "Medium Thin 'N Crispy", 8, [
    [210, 10, 27, 7, 440, 1, 7], [180, 9, 22, 7, 420, 1, 3], [200, 10, 22, 8, 470, 1, 3], [190, 9, 21, 8, 440, 1, 3], [260, 12, 22, 14, 630, 1, 3], [200, 9, 21, 9, 470, 1, 3], [250, 12, 22, 12, 580, 1, 3], [180, 8, 23, 6, 380, 1, 3], [210, 10, 23, 9, 480, 2, 3], [210, 9, 22, 10, 470, 1, 3], [170, 8, 23, 6, 410, 2, 4],
  ]],
  ["medium-stuffed-crust", "Medium Original Stuffed Crust", 8, [
    [300, 13, 35, 12, 610, 1, 6], [280, 13, 30, 12, 600, 2, 2], [300, 13, 29, 14, 590, 1, 1], [290, 12, 29, 13, 610, 2, 2], [360, 15, 30, 19, 810, 2, 2], [290, 12, 29, 13, 630, 2, 2], [330, 15, 30, 17, 730, 2, 2], [270, 11, 31, 11, 550, 2, 2], [300, 13, 30, 14, 650, 2, 2], [300, 13, 29, 14, 570, 1, null], [260, 11, 31, 10, 570, 2, 2],
  ]],
  ["medium-chicago-tavern", "Medium Chicago Tavern square-cut", 16, [
    [90, 5, 11, 3.5, 200, 0, 3], [80, 4, 8, 3.5, 200, null, 1], [80, 4, 8, 4, 220, null, 1], [80, 4, 8, 4, 200, null, 1], [120, 6, 8, 7, 300, null, 1], [80, 4, 8, 4, 210, null, 1], [110, 5, 8, 6, 260, null, 1], [70, 3, 9, 3, 180, null, 1], [90, 5, 9, 4.5, 220, null, 1], [90, 4, 8, 5, 220, null, 1], [70, 4, 9, 2.5, 190, null, 2],
  ]],
  ["large-original-pan", "Large Original Pan", 8, [
    [400, 15, 46, 17, 660, 2, 7], [370, 14, 40, 18, 660, 2, 2], [380, 14, 40, 19, 710, 2, 2], [380, 13, 39, 19, 690, 2, 2], [480, 18, 40, 28, 950, 2, 2], [380, 13, 39, 19, 680, 2, 2], [450, 17, 40, 24, 840, 2, 2], [360, 12, 41, 17, 600, 2, 2], [410, 15, 41, 21, 740, 3, 3], [420, 14, 41, 22, 720, 3, 3], [350, 12, 41, 16, 630, 3, 3],
  ]],
  ["large-hand-tossed", "Large Hand Tossed", 8, [
    [330, 14, 42, 12, 610, 2, 7], [310, 14, 36, 12, 610, 2, 2], [320, 14, 36, 13, 660, 2, 3], [320, 13, 35, 14, 640, 2, 2], [420, 17, 36, 23, 900, 2, 2], [320, 13, 36, 14, 650, 2, 2], [390, 17, 36, 19, 810, 2, 2], [300, 11, 37, 11, 550, 2, 3], [350, 14, 37, 16, 690, 2, 3], [350, 14, 37, 16, 670, 2, 3], [290, 11, 37, 10, 580, 3, 3],
  ]],
  ["large-thin", "Large Thin 'N Crispy", 8, [
    [280, 14, 35, 9, 580, 1, 9], [250, 13, 29, 10, 590, 2, 4], [260, 13, 29, 11, 640, 2, 4], [260, 12, 28, 11, 620, 2, 4], [360, 17, 29, 20, 870, 2, 4], [270, 13, 28, 12, 650, 2, 4], [340, 16, 29, 18, 800, 2, 4], [240, 11, 30, 9, 530, 2, 4], [290, 14, 30, 13, 670, 2, 5], [300, 13, 30, 14, 650, 2, 5], [230, 11, 31, 8, 570, 2, 5],
  ]],
  ["large-stuffed-crust", "Large Original Stuffed Crust", 8, [
    [370, 16, 45, 14, 750, 2, 7], [340, 15, 39, 13, 730, 2, 2], [360, 16, 40, 15, 810, 2, 3], [360, 15, 39, 16, 780, 2, 2], [460, 19, 40, 25, 1040, 2, 2], [360, 15, 39, 16, 790, 2, 2], [420, 18, 39, 20, 920, 2, 2], [340, 13, 41, 13, 700, 2, 3], [390, 16, 40, 18, 840, 2, 3], [390, 16, 40, 18, 820, 2, 3], [330, 13, 41, 12, 720, 3, 3],
  ]],
  ["large-chicago-tavern", "Large Chicago Tavern square-cut", 16, [
    [120, 6, 14, 4.5, 270, null, 4], [110, 6, 11, 4.5, 270, null, 2], [110, 6, 11, 5, 300, null, 2], [110, 5, 10, 6, 280, null, 2], [160, 8, 11, 10, 410, null, 2], [120, 6, 10, 6, 300, null, 2], [150, 8, 11, 9, 370, null, 2], [100, 5, 11, 4.5, 240, null, 2], [130, 6, 11, 7, 310, null, 2], [130, 6, 11, 7, 300, null, 2], [100, 5, 12, 4, 260, 1, 2],
  ]],
];
const pizzaHutSpecialConfigs = {
  "cheese-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(180, 8, 18, 9, 350, 1, 2)], ["gluten-free", "Gluten-Free", 8, ph(110, 5, 14, 4.5, 240, null, 2)]],
  "meat-lovers-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(270, 11, 18, 17, 580, 1, 2)], ["gluten-free", "Gluten-Free", 8, ph(160, 6, 14, 9, 380, null, 2)]],
  "pepperoni-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(190, 7, 17, 11, 400, 1, 2)], ["gluten-free", "Gluten-Free", 8, ph(120, 4, 14, 6, 270, null, 2)]],
  "pepperoni-lovers-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(240, 10, 18, 15, 500, 1, 2)], ["gluten-free", "Gluten-Free", 8, ph(150, 6, 14, 7, 320, null, 2)]],
  "supreme-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(200, 8, 19, 11, 400, 1, 2)], ["gluten-free", "Gluten-Free", 8, ph(130, 5, 15, 6, 270, null, 3)]],
  "the-ultimate-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(200, 8, 17, 11, 330, null, null)]],
  "veggie-lovers-pizza": [["medium-caulicrust", "Medium Caulicrust", 8, ph(170, 6, 19, 8, 340, 2, 2)], ["gluten-free", "Gluten-Free", 8, ph(110, 4, 15, 3.5, 230, 1, 3)]],
};
const pizzaHutPizzaFoods = pizzaHutRecipes.map(([id, name], recipeIndex) => {
  const configs = pizzaHutConfigRows.map(([configId, crust, slices, rows]) => [configId, `${crust} ${name}`, slices, ph(...rows[recipeIndex])]);
  return pizzaHutFood(id, name, `Standard ${name}; choose a published crust/size slice or calculated whole pizza`, null, [
    ...pizzaServingOptions(pizzaHut, PIZZA_HUT_SOURCE, PIZZA_HUT_REFERENCE, id, configs),
    ...pizzaServingOptions(pizzaHut, PIZZA_HUT_SOURCE, PIZZA_HUT_REFERENCE, id, (pizzaHutSpecialConfigs[id] || []).map(([configId, crust, slices, nutrients]) => [configId, `${crust} ${name}`, slices, nutrients])),
  ]);
});

const pizzaHutFlatRows = [
  ["cheesy-alfredo-pasta", "Cheesy Alfredo Pasta", "1 published pasta dish", [880, 30, 85, 47, 1120, 4, 7]],
  ["chicken-alfredo-pasta", "Chicken Alfredo Pasta", "1 published pasta dish", [920, 37, 86, 49, 1280, 4, 7]],
  ["italian-meats-pasta", "Italian Meats Pasta", "1 published pasta dish", [850, 36, 97, 37, 1640, 8, 16]],
  ["triple-cheese-mac-pasta", "Triple Cheese Mac Pasta", "1 published pasta dish", [830, 38, 44, 56, 1810, 2, 8]],
  ["veggie-pasta", "Veggie Pasta", "1 published pasta dish", [640, 27, 98, 16, 1170, 8, 17]],
  ["breadsticks", "Breadsticks", "1 breadstick", [150, 4, 19, 7, 260, null, 1]],
  ["cheese-breadsticks", "Cheese Breadsticks", "1 cheese breadstick", [100, 4, 10, 5, 190, null, null]],
  ["roasted-garlic-cheese-breadsticks", "Roasted Garlic Cheese Breadsticks", "1 breadstick", [100, 5, 10, 5, 170, null, null]],
  ["bacon-cheddar-cheese-breadsticks", "Bacon Cheddar Cheese Breadsticks", "1 breadstick", [120, 5, 10, 6, 200, null, null]],
  ["fries-with-ketchup", "French Fries with Ketchup", "1 order with ketchup included", [500, 4, 67, 24, 1230, 3, 7]],
  ["garlic-bread", "Garlic Bread", "1 piece", [190, 5, 29, 6, 330, 1, 0]],
  ["garlic-bread-with-cheese", "Garlic Bread with Cheese", "1 piece", [210, 7, 16, 13, 390, null, 0]],
  ["stuffed-pizza-roller", "Stuffed Pizza Roller", "1 roller", [230, 9, 27, 10, 520, 1, null]],
  ["apple-dessert-pizza", "Apple Dessert Pizza", "1 slice", [250, 4, 50, 4, 190, 2, 25]],
  ["blueberry-dessert-pizza", "Blueberry Dessert Pizza", "1 slice", [230, 4, 46, 4, 190, 2, 21]],
  ["cherry-dessert-pizza", "Cherry Dessert Pizza", "1 slice", [240, 4, 47, 4, 190, 2, 22]],
  ["chocolate-donut-bites", "Chocolate Donut Bites", "1 published serving", [250, 3, 36, 10, 170, null, 19]],
  ["cinnamon-stick", "Cinnamon Stick", "1 stick", [90, 2, 13, 3, 105, null, 4]],
  ["fried-apple-pie", "Fried Apple Pie", "1 pie", [170, null, 22, 9, 100, null, 12]],
  ["ultimate-chocolate-chip-cookie", "Ultimate Chocolate Chip Cookie", "1/8 cookie", [190, 2, 26, 9, 110, null, 17]],
  ["triple-chocolate-brownie", "Triple Chocolate Brownie", "1/9 brownie tray", [230, 3, 34, 10, 80, 2, 25]],
];
const pizzaHutDipRows = [
  ["bbq-dip", "BBQ Dip", [210, null, 51, 0, 540, null, 39]], ["blue-cheese-dip", "Blue Cheese Dip", [220, 1, 2, 23, 380, 0, 2]],
  ["buffalo-dip", "Buffalo Dip", [100, 0, 23, 0, 1140, 0, 3]], ["cheese-dip", "Cheese Dip", [250, 6, 11, 20, 1230, 0, 7]],
  ["marinara-dip", "Marinara Dip", [45, 1, 9, 0, 290, 2, 6]], ["nacho-cheese-dip", "Nacho Cheese Dip", [90, null, 7, 6, 330, 0, 2]],
  ["ranch-dip", "Ranch Dip", [210, 0, 2, 22, 400, 0, 2]],
];
const pizzaHutWingRows = [
  ["naked", "Naked", [[80, 5, 6, 4, 160, 0, 0], [80, 9, 0, 4.5, 160, 0, 0]]],
  ["burnin-hot", "Burnin' Hot", [[90, 5, 9, 4, 340, 0, null], [100, 9, 5, 4.5, 390, 0, null]]],
  ["buffalo-medium", "Buffalo Medium", [[90, 5, 9, 4, 330, 0, null], [100, 9, 5, 4.5, 370, 0, null]]],
  ["buffalo-mild", "Buffalo Mild", [[90, 5, 10, 4, 340, 0, null], [100, 9, 5, 4.5, 380, 0, null]]],
  ["cajun", "Cajun", [[80, 5, 6, 4, 210, 0, 0], [80, 9, null, 4.5, 220, 0, 0]]],
  ["garlic-parmesan", "Garlic Parmesan", [[130, 5, 6, 9, 270, 0, 0], [140, 10, null, 11, 300, 0, 0]]],
  ["honey-bbq", "Honey BBQ", [[100, 5, 11, 4, 220, 0, 4], [110, 9, 7, 4.5, 230, 0, 5]]],
  ["lemon-pepper", "Lemon Pepper", [[80, 5, 6, 4, 200, 0, 0], [80, 9, null, 4.5, 200, 0, 0]]],
  ["smoky-garlic", "Smoky Garlic", [[110, 5, 9, 6, 220, 0, 2], [120, 9, 5, 7, 230, 0, 3]]],
  ["spicy-garlic", "Spicy Garlic", [[110, 5, 8, 6, 290, 0, 0], [120, 9, 3, 8, 330, 0, null]]],
  ["sweet-chili", "Sweet Chili", [[100, 5, 10, 4.5, 230, 0, 4], [100, 9, 4, 5, 220, 0, 4]]],
];
const pizzaHutMeltRows = [
  ["burger-melt", "Burger Melt", [730, 21, 44, 53, 1320, 2, 6], [1180, 42, 85, 77, 2300, 4, 10]],
  ["chicken-bacon-parmesan-melt", "Chicken Bacon Parmesan Melt", [690, 25, 43, 47, 1410, 2, 6], [1170, 49, 85, 71, 2430, 4, 10]],
  ["meat-lovers-melt", "Meat Lover's Melt", [560, 25, 47, 30, 1390, 3, 8], [1080, 49, 87, 60, 2580, 5, 12]],
  ["pepperoni-lovers-melt", "Pepperoni Lover's Melt", [580, 27, 47, 31, 1370, 3, 8], [1130, 53, 88, 63, 2550, 5, 11]],
];
const pizzaHutFoods = [
  ...pizzaHutPizzaFoods,
  ...pizzaHutFlatRows.map(([id, name, description, values]) => pizzaHutFood(id, name, description, ph(...values))),
  ...pizzaHutDipRows.map(([id, name, values]) => pizzaHutFood(id, name, "1 separately listed dipping container", ph(...values))),
  ...pizzaHutWingRows.map(([id, flavor, rows]) => pizzaHutFood(`${id}-wings`, `${flavor} Wings`, `Named flavor is included in each wing value; separately chosen dipping sauce is excluded`, null, [
    pizzaHutOption(`${id}-wings:bone-out`, `1 bone-out wing with ${flavor} flavor included`, ph(...rows[0])),
    pizzaHutOption(`${id}-wings:bone-in`, `1 bone-in wing with ${flavor} flavor included`, ph(...rows[1])),
  ], [`Pizza Hut ${flavor} boneless wings`, `Pizza Hut ${flavor} bone in wings`])),
  ...pizzaHutMeltRows.map(([id, name, halfValues, fullValues]) => pizzaHutFood(id, name, "Choose the separately published half or full melt", null, [
    pizzaHutOption(`${id}:half`, `Half ${name}`, ph(...halfValues)),
    pizzaHutOption(`${id}:full`, `Full ${name}`, ph(...fullValues)),
  ])),
  pizzaHutFood("penne-meatballs", "Penne with Meatballs", "Choose the separately published half or regular portion", null, [
    pizzaHutOption("penne-meatballs:half", "Half portion", ph(630, 34, 61, 28, 1580, 6, 16)),
    pizzaHutOption("penne-meatballs:regular", "Regular portion", ph(1120, 58, 119, 47, 2760, 11, 31)),
  ]),
  ...[
    ["pepsi", "Pepsi", [["20-ounce", "20 fl oz bottle", [250, 0, 69, 0, 55, 0, 69]], ["two-liter", "2 liter bottle", [840, 0, 229, 0, 170, 0, 229]]]],
    ["diet-pepsi", "Diet Pepsi", [["20-ounce", "20 fl oz bottle", [0, 0, 0, 0, 60, 0, 0]], ["two-liter", "2 liter bottle", [0, 0, 0, 0, 200, 0, 0]]]],
    ["mountain-dew", "Mountain Dew", [["20-ounce", "20 fl oz bottle", [290, 0, 77, 0, 105, 0, 77]], ["two-liter", "2 liter bottle", [950, 0, 257, 0, 340, 0, 257]]]],
    ["starry", "Starry", [["20-ounce", "20 fl oz bottle", [240, 0, 65, 0, 55, 0, 65]], ["two-liter", "2 liter bottle", [900, 0, 230, 0, 210, 0, 230]]]],
  ].map(([id, name, sizes]) => pizzaHutFood(id, name, "Choose a published packaged size", null, sizes.map(([sizeId, description, values]) => pizzaHutOption(`${id}:${sizeId}`, description, ph(...values))), [`Pizza Hut ${name}`])),
];

const papaJohns = { id: "papa-johns", name: "Papa Johns" };
const PAPA_JOHNS_PIZZA_SOURCE = "https://www.papajohns.com/company/nutritional-details/index.html";
const PAPA_JOHNS_REFERENCE = "Papa Johns official U.S. Nutritional Details pages, accessed September 10, 2026; nutrients and serving counts are for the named standard product.";
const papaJohnsFood = (sourceUrl, id, name, description, nutrients, servingOptions, aliases, sourceReference = PAPA_JOHNS_REFERENCE) => menuFood(
  papaJohns, sourceUrl, sourceReference, id, name, description, nutrients, servingOptions,
  [`Papa John's ${name}`, `PapaJohns ${name}`, ...(aliases || [])]
);
const papaJohnsOption = (sourceUrl, id, description, nutrients, amount = 1, sourceReference = PAPA_JOHNS_REFERENCE) => expansionMenuOption(
  papaJohns, sourceUrl, sourceReference, id, description, nutrients, amount
);
const papaJohnsPizzaRows = [
  ["cheese-pizza", "Cheese Pizza", [
    [200, 8, 25, 7, 500, 1, 3], [180, 7, 25, 6, 440, 1, 3], [210, 8, 27, 7, 520, 1, 3], [290, 11, 38, 10, 710, 2, 5], [300, 11, 40, 10, 730, 2, 5], [360, 15, 40, 14, 900, 2, 4], [210, 8, 20, 11, 490, 1, 2], [290, 10, 36, 11, 680, 2, 3],
  ]],
  ["pepperoni-pizza", "Pepperoni Pizza", [
    [220, 8, 25, 10, 580, 1, 3], [210, 8, 25, 8, 530, 1, 3], [230, 8, 26, 9, 570, 1, 3], [320, 12, 38, 13, 810, 2, 5], [330, 12, 40, 13, 840, 2, 5], [390, 16, 40, 17, 980, 2, 4], [250, 9, 20, 14, 590, 1, 2], [340, 11, 36, 16, 820, 2, 3],
  ]],
  ["bbq-chicken-bacon-pizza", "BBQ Chicken Bacon Pizza", [
    [240, 12, 30, 8, 740, 1, 8], [230, 10, 30, 7, 660, 1, 7], [240, 11, 32, 8, 730, 1, 8], [340, 16, 45, 11, 1020, 2, 11], [360, 16, 48, 11, 1070, 2, 11], [400, 20, 45, 15, 1090, 2, 10], [270, 13, 27, 12, 800, 1, 8], [340, 13, 42, 12, 950, 2, 9],
  ]],
  ["garden-fresh-pizza", "Garden Fresh Pizza", [
    [190, 7, 26, 6, 470, 1, 4], [190, 7, 26, 6, 450, 1, 3], [200, 7, 27, 7, 480, 1, 4], [280, 10, 39, 9, 680, 2, 5], [300, 11, 41, 9, 710, 2, 6], [350, 15, 41, 14, 870, 2, 5], [210, 8, 21, 10, 460, 1, 3], [280, 10, 37, 10, 640, 2, 3],
  ]],
  ["the-meats-pizza", "The Meats Pizza", [
    [260, 11, 26, 12, 720, 1, 3], [250, 10, 26, 12, 700, 1, 3], [260, 11, 27, 11, 710, 1, 3], [380, 15, 38, 17, 1040, 2, 5], [410, 17, 41, 19, 1130, 2, 5], [440, 20, 40, 22, 1200, 2, 5], [300, 13, 20, 19, 820, 1, 2], [340, 13, 36, 15, 870, 2, 3],
  ]],
  ["the-works-pizza", "The Works Pizza", [
    [230, 9, 26, 10, 610, 1, 4], [230, 9, 26, 9, 590, 1, 3], [230, 9, 27, 9, 620, 1, 4], [340, 13, 39, 14, 890, 2, 5], [360, 14, 41, 15, 940, 2, 6], [410, 18, 41, 19, 1080, 2, 5], [270, 11, 21, 15, 670, 1, 3], [320, 12, 37, 13, 780, 2, 3],
  ]],
  ["super-hawaiian-pizza", "Super Hawaiian Pizza", [
    [230, 10, 27, 9, 630, 1, 5], [230, 10, 27, 8, 610, 1, 4], [230, 10, 28, 9, 630, 1, 5], [340, 15, 40, 13, 920, 2, 7], [360, 16, 42, 13, 970, 2, 4], [400, 19, 42, 17, 1060, 2, 6], [260, 12, 22, 14, 700, 1, 4], [170, 8, 17, 8, 450, 1, 3],
  ]],
  ["extra-cheesy-alfredo-pizza", "Extra Cheesy Alfredo Pizza", [
    [220, 9, 24, 9, 520, 1, 2], [210, 9, 25, 9, 500, 1, 2], [230, 10, 26, 10, 550, 1, 2], [320, 13, 37, 13, 750, 1, 3], [330, 13, 39, 13, 760, 1, 4], [390, 18, 39, 18, 970, 1, 3], [260, 11, 19, 14, 530, 0, 1], [180, 7, 18, 9, 350, 1, 2],
  ]],
];
const papaJohnsPizzaConfigs = [
  ["pizza-for-one-original", "Pizza for One Original Crust", 4],
  ["small-original", "Small Original Crust", 6],
  ["medium-original", "Medium Original Crust", 8],
  ["large-original", "Large Original Crust", 8],
  ["extra-large-original", "Extra Large Original Crust", 10],
  ["epic-stuffed-crust", "Epic Stuffed Crust", 8],
  ["thin-crust", "Thin Crust", 8],
  ["gluten-free-crust", "Gluten-Free Crust", 8],
];
const papaJohnsPizzaFoods = papaJohnsPizzaRows.map(([id, name, rows]) => papaJohnsFood(
  PAPA_JOHNS_PIZZA_SOURCE,
  id,
  name,
  `Standard ${name}; choose a published size/crust slice or calculated whole pizza`,
  null,
  pizzaServingOptions(papaJohns, PAPA_JOHNS_PIZZA_SOURCE, PAPA_JOHNS_REFERENCE, id, papaJohnsPizzaConfigs.map(([configId, crust, slices], index) => [
    configId, `${crust} ${name}`, slices, ph(...rows[index]),
  ]))
));

const PAPA_JOHNS_PAPADIA_SOURCE = "https://www.papajohns.com/company/nutritional-details/papadias.html";
const PAPA_JOHNS_SANDWICH_SOURCE = "https://www.papajohns.com/company/nutritional-details/sandwiches.html";
const PAPA_JOHNS_WINGS_SOURCE = "https://www.papajohns.com/company/nutritional-details/wings.html";
const PAPA_JOHNS_SIDES_SOURCE = "https://www.papajohns.com/company/nutritional-details/sides.html";
const PAPA_JOHNS_DESSERT_SOURCE = "https://www.papajohns.com/company/nutritional-details/desserts.html";
const PAPA_JOHNS_DIPS_SOURCE = "https://www.papajohns.com/company/nutritional-details/dipping-sauces.html";
const PAPA_JOHNS_EXTRAS_SOURCE = "https://www.papajohns.com/company/nutritional-details/extras.html";
const papaJohnsFlatRows = [
  [PAPA_JOHNS_PAPADIA_SOURCE, "philly-cheesesteak-papadia", "Philly Cheesesteak Papadia", "1 Papadia with garlic dipping sauce included", [810, 40, 80, 35, 2090, 4, 11]],
  [PAPA_JOHNS_PAPADIA_SOURCE, "grilled-bbq-chicken-bacon-papadia", "Grilled BBQ Chicken Bacon Papadia", "1 Papadia with BBQ dipping sauce included", [840, 60, 85, 28, 2410, 4, 26]],
  [PAPA_JOHNS_PAPADIA_SOURCE, "grilled-buffalo-chicken-papadia", "Grilled Buffalo Chicken Papadia", "1 Papadia with ranch dipping sauce included", [920, 63, 80, 39, 2860, 4, 9]],
  [PAPA_JOHNS_PAPADIA_SOURCE, "meatball-pepperoni-papadia", "Meatball Pepperoni Papadia", "1 Papadia with pizza dipping sauce included", [940, 42, 79, 49, 2390, 4, 8]],
  [PAPA_JOHNS_PAPADIA_SOURCE, "italian-papadia", "Italian Papadia", "1 Papadia with pizza dipping sauce included", [940, 38, 76, 53, 2670, 4, 8]],
  [PAPA_JOHNS_SANDWICH_SOURCE, "philly-cheesesteak-sandwich", "Philly Cheesesteak Sandwich", "1 sandwich", [790, 39, 73, 37, 2500, 1, 8]],
  [PAPA_JOHNS_SANDWICH_SOURCE, "italian-chicken-bacon-ranch-sandwich", "Italian Chicken Bacon Ranch Sandwich", "1 sandwich; unpublished fiber remains unknown", [780, 52, 71, 34, 2770, null, 7]],
  [PAPA_JOHNS_SANDWICH_SOURCE, "steak-mushroom-sandwich", "Steak & Mushroom Sandwich", "1 sandwich", [820, 41, 74, 41, 2690, 0, 8]],
  [PAPA_JOHNS_SIDES_SOURCE, "cheesy-garlic-bread", "Cheesy Garlic Bread", "1 of 6 pieces; pizza dipping sauce excluded and loggable separately", [140, 6, 12, 8, 460, 0, 1]],
  [PAPA_JOHNS_SIDES_SOURCE, "garlic-knots", "Garlic Knots", "1 knot from an 8-piece order; pizza dipping sauce excluded", [110, 2, 14, 4.5, 260, 0, 1]],
  [PAPA_JOHNS_DESSERT_SOURCE, "cinnamon-pullaparts", "Cinnamon Pullaparts", "1 complete tray", [1960, 19, 264, 94, 1660, 8, 150]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "parmesan-cheese-packet", "Parmesan Cheese Packet", "1 packet", [15, 1, 0, 1, 35, 0, 0]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "crushed-red-pepper-packet", "Crushed Red Pepper Packet", "1 packet", [0, 0, 0, 0, 0, 0, 0]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "special-seasoning-packet", "Special Seasoning Packet", "1 packet", [5, 0, 1, 0, 420, 0, 0]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "pepperoncini", "Pepperoncini", "10 g serving", [0, 0, 0, 0, 140, 0, 4]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "anchovies", "Anchovies", "14 g serving", [30, 4, 0, 1.5, 750, 0, 0]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "banana-peppers", "Banana Peppers", "14 g serving", [5, 0, 1, 0, 200, 0, 0]],
  [PAPA_JOHNS_EXTRAS_SOURCE, "jalapeno-peppers", "Jalapeño Peppers", "14 g serving", [5, 0, 1, 0, 105, 0, 0]],
];
const papaJohnsSideRows = [
  ["bacon-cheesy-burger-papa-bites", "Bacon Cheesy Burger Papa Bites", 8, [100, 4, 10, 5, 290, 0, 1]],
  ["calzones-papa-bites", "Calzones Papa Bites", 8, [110, 4, 10, 6, 280, 0, 1]],
  ["chicken-parmesan-papa-bites", "Chicken Parmesan Papa Bites", 8, [110, 6, 10, 4.5, 280, 0, 1]],
  ["jalapeno-papa-bites", "Jalapeño Papa Bites", 8, [80, 3, 10, 3, 220, 0, 1]],
  ["oreo-cookie-papa-bites", "OREO Cookie Papa Bites", 8, [80, 2, 13, 2, 110, 0, 4], PAPA_JOHNS_DESSERT_SOURCE],
  ["garlic-knots-order", "Garlic Knots Order", 8, [110, 2, 14, 4.5, 260, 0, 1]],
];
const papaJohnsStickRows = [
  ["cheesesticks", "Cheesesticks", [["10-inch", "1 stick from 10-inch, 14-stick order", 14, [90, 3, 10, 4, 210, 0, 1]], ["12-inch", "1 stick from 12-inch, 16-stick order", 16, [110, 4, 13, 5, 260, 1, 1]]]],
  ["bacon-cheesesticks", "Bacon Cheesesticks", [["10-inch", "1 stick from 10-inch, 14-stick order", 14, [110, 4, 11, 5, 260, 0, 1]], ["12-inch", "1 stick from 12-inch, 16-stick order", 16, [130, 5, 13, 6, 330, 1, 1]]]],
  ["tuscan-six-cheese-cheesesticks", "Tuscan 6-Cheese Cheesesticks", [["10-inch", "1 stick from 10-inch, 14-stick order", 14, [110, 4, 11, 5, 250, 0, 1]], ["12-inch", "1 stick from 12-inch, 16-stick order", 16, [130, 5, 13, 6, 310, 1, 1]]]],
  ["breadsticks", "Breadsticks", [["12-inch", "1 stick from 12-inch, 8-stick order", 8, [130, 4, 24, 2, 240, 1, 2]], ["14-inch", "1 stick from 14-inch, 10-stick order", 10, [150, 4, 27, 2, 270, 1, 2]]]],
  ["garlic-parmesan-breadsticks", "Garlic Parmesan Breadsticks", [["12-inch", "1 stick from 12-inch, 8-stick order", 8, [160, 4, 24, 5, 340, 1, 2]], ["14-inch", "1 stick from 14-inch, 10-stick order", 10, [170, 4, 27, 5, 360, 1, 2]]]],
];
const papaJohnsDessertRows = [
  ["salted-caramel-blondie", "Salted Caramel Blondie", 8, [200, 2, 26, 10, 170, null, 15]],
  ["chocolate-chip-cookie", "Chocolate Chip Cookie", 8, [190, 2, 26, 9, 105, 1, 18]],
  ["double-chocolate-chip-brownie", "Double Chocolate Chip Brownie", 9, [240, 2, 34, 12, 70, 1, 23]],
];
const papaJohnsDipRows = [
  ["cheesy-burger-sauce", "Cheesy Burger Sauce", [160, 0, 4, 16, 240, 0, 3]],
  ["doritos-cool-ranch-sauce", "Doritos Cool Ranch Sauce", [180, 1, 5, 18, 560, null, 1]],
  ["special-zesty-sauce", "Special Zesty Sauce", [150, 0, 0, 17, 310, 0, 0]],
  ["special-garlic-sauce", "Special Garlic Sauce", [140, 0, 2, null, 350, 0, 1]],
  ["pizza-sauce", "Pizza Dipping Sauce", [20, 0, 3, 1, 230, 0, 1]],
  ["cheese-sauce", "Cheese Sauce", [40, 1, 2, 3.5, 160, 0, 0]],
  ["honey-mustard-sauce", "Honey Mustard Sauce", [150, 0, 5, 15, 120, 0, 4]],
  ["bbq-sauce", "BBQ Sauce", [45, 0, 11, 0, 240, 0, 10]],
  ["buffalo-sauce", "Buffalo Sauce", [15, 0, 3, 0.5, 900, 1, 2]],
  ["ranch-sauce", "Ranch Sauce", [100, 1, 2, 10, 240, 0, 1]],
  ["blue-cheese-sauce", "Blue Cheese Sauce", [160, 1, 1, 16, 250, 0, 1]],
  ["cream-cheese-icing", "Cream Cheese Icing", [150, 1, 32, 2.5, 85, 0, 31]],
  ["rootin-tootin-ranch", "Rootin' Tootin' Ranch", [100, 0, 2, 10, 240, null, 1]],
];
const papaJohnsWingRows = [
  ["unsauced", "Unsauced", [[10, [590, 49, 41, 26, 1930, 2, 1]], [15, [890, 74, 62, 38, 2900, 2, 2]], [30, [1910, 159, 133, 83, 6240, 5, 3]]], [[8, [810, 66, 4, 57, 1460, 0, 0]], [16, [1620, 133, 8, 113, 2920, 0, 1]], [24, [2430, 199, 12, 170, 4380, 0, 1]], [32, [3240, 265, 16, 226, 5830, 0, 1]], [50, [5060, 415, 25, 353, 9120, 0, 2]]]],
  ["buffalo", "Buffalo", [[10, [630, 50, 44, 29, 2840, 2, 3]], [15, [1110, 87, 77, 50, 4930, 3, 5]], [30, [1890, 149, 132, 85, 8520, 1, 8]]], [[8, [840, 67, 8, 58, 2920, 1, 3]], [16, [1670, 133, 16, 115, 5840, 2, 6]], [24, [2510, 200, 24, 173, 8770, 3, 9]], [32, [3340, 267, 33, 231, 11690, 4, 12]], [50, [5220, 417, 51, 360, 18260, 6, 18]]]],
  ["bbq", "BBQ", [[10, [640, 49, 54, 26, 2190, 1, 27]], [15, [1130, 85, 99, 44, 2890, 3, 59]], [30, [1920, 148, 160, 77, 6530, 5, 78]]], [[8, [880, 67, 20, 57, 1940, 1, 14]], [16, [1750, 134, 40, 114, 3880, 1, 28]], [24, [2630, 200, 60, 170, 5830, 2, 43]], [32, [3500, 267, 80, 227, 7770, 2, 57]], [50, [5470, 418, 125, 355, 12140, 4, 89]]]],
  ["garlic-parmesan", "Garlic Parmesan", [[10, [680, 50, 42, 35, 2250, 2, 1]], [15, [1070, 76, 63, 58, 3550, 2, 2]], [30, [2170, 151, 126, 119, 7230, 5, 3]]], [[8, [1040, 68, 6, 81, 2290, 0, 0]], [16, [2080, 137, 11, 162, 4580, 1, 1]], [24, [3120, 205, 17, 243, 6870, 1, 1]], [32, [4160, 273, 23, 324, 9160, 1, 1]], [50, [6500, 427, 35, 507, 14310, 2, 2]]]],
  ["honey-chipotle", "Honey Chipotle", [[10, [630, 49, 52, 26, 2100, 2, 11]], [15, [990, 74, 86, 38, 3270, 2, 24]], [30, [1940, 148, 164, 77, 6410, 5, 40]]], [[8, [900, 67, 27, 57, 1810, 1, 21]], [16, [1800, 133, 55, 113, 3620, 1, 42]], [24, [2710, 200, 82, 170, 5430, 2, 64]], [32, [3610, 267, 109, 227, 7240, 2, 85]], [50, [5640, 417, 171, 354, 11320, 4, 132]]]],
  ["hot-lemon-pepper", "Hot Lemon Pepper", [[10, [600, 47, 43, 27, 2830, 2, 3]], [15, [950, 75, 68, 43, 4580, 2, 4]], [30, [1810, 142, 128, 82, 8540, 5, 8]]], []],
];
const papaJohnsFoods = [
  ...papaJohnsPizzaFoods,
  ...papaJohnsFlatRows.map(([sourceUrl, id, name, description, values]) => papaJohnsFood(sourceUrl, id, name, description, ph(...values))),
  ...papaJohnsSideRows.map(([id, name, count, values, sourceUrl = PAPA_JOHNS_SIDES_SOURCE]) => {
    const unit = ph(...values);
    return papaJohnsFood(sourceUrl, id, name, `Choose one published piece or a calculated complete ${count}-piece order; separately served dipping sauce is excluded`, null, [
      papaJohnsOption(sourceUrl, `${id}:piece`, `1 ${name.replace(/ Papa Bites| Order/, "").toLowerCase()} piece`, unit),
      papaJohnsOption(sourceUrl, `${id}:order`, `Complete ${count}-piece order; calculated from the published per-piece serving`, scalePublished(unit, count), count),
    ]);
  }),
  ...papaJohnsStickRows.map(([id, name, sizes]) => papaJohnsFood(PAPA_JOHNS_SIDES_SOURCE, id, name, "Choose a published per-stick size or a calculated complete order", null, sizes.flatMap(([sizeId, description, count, values]) => {
    const unit = ph(...values);
    return [
      papaJohnsOption(PAPA_JOHNS_SIDES_SOURCE, `${id}:${sizeId}:stick`, description, unit),
      papaJohnsOption(PAPA_JOHNS_SIDES_SOURCE, `${id}:${sizeId}:order`, `Complete ${count}-stick ${sizeId} order; calculated from the published per-stick serving`, scalePublished(unit, count), count),
    ];
  }))),
  ...papaJohnsDessertRows.map(([id, name, count, values]) => {
    const unit = ph(...values);
    return papaJohnsFood(PAPA_JOHNS_DESSERT_SOURCE, id, name, "Choose one published piece or the calculated complete order", null, [
      papaJohnsOption(PAPA_JOHNS_DESSERT_SOURCE, `${id}:piece`, `1 piece (${count} pieces per order)`, unit),
      papaJohnsOption(PAPA_JOHNS_DESSERT_SOURCE, `${id}:order`, `Complete ${count}-piece order; calculated from the published per-piece serving`, scalePublished(unit, count), count),
    ]);
  }),
  ...papaJohnsDipRows.map(([id, name, values]) => papaJohnsFood(PAPA_JOHNS_DIPS_SOURCE, id, name, "1 separately listed dipping cup", ph(...values))),
  ...papaJohnsWingRows.map(([id, flavor, boneless, boneIn]) => papaJohnsFood(PAPA_JOHNS_WINGS_SOURCE, `${id}-wings`, `${flavor} Wings`, "Named toss sauce is included; separately selected dipping cup is excluded and loggable separately", null, [
    ...boneless.map(([count, values]) => papaJohnsOption(PAPA_JOHNS_WINGS_SOURCE, `${id}-wings:boneless-${count}`, `${count} boneless wings with ${flavor} flavor included`, ph(...values), count)),
    ...boneIn.map(([count, values]) => papaJohnsOption(PAPA_JOHNS_WINGS_SOURCE, `${id}-wings:bone-in-${count}`, `${count} bone-in wings with ${flavor} flavor included`, ph(...values), count)),
  ], [`Papa Johns ${flavor} boneless wings`, `Papa Johns ${flavor} bone in wings`])),
];

const littleCaesars = { id: "little-caesars", name: "Little Caesars" };
const LITTLE_CAESARS_SOURCE = "https://littlecaesars.com/static/usnutritionguide.pdf";
const LITTLE_CAESARS_REFERENCE = "Little Caesars official U.S. Nutrition Guide, ©2026 LCE; values are for the named whole product or published order. Large round, thin-crust, and Detroit-style pizzas use the standard published 8-slice cut; accessed September 10, 2026.";
const littleCaesarsFood = (id, name, description, nutrients, servingOptions, aliases, sourceReference = LITTLE_CAESARS_REFERENCE) => menuFood(
  littleCaesars, LITTLE_CAESARS_SOURCE, sourceReference, id, name, description, nutrients, servingOptions,
  [`Little Caesar's ${name}`, `Little Caesars ${name}`, ...(aliases || [])]
);
const littleCaesarsOption = (id, description, nutrients, amount = 1, sourceReference = LITTLE_CAESARS_REFERENCE) => expansionMenuOption(
  littleCaesars, LITTLE_CAESARS_SOURCE, sourceReference, id, description, nutrients, amount
);
const littleCaesarsPizzaRows = [
  ["classic-cheese-pizza", "Classic Cheese Pizza", "14-inch large round classic", [1950, 95, 248, 65, 3740, 12, 17]],
  ["classic-pepperoni-pizza", "Classic Pepperoni Pizza", "14-inch large round classic", [2300, 109, 250, 97, 5050, 13, 19]],
  ["classic-italian-sausage-pizza", "Classic Italian Sausage Pizza", "14-inch large round classic", [2270, 111, 255, 91, 4480, 13, 17]],
  ["extramostbestest-cheese-pizza", "ExtraMostBestest Cheese Pizza", "14-inch large round", [2220, 117, 252, 84, 4430, 13, 17]],
  ["extramostbestest-pepperoni-pizza", "ExtraMostBestest Pepperoni Pizza", "14-inch large round", [2500, 122, 252, 113, 5640, 13, 19]],
  ["extramostbestest-italian-sausage-pizza", "ExtraMostBestest Italian Sausage Pizza", "14-inch large round", [2660, 129, 252, 128, 5680, 13, 19]],
  ["five-meat-feast-pizza", "5 Meat Feast Pizza", "14-inch large round specialty", [2830, 139, 252, 142, 7120, 13, 20]],
  ["ultimate-supreme-pizza", "Ultimate Supreme Pizza", "14-inch large round specialty", [2500, 118, 259, 112, 5780, 15, 23]],
  ["three-meat-treat-pizza", "3 Meat Treat Pizza", "14-inch large round specialty", [2860, 135, 252, 147, 6590, 13, 20]],
  ["hula-hawaiian-pizza", "Hula Hawaiian Pizza", "14-inch large round specialty", [2180, 121, 272, 70, 5570, 13, 35]],
  ["veggie-pizza", "Veggie Pizza", "14-inch large round specialty", [2240, 100, 266, 84, 5430, 20, 25]],
  ["stuffed-crust-pepperoni-pizza", "Stuffed Crust Pepperoni Pizza", "14-inch large stuffed crust", [2980, 144, 259, 153, 7040, 13, 20]],
  ["pretzel-crust-pepperoni-pizza-pizza-sauce", "Pretzel Crust Pepperoni Pizza with Pizza Sauce", "14-inch large pretzel crust with pizza sauce", [2080, 91, 240, 85, 10500, 11, 14]],
  ["pretzel-crust-cheese-pizza-cheese-sauce", "Pretzel Crust Cheese Pizza with Cheese Sauce", "14-inch large pretzel crust with cheese sauce", [1940, 85, 243, 71, 10080, 9, 12]],
  ["pretzel-crust-pepperoni-pizza-cheese-sauce", "Pretzel Crust Pepperoni Pizza with Cheese Sauce", "14-inch large pretzel crust with cheese sauce", [2190, 94, 244, 93, 10980, 9, 13]],
  ["detroit-style-deep-dish-cheese-pizza", "Detroit-Style Deep Dish Cheese Pizza", "large Detroit-style deep dish", [2500, 118, 317, 85, 4230, 16, 19]],
  ["detroit-style-deep-dish-pepperoni-pizza", "Detroit-Style Deep Dish Pepperoni Pizza", "large Detroit-style deep dish", [2770, 129, 319, 111, 5280, 16, 20]],
  ["detroit-style-deep-dish-italian-sausage-pizza", "Detroit-Style Deep Dish Italian Sausage Pizza", "large Detroit-style deep dish", [2820, 133, 319, 114, 5130, 16, 20]],
  ["detroit-style-deep-dish-ultimate-supreme-pizza", "Detroit-Style Deep Dish Ultimate Supreme Pizza", "large Detroit-style deep dish specialty", [3050, 141, 332, 130, 6270, 20, 27]],
  ["detroit-style-deep-dish-three-meat-treat-pizza", "Detroit-Style Deep Dish 3 Meat Treat Pizza", "large Detroit-style deep dish specialty", [3480, 159, 321, 175, 7240, 16, 22]],
  ["detroit-style-deep-dish-hula-hawaiian-pizza", "Detroit-Style Deep Dish Hula Hawaiian Pizza", "large Detroit-style deep dish specialty", [2690, 137, 341, 88, 5610, 17, 37]],
  ["detroit-style-deep-dish-veggie-pizza", "Detroit-Style Deep Dish Veggie Pizza", "large Detroit-style deep dish specialty", [2730, 123, 333, 99, 5760, 22, 26]],
  ["detroit-style-deep-dish-five-meat-feast-pizza", "Detroit-Style Deep Dish 5 Meat Feast Pizza", "large Detroit-style deep dish specialty", [3500, 171, 322, 172, 8140, 16, 23]],
  ["thin-crust-cheese-pizza", "Thin Crust Cheese Pizza", "14-inch large thin crust", [1980, 99, 150, 109, 3390, 10, 3]],
  ["thin-crust-pepperoni-pizza", "Thin Crust Pepperoni Pizza", "14-inch large thin crust", [2130, 94, 148, 128, 4270, 9, 5]],
];
const littleCaesarsPizzaFoods = littleCaesarsPizzaRows.map(([id, name, configuration, values]) => {
  const whole = menuPublished(...values);
  const slice = scalePublished(whole, 1 / 8);
  return littleCaesarsFood(id, name, `Choose a calculated slice or the published whole ${configuration} pizza`, null, [
    littleCaesarsOption(`${id}:slice`, `1 slice — ${configuration} ${name} (8 slices per pizza; calculated from published whole-pizza nutrition)`, slice),
    littleCaesarsOption(`${id}:whole`, `Whole ${configuration} ${name} (8 slices; nutrition published for the whole pizza)`, whole),
  ]);
});
const littleCaesarsFlatRows = [
  ["slices-n-stix", "Slices-N-Stix", "1 complete hybrid pizza-and-cheese-sticks product; published whole-item nutrition", [2300,107,253,97,5220,13,20]],
  ["slices-n-stix-bacon", "Slices-N-Stix Bacon", "1 complete hybrid pizza-and-bacon-cheese-sticks product; published whole-item nutrition", [2980,116,252,115,5560,13,19]],
  ["slices-n-stix-jalapeno", "Slices-N-Stix Jalapeño", "1 complete hybrid pizza-and-jalapeño-cheese-sticks product; published whole-item nutrition", [2330,107,255,99,6000,15,20]],
  ["crazy-bread", "Crazy Bread", "Complete 8-piece order; dipping sauce excluded", [800, 25, 128, 22, 1290, 5, 6]],
  ["crazy-combo", "Crazy Combo", "8 Crazy Bread pieces with 1 Crazy Sauce cup included", [840, 26, 135, 22, 1860, 6, 10]],
  ["crazy-sauce", "Crazy Sauce", "1 separately listed sauce cup", [30, 1, 7, 0, 570, 2, 4]],
  ["italian-cheese-bread", "Italian Cheese Bread", "Complete 10-piece order; dipping sauce excluded", [1340, 59, 156, 54, 2250, 7, 8]],
  ["pepperoni-cheese-bread", "Pepperoni Cheese Bread", "Complete 10-piece order; dipping sauce excluded", [1520, 66, 155, 71, 2840, 7, 7]],
  ["zesty-cheese-bread", "Zesty Cheese Bread", "Complete 10-piece participating-location order; dipping sauce excluded", [1490, 55, 158, 71, 2540, 7, 10]],
  ["stuffed-crazy-bread-combo", "Stuffed Crazy Bread Combo", "3 Stuffed Crazy Bread pieces with 1 Crazy Sauce cup included", [980, 36, 126, 38, 2200, 6, 10]],
  ["pepperoni-crazy-puffs", "Pepperoni Crazy Puffs", "Complete 4-piece order", [680, 34, 56, 36, 1520, 3, 4]],
  ["four-cheese-crazy-puffs", "4 Cheese Crazy Puffs", "Complete 4-piece order", [580, 30, 56, 26, 1230, 3, 3]],
  ["cookie-dough-brownie-mms", "Cookie Dough Brownie with M&M's Minis", "1 complete package", [840, 12, 96, 44, 300, 4, 68]],
  ["cheezy-jalapeno-caesar-dip", "Cheezy Jalapeño Caesar Dip", "1 dip cup", [210, 1, 3, 21, 460, 0, 2]],
  ["ranch-caesar-dip", "Ranch Caesar Dip", "1 dip cup", [230, 2, 4, 23, 480, 0, 3]],
  ["buffalo-ranch-caesar-dip", "Buffalo Ranch Caesar Dip", "1 dip cup", [230, 1, 4, 23, 580, 0, 3]],
  ["butter-garlic-caesar-dip", "Butter Garlic Caesar Dip", "1 dip cup", [370, 0, 0, 42, 330, 0, 0]],
  ["cheddar-cheese-sauce", "Cheddar Cheese Sauce", "1 sauce cup", [110, 4, 7, 8, 770, 0, 2]],
];
const littleCaesarsWingRows = [
  ["oven-roasted-caesar-wings", "Oven Roasted Caesar Wings", [510, 47, 3, 35, 1740, null, 0]],
  ["buffalo-caesar-wings", "Buffalo Caesar Wings", [520, 47, 7, 35, 3330, null, 0]],
  ["bbq-caesar-wings", "BBQ Caesar Wings", [620, 48, 32, 35, 2300, 0, 24]],
  ["garlic-parmesan-caesar-wings", "Garlic Parmesan Caesar Wings", [670, 49, 5, 51, 2510, 0, 0]],
];
const littleCaesarsFoods = [
  ...littleCaesarsPizzaFoods,
  ...littleCaesarsFlatRows.map(([id, name, description, values]) => littleCaesarsFood(id, name, description, menuPublished(...values))),
  ...littleCaesarsWingRows.map(([id, name, values]) => littleCaesarsFood(id, name, "8 wings with named preparation or sauce included; separate dip excluded", menuPublished(...values), undefined, ["Little Caesars wings"])),
];

const hideaway = { id: "hideaway-pizza", name: "Hideaway Pizza" };
const HIDEAWAY_SOURCE = "https://www.hideawaypizza.com/s/Hideaway-Pizza-Nutrition-Information.pdf";
const HIDEAWAY_REFERENCE = "Hideaway Pizza official Nutrition Information guide, still published and linked from the U.S. menu; nutrients are for the named item and serving, accessed September 10, 2026. Menu and supplier availability can vary by location.";
const hideawayFood = (id, name, description, nutrients, servingOptions, aliases, sourceReference = HIDEAWAY_REFERENCE) => menuFood(
  hideaway, HIDEAWAY_SOURCE, sourceReference, id, name, description, nutrients, servingOptions,
  [`Hideaway ${name}`, ...(aliases || [])]
);
const hideawayOption = (id, description, nutrients, amount = 1, sourceReference = HIDEAWAY_REFERENCE) => expansionMenuOption(
  hideaway, HIDEAWAY_SOURCE, sourceReference, id, description, nutrients, amount
);
const hideawayPizzaRows = [
  ["third-street-special", "3rd Street Special", [[287,15,22,15,738,1,2],[345,18,28,17,844,1,3],[403,21,34,20,948,1,3]], [[368,15,33,20,862,1,4],[416,17,38,22,966,1,4],[457,18,40,24,1060,1,4]]],
  ["big-country", "Big Country", [[270,14,20,14,660,null,2],[330,18,26,17,780,null,3],[390,21,32,20,900,null,3]], [[310,13,25,18,740,null,3],[350,15,26,20,840,null,3],[420,18,33,24,970,null,4]]],
  ["chicken-florentine", "Chicken Florentine", [[220,10,19,11,400,null,1],[280,13,25,14,490,null,2],[350,16,30,17,590,null,2]], [[260,9,24,14,480,null,2],[290,11,25,17,550,null,2],[370,13,32,21,670,null,3]]],
  ["cimarron", "Cimarron", [[330,19,20,20,860,null,1],[400,22,27,23,1000,null,2],[490,27,33,28,1180,null,2]], [[380,17,26,23,940,null,2],[420,20,26,26,1060,null,2],[510,24,34,32,1250,null,3]]],
  ["da-bomb", "Da Bomb", [[220,11,21,10,500,null,3],[290,15,28,13,650,null,4],[350,18,33,16,750,null,4]], [[270,10,26,13,580,null,4],[300,12,28,16,700,null,5],[380,15,35,20,830,null,5]]],
  ["dermers-bbq-chicken", "Dermer's BBQ Chicken", [[180,10,24,5,430,null,6],[250,14,31,7,560,null,7],[300,17,36,9,640,null,7]], [[230,9,29,9,510,null,7],[260,12,31,10,620,null,8],[320,14,37,13,720,null,8]]],
  ["hideaway-special", "Hideaway Special", [[250,12,21,13,640,null,3],[310,15,28,15,750,1,3],[400,20,34,21,960,1,4]], [[300,11,26,17,720,null,3],[330,13,28,18,810,1,4],[430,17,35,25,1040,1,5]]],
  ["hurricane", "Hurricane", [[210,12,21,9,540,null,3],[270,15,27,11,660,null,3],[320,17,33,13,730,null,4]], [[260,10,26,12,620,null,4],[280,12,27,14,720,null,4],[350,14,34,17,810,null,5]]],
  ["maui-magic", "Maui Magic", [[170,9,22,5,360,null,5],[230,12,28,7,450,null,5],[290,16,34,9,580,null,6]], [[220,8,27,9,440,null,6],[240,10,28,10,500,null,6],[310,13,36,13,650,null,7]]],
  ["paradise-pie", "Paradise Pie", [[240,13,19,12,470,null,2],[300,16,25,14,570,null,2],[350,19,30,17,660,null,2]], [[280,12,24,15,550,null,3],[310,14,25,17,620,null,3],[380,16,32,21,740,null,4]]],
  ["pepperonipalooza", "Pepperonipalooza", [[220,11,19,11,500,null,2],[320,16,25,16,730,null,2],[400,20,31,21,910,null,2]], [[270,10,24,14,580,null,3],[330,13,25,19,780,null,3],[420,17,32,25,990,null,4]]],
  ["pollinator", "Pollinator", [[243,11,21,12,525,null,5],[313,14,28,16,617,null,6],[374,16,34,18,734,null,6]], [[327,10,33,17,650,null,6],[384,12,37,21,739,null,7],[429,14,40,23,846,null,8]]],
  ["sicilian", "Sicilian", [[330,16,21,21,840,null,2],[410,20,27,25,990,null,2],[480,24,33,28,1140,1,3]], [[380,15,26,24,920,null,3],[430,18,27,28,1050,null,3],[510,21,35,32,1220,1,4]]],
  ["the-atw", "The ATW", [[230,10,21,12,520,null,2],[290,13,27,14,630,null,3],[350,16,33,17,740,null,3]], [[280,9,26,15,600,null,3],[300,10,27,17,690,null,4],[380,13,34,21,820,null,4]]],
  ["the-boz", "The Boz", [[270,13,20,15,690,null,2],[330,16,27,17,820,null,3],[390,19,33,20,920,null,3]], [[310,11,26,18,770,null,3],[340,13,27,20,870,null,4],[410,16,34,24,990,null,4]]],
  ["the-capone", "The Capone", [[290,14,21,17,740,null,2],[360,17,28,20,860,null,3],[430,20,33,23,980,null,3]], [[340,12,26,20,820,null,3],[370,14,28,23,920,null,3],[450,17,35,27,1050,null,4]]],
  ["the-xtreme", "The Xtreme", [[320,14,22,19,1120,null,2],[380,18,29,21,1270,null,3],[450,21,35,25,1410,1,3]], [[360,13,27,22,1200,null,3],[390,15,29,24,1320,null,4],[470,18,36,29,1490,1,4]]],
];
const hideawayCalculatedPizzaRows = [
  ["cheese-pizza", "Cheese Pizza", [[155,8,18,4.5,260,null,null],[210,10,26,6.5,360,null,null],[260,13,31,8,430,null,null]], [[195,6,23,8,340,null,null],[220,7,25,9.5,415,null,null],[280,10,32,12,510,null,null]]],
  ["pepperoni-pizza", "Pepperoni Pizza", [[190,10,18,8,390,null,null],[255,12,26,10.5,520,null,null],[310,15,31,13,620,null,null]], [[230,8,23,11.5,470,null,null],[265,9,25,13.5,575,null,null],[330,12,32,17,700,null,null]]],
];
const HIDEAWAY_CALCULATED_PIZZA_REFERENCE = `${HIDEAWAY_REFERENCE} Cheese and pepperoni configurations are calculated per slice from the guide's matching crust, Hideaway Red Sauce, mozzarella, and (for pepperoni) pepperoni component rows; unpublished component nutrients remain unknown.`;
const hideawayCalculatedPizzaFoods = hideawayCalculatedPizzaRows.map(([id, name, handTossed, thin]) => hideawayFood(
  id,
  name,
  `Calculated standard build with Hideaway Red Sauce and mozzarella${id === "pepperoni-pizza" ? " plus pepperoni" : ""}; choose a size and crust. No whole-pizza option is offered because the source does not publish slice counts.`,
  null,
  [
    ...[["small-10", "10-inch Small"], ["medium-13", "13-inch Medium"], ["large-16", "16-inch Large"]].map(([size, label], index) => hideawayOption(`${id}:hand-tossed-${size}`, `1 slice — ${label} hand-tossed ${name}; calculated standard component configuration`, menuPublished(...handTossed[index]), 1, HIDEAWAY_CALCULATED_PIZZA_REFERENCE)),
    ...[["small-10", "10-inch Small"], ["medium-13", "13-inch Medium"], ["large-16", "16-inch Large"]].map(([size, label], index) => hideawayOption(`${id}:thin-${size}`, `1 slice — ${label} thin-crust ${name}; calculated standard component configuration`, menuPublished(...thin[index]), 1, HIDEAWAY_CALCULATED_PIZZA_REFERENCE)),
  ],
  undefined,
  HIDEAWAY_CALCULATED_PIZZA_REFERENCE
));
const hideawayPizzaFoods = hideawayPizzaRows.map(([id, name, handTossed, thin]) => hideawayFood(
  id,
  name,
  `Standard specialty recipe; choose a published per-slice size and crust. Hideaway publishes no dependable slice count, so no whole-pizza calculation is offered.`,
  null,
  [
    ...[["small-10", "10-inch Small"], ["medium-13", "13-inch Medium"], ["large-16", "16-inch Large"]].map(([size, label], index) => hideawayOption(`${id}:hand-tossed-${size}`, `1 slice — ${label} hand-tossed ${name}`, menuPublished(...handTossed[index]))),
    ...[["small-10", "10-inch Small"], ["medium-13", "13-inch Medium"], ["large-16", "16-inch Large"]].map(([size, label], index) => hideawayOption(`${id}:thin-${size}`, `1 slice — ${label} thin-crust ${name}`, menuPublished(...thin[index]))),
  ]
));
const hideawayFlatRows = [
  ["fifty-fifty", "50/50", "Complete starter with fried mushrooms, 5 mozzarella sticks, Hideaway Red Sauce, and Hideaway Ranch included", [1430,38,85,111,2040,5,14]],
  ["baked-cheesy-shrooms", "Baked Cheesy Shrooms", "1 complete order", [410,27,12,31,770,3,7]],
  ["fried-mozzarella-sticks", "Fried Mozzarella Sticks", "Complete order with marinara and ranch included", [1380,41,70,109,2720,1,12]],
  ["fried-mushrooms", "Famous Fried Mushrooms", "Choose a published half or full order; marinara and ranch included", null, [["half", "Half order with dips included", [430,9,29,33,320,3,5]],["full", "Full order with dips included", [860,17,57,66,650,6,11]]]],
  ["fried-pickles", "Fried Pickles", "Complete order with published dipping sauce included", [1170,12,77,90,3690,6,11]],
  ["fried-ravioli", "Fried Ravioli", "Complete order with marinara and ranch included", [950,27,84,57,2410,7,17]],
  ["garlic-cheesy-bread", "Garlic Cheesy Bread", "Complete order with Hideaway Red Sauce included", [1220,48,80,81,2690,5,9]],
  ["garlic-bread", "Garlic Bread", "Complete order with Hideaway Red Sauce included", [890,23,77,56,1870,5,8]],
  ["garlic-knots", "Garlic Knots", "Complete order with marinara included", [1000,30,115,49,2340,10,21]],
  ["meatballs", "Meatballs", "8 meatballs over marinara", [900,59,33,63,2700,8,11]],
  ["traditional-wings", "Traditional Wings", "No sauce or dressing; add separately", null, [["6-piece", "6 traditional wings; no sauce or dressing", [750,42,6,61,910,null,null],6],["12-piece", "12 traditional wings; no sauce or dressing", [1510,84,13,121,1820,null,null],12],["18-piece", "18 traditional wings; no sauce or dressing", [2270,127,21,182,2770,1,2],18]]],
  ["boneless-wings", "Boneless Wings", "No sauce or dressing; add separately", null, [["10-piece", "10 boneless wings; no sauce or dressing", [1830,97,97,120,4530,7,null],10],["20-piece", "20 boneless wings; no sauce or dressing", [3660,193,193,239,9060,15,null],20]]],
  ["blue-cheese-wedge", "Blue Cheese Wedge", "1 salad with named toppings and dressing included", [690,24,12,62,1820,3,7]],
  ["caesar-salad", "Caesar Salad", "Dressing included; chicken excluded", null, [["small", "Small Caesar Salad with dressing", [230,7,10,19,520,3,2]],["large", "Large Caesar Salad with dressing", [590,15,21,51,1310,4,5]]]],
  ["greek-salad", "Greek Salad", "Dressing included", null, [["small", "Small Greek Salad with dressing", [490,6,12,48,1910,4,5]],["large", "Large Greek Salad with dressing", [660,11,22,62,3060,8,9]]]],
  ["club-salad", "Club Salad", "1 complete salad with dressing", [560,44,15,36,1740,5,9]],
  ["cobb-salad", "Cobb Salad", "1 complete salad with dressing", [790,48,31,54,1870,7,8]],
  ["in-betweener-salad", "In-Betweener Salad", "1 complete salad with dressing", [520,23,25,33,2810,7,6]],
  ["just-a-beginner-salad", "Just-a-Beginner Salad", "1 salad; mozzarella and bacon add-on excluded", [130,2,12,7,750,4,3]],
  ["chicken-bacon-honey-mustard-sandwich", "Chicken Bacon Honey Mustard Sandwich", "1 sandwich with potato chips included", [1190,67,96,61,2480,4,40]],
  ["chicken-bacon-ranch-sandwich", "Chicken Bacon Ranch Sandwich", "1 sandwich with potato chips included", [1200,68,82,68,2210,4,26]],
  ["chicken-parmesan-sandwich", "Chicken Parmesan Sandwich", "1 sandwich with potato chips included", [1040,53,97,51,2190,6,31]],
  ["dagwood-sandwich", "Dagwood Sandwich", "1 white-bread sandwich with potato chips included", [980,51,45,67,3570,4,8]],
  ["ham-and-cheese-sandwich", "Ham 'n Cheese Sandwich", "1 white-bread sandwich with potato chips included", [1150,43,45,89,3620,4,8]],
  ["italian-sub", "Italian Sub", "1 white-bread sandwich with potato chips included", [1340,53,46,103,4670,5,7]],
  ["meatball-hero", "Meatball Hero", "1 white-bread sandwich with potato chips included", [920,44,61,58,2480,7,12]],
  ["turkey-bacon-club", "Turkey Bacon Club", "1 white-bread sandwich with potato chips included", [930,61,33,62,3840,2,8]],
  ["turkey-melt", "Turkey Melt", "1 white-bread sandwich with potato chips included", [910,41,45,64,2870,4,7]],
  ["alfredo-deluxe", "Alfredo Deluxe", "1 pasta order with garlic bread included", [1780,76,120,112,3920,3,10]],
  ["bacn-chickn-mac-and-cheese", "Bac'n Chick'n Mac 'n' Cheese", "1 pasta order with garlic bread included", [3300,138,482,100,7650,15,26]],
  ["big-kid-mac-and-cheese", "Big Kid Mac 'N' Cheese", "1 pasta order with garlic bread included", [1820,90,139,105,5460,1,14]],
  ["chicken-parmesan-pasta", "Chicken Parmesan Pasta", "1 pasta order with garlic bread included", [1510,69,155,69,3190,10,33]],
  ["homemade-lasagna", "Homemade Lasagna", "1 pasta order with garlic bread included", [840,27,75,49,1890,5,18]],
  ["meatball-marinara-pasta", "Meatball Marinara Pasta", "1 pasta order with garlic bread included", [1360,51,140,68,2630,9,26]],
  ["pasta-paradise", "Pasta Paradise", "1 pasta order with garlic bread included", [1730,72,121,107,3450,4,10]],
  ["pesto-chicken-florentine-pasta", "Pesto Chicken Florentine Pasta", "1 pasta order with garlic bread included", [1670,54,115,104,3240,6,6]],
  ["plain-alfredo-pasta", "Plain Alfredo Pasta", "1 pasta order with garlic bread included", [1390,35,116,87,2140,3,8]],
  ["plain-marinara-pasta", "Plain Marinara Pasta", "1 pasta order with garlic bread included", [1100,33,133,49,1960,7,26]],
  ["bowl-of-ice-cream", "Bowl of Ice Cream", "1 bowl; syrup excluded", [220,5,25,14,70,null,21]],
  ["brownie", "Brownie", "1 brownie", [490,5,88,14,200,4,47]],
  ["chocolate-chunk-cookie", "Chocolate Chunk Hideaway Cookie", "1 complete 6-inch pan cookie", [980,13,123,49,790,4,76]],
  ["salted-caramel-crunch-cookie", "Salted Caramel Crunch Hideaway Cookie", "1 complete 6-inch pan cookie", [930,11,133,42,1190,null,85]],
  ["lemonade-pie", "Lemonade Pie", "Choose a published slice or whole pie", null, [["slice", "1 slice of Lemonade Pie", [320,2,37,17,170,null,23]],["whole", "Whole Lemonade Pie; published whole-pie nutrition", [4960,32,560,272,2720,null,368]]]],
  ["mudslide", "Mudslide", "1 complete dessert", [750,13,106,34,230,7,58]],
  ["root-beer-float", "Root Beer Float", "1 complete float", [260,5,35,14,75,null,31]],
  ["kids-chicken-bites", "Kids' Chicken Bites", "Kids' standalone food; no side", [1550,77,97,96,4530,6,16]],
  ["kids-corn-dog", "Kids' Corn Dog", "1 kids' corn dog; no side", [510,9,53,29,1630,null,26]],
  ["kids-cheese-pizza", "Kids' Cheese Pizza", "1 kids' pizza; no side", [560,20,63,25,1060,1,7]],
  ["kids-mac-and-cheese", "Kids' Mac-n-Cheese", "1 kids' portion; no side", [470,22,31,28,1680,null,2]],
  ["kids-alfredo-pasta", "Kids' Alfredo Pasta", "1 kids' portion; no side", [540,18,38,35,980,1,3]],
  ["kids-meatball-pasta", "Kids' Meatball Pasta", "1 kids' portion; no side", [390,18,43,17,750,3,8]],
];
const hideawayDressingRows = [
  ["balsamic-vinaigrette", "Balsamic Vinaigrette", [240,null,4,24,460,null,4]],
  ["blue-cheese-dressing", "Blue Cheese Dressing", [320,2,2,34,540,null,2]],
  ["caesar-dressing", "Caesar Dressing", [380,2,2,40,700,null,0]],
  ["creamy-italian-dressing", "Creamy Italian Dressing", [280,null,2,30,740,null,2]],
  ["greek-vinaigrette", "Greek Vinaigrette", [190,null,1,21,470,null,0]],
  ["hideaway-ranch", "Hideaway Ranch", [190,1,1,19,200,null,0]],
  ["honey-mustard-dressing", "Honey Mustard Dressing", [180,null,20,10,560,null,20]],
  ["house-italian-vinaigrette", "House Italian Vinaigrette", [220,0,1,24,80,null,0]],
  ["parmesan-peppercorn-dressing", "Parmesan Peppercorn Dressing", [300,2,4,32,500,null,4]],
  ["thousand-island-dressing", "Thousand Island Dressing", [280,null,8,26,500,null,8]],
];
const hideawayDrinkRows = [
  ["coffee", "Coffee", [0,0,null,0,5,null,null]],
  ["diet-pepsi", "Diet Pepsi", [0,null,null,null,70,null,null]],
  ["dr-pepper", "Dr Pepper", [270,null,73,null,110,null,70]],
  ["iced-tea", "Iced Tea", [5,null,2,null,20,null,null]],
  ["lemonade", "Lemonade", [280,null,74,null,290,null,74]],
  ["mountain-dew", "Mountain Dew", [300,null,80,null,95,null,80]],
  ["mug-root-beer", "Mug Root Beer", [280,null,72,null,40,null,72]],
  ["pepsi", "Pepsi", [280,null,77,null,55,null,77]],
  ["sweet-iced-tea", "Sweet Iced Tea", [130,null,33,null,20,null,31]],
  ["whole-milk", "Whole Milk", [220,12,17,12,160,null,19]],
];
const hideawayFoods = [
  ...hideawayCalculatedPizzaFoods,
  ...hideawayPizzaFoods,
  ...hideawayFlatRows.map(([id, name, description, values, options]) => hideawayFood(id, name, description, values ? menuPublished(...values) : null, options?.map(([optionId, optionDescription, optionValues, amount = 1]) => hideawayOption(`${id}:${optionId}`, optionDescription, menuPublished(...optionValues), amount)))),
  ...hideawayDressingRows.map(([id, name, values]) => hideawayFood(id, name, "2 fl oz separately listed dressing", menuPublished(...values))),
  ...hideawayDrinkRows.map(([id, name, values]) => hideawayFood(id, name, "1 published fountain or container serving; exact vessel size is not stated in the guide", menuPublished(...values), undefined, [`Hideaway Pizza ${name}`])),
];

const marcos = { id: "marcos-pizza", name: "Marco's Pizza" };
const MARCOS_SOURCE = "https://www.nutritionix.com/marcos-pizza/menu/premium";
const MARCOS_REFERENCE = "Marco's Pizza official-linked Nutritionix U.S. nutrition portal, last updated August 13, 2026; serving fractions and nutrients are for the named product, accessed September 10, 2026.";
const marcosFood = (id, name, description, nutrients, servingOptions, aliases, sourceReference = MARCOS_REFERENCE) => menuFood(
  marcos, MARCOS_SOURCE, sourceReference, id, name, description, nutrients, servingOptions,
  [`Marcos ${name}`, `Marco's ${name}`, ...(aliases || [])]
);
const marcosOption = (id, description, nutrients, amount = 1, sourceReference = MARCOS_REFERENCE) => expansionMenuOption(
  marcos, MARCOS_SOURCE, sourceReference, id, description, nutrients, amount
);
const marcosPizzaRows = [
  ["all-meat-pizza", "All Meat Pizza", [[320,14,25,16,870,null,2],[340,16,27,16,960,1,2],[450,21,36,21,1250,1,2],[390,18,32,18,1080,1,2]]],
  ["cheese-pizza", "Cheese Pizza", [[210,8,24,8,420,null,1],[220,8,26,8,440,null,2],[290,11,35,10,580,1,2],[250,9,31,9,500,1,2]]],
  ["chicken-fresco-pizza", "Chicken Fresco Pizza", [[260,12,26,11,570,1,2],[270,13,27,11,610,1,2],[370,17,37,15,820,2,3],[320,15,32,12,710,1,3]]],
  ["deluxe-pizza", "Deluxe Pizza", [[280,11,26,14,650,1,2],[300,11,27,14,700,1,2],[400,15,37,19,930,2,3],[340,13,33,16,800,1,2]]],
  ["garden-pizza", "Garden Pizza", [[230,9,26,9,490,1,2],[250,10,27,10,560,1,2],[340,13,37,12,760,2,3],[290,11,33,11,660,1,2]]],
  ["hawaiian-chicken-pizza", "Hawaiian Chicken Pizza", [[270,14,26,10,750,null,2],[290,15,28,11,830,1,3],[390,20,38,14,1090,1,4],[330,17,33,12,940,1,4]]],
  ["pepperoni-magnifico-pizza", "Pepperoni Magnifico Pizza", [[240,9,24,11,530,null,1],[260,9,26,12,590,null,2],[350,13,35,16,800,1,2],[310,11,31,14,720,1,2]]],
  ["sausage-magnifico-pizza", "Sausage Magnifico Pizza", [[280,11,25,15,550,null,1],[290,11,26,15,570,1,2],[390,14,36,20,760,1,2],[350,13,31,18,670,1,2]]],
  ["buffalo-chicken-pizza", "Buffalo Chicken Pizza", [[240,11,24,11,610,null,null],[260,13,26,12,680,null,null],[350,17,35,16,950,1,1],[300,15,31,13,830,1,null]]],
  ["the-philly-pizza", "The Philly Pizza", [[220,10,24,8,490,null,1],[230,11,26,9,540,null,1],[310,15,35,11,740,1,2],[270,13,31,9,620,1,1]]],
  ["triple-pepperoni-magnifico-pizza", "Triple Pepperoni Magnifico Pizza", [[290,10,24,15,680,null,1],[310,11,26,17,740,null,2],[430,15,35,23,1030,1,2],[380,14,31,21,930,1,2]]],
  ["ultimate-magnifico-pizza", "Ultimate Magnifico Pizza", [[310,11,25,17,640,null,1],[330,12,26,18,720,1,2],[450,16,36,25,970,1,2],[410,14,31,23,880,1,2]]],
  ["white-cheezy-pizza", "White Cheezy Pizza", [[250,10,25,12,540,null,1],[270,12,26,13,600,null,1],[360,15,36,17,800,1,2],[320,13,31,14,700,1,2]]],
];
const marcosPizzaConfigs = [["small-original", "10-inch Small Original Crust", 6],["medium-original", "12-inch Medium Original Crust", 8],["large-original", "14-inch Large Original Crust", 8],["extra-large-original", "16-inch XLarge Original Crust", 12]];
const marcosPizzaFoods = marcosPizzaRows.map(([id, name, rows]) => marcosFood(
  id, name, `Standard ${name}; choose a published original-crust slice or calculated whole pizza`, null,
  pizzaServingOptions(marcos, MARCOS_SOURCE, MARCOS_REFERENCE, id, marcosPizzaConfigs.map(([configId, description, slices], index) => [configId, `${description} ${name}`, slices, menuPublished(...rows[index])]))
));
const marcosFlatRows = [
  ["deluxe-pizza-bowl", "Deluxe Pizza Bowl", "1 published crustless pizza bowl", [560,25,14,39,1860,2,7]],
  ["garden-pizza-bowl", "Garden Pizza Bowl", "1 published crustless pizza bowl", [430,19,15,27,1440,2,7]],
  ["buffalo-chicken-pizza-bowl", "Buffalo Chicken Pizza Bowl", "1 published crustless pizza bowl", [460,32,7,33,1890,null,1]],
  ["philly-pizza-bowl", "Philly Pizza Bowl", "1 published crustless pizza bowl", [340,24,8,21,1380,null,3]],
  ["ultimate-magnifico-pizza-bowl", "Ultimate Magnifico Pizza Bowl", "1 published crustless pizza bowl", [850,40,13,61,2810,1,6]],
  ["ham-and-cheese-sub", "Ham & Cheese Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Ham & Cheese Sub", [710,42,37,28,2590,null,3]],["12-inch", "12-inch Ham & Cheese Sub", [1410,87,91,57,5280,1,7]]]],
  ["italiano-sub", "Italiano Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Italiano Sub", [740,38,36,36,2590,1,3]],["12-inch", "12-inch Italiano Sub", [1470,80,89,73,5270,2,5]]]],
  ["meatball-sub", "Meatball Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Meatball Sub", [700,35,37,17,1580,1,3]],["12-inch", "12-inch Meatball Sub", [1390,74,91,35,3260,2,7]]]],
  ["steak-and-cheese-sub", "Steak & Cheese Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Steak & Cheese Sub", [580,28,35,26,1560,0,2]],["12-inch", "12-inch Steak & Cheese Sub", [1150,58,87,53,3220,0,4]]]],
  ["turkey-club-sub", "Turkey Club Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Turkey Club Sub", [650,36,35,30,1800,0,2]],["12-inch", "12-inch Turkey Club Sub", [1310,74,86,61,3700,null,4]]]],
  ["veggie-sub", "Veggie Sub", "Choose a published complete sub size", null, [["6-inch", "6-inch Veggie Sub", [490,16,39,23,750,1,3]],["12-inch", "12-inch Veggie Sub", [970,36,95,46,1600,3,6]]]],
  ["chicken-classico-calzone", "Chicken Classico Calzone", "1 complete calzone", [1020,55,100,40,2630,4,4]],
  ["deluxe-calzone", "Deluxe Calzone", "1 complete calzone", [1080,43,99,54,2430,4,4]],
  ["pepperoni-calzone", "Pepperoni Calzone", "1 complete calzone", [950,36,95,42,2070,3,3]],
  ["chicken-bacon-ranch-pizzoli", "Chicken Bacon Ranch Pizzoli", "1 complete Pizzoli", [810,44,73,35,2070,3,2]],
  ["pepperoni-and-sausage-pizzoli", "Pepperoni & Sausage Pizzoli", "1 complete Pizzoli", [930,34,71,52,2100,2,2]],
  ["pepperoni-pizzoli", "Pepperoni Pizzoli", "1 complete Pizzoli", [810,29,70,42,1770,2,2]],
  ["cheezybread", "CheezyBread", "1 published piece; separately selected dipping sauce excluded", [80,3,12,3,130,0,0]],
  ["cheezybread-extra-cheese", "CheezyBread with Extra Cheese", "1 published piece; separately selected dipping sauce excluded", [90,3,12,3.5,160,0,0]],
  ["pepperoni-bread", "Pepperoni Bread", "1 published piece; separately selected dipping sauce excluded", [90,3,12,3.5,160,0,0]],
  ["chicken-dippers", "Chicken Dippers", "1 published chicken dipper; sauce excluded", [60,5,5,0,190,0,0]],
  ["cinnasquares", "CinnaSquares", "1 published square; icing excluded and loggable separately", [80,1,12,3,60,0,4]],
  ["meatball-bake", "Meatball Bake", "1 complete bake", [800,43,13,44,2450,2,6]],
  ["double-chocolate-brownie", "Double Chocolate Brownie", "1 published brownie serving", [340,5,53,14,180,2,34]],
];
const marcosSaladRows = [
  ["chicken-caesar-salad", "Chicken Caesar Salad", [["family", "Family Chicken Caesar Salad with published dressing included", [350,11,12,29,720,1,1]],["regular", "Regular Chicken Caesar Salad with published dressing included", [370,14,14,29,850,2,1]]]],
  ["garden-salad", "Garden Salad", [["family", "Family Garden Salad with published dressing included", [370,7,15,23,680,2,3]],["regular", "Regular Garden Salad with published dressing included", [390,8,17,24,740,2,4]]]],
  ["greek-salad", "Greek Salad", [["family", "Family Greek Salad with published dressing included", [320,5,6,29,980,2,3]],["regular", "Regular Greek Salad with published dressing included", [340,6,7,31,1110,2,3]]]],
  ["italian-chef-salad", "Italian Chef Salad", [["family", "Family Italian Chef Salad with published dressing included", [220,13,15,11,780,2,2]],["regular", "Regular Italian Chef Salad with published dressing included", [270,16,15,13,960,2,3]]]],
];
const marcosWingRows = [
  ["hot-wings", "Hot Wings", [[6,[440,23,10,38,1820,0,0]],[8,[580,30,13,49,2330,0,0]],[10,[720,38,16,62,2920,0,null]],[15,[1080,57,25,93,4370,0,null]]]],
  ["plain-wings", "Plain Wings", [[6,[370,23,10,28,920,0,0]],[8,[490,30,13,37,1230,0,0]],[10,[610,38,16,46,1530,0,null]],[15,[920,57,25,69,2300,0,null]]]],
  ["sweet-chili-wings", "Sweet Chili Wings", [[6,[440,23,28,28,920,0,16]],[8,[580,30,36,37,1230,0,20]],[10,[730,38,45,46,1530,0,25]],[15,[1090,57,67,69,2300,0,38]]]],
  ["tangy-bbq-wings", "Tangy BBQ Wings", [[6,[460,23,33,28,1300,0,21]],[8,[600,30,42,37,1690,0,26]],[10,[750,38,52,46,2110,0,32]],[15,[1180,57,92,69,3390,0,61]]]],
  ["garlic-parmesan-wings", "Garlic Parmesan Wings", [[8,[700,32,18,57,2070,0,2]],[10,[870,40,22,72,2590,0,2]],[15,[1300,59,33,107,3890,0,3]]]],
];
const marcosDipRows = [
  ["garlic-parmesan-dip", "Garlic Parmesan Dip", [260,2,5,26,1060,0,2]],
  ["jalapeno-ranch-dip", "Jalapeño Ranch Dip", [200,1,3,21,550,0,1], ["Marcos jalapeno ranch", "Marco's jalapeno ranch"]],
  ["hot-dip", "Hot Dip", [110,0,0,16,1380,0,0]],
  ["ranch-dip", "Ranch Dip", [200,0,2,22,320,0,0]],
  ["sweet-chili-dip", "Sweet Chili Dip", [110,0,28,0,0,0,24]],
  ["tangy-bbq-dip", "Tangy BBQ Dip", [110,0,28,0,440,0,25]],
];
const marcosDrinkRows = [
  ["brisk-raspberry-iced-tea", "Brisk Raspberry Iced Tea", "20 fl oz bottle", [120,0,31,0,135,0,31]],
  ["diet-dr-pepper", "Diet Dr Pepper", "20 fl oz bottle", [0,0,0,0,100,0,0]],
  ["diet-mtn-dew", "Diet Mtn Dew", "20 fl oz bottle; carbohydrate and sugar are published as less than 1 g and remain unknown", [10,0,null,0,85,0,null]],
  ["diet-pepsi", "Diet Pepsi", "20 fl oz bottle", [0,0,0,0,60,0,0]],
  ["dole-lemonade", "Dole Lemonade", "20 fl oz bottle", [270,0,70,0,390,0,69]],
  ["dole-strawberry-lemonade", "Dole Strawberry Lemonade", "20 fl oz bottle", [280,0,70,0,390,0,69]],
  ["dr-pepper", "Dr Pepper", "20 fl oz bottle", [250,0,66,0,100,0,64]],
  ["gatorade-cool-blue", "Gatorade Cool Blue", "20 fl oz bottle", [140,0,36,0,270,0,34]],
  ["gatorade-fruit-punch", "Gatorade Fruit Punch", "20 fl oz bottle", [140,0,36,0,270,0,34]],
  ["gatorade-glacier-freeze", "Gatorade Glacier Freeze", "20 fl oz bottle", [140,0,36,0,270,0,34]],
  ["lipton-iced-tea-lemon", "Lipton Iced Tea with Lemon", "20 fl oz bottle", [120,0,32,0,260,0,31]],
  ["mtn-dew", "Mtn Dew", "20 fl oz bottle", [290,0,77,0,105,0,77]],
  ["mtn-dew-code-red", "Mtn Dew Code Red", "20 fl oz bottle", [280,0,77,0,170,0,77]],
  ["mtn-dew-voltage", "Mtn Dew Voltage", "20 fl oz bottle", [290,0,76,0,105,0,76]],
  ["mug-root-beer", "Mug Root Beer", "20 fl oz bottle", [260,0,71,0,105,0,71]],
  ["ocean-spray-apple-juice", "Ocean Spray Apple Juice", "15.2 fl oz bottle", [210,1,51,0,20,0,48]],
  ["ocean-spray-orange-juice", "Ocean Spray Orange Juice", "15.2 fl oz bottle", [210,4,51,0,30,0,42]],
  ["orange-crush", "Orange Crush", "20 fl oz bottle", [270,0,72,0,120,0,71]],
  ["pepsi", "Pepsi", "20 fl oz bottle", [250,0,69,0,55,0,69]],
  ["pepsi-zero-sugar", "Pepsi Zero Sugar", "20 fl oz bottle", [0,0,0,0,65,0,0]],
  ["pepsi-wild-cherry", "Pepsi Wild Cherry", "20 fl oz bottle", [260,0,70,0,55,0,70]],
  ["sierra-mist", "Sierra Mist", "20 fl oz bottle", [240,0,65,0,55,0,65]],
];
const marcosFoods = [
  ...marcosPizzaFoods,
  ...marcosFlatRows.map(([id, name, description, values, options]) => marcosFood(id, name, description, values ? menuPublished(...values) : null, options?.map(([optionId, optionDescription, optionValues]) => marcosOption(`${id}:${optionId}`, optionDescription, menuPublished(...optionValues))))),
  ...marcosSaladRows.map(([id, name, sizes]) => marcosFood(id, name, "Choose a published salad size; the portal's named dressing is included", null, sizes.map(([sizeId, description, values]) => marcosOption(`${id}:${sizeId}`, description, menuPublished(...values))))),
  ...marcosWingRows.map(([id, name, sizes]) => marcosFood(id, name, "Named wing sauce is included; separate dipping cup is excluded", null, sizes.map(([count, values]) => marcosOption(`${id}:${count}-piece`, `${count} wings with named sauce included`, menuPublished(...values), count)))),
  ...marcosDipRows.map(([id, name, values, aliases]) => marcosFood(id, name, "1 separately listed dipping cup", menuPublished(...values), undefined, aliases)),
  ...marcosDrinkRows.map(([id, name, description, values]) => marcosFood(id, name, description, menuPublished(...values), undefined, [`Marco's Pizza ${name}`])),
];

const chilis = { id: "chilis", name: "Chili's" };
const CHILIS_SOURCE = "https://cdn.builder.io/o/assets%2F4967176e01a141828a5fad701f6faa79%2F146cf251ade9498a8257cc6d9f38e3b4?alt=media&apiKey=4967176e01a141828a5fad701f6faa79&token=c7f3a4ea-6aaf-4aa5-be1e-bee4ba930ede";
const CHILIS_MENU_SOURCE = "https://www.chilis.com/menu";
const CHILIS_REFERENCE = "Chili's official U.S. Nutrition Guide, effective June 24, 2025; values are for the named serving as served unless the description states an exclusion.";
const chilisFood = (id, name, description, nutrients, servingOptions, aliases, sourceUrl = CHILIS_SOURCE, sourceReference = CHILIS_REFERENCE) => menuFood(
  chilis,
  sourceUrl,
  sourceReference,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [`Chilis ${name}`, ...(servingOptions || []).map((option) => `Chilis ${name} ${option.serving.description}`), ...(aliases || [])]
);
const chilisOption = (id, description, nutrients, amount = 1) => expansionMenuOption(
  chilis, CHILIS_SOURCE, CHILIS_REFERENCE, id, description, nutrients, amount
);
const chilisNutrients = ([calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => menuPublished(
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar
);
const chilisRows = [
  ["southwestern-eggrolls", "Southwestern Eggrolls", "1 full appetizer order; avocado-ranch dipping sauce is included in the published as-served value", [1020, 36, 108, 50, 2810, 11, 11]],
  ["white-skillet-queso-and-chips", "White Skillet Queso & Chips", "1 full appetizer order with chips", [1450, 34, 128, 89, 3310, 9, 12]],
  ["skillet-beef-queso-and-chips", "Skillet Beef Queso & Chips", "1 full appetizer order with chips", [1340, 35, 129, 77, 4560, 10, 13]],
  ["texas-cheese-fries", "Texas Cheese Fries", "1 full appetizer order without added chili", [1800, 77, 99, 122, 4130, 8, 4]],
  ["big-mouth-bites", "Big Mouth Bites", "1 order of four mini burgers; side fries excluded", [1210, 60, 78, 74, 2610, 3, 19]],
  ["alexs-santa-fe-burger", "Alex's Santa Fe Burger", "1 burger; side fries excluded", [930, 49, 48, 62, 1290, 4, 11]],
  ["bacon-cheeseburger", "Bacon Cheeseburger", "1 burger; side fries excluded", [1110, 59, 45, 78, 1780, 1, 10]],
  ["bacon-rancher-burger", "Bacon Rancher Burger", "1 burger; side fries excluded", [1700, 101, 49, 123, 2860, 2, 13]],
  ["mushroom-swiss-burger", "Mushroom Swiss Burger", "1 burger; side fries excluded", [1000, 51, 49, 68, 990, 3, 12]],
  ["oldtimer-with-cheese", "Oldtimer with Cheese", "1 burger; side fries excluded", [850, 49, 45, 53, 1200, 2, 10]],
  ["big-qp-burger", "The Big QP Burger", "1 burger; side fries excluded", [890, 51, 47, 56, 1680, 2, 12]],
  ["big-smasher-burger", "Big Smasher Burger", "1 burger; side fries excluded", [950, 47, 49, 64, 1440, 2, 14]],
  ["veggie-santa-fe-burger", "Veggie Santa Fe Burger", "1 burger; side fries excluded", [640, 28, 74, 31, 1410, 13, 14]],
  ["cajun-pasta-grilled-chicken", "Cajun Pasta with Grilled Chicken", "1 complete pasta entree as served", [1160, 65, 110, 51, 3550, 8, 5]],
  ["chicken-bacon-ranch-quesadillas", "Chicken Bacon Ranch Quesadillas", "1 full quesadilla entree as served", [1670, 70, 69, 125, 2950, 4, 10]],
  ["brisket-quesadillas", "Brisket Quesadillas", "1 full quesadilla entree as served", [1600, 53, 85, 119, 2880, 4, 24]],
  ["margarita-grilled-chicken", "Margarita Grilled Chicken", "1 complete Guiltless Grill entree as served, including published rice and beans", [660, 69, 61, 14, 2900, 9, 7]],
  ["ancho-salmon", "Ancho Salmon", "1 complete Guiltless Grill entree as served, including published rice and broccoli", [620, 48, 40, 31, 1790, 5, 3]],
  ["santa-fe-salad", "Santa Fe Grilled Chicken Salad", "1 salad as served with dressing", [540, 35, 24, 35, 1510, 6, 7]],
  ["quesadilla-explosion-salad", "Quesadilla Explosion Salad with Grilled Chicken", "1 salad as served with dressing", [1160, 53, 67, 78, 1510, 6, 16]],
  ["quesadilla-explosion-crispers-salad", "Quesadilla Explosion Salad with Chicken Crispers", "1 salad as served with dressing", [1420, 51, 86, 99, 2840, 7, 16]],
  ["house-salad-no-dressing", "House Salad without Dressing", "1 side house salad; dressing excluded", [140, 6, 14, 7, 280, 2, 4]],
  ["homestyle-fries", "Homestyle Fries", "1 full side order", [420, 6, 60, 17, 660, 5, 0]],
  ["mexican-rice", "Mexican Rice", "1 side order", [160, 3, 27, 4.5, 480, 1, 1]],
  ["steamed-broccoli", "Steamed Broccoli", "1 side order", [40, 3, 8, 0, 250, 4, 2]],
  ["white-cheddar-mac-and-cheese", "White Cheddar Mac & Cheese", "1 side order", [260, 12, 19, 15, 930, 1, 4]],
  ["molten-chocolate-cake", "Molten Chocolate Cake", "1 complete dessert", [1150, 12, 149, 58, 1020, 4, 105]],
  ["peanut-butter-pie", "Peanut Butter Pie made with Reese's", "1 slice", [920, 13, 81, 65, 400, 6, 57]],
  ["skillet-chocolate-chip-cookie", "Skillet Chocolate Chip Cookie", "1 complete skillet dessert", [1210, 15, 177, 50, 890, 5, 106]],
  ["kids-cheeseburger-bites", "Kids Cheeseburger Bites", "1 kids' entree; side and beverage excluded", [450, 25, 35, 23, 720, 2, 8]],
  ["kids-chicken-bites", "Kids Chicken Bites", "1 kids' entree; side and beverage excluded", [320, 27, 35, 8, 770, 2, 8]],
  ["kids-crispy-crispers", "Kids Crispy Chicken Crispers", "1 kids' entree; side, sauce, and beverage excluded", [570, 24, 21, 43, 1620, 1, 2]],
  ["kids-grilled-chicken-dippers", "Kids Grilled Chicken Dippers", "1 kids' entree; side, sauce, and beverage excluded", [280, 22, 3, 21, 770, 0, 2]],
  ["kids-kraft-macaroni-and-cheese", "Kids Kraft Macaroni & Cheese", "1 kids' entree; side and beverage excluded", [310, 11, 44, 9, 830, 2, 10]],
  ["kids-cheese-pizza", "Kids Cheese Pizza", "1 kids' pizza; side and beverage excluded", [500, 17, 34, 33, 760, 2, 3]],
  ["ranch", "Ranch", "1 separately published 1.5 fl oz serving", [170, 1, 2, 18, 290, 0, 2]],
  ["honey-mustard", "Honey Mustard", "1 separately published 1.5 fl oz serving", [200, 1, 10, 18, 330, 0, 10]],
  ["buffalo-sauce", "Buffalo Sauce", "1 separately published 1.5 fl oz serving", [40, 0, 2, 3, 1590, 0, 1]],
  ["honey-chipotle-sauce", "Honey-Chipotle Sauce", "1 separately published 1.5 fl oz serving", [140, 0, 35, 0, 500, 0, 26]],
  ["house-bbq-sauce", "House BBQ Sauce", "1 separately published 1.5 fl oz serving", [140, 1, 35, 0, 560, 0, 32]],
  ["nashville-hot-sauce", "Nashville Hot Sauce", "1 separately published 1.5 fl oz serving", [290, 2, 11, 27, 1270, 0, 3]],
  ["sweet-chili-zing-sauce", "Sweet Chili Zing Sauce", "1 separately published 1.5 fl oz serving", [140, 1, 34, 0, 1120, 1, 31]],
].map(([id, name, description, values]) => chilisFood(id, name, description, chilisNutrients(values)));

const chilisSizedFoods = [
  chilisFood("classic-sirloin", "Classic Sirloin", "Menu-listed steak weight; cooked weight is not inferred, and sides are excluded", null, [
    chilisOption("classic-sirloin:6oz", "6 oz menu-listed Classic Sirloin; sides excluded", chilisNutrients([250, 34, 1, 12, 630, 0, 0])),
    chilisOption("classic-sirloin:10oz", "10 oz menu-listed Classic Sirloin; sides excluded", chilisNutrients([390, 54, 2, 18, 950, 0, 1])),
  ], ["Chilis 6 oz sirloin", "Chilis 10 oz sirloin"]),
  chilisFood("guiltless-sirloin", "Guiltless Sirloin with Grilled Avocado", "Menu-listed steak weight; complete published Guiltless Grill configuration with avocado and sides", null, [
    chilisOption("guiltless-sirloin:6oz", "6 oz menu-listed sirloin with grilled avocado and published sides", chilisNutrients([300, 38, 9, 13, 1010, 3, 2])),
    chilisOption("guiltless-sirloin:10oz", "10 oz menu-listed sirloin with grilled avocado and published sides", chilisNutrients([450, 59, 9, 20, 1310, 3, 3])),
  ]),
  chilisFood("house-bbq-ribs", "House BBQ Ribs", "Ribs with House BBQ sauce; sides excluded", null, [
    chilisOption("house-bbq-ribs:half-rack", "Half rack with House BBQ sauce; sides excluded", chilisNutrients([1130, 68, 54, 73, 1650, 1, 49])),
    chilisOption("house-bbq-ribs:full-rack", "Full rack with House BBQ sauce; sides excluded", chilisNutrients([2160, 136, 81, 145, 2860, 2, 74])),
  ]),
  chilisFood("crispy-chicken-crispers-no-sauce", "Crispy Chicken Crispers without Sauce", "Plain Crispers; dipping sauce and sides excluded", null, [
    chilisOption("crispy-chicken-crispers-no-sauce:4-piece", "4 Crispy Chicken Crispers; sauce and sides excluded", chilisNutrients([790, 45, 38, 51, 2650, 2, 1]), 4),
    chilisOption("crispy-chicken-crispers-no-sauce:5-piece", "5 Crispy Chicken Crispers; sauce and sides excluded", chilisNutrients([990, 57, 47, 64, 3320, 3, 1]), 5),
    chilisOption("crispy-chicken-crispers-no-sauce:6-piece", "6 Crispy Chicken Crispers; sauce and sides excluded", chilisNutrients([1190, 68, 57, 76, 3980, 3, 1]), 6),
  ], ["Chilis chicken tenders"]),
  chilisFood("plain-bone-in-wings", "Plain Bone-In Wings", "Plain bone-in wings; sauces, ranch, and sides excluded", null, [
    chilisOption("plain-bone-in-wings:8-piece", "8 plain bone-in wings; sauces and ranch excluded", chilisNutrients([610, 72, 0, 36, 1130, 0, 0]), 8),
    chilisOption("plain-bone-in-wings:12-piece", "12 plain bone-in wings; sauces and ranch excluded", chilisNutrients([910, 107, 0, 54, 1690, 0, 0]), 12),
    chilisOption("plain-bone-in-wings:16-piece", "16 plain bone-in wings; sauces and ranch excluded", chilisNutrients([1220, 143, 0, 72, 2250, 0, 0]), 16),
  ]),
  chilisFood("lemon-pepper-bone-in-wings", "Lemon Pepper Bone-In Wings", "Lemon-pepper flavor is included; sauces, ranch, and sides excluded", null, [
    chilisOption("lemon-pepper-bone-in-wings:8-piece", "8 lemon-pepper bone-in wings; ranch excluded", chilisNutrients([740, 72, 1, 50, 1820, 0, 0]), 8),
    chilisOption("lemon-pepper-bone-in-wings:12-piece", "12 lemon-pepper bone-in wings; ranch excluded", chilisNutrients([1110, 108, 2, 75, 2730, 0, 1]), 12),
    chilisOption("lemon-pepper-bone-in-wings:16-piece", "16 lemon-pepper bone-in wings; ranch excluded", chilisNutrients([1480, 144, 3, 100, 3640, 0, 1]), 16),
  ]),
  chilisFood("plain-boneless-wings", "Plain Boneless Wings", "Plain boneless wings; sauces, ranch, and sides excluded", null, [
    chilisOption("plain-boneless-wings:8-piece", "8 plain boneless wings; sauces and ranch excluded", chilisNutrients([540, 34, 38, 28, 1200, 2, 0]), 8),
    chilisOption("plain-boneless-wings:12-piece", "12 plain boneless wings; sauces and ranch excluded", chilisNutrients([820, 50, 57, 43, 1810, 3, 0]), 12),
    chilisOption("plain-boneless-wings:16-piece", "16 plain boneless wings; sauces and ranch excluded", chilisNutrients([1090, 67, 76, 57, 2410, 4, 0]), 16),
  ]),
];

const chilisCurrentPartialFoods = [
  ["big-crispy-chicken-sandwich", "Big Crispy Chicken Sandwich", "1 current-menu sandwich; side excluded", 880],
  ["buffalo-big-crispy-chicken-sandwich", "Buffalo Big Crispy Chicken Sandwich", "1 current-menu sandwich; side excluded", 710],
  ["deluxe-big-crispy-chicken-sandwich", "Deluxe Big Crispy Chicken Sandwich", "1 current-menu sandwich; side excluded", 1050],
  ["deluxe-grilled-chicken-sandwich", "Deluxe Grilled Chicken Sandwich", "1 current-menu sandwich; side excluded", 800],
  ["honey-chipotle-big-crispy-chicken-sandwich", "Honey-Chipotle Big Crispy Chicken Sandwich", "1 current-menu sandwich; side excluded", 840],
  ["nashville-hot-big-crispy-chicken-sandwich", "Nashville Hot Big Crispy Chicken Sandwich", "1 current-menu sandwich; side excluded", 950],
  ["blackberry-iced-tea", "Blackberry Iced Tea", "1 current-menu restaurant serving; published volume and nutrients beyond calories are unavailable", 80],
  ["mango-iced-tea", "Mango Iced Tea", "1 current-menu restaurant serving; published volume and nutrients beyond calories are unavailable", 80],
  ["blackberry-lemonade", "Blackberry Lemonade", "1 current-menu restaurant serving; published volume and nutrients beyond calories are unavailable", 240],
  ["watermelon-lemonade", "Watermelon Lemonade", "1 current-menu restaurant serving; published volume and nutrients beyond calories are unavailable", 270],
].map(([id, name, description, calories]) => chilisFood(
  id,
  name,
  description,
  menuPublished(calories, null, null, null, null),
  undefined,
  undefined,
  CHILIS_MENU_SOURCE,
  "Chili's current official U.S. online menu; calories are published for the named item, while unavailable nutrients remain unknown."
));
const chilisFoods = [...chilisRows, ...chilisSizedFoods, ...chilisCurrentPartialFoods];

const applebees = { id: "applebees", name: "Applebee's" };
const APPLEBEES_SOURCE = "https://www.nutritionix.com/applebees/menu/premium";
const APPLEBEES_REFERENCE = "Applebee's officially linked Nutritionix U.S. Interactive Nutrition Menu, last updated September 9, 2026; values represent the named standardized menu configuration.";
const applebeesFood = (id, name, description, nutrients, servingOptions, aliases) => menuFood(
  applebees,
  APPLEBEES_SOURCE,
  APPLEBEES_REFERENCE,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [`Applebees ${name}`, ...(servingOptions || []).map((option) => `Applebees ${name} ${option.serving.description}`), ...(aliases || [])]
);
const applebeesOption = (id, description, nutrients, amount = 1) => expansionMenuOption(
  applebees, APPLEBEES_SOURCE, APPLEBEES_REFERENCE, id, description, nutrients, amount
);
const applebeesNutrients = ([calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => menuPublished(
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar
);
const applebeesCategoryFoods = (rows, description) => rows.map(([id, name, values, aliases]) => applebeesFood(
  id, name, description, applebeesNutrients(values), undefined, aliases
));

const applebeesAppetizerFoods = applebeesCategoryFoods([
  ["bacon-cheeseburger-wonton-tacos", "Bacon Cheeseburger Wonton Tacos", [720, 33, 34, 51, 1820, 2, 7]],
  ["boneless-wings-plain", "Boneless Wings without Flavor or Dipping Sauce", [660, 38, 54, 32, 1720, 4, null], ["Applebees plain boneless wings"]],
  ["classic-bone-in-wings-plain", "Classic Bone-In Wings without Flavor or Dipping Sauce", [410, 56, 3, 20, 960, 2, null]],
  ["brew-pub-loaded-waffle-fries", "Brew Pub Loaded Waffle Fries", [1570, 31, 94, 115, 3990, 8, 6]],
  ["brew-pub-pretzels-beer-cheese", "Brew Pub Pretzels & Beer Cheese Dip", [1160, 34, 146, 49, 3540, 6, 17]],
  ["chicken-quesadilla", "Chicken Quesadilla", [1170, 48, 74, 75, 2510, 5, 8]],
  ["chicken-wonton-tacos", "Chicken Wonton Tacos", [590, 30, 58, 26, 1500, 3, 27]],
  ["crispy-pickle-fries", "Crispy Pickle Fries", [720, 6, 52, 54, 3620, 5, 4]],
  ["crunchy-onion-rings", "Crunchy Onion Rings", [1330, 15, 181, 60, 3200, 10, 51]],
  ["loaded-potato-waves", "Loaded Potato Waves", [1420, 43, 63, 111, 2490, 5, 5]],
  ["mozzarella-sticks", "Mozzarella Sticks", [860, 41, 76, 44, 2440, 7, 12]],
  ["spinach-artichoke-dip", "Spinach & Artichoke Dip", [990, 21, 89, 61, 2340, 9, 7]],
  ["white-queso-dip-chips", "White Queso Dip & Chips", [920, 28, 83, 54, 2610, 5, 6]],
], "1 entire appetizer order as published; only sauces named in the item are included");

const applebeesSoupSaladFoods = applebeesCategoryFoods([
  ["caesar-side-salad", "Caesar Side Salad", [220, 5, 13, 17, 440, 2, 3]],
  ["chicken-tortilla-soup", "Chicken Tortilla Soup", [280, 11, 26, 15, 930, 2, 3]],
  ["french-onion-soup", "French Onion Soup", [370, 16, 26, 21, 1250, 2, 9]],
  ["house-side-salad-no-dressing", "House Side Salad without Dressing", [140, 6, 14, 7, 230, 2, 4]],
  ["tomato-basil-soup", "Tomato Basil Soup", [210, 5, 22, 12, 1260, 2, 8]],
], "1 published restaurant serving; dressing is included only when named");

const applebeesSteakRibFoods = [
  applebeesFood("top-sirloin", "USDA Select Top Sirloin", "Complete standardized portal meal; menu-listed steak weight is not a cooked weight. The total includes the source's two side selections, whose exact pairing is not identified in the portal table; do not add separate sides.", null, [
    applebeesOption("top-sirloin:6oz", "6 oz menu-listed sirloin meal with source-configured sides", applebeesNutrients([560, 42, 43, 25, 1880, 7, 6])),
    applebeesOption("top-sirloin:8oz", "8 oz menu-listed sirloin meal with source-configured sides", applebeesNutrients([620, 53, 44, 27, 2000, 7, 6])),
  ], ["Applebees 6 oz sirloin", "Applebees 8 oz sirloin"]),
  applebeesFood("riblets", "Applebee's Riblets without Sauce", "Published meal totals include the named default sides and exclude rib sauce", null, [
    applebeesOption("riblets:plate", "Riblets Plate without sauce, with classic fries included", applebeesNutrients([940, 61, 56, 53, 1510, 6, 3])),
    applebeesOption("riblets:platter", "Riblets Platter without sauce, with classic fries and coleslaw included", applebeesNutrients([1400, 94, 73, 82, 2000, 8, 17])),
  ]),
  applebeesFood("double-glazed-baby-back-ribs-no-sauce", "Double-Glazed Baby Back Ribs without Sauce", "Published meal total excludes rib sauce and includes the source-configured sides; do not add separate sides", null, [
    applebeesOption("double-glazed-baby-back-ribs-no-sauce:half-rack", "Half rack without sauce, with source-configured sides", applebeesNutrients([760, 44, 53, 42, 1300, 6, 0])),
    applebeesOption("double-glazed-baby-back-ribs-no-sauce:full-rack", "Full rack without sauce, with source-configured sides", applebeesNutrients([1260, 84, 68, 73, 1790, 9, 13])),
  ]),
  ...applebeesCategoryFoods([
    ["ribeye-12oz", "12 oz Ribeye", [870, 76, 46, 43, 2010, 7, 6]],
    ["bourbon-street-steak", "Bourbon Street Steak", [820, 52, 47, 48, 1970, 6, 7]],
    ["shrimp-parmesan-sirloin", "Shrimp 'N Parmesan Sirloin", [910, 66, 48, 52, 2900, 8, 7]],
  ], "Complete standardized portal entree including source-configured sides; the table does not name the side pairing, so do not add separate sides"),
];

const applebeesEntreeFoods = applebeesCategoryFoods([
  ["bourbon-street-chicken-shrimp", "Bourbon Street Chicken & Shrimp", [800, 56, 48, 44, 2650, 7, 7]],
  ["chicken-tenders-plate", "Chicken Tenders Plate", [1080, 38, 90, 64, 2430, 7, 10]],
  ["chicken-tenders-platter", "Chicken Tenders Platter", [1410, 52, 116, 83, 3090, 10, 23]],
  ["fiesta-lime-chicken", "Fiesta Lime Chicken", [1190, 60, 98, 62, 3670, 7, 9]],
  ["grilled-chicken-breast", "Grilled Chicken Breast", [560, 49, 43, 22, 1800, 7, 5]],
  ["hot-honey-glazed-chicken-bacon-skillet", "Hot Honey Glazed Chicken & Bacon Skillet", [1110, 50, 96, 58, 2950, 8, 38]],
  ["lemon-parmesan-chicken", "Lemon Parmesan Chicken", [920, 48, 65, 53, 2340, 9, 7]],
  ["blackened-cajun-salmon", "Blackened Cajun Salmon", [640, 42, 47, 33, 1750, 8, 6]],
  ["double-crunch-shrimp", "Double Crunch Shrimp", [1120, 28, 139, 49, 3940, 12, 32]],
  ["hand-battered-fish-chips", "Hand-Battered Fish & Chips", [1470, 42, 115, 95, 3190, 10, 20]],
], "1 complete standardized entree as published, including the default side, sauce, or meal components represented by the portal total");

const applebeesSaladFoods = applebeesCategoryFoods([
  ["caesar-salad-blackened-shrimp", "Caesar Salad with Blackened Shrimp", [830, 32, 57, 54, 2360, 8, 10]],
  ["caesar-salad-grilled-chicken", "Caesar Salad with Grilled Chicken", [950, 57, 56, 57, 2250, 8, 10]],
  ["california-grilled-chicken-salad", "California Grilled Chicken Salad", [510, 53, 34, 19, 3290, 8, 18]],
  ["crispy-chicken-tender-salad", "Crispy Chicken Tender Salad", [1230, 46, 78, 83, 2070, 8, 27]],
  ["grilled-chicken-balsamic-berry-salad", "Grilled Chicken Balsamic Berry Salad", [980, 54, 66, 58, 1740, 15, 26]],
  ["oriental-chicken-salad-crispy", "Oriental Chicken Salad with Crispy Chicken", [1550, 40, 116, 105, 1670, 12, 45]],
  ["oriental-chicken-salad-grilled", "Oriental Chicken Salad with Grilled Chicken", [1370, 56, 94, 86, 1570, 11, 45]],
  ["quesadilla-chicken-salad", "Quesadilla Chicken Salad", [2230, 123, 88, 154, 4670, 12, 17]],
  ["strawberry-balsamic-chicken-salad", "Strawberry Balsamic Chicken Salad", [480, 48, 49, 12, 2540, 12, 28]],
], "1 complete salad; the published total includes its standard dressing and breadstick where served");

const applebeesPastaBowlFoods = applebeesCategoryFoods([
  ["bourbon-street-chicken-sausage-penne", "Bourbon Street Chicken & Sausage Penne", [1410, 82, 86, 83, 3680, 8, 12]],
  ["bourbon-street-shrimp-sausage-penne", "Bourbon Street Shrimp & Sausage Penne", [1290, 57, 87, 81, 3850, 7, 12]],
  ["chicken-parmesan-fettuccine", "Chicken Parmesan Fettuccine", [1230, 56, 94, 71, 2510, 7, 13]],
  ["broccoli-alfredo-blackened-shrimp", "Classic Broccoli Alfredo with Blackened Shrimp", [1320, 54, 108, 76, 2970, 9, 12]],
  ["broccoli-alfredo-grilled-chicken", "Classic Broccoli Alfredo with Grilled Chicken", [1440, 79, 107, 79, 2860, 9, 12]],
  ["four-cheese-mac-honey-pepper-chicken", "Four-Cheese Mac & Cheese with Honey Pepper Chicken Tenders", [1360, 56, 159, 55, 3320, 7, 44]],
  ["three-cheese-chicken-penne", "Three-Cheese Chicken Penne", [1350, 77, 102, 71, 2760, 7, 12]],
  ["sesame-salmon-bowl", "Sesame Salmon Bowl", [1100, 51, 109, 54, 2090, 11, 22]],
  ["southwest-chicken-bowl", "Southwest Chicken Bowl", [830, 54, 90, 30, 1730, 10, 6]],
  ["tex-mex-shrimp-bowl", "Tex-Mex Shrimp Bowl", [710, 29, 91, 27, 1760, 10, 6]],
], "1 complete standardized pasta or bowl as served; its named protein, sauce, toppings, and breadstick where offered are included");

const applebeesBurgerFoods = applebeesCategoryFoods([
  ["big-classic-bacon-cheeseburger", "Big Classic Bacon Cheeseburger", [1320, 58, 95, 80, 3040, 7, 9]],
  ["bourbon-street-mushroom-swiss-burger", "Bourbon Street Mushroom Swiss Burger", [1560, 56, 98, 105, 2340, 8, 10]],
  ["classic-burger", "Classic Burger", [1090, 43, 93, 61, 2050, 7, 8]],
  ["classic-cheeseburger", "Classic Cheeseburger", [1220, 50, 95, 72, 2670, 7, 9]],
  ["grilled-cheese-cheeseburger", "Grilled Cheese Cheeseburger", [1210, 58, 78, 76, 3230, 4, 18]],
  ["omcheese-burger", "O-M-Cheese Burger", [1900, 83, 107, 127, 3950, 7, 19]],
  ["quesadilla-burger", "Quesadilla Burger", [1580, 70, 94, 103, 3470, 9, 5]],
  ["ultimate-breakfast-burger", "Ultimate Breakfast Burger", [1650, 65, 106, 108, 3570, 8, 8]],
  ["whisky-bacon-burger", "Whisky Bacon Burger", [1590, 63, 120, 97, 3070, 9, 19]],
], "1 standard burger with bun, toppings, and classic fries included");

const applebeesSandwichFoods = applebeesCategoryFoods([
  ["bacon-ranch-grilled-chicken-sandwich", "Bacon Ranch Grilled Chicken Sandwich", [1190, 63, 93, 64, 3220, 7, 9]],
  ["bacon-ranch-crispy-chicken-sandwich", "Bacon Ranch Crispy Chicken Sandwich", [1320, 58, 110, 72, 3170, 8, 10]],
  ["chicken-fajita-rollup", "Chicken Fajita Rollup", [1500, 62, 114, 88, 3610, 9, 7]],
  ["clubhouse-grille", "Clubhouse Grille", [1460, 56, 129, 81, 3670, 8, 22]],
  ["spicy-honey-mustard-grilled-chicken-sandwich", "Spicy Honey Mustard Grilled Chicken Sandwich", [1220, 62, 106, 62, 3300, 7, 22]],
  ["spicy-honey-mustard-crispy-chicken-sandwich", "Spicy Honey Mustard Crispy Chicken Sandwich", [1350, 58, 122, 70, 3260, 8, 22]],
  ["sweet-spicy-grilled-chicken-sandwich", "Sweet & Spicy Grilled Chicken Sandwich", [1220, 56, 140, 48, 3500, 9, 49]],
  ["prime-rib-dipper", "The Prime Rib Dipper", [1440, 73, 124, 74, 4450, 9, 14]],
], "1 standard sandwich or wrap with toppings, sauce, and classic fries included");

const applebeesDessertSideFoods = [
  ...applebeesCategoryFoods([
    ["brownie-bite", "Brownie Bite", [330, 4, 48, 15, 190, 2, 34]],
    ["oreo-cookie-shake", "Oreo Cookie Shake", [840, 15, 104, 41, 410, null, 71]],
    ["sizzlin-butter-pecan-blondie", "Sizzlin' Butter Pecan Blondie", [1020, 13, 115, 57, 390, 2, 70]],
    ["sizzlin-caramel-apple-pie", "Sizzlin' Caramel Apple Pie", [1030, 8, 151, 45, 980, 4, 87]],
    ["triple-chocolate-meltdown", "Triple Chocolate Meltdown", [910, 12, 116, 48, 640, 5, 87]],
  ], "1 complete dessert or shake"),
  ...applebeesCategoryFoods([
    ["baked-potato", "Baked Potato", [530, 9, 59, 31, 1120, 4, 4]],
    ["breadstick", "Breadstick", [180, 4, 25, 7, 250, 1, 3]],
    ["classic-fries-side", "Classic Fries", [400, 6, 53, 18, 1000, 5, 0]],
    ["crunchy-onion-rings-side", "Crunchy Onion Rings Side", [560, 7, 66, 30, 1170, 4, 5]],
    ["four-cheese-mac-bacon-side", "Four-Cheese Mac & Cheese with Applewood-Smoked Bacon", [390, 18, 39, 18, 1160, 2, 4]],
    ["garlicky-green-beans", "Garlicky Green Beans", [150, 2, 8, 12, 420, 3, 2]],
    ["garlic-mashed-potatoes", "Garlic Mashed Potatoes", [260, 5, 37, 11, 720, 4, 3]],
    ["homestyle-cheesy-broccoli", "Homestyle Cheesy Broccoli", [220, 10, 8, 17, 720, 3, 3]],
    ["loaded-baked-potato", "Loaded Baked Potato", [600, 13, 59, 36, 1290, 4, 4]],
    ["loaded-garlic-mashed-potatoes", "Loaded Garlic Mashed Potatoes", [440, 10, 40, 26, 910, 4, 5]],
    ["signature-coleslaw", "Signature Coleslaw", [130, null, 15, 8, 180, 2, 12]],
    ["steamed-broccoli", "Steamed Broccoli", [100, 3, 5, 8, 240, 2, 2]],
    ["waffle-fries", "Waffle Fries", [490, 2, 50, 29, 1150, 5, 0]],
  ], "1 separately published side; not included again when a selected entree already states that it includes a side"),
];

const applebeesKidsFoods = applebeesCategoryFoods([
  ["kids-cheeseburger", "Kids Cheeseburger", [570, 25, 39, 35, 1170, 2, 7]],
  ["kids-cheesy-pizza", "Kids Cheesy Pizza", [670, 25, 85, 27, 1310, 4, 13]],
  ["kids-chicken-quesadilla", "Kids Chicken Quesadilla", [360, 16, 33, 18, 710, 2, 2]],
  ["kids-chicken-taco", "Kids Chicken Taco", [210, 19, 18, 7, 560, 1, 2]],
  ["kids-chicken-tenders", "Kids Chicken Tenders", [290, 19, 17, 17, 710, 1, 0]],
  ["kids-corn-dog", "Kids Corn Dog", [180, 7, 19, 9, 400, 1, 5]],
  ["kids-grilled-chicken-alfredo", "Kids Grilled Chicken Alfredo", [680, 34, 41, 42, 1320, 2, 5]],
  ["kids-kraft-macaroni-cheese", "Kids Kraft Macaroni & Cheese", [310, 11, 44, 9, 830, 2, 10]],
  ["kids-mozzarella-sticks", "Kids Mozzarella Sticks", [330, 16, 30, 17, 970, 3, 5]],
  ["kids-hot-fudge-sundae", "Kids Hot Fudge Sundae", [330, 4, 46, 14, 135, null, 38]],
], "1 kids' entree or dessert; required side and beverage are excluded unless named");

const applebeesBeverageFoods = [
  ["coca-cola", "Coca-Cola", [["restaurant", "Restaurant fountain serving", [90, 0, 26, 0, 30, 0, 26]], ["to-go", "To-Go fountain serving", [140, 0, 39, 0, 45, 0, 39]]]],
  ["diet-coke", "Diet Coke", [["restaurant", "Restaurant fountain serving", [0, 0, 0, 0, 25, 0, 0]], ["to-go", "To-Go fountain serving", [0, 0, 0, 0, 40, 0, 0]]]],
  ["coke-zero", "Coke Zero", [["restaurant", "Restaurant fountain serving", [0, 0, 0, 0, 25, 0, 0]], ["to-go", "To-Go fountain serving", [0, 0, 0, 0, 40, 0, 0]]]],
  ["dr-pepper", "Dr Pepper", [["restaurant", "Restaurant fountain serving", [100, 0, 26, 0, 40, 0, 26]], ["to-go", "To-Go fountain serving", [150, 0, 40, 0, 60, 0, 38]]]],
  ["pepsi", "Pepsi", [["restaurant", "Restaurant fountain serving", [100, 0, 27, 0, 20, 0, 27]], ["to-go", "To-Go fountain serving", [150, 0, 41, 0, 30, 0, 41]]]],
  ["sweet-tea", "Sweet Tea", [["restaurant", "Restaurant serving", [90, 0, 23, 0, 10, 0, 22]], ["to-go", "To-Go serving", [130, 0, 34, 0, 10, 0, 33]]]],
  ["brewed-iced-tea", "Brewed Iced Tea", [["restaurant", "Restaurant serving", [0, 0, 2, 0, 5, 0, 0]], ["to-go", "To-Go serving", [5, 0, 2, 0, 10, 0, 0]]]],
  ["strawberry-lemonade", "Strawberry Lemonade", [["restaurant", "Restaurant serving", [190, 0, 49, 0, 60, 0, 47]], ["to-go", "To-Go serving", [280, 0, 73, 0, 85, 0, 70]]]],
  ["blackberry-iced-tea", "Blackberry Iced Tea", [["restaurant", "Restaurant serving", [50, 0, 13, 0, 10, 0, 12]], ["to-go", "To-Go serving", [80, 0, 20, 0, 15, 0, 18]]]],
  ["vanilla-shake", "Vanilla Shake", [["one-size", "1 shake", [680, 14, 79, 35, 290, 0, 58]]]],
  ["chocolate-shake", "Chocolate Shake", [["one-size", "1 shake", [900, 15, 132, 35, 370, 2, 107]]]],
].map(([id, name, options]) => applebeesFood(
  id,
  name,
  "Choose a separately published restaurant or To-Go serving; the portal does not state fluid-ounce volumes",
  null,
  options.map(([optionId, description, values]) => applebeesOption(`${id}:${optionId}`, description, applebeesNutrients(values))),
  [`Applebee's ${name}`]
));
const applebeesFoods = [
  ...applebeesAppetizerFoods,
  ...applebeesSoupSaladFoods,
  ...applebeesSteakRibFoods,
  ...applebeesEntreeFoods,
  ...applebeesSaladFoods,
  ...applebeesPastaBowlFoods,
  ...applebeesBurgerFoods,
  ...applebeesSandwichFoods,
  ...applebeesDessertSideFoods,
  ...applebeesKidsFoods,
  ...applebeesBeverageFoods,
];

const texasRoadhouse = { id: "texas-roadhouse", name: "Texas Roadhouse" };
const TEXAS_ROADHOUSE_SOURCE = "https://www.nutritionix.com/texas-roadhouse/menu/premium";
const TEXAS_ROADHOUSE_REFERENCE = "Texas Roadhouse officially linked Nutritionix U.S. Interactive Nutrition Menu, last updated September 3, 2026; values reflect standardized recipes and the named portions.";
const texasRoadhouseFood = (id, name, description, nutrients, servingOptions, aliases) => menuFood(
  texasRoadhouse,
  TEXAS_ROADHOUSE_SOURCE,
  TEXAS_ROADHOUSE_REFERENCE,
  id,
  name,
  description,
  nutrients,
  servingOptions,
  [`Texas Roadhouse ${name}`, ...(servingOptions || []).map((option) => `Texas Roadhouse ${name} ${option.serving.description}`), ...(aliases || [])]
);
const texasRoadhouseOption = (id, description, nutrients, amount = 1) => expansionMenuOption(
  texasRoadhouse, TEXAS_ROADHOUSE_SOURCE, TEXAS_ROADHOUSE_REFERENCE, id, description, nutrients, amount
);
const texasRoadhouseNutrients = ([calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => menuPublished(
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar
);
const texasRoadhouseCategoryFoods = (rows, description) => rows.map(([id, name, values, aliases]) => texasRoadhouseFood(
  id, name, description, texasRoadhouseNutrients(values), undefined, aliases
));

const texasRoadhouseAppetizerFoods = texasRoadhouseCategoryFoods([
  ["cactus-blossom", "Cactus Blossom", [2250, 25, 236, 135, 5000, 19, 36]],
  ["cheese-fries-regular", "Cheese Fries - Regular", [1240, 38, 126, 65, 5400, 14, 2]],
  ["cheese-fries-small", "Cheese Fries - Small", [860, 25, 90, 44, 3770, 10, 2]],
  ["fried-pickles", "Fried Pickles", [550, 6, 48, 38, 2580, 5, 1]],
  ["grilled-shrimp-appetizer", "Grilled Shrimp Appetizer", [370, 20, 29, 19, 1740, 1, 4]],
  ["killer-ribs", "Killer Ribs", [910, 49, 59, 53, 2830, 8, 5]],
  ["rattlesnake-bites", "Rattlesnake Bites", [560, 25, 34, 36, 1430, 3, 3]],
  ["tater-skins", "Tater Skins", [1320, 63, 63, 88, 2470, 7, 5]],
  ["twisted-mozzarella", "Twisted Mozzarella", [710, 27, 64, 39, 2610, 4, 6]],
], "1 entire appetizer order; separately listed dipping sauce and additional toppings are excluded");

const texasRoadhouseSoupFoods = [
  texasRoadhouseFood("baked-potato-soup", "Baked Potato Soup", "Choose the separately published cup or bowl", null, [
    texasRoadhouseOption("baked-potato-soup:cup", "1 cup of Baked Potato Soup", texasRoadhouseNutrients([220, 5, 16, 15, 530, 1, 2])),
    texasRoadhouseOption("baked-potato-soup:bowl", "1 bowl of Baked Potato Soup", texasRoadhouseNutrients([380, 9, 27, 25, 910, 2, 4])),
  ]),
  texasRoadhouseFood("texas-red-chili-no-beans", "Texas Red Chili without Beans", "Choose the separately published cup or bowl; crackers excluded", null, [
    texasRoadhouseOption("texas-red-chili-no-beans:cup", "1 cup without beans; crackers excluded", texasRoadhouseNutrients([250, 17, 13, 15, 800, 3, 4])),
    texasRoadhouseOption("texas-red-chili-no-beans:bowl", "1 bowl without beans; crackers excluded", texasRoadhouseNutrients([500, 33, 23, 31, 1460, 5, 8])),
  ]),
  texasRoadhouseFood("texas-red-chili-with-beans", "Texas Red Chili with Beans", "Choose the separately published cup or bowl; crackers excluded", null, [
    texasRoadhouseOption("texas-red-chili-with-beans:cup", "1 cup with beans; crackers excluded", texasRoadhouseNutrients([210, 16, 14, 10, 640, 4, 3])),
    texasRoadhouseOption("texas-red-chili-with-beans:bowl", "1 bowl with beans; crackers excluded", texasRoadhouseNutrients([430, 31, 25, 23, 1180, 6, 5])),
  ]),
];

const texasRoadhouseSaladFoods = [
  ...texasRoadhouseCategoryFoods([
    ["caesar-salad", "Caesar Salad", [440, 6, 9, 43, 450, 2, 2]],
    ["california-chicken-salad", "California Chicken Salad", [970, 74, 73, 46, 2460, 9, 62]],
    ["steakhouse-filet-salad", "Steakhouse Filet Salad", [1340, 71, 42, 103, 2870, 8, 21]],
  ], "1 full salad with its standard dressing included"),
  ...texasRoadhouseCategoryFoods([
    ["chicken-caesar-salad", "Chicken Caesar Salad", [1100, 60, 20, 89, 1070, 7, 5]],
    ["chicken-critter-salad", "Chicken Critter Salad", [690, 56, 27, 40, 1440, 6, 8]],
    ["grilled-salmon-salad", "Grilled Salmon Salad", [830, 66, 19, 55, 1310, 6, 9]],
    ["house-salad", "House Salad", [230, 13, 9, 16, 290, 2, 4]],
    ["salmon-caesar-salad", "Salmon Caesar Salad", [1110, 40, 20, 99, 1150, 5, 5]],
  ], "1 full salad; a separately selected made-from-scratch dressing is excluded unless the item name explicitly identifies Caesar"),
];

const texasRoadhouseDressingSauceFoods = texasRoadhouseCategoryFoods([
  ["ranch-dressing-3oz", "Ranch Dressing - 3 oz", [430, null, 5, 47, 520, 0, 1]],
  ["blue-cheese-dressing-3oz", "Bleu Cheese Dressing - 3 oz", [430, 3, 5, 45, 600, 0, 1]],
  ["caesar-dressing-3oz", "Caesar Dressing - 3 oz", [540, 4, 6, 56, 500, 0, 1]],
  ["honey-mustard-dressing-3oz", "Honey Mustard Dressing - 3 oz", [480, 0, 16, 48, 420, 0, 11]],
  ["italian-dressing-3oz", "Italian Dressing - 3 oz", [410, null, 17, 36, 640, null, 16]],
  ["thousand-island-dressing-3oz", "Thousand Island Dressing - 3 oz", [400, 0, 14, 39, 660, 0, 7]],
  ["honey-mustard-dip-2oz", "Honey Mustard Dipping Sauce - 2 oz", [320, 0, 11, 32, 280, 0, 8]],
  ["barbecue-sauce-2oz", "Texas Roadhouse Barbecue Sauce - 2 oz", [80, 0, 18, 0, 270, 0, 14]],
  ["tartar-sauce-2oz", "Tartar Sauce - 2 oz", [320, 0, 9, 32, 380, 0, 5]],
  ["creamy-horseradish-sauce-2oz", "Creamy Horseradish Sauce - 2 oz", [190, 1, 4, 18, 200, 0, 2]],
], "1 separately published sauce or dressing portion; do not add it to an item whose description says dressing or sauce is already included");

const texasRoadhouseSteakFoods = [
  texasRoadhouseFood("dallas-filet", "Dallas Filet", "Menu-listed steak weight; cooked weight is not inferred, and sides are excluded", null, [
    texasRoadhouseOption("dallas-filet:6oz", "6 oz menu-listed Dallas Filet; sides excluded", texasRoadhouseNutrients([270, 45, 6, 10, 720, 2, 2])),
    texasRoadhouseOption("dallas-filet:8oz", "8 oz menu-listed Dallas Filet; sides excluded", texasRoadhouseNutrients([360, 60, 8, 13, 960, 2, 2])),
  ]),
  texasRoadhouseFood("ft-worth-ribeye", "Ft. Worth Ribeye", "Menu-listed steak weight; cooked weight is not inferred, and sides are excluded", null, [
    texasRoadhouseOption("ft-worth-ribeye:12oz", "12 oz menu-listed ribeye; sides excluded", texasRoadhouseNutrients([960, 78, 12, 72, 1180, 4, 2])),
    texasRoadhouseOption("ft-worth-ribeye:14oz", "14 oz menu-listed ribeye; sides excluded", texasRoadhouseNutrients([1120, 90, 14, 84, 1370, 4, 2])),
    texasRoadhouseOption("ft-worth-ribeye:16oz", "16 oz menu-listed ribeye; sides excluded", texasRoadhouseNutrients([1280, 103, 16, 96, 1570, 5, 3])),
  ]),
  texasRoadhouseFood("new-york-strip", "New York Strip", "Menu-listed steak weight and cut; cooked weight is not inferred, and sides are excluded", null, [
    texasRoadhouseOption("new-york-strip:8oz-thick", "8 oz menu-listed thick-cut strip; sides excluded", texasRoadhouseNutrients([420, 57, null, 22, 660, null, 2])),
    texasRoadhouseOption("new-york-strip:12oz", "12 oz menu-listed traditional-cut strip; sides excluded", texasRoadhouseNutrients([640, 85, 1, 33, 980, 1, 3])),
    texasRoadhouseOption("new-york-strip:16oz", "16 oz menu-listed traditional-cut strip; sides excluded", texasRoadhouseNutrients([850, 114, 2, 44, 1310, 2, 3])),
  ]),
  texasRoadhouseFood("prime-rib", "Prime Rib", "Menu-listed steak weight; cooked weight is not inferred. Au jus is included; sides are excluded", null, [
    texasRoadhouseOption("prime-rib:12oz", "12 oz menu-listed prime rib with au jus; sides excluded", texasRoadhouseNutrients([950, 74, 3, 72, 1660, 2, 2])),
    texasRoadhouseOption("prime-rib:14oz", "14 oz menu-listed prime rib with au jus; sides excluded", texasRoadhouseNutrients([1110, 87, 3, 84, 1810, 3, 2])),
    texasRoadhouseOption("prime-rib:16oz", "16 oz menu-listed prime rib with au jus; sides excluded", texasRoadhouseNutrients([1260, 99, 4, 95, 1960, 3, 2])),
  ]),
  texasRoadhouseFood("usda-choice-sirloin", "USDA Choice Sirloin", "Menu-listed steak weight; cooked weight is not inferred, and sides are excluded", null, [
    texasRoadhouseOption("usda-choice-sirloin:6oz", "6 oz menu-listed sirloin; sides excluded", texasRoadhouseNutrients([250, 46, 3, 6, 560, 1, 1])),
    texasRoadhouseOption("usda-choice-sirloin:8oz", "8 oz menu-listed sirloin; sides excluded", texasRoadhouseNutrients([340, 61, 5, 8, 740, 2, 2])),
    texasRoadhouseOption("usda-choice-sirloin:11oz", "11 oz menu-listed sirloin; sides excluded", texasRoadhouseNutrients([460, 84, 6, 11, 1020, 2, 3])),
    texasRoadhouseOption("usda-choice-sirloin:16oz", "16 oz menu-listed sirloin; sides excluded", texasRoadhouseNutrients([670, 122, 9, 16, 1490, 3, 4])),
  ]),
  texasRoadhouseFood("fall-off-the-bone-ribs", "Fall-off-the-Bone Ribs", "Rib portion with standard sauce; sides excluded", null, [
    texasRoadhouseOption("fall-off-the-bone-ribs:half-slab", "Half slab; sides excluded", texasRoadhouseNutrients([900, 72, 9, 63, 1400, 3, 6])),
    texasRoadhouseOption("fall-off-the-bone-ribs:full-slab", "Full slab; sides excluded", texasRoadhouseNutrients([1450, 116, 15, 102, 2260, 4, 10])),
  ]),
  ...texasRoadhouseCategoryFoods([
    ["bone-in-ribeye", "Bone-In Ribeye", [1480, 143, 20, 101, 1720, 4, 4]],
    ["filet-medallions", "Filet Medallions", [760, 74, 56, 30, 2510, 5, 5]],
    ["porterhouse-t-bone", "Porterhouse T-Bone", [1040, 139, 1, 54, 1440, 2, 4]],
    ["road-kill", "Road Kill", [760, 55, 10, 56, 1420, 3, 4]],
    ["steak-kabob", "Steak Kabob", [920, 58, 78, 41, 2740, 4, 24]],
  ], "1 entree; sides are excluded, except Filet Medallions and Steak Kabob include seasoned rice as published"),
];

const texasRoadhouseComboFoods = texasRoadhouseCategoryFoods([
  ["sirloin-6oz-grilled-shrimp", "6 oz Sirloin & Grilled Shrimp", [670, 66, 34, 30, 2430, 3, 6]],
  ["sirloin-6oz-ribs", "6 oz Sirloin & Ribs", [800, 90, 9, 45, 1420, 3, 5]],
  ["sirloin-8oz-grilled-shrimp", "8 oz Sirloin & Grilled Shrimp", [750, 81, 35, 32, 2610, 3, 6]],
  ["sirloin-8oz-ribs", "8 oz Sirloin & Ribs", [890, 105, 10, 47, 1600, 3, 6]],
  ["chicken-critters-ribs", "Chicken Critters & Ribs", [820, 70, 21, 51, 1540, 3, 5]],
  ["grilled-bbq-chicken-sirloin", "Grilled BBQ Chicken & Sirloin", [590, 92, 31, 10, 1150, 3, 23]],
], "1 published Texas Size Combo; entree components are included and sides are excluded");

const texasRoadhouseChickenDinnerFoods = texasRoadhouseCategoryFoods([
  ["chicken-critters", "Chicken Critters", [480, 45, 26, 21, 1190, 3, 2]],
  ["country-fried-chicken", "Country Fried Chicken", [770, 48, 45, 44, 1460, 1, 9]],
  ["grilled-bbq-chicken", "Grilled BBQ Chicken", [300, 46, 19, 3.5, 450, 2, 15]],
  ["herb-crusted-chicken", "Herb Crusted Chicken", [260, 47, 12, 4, 1210, 4, 8]],
  ["smothered-chicken-cream-gravy", "Smothered Chicken with Cream Gravy", [330, 48, 8, 12, 600, 3, 4]],
  ["smothered-chicken-jack-cheese", "Smothered Chicken with Jack Cheese", [430, 55, 8, 20, 780, 3, 4]],
  ["beef-tips-mashed-potatoes", "Beef Tips with Mashed Potatoes", [960, 61, 48, 58, 3300, 6, 12]],
  ["beef-tips-seasoned-rice", "Beef Tips with Seasoned Rice", [1060, 63, 71, 57, 4400, 5, 12]],
  ["country-fried-sirloin", "Country Fried Sirloin", [1170, 52, 72, 75, 2220, 2, 9]],
  ["pulled-pork-dinner", "Pulled Pork Dinner", [890, 80, 54, 41, 1130, 4, 23]],
], "1 published entree as named; ordinary side choices and separately listed dipping sauce are excluded unless named in the item");

const texasRoadhouseSeafoodFoods = [
  texasRoadhouseFood("grilled-salmon", "Grilled Salmon", "Menu-listed fish portion; cooked weight is not inferred, and sides are excluded", null, [
    texasRoadhouseOption("grilled-salmon:5oz", "5 oz menu-listed grilled salmon; sides excluded", texasRoadhouseNutrients([410, 27, 2, 33, 770, null, null])),
    texasRoadhouseOption("grilled-salmon:8oz", "8 oz menu-listed grilled salmon; sides excluded", texasRoadhouseNutrients([560, 45, 2, 42, 950, null, null])),
  ]),
  texasRoadhouseFood("fried-catfish", "Fried Catfish", "Fried catfish pieces; sides and tartar sauce excluded", null, [
    texasRoadhouseOption("fried-catfish:3-piece", "3 fried catfish pieces; sides and sauce excluded", texasRoadhouseNutrients([990, 30, 35, 82, 1230, null, null]), 3),
    texasRoadhouseOption("fried-catfish:4-piece", "4 fried catfish pieces; sides and sauce excluded", texasRoadhouseNutrients([1170, 40, 45, 93, 1490, 1, 1]), 4),
  ]),
  texasRoadhouseFood("grilled-shrimp-dinner", "Grilled Shrimp Dinner", "Grilled shrimp with the published dinner components; ordinary side choices are excluded", null, [
    texasRoadhouseOption("grilled-shrimp-dinner:9-piece", "9-shrimp dinner; ordinary side choices excluded", texasRoadhouseNutrients([660, 29, 50, 37, 3880, 3, 4]), 9),
    texasRoadhouseOption("grilled-shrimp-dinner:12-piece", "12-shrimp dinner; ordinary side choices excluded", texasRoadhouseNutrients([700, 37, 50, 38, 4520, 3, 4]), 12),
  ]),
  texasRoadhouseFood("fish-and-chips", "Fish & Chips", "1 complete selected-store entree as published; tartar sauce excluded", texasRoadhouseNutrients([790, 42, 71, 38, 3020, 8, 2])),
];

const texasRoadhouseBurgerFoods = texasRoadhouseCategoryFoods([
  ["all-american-cheeseburger", "All-American Cheeseburger", [880, 50, 48, 55, 1970, 5, 11]],
  ["bacon-cheeseburger", "Bacon Cheeseburger", [980, 59, 48, 62, 2410, 5, 12]],
  ["bbq-chicken-sandwich", "BBQ Chicken Sandwich", [640, 55, 63, 18, 1310, 6, 24]],
  ["fried-chicken-sandwich", "Fried Chicken Sandwich", [830, 50, 72, 37, 1760, 4, 10]],
  ["grilled-chicken-sandwich", "Grilled Chicken Sandwich", [560, 55, 45, 18, 1040, 6, 10]],
  ["mushroom-jack-chicken-sandwich", "Mushroom Jack Chicken Sandwich", [710, 63, 48, 30, 1410, 6, 11]],
  ["pulled-pork-sandwich", "Pulled Pork Sandwich", [870, 68, 62, 40, 1220, 4, 22]],
  ["smokehouse-burger", "Smokehouse Burger", [1080, 58, 60, 67, 2490, 6, 20]],
], "1 burger or sandwich with bun and standard toppings; fries and other sides are excluded");

const texasRoadhouseSideFoods = texasRoadhouseCategoryFoods([
  ["applesauce", "Applesauce", [110, 0, 28, 0, 15, 3, 23]],
  ["baked-potato", "Baked Potato", [380, 7, 60, 13, 1950, 6, 3]],
  ["caesar-side-salad", "Caesar Side Salad", [440, 6, 9, 43, 450, 2, 2]],
  ["fresh-baked-bread", "Fresh-Baked Bread", [200, 5, 28, 8, 200, 1, 4], ["Texas Roadhouse roll"]],
  ["fresh-vegetables", "Fresh Vegetables", [190, 3, 13, 15, 480, 5, 4]],
  ["green-beans", "Green Beans", [100, 6, 13, 3.5, 1070, 2, 4]],
  ["house-side-salad", "House Side Salad", [230, 13, 9, 16, 290, 2, 4]],
  ["mac-and-cheese", "Mac and Cheese", [380, 17, 37, 18, 450, 2, 2]],
  ["mashed-potatoes", "Mashed Potatoes", [260, 3, 24, 17, 330, 2, 2]],
  ["sauteed-mushrooms", "Sauteed Mushrooms", [120, 3, 5, 11, 480, 2, 2]],
  ["sauteed-onions", "Sauteed Onions", [150, 2, 13, 10, 570, 2, 6]],
  ["seasoned-corn", "Seasoned Corn", [190, 5, 29, 9, 550, 3, 6]],
  ["seasoned-rice", "Seasoned Rice", [360, 6, 47, 15, 1430, 2, 3]],
  ["steak-fries", "Steak Fries", [360, 5, 53, 14, 1970, 6, null]],
  ["steamed-broccoli", "Steamed Broccoli", [210, 5, 17, 16, 490, 8, 3]],
  ["sweet-potato", "Sweet Potato", [350, 6, 62, 9, 105, 10, 19]],
  ["whipped-buttery-spread", "Whipped Buttery Spread", [90, 0, 0, 10, 120, 0, 0], ["Texas Roadhouse butter"]],
], "1 separately published side or extra; toppings are excluded unless named");

const texasRoadhouseKidsFoods = texasRoadhouseCategoryFoods([
  ["kids-all-beef-hot-dog", "Kids All-Beef Hot Dog", [390, 14, 27, 23, 1010, 0, 4]],
  ["kids-jr-chicken-tenders", "Kids Jr. Chicken Tenders", [360, 31, 24, 16, 780, 2, 0]],
  ["kids-grilled-chicken", "Kids Grilled Chicken", [110, 23, 0, 2, 90, null, 0]],
  ["kids-lil-dillo-steak-bites", "Kids Lil' Dillo Steak Bites", [170, 31, 2, 4, 370, null, null]],
  ["kids-mac-and-cheese", "Kids Mac and Cheese", [380, 17, 37, 18, 450, 2, 2]],
  ["kids-mini-cheeseburgers", "Kids Mini-Cheeseburgers", [670, 30, 57, 36, 950, 3, 9]],
  ["ranger-andys-steak", "Ranger Meal - Andy's Steak", [250, 46, 3, 6, 560, 1, 1]],
  ["ranger-chicken-critters-basket", "Ranger Meal - Chicken Critters Basket", [340, 32, 19, 15, 850, 2, 1]],
  ["ranger-rib-basket", "Ranger Meal - Ranger Rib Basket", [550, 44, 6, 39, 860, 2, 4]],
], "1 kids' or Ranger entree; side and beverage are excluded");

const texasRoadhouseDessertDrinkFoods = [
  ...texasRoadhouseCategoryFoods([
    ["big-ol-brownie", "Big Ol' Brownie", [1200, 12, 203, 40, 740, 8, 151]],
    ["bread-pudding", "Bread Pudding", [1390, 26, 204, 53, 830, 4, 135]],
    ["grannys-apple-classic", "Granny's Apple Classic", [1110, 9, 161, 50, 970, 2, 97]],
    ["strawberry-cheesecake", "Strawberry Cheesecake", [800, 10, 76, 47, 550, 3, 60]],
  ], "1 complete dessert as published"),
  ...texasRoadhouseCategoryFoods([
    ["coca-cola", "Coca-Cola", [120, 0, 34, 0, 0, 0, 0]],
    ["diet-coke", "Diet Coke", [0, 1, 0, 0, 10, 0, 0]],
    ["dr-pepper", "Dr Pepper", [130, 0, 33, 0, 50, 0, 32]],
    ["sprite", "Sprite", [120, 0, 31, 0, 30, 0, 31]],
    ["minute-maid-lemonade", "Minute Maid Lemonade", [130, 0, 36, 0, 90, 0, 34]],
    ["blue-crush-lemonade", "Blue Crush Lemonade", [150, 0, 40, 0, 30, 0, 38]],
    ["wild-strawberry-lemonade", "Wild Strawberry Lemonade", [150, 0, 40, 0, 30, 0, 38]],
    ["sweet-iced-tea", "Original Sweet Iced Tea", [110, 0, 28, 0, 5, 0, 27]],
    ["unsweet-iced-tea", "Original Unsweet Iced Tea", [0, 0, 0, 0, 0, 0, 0]],
    ["regular-coffee", "Regular Coffee", [5, 0, 1, 0, 0, 0, 0]],
    ["chocolate-milk", "Chocolate Milk", [150, 7, 26, 2.5, 170, null, 23]],
    ["regular-milk", "Regular Milk", [90, 7, 10, 2, 105, 0, 10]],
  ], "1 published restaurant beverage serving; the portal does not state a fluid-ounce volume"),
  texasRoadhouseFood("original-margarita", "Original Margarita", "Choose the published preparation and glass size; this restaurant-specific alcoholic nutrition is supported by the existing serving model", null, [
    texasRoadhouseOption("original-margarita:frozen-10oz", "10 oz frozen Original Margarita", texasRoadhouseNutrients([230, 0, 35, 0, 5, 0, 31])),
    texasRoadhouseOption("original-margarita:frozen-18oz", "18 oz frozen Original Margarita", texasRoadhouseNutrients([490, 0, 75, 0, 10, 0, 66])),
    texasRoadhouseOption("original-margarita:rocks-10oz", "10 oz Original Margarita on the rocks", texasRoadhouseNutrients([170, 0, 16, 0, 0, 0, 14])),
    texasRoadhouseOption("original-margarita:rocks-18oz", "18 oz Original Margarita on the rocks", texasRoadhouseNutrients([270, 0, 26, 0, 0, 0, 23])),
  ]),
];
const texasRoadhouseFoods = [
  ...texasRoadhouseAppetizerFoods,
  ...texasRoadhouseSoupFoods,
  ...texasRoadhouseSaladFoods,
  ...texasRoadhouseDressingSauceFoods,
  ...texasRoadhouseSteakFoods,
  ...texasRoadhouseComboFoods,
  ...texasRoadhouseChickenDinnerFoods,
  ...texasRoadhouseSeafoodFoods,
  ...texasRoadhouseBurgerFoods,
  ...texasRoadhouseSideFoods,
  ...texasRoadhouseKidsFoods,
  ...texasRoadhouseDessertDrinkFoods,
];

const sitDownNutrients = ([calories, protein, carbohydrates, fat, sodium, fiber, totalSugar]) => menuPublished(
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar
);
const sitDownFood = (chain, sourceUrl, sourceReference, aliases, id, name, description, values, servingOptions) => menuFood(
  chain,
  sourceUrl,
  sourceReference,
  id,
  name,
  description,
  values ? sitDownNutrients(values) : null,
  servingOptions?.map(([optionId, optionDescription, optionValues, amount = 1]) => expansionMenuOption(
    chain, sourceUrl, sourceReference, `${id}:${optionId}`, optionDescription, sitDownNutrients(optionValues), amount
  )),
  aliases.flatMap((alias) => [
    `${alias} ${name}`,
    ...(servingOptions || []).map((option) => `${alias} ${name} ${option[1]}`),
  ])
);
const sitDownRows = (foodFactory, rows, description) => rows.map(([id, name, values, itemDescription]) => foodFactory(
  id, name, itemDescription || description, values
));

const oliveGarden = { id: "olive-garden", name: "Olive Garden" };
const OLIVE_GARDEN_SOURCE = "https://media.olivegarden.com/en_us/pdf/olive_garden_nutrition.pdf";
const OLIVE_GARDEN_REFERENCE = "Olive Garden official U.S. Nutrition Information, effective August 31, 2026 (U.S. restaurants excluding Hawaii). Values are for the named item as served; breadsticks, soup, and salad are excluded unless named.";
const oliveGardenFood = (id, name, description, values, options) => sitDownFood(
  oliveGarden, OLIVE_GARDEN_SOURCE, OLIVE_GARDEN_REFERENCE, ["Olive Garden"], id, name, description, values, options
);
const oliveGardenFoods = [
  ...sitDownRows(oliveGardenFood, [
    ["calamari", "Calamari", [670,24,48,42,1600,2,3]],
    ["fried-mozzarella", "Fried Mozzarella", [800,33,57,49,1990,4,3]],
    ["lasagna-fritta", "Lasagna Fritta", [1130,39,75,76,1800,5,6]],
    ["meatballs-parmigiana", "Meatballs Parmigiana", [1040,51,27,83,2800,6,5]],
    ["shrimp-fritto-misto", "Shrimp Fritto Misto", [1280,41,101,79,5010,9,9]],
    ["spinach-artichoke-dip", "Spinach-Artichoke Dip with Flatbread Crisps", [1160,33,75,81,2440,7,8]],
    ["stuffed-ziti-fritta", "Stuffed Ziti Fritta", [500,27,40,26,1040,3,null]],
    ["toasted-ravioli", "Toasted Ravioli", [650,25,69,31,1330,4,5]],
  ], "1 full appetizer order; separately published dipping sauce is excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["breadstick-garlic-topping", "Breadstick with Garlic Topping", [140,4,25,2.5,460,null,1]],
    ["breadstick-plain", "Plain Breadstick", [130,4,25,1,280,1,2]],
  ], "1 breadstick; entree, soup, salad, and additional breadsticks are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["chicken-gnocchi-soup", "Chicken & Gnocchi Soup", [230,11,22,12,1290,1,4]],
    ["minestrone-soup", "Minestrone Soup", [110,5,17,1,810,4,4]],
    ["pasta-fagioli-soup", "Pasta Fagioli Soup", [150,8,16,5,710,3,4]],
    ["zuppa-toscana-soup", "Zuppa Toscana Soup", [220,7,15,15,790,2,2]],
  ], "1 published 8 fl oz soup serving; unlimited refills are logged one serving at a time"),
  ...sitDownRows(oliveGardenFood, [
    ["house-salad-signature-dressing", "Famous House Salad with Signature Italian Dressing", [150,3,13,10,770,2,4]],
    ["house-salad-no-dressing", "Famous House Salad without Dressing", [70,2,11,2,250,2,2]],
  ], "1 approximately 5 oz salad serving; breadsticks and additional unlimited servings are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["spicy-alfredo-dipping-sauce", "Spicy Alfredo Dipping Sauce", [490,9,7,48,700,0,3]],
    ["alfredo-dipping-sauce", "Alfredo Dipping Sauce", [440,8,5,43,600,0,1]],
    ["five-cheese-marinara-dipping-sauce", "Five Cheese Marinara Dipping Sauce", [200,5,9,17,650,1,5]],
    ["marinara-dipping-sauce", "Marinara Dipping Sauce", [70,2,8,4.5,640,2,5]],
    ["signature-italian-dressing", "Signature Italian Dressing", [80,0,2,8,520,0,2], "1 fl oz dressing; salad is excluded"],
    ["low-fat-italian-dressing", "Low-Fat Italian Dressing", [30,0,2,2,410,0,2], "1 fl oz dressing; salad is excluded"],
  ], "1 separately published dipping sauce serving; food for dipping is excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["fettuccine-pasta", "Fettuccine Pasta", [350,12,67,2.5,10,3,2]],
    ["angel-hair-pasta", "Angel Hair Pasta", [350,12,67,2.5,10,3,2]],
    ["bucatini-pasta", "Bucatini Pasta", [410,15,81,3,0,3,3]],
    ["gluten-free-rotini", "Gluten-Free Rotini", [380,9,77,3.5,260,5,0]],
    ["rigatoni-pasta", "Rigatoni Pasta", [440,14,83,6,10,3,5]],
    ["spaghetti-pasta", "Spaghetti Pasta", [340,12,67,3.5,10,3,4]],
  ], "1 Create Your Own Pasta noodle serving; sauce, toppings, soup, salad, and breadsticks are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["spicy-alfredo-sauce", "Spicy Alfredo Sauce", [980,18,15,97,1400,0,7]],
    ["alfredo-sauce", "Alfredo Sauce", [870,15,11,87,1200,0,2]],
    ["creamy-mushroom-sauce", "Creamy Mushroom Sauce", [860,10,13,87,1090,0,7]],
    ["five-cheese-marinara-sauce", "Five Cheese Marinara Sauce", [400,11,17,33,1300,3,10]],
    ["marinara-sauce", "Marinara Sauce", [150,4,17,9,1280,4,10]],
    ["meat-sauce", "Meat Sauce", [300,14,19,19,1040,2,13]],
  ], "1 Create Your Own Pasta sauce serving; pasta and toppings are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["crispy-shrimp-fritta-topping", "Crispy Shrimp Fritta Topping", [220,11,17,12,810,1,3]],
    ["crispy-chicken-fritta-topping", "Crispy Chicken Fritta Topping", [240,20,14,12,730,1,null]],
    ["grilled-chicken-topping", "Grilled Chicken Topping", [130,26,null,2.5,540,0,0]],
    ["italian-sausage-topping", "Italian Sausage Topping", [470,27,2,39,1140,null,2], "2 links; pasta and sauce are excluded"],
    ["meatballs-topping", "Meatballs", [480,23,7,40,1060,3,0], "3 meatballs; pasta and sauce are excluded"],
    ["sauteed-shrimp-topping", "Sauteed Shrimp Topping", [170,33,1,3.5,410,null,0]],
    ["broccoli-topping", "Broccoli Topping", [150,4,8,13,220,3,2]],
  ], "1 separately published Create Your Own Pasta topping; pasta and sauce are excluded"),
  ...[
    ["spicy-alfredo-fettuccine", "Spicy Alfredo Fettuccine", [1000,22,62,74,1060,2,7], [1330,30,82,99,1410,3,9]],
    ["cheese-ravioli-marinara", "Cheese Ravioli with Marinara Sauce", [440,25,38,22,1330,3,4], [750,41,63,38,2370,5,8]],
    ["cheese-ravioli-meat-sauce", "Cheese Ravioli with Meat Sauce", [500,29,39,26,1240,2,6], [860,50,65,46,2190,4,11]],
    ["chicken-parmigiana", "Chicken Parmigiana", [630,36,61,29,1970,5,10], [1020,64,80,51,3300,7,13]],
    ["eggplant-parmigiana", "Eggplant Parmigiana", [660,21,75,32,1540,7,13], [1070,35,108,58,2440,11,20]],
    ["fettuccine-alfredo", "Fettuccine Alfredo", [920,20,58,67,910,2,3], [1220,27,78,89,1210,3,5]],
    ["five-cheese-ziti-al-forno", "Five Cheese Ziti al Forno", [630,24,57,35,1220,4,9], [1170,46,98,69,2440,6,16]],
    ["lasagna-classico", "Lasagna Classico", [500,29,33,30,1290,3,7], [940,54,61,55,2260,6,11]],
    ["shrimp-scampi", "Shrimp Scampi", [460,20,52,18,1020,4,5], [490,29,52,18,1120,4,5]],
    ["spaghetti-marinara", "Spaghetti with Marinara", [370,11,63,9,970,5,10], [490,15,83,12,1290,6,13]],
    ["spaghetti-meat-sauce", "Spaghetti with Meat Sauce", [480,19,64,17,790,3,13], [640,26,85,22,1050,4,17]],
  ].map(([id, name, lunch, dinner]) => oliveGardenFood(id, name, "Choose a published lunch/lighter or dinner portion; soup, salad, and breadsticks are excluded", null, [
    ["lunch", "Lunch or lighter portion; soup, salad, and breadsticks excluded", lunch],
    ["dinner", "Dinner portion; soup, salad, and breadsticks excluded", dinner],
  ])),
  ...sitDownRows(oliveGardenFood, [
    ["calabrian-steak-shrimp-bucatini", "Calabrian Steak & Shrimp Bucatini", [1220,78,82,65,2960,6,11]],
    ["chicken-shrimp-carbonara", "Chicken & Shrimp Carbonara", [1370,64,75,91,2050,3,10]],
    ["chicken-alfredo-crispy", "Chicken Alfredo with Crispy Chicken Fritta", [1710,67,106,113,2670,5,6]],
    ["chicken-alfredo-grilled", "Chicken Alfredo with Grilled Chicken", [1480,79,79,95,2290,4,5]],
    ["chicken-scampi", "Chicken Scampi", [1050,49,106,45,2470,5,8]],
    ["chicken-tortelloni-alfredo", "Chicken Tortelloni Alfredo", [1980,112,95,131,3720,5,9]],
    ["grilled-chicken-margherita", "Grilled Chicken Margherita", [650,65,15,39,2120,5,5]],
    ["herb-grilled-salmon", "Herb-Grilled Salmon", [610,45,9,45,1360,4,3]],
    ["ravioli-carbonara", "Ravioli Carbonara", [1390,53,63,104,2660,3,6]],
    ["seafood-alfredo", "Seafood Alfredo", [1370,53,81,93,1690,3,5]],
    ["shrimp-alfredo", "Shrimp Alfredo", [1390,60,79,93,1620,4,5]],
    ["shrimp-carbonara", "Shrimp Carbonara", [1200,58,63,81,1710,4,10]],
    ["steak-gorgonzola-alfredo", "Steak Gorgonzola Alfredo", [1580,74,85,105,2750,5,8]],
    ["stuffed-chicken-marsala", "Stuffed Chicken Marsala", [1170,70,94,58,3020,8,10]],
    ["tour-of-italy", "Tour of Italy", [1550,72,99,97,3220,7,12]],
    ["six-ounce-sirloin", "6 oz Sirloin", [980,57,49,62,1840,2,3]],
  ], "1 dinner entree; soup, salad, and breadsticks are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["mashed-potatoes", "Mashed Potatoes", [200,4,27,8,580,3,1]],
    ["parmesan-garlic-broccoli", "Parmesan Garlic Broccoli", [150,5,8,13,450,3,2]],
  ], "1 separately published side order"),
  ...sitDownRows(oliveGardenFood, [
    ["black-tie-mousse-cake", "Black Tie Mousse Cake", [750,9,76,50,290,4,59]],
    ["chocolate-lasagna", "Chocolate Lasagna", [980,13,116,58,630,6,86]],
    ["sicilian-cheesecake-strawberry", "Sicilian Cheesecake with Strawberry Topping", [730,12,78,42,450,2,63]],
    ["strawberry-cream-cake", "Strawberry Cream Cake", [540,9,69,26,370,2,47]],
    ["tiramisu", "Tiramisu", [470,6,54,27,125,0,35]],
    ["warm-italian-doughnuts", "Warm Italian Doughnuts", [810,20,119,28,510,6,25]],
  ], "1 complete dessert order; optional sauce is excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["kids-cheese-ravioli", "Kids Cheese Ravioli", [340,17,33,16,980,3,6]],
    ["kids-cheese-pizza", "Kids Cheese Pizza", [400,17,54,13,720,3,4]],
    ["kids-chicken-fingers", "Kids Chicken Fingers", [300,25,15,15,580,0,0]],
    ["kids-macaroni-cheese", "Kids Macaroni & Cheese", [360,16,45,14,870,2,6]],
    ["kids-spaghetti-tomato-sauce", "Kids Spaghetti with Tomato Sauce", [180,5,30,4.5,290,2,5]],
  ], "1 kids' entree; side and beverage are excluded"),
  ...sitDownRows(oliveGardenFood, [
    ["coffee", "Coffee", [0,0,0,0,0,0,0]],
    ["tea", "Tea", [0,null,0,0,5,0,0]],
    ["cappuccino", "Cappuccino", [150,null,13,6,70,null,10]],
    ["iced-coffee-caramel", "Caramel Iced Coffee", [250,7,40,7,90,0,31]],
    ["iced-coffee-traditional", "Traditional Iced Coffee", [210,7,29,7,90,0,21]],
    ["bellini-peach-raspberry-iced-tea", "Bellini Peach-Raspberry Iced Tea", [80,0,18,0,10,0,17]],
    ["mango-passion-fruit-iced-tea", "Mango-Passion Fruit Iced Tea", [100,0,26,0,15,0,24]],
    ["classic-lemonade", "Classic Lemonade", [170,0,43,0,20,0,42]],
    ["raspberry-lemonade", "Raspberry Lemonade", [160,0,45,0,15,0,42]],
    ["sweet-pear-limonata", "Sweet Pear Limonata", [240,0,60,0,20,0,57]],
    ["coca-cola", "Coca-Cola", [140,0,39,0,45,0,39]],
    ["coke-zero", "Coke Zero", [0,0,0,0,40,0,0]],
    ["diet-coke", "Diet Coke", [0,0,0,0,40,0,0]],
    ["dr-pepper", "Dr Pepper", [150,0,41,0,55,0,41]],
    ["sprite", "Sprite", [140,0,38,0,65,0,38]],
  ], "1 published restaurant beverage serving; fluid-ounce volume is not stated"),
];

const longHorn = { id: "longhorn-steakhouse", name: "LongHorn Steakhouse" };
const LONGHORN_SOURCE = "https://media.longhornsteakhouse.com/en_us/pdf/nutrition_allergen_guide.pdf";
const LONGHORN_REFERENCE = "LongHorn Steakhouse official U.S. Nutrition & Allergen Guide, valid as of August 10, 2026. Entree proteins exclude separately listed sides and sauces unless the description states otherwise; menu steak weights are not treated as cooked weights.";
const longHornFood = (id, name, description, values, options) => sitDownFood(
  longHorn, LONGHORN_SOURCE, LONGHORN_REFERENCE, ["Longhorn", "Long Horn"], id, name, description, values, options
);
const longHornFoods = [
  ...sitDownRows(longHornFood, [
    ["spicy-chicken-bites", "Spicy Chicken Bites", [740,43,53,39,1420,0,17]],
    ["parmesan-crusted-fries", "Parmesan Crusted Fries", [2070,72,155,130,5650,2,4]],
    ["texas-tonion", "Texas Tonion", [1180,15,126,69,2720,9,9]],
    ["white-cheddar-stuffed-mushrooms", "White Cheddar Stuffed Mushrooms", [730,33,14,60,1570,1,4]],
    ["firecracker-chicken-wraps", "Firecracker Chicken Wraps", [720,28,62,42,2120,0,0]],
    ["wild-west-shrimp", "Wild West Shrimp", [970,39,65,62,3740,6,2]],
    ["seasoned-steakhouse-wings", "Seasoned Steakhouse Wings", [460,53,0,28,1030,null,0]],
  ], "1 full appetizer order; separately published dipping sauce is excluded"),
  ...[
    ["loaded-potato-soup", "Loaded Potato Soup", [270,10,16,19,670,2,2], [380,15,21,27,970,2,2]],
    ["shrimp-lobster-chowder", "Shrimp & Lobster Chowder", [190,8,17,11,570,2,4], [250,10,23,15,760,3,5]],
    ["french-onion-soup", "French Onion Soup", [170,8,13,10,880,1,4], [480,30,20,31,1830,0,7]],
  ].map(([id, name, cup, bowl]) => longHornFood(id, name, "Choose the published cup or bowl serving", null, [
    ["cup", `1 cup of ${name}`, cup], ["bowl", `1 bowl of ${name}`, bowl],
  ])),
  ...sitDownRows(longHornFood, [
    ["mixed-greens-side-salad", "Mixed Greens Side Salad", [140,6,13,8,270,3,3]],
    ["caesar-side-salad", "Caesar Side Salad with Caesar Dressing", [250,6,12,19,600,2,1]],
    ["strawberry-pecan-side-salad", "Strawberry & Pecan Side Salad with Dressing", [190,4,28,8,300,4,22]],
    ["grilled-chicken-strawberry-salad", "Grilled Chicken & Strawberry Salad with Vinaigrette", [530,43,52,19,1310,7,41]],
    ["field-greens-crispy-chicken", "Farm Fresh Field Greens with Crispy Chicken Tenders", [650,46,41,35,1090,7,6]],
    ["field-greens-salmon", "Farm Fresh Field Greens with Salmon", [530,43,23,29,710,5,7]],
    ["seven-pepper-sirloin-salad", "7-Pepper Sirloin Salad", [490,45,22,26,1120,5,5]],
  ], "1 salad with the named dressing included; no additional dressing included"),
  ...[
    ["blue-cheese-dressing", "Blue Cheese Dressing", [180,2,3,17,390,0,2], [350,4,6,34,770,0,3]],
    ["honey-mustard-dressing", "Honey Mustard Dressing", [240,0,8,23,200,0,6], [480,0,15,45,410,0,12]],
    ["ranch-dressing", "Ranch Dressing", [230,null,2,25,380,0,1], [460,2,4,49,750,0,3]],
    ["raspberry-vinaigrette", "Raspberry Vinaigrette", [60,0,14,0.5,220,0,12], [120,0,27,1,440,0,25]],
    ["thousand-island-dressing", "Thousand Island Dressing", [190,0,5,19,300,0,4], [390,null,11,39,610,0,9]],
    ["white-balsamic-vinaigrette", "White Balsamic Vinaigrette", [200,0,6,20,240,0,5], [390,0,12,39,480,0,9]],
  ].map(([id, name, small, large]) => longHornFood(id, name, "Choose the guide's published dressing portion; salad is excluded", null, [
    ["1.5oz", "1.5 oz dipping or side-salad portion", small], ["3oz", "3 oz steakhouse-salad portion", large],
  ])),
  ...[
    ["hand-breaded-chicken-tenders", "Hand-Breaded Chicken Tenders", [["6-piece", "6 tenders; sauce and sides excluded", [420,36,19,22,680,2,null], 6], ["9-piece", "9 tenders; sauce and sides excluded", [620,53,28,33,1030,4,null], 9]]],
    ["parmesan-crusted-chicken", "Parmesan Crusted Chicken", [["6oz", "6 oz menu-listed chicken; sides excluded", [560,51,12,34,1580,2,2]], ["9oz", "9 oz menu-listed chicken; sides excluded", [650,68,12,36,1860,2,2]], ["12oz", "12 oz menu-listed chicken; sides excluded", [1120,102,24,69,3160,4,3]]]],
    ["baby-back-ribs", "Baby Back Ribs", [["half-rack", "Half rack; BBQ sauce and sides excluded", [820,62,16,56,740,1,15]], ["full-rack", "Full rack; BBQ sauce and sides excluded", [1270,96,25,87,1150,2,24]]]],
    ["longhorn-salmon", "LongHorn Salmon", [["7oz", "7 oz menu-listed salmon; rice and sides excluded", [300,33,2,16,310,0,1]], ["10oz", "10 oz menu-listed salmon; rice and sides excluded", [430,47,3,23,440,0,2]]]],
    ["lemon-garlic-chicken", "Lemon Garlic Chicken", [["6oz", "6 oz menu-listed chicken; sides excluded", [240,36,2,10,840,0,null]], ["9oz", "9 oz menu-listed chicken; sides excluded", [330,53,2,12,1120,0,null]], ["12oz", "12 oz menu-listed chicken; sides excluded", [420,70,2,15,1400,0,null]]]],
    ["flos-filet", "Flo's Filet", [["6oz", "6 oz menu-listed filet; sides excluded", [330,37,2,15,330,0,null]], ["9oz", "9 oz menu-listed filet; sides excluded", [450,56,3,19,480,0,1]]]],
    ["renegade-sirloin", "Renegade Sirloin", [["6oz", "6 oz menu-listed sirloin; sides excluded", [320,36,2,15,530,0,0]], ["8oz", "8 oz menu-listed sirloin; sides excluded", [390,51,2,16,670,0,0]]]],
  ].map(([id, name, options]) => longHornFood(id, name, "Choose the published piece count or menu-listed weight; cooked weight is not inferred, and sauce and sides are excluded", null, options)),
  ...sitDownRows(longHornFood, [
    ["grilled-lamb-chops", "Grilled Lamb Chops", [1120,63,42,79,1670,6,3]],
    ["redrock-grilled-shrimp", "Redrock Grilled Shrimp", [160,30,2,3,960,null,null], "8 grilled shrimp; rice, garlic butter, and sides excluded"],
    ["chop-steak", "Chop Steak", [640,44,13,46,1240,3,6]],
    ["outlaw-ribeye", "Outlaw Ribeye 20 oz", [1250,94,2,87,1670,0,0]],
    ["ribeye", "Ribeye 12 oz", [810,66,4,54,670,0,0]],
    ["new-york-strip", "New York Strip 12 oz", [630,72,1,33,1740,1,null]],
    ["fire-grilled-t-bone", "Fire-Grilled T-Bone 18 oz", [1130,123,1,62,2030,2,1]],
    ["the-longhorn", "The LongHorn 22 oz", [1280,150,1,67,2450,2,1]],
    ["half-pound-steakhouse-cheeseburger", "Half-Pound Steakhouse Cheeseburger", [850,48,45,51,1150,3,5]],
    ["crispy-buttermilk-chicken-sandwich", "Crispy Buttermilk Chicken Sandwich", [1080,44,67,72,2325,5,9]],
  ], "1 entree protein or sandwich; separately listed fries, rice, sauce, and sides are excluded; listed weights are not cooked weights"),
  ...sitDownRows(longHornFood, [
    ["parmesan-cheese-crust", "Parmesan Cheese Crust", [390,17,12,30,1020,2,2]],
    ["grilled-mushrooms", "Grilled Mushrooms", [150,6,9,12,480,3,6]],
    ["lobster-tail", "Lobster Tail", [90,14,0,3,590,0,0]],
    ["bbq-sauce", "BBQ Sauce", [110,0,26,0,470,0,23]],
    ["buffalo-sauce", "Buffalo Sauce", [90,0,3,8,1280,0,0]],
  ], "1 separately published steak addition or sauce; entree and sides are excluded"),
  ...sitDownRows(longHornFood, [
    ["fire-grilled-corn", "Fire-Grilled Corn on the Cob", [200,7,28,9,240,3,10]],
    ["fresh-steamed-asparagus", "Fresh Steamed Asparagus", [130,8,9,7,15,5,3]],
    ["steakhouse-mac-cheese", "Steakhouse Mac & Cheese", [610,26,43,37,1210,5,3]],
    ["crispy-brussels-sprouts", "Crispy Brussels Sprouts", [310,5,27,23,590,5,17]],
    ["plain-baked-potato", "Plain Idaho Baked Potato", [290,8,64,2,2370,6,3]],
    ["loaded-baked-potato", "Loaded Idaho Baked Potato", [470,11,65,20,2570,6,4]],
    ["plain-sweet-potato", "Plain Sweet Potato", [240,5,55,0,95,9,17]],
    ["loaded-sweet-potato", "Sweet Potato with Cinnamon Sugar & Butter", [380,5,62,14,170,9,24]],
    ["mashed-potatoes", "Mashed Potatoes", [340,5,37,19,790,4,2]],
    ["seasoned-rice-pilaf", "Seasoned Rice Pilaf", [230,3,41,6,1120,null,4]],
    ["fresh-steamed-broccoli", "Fresh Steamed Broccoli", [90,4,7,4,125,4,3]],
    ["seasoned-french-fries", "Seasoned French Fries", [500,6,67,23,1280,0,1]],
    ["honey-wheat-bread-loaf", "Honey Wheat Bread", [480,16,88,7,920,2,8], "1 full loaf; butter is excluded"],
    ["butter", "Butter", [120,0,0,13,80,0,0]],
  ], "1 separately published side; entree is excluded"),
  ...sitDownRows(longHornFood, [
    ["chocolate-stampede", "Chocolate Stampede", [2460,28,289,132,1040,12,191]],
    ["molten-lava-cake", "Molten Lava Cake", [1150,15,157,53,690,0,111]],
    ["strawberries-cream-shortcake", "Strawberries & Cream Shortcake", [640,7,74,37,630,2,49]],
    ["cheesecake-pecans", "The Cheesecake with Pecans", [1370,18,117,82,970,4,79]],
    ["cheesecake-strawberry", "The Cheesecake with Strawberry", [1090,18,94,70,860,2,72]],
  ], "1 complete dessert order"),
  ...sitDownRows(longHornFood, [
    ["kids-grilled-chicken-tenders", "Kids Grilled Chicken Tenders", [140,26,0,3.5,440,0,0]],
    ["kids-sirloin-steak", "Kids Sirloin Steak", [240,24,1,16,390,null,0]],
    ["kids-macaroni-cheese", "Kids Kraft Macaroni & Cheese", [310,11,45,9,550,2,8]],
    ["kids-cheeseburger", "Kids Cheeseburger", [490,29,41,24,780,0,3]],
    ["kids-chicken-tenders", "Kids Chicken Tenders", [270,23,12,14,450,2,0]],
  ], "1 kids' entree; side and beverage are excluded"),
  ...sitDownRows(longHornFood, [
    ["raspberry-iced-tea", "Raspberry Iced Tea", [50,0,13,0,10,0,12]],
    ["peach-iced-tea", "Peach Iced Tea", [50,0,14,0,10,0,12]],
    ["sweet-tea", "Sweet Tea", [130,0,33,0,10,0,32]],
    ["unsweetened-tea", "Unsweetened Tea", [0,0,0,0,10,0,0]],
    ["strawberry-lemonade", "Strawberry Lemonade", [200,0,55,0,15,null,46]],
    ["raspberry-lemonade", "Raspberry Lemonade", [170,0,41,0,0,null,39]],
    ["mango-lemonade", "Mango Lemonade", [240,0,60,0,0,null,59]],
    ["coca-cola", "Coca-Cola", [140,null,39,0,45,null,39]],
    ["coke-zero", "Coke Zero Sugar", [0,0,0,0,45,0,0]],
    ["diet-coke", "Diet Coke", [0,0,0,0,45,0,0]],
    ["sprite", "Sprite", [140,null,38,0,65,null,38]],
    ["dr-pepper", "Dr Pepper", [100,0,27,0,35,0,27]],
    ["coffee", "Coffee", [0,0,0,0,5,0,0]],
  ], "1 bottomless beverage serving; refills are logged separately and fluid-ounce volume is not stated"),
];

const outback = { id: "outback-steakhouse", name: "Outback Steakhouse" };
const OUTBACK_SOURCE = "https://edge.sitecorecloud.io/osirestaurantpartners-piq24hos/media/Project/BBI/outback/files/obs-full-nutrition-information.pdf";
const OUTBACK_REFERENCE = "Outback Steakhouse official U.S. Nutrition Information, created August 2026. Values use standard recipes and the PDF's named serving; entree proteins exclude separately listed sides and sauces unless named, and menu steak weights are not treated as cooked weights.";
const outbackFood = (id, name, description, values, options) => sitDownFood(
  outback, OUTBACK_SOURCE, OUTBACK_REFERENCE, ["Outback", "Outback Steakhouse"], id, name, description, values, options
);
const outbackFoods = [
  ...sitDownRows(outbackFood, [
    ["bloomin-onion", "Bloomin' Onion", [1920,17,131,152,4870,17,24]],
    ["three-cheese-spinach-dip", "Three Cheese Spinach Dip", [680,21,60,41,1950,5,3]],
    ["aussie-cheese-fries", "Aussie Cheese Fries", [2860,80,208,200,9330,22,3]],
    ["alice-springs-chicken-quesadilla", "Alice Springs Chicken Quesadilla", [1140,47,56,85,1910,2,16]],
    ["sydney-shrooms", "Sydney 'Shrooms", [1480,16,62,129,2600,10,4], "1 full 10 oz appetizer; dip is excluded"],
    ["kookaburra-wings-mild", "Kookaburra Wings - Mild", [1820,88,25,155,3100,5,4], "10 wings with Mild flavor included; dipping sauce is excluded"],
    ["kookaburra-wings-medium", "Kookaburra Wings - Medium", [1870,89,26,161,3510,5,4], "10 wings with Medium flavor included; dipping sauce is excluded"],
    ["kookaburra-wings-hot", "Kookaburra Wings - Hot", [2380,89,54,209,4470,6,5], "10 wings with Hot flavor included; dipping sauce is excluded"],
    ["buffalo-ranch-wings", "Buffalo Ranch Wings", [2270,91,41,202,3910,8,8], "10 wings with Buffalo Ranch flavor included; dipping sauce is excluded"],
    ["sweet-bbq-wings", "Sweet BBQ Wings", [2200,106,89,184,5170,11,39], "10 wings with Sweet BBQ flavor included; dipping sauce is excluded"],
    ["mozzarella-bloomerangs", "Mozzarella Bloomerangs", [920,35,68,56,3010,5,8]],
    ["gold-coast-coconut-shrimp", "Gold Coast Coconut Shrimp", [970,34,59,66,570,1,41], "6 shrimp; dipping sauce is excluded"],
    ["table-bread-butter", "Table Bread with Butter", [360,10,51,13,420,4,10]],
  ], "1 full appetizer order; separately selected dipping sauce is excluded"),
  ...[
    ["tasmanian-chili", "Tasmanian Chili", [200,12,7,14,830,2,3], [370,23,14,25,1630,3,7], "crock"],
    ["baked-potato-soup", "Baked Potato Soup", [250,6,17,18,1450,1,2], [450,9,33,32,2760,2,4], "bowl"],
  ].map(([id, name, small, large, largeName]) => outbackFood(id, name, "Choose the separately published soup portion", null, [
    ["cup", `1 cup of ${name}`, small], [largeName, `1 ${largeName} of ${name}`, large],
  ])),
  ...sitDownRows(outbackFood, [
    ["french-onion-soup", "French Onion Soup", [410,16,27,25,2520,2,11]],
    ["blue-cheese-pecan-side-salad", "Blue Cheese Pecan Chopped Side Salad", [440,12,23,34,700,4,7]],
    ["house-side-salad-no-dressing", "House Side Salad without Dressing", [180,8,16,10,340,2,4]],
    ["caesar-side-salad", "Caesar Side Salad with Dressing", [240,5,13,19,570,3,2]],
    ["wedge-side-salad", "Wedge Salad with Dressing", [560,13,19,48,1360,4,13]],
    ["fresh-sydney-salad", "Fresh Sydney Salad", [330,21,21,18,1040,7,8]],
  ], "1 soup or salad serving; dressing is included only when named"),
  ...sitDownRows(outbackFood, [
    ["ranch-side-salad-dressing", "Ranch Dressing for Side Salad", [210,1,1,24,240,0,1]],
    ["caesar-side-salad-dressing", "Caesar Dressing for Side Salad", [200,2,2,21,500,0,0]],
    ["honey-mustard-side-salad-dressing", "Honey Mustard Dressing for Side Salad", [220,0,12,21,290,0,11]],
    ["tangy-tomato-side-salad-dressing", "Tangy Tomato Dressing for Side Salad", [60,1,14,0,230,0,13]],
    ["blue-cheese-vinaigrette-side", "Blue Cheese Vinaigrette for Side Salad", [150,1,1,16,170,0,1]],
    ["creamy-blue-cheese-side", "Creamy Blue Cheese Dressing for Side Salad", [200,2,2,21,500,0,0]],
    ["light-balsamic-vinaigrette-side", "Light Balsamic Vinaigrette for Side Salad", [70,0,7,4.5,300,0,7]],
    ["mustard-vinaigrette-side", "Mustard Vinaigrette for Side Salad", [230,0,4,24,120,0,4]],
  ], "1 separately published side-salad dressing portion; salad is excluded"),
  ...[
    ["victorias-filet-mignon", "Victoria's Filet Mignon", [["6oz", "6 oz menu-listed filet; sides excluded", [470,47,1,29,550,0,0]], ["8oz", "8 oz menu-listed filet; sides excluded", [570,62,1,34,580,0,0]]]],
    ["center-cut-sirloin", "Outback Center-Cut Sirloin", [["5oz", "5 oz menu-listed sirloin; sides excluded", [260,29,2,15,370,1,0]], ["6oz", "6 oz menu-listed sirloin; sides excluded", [330,35,2,20,590,2,0]], ["8oz", "8 oz menu-listed sirloin; sides excluded", [400,47,3,22,630,2,0]], ["9oz", "9 oz menu-listed sirloin; sides excluded", [420,53,4,21,1320,3,0]], ["12oz", "12 oz menu-listed sirloin; sides excluded", [500,70,6,21,2030,4,0]]]],
    ["classic-prime-rib", "Classic Prime Rib", [["10oz", "10 oz menu-listed prime rib; sides excluded", [950,47,2,82,820,1,0]], ["12oz", "12 oz menu-listed prime rib; sides excluded", [1140,57,3,98,920,1,0]], ["16oz", "16 oz menu-listed prime rib; sides excluded", [1520,76,4,131,1130,1,0]]]],
  ].map(([id, name, options]) => outbackFood(id, name, "Choose the published menu-listed steak weight; cooked weight is not inferred, and sides are excluded", null, options)),
  ...sitDownRows(outbackFood, [
    ["new-york-strip", "New York Strip 12 oz", [880,61,2,68,1620,1,0]],
    ["delmonico", "Delmonico 15 oz", [1000,65,3,79,1600,1,0]],
    ["bone-in-ribeye", "Bone-In Ribeye 20 oz", [1300,87,3,102,1650,1,0]],
    ["ribeye", "Ribeye 13 oz", [1030,63,3,83,1970,1,0]],
    ["canberra-chopped-steak", "Canberra Chopped Steak 10 oz", [930,74,4,67,1000,0,1]],
    ["ahi-tuna", "Ahi Tuna", [660,31,48,11,1960,3,19]],
    ["grilled-salmon-remoulade", "Grilled Salmon with Remoulade", [730,45,2,58,650,1,1]],
    ["toowoomba-salmon", "Toowoomba Salmon", [970,66,9,74,1220,1,4]],
    ["lobster-tails-entree", "Lobster Tails Entree", [490,60,0,25,1120,0,0]],
  ], "1 entree protein with named sauce included; separately selected sides are excluded and listed steak weight is not a cooked weight"),
  ...sitDownRows(outbackFood, [
    ["sauteed-shrooms", "Sauteed Shrooms", [70,2,4,5,230,1,2]],
    ["grilled-onions", "Grilled Onions", [100,2,15,4,450,3,7]],
    ["grilled-shrimp-add-on", "Grilled Shrimp Add-On", [640,23,16,53,1400,1,1]],
    ["lobster-tail-add-on", "4 oz Lobster Tail Add-On", [360,30,3,24,650,1,1]],
    ["chimichurri-sauce", "Chimichurri Sauce", [190,0,2,20,240,0,0]],
    ["roasted-garlic-butter", "Roasted Garlic Butter Topping", [80,0,1,8,110,0,0]],
    ["creamy-horseradish-sauce", "Creamy Horseradish Sauce", [45,2,4,3,150,1,2]],
    ["bacon-blue-cheese-butter", "Bacon Blue Cheese Butter", [80,2,0,9,140,0,0]],
  ], "1 separately published steak addition or sauce; steak and sides are excluded"),
  ...sitDownRows(outbackFood, [
    ["aussie-fries", "Aussie Fries", [500,7,67,23,1940,7,0]],
    ["aussie-cheese-fries-side", "Aussie Cheese Fries - Side", [880,24,61,62,2390,6,1]],
    ["loaded-baked-potato", "Loaded Baked Potato", [340,9,47,14,160,3,3]],
    ["loaded-sweet-potato", "Loaded Sweet Potato", [250,4,45,7,115,6,20]],
    ["broccoli", "Broccoli", [140,4,7,11,230,3,2]],
    ["green-beans", "Green Beans", [140,2,10,11,350,4,4]],
    ["seasoned-rice", "Seasoned Rice", [250,4,37,8,710,1,1]],
    ["homestyle-mashed-potatoes", "Homestyle Mashed Potatoes", [250,3,20,18,560,2,2]],
    ["loaded-mashed-potatoes", "Loaded Mashed Potatoes", [330,6,21,24,690,2,3]],
    ["asparagus", "Asparagus", [50,3,6,2.5,390,3,3]],
    ["parmesan-creamed-corn", "Parmesan Creamed Corn", [360,9,28,26,45,3,7]],
    ["bacon-mac-cheese", "Bacon Mac & Cheese", [870,30,74,51,1450,3,10]],
  ], "1 separately published side; entree is excluded"),
  ...sitDownRows(outbackFood, [
    ["kingsland-pasta", "Kingsland Pasta", [1790,82,116,108,2410,6,13]],
    ["queensland-pasta-chicken-shrimp", "Queensland Pasta with Chicken & Shrimp", [1660,96,116,87,2060,5,13]],
    ["outback-ribs-full-rack", "Outback Ribs - Full Rack", [1440,94,60,119,2000,3,39]],
    ["outback-ribs-half-rack", "Outback Ribs - Half Rack", [720,47,30,60,1000,2,20]],
    ["bloomin-fried-chicken", "Bloomin' Fried Chicken", [990,53,32,76,2110,6,2]],
    ["grilled-chicken-barbie", "Grilled Chicken on the Barbie 8 oz", [500,62,26,30,740,2,17]],
    ["alice-springs-chicken", "Alice Springs Chicken", [890,79,17,61,1550,1,12]],
  ], "1 entree as published; separately selected sides are excluded"),
  ...sitDownRows(outbackFood, [
    ["bloomin-burger", "The Bloomin' Burger", [1440,61,63,108,3140,5,11]],
    ["outbacker-burger-american", "The Outbacker Burger with American Cheese", [870,58,45,49,2200,2,8]],
    ["aussie-steak-sammie", "Aussie Steak Sammie", [1150,63,85,64,2300,7,19]],
    ["bloomin-chicken-sammie", "Bloomin' Chicken Sammie", [1020,38,60,73,1850,5,9]],
    ["grilled-chicken-sammie", "Grilled Chicken Sammie", [910,45,46,63,1650,3,9]],
  ], "1 burger or sandwich; fries and other sides are excluded"),
  ...sitDownRows(outbackFood, [
    ["chocolate-thunder", "Chocolate Thunder from Down Under", [870,9,82,60,220,4,71]],
    ["cheesecake-raspberry", "Cheesecake with Raspberry Sauce", [1040,16,98,64,690,2,83]],
    ["cheesecake-chocolate", "Cheesecake with Chocolate Sauce", [1090,17,88,75,730,3,71]],
    ["triple-layer-carrot-cake", "Triple Layer Carrot Cake", [1100,7,134,62,660,2,101]],
    ["chocolate-chip-cookie-skillet", "Chocolate Chip Cookie Skillet", [820,9,109,42,640,3,77]],
  ], "1 complete dessert order"),
  ...sitDownRows(outbackFood, [
    ["kids-grilled-cheese", "Kids Grilled Cheese-A-Roo", [540,13,47,32,1140,0,7]],
    ["kids-chicken-tenders", "Kids Chicken Tenders", [430,21,33,24,1450,1,1]],
    ["kids-boomerang-cheeseburger", "Kids Boomerang Cheeseburger", [590,26,40,36,920,1,6]],
    ["kids-mac-cheese", "Kids Mac-A-Roo 'N Cheese", [540,21,72,19,990,3,10]],
    ["kids-grilled-chicken", "Kids Grilled Chicken on the Barbie", [260,27,0,16,160,0,0]],
    ["kids-joey-sirloin", "Kids Joey Sirloin", [270,29,2,16,370,1,0]],
    ["kids-fries", "Kids Fries", [300,4,40,14,930,4,0]],
  ], "1 kids' entree or side; other side and beverage are excluded"),
  ...sitDownRows(outbackFood, [
    ["airport-outback-breakfast", "Outback Breakfast", [570,27,78,16,1180,2,7]],
    ["airport-alice-springs-omelet", "Alice Springs Omelet", [720,52,37,43,1570,3,5]],
    ["airport-egg-bacon-cheese-sandwich", "Egg, Bacon & Cheese Sandwich", [630,26,83,22,1740,6,11]],
    ["airport-egg-bacon-cheese-wrap", "Egg, Bacon & Cheese Wrap", [750,34,64,39,2430,3,32]],
    ["airport-aussie-breakfast-wrap", "Aussie Breakfast Wrap", [800,31,76,43,2070,4,4]],
  ], "1 published airport breakfast item; availability is limited to participating airport menus"),
  ...sitDownRows(outbackFood, [
    ["coke-zero", "Coke Zero", [0,0,0,0,5,0,0]],
    ["coca-cola", "Coca-Cola", [170,0,47,0,0,0,47]],
    ["diet-coke", "Diet Coke", [0,0,0,0,15,0,0]],
    ["dr-pepper", "Dr Pepper", [100,0,28,0,25,0,28]],
    ["coffee", "Gold Peak Coffee", [0,0,0,0,5,0,0]],
    ["sweet-tea", "Gold Peak Sweet Tea", [70,0,17,0,10,0,17]],
    ["unsweet-tea", "Gold Peak Unsweet Tea", [0,0,0,0,10,0,0]],
    ["minute-maid-lemonade", "Minute Maid Country Style Lemonade", [140,0,35,0,10,0,34]],
    ["sprite", "Sprite", [110,0,29,0,25,0,29]],
    ["aussie-palmer", "Aussie Palmer", [60,0,17,0,5,0,15]],
    ["fresh-strawberry-lemonade", "Fresh Strawberry Lemonade", [130,null,33,0,5,2,30]],
    ["kiwi-strawberry-lemonade", "Kiwi Strawberry Lemonade", [200,null,50,0,5,2,46]],
  ], "1 published soft drink or spirit-free beverage serving with ice; fluid-ounce volume is not stated"),
];

const whataburger = { id: "whataburger", name: "Whataburger" };
const WHATABURGER_REFERENCE = "Whataburger official menu/app; default recipe nutrition displayed for the current national menu";
const whataburgerFood = (id, name, description, nutrients, servingOptions) => officialFood(whataburger, id, name, description, nutrients, WHATABURGER_SOURCE, WHATABURGER_REFERENCE, servingOptions);
const whataburgerOption = (id, description, nutrients) => officialOption(whataburger.id, id, description, nutrients, 1, WHATABURGER_SOURCE, WHATABURGER_REFERENCE);
const WHATABURGER_NUTRITION_REFERENCE = "Whataburger official Nutrition Guide, nutritional information dated March 29, 2021 and still published by Whataburger; values cover the named standard item and published size, with customizations and separately listed sauces excluded unless named";
const whataburgerPublished = (calories, protein, carbohydrates, fat, sodium, fiber, totalSugar) => ({
  calories, protein, carbohydrates, fat, sodium, fiber, totalSugar, addedSugar: null,
});
const whataburgerCurrentOption = (id, description, nutrients, amount = 1) => {
  const option = officialOption(whataburger.id, id, description, nutrients, amount, WHATABURGER_NUTRITION_SOURCE, WHATABURGER_NUTRITION_REFERENCE);
  option.provenance.verification.accessedAt = CURRENT_EXPANSION_CHECKED_AT;
  option.provenance.verification.status = ["calories", "protein", "carbohydrates", "fat"].every((key) => nutrients?.[key] !== null && nutrients?.[key] !== undefined) ? "complete" : "partial";
  return option;
};
const whataburgerCurrentFood = (id, name, description, nutrients, servingOptions, searchAliases, sourceReference = WHATABURGER_NUTRITION_REFERENCE) => {
  const selectedNutrients = nutrients || servingOptions?.[0]?.nutrients;
  const status = ["calories", "protein", "carbohydrates", "fat"].every((key) => selectedNutrients?.[key] !== null && selectedNutrients?.[key] !== undefined) ? "complete" : "partial";
  const food = officialFood(
    whataburger,
    id,
    name,
    description,
    nutrients,
    WHATABURGER_NUTRITION_SOURCE,
    sourceReference,
    servingOptions,
    { status, accessedAt: CURRENT_EXPANSION_CHECKED_AT }
  );
  return searchAliases ? { ...food, searchAliases } : food;
};
const whataburgerSizedFood = (id, name, options, searchAliases, sourceReference) => whataburgerCurrentFood(
  id,
  name,
  options[0][1],
  null,
  options.map(([optionId, description, nutrients, amount = 1]) => whataburgerCurrentOption(`${id}:${optionId}`, description, nutrients, amount)),
  searchAliases,
  sourceReference
);
const whataburgerFoods = [
  whataburgerFood("whataburger", "Whataburger\u00ae", "1 burger", { calories: 590, protein: 29, carbohydrates: 62, fat: 25, sodium: 1220 }),
  whataburgerFood("double-meat-whataburger", "Double Meat Whataburger\u00ae", "1 burger", { calories: 835, protein: 47, carbohydrates: 62, fat: 44, sodium: 1470 }),
  whataburgerFood("triple-meat-whataburger", "Triple Meat Whataburger\u00ae", "1 burger", { calories: 1075, protein: 65, carbohydrates: 62, fat: 63, sodium: 1720 }),
  whataburgerFood("bacon-and-cheese-whataburger", "Bacon & Cheese Whataburger\u00ae", "1 burger", { calories: 750, protein: 39, carbohydrates: 62, fat: 37, sodium: 1910 }),
  whataburgerFood("jalapeno-and-cheese-whataburger", "Jalape\u00f1o & Cheese Whataburger\u00ae", "1 burger", { calories: 680, protein: 34, carbohydrates: 63, fat: 32, sodium: 1800 }),
  whataburgerFood("whataburger-jr", "Whataburger Jr.\u00ae", "1 burger", { calories: 310, protein: 14, carbohydrates: 36, fat: 11, sodium: 580 }),
  { ...whataburgerFood("premium-whatachickn-sandwich", "Premium Whatachick'n Sandwich", "1 sandwich", { calories: 515, protein: 33, carbohydrates: 66, fat: 14, sodium: 1860 }), searchAliases: ["Whata chicken sandwich", "Whatachick'n Sandwich"] },
  whataburgerFood("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich", { calories: 545, protein: 31, carbohydrates: 55, fat: 23, sodium: 1490 }),
  whataburgerFood("whatachickn-strips", "Whatachick'n\u00ae Strips", null, null, [
    whataburgerOption("whatachickn-strips:3-piece", "3 piece serving", { calories: 550, protein: 25, carbohydrates: 40, fat: 32, sodium: 1370 }),
    whataburgerCurrentOption("whatachickn-strips:2-piece", "2 piece kids' serving; sauce not included", whataburgerPublished(300, 16, 20, 18, 680, 0, 0), 2),
  ]),
  whataburgerFood("honey-butter-chicken-biscuit", "Honey Butter Chicken Biscuit", "1 biscuit", { calories: 570, protein: 15, carbohydrates: 50, fat: 36, sodium: 1000 }),
  whataburgerFood("breakfast-on-a-bun-sausage", "Breakfast on a Bun\u00ae with Sausage", "1 sandwich", { calories: 525, protein: 26, carbohydrates: 34, fat: 32, sodium: 1190 }),
  whataburgerFood("taquito-with-cheese-sausage", "Taquito with Cheese - Sausage", "1 taquito", { calories: 435, protein: 19, carbohydrates: 28, fat: 26, sodium: 1050 }),
  whataburgerFood("french-fries", "French Fries", null, null, [
    whataburgerOption("french-fries:small", "Small French Fries", { calories: 280, protein: 3, carbohydrates: 35, fat: 14, sodium: 170 }),
    whataburgerOption("french-fries:medium", "Medium French Fries", { calories: 420, protein: 5, carbohydrates: 52, fat: 21, sodium: 260 }),
    whataburgerOption("french-fries:large", "Large French Fries", { calories: 560, protein: 7, carbohydrates: 70, fat: 28, sodium: 350 }),
  ]),
  whataburgerFood("onion-rings", "Onion Rings", null, null, [
    whataburgerOption("onion-rings:medium", "Medium Onion Rings", { calories: 300, protein: 4, carbohydrates: 32, fat: 17, sodium: 430 }),
    whataburgerCurrentOption("onion-rings:large", "Large Onion Rings", whataburgerPublished(450, 7, 49, 25, 650, 6, 3)),
  ]),
  whataburgerFood("hash-brown-sticks", "Hash Brown Sticks", "1 order", { calories: 190, protein: 2, carbohydrates: 21, fat: 11, sodium: 500 }),
  ...[
    ["avocado-bacon-burger", "Avocado Bacon Burger", "1 burger: large beef patty, American cheese, bacon, avocado, onions, tomatoes and Creamy Pepper Sauce on a large bun", whataburgerPublished(820, 37, 52, 52, 1600, 4, 7)],
    ["double-meat-whataburger-jr", "Double Meat Whataburger Jr.", "1 junior burger with two small beef patties and the published standard toppings", whataburgerPublished(420, 23, 37, 20, 870, 2, 6)],
    ["bacon-and-cheese-whataburger-jr", "Bacon & Cheese Whataburger Jr.", "1 junior burger with a small beef patty, American cheese, bacon and the published standard toppings", whataburgerPublished(400, 21, 37, 18, 1140, 2, 6)],
    ["grilled-chicken-sandwich-whatasauce", "Grilled Chicken Sandwich with Whatasauce", "1 sandwich: grilled chicken breast, lettuce, tomatoes and Whatasauce on a brioche bun", whataburgerPublished(430, 32, 44, 14, 1030, 4, 10)],
    ["chicken-fajita-taco", "Chicken Fajita Taco", "1 flour tortilla with grilled chicken, grilled peppers and onions", whataburgerPublished(340, 29, 31, 11, 1200, 3, 1)],
    ["grilled-chicken-melt", "Grilled Chicken Melt", "1 sandwich: grilled chicken, Monterey Jack cheese, grilled peppers and onions on a bun", whataburgerPublished(390, 33, 39, 11, 1330, 3, 6)],
    ["whatacatch-sandwich", "Whatacatch Sandwich", "1 fish sandwich with lettuce, tomato and tartar sauce on a bun", whataburgerPublished(490, 19, 59, 20, 880, 5, 7)],
    ["grilled-veggie-wrap", "Grilled Veggie Wrap", "1 published limited-market wrap with grilled vegetables in the standard configuration", whataburgerPublished(330, 7, 38, 18, 800, 6, 4)],
  ].map(([id, name, description, nutrients]) => whataburgerCurrentFood(id, name, description, nutrients)),
  whataburgerSizedFood("honey-bbq-chicken-strip-sandwich", "Honey BBQ Chicken Strip Sandwich", [
    ["standard", "Standard sandwich: three Whatachick'n Strips, Monterey Jack cheese and Honey BBQ Sauce on Texas Toast", whataburgerPublished(890, 38, 87, 42, 2430, 3, 17)],
    ["junior", "Junior Honey BBQ Chicken Strip Sandwich", whataburgerPublished(650, 28, 63, 31, 1840, 3, 13)],
  ]),
  whataburgerSizedFood("patty-melt", "Whataburger Patty Melt", [
    ["standard", "Standard Patty Melt: two beef patties, Monterey Jack cheese, grilled onions and Creamy Pepper Sauce on Texas Toast", whataburgerPublished(940, 49, 45, 61, 1760, 1, 6)],
    ["junior", "Junior Patty Melt with one beef patty", whataburgerPublished(640, 28, 45, 37, 1200, 1, 6)],
  ]),
  whataburgerSizedFood("mushroom-swiss-burger", "Mushroom Swiss Burger", [
    ["standard", "Standard Mushroom Swiss Burger; published availability may vary", whataburgerPublished(1110, 56, 61, 70, 1890, 3, 11)],
    ["junior", "Junior Mushroom Swiss Burger; published availability may vary", whataburgerPublished(700, 32, 47, 42, 1380, 3, 11)],
  ]),
  whataburgerSizedFood("sweet-and-spicy-bacon-burger", "Sweet & Spicy Bacon Burger", [
    ["standard", "Standard limited-market Sweet & Spicy Bacon Burger", whataburgerPublished(1080, 60, 69, 62, 2310, 3, 18)],
    ["junior", "Junior limited-market Sweet & Spicy Bacon Burger", whataburgerPublished(600, 32, 42, 33, 1350, 1, 11)],
  ]),
  whataburgerSizedFood("green-chile-double", "Green Chile Double", [
    ["standard", "Standard limited-market Green Chile Double", whataburgerPublished(980, 54, 61, 57, 1950, 3, 12)],
    ["junior", "Junior limited-market Green Chile Double", whataburgerPublished(540, 28, 37, 30, 1310, 1, 7)],
  ]),
  whataburgerSizedFood("buffalo-ranch-chicken-strip-sandwich", "Buffalo Ranch Chicken Strip Sandwich", [
    ["standard", "Standard limited-time Buffalo Ranch Chicken Strip Sandwich", whataburgerPublished(990, 41, 90, 51, 2790, 5, 10)],
    ["junior", "Junior limited-time Buffalo Ranch Chicken Strip Sandwich", whataburgerPublished(660, 28, 56, 35, 2040, 3, 6)],
  ]),
  whataburgerSizedFood("whatachickn-bites", "Whatachick'n Bites", [
    ["4-piece", "4 piece kids' serving; sauce not included", whataburgerPublished(260, 20, 16, 12, 520, 1, 0), 4],
    ["6-piece", "6 piece serving; sauce not included", whataburgerPublished(390, 30, 25, 19, 780, 2, 1), 6],
    ["9-piece", "9 piece serving; sauce not included", whataburgerPublished(580, 45, 37, 28, 1160, 3, 1), 9],
  ], ["Whataburger chicken bites"]),
  ...[
    ["taquito-with-cheese-bacon", "Taquito with Cheese - Bacon", "1 breakfast taquito: flour tortilla, scrambled eggs, bacon and American cheese", whataburgerPublished(400, 20, 29, 23, 1050, 1, 1)],
    ["taquito-with-cheese-potato", "Taquito with Cheese - Potato", "1 breakfast taquito: flour tortilla, scrambled eggs, potato and American cheese", whataburgerPublished(440, 17, 38, 25, 1100, 2, 1)],
    ["taquito-with-cheese-chorizo", "Taquito with Cheese - Chorizo", "1 published limited-market breakfast taquito: flour tortilla, scrambled eggs, chorizo and American cheese", whataburgerPublished(450, 19, 28, 28, 1060, 2, 1)],
    ["breakfast-on-a-bun-bacon", "Breakfast on a Bun with Bacon", "1 sandwich: bacon, egg and American cheese on a bun", whataburgerPublished(360, 18, 35, 16, 940, 1, 5)],
    ["biscuit-sandwich-bacon", "Biscuit Sandwich with Bacon", "1 buttermilk biscuit with bacon, egg and American cheese", whataburgerPublished(490, 18, 35, 31, 1210, 1, 3)],
    ["biscuit-sandwich-sausage", "Biscuit Sandwich with Sausage", "1 buttermilk biscuit with sausage, egg and American cheese", whataburgerPublished(640, 27, 35, 44, 1460, 1, 3)],
    ["jalapeno-cheddar-biscuit-sandwich-bacon", "Jalapeño Cheddar Biscuit Sandwich with Bacon", "1 jalapeño-cheddar biscuit with bacon, egg and American cheese", whataburgerPublished(500, 19, 31, 32, 1300, 2, 0)],
    ["jalapeno-cheddar-biscuit-sandwich-sausage", "Jalapeño Cheddar Biscuit Sandwich with Sausage", "1 jalapeño-cheddar biscuit with sausage, egg and American cheese", whataburgerPublished(640, 28, 31, 45, 1550, 0, 2)],
    ["pancake-platter-bacon", "Pancake Platter with Bacon", "1 platter: pancakes, scrambled eggs and bacon, including published syrup and margarine", whataburgerPublished(680, 12, 109, 21, 1560, 3, 33)],
    ["pancake-platter-sausage", "Pancake Platter with Sausage", "1 platter: pancakes, scrambled eggs and sausage, including published syrup and margarine", whataburgerPublished(830, 21, 109, 33, 1810, 3, 33)],
    ["breakfast-platter-bacon", "Breakfast Platter with Bacon", "1 platter: scrambled eggs, biscuit, hash brown sticks and bacon", whataburgerPublished(600, 28, 39, 38, 1120, 1, 5)],
    ["breakfast-platter-sausage", "Breakfast Platter with Sausage", "1 platter: scrambled eggs, biscuit, hash brown sticks and sausage", whataburgerPublished(750, 37, 39, 50, 1370, 1, 5)],
    ["biscuit-and-gravy", "Biscuit & Gravy", "1 buttermilk biscuit with one serving of cream gravy", whataburgerPublished(490, 8, 49, 30, 1530, 1, 5)],
    ["jalapeno-cheddar-biscuit-and-gravy", "Jalapeño Cheddar Biscuit & Gravy", "1 jalapeño-cheddar biscuit with one serving of cream gravy", whataburgerPublished(490, 9, 44, 31, 1620, 2, 4)],
    ["buttermilk-biscuit", "Buttermilk Biscuit", "1 plain buttermilk biscuit", whataburgerPublished(310, 5, 34, 17, 600, 1, 3)],
    ["buttermilk-biscuit-with-bacon", "Buttermilk Biscuit with Bacon", "1 buttermilk biscuit with bacon; no egg or cheese", whataburgerPublished(360, 8, 35, 21, 810, 1, 3)],
    ["buttermilk-biscuit-with-sausage", "Buttermilk Biscuit with Sausage", "1 buttermilk biscuit with sausage; no egg or cheese", whataburgerPublished(510, 17, 35, 34, 1060, 1, 3)],
    ["buttermilk-biscuit-with-egg-and-cheese", "Buttermilk Biscuit with Egg & Cheese", "1 buttermilk biscuit with egg and American cheese; no meat", whataburgerPublished(440, 14, 35, 27, 1000, 1, 3)],
    ["jalapeno-cheddar-biscuit", "Jalapeño Cheddar Biscuit", "1 plain jalapeño-cheddar biscuit", whataburgerPublished(310, 6, 30, 18, 690, 0, 0)],
    ["jalapeno-cheddar-biscuit-with-bacon", "Jalapeño Cheddar Biscuit with Bacon", "1 jalapeño-cheddar biscuit with bacon; no egg or cheese", whataburgerPublished(370, 9, 31, 23, 900, 0, 2)],
    ["jalapeno-cheddar-biscuit-with-sausage", "Jalapeño Cheddar Biscuit with Sausage", "1 jalapeño-cheddar biscuit with sausage; no egg or cheese", whataburgerPublished(510, 18, 30, 35, 1150, 0, 2)],
    ["jalapeno-cheddar-biscuit-with-egg-and-cheese", "Jalapeño Cheddar Biscuit with Egg & Cheese", "1 jalapeño-cheddar biscuit with egg and American cheese; no meat", whataburgerPublished(440, 16, 30, 28, 1090, 0, 2)],
    ["taquito-bacon-no-cheese", "Taquito with Bacon", "1 breakfast taquito with scrambled eggs and bacon; cheese not included", whataburgerPublished(360, 17, 29, 20, 830, 1, 1)],
    ["taquito-sausage-no-cheese", "Taquito with Sausage", "1 breakfast taquito with scrambled eggs and sausage; cheese not included", whataburgerPublished(380, 16, 28, 23, 840, 1, 1)],
    ["taquito-potato-no-cheese", "Taquito with Potato", "1 breakfast taquito with scrambled eggs and potato; cheese not included", whataburgerPublished(400, 15, 38, 21, 880, 2, 1)],
    ["cinnamon-roll", "Cinnamon Roll", "1 cinnamon roll", whataburgerPublished(580, 8, 103, 16, 1330, 2, 59)],
    ["egg-sandwich", "Egg Sandwich", "1 sandwich with egg and American cheese on a bun", whataburgerPublished(310, 15, 34, 12, 740, 1, 5)],
    ["grits", "Grits", "1 published limited-market serving of plain grits", whataburgerPublished(100, 2, 22, 0.5, 320, 1, 0)],
    ["pancakes", "Pancakes", "1 order of pancakes, including the published syrup and margarine", whataburgerPublished(630, 9, 108, 17, 1350, 3, 33)],
  ].map(([id, name, description, nutrients]) => whataburgerCurrentFood(id, name, description, nutrients, undefined, name.includes("Jalapeño") ? [name.replace("Jalapeño", "Jalapeno")] : undefined)),
  ...[
    ["kids-justaburger", "Kids' Justaburger", "1 kids' plain small burger; side and drink not included", whataburgerPublished(300, 14, 35, 11, 740, 1, 5)],
    ["kids-grilled-cheese", "Kids' Grilled Cheese", "1 kids' grilled cheese sandwich on Texas Toast; side and drink not included", whataburgerPublished(510, 16, 42, 28, 1300, 0, 4)],
    ["apple-slices", "Apple Slices", "1 sealed side serving", whataburgerPublished(30, 0, 8, 0, 0, 1, 6)],
    ["hot-apple-pie", "Hot Apple Pie", "1 fried apple pie", whataburgerPublished(270, 3, 34, 14, 260, 2, 7)],
    ["hot-lemon-pie", "Hot Lemon Pie", "1 fried lemon pie", whataburgerPublished(320, 4, 41, 16, 230, 3, 12)],
    ["fruit-chews", "Fruit Chews", "1 individually packaged serving", whataburgerPublished(80, 1, 19, 0, 20, 0, 11)],
    ["chocolate-chunk-cookie", "Chocolate Chunk Cookie", "1 cookie", whataburgerPublished(230, 2, 32, 11, 190, 1, 18)],
    ["sugar-cookie", "Sugar Cookie", "1 cookie", whataburgerPublished(230, 3, 34, 10, 210, 0, 17)],
  ].map(([id, name, description, nutrients]) => whataburgerCurrentFood(id, name, description, nutrients)),
  whataburgerSizedFood("apple-and-cranberry-chicken-salad", "Apple & Cranberry Chicken Salad", [
    ["grilled-chicken", "Apple & Cranberry Salad with Grilled Chicken; separately listed dressing not included", whataburgerPublished(380, 33, 38, 12, 780, 6, 27)],
    ["whatachickn", "Apple & Cranberry Salad with Whatachick'n; separately listed dressing not included", whataburgerPublished(490, 34, 47, 20, 710, 4, 27)],
    ["spicy-chicken", "Apple & Cranberry Salad with Spicy Chicken; separately listed dressing not included", whataburgerPublished(500, 31, 49, 21, 1050, 6, 28)],
  ]),
  whataburgerSizedFood("cobb-salad", "Cobb Salad", [
    ["no-chicken", "Cobb Salad without chicken or separately listed dressing", whataburgerPublished(300, 20, 8, 21, 610, 0, 3)],
    ["grilled-chicken", "Cobb Salad with Grilled Chicken; separately listed dressing not included", whataburgerPublished(430, 44, 10, 23, 1160, 3, 3)],
    ["whatachickn", "Cobb Salad with Whatachick'n; separately listed dressing not included", whataburgerPublished(540, 45, 20, 31, 1090, 2, 3)],
    ["spicy-chicken", "Cobb Salad with Spicy Chicken; separately listed dressing not included", whataburgerPublished(550, 43, 21, 32, 1420, 3, 4)],
  ]),
  whataburgerSizedFood("buffalo-ranch-chicken-salad", "Buffalo Ranch Chicken Salad", [
    ["grilled-chicken", "Limited-time Buffalo Ranch Chicken Salad with Grilled Chicken in the published configuration", whataburgerPublished(370, 37, 13, 19, 2070, 4, 3)],
    ["whatachickn", "Limited-time Buffalo Ranch Chicken Salad with Whatachick'n in the published configuration", whataburgerPublished(480, 38, 23, 27, 2000, 2, 3)],
    ["spicy-chicken", "Limited-time Buffalo Ranch Chicken Salad with Spicy Chicken in the published configuration", whataburgerPublished(480, 35, 24, 28, 2330, 4, 4)],
  ]),
  whataburgerSizedFood("garden-salad", "Garden Salad", [
    ["no-chicken", "Garden Salad without chicken or separately listed dressing", whataburgerPublished(160, 10, 10, 10, 220, 5, 4)],
    ["grilled-chicken", "Garden Salad with Grilled Chicken; separately listed dressing not included", whataburgerPublished(290, 34, 12, 12, 770, 6, 4)],
    ["whatachickn", "Garden Salad with Whatachick'n; separately listed dressing not included", whataburgerPublished(400, 35, 22, 20, 700, 5, 4)],
    ["spicy-chicken", "Garden Salad with Spicy Chicken; separately listed dressing not included", whataburgerPublished(400, 32, 22, 21, 1070, 4, 5)],
  ]),
  whataburgerSizedFood("chocolate-shake", "Chocolate Shake", [
    ["small-16oz", "Small Chocolate Shake (16 fl oz)", whataburgerPublished(440, 10, 80, 11, 390, 0, 78)],
    ["medium-20oz", "Medium Chocolate Shake (20 fl oz)", whataburgerPublished(560, 13, 102, 14, 490, 0, 100)],
    ["large-32oz", "Large Chocolate Shake (32 fl oz)", whataburgerPublished(890, 20, 159, 23, 790, 0, 159)],
  ]),
  whataburgerSizedFood("chocolate-malt", "Chocolate Malt", [
    ["small-16oz", "Small Chocolate Malt (16 fl oz)", whataburgerPublished(460, 10, 85, 11, 390, 1, 83)],
    ["medium-20oz", "Medium Chocolate Malt (20 fl oz)", whataburgerPublished(590, 12, 110, 13, 490, 2, 107)],
    ["large-32oz", "Large Chocolate Malt (32 fl oz)", whataburgerPublished(920, 19, 170, 22, 780, 2, 166)],
  ]),
  whataburgerSizedFood("strawberry-shake", "Strawberry Shake", [
    ["small-16oz", "Small Strawberry Shake (16 fl oz)", whataburgerPublished(450, 9, 80, 11, 370, 0, 80)],
    ["medium-20oz", "Medium Strawberry Shake (20 fl oz)", whataburgerPublished(560, 12, 103, 14, 460, 0, 103)],
    ["large-32oz", "Large Strawberry Shake (32 fl oz)", whataburgerPublished(890, 19, 160, 22, 750, 0, 160)],
  ]),
  whataburgerSizedFood("strawberry-malt", "Strawberry Malt", [
    ["small-16oz", "Small Strawberry Malt (16 fl oz)", whataburgerPublished(460, 9, 85, 11, 370, 0, 85)],
    ["medium-20oz", "Medium Strawberry Malt (20 fl oz)", whataburgerPublished(590, 11, 111, 13, 460, 0, 110)],
    ["large-32oz", "Large Strawberry Malt (32 fl oz)", whataburgerPublished(920, 18, 171, 21, 740, 0, 170)],
  ]),
  whataburgerSizedFood("vanilla-shake", "Vanilla Shake", [
    ["small-16oz", "Small Vanilla Shake (16 fl oz)", whataburgerPublished(410, 10, 69, 12, 390, 0, 69)],
    ["medium-20oz", "Medium Vanilla Shake (20 fl oz)", whataburgerPublished(510, 13, 86, 15, 490, 0, 86)],
    ["large-32oz", "Large Vanilla Shake (32 fl oz)", whataburgerPublished(820, 21, 137, 24, 790, 0, 137)],
  ]),
  whataburgerSizedFood("vanilla-malt", "Vanilla Malt", [
    ["small-16oz", "Small Vanilla Malt (16 fl oz)", whataburgerPublished(430, 10, 74, 12, 390, 0, 74)],
    ["medium-20oz", "Medium Vanilla Malt (20 fl oz)", whataburgerPublished(540, 12, 94, 14, 490, 0, 93)],
    ["large-32oz", "Large Vanilla Malt (32 fl oz)", whataburgerPublished(860, 20, 148, 23, 780, 0, 147)],
  ]),
  whataburgerSizedFood("dr-pepper-shake", "Dr Pepper Shake", [
    ["small-16oz", "Small Dr Pepper Shake (16 fl oz)", whataburgerPublished(430, 9, 78, 11, 370, 0, 78)],
    ["medium-20oz", "Medium Dr Pepper Shake (20 fl oz)", whataburgerPublished(550, 12, 100, 14, 460, 0, 99)],
    ["large-32oz", "Large Dr Pepper Shake (32 fl oz)", whataburgerPublished(870, 19, 157, 22, 740, 1, 155)],
  ], ["Whataburger Dr. Pepper Shake"], `${WHATABURGER_NUTRITION_REFERENCE}; published as a limited-time flavor, so current availability may vary`),
  whataburgerSizedFood("coffee", "Coffee", [
    ["small-12oz", "Small Coffee (12 fl oz), black; additions not included", whataburgerPublished(5, 0, 0, 0, 5, 0, 0)],
    ["medium-16oz", "Medium Coffee (16 fl oz), black; additions not included", whataburgerPublished(5, 1, 0, 0, 10, 0, 0)],
    ["large-20oz", "Large Coffee (20 fl oz), black; additions not included", whataburgerPublished(5, 1, 0, 0, 10, 0, 0)],
  ]),
  whataburgerSizedFood("decaf-coffee", "Decaf Coffee", [
    ["small-12oz", "Small Decaf Coffee (12 fl oz), black; additions not included", whataburgerPublished(0, 0, 0, 0, 5, 0, 0)],
    ["medium-16oz", "Medium Decaf Coffee (16 fl oz), black; additions not included", whataburgerPublished(0, 0, 0, 0, 10, 0, 0)],
    ["large-20oz", "Large Decaf Coffee (20 fl oz), black; additions not included", whataburgerPublished(0, 1, 0, 0, 10, 0, 0)],
  ]),
  whataburgerSizedFood("sweet-tea", "Sweet Tea", [
    ["kids-16oz", "Kids' Sweet Tea (16 fl oz)", whataburgerPublished(220, 0, 58, 0, 15, 0, 56)],
    ["small-20oz", "Small Sweet Tea (20 fl oz)", whataburgerPublished(280, 0, 72, 0, 15, 0, 70)],
    ["medium-32oz", "Medium Sweet Tea (32 fl oz)", whataburgerPublished(440, 0, 115, 0, 25, 0, 113)],
    ["large-44oz", "Large Sweet Tea (44 fl oz)", whataburgerPublished(610, 0, 158, 0, 35, 0, 155)],
  ]),
  whataburgerSizedFood("unsweet-tea", "Unsweet Tea", [
    ["kids-16oz", "Kids' Unsweet Tea (16 fl oz)", whataburgerPublished(5, 0, 1, 0, 15, 0, 0)],
    ["small-20oz", "Small Unsweet Tea (20 fl oz)", whataburgerPublished(5, 0, 2, 0, 20, 0, 0)],
    ["medium-32oz", "Medium Unsweet Tea (32 fl oz)", whataburgerPublished(10, 0, 3, 0, 30, 0, 0)],
    ["large-44oz", "Large Unsweet Tea (44 fl oz)", whataburgerPublished(15, 0, 4, 0, 40, 0, 0)],
  ], ["Whataburger unsweetened tea"]),
  ...[
    ["orange-juice", "Orange Juice", "1 bottle (11.5 fl oz)", whataburgerPublished(160, 2, 37, 0, 0, 0, 33)],
    ["one-percent-milk", "1% Milk", "1 carton (8 fl oz)", whataburgerPublished(110, 9, 13, 2.5, 130, 0, 12)],
    ["one-percent-chocolate-milk", "1% Chocolate Milk", "1 carton (8 fl oz)", whataburgerPublished(160, 8, 27, 2.5, 220, 0, 25)],
  ].map(([id, name, description, nutrients]) => whataburgerCurrentFood(id, name, description, nutrients)),
  whataburgerSizedFood("fountain-coca-cola", "Fountain Coca-Cola", [
    ["kids-16oz", "Kids' Coca-Cola (16 fl oz)", whataburgerPublished(200, 0, 54, 0, 55, 0, 54)],
    ["small-20oz", "Small Coca-Cola (20 fl oz)", whataburgerPublished(250, 0, 67, 0, 65, 0, 67)],
    ["medium-32oz", "Medium Coca-Cola (32 fl oz)", whataburgerPublished(390, 0, 107, 0, 105, 0, 107)],
    ["large-44oz", "Large Coca-Cola (44 fl oz)", whataburgerPublished(540, 0, 147, 0, 150, 0, 147)],
  ], ["Whataburger Coke", "Whataburger Coca Cola"]),
  whataburgerSizedFood("fountain-diet-coke", "Fountain Diet Coke", [
    ["kids-16oz", "Kids' Diet Coke (16 fl oz)", whataburgerPublished(0, 0, 0, 0, 65, 0, 0)],
    ["small-20oz", "Small Diet Coke (20 fl oz); carbohydrate is published as less than 1 g", whataburgerPublished(0, 0, null, 0, 80, 0, 0)],
    ["medium-32oz", "Medium Diet Coke (32 fl oz); carbohydrate is published as less than 1 g", whataburgerPublished(0, 0, null, 0, 130, 0, 0)],
    ["large-44oz", "Large Diet Coke (44 fl oz); carbohydrate is published as less than 1 g", whataburgerPublished(0, 0, null, 0, 180, 0, 0)],
  ], ["Whataburger Diet Coke"]),
  whataburgerSizedFood("fountain-coca-cola-zero-sugar", "Fountain Coca-Cola Zero Sugar", [
    ["kids-16oz", "Kids' Coca-Cola Zero Sugar (16 fl oz)", whataburgerPublished(0, 0, 0, 0, 55, 0, 0)],
    ["small-20oz", "Small Coca-Cola Zero Sugar (20 fl oz)", whataburgerPublished(0, 0, 0, 0, 65, 0, 0)],
    ["medium-32oz", "Medium Coca-Cola Zero Sugar (32 fl oz)", whataburgerPublished(0, 0, 0, 0, 105, 0, 0)],
    ["large-44oz", "Large Coca-Cola Zero Sugar (44 fl oz); carbohydrate is published as less than 1 g", whataburgerPublished(0, 0, null, 0, 150, 0, 0)],
  ], ["Whataburger Coke Zero", "Whataburger Coca Cola Zero Sugar"]),
  whataburgerSizedFood("fountain-cherry-coke", "Fountain Cherry Coke", [
    ["kids-16oz", "Kids' Cherry Coke (16 fl oz)", whataburgerPublished(210, 0, 56, 0, 55, 0, 56)],
    ["small-20oz", "Small Cherry Coke (20 fl oz)", whataburgerPublished(260, 0, 70, 0, 70, 0, 70)],
    ["medium-32oz", "Medium Cherry Coke (32 fl oz)", whataburgerPublished(410, 0, 112, 0, 110, 0, 112)],
    ["large-44oz", "Large Cherry Coke (44 fl oz)", whataburgerPublished(560, 0, 154, 0, 150, 0, 154)],
  ], ["Whataburger Cherry Coke"]),
  whataburgerSizedFood("fountain-sprite", "Fountain Sprite", [
    ["kids-16oz", "Kids' Sprite (16 fl oz)", whataburgerPublished(180, 0, 50, 0, 95, 0, 50)],
    ["small-20oz", "Small Sprite (20 fl oz)", whataburgerPublished(230, 0, 62, 0, 120, 0, 62)],
    ["medium-32oz", "Medium Sprite (32 fl oz)", whataburgerPublished(370, 0, 99, 0, 190, 0, 99)],
    ["large-44oz", "Large Sprite (44 fl oz)", whataburgerPublished(510, 0, 137, 0, 260, 0, 137)],
  ], ["Whataburger Sprite"]),
  whataburgerSizedFood("fountain-dr-pepper", "Fountain Dr Pepper", [
    ["kids-16oz", "Kids' Dr Pepper (16 fl oz)", whataburgerPublished(190, 0, 52, 0, 20, 0, 51)],
    ["small-20oz", "Small Dr Pepper (20 fl oz)", whataburgerPublished(240, 0, 65, 0, 25, 0, 64)],
    ["medium-32oz", "Medium Dr Pepper (32 fl oz)", whataburgerPublished(380, 0, 104, 0, 40, 0, 102)],
    ["large-44oz", "Large Dr Pepper (44 fl oz)", whataburgerPublished(530, 0, 143, 0, 60, 0, 140)],
  ], ["Whataburger Dr. Pepper"]),
  whataburgerSizedFood("fountain-diet-dr-pepper", "Fountain Diet Dr Pepper", [
    ["kids-16oz", "Kids' Diet Dr Pepper (16 fl oz)", whataburgerPublished(0, 0, 0, 0, 55, 0, 0)],
    ["small-20oz", "Small Diet Dr Pepper (20 fl oz)", whataburgerPublished(0, 0, 0, 0, 65, 0, 0)],
    ["medium-32oz", "Medium Diet Dr Pepper (32 fl oz)", whataburgerPublished(0, 0, 1, 0, 110, 0, 0)],
    ["large-44oz", "Large Diet Dr Pepper (44 fl oz)", whataburgerPublished(5, 0, 1, 0, 150, 0, 0)],
  ], ["Whataburger Diet Dr. Pepper"]),
  whataburgerSizedFood("fountain-barqs-root-beer", "Fountain Barq's Root Beer", [
    ["kids-16oz", "Kids' Barq's Root Beer (16 fl oz)", whataburgerPublished(210, 0, 58, 0, 70, 0, 58)],
    ["small-20oz", "Small Barq's Root Beer (20 fl oz)", whataburgerPublished(270, 0, 73, 0, 90, 0, 73)],
    ["medium-32oz", "Medium Barq's Root Beer (32 fl oz)", whataburgerPublished(430, 0, 116, 0, 140, 0, 116)],
    ["large-44oz", "Large Barq's Root Beer (44 fl oz)", whataburgerPublished(590, 0, 160, 0, 190, 0, 160)],
  ], ["Whataburger Barqs Root Beer"]),
  whataburgerSizedFood("fountain-minute-maid-light-lemonade", "Fountain Minute Maid Light Lemonade", [
    ["kids-16oz", "Kids' Minute Maid Light Lemonade (16 fl oz)", whataburgerPublished(10, 0, 3, 0, 55, 0, 0)],
    ["small-20oz", "Small Minute Maid Light Lemonade (20 fl oz)", whataburgerPublished(10, 0, 3, 0, 70, 0, 0)],
    ["medium-32oz", "Medium Minute Maid Light Lemonade (32 fl oz)", whataburgerPublished(15, 0, 5, 0, 115, 0, 0)],
    ["large-44oz", "Large Minute Maid Light Lemonade (44 fl oz)", whataburgerPublished(25, 0, 7, 0, 160, 0, 0)],
  ], ["Whataburger light lemonade"]),
  whataburgerSizedFood("fountain-powerade-mountain-berry-blast", "Fountain POWERADE Mountain Berry Blast", [
    ["kids-16oz", "Kids' POWERADE Mountain Berry Blast (16 fl oz)", whataburgerPublished(110, 0, 29, 0, 150, 0, 29)],
    ["small-20oz", "Small POWERADE Mountain Berry Blast (20 fl oz)", whataburgerPublished(140, 0, 37, 0, 190, 0, 36)],
    ["medium-32oz", "Medium POWERADE Mountain Berry Blast (32 fl oz)", whataburgerPublished(220, 0, 58, 0, 300, 0, 58)],
    ["large-44oz", "Large POWERADE Mountain Berry Blast (44 fl oz)", whataburgerPublished(310, 0, 80, 0, 410, 0, 80)],
  ], ["Whataburger Powerade Mountain Blast"]),
  whataburgerSizedFood("fountain-powerade-fruit-punch", "Fountain POWERADE Fruit Punch", [
    ["kids-16oz", "Kids' POWERADE Fruit Punch (16 fl oz)", whataburgerPublished(110, 0, 30, 0, 150, 0, 28)],
    ["small-20oz", "Small POWERADE Fruit Punch (20 fl oz)", whataburgerPublished(130, 0, 37, 0, 190, 0, 36)],
    ["medium-32oz", "Medium POWERADE Fruit Punch (32 fl oz)", whataburgerPublished(220, 0, 59, 0, 310, 0, 57)],
    ["large-44oz", "Large POWERADE Fruit Punch (44 fl oz)", whataburgerPublished(300, 0, 82, 0, 420, 0, 78)],
  ], ["Whataburger Powerade Fruit Punch"]),
  whataburgerSizedFood("fountain-hi-c-orange", "Fountain Hi-C Orange", [
    ["kids-16oz", "Kids' Hi-C Orange (16 fl oz)", whataburgerPublished(220, 0, 58, 0, 55, 0, 57)],
    ["small-20oz", "Small Hi-C Orange (20 fl oz)", whataburgerPublished(280, 0, 73, 0, 65, 0, 71)],
    ["medium-32oz", "Medium Hi-C Orange (32 fl oz)", whataburgerPublished(440, 0, 116, 0, 105, 0, 113)],
    ["large-44oz", "Large Hi-C Orange (44 fl oz)", whataburgerPublished(610, 0, 160, 0, 150, 0, 156)],
  ], ["Whataburger Hi C Orange"]),
  whataburgerSizedFood("fountain-fanta-orange", "Fountain Fanta Orange", [
    ["kids-16oz", "Kids' Fanta Orange (16 fl oz)", whataburgerPublished(200, 0, 54, 0, 55, 0, 53)],
    ["small-20oz", "Small Fanta Orange (20 fl oz)", whataburgerPublished(250, 0, 67, 0, 65, 0, 66)],
    ["medium-32oz", "Medium Fanta Orange (32 fl oz)", whataburgerPublished(390, 0, 108, 0, 105, 0, 106)],
    ["large-44oz", "Large Fanta Orange (44 fl oz)", whataburgerPublished(540, 0, 148, 0, 150, 0, 146)],
  ], ["Whataburger Fanta Orange"]),
  whataburgerSizedFood("fountain-fanta-strawberry", "Fountain Fanta Strawberry", [
    ["kids-16oz", "Kids' Fanta Strawberry (16 fl oz)", whataburgerPublished(220, 0, 59, 0, 55, 0, 59)],
    ["small-20oz", "Small Fanta Strawberry (20 fl oz)", whataburgerPublished(270, 0, 74, 0, 70, 0, 73)],
    ["medium-32oz", "Medium Fanta Strawberry (32 fl oz)", whataburgerPublished(430, 0, 118, 0, 110, 0, 117)],
    ["large-44oz", "Large Fanta Strawberry (44 fl oz)", whataburgerPublished(600, 0, 162, 0, 150, 0, 161)],
  ], ["Whataburger Fanta Strawberry"]),
  whataburgerSizedFood("fountain-mello-yello", "Fountain Mello Yello", [
    ["kids-16oz", "Kids' Mello Yello (16 fl oz)", whataburgerPublished(220, 0, 58, 0, 65, 0, 58)],
    ["small-20oz", "Small Mello Yello (20 fl oz)", whataburgerPublished(270, 0, 73, 0, 85, 0, 73)],
    ["medium-32oz", "Medium Mello Yello (32 fl oz)", whataburgerPublished(440, 0, 116, 0, 135, 0, 116)],
    ["large-44oz", "Large Mello Yello (44 fl oz)", whataburgerPublished(600, 0, 160, 0, 190, 0, 160)],
  ], ["Whataburger Mello Yello"]),
  whataburgerSizedFood("fountain-fuze-raspberry-tea", "Fountain FUZE Raspberry Tea", [
    ["kids-16oz", "Kids' FUZE Raspberry Tea (16 fl oz)", whataburgerPublished(110, 0, 31, 0, 65, 0, 30)],
    ["small-20oz", "Small FUZE Raspberry Tea (20 fl oz)", whataburgerPublished(140, 0, 38, 0, 85, 0, 37)],
    ["medium-32oz", "Medium FUZE Raspberry Tea (32 fl oz)", whataburgerPublished(220, 0, 61, 0, 135, 0, 59)],
    ["large-44oz", "Large FUZE Raspberry Tea (44 fl oz)", whataburgerPublished(310, 0, 84, 0, 180, 0, 81)],
  ], ["Whataburger raspberry tea"]),
  whataburgerSizedFood("fountain-pibb-xtra", "Fountain Pibb Xtra", [
    ["kids-16oz", "Kids' Pibb Xtra (16 fl oz)", whataburgerPublished(190, 0, 50, 0, 70, 0, 50)],
    ["small-20oz", "Small Pibb Xtra (20 fl oz)", whataburgerPublished(240, 0, 63, 0, 90, 0, 63)],
    ["medium-32oz", "Medium Pibb Xtra (32 fl oz)", whataburgerPublished(380, 0, 101, 0, 140, 0, 101)],
    ["large-44oz", "Large Pibb Xtra (44 fl oz)", whataburgerPublished(530, 0, 139, 0, 200, 0, 139)],
  ], ["Whataburger Mr Pibb"]),
  ...[
    ["avocado-add-on", "Avocado Add-On", "1 published add-on serving", whataburgerPublished(90, 1, 4, 9, 20, 3, 0)],
    ["hard-boiled-egg-add-on", "Hard-Boiled Egg Add-On", "1 published limited-time hard-boiled egg add-on", whataburgerPublished(80, 6, 1, 5, 60, 0, 1)],
    ["bacon-slice-add-on", "Bacon Add-On", "1 slice of bacon", whataburgerPublished(25, 2, 0, 1.5, 85, 0, 0)],
    ["grilled-peppers-and-onions-add-on", "Grilled Peppers & Onions Add-On", "1 published add-on serving", whataburgerPublished(25, 0, 3, 1.5, 130, 1, 1)],
    ["jalapenos-add-on", "Jalapeños Add-On", "About 5-8 whole or sliced jalapeños; the PDF publishes sodium as a 90-140 mg range, so sodium remains unknown", whataburgerPublished(0, 0, 1, 0, null, 0, 0), ["Whataburger Jalapenos"]],
  ].map(([id, name, description, nutrients, searchAliases]) => whataburgerCurrentFood(id, name, description, nutrients, undefined, searchAliases)),
  whataburgerSizedFood("american-cheese-add-on", "American Cheese Add-On", [
    ["small-slice", "1 small slice of American cheese", whataburgerPublished(45, 3, 0, 3.5, 220, 0, 0)],
    ["large-slice", "1 large slice of American cheese", whataburgerPublished(90, 5, 0, 7, 430, 0, 0)],
  ]),
  ...[
    ["balsamic-vinaigrette", "Balsamic Vinaigrette", whataburgerPublished(180, 0, 10, 15, 480, 0, 9)],
    ["buffalo-sauce", "Buffalo Sauce", whataburgerPublished(25, 0, 3, 1.5, 1510, 1, 1)],
    ["buttermilk-ranch", "Buttermilk Ranch", whataburgerPublished(240, 1, 3, 25, 500, 0, 2)],
    ["cream-gravy", "Cream Gravy", whataburgerPublished(60, 0, 8, 3, 410, 0, 1)],
    ["creamy-pepper-sauce", "Creamy Pepper Sauce", whataburgerPublished(240, 1, 4, 24, 550, 0, 3)],
    ["fat-free-ranch", "Fat-Free Ranch", whataburgerPublished(50, 1, 13, 0, 770, 1, 5)],
    ["honey-bbq-sauce", "Honey BBQ Sauce", whataburgerPublished(90, 0, 22, 0, 650, 0, 19)],
    ["honey-butter-sauce", "Honey Butter Sauce", whataburgerPublished(300, 0, 20, 24, 180, 0, 19)],
    ["honey-mustard", "Honey Mustard", whataburgerPublished(200, 1, 15, 16, 300, 0, 13)],
    ["jalapeno-ranch", "Jalapeño Ranch", whataburgerPublished(280, 0, 2, 30, 580, 0, 1), ["Whataburger Jalapeno Ranch"]],
    ["low-fat-herb-vinaigrette", "Low-Fat Herb Vinaigrette", whataburgerPublished(35, 0, 7, 0.5, 470, 0, 6)],
    ["low-fat-honey-pepper-vinaigrette", "Low-Fat Honey Pepper Vinaigrette", whataburgerPublished(90, 0, 15, 3.5, 460, 0, 14)],
    ["sugar-free-pancake-syrup", "Sugar-Free Pancake Syrup", whataburgerPublished(25, 0, 10, 0, 75, 0, 0)],
    ["pancake-syrup", "Pancake Syrup", whataburgerPublished(160, 0, 39, 0, 0, 0, 21)],
    ["thousand-island-dressing", "Thousand Island Dressing", whataburgerPublished(260, 1, 8, 25, 540, 0, 7)],
    ["fancy-ketchup", "Fancy Ketchup", whataburgerPublished(35, 0, 8, 0, 340, 0, 6)],
    ["spicy-ketchup", "Spicy Ketchup", whataburgerPublished(30, 0, 7, 0, 400, 0, 6)],
    ["picante-sauce", "Picante Sauce", whataburgerPublished(5, 0, 1, 0, 170, 0, 1)],
    ["salsa-verde", "Salsa Verde", whataburgerPublished(5, 0, 1, 0, 85, 0, 1)],
  ].map(([id, name, nutrients, searchAliases]) => whataburgerCurrentFood(id, name, `1 separately listed packet or container of ${name}; no other food included`, nutrients, undefined, searchAliases)),
];

const cheesecakeFactory = { id: "cheesecake-factory", name: "The Cheesecake Factory" };
const CHEESECAKE_FACTORY_SOURCE = "https://www.thecheesecakefactory.com/nutrition";
const CHEESECAKE_FACTORY_REFERENCE = "The Cheesecake Factory official U.S. Nutritional Guide, Summer 2026. Values are for standardized recipes and the named serving; regional variants are excluded unless named.";
const cheesecakeFactoryFood = (id, name, description, values, options) => sitDownFood(
  cheesecakeFactory, CHEESECAKE_FACTORY_SOURCE, CHEESECAKE_FACTORY_REFERENCE,
  ["Cheesecake Factory", "The Cheesecake Factory"], id, name, description, values, options
);
const cheesecakeFactoryFoods = [
  ...sitDownRows(cheesecakeFactoryFood, [
    ["little-house-salad", "Little House Salad", [260,2,10,25,250,3,5]],
    ["street-corn", "Street Corn", [710,14,48,54,1000,5,17]],
    ["chicken-taquitos", "Chicken Taquitos", [470,17,35,29,1050,7,6]],
    ["korean-fried-cauliflower", "Korean Fried Cauliflower", [1150,11,113,71,2570,7,44]],
    ["stuffed-mushrooms", "Stuffed Mushrooms", [510,15,19,42,500,4,5]],
    ["fried-zucchini", "Fried Zucchini", [1000,21,58,76,2050,4,14]],
    ["crispy-brussels-sprouts", "Crispy Brussels Sprouts", [570,8,30,46,410,8,15]],
    ["beet-avocado-salad", "Beet and Avocado Salad", [290,7,41,12,480,8,29]],
    ["cheeseburger-spring-rolls", "Cheeseburger Spring Rolls", [980,43,47,69,1890,3,13]],
    ["crispy-crab-bites", "Crispy Crab Bites", [410,15,19,31,600,2,5]],
    ["crispy-fried-cheese", "Crispy Fried Cheese", [1070,45,49,78,2320,3,4]],
    ["crab-wontons", "Crab Wontons", [550,14,48,34,1050,2,18]],
  ], "1 complete small-plate order; optional additional sauces are excluded"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["roadside-sliders", "Roadside Sliders", [800,48,70,35,1720,1,18]],
    ["chicken-pot-stickers", "Chicken Pot Stickers", [380,27,38,12,2550,1,13]],
    ["tex-mex-eggrolls", "Tex Mex Eggrolls", [930,43,72,53,2030,10,12]],
    ["quesadilla", "Quesadilla", [1120,49,62,77,2070,7,6]],
    ["quesadilla-chicken", "Quesadilla with Chicken", [1230,69,62,81,2300,7,6]],
    ["thai-chili-shrimp", "Thai Chili Shrimp", [700,18,35,52,950,1,7]],
    ["avocado-eggrolls", "Avocado Eggrolls", [930,14,111,48,1300,14,38]],
    ["fried-macaroni-cheese", "Fried Macaroni and Cheese", [1310,40,70,96,2140,6,12]],
    ["warm-crab-dip", "Warm Crab Dip", [1220,25,69,92,1720,3,9]],
    ["fried-calamari", "Fried Calamari", [1520,44,98,105,1850,5,10]],
    ["eggroll-sampler", "Eggroll Sampler", [1320,44,114,76,2320,17,36]],
    ["ahi-poke-nachos", "Ahi Poke Nachos", [1020,27,85,63,1740,7,21]],
    ["hot-spinach-cheese-dip", "Hot Spinach and Cheese Dip", [1730,31,115,126,1590,13,9]],
    ["buffalo-blasts", "Buffalo Blasts", [1670,78,129,93,7080,10,11]],
    ["buffalo-wings", "Buffalo Wings", [1120,109,16,69,5020,2,4]],
    ["buffalo-chicken-strips", "Buffalo Chicken Strips", [1090,76,87,48,4950,7,12]],
  ], "1 full appetizer order, published as serving 2-4; per-person calories are not used because the source gives a range"),
  ...[
    ["clam-chowder", "Clam Chowder", [310,11,24,19,990,2,2], [500,18,39,30,1580,4,3]],
    ["cream-chicken-soup", "Cream of Chicken Soup", [390,17,25,25,1030,3,10], [630,28,40,40,1650,4,16]],
    ["mexican-chicken-vegetable-soup", "Mexican Chicken and Vegetable Soup", [340,14,27,19,1530,4,8], [680,29,54,39,3070,7,17]],
  ].map(([id, name, cup, bowl]) => cheesecakeFactoryFood(id, name, "Choose the published cup or bowl serving", null, [
    ["cup", `1 cup of ${name}`, cup], ["bowl", `1 bowl of ${name}`, bowl],
  ])),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["cheese-flatbread", "Cheese Flatbread", [1000,49,86,50,2530,4,3]],
    ["margherita-flatbread", "Margherita Flatbread", [760,34,85,30,1770,4,4]],
    ["fresh-basil-tomato-cheese-flatbread", "Fresh Basil, Tomato and Cheese Flatbread", [850,42,84,38,2300,4,3]],
    ["pepperoni-flatbread", "Pepperoni Flatbread", [1170,56,88,66,3420,5,3]],
    ["pepperoni-hot-honey-flatbread", "Pepperoni Flatbread with Hot Honey", [1200,56,96,66,3430,5,11]],
    ["bee-sting-flatbread", "Bee Sting Flatbread", [1170,54,97,62,3280,5,8]],
  ], "1 complete flatbread pizza; the guide does not publish a slice count"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["old-fashioned-burger", "Old Fashioned Burger", [990,46,64,60,1880,3,19]],
    ["double-smash-cheeseburger", "Double Smash Cheeseburger", [1140,54,72,70,3180,3,26]],
    ["bistro-burger", "Bistro Burger", [1330,55,106,74,3190,4,36]],
    ["classic-burger", "Classic Burger", [1280,61,69,83,2520,4,23]],
    ["french-dip-cheeseburger", "French Dip Cheeseburger", [1620,59,79,118,3470,5,23]],
    ["smokehouse-bbq-burger", "Smokehouse B.B.Q. Burger", [1580,68,106,97,3070,3,42]],
    ["americana-cheeseburger", "Americana Cheeseburger", [1390,60,82,90,3410,4,29]],
    ["macaroni-cheese-burger", "Macaroni and Cheese Burger", [1340,60,81,85,2430,4,20]],
    ["bacon-bacon-cheeseburger", "Bacon-Bacon Cheeseburger", [1610,75,78,110,3530,3,30]],
    ["factory-turkey-burger", "Factory Turkey Burger", [1060,53,59,69,2110,7,17]],
    ["veggie-burger", "Veggie Burger", [1040,19,129,50,2920,10,32]],
  ], "1 complete Glamburger with its published standard accompaniments"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["factory-chopped-salad", "Factory Chopped Salad", [780,34,34,59,1360,10,17]],
    ["fried-chicken-club-salad", "Fried Chicken Club Salad", [1530,49,64,119,2920,7,28]],
    ["vegan-cobb-salad", "Vegan Cobb Salad", [1060,16,55,89,1310,19,18]],
    ["chinese-chicken-salad", "Chinese Chicken Salad", [1630,50,135,102,2960,11,62]],
    ["thai-chicken-salad", "Thai Chicken Salad", [1210,73,93,63,2670,14,63]],
    ["sheilas-chicken-avocado-salad", "Sheila's Chicken and Avocado Salad", [1820,56,134,124,2150,22,57]],
    ["barbeque-ranch-chicken-salad", "Barbeque Ranch Chicken Salad", [1950,56,151,124,2920,22,64]],
    ["santa-fe-salad", "Santa Fe Salad", [1670,68,108,112,2450,19,39]],
    ["cobb-salad", "Cobb Salad", [1480,66,30,124,2460,11,13]],
    ["seared-tuna-tataki-salad", "Seared Tuna Tataki Salad", [450,34,16,29,1280,5,8]],
  ], "1 entree salad with its standard published dressing and toppings included"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["chicken-shawarma", "Chicken Shawarma", [1890,59,163,106,5350,12,33]],
    ["chicken-salad-sandwich", "Chicken Salad Sandwich", [1180,41,77,78,2320,7,17]],
    ["cuban-sandwich", "Cuban Sandwich", [1170,70,66,69,3210,3,3]],
    ["the-club", "The Club", [1290,56,112,68,3240,6,24]],
    ["grilled-chicken-avocado-club", "Grilled Chicken and Avocado Club", [1180,71,79,81,1860,5,8]],
    ["spicy-crispy-chicken-sandwich-buffalo", "Spicy Crispy Chicken Sandwich with Spicy Buffalo Sauce", [1090,62,62,66,2710,2,8]],
    ["spicy-crispy-chicken-sandwich-chipotle", "Spicy Crispy Chicken Sandwich with Chipotle Mayo", [1170,60,62,74,1790,2,8]],
    ["crispy-fish-sandwich", "Crispy Fish Sandwich", [1460,53,71,104,2760,4,16]],
    ["blackened-fish-sandwich", "Blackened Fish Sandwich", [1270,38,62,94,2900,4,17]],
    ["chicken-parmesan-sandwich", "Chicken Parmesan Sandwich", [1830,87,100,121,3600,5,7]],
    ["modern-cheesesteak", "Modern Cheesesteak", [1490,76,83,98,3610,5,8]],
  ], "1 complete sandwich with standard accompaniments shown in the guide"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["green-chile-chicken-enchiladas", "Green Chile Chicken Enchiladas", [1420,65,143,67,2760,21,11]],
    ["korean-fried-chicken", "Korean Fried Chicken", [1810,51,239,72,3930,12,66]],
    ["chicken-parmesan-pizza-style", "Chicken Parmesan Pizza Style", [1940,120,90,123,3730,5,10]],
    ["chicken-tenders", "Chicken Tenders", [1500,62,145,76,2900,9,49]],
    ["crispy-pineapple-chicken-shrimp", "Crispy Pineapple Chicken and Shrimp", [1630,54,242,50,2500,7,92]],
    ["shepherds-pie", "Shepherd's Pie", [1400,74,90,81,3290,13,16]],
    ["famous-factory-meatloaf", "Famous Factory Meatloaf", [1930,75,144,115,5100,9,59]],
    ["baja-chicken-tacos", "Baja Chicken Tacos", [1410,80,137,61,2680,16,11]],
    ["grilled-fish-tacos", "Grilled Fish Tacos", [1320,50,141,62,2580,17,15]],
    ["crispy-fish-tacos", "Crispy Hand Battered Fish Tacos", [1610,60,156,80,2740,17,13]],
    ["grilled-steak-tacos", "Grilled Steak Tacos", [1580,67,147,81,2720,17,12]],
    ["chicken-madeira", "Chicken Madeira", [1300,89,72,73,2390,9,11]],
    ["chicken-bellagio", "Chicken Bellagio", [2020,98,144,116,4660,7,6]],
    ["crusted-chicken-romano", "Crusted Chicken Romano", [1800,107,132,94,4420,13,20]],
    ["orange-chicken", "Orange Chicken", [1750,52,233,69,2730,6,77]],
    ["orange-cauliflower", "Orange Cauliflower", [1390,22,205,54,2280,10,67]],
    ["chicken-piccata", "Chicken Piccata", [1420,79,86,85,2920,6,7]],
    ["bang-bang-chicken-shrimp", "Bang-Bang Chicken and Shrimp", [1370,75,144,56,1370,8,26]],
  ], "1 complete specialty entree with the guide's standard included components"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["tomato-basil-pasta", "Tomato Basil Pasta", [1720,72,162,88,4910,18,44]],
    ["fettuccini-alfredo", "Fettuccini Alfredo", [1930,50,143,128,2570,6,8]],
    ["fettuccini-alfredo-chicken", "Fettuccini Alfredo with Chicken", [2120,91,143,132,2960,6,8]],
    ["pasta-carbonara", "Pasta Carbonara", [2030,50,141,139,3480,10,11]],
    ["pasta-carbonara-chicken", "Pasta Carbonara with Chicken", [2220,90,141,142,3860,10,11]],
    ["four-cheese-pasta", "Four Cheese Pasta", [1280,49,132,62,4110,11,23]],
    ["spicy-rigatoni-vodka", "Spicy Rigatoni Vodka", [1570,34,131,100,4470,13,27]],
    ["spaghetti-meatballs", "Spaghetti and Meatballs", [1920,66,179,105,5550,19,34]],
    ["evelyns-favorite-pasta", "Evelyn's Favorite Pasta", [1270,29,122,75,2520,11,12]],
    ["pasta-da-vinci", "Pasta da Vinci", [1540,71,129,83,2380,10,20]],
    ["louisiana-chicken-pasta", "Louisiana Chicken Pasta", [2270,98,176,132,4660,10,17]],
    ["farfalle-chicken-roasted-garlic", "Farfalle with Chicken and Roasted Garlic", [1870,95,153,97,4130,13,17]],
    ["spicy-chicken-chipotle-pasta", "Spicy Chicken Chipotle Pasta", [1770,67,146,103,3230,13,24]],
    ["cajun-jambalaya-pasta", "Cajun Jambalaya Pasta", [1270,83,125,49,3000,7,13]],
  ], "1 dinner pasta entree with its published standard components"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["fish-chips", "Fish & Chips", [1930,79,135,115,3580,9,37]],
    ["shrimp-chicken-gumbo", "Shrimp and Chicken Gumbo", [1450,84,93,82,2280,2,12]],
    ["shrimp-scampi", "Shrimp Scampi", [1260,41,105,76,2340,7,7]],
    ["jamaican-black-pepper-shrimp", "Jamaican Black Pepper Shrimp", [1290,67,195,27,1940,17,70]],
    ["jamaican-black-pepper-chicken", "Jamaican Black Pepper Chicken", [1390,90,192,29,1710,14,69]],
    ["grilled-salmon", "Grilled Salmon", [1270,62,64,84,1640,9,5]],
    ["cajun-salmon", "Cajun Salmon", [1570,59,77,114,2030,7,17]],
    ["herb-crusted-salmon", "Herb Crusted Filet of Salmon", [1350,64,65,93,1620,5,4]],
    ["miso-salmon", "Miso Salmon", [1340,64,120,67,1430,5,27]],
    ["grilled-branzino", "Grilled Branzino", [1410,72,66,94,1910,7,5]],
    ["carne-asada-steak", "Carne Asada Steak", [1290,57,132,61,1350,8,20]],
    ["steak-frites", "Steak Frites", [1530,58,121,90,2860,9,15]],
    ["steak-diane", "Steak Diane", [1150,76,67,65,2750,6,14]],
    ["grilled-rib-eye-steak", "Grilled Rib-Eye Steak", [1360,86,57,88,2610,7,3]],
    ["filet-mignon", "Filet Mignon", [840,67,56,38,1680,7,3]],
  ], "1 complete entree with its standard published sides and sauces included"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["side-french-fries", "French Fries - Side", [1060,11,152,46,2500,10,25]],
    ["side-green-beans", "Green Beans - Side", [140,3,10,10,300,4,2]],
    ["side-sweet-potato-fries", "Sweet Potato Fries - Side", [1010,7,125,52,1800,14,58]],
    ["side-fresh-corn", "Fresh Corn - Side", [270,8,28,14,610,8,11]],
    ["side-mashed-potatoes", "Mashed Potatoes - Side", [450,5,49,25,820,4,2]],
    ["side-sauteed-spinach", "Sauteed Spinach - Side", [650,7,10,67,1100,5,1]],
    ["side-macaroni-cheese", "Macaroni & Cheese - Side", [1550,50,92,109,2690,5,9]],
    ["side-broccoli", "Broccoli - Side", [260,8,15,18,710,8,2]],
    ["side-grilled-asparagus", "Grilled Asparagus - Side", [120,5,8,8,450,3,0]],
  ], "1 separately published side order; no entree included"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["farm-fresh-eggs", "Farm Fresh Eggs", [280,13,1,25,150,0,0]],
    ["farm-fresh-eggs-bacon", "Farm Fresh Eggs with Old Smokehouse Bacon", [480,25,4,40,220,0,3]],
    ["farm-fresh-eggs-ham", "Farm Fresh Eggs with Grilled Ham", [440,44,2,29,1770,0,1]],
    ["farm-fresh-eggs-chicken-sausage", "Farm Fresh Eggs with Chicken Sausage", [520,40,3,39,1440,0,2]],
    ["brioche-breakfast-sandwich", "Brioche Breakfast Sandwich", [1030,48,59,67,1920,5,9]],
    ["plain-omelette", "Plain Omelette", [630,22,2,60,790,0,1]],
    ["shakshuka-omelette", "Shakshuka Omelette", [1020,44,64,64,2140,7,17]],
    ["california-omelette", "California Omelette", [1090,55,13,91,1570,4,4]],
    ["spinach-mushroom-bacon-cheese-omelette", "Spinach, Mushroom, Bacon and Cheese Omelette", [1050,48,14,90,1570,3,4]],
    ["grilled-steak-eggs", "Grilled Steak & Eggs", [720,50,2,60,740,0,1]],
    ["giant-belgian-waffle", "Giant Belgian Waffle", [690,6,77,41,680,1,50]],
    ["fried-chicken-waffles", "Fried Chicken & Waffles", [1190,44,118,61,1260,1,54]],
    ["buttermilk-pancakes", "Buttermilk Pancakes", [1670,30,214,78,3650,8,79]],
    ["brunch-combo", "Brunch Combo", [1110,26,81,77,1010,2,50]],
    ["eggs-benedict", "Eggs Benedict with Canadian Bacon and Hollandaise", [1350,48,51,105,2270,3,3]],
    ["breakfast-burrito", "Breakfast Burrito", [2080,88,121,139,4580,20,19]],
  ], "1 complete published breakfast or weekend brunch order"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["original-cheesecake", "Original Cheesecake", [830,12,63,59,510,1,51]],
    ["fresh-strawberry-cheesecake", "Fresh Strawberry Cheesecake", [1000,12,82,69,550,2,66]],
    ["oreo-dream-extreme-cheesecake", "Oreo Dream Extreme Cheesecake", [1510,15,166,93,800,7,122]],
    ["ultimate-red-velvet-cheesecake", "Ultimate Red Velvet Cake Cheesecake", [1580,14,125,116,630,1,104]],
    ["reeses-peanut-butter-cheesecake", "Reese's Peanut Butter Chocolate Cake Cheesecake", [1510,23,154,95,940,8,121]],
    ["godiva-chocolate-cheesecake", "Godiva Chocolate Cheesecake", [1400,15,110,105,260,8,96]],
    ["brownie-crunch-cheesecake", "Brownie Crunch Choc-A-Lot Cheesecake", [1500,16,121,111,580,5,105]],
    ["coconut-cream-pie-cheesecake", "Coconut Cream Pie Cheesecake", [1370,12,114,98,530,5,93]],
    ["adams-peanut-butter-cup-cheesecake", "Adam's Peanut Butter Cup Fudge Ripple", [1250,18,118,82,750,5,94]],
    ["pineapple-upside-down-cheesecake", "Pineapple Upside-Down Cheesecake", [1260,10,109,83,510,1,99]],
    ["celebration-cheesecake", "Celebration Cheesecake", [1380,15,114,98,740,1,87]],
    ["cinnabon-cinnamon-swirl-cheesecake", "Cinnabon Cinnamon Swirl Cheesecake", [1370,10,141,85,710,2,120]],
    ["salted-caramel-cheesecake", "Salted Caramel Cheesecake", [1240,15,130,73,750,2,107]],
    ["dulce-de-leche-cheesecake", "Dulce De Leche Caramel Cheesecake", [1390,14,107,110,600,2,83]],
    ["white-chocolate-raspberry-cheesecake", "White Chocolate Raspberry Truffle Cheesecake", [1220,13,92,89,550,1,78]],
    ["mango-key-lime-cheesecake", "Mango Key Lime Cheesecake", [1300,13,123,85,520,2,97]],
    ["fresh-banana-cream-cheesecake", "Fresh Banana Cream Cheesecake", [1250,14,99,90,510,3,79]],
    ["lemon-raspberry-cream-cheesecake", "Lemon Raspberry Cream Cheesecake", [1040,10,87,73,420,2,72]],
    ["chocolate-tuxedo-cream-cheesecake", "Chocolate Tuxedo Cream Cheesecake", [1250,11,109,90,400,5,87]],
    ["chocolate-mousse-cheesecake", "Chocolate Mousse Cheesecake", [1220,13,85,94,480,4,69]],
    ["lemon-meringue-cheesecake", "Lemon Meringue Cheesecake", [1170,13,117,73,510,1,95]],
    ["vanilla-bean-cheesecake", "Vanilla Bean Cheesecake", [1170,11,84,88,480,1,68]],
    ["tiramisu-cheesecake", "Tiramisu Cheesecake", [980,11,75,70,450,1,64]],
    ["key-lime-cheesecake", "Key Lime Cheesecake", [1160,13,92,86,430,1,74]],
    ["caramel-pecan-turtle-cheesecake", "Caramel Pecan Turtle Cheesecake", [1300,15,124,88,450,6,102]],
    ["low-licious-cheesecake", "Low-Licious Cheesecake", [570,10,37,44,460,7,5]],
    ["low-licious-strawberry-cheesecake", "Low-Licious Cheesecake with Strawberries", [580,10,39,44,460,8,7]],
  ], "1 restaurant slice with its standard garnish; whole-cake nutrition is not published and is not inferred"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["lindas-fudge-cake", "Linda's Fudge Cake", [1450,13,233,66,1040,9,165]],
    ["carrot-cake", "Carrot Cake", [1720,15,146,122,1060,5,116]],
    ["chocolate-tower-truffle-cake", "Chocolate Tower Truffle Cake", [1770,20,192,111,970,11,143]],
    ["tiramisu", "Tiramisu", [1270,13,91,94,340,1,66]],
    ["warm-apple-crisp", "Warm Apple Crisp", [1000,9,170,33,390,3,139]],
    ["fresh-strawberry-shortcake", "Fresh Strawberry Shortcake", [1340,25,143,76,1140,3,77]],
    ["hot-fudge-sundae", "Hot Fudge Sundae", [1280,20,116,86,220,6,97]],
    ["vanilla-ice-cream-bowl", "Bowl of Vanilla Ice Cream", [750,13,60,51,180,0,57]],
  ], "1 complete dessert order; shareable desserts are excluded unless a single serving is published"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["chocolate-milkshake", "Chocolate Milkshake", [1260,22,143,67,410,2,123]],
    ["vanilla-milkshake", "Vanilla Milkshake", [1210,21,132,66,370,0,117]],
    ["strawberry-milkshake", "Strawberry Milkshake", [1210,19,154,59,320,4,131]],
    ["oreo-milkshake", "Oreo Milkshake", [1630,26,182,90,770,2,134]],
    ["strawberry-smoothie", "Strawberry Fruit Smoothie", [340,2,74,6,25,5,62]],
    ["tropical-smoothie", "Tropical Smoothie", [400,2,87,5,35,2,83]],
    ["peach-smoothie", "Peach Smoothie", [330,2,82,0,15,3,78]],
    ["signature-lemonade", "The Cheesecake Factory Signature Lemonade", [310,1,84,0,15,0,78]],
    ["strawberry-lemonade", "Strawberry Lemonade", [330,1,87,0,15,1,81]],
    ["cucumber-lemonade", "Cucumber Lemonade", [340,1,90,0,45,1,75]],
    ["peach-lemonade", "Peach Lemonade", [330,1,83,0,15,4,78]],
    ["arnold-palmer", "Arnold Palmer", [160,0,42,0,15,0,40]],
    ["coca-cola", "Coca-Cola", [100,0,27,0,10,0,27]],
    ["diet-coke", "Diet Coke", [0,0,0,0,20,0,0]],
    ["coca-cola-zero-sugar", "Coca-Cola Zero Sugar", [0,0,0,0,15,0,0]],
    ["barqs-root-beer", "Barq's Root Beer", [110,0,29,0,20,0,29]],
    ["sprite", "Sprite", [100,0,26,0,30,0,26]],
    ["dr-pepper", "Dr Pepper", [100,0,27,0,40,0,26]],
    ["freshly-brewed-coffee", "Freshly Brewed Coffee", [5,0,1,0,0,0,0]],
    ["iced-tea", "Freshly Brewed Iced Tea", [0,0,0,0,10,0,0]],
  ], "1 published restaurant beverage serving; the guide does not state a fluid-ounce volume"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["skinnylicious-factory-chopped-salad", "SkinnyLicious Factory Chopped Salad", [530,34,36,29,1660,11,16]],
    ["skinnylicious-asian-chicken-salad", "SkinnyLicious Asian Chicken Salad", [570,37,54,25,2810,11,25]],
    ["skinnylicious-mexican-tortilla-salad", "SkinnyLicious Mexican Tortilla Salad", [550,29,59,23,2080,12,19]],
    ["skinnylicious-hamburger", "SkinnyLicious Hamburger", [570,35,41,30,1180,3,9]],
    ["skinnylicious-veggie-burger", "SkinnyLicious Veggie Burger", [550,14,84,18,1780,9,15]],
    ["skinnylicious-crispy-chicken-sandwich", "SkinnyLicious Crispy Chicken Sandwich", [560,25,57,27,1330,3,10]],
    ["skinnylicious-spicy-crispy-chicken-sandwich", "SkinnyLicious Spicy Crispy Chicken Sandwich", [580,25,58,28,1420,3,11]],
    ["skinnylicious-grilled-turkey-burger", "SkinnyLicious Grilled Turkey Burger", [560,29,45,30,1030,5,12]],
    ["skinnylicious-turkey-avocado-sandwich", "SkinnyLicious Turkey & Avocado Sandwich", [550,38,43,26,1650,4,10]],
    ["skinnylicious-chicken-soft-tacos", "SkinnyLicious Chicken Soft Tacos", [520,32,64,16,1050,13,14]],
    ["skinnylicious-shrimp-soft-tacos", "SkinnyLicious Shrimp Soft Tacos", [520,31,67,15,1010,13,14]],
    ["skinnylicious-chicken-pasta", "SkinnyLicious Chicken Pasta", [590,46,75,13,1760,7,10]],
    ["skinnylicious-lemon-garlic-shrimp", "SkinnyLicious Lemon-Garlic Shrimp", [550,32,51,21,2320,4,3]],
    ["skinnylicious-grilled-salmon", "SkinnyLicious Grilled Salmon", [590,45,22,36,1020,7,12]],
    ["skinnylicious-steak-medallions", "SkinnyLicious Grilled Steak Medallions", [440,45,24,19,1320,4,6]],
  ], "1 complete SkinnyLicious menu item with its standard published components"),
  ...sitDownRows(cheesecakeFactoryFood, [
    ["kids-roadside-sliders", "Kids' Roadside Sliders", [360,22,30,16,750,0,6]],
    ["kids-pigs-blanket", "Kids' Pigs in a Blanket", [420,12,24,31,1270,1,5]],
    ["kids-grilled-cheese", "Kids' Grilled Cheese Sandwich", [700,18,73,37,1960,4,9]],
    ["kids-fried-chicken-strips", "Kids' Fried Chicken Strips", [460,24,28,28,550,2,4]],
    ["kids-french-fries", "Kids' French Fries", [300,3,45,11,870,3,12]],
    ["kids-fresh-fruit", "Kids' Fresh Fruit", [50,1,13,0,0,2,10]],
    ["kids-pasta-butter-parmesan", "Kids' Pasta with Butter and Parmesan", [460,13,60,19,950,3,2]],
    ["kids-pasta-marinara", "Kids' Pasta with Marinara Sauce", [470,15,73,13,1600,6,11]],
    ["kids-spaghetti-meatball", "Kids' Spaghetti with Meatball", [680,29,72,31,2180,7,14]],
    ["kids-macaroni-cheese", "Kids' Macaroni and Cheese", [1160,29,84,79,2040,5,9]],
    ["kids-cheese-flatbread", "Kids' Cheese Flatbread Pizza", [1000,49,86,50,2530,4,3]],
    ["kids-pepperoni-flatbread", "Kids' Pepperoni Flatbread Pizza", [990,47,86,50,2720,4,2]],
    ["kids-quesadilla", "Kids' Quesadilla", [820,40,48,54,1440,2,0]],
    ["kids-grilled-chicken", "Kids' Grilled Chicken", [460,33,38,19,1600,5,1]],
    ["kids-grilled-salmon", "Kids' Grilled Salmon", [540,32,40,28,910,5,1]],
    ["kids-ice-cream-scoop", "Kids' Scoop of Ice Cream", [320,6,26,21,80,0,25]],
  ], "1 kids' menu item; separately selected beverage is excluded unless named"),
];

const redLobster = { id: "red-lobster", name: "Red Lobster" };
const RED_LOBSTER_SOURCE = "https://img-ecomm-rl-prod-fye5gqbxdtbghqer.a03.azurefd.net/brandsite/documents/US_Nutrition_8-17-26.pdf";
const RED_LOBSTER_REFERENCE = "Red Lobster official U.S. Nutrition guide, valid beginning August 17, 2026. Fixed sides, condiments, and dipping sauces are included where the item name states them; selectable side choices are listed separately.";
const redLobsterFood = (id, name, description, values, options) => sitDownFood(
  redLobster, RED_LOBSTER_SOURCE, RED_LOBSTER_REFERENCE, ["Red Lobster"], id, name, description, values, options
);
const redLobsterFoods = [
  ...sitDownRows(redLobsterFood, [
    ["bacon-wrapped-sea-scallops", "Bacon Wrapped Sea Scallops", [450,23,9,37,1400,1,6]],
    ["calamari", "Calamari", [1000,47,44,70,2070,1,5]],
    ["crab-queso", "Crab Queso", [930,31,76,56,2100,8,5]],
    ["crispy-dragon-shrimp-starter", "Crispy Dragon Shrimp - Starter", [1010,25,67,72,2010,4,22]],
    ["lobster-dip", "Lobster Dip", [890,30,82,35,1910,9,7]],
    ["lobster-flatbread", "Lobster Flatbread", [800,39,77,38,2310,5,8]],
    ["mozzarella-cheesesticks", "Mozzarella Cheesesticks", [730,31,58,41,2130,4,7]],
    ["parrot-isle-coconut-shrimp-starter", "Parrot Isle Coconut Shrimp - Starter", [660,20,55,41,910,5,20]],
    ["popcorn-shrimp-starter", "Popcorn Shrimp - Starter", [820,33,55,51,1300,2,12]],
    ["seafood-stuffed-mushrooms", "Seafood Stuffed Mushrooms", [360,24,17,23,1000,2,5]],
    ["shrimp-cocktail", "Shrimp Cocktail", [180,23,10,4,1180,1,9]],
  ], "1 complete starter order with the guide's fixed condiments or dipping sauce included"),
  ...[
    ["lobster-bisque", "Lobster Bisque", [340,6,17,27,800,0,4], [630,11,27,52,1520,0,9]],
    ["new-england-clam-chowder", "New England Clam Chowder", [280,8,21,17,780,0,4], [500,15,35,33,1490,0,8]],
  ].map(([id, name, cup, bowl]) => redLobsterFood(id, name, "Choose the published cup or bowl serving", null, [
    ["cup", `1 cup of ${name}`, cup], ["bowl", `1 bowl of ${name}`, bowl],
  ])),
  ...sitDownRows(redLobsterFood, [
    ["admirals-feast", "Admiral's Feast", [1670,57,131,99,4820,7,16]],
    ["crab-your-way-bairdi", "Crab Your Way - 1 lb Bairdi with Crispy Potatoes", [650,50,55,27,3800,6,3]],
    ["crab-your-way-snow", "Crab Your Way - 1 lb Snow Crab with Crispy Potatoes", [610,42,55,26,3490,6,3]],
    ["crunch-fried-flounder-sandwich", "Crunch-Fried Flounder Sandwich with Fries and Ketchup", [1580,36,169,83,3720,10,22]],
    ["garlic-grilled-filet-mignon", "Garlic-Grilled Filet Mignon 6 oz", [340,34,3,22,960,1,1]],
    ["garlic-grilled-sirloin", "Garlic-Grilled Sirloin 7 oz", [400,46,3,23,1090,0,0]],
    ["grilled-chicken-sandwich", "Grilled Chicken Sandwich with Fries", [1190,50,130,50,3020,9,23]],
    ["grilled-lobster-shrimp-salmon", "Grilled Lobster, Shrimp and Salmon", [1180,76,47,76,2830,2,2]],
    ["live-maine-lobster", "Live Maine Lobster", [440,33,0,34,290,0,0]],
    ["lobster-lovers-duo", "Lobster Lover's Duo", [600,25,1,51,1150,1,0]],
    ["parmesan-crusted-chicken", "Parmesan-Crusted Chicken", [650,47,34,35,1620,1,4]],
    ["sailors-platter", "Sailor's Platter with Chesapeake Fries", [1910,58,160,110,5240,10,27]],
    ["atlantic-salmon", "Atlantic Salmon - Grilled", [510,47,1,34,680,0,0]],
    ["salmon-new-orleans", "Salmon New Orleans", [1160,102,9,77,1180,2,2]],
    ["mariners-seafood-boil", "Mariner's Seafood Boil with Snow Crab", [600,60,80,4,2160,9,10]],
    ["sailors-seafood-boil", "Sailor's Seafood Boil", [1320,83,91,71,4570,9,14]],
    ["ultimate-feast", "Ultimate Feast", [1280,52,35,98,4180,3,10]],
    ["chicken-caesar-bowl", "Classic Caesar Bowl with Chicken", [720,50,46,38,1920,5,4]],
    ["sesame-salmon-bowl", "Sesame-Soy Salmon Bowl", [1140,62,86,61,2320,12,27]],
    ["southwest-shrimp-bowl", "Southwest Shrimp Bowl", [700,24,53,45,2320,4,10]],
  ], "1 complete entree with fixed components named by the official guide; selectable side choices are excluded"),
  ...[
    ["cajun-chicken-linguini-alfredo", "Cajun Chicken Linguini Alfredo", [760,55,64,32,1880,7,3], [1060,66,87,50,2960,9,6]],
    ["classic-chicken-linguini-alfredo", "Classic Chicken Linguini Alfredo", [710,53,54,31,1390,0,2], [1010,64,77,50,2460,0,5]],
    ["crab-shrimp-linguini-alfredo", "Crab & Shrimp Linguini Alfredo", [600,28,57,29,1520,5,3], [1030,49,83,56,2970,7,7]],
    ["lobster-shrimp-linguini", "Lobster & Shrimp Linguini", [1000,44,67,63,2680,5,3], [1240,63,85,74,3190,7,5]],
    ["shrimp-linguini-alfredo", "Shrimp Linguini Alfredo", [580,28,57,26,1380,4,3], [930,50,81,45,2690,6,5]],
    ["fish-chips", "Fish & Chips with Coleslaw", [1160,22,112,68,2690,9,17], [1520,37,133,91,3480,12,20]],
    ["wild-caught-crunch-fried-flounder", "Wild-Caught Crunch-Fried Flounder", [700,22,40,48,1690,1,2], [1170,44,78,74,3130,2,3]],
  ].map(([id, name, lighter, full]) => redLobsterFood(id, name, "Choose the published lighter or full portion; fixed components named by the option are included", null, [
    ["lighter", `Lighter portion of ${name}`, lighter], ["full", `Full portion of ${name}`, full],
  ])),
  ...sitDownRows(redLobsterFood, [
    ["create-ultimate-crispy-dragon-lobster", "Create Your Own Ultimate Feast - Crispy Dragon Teriyaki Lobster", [360,16,32,19,1740,1,10]],
    ["create-ultimate-garlic-shrimp", "Create Your Own Ultimate Feast - Garlic Shrimp", [220,12,4,18,970,0,0]],
    ["create-ultimate-grilled-salmon", "Create Your Own Ultimate Feast - Grilled Salmon", [510,47,1,34,680,0,0]],
    ["create-ultimate-grilled-shrimp", "Create Your Own Ultimate Feast - Grilled Shrimp", [250,16,29,7,1130,1,1]],
    ["create-ultimate-lobster-pasta-au-gratin", "Create Your Own Ultimate Feast - Lobster Pasta au Gratin", [670,34,45,39,1520,2,3]],
    ["create-ultimate-maine-lobster-tail", "Create Your Own Ultimate Feast - Maine Lobster Tail", [420,14,0,37,1020,0,0]],
    ["create-ultimate-parrot-isle-shrimp", "Create Your Own Ultimate Feast - Parrot Isle Coconut Shrimp", [470,13,41,29,620,3,18]],
    ["create-ultimate-shrimp-linguini", "Create Your Own Ultimate Feast - Shrimp Linguini Alfredo", [620,27,56,31,1230,4,2]],
    ["create-ultimate-sirloin", "Create Your Own Ultimate Feast - Sirloin 7 oz", [320,46,1,15,980,0,0]],
    ["create-ultimate-snow-crab", "Create Your Own Ultimate Feast - Snow Crab Legs", [380,19,0,34,1070,0,0]],
    ["create-ultimate-walts-shrimp", "Create Your Own Ultimate Feast - Walt's Favorite Shrimp", [260,10,31,10,1560,2,9]],
  ], "1 separately published Create Your Own Ultimate Feast component; other selections and side choices are excluded"),
  ...sitDownRows(redLobsterFood, [
    ["shrimp-your-way-crispy-dragon", "Shrimp Your Way - Crispy Dragon Shrimp", [480,13,35,30,1040,2,12]],
    ["shrimp-your-way-garlic-scampi", "Shrimp Your Way - Garlic Shrimp Scampi", [220,12,3,18,970,1,1]],
    ["shrimp-your-way-grilled", "Shrimp Your Way - Grilled Shrimp with Rice", [250,16,29,7,1130,1,1]],
    ["shrimp-your-way-coconut", "Shrimp Your Way - Parrot Isle Coconut Shrimp", [470,14,40,28,610,3,16]],
    ["shrimp-your-way-popcorn", "Shrimp Your Way - Popcorn Shrimp", [430,17,33,26,940,1,11]],
    ["shrimp-your-way-linguini", "Shrimp Your Way - Shrimp Linguini Alfredo", [620,27,56,31,1230,4,2]],
    ["shrimp-your-way-walts", "Shrimp Your Way - Walt's Favorite Shrimp", [260,10,31,10,1560,2,9]],
  ], "1 separately published Shrimp Your Way selection; other selections and side choices are excluded"),
  ...sitDownRows(redLobsterFood, [
    ["side-asparagus", "Seasoned Asparagus", [90,4,8,6,310,4,3]],
    ["side-bacon-mac-cheese", "Bacon Mac & Cheese", [610,25,48,34,1590,2,6]],
    ["side-baked-potato", "Baked Potato", [270,7,55,4,1730,6,3]],
    ["side-loaded-baked-potato", "Loaded Baked Potato", [520,17,57,26,2170,6,4]],
    ["side-lobster-topped-potato", "Lobster-Topped Baked Potato", [450,18,59,18,2310,6,4]],
    ["side-caesar-salad", "Caesar Side Salad", [360,11,14,30,700,3,5]],
    ["cheddar-bay-biscuit", "Cheddar Bay Biscuit", [160,3,16,10,380,0,0]],
    ["side-chesapeake-fries", "Chesapeake Fries", [510,7,74,20,1170,6,0]],
    ["side-coleslaw", "Coleslaw", [110,2,10,8,140,2,6]],
    ["side-brussels-sprouts", "Crispy Brussels Sprouts", [380,12,48,17,980,11,20]],
    ["side-house-salad", "House Side Salad", [160,8,12,9,230,2,4]],
    ["side-hush-puppies", "Hush Puppies - 6 Piece", [420,4,40,26,760,2,14]],
    ["side-lobster-pasta-au-gratin", "Lobster Pasta au Gratin", [670,34,45,39,1520,2,3]],
    ["side-mashed-potatoes", "Creamy Lobster Mashed Potatoes", [350,15,25,22,1120,3,2]],
    ["side-orzo-rice", "Orzo Rice", [310,6,57,6,880,2,1]],
    ["side-broccoli", "Seasoned Broccoli", [190,4,9,16,400,3,2]],
  ], "1 separately published side order; entree is excluded"),
  ...sitDownRows(redLobsterFood, [
    ["kids-crispy-chicken-tenders", "Kids Crispy Chicken Tenders", [690,25,29,54,1150,0,8]],
    ["kids-popcorn-shrimp", "Kids Popcorn Shrimp", [430,17,33,25,940,1,11]],
    ["kids-garlic-grilled-shrimp", "Kids Garlic-Grilled Shrimp", [80,11,1,4,580,0,0]],
    ["kids-golden-fried-fish", "Kids Golden-Fried Fish", [530,22,53,25,1920,2,13]],
    ["kids-grilled-chicken", "Kids Grilled Chicken", [170,31,0,5,120,0,0]],
    ["kids-mac-cheese", "Kids Macaroni & Cheese", [310,11,44,9,830,2,10]],
    ["kids-petite-maine-lobster-tail", "Kids Petite Maine Lobster Tail", [360,10,0,35,580,0,0]],
  ], "1 kids' entree; separately selected side and beverage are excluded"),
  ...sitDownRows(redLobsterFood, [
    ["brownie-overboard", "Brownie Overboard", [1020,13,121,57,360,5,84]],
    ["chocolate-wave", "Chocolate Wave", [1110,11,134,62,720,6,93]],
    ["key-lime-pie", "Key Lime Pie", [580,10,76,27,270,2,55]],
    ["strawberry-cheesecake-bliss", "Strawberry Cheesecake Bliss", [1170,14,102,69,780,3,76]],
  ], "1 complete dessert order"),
  ...sitDownRows(redLobsterFood, [
    ["blue-cheese-dressing", "Blue Cheese Dressing", [210,2,2,23,360,0,2]],
    ["melted-butter", "Melted Butter", [300,0,0,33,290,0,0]],
    ["whipped-butter", "Whipped Butter", [100,0,0,12,60,0,0]],
    ["caesar-dressing", "Caesar Dressing", [300,2,0,32,590,0,0]],
    ["cocktail-sauce", "Cocktail Sauce", [50,1,11,0,580,0,10]],
    ["honey-mustard", "Honey Mustard", [200,0,7,19,370,0,7]],
    ["ketchup", "Ketchup", [60,0,15,0,480,0,12]],
    ["marinara-sauce", "Marinara Sauce", [30,1,4,1,260,1,2]],
    ["pina-colada-sauce", "Pina Colada Sauce", [90,1,12,4,30,0,11]],
    ["ranch-dressing", "Ranch Dressing", [150,0,2,16,320,0,1]],
    ["tartar-sauce", "Tartar Sauce", [230,0,2,23,250,0,2]],
  ], "1 separately published dressing, butter, or sauce serving; food to dip is excluded"),
  ...sitDownRows(redLobsterFood, [
    ["pepsi", "Pepsi", [150,0,41,0,30,0,41]],
    ["diet-pepsi", "Diet Pepsi", [0,0,0,0,55,0,0]],
    ["pepsi-zero-sugar", "Pepsi Zero Sugar", [0,0,0,0,65,0,0]],
    ["dr-pepper", "Dr Pepper", [140,0,39,0,45,0,38]],
    ["mountain-dew", "Mountain Dew", [160,0,44,0,50,0,44]],
    ["mug-root-beer", "Mug Root Beer", [150,0,52,0,60,0,52]],
    ["starry", "Starry", [150,0,51,0,85,0,51]],
    ["lemonade", "Lemonade", [140,0,37,0,10,0,35]],
    ["iced-tea", "Iced Tea", [0,0,1,0,15,0,0]],
    ["coffee", "Coffee", [0,0,0,0,5,0,0]],
    ["mango-lemonade", "Mango Lemonade", [210,0,48,0,130,1,44]],
    ["strawberry-lemonade", "Strawberry Lemonade", [200,0,47,0,130,0,44]],
    ["watermelon-lemonade", "Watermelon Lemonade", [260,0,62,0,130,0,62]],
    ["mango-smoothie", "Mango Smoothie", [380,7,88,6,240,3,73]],
    ["raspberry-smoothie", "Raspberry Smoothie", [460,7,94,6,240,2,79]],
    ["strawberry-smoothie", "Strawberry Smoothie", [450,8,90,6,300,1,80]],
  ], "1 published restaurant beverage serving; the guide does not state a fluid-ounce volume"),
];

const redRobin = { id: "red-robin", name: "Red Robin" };
const RED_ROBIN_SOURCE = "https://www.redrobin.com/sites/default/files/2023-12/0124_NS_US-ALL.pdf";
const RED_ROBIN_REFERENCE = "Red Robin official U.S. Nutritional Guide, live date October 2, 2023. Burger and sandwich values exclude sides; Bottomless beverages and fries are recorded per published serving.";
const redRobinFood = (id, name, description, values, options) => sitDownFood(
  redRobin, RED_ROBIN_SOURCE, RED_ROBIN_REFERENCE, ["Red Robin"], id, name, description, values, options
);
const redRobinFoods = [
  ...sitDownRows(redRobinFood, [
    ["bbq-burnt-ends-loaded-fries", "BBQ Burnt Ends Loaded Fries", [1210,41,109,68,2080,11,13]],
    ["cheesy-bacon-fondue-fries", "Cheesy Bacon Fondue & Fries", [900,24,87,51,1520,9,7]],
    ["cheesy-mozzarella-twists", "Cheesy Mozzarella Twists", [900,32,81,50,2740,5,7]],
    ["crispy-fried-pickles", "Crispy Fried Pickles", [750,6,60,52,2850,3,14]],
    ["crispy-parmesan-brussels-sprouts", "Crispy Parmesan Brussels Sprouts", [910,20,51,70,800,19,11]],
    ["pretzel-bites", "Pretzel Bites", [780,15,91,39,1750,9,5]],
    ["o-ring-shorty", "The O-Ring Shorty", [920,9,89,60,2180,4,27]],
    ["towering-onion-rings", "Towering Onion Rings", [1310,17,175,61,3610,7,42]],
    ["tsunami-shrimp-starter", "Tsunami Shrimp - Starter", [1000,23,66,71,1390,7,9]],
  ], "1 full appetizer order with the guide's included components"),
  ...sitDownRows(redRobinFood, [
    ["boneless-chicken-bites-plain", "Saucy Boneless Chicken Bites - Plain", [810,21,66,37,1950,14,1]],
    ["boneless-chicken-bites-buzzard", "Saucy Boneless Chicken Bites with Buzzard Sauce", [1010,24,70,57,3790,15,3]],
    ["boneless-chicken-bites-whiskey-bbq", "Saucy Boneless Chicken Bites with Whiskey BBQ Sauce", [1010,23,103,43,2810,15,30]],
    ["boneless-chicken-bites-island-heat", "Saucy Boneless Chicken Bites with Island Heat Sauce", [950,21,101,37,2180,15,33]],
    ["boneless-chicken-bites-banzai", "Saucy Boneless Chicken Bites with Banzai Sauce", [920,23,92,37,3080,14,24]],
    ["bar-wings-yukon-chips-plain", "Bar Wings 'N' Yukon Chips - Plain", [1080,91,21,70,1310,6,1]],
    ["bar-wings-yukon-chips-buzzard", "Bar Wings 'N' Yukon Chips with Buzzard Sauce", [1280,94,25,90,3140,7,3]],
    ["bar-wings-yukon-chips-whiskey-bbq", "Bar Wings 'N' Yukon Chips with Whiskey BBQ Sauce", [1280,93,58,76,2170,7,30]],
    ["bar-wings-yukon-chips-island-heat", "Bar Wings 'N' Yukon Chips with Island Heat Sauce", [1220,91,56,71,1540,7,32]],
    ["bar-wings-yukon-chips-banzai", "Bar Wings 'N' Yukon Chips with Banzai Sauce", [1190,93,47,70,2430,6,23]],
  ], "1 complete chicken order with the named sauce and Yukon Chips included"),
  ...sitDownRows(redRobinFood, [
    ["bacon-cheeseburger", "Bacon Cheeseburger", [1000,43,48,73,1800,3,10]],
    ["banzai-burger", "Banzai Burger", [980,39,59,67,1580,3,20]],
    ["bbq-burnt-ends-bacon-burger", "BBQ Burnt Ends 'N Bacon Burger", [1370,55,74,95,2290,4,19]],
    ["bleu-ribbon-burger", "Bleu Ribbon Burger", [1070,36,69,72,1610,5,16]],
    ["burnin-love-burger", "Burnin' Love Burger", [980,39,57,70,1540,5,11]],
    ["cheesy-bacon-fondue-burger", "Cheesy Bacon Fondue Burger", [1360,62,56,101,2820,3,15]],
    ["monster-burger", "Monster Burger", [1300,65,63,90,2520,4,20]],
    ["red-robin-gourmet-cheeseburger", "Red Robin Gourmet Cheeseburger", [850,37,58,53,1860,4,18]],
    ["royal-red-robin-burger", "Royal Red Robin Burger", [1120,49,48,82,1920,3,10]],
    ["sauteed-shroom-burger", "Sauteed 'Shroom Burger", [910,43,51,60,1200,5,10]],
    ["scorpion-gourmet-burger", "Scorpion Gourmet Burger", [1070,40,68,72,2270,7,15]],
    ["smashed-avocado-bacon-burger", "Smashed Avocado N' Bacon Burger", [930,46,51,62,1110,5,10]],
    ["smoke-pepper-burger", "Smoke & Pepper Burger", [790,45,57,44,1780,3,16]],
    ["southern-charm-burger", "The Southern Charm Burger", [1170,46,73,78,1780,12,27]],
    ["whiskey-river-bbq-burger", "Whiskey River BBQ Burger", [1200,40,74,83,1630,5,20]],
  ], "1 standard beef burger; side is excluded and logged separately"),
  ...sitDownRows(redRobinFood, [
    ["keep-it-simple-beef", "Keep It Simple Burger - Beef", [570,31,47,29,1000,3,9]],
    ["keep-it-simple-chicken", "Keep It Simple Burger - Chicken", [350,35,45,4,880,4,9]],
    ["keep-it-simple-veggie", "Keep It Simple Burger - Veggie", [360,15,62,7,960,10,13]],
    ["grilled-turkey-burger", "Grilled Turkey Burger", [780,39,43,51,1360,3,8]],
    ["impossible-burger", "Impossible Burger", [750,33,66,41,1840,8,18]],
    ["wedgie-burger", "The Wedgie Burger", [500,32,14,36,720,4,5]],
    ["tuscan-salmon", "Tuscan Salmon", [900,42,49,65,1450,3,11]],
    ["veggie-burger", "Veggie Burger", [770,24,63,50,1130,12,13]],
    ["vegan-burger", "Vegan Burger", [220,9,26,10,490,11,8]],
    ["cowboy-ranch-double", "Cowboy Ranch Double", [720,30,49,45,1340,2,17]],
    ["haystack-double", "Haystack Double", [740,32,41,50,1360,2,10]],
    ["pig-out-double", "Pig Out Double", [890,44,43,62,1730,2,16]],
    ["reds-double", "Red's Double", [640,31,35,42,1270,2,8]],
  ], "1 complete burger with the named protein; side is excluded and logged separately"),
  ...sitDownRows(redRobinFood, [
    ["clucks-fries", "Clucks & Fries", [1340,27,102,84,2530,9,4]],
    ["clucks-fries-buffalo", "Clucks & Fries - Buffalo Style", [1610,28,103,112,4870,10,4]],
    ["ensenada-chicken-platter", "Ensenada Chicken Platter", [390,57,12,14,1640,3,6]],
    ["hand-battered-fish-chips", "Hand-Battered Fish & Chips", [1610,46,143,95,3060,12,15]],
    ["searious-salmon", "Sear-ious Salmon", [440,33,8,34,850,1,4]],
    ["chicken-fajitas", "Chicken Fajitas", [1180,81,93,56,2380,13,15]],
  ], "1 complete entree; steak fries are included only when named"),
  ...sitDownRows(redRobinFood, [
    ["blta-croissant", "BLTA Croissant", [690,31,49,42,1490,5,9]],
    ["buzzin-chicken-sandwich", "Buzzin' Chicken Sandwich", [940,39,59,62,2100,4,9]],
    ["caesars-chicken-wrap", "Caesar's Chicken Wrap", [830,41,58,49,1530,4,2]],
    ["california-chicken-sandwich", "California Chicken Sandwich", [700,50,47,36,1360,5,9]],
    ["crispy-chicken-sandwich", "Crispy Chicken Sandwich", [910,39,59,59,1490,3,8]],
    ["crispy-chicken-wrap", "Crispy Chicken Wrap", [1100,31,84,67,1960,5,5]],
    ["crispy-fish-sandwich", "Crispy Fish Sandwich", [890,28,91,46,2120,6,16]],
    ["teriyaki-chicken-sandwich", "Teriyaki Chicken Sandwich", [780,44,61,42,1330,4,24]],
    ["whiskey-river-bbq-chicken-sandwich", "Whiskey River BBQ Chicken Sandwich", [970,44,72,58,1510,5,20]],
    ["whiskey-river-bbq-chicken-wrap", "Whiskey River BBQ Chicken Wrap", [900,43,75,48,1760,4,14]],
  ], "1 sandwich or wrap; Bottomless Steak Fries are excluded and logged by published serving"),
  ...[
    ["chicken-tortilla-soup", "Chicken Tortilla Soup", [170,12,13,8,540,2,2], [340,23,27,16,1080,5,4]],
    ["clamdiggers-clam-chowder", "Clamdigger's Clam Chowder", [210,6,12,15,640,0,4], [420,11,25,31,1270,0,8]],
    ["french-onion-soup", "French Onion Soup", [120,6,7,8,260,1,3], [230,13,13,15,510,2,6]],
    ["reds-chili", "Red's Chili Chili", [260,15,21,13,660,4,4], [460,27,40,23,1260,9,8]],
  ].map(([id, name, cup, bowl]) => redRobinFood(id, name, "Choose the published cup or bowl serving", null, [
    ["cup", `1 cup of ${name}`, cup], ["bowl", `1 bowl of ${name}`, bowl],
  ])),
  ...sitDownRows(redRobinFood, [
    ["avo-cobb-o-salad", "Avo-Cobb-O Salad", [1070,50,51,78,1810,10,30]],
    ["crispy-chicken-tender-salad", "Crispy Chicken Tender Salad", [1360,37,82,94,2180,7,30]],
    ["house-salad", "House Salad", [430,5,25,36,650,2,18]],
    ["mighty-caesar", "Mighty Caesar Salad", [750,36,20,61,1220,6,5]],
    ["simply-grilled-chicken-salad", "Simply Grilled Chicken Salad", [810,37,42,57,1310,5,29]],
    ["southwest-salad", "Southwest Salad", [800,41,42,54,1510,10,10]],
  ], "1 entree salad; dressing is excluded where the guide marks it separately"),
  ...[
    ["balsamic-vinaigrette", "Balsamic Vinaigrette", [90,0,6,9,490,0,4], [140,0,8,14,730,0,6]],
    ["bleu-cheese-dressing", "Bleu Cheese Dressing", [320,2,0,34,570,0,0], [470,3,0,51,860,0,0]],
    ["caesar-dressing", "Caesar Dressing", [360,2,3,38,510,0,0], [530,3,5,57,760,0,1]],
    ["poppyseed-honey-mustard", "Poppyseed-Honey Mustard Dressing", [350,1,17,31,510,0,16], [520,2,26,47,770,0,24]],
    ["ranch-dressing", "Ranch Dressing", [270,1,2,29,410,0,2], [400,2,3,43,620,0,3]],
    ["salsa-ranch", "Salsa Ranch Dressing", [190,1,2,20,290,0,2], [290,2,4,30,440,0,3]],
    ["thousand-island-dressing", "Thousand Island Dressing", [190,0,7,18,440,0,6], [290,0,10,27,660,0,9]],
  ].map(([id, name, two, three]) => redRobinFood(id, name, "Choose the published 2 oz or 3 oz dressing serving; salad is excluded", null, [
    ["2oz", `2 oz of ${name}`, two], ["3oz", `3 oz of ${name}`, three],
  ])),
  redRobinFood("bottomless-steak-fries", "Bottomless Steak Fries", "Choose one published serving; refills are logged as additional servings, never as an unlimited quantity", null, [
    ["serving", "1 standard published serving of Bottomless Steak Fries", [350,5,48,16,380,5,0]],
    ["8oz", "8 oz serving of Bottomless Steak Fries", [570,8,77,25,610,8,1]],
  ]),
  ...sitDownRows(redRobinFood, [
    ["side-coleslaw", "Coleslaw", [180,2,16,12,660,3,9]],
    ["side-garlic-fries", "Garlic Fries", [430,8,50,23,500,5,2]],
    ["side-garlic-parmesan-broccoli", "Garlic Parmesan Broccoli", [80,5,7,4.5,130,3,2]],
    ["side-onion-rings", "Onion Rings", [280,6,61,1,1020,3,11]],
    ["side-steamed-broccoli", "Steamed Broccoli", [30,3,6,0.5,30,3,2]],
    ["side-sweet-potato-fries", "Sweet Potato Fries", [460,4,59,23,750,8,21]],
    ["side-yukon-chips", "Yukon Chips", [500,4,41,35,490,8,0]],
  ], "1 separately published side serving; entree is excluded"),
  ...sitDownRows(redRobinFood, [
    ["buzzard-sauce", "Buzzard Spicy Wing Sauce", [140,0,0,16,1640,0,0]],
    ["campfire-mayo", "Campfire Mayo", [330,0,14,30,550,0,12]],
    ["chipotle-aioli", "Chipotle Aioli", [430,0,2,47,430,0,2]],
    ["house-made-salsa", "House-Made Salsa", [15,0,3,0,260,0,2]],
    ["island-heat-sauce", "Island Heat Sauce", [130,0,31,0,230,0,29]],
    ["ranch-dipping-sauce", "Ranch Dipping Sauce", [270,1,2,29,410,0,2]],
    ["reds-secret-tavern-sauce", "Red's Secret Tavern Sauce", [190,0,7,18,440,0,6]],
    ["roasted-garlic-aioli", "Roasted Garlic Aioli", [510,2,2,56,430,0,1]],
    ["smoke-pepper-ketchup", "Smoke & Pepper Ketchup", [90,1,23,0,690,0,17]],
    ["sweet-spicy-ketchup", "Sweet & Spicy Ketchup", [130,0,33,0,350,0,30]],
    ["teriyaki-sauce", "Teriyaki Sauce", [100,2,24,0,1130,0,20]],
    ["whiskey-river-bbq-sauce", "Whiskey River BBQ Sauce", [130,1,31,0.5,800,1,28]],
  ], "1 separately published dipping sauce serving; food for dipping is excluded"),
  ...sitDownRows(redRobinFood, [
    ["kids-cluck-a-doodles-3", "Kids Cluck-A-Doodles - 3 Piece", [540,15,38,29,1010,3,0]],
    ["kids-cluck-a-doodles-2", "Lil' Appetites Cluck-A-Doodles - 2 Piece", [360,10,26,20,720,2,0]],
    ["kids-corn-doggies-9", "Kids Corn Doggies - 9 Piece", [530,16,43,33,1250,2,7]],
    ["kids-corn-doggies-6", "Lil' Appetites Corn Doggies - 6 Piece", [350,10,29,22,830,1,5]],
    ["kids-grilled-chicken-dipns", "Kids Grilled Chicken Dip'Ns - Plain", [120,27,0,1,260,0,0]],
    ["kids-mac-it-yours", "Kids Mac It Yours", [330,10,38,15,890,1,9]],
    ["kids-reds-cheeseburger", "Kids Red's Cheeseburger - Beef", [380,20,32,20,800,0,5]],
    ["kids-reds-burger", "Kids Red's Burger - Beef", [320,17,29,15,360,0,3]],
    ["kids-steak-fries", "Kids Steak Fries", [210,3,29,9,230,3,0]],
    ["kids-sundae", "Kids Sundae", [310,6,58,7,45,1,42]],
  ], "1 kids' menu component; selectable side and beverage are excluded unless named"),
  ...[
    ["chocolate-shake", "Chocolate Milkshake", [540,11,77,21,200,1,66], [1020,21,150,38,380,3,128]],
    ["oreo-shake", "Oreo Cookie Magic Milkshake", [600,11,83,25,290,1,65], [1040,21,146,43,480,2,118]],
    ["strawberry-shake", "Strawberry Milkshake", [510,10,72,21,180,1,65], [930,20,130,38,350,2,116]],
    ["vanilla-shake", "Vanilla Milkshake", [500,10,69,21,180,0,62], [940,19,133,38,350,0,119]],
  ].map(([id, name, kid, monster]) => redRobinFood(id, name, "Choose the published Kid or Monster shake size", null, [
    ["kid", `Kid size ${name}`, kid], ["monster", `Monster size ${name}`, monster],
  ])),
  ...sitDownRows(redRobinFood, [
    ["cinnamon-sugar-doh-rings-tower", "Cinnamon Sugar Doh! Rings Tower", [1550,19,259,51,1230,6,124]],
    ["cinnamon-sugar-doh-ring-shorty", "Cinnamon Sugar Doh! Ring Shorty", [770,10,129,26,620,3,62]],
    ["freckled-lemonade-cake", "Freckled Lemonade Cake", [1060,11,152,46,430,2,126]],
    ["fudge-stuffed-cookie", "Fudge Stuffed Chocolate Chip Cookie", [350,3,51,14,360,1,28]],
    ["gooey-chocolate-brownie-cake", "Gooey Chocolate Brownie Cake", [880,12,139,33,310,2,99]],
    ["mountain-high-mudd-pie", "Mountain High Mudd Pie", [1340,1,188,59,570,7,129]],
  ], "1 complete dessert order; the cookie value is per cookie"),
  ...sitDownRows(redRobinFood, [
    ["coca-cola", "Coca-Cola", [120,0,33,0,40,0,33]],
    ["coca-cola-zero", "Coca-Cola Zero", [0,0,0,0,35,0,0]],
    ["diet-coke", "Diet Coke", [0,0,0,0,35,0,0]],
    ["dr-pepper", "Dr Pepper", [130,0,33,0,50,0,32]],
    ["diet-dr-pepper", "Diet Dr Pepper", [0,0,0,0,50,0,0]],
    ["sprite", "Sprite", [130,0,34,0,30,0,30]],
    ["barqs-root-beer", "Barq's Root Beer", [130,0,38,0,60,0,38]],
    ["freckled-lemonade", "Freckled Lemonade", [200,0,51,0,15,1,50]],
    ["fresh-brewed-iced-tea", "Fresh-Brewed Iced Tea", [0,0,0,0,0,0,0]],
    ["fresh-brewed-sweet-tea", "Fresh-Brewed Sweet Tea", [120,0,32,0,0,0,32]],
  ], "1 adult published Bottomless beverage serving; each refill is logged as another serving"),
].map((food) => food.id === "restaurant:red-robin:coca-cola-zero" ? {
  ...food,
  searchAliases: [...food.searchAliases, "Red Robin Coke Zero"],
} : food);

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
  ...popeyesFoods,
  ...kfcFoods,
  ...canesFoods,
  ...wingstopFoods,
  ...dairyQueenFoods,
  ...arbysFoods,
  ...jackInTheBoxFoods,
  ...dominosFoods,
  ...pizzaHutFoods,
  ...papaJohnsFoods,
  ...littleCaesarsFoods,
  ...hideawayFoods,
  ...marcosFoods,
  ...chilisFoods,
  ...applebeesFoods,
  ...texasRoadhouseFoods,
  ...oliveGardenFoods,
  ...longHornFoods,
  ...outbackFoods,
  ...cheesecakeFactoryFoods,
  ...redLobsterFoods,
  ...redRobinFoods,
  ...sonicFoods,
  ...braumsFoods,
  ...tacoBellFoods,
  ...chickFilAFoods,
  ...whataburgerFoods,
];

export default restaurantFoods;
