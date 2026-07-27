# Feature Blocks — Part 1: Contracts & Pipeline Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `@training-ml/contracts` and `@training-ml/pipeline-engine` so the 4 new blocks (Filter Rows, Custom Feature Formula, Join Datasets, Feature Union) validate end-to-end at design time.

**Architecture:** New config field types (`ConditionList`, `Expression`), optional input ports, a Python-subset formula DSL parser (design-time), new/extended constraint operators (`columnsExist`, N-ary `disjoint` with `exclude`), and new output-transform handlers (`addColumns`, `joinColumns`, real `concatColumns` merge). Spec: `docs/superpowers/specs/2026-07-27-feature-engineering-blocks-design.md`.

**Tech Stack:** TypeScript, Zod 4, Jest + ts-jest (tests live in `packages/pipeline-engine/tests/` — the contracts package has no test runner).

**Conventions:**
- Run engine tests from `packages/pipeline-engine/` with `npx jest <path>`.
- After ANY change to `packages/contracts/src/`, rebuild: `npm run build -w @training-ml/contracts` (engine consumes `contracts/dist` at runtime).
- Contracts schemas are Zod; the engine works with plain TS objects (block definitions arrive as JSON from DB).
- Do NOT commit the plan/spec files (`docs/superpowers/` is gitignored).

---

### Task 1: Contracts — FilterCondition schema, new field types, optional ports, transform variants

**Files:**
- Create: `packages/contracts/src/pipeline/filter-condition.schema.ts`
- Modify: `packages/contracts/src/pipeline/config-field.schema.ts`
- Modify: `packages/contracts/src/pipeline/index.ts`
- Modify: `packages/contracts/src/block/block-definition.schema.ts`
- Test: `packages/pipeline-engine/tests/contracts/schema-extensions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/contracts/schema-extensions.test.ts`:

```typescript
import {
  BlockDefinitionSchema,
  ConfigFieldSchema,
  FilterConditionSchema,
  PortSchema,
} from '@training-ml/contracts';

describe('contracts: feature-block schema extensions', () => {
  it('parses a ConditionList field', () => {
    const field = ConfigFieldSchema.parse({
      type: 'ConditionList',
      id: 'conditions',
      ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
    });
    expect(field.type).toBe('ConditionList');
  });

  it('parses an Expression field', () => {
    expect(ConfigFieldSchema.parse({ type: 'Expression', id: 'expression' }).type).toBe('Expression');
  });

  it('parses a filter condition with and without value', () => {
    expect(FilterConditionSchema.parse({ column: 'Age', op: 'gte', value: 18 }).op).toBe('gte');
    expect(FilterConditionSchema.parse({ column: 'Age', op: 'isNull' }).value).toBeUndefined();
    expect(FilterConditionSchema.parse({ column: 'C', op: 'in', value: ['a', 'b'] }).value).toEqual(['a', 'b']);
  });

  it('rejects an unknown filter op', () => {
    expect(() => FilterConditionSchema.parse({ column: 'Age', op: 'regex' })).toThrow();
  });

  it('parses an optional port', () => {
    const port = PortSchema.parse({ id: 'datasetC', artifact: 'Dataset', optional: true });
    expect(port.optional).toBe(true);
  });

  it('parses copyInput with addColumns', () => {
    const def = BlockDefinitionSchema.parse({
      id: 'custom-feature-formula',
      version: 1,
      status: 'active',
      executorKey: 'custom_feature_formula',
      name: 'Custom Feature Formula',
      categoryId: 'Preprocessing',
      ports: {
        inputs: [{ id: 'dataset', artifact: 'Dataset' }],
        outputs: [{ id: 'dataset', artifact: 'Dataset' }],
      },
      configSchema: {
        fields: [
          { type: 'Text', id: 'outputColumn' },
          { type: 'Select', id: 'outputType', options: ['float', 'int', 'boolean'], default: 'float' },
          { type: 'Expression', id: 'expression' },
        ],
      },
      constraints: {},
      outputTransform: {
        declared: {
          copyInput: true,
          addColumns: [{ name: '$config.outputColumn', primitive: '$config.outputType' }],
        },
      },
    });
    expect(def.executorKey).toBe('custom_feature_formula');
  });

  it('parses joinColumns transform', () => {
    const def = BlockDefinitionSchema.parse({
      id: 'join-datasets',
      version: 1,
      status: 'active',
      executorKey: 'join_datasets',
      name: 'Join Datasets',
      categoryId: 'Preprocessing',
      ports: {
        inputs: [
          { id: 'left', artifact: 'Dataset' },
          { id: 'right', artifact: 'Dataset' },
        ],
        outputs: [{ id: 'dataset', artifact: 'Dataset' }],
      },
      configSchema: { fields: [] },
      constraints: {},
      outputTransform: {
        declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
      },
    });
    expect(def.executorKey).toBe('join_datasets');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/contracts/schema-extensions.test.ts` (workdir `packages/pipeline-engine`)
Expected: FAIL — `FilterConditionSchema` is not exported / `ConditionList` not a valid enum value.

- [ ] **Step 3: Implement the contracts changes**

Create `packages/contracts/src/pipeline/filter-condition.schema.ts`:

```typescript
import { z } from 'zod';

export const FilterOp = {
  EQ: 'eq',
  NE: 'ne',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',
  IN: 'in',
} as const;

export const FilterOpSchema = z.enum(
  Object.values(FilterOp) as [string, ...string[]],
);
export type FilterOp = z.infer<typeof FilterOpSchema>;

export const FilterConditionSchema = z.object({
  column: z.string().min(1),
  op: FilterOpSchema,
  value: z
    .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
    .optional(),
});
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
```

In `packages/contracts/src/pipeline/config-field.schema.ts`:
- Add import: `import { FilterOpSchema } from './filter-condition.schema';`
- Add to `ConfigFieldType` const: `CONDITION_LIST: 'ConditionList',` and `EXPRESSION: 'Expression',`
- Add two variants to the `ConfigFieldSchema` discriminated union (before the closing `])`):

```typescript
  z.object({
    type: z.literal(ConfigFieldType.CONDITION_LIST),
    id: z.string(),
    ops: z.array(FilterOpSchema),
  }),
  z.object({
    type: z.literal(ConfigFieldType.EXPRESSION),
    id: z.string(),
    placeholder: z.string().optional(),
  }),
```

In `packages/contracts/src/pipeline/index.ts` add:

```typescript
export * from './filter-condition.schema';
```

In `packages/contracts/src/block/block-definition.schema.ts`:
- `PortSchema`: add `optional: z.boolean().optional(),` after `artifact`.
- In `OutputTransformBodySchema`'s `copyInput` object, add after `columnUpdates`:

```typescript
    addColumns: z
      .array(z.object({ name: z.string(), primitive: z.string() }))
      .optional(),
```

- Add a new variant to `OutputTransformBodySchema` union (after the `concatColumns` object):

```typescript
  z.object({
    joinColumns: z.object({
      left: z.string(),
      right: z.string(),
      keys: z.string(),
    }),
  }),
```

- [ ] **Step 4: Rebuild contracts and run the test**

Run: `npm run build -w @training-ml/contracts` then `npx jest tests/contracts/schema-extensions.test.ts` (workdir `packages/pipeline-engine`)
Expected: PASS (7 tests)

---

### Task 2: Engine — `resolvePath` supports `$inputs.*` alias

**Files:**
- Modify: `packages/pipeline-engine/src/operators/_resolve-path.ts:13`
- Test: `packages/pipeline-engine/tests/operators/resolve-path.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/operators/resolve-path.test.ts`:

```typescript
import { resolvePath } from '../../src/operators/_resolve-path';
import type { NodeContext } from '../../src/types';

const datasetContract = {
  artifact: 'Dataset',
  schema: { columns: [], target: null },
  role: 'full',
  task: null,
} as never;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['id'] } },
  inputContracts: { datasetA: datasetContract },
} as unknown as NodeContext;

describe('resolvePath', () => {
  it('resolves $input.<port> paths', () => {
    expect(resolvePath('$input.datasetA.role', ctx)).toBe('full');
  });

  it('resolves $inputs.<port> as an alias', () => {
    expect(resolvePath('$inputs.datasetA.role', ctx)).toBe('full');
  });

  it('resolves $config paths', () => {
    expect(resolvePath('$config.keys', ctx)).toEqual(['id']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/operators/resolve-path.test.ts`
Expected: FAIL — `$inputs.datasetA.role` resolves to `undefined`.

- [ ] **Step 3: Implement**

In `packages/pipeline-engine/src/operators/_resolve-path.ts`, change line 13 from:

```typescript
  } else if (root === 'input' && parts[1]) {
```

to:

```typescript
  } else if ((root === 'input' || root === 'inputs') && parts[1]) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/operators/resolve-path.test.ts`
Expected: PASS (3 tests)

---

### Task 3: DSL — AST types + tokenizer

**Files:**
- Create: `packages/pipeline-engine/src/dsl/ast.ts`
- Create: `packages/pipeline-engine/src/dsl/tokenizer.ts`
- Test: `packages/pipeline-engine/tests/dsl/tokenizer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/dsl/tokenizer.test.ts`:

