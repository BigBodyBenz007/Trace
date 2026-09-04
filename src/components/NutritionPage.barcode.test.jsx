import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NutritionPage from "./NutritionPage";

function remoteFood() {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Example Brand",
    name: "Example Yogurt",
    packageQuantity: "4 oz cup",
    serving: { description: "1 cup (30 g)", amount: 1, unit: "cup", grams: 30 },
    servingsPerContainer: 1,
    nutrients: {
      calories: 100,
      protein: 10,
      carbohydrates: 20,
      fat: 0,
      fiber: null,
      sodium: 50,
      totalSugar: 8,
      addedSugar: null,
    },
    dataBasis: "100g",
    completeness: "partial",
    unknownFields: ["nutrients.fiber", "nutrients.addedSugar", "provenance.revisionDate"],
    logReady: true,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/123/nutrients",
      provider: "usda-fdc",
      providerRecordId: "123",
      attribution: "USDA FoodData Central",
      revisionDate: null,
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
  };
}

function setup(overrides = {}) {
  const saveNutritionEntry = jest.fn(() => true);
  const lookup = jest.fn().mockResolvedValue({ status: "found", food: remoteFood() });
  const props = {
    onBack: jest.fn(),
    nutritionEntries: [],
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    saveNutritionEntry,
    saveUserFood: jest.fn(),
    updateNutritionEntry: jest.fn(() => true),
    deleteNutritionEntry: jest.fn(() => true),
    saveNutritionGoals: jest.fn(() => true),
    barcodeLookupService: { lookup },
    lifecycleAdapter: { subscribe: () => () => {} },
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };
  render(<NutritionPage
    {...props}
  />);
  return { lookup, saveNutritionEntry };
}

async function scanAndUse() {
  fireEvent.click(screen.getByRole("button", { name: "Scan Barcode" }));
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  await screen.findByText("Example Brand · Example Yogurt");
  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
}

function entryForm() {
  return within(screen.getByRole("heading", { name: "Add Nutrition Entry" }).closest("form"));
}

test("scanner confirmation populates the editable form without auto-saving", async () => {
  const { lookup, saveNutritionEntry } = setup();
  expect(lookup).not.toHaveBeenCalled();
  await scanAndUse();

  expect(lookup).toHaveBeenCalledWith("00012345600012");
  expect(saveNutritionEntry).not.toHaveBeenCalled();
  const form = entryForm();
  expect(form.getByLabelText("Food / meal name")).toHaveValue("Example Yogurt");
  expect(form.getByLabelText("Calories")).toHaveValue(30);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0);
  expect(form.getByLabelText("Fiber (g)")).toHaveValue(null);
  expect(screen.getByText(/One serving: 1 cup \(30 g\)/i)).toBeInTheDocument();
});

test("Nutrition consumes an unavailable feature-access decision", () => {
  const barcodeFeatureAccess = {
    getAccess: jest.fn(() => ({
      feature: "barcode-scanner",
      available: false,
      mode: "unavailable",
      label: "Premium",
      message: "Not available for this account.",
    })),
  };
  setup({ barcodeFeatureAccess });
  expect(barcodeFeatureAccess.getAccess).toHaveBeenCalledWith("barcode-scanner");
  expect(screen.getByRole("button", { name: "Scan Barcode" })).toBeDisabled();
});

test("quantity scales adapted nutrition without marking provenance modified", async () => {
  const { saveNutritionEntry } = setup();
  await scanAndUse();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(form.getByLabelText("Calories")).toHaveValue(60);
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  const saved = saveNutritionEntry.mock.calls[0][0];
  expect(saved.foodReference).toMatchObject({
    sourceType: "remote-barcode",
    modified: false,
    provider: { id: "usda-fdc", recordId: "123" },
    dataBasis: "100g",
  });
  expect(saved.foodReference.providerNutritionBasis.nutrients.calories).toBe(100);
  expect(saved.nutritionBasis.calories).toBe(30);
  expect(saved.portion.amount).toBe(2);
  expect(saved.calories).toBe(60);
});

test("editing a scanned nutrient marks the saved reference modified", async () => {
  const { saveNutritionEntry } = setup();
  await scanAndUse();
  fireEvent.change(entryForm().getByLabelText("Calories"), { target: { value: "31" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  expect(saveNutritionEntry.mock.calls[0][0].foodReference.modified).toBe(true);
  expect(saveNutritionEntry.mock.calls[0][0].foodReference.providerNutritionBasis.nutrients.calories).toBe(100);
});
