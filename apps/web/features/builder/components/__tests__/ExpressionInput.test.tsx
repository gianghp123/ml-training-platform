/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpressionInput } from "../ExpressionInput";

describe("ExpressionInput", () => {
  it("renders as a textarea with line numbers", () => {
    render(<ExpressionInput value={"Age +\n  1"} onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
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

  it("clicking a column chip inserts the column name at the cursor", () => {
    const onChange = jest.fn();
    render(<ExpressionInput value="Age +" onChange={onChange} columns={["Income", "Score"]} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;
    fireEvent.click(screen.getByText("Income"));
    expect(onChange).toHaveBeenCalledWith("Age + Income");
  });

  it("does not render column chip row when columns is empty", () => {
    render(<ExpressionInput value="Age +" onChange={() => {}} columns={[]} />);
    expect(screen.queryByText("Insert:")).not.toBeInTheDocument();
  });

  it("does not render column chip row when columns is undefined", () => {
    render(<ExpressionInput value="Age +" onChange={() => {}} />);
    expect(screen.queryByText("Insert:")).not.toBeInTheDocument();
  });

  it("Tab key inserts spaces instead of changing focus", () => {
    const onChange = jest.fn();
    render(<ExpressionInput value="Age" onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    textarea.selectionStart = 3;
    textarea.selectionEnd = 3;
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(onChange).toHaveBeenCalledWith("Age  ");
    expect(document.activeElement).toBe(textarea);
  });

  it("applies a monospace dark chrome", () => {
    render(<ExpressionInput value="Age + 1" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toMatch(/mono|font-mono/);
    expect(textarea.closest(".bg-zinc-950")).toBeInTheDocument();
  });
});
