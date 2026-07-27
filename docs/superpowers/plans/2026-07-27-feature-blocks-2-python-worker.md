# Feature Blocks — Part 2: Python Worker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 new blocks in the Python worker (Filter Rows, Custom Feature Formula, Join Datasets, Feature Union), harden existing blocks against nulls (friendly runtime errors per the Option-1 decision), and teach the runner about optional input ports.

**Architecture:** Symmetric to Part 1: the same `vectors.json` is the source of truth — copy it from the engine package. Custom Feature Formula uses Python's stdlib `ast` (parse + node whitelist + vectorized numpy evaluation), no third-party expression engine. The other three blocks use pandas/sklearn directly. The runner is updated to skip optional input ports that are unconnected.

**Tech Stack:** Python 3.12, pandas, numpy, scikit-learn, pytest. Conventions match the existing worker code (snake_case modules, `Block(executor_key, version)` subclass, fixtures `storage` and `context_factory` from `tests/conftest.py`).

**Conventions:**
- Run worker tests from `apps/services/worker/` with `pytest tests/<path> -v` (or `python -m pytest`).
- Use `from src.runtime import ...` (the conftest sets up the import path).
- Do NOT commit plan/spec files (gitignored under `docs/superpowers/`).

---

### Task 1: Copy DSL test vectors into worker fixtures

**Files:**
- Create: `apps/services/worker/tests/fixtures/__init__.py`
- Create: `apps/services/worker/tests/fixtures/dsl_vectors.json`
- Create: `apps/services/worker/tests/fixtures/dsl_vectors.py` (loader)

- [ ] **Step 1: Copy the vectors file**

Read `packages/pipeline-engine/tests/dsl/vectors.json` (written in Part 1 Task 4) and write it verbatim to `apps/services/worker/tests/fixtures/dsl_vectors.json`. The file must be byte-identical — both test suites assert against the same expressions and AST dumps.

- [ ] **Step 2: Write the loader**

Create `apps/services/worker/tests/fixtures/__init__.py` (empty file).

Create `apps/services/worker/tests/fixtures/dsl_vectors.py`:

```python
"""Shared DSL test vectors, kept in sync with the engine package."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_VECTORS_PATH = Path(__file__).parent / "dsl_vectors.json"


@lru_cache(maxsize=1)
def load_vectors() -> dict:
    with _VECTORS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)
```

- [ ] **Step 3: Verify import works**

Run: `python -c "from tests.fixtures.dsl_vectors import load_vectors; v = load_vectors(); print(len(v['valid']), len(v['parseErrors']), len(v['evaluation']))"` (workdir `apps/services/worker`)
Expected: prints `29 12 15` (counts from Part 1 Task 4).

---

### Task 2: DSL evaluator (`ast`-based, vectorized)

**Files:**
- Create: `apps/services/worker/src/dsl/__init__.py`
- Create: `apps/services/worker/src/dsl/expression.py`
- Test: `apps/services/worker/tests/test_dsl.py`

- [ ] **Step 1: Write the failing test**

Create `apps/services/worker/tests/test_dsl.py`:

```python
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
    frame = _frame_from({"A": [1, 2, 3], "B": [4, 5, 6]})
    for entry in VECTORS["valid"]:
        # Should not raise on parse
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_dsl.py -q` (workdir `apps/services/worker`)
Expected: FAIL — module `src.dsl.expression` not found.

- [ ] **Step 3: Implement**

Create `apps/services/worker/src/dsl/__init__.py` (empty file).

Create `apps/services/worker/src/dsl/expression.py`:

```python
"""Restricted Python-subset expression evaluator (design: docs/superpowers/specs/2026-07-27-feature-engineering-blocks-design.md §2.5)."""

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
    """Raised for any DSL parse, validation, or evaluation failure."""


def _arity_text(arity: tuple[int, int]) -> str:
    return str(arity[0]) if arity[0] == arity[1] else f"{arity[0]}-{arity[1]}"


def _validate_tree(tree: ast.Expression) -> None:
    for node in ast.walk(tree):
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
                # Used as a callable later; allow it here.
                continue
        elif isinstance(node, (ast.Expression, ast.Constant, ast.Name)):
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
        name = node.func.id  # type: ignore[union-attr]
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_dsl.py -q`
Expected: PASS (all tests)

---

### Task 3: Null-hardening helper + apply to 6 existing blocks

**Files:**
- Modify: `apps/services/worker/src/blocks/utils.py` (add helper)
- Modify: `apps/services/worker/src/blocks/utils.py` (update `supervised_training_data`)
- Modify: `apps/services/worker/src/blocks/preprocessing/transforms.py` (NormalizeBlock, EncodeBlock)
- Modify: `apps/services/worker/src/blocks/models/kmeans.py` (KMeansBlock; read it first if needed)
- Test: `apps/services/worker/tests/test_null_hardening.py`

