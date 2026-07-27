/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { ConfigField } from "@training-ml/contracts";
import { BlockConfigForm } from "../BlockConfigForm";

const fields: ConfigField[] = [
  { type: "ConditionList", id: "conditions", ops: ["eq", "isNull"] },
  { type: "Expression", id: "expression" },
  { type: "Text", id: "outputColumn" },
];

const mockGetNodeErrors = jest.fn().mockReturnValue([]);

jest.mock("../../contexts/validation.context", () => ({
  useValidationContext: () => ({
    contracts: {},
    inputContracts: {},
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
    expect(screen.getByText("expression")).toBeInTheDocument();
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