```typescript
import { DslParseError, tokenize } from '../../src/dsl/tokenizer';

describe('tokenize', () => {
  it('tokenizes numbers, idents and operators', () => {
    expect(tokenize('Income / (Age + 1.5)').map((t) => t.type)).toEqual([
      'ident', 'op', 'lparen', 'ident', 'op', 'number', 'rparen', 'eof',
    ]);
  });

  it('tokenizes ** and // before * and /', () => {
    const ops = tokenize('A ** 2 // B % C').filter((t) => t.type === 'op').map((t) => (t as { op: string }).op);
    expect(ops).toEqual(['**', '//', '%']);
  });

  it('tokenizes comparison operators', () => {
    const ops = tokenize('A >= 1 == B != C <= D < E > F').filter((t) => t.type === 'op').map((t) => (t as { op: string }).op);
    expect(ops).toEqual(['>=', '==', '!=', '<=', '<', '>']);
  });

  it('tokenizes commas for function calls', () => {
    expect(tokenize('clip(A, 0, 100)').map((t) => t.type)).toEqual([
      'ident', 'lparen', 'ident', 'comma', 'number', 'comma', 'number', 'rparen', 'eof',
    ]);
  });

  it('rejects ^ with a hint to use **', () => {
    expect(() => tokenize('A ^ 2')).toThrow(DslParseError);
    try {
      tokenize('A ^ 2');
      fail('should have thrown');
    } catch (e) {
      expect((e as DslParseError).message).toContain('**');
      expect((e as DslParseError).position).toBe(2);
    }
  });

  it('rejects string literals', () => {
    expect(() => tokenize("'hello'")).toThrow(/String literals/);
    expect(() => tokenize('"hello"')).toThrow(/String literals/);
  });

  it('rejects unexpected characters with position', () => {
    try {
      tokenize('A @ B');
      fail('should have thrown');
    } catch (e) {
      expect((e as DslParseError).position).toBe(2);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/dsl/tokenizer.test.ts`
Expected: FAIL — module `../../src/dsl/tokenizer` not found.

- [ ] **Step 3: Implement**

Create `packages/pipeline-engine/src/dsl/ast.ts`:

```typescript
export const DSL_FUNCTIONS = [
  'abs', 'round', 'min', 'max', 'log', 'log2', 'log10', 'sqrt', 'pow', 'clip',
] as const;
export type DslFunction = (typeof DSL_FUNCTIONS)[number];

export const FUNCTION_ARITY: Record<DslFunction, { min: number; max: number }> = {
  abs: { min: 1, max: 1 },
  round: { min: 1, max: 2 },
  min: { min: 2, max: 2 },
  max: { min: 2, max: 2 },
  log: { min: 1, max: 1 },
  log2: { min: 1, max: 1 },
  log10: { min: 1, max: 1 },
  sqrt: { min: 1, max: 1 },
  pow: { min: 2, max: 2 },
  clip: { min: 3, max: 3 },
};

export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '//' | '**';
export type CompareOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

export type DslNode =
  | { kind: 'number'; value: number }
  | { kind: 'column'; name: string }
  | { kind: 'unary'; op: '-' | '+'; operand: DslNode }
  | { kind: 'binary'; op: BinaryOp; left: DslNode; right: DslNode }
  | { kind: 'compare'; op: CompareOp; left: DslNode; right: DslNode }
  | { kind: 'call'; fn: DslFunction; args: DslNode[] };
```

Create `packages/pipeline-engine/src/dsl/tokenizer.ts`:

```typescript
export class DslParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = 'DslParseError';
  }
}

export type Token =
  | { type: 'number'; value: number; pos: number }
  | { type: 'ident'; name: string; pos: number }
  | { type: 'op'; op: string; pos: number }
  | { type: 'lparen'; pos: number }
  | { type: 'rparen'; pos: number }
  | { type: 'comma'; pos: number }
  | { type: 'eof'; pos: number };

const TWO_CHAR_OPS = ['**', '//', '>=', '<=', '==', '!='];
const ONE_CHAR_OPS = ['+', '-', '*', '/', '%', '>', '<'];

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      throw new DslParseError('String literals are not allowed in expressions.', i);
    }
    if (ch === '^') {
      throw new DslParseError("Operator '^' is not supported. Did you mean '**'?", i);
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i])) i++;
      if (source[i] === '.') {
        i++;
        while (i < source.length && /[0-9]/.test(source[i])) i++;
      }
      tokens.push({ type: 'number', value: Number(source.slice(start, i)), pos: start });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
      tokens.push({ type: 'ident', name: source.slice(start, i), pos: start });
      continue;
    }
    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ type: 'op', op: two, pos: i });
      i += 2;
      continue;
    }
    if (ONE_CHAR_OPS.includes(ch)) {
      tokens.push({ type: 'op', op: ch, pos: i });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', pos: i });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', pos: i });
      i++;
      continue;
    }
    throw new DslParseError(`Unexpected character '${ch}'.`, i);
  }
  tokens.push({ type: 'eof', pos: source.length });
  return tokens;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/dsl/tokenizer.test.ts`
Expected: PASS (7 tests)

---

### Task 4: DSL — recursive-descent parser + shared vectors

**Files:**
- Create: `packages/pipeline-engine/src/dsl/parser.ts`
- Create: `packages/pipeline-engine/src/dsl/dump.ts`
- Create: `packages/pipeline-engine/tests/dsl/vectors.json`
- Test: `packages/pipeline-engine/tests/dsl/parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/dsl/parser.test.ts`:

```typescript
import { parseExpression } from '../../src/dsl/parser';
import { dump } from '../../src/dsl/dump';
import { DslParseError } from '../../src/dsl/tokenizer';
import vectors from './vectors.json';

describe('parseExpression (shared vectors)', () => {
  for (const v of vectors.valid) {
    it(`parses: ${v.expr}`, () => {
      expect(dump(parseExpression(v.expr))).toBe(v.dump);
    });
  }

  for (const v of vectors.parseErrors) {
    it(`rejects: ${JSON.stringify(v.expr)}`, () => {
      try {
        parseExpression(v.expr);
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(DslParseError);
        expect((e as DslParseError).message).toContain(v.messageIncludes);
      }
    });
  }
});
```

Create `packages/pipeline-engine/tests/dsl/vectors.json` (also used by the Python worker in Part 2 — keep it stable):

```json
{
  "valid": [
    { "expr": "A", "dump": "A" },
    { "expr": "42", "dump": "42" },
    { "expr": "1.5", "dump": "1.5" },
    { "expr": "A + B", "dump": "(+ A B)" },
    { "expr": "A - B", "dump": "(- A B)" },
    { "expr": "A + B * 2", "dump": "(+ A (* B 2))" },
    { "expr": "(A + B) * 2", "dump": "(* (+ A B) 2)" },
    { "expr": "Income / (Age + 1)", "dump": "(/ Income (+ Age 1))" },
    { "expr": "-A", "dump": "(- A)" },
    { "expr": "+A", "dump": "(+ A)" },
    { "expr": "- A ** 2", "dump": "(- (** A 2))" },
    { "expr": "2 ** -3", "dump": "(** 2 (- 3))" },
    { "expr": "A ** B ** 2", "dump": "(** A (** B 2))" },
    { "expr": "A % 2", "dump": "(% A 2)" },
    { "expr": "A // 2", "dump": "(// A 2)" },
    { "expr": "Age >= 18", "dump": "(>= Age 18)" },
    { "expr": "A + B > C * 2", "dump": "(> (+ A B) (* C 2))" },
    { "expr": "(A > 1) * 2", "dump": "(* (> A 1) 2)" },
    { "expr": "abs(A)", "dump": "(abs A)" },
    { "expr": "round(A, 2)", "dump": "(round A 2)" },
    { "expr": "min(A, B)", "dump": "(min A B)" },
    { "expr": "max(A, 0)", "dump": "(max A 0)" },
    { "expr": "log(Income)", "dump": "(log Income)" },
    { "expr": "log2(A)", "dump": "(log2 A)" },
    { "expr": "log10(A)", "dump": "(log10 A)" },
    { "expr": "sqrt(A)", "dump": "(sqrt A)" },
    { "expr": "pow(A, 2)", "dump": "(pow A 2)" },
    { "expr": "clip(A, 0, 100)", "dump": "(clip A 0 100)" },
    { "expr": "log(Income) - Age ** 2", "dump": "(- (log Income) (** Age 2))" }
  ],
  "parseErrors": [
    { "expr": "", "messageIncludes": "Unexpected end" },
    { "expr": "Age +", "messageIncludes": "Unexpected end" },
    { "expr": "Age ^ 2", "messageIncludes": "**" },
    { "expr": "Age > 1 < 2", "messageIncludes": "Chained comparisons" },
    { "expr": "'hello'", "messageIncludes": "String literals" },
    { "expr": "foo(A)", "messageIncludes": "Unknown function" },
    { "expr": "A if B else C", "messageIncludes": "Unexpected token" },
    { "expr": "A and B", "messageIncludes": "Unexpected token" },
    { "expr": "(A + B", "messageIncludes": "Unexpected end" },
    { "expr": "A B", "messageIncludes": "Unexpected token" },
    { "expr": "abs()", "messageIncludes": "Unexpected token" },
    { "expr": "A @ B", "messageIncludes": "Unexpected character" }
  ],
  "evaluation": [
    { "expr": "A + B * 2", "data": { "A": [1, 2], "B": [3, 4] }, "expect": [7, 10] },
    { "expr": "Income / (Age + 1)", "data": { "Income": [100, 50], "Age": [1, 4] }, "expect": [50, 10] },
    { "expr": "Age >= 18", "data": { "Age": [20, 10] }, "expect": [true, false] },
    { "expr": "abs(A)", "data": { "A": [-3, 4] }, "expect": [3, 4] },
    { "expr": "clip(A, 0, 10)", "data": { "A": [-5, 5, 20] }, "expect": [0, 5, 10] },
    { "expr": "pow(A, 2)", "data": { "A": [3, 4] }, "expect": [9, 16] },
    { "expr": "A ** 2", "data": { "A": [3, 4] }, "expect": [9, 16] },
    { "expr": "A // 2", "data": { "A": [5, 8] }, "expect": [2, 4] },
    { "expr": "A % 2", "data": { "A": [5, 8] }, "expect": [1, 0] },
    { "expr": "-A", "data": { "A": [5] }, "expect": [-5] },
    { "expr": "log(A)", "data": { "A": [1] }, "expect": [0] },
    { "expr": "round(A, 1)", "data": { "A": [1.26] }, "expect": [1.3] },
    { "expr": "min(A, B)", "data": { "A": [1, 5], "B": [2, 3] }, "expect": [1, 3] },
    { "expr": "max(A, 0)", "data": { "A": [-2, 5] }, "expect": [0, 5] },
    { "expr": "log(Income) - Age ** 2", "data": { "Income": [1], "Age": [3] }, "expect": [-9] }
  ]
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/dsl/parser.test.ts`
Expected: FAIL — module `../../src/dsl/parser` not found.

