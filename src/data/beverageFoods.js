const SOURCE_CHECKED_AT = "2026-08-26";

const nutrition = (
  calories,
  protein,
  carbohydrates,
  fat,
  sodium,
  totalSugar,
  addedSugar
) => ({ calories, protein, carbohydrates, fat, sodium, totalSugar, addedSugar });

function officialBeverage({
  id,
  brand,
  name,
  category,
  packageSize,
  nutrients,
  caffeineMg = null,
  sourceUrl,
  sourceReference,
  aliases = [],
}) {
  return {
    id: `beverage:${id}`,
    brand,
    name,
    category,
    serving: { amount: 1, unit: "item", description: packageSize },
    nutrients,
    beverage: { packageSize, caffeineMg },
    searchAliases: aliases,
    provenance: {
      source: "official-manufacturer",
      sourceId: `beverage:${id}`,
      confidence: "official-source",
      verification: {
        sourceType: "official-manufacturer",
        sourceUrl,
        sourceReference,
        accessedAt: SOURCE_CHECKED_AT,
      },
    },
  };
}

const pepsico = (id, brand, name, category, packageSize, values, caffeineMg, gtin, aliases) => officialBeverage({
  id,
  brand,
  name,
  category,
  packageSize,
  nutrients: nutrition(...values),
  caffeineMg,
  aliases,
  sourceUrl: `https://www.pepsicoproductfacts.com/Home/Product?gtin=${gtin}`,
  sourceReference: `PepsiCo Product Facts FDA label, GTIN ${gtin}; label current on access date`,
});