- [ ] **Step 1: Write the failing test**

Create `apps/services/worker/tests/test_null_hardening.py`:

```python
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.blocks.models import KMeansBlock, RandomForestBlock
from src.blocks.preprocessing import EncodeBlock, NormalizeBlock
from src.runtime import BlockExecutionError, DatasetValue


def _dataset(frame: pd.DataFrame, target: str | None = "y", task: str = "regression", role: str = "train") -> DatasetValue:
    return DatasetValue(frame=frame, target=target, task=task, role=role)


def _ctx(context_factory):
    return context_factory()


def test_normalize_fails_friendly_on_null():
    block = NormalizeBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0]})
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(_ctx(_dataset(frame, target=None)), {"dataset": _dataset(frame, target=None)}, {"columns": "a", "method": "Standard"})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_encode_fails_friendly_on_null():
    block = EncodeBlock()
    frame = pd.DataFrame({"c": ["a", "b", None]})
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(_ctx(_dataset(frame, target=None)), {"dataset": _dataset(frame, target=None)}, {"columns": "c", "strategy": "Label"})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_random_forest_fails_friendly_on_feature_null():
    block = RandomForestBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0, 5.0], "y": [1, 0, 1, 0, 1]})
    dataset = _dataset(frame, target="y", task="classification")
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(_ctx(dataset), {"dataset": dataset}, {"n_estimators": 5, "max_depth": 2})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_kmeans_fails_friendly_on_null():
    block = KMeansBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0, 5.0]})
    dataset = _dataset(frame, target=None, task="clustering")
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(_ctx(dataset), {"dataset": dataset}, {"n_clusters": 2})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_normalize_passes_when_clean():
    block = NormalizeBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, 3.0, 4.0]})
    dataset = _dataset(frame, target=None)
    result = block.execute(_ctx(dataset), {"dataset": dataset}, {"columns": "a", "method": "MinMax"})
    assert result.outputs["dataset"].frame["a"].min() == pytest.approx(0.0)
```

- [ ] **Step 2: Read kmeans.py to know the call site**

Run: `cat apps/services/worker/src/blocks/models/kmeans.py | head -60` to confirm whether it has its own null check or uses a helper.

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_null_hardening.py -q`
Expected: FAIL — friendly message not yet produced (current messages don't contain "Impute").

- [ ] **Step 4: Implement**

**4a.** In `apps/services/worker/src/blocks/utils.py`, add at the end (before `nested_options`):

```python
def require_no_nulls(
    frame: pd.DataFrame,
    columns: Sequence[str],
    *,
    block_name: str,
) -> None:
    """Raise BlockExecutionError with the spec's friendly message when `columns` contain NaN."""
    require_columns(frame, columns)
    missing = [column for column in columns if frame[column].isnull().any()]
    if missing:
        raise BlockExecutionError(
            f"Column(s) {', '.join(repr(c) for c in missing)} contain missing values. "
            f"Apply an Impute Missing Values block or upload a cleaned dataset before {block_name}."
        )
```

**4b.** In the same file, modify `supervised_training_data`. Replace the two inline `isnull()` checks:

Replace lines 171–178 (the `if features.isnull().any().any():` and `if target.isnull().any():` checks and their raise statements) with:

```python
    if features.isnull().any().any():
        require_no_nulls(features, list(feature_columns), block_name="Model training")
    target = dataset.frame[dataset.target]
    if target.isnull().any():
        require_no_nulls(target.to_frame(), [dataset.target], block_name="Model training")
    return features, target, feature_columns
```

(Or, equivalently, call the helper on a single-column frame. Both shapes produce the same friendly message.)

**4c.** In `apps/services/worker/src/blocks/preprocessing/transforms.py`, modify `NormalizeBlock.execute`. After `require_numeric(dataset.frame, columns)`, add:

```python
        require_no_nulls(dataset.frame, columns, block_name="Normalization")
```

**4d.** Modify `EncodeBlock._deterministic_categories` — replace the existing `if series.isnull().any()` check with a call to the helper, or just call `require_no_nulls` on a single-column frame before the call. Easiest: at the top of `_deterministic_categories`, before `sorted(...)`:

```python
    @staticmethod
    def _deterministic_categories(series: pd.Series, column: str) -> list[Any]:
        require_no_nulls(series.to_frame(), [column], block_name="Encoding")
        try:
            return sorted(series.unique().tolist())
        except TypeError:
            return sorted(series.unique().tolist(), key=lambda item: str(item))
```

(Remove the now-redundant `if series.isnull().any()` block.)

**4e.** In `apps/services/worker/src/blocks/models/kmeans.py`, the call site depends on the file's structure (confirmed by Step 2). Insert `require_no_nulls(dataset.frame, list(dataset.frame.columns), block_name="K-Means")` after the `require_numeric` call (or wherever the feature matrix is finalized). If a separate `features` DataFrame is constructed, pass that instead.

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest tests/test_null_hardening.py -q`
Expected: PASS (5 tests)

