import type { NodeContext } from '../types';

export function resolvePath(path: string, ctx: NodeContext): unknown {
  if (!path.startsWith('$')) return path;

  const parts = path.slice(1).split('.');
  const root = parts[0];

  let value: unknown;
  if (root === 'config') {
    value = ctx.node.config;
    parts.splice(0, 1);
  } else if (root === 'input' && parts[1]) {
    value = ctx.inputContracts[parts[1]];
    parts.splice(0, 2);
  } else {
    return undefined;
  }

  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}