- [ ] **Step 3: Implement**

Create `packages/pipeline-engine/src/dsl/dump.ts`:

```typescript
import type { DslNode } from './ast';

/** Canonical S-expression form, shared with the Python worker's test harness. */
export function dump(node: DslNode): string {
  switch (node.kind) {
    case 'number':
      return String(node.value);
    case 'column':
      return node.name;
    case 'unary':
      return `(${node.op} ${dump(node.operand)})`;
    case 'binary':
    case 'compare':
      return `(${node.op} ${dump(node.left)} ${dump(node.right)})`;
    case 'call':
      return `(${node.fn} ${node.args.map(dump).join(' ')})`;
  }
}
```

Create `packages/pipeline-engine/src/dsl/parser.ts`:

```typescript
import { DSL_FUNCTIONS, type CompareOp, type DslFunction, type DslNode } from './ast';
import { DslParseError, tokenize, type Token } from './tokenizer';

const COMPARE_OPS = ['>', '>=', '<', '<=', '==', '!='];

export function parseExpression(source: string): DslNode {
  const parser = new Parser(tokenize(source));
  const node = parser.parseComparison();
  parser.expectEof();
  return node;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  expectEof(): void {
    const tok = this.peek();
    if (tok.type !== 'eof') {
      throw new DslParseError(`Unexpected token '${tokenText(tok)}'.`, tok.pos);
    }
  }

  parseComparison(): DslNode {
    const left = this.parseArith();
    const tok = this.peek();
    if (tok.type === 'op' && COMPARE_OPS.includes(tok.op)) {
      this.advance();
      const right = this.parseArith();
      const after = this.peek();
      if (after.type === 'op' && COMPARE_OPS.includes(after.op)) {
        throw new DslParseError('Chained comparisons are not supported.', after.pos);
      }
      return { kind: 'compare', op: tok.op as CompareOp, left, right };
    }
    return left;
  }

  private parseArith(): DslNode {
    let left = this.parseTerm();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && (tok.op === '+' || tok.op === '-')) {
        this.advance();
        left = { kind: 'binary', op: tok.op, left, right: this.parseTerm() };
      } else {
        return left;
      }
    }
  }

  private parseTerm(): DslNode {
    let left = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && ['*', '/', '%', '//'].includes(tok.op)) {
        this.advance();
        left = { kind: 'binary', op: tok.op as '*', left, right: this.parseUnary() };
      } else {
        return left;
      }
    }
  }

  private parseUnary(): DslNode {
    const tok = this.peek();
    if (tok.type === 'op' && (tok.op === '-' || tok.op === '+')) {
      this.advance();
      return { kind: 'unary', op: tok.op, operand: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): DslNode {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok.type === 'op' && tok.op === '**') {
      this.advance();
      // right-associative; exponent may be unary (2 ** -3)
      return { kind: 'binary', op: '**', left: base, right: this.parseUnary() };
    }
    return base;
  }

  private parsePrimary(): DslNode {
    const tok = this.peek();
    if (tok.type === 'eof') {
      throw new DslParseError('Unexpected end of expression.', tok.pos);
    }
    if (tok.type === 'number') {
      this.advance();
      return { kind: 'number', value: tok.value };
    }
    if (tok.type === 'ident') {
      this.advance();
      if (this.peek().type === 'lparen') {
        if (!(DSL_FUNCTIONS as readonly string[]).includes(tok.name)) {
          throw new DslParseError(`Unknown function '${tok.name}'.`, tok.pos);
        }
        this.advance(); // consume '('
        const args: DslNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseComparison());
          while (this.peek().type === 'comma') {
            this.advance();
            args.push(this.parseComparison());
          }
        }
        const close = this.peek();
        if (close.type !== 'rparen') {
          throw new DslParseError(`Unexpected token '${tokenText(close)}'; expected ')'.`, close.pos);
        }
        this.advance();
        return { kind: 'call', fn: tok.name as DslFunction, args };
      }
      return { kind: 'column', name: tok.name };
    }
    if (tok.type === 'lparen') {
      this.advance();
      const inner = this.parseComparison();
      const close = this.peek();
      if (close.type !== 'rparen') {
        if (close.type === 'eof') {
          throw new DslParseError('Unexpected end of expression; expected ')'.', close.pos);
        }
        throw new DslParseError(`Unexpected token '${tokenText(close)}'; expected ')'.`, close.pos);
      }
      this.advance();
      return inner;
    }
    throw new DslParseError(`Unexpected token '${tokenText(tok)}'.`, tok.pos);
  }
}

function tokenText(tok: Token): string {
  switch (tok.type) {
    case 'number':
      return String(tok.value);
    case 'ident':
      return tok.name;
    case 'op':
      return tok.op;
    case 'lparen':
      return '(';
    case 'rparen':
      return ')';
    case 'comma':
      return ',';
    case 'eof':
      return '<end>';
  }
}
```

Note: `abs()` — the args list is empty because peek is `rparen` immediately, producing a call with 0 args. The vector `{ "expr": "abs()", "messageIncludes": "Unexpected token" }` would NOT throw at parse time with this code — it fails later in arity validation. Fix the vector instead: change that entry to `{ "expr": "abs(,)", "messageIncludes": "Unexpected token" }` in `vectors.json`, and add arity coverage to Task 5 tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/dsl/parser.test.ts`
Expected: PASS (all valid + parseError vector cases)

---

### Task 5: DSL — semantic validation against input columns

**Files:**
- Create: `packages/pipeline-engine/src/dsl/validate.ts`
- Create: `packages/pipeline-engine/src/dsl/index.ts`
- Test: `packages/pipeline-engine/tests/dsl/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/dsl/validate.test.ts`:

```typescript
import type { Column } from '@training-ml/contracts';
import { parseExpression } from '../../src/dsl/parser';
import { validateAst } from '../../src/dsl/validate';

