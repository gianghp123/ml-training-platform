/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import BaseNode from "../nodes/BaseNode";
import { ReactFlowProvider } from "@xyflow/react";

jest.mock("../../contexts/builder.context", () => ({
  useBuilderContext: () => ({
    blocks: [],
    datasets: [],
    isLocked: false,
    onConfigChange: jest.fn(),
  }),
}));

jest.mock("../../contexts/validation.context", () => ({
  useValidationContext: () => ({
    contracts: {},
    inputContracts: {},
    getNodeErrors: jest.fn().mockReturnValue([]),
    isValid: true,
  }),
}));

function renderWithProviders(ui: React.ReactNode) {
  return render(<ReactFlowProvider><TooltipProvider>{ui}</TooltipProvider></ReactFlowProvider>);
}

const makeNode = (
  inputs: Array<{ id: string; artifact: string; optional?: boolean }>,
) => ({
  id: "n1",
  data: {
    blockId: "feature_union",
    blockName: "Feature Union",
    categoryId: "Preprocessing",
    block: {
      ports: {
        inputs,
        outputs: [{ id: "dataset", artifact: "Dataset" }],
      },
    },
    inputs,
    outputs: [{ id: "dataset", artifact: "Dataset" }],
    config: {},
    status: "idle",
  } as any,
});

describe("BaseNode optional port styling", () => {
  it("renders a dashed ring on optional input handles", () => {
    const node = makeNode([
      { id: "datasetA", artifact: "Dataset" },
      { id: "datasetC", artifact: "Dataset", optional: true },
    ]);
    const { container } = renderWithProviders(<BaseNode {...(node as any)} />);
    const optionalHandle = container.querySelector('[data-handleid="datasetC"]');
    expect(optionalHandle?.getAttribute("class") ?? "").toMatch(/dashed|dotted/);
  });

  it("does not add dashed class to non-optional handles", () => {
    const node = makeNode([
      { id: "datasetA", artifact: "Dataset" },
      { id: "datasetC", artifact: "Dataset", optional: true },
    ]);
    const { container } = renderWithProviders(<BaseNode {...(node as any)} />);
    const requiredHandle = container.querySelector('[data-handleid="datasetA"]');
    expect(requiredHandle?.getAttribute("class") ?? "").not.toMatch(/dashed|dotted/);
  });

  it("shows optional indicator in tooltip label", () => {
    const node = makeNode([
      { id: "datasetC", artifact: "Dataset", optional: true },
    ]);
    const { container } = renderWithProviders(<BaseNode {...(node as any)} />);
    const label = container.querySelector(".text-muted-foreground");
    expect(label).toBeInTheDocument();
    expect(label?.textContent).toMatch(/optional/i);
  });
});
