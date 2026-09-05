import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import BarcodeScannerDialog from "./BarcodeScannerDialog";
import { APP_LIFECYCLE_PHASE } from "../services/appLifecycleAdapter";
import { createUserFood } from "../services/userFoodCatalog";

const access = {
  available: true,
  label: "Premium Preview",
  message: "Barcode scanning is available during Trace beta as a Premium Preview.",
};

const originalScrollTo = window.scrollTo;
const originalScrollX = Object.getOwnPropertyDescriptor(window, "scrollX");
const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  window.scrollTo = jest.fn();
});

afterEach(() => {
  cleanup();
  window.scrollTo = originalScrollTo;
  window.matchMedia = originalMatchMedia;
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.documentElement.style.overscrollBehavior = "";
  if (originalScrollX) Object.defineProperty(window, "scrollX", originalScrollX);
  else delete window.scrollX;
  if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
  else delete window.scrollY;
});

function localFood() {
  return {
    id: "local-product",
    sourceType: "packaged-food",
    brand: "Trace Test",
    name: "Test Cereal",
    serving: { amount: 1, unit: "cup", description: "1 cup" },
    nutrients: {
      calories: 120,
      protein: 4,
      carbohydrates: 24,
      fat: 2,
      fiber: 3,
      sodium: 0,
      totalSugar: 6,
      addedSugar: null,
    },
    packaged: { packageSize: "12 oz", servingsPerContainer: 10 },
    provenance: {
      source: "trace-packaged-food-catalog",
      sourceId: "test-cereal",
      confidence: "verified-label",
      label: "Trace verified catalog",
    },
  };
}

function floatingRemoteFood() {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    provider: { id: "usda-fdc", recordId: "456", attribution: "USDA FoodData Central" },
    brand: "Oikos",
    name: "Oikos Pro Mixed Berry",
    packageQuantity: "5.3 oz cup",
    serving: { description: "100 g", amount: 100, unit: "g", grams: 100 },
    servingsPerContainer: 1,
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
    dataBasis: "serving",
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
    completeness: "partial",
    unknownFields: ["nutrients.fiber", "provenance.revisionDate"],
    logReady: true,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/456/nutrients",
      provider: "usda-fdc",
      providerRecordId: "456",
      attribution: "USDA FoodData Central",
      revisionDate: null,
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
  };
}

function incompleteRemoteFood() {
  const complete = floatingRemoteFood();
  return {
    ...complete,
    nutrients: { ...complete.nutrients, calories: null },
    nutritionBasis: {
      ...complete.nutritionBasis,
      sourceNutrients: { ...complete.nutritionBasis.sourceNutrients, calories: null },
    },
    completeness: "insufficient",
    unknownFields: ["nutrients.calories", "nutrients.fiber", "provenance.revisionDate"],
    logReady: false,
  };
}

function unsafeReferenceRemoteFood() {
  const source = floatingRemoteFood().nutrients;
  return {
    ...floatingRemoteFood(),
    serving: { description: "1 bottle (355 mL)", amount: 355, unit: "ml", grams: null },
    nutrients: source,
    dataBasis: "100g",
    nutritionBasis: {
      kind: "reference-only",
      source: "foodNutrients",
      sourceBasis: "100g",
      sourceQuantity: { amount: 100, unit: "g", dimension: "mass" },
      servingQuantity: { amount: 355, unit: "ml", dimension: "volume" },
      conversionFactor: null,
      sourceNutrients: source,
    },
    completeness: "insufficient",
    unknownFields: [
      "serving.grams",
      "nutrients.fiber",
      "provenance.revisionDate",
      "nutritionBasis.labeledServing",
    ],
    logReady: false,
  };
}

function savingCustomFood(payload) {
  const food = createUserFood(payload.name, payload.nutrients, payload.serving, payload);
  return { status: "added", food };
}

