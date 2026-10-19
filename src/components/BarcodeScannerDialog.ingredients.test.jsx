import { fireEvent, render, screen, within } from "@testing-library/react";
import BarcodeScannerDialog from "./BarcodeScannerDialog";
import { createRemoteBarcodeLookup } from "../services/remoteBarcodeLookup";
import { createRemoteBarcodeCache } from "../services/remoteBarcodeCache";
import { createUserFood } from "../services/userFoodCatalog";

const { normalizeOpenFoodFactsProduct } = require("../../api/nutrition/_barcodeGateway.cjs");
const BARCODE = "00012345600012";
const SECOND_BARCODE = "012000001291";
const text = "  Lait, cacao (2%);\n sel.  ";
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = jest.fn();
});
afterEach(() => { window.scrollTo = originalScrollTo; });

function providerFood({ barcode = BARCODE, name = "First product", ingredientText = text } = {}) {
  return normalizeOpenFoodFactsProduct({
    code: barcode, product_name: name, brands: "Example Brand", lang: "fr",
    ingredients_text: ingredientText, serving_size: "1 cup (100 g)",
    serving_quantity: 100, serving_quantity_unit: "g", servings_per_container: 1,
    nutrition_data_per: "serving",
    nutriments: { "energy-kcal_serving": 112.6666666666671, proteins_serving: 20, carbohydrates_serving: 6, fat_serving: 3 },
  }, barcode, "2026-10-19T12:00:00.000Z");
}

function setup(barcodeLookup, onUseFood = jest.fn()) {
  render(<BarcodeScannerDialog
    access={{ available: true, label: "Barcode Scanner Beta", message: "Scan a food barcode." }}
    barcodeLookup={barcodeLookup}
    camera={{ start: jest.fn().mockResolvedValue({ devices: [], stop: jest.fn() }) }}
    lifecycleAdapter={{ subscribe: () => () => {} }}
    onClose={jest.fn()}
    onUseFood={onUseFood}
  />);
  return onUseFood;
}

async function lookup(barcode = BARCODE) {
  fireEvent.change(screen.getByLabelText("Enter barcode manually"), { target: { value: barcode } });
  fireEvent.click(screen.getByRole("button", { name: "Look Up Barcode" }));
  return within(await screen.findByRole("article", { name: "Barcode product review" }));
}

test("review disclosure resets for a new product and hands off unchanged nutrition and ingredient data", async () => {
  const first = providerFood();
  const second = providerFood({ barcode: SECOND_BARCODE, name: "Second product", ingredientText: "Riz, eau." });
  const service = { lookup: jest.fn().mockResolvedValueOnce({ status: "found", food: first })
    .mockResolvedValueOnce({ status: "found", food: second }) };
  const onUseFood = setup(service);
  await lookup();
  expect(screen.getByRole("button", { name: "Ingredients" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
  expect(screen.getByRole("region", { name: "Ingredient text" }).textContent).toBe(text);
  expect(screen.getAllByText(/Source: Open Food Facts contributors/)).toHaveLength(2);
  expect(screen.getByText("Language: fr")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Scan Again" }));
  await lookup(SECOND_BARCODE);
  expect(screen.getByRole("button", { name: "Ingredients" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
  expect(screen.getByRole("region", { name: "Ingredient text" }).textContent).toBe("Riz, eau.");
  expect(screen.queryByText(text, { exact: false })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
  expect(onUseFood).toHaveBeenCalledWith(expect.objectContaining({
    nutrients: second.nutrients, ingredients: second.ingredients,
    serving: expect.objectContaining({ amount: 100, unit: "g" }),
  }));
});

test.each(["enriched", "legacy"])("%s cached products remain usable offline", async (kind) => {
  const food = { ...providerFood() };
  if (kind === "legacy") delete food.ingredients;
  const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => 1000 });
  cache.set(BARCODE, { status: "found", identifier: { scheme: "gtin", value: BARCODE }, food });
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({
    storage: localStorage, clock: () => 1000, runtime: { isWeb: true, isOnline: false },
    localLookup: () => ({ status: "not-found", food: null }), fetchImpl,
  });
  const onUseFood = setup(service);
  await lookup();
  fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
  expect(screen.getByRole("button", { name: "Use This Food" })).toBeEnabled();
  const expectedText = kind === "legacy" ? "Ingredient information unavailable." : text;
  expect(screen.getByRole("region", { name: "Product ingredients" }).textContent).toContain(expectedText);
  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
  expect(onUseFood).toHaveBeenCalledWith(expect.objectContaining({ nutrients: food.nutrients }));
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("completed custom foods attribute ingredients to their original provider", async () => {
  const snapshot = providerFood();
  const custom = createUserFood("Completed custom product", snapshot.nutrients, {
    amount: 100, unit: "g", grams: 100, description: "100 g",
  }, { identifiers: snapshot.identifiers, providerSourceSnapshot: snapshot });
  setup({ lookup: jest.fn().mockResolvedValue({ status: "found", food: custom }) });
  await lookup();
  fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
  const disclosure = within(screen.getByRole("region", { name: "Product ingredients" }));
  expect(disclosure.getByText(`Source: ${snapshot.provenance.attribution}`)).toBeVisible();
  expect(disclosure.getByRole("region", { name: "Ingredient text" }).textContent).toBe(text);
  expect(screen.getByRole("button", { name: "Edit Custom Food" })).toBeEnabled();
});