- [ ] **Step 6: Run the full existing test suite to confirm no regressions**

Run: `pytest tests -q`
Expected: PASS (existing tests still pass because all-null test fixtures either pre-impute or are already null-clean)

---

### Task 4: Filter Rows block

**Files:**
- Modify: `apps/services/worker/src/blocks/preprocessing/transforms.py` (append class)
- Modify: `apps/services/worker/src/blocks/preprocessing/__init__.py` (export)
- Test: `apps/services/worker/tests/test_blocks.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `apps/services/worker/tests/test_blocks.py`:

```python
from src.blocks.preprocessing import FilterRowsBlock


def test_filter_rows_basic_and_invert():
    block = FilterRowsBlock()
    frame = pd.DataFrame({"age": [10, 20, 30, 40], "country": ["US", "US", "CA", "US"]})
    dataset = DatasetValue(frame=frame)
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "age", "op": "gte", "value": 18}],
            "combinator": "AND",
            "invert": False,
        },
    )
    assert result.outputs["dataset"].frame["age"].tolist() == [20, 30, 40]

    result_inverted = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "age", "op": "gte", "value": 18}],
            "combinator": "AND",
            "invert": True,
        },
    )
    assert result_inverted.outputs["dataset"].frame["age"].tolist() == [10]


def test_filter_rows_or_combinator():
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1, 2, 3, 4]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [
                {"column": "a", "op": "eq", "value": 1},
                {"column": "a", "op": "eq", "value": 4},
            ],
            "combinator": "OR",
        },
    )
    assert result.outputs["dataset"].frame["a"].tolist() == [1, 4]


def test_filter_rows_is_null_and_in_ops():
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1.0, None, 3.0, None], "b": ["x", "y", "z", "w"]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [{"column": "a", "op": "isNull"}],
            "combinator": "AND",
        },
    )
    assert len(result.outputs["dataset"].frame) == 2

    result_in = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [{"column": "b", "op": "in", "value": ["x", "z"]}],
            "combinator": "AND",
        },
    )
    assert sorted(result_in.outputs["dataset"].frame["b"].tolist()) == ["x", "z"]


def test_filter_rows_preserves_target_and_role():
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1, 2, 3], "y": [0, 1, 0]})
    dataset = DatasetValue(frame=frame, target="y", task="classification", role="train")
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "a", "op": "gte", "value": 2}],
        },
    )
    out = result.outputs["dataset"]
    assert out.target == "y"
    assert out.task == "classification"
    assert out.role == "train"
    assert out.frame["y"].tolist() == [1, 0]


def test_filter_rows_rejects_empty_conditions():
    block = FilterRowsBlock()
    with pytest.raises(BlockExecutionError, match="[Aa]t least one"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"conditions": []},
        )


def test_filter_rows_rejects_unknown_column_at_runtime():
    block = FilterRowsBlock()
    with pytest.raises(BlockExecutionError, match="[Cc]olumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"conditions": [{"column": "Nope", "op": "eq", "value": 1}]},
        )
```

(Add `from src.blocks.preprocessing import FilterRowsBlock` to the top import block of `test_blocks.py`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_blocks.py -k "filter_rows" -q`
Expected: FAIL — `FilterRowsBlock` not importable.

- [ ] **Step 3: Implement**

Append to `apps/services/worker/src/blocks/preprocessing/transforms.py` (after `ConcatFeaturesBlock`):

