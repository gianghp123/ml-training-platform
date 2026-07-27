# Feature Blocks — Part 3: API Migration, Frontend & E2E — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 4 new blocks visible in the DB, configurable from the builder UI, and runnable in a chained Iris smoke test.

**Architecture:** A single TypeORM migration inserts the 4 block definitions (per the fixture shapes from Part 1 Task 10) and deprecates `concat_features`. The frontend extends `BlockConfigForm` with two new field renderers (`ConditionList`, `Expression`), filters the palette by block status, and styles optional input handles. The Python worker smoke test exercises a branched pipeline.

**Tech Stack:**
- **API:** NestJS, TypeORM, raw SQL migrations (matches existing pattern in `apps/services/api/src/database/migrations/`).
- **Web:** Next.js, React 19, react-hook-form, shadcn/ui — **read `node_modules/next/dist/docs/` first per `apps/web/AGENTS.md` before writing any code that uses Next.js APIs.**
- **E2E:** Python, pytest, the existing `iris_smoke_demo.py` pattern.

**Conventions:**
- API tests: `npm test -w @training-ml/contracts-svc` (or just run the unit suite).
- API migration: `npm run migration:run -w @training-ml/contracts-svc` (or however the project runs migrations — check `package.json` first).
- Web tests: `npx jest <path>` from `apps/web`.
- Worker tests: `pytest tests/<path>` from `apps/services/worker`.
- Do NOT commit plan/spec files (gitignored under `docs/superpowers/`).

**Cross-references:**
- Part 1 (`feature-blocks-1-contracts-engine.md`) defines the contract shapes and engine semantics.
- Part 2 (`feature-blocks-2-python-worker.md`) implements the worker-side executors.

---

### Task 1: API migration — seed 4 new blocks and deprecate `concat_features`

**Files:**
- Create: `apps/services/api/src/database/migrations/<timestamp>-AddFeatureEngineeringBlocks.ts` (use a real ts-timestamp; placeholder below)
- Test: rely on existing migration test infrastructure (no new test — the down() round-trip is exercised when running the suite)

- [ ] **Step 1: Confirm migration command**

Read `apps/services/api/package.json`'s `scripts` and confirm the migration command (likely `migration:run` / `migration:revert`). The migration filename must start with a numeric timestamp; pick one minute later than the latest existing migration. Existing migrations end at `1784860000000-AddWorkflowExecutionRuntime.ts`; use `1784900000000-AddFeatureEngineeringBlocks.ts`.

- [ ] **Step 2: Write the migration**

