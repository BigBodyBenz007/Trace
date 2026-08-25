import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(here, "../src/data");
const outputPath = path.join(outputDirectory, "groceryFoods.v1.js");

const serving = (amount, unit, description, grams) => ({ amount, unit, description, grams });

// IDs are intentionally reviewed one-by-one. Updating a dataset does not silently
// change which USDA food Trace ships; maintainers must explicitly revise this list.
const coreSelections = [
  { fdcId: 2646170, name: "Chicken breast, boneless, skinless, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), dedupeKey: "generic:chicken-breast-raw", searchAliases: ["raw chicken breast strips", "chicken strips raw", "raw chicken tenders", "raw chicken tenderloins", "boneless skinless chicken breast"] },
  { fdcId: 171477, name: "Chicken breast, cooked, roasted", category: "protein", preparationState: "cooked", serving: serving(3, "oz", "3 oz cooked (85 g)", 85), dedupeKey: "generic:chicken-breast-cooked", searchAliases: ["cooked chicken breast", "roasted chicken breast", "cooked chicken strips"] },
  { fdcId: 2646171, name: "Chicken thigh, boneless, skinless, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["raw chicken thighs", "boneless skinless chicken thigh"] },
  { fdcId: 2514743, name: "Ground beef, 90% lean, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["ground beef", "90 10 ground beef", "lean hamburger meat raw"] },
  { fdcId: 2514744, name: "Ground beef, 80% lean, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["ground beef", "80 20 ground beef", "hamburger meat raw"] },
  { fdcId: 2727574, name: "Beef top sirloin steak, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["sirloin steak", "beef steak raw"] },
  { fdcId: 2646174, name: "Beef chuck roast, boneless, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["chuck roast", "pot roast beef raw"] },
  { fdcId: 2514747, name: "Ground turkey, 93% lean, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["ground turkey", "93 7 ground turkey", "lean ground turkey raw"] },
  { fdcId: 2646168, name: "Pork loin chop, boneless, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["boneless pork chop", "pork loin raw"] },
  { fdcId: 2646169, name: "Pork tenderloin, boneless, raw", category: "protein", preparationState: "raw", serving: serving(4, "oz", "4 oz raw (113 g)", 113.4), searchAliases: ["pork loin tenderloin", "lean pork raw"] },
  { fdcId: 175167, name: "Salmon, Atlantic, farmed, raw", category: "seafood", preparationState: "raw", serving: serving(3, "oz", "3 oz raw (85 g)", 85), searchAliases: ["salmon fillet", "atlantic salmon raw"] },
  { fdcId: 334194, name: "Tuna, light, canned in water, drained", category: "seafood", preparationState: "ready-to-eat", serving: serving(1, "can", "1 can drained (107 g)", 107), searchAliases: ["canned tuna", "tuna in water", "light tuna can"] },
  { fdcId: 171955, name: "Cod, Atlantic, raw", category: "seafood", preparationState: "raw", serving: serving(3, "oz", "3 oz raw (85 g)", 85), searchAliases: ["cod fillet", "white fish raw"] },
  { fdcId: 171287, name: "Egg, whole, raw", category: "eggs-dairy", preparationState: "raw", serving: serving(1, "item", "1 large raw egg (50 g)", 50), dedupeKey: "generic:egg-large", searchAliases: ["eggs", "large egg", "whole egg", "shell egg"] },
  { fdcId: 172183, name: "Egg white, raw", category: "eggs-dairy", preparationState: "raw", serving: serving(1, "item", "White from 1 large egg (33 g)", 33), searchAliases: ["egg whites", "liquid egg white"] },
  { fdcId: 168878, name: "White rice, long-grain, cooked", category: "grains-starches", preparationState: "cooked", serving: serving(1, "cup", "1 cup cooked (158 g)", 158), dedupeKey: "generic:white-rice-cooked", searchAliases: ["rice", "cooked white rice", "long grain rice"] },
  { fdcId: 169704, name: "Brown rice, long-grain, cooked", category: "grains-starches", preparationState: "cooked", serving: serving(1, "cup", "1 cup cooked (202 g)", 202), searchAliases: ["rice", "cooked brown rice", "whole grain rice"] },
  { fdcId: 173904, name: "Rolled oats, dry", category: "grains-starches", preparationState: "dry", serving: serving(0.5, "cup", "1/2 cup dry (41 g)", 40.5), searchAliases: ["old fashioned oats", "quick oats", "oatmeal dry"] },
  { fdcId: 168928, name: "Pasta, cooked, without salt", category: "grains-starches", preparationState: "cooked", serving: serving(1, "cup", "1 cup cooked spaghetti (151 g)", 151), searchAliases: ["cooked pasta", "spaghetti cooked", "noodles cooked"] },
  { fdcId: 170026, name: "Potato, flesh and skin, raw", category: "grains-starches", preparationState: "raw", serving: serving(1, "item", "1 medium raw potato (213 g)", 213), searchAliases: ["raw potato", "white potato raw"] },
  { fdcId: 170093, name: "Potato, baked, flesh and skin", category: "grains-starches", preparationState: "cooked", serving: serving(1, "item", "1 medium baked potato (173 g)", 173), searchAliases: ["baked potato", "cooked potato"] },
  { fdcId: 747447, name: "Broccoli, raw", category: "vegetables", preparationState: "raw", serving: serving(1, "cup", "1 cup chopped raw (76 g)", 76), dedupeKey: "generic:broccoli-raw", searchAliases: ["raw broccoli", "broccoli florets"] },
  { fdcId: 168462, name: "Spinach, raw", category: "vegetables", preparationState: "raw", serving: serving(1, "cup", "1 cup raw (30 g)", 30), searchAliases: ["raw spinach", "spinach leaves"] },
  { fdcId: 170393, name: "Carrots, raw", category: "vegetables", preparationState: "raw", serving: serving(1, "cup", "1 cup chopped raw (128 g)", 128), searchAliases: ["raw carrots", "carrot sticks"] },
  { fdcId: 2346400, name: "Green beans, raw", category: "vegetables", preparationState: "raw", serving: serving(100, "g", "100 g raw", 100), searchAliases: ["snap beans", "string beans", "raw green beans"] },
  { fdcId: 170457, name: "Tomato, red, ripe, raw", category: "vegetables", preparationState: "raw", serving: serving(1, "item", "1 medium raw tomato (123 g)", 123), searchAliases: ["raw tomato", "fresh tomato"] },
  { fdcId: 171688, name: "Apple, raw, with skin", category: "fruit", preparationState: "raw", serving: serving(1, "item", "1 medium apple (182 g)", 182), dedupeKey: "generic:apple-medium", searchAliases: ["fresh apple", "whole apple"] },
  { fdcId: 173944, name: "Banana, raw", category: "fruit", preparationState: "raw", serving: serving(1, "item", "1 medium banana (118 g)", 118), dedupeKey: "generic:banana-medium", searchAliases: ["fresh banana", "whole banana"] },
  { fdcId: 746771, name: "Orange, navel, raw", category: "fruit", preparationState: "raw", serving: serving(1, "item", "1 medium orange (140 g)", 140), searchAliases: ["fresh orange", "navel orange"] },
  { fdcId: 2346409, name: "Strawberries, raw", category: "fruit", preparationState: "raw", serving: serving(140, "g", "140 g raw", 140), searchAliases: ["fresh strawberries", "strawberry"] },
  { fdcId: 2346411, name: "Blueberries, raw", category: "fruit", preparationState: "raw", serving: serving(140, "g", "140 g raw", 140), searchAliases: ["fresh blueberries", "blueberry"] },
  { fdcId: 746782, name: "Whole milk, 3.25% milkfat", category: "eggs-dairy", preparationState: "ready-to-eat", serving: serving(1, "cup", "1 cup (249 g)", 249), dedupeKey: "generic:whole-milk", searchAliases: ["whole dairy milk", "vitamin d milk"] },
  { fdcId: 746778, name: "Reduced-fat milk, 2% milkfat", category: "eggs-dairy", preparationState: "ready-to-eat", serving: serving(1, "cup", "1 cup (245 g)", 245), searchAliases: ["2 percent milk", "two percent milk", "reduced fat dairy milk"] },
  { fdcId: 330137, name: "Greek yogurt, plain, nonfat", category: "eggs-dairy", preparationState: "ready-to-eat", serving: serving(1, "container", "1 container (156 g)", 156), searchAliases: ["plain greek yogurt", "0 percent greek yogurt", "non fat greek yogurt"] },
  { fdcId: 2259794, name: "Greek yogurt, plain, whole milk", category: "eggs-dairy", preparationState: "ready-to-eat", serving: serving(170, "g", "170 g", 170), dedupeKey: "generic:greek-yogurt-plain", searchAliases: ["plain greek yogurt", "full fat greek yogurt"] },
  { fdcId: 328841, name: "Cottage cheese, lowfat, 2% milkfat", category: "eggs-dairy", preparationState: "ready-to-eat", serving: serving(0.5, "cup", "1/2 cup (110 g)", 110), searchAliases: ["2 percent cottage cheese", "low fat cottage cheese"] },
  { fdcId: 171413, name: "Olive oil", category: "fats-oils", preparationState: "ready-to-use", serving: serving(1, "tbsp", "1 tablespoon (13.5 g)", 13.5), searchAliases: ["cooking oil", "salad oil"] },
  { fdcId: 172336, name: "Canola oil", category: "fats-oils", preparationState: "ready-to-use", serving: serving(1, "tbsp", "1 tablespoon (14 g)", 14), searchAliases: ["rapeseed oil", "cooking oil"] },
  { fdcId: 173410, name: "Butter, salted", category: "fats-oils", preparationState: "ready-to-use", serving: serving(1, "tbsp", "1 tablespoon (14.2 g)", 14.2), searchAliases: ["salted butter", "dairy butter"] },
  { fdcId: 746784, name: "Granulated sugar", category: "pantry", preparationState: "ready-to-use", serving: serving(1, "tsp", "1 teaspoon (4 g)", 4), searchAliases: ["white sugar", "table sugar"] },
  { fdcId: 168936, name: "All-purpose flour, enriched, unbleached", category: "pantry", preparationState: "dry", serving: serving(1, "cup", "1 cup (125 g)", 125), searchAliases: ["white flour", "wheat flour", "all purpose flour"] },
  { fdcId: 174266, name: "Peanut butter, smooth, salted", category: "pantry", preparationState: "ready-to-eat", serving: serving(2, "tbsp", "2 tablespoons (32 g)", 32), dedupeKey: "generic:peanut-butter", searchAliases: ["smooth peanut butter", "creamy peanut butter"] },
  { fdcId: 746775, name: "Table salt, iodized", category: "pantry", preparationState: "ready-to-use", serving: serving(1, "tsp", "1 teaspoon (6.1 g)", 6.1), searchAliases: ["iodized salt", "cooking salt"] },
];

const categoryPlans = Object.freeze({
  protein: {
    target: 85,
    usdaCategories: ["Beef Products", "Pork Products", "Poultry Products", "Sausages and Luncheon Meats"],
    exclude: /mechanically separated|with gravy|baby food|luncheon loaf|headcheese|scrapple|liver sausage|blood sausage|poultry food products|restaurant/i,
    rules: [
      [/^Chicken,.*breast/i, 5],
      [/^Chicken,.*tender/i, 2],
      [/^Chicken,.*\bthigh\b/i, 3],
      [/^Chicken,.*\bdrumstick\b/i, 3],
      [/^Chicken,.*\bwing\b/i, 3],
      [/^Chicken, ground|^Ground chicken/i, 2],
      [/^Turkey,.*breast/i, 5],
      [/^Turkey, ground|^Ground turkey/i, 5],
      [/turkey.*sausage|sausage.*turkey/i, 2],
      [/^(Beef, ground|Ground beef)/i, 9],
      [/^Beef,.*steak/i, 9],
      [/^Beef,.*roast/i, 4],
      [/^Beef,.*brisket/i, 3],
      [/^Beef,.*liver/i, 2],
      [/^Pork,.*chop/i, 4],
      [/^Pork,.*(loin|tenderloin)/i, 5],
      [/^Pork,.*belly|^Pork,.*bacon|^Bacon/i, 3],
      [/\bham\b/i, 2],
      [/^Pork,.*bacon|^Bacon/i, 2],
      [/\bsausage\b/i, 2],
      [/^Pork,.*(shoulder|ham)|^Chicken,.*(breast|\bthigh\b|\bdrumstick\b|\bwing\b)|^Turkey,.*(breast|ground)/i, 4],
    ],
  },
  seafood: {
    target: 50,
    usdaCategories: ["Finfish and Shellfish Products"],
    exclude: /fish sticks|fish sandwich|imitation|gefilte|caviar|roe|whale|seal|frog legs|tuna salad/i,
    rules: [
      [/salmon/i, 7],
      [/tuna/i, 5],
      [/(cod|tilapia|haddock|pollock|halibut)/i, 10],
      [/(shrimp|scallop)/i, 8],
      [/(catfish|trout|sardine|anchov|mackerel|mahi|snapper|sea bass|swordfish)/i, 10],
      [/(crab|lobster|clam|oyster|mussel|squid)/i, 7],
    ],
  },
  "eggs-dairy": {
    target: 55,
    usdaCategories: ["Dairy and Egg Products"],
    exclude: /dessert topping|cheese sauce|ice cream|sherbet|milk shake|egg substitute.*powder/i,
    rules: [
      [/^Egg,/i, 8],
      [/^Milk,/i, 8],
      [/Yogurt/i, 9],
      [/cottage/i, 3],
      [/cream cheese/i, 3],
      [/(cheddar|mozzarella|parmesan)/i, 8],
      [/^Cheese,/i, 10],
    ],
  },
  fruit: {
    target: 55,
    usdaCategories: ["Fruits and Fruit Juices"],
    exclude: /fruit punch|fruit cocktail.*heavy syrup|maraschino|candied|juice drink|baby food|rind only/i,
    rules: [
      [/(apple|banana).*(frozen|canned)|(frozen|canned).*(apple|banana)/i, 2],
      [/(apple|banana)/i, 6],
      [/(blueberr|blackberr|raspberr|strawberr|cranberr).*(frozen|canned)|(frozen|canned).*(blueberr|blackberr|raspberr|strawberr|cranberr)/i, 4],
      [/(blueberr|blackberr|raspberr|strawberr|cranberr)/i, 6],
      [/(orange|grapefruit|mandarin|tangerine|lemon|lime)/i, 8],
      [/(grape|raisin)/i, 5],
      [/(watermelon|cantaloupe|honeydew)/i, 5],
      [/pineapple.*(frozen|canned)|(frozen|canned).*pineapple/i, 2],
      [/pineapple/i, 3],
      [/(peach|pear|plum|cherr|mango|kiwi|avocado|apricot)/i, 10],
    ],
  },
  vegetables: {
    target: 75,
    usdaCategories: ["Vegetables and Vegetable Products"],
    exclude: /baby food|potato salad|coleslaw|souffle|pudding|vegetable juice cocktail|seaweed|fungus|drumstick leaves|potato flour|flour, potato|potato pancakes|potatoes, raw, skin|sweet potato leaves|yambean|mountain yam/i,
    rules: [
      [/(broccoli|green bean|snap bean|corn|peas|spinach).*(frozen)|frozen.*(broccoli|green bean|snap bean|corn|peas|spinach)/i, 6],
      [/(canned)/i, 6],
      [/(potato|sweetpotato|sweet potato|yam)/i, 9],
      [/(spinach|lettuce|kale|collard|arugula)/i, 8],
      [/(broccoli|cauliflower|brussels sprout|cabbage)/i, 7],
      [/(green bean|snap bean|peas|corn, sweet)/i, 8],
      [/(carrot|beet|turnip|parsnip)/i, 6],
      [/(onion|shallot|leek|pepper)/i, 7],
      [/(tomato|tomatillo)/i, 7],
      [/(asparagus|zucchini|squash|cucumber|eggplant|mushroom)/i, 6],
    ],
  },
  "grains-starches": {
    target: 75,
    usdaCategories: ["Cereal Grains and Pasta", "Baked Products", "Breakfast Cereals", "Legumes and Legume Products"],
    exclude: /baby food|cake|cookie|pie|pastry|doughnut|sweet roll|cracker|snack|restaurant|with meat|with frankfurter|with bacon|ANCIENT HARVEST|WHEATENA|ALPEN|FAMILIA|QUAKER|0% moisture/i,
    rules: [
      [/(beans|chickpeas|lentils).*(canned)|(canned).*(beans|chickpeas|lentils)/i, 3],
      [/(rice|wild rice)/i, 8],
      [/(oat|oatmeal)/i, 5],
      [/quinoa/i, 3],
      [/(pasta|spaghetti|macaroni|noodle|couscous)/i, 10],
      [/(bread|roll|bagel|english muffin)/i, 14],
      [/(tortilla|taco shell)/i, 6],
      [/^Cereals( ready-to-eat, granola, homemade|, (farina|oat bran|wheat germ|rice))/i, 4],
      [/(flour|bread crumbs|breadcrumbs)/i, 5],
      [/(beans|chickpeas|lentils)/i, 11],
    ],
  },
  "fats-oils": {
    target: 20,
    usdaCategories: ["Fats and Oils"],
    exclude: /salad dressing|shortening, industrial|animal fat|lard|nutmeg|ucuhuba|cocoa butter|lecithin|palm kernel/i,
    rules: [
      [/(olive|canola|vegetable|avocado|coconut|sunflower|safflower|corn|soybean|peanut|sesame).*oil|oil, (olive|canola|vegetable|avocado|coconut|sunflower|safflower|corn|soybean|peanut|sesame)/i, 12],
      [/(butter|margarine|ghee)/i, 6],
    ],
  },
  pantry: {
    target: 45,
    usdaCategories: ["Soups, Sauces, and Gravies", "Nut and Seed Products", "Spices and Herbs", "Sweets", "Beverages"],
    exclude: /baby food|alcoholic|liqueur|whiskey|wine|beer|cocktail|carbonated|candies|candy|frosting|dessert|chocolate bar|KRAFT|OPEN PIT|BULL'S-EYE|SWEET BABY|TOSTITOS|SWANSON|REESE'S|KC MASTERPIECE/i,
    rules: [
      [/(ketchup|mayonnaise|soy sauce)/i, 3],
      [/(barbecue|hot sauce|teriyaki)/i, 3],
      [/(tomato sauce|pasta sauce|marinara|pesto)/i, 2],
      [/(salsa|mustard)/i, 2],
      [/(broth|stock|bouillon)/i, 7],
      [/(peanut butter|almond butter|seed butter|tahini)/i, 5],
      [/(almonds|walnuts|pecans|cashews|pistachios|peanuts|sunflower seed|pumpkin seed)/i, 6],
      [/(sugar|honey|maple syrup|molasses)/i, 4],
      [/(\bpepper\b|garlic powder|onion powder|paprika)/i, 3],
      [/(cinnamon|cumin|oregano|basil)/i, 2],
      [/(soup|gravy)/i, 4],
      [/(vinegar|relish|pickle)/i, 4],
    ],
  },
});

const nutrientIds = {
  calories: [1008, 2047],
  protein: [1003],
  carbohydrates: [1005],
  fat: [1004],
  fiber: [1079],
  sodium: [1093],
};

function nutrientAmount(food, ids) {
  for (const id of ids) {
    const nutrient = food.foodNutrients.find((candidate) => candidate.nutrient?.id === id);
    if (nutrient?.amount === 0) return 0;
    if (Number.isFinite(nutrient?.amount) && nutrient.amount >= 0) return nutrient.amount;
  }
  return null;
}

function normalizeDescription(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function friendlyName(description) {
  const name = normalizeDescription(description)
    .replace(/^Fish,\s*/i, "")
    .replace(/^Crustaceans,\s*/i, "")
    .replace(/^Mollusks,\s*/i, "")
    .replace(/^Chicken, broilers? or fryers?,\s*/i, "Chicken, ")
    .replace(/^Beef, ground,\s*/i, "Ground beef, ")
    .replace(/^Turkey, ground,\s*/i, "Ground turkey, ")
    .replace(/^Chicken, ground,\s*/i, "Ground chicken, ")
    .replace(/^Yogurt, Greek,\s*/i, "Greek yogurt, ")
    .replace(/^Egg, white,\s*/i, "Egg white, ")
    .replace(/^Egg, yolk,\s*/i, "Egg yolk, ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function inferPreparationState(description) {
  const normalized = normalizeDescription(description).toLowerCase();
  const frozen = /\bfrozen\b/.test(normalized);
  const canned = /\bcanned\b/.test(normalized);
  const cooked = /\b(cooked|boiled|roasted|grilled|braised|baked|fried|heated)\b/.test(normalized);
  if (frozen && cooked) return "frozen-cooked";
  if (frozen) return "frozen";
  if (canned) return "canned";
  if (/\braw\b/.test(normalized)) return "raw";
  if (cooked) return "cooked";
  if (/\b(dried|dry|dehydrated|powder)\b/.test(normalized)) return "dry";
  if (/^(oil|butter|margarine|ghee)\b/.test(normalized)) return "ready-to-use";
  return "ready-to-eat";
}

function generatedAliases(description) {
  const normalized = normalizeDescription(description).toLowerCase();
  const aliases = [];
  // Do not assign a bare ground-meat alias to every lean/fat variant. Reviewed
  // staple records carry those aliases so common choices rank before the long tail.
  if (/egg, white|egg white/.test(normalized)) aliases.push("egg whites");
  if (/egg, yolk|egg yolk/.test(normalized)) aliases.push("egg yolks");
  if (/yogurt, greek|greek yogurt/.test(normalized)) aliases.push("greek yogurt");
  if (/sweetpotato|sweet potato/.test(normalized)) aliases.push("sweet potato", "sweet potatoes", "yam");
  if (/chickpea|garbanzo/.test(normalized)) aliases.push("chickpeas", "garbanzo beans");
  if (/snap bean|green bean/.test(normalized)) aliases.push("green beans", "string beans");
  if (/corn, sweet/.test(normalized)) aliases.push("sweet corn");
  if (/confectioner|powdered sugar/.test(normalized)) aliases.push("powdered sugar");
  return [...new Set(aliases)];
}

function displayNumber(value) {
  if (value === 0.5) return "1/2";
  if (value === 0.25) return "1/4";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatGrams(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function selectServing(food, category, preparationState) {
  if (["protein", "seafood"].includes(category)) {
    const rawLike = category === "protein" && preparationState === "raw";
    const grams = rawLike ? 113.4 : 85;
    const amount = rawLike ? 4 : 3;
    const stateLabel = preparationState === "ready-to-eat" ? "" : ` ${preparationState.replace("-", " ")}`;
    return serving(amount, "oz", `${amount} oz${stateLabel} (${formatGrams(grams)} g)`, grams);
  }

  const normalizedName = normalizeDescription(food.description).toLowerCase();
  let unitPriority = ["cup", "container", "slice", "piece", "each", "fruit", "egg", "tablespoon", "teaspoon", "can", "tortilla", "patty", "link", "fillet", "wedge"];
  if (category === "fats-oils") unitPriority = ["tablespoon", "tbsp", "teaspoon", "tsp"];
  else if (category === "eggs-dairy" && /cheese/.test(normalizedName) && !/cottage/.test(normalizedName)) unitPriority = ["slice", "tablespoon", "teaspoon", "cup"];
  else if (category === "pantry" && /(sauce|mustard|mayonnaise|ketchup|pesto|butter|tahini|spice|salt|honey|syrup|molasses)/.test(normalizedName)) unitPriority = ["tablespoon", "tbsp", "teaspoon", "tsp", "cup"];
  const portionUnit = (portion) => {
    const measureUnit = portion.measureUnit?.name?.toLowerCase();
    if (measureUnit && measureUnit !== "undetermined") return measureUnit;
    const modifier = normalizeDescription(portion.modifier).toLowerCase();
    return modifier.match(/^(fl oz|cup|container|slice|piece|each|fruit|egg|tablespoon|tbsp|teaspoon|tsp|can|tortilla|patty|link|fillet|wedge|oz)\b/)?.[1] || "serving";
  };
  const portions = (food.foodPortions || []).filter((portion) => (
    Number.isFinite(portion.amount)
    && portion.amount > 0
    && Number.isFinite(portion.gramWeight)
    && portion.gramWeight > 0
    && portion.gramWeight <= 500
    && portion.measureUnit?.name
    && portion.measureUnit.name.toLowerCase() !== "racc"
  ));
  portions.sort((first, second) => {
    const firstRank = unitPriority.indexOf(portionUnit(first));
    const secondRank = unitPriority.indexOf(portionUnit(second));
    return (firstRank < 0 ? 99 : firstRank) - (secondRank < 0 ? 99 : secondRank)
      || Math.abs(first.amount - 1) - Math.abs(second.amount - 1)
      || first.gramWeight - second.gramWeight;
  });

  const selected = category === "fats-oils"
    ? portions.find((portion) => unitPriority.includes(portionUnit(portion)))
    : portions[0];
  if (selected) {
    const unitNames = { tablespoon: "tbsp", teaspoon: "tsp" };
    const inferredUnit = portionUnit(selected);
    const unit = unitNames[inferredUnit] || inferredUnit;
    const rawModifier = normalizeDescription(selected.modifier);
    const modifier = (selected.measureUnit.name.toLowerCase() === "undetermined"
      ? rawModifier.replace(new RegExp(`^${inferredUnit.replace(" ", "\\s+")}\\b`, "i"), "").trim()
      : rawModifier).replace(/^[,\s]+/, "");
    return serving(
      selected.amount,
      unit,
      `${displayNumber(selected.amount)} ${unit}${modifier ? ` ${modifier}` : ""} (${formatGrams(selected.gramWeight)} g)`,
      selected.gramWeight
    );
  }

  if (/cheese/i.test(food.description)) return serving(1, "oz", "1 oz (28 g)", 28);
  if (category === "fats-oils") return serving(1, "tbsp", "1 tbsp (14 g)", 14);
  return serving(100, "g", "100 g", 100);
}

function candidateOrder(first, second) {
  const firstSource = first.dataType === "Foundation" ? 0 : 1;
  const secondSource = second.dataType === "Foundation" ? 0 : 1;
  return firstSource - secondSource
    || normalizeDescription(first.description).length - normalizeDescription(second.description).length
    || first.fdcId - second.fdcId;
}

function renderCategoryModule(records) {
  return `// Generated by scripts/import-usda-grocery-catalog.mjs.\n// USDA FoodData Central data are public domain (CC0). Do not edit by hand.\n\nconst groceryFoodSeeds = Object.freeze(${JSON.stringify(records, null, 2)});\n\nexport default groceryFoodSeeds;\n`;
}

function renderIndexModule(categories) {
  const imports = categories.map((category) => {
    const variable = category.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return `import ${variable} from "./groceryFoods.v1.${category}";`;
  }).join("\n");
  const variables = categories.map((category) => category.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()));
  return `// Generated by scripts/import-usda-grocery-catalog.mjs.\n// USDA FoodData Central data are public domain (CC0). Do not edit by hand.\n\n${imports}\n\nexport const GROCERY_CATALOG_VERSION = 1;\nexport const USDA_GROCERY_CATALOG_RELEASE = "foundation-2026-04_sr-legacy-2018-04";\n\nconst groceryFoodSeedsV1 = Object.freeze([\n  ${variables.map((variable) => `...${variable}`).join(",\n  ")},\n]);\n\nexport default groceryFoodSeedsV1;\n`;
}

const datasetPaths = process.argv.slice(2);
if (datasetPaths.length === 0) {
  throw new Error("Usage: node scripts/import-usda-grocery-catalog.mjs <USDA JSON download> [more JSON downloads]");
}

const foodsById = new Map();
const allFoods = [];
for (const datasetPath of datasetPaths) {
  const data = JSON.parse(await readFile(datasetPath, "utf8"));
  const foods = data[Object.keys(data)[0]];
  foods.filter(Boolean).forEach((food) => {
    foodsById.set(food.fdcId, food);
    allFoods.push(food);
  });
}

const selections = [...coreSelections];
const selectedIds = new Set(selections.map(({ fdcId }) => fdcId));
const selectedDescriptions = new Set(selections.map(({ fdcId }) => (
  normalizeDescription(foodsById.get(fdcId)?.description).toLowerCase()
)));
const selectedNames = new Set(selections.map(({ name }) => normalizeDescription(name).toLowerCase()));

for (const [category, plan] of Object.entries(categoryPlans)) {
  let categoryCount = selections.filter((selection) => selection.category === category).length;
  for (const [pattern, limit] of plan.rules) {
    if (categoryCount >= plan.target) break;
    const candidates = allFoods.filter((food) => (
      !selectedIds.has(food.fdcId)
      && plan.usdaCategories.includes(food.foodCategory?.description)
      && pattern.test(food.description)
      && !plan.exclude.test(food.description)
      && !selectedDescriptions.has(normalizeDescription(food.description).toLowerCase())
      && !selectedNames.has(friendlyName(food.description).toLowerCase())
    )).sort(candidateOrder);
    let ruleCount = 0;
    for (const food of candidates) {
      if (categoryCount >= plan.target || ruleCount >= limit) break;
      const name = friendlyName(food.description);
      if (selectedNames.has(name.toLowerCase())) continue;
      const preparationState = inferPreparationState(food.description);
      selections.push({
        fdcId: food.fdcId,
        name,
        category,
        preparationState,
        serving: selectServing(food, category, preparationState),
        searchAliases: generatedAliases(food.description),
      });
      selectedIds.add(food.fdcId);
      selectedDescriptions.add(normalizeDescription(food.description).toLowerCase());
      selectedNames.add(name.toLowerCase());
      categoryCount += 1;
      ruleCount += 1;
    }
  }
  if (categoryCount !== plan.target) {
    throw new Error(`Selected ${categoryCount} ${category} foods; expected ${plan.target}. Revise the reviewed selection rules.`);
  }
}

const records = selections.map((selection) => {
  const food = foodsById.get(selection.fdcId);
  if (!food) throw new Error(`USDA FDC ${selection.fdcId} was not found in the supplied downloads.`);
  return {
    ...selection,
    sourceDescription: food.description,
    sourceDataType: food.dataType,
    sourceRelease: food.dataType === "Foundation" ? "2026-04" : "2018-04",
    nutrientsPer100g: Object.fromEntries(
      Object.entries(nutrientIds).map(([name, ids]) => [name, nutrientAmount(food, ids)])
    ),
  };
});

const categories = Object.keys(categoryPlans);
for (const category of categories) {
  const categoryRecords = records.filter((record) => record.category === category);
  const categoryPath = path.join(outputDirectory, `groceryFoods.v1.${category}.js`);
  await writeFile(categoryPath, renderCategoryModule(categoryRecords), "utf8");
  process.stdout.write(`Wrote ${categoryRecords.length} ${category} foods to ${categoryPath}\n`);
}
await writeFile(outputPath, renderIndexModule(categories), "utf8");
process.stdout.write(`Wrote ${records.length} USDA grocery foods across ${categories.length} versioned modules.\n`);