```python
class FilterRowsBlock(Block):
    executor_key = "filter_rows"
    version = 1

    _NO_VALUE_OPS = {"isNull", "isNotNull"}

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        conditions = config.get("conditions")
        if not isinstance(conditions, list) or len(conditions) == 0:
            raise BlockExecutionError("At least one filter condition is required.")
        combinator = enum_value(
            config.get("combinator"),
            field_name="combinator",
            choices=("AND", "OR"),
            default="AND",
        )
        invert = bool(config.get("invert", False))
        frame = dataset.frame

        masks: list[pd.Series] = []
        for index, raw in enumerate(conditions):
            label = f"Condition {index + 1}"
            if not isinstance(raw, Mapping):
                raise BlockExecutionError(f"{label}: must be an object.")
            column = str(raw.get("column") or "").strip()
            if not column:
                raise BlockExecutionError(f"{label}: 'column' is required.")
            if column not in frame.columns:
                raise BlockExecutionError(
                    f"{label}: column {column!r} does not exist in the input dataset."
                )
            op = str(raw.get("op") or "").strip()
            mask = self._apply_condition(frame[column], column, op, raw.get("value"), label)
            masks.append(mask)

        joined = masks[0]
        for mask in masks[1:]:
            joined = joined & mask if combinator == "AND" else joined | mask
        if invert:
            joined = ~joined
        result = frame.loc[joined].copy()
        value = dataset.derive(frame=result, lineage_node=context.node_id)
        return _dataset_result(
            value,
            (
                ("info", f"Rows in: {len(frame)}"),
                ("info", f"Rows out: {len(result)}"),
            ),
        )

    def _apply_condition(
        self, series: pd.Series, column: str, op: str, value: Any, label: str
    ) -> pd.Series:
        if op == "isNull":
            return series.isna()
        if op == "isNotNull":
            return series.notna()
        if op == "eq":
            return series == value
        if op == "ne":
            return series != value
        if op == "gt":
            return series > value
        if op == "gte":
            return series >= value
        if op == "lt":
            return series < value
        if op == "lte":
            return series <= value
        if op == "contains":
            if not pd.api.types.is_string_dtype(series):
                raise BlockExecutionError(
                    f"{label}: 'contains' requires a string column; {column!r} is not text."
                )
            return series.astype(str).str.contains(str(value), na=False)
        if op == "in":
            if not isinstance(value, (list, tuple)):
                raise BlockExecutionError(f"{label}: 'in' requires an array value.")
            return series.isin(list(value))
        raise BlockExecutionError(f"{label}: unsupported operator {op!r}.")
```

**Important:** `FilterRowsBlock` does NOT add `isNull`/`isNotNull` to the operator-requires-value check, but the engine already validates that. The block is a defense-in-depth at runtime; the two branch arms above handle these ops without ever looking at `value`.

In `apps/services/worker/src/blocks/preprocessing/__init__.py`, add `FilterRowsBlock` to the import and `__all__` lists (importing from `.transforms`):

```python
from .transforms import (
    ConcatFeaturesBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)

__all__ = [
    "ConcatFeaturesBlock",
    "EncodeBlock",
    "FeatureSelectBlock",
    "FilterRowsBlock",
    "ImputeMissingBlock",
    "NormalizeBlock",
    "RenameColumnsBlock",
    "SelectTargetBlock",
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_blocks.py -k "filter_rows" -q`
Expected: PASS (6 tests)

---

### Task 5: Custom Feature Formula block

**Files:**
- Modify: `apps/services/worker/src/blocks/preprocessing/transforms.py` (append class)
- Modify: `apps/services/worker/src/blocks/preprocessing/__init__.py` (export)
- Test: `apps/services/worker/tests/test_blocks.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `apps/services/worker/tests/test_blocks.py`:

```python
from src.dsl.expression import ExpressionError
from src.blocks.preprocessing import CustomFeatureFormulaBlock


def test_custom_feature_formula_basic_float():
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [10.0, 20.0, 30.0], "b": [1.0, 2.0, 3.0]})
    dataset = DatasetValue(frame=frame)
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {"outputColumn": "ratio", "outputType": "float", "expression": "a / (b + 1)"},
    )
    assert "ratio" in result.outputs["dataset"].frame.columns
    assert result.outputs["dataset"].frame["ratio"].tolist() == pytest.approx([5.0, 10.0, 15.0])


def test_custom_feature_formula_boolean_column():
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"age": [10, 20, 30]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {"outputColumn": "is_adult", "outputType": "boolean", "expression": "age >= 18"},
    )
    assert result.outputs["dataset"].frame["is_adult"].tolist() == [False, True, True]


def test_custom_feature_formula_int_with_nulls_uses_nullable_int():
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [1, 2, 3, 4]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {"outputColumn": "a2", "outputType": "int", "expression": "a ** 2"},
    )
    series = result.outputs["dataset"].frame["a2"]
    assert series.tolist() == [1, 4, 9, 16]


def test_custom_feature_formula_rejects_missing_output_column():
    block = CustomFeatureFormulaBlock()
    with pytest.raises(BlockExecutionError, match="outputColumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"outputColumn": "", "expression": "a + 1"},
        )


def test_custom_feature_formula_rejects_collision():
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [1, 2]})
    with pytest.raises(BlockExecutionError, match="[Cc]ollision|[Ee]xists"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=frame)},
            {"outputColumn": "a", "expression": "a + 1"},
        )


def test_custom_feature_formula_rejects_unknown_column():
    block = CustomFeatureFormulaBlock()
    with pytest.raises(ExpressionError, match="[Cc]olumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"outputColumn": "x", "expression": "Salary * 2"},
        )
```

(Add `from src.dsl.expression import ExpressionError` and `from src.blocks.preprocessing import CustomFeatureFormulaBlock` to the test file's import block.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_blocks.py -k "custom_feature_formula" -q`
Expected: FAIL — `CustomFeatureFormulaBlock` not importable.

