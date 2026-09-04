import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import BarcodeScannerDialog from "./BarcodeScannerDialog";
import { APP_LIFECYCLE_PHASE } from "../services/appLifecycleAdapter";

const access = {
  available: true,
  label: "Premium Preview",
  message: "Barcode scanning is available during Trace beta as a Premium Preview.",
};

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
    dataBasis: "100g",
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

test("labels the beta feature and waits for explicit camera activation", async () => {
  const view = setup();
  expect(screen.getByText("Premium Preview")).toBeInTheDocument();
  expect(screen.getByText(/does not save or upload camera images/i)).toBeInTheDocument();
  expect(view.props.camera.start).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await waitFor(() => expect(view.props.camera.start).toHaveBeenCalledWith(
    expect.objectContaining({ facingMode: "environment" })
  ));
  expect(screen.getByText(/camera active/i)).toBeInTheDocument();
});

test("switches cameras and stops the active session before switching", async () => {
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await screen.findByText(/camera active/i);
  fireEvent.click(screen.getByRole("button", { name: "Use Front Camera" }));
  expect(view.session.stop).toHaveBeenCalled();
  await waitFor(() => expect(view.props.camera.start).toHaveBeenLastCalledWith(
    expect.objectContaining({ facingMode: "user" })
  ));
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
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
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

test("stops camera on close, background, Escape, and unmount and restores focus", async () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
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

test("stops camera on the suspending lifecycle phase", async () => {
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await screen.findByText(/camera active/i);
  act(() => view.lifecycleSubscriber({ phase: APP_LIFECYCLE_PHASE.SUSPENDING }));
  expect(view.session.stop).toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/stopped while Trace was in the background/i);
});

test("keeps manual entry available after a recoverable camera failure", async () => {
  const denied = Object.assign(new Error("private browser detail"), { name: "NotAllowedError" });
  setup({ camera: { start: jest.fn().mockRejectedValue(denied) } });
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/permission was denied/i);
  expect(screen.getByLabelText("Enter barcode manually")).toBeEnabled();
  expect(screen.queryByText(/private browser detail/i)).not.toBeInTheDocument();
});

test("keeps manual entry available when camera APIs are missing", async () => {
  const unsupported = Object.assign(new Error("Camera API detail"), {
    code: "unsupported",
    message: "This browser does not provide camera access. Enter the barcode manually instead.",
  });
  setup({ camera: { start: jest.fn().mockRejectedValue(unsupported) } });
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/does not provide camera access/i);
  expect(screen.getByLabelText("Enter barcode manually")).toBeEnabled();
});

test("stops an active camera when the dialog unmounts", async () => {
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Start Camera" }));
  await screen.findByText(/camera active/i);
  view.unmount();
  expect(view.session.stop).toHaveBeenCalled();
});

test("traps keyboard focus within the dialog", () => {
  setup();
  const closeButton = screen.getByRole("button", { name: "Close barcode scanner" });
  const manualInput = screen.getByLabelText("Enter barcode manually");
  expect(closeButton).toHaveFocus();

  manualInput.focus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
  expect(closeButton).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
  expect(manualInput).toHaveFocus();
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

test("marks the dialog as mobile-safe and honors reduced motion", () => {
  setup({ reducedMotion: true });
  expect(screen.getByRole("dialog")).toHaveAttribute("data-mobile-safe", "true");
  expect(screen.getByRole("dialog")).toHaveClass("trace-barcode-dialog--reduced-motion");
});

test("remains usable after React Strict Mode effect replay", async () => {
  const view = setup({}, { strict: true });
  const input = screen.getByLabelText("Enter barcode manually");
  fireEvent.change(input, { target: { value: "00012345600012" } });
  fireEvent.submit(input.closest("form"));
  expect(await screen.findByRole("article", { name: "Barcode product review" })).toBeInTheDocument();
  expect(view.props.barcodeLookup.lookup).toHaveBeenCalledTimes(1);
});