function setup(overrides = {}, { strict = false } = {}) {
  let detected;
  let lifecycleSubscriber;
  const session = { devices: [], stop: jest.fn() };
  const camera = {
    start: jest.fn(async ({ onDetected }) => {
      detected = onDetected;
      return session;
    }),
  };
  const lifecycleAdapter = {
    subscribe: jest.fn((subscriber) => {
      lifecycleSubscriber = subscriber;
      subscriber({ phase: APP_LIFECYCLE_PHASE.ACTIVE });
      return jest.fn();
    }),
  };
  const props = {
    access,
    barcodeLookup: { lookup: jest.fn().mockResolvedValue({ status: "found", food: localFood() }) },
    camera,
    lifecycleAdapter,
    onClose: jest.fn(),
    onUseFood: jest.fn(),
    ...overrides,
  };
  const dialog = <BarcodeScannerDialog {...props} />;
  const view = render(strict ? <StrictMode>{dialog}</StrictMode> : dialog);
  return {
    ...view,
    props,
    session,
    get detected() { return detected; },
    get lifecycleSubscriber() { return lifecycleSubscriber; },
  };
}

test("labels the beta feature and automatically starts the rear camera exactly once", async () => {
  const view = setup();
  expect(screen.getByText("Premium Preview")).toBeInTheDocument();
  expect(screen.getByText(/does not save or upload camera images/i)).toBeInTheDocument();
  await waitFor(() => expect(view.props.camera.start).toHaveBeenCalledWith(
    expect.objectContaining({ facingMode: "environment" })
  ));
  expect(view.props.camera.start).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/camera active/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop Camera" })).toBeEnabled();
  expect(screen.getByRole("dialog")).toHaveAttribute("data-camera-state", "active");
  expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
    /Camera access starts automatically.*does not save or upload camera images/i
  );
});

test("switches cameras and stops the active session before switching", async () => {
  const view = setup();
  await screen.findByText(/camera active/i);
  fireEvent.click(screen.getByRole("button", { name: "Use Front Camera" }));
  expect(view.session.stop).toHaveBeenCalled();
  await waitFor(() => expect(view.props.camera.start).toHaveBeenLastCalledWith(
    expect.objectContaining({ facingMode: "user" })
  ));
});

test("falls back to the front camera when the preferred rear camera is unavailable", async () => {
  const unavailableRear = Object.assign(new Error("rear unavailable"), { name: "NotFoundError" });
  const fallbackSession = { devices: [], stop: jest.fn() };
  const camera = {
    start: jest.fn()
      .mockRejectedValueOnce(unavailableRear)
      .mockResolvedValueOnce(fallbackSession),
  };
  setup({ camera });

  await screen.findByText(/camera active/i);
  expect(camera.start).toHaveBeenCalledTimes(2);
  expect(camera.start.mock.calls[0][0]).toEqual(expect.objectContaining({ facingMode: "environment" }));
  expect(camera.start.mock.calls[1][0]).toEqual(expect.objectContaining({ facingMode: "user" }));
  expect(screen.getByRole("button", { name: "Use Rear Camera" })).toBeEnabled();
});

test("keeps explicit camera-device selection available and stops the obsolete session", async () => {
  const firstSession = {
    devices: [
      { deviceId: "rear-one", label: "Rear Camera 1" },
      { deviceId: "rear-two", label: "Rear Camera 2" },
    ],
    stop: jest.fn(),
  };
  const secondSession = { ...firstSession, stop: jest.fn() };
  const camera = { start: jest.fn().mockResolvedValueOnce(firstSession).mockResolvedValueOnce(secondSession) };
  setup({ camera });

  const selector = await screen.findByLabelText("Camera device");
  fireEvent.change(selector, { target: { value: "rear-two" } });
  await waitFor(() => expect(camera.start).toHaveBeenCalledTimes(2));
  expect(firstSession.stop).toHaveBeenCalledTimes(1);
  expect(camera.start).toHaveBeenLastCalledWith(expect.objectContaining({
    deviceId: "rear-two",
    facingMode: "environment",
  }));
});

test("normalizes manual input, preserves leading zeroes, and blocks duplicate submissions", async () => {
  let resolveLookup;
  const lookup = jest.fn(() => new Promise((resolve) => { resolveLookup = resolve; }));
  setup({ barcodeLookup: { lookup } });
  const input = screen.getByLabelText("Enter barcode manually");

  fireEvent.change(input, { target: { value: "1234" } });
  fireEvent.submit(input.closest("form"));
  expect(lookup).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/not a valid supported GTIN/i);

  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));
  fireEvent.submit(input.closest("form"));
  expect(screen.getByRole("status")).toHaveTextContent("Looking up barcode");
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(lookup).toHaveBeenCalledWith("00012345600012");
  await act(async () => resolveLookup({ status: "found", food: localFood() }));
  expect(await screen.findByRole("article", { name: "Barcode product review" })).toBeInTheDocument();
});