- [ ] **Step 3: Implement**

Append to `transforms.py` (after `FilterRowsBlock`):

```python
from ...dsl.expression import cast_to_output_type, evaluate_expression


class CustomFeatureFormulaBlock(Block):
    executor_key = "custom_feature_formula"
    version = 1

    _OUTPUT_TYPES = ("float", "int", "boolean")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        output_column = str(config.get("outputColumn") or "").strip()
        if not output_column:
            raise BlockExecutionError("outputColumn is required.")
        if output_column in dataset.frame.columns:
            raise BlockExecutionError(
                f"Output column {output_column!r} already exists in the input dataset (collision)."
            )
        expression = config.get("expression")
        if not isinstance(expression, str) or not expression.strip():
            raise BlockExecutionError("expression is required.")
        output_type = str(config.get("outputType") or "float").strip()
        if output_type not in self._OUTPUT_TYPES:
            raise BlockExecutionError(
                f"outputType must be one of: {', '.join(self._OUTPUT_TYPES)}."
            )

        evaluated = evaluate_expression(expression, dataset.frame)
        appended = cast_to_output_type(evaluated, output_type)
        appended.name = output_column
        new_frame = dataset.frame.copy()
        new_frame[output_column] = appended
        value = dataset.derive(frame=new_frame, lineage_node=context.node_id)
        return _dataset_result(
            value,
            (("info", f"Added column {output_column!r} ({output_type}) via formula"),),
        )
```

In `apps/services/worker/src/blocks/preprocessing/__init__.py`, add `CustomFeatureFormulaBlock`:

```python
from .transforms import (
    ConcatFeaturesBlock,
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)

__all__ = [
    "ConcatFeaturesBlock",
    "CustomFeatureFormulaBlock",
    "EncodeBlock",
    "FeatureSelectBlock",
    "FilterRowsBlock",
    "ImputeMissingBlock",
    "NormalizeBlock",
    "RenameColumnsBlock",
    "SelectTargetBlock",
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_blocks.py -k "custom_feature_formula" -q`
Expected: PASS (6 tests)

---

### Task 6: Join Datasets block

**Files:**
- Modify: `apps/services/worker/src/blocks/preprocessing/transforms.py` (append class)
- Modify: `apps/services/worker/src/blocks/preprocessing/__init__.py` (export)
- Test: `apps/services/worker/tests/test_blocks.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `apps/services/worker/tests/test_blocks.py`:

```python
from src.blocks.preprocessing import JoinDatasetsBlock


def _build_dataset(name: str) -> DatasetValue:
    frame = pd.DataFrame(
        {
            "CustomerID": [1, 2, 3, 4],
            "Age": [25, 30, 35, 40],
            name: list(range(4)),
        }
    )
    return DatasetValue(frame=frame, target=None, role="full")


def test_join_datasets_inner_basic():
    block = JoinDatasetsBlock()
    left = _build_dataset("LSpent")
    right = _build_dataset("RSpent")
    result = block.execute(
        context_factory(),
        {"left": left, "right": right},
        {"keys": ["CustomerID"], "strategy": "inner"},
    )
    out = result.outputs["dataset"]
    assert "CustomerID" in out.frame.columns
    assert "LSpent" in out.frame.columns
    assert "RSpent" in out.frame.columns
    assert len(out.frame) == 4


def test_join_datasets_left_keeps_unmatched_left_rows():
    block = JoinDatasetsBlock()
    left_frame = pd.DataFrame({"CustomerID": [1, 2, 3], "Age": [25, 30, 35]})
    right_frame = pd.DataFrame({"CustomerID": [1, 2], "Total": [100, 200]})
    result = block.execute(
        context_factory(),
        {"left": DatasetValue(frame=left_frame), "right": DatasetValue(frame=right_frame)},
        {"keys": ["CustomerID"], "strategy": "left"},
    )
    assert len(result.outputs["dataset"].frame) == 3
    row3 = result.outputs["dataset"].frame.iloc[2]
    assert pd.isna(row3["Total"])


def test_join_datasets_multiple_keys():
    block = JoinDatasetsBlock()
    left = pd.DataFrame(
        {"A": [1, 1, 2, 2], "B": ["x", "y", "x", "y"], "v1": [10, 20, 30, 40]}
    )
    right = pd.DataFrame(
        {"A": [1, 1, 2], "B": ["x", "y", "x"], "v2": [100, 200, 300]}
    )
    result = block.execute(
        context_factory(),
        {"left": DatasetValue(frame=left), "right": DatasetValue(frame=right)},
        {"keys": ["A", "B"], "strategy": "inner"},
    )
    assert len(result.outputs["dataset"].frame) == 3