Create `apps/services/api/src/database/migrations/1784900000000-AddFeatureEngineeringBlocks.ts`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeatureEngineeringBlocks1784900000000
  implements MigrationInterface
{
  name = "AddFeatureEngineeringBlocks1784900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cat = (name: string) =>
      `(SELECT "id" FROM "block_categories" WHERE "name" = '${name}')`;

    await queryRunner.query(`
      INSERT INTO "block_definitions" (
        "id", "version", "status", "executor_key", "name", "category_id",
        "ports", "config_schema", "constraints", "output_transform", "created_at"
      ) VALUES
      (
        uuid_generate_v4(), 1, 'active', 'filter_rows', 'Filter Rows', ${cat("Preprocessing")},
        '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"conditions","type":"ConditionList","ops":["eq","ne","gt","gte","lt","lte","contains","isNull","isNotNull","in"]},
          {"id":"combinator","type":"Select","options":["AND","OR"],"default":"AND"},
          {"id":"invert","type":"Boolean","default":false}
        ]}',
        '{}',
        '{"declared":{"copyInput":true}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'custom_feature_formula', 'Custom Feature Formula', ${cat("Preprocessing")},
        '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"outputColumn","type":"Text"},
          {"id":"outputType","type":"Select","options":["float","int","boolean"],"default":"float"},
          {"id":"expression","type":"Expression"}
        ]}',
        '{}',
        '{"declared":{"copyInput":true,"addColumns":[{"name":"$config.outputColumn","primitive":"$config.outputType"}]}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'join_datasets', 'Join Datasets', ${cat("Preprocessing")},
        '{"inputs":[{"id":"left","artifact":"Dataset"},{"id":"right","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"keys","type":"ColumnSelector","multiple":true},
          {"id":"strategy","type":"Select","options":["inner","left","right","full"],"default":"inner"}
        ]}',
        '{"rules":[
          {"op":"exists","target":"$config.keys","message":"At least one join key is required."},
          {"op":"columnsExist","columns":"$config.keys","inputs":["$input.left","$input.right"],"message":"Every join key must exist in both input datasets."},
          {"op":"disjoint","left":"$input.left","right":"$input.right","exclude":"$config.keys","message":"Non-key columns must not collide. Rename them before joining."}
        ]}',
        '{"declared":{"joinColumns":{"left":"$input.left","right":"$input.right","keys":"$config.keys"}}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'feature_union', 'Feature Union', ${cat("Preprocessing")},
        '{"inputs":[
          {"id":"datasetA","artifact":"Dataset"},
          {"id":"datasetB","artifact":"Dataset"},
          {"id":"datasetC","artifact":"Dataset","optional":true},
          {"id":"datasetD","artifact":"Dataset","optional":true}
        ],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[]}',
        '{"rules":[
          {"op":"rowCountMatches","targets":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"],"message":"All feature branches must have the same number of rows."},
          {"op":"disjoint","targets":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"],"message":"Column names must be unique across all feature branches."}
        ]}',
        '{"declared":{"concatColumns":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"]}}',
        now()
      )
    `);

    await queryRunner.query(`
      UPDATE "block_definitions"
      SET "status" = 'deprecated'
      WHERE "executor_key" = 'concat_features'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "block_definitions"
      SET "status" = 'active'
      WHERE "executor_key" = 'concat_features'
    `);
    await queryRunner.query(`
      DELETE FROM "block_definitions"
      WHERE "executor_key" IN ('filter_rows', 'custom_feature_formula', 'join_datasets', 'feature_union')
    `);
  }
}
```

- [ ] **Step 3: Run the migration against a local DB**

Run: `npm run migration:run -w <api-package>` (workdir `apps/services/api`; command name confirmed in Step 1)
Expected: SUCCESS — 4 rows inserted, 1 row updated.

- [ ] **Step 4: Smoke-check via the API**

Run: `curl -s http://localhost:<port>/v1/block-definitions | jq '[.data[] | {name, executorKey, status}]'`
Expected: 21 active blocks + `Concat Features` with `status: "deprecated"`.

---

### Task 2: BlockConfigForm — add `ConditionList` and `Expression` field dispatch

**Files:**
- Modify: `apps/web/features/builder/components/BlockConfigForm.tsx` (extend `buildZodSchema`, `buildDefaultValues`, and the Controller render switch)
- Create: `apps/web/features/builder/components/ConditionListEditor.tsx`
- Create: `apps/web/features/builder/components/ExpressionInput.tsx`
- Test: `apps/web/features/builder/components/__tests__/BlockConfigForm.test.tsx`
- Test: `apps/web/features/builder/components/__tests__/ConditionListEditor.test.tsx`
- Test: `apps/web/features/builder/components/__tests__/ExpressionInput.test.tsx`

- [ ] **Step 0 (READ DOCS): Confirm Next.js APIs**

Per `apps/web/AGENTS.md`, read the relevant guide(s) in `node_modules/next/dist/docs/` for anything you plan to call — in this case none of the new code uses Next.js features (the components are client components using `react-hook-form` and shadcn/ui), but verify the file you touch is in the `"use client"` scope. Also confirm shadcn `Field`, `Input`, `Button`, `Select`, `Checkbox` exist in `apps/web/components/ui/`.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/features/builder/components/__tests__/ConditionListEditor.test.tsx`:

```typescript
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
```

Create `apps/web/features/builder/components/__tests__/ExpressionInput.test.tsx`:

```typescript
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
```

Create `apps/web/features/builder/components/__tests__/BlockConfigForm.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import type { ConfigField } from "@training-ml/contracts";
import { BlockConfigForm } from "../BlockConfigForm";

const fields: ConfigField[] = [
  { type: "ConditionList", id: "conditions", ops: ["eq", "isNull"] },
  { type: "Expression", id: "expression" },
  { type: "Text", id: "outputColumn" },
];