const columns: Column[] = [
  { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
  { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: true },
  { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
];

describe('validateAst', () => {
  it('accepts an expression over known numeric columns', () => {
    expect(validateAst(parseExpression('Income / (Age + 1)'), columns)).toEqual([]);
  });

  it('reports unknown columns', () => {
    const errors = validateAst(parseExpression('Salary * 2'), columns);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('EXPRESSION_UNKNOWN_COLUMN');
    expect(errors[0].name).toBe('Salary');
  });

  it('reports non-numeric columns', () => {
    const errors = validateAst(parseExpression('Country + 1'), columns);
    expect(errors[0].code).toBe('EXPRESSION_NON_NUMERIC_COLUMN');
    expect(errors[0].name).toBe('Country');
  });

  it('reports wrong argument counts', () => {
    expect(validateAst(parseExpression('abs()'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('pow(Age)'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('clip(Age, 0)'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('round(Age, 2)'), columns)).toEqual([]);
  });

  it('collects errors from nested calls', () => {
    const errors = validateAst(parseExpression('log(Foo) + sqrt(Country)'), columns);
    expect(errors.map((e) => e.code).sort()).toEqual([
      'EXPRESSION_NON_NUMERIC_COLUMN',
      'EXPRESSION_UNKNOWN_COLUMN',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/dsl/validate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/pipeline-engine/src/dsl/validate.ts`:

```typescript
import type { Column } from '@training-ml/contracts';
import { FUNCTION_ARITY, type DslNode } from './ast';

export interface DslSemanticError {
  code: 'EXPRESSION_UNKNOWN_COLUMN' | 'EXPRESSION_NON_NUMERIC_COLUMN' | 'EXPRESSION_INVALID_ARITY';
  message: string;
  name?: string;
}

export function validateAst(node: DslNode, columns: Column[]): DslSemanticError[] {
  const errors: DslSemanticError[] = [];
  const byName = new Map(columns.map((c) => [c.name, c]));

  const visit = (n: DslNode): void => {
    switch (n.kind) {
      case 'number':
        return;
      case 'column': {
        const col = byName.get(n.name);
        if (!col) {
          errors.push({
            code: 'EXPRESSION_UNKNOWN_COLUMN',
            name: n.name,
            message: `Column "${n.name}" does not exist in the input dataset.`,
          });
        } else if (col.semantic !== 'numeric') {
          errors.push({
            code: 'EXPRESSION_NON_NUMERIC_COLUMN',
            name: n.name,
            message: `Column "${n.name}" is not numeric; formulas can only reference numeric columns.`,
          });
        }
        return;
      }
      case 'unary':
        visit(n.operand);
        return;
      case 'binary':
      case 'compare':
        visit(n.left);
        visit(n.right);
        return;
      case 'call': {
        const arity = FUNCTION_ARITY[n.fn];
        if (n.args.length < arity.min || n.args.length > arity.max) {
          const expected = arity.min === arity.max ? String(arity.min) : `${arity.min}-${arity.max}`;
          errors.push({
            code: 'EXPRESSION_INVALID_ARITY',
            name: n.fn,
            message: `Function "${n.fn}" expects ${expected} argument(s), got ${n.args.length}.`,
          });
        }
        n.args.forEach(visit);
        return;
      }
    }
  };

  visit(node);
  return errors;
}
```

Create `packages/pipeline-engine/src/dsl/index.ts`:

```typescript
export * from './ast';
export * from './dump';
export * from './parser';
export * from './tokenizer';
export * from './validate';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/dsl/validate.test.ts`
Expected: PASS (5 tests)

---

### Task 6: Engine — optional input ports in `validate-ports.ts`

**Files:**
- Modify: `packages/pipeline-engine/src/phases/validate-ports.ts:11-22`
- Test: `packages/pipeline-engine/tests/phases/validate-ports.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/phases/validate-ports.test.ts`:

```typescript
import type { BlockDefinition, Contract } from '@training-ml/contracts';
import { validatePorts } from '../../src/phases/validate-ports';
import type { GraphEdge, NodeContext } from '../../src/types';

const datasetContract = {
  artifact: 'Dataset',
  schema: { columns: [], target: null },
  role: 'full',
  task: null,
} as unknown as Contract;

const featureUnionDef = {
  ports: {
    inputs: [
      { id: 'datasetA', artifact: 'Dataset' },
      { id: 'datasetB', artifact: 'Dataset' },
      { id: 'datasetC', artifact: 'Dataset', optional: true },
      { id: 'datasetD', artifact: 'Dataset', optional: true },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
} as unknown as BlockDefinition;

function ctxWith(inputContracts: Record<string, Contract>): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config: {} },
    definition: featureUnionDef,
    inputContracts,
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

const edgeTo = (port: string): GraphEdge => ({
  id: `e-${port}`,
  sourceNodeId: 'src',
  sourcePortId: 'dataset',
  targetNodeId: 'n1',
  targetPortId: port,
});

describe('validatePorts: optional inputs', () => {
  it('errors on unconnected required inputs', () => {
    const errors = validatePorts(ctxWith({}), []);
    expect(errors.filter((e) => e.code === 'PORT_NOT_CONNECTED').map((e) => e.fieldId)).toEqual([
      'datasetA',
      'datasetB',
    ]);
  });

  it('does not error on unconnected optional inputs', () => {
    const errors = validatePorts(ctxWith({ datasetA: datasetContract, datasetB: datasetContract }), [
      edgeTo('datasetA'),
      edgeTo('datasetB'),
    ]);
    expect(errors).toEqual([]);
  });

  it('still validates artifact type on connected optional inputs', () => {
    const modelContract = { ...datasetContract, artifact: 'Model' } as Contract;
    const errors = validatePorts(
      ctxWith({ datasetA: datasetContract, datasetB: datasetContract, datasetC: modelContract }),
      [edgeTo('datasetA'), edgeTo('datasetB'), edgeTo('datasetC')],
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('ARTIFACT_MISMATCH');
    expect(errors[0].fieldId).toBe('datasetC');
  });

  it('still rejects double-connected optional inputs', () => {
    const errors = validatePorts(
      ctxWith({ datasetA: datasetContract, datasetB: datasetContract, datasetC: datasetContract }),
      [edgeTo('datasetA'), edgeTo('datasetB'), edgeTo('datasetC'), edgeTo('datasetC')],
    );
    expect(errors.some((e) => e.code === 'PORT_ALREADY_CONNECTED' && e.fieldId === 'datasetC')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/phases/validate-ports.test.ts`
Expected: FAIL — unconnected optional ports produce `PORT_NOT_CONNECTED`.

- [ ] **Step 3: Implement**

In `packages/pipeline-engine/src/phases/validate-ports.ts`, change the `edgesToPort.length === 0` block (lines 11–22) from:

```typescript
    if (edgesToPort.length === 0) {
      errors.push({
```

to:

```typescript
    if (edgesToPort.length === 0) {
      if (port.optional) {
        continue;
      }
      errors.push({
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/phases/validate-ports.test.ts`
Expected: PASS (4 tests)

---

### Task 7: Operators — N-ary `disjoint` with `exclude`, new `columnsExist`

**Files:**
- Modify: `packages/pipeline-engine/src/operators/disjoint.ts`
- Create: `packages/pipeline-engine/src/operators/columns-exist.ts`
- Modify: `packages/pipeline-engine/src/operators/index.ts:5,17`
- Test: `packages/pipeline-engine/tests/operators/disjoint.test.ts`
- Test: `packages/pipeline-engine/tests/operators/columns-exist.test.ts`
- Test: `packages/pipeline-engine/tests/operators/row-count-matches.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/pipeline-engine/tests/operators/disjoint.test.ts`:

```typescript
import type { Column, Contract } from '@training-ml/contracts';
import { disjoint } from '../../src/operators/disjoint';
import type { NodeContext } from '../../src/types';

const ds = (names: string[]): Contract =>
  ({
    artifact: 'Dataset',
    schema: {
      columns: names.map((name): Column => ({ name, primitive: 'int', semantic: 'numeric', nullable: false })),
      target: null,
    },
    role: 'full',
    task: null,
  }) as unknown as Contract;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['CustomerID'] } },
  inputContracts: {
    left: ds(['CustomerID', 'Age']),
    right: ds(['CustomerID', 'TotalSpent']),
    datasetA: ds(['a', 'b']),
    datasetB: ds(['c', 'd']),
    datasetC: ds(['a', 'e']),
  },
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('disjoint', () => {
  it('legacy left/right: passes when columns are disjoint', () => {
    expect(disjoint({ op: 'disjoint', left: '$input.datasetA', right: '$input.datasetB' } as never, ctx)).toEqual([]);
  });

  it('legacy left/right: flags overlapping columns', () => {
    const errors = disjoint({ op: 'disjoint', left: '$input.datasetA', right: '$input.datasetC' } as never, ctx);
    expect(errors[0].code).toBe('COLUMNS_NOT_DISJOINT');
    expect(errors[0].context).toEqual({ overlap: ['a'] });
  });

  it('exclude removes key columns from comparison', () => {
    expect(
      disjoint(
        { op: 'disjoint', left: '$input.left', right: '$input.right', exclude: '$config.keys' } as never,
        ctx,
      ),
    ).toEqual([]);
  });

  it('N-ary targets: flags overlap across any pair, skipping unresolved inputs', () => {
    const errors = disjoint(
      {
        op: 'disjoint',
        targets: ['$input.datasetA', '$input.datasetB', '$input.datasetC', '$input.datasetD'],
      } as never,
      ctx,
    );
    expect(errors[0].code).toBe('COLUMNS_NOT_DISJOINT');
    expect(errors[0].context).toEqual({ overlap: ['a'] });
  });
});
```

Create `packages/pipeline-engine/tests/operators/columns-exist.test.ts`:

```typescript
import type { Column, Contract } from '@training-ml/contracts';
import { columnsExist } from '../../src/operators/columns-exist';
import type { NodeContext } from '../../src/types';

const ds = (names: string[] | 'unknown'): Contract =>
  ({
    artifact: 'Dataset',
    schema: {
      columns:
        names === 'unknown'
          ? 'unknown'
          : names.map((name): Column => ({ name, primitive: 'int', semantic: 'numeric', nullable: false })),
      target: null,
    },
    role: 'full',
    task: null,
  }) as unknown as Contract;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['CustomerID'] } },
  inputContracts: { left: ds(['CustomerID', 'Age']), right: ds(['TotalSpent']), unknownSrc: ds('unknown') },
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('columnsExist', () => {
  it('passes when every key exists in every input', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left'] } as never, ctx),
    ).toEqual([]);
  });

  it('reports keys missing from any input', () => {
    const errors = columnsExist(
      { op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left', '$input.right'] } as never,
      ctx,
    );
    expect(errors[0].code).toBe('KEYS_NOT_FOUND');
    expect(errors[0].context).toEqual({ missing: { right: ['CustomerID'] } });
  });

  it('skips inputs with unknown columns', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.unknownSrc'] } as never, ctx),
    ).toEqual([]);
  });

  it('skips unconnected (unresolvable) inputs', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left', '$input.gone'] } as never, ctx),
    ).toEqual([]);
  });
});
```

Create `packages/pipeline-engine/tests/operators/row-count-matches.test.ts` (pin existing behavior — no code change):

```typescript
import { rowCountMatches } from '../../src/operators/row-count-matches';
import type { NodeContext } from '../../src/types';

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: {} },
  inputContracts: {},
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('rowCountMatches', () => {
  it('skips targets that do not resolve (unconnected optional inputs)', () => {
    expect(
      rowCountMatches(
        { op: 'rowCountMatches', targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC'] } as never,
        ctx,
      ),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/operators/disjoint.test.ts tests/operators/columns-exist.test.ts tests/operators/row-count-matches.test.ts`
Expected: disjoint N-ary/exclude FAIL; columns-exist module not found FAIL; row-count-matches PASS (pin).

- [ ] **Step 3: Implement**

Replace the entire contents of `packages/pipeline-engine/src/operators/disjoint.ts` with:

```typescript
import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { getDatasetColumns } from '../utils/contract-helpers';
import { resolveItems, resolvePath } from './_resolve-path';

export function disjoint(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const excluded = new Set(rule.exclude !== undefined ? resolveItems(rule.exclude, ctx) : []);

  const namesOf = (value: unknown): string[] => {
    if (!value || typeof value !== 'object') return [];
    return getDatasetColumns(value as Contract)
      .map((c) => c.name)
      .filter((name) => !excluded.has(name));
  };

  let sets: string[][];
  if (Array.isArray(rule.targets)) {
    sets = rule.targets
      .map((p) => resolvePath(String(p), ctx))
      .filter((v) => v !== undefined && v !== null)
      .map(namesOf);
  } else {
    sets = [namesOf(resolvePath(rule.left as string, ctx)), namesOf(resolvePath(rule.right as string, ctx))];
  }

  const counts = new Map<string, number>();
  for (const names of sets) {
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const overlap = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);

  if (overlap.length === 0) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'COLUMNS_NOT_DISJOINT',
      severity: rule.severity,
      message: rule.message || `Column names overlap: ${overlap.join(', ')}.`,
      context: { overlap },
    },
  ];
}
```

Create `packages/pipeline-engine/src/operators/columns-exist.ts`:

```typescript
import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { getDatasetColumns, isDatasetContract } from '../utils/contract-helpers';
import { resolveItems, resolvePath } from './_resolve-path';

/**
 * Every column named by `columns` must exist in every resolved dataset input.
 * Inputs that are unconnected or whose columns are 'unknown' are skipped.
 */
export function columnsExist(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const names = resolveItems(rule.columns, ctx);
  if (names.length === 0) return [];

  const missing: Record<string, string[]> = {};
  for (const path of (rule.inputs as string[]) ?? []) {
    const value = resolvePath(String(path), ctx);
    if (!value || typeof value !== 'object' || !isDatasetContract(value as Contract)) continue;
    const columns = getDatasetColumns(value as Contract);
    if (columns.length === 0) continue; // unknown columns
    const portId = String(path).split('.')[1] ?? String(path);
    const absent = names.filter((n) => !columns.some((c) => c.name === n));
    if (absent.length > 0) missing[portId] = absent;
  }

  if (Object.keys(missing).length === 0) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'KEYS_NOT_FOUND',
      severity: rule.severity,
      message:
        rule.message ||
        `Columns not found in all inputs: ${Object.entries(missing)
          .map(([port, cols]) => `${port}: [${cols.join(', ')}]`)
          .join('; ')}.`,
      context: { missing },
    },
  ];
}
```

In `packages/pipeline-engine/src/operators/index.ts`:
- Add import: `import { columnsExist } from './columns-exist';`
- Add to the `operators` record: `columnsExist,`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/operators`
Expected: PASS (all operator tests, including the pre-existing ones)

---

### Task 8: Engine — `ConditionList` + `Expression` config validation

**Files:**
- Modify: `packages/pipeline-engine/src/phases/validate-config.ts`
- Test: `packages/pipeline-engine/tests/phases/validate-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/phases/validate-config.test.ts`:

```typescript
import type { BlockDefinition, Column, Contract } from '@training-ml/contracts';
import { validateConfig } from '../../src/phases/validate-config';
import type { NodeContext } from '../../src/types';

const columns: Column[] = [
  { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
  { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
];

const inputDataset = {
  artifact: 'Dataset',
  schema: { columns, target: null },
  role: 'full',
  task: null,
} as unknown as Contract;

const filterRowsDef = {
  configSchema: {
    fields: [
      {
        type: 'ConditionList',
        id: 'conditions',
        ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
      },
      { type: 'Select', id: 'combinator', options: ['AND', 'OR'], default: 'AND' },
      { type: 'Boolean', id: 'invert', default: false },
    ],
  },
} as unknown as BlockDefinition;

const formulaDef = {
  configSchema: {
    fields: [
      { type: 'Text', id: 'outputColumn' },
      { type: 'Select', id: 'outputType', options: ['float', 'int', 'boolean'], default: 'float' },
      { type: 'Expression', id: 'expression' },
    ],
  },
} as unknown as BlockDefinition;

function ctxWith(definition: BlockDefinition, config: Record<string, unknown>): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config },
    definition,
    inputContracts: { dataset: inputDataset },
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

describe('validateConfig: ConditionList', () => {
  const codes = (config: Record<string, unknown>) =>
    validateConfig(ctxWith(filterRowsDef, config)).map((e) => e.code);

  it('accepts valid conditions', () => {
    expect(
      codes({
        conditions: [
          { column: 'Age', op: 'gte', value: 18 },
          { column: 'Country', op: 'eq', value: 'US' },
          { column: 'Age', op: 'isNotNull' },
        ],
      }),
    ).toEqual([]);
  });

  it('requires at least one condition', () => {
    expect(codes({ conditions: [] })).toEqual(['EMPTY_CONDITIONS']);
    expect(codes({})).toEqual(['EMPTY_CONDITIONS']);
  });

  it('rejects conditions on unknown columns', () => {
    expect(codes({ conditions: [{ column: 'Nope', op: 'eq', value: 1 }] })).toEqual([
      'CONDITION_COLUMN_NOT_FOUND',
    ]);
  });

  it('requires a value for non-null ops', () => {
    expect(codes({ conditions: [{ column: 'Age', op: 'gte' }] })).toEqual(['CONDITION_VALUE_MISSING']);
  });

  it('rejects non-array value for in', () => {
    expect(codes({ conditions: [{ column: 'Country', op: 'in', value: 'US' }] })).toEqual([
      'CONDITION_VALUE_TYPE_MISMATCH',
    ]);
  });

  it('rejects range ops on string columns', () => {
    expect(codes({ conditions: [{ column: 'Country', op: 'gt', value: 'A' }] })).toEqual([
      'CONDITION_VALUE_TYPE_MISMATCH',
    ]);
  });

  it('rejects unknown ops', () => {
    expect(codes({ conditions: [{ column: 'Age', op: 'regex', value: 1 }] })).toEqual(['INVALID_OPTION']);
  });
});

describe('validateConfig: Expression', () => {
  const codes = (config: Record<string, unknown>) =>
    validateConfig(ctxWith(formulaDef, config)).map((e) => e.code);

  it('accepts a valid expression and output column', () => {
    expect(codes({ outputColumn: 'IncomePerAge', outputType: 'float', expression: 'Age + 1' })).toEqual([]);
  });

  it('requires an expression', () => {
    expect(codes({ outputColumn: 'X', expression: '' })).toContain('EXPRESSION_PARSE_ERROR');
  });

  it('reports parse errors with position in context', () => {
    const errors = validateConfig(ctxWith(formulaDef, { outputColumn: 'X', expression: 'Age +' }));
    expect(errors[0].code).toBe('EXPRESSION_PARSE_ERROR');
    expect(typeof errors[0].context?.position).toBe('number');
  });

  it('reports unknown and non-numeric columns', () => {
    expect(codes({ outputColumn: 'X', expression: 'Salary + 1' })).toEqual(['EXPRESSION_UNKNOWN_COLUMN']);
    expect(codes({ outputColumn: 'X', expression: 'Country + 1' })).toEqual([
      'EXPRESSION_NON_NUMERIC_COLUMN',
    ]);
  });

  it('rejects an output column that already exists', () => {
    expect(codes({ outputColumn: 'Age', expression: 'Age + 1' })).toEqual(['EXPRESSION_OUTPUT_COLLISION']);
  });

  it('rejects an output column with invalid identifier format', () => {
    expect(codes({ outputColumn: '1bad name', expression: 'Age + 1' })).toEqual(['EXPRESSION_OUTPUT_INVALID']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/phases/validate-config.test.ts`
Expected: FAIL — ConditionList/Expression branches don't exist; codes like `EMPTY_CONDITIONS` never emitted.

- [ ] **Step 3: Implement**

Replace the entire contents of `packages/pipeline-engine/src/phases/validate-config.ts` with:

```typescript
import {
  ConfigFieldType,
  FilterOp,
  PipelineArtifactType,
  type ValidationError,
} from '@training-ml/contracts';
import { DslParseError } from '../dsl/tokenizer';
import { parseExpression } from '../dsl/parser';
import { validateAst } from '../dsl/validate';
import type { NodeContext } from '../types';
import { getDatasetColumns } from '../utils/contract-helpers';

const NO_VALUE_OPS: string[] = [FilterOp.IS_NULL, FilterOp.IS_NOT_NULL];
const RANGE_OPS: string[] = [FilterOp.GT, FilterOp.GTE, FilterOp.LT, FilterOp.LTE];
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validateConfig(ctx: NodeContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = ctx.node.config;

  for (const field of ctx.definition.configSchema.fields) {
    const value = config[field.id];

    if (field.type === ConfigFieldType.NUMBER) {
      if (value !== undefined && value !== null) {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_NOT_NUMBER', `Field "${field.id}" must be a number.`));
        } else if (field.min !== undefined && num < field.min) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_BELOW_MIN', `Field "${field.id}" must be at least ${field.min}.`));
        } else if (field.max !== undefined && num > field.max) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_ABOVE_MAX', `Field "${field.id}" must be at most ${field.max}.`));
        }
      }
    }

    if (field.type === ConfigFieldType.SELECT) {
      if (value !== undefined && value !== null && !field.options.includes(String(value))) {
        errors.push(buildConfigError(ctx, field.id, 'INVALID_OPTION', `Field "${field.id}" must be one of ${field.options.join(', ')}.`));
      }
    }

    if (field.type === ConfigFieldType.CONDITION_LIST) {
      errors.push(...validateConditionList(ctx, field.id, field.ops as string[], value));
    }

    if (field.type === ConfigFieldType.EXPRESSION) {
      errors.push(...validateExpressionField(ctx, field.id, value, config));
    }
  }

  return errors;
}

function firstInputColumns(ctx: NodeContext) {
  const input = Object.values(ctx.inputContracts).find((c) => c.artifact === PipelineArtifactType.DATASET);
  return input ? getDatasetColumns(input) : [];
}

function validateConditionList(
  ctx: NodeContext,
  fieldId: string,
  allowedOps: string[],
  value: unknown,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const conditions = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  if (conditions.length === 0) {
    errors.push(buildConfigError(ctx, fieldId, 'EMPTY_CONDITIONS', 'At least one filter condition is required.'));
    return errors;
  }

  const columns = firstInputColumns(ctx);
  const known = columns.length > 0;

  conditions.forEach((cond, i) => {
    const label = `Condition ${i + 1}`;
    if (!cond || typeof cond !== 'object' || typeof cond.column !== 'string' || cond.column === '') {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: "column" is required.`));
      return;
    }
    const column = columns.find((c) => c.name === cond.column);
    if (known && !column) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_COLUMN_NOT_FOUND', `${label}: column "${cond.column}" does not exist in the input dataset.`));
      return;
    }
    if (typeof cond.op !== 'string' || !allowedOps.includes(cond.op)) {
      errors.push(buildConfigError(ctx, fieldId, 'INVALID_OPTION', `${label}: op must be one of ${allowedOps.join(', ')}.`));
      return;
    }
    if (!NO_VALUE_OPS.includes(cond.op) && (cond.value === undefined || cond.value === null || cond.value === '')) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_MISSING', `${label}: a value is required for operator "${cond.op}".`));
      return;
    }
    if (cond.op === FilterOp.IN && cond.value !== undefined && !Array.isArray(cond.value)) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: operator "in" requires an array value.`));
      return;
    }
    if (known && column && RANGE_OPS.includes(cond.op) && column.primitive === 'string') {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: operator "${cond.op}" cannot be used on string column "${column.name}".`));
    }
  });

  return errors;
}

function validateExpressionField(
  ctx: NodeContext,
  fieldId: string,
  value: unknown,
  config: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columns = firstInputColumns(ctx);

  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(buildConfigError(ctx, fieldId, 'EXPRESSION_PARSE_ERROR', 'An expression is required.'));
  } else {
    try {
      const ast = parseExpression(value);
      if (columns.length > 0) {
        for (const err of validateAst(ast, columns)) {
          errors.push(buildConfigError(ctx, fieldId, err.code, err.message));
        }
      }
    } catch (e) {
      if (e instanceof DslParseError) {
        errors.push({
          ...buildConfigError(ctx, fieldId, 'EXPRESSION_PARSE_ERROR', e.message),
          context: { fieldId, position: e.position },
        });
      } else {
        throw e;
      }
    }
  }

  // Convention: the sibling Text field holding the new column name is "outputColumn".
  const outputName = config['outputColumn'];
  if (typeof outputName === 'string' && outputName !== '') {
    if (!IDENTIFIER_RE.test(outputName)) {
      errors.push(buildConfigError(ctx, 'outputColumn', 'EXPRESSION_OUTPUT_INVALID', `Output column "${outputName}" must be a valid identifier (letters, digits, underscores; not starting with a digit).`));
    } else if (columns.some((c) => c.name === outputName)) {
      errors.push(buildConfigError(ctx, 'outputColumn', 'EXPRESSION_OUTPUT_COLLISION', `Output column "${outputName}" already exists in the input dataset.`));
    }
  }

  return errors;
}

function buildConfigError(
  ctx: NodeContext,
  fieldId: string,
  code: string,
  message: string,
): ValidationError {
  return {
    nodeId: ctx.node.id,
    scope: 'config',
    fieldId,
    code,
    severity: 'error',
    message,
    context: { fieldId },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/phases`
Expected: PASS (all phase tests)

---

### Task 9: Engine — `addColumns`, `joinColumns`, real `concatColumns` merge in `build-contract.ts`

**Files:**
- Modify: `packages/pipeline-engine/src/phases/build-contract.ts`
- Test: `packages/pipeline-engine/tests/phases/build-contract.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/phases/build-contract.test.ts`:

```typescript
import type { BlockDefinition, Column, Contract } from '@training-ml/contracts';
import { buildOutputContracts } from '../../src/phases/build-contract';
import type { NodeContext } from '../../src/types';

const cols = (...names: string[]): Column[] =>
  names.map((name) => ({ name, primitive: 'int', semantic: 'numeric', nullable: false }) as Column);

const ds = (nameCols: Column[] | 'unknown', extra: Partial<{ target: string | null; task: string | null; role: string }> = {}) =>
  ({
    artifact: 'Dataset',
    schema: { columns: nameCols, target: extra.target ?? null },
    role: extra.role ?? 'full',
    task: extra.task ?? null,
  }) as unknown as Contract;

function ctxWith(
  outputTransform: unknown,
  inputContracts: Record<string, Contract>,
  config: Record<string, unknown> = {},
): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config },
    definition: {
      ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
      outputTransform,
    } as unknown as BlockDefinition,
    inputContracts,
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

describe('buildOutputContracts: copyInput + addColumns', () => {
  const transform = {
    declared: {
      copyInput: true,
      addColumns: [{ name: '$config.outputColumn', primitive: '$config.outputType' }],
    },
  };

  it('appends the new column', () => {
    const { contracts, errors } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age', 'Income')) }, { outputColumn: 'IncomePerAge', outputType: 'float' }),
    );
    expect(errors).toEqual([]);
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'IncomePerAge']);
    expect(out.schema.columns[2]).toMatchObject({ primitive: 'float', semantic: 'numeric', nullable: true });
  });

  it('boolean output column gets categorical semantic', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age')) }, { outputColumn: 'IsAdult', outputType: 'boolean' }),
    );
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns[1]).toMatchObject({ primitive: 'boolean', semantic: 'categorical' });
  });

  it('emits COLUMN_COLLISION when the name exists', () => {
    const { errors } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age')) }, { outputColumn: 'Age', outputType: 'float' }),
    );
    expect(errors[0].code).toBe('COLUMN_COLLISION');
  });
});

