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

  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "ss-31" },
  });

  expect(
    screen.getByText("Saved defaults: 3.5 mg · Subcutaneous (SC)")
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select saved compound SS-31" }));
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
  fireEvent.change(screen.getByLabelText("Compound search"), {
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
  fireEvent.change(screen.getByLabelText("Compound search"), {
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

  expect(screen.getByLabelText("Compound search")).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Select saved compound SS-31" })
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

  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "SS" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Edit saved compound SS-31" })
  );

  expect(onEditCompound).toHaveBeenCalledWith(savedCompound);
});

test("shows saved and same-name Trace results as distinct saved-first groups", () => {
  const savedRetatrutide = createCompoundDefinition({
    name: "Retatrutide",
    defaultDoseAmount: "3.5",
    doseUnit: "mg",
    route: "subcutaneous",
  });
  render(
    <CompoundSearch
      compounds={[savedRetatrutide]}
      onSelectCompound={jest.fn()}
      onSelectBuiltInCompound={jest.fn()}
      onUseCustomCompound={jest.fn()}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );

  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "Retatrutide" },
  });

  const savedGroup = screen.getByRole("region", { name: "Your Saved Compounds" });
  const traceGroup = screen.getByRole("region", { name: "Trace Compound Database" });
  expect(savedGroup).toHaveTextContent("Saved Compound");
  expect(savedGroup).toHaveTextContent("Retatrutide");
  expect(traceGroup).toHaveTextContent("Trace Database");
  expect(traceGroup).toHaveTextContent("Retatrutide");
  expect(savedGroup.compareDocumentPosition(traceGroup)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING
  );
});

test("renders built-in category and alias explanation without logging guidance", () => {
  const onSelectBuiltInCompound = jest.fn();
  render(
    <CompoundSearch
      compounds={[]}
      onSelectCompound={jest.fn()}
      onSelectBuiltInCompound={onSelectBuiltInCompound}
      onUseCustomCompound={jest.fn()}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "LY3437943" },
  });

  const traceGroup = screen.getByRole("region", { name: "Trace Compound Database" });
  expect(traceGroup).toHaveTextContent("Retatrutide");
  expect(traceGroup).toHaveTextContent("Peptide");
  expect(traceGroup).toHaveTextContent("Matched alias: LY3437943");
  expect(traceGroup).not.toHaveTextContent(/dose|route|schedule|frequency|cycle|stack/i);
  fireEvent.click(
    screen.getByRole("button", { name: "Select Trace compound Retatrutide" })
  );
  expect(onSelectBuiltInCompound).toHaveBeenCalledWith(
    expect.objectContaining({ id: "trace:compound:retatrutide" })
  );
});

test("always offers custom continuation for meaningful queries, including aliases with matches", () => {
  const onUseCustomCompound = jest.fn();
  render(
    <CompoundSearch
      compounds={[]}
      onSelectCompound={jest.fn()}
      onSelectBuiltInCompound={jest.fn()}
      onUseCustomCompound={onUseCustomCompound}
      onEditCompound={jest.fn()}
      inputStyle={{}}
      resetKey={0}
    />
  );
  fireEvent.change(screen.getByLabelText("Compound search"), {
    target: { value: "  LY3437943  " },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Use “LY3437943” as Custom Compound",
    })
  );
  expect(onUseCustomCompound).toHaveBeenCalledWith("LY3437943");
});
