/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionListEditor } from "../ConditionListEditor";

const ops = ["eq", "ne", "gt", "gte", "lt", "lte", "contains", "isNull", "isNotNull", "in"];

describe("ConditionListEditor", () => {
  it("renders empty state and adds a row", () => {
    const onChange = jest.fn();
    render(<ConditionListEditor value={[]} onChange={onChange} ops={ops} columns={["Age", "Country"]} />);
    fireEvent.click(screen.getByRole("button", { name: /add condition/i }));
    expect(onChange).toHaveBeenCalledWith([{ column: "Age", op: "eq", value: "" }]);
  });

  it("removes a row", () => {
    const onChange = jest.fn();
    render(
      <ConditionListEditor
        value={[{ column: "Age", op: "eq", value: 1 }]}
        onChange={onChange}
        ops={ops}
        columns={["Age"]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove condition 1/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("hides the value input for isNull/isNotNull", () => {
    const onChange = jest.fn();
    render(
      <ConditionListEditor
        value={[{ column: "Age", op: "isNull" }]}
        onChange={onChange}
        ops={ops}
        columns={["Age"]}
      />,
    );
    expect(screen.queryByLabelText(/value/i)).not.toBeInTheDocument();
  });
});