describe('buildOutputContracts: joinColumns', () => {
  const transform = {
    declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
  };

  it('merges columns, dropping duplicate keys, keeping left metadata', () => {
    const { contracts, errors } = buildOutputContracts(
      ctxWith(
        transform,
        {
          left: ds(cols('CustomerID', 'Age'), { target: 'Age', task: 'regression', role: 'train' }),
          right: ds(cols('CustomerID', 'TotalSpent'), { role: 'test' }),
        },
        { keys: ['CustomerID'] },
      ),
    );
    expect(errors).toEqual([]);
    const out = contracts.dataset as { schema: { columns: Column[]; target: string | null }; role: string; task: string | null };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['CustomerID', 'Age', 'TotalSpent']);
    expect(out.schema.target).toBe('Age');
    expect(out.role).toBe('train');
    expect(out.task).toBe('regression');
  });

  it('emits COLUMN_COLLISION on non-key overlap (defense-in-depth)', () => {
    const { errors } = buildOutputContracts(
      ctxWith(
        transform,
        { left: ds(cols('CustomerID', 'created_at')), right: ds(cols('CustomerID', 'created_at')) },
        { keys: ['CustomerID'] },
      ),
    );
    expect(errors[0].code).toBe('COLUMN_COLLISION');
  });
});