// BlockConfigForm depends on ValidationContext (used by ColumnSelectorField).
// For this test we render with the new fields, none of which need a contract.
jest.mock("../../contexts/validation.context", () => ({
  useValidationContext: () => ({
    contracts: {},
    inputContracts: {},
    getNodeErrors: () => [],
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
```

Run: `npx jest features/builder/components/__tests__/ConditionListEditor.test.tsx features/builder/components/__tests__/ExpressionInput.test.tsx features/builder/components/__tests__/BlockConfigForm.test.tsx` (workdir `apps/web`)
Expected: FAIL — components not yet created.

- [ ] **Step 2: Implement `ConditionListEditor`**

Create `apps/web/features/builder/components/ConditionListEditor.tsx`:

```typescript
"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterCondition } from "@training-ml/contracts";

const NO_VALUE_OPS = new Set(["isNull", "isNotNull"]);

export interface ConditionListEditorProps {
  value: FilterCondition[];
  onChange: (next: FilterCondition[]) => void;
  ops: string[];
  columns: string[];
  disabled?: boolean;
}

export function ConditionListEditor({
  value,
  onChange,
  ops,
  columns,
  disabled = false,
}: ConditionListEditorProps) {
  const add = () => {
    const first = columns[0] ?? "";
    onChange([...value, { column: first, op: "eq", value: "" }]);
  };

  const update = (index: number, patch: Partial<FilterCondition>) => {
    const next = value.map((cond, i) => (i === index ? { ...cond, ...patch } : cond));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {value.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No conditions yet.</p>
      ) : (
        value.map((cond, index) => {
          const op = String(cond.op ?? "");
          const needsValue = !NO_VALUE_OPS.has(op);
          return (
            <div key={index} className="flex items-center gap-1">
              <Select
                value={String(cond.column ?? "")}
                onValueChange={(v) => update(index, { column: v })}
                disabled={disabled}
              >
                <SelectTrigger className="h-6 w-32 text-xs nodrag nopan" aria-label={`Column ${index + 1}`}>
                  <SelectValue placeholder="column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={op} onValueChange={(v) => update(index, { op: v })} disabled={disabled}>
                <SelectTrigger className="h-6 w-24 text-xs nodrag nopan" aria-label={`Operator ${index + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsValue && (
                <Input
                  className="nodrag nopan h-6 min-w-0 flex-1 text-xs"
                  value={cond.value === undefined || cond.value === null ? "" : String(cond.value)}
                  disabled={disabled}
                  onChange={(e) => update(index, { value: e.target.value })}
                  placeholder="value"
                  aria-label={`Value ${index + 1}`}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() => remove(index)}
                aria-label={`Remove condition ${index + 1}`}
              >
                <X className="size-3" />
              </Button>
            </div>
          );
        })
      )}
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={disabled}
        onClick={add}
        className="nodrag nopan w-full"
      >
        <Plus className="size-3" />
        Add condition
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `ExpressionInput`**

Create `apps/web/features/builder/components/ExpressionInput.tsx`:

```typescript
"use client";

import { Input } from "@/components/ui/input";

export interface ExpressionInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = "e.g. Income / (Age + 1)",
  disabled = false,
  error,
}: ExpressionInputProps) {
  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="nodrag nopan h-6 text-xs font-mono"
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Wire the new fields into `BlockConfigForm`**

In `apps/web/features/builder/components/BlockConfigForm.tsx`:

Add to imports (at the top):

```typescript
import type { FilterCondition } from "@training-ml/contracts";
import { ConditionListEditor } from "./ConditionListEditor";
import { ExpressionInput } from "./ExpressionInput";
import { useValidationContext } from "../contexts/validation.context";
```

Inside `BlockConfigForm`, add access to contracts for the ConditionList column picker:

```typescript
const { contracts, inputContracts } = useValidationContext();
const inputColumns = useMemo(() => {
  const inputContract =
    inputContracts[nodeId]?.dataset ?? contracts[nodeId]?.dataset;
  if (!inputContract || inputContract.artifact !== "Dataset") return [];
  if (inputContract.schema.columns === "unknown") return [];
  return inputContract.schema.columns.map((c) => c.name);
}, [nodeId, contracts, inputContracts]);
```

In `buildZodSchema` (around line 290), add a `ConditionList` case to the switch:

```typescript
      case "ConditionList": {
        shape[field.id] = z.array(
          z.object({
            column: z.string().min(1),
            op: z.string().min(1),
            value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
          }),
        );
        break
      }
      case "Expression": {
        shape[field.id] = z.string()
        break
      }
```

In `buildDefaultValues` (around line 336), add:

```typescript
      case "ConditionList":
        defaults[field.id] = Array.isArray(raw)
          ? (raw as FilterCondition[]).map((c) => ({
              column: String(c.column ?? ""),
              op: String(c.op ?? "eq"),
              value: c.value,
            }))
          : []
        break
      case "Expression":
        defaults[field.id] = raw !== undefined ? String(raw) : ""
        break
```

In the Controller's `render` (around line 405), add two new field render cases inside the `Field` block, after the existing branches:

```tsx
              {field.type === "ConditionList" && (
                <ConditionListEditor
                  value={Array.isArray(controllerField.value) ? (controllerField.value as FilterCondition[]) : []}
                  onChange={(next) => {
                    controllerField.onChange(next)
                    onChange(field.id, next)
                  }}
                  ops={field.ops as string[]}
                  columns={inputColumns}
                  disabled={disabled}
                />
              )}
              {field.type === "Expression" && (
                <ExpressionInput
                  value={String(controllerField.value ?? "")}
                  onChange={(v) => {
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                  disabled={disabled}
                />
              )}
```

- [ ] **Step 5: Run the new tests**

Run: `npx jest features/builder/components/__tests__/ConditionListEditor.test.tsx features/builder/components/__tests__/ExpressionInput.test.tsx features/builder/components/__tests__/BlockConfigForm.test.tsx` (workdir `apps/web`)
Expected: PASS

---

### Task 3: BlockConfigForm — surface engine EXPRESSION_* errors inline

**Files:**
- Modify: `apps/web/features/builder/components/BlockConfigForm.tsx` (read validation errors and pass to ExpressionInput)

- [ ] **Step 1: Write the failing test**

Append to `apps/web/features/builder/components/__tests__/BlockConfigForm.test.tsx`:

```typescript
describe("BlockConfigForm surfaces expression errors", () => {
  it("shows an error message under the expression field", () => {
    jest.doMock("../../contexts/validation.context", () => ({
      useValidationContext: () => ({
        contracts: {},
        inputContracts: {},
        getNodeErrors: () => [
          { nodeId: "n1", scope: "config", fieldId: "expression", code: "EXPRESSION_PARSE_ERROR", severity: "error", message: "Unexpected end", context: { position: 5 } },
        ],
      }),
    }));
    // Reset the previous mock
    jest.resetModules();
    // Re-import after mocking
    const { BlockConfigForm: Form } = require("../BlockConfigForm");
    render(
      <Form
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/builder/components/__tests__/BlockConfigForm.test.tsx`
Expected: FAIL — `ExpressionInput` doesn't receive the error.

- [ ] **Step 3: Implement**

In `BlockConfigForm`, add access to node errors in the existing form:

```typescript
const { contracts, inputContracts, getNodeErrors } = useValidationContext();
const nodeErrors = getNodeErrors(nodeId);
```

In the Controller render for `Expression` (added in Task 2), pass the engine's error message:

```tsx
              {field.type === "Expression" && (
                <ExpressionInput
                  value={String(controllerField.value ?? "")}
                  onChange={(v) => {
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                  disabled={disabled}
                  error={nodeErrors.find((e) => e.fieldId === field.id)?.message}
                />
              )}
```

(For the `ConditionList` field, errors are already rendered by the form's existing `fieldState.error` for the field's zod resolver. The engine emits `EMPTY_CONDITIONS` / `CONDITION_*` with a `fieldId` matching the condition list; show those alongside the rows. Extend `nodeErrors` lookup: pass `error={...}` to `ConditionListEditor` if it accepts a list; otherwise rely on the form-level errors list rendered below the block. Keep this task minimal — a follow-up can polish condition-level error rendering.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest features/builder/components/__tests__/BlockConfigForm.test.tsx`
Expected: PASS

---

### Task 4: useBlockPalette — hide deprecated blocks from the palette

**Files:**
- Modify: `apps/web/features/builder/hooks/useBlockPalette.ts`
- Test: `apps/web/features/builder/hooks/__tests__/useBlockPalette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/features/builder/hooks/__tests__/useBlockPalette.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import { useBlockPalette } from "../useBlockPalette";
import type { BlockCategory, BlockDefinition } from "@training-ml/contracts";

const categories: BlockCategory[] = [
  { id: "pre", name: "Preprocessing" } as BlockCategory,
];
const blocks: BlockDefinition[] = [
  { id: "f1", executorKey: "filter_rows", version: 1, status: "active", name: "Filter Rows", categoryId: "pre", ports: { inputs: [], outputs: [] }, configSchema: { fields: [] }, constraints: {}, outputTransform: {} } as BlockDefinition,
  { id: "c1", executorKey: "concat_features", version: 1, status: "deprecated", name: "Concat Features", categoryId: "pre", ports: { inputs: [], outputs: [] }, configSchema: { fields: [] }, constraints: {}, outputTransform: {} } as BlockDefinition,
];

describe("useBlockPalette filters deprecated blocks", () => {
  it("excludes deprecated blocks from the palette", () => {
    const { result } = renderHook(() => useBlockPalette({ blocks, categories }));
    expect(result.current.filteredBlocks.map((b) => b.name)).toEqual(["Filter Rows"]);
    expect(result.current.blocksByCategory[0].blocks.map((b) => b.name)).toEqual(["Filter Rows"]);
  });

  it("getBlockById still resolves deprecated blocks (for existing pipelines)", () => {
    const { result } = renderHook(() => useBlockPalette({ blocks, categories }));
    expect(result.current.getBlockById("c1")?.name).toBe("Concat Features");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/builder/hooks/__tests__/useBlockPalette.test.ts` (workdir `apps/web`)
Expected: FAIL — no status filter in `filteredBlocks`.

- [ ] **Step 3: Implement**

In `apps/web/features/builder/hooks/useBlockPalette.ts`, change the `filteredBlocks` memo to first drop deprecated blocks (the search filter still applies):

```typescript
  const filteredBlocks = useMemo(() => {
    const active = blocks.filter((b) => b.status !== "deprecated");
    if (!searchQuery.trim()) return active;
    const q = searchQuery.toLowerCase();
    return active.filter((b) => b.name.toLowerCase().includes(q));
  }, [searchQuery, blocks]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest features/builder/hooks/__tests__/useBlockPalette.test.ts`
Expected: PASS

---

### Task 5: BaseNode — style optional input handles

**Files:**
- Modify: `apps/web/features/builder/components/nodes/BaseNode.tsx`
- Test: `apps/web/features/builder/components/__tests__/BaseNode.test.tsx`

- [ ] **Step 0: Confirm the input port type**

`BaseNode` reads `data.inputs: Array<{id, artifact}>`. Check `apps/web/features/builder/utils/node-factory.ts` (or wherever the node data is built) to confirm the shape now includes `optional?: boolean`. If not, extend the `PipelineNode` data type to include `optional` on input ports, and propagate it from `data.block.ports.inputs[i].optional` in the node factory. This is a small upstream change — do it before styling the handle.

- [ ] **Step 1: Write the failing test**

Create `apps/web/features/builder/components/__tests__/BaseNode.test.tsx`:

```typescript
import { render } from "@testing-library/react";
import BaseNode from "../nodes/BaseNode";
import { ReactFlowProvider } from "@xyflow/react";
import { BuilderContext } from "../../contexts/builder.context";
import { ValidationContext } from "../../contexts/validation.context";

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ReactFlowProvider>
      <BuilderContext.Provider value={builderValue}>
        <ValidationContext.Provider value={validationValue}>{ui}</ValidationContext.Provider>
      </BuilderContext.Provider>
    </ReactFlowProvider>,
  );
}

const builderValue = {
  blocks: [],
  datasets: [],
  onConfigChange: () => {},
  isLocked: false,
} as any;
const validationValue = {
  contracts: {},
  inputContracts: {},
  getNodeErrors: () => [],
} as any;

const makeNode = (inputs: Array<{ id: string; artifact: string; optional?: boolean }>) => ({
  id: "n1",
  data: {
    blockId: "feature_union",
    blockName: "Feature Union",
    categoryId: "Preprocessing",
    block: { ports: { inputs, outputs: [{ id: "dataset", artifact: "Dataset" }] } },
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
    // ReactFlow Handle renders a span with the data-handleid attr.
    const optionalHandle = container.querySelector('[data-handleid="datasetC"]');
    expect(optionalHandle?.getAttribute("class") ?? "").toMatch(/dashed|dotted/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/builder/components/__tests__/BaseNode.test.tsx` (workdir `apps/web`)
Expected: FAIL — no dashed style.

- [ ] **Step 3: Implement**

In `apps/web/features/builder/components/nodes/BaseNode.tsx`, modify the input handle block to apply a dashed ring class when `input.optional` is true, and update the tooltip text. Replace the input render block (lines 131–158) with:

```tsx
          <div>
            {data.inputs.map((input) => (
              <div key={input.id} className="relative flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={input.id}
                      style={{
                        ...handleStyle,
                        top: "auto",
                        bottom: "auto",
                        left: -5,
                        position: "absolute",
                        transform: "none",
                      }}
                      className={`static! border-2! border-background! ${dotColor} ${
                        input.optional ? "ring-1 ring-dashed ring-foreground/40" : ""
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {input.id} ({input.artifact})
                    {input.optional ? " · optional" : ""}
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">
                  {input.id}
                  {input.optional ? " (optional)" : ""}
                </span>
              </div>
            ))}
          </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest features/builder/components/__tests__/BaseNode.test.tsx`
Expected: PASS

---

### Task 6: E2E — branched Iris pipeline via the worker's smoke demo

**Files:**
- Modify: `apps/services/worker/scripts/iris_smoke_demo.py` (extend to use the 4 new blocks; OR add a new `apps/services/worker/scripts/feature_blocks_demo.py`)

- [ ] **Step 0: Read the existing demo**

Read `apps/services/worker/scripts/iris_smoke_demo.py` to understand the existing pattern (job construction, run, assertions).

- [ ] **Step 1: Create the new demo script**

Create `apps/services/worker/scripts/feature_blocks_demo.py` — a branched pipeline:

```python
"""Branched Iris pipeline exercising the 4 new feature blocks.

Topology:
  Iris CSV
    -> Impute
    -> Custom Feature Formula (PetalArea = SepalLengthCm * SepalWidthCm)
    -> Filter Rows (SepalLengthCm > 4.5)
    -> Custom Feature Formula (SepalArea = PetalLengthCm * PetalWidthCm)
    -> Feature Union (impute | formula2)
    -> Select Target
    -> Train/Test Split
    -> Random Forest -> Save Model
    -> Evaluation (test split, accuracy)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))


def build_job(run_id: str, dataset_id: str) -> dict:
    return {
        "schemaVersion": 1,
        "runId": run_id,
        "graph": {
            "nodes": [
                {"id": "load", "blockId": "load-csv", "blockVersion": 1, "config": {"dataset": dataset_id}},
                {"id": "impute", "blockId": "impute-missing", "blockVersion": 1, "config": {"columns": "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm", "strategy": "Mean"}},
                {"id": "formula1", "blockId": "custom-feature-formula", "blockVersion": 1, "config": {"outputColumn": "PetalArea", "outputType": "float", "expression": "SepalLengthCm * SepalWidthCm"}},
                {"id": "formula2", "blockId": "custom-feature-formula", "blockVersion": 1, "config": {"outputColumn": "SepalArea", "outputType": "float", "expression": "PetalLengthCm * PetalWidthCm"}},
                {"id": "filter", "blockId": "filter-rows", "blockVersion": 1, "config": {"conditions": [{"column": "SepalLengthCm", "op": "gt", "value": 4.5}], "combinator": "AND"}},
                {"id": "union", "blockId": "feature-union", "blockVersion": 1, "config": {}},
                {"id": "select", "blockId": "select-target", "blockVersion": 1, "config": {"targetColumn": "species", "task": "classification"}},
                {"id": "split", "blockId": "train-test-split", "blockVersion": 1, "config": {"testSize": 0.2, "stratify": True}},
                {"id": "rf", "blockId": "random-forest", "blockVersion": 1, "config": {"n_estimators": 50, "max_depth": 5}},
                {"id": "save", "blockId": "save-model", "blockVersion": 1, "config": {"format": "joblib", "name": "iris-demo"}},
                {"id": "eval", "blockId": "evaluate", "blockVersion": 1, "config": {"metrics": "accuracy"}},
            ],
            "edges": [
                {"id": "e1", "sourceNodeId": "load", "sourcePortId": "dataset", "targetNodeId": "impute", "targetPortId": "dataset"},
                {"id": "e2", "sourceNodeId": "impute", "sourcePortId": "dataset", "targetNodeId": "formula1", "targetPortId": "dataset"},
                {"id": "e3", "sourceNodeId": "formula1", "sourcePortId": "dataset", "targetNodeId": "filter", "targetPortId": "dataset"},
                {"id": "e4", "sourceNodeId": "filter", "sourcePortId": "dataset", "targetNodeId": "formula2", "targetPortId": "dataset"},
                {"id": "e5", "sourceNodeId": "impute", "sourcePortId": "dataset", "targetNodeId": "union", "targetPortId": "datasetA"},
                {"id": "e6", "sourceNodeId": "formula2", "sourcePortId": "dataset", "targetNodeId": "union", "targetPortId": "datasetB"},
                {"id": "e7", "sourceNodeId": "union", "sourcePortId": "dataset", "targetNodeId": "select", "targetPortId": "dataset"},
                {"id": "e8", "sourceNodeId": "select", "sourcePortId": "dataset", "targetNodeId": "split", "targetPortId": "dataset"},
                {"id": "e9", "sourceNodeId": "split", "sourcePortId": "train", "targetNodeId": "rf", "targetPortId": "dataset"},
                {"id": "e10", "sourceNodeId": "rf", "sourcePortId": "model", "targetNodeId": "save", "targetPortId": "model"},
                {"id": "e11", "sourceNodeId": "split", "sourcePortId": "test", "targetNodeId": "eval", "targetPortId": "dataset"},
                {"id": "e12", "sourceNodeId": "rf", "sourcePortId": "model", "targetNodeId": "eval", "targetPortId": "model"},
            ],
        },
        "blocks": {
            "load-csv": {"id": "load-csv", "version": 1, "executorKey": "load_csv", "name": "Load CSV", "ports": {"inputs": [], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "impute-missing": {"id": "impute-missing", "version": 1, "executorKey": "impute_missing", "name": "Impute Missing Values", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "custom-feature-formula": {"id": "custom-feature-formula", "version": 1, "executorKey": "custom_feature_formula", "name": "Custom Feature Formula", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "filter-rows": {"id": "filter-rows", "version": 1, "executorKey": "filter_rows", "name": "Filter Rows", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "feature-union": {"id": "feature-union", "version": 1, "executorKey": "feature_union", "name": "Feature Union", "ports": {"inputs": [{"id": "datasetA", "artifact": "Dataset"}, {"id": "datasetB", "artifact": "Dataset"}, {"id": "datasetC", "artifact": "Dataset", "optional": True}, {"id": "datasetD", "artifact": "Dataset", "optional": True}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "select-target": {"id": "select-target", "version": 1, "executorKey": "select_target", "name": "Select Target", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "train-test-split": {"id": "train-test-split", "version": 1, "executorKey": "train_test_split", "name": "Train/Test Split", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "train", "artifact": "Dataset"}, {"id": "test", "artifact": "Dataset"}]}},
            "random-forest": {"id": "random-forest", "version": 1, "executorKey": "random_forest", "name": "Random Forest", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "model", "artifact": "Model"}]}},
            "save-model": {"id": "save-model", "version": 1, "executorKey": "save_model", "name": "Save Model", "ports": {"inputs": [{"id": "model", "artifact": "Model"}], "outputs": [{"id": "savedModel", "artifact": "SavedModel"}]}},
            "evaluate": {"id": "evaluate", "version": 1, "executorKey": "evaluate", "name": "Evaluation", "ports": {"inputs": [{"id": "model", "artifact": "Model"}, {"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "metrics", "artifact": "Metrics"}]}},
        },
        "datasets": {
            "iris": {"id": "iris", "objectKey": "datasets/iris.csv", "name": "iris.csv", "format": "csv", "profile": None, "validationOptions": {}},
        },
    }


def main() -> int:
    """Run the demo end-to-end. Mirrors the wiring in iris_smoke_demo.py:
    read Database / EventPublisher / MinIO from env (Settings in src/config.py),
    preload the Iris CSV into the storage, build the job, and run it.
    On success, the run.completed event is published and accuracy is logged.
    """
    # Implementation follows apps/services/worker/scripts/iris_smoke_demo.py.
    # (Read that file first; replicate its env wiring and storage pre-population.)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
```

Adapt the wiring in `main()` to use the same Database/Storage/Event wiring as `iris_smoke_demo.py` (read it first and replicate the env-config pattern). The expected outcome: `runner.run(...)` returns `RunOutcome(status="completed")`; the Evaluation node's output `metrics["accuracy"]` ≥ 0.85.

- [ ] **Step 2: Add a test that runs the demo with in-memory stubs**

Create `apps/services/worker/tests/test_feature_blocks_demo.py`:

```python
import sys
from pathlib import Path

import pandas as pd
import pytest

from src.runtime import DatasetValue
from src.runner import PipelineRunner
from src.storage import MinioObjectStorage

# Existing in-memory test doubles from test_runner.py.
from tests.test_runner import FakeDatabase, FakeEvents  # type: ignore  # already exists

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from feature_blocks_demo import build_job  # noqa: E402


class _FakeStorage(MinioObjectStorage):
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def get_bytes(self, object_key: str) -> bytes:  # type: ignore[override]
        return self.objects[object_key]

    def put_bytes(self, object_key: str, data: bytes, content_type: str) -> str:  # type: ignore[override]
        self.objects[object_key] = data
        return object_key


def test_feature_blocks_demo_completes():
    storage = _FakeStorage()
    storage.objects["datasets/iris.csv"] = (
        pd.read_csv("https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv")
        .to_csv(index=False)
        .encode("utf-8")
    )
    db = FakeDatabase()
    events = FakeEvents()
    runner = PipelineRunner(database=db, events=events, storage=storage)  # type: ignore[arg-type]
    job = build_job(run_id="run-1", dataset_id="iris")
    outcome = runner.run(job, worker_id="worker-1")
    assert outcome.status == "completed"
    # Evaluation node's output: "accuracy" key exists.
    eval_summary = db.summaries.get("eval", {})
    assert "accuracy" in str(eval_summary)
```

- [ ] **Step 3: Run the E2E test**

Run: `pytest tests/test_feature_blocks_demo.py -q` (workdir `apps/services/worker`)
Expected: PASS — full pipeline runs through Filter Rows, Custom Feature Formula, Feature Union (2 inputs), Random Forest, Save Model, Evaluation.

---

## Part 3 Done-When Checklist

- [ ] API migration applied locally — 21 active + 1 deprecated block visible at `GET /v1/block-definitions`
- [ ] All new FE tests pass: `npx jest features/builder` (workdir `apps/web`)
- [ ] Full worker suite green: `pytest tests -q` (workdir `apps/services/worker`)
- [ ] Full engine suite green: `npm test -w @training-ml/pipeline-engine`
- [ ] E2E demo runs to `completed` with accuracy ≥ 0.85
- [ ] No commits of `docs/superpowers/`

## Final Handoff

With all 3 parts complete:
- 4 new blocks are end-to-end usable: spec-validated in the engine, executed in the worker, seeded in the DB, configurable from the builder UI, and demonstrated via a real Iris pipeline.
- `concat_features` is marked deprecated; existing pipelines keep working.
- Null-hardening is in place across the 6 affected existing blocks with the spec's friendly error message.
- The DSL is a Python expression subset; design-time validation (engine) and runtime evaluation (worker) are pinned to a shared `vectors.json` test fixture.
