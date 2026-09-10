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