test("stops camera before lookup and ignores repeated decoder detections", async () => {
  const view = setup();
  await screen.findByText(/camera active/i);

  await act(async () => {
    view.detected("00012345600012");
    view.detected("00012345600012");
  });
  expect(view.session.stop).toHaveBeenCalled();
  expect(view.props.barcodeLookup.lookup).toHaveBeenCalledTimes(1);
});

test("shows review nutrients and only populates after explicit confirmation", async () => {
  const onUseFood = jest.fn();
  setup({ onUseFood });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));

  expect(await screen.findByText("Trace Test · Test Cereal")).toBeInTheDocument();
  expect(screen.getByText("0 mg")).toBeInTheDocument();
  expect(screen.getByText(/Unknown or unpublished: Added Sugar/i)).toBeInTheDocument();
  expect(onUseFood).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
  expect(onUseFood).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Cereal" }));
});

test("shows and hands off clean remote nutrient precision without altering the provider basis", async () => {
  const onUseFood = jest.fn();
  setup({
    barcodeLookup: {
      lookup: jest.fn().mockResolvedValue({ status: "found", food: floatingRemoteFood() }),
    },
    onUseFood,
  });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.click(screen.getByRole("button", { name: "Look Up Barcode" }));

  const review = await screen.findByRole("article", { name: "Barcode product review" });
  const reviewContent = within(review);
  expect(reviewContent.getByText("Nutrition shown for 100 g.")).toBeInTheDocument();
  expect(reviewContent.getByText("Servings per container: 1")).toBeInTheDocument();
  expect(review).not.toHaveTextContent(/adapted from|per-100g values/i);
  expect(reviewContent.getByText("113")).toBeInTheDocument();
  expect(reviewContent.getByText("20 g")).toBeInTheDocument();
  expect(reviewContent.getByText("6 g")).toBeInTheDocument();
  expect(reviewContent.getAllByText("3 g")).toHaveLength(2);
  expect(reviewContent.getByText("45 mg")).toBeInTheDocument();
  [
    "112.6666666666671",
    "20.00000000000002",
    "5.999999999999993",
    "3.000000000000003",
    "44.99999999999999",
  ].forEach((tail) => expect(review).not.toHaveTextContent(tail));

  fireEvent.click(screen.getByRole("button", { name: "Use This Food" }));
  const selection = onUseFood.mock.calls[0][0];
  expect(selection.nutrients).toMatchObject({
    calories: 113,
    protein: 20,
    carbohydrates: 6,
    fat: 3,
    sodium: 45,
    totalSugar: 3,
    addedSugar: 0,
  });
  expect(selection.nutrients.fiber).toBeNull();
  expect(selection.remote.nutrients.calories).toBe(112.6666666666671);
  expect(selection.remote.nutrients.protein).toBe(20.00000000000002);
});

test("keeps incomplete products reviewable but disables use", async () => {
  const food = localFood();
  food.nutrients.calories = null;
  setup({
    barcodeLookup: { lookup: jest.fn().mockResolvedValue({ status: "incomplete", food }) },
  });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));

  expect((await screen.findAllByText(/required nutrition is missing/i)).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Use This Food" })).toBeDisabled();
});

test("unsafe reference-only nutrition stays incomplete and recovery leaves label values blank", async () => {
  setup({
    barcodeLookup: {
      lookup: jest.fn().mockResolvedValue({
        status: "incomplete",
        food: unsafeReferenceRemoteFood(),
      }),
    },
  });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));

  const review = await screen.findByRole("article", { name: "Barcode product review" });
  expect(review).toHaveTextContent(/did not supply enough compatible serving data/i);
  expect(within(review).getByRole("button", { name: "Use This Food" })).toBeDisabled();
  fireEvent.click(within(review).getByRole("button", { name: "Complete This Food" }));
  expect(screen.getByLabelText("Calories")).toHaveValue(null);
  expect(screen.getByLabelText("Protein (g)")).toHaveValue(null);
  expect(screen.getByLabelText("Serving unit")).toHaveValue("custom");
  expect(screen.getByLabelText("Custom serving description"))
    .toHaveValue("1 bottle (355 mL)");
  expect(screen.getByLabelText("Serving description (optional)"))
    .toHaveValue("1 bottle (355 mL)");
});