describe('buildOutputContracts: concatColumns merge', () => {
  const transform = {
    declared: { concatColumns: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'] },
  };

  it('merges columns from connected inputs only', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, { datasetA: ds(cols('a', 'b')), datasetB: ds(cols('c')) }),
    );
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['a', 'b', 'c']);
  });

  it('takes target/task from the first input that defines one', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, {
        datasetA: ds(cols('a')),
        datasetB: ds(cols('c'), { target: 'c', task: 'classification', role: 'train' }),
      }),
    );
    const out = contracts.dataset as { schema: { target: string | null }; role: string; task: string | null };
    expect(out.schema.target).toBe('c');
    expect(out.task).toBe('classification');
    expect(out.role).toBe('full'); // role comes from the first input
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/phases/build-contract.test.ts`
Expected: FAIL — `addColumns`/`joinColumns` unhandled; `concatColumns` returns first-input columns only.

- [ ] **Step 3: Implement**

In `packages/pipeline-engine/src/phases/build-contract.ts`:

**3a.** Add imports at the top (extend the existing contracts import and add Column):

```typescript
import {
  DatasetRole,
  PipelineArtifactType,
  type Column,
  type Contract,
  type DatasetContract,
  type ValidationError,
} from '@training-ml/contracts';
```

(the existing file imports `DatasetRole`, `PipelineArtifactType`, `Contract`, `ValidationError` — add `Column` and `DatasetContract` as type imports.)

**3b.** Restructure the `copyInput` branch (lines 103–165) so all sub-branches assign a `base` contract, then apply `addColumns` once. Replace the whole `if ('copyInput' in t && t.copyInput) { ... }` block with:

```typescript
  if ('copyInput' in t && t.copyInput) {
    let base: Contract;

    if ('columnUpdates' in t && Array.isArray(t.columnUpdates)) {
      const updatedCols = columnsUnknown
        ? []
        : (input.schema.columns as Exclude<typeof input.schema.columns, 'unknown'>).map((col) => {
          const match = (t.columnUpdates as Array<Record<string, unknown>>).find((u) => {
            const raw = typeof u.columns === 'string' && u.columns.startsWith('$')
              ? resolvePath(u.columns, ctx)
              : u.columns;
            const names = Array.isArray(raw)
              ? raw
              : typeof raw === 'string'
                ? raw.split(',').map((s: string) => s.trim())
                : [];
            return names.includes(col.name);
          });
          if (!match) return col;
          return {
            ...col,
            primitive: (match.primitive as string) ?? col.primitive,
            semantic: (match.semantic as string) ?? col.semantic,
            nullable: (match.nullable as boolean | undefined) ?? col.nullable,
          };
        });
      base = {
        artifact: PipelineArtifactType.DATASET,
        schema: { columns: columnsUnknown ? 'unknown' : updatedCols, target: input.schema.target },
        role: input.role,
        task: input.task,
      };
    } else if ('set' in t && t.set) {
      const set = t.set as Record<string, unknown>;
      const resolveSetValue = (val: unknown): unknown =>
        typeof val === 'string' && val.startsWith('$') ? resolvePath(val, ctx) : val;
      const task = resolveSetValue(set['task']) as string | undefined;
      const target = resolveSetValue(set['schema.target']) as string | undefined;
      const role = resolveSetValue(set['role']) as string | undefined;
      base = {
        artifact: PipelineArtifactType.DATASET,
        schema: {
          columns: columnsUnknown ? 'unknown' : input.schema.columns,
          target: target ?? input.schema.target,
        },
        role: role ?? input.role,
        task: task ?? input.task,
      };
    } else {
      base = {
        artifact: PipelineArtifactType.DATASET,
        schema: {
          columns: columnsUnknown ? 'unknown' : input.schema.columns,
          target: input.schema.target,
        },
        role: input.role,
        task: input.task,
      };
    }

    return applyAddColumns(base, t, ctx, _errors);
  }
