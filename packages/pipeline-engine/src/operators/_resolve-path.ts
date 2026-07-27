import type { NodeContext } from '../types';

export function resolvePath(path: string, ctx: NodeContext): unknown {
  if (typeof path !== 'string' || !path.startsWith('$')) return path;

  const parts = path.slice(1).split('.');
  const root = parts[0];

  let value: unknown;
  if (root === 'config') {
    value = ctx.node.config;
    parts.splice(0, 1);
  } else if ((root === 'input' || root === 'inputs') && parts[1]) {
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

export function resolveItems(value: unknown, ctx: NodeContext): string[] {
  if (typeof value === 'string') {
    const resolved = resolvePath(value, ctx);
    if (Array.isArray(resolved)) return resolved as string[];
    if (typeof resolved === 'string') return [resolved];
    return [];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const entry of value) {
      out.push(...resolveItems(entry, ctx));
    }
    return out;
  }
  return [];
}
