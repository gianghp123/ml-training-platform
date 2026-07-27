from __future__ import annotations

import numpy as np
import numpy.testing as npt
import pandas as pd
import pytest

from src.dsl.expression import ExpressionError, evaluate_expression
from tests.fixtures.dsl_vectors import load_vectors


VECTORS = load_vectors()


def _frame_from(data: dict[str, list[float | bool]]) -> pd.DataFrame:
    return pd.DataFrame(data)


def test_parse_error_examples_are_rejected():
    for entry in VECTORS["parseErrors"]:
        with pytest.raises(ExpressionError):
            evaluate_expression(entry["expr"], _frame_from({"A": [1, 2], "B": [3, 4]}))


def test_valid_examples_evaluate():
    frame = _frame_from({"A": [1, 2, 3], "B": [4, 5, 6], "C": [7, 8, 9], "Income": [10, 20, 30], "Age": [1, 2, 3]})
    for entry in VECTORS["valid"]:
        evaluate_expression(entry["expr"], frame)


def test_evaluation_vectors_match_expected_values():
    for entry in VECTORS["evaluation"]:
        frame = _frame_from(entry["data"])
        result = evaluate_expression(entry["expr"], frame)
        result_list = np.asarray(result).tolist()
        if any(isinstance(v, float) for v in entry["expect"]):
            npt.assert_allclose(result_list, entry["expect"], atol=1e-6)
        else:
            assert result_list == entry["expect"], entry["expr"]


def test_evaluate_rejects_empty_expression():
    with pytest.raises(ExpressionError, match="required"):
        evaluate_expression("   ", _frame_from({"A": [1]}))


def test_evaluate_rejects_string_literals():
    with pytest.raises(ExpressionError):
        evaluate_expression("'hi'", _frame_from({"A": [1]}))


def test_evaluate_rejects_caret_operator():
    with pytest.raises(ExpressionError, match=r"\^"):
        evaluate_expression("A ^ 2", _frame_from({"A": [1, 2]}))


def test_evaluate_rejects_chained_comparisons():
    with pytest.raises(ExpressionError, match="[Cc]hained"):
        evaluate_expression("1 < A < 3", _frame_from({"A": [2]}))


def test_evaluate_rejects_unknown_function():
    with pytest.raises(ExpressionError):
        evaluate_expression("foo(1)", _frame_from({"A": [1]}))


def test_evaluate_rejects_arity_mismatch():
    with pytest.raises(ExpressionError, match="argument"):
        evaluate_expression("pow(A)", _frame_from({"A": [1, 2]}))


def test_evaluate_rejects_unknown_column():
    with pytest.raises(ExpressionError, match="[Cc]olumn"):
        evaluate_expression("Salary * 2", _frame_from({"A": [1, 2]}))


def test_evaluate_rejects_non_numeric_column():
    with pytest.raises(ExpressionError, match="numeric"):
        evaluate_expression("Country + 1", _frame_from({"Country": ["x", "y"]}))


def test_evaluate_simple_arithmetic():
    result = evaluate_expression("A + B * 2", _frame_from({"A": [1, 2], "B": [3, 4]}))
    assert result.tolist() == [7, 10]


def test_evaluate_creates_boolean_series_from_comparison():
    result = evaluate_expression("Age >= 18", _frame_from({"Age": [10, 20]}))
    assert result.tolist() == [False, True]


def test_evaluate_uses_numpy_for_functions():
    result = evaluate_expression("clip(A, 0, 10)", _frame_from({"A": [-5, 5, 20]}))
    assert result.tolist() == [0, 5, 10]