def test_join_datasets_inherits_left_metadata():
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"k": [1, 2], "a": [10, 20]}), target="a", task="regression", role="train")
    right = DatasetValue(frame=pd.DataFrame({"k": [1, 2], "b": [100, 200]}), target="b", task="classification", role="test")
    result = block.execute(
        context_factory(),
        {"left": left, "right": right},
        {"keys": ["k"], "strategy": "inner"},
    )
    out = result.outputs["dataset"]
    assert out.target == "a"
    assert out.task == "regression"
    assert out.role == "train"


def test_join_datasets_rejects_missing_keys():
    block = JoinDatasetsBlock()
    with pytest.raises(BlockExecutionError, match="[Kk]ey|[Rr]equired"):
        block.execute(
            context_factory(),
            {
                "left": DatasetValue(frame=pd.DataFrame({"a": [1]})),
                "right": DatasetValue(frame=pd.DataFrame({"a": [1]})),
            },
            {"keys": [], "strategy": "inner"},
        )


def test_join_datasets_rejects_key_missing_from_right():
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [10, 20]}))
    right = DatasetValue(frame=pd.DataFrame({"c": [1, 2], "d": [100, 200]}))
    with pytest.raises(BlockExecutionError, match="[Cc]olumn|[Kk]ey"):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "inner"},
        )


def test_join_datasets_rejects_non_key_collision():
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1], "b": [10]}))
    right = DatasetValue(frame=pd.DataFrame({"a": [1], "b": [100]}))
    with pytest.raises(BlockExecutionError, match="[Cc]ollid|[Cc]olumn"):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "inner"},
        )


def test_join_datasets_rejects_full_strategy_collision():
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [10, 20]}))
    right = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [100, 200]}))
    with pytest.raises(BlockExecutionError):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "full"},
        )
```

(Add `from src.blocks.preprocessing import JoinDatasetsBlock` to the import block.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_blocks.py -k "join_datasets" -q`
Expected: FAIL — `JoinDatasetsBlock` not importable.

- [ ] **Step 3: Implement**

Append to `transforms.py`:

```python
class JoinDatasetsBlock(Block):
    executor_key = "join_datasets"
    version = 1

    _STRATEGIES = ("inner", "left", "right", "full")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        left = require_dataset(inputs, "left")
        right = require_dataset(inputs, "right")
        keys = parse_string_list(config.get("keys"), field_name="keys")
        if not keys:
            raise BlockExecutionError("At least one join key is required.")
        strategy = enum_value(
            config.get("strategy"),
            field_name="strategy",
            choices=self._STRATEGIES,
            default="inner",
        )

        for key in keys:
            if key not in left.frame.columns:
                raise BlockExecutionError(
                    f"Join key {key!r} is missing from the left input."
                )
            if key not in right.frame.columns:
                raise BlockExecutionError(
                    f"Join key {key!r} is missing from the right input."
                )
        non_key_left = [c for c in left.frame.columns if c not in keys]
        collisions = [c for c in non_key_left if c in right.frame.columns]
        if collisions:
            raise BlockExecutionError(
                "Non-key columns collide between the two inputs: "
                + ", ".join(repr(c) for c in collisions)
                + ". Rename them before joining."
            )

        merged = pd.merge(
            left.frame, right.frame, on=keys, how=strategy
        )
        value = DatasetValue(
            frame=merged,
            target=left.target,
            task=left.task,
            role=left.role,
            lineage=tuple(dict.fromkeys((*left.lineage, *right.lineage, context.node_id))),
        )
        return _dataset_result(
            value,
            (
                ("info", f"Joined on {', '.join(keys)} using {strategy} strategy"),
                ("info", f"Rows in: left={len(left.frame)} right={len(right.frame)}"),
                ("info", f"Rows out: {len(merged)}"),
            ),
        )
```

In `preprocessing/__init__.py`, add `JoinDatasetsBlock`:

```python
from .transforms import (
    ConcatFeaturesBlock,
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    JoinDatasetsBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)

__all__ = [
    "ConcatFeaturesBlock",
    "CustomFeatureFormulaBlock",
    "EncodeBlock",
    "FeatureSelectBlock",
    "FilterRowsBlock",
    "ImputeMissingBlock",
    "JoinDatasetsBlock",
    "NormalizeBlock",
    "RenameColumnsBlock",
    "SelectTargetBlock",
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_blocks.py -k "join_datasets" -q`
Expected: PASS (8 tests)

---

### Task 7: Feature Union block

**Files:**
- Modify: `apps/services/worker/src/blocks/preprocessing/transforms.py` (append class)
- Modify: `apps/services/worker/src/blocks/preprocessing/__init__.py` (export)
- Modify: `apps/services/worker/src/runner.py` (skip missing optional inputs)
- Test: `apps/services/worker/tests/test_blocks.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `apps/services/worker/tests/test_blocks.py`:

```python
from src.blocks.preprocessing import FeatureUnionBlock


