import { fireEvent, render, screen } from "@testing-library/react";
import CompoundSearch from "./CompoundSearch";
import { createCompoundDefinition } from "../services/compoundCatalog";

function compound(defaultDoseAmount = "") {
  return createCompoundDefinition({
    name: "SS-31",
    defaultDoseAmount,
    doseUnit: "mg",
    route: "subcutaneous",
  });
}

test("searches saved compounds and selects a result", () => {
  const onSelectCompound = jest.fn();
  const savedCompound = compound("3.5");
  render(
    <CompoundSearch
      compounds={[savedCompound]}
      onSelectCompound={onSelectCompound}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );

  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "ss-31" },
  });

  expect(
    screen.getByText("Saved defaults: 3.5 mg · Subcutaneous (SC)")
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select SS-31" }));
  expect(onSelectCompound).toHaveBeenCalledWith(savedCompound);
});

test("shows a blank saved amount without supplying one", () => {
  render(
    <CompoundSearch
      compounds={[compound()]}
      onSelectCompound={jest.fn()}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "SS" },
  });

  expect(
    screen.getByText("Saved defaults: No amount mg · Subcutaneous (SC)")
  ).toBeInTheDocument();
});

test("clears query and results when resetKey changes", () => {
  const { rerender } = render(
    <CompoundSearch
      compounds={[compound()]}
      onSelectCompound={jest.fn()}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );
  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "SS" },
  });

  rerender(
    <CompoundSearch
      compounds={[compound()]}
      onSelectCompound={jest.fn()}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={1}
    />
  );

  expect(screen.getByLabelText("Saved compound search")).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Select SS-31" })
  ).not.toBeInTheDocument();
});

test("offers an explicit saved-compound edit action", () => {
  const onEditCompound = jest.fn();
  const savedCompound = compound();
  render(
    <CompoundSearch
      compounds={[savedCompound]}
      onSelectCompound={jest.fn()}
      onEditCompound={onEditCompound}
      inputStyle={{}}
      resetKey={0}
    />
  );

  fireEvent.change(screen.getByLabelText("Saved compound search"), {
    target: { value: "SS" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Edit saved compound SS-31" })
  );

  expect(onEditCompound).toHaveBeenCalledWith(savedCompound);
});
