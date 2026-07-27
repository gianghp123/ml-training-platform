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