def _make_dataset(name: str) -> DatasetValue:
    return DatasetValue(frame=pd.DataFrame({name: [1, 2, 3]}))


def test_feature_union_two_inputs_succeeds():
    block = FeatureUnionBlock()
    a = _make_dataset("a")
    b = _make_dataset("b")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    out = result.outputs["dataset"]
    assert set(out.frame.columns) == {"a", "b"}
    assert len(out.frame) == 3


def test_feature_union_optional_unconnected_inputs_succeeds():
    block = FeatureUnionBlock()
    a = _make_dataset("a")
    b = _make_dataset("b")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    assert "dataset" in result.outputs


def test_feature_union_target_inherited_from_first_with_target():
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2]}), target=None)
    b = DatasetValue(frame=pd.DataFrame({"y": [3, 4]}), target="y", task="regression", role="train")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    out = result.outputs["dataset"]
    assert out.target == "y"
    assert out.task == "regression"
    assert out.role == "full"  # first input's role


def test_feature_union_rejects_row_count_mismatch():
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2, 3]}))
    b = DatasetValue(frame=pd.DataFrame({"y": [4, 5]}))
    with pytest.raises(BlockExecutionError, match="[Rr]ows|[Cc]ount"):
        block.execute(
            context_factory(),
            {"datasetA": a, "datasetB": b},
            {},
        )