test("not-found recovery creates a reusable barcode food without logging it automatically", async () => {
  const saveUserFood = jest.fn(savingCustomFood);
  const onUseFood = jest.fn();
  setup({
    barcodeLookup: {
      lookup: jest.fn().mockResolvedValue({
        status: "not-found",
        identifier: { scheme: "gtin", value: "00012345600012" },
        food: null,
      }),
    },
    saveUserFood,
    onUseFood,
  });
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Create This Food" }));

  const recoveryForm = screen.getByRole("button", { name: "Save Barcode Food" }).closest("form");
  const recovery = within(recoveryForm);
  expect(recovery.getByText(/Barcode:/).parentElement).toHaveTextContent("00012345600012");
  expect(recovery.getByLabelText("Food name")).toHaveValue("");
  expect(recovery.getByLabelText("Food name")).toHaveAttribute("placeholder", "");
  expect(recovery.getByLabelText("Package quantity (optional)")).toHaveValue("");
  expect(recovery.getByLabelText("Package quantity (optional)"))
    .toHaveAttribute("placeholder", "");
  [...recoveryForm.querySelectorAll("input, textarea")].forEach((control) => {
    expect(control.placeholder).toBe("");
  });

  fireEvent.change(recovery.getByLabelText("Food name"), { target: { value: "My scanned food" } });
  fireEvent.change(recovery.getByLabelText("Calories"), { target: { value: "100" } });
  fireEvent.change(recovery.getByLabelText("Protein (g)"), { target: { value: "5" } });
  fireEvent.change(recovery.getByLabelText("Carbohydrates (g)"), { target: { value: "10" } });
  fireEvent.change(recovery.getByLabelText("Fat (g)"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Barcode Food" }));

  expect(saveUserFood).toHaveBeenCalledWith(expect.objectContaining({
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    name: "My scanned food",
    providerSourceSnapshot: null,
  }));
  expect(onUseFood).not.toHaveBeenCalled();
  expect(await screen.findByText(/Future scans will find it before remote providers/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Use This Food" })).toBeEnabled();
});

test("canceling barcode recovery creates nothing and keeps the recovery action available", async () => {
  const saveUserFood = jest.fn();
  setup({
    barcodeLookup: { lookup: jest.fn().mockResolvedValue({ status: "not-found", food: null }) },
    saveUserFood,
  });
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Create This Food" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(saveUserFood).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Create This Food" })).toBeInTheDocument();
});

test("incomplete remote recovery prefills known values and preserves the full provider source", async () => {
  const saveUserFood = jest.fn(savingCustomFood);
  const providerFood = incompleteRemoteFood();
  setup({
    barcodeLookup: {
      lookup: jest.fn().mockResolvedValue({ status: "incomplete", food: providerFood }),
    },
    saveUserFood,
  });
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Complete This Food" }));

  expect(screen.getByLabelText("Food name")).toHaveValue("Oikos Pro Mixed Berry");
  expect(screen.getByLabelText("Food name")).toHaveAttribute("placeholder", "");
  expect(screen.getByLabelText("Package quantity (optional)")).toHaveValue("5.3 oz cup");
  expect(screen.getByLabelText("Package quantity (optional)"))
    .toHaveAttribute("placeholder", "");
  expect(screen.getByLabelText("Protein (g)")).toHaveValue(20);
  expect(screen.getByLabelText("Calories")).toHaveValue(null);
  expect(screen.getByLabelText("Fiber (g), optional")).toHaveValue(null);
  fireEvent.change(screen.getByLabelText("Calories"), { target: { value: "113" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Barcode Food" }));

  expect(saveUserFood.mock.calls[0][0].providerSourceSnapshot).toEqual(providerFood);
  const saved = saveUserFood.mock.results[0].value.food;
  expect(saved.providerSourceSnapshot.nutrients.protein).toBe(20.00000000000002);
  expect(saved.nutrients.protein).toBe(20);
  expect(Object.isFrozen(saved.providerSourceSnapshot)).toBe(true);
  expect(screen.getByText(/Source: User-completed from USDA FoodData Central/i))
    .toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View source" }))
    .toHaveAttribute("href", providerFood.provenance.sourceUrl);
});

test("invalid barcodes cannot enter recovery while provider failures offer manual creation", async () => {
  const { rerender, props } = setup();
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "bad" } });
  fireEvent.submit(barcode.closest("form"));
  expect(screen.queryByRole("button", { name: /Create This Food/i })).not.toBeInTheDocument();

  props.barcodeLookup.lookup.mockResolvedValueOnce({ status: "unavailable", food: null });
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Create This Food Manually" }));
  const recovery = within(screen.getByRole("button", { name: "Save Barcode Food" }).closest("form"));
  expect(recovery.getByLabelText("Food name")).toHaveValue("");
  expect(recovery.getByLabelText("Food name")).toHaveAttribute("placeholder", "");
  expect(recovery.getByLabelText("Package quantity (optional)")).toHaveValue("");
  expect(recovery.getByLabelText("Package quantity (optional)"))
    .toHaveAttribute("placeholder", "");
  expect(recovery.getByText(/Barcode:/).parentElement).toHaveTextContent("00012345600012");
  expect(rerender).toBeDefined();
});

test("custom barcode review supports edit and confirmed delete", async () => {
  const customFood = createUserFood("Saved scan", nutrientsForCustom(), undefined, {
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
  });
  const updateUserFood = jest.fn((id, payload) => ({
    status: "updated",
    food: { ...createUserFood(payload.name, payload.nutrients, payload.serving, payload), id },
  }));
  const deleteUserFood = jest.fn(() => true);
  setup({
    barcodeLookup: { lookup: jest.fn().mockResolvedValue({ status: "found", food: customFood }) },
    updateUserFood,
    deleteUserFood,
  });
  const barcode = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(barcode, { target: { value: "00012345600012" } });
  fireEvent.submit(barcode.closest("form"));
  fireEvent.click(await screen.findByRole("button", { name: "Edit Custom Food" }));
  expect(screen.getByLabelText("Food name")).toHaveValue("Saved scan");
  expect(screen.getByLabelText("Food name")).toHaveAttribute("placeholder", "");
  fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Updated scan" } });
  fireEvent.click(screen.getByRole("button", { name: "Update Barcode Food" }));
  expect(updateUserFood).toHaveBeenCalledWith(customFood.id, expect.objectContaining({ name: "Updated scan" }));

  fireEvent.click(await screen.findByRole("button", { name: "Delete Custom Food" }));
  expect(deleteUserFood).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Delete Custom Food" }));
  expect(deleteUserFood).toHaveBeenCalledWith(customFood.id);
});

function nutrientsForCustom() {
  return {
    calories: 100,
    protein: 5,
    carbohydrates: 10,
    fat: 4,
    fiber: null,
    sodium: 0,
    totalSugar: 2,
    addedSugar: null,
  };
}

test("stops camera on close, background, Escape, and unmount and restores focus", async () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const view = setup();
  await screen.findByText(/camera active/i);
  act(() => view.lifecycleSubscriber({ phase: APP_LIFECYCLE_PHASE.BACKGROUND }));
  expect(view.session.stop).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await screen.findByText(/camera active/i);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(view.props.onClose).toHaveBeenCalled();
  view.unmount();
  expect(view.session.stop).toHaveBeenCalled();
  expect(opener).toHaveFocus();
  opener.remove();
});

