from __future__ import annotations

import ast
from typing import Any

import numpy as np
import pandas as pd

from ..runtime import BlockExecutionError


WHITELIST_FUNCTIONS: dict[str, tuple[int, int]] = {
    "abs": (1, 1),
    "round": (1, 2),
    "min": (2, 2),
    "max": (2, 2),
    "log": (1, 1),
    "log2": (1, 1),
    "log10": (1, 1),
    "sqrt": (1, 1),
    "pow": (2, 2),
    "clip": (3, 3),
}

_ALLOWED_BINOPS: tuple[type[ast.operator], ...] = (
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.FloorDiv, ast.Pow,
)
_ALLOWED_UNARYOPS: tuple[type[ast.unaryop], ...] = (ast.UAdd, ast.USub)
_ALLOWED_COMPARATORS: tuple[type[ast.cmpop], ...] = (
    ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
)


class ExpressionError(BlockExecutionError):
    pass


def _arity_text(arity: tuple[int, int]) -> str:
    return str(arity[0]) if arity[0] == arity[1] else f"{arity[0]}-{arity[1]}"


def _validate_tree(tree: ast.Expression) -> None:
    for node in ast.walk(tree):
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitXor):
            raise ExpressionError(
                "Operator '^' is not supported. Did you mean '**'?"
            )
        if isinstance(node, ast.BinOp):
            if not isinstance(node.op, _ALLOWED_BINOPS):
                raise ExpressionError(
                    f"Operator '{type(node.op).__name__}' is not supported."
                )
        elif isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, _ALLOWED_UNARYOPS):
                raise ExpressionError(
                    f"Unary operator '{type(node.op).__name__}' is not supported."
                )
        elif isinstance(node, ast.Compare):
            if len(node.ops) != 1:
                raise ExpressionError("Chained comparisons are not supported.")
            for op in node.ops:
                if not isinstance(op, _ALLOWED_COMPARATORS):
                    raise ExpressionError(
                        f"Comparator '{type(op).__name__}' is not supported."
                    )
        elif isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ExpressionError("Only named function calls are supported.")
            name = node.func.id
            if name not in WHITELIST_FUNCTIONS:
                raise ExpressionError(f"Unknown function '{name}'.")
            arity = WHITELIST_FUNCTIONS[name]
            if not arity[0] <= len(node.args) <= arity[1]:
                raise ExpressionError(
                    f"Function '{name}' expects {_arity_text(arity)} argument(s), got {len(node.args)}."
                )
            if node.keywords:
                raise ExpressionError("Keyword arguments are not supported in expressions.")
        elif isinstance(node, ast.Name):
            if node.id in WHITELIST_FUNCTIONS:
                continue
        elif isinstance(
            node,
            (
                ast.Expression, ast.Constant, ast.Name,
                ast.Load, ast.Store, ast.Del,
                ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.FloorDiv, ast.Pow,
                ast.UAdd, ast.USub, ast.Invert, ast.Not, ast.BitAnd, ast.BitOr, ast.BitXor, ast.LShift, ast.RShift,
                ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Is, ast.IsNot, ast.In, ast.NotIn,
            ),
        ):
            continue
        else:
            raise ExpressionError(
                f"Expressions do not support '{type(node).__name__}'."
            )


def evaluate_expression(source: str, frame: pd.DataFrame) -> pd.Series | np.ndarray:
    if not isinstance(source, str) or not source.strip():
        raise ExpressionError("An expression is required.")
    try:
        tree = ast.parse(source, mode="eval")
    except SyntaxError as exc:
        raise ExpressionError(f"Invalid expression: {exc.msg}.") from exc
    if not isinstance(tree, ast.Expression):
        raise ExpressionError("Invalid expression.")
    _validate_tree(tree)
    return _eval(tree.body, frame)


def _eval(node: ast.AST, frame: pd.DataFrame) -> Any:
    if isinstance(node, ast.Constant):
        if not isinstance(node.value, (int, float)) or isinstance(node.value, bool):
            raise ExpressionError("Only numeric literals are allowed in expressions.")
        return node.value

    if isinstance(node, ast.Name):
        if node.id not in frame.columns:
            raise ExpressionError(
                f"Column '{node.id}' does not exist in the input dataset."
            )
        series = frame[node.id]
        if not pd.api.types.is_numeric_dtype(series):
            raise ExpressionError(
                f"Column '{node.id}' is not numeric; formulas can only reference numeric columns."
            )
        return series

    if isinstance(node, ast.UnaryOp):
        value = _eval(node.operand, frame)
        if isinstance(node.op, ast.UAdd):
            return +value
        return -value

    if isinstance(node, ast.BinOp):
        left = _eval(node.left, frame)
        right = _eval(node.right, frame)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right
        if isinstance(node.op, ast.Mod):
            return left % right
        if isinstance(node.op, ast.FloorDiv):
            return left // right
        if isinstance(node.op, ast.Pow):
            return left ** right

    if isinstance(node, ast.Compare):
        left = _eval(node.left, frame)
        right = _eval(node.comparators[0], frame)
        op = node.ops[0]
        if isinstance(op, ast.Eq):
            return left == right
        if isinstance(op, ast.NotEq):
            return left != right
        if isinstance(op, ast.Lt):
            return left < right
        if isinstance(op, ast.LtE):
            return left <= right
        if isinstance(op, ast.Gt):
            return left > right
        if isinstance(op, ast.GtE):
            return left >= right

    if isinstance(node, ast.Call):
        name = node.func.id
        args = [_eval(arg, frame) for arg in node.args]
        if name == "abs":
            return np.abs(args[0])
        if name == "round":
            decimals = args[1] if len(args) > 1 else None
            return np.round(args[0], decimals)
        if name == "min":
            return np.minimum(args[0], args[1])
        if name == "max":
            return np.maximum(args[0], args[1])
        if name == "log":
            return np.log(args[0])
        if name == "log2":
            return np.log2(args[0])
        if name == "log10":
            return np.log10(args[0])
        if name == "sqrt":
            return np.sqrt(args[0])
        if name == "pow":
            return np.power(args[0], args[1])
        if name == "clip":
            return np.clip(args[0], args[1], args[2])

    raise ExpressionError(f"Unsupported expression node: {type(node).__name__}.")


def cast_to_output_type(values: Any, output_type: str) -> pd.Series:
    if output_type == "float":
        return values.astype(float)
    if output_type == "int":
        return values.astype("Int64")
    if output_type == "boolean":
        return values.astype(bool)
    raise ExpressionError(f"Unsupported output type: {output_type!r}.")