const pepsicoFoods = [
  pepsico("pepsi:pepsi-20oz", "Pepsi", "Pepsi", "soda", "20 fl oz bottle", [250, 0, 69, 0, 55, 69, 69], 63, "00012000001291", ["pepsi cola"]),
  pepsico("pepsi:diet-pepsi-20oz", "Pepsi", "Diet Pepsi", "soda", "20 fl oz bottle", [0, 0, 0, 0, 60, 0, 0], 59, "00012000171741"),
  pepsico("pepsi:zero-sugar-20oz", "Pepsi", "Pepsi Zero Sugar", "soda", "20 fl oz bottle", [0, 0, 0, 0, 65, 0, 0], 63, "00012000018800", ["pepsi zero"]),
  pepsico("pepsi:wild-cherry-20oz", "Pepsi", "Pepsi Wild Cherry", "soda", "20 fl oz bottle", [260, 0, 70, 0, 55, 70, 70], 63, "00012000005596"),
  pepsico("mountain-dew:original-20oz", "Mountain Dew", "Mountain Dew", "soda", "20 fl oz bottle", [290, 0, 77, 0, 105, 77, 77], 91, "00012000001314", ["mtn dew"]),
  pepsico("mountain-dew:diet-20oz", "Mountain Dew", "Diet Mountain Dew", "soda", "20 fl oz bottle", [10, 0, null, 0, 85, null, null], 91, "00012000001345", ["diet mtn dew"]),
  pepsico("mountain-dew:zero-sugar-20oz", "Mountain Dew", "Mountain Dew Zero Sugar", "soda", "20 fl oz bottle", [0, 0, 0, 0, 70, 0, 0], 113, "00012000191435", ["mtn dew zero"]),
  pepsico("mountain-dew:baja-blast-20oz", "Mountain Dew", "Baja Blast", "soda", "20 fl oz bottle", [280, 0, 74, 0, 95, 73, 73], 98, "00012000130274", ["mountain dew baja blast"]),
  pepsico("mountain-dew:baja-blast-zero-20oz", "Mountain Dew", "Baja Blast Zero Sugar", "soda", "20 fl oz bottle", [5, 0, 0, 0, 80, 0, 0], 113, "00012000183386", ["mountain dew baja blast zero"]),
  pepsico("mug:root-beer-20oz", "Mug", "Mug Root Beer", "soda", "20 fl oz bottle", [260, 0, 72, 0, 105, 71, 71], 0, "00012000009105"),
  pepsico("mug:root-beer-zero-20oz", "Mug", "Mug Root Beer Zero Sugar", "soda", "20 fl oz bottle", [0, 0, 0, 0, 115, 0, 0], 0, "00012000001406", ["diet mug"]),
  pepsico("starry:original-20oz", "Starry", "Starry", "soda", "20 fl oz bottle", [240, 0, 65, 0, 55, 65, 65], 0, "00012000221514"),
  pepsico("starry:zero-sugar-20oz", "Starry", "Starry Zero Sugar", "soda", "20 fl oz bottle", [10, 0, 0, 0, 60, 0, 0], 0, "00012000221521"),

  pepsico("gatorade:cool-blue-20oz", "Gatorade", "Cool Blue", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000324815", ["gatorade cool blue"]),
  pepsico("gatorade:fruit-punch-20oz", "Gatorade", "Fruit Punch", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000328660", ["gatorade fruit punch"]),
  pepsico("gatorade:lemon-lime-20oz", "Gatorade", "Lemon Lime", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000328684", ["gatorade lemon lime"]),
  pepsico("gatorade:orange-20oz", "Gatorade", "Orange", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000328677", ["gatorade orange"]),
  pepsico("gatorade:glacier-cherry-20oz", "Gatorade", "Frost Glacier Cherry", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000102475", ["gatorade glacier cherry"]),
  pepsico("gatorade:glacier-freeze-20oz", "Gatorade", "Frost Glacier Freeze", "sports-hydration", "20 fl oz bottle", [140, 0, 36, 0, 270, 34, 34], 0, "00052000324860", ["gatorade glacier freeze"]),
  pepsico("gatorade:zero-cool-blue-20oz", "Gatorade", "Zero Cool Blue", "sports-hydration", "20 fl oz bottle", [10, 0, 1, 0, 260, 0, 0], 0, "00052000047066", ["gatorade zero cool blue"]),
  pepsico("gatorade:zero-fruit-punch-20oz", "Gatorade", "Zero Fruit Punch", "sports-hydration", "20 fl oz bottle", [5, 0, 2, 0, 270, 0, 0], 0, "00052000044263", ["gatorade zero fruit punch"]),
  pepsico("gatorade:zero-glacier-freeze-20oz", "Gatorade", "Zero Glacier Freeze", "sports-hydration", "20 fl oz bottle", [5, 0, 2, 0, 270, 0, 0], 0, "00052000043549", ["gatorade zero glacier freeze"]),
  pepsico("gatorade:zero-lemon-lime-20oz", "Gatorade", "Zero Lemon Lime", "sports-hydration", "20 fl oz bottle", [5, 0, 2, 0, 270, 0, 0], 0, "00052000042122", ["gatorade zero lemon lime"]),
  pepsico("gatorlyte:mixed-berry-20oz", "Gatorlyte", "Mixed Berry", "sports-hydration", "20 fl oz bottle", [50, 0, 14, 0, 490, 12, 12], 0, "00052000050820"),
  pepsico("gatorlyte:orange-20oz", "Gatorlyte", "Orange", "sports-hydration", "20 fl oz bottle", [50, 0, 14, 0, 490, 12, 12], 0, "00052000047905"),
  pepsico("gatorlyte:strawberry-kiwi-20oz", "Gatorlyte", "Strawberry Kiwi", "sports-hydration", "20 fl oz bottle", [50, 0, 14, 0, 490, 12, 12], 0, "00052000047912"),
  pepsico("propel:berry-20oz", "Propel", "Berry", "sports-hydration", "20 fl oz bottle", [0, 0, 0, 0, 270, 0, 0], 0, "00052000707779", ["propel water berry"]),
  pepsico("propel:grape-20oz", "Propel", "Grape", "sports-hydration", "20 fl oz bottle", [0, 0, 0, 0, 270, 0, 0], 0, "00052000707793", ["propel water grape"]),
  pepsico("propel:kiwi-strawberry-20oz", "Propel", "Kiwi Strawberry", "sports-hydration", "20 fl oz bottle", [0, 0, 0, 0, 270, 0, 0], 0, "00052000707786", ["propel water kiwi strawberry"]),
  pepsico("propel:watermelon-20oz", "Propel", "Watermelon", "sports-hydration", "20 fl oz bottle", [0, 0, 0, 0, 270, 0, 0], 0, "00052000013580", ["propel water watermelon"]),

  pepsico("pure-leaf:sweet-tea-18-5oz", "Pure Leaf", "Sweet Tea", "tea", "18.5 fl oz bottle", [160, 0, 42, 0, 0, 42, 42], 54, "00012000286193", ["pure leaf sweet tea"]),
  pepsico("pure-leaf:unsweetened-black-18-5oz", "Pure Leaf", "Unsweetened Black Tea", "tea", "18.5 fl oz bottle", [0, 0, 0, 0, 0, 0, 0], 54, "00012000286209", ["pure leaf unsweet tea"]),
  pepsico("pure-leaf:lemon-18-5oz", "Pure Leaf", "Lemon Tea", "tea", "18.5 fl oz bottle", [150, 0, 38, 0, 5, 38, 38], 52, "00012000286186", ["pure leaf lemon"]),
  pepsico("pure-leaf:peach-18-5oz", "Pure Leaf", "Peach Tea", "tea", "18.5 fl oz bottle", [150, 0, 38, 0, 5, 38, 38], 54, "00012000286216", ["pure leaf peach"]),
  pepsico("pure-leaf:raspberry-18-5oz", "Pure Leaf", "Raspberry Tea", "tea", "18.5 fl oz bottle", [180, 0, 46, 0, 5, 46, 46], 38, "00012000286223", ["pure leaf raspberry"]),
  pepsico("pure-leaf:green-tea-18-5oz", "Pure Leaf", "Green Tea", "tea", "18.5 fl oz bottle", [100, 0, 27, 0, 0, 27, 27], 34, "00012000206498", ["pure leaf green tea"]),
  pepsico("pure-leaf:zero-lemon-18-5oz", "Pure Leaf", "Zero Sugar Lemon Tea", "tea", "18.5 fl oz bottle", [10, 0, 0, 0, 10, 0, 0], 46, "00012000286230", ["pure leaf zero lemon"]),
  pepsico("pure-leaf:zero-sweet-18-5oz", "Pure Leaf", "Zero Sugar Sweet Tea", "tea", "18.5 fl oz bottle", [0, 0, 0, 0, 5, 0, 0], 76, "00098000100356", ["pure leaf diet sweet tea"]),
  pepsico("brisk:half-and-half-12oz", "Brisk", "Half & Half Iced Tea + Lemonade", "tea", "12 fl oz can", [60, 0, 16, 0, 125, 16, 16], 7, "00012000567551", ["brisk arnold palmer"]),
  pepsico("brisk:lemon-20oz", "Brisk", "Lemon Iced Tea", "tea", "20 fl oz bottle", [110, 0, 29, 0, 190, 29, 29], 18, "00012000003691"),
  pepsico("brisk:raspberry-12oz", "Brisk", "Raspberry Iced Tea", "tea", "12 fl oz can", [70, 0, 17, 0, 85, 17, 17], 11, "00012000008603"),
  pepsico("brisk:sweet-tea-12oz", "Brisk", "Sweet Iced Tea", "tea", "12 fl oz can", [60, 0, 17, 0, 110, 17, 17], 11, "00012000032578"),

  pepsico("starbucks:frappuccino-caramel-13-7oz", "Starbucks", "Frappuccino Caramel", "ready-to-drink-coffee", "13.7 fl oz bottle", [300, 9, 54, 5, 150, 46, 32], 90, "00012000016721", ["starbucks caramel frappuccino"]),
  pepsico("starbucks:frappuccino-coffee-13-7oz", "Starbucks", "Frappuccino Coffee", "ready-to-drink-coffee", "13.7 fl oz bottle", [300, 9, 54, 4.5, 140, 47, 34], 110, "00012000001802", ["starbucks bottled frappuccino"]),
  pepsico("starbucks:frappuccino-mocha-13-7oz", "Starbucks", "Frappuccino Mocha", "ready-to-drink-coffee", "13.7 fl oz bottle", [270, 10, 48, 4.5, 140, 46, 32], 105, "00012000004520", ["starbucks mocha frappuccino"]),
  pepsico("starbucks:frappuccino-vanilla-13-7oz", "Starbucks", "Frappuccino Vanilla", "ready-to-drink-coffee", "13.7 fl oz bottle", [290, 9, 53, 5, 290, 46, 32], 60, "00012000813313", ["starbucks vanilla frappuccino"]),
  pepsico("starbucks:cold-brew-chocolate-cream-11oz", "Starbucks", "Cold Brew Chocolate Cream", "ready-to-drink-coffee", "11 fl oz can", [130, 4, 22, 3, 90, 20, 15], 165, "00098100100324"),
  pepsico("starbucks:cold-brew-vanilla-sweet-cream-11oz", "Starbucks", "Cold Brew Vanilla Sweet Cream", "ready-to-drink-coffee", "11 fl oz can", [120, 4, 19, 2.5, 45, 17, 13], 165, "00098100100300"),
  pepsico("starbucks:doubleshot-coffee-15oz", "Starbucks", "Doubleshot Energy Coffee", "ready-to-drink-coffee", "15 fl oz can", [220, 10, 35, 3, 180, 29, 12], 135, "00012000028472"),
  pepsico("starbucks:doubleshot-mocha-15oz", "Starbucks", "Doubleshot Energy Mocha", "ready-to-drink-coffee", "15 fl oz can", [210, 10, 35, 3, 170, 29, 12], 135, "00012000028458"),
  pepsico("starbucks:tripleshot-caffe-mocha-15oz", "Starbucks", "Tripleshot Energy Caffè Mocha", "ready-to-drink-coffee", "15 fl oz can", [210, 10, 36, 3, 240, 30, 12], 225, "00012000181290"),
  pepsico("starbucks:tripleshot-caramel-15oz", "Starbucks", "Tripleshot Energy Caramel", "ready-to-drink-coffee", "15 fl oz can", [210, 10, 36, 3, 200, 29, 12], 225, "00012000181337"),
  pepsico("starbucks:iced-energy-blueberry-lemonade-12oz", "Starbucks", "Iced Energy Blueberry Lemonade", "energy", "12 fl oz can", [5, 0, 0, 0, 35, 0, 0], 160, "00098100101031"),
  pepsico("starbucks:iced-energy-tropical-peach-12oz", "Starbucks", "Iced Energy Tropical Peach", "energy", "12 fl oz can", [5, 0, 0, 0, 35, 0, 0], 160, "00098100100997"),
];

const cocaColaFoods = [
  officialBeverage({ id: "coca-cola:original-20oz", brand: "Coca-Cola", name: "Coca-Cola Original", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(240, 0, 65, 0, 75, 65, 65), caffeineMg: null, aliases: ["coke"], sourceUrl: "https://www.coca-cola.com/us/en/brands/coca-cola/products/original", sourceReference: "Coca-Cola US official Nutrition Facts for the 20 fl oz bottle; caffeine is null because the page publishes it for a different package size" }),
  officialBeverage({ id: "coca-cola:zero-sugar-12oz", brand: "Coca-Cola", name: "Coca-Cola Zero Sugar", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(0, 0, 0, 0, 40, 0, 0), caffeineMg: 34, aliases: ["coke zero"], sourceUrl: "https://www.coca-cola.com/us/en/brands/coca-cola/products/zero", sourceReference: "Coca-Cola US nutrition facts and caffeine FAQ for the 12 fl oz can" }),
  officialBeverage({ id: "diet-coke:original-12oz", brand: "Diet Coke", name: "Diet Coke", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(0, 0, 0, 0, 40, 0, 0), caffeineMg: 46, sourceUrl: "https://www.coca-cola.com/us/en/brands/diet-coke/products", sourceReference: "Diet Coke US official product nutrition facts for the 12 fl oz can" }),
  officialBeverage({ id: "sprite:original-12oz", brand: "Sprite", name: "Sprite", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(140, 0, 38, 0, 65, 38, 38), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/sprite/products", sourceReference: "Sprite US official product nutrition facts; explicitly caffeine-free" }),
  officialBeverage({ id: "sprite:zero-sugar-12oz", brand: "Sprite", name: "Sprite Zero Sugar", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(0, 0, 0, 0, 35, 0, 0), caffeineMg: 0, aliases: ["diet sprite"], sourceUrl: "https://www.coca-cola.com/us/en/brands/sprite/products", sourceReference: "Sprite US official product nutrition facts; explicitly caffeine-free" }),
  officialBeverage({ id: "sprite:chill-12oz", brand: "Sprite", name: "Sprite Chill", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(140, 0, 38, 0, 55, 38, 38), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/sprite/products", sourceReference: "Sprite US official product nutrition facts" }),
  officialBeverage({ id: "sprite:tropical-mix-20oz", brand: "Sprite", name: "Sprite Tropical Mix", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(240, 0, 63, 0, 110, 63, 63), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/sprite/products", sourceReference: "Sprite US official product nutrition facts" }),
  officialBeverage({ id: "fanta:orange-20oz", brand: "Fanta", name: "Fanta Orange", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(270, 0, 74, 0, 80, 73, 73), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts" }),
  officialBeverage({ id: "fanta:orange-zero-20oz", brand: "Fanta", name: "Fanta Zero Sugar Orange", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(0, 0, 1, 0, 60, 0, 0), caffeineMg: 0, aliases: ["diet fanta orange"], sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts; explicitly caffeine-free" }),
  officialBeverage({ id: "fanta:strawberry-20oz", brand: "Fanta", name: "Fanta Strawberry", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(270, 0, 75, 0, 80, 74, 74), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts" }),
  officialBeverage({ id: "fanta:grape-20oz", brand: "Fanta", name: "Fanta Grape", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(280, 0, 74, 0, 65, 73, 73), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts; explicitly caffeine-free" }),
  officialBeverage({ id: "fanta:peach-20oz", brand: "Fanta", name: "Fanta Peach", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(250, 0, 68, 0, 80, 67, 67), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts" }),
  officialBeverage({ id: "fanta:pineapple-20oz", brand: "Fanta", name: "Fanta Pineapple", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(300, 0, 81, 0, 90, 80, 80), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/fanta/products", sourceReference: "Fanta US official product nutrition facts" }),
];

const additionalSodaFoods = [
  officialBeverage({ id: "dr-pepper:original-12oz", brand: "Dr Pepper", name: "Dr Pepper", category: "soda", packageSize: "12 fl oz can", nutrients: nutrition(150, 0, 40, 0, 55, 39, null), caffeineMg: null, sourceUrl: "https://www.kdpproductfacts.com/product/a0e3h000003LJzZAAW/dr-pepper-12-fl-oz-us", sourceReference: "Keurig Dr Pepper official Product Facts for the 12 fl oz can; fields not exposed in the label table remain null" }),
  officialBeverage({ id: "a-and-w:root-beer-20oz", brand: "A&W", name: "A&W Root Beer", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(270, 0, 73, 0, 135, 72, 72), caffeineMg: null, aliases: ["aw root beer"], sourceUrl: "https://www.rootbeer.com/", sourceReference: "A&W official Nutrition Facts for the 20 fl oz bottle" }),
  officialBeverage({ id: "a-and-w:root-beer-zero-20oz", brand: "A&W", name: "A&W Root Beer Zero Sugar", category: "soda", packageSize: "20 fl oz bottle", nutrients: nutrition(0, 0, 0, 0, 115, 0, 0), caffeineMg: null, aliases: ["aw diet root beer"], sourceUrl: "https://www.rootbeer.com/", sourceReference: "A&W official Nutrition Facts for the 20 fl oz bottle" }),
];

const goldPeak = (id, name, values, caffeineMg, aliases) => officialBeverage({
  id: `gold-peak:${id}`,
  brand: "Gold Peak",
  name,
  category: "tea",
  packageSize: "18.5 fl oz bottle",
  nutrients: nutrition(...values),
  caffeineMg,
  aliases,
  sourceUrl: "https://www.coca-cola.com/us/en/brands/gold-peak-tea/gold-peak-products",
  sourceReference: "Gold Peak US official product nutrition facts for the 18.5 fl oz bottle",
});

const teaFoods = [
  goldPeak("sweet-tea", "Sweet Tea", [190, 0, 48, 0, 10, 48, 48], null, ["gold peak sweet tea"]),
  goldPeak("zero-sugar-sweet", "Zero Sugar Sweet Tea", [0, 0, 0, 0, 30, 0, 0], null, ["gold peak diet sweet tea"]),
  goldPeak("unsweetened", "Unsweetened Tea", [0, 0, 0, 0, 0, 0, 0], null, ["gold peak unsweet tea"]),
  goldPeak("green-tea", "Green Tea", [150, 0, 38, 0, 0, 38, 38], 25),
  goldPeak("extra-sweet", "Extra Sweet Tea", [270, 0, 68, 0, 10, 68, 68], 44),
  goldPeak("georgia-peach", "Georgia Peach Tea", [130, 0, 34, 0, 30, 33, 33], 30),
  goldPeak("lemon", "Lemon Tea", [130, 0, 34, 0, 30, 34, 34], 34),
  goldPeak("lemonade", "Lemonade Tea", [160, 0, 41, 0, 30, 40, 40], 34),
];

teaFoods.push(
  officialBeverage({ id: "arizona:green-tea-20oz", brand: "AriZona", name: "Green Tea with Ginseng and Honey", category: "tea", packageSize: "20 fl oz Tall Boy", nutrients: nutrition(170, 0, 43, 0, 0, 42, 42), caffeineMg: null, aliases: ["arizona green tea"], sourceUrl: "https://drinkarizona.com/products/green-tea-20oz-tallboy", sourceReference: "AriZona official whole-container Nutrition Facts for the 20 fl oz Tall Boy" }),
  officialBeverage({ id: "arizona:diet-green-tea-16-9oz", brand: "AriZona", name: "Diet Green Tea with Ginseng", category: "tea", packageSize: "16.9 fl oz bottle", nutrients: nutrition(5, 0, 2, 0, 5, 1, 1), caffeineMg: null, aliases: ["arizona zero green tea"], sourceUrl: "https://drinkarizona.com/products/zero-cal-green-tea-16_9oz", sourceReference: "AriZona official Nutrition Facts for the 16.9 fl oz bottle" }),
  officialBeverage({ id: "peace-tea:razzleberry-16oz", brand: "Peace Tea", name: "Razzleberry", category: "tea", packageSize: "16 fl oz can", nutrients: nutrition(110, 0, 28, 0, 160, 28, 28), caffeineMg: null, sourceUrl: "https://www.coca-cola.com/us/en/brands/peace-tea", sourceReference: "Peace Tea US official Nutrition Facts for the 16 fl oz can" }),
  officialBeverage({ id: "peace-tea:just-peachy-16oz", brand: "Peace Tea", name: "Just Peachy", category: "tea", packageSize: "16 fl oz can", nutrients: nutrition(130, 0, 35, 0, 160, 34, 34), caffeineMg: null, sourceUrl: "https://www.coca-cola.com/us/en/brands/peace-tea", sourceReference: "Peace Tea US official Nutrition Facts for the 16 fl oz can" }),
  officialBeverage({ id: "peace-tea:caddy-shack-16oz", brand: "Peace Tea", name: "Caddy Shack", category: "tea", packageSize: "16 fl oz can", nutrients: nutrition(110, 0, 28, 0, 160, 28, 28), caffeineMg: null, sourceUrl: "https://www.coca-cola.com/us/en/brands/peace-tea", sourceReference: "Peace Tea US official Nutrition Facts for the 16 fl oz can" }),
  officialBeverage({ id: "peace-tea:sno-berry-16oz", brand: "Peace Tea", name: "Sno-Berry", category: "tea", packageSize: "16 fl oz can", nutrients: nutrition(140, 0, 37, 0, 160, 37, 37), caffeineMg: null, sourceUrl: "https://www.coca-cola.com/us/en/brands/peace-tea", sourceReference: "Peace Tea US official Nutrition Facts for the 16 fl oz can" })
);

const energyFoods = [
  officialBeverage({ id: "monster:original-green-16oz", brand: "Monster Energy", name: "Original Green", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(230, null, null, null, null, null, null), caffeineMg: 160, aliases: ["monster original"], sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/original-green/", sourceReference: "Monster Energy US official product page; only published values are populated" }),
  officialBeverage({ id: "monster:zero-sugar-16oz", brand: "Monster Energy", name: "Zero Sugar", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(10, null, null, null, null, 0, null), caffeineMg: 160, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/zero-sugar/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:ultra-zero-16oz", brand: "Monster Energy", name: "Ultra Zero", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(10, null, null, null, null, 0, null), caffeineMg: 150, aliases: ["white monster", "monster zero ultra"], sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/zero-ultra/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:ultra-sunrise-16oz", brand: "Monster Energy", name: "Ultra Sunrise", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(10, null, null, null, null, 0, null), caffeineMg: 150, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-sunrise/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:ultra-violet-16oz", brand: "Monster Energy", name: "Ultra Violet", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(10, null, null, null, null, 0, null), caffeineMg: 140, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-violet/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:ultra-black-16oz", brand: "Monster Energy", name: "Ultra Black", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(10, null, null, null, null, 0, null), caffeineMg: 150, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-black/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:lando-norris-16oz", brand: "Monster Energy", name: "Lando Norris Zero Sugar Yuzu Melon", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(5, null, null, null, null, 0, null), caffeineMg: 145, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/lando-norris/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster:lo-carb-16oz", brand: "Monster Energy", name: "Lo-Carb", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(30, null, null, null, null, null, null), caffeineMg: 140, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/lo-carb/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),

  officialBeverage({ id: "red-bull:original-8-4oz", brand: "Red Bull", name: "Energy Drink", category: "energy", packageSize: "8.4 fl oz can", nutrients: nutrition(110, 0, 29, 0, 105, 26, null), caffeineMg: 80, aliases: ["red bull original"], sourceUrl: "https://www.redbull.com/us-en/energydrink/products/red-bull-energy-drink-ingredients-list", sourceReference: "Red Bull US official Nutrition Declaration; added sugar is not separately published" }),
  officialBeverage({ id: "red-bull:sugarfree-8-4oz", brand: "Red Bull", name: "Sugarfree", category: "energy", packageSize: "8.4 fl oz can", nutrients: nutrition(null, null, null, null, null, 0, null), caffeineMg: 80, sourceUrl: "https://www.redbull.com/us-en/energydrink/products/red-bull-sugar-free-energy-drinks", sourceReference: "Red Bull US official product page; unpublished label nutrients remain null" }),
  officialBeverage({ id: "red-bull:zero-8-4oz", brand: "Red Bull", name: "Zero", category: "energy", packageSize: "8.4 fl oz can", nutrients: nutrition(0, null, null, null, null, 0, null), caffeineMg: 80, sourceUrl: "https://www.redbull.com/us-en/energydrink/products/red-bull-zero", sourceReference: "Red Bull US official product page; unpublished label nutrients remain null" }),
  officialBeverage({ id: "red-bull:red-edition-8-4oz", brand: "Red Bull", name: "Red Edition Watermelon", category: "energy", packageSize: "8.4 fl oz can", nutrients: nutrition(null, null, null, null, null, null, null), caffeineMg: 80, sourceUrl: "https://www.redbull.com/us-en/energydrink/products/red-bull-editions-energy-drinks", sourceReference: "Red Bull US official current Editions listing; unpublished label nutrients remain null" }),
];

const alani = (id, name, values, sourceUrl) => officialBeverage({
  id: `alani-nu:${id}`,
  brand: "Alani Nu",
  name,
  category: "energy",
  packageSize: "12 fl oz can",
  nutrients: nutrition(...values),
  caffeineMg: 200,
  sourceUrl,
  sourceReference: "Alani Nu official Nutrition Facts for the 12 fl oz can",
});

energyFoods.push(
  alani("orange-kiss-12oz", "Orange Kiss", [10, 0, 3, 0, 200, 0, 0], "https://www.alaninu.com/products/energy-drink-orange-kiss"),
  alani("sherbet-swirl-12oz", "Sherbet Swirl", [15, 0, 2, 0, 200, 0, 0], "https://www.alaninu.com/products/energy-drink-sherbet-swirl"),
  alani("cherry-twist-12oz", "Cherry Twist", [15, 0, 5, 0, 200, 0, 0], "https://www.alaninu.com/products/energy-drink-cherry-twist"),
  alani("cotton-candy-12oz", "Cotton Candy", [10, 0, 3, 0, 180, 0, 0], "https://www.alaninu.com/products/energy-drink-cotton-candy"),
  alani("pink-slush-12oz", "Pink Slush", [5, 0, 3, 0, 180, 0, 0], "https://www.alaninu.com/products/energy-drink-pink-slush")
);

const partialEnergy = (id, brand, name, calories, totalSugar, caffeineMg, sourceUrl, sourceReference) => officialBeverage({
  id,
  brand,
  name,
  category: "energy",
  packageSize: "16 fl oz can",
  nutrients: nutrition(calories, null, null, null, null, totalSugar, null),
  caffeineMg,
  sourceUrl,
  sourceReference,
});

energyFoods.push(
  officialBeverage({ id: "rockstar:sugar-free-16oz", brand: "Rockstar", name: "Sugar Free", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(25, 0, 2, 0, 250, 0, 0), caffeineMg: 160, sourceUrl: "https://www.rockstarenergy.com/products/sugar-free", sourceReference: "Rockstar official complete Nutrition Facts" }),
  officialBeverage({ id: "rockstar:orangeade-16oz", brand: "Rockstar", name: "Orangeade", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(25, 0, 3, 0, 240, 2, null), caffeineMg: 160, sourceUrl: "https://www.rockstarenergy.com/products/orangeade", sourceReference: "Rockstar official Nutrition Facts; '<1g' added sugar is preserved as unknown rather than rounded" }),
  officialBeverage({ id: "rockstar:tropical-fruit-16oz", brand: "Rockstar", name: "Tangerine Mango Guava Strawberry", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(20, 0, 2, 0, 380, 0, 0), caffeineMg: 240, sourceUrl: "https://www.rockstarenergy.com/products/tangerine-mango-guava-strawberry", sourceReference: "Rockstar official Nutrition Facts" }),
  partialEnergy("bang:purple-haze-16oz", "Bang", "Purple Haze", 0, 0, 300, "https://www.bangenergy.com/en-us/products/", "Bang official product catalog and FAQ; nutrients not published there remain null"),
  partialEnergy("bang:blue-razz-16oz", "Bang", "Blue Razz", 0, 0, 300, "https://www.bangenergy.com/en-us/products/blue-razz/", "Bang official product page and FAQ; nutrients not published there remain null"),
  partialEnergy("bang:star-blast-16oz", "Bang", "Star Blast", 0, 0, 300, "https://www.bangenergy.com/en-us/products/star-blast/", "Bang official product page and FAQ; nutrients not published there remain null"),
  partialEnergy("c4:frozen-bombsicle-16oz", "C4 Energy", "Frozen Bombsicle", null, 0, 200, "https://cellucor.com/products/c4-original-carbonated", "Cellucor official C4 Performance Energy product page; unpublished label nutrients remain null"),
  partialEnergy("c4:cherry-limeade-16oz", "C4 Energy", "Cherry Limeade", null, 0, 200, "https://cellucor.com/products/c4-original-carbonated", "Cellucor official C4 Performance Energy product page; unpublished label nutrients remain null"),
  partialEnergy("c4:orange-slice-16oz", "C4 Energy", "Orange Slice", null, 0, 200, "https://cellucor.com/products/c4-original-carbonated", "Cellucor official C4 Performance Energy product page; unpublished label nutrients remain null"),
  partialEnergy("c4:strawberry-watermelon-16oz", "C4 Energy", "Strawberry Watermelon Ice", null, 0, 200, "https://cellucor.com/products/c4-original-carbonated", "Cellucor official C4 Performance Energy product page; unpublished label nutrients remain null")
);

const currentCelsius = (id, name, sourceUrl) => officialBeverage({
  id: `celsius:${id}`,
  brand: "CELSIUS",
  name,
  category: "energy",
  packageSize: "12 fl oz can",
  nutrients: nutrition(null, null, null, null, null, 0, null),
  caffeineMg: 200,
  sourceUrl,
  sourceReference: "CELSIUS official current product listing and Essential Facts; unpublished label nutrients remain null",
});

energyFoods.push(
  currentCelsius("sparkling-orange-12oz", "Sparkling Orange", "https://www.celsius.com/products/celsius/sparkling-orange/"),
  currentCelsius("sparkling-kiwi-guava-12oz", "Sparkling Kiwi Guava", "https://www.celsius.com/products/celsius/sparkling-kiwi-guava/"),
  currentCelsius("sparkling-wild-berry-12oz", "Sparkling Wild Berry", "https://www.celsius.com/products/celsius/sparkling-wild-berry/"),
  currentCelsius("sparkling-watermelon-12oz", "Sparkling Watermelon", "https://www.celsius.com/products/celsius/sparkling-watermelon/"),
  officialBeverage({ id: "ghost:og-16oz", brand: "GHOST", name: "OG Energy", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(null, null, null, null, null, 0, null), caffeineMg: null, sourceUrl: "https://drinkghost.com/collections/energy/products/ghost%C2%AE-energy-og", sourceReference: "GHOST official product page and can label; values not published as page text remain null" }),
  officialBeverage({ id: "ghost:cherry-limeade-16oz", brand: "GHOST", name: "Cherry Limeade Energy", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(null, null, null, null, null, 0, null), caffeineMg: null, sourceUrl: "https://drinkghost.com/products/ghost-energy%C2%AE-cherry-limeade", sourceReference: "GHOST official product page and can label; values not published as page text remain null" }),
  officialBeverage({ id: "ghost:warheads-sour-watermelon-16oz", brand: "GHOST", name: "Warheads Sour Watermelon Energy", category: "energy", packageSize: "16 fl oz can", nutrients: nutrition(null, null, null, null, null, 0, null), caffeineMg: null, sourceUrl: "https://drinkghost.com/products/ghost-energy", sourceReference: "GHOST official product catalog and can label; values not published as page text remain null" })
);

const hydrationFoods = [
  officialBeverage({ id: "powerade:mountain-berry-blast-28oz", brand: "Powerade", name: "Mountain Berry Blast", category: "sports-hydration", packageSize: "12 fl oz labeled serving (28 fl oz bottle)", nutrients: nutrition(80, 0, 21, 0, 240, 21, 21), caffeineMg: 0, sourceUrl: "https://powerade-us-en.alpha.cep.coca-cola.com/products/powerade", sourceReference: "Powerade official label: 12 fl oz serving; package contains about 2.5 servings" }),
  officialBeverage({ id: "powerade:grape-28oz", brand: "Powerade", name: "Grape", category: "sports-hydration", packageSize: "12 fl oz labeled serving (28 fl oz bottle)", nutrients: nutrition(80, 0, 21, 0, 240, 21, 21), caffeineMg: 0, sourceUrl: "https://powerade-us-en.alpha.cep.coca-cola.com/products/powerade", sourceReference: "Powerade official label: 12 fl oz serving; package contains about 2.5 servings" }),
  officialBeverage({ id: "powerade:lemon-lime-28oz", brand: "Powerade", name: "Lemon Lime", category: "sports-hydration", packageSize: "12 fl oz labeled serving (28 fl oz bottle)", nutrients: nutrition(80, 0, 21, 0, 240, 21, 21), caffeineMg: 0, sourceUrl: "https://powerade-us-en.alpha.cep.coca-cola.com/products/powerade", sourceReference: "Powerade official label: 12 fl oz serving; package contains about 2.5 servings" }),
  officialBeverage({ id: "powerade:orange-28oz", brand: "Powerade", name: "Orange", category: "sports-hydration", packageSize: "12 fl oz labeled serving (28 fl oz bottle)", nutrients: nutrition(80, 0, 21, 0, 240, 21, 21), caffeineMg: 0, sourceUrl: "https://powerade-us-en.alpha.cep.coca-cola.com/products/powerade", sourceReference: "Powerade official label: 12 fl oz serving; package contains about 2.5 servings" }),
  officialBeverage({ id: "bodyarmor:zero-orange-16oz", brand: "BODYARMOR", name: "Zero Sugar Orange", category: "sports-hydration", packageSize: "16 fl oz bottle", nutrients: nutrition(10, 0, 0, 0, 5, 0, 0), caffeineMg: null, sourceUrl: "https://www.drinkbodyarmor.com/zero-sugar/orange", sourceReference: "BODYARMOR official Nutrition Facts for the selected 16 fl oz bottle; caffeine is not published" }),
  officialBeverage({ id: "bodyarmor:lyte-blueberry-pomegranate-16oz", brand: "BODYARMOR", name: "Lyte Blueberry Pomegranate", category: "sports-hydration", packageSize: "16 fl oz bottle", nutrients: nutrition(20, 0, 5, 0, 30, 2, 0), caffeineMg: null, sourceUrl: "https://www.drinkbodyarmor.com/lyte/blueberry-pomegranate", sourceReference: "BODYARMOR official Nutrition Facts for the 16 fl oz bottle; caffeine is not published" }),
  officialBeverage({ id: "prime:hydration-glowberry-16-9oz", brand: "PRIME", name: "Hydration Glowberry", category: "sports-hydration", packageSize: "16.9 fl oz bottle", nutrients: nutrition(25, 0, 5, 0, 30, 2, 0), caffeineMg: 0, sourceUrl: "https://drinkprime.com/products/hydration-glowberry", sourceReference: "PRIME official package Nutrition Facts and product page for the 16.9 fl oz bottle" }),
];

const coffeeFoods = [
  officialBeverage({ id: "monster-java:mean-bean-15oz", brand: "Java Monster", name: "Mean Bean", category: "ready-to-drink-coffee", packageSize: "15 fl oz can", nutrients: nutrition(220, 8, null, null, null, null, null), caffeineMg: 200, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/java-monster/mean-bean/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster-java:loca-moca-15oz", brand: "Java Monster", name: "Loca Moca", category: "ready-to-drink-coffee", packageSize: "15 fl oz can", nutrients: nutrition(220, 6, null, null, null, null, null), caffeineMg: 200, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/java-monster/loca-moca/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "monster-java:salted-caramel-15oz", brand: "Java Monster", name: "Salted Caramel", category: "ready-to-drink-coffee", packageSize: "15 fl oz can", nutrients: nutrition(180, 8, null, null, null, null, null), caffeineMg: 200, sourceUrl: "https://www.monsterenergy.com/en-us/energy-drinks/java-monster/salted-caramel/", sourceReference: "Monster Energy US official product page; unpublished nutrients remain null" }),
  officialBeverage({ id: "dunkin:iced-coffee-original-13-7oz", brand: "Dunkin'", name: "Original Iced Coffee", category: "ready-to-drink-coffee", packageSize: "13.7 fl oz bottle", nutrients: nutrition(250, 7, 40, 7, 85, 39, 28), caffeineMg: 197, sourceUrl: "https://dunkinanytime.beta.cep.coca-cola.com/products/iced-coffee-on-the-go", sourceReference: "Dunkin' Anytime official Nutrition Facts for the 13.7 fl oz bottle" }),
  officialBeverage({ id: "dunkin:iced-coffee-french-vanilla-13-7oz", brand: "Dunkin'", name: "French Vanilla Iced Coffee", category: "ready-to-drink-coffee", packageSize: "13.7 fl oz bottle", nutrients: nutrition(260, 8, 41, 8, 85, 40, 30), caffeineMg: 196, sourceUrl: "https://dunkinanytime.beta.cep.coca-cola.com/products/iced-coffee-on-the-go", sourceReference: "Dunkin' Anytime official Nutrition Facts for the 13.7 fl oz bottle" }),
  officialBeverage({ id: "dunkin:iced-coffee-mocha-13-7oz", brand: "Dunkin'", name: "Mocha Iced Coffee", category: "ready-to-drink-coffee", packageSize: "13.7 fl oz bottle", nutrients: nutrition(270, 8, 43, 8, 90, 40, 30), caffeineMg: 150, sourceUrl: "https://dunkinanytime.beta.cep.coca-cola.com/products/iced-coffee-on-the-go", sourceReference: "Dunkin' Anytime official Nutrition Facts for the 13.7 fl oz bottle" }),
  officialBeverage({ id: "dunkin:iced-coffee-caramel-13-7oz", brand: "Dunkin'", name: "Caramel Iced Coffee", category: "ready-to-drink-coffee", packageSize: "13.7 fl oz bottle", nutrients: nutrition(260, 7, 41, 8, 85, 40, 29), caffeineMg: 150, sourceUrl: "https://dunkinanytime.beta.cep.coca-cola.com/products/iced-coffee-on-the-go", sourceReference: "Dunkin' Anytime official Nutrition Facts for the 13.7 fl oz bottle" }),
];

const otherFoods = [
  officialBeverage({ id: "dasani:purified-water-20oz", brand: "Dasani", name: "Purified Water", category: "other", packageSize: "20 fl oz bottle", nutrients: nutrition(0, 0, 0, 0, 0, 0, 0), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/dasani", sourceReference: "Dasani US official Nutrition Facts" }),
  officialBeverage({ id: "smartwater:original-33-8oz", brand: "smartwater", name: "Vapor Distilled Water", category: "other", packageSize: "33.8 fl oz bottle", nutrients: nutrition(0, 0, 0, 0, 0, 0, 0), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/smartwater/products/smartwater", sourceReference: "smartwater US official Nutrition Facts" }),
  officialBeverage({ id: "vitaminwater:xxx-16-9oz", brand: "vitaminwater", name: "XXX Açai-Blueberry-Pomegranate", category: "other", packageSize: "16.9 fl oz bottle", nutrients: nutrition(90, 0, 22, 0, 0, 22, 22), caffeineMg: 0, sourceUrl: "https://www.coca-cola.com/us/en/brands/vitaminwater/products/vitaminwater-base", sourceReference: "vitaminwater US official Nutrition Facts" }),
];

const beverageFoods = [
  ...pepsicoFoods,
  ...cocaColaFoods,
  ...additionalSodaFoods,
  ...energyFoods,
  ...hydrationFoods,
  ...teaFoods,
  ...coffeeFoods,
  ...otherFoods,
];

export default beverageFoods;