test("the close control stops the camera and restores the exact scroll lock state", async () => {
  Object.defineProperty(window, "scrollX", { configurable: true, value: 17 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 431 });
  document.body.style.position = "relative";
  document.body.style.top = "3px";
  document.body.style.left = "2px";
  document.body.style.right = "4px";
  document.body.style.width = "80%";
  document.body.style.overflow = "clip";
  document.documentElement.style.overflow = "auto";
  document.documentElement.style.overscrollBehavior = "contain";
  const view = setup();

  await screen.findByText(/camera active/i);
  expect(document.body).toHaveStyle({
    left: "-17px",
    overflow: "hidden",
    position: "fixed",
    top: "-431px",
    width: "100%",
  });
  expect(document.documentElement).toHaveStyle({ overflow: "hidden" });
  expect(document.documentElement.style.overscrollBehavior).toBe("none");
  fireEvent.click(screen.getByRole("button", { name: "Close barcode scanner" }));
  expect(view.session.stop).toHaveBeenCalled();
  view.unmount();

  expect(document.body).toHaveStyle({
    left: "2px",
    overflow: "clip",
    position: "relative",
    right: "4px",
    top: "3px",
    width: "80%",
  });
  expect(document.documentElement).toHaveStyle({ overflow: "auto" });
  expect(document.documentElement.style.overscrollBehavior).toBe("contain");
  expect(window.scrollTo).toHaveBeenCalledWith(17, 431);
});

