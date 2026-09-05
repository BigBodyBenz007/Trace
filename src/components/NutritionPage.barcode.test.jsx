import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NutritionPage from "./NutritionPage";
import { createUserFood } from "../services/userFoodCatalog";

const originalScrollTo = window.scrollTo;

beforeEach(() => {
  window.scrollTo = jest.fn();
});

afterEach(() => {
  window.scrollTo = originalScrollTo;
});

function remoteFood() {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Example Brand",
    name: "Example Yogurt",
    packageQuantity: "4 oz cup",
    serving: { description: "1 cup (30 g)", amount: 30, unit: "g", grams: 30 },
    servingsPerContainer: 1,
    nutrients: {
      calories: 30,
      protein: 3,
      carbohydrates: 6,
      fat: 0,
      fiber: null,
      sodium: 15,
      totalSugar: 2.4,
      addedSugar: null,
    },
    dataBasis: "serving",
    nutritionBasis: {
      kind: "derived-serving",
      source: "foodNutrients",
      sourceBasis: "100g",
      sourceQuantity: { amount: 100, unit: "g", dimension: "mass" },
      servingQuantity: { amount: 30, unit: "g", dimension: "mass" },
      conversionFactor: 0.3,
      sourceNutrients: {
        calories: 100,
        protein: 10,
        carbohydrates: 20,
        fat: 0,
        fiber: null,
        sodium: 50,
        totalSugar: 8,
        addedSugar: null,
      },
    },
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

function floatingRemoteFood() {
  return {
    ...remoteFood(),
    brand: "Oikos",
    name: "Oikos Pro Mixed Berry",
    serving: { description: "100 g", amount: 100, unit: "g", grams: 100 },
    nutrients: {
      calories: 112.6666666666671,
      protein: 20.00000000000002,
      carbohydrates: 5.999999999999993,
      fat: 3.000000000000003,
      fiber: null,
      sodium: 44.99999999999999,
      totalSugar: 3.000000000000003,
      addedSugar: 0,
    },
    nutritionBasis: {
      kind: "provider-serving",
      source: "labelNutrients",
      sourceBasis: "serving",
      sourceQuantity: { amount: 1, unit: "serving", dimension: null },
      servingQuantity: { amount: 100, unit: "g", dimension: "mass" },
      conversionFactor: null,
      sourceNutrients: {
        calories: 112.6666666666671,
        protein: 20.00000000000002,
        carbohydrates: 5.999999999999993,
        fat: 3.000000000000003,
        fiber: null,
        sodium: 44.99999999999999,
        totalSugar: 3.000000000000003,
        addedSugar: 0,
      },
    },
    unknownFields: ["nutrients.fiber", "provenance.revisionDate"],
  };
}

function setup(overrides = {}, lookupFood = remoteFood()) {
  const saveNutritionEntry = jest.fn(() => true);
  const lookup = jest.fn().mockResolvedValue({ status: "found", food: lookupFood });
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
  await screen.findByRole("article", { name: "Barcode product review" });
  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
}

function entryForm() {
  return within(screen.getByRole("heading", { name: "Add Nutrition Entry" }).closest("form"));
}

function entryNutrient(label) {
  return screen.getByLabelText(label, { selector: `input[aria-label="${label}"]` });
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

test("quantity scales labeled-serving nutrition without marking provenance modified", async () => {
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
    dataBasis: "serving",
  });
  expect(saved.foodReference.providerNutritionBasis.nutrients.calories).toBe(30);
  expect(saved.foodReference.providerNutritionBasis.selection.sourceNutrients.calories).toBe(100);
  expect(saved.foodReference.providerAttribution).toBe("USDA FoodData Central");
  expect(saved.nutritionBasis.calories).toBe(30);
  expect(saved.portion.amount).toBe(2);
  expect(saved.portion.basis).toEqual({
    amount: 30,
    unit: "g",
    description: "1 cup (30 g)",
    grams: 30,
  });
  expect(saved.calories).toBe(60);
});

