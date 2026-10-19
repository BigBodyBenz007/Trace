import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BarcodeIngredients from "./BarcodeIngredients";

const text = "  Farine de blé (67,4%), lait;\n sel.  ";
const attribution = "Open Food Facts contributors; database licensed under ODbL";

test("starts collapsed and toggles with the keyboard while preserving original text and metadata", () => {
  render(<BarcodeIngredients ingredients={{ text, language: "fr" }} attribution={attribution} />);
  const toggle = screen.getByRole("button", { name: "Ingredients" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("region", { name: "Ingredient text" })).not.toBeInTheDocument();
  userEvent.tab();
  expect(toggle).toHaveFocus();
  userEvent.keyboard("{Enter}");
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  const ingredients = screen.getByRole("region", { name: "Ingredient text" });
  expect(ingredients.textContent).toBe(text);
  expect(ingredients).toHaveAttribute("lang", "fr");
  expect(screen.getByText(`Source: ${attribution}`)).toBeVisible();
  expect(screen.getByText("Language: fr")).toBeVisible();
  userEvent.keyboard(" ");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("region", { name: "Ingredient text" })).not.toBeInTheDocument();
});

test.each([undefined, null, { text: null, language: null }, { text: " \n " }])(
  "legacy or unavailable ingredient data %p shows an honest unavailable message",
  (ingredients) => {
    render(<BarcodeIngredients ingredients={ingredients} attribution="USDA FoodData Central" />);
    fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
    expect(screen.getByText("Ingredient information unavailable.")).toBeVisible();
    expect(screen.getByText("Source: USDA FoodData Central")).toBeVisible();
    expect(screen.queryByText(/Language:/)).not.toBeInTheDocument();
  }
);

test("unknown language is omitted and long or HTML-looking text stays plain and unchanged", () => {
  const original = `${"Ingredient-with-a-long-unbroken-name".repeat(90)}\n<img src=x onerror=alert(1)>`;
  render(<BarcodeIngredients ingredients={{ text: original, language: null }} attribution="USDA FoodData Central" />);
  fireEvent.click(screen.getByRole("button", { name: "Ingredients" }));
  const ingredients = screen.getByRole("region", { name: "Ingredient text" });
  expect(ingredients.textContent).toBe(original);
  expect(ingredients).toHaveAttribute("tabindex", "0");
  expect(ingredients).not.toHaveAttribute("lang");
  expect(screen.queryByText(/Language:/)).not.toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