test("Return to Food Search stops the camera and restores scroll and prior focus", async () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const view = setup();
  await screen.findByText(/camera active/i);

  fireEvent.click(screen.getByRole("button", { name: "Return to Food Search" }));
  expect(view.props.onClose).toHaveBeenCalledTimes(1);
  expect(view.session.stop).toHaveBeenCalled();
  view.unmount();
  expect(window.scrollTo).toHaveBeenCalled();
  expect(opener).toHaveFocus();
  opener.remove();
});

test("locks background scrolling only while the scanner is mounted", () => {
  const view = setup();
  expect(document.body).toHaveStyle({ overflow: "hidden", position: "fixed" });
  expect(document.documentElement).toHaveStyle({ overflow: "hidden" });
  expect(document.documentElement.style.overscrollBehavior).toBe("none");
  expect(screen.getByRole("dialog").querySelector(".trace-barcode-dialog__content"))
    .toHaveAttribute("data-scroll-container", "internal");
  view.unmount();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
  expect(document.documentElement.style.overscrollBehavior).toBe("");
});

test("stops camera on the suspending lifecycle phase", async () => {
  const view = setup();
  await screen.findByText(/camera active/i);
  act(() => view.lifecycleSubscriber({ phase: APP_LIFECYCLE_PHASE.SUSPENDING }));
  expect(view.session.stop).toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/stopped while Trace was in the background/i);
});

test("keeps manual entry available after a recoverable camera failure", async () => {
  const denied = Object.assign(new Error("private browser detail"), { name: "NotAllowedError" });
  const camera = { start: jest.fn().mockRejectedValue(denied) };
  setup({ camera });
  expect(await screen.findByRole("alert")).toHaveTextContent(/permission was denied/i);
  expect(camera.start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Start Camera" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Use Front Camera" })).toBeEnabled();
  expect(screen.getByLabelText("Enter barcode manually")).toBeEnabled();
  expect(screen.getByRole("button", { name: "Return to Food Search" })).toBeEnabled();
  expect(screen.queryByText(/private browser detail/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await waitFor(() => expect(camera.start).toHaveBeenCalledTimes(2));
});

test("camera failure keeps scroll containment until the dialog is dismissed", async () => {
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const view = setup({ camera: { start: jest.fn().mockRejectedValue(denied) } });
  await screen.findByRole("alert");
  expect(document.body).toHaveStyle({ overflow: "hidden", position: "fixed" });
  fireEvent.click(screen.getByRole("button", { name: "Return to Food Search" }));
  view.unmount();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");
});