test("editing a scanned nutrient marks the saved reference modified", async () => {
  const { saveNutritionEntry } = setup();
  await scanAndUse();
  fireEvent.change(entryForm().getByLabelText("Calories"), { target: { value: "31" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  expect(saveNutritionEntry.mock.calls[0][0].foodReference.modified).toBe(true);
  expect(saveNutritionEntry.mock.calls[0][0].foodReference.providerNutritionBasis.selection.sourceNutrients.calories).toBe(100);
});

test("reopening a saved scan keeps its labeled-serving basis", () => {
  setup({
    nutritionEntries: [{
      id: "entry:scanned",
      name: "Example Yogurt",
      calories: 60,
      protein: 6,
      carbohydrates: 12,
      fat: 0,
      fiber: null,
      sodium: 30,
      totalSugar: 4.8,
      addedSugar: null,
      loggedAt: "2026-09-03T12:00:00.000Z",
      notes: "",
      portion: {
        amount: 2,
        unit: "serving",
        basis: { amount: 30, unit: "g", description: "1 cup (30 g)", grams: 30 },
      },
      nutritionBasis: {
        calories: 30,
        protein: 3,
        carbohydrates: 6,
        fat: 0,
        fiber: null,
        sodium: 15,
        totalSugar: 2.4,
        addedSugar: null,
      },
      foodReference: {
        sourceType: "remote-barcode",
        dataBasis: "serving",
        modified: false,
      },
    }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Number of servings")).toHaveValue(2);
  expect(screen.getByText(/One serving: 1 cup \(30 g\)/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(entryNutrient("Calories")).toHaveValue(15);
  expect(entryNutrient("Protein (g)")).toHaveValue(1.5);
});

test("keeps remote handoff, fractional scaling, double scaling, and saved values clean", async () => {
  const { saveNutritionEntry } = setup({}, floatingRemoteFood());
  await scanAndUse();

  expect(entryNutrient("Calories")).toHaveValue(113);
  expect(entryNutrient("Protein (g)")).toHaveValue(20);
  expect(entryNutrient("Carbohydrates (g)")).toHaveValue(6);
  expect(entryNutrient("Fat (g)")).toHaveValue(3);
  expect(entryNutrient("Sodium (mg)")).toHaveValue(45);
  expect(entryNutrient("Total Sugar (g)")).toHaveValue(3);
  expect(entryNutrient("Added Sugar (g)")).toHaveValue(0);
  expect(entryNutrient("Fiber (g)")).toHaveValue(null);

  fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(entryNutrient("Calories")).toHaveValue(57);
  expect(entryNutrient("Protein (g)")).toHaveValue(10);
  expect(entryNutrient("Fat (g)")).toHaveValue(1.5);
  expect(entryNutrient("Sodium (mg)")).toHaveValue(23);

  fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(entryNutrient("Calories")).toHaveValue(226);
  expect(entryNutrient("Protein (g)")).toHaveValue(40);
  expect(entryNutrient("Carbohydrates (g)")).toHaveValue(12);
  expect(entryNutrient("Fat (g)")).toHaveValue(6);
  expect(entryNutrient("Sodium (mg)")).toHaveValue(90);
  expect(entryNutrient("Total Sugar (g)")).toHaveValue(6);
  expect(entryNutrient("Added Sugar (g)")).toHaveValue(0);
  expect(screen.queryByText("112.6666666666671", { exact: false })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  const saved = saveNutritionEntry.mock.calls[0][0];
  expect(saved).toMatchObject({
    calories: 226,
    protein: 40,
    carbohydrates: 12,
    fat: 6,
    sodium: 90,
    totalSugar: 6,
    addedSugar: 0,
    nutritionBasis: {
      calories: 113,
      protein: 20,
      carbohydrates: 6,
      fat: 3,
      fiber: null,
      sodium: 45,
      totalSugar: 3,
      addedSugar: 0,
    },
    foodReference: { sourceType: "remote-barcode", modified: false },
  });
  expect(saved.foodReference.providerNutritionBasis.nutrients.calories)
    .toBe(112.6666666666671);
  expect(saved.foodReference.providerNutritionBasis.nutrients.sodium)
    .toBe(44.99999999999999);
});

test("a recovered custom barcode food hands off cleanly without auto-logging", async () => {
  const saveUserFood = jest.fn((payload) => ({
    status: "added",
    food: createUserFood(payload.name, payload.nutrients, payload.serving, payload),
  }));
  const barcodeLookupService = {
    lookup: jest.fn().mockResolvedValue({ status: "not-found", food: null }),
  };
  const { saveNutritionEntry } = setup({ saveUserFood, barcodeLookupService });
  fireEvent.click(screen.getByRole("button", { name: "Scan Barcode" }));
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Create This Food" }));
  const recoveryForm = within(screen.getByRole("button", { name: "Save Barcode Food" }).closest("form"));
  fireEvent.change(recoveryForm.getByLabelText("Food name"), { target: { value: "Recovered food" } });
  fireEvent.change(recoveryForm.getByLabelText("Calories"), { target: { value: "112.6666666666671" } });
  fireEvent.change(recoveryForm.getByLabelText("Protein (g)"), { target: { value: "20.00000000000002" } });
  fireEvent.change(recoveryForm.getByLabelText("Carbohydrates (g)"), { target: { value: "5.999999999999993" } });
  fireEvent.change(recoveryForm.getByLabelText("Fat (g)"), { target: { value: "3.000000000000003" } });
  fireEvent.change(recoveryForm.getByLabelText("Sodium (mg), optional"), { target: { value: "44.99999999999999" } });
  fireEvent.change(recoveryForm.getByLabelText("Added Sugar (g), optional"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Barcode Food" }));
  expect(saveNutritionEntry).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "Use This Food" }));

  expect(entryNutrient("Calories")).toHaveValue(113);
  expect(entryNutrient("Protein (g)")).toHaveValue(20);
  expect(entryNutrient("Carbohydrates (g)")).toHaveValue(6);
  expect(entryNutrient("Fat (g)")).toHaveValue(3);
  expect(entryNutrient("Sodium (mg)")).toHaveValue(45);
  expect(entryNutrient("Added Sugar (g)")).toHaveValue(0);
  fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(entryNutrient("Calories")).toHaveValue(57);
  fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(entryNutrient("Calories")).toHaveValue(226);
  expect(entryNutrient("Protein (g)")).toHaveValue(40);

  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  expect(saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 226,
    protein: 40,
    foodReference: {
      source: "user-added",
      sourceType: "grocery-custom",
      modified: false,
      identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    },
  });
});

test("completed remote recovery keeps the raw provider snapshot through Nutrition handoff", async () => {
  const completeProviderFood = floatingRemoteFood();
  const providerFood = {
    ...completeProviderFood,
    nutrients: { ...completeProviderFood.nutrients, calories: null },
    nutritionBasis: {
      ...completeProviderFood.nutritionBasis,
      sourceNutrients: {
        ...completeProviderFood.nutritionBasis.sourceNutrients,
        calories: null,
      },
    },
    completeness: "insufficient",
    unknownFields: ["nutrients.calories", "nutrients.fiber", "provenance.revisionDate"],
    logReady: false,
  };
  const saveUserFood = jest.fn((payload) => ({
    status: "added",
    food: createUserFood(payload.name, payload.nutrients, payload.serving, payload),
  }));
  const barcodeLookupService = {
    lookup: jest.fn().mockResolvedValue({ status: "incomplete", food: providerFood }),
  };
  const { saveNutritionEntry } = setup({ saveUserFood, barcodeLookupService });
  fireEvent.click(screen.getByRole("button", { name: "Scan Barcode" }));
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Complete This Food" }));
  const recoveryForm = within(screen.getByRole("button", { name: "Save Barcode Food" }).closest("form"));
  fireEvent.change(recoveryForm.getByLabelText("Calories"), { target: { value: "113" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Barcode Food" }));
  fireEvent.click(await screen.findByRole("button", { name: "Use This Food" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  await waitFor(() => expect(saveNutritionEntry).toHaveBeenCalledTimes(1));
  const reference = saveNutritionEntry.mock.calls[0][0].foodReference;
  expect(reference).toMatchObject({
    source: "user-added",
    dataType: "user-completed",
    providerAttribution: "USDA FoodData Central",
    modified: false,
  });
  expect(reference.providerSourceSnapshot.nutrients.protein).toBe(20.00000000000002);
  expect(reference.providerSourceSnapshot.nutrients.calories).toBeNull();
});

test("ordinary grocery creation keeps its helpful example placeholders", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Create grocery food" }));
  const ordinary = within(screen.getByRole("button", { name: "Save grocery food" }).closest("form"));
  expect(ordinary.getByLabelText("Food name"))
    .toHaveAttribute("placeholder", "Raw chicken breast strips");
  expect(ordinary.getByLabelText("Package quantity (optional)"))
    .toHaveAttribute("placeholder", "32 oz");
  expect(ordinary.getByLabelText("Serving description (optional)"))
    .toHaveAttribute("placeholder", "1 cup (30 g)");
});
