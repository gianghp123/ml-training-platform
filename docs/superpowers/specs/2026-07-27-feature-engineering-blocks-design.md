# Feature Engineering Blocks — Design Spec

**Date:** 2026-07-27
**Status:** Approved (brainstorming complete, pending user spec review)
**Scope:** Add Filter Rows, Custom Feature Formula, Join Datasets, Feature Union blocks end-to-end; deprecate Concat Features; runtime null-hardening for existing blocks.

---

## 1. Background & Decisions

This design came out of a brainstorming session. Key decisions (all user-confirmed):

1. **Feature Union replaces Concat Features.** New `feature_union` block with 4 named inputs (2 required `datasetA`/`datasetB` + 2 optional `datasetC`/`datasetD`). The engine gains an `optional` input-port concept. `concat_features` is marked `deprecated` (stays registered in the Python worker so existing pipelines keep running). Chaining 2-input concat was rejected as UX; "concat" naming rejected as confusing (pandas/SQL concat implies vertical stacking).
2. **Filter Rows uses a structured condition list** (not free-text): `{column, op, value}` rows, `AND`/`OR` combinator, `invert` toggle. New config field type `ConditionList`.
3. **Custom Feature Formula uses a subset of Python expression syntax** (no imports, no libraries). Implemented twice: a hand-written TypeScript parser (design-time validation in `pipeline-engine`) and — on the worker side — Python's stdlib `ast` module (`ast.parse` + node whitelist + AST interpreter; `eval()` is never called), kept in sync by a shared `vectors.json` test fixture. One formula = one new column per block instance. Subset boundary: **core only** — arithmetic, comparisons, whitelisted functions; no ternary, no `and`/`or`/`not`, no strings.
4. **Join Datasets:** non-key column name collisions are a **design-time error** (consistent with the existing `disjoint` philosophy); user fixes with Rename Column. Metadata (target/task/role) inherited from the **left** input.
5. **Nulls/duplicates enforcement is runtime-only.** No new constraint operator, no block version bumps. Python blocks fail with friendly messages (e.g. *"Column 'Age' contains missing values. Apply an Impute Missing Values block before Normalization."*) surfaced via `node.failed` SSE events. Block versions track interfaces; behavior hardening doesn't change interfaces, so no Normalization v4 / model v2 bumps are needed.
6. **Approach A — end-to-end in one task:** contracts + engine + worker + migration + pragmatic FE forms.

Out of scope (YAGNI): logical `AND`/`OR` in the formula DSL, string-producing formulas, Remove Duplicates block, design-time nullable warnings, FE expression autocomplete, migrating existing pipelines off `concat_features`.

---

## 2. The Four Blocks

All in category **Preprocessing**.

### 2.1 Filter Rows — `filter_rows` v1

- **Ports:** input `dataset` (Dataset) → output `dataset` (Dataset)
- **Config:**
  ```json
  {"fields":[
    {"id":"conditions","type":"ConditionList","ops":["eq","ne","gt","gte","lt","lte","contains","isNull","isNotNull","in"]},
    {"id":"combinator","type":"Select","options":["AND","OR"],"default":"AND"},
    {"id":"invert","type":"Boolean","default":false}
  ]}
  ```
- **Condition value shape:** `conditions: [{ column: string, op: FilterOp, value?: string | number | (string|number)[] }]`. `isNull`/`isNotNull` take no value; `in` takes an array.
- **Semantics:** `invert=false` keeps matching rows; `invert=true` removes them. Schema unchanged, fewer rows.
- **Constraints (design-time):** ≥1 condition; every `column` exists in input schema (skipped when columns are `"unknown"`); value required except null-ops; primitive compatibility when column type known (`gt/gte/lt/lte` on string column → error).
- **Output transform:** `{"declared":{"copyInput":true}}` — fully deterministic, target/task/role preserved.

### 2.2 Custom Feature Formula — `custom_feature_formula` v1

- **Ports:** input `dataset` (Dataset) → output `dataset` (Dataset)
- **Config:**
  ```json
  {"fields":[
    {"id":"outputColumn","type":"Text"},
    {"id":"outputType","type":"Select","options":["float","int","boolean"],"default":"float"},
    {"id":"expression","type":"Expression"}
  ]}
  ```
- **Semantics:** expression evaluated per row (vectorized); result appended as `outputColumn`, cast to `outputType`.
- **Constraints (design-time):** expression parses; referenced columns exist and are numeric-semantic; `outputColumn` matches `/^[A-Za-z_][A-Za-z0-9_]*$/` and does not collide with existing columns.
- **Output transform:** `{"declared":{"copyInput":true,"addColumns":[{"name":"$config.outputColumn","primitive":"$config.outputType"}]}}`