test("an explicitly stopped camera retains the accessible privacy explanation", async () => {
  setup();
  await screen.findByText(/camera active/i);
  fireEvent.click(screen.getByRole("button", { name: "Stop Camera" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("data-camera-state", "idle");
  expect(screen.getByText(/Camera access starts automatically/i)).toBeInTheDocument();
  expect(dialog).toHaveAccessibleDescription(/does not save or upload camera images/i);
});

test("inactive and error states retain the accessible camera privacy explanation", async () => {
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  setup({ camera: { start: jest.fn().mockRejectedValue(denied) } });
  await screen.findByRole("alert");
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("data-camera-state", "idle");
  expect(screen.getByText(/Camera access starts automatically/i)).toBeInTheDocument();
  expect(dialog).toHaveAccessibleDescription(
    /Camera access starts automatically.*does not save or upload camera images/i
  );
});

test("keeps manual entry available when camera APIs are missing", async () => {
  const unsupported = Object.assign(new Error("Camera API detail"), {
    code: "unsupported",
    message: "This browser does not provide camera access. Enter the barcode manually instead.",
  });
  setup({ camera: { start: jest.fn().mockRejectedValue(unsupported) } });
  expect(await screen.findByRole("alert")).toHaveTextContent(/does not provide camera access/i);
  expect(screen.getByLabelText("Enter barcode manually")).toBeEnabled();
});

test("stops an active camera when the dialog unmounts", async () => {
  const view = setup();
  await screen.findByText(/camera active/i);
  view.unmount();
  expect(view.session.stop).toHaveBeenCalled();
});

test("traps keyboard focus within the dialog", () => {
  setup();
  const closeButton = screen.getByRole("button", { name: "Close barcode scanner" });
  const returnButton = screen.getByRole("button", { name: "Return to Food Search" });
  expect(closeButton).toHaveFocus();

  returnButton.focus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
  expect(closeButton).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
  expect(returnButton).toHaveFocus();
});

test.each([
  ["not-found", /No matching product/i],
  ["offline", /Trace is offline/i],
  ["rate-limited", /temporarily busy/i],
  ["unavailable", /temporarily unavailable/i],
  ["unconfigured", /not configured here/i],
])("renders the %s lookup state", async (status, expected) => {
  setup({ barcodeLookup: { lookup: jest.fn().mockResolvedValue({ status, food: null }) } });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));
  expect(await screen.findByRole("alert")).toHaveTextContent(expected);
});

test("missing or rejected orientation locking does not block camera startup", async () => {
  const withoutOrientation = setup({ orientation: null });
  await screen.findByText(/camera active/i);
  expect(withoutOrientation.props.camera.start).toHaveBeenCalledTimes(1);
  withoutOrientation.unmount();

  const rejectedOrientation = {
    lock: jest.fn().mockRejectedValue(new Error("unsupported lock")),
    unlock: jest.fn(),
  };
  const rejected = setup({ orientation: rejectedOrientation });
  await screen.findByText(/camera active/i);
  await waitFor(() => expect(rejectedOrientation.lock).toHaveBeenCalledWith("portrait"));
  expect(rejected.props.camera.start).toHaveBeenCalledTimes(1);
  rejected.unmount();
  expect(rejectedOrientation.unlock).not.toHaveBeenCalled();
});

test("releases a successfully acquired best-effort orientation lock", async () => {
  const orientation = {
    lock: jest.fn().mockResolvedValue(undefined),
    unlock: jest.fn(),
  };
  const view = setup({ orientation });
  await waitFor(() => expect(orientation.lock).toHaveBeenCalledWith("portrait"));
  await act(async () => {});
  view.unmount();
  expect(orientation.unlock).toHaveBeenCalledTimes(1);
});

test("viewport and orientation changes preserve the selected camera without restarting it", async () => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  const view = setup();
  await screen.findByText(/camera active/i);
  fireEvent.click(screen.getByRole("button", { name: "Use Front Camera" }));
  await waitFor(() => expect(view.props.camera.start).toHaveBeenCalledTimes(2));
  await screen.findByText(/camera active/i);
  expect(screen.getByRole("button", { name: "Use Rear Camera" })).toBeEnabled();
  const content = screen.getByRole("dialog").querySelector(".trace-barcode-dialog__content");
  content.scrollTop = 140;

  act(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
  });
  expect(view.props.camera.start).toHaveBeenCalledTimes(2);
  expect(content.scrollTop).toBe(0);
  expect(screen.getByRole("dialog").querySelector("[data-camera-facing]"))
    .toHaveAttribute("data-camera-facing", "user");
});

test("marks the dialog for safe-area and responsive orientation layout and honors reduced motion", () => {
  setup({ reducedMotion: true });
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("data-mobile-safe", "true");
  expect(dialog).toHaveAttribute("data-safe-area", "top-and-bottom");
  expect(dialog).toHaveAttribute("data-orientation-layout", "responsive");
  expect(dialog).toHaveClass("trace-barcode-dialog--reduced-motion");
  expect(dialog.querySelector(".trace-barcode-dialog__content")).toBeInTheDocument();
  expect(dialog.querySelector(".trace-barcode-dialog__footer")).toBeInTheDocument();
  const preview = dialog.querySelector(".trace-barcode-dialog__preview");
  const returnButton = screen.getByRole("button", { name: "Return to Food Search" });
  expect(preview).not.toContainElement(returnButton);
  expect(returnButton.closest("footer")).toHaveClass("trace-barcode-dialog__footer");
});

test("React Strict Mode effect replay and rerender do not duplicate automatic startup", async () => {
  const view = setup({}, { strict: true });
  await screen.findByText(/camera active/i);
  expect(view.props.camera.start).toHaveBeenCalledTimes(1);
  view.rerender(
    <StrictMode><BarcodeScannerDialog {...view.props} /></StrictMode>
  );
  await waitFor(() => expect(screen.getByText(/camera active/i)).toBeInTheDocument());
  expect(view.props.camera.start).toHaveBeenCalledTimes(1);
});
