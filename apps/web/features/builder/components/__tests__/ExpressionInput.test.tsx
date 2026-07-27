/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpressionInput } from "../ExpressionInput";

describe("ExpressionInput", () => {
  it("renders the expression in a monospace input", () => {
    render(<ExpressionInput value="Age + 1" onChange={() => {}} />);
    const input = screen.getByDisplayValue("Age + 1");
    expect(input.tagName).toBe("INPUT");
    expect(input.className).toMatch(/mono|font-mono/);
  });

  it("emits onChange as the user types", () => {
    const onChange = jest.fn();
    render(<ExpressionInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Income / Age" } });
    expect(onChange).toHaveBeenCalledWith("Income / Age");
  });

  it("shows an error message when provided", () => {
    render(<ExpressionInput value="Age +" onChange={() => {}} error="Unexpected end" />);
    expect(screen.getByText("Unexpected end")).toBeInTheDocument();
  });
});
