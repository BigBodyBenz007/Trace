export const SERVING_UNIT_OPTIONS = [
  { value: "serving", label: "Serving" },
  { value: "item", label: "Item" },
  { value: "slice", label: "Slice" },
  { value: "cup", label: "Cup" },
  { value: "tbsp", label: "Tablespoon (tbsp)" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "g", label: "Gram (g)" },
  { value: "custom", label: "Custom" },
];

const COUNT_UNIT_LABELS = {
  serving: ["serving", "servings"],
  item: ["item", "items"],
  slice: ["slice", "slices"],
  cup: ["cup", "cups"],
};

const ABBREVIATED_UNITS = new Set(["tbsp", "oz", "g"]);
const SERVING_UNIT_KEYS = new Set(
  SERVING_UNIT_OPTIONS.map((option) => option.value)
);

function toPositiveNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : null;
}

export function getServingDefinitionError({
  amount,
  unit,
  customDescription,
  grams,
}) {
  if (toPositiveNumber(amount) === null) {
    return "Serving amount must be greater than zero.";
  }

  if (!SERVING_UNIT_KEYS.has(unit)) {
    return "Choose a valid serving unit.";
  }

  if (
    unit === "custom" &&
    !/[a-z0-9]/i.test(String(customDescription || "").trim())
  ) {
    return "Enter a meaningful custom serving description.";
  }

  if (grams !== undefined && grams !== "" && toPositiveNumber(grams) === null) {
    return "Serving grams must be greater than zero when provided.";
  }

  return "";
}

export function createServingDefinition({
  amount,
  unit,
  customDescription = "",
  grams,
}) {
  if (getServingDefinitionError({ amount, unit, customDescription, grams })) {
    return null;
  }

  const numericAmount = Number(amount);
  let description;

  if (unit === "custom") {
    description = String(customDescription).trim().replace(/\s+/g, " ");
  } else if (ABBREVIATED_UNITS.has(unit)) {
    description = `${numericAmount} ${unit}`;
  } else {
    const [singular, plural] = COUNT_UNIT_LABELS[unit];
    description = `${numericAmount} ${numericAmount === 1 ? singular : plural}`;
  }

  const serving = {
    amount: numericAmount,
    unit,
    description,
  };

  if (unit === "g") {
    serving.grams = numericAmount;
  } else if (grams !== undefined && grams !== "") {
    serving.grams = Number(grams);
  }

  return serving;
}
