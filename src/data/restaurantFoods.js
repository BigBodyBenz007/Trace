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
  return option;
};
const menuFood = (chain, sourceUrl, sourceReference, id, name, description, nutrients, servingOptions, searchAliases) => {
  const food = officialFood(
    chain,
    id,
    name,
    description,
    nutrients,
    sourceUrl,
    sourceReference,
    servingOptions,
    { accessedAt: NEXT_MENU_EXPANSION_ACCESSED_AT }
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
  ...sonicFoods,
  ...braumsFoods,
  ...tacoBellFoods,
  ...chickFilAFoods,
  ...whataburgerFoods,
];

export default restaurantFoods;
