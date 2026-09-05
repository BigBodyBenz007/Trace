import { render, screen, within } from "@testing-library/react";
import PrivacyPolicyPage from "./PrivacyPolicyPage";
import TermsOfServicePage from "./TermsOfServicePage";

test("Privacy Policy exposes the audited local, camera, barcode, backup, retention, and deletion facts", () => {
  render(<PrivacyPolicyPage onBackToSettings={jest.fn()} />);

  const main = screen.getByRole("main");
  expect(main).toHaveClass("trace-feature-page--legal");
  expect(within(main).getByRole("heading", { level: 1, name: "Trace Privacy Policy" })).toBeInTheDocument();
  expect(within(main).getAllByText("September 5, 2026", { selector: "dd" })).toHaveLength(2);
  expect(within(main).getAllByText(/Benjamin J\. Martin/).length).toBeGreaterThan(0);
  expect(within(main).getByText(/no user accounts or cloud synchronization/i)).toBeInTheDocument();
  expect(within(main).getByText(/browser local storage/i)).toBeInTheDocument();
  expect(within(main).getByText(/IndexedDB database/i)).toBeInTheDocument();
  expect(within(main).getByText(/Journal Lock is optional and applies only/i)).toBeInTheDocument();
  expect(within(main).getByText(/does not save or upload those camera images or video frames/i)).toBeInTheDocument();
  expect(within(main).getByText(/UPC, EAN, or GTIN barcode/i)).toBeInTheDocument();
  expect(within(main).getByText(/USDA FoodData Central first/i)).toBeInTheDocument();
  expect(within(main).getByText(/Open Food Facts when necessary/i)).toBeInTheDocument();
  expect(within(main).getByText(/currently Vercel/i)).toBeInTheDocument();
  expect(within(main).getByText(/does not currently use analytics, targeted advertising/i)).toBeInTheDocument();
  expect(within(main).getByText(/backup files use schema validation and SHA-256 integrity digests/i)).toBeInTheDocument();
  expect(within(main).getByText(/replaces—not merges—the current durable Trace data/i)).toBeInTheDocument();
  expect(within(main).getByText(/single in-app button that erases every data domain/i)).toBeInTheDocument();
  expect(within(main).getByText(/not directed to children under 13/i)).toBeInTheDocument();
  expect(within(main).getByRole("link", { name: "USDA FoodData Central" })).toHaveAttribute("href", "https://fdc.nal.usda.gov/");
  expect(within(main).getByRole("link", { name: "Open Food Facts" })).toHaveAttribute("href", "https://world.openfoodfacts.org/");
  expect(within(main).getAllByRole("link", { name: "traceappsupporthelp@gmail.com" })[0])
    .toHaveAttribute("href", "mailto:traceappsupporthelp@gmail.com");
  expect(within(main).getAllByRole("button", { name: "Back to Settings" })).toHaveLength(2);
  expect(within(main).getByRole("article")).toHaveAttribute("aria-labelledby", "privacy-title");
});

test("Terms provide the required medical, accuracy, eligibility, and Oklahoma provisions without prohibited claims", () => {
  render(<TermsOfServicePage onBackToSettings={jest.fn()} />);

  const main = screen.getByRole("main");
  expect(within(main).getByRole("heading", { level: 1, name: "Trace Terms of Service" })).toBeInTheDocument();
  expect(within(main).getAllByText("September 5, 2026", { selector: "dd" })).toHaveLength(2);
  expect(within(main).getByText(/must be at least 13 years old/i)).toBeInTheDocument();
  expect(within(main).getByText(/permission from a parent or legal guardian/i)).toBeInTheDocument();
  expect(within(main).getByText(/Trace is not a medical device/i)).toBeInTheDocument();
  expect(within(main).getByText(/does not provide medical advice, diagnosis, emergency services, prescribing/i)).toBeInTheDocument();
  expect(within(main).getByText(/Consult a qualified healthcare professional/i)).toBeInTheDocument();
  expect(within(main).getByText(/not prescriptions or dosage recommendations/i)).toBeInTheDocument();
  expect(within(main).getByText(/Nutrition data, barcode-provider records, calorie-burn ranges/i)).toBeInTheDocument();
  expect(within(main).getByText(/call emergency services immediately/i)).toBeInTheDocument();
  expect(within(main).getByText(/laws of Oklahoma, United States/i)).toBeInTheDocument();
  expect(within(main).getByText(/do not require arbitration/i)).toBeInTheDocument();
  expect(within(main).getAllByRole("link", { name: "traceappsupporthelp@gmail.com" })[0])
    .toHaveAttribute("href", "mailto:traceappsupporthelp@gmail.com");

  const text = main.textContent;
  expect(text).not.toMatch(/HIPAA[- ]compliant/i);
  expect(text).not.toMatch(/FDA[- ]approved/i);
  expect(text).not.toMatch(/FDA clearance/i);
  expect(text).not.toMatch(/guaranteed accuracy/i);
  expect(text).not.toMatch(/guaranteed availability/i);
  expect(text).not.toMatch(/guaranteed security/i);
});

test("the legal material keeps its responsive page structure at iPhone width", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  try {
    render(<PrivacyPolicyPage onBackToSettings={jest.fn()} />);
    expect(screen.getByRole("main")).toHaveClass("trace-feature-page--legal");
    expect(screen.getByRole("article")).toHaveClass("trace-legal-document");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(screen.getAllByRole("button", { name: "Back to Settings" })).toHaveLength(2);
  } finally {
    if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
  }
});
