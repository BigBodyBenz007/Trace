// Reviewed search metadata only: these IDs refer to existing catalog records.
// `terms` must be present in a broad query; `qualifiers` are optional chain/brand
// words. Any other query words disable that family's preference. Defaults and
// members are explicit so words such as "original" never imply a global boost.
const family = (id, terms, qualifiers, defaultIds, variantIds) => ({
  id, terms, qualifiers, defaultIds, memberIds: [...defaultIds, ...variantIds],
});

const restaurantFamily = (chain, terms, defaultSlugs, variantSlugs) => family(
  `${chain}:${terms[0]}`,
  terms,
  [chain],
  defaultSlugs.map((slug) => `restaurant:${chain}:${slug}`),
  variantSlugs.map((slug) => `restaurant:${chain}:${slug}`)
);

const chocolateFrostyVariants = [
  "brownie-batter-chocolate-frosty-swirl-tm",
  "caramel-chocolate-frosty-swirl-tm",
  "caramel-crunch-chocolate-frosty-fusion-tm",
  "cookie-dough-frosty-fusion-chocolate",
  "oreo-brownie-chocolate-frosty-fusion-tm",
  "strawberry-chocolate-frosty-swirl-tm",
];
const vanillaFrostyVariants = [
  "apple-crumble-frosty-fusion-vanilla",
  "brownie-batter-vanilla-frosty-swirl-tm",
  "caramel-crunch-vanilla-frosty-fusion-tm",
  "caramel-vanilla-frosty-swirl-tm",
  "cookie-dough-frosty-fusion-vanilla",
  "oreo-brownie-vanilla-frosty-fusion-tm",
  "strawberry-vanilla-frosty-swirl-tm",
];

const foodSearchFamilies = [
  restaurantFamily("ihop", ["pancakes", "pancake"], [
    "original-buttermilk-pancakes-full",
    "original-buttermilk-pancakes-short",
  ], [
    "new-york-cheesecake-pancakes",
    "cinn-a-stack-pancakes",
    "double-blueberry-pancakes",
    "mexican-tres-leches-pancakes",
    "strawberry-banana-pancakes",
    "protein-power-pancakes",
    "chocolate-chocolate-chip-pancakes",
    "buttermilk-chocolate-chip-pancakes",
  ]),
  restaurantFamily("wendys", ["frosty"], ["classic-chocolate-frosty"], [
    "vanilla-frosty", ...chocolateFrostyVariants, ...vanillaFrostyVariants,
  ]),
  // A named base flavor defines a narrower family; chocolate cannot participate
  // in the vanilla family, nor can a vanilla mix-in override a requested mix-in.
  restaurantFamily("wendys", ["vanilla frosty"], ["vanilla-frosty"], vanillaFrostyVariants),
  restaurantFamily("wendys", ["chocolate frosty"], ["classic-chocolate-frosty"], chocolateFrostyVariants),
  restaurantFamily("braums", ["limeade"], ["limeade"], ["cherry-limeade"]),
  restaurantFamily("sonic", ["limeade"], ["limeade"], [
    "cherry-limeade", "cranberry-limeade", "diet-cherry-limeade", "diet-limeade", "strawberry-limeade",
  ]),
  restaurantFamily("sonic", ["diet limeade"], ["diet-limeade"], ["diet-cherry-limeade"]),
  restaurantFamily("taco-bell", ["pepsi"], ["large-pepsi"], [
    "large-diet-pepsi", "large-pepsi-zero-sugar", "large-cherry-pepsi", "large-pepsi-dirty-soda",
  ]),
  restaurantFamily("kfc", ["pepsi"], ["pepsi"], ["pepsi-zero-sugar", "wild-cherry-pepsi"]),
  family("pepsi", ["pepsi"], ["cola"], ["beverage:pepsi:pepsi-20oz"], [
    "beverage:pepsi:diet-pepsi-20oz", "beverage:pepsi:zero-sugar-20oz", "beverage:pepsi:wild-cherry-20oz",
  ]),
  family("mountain-dew", ["mountain dew", "mtn dew"], [], ["beverage:mountain-dew:original-20oz"], [
    "beverage:mountain-dew:diet-20oz", "beverage:mountain-dew:zero-sugar-20oz",
    "beverage:mountain-dew:baja-blast-20oz", "beverage:mountain-dew:baja-blast-zero-20oz",
  ]),
  family("cheerios", ["cheerios"], ["general mills", "cereal"], ["packaged-food:cheerios-original-8-9oz"], [
    "packaged-food:cheerios-honey-nut-10-8oz", "packaged-food:cheerios-apple-cinnamon-19oz",
    "packaged-food:cheerios-protein-cinnamon-11-2oz",
  ]),
  family("quaker-instant-oatmeal", ["instant oatmeal", "instant oats"], ["quaker"], ["packaged-food:quaker-instant-original-10ct"], [
    "packaged-food:quaker-instant-maple-brown-sugar-8ct", "packaged-food:quaker-instant-apples-cinnamon-8ct",
    "packaged-food:quaker-lower-sugar-maple-brown-sugar-8ct", "packaged-food:quaker-protein-maple-brown-sugar-6ct",
    "packaged-food:quaker-instant-cinnamon-spice-8ct", "packaged-food:quaker-instant-peaches-cream-12-3oz",
    "packaged-food:quaker-fiber-apples-cinnamon-8ct",
  ]),
];

export default foodSearchFamilies;