```

**3c.** Replace the `concatColumns` branch (lines 212–222) with:

```typescript
  if ('concatColumns' in t && Array.isArray(t.concatColumns)) {
    const inputs = (t.concatColumns as unknown[])
      .map((p) => (typeof p === 'string' && p.startsWith('$') ? resolvePath(p, ctx) : p))
      .filter(
        (v): v is DatasetContract =>
          v !== null && typeof v === 'object' && isDatasetContract(v as Contract),
      );
    if (inputs.length === 0) return null;
    const anyUnknown = inputs.some((c) => c.schema.columns === 'unknown');
    const columns = anyUnknown
      ? ('unknown' as const)
      : inputs.flatMap((c) => c.schema.columns as Column[]);
    const withTarget = inputs.find((c) => c.schema.target != null);
    const withTask = inputs.find((c) => c.task != null);
    return {
      artifact: PipelineArtifactType.DATASET,
      schema: { columns, target: withTarget?.schema.target ?? null },
      role: inputs[0].role,
      task: withTask?.task ?? null,
    };
  }
```

**3d.** Add the `joinColumns` branch immediately before the `concatColumns` branch:

```typescript
  if ('joinColumns' in t && t.joinColumns && typeof t.joinColumns === 'object') {
    const spec = t.joinColumns as Record<string, unknown>;
    const leftRaw = typeof spec.left === 'string' ? resolvePath(spec.left, ctx) : undefined;
    const rightRaw = typeof spec.right === 'string' ? resolvePath(spec.right, ctx) : undefined;
    if (!leftRaw || !rightRaw || !isDatasetContract(leftRaw as Contract) || !isDatasetContract(rightRaw as Contract)) {
      return null;
    }
    const left = leftRaw as DatasetContract;
    const right = rightRaw as DatasetContract;
    const keys = resolveItems(spec.keys, ctx);

    if (left.schema.columns === 'unknown' || right.schema.columns === 'unknown') {
      return {
        artifact: PipelineArtifactType.DATASET,
        schema: { columns: 'unknown', target: left.schema.target },
        role: left.role,
        task: left.task,
      };
    }

    const leftCols = left.schema.columns as Column[];
    const rightCols = (right.schema.columns as Column[]).filter((c) => !keys.includes(c.name));
    const leftNames = new Set(leftCols.map((c) => c.name));
    const dupes = rightCols.filter((c) => leftNames.has(c.name)).map((c) => c.name);
    if (dupes.length > 0) {
      _errors.push({
        nodeId: ctx.node.id,
        scope: 'contract',
        code: 'COLUMN_COLLISION',
        severity: 'error',
        message: `Columns exist in both join inputs: ${dupes.join(', ')}. Rename them before joining.`,
        context: { overlap: dupes },
      });
      return null;
    }

    return {
      artifact: PipelineArtifactType.DATASET,
      schema: { columns: [...leftCols, ...rightCols], target: left.schema.target },
      role: left.role,
      task: left.task,
    };
  }
```

**3e.** Add the `applyAddColumns` helper at the end of the file (before `unwrapDeclared`):

```typescript
function applyAddColumns(
  base: Contract,
  t: Record<string, unknown>,
  ctx: NodeContext,
  errors: ValidationError[],
): Contract {
  if (!Array.isArray(t.addColumns) || !isDatasetContract(base) || base.schema.columns === 'unknown') {
    return base;
  }
  const existing = base.schema.columns as Column[];
  const additions: Column[] = [];
  for (const raw of t.addColumns as Array<Record<string, unknown>>) {
    const nameRaw = typeof raw.name === 'string' && raw.name.startsWith('$') ? resolvePath(raw.name, ctx) : raw.name;
    const primRaw =
      typeof raw.primitive === 'string' && raw.primitive.startsWith('$') ? resolvePath(raw.primitive, ctx) : raw.primitive;
    if (typeof nameRaw !== 'string' || nameRaw === '') continue;
    if (existing.some((c) => c.name === nameRaw) || additions.some((c) => c.name === nameRaw)) {
      errors.push({
        nodeId: ctx.node.id,
        scope: 'contract',
        code: 'COLUMN_COLLISION',
        severity: 'error',
        message: `Column "${nameRaw}" already exists.`,
        context: { column: nameRaw },
      });
      continue;
    }
    const primitive = typeof primRaw === 'string' ? primRaw : 'float';
    additions.push({
      name: nameRaw,
      primitive: primitive as Column['primitive'],
      semantic: primitive === 'boolean' ? 'categorical' : 'numeric',
      nullable: true,
    });
  }
  if (additions.length === 0) return base;
  return { ...base, schema: { ...base.schema, columns: [...existing, ...additions] } };
}
```

**3f.** Add `resolveItems` to the import from `../operators/_resolve-path` (line 7 currently imports only `resolvePath`):

```typescript
import { resolveItems, resolvePath } from '../operators/_resolve-path';
```

Note: the `concatColumns` rewrite changes existing behavior for the seeded `concat_features` block — previously it returned only the first input's columns; now it actually merges. This is a bug fix, and the block is being deprecated anyway.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/phases/build-contract.test.ts`
Expected: PASS (7 tests)

---

### Task 10: Engine — feature-block fixtures + end-to-end graph validation

**Files:**
- Create: `packages/pipeline-engine/tests/fixtures/feature-blocks-catalog.ts`
- Test: `packages/pipeline-engine/tests/feature-blocks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pipeline-engine/tests/fixtures/feature-blocks-catalog.ts`:

