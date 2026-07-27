import type { DslNode } from './ast';

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