def test_feature_union_rejects_duplicate_columns():
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2]}))
    b = DatasetValue(frame=pd.DataFrame({"x": [3, 4]}))
    with pytest.raises(BlockExecutionError, match="[Cc]ollid"):
        block.execute(
            context_factory(),
            {"datasetA": a, "datasetB": b},
            {},
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_blocks.py -k "feature_union" -q`
Expected: FAIL — `FeatureUnionBlock` not importable.

- [ ] **Step 3: Implement**

Append to `transforms.py`:

```python
class FeatureUnionBlock(Block):
    executor_key = "feature_union"
    version = 1

    _PORT_ORDER = ("datasetA", "datasetB", "datasetC", "datasetD")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        connected: list[DatasetValue] = []
        for port in self._PORT_ORDER:
            value = inputs.get(port)
            if isinstance(value, DatasetValue):
                connected.append(value)

        if len(connected) < 2:
            raise BlockExecutionError(
                "Feature Union requires at least 2 connected inputs; got "
                f"{len(connected)}."
            )

        first = connected[0]
        expected_rows = len(first.frame)
        for dataset in connected[1:]:
            if len(dataset.frame) != expected_rows:
                raise BlockExecutionError(
                    "Feature Union input datasets must have matching row counts: "
                    f"{expected_rows} vs {len(dataset.frame)}."
                )

        seen_columns: set[str] = set()
        for dataset in connected:
            collisions = sorted(set(dataset.frame.columns) & seen_columns)
            if collisions:
                raise BlockExecutionError(
                    "Feature Union column names collide across branches: "
                    + ", ".join(repr(c) for c in collisions)
                )
            seen_columns.update(dataset.frame.columns)

        frames = [dataset.frame.reset_index(drop=True) for dataset in connected]
        merged = pd.concat(frames, axis=1)

        target = next(
            (d.target for d in connected if d.target is not None),
            None,
        )
        task = next(
            (d.task for d in connected if d.task is not None),
            None,
        )
        role = first.role
        lineage = tuple(
            dict.fromkeys(
                *(d.lineage for d in connected),
                context.node_id,
            )
        )
        value = DatasetValue(
            frame=merged,
            target=target,
            task=task,
            role=role,
            lineage=lineage,
        )
        return _dataset_result(
            value,
            (
                ("info", f"Merged {len(connected)} branches"),
                ("info", f"Columns: {', '.join(merged.columns)}"),
                ("info", f"Rows: {len(merged)}"),
            ),
        )
```

In `preprocessing/__init__.py`, add `FeatureUnionBlock`:

```python
from .transforms import (
    ConcatFeaturesBlock,
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FeatureUnionBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    JoinDatasetsBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)

__all__ = [
    "ConcatFeaturesBlock",
    "CustomFeatureFormulaBlock",
    "EncodeBlock",
    "FeatureSelectBlock",
    "FeatureUnionBlock",
    "FilterRowsBlock",
    "ImputeMissingBlock",
    "JoinDatasetsBlock",
    "NormalizeBlock",
    "RenameColumnsBlock",
    "SelectTargetBlock",
]
```

- [ ] **Step 4: Update the runner to skip missing optional inputs**

In `apps/services/worker/src/runner.py`, the current check at lines 387–394 raises if any input port is missing. With Feature Union having `optional: true` ports, those must be skipped. Replace lines 387–394:

```python
                missing_inputs = sorted(
                    set(current_descriptor.input_ports()) - set(resolved_inputs)
                )
                if missing_inputs:
                    raise GraphValidationError(
                        f"Node {current_node.id!r} is missing inputs: "
                        + ", ".join(missing_inputs)
                    )
```

with:

```python
                optional_input_ports = _optional_input_port_ids(
                    current_descriptor.ports.get("inputs")
                )
                missing_inputs = sorted(
                    {
                        port
                        for port in set(current_descriptor.input_ports())
                        - set(resolved_inputs)
                        if port not in optional_input_ports
                    }
                )
                if missing_inputs:
                    raise GraphValidationError(
                        f"Node {current_node.id!r} is missing inputs: "
                        + ", ".join(missing_inputs)
                    )
```

Then add a helper at the module level (near `_port_ids` at line 94):

```python
def _optional_input_port_ids(raw: Any) -> set[str]:
    if not isinstance(raw, Sequence) or isinstance(raw, (str, bytes, bytearray)):
        return set()
    optional: set[str] = set()
    for port in raw:
        if isinstance(port, Mapping) and port.get("optional") is True:
            port_id = str(port.get("id") or "").strip()
            if port_id:
                optional.add(port_id)
    return optional
```

- [ ] **Step 5: Run the feature_union tests + the existing runner test**

Run: `pytest tests/test_blocks.py -k "feature_union" -q && pytest tests/test_runner.py -q`
Expected: PASS

---

### Task 8: Register the 4 new blocks

**Files:**
- Modify: `apps/services/worker/src/registry.py`
- Test: `apps/services/worker/tests/test_registry.py` (auto-passes via `assert_catalog_complete`)

- [ ] **Step 1: Add to CATALOG_EXECUTORS and DEFAULT_REGISTRY**

In `apps/services/worker/src/registry.py`:

- Extend the import list at the top of the `from .blocks.preprocessing import (...)` block to add `CustomFeatureFormulaBlock`, `FeatureUnionBlock`, `FilterRowsBlock`, `JoinDatasetsBlock`:

```python
from .blocks.preprocessing import (
    ConcatFeaturesBlock,
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FilterRowsBlock,
    FeatureUnionBlock,
    ImputeMissingBlock,
    JoinDatasetsBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)
```

- Extend `CATALOG_EXECUTORS` to include the 4 new tuples:

```python
CATALOG_EXECUTORS = {
    ("load_csv", 1),
    ("load_json", 1),
    ("load_xml", 1),
    ("normalize", 3),
    ("encode", 1),
    ("impute_missing", 1),
    ("feature_select", 1),
    ("select_target", 1),
    ("rename_columns", 1),
    ("concat_features", 1),
    ("filter_rows", 1),
    ("custom_feature_formula", 1),
    ("join_datasets", 1),
    ("feature_union", 1),
    ("train_test_split", 1),
    ("random_forest", 1),
    ("logistic_regression", 1),
    ("svm", 1),
    ("kmeans", 1),
    ("evaluate", 1),
    ("save_model", 1),
}
```

- Extend `DEFAULT_REGISTRY`'s argument list to include the 4 new block classes (in any order; alphabetical is fine):

```python
DEFAULT_REGISTRY = BlockRegistry(
    [
        LoadCsvBlock,
        LoadJsonBlock,
        LoadXmlBlock,
        NormalizeBlock,
        EncodeBlock,
        ImputeMissingBlock,
        FeatureSelectBlock,
        FilterRowsBlock,
        CustomFeatureFormulaBlock,
        JoinDatasetsBlock,
        FeatureUnionBlock,
        SelectTargetBlock,
        RenameColumnsBlock,
        ConcatFeaturesBlock,
        TrainTestSplitBlock,
        RandomForestBlock,
        LogisticRegressionBlock,
        SvmBlock,
        KMeansBlock,
        EvaluateBlock,
        SaveModelBlock,
    ]
)
```

- [ ] **Step 2: Run the registry test + the full worker suite**

Run: `pytest tests -q`
Expected: PASS — `test_default_registry_covers_catalog` confirms the registry matches the new `CATALOG_EXECUTORS`; all other tests pass.

---

## Part 2 Done-When Checklist

- [ ] `pytest tests -q` (workdir `apps/services/worker`) — all green
- [ ] `tests/fixtures/dsl_vectors.json` matches `packages/pipeline-engine/tests/dsl/vectors.json` byte-for-byte
- [ ] 4 new blocks registered, `assert_catalog_complete` passes
- [ ] Null-hardening produces the spec message in all 6 retrofitted blocks
- [ ] Runner skips unconnected optional input ports

## Handoff to Part 3

Part 3 covers the DB migration that seeds the 4 new block definitions + deprecates `concat_features`, plus the FE config forms (ConditionList, Expression) and optional-port canvas rendering. It depends on the engine tasks in Part 1 being merged (FE/BE share the same field types).