```typescript
import type { BlockDefinition } from '@training-ml/contracts';

/** Source stub with fully-declared output columns (no resolveColumns needed). */
export const stubSourceBlock: BlockDefinition = {
  id: 'stub-source',
  executorKey: 'stub_source',
  version: 1,
  status: 'active',
  name: 'Stub Source',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: false },
          { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

/** Second source stub: a "customers" table for joins. */
export const stubCustomersBlock: BlockDefinition = {
  id: 'stub-customers',
  executorKey: 'stub_customers',
  version: 1,
  status: 'active',
  name: 'Stub Customers',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

/** Third source stub: "spending" table sharing key Age with customers. */
export const stubSpendingBlock: BlockDefinition = {
  id: 'stub-spending',
  executorKey: 'stub_spending',
  version: 1,
  status: 'active',
  name: 'Stub Spending',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'TotalSpent', primitive: 'float', semantic: 'numeric', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

export const filterRowsBlock: BlockDefinition = {
  id: 'filter-rows',
  executorKey: 'filter_rows',
  version: 1,
  status: 'active',
  name: 'Filter Rows',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      {
        type: 'ConditionList',
        id: 'conditions',
        ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
      },
      { type: 'Select', id: 'combinator', options: ['AND', 'OR'], default: 'AND' },
      { type: 'Boolean', id: 'invert', default: false },
    ],
  },
  constraints: {},
  outputTransform: { declared: { copyInput: true } },
};

export const customFeatureFormulaBlock: BlockDefinition = {
  id: 'custom-feature-formula',
  executorKey: 'custom_feature_formula',
  version: 1,
  status: 'active',
  name: 'Custom Feature Formula',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'Text', id: 'outputColumn' },
      { type: 'Select', id: 'outputType', options: ['float', 'int', 'boolean'], default: 'float' },
      { type: 'Expression', id: 'expression' },
    ],
  },
  constraints: {},
  outputTransform: {
    declared: {
      copyInput: true,
      addColumns: [{ name: '$config.outputColumn', primitive: '$config.outputType' }],
    },
  },
};

export const joinDatasetsBlock: BlockDefinition = {
  id: 'join-datasets',
  executorKey: 'join_datasets',
  version: 1,
  status: 'active',
  name: 'Join Datasets',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [
      { id: 'left', artifact: 'Dataset' },
      { id: 'right', artifact: 'Dataset' },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'ColumnSelector', id: 'keys', multiple: true },
      { type: 'Select', id: 'strategy', options: ['inner', 'left', 'right', 'full'], default: 'inner' },
    ],
  },
  constraints: {
    rules: [
      { op: 'exists', target: '$config.keys', message: 'At least one join key is required.' },
      {
        op: 'columnsExist',
        columns: '$config.keys',
        inputs: ['$input.left', '$input.right'],
        message: 'Every join key must exist in both input datasets.',
      },
      {
        op: 'disjoint',
        left: '$input.left',
        right: '$input.right',
        exclude: '$config.keys',
        message: 'Non-key columns must not collide. Rename them before joining.',
      },
    ],
  },
  outputTransform: {
    declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
  },
};

export const featureUnionBlock: BlockDefinition = {
  id: 'feature-union',
  executorKey: 'feature_union',
  version: 1,
  status: 'active',
  name: 'Feature Union',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [
      { id: 'datasetA', artifact: 'Dataset' },
      { id: 'datasetB', artifact: 'Dataset' },
      { id: 'datasetC', artifact: 'Dataset', optional: true },
      { id: 'datasetD', artifact: 'Dataset', optional: true },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: { fields: [] },
  constraints: {
    rules: [
      {
        op: 'rowCountMatches',
        targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
        message: 'All feature branches must have the same number of rows.',
      },
      {
        op: 'disjoint',
        targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
        message: 'Column names must be unique across all feature branches.',
      },
    ],
  },
  outputTransform: {
    declared: {
      concatColumns: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
    },
  },
};

export const featureBlocksCatalog: BlockDefinition[] = [
  stubSourceBlock,
  stubCustomersBlock,
  stubSpendingBlock,
  filterRowsBlock,
  customFeatureFormulaBlock,
  joinDatasetsBlock,
  featureUnionBlock,
];
```

Create `packages/pipeline-engine/tests/feature-blocks.test.ts`:

```typescript
import { validateGraph } from '../src/validate-graph';
import type { Graph } from '../src/types';
import {
  customFeatureFormulaBlock,
  featureBlocksCatalog,
  featureUnionBlock,
  filterRowsBlock,
  joinDatasetsBlock,
  stubCustomersBlock,
  stubSourceBlock,
  stubSpendingBlock,
} from './fixtures/feature-blocks-catalog';

const node = (id: string, def: { id: string; version: number }, config: Record<string, unknown> = {}) => ({
  id,
  blockId: def.id,
  blockVersion: def.version,
  config,
});

const edge = (id: string, from: string, fromPort: string, to: string, toPort: string) => ({
  id,
  sourceNodeId: from,
  sourcePortId: fromPort,
  targetNodeId: to,
  targetPortId: toPort,
});

describe('feature blocks: end-to-end graph validation', () => {
  it('Filter Rows: valid conditions pass, schema preserved', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('filter', filterRowsBlock, {
          conditions: [
            { column: 'Age', op: 'gte', value: 18 },
            { column: 'Country', op: 'eq', value: 'US' },
          ],
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'filter', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['filter']['dataset'];
    expect(out.artifact).toBe('Dataset');
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'Country']);
    } else {
      fail('expected known columns');
    }
  });

  it('Filter Rows: unknown condition column fails', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('filter', filterRowsBlock, { conditions: [{ column: 'Nope', op: 'eq', value: 1 }] }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'filter', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'CONDITION_COLUMN_NOT_FOUND')).toBe(true);
  });

  it('Custom Feature Formula: valid formula appends column', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('formula', customFeatureFormulaBlock, {
          outputColumn: 'IncomePerAge',
          outputType: 'float',
          expression: 'Income / (Age + 1)',
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'formula', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['formula']['dataset'];
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'Country', 'IncomePerAge']);
    } else {
      fail('expected known columns');
    }
  });

  it('Custom Feature Formula: unknown column in formula fails', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('formula', customFeatureFormulaBlock, {
          outputColumn: 'X',
          expression: 'Salary * 2',
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'formula', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'EXPRESSION_UNKNOWN_COLUMN')).toBe(true);
  });

  it('Join Datasets: valid join merges columns', () => {
    const graph: Graph = {
      nodes: [
        node('customers', stubCustomersBlock),
        node('spending', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'], strategy: 'inner' }),
      ],
      edges: [
        edge('e1', 'customers', 'dataset', 'join', 'left'),
        edge('e2', 'spending', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['join']['dataset'];
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'TotalSpent']);
    } else {
      fail('expected known columns');
    }
  });

  it('Join Datasets: key missing from right input fails', () => {
    const graph: Graph = {
      nodes: [
        node('customers', stubCustomersBlock),
        node('spending', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age', 'Missing'] }),
      ],
      edges: [
        edge('e1', 'customers', 'dataset', 'join', 'left'),
        edge('e2', 'spending', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'KEYS_NOT_FOUND')).toBe(true);
  });

  it('Join Datasets: non-key collision fails', () => {
    const graph: Graph = {
      nodes: [
        node('a', stubCustomersBlock),
        node('b', stubCustomersBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'] }),
      ],
      edges: [
        edge('e1', 'a', 'dataset', 'join', 'left'),
        edge('e2', 'b', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true);
  });

  it('Feature Union: overlapping branch columns fail', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'Col1', expression: 'Age * 2' }),
        node('f2', customFeatureFormulaBlock, { outputColumn: 'Col2', expression: 'Income + 1' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'src', 'dataset', 'f1', 'dataset'),
        edge('e2', 'src', 'dataset', 'f2', 'dataset'),
        edge('e3', 'f1', 'dataset', 'union', 'datasetA'),
        edge('e4', 'f2', 'dataset', 'union', 'datasetB'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true); // Age/Income/Country collide
  });

  it('Feature Union: joined branch + raw branch sharing columns fail', () => {
    const graph: Graph = {
      nodes: [
        node('c1', stubCustomersBlock),
        node('s1', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'] }),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'Derived', expression: 'TotalSpent / (Age + 1)' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'c1', 'dataset', 'join', 'left'),
        edge('e2', 's1', 'dataset', 'join', 'right'),
        edge('e3', 'join', 'dataset', 'f1', 'dataset'),
        edge('e4', 'f1', 'dataset', 'union', 'datasetA'),
        edge('e5', 's1', 'dataset', 'union', 'datasetB'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true); // Age/TotalSpent collide
  });

  it('Feature Union: truly disjoint 3-branch merge succeeds with no PORT_NOT_CONNECTED on datasetD', () => {
    const graph: Graph = {
      nodes: [
        node('c1', stubCustomersBlock),
        node('s1', stubSpendingBlock),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'D1', expression: 'Age * 2' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'c1', 'dataset', 'f1', 'dataset'),
        edge('e2', 's1', 'dataset', 'union', 'datasetB'),
        edge('e3', 'f1', 'dataset', 'union', 'datasetC'),
      ],
    };
    // datasetA is required and unconnected → PORT_NOT_CONNECTED expected; datasetD optional → no error
    const result = validateGraph(graph, featureBlocksCatalog);
    const codes = result.errors.map((e) => `${e.fieldId}:${e.code}`);
    expect(codes).toContain('datasetA:PORT_NOT_CONNECTED');
    expect(codes).not.toContain('datasetD:PORT_NOT_CONNECTED');
  });
});
```

Note: the last test pins the optional-port behavior at graph level (required A unconnected errors; optional D doesn't). The union merge-success path is covered by `build-contract.test.ts` in Task 9.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/feature-blocks.test.ts`
Expected: FAIL — fixtures reference fields/types the engine handles, but confirm any failure is behavioral (e.g. `PORT_NOT_CONNECTED` ordering), not missing modules. If everything already passes after Tasks 1–9, that's fine — this task locks the behavior at graph level. (TDD exception: this is an integration regression suite assembled from previously-tested units.)

- [ ] **Step 3: Fix any failures**

All behaviors were implemented in Tasks 1–9. If a test fails, re-check: (a) `validate-graph.ts` builds `definitionMap` keyed by `` `${blockId}@${blockVersion}` `` — fixture `blockId` values like `'stub-source'` must be passed as `blockId` in nodes (the `node()` helper does this); (b) `validateNode` short-circuits config/constraint validation on fatal port errors — tests with unconnected required ports only assert port codes.

- [ ] **Step 4: Run the full engine suite**

Run: `npm test -w @training-ml/pipeline-engine`
Expected: PASS — all suites including pre-existing `validate-graph.test.ts` and `tests/operators/*`.

---

## Part 1 Done-When Checklist

- [ ] `npm test -w @training-ml/pipeline-engine` — all green
- [ ] `npm run check-types -w @training-ml/pipeline-engine && npm run check-types -w @training-ml/contracts` — clean
- [ ] `tests/dsl/vectors.json` is final — Part 2 (Python worker) copies it verbatim
- [ ] 4 fixture block definitions match spec §2 exactly (they will be mirrored in the DB migration in Part 3)

## Handoff to Part 2

Part 2 implements the Python worker side: the stdlib-`ast` expression evaluator (validated against `tests/dsl/vectors.json`), the 4 block classes, registry entries, and runtime null-hardening. It needs nothing from Part 1 at runtime (the worker is Python) — but keep `vectors.json` stable.
