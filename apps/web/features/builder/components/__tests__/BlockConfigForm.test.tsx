/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { ConfigField } from "@training-ml/contracts";
import { BlockConfigForm } from "../BlockConfigForm";

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

const fields: ConfigField[] = [
  { type: "ConditionList", id: "conditions", ops: ["eq", "isNull"] },
  { type: "Expression", id: "expression" },
  { type: "Text", id: "outputColumn" },
];

const mockGetNodeErrors = jest.fn().mockReturnValue([]);
const mockInputContracts: Record<string, unknown> = {};

jest.mock("../../contexts/validation.context", () => ({
  useValidationContext: () => ({
    contracts: {},
    inputContracts: mockInputContracts,
    getNodeErrors: mockGetNodeErrors,
  }),
}));

describe("BlockConfigForm renders new field types", () => {
  it("renders ConditionList and Expression fields", () => {
    render(
      <BlockConfigForm
        nodeId="n1"
        fields={fields}
        values={{}}
        onChange={() => {}}
        datasets={[]}
      />,
    );
    expect(screen.getByText("conditions")).toBeInTheDocument();
    expect(screen.getAllByText("expression").length).toBeGreaterThan(0);
    expect(screen.getByText("outputColumn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add condition/i })).toBeInTheDocument();
  });
});

describe("BlockConfigForm surfaces expression errors", () => {
  it("shows an error message under the expression field", () => {
    mockGetNodeErrors.mockReturnValue([
      {
        nodeId: "n1",
        scope: "config",
        fieldId: "expression",
        code: "EXPRESSION_PARSE_ERROR",
        severity: "error",
        message: "Unexpected end",
        context: { position: 5 },
      },
    ]);
    render(
      <BlockConfigForm
        nodeId="n1"
        fields={[{ type: "Expression", id: "expression" }]}
        values={{}}
        onChange={() => {}}
        datasets={[]}
      />,
    );
    expect(screen.getByText("Unexpected end")).toBeInTheDocument();
  });
});

describe("BlockConfigForm with ColumnSelector and Expression", () => {
  beforeEach(() => {
    mockInputContracts["n2"] = {
      dataset: {
        artifact: "Dataset",
        schema: {
          columns: [{ name: "Age" }, { name: "Income" }, { name: "Score" }],
        },
      },
    };
  });

  afterEach(() => {
    delete mockInputContracts["n2"];
  });

  it("renders column checkboxes and expression input", () => {
    render(
      <BlockConfigForm
        nodeId="n2"
        fields={[
          { id: "columns", type: "ColumnSelector", multiple: true },
          { id: "expression", type: "Expression" },
        ]}
        values={{ columns: "Age,Income" }}
        onChange={() => {}}
        datasets={[]}
      />,
    );

    expect(screen.getAllByText("Age").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Income").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Score").length).toBeGreaterThan(0);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    expect(
      screen.getByPlaceholderText("e.g. Income / (Age + 1)"),
    ).toBeInTheDocument();
  });
});