### 2.3 Join Datasets — `join_datasets` v1

- **Ports:** inputs `left` (Dataset), `right` (Dataset) → output `dataset` (Dataset)
- **Config:**
  ```json
  {"fields":[
    {"id":"keys","type":"ColumnSelector","multiple":true},
    {"id":"strategy","type":"Select","options":["inner","left","right","full"],"default":"inner"}
  ]}
  ```
- **Constraints (design-time):**
  - `keys` non-empty (`exists` on `$config.keys`)
  - `keys ⊆ left.columns` and `keys ⊆ right.columns` via a new small operator `columnsExist`: `{ "op":"columnsExist", "columns":"$config.keys", "inputs":["$input.left","$input.right"] }`. (A dedicated operator is needed because `subsetOf` compares raw values and `$input.x.schema.columns` resolves to Column objects, not name strings.)
  - Non-key columns disjoint: extended `disjoint` rule `{ "op":"disjoint", "left":"$input.left", "right":"$input.right", "exclude":"$config.keys" }`
- **Output transform:** new `joinColumns` variant — columns = `left.columns ++ (right.columns − keys)`; `schema.target`/`task`/`role` copied from **left** (the primary dataset). Deterministic; no `confirmProvider`.
- **Runtime semantics:** `pd.merge(left, right, on=keys, how=strategy)`. Duplicate keys → many-to-many row multiplication allowed (pandas default; user's responsibility). Null keys never match (documented behavior).

### 2.4 Feature Union — `feature_union` v1

- **Ports:** inputs `datasetA` (required), `datasetB` (required), `datasetC` (optional), `datasetD` (optional) → output `dataset` (Dataset)
- **Config:** none (`{"fields":[]}`)
- **Constraints (design-time):**
  - N-ary `rowCountMatches` across connected inputs (unconnected optional inputs skipped)
  - N-ary `disjoint` across connected inputs' columns
- **Output transform:** `{"declared":{"concatColumns":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"]}}` — `concatColumns` extended to skip unconnected inputs. Target/task/role from first connected input that defines one.
- **Deprecation:** migration sets `concat_features.status = 'deprecated'`. Python class stays registered.

### 2.5 Formula DSL — Python expression subset (v1, core only)

Users write normal Python expressions, e.g. `Income / (Age + 1)` or `log(Income) - Age ** 2`. No imports, no library access.

**Allowed syntax:**
- Arithmetic: `+ - * / % // **` and parentheses, unary `-`/`+`
- Numeric literals only (ints, floats) — **no strings**
- Column references as bare names; must be identifier-safe (`/^[A-Za-z_][A-Za-z0-9_]*$/`); columns with other names → error advising Rename Column first
- A single comparison at expression root: `> >= < <= == !=` (produces boolean column). No chained comparisons (`a < b < c`).
- Function calls to the whitelist only: `abs round min max log log2 log10 sqrt pow clip`

**Explicitly rejected (parse/validation error):**
- `^` — in Python this is bitwise XOR; rejected with a message suggesting `**` (avoids silent wrong answers)
- Ternary `x if cond else y`, `and`/`or`/`not`, attribute access, subscripts, lambdas, comprehensions, f-strings, string literals, names outside the whitelist (e.g. `__import__`, `pd`, `np`)

**Worker-side implementation (whitelist, never `eval()`):** `ast.parse(expr, mode='eval')`, then walk the tree accepting only these nodes — `Expression`, `BinOp` (`Add Sub Mult Div Mod FloorDiv Pow`), `UnaryOp` (`USub UAdd`), `Compare` (single comparator), `Name` (must be an input column), `Constant` (numbers only), `Call` (`func` is a whitelisted `Name`, args are valid nodes). Anything else → `EXPRESSION_PARSE_ERROR`-style `BlockExecutionError`. Evaluation maps nodes to vectorized numpy/pandas ops: names → `frame[col]`, operators → numpy operators, functions → `abs`, `np.round`, `np.minimum`, `np.maximum`, `np.log`, `np.log2`, `np.log10`, `np.sqrt`, `np.power`, `np.clip`.

**Design-time (TS):** hand-written recursive-descent parser for exactly this subset (same acceptance/rejection as the Python whitelist), pinned by shared `vectors.json`.

---

## 3. Contracts Package Changes (`packages/contracts`)

1. `PortSchema`: add `optional?: boolean` (absent = required; existing 17 blocks unchanged).
2. `ConfigFieldType`: add `ConditionListField` (`{ type:"ConditionList", ops: FilterOp[] }`) and `ExpressionField` (`{ type:"Expression" }`). Export `FilterOp` union and `FilterConditionSchema` (Zod).
3. `OutputTransformSchema`:
   - `copyInput` variant gains optional `addColumns: [{ name: PathRef, primitive: PathRef }]` (values resolved from `$config.*` like `columnUpdates`).
   - New variant `joinColumns: { left: PathRef, right: PathRef, keys: PathRef }`.
4. New validation error codes (§6) require no schema change — `ValidationErrorSchema.code` is a free-form string, not an enum.

## 4. Pipeline Engine Changes (`packages/pipeline-engine`)

- **Phase 1 ports (`validate-ports.ts`):** unconnected `optional: true` input → skip silently; connected optional ports validated normally. Unconnected optional inputs produce no entry in `inputContracts`.
- **Phase 2 config (`validate-config.ts`):** two new field handlers:
  - `ConditionList`: `EMPTY_CONDITIONS`, `CONDITION_COLUMN_NOT_FOUND` (skip when columns `"unknown"`), `CONDITION_VALUE_MISSING`, `CONDITION_VALUE_TYPE_MISMATCH`.
  - `Expression`: DSL parser → `EXPRESSION_PARSE_ERROR` (context carries position), `EXPRESSION_UNKNOWN_COLUMN`, `EXPRESSION_NON_NUMERIC_COLUMN`, `EXPRESSION_OUTPUT_COLLISION`; `outputColumn` identifier-format check.
- **Phase 3 constraints:**
  - `disjoint` → N-ary: accepts `{ targets: [...paths], exclude?: PathRef }`; legacy `{left,right}` form stays valid (both forms honor `exclude`).
  - New `columnsExist` operator: `{ op:"columnsExist", columns: PathRef, inputs: [...paths] }` → every named column must exist in every resolved dataset input; missing → `KEYS_NOT_FOUND`. Skips inputs whose columns are `"unknown"`.
  - `rowCountMatches`: no change required — targets resolving to `undefined` are already filtered out; a pin test locks this behavior for unconnected optional inputs.
- **Path resolution:** `resolvePath` gains `$inputs.<portId>.*` as an alias for `$input.<portId>.*`. (The existing `concat_features` seed uses `$inputs.*` paths that silently resolve to `undefined` today — this also fixes that latent bug.)
- **Phase 4 contracts (`build-contract.ts`):**
  - `copyInput` handler: apply `addColumns` after `columnUpdates`; name collision → `COLUMN_COLLISION`.
  - New `joinColumns` handler: columns = left ++ (right − keys); target/task/role from left.
  - `concatColumns` handler: skip inputs resolving to `undefined`.
- **DSL (TS):** new `src/dsl/` — `ast.ts`, `tokenizer.ts`, `parser.ts` (recursive descent over the Python-subset grammar in §2.5), `validate.ts` (semantic check against column list). Pure, no deps, ~300 lines.
- **Shared test vectors:** `packages/pipeline-engine/tests/dsl/vectors.json` (~40 cases: valid expressions, precedence, each function, parse errors with positions, unknown/non-numeric columns). Copied verbatim into worker test fixtures.

## 5. Python Worker Changes (`apps/services/worker`)

- **DSL evaluator** — `src/dsl/expression.py`: stdlib-`ast`-based validator + interpreter per §2.5 (`ast.parse` → node whitelist → vectorized numpy/pandas evaluation). No hand-written tokenizer/parser on the Python side. Tested against the same `vectors.json` as the TS parser. Division-by-zero/nulls follow pandas semantics (NaN/inf propagate; no silent cleaning). Result cast to `outputType` (`float64`/`Int64`/boolean); uncastable → `BlockExecutionError`.
- **New blocks** (each ~60–120 lines, existing block patterns):
  | File | Behavior | Summary |
  |---|---|---|
  | `blocks/preprocessing/filter_rows.py` | per-condition mask (`==`, `!=`, `>`, …, `str.contains`, `isna()`, `isin()`), combine `&`/`\|`, negate on `invert`, `frame[mask]`; metadata untouched | `{rowsIn, rowsOut, rowsRemoved}` |
  | `blocks/preprocessing/custom_feature_formula.py` | parse → check cols exist+numeric → evaluate → append `outputColumn`; collision → error | `{addedColumn, expression}` |
  | `blocks/preprocessing/join_datasets.py` | pre-checks (keys in both, non-key disjoint) then `pd.merge(on=keys, how=strategy)`; metadata from left | `{leftRows, rightRows, outRows, strategy, keys}` |
  | `blocks/preprocessing/feature_union.py` | connected inputs in port order A→D, check equal row counts + disjoint, `reset_index` + `pd.concat(axis=1)`; target from first input that has one | `{inputCount, outColumns}` |
- **Registry:** add `(filter_rows,1)`, `(custom_feature_formula,1)`, `(join_datasets,1)`, `(feature_union,1)`. `concat_features` remains registered.
- **Runtime null-hardening (no version bumps):** shared helper `require_no_nulls(frame, columns, block_name)` raising `BlockExecutionError` with the friendly message; applied in `normalize`, `encode`, `random_forest`, `logistic_regression`, `svm`, `kmeans`. Models check the full feature matrix + target column.

## 6. API / Migration (`apps/services/api`)

One migration `<timestamp>-AddFeatureEngineeringBlocks.ts`:
- `INSERT` 4 rows into `block_definitions` with the full ports/config/constraints/outputTransform JSON from §2 (category: Preprocessing).
- `UPDATE block_definitions SET status='deprecated' WHERE executor_key='concat_features'`.
- `down()`: delete the 4 rows; restore `concat_features` to `active`.

### New validation error codes

| Code | Scope | Raised by |
|---|---|---|
| `EMPTY_CONDITIONS` | config | Filter Rows — no conditions |
| `CONDITION_COLUMN_NOT_FOUND` | config | Condition references missing column |
| `CONDITION_VALUE_MISSING` | config | Non-null op without value |
| `CONDITION_VALUE_TYPE_MISMATCH` | config | e.g. `gt` on string column |
| `EXPRESSION_PARSE_ERROR` | config | DSL syntax error (context has position) |
| `EXPRESSION_UNKNOWN_COLUMN` | config | Formula references missing column |
| `EXPRESSION_NON_NUMERIC_COLUMN` | config | Formula references categorical column |
| `EXPRESSION_OUTPUT_COLLISION` | config | `outputColumn` already exists |
| `EXPRESSION_OUTPUT_INVALID` | config | `outputColumn` fails identifier-format check |
| `EXPRESSION_INVALID_ARITY` | config | DSL function called with wrong argument count |
| `COLUMN_COLLISION` | contract | `addColumns`/`joinColumns` name clash (defense-in-depth) |
| `KEYS_NOT_FOUND` | constraint | `columnsExist` — join key missing from an input |

Runtime errors reuse `BlockExecutionError` → `node.failed` SSE; no new event types.

## 7. Frontend Changes (`apps/web`)

- **`ConditionListEditor`:** rows of `[column select][op select][value input]`; value hidden for `isNull`/`isNotNull`, comma-split text for `in`; add/remove row buttons. `combinator` Select + `invert` Switch use existing field renderers.
- **`ExpressionInput`:** monospace text input; `EXPRESSION_*` errors render inline like existing config errors.
- **`BlockConfigForm`:** dispatch the two new field types alongside the existing 9.
- **Canvas:** optional input ports render as dashed handles with "optional" tooltip; unconnected optional inputs show no error state (engine produces none).
- **Palette:** `useBlockPalette` filters out `status === 'deprecated'` blocks; deprecated blocks already on a canvas still render.

## 8. Test Plan

| Suite | Coverage |
|---|---|
| `pipeline-engine/tests/dsl/` | TS parser vs `vectors.json` (~40 cases) |
| `pipeline-engine/tests/` | optional ports (skip/connected); N-ary disjoint + `exclude`; rowCountMatches skipping unconnected; `addColumns`/`joinColumns` contract shapes; ConditionList config validation; 4-block graph fixtures end-to-end |
| `worker/tests/test_dsl.py` | Python parser+evaluator vs same `vectors.json`; evaluation on small synthetic DataFrame |
| `worker/tests/test_blocks.py` | +4 block suites: success, invalid config, metadata propagation (target/role survive filter/union/join), join strategy matrix, feature_union with 2/3/4 inputs, defense-in-depth errors |
| worker null-hardening | each hardened block fails with friendly missing-values message on NaN input |
| API | migration up/down on scratch DB; `GET /v1/block-definitions` → 21 active + 1 deprecated |
| FE (jest) | ConditionListEditor add/remove/op-switch; ExpressionInput error rendering; optional-port handle render |
| E2E | extended Iris demo: Impute → branch → (Normalization) + (Custom Feature Formula) → Feature Union → Train/Test Split → Random Forest → Evaluation; plus a Join path with a second CSV; expect `run.completed` |

## 9. Explicit Non-Goals

Ternary expressions and logical `and`/`or`/`not` in the DSL; chained comparisons; string-producing formulas; Remove Duplicates block; design-time nullable warnings; FE expression autocomplete; migrating existing pipelines off `concat_features`; any change to the 4 artifact types or the 5-phase validation lifecycle.
