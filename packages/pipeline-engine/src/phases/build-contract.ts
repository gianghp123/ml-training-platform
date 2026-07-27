import {
  DatasetRole,
  PipelineArtifactType,
  type Column,
  type Contract,
  type DatasetContract,
  type ValidationError,
} from '@training-ml/contracts';
import { resolveItems, resolvePath } from '../operators/_resolve-path';
import type { NodeContext } from '../types';
import { isDatasetContract } from '../utils/contract-helpers';

export function buildOutputContracts(ctx: NodeContext): {
  contracts: Record<string, Contract>;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const transform = unwrapDeclared(ctx.definition.outputTransform);
  const contracts: Record<string, Contract> = {};

  if (typeof transform === 'object' && transform !== null && 'ports' in transform && (transform as Record<string, unknown>).ports) {
    const ports = (transform as Record<string, unknown>).ports as Record<string, unknown>;
    for (const [portId, subTransform] of Object.entries(ports)) {
      const result = buildContractFromTransform(subTransform, ctx, errors);
      if (result) contracts[portId] = result;
    }
  } else if (typeof transform === 'object' && transform !== null) {
    const firstOutputPort = ctx.definition.ports.outputs[0];
    if (firstOutputPort) {
      const result = buildContractFromTransform(transform, ctx, errors);
      if (result) contracts[firstOutputPort.id] = result;
    }
  }

  return { contracts, errors };
}

function buildContractFromTransform(
  transform: unknown,
  ctx: NodeContext,
  _errors: ValidationError[],
): Contract | null {
  const t = transform as Record<string, unknown>;
  if ('artifact' in t && typeof t.artifact === 'string') {
    const artifact = t.artifact;
    if (artifact === PipelineArtifactType.MODEL) {
      const input = getFirstDatasetContract(ctx);
      return {
        artifact: PipelineArtifactType.MODEL,
        algorithm: String(t.algorithm ?? ''),
        task: input?.task ?? 'classification',
        featureSchema: input?.schema.columns ?? 'unknown',
        targetSchema: input?.schema.target ?? null,
      };
    }
    if (artifact === PipelineArtifactType.METRICS) {
      const model = getFirstModelContract(ctx);
      return {
        artifact: PipelineArtifactType.METRICS,
        task: model?.task ?? 'classification',
        metrics: 'unknown',
      };
    }
    if (artifact === PipelineArtifactType.SAVED_MODEL) {
      const model = getFirstModelContract(ctx);
      return {
        artifact: PipelineArtifactType.SAVED_MODEL,
        format: String(t.format ?? 'joblib'),
        sourceModel: {
          algorithm: String((t.sourceModel as Record<string, unknown>)?.algorithm ?? model?.algorithm ?? ''),
          task: String((t.sourceModel as Record<string, unknown>)?.task ?? model?.task ?? 'classification'),
        },
        location: {
          type: 'objectStorage',
          reference: 'unknown',
        },
      };
    }
    if (artifact === PipelineArtifactType.DATASET) {
      let schema = t.schema !== undefined ? t.schema : { columns: 'unknown' as const, target: null };

      // If node has config.dataset, resolve actual columns from dataset profile
      const datasetId = ctx.node.config?.dataset;
      if (typeof datasetId === 'string' && datasetId && ctx.resolveColumns) {
        const columns = ctx.resolveColumns(datasetId);
        if (columns && columns.length > 0) {
          schema = { ...schema, columns };
        }
      }

      return {
        artifact: PipelineArtifactType.DATASET,
        schema,
        role: t.role !== undefined ? t.role : DatasetRole.FULL,
        task: t.task !== undefined ? t.task : null,
      } as Contract;
    }
  }

  const input = getFirstDatasetContract(ctx);
  if (!input || !isDatasetContract(input)) return null;

  const columnsUnknown = input.schema.columns === 'unknown';

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

  if ('keepColumns' in t && t.keepColumns) {
    const raw = t.keepColumns as unknown;
    const resolved = typeof raw === 'string' && raw.startsWith('$')
      ? resolvePath(raw, ctx)
      : raw;
    const keep = Array.isArray(resolved)
      ? resolved
      : typeof resolved === 'string'
        ? resolved.split(',').map((s: string) => s.trim())
        : [];
    return {
      artifact: PipelineArtifactType.DATASET,
      schema: {
        columns: columnsUnknown
          ? 'unknown'
          : (input.schema.columns as Exclude<typeof input.schema.columns, 'unknown'>).filter((col) => keep.includes(col.name)),
        target: input.schema.target,
      },
      role: input.role,
      task: input.task,
    };
  }

  if ('renameColumns' in t && t.renameColumns) {
    const raw = t.renameColumns as unknown;
    const resolved = typeof raw === 'string' && raw.startsWith('$')
      ? resolvePath(raw, ctx)
      : raw;
    const mapping = (typeof resolved === 'object' && resolved !== null ? resolved : {}) as Record<string, string>;
    return {
      artifact: PipelineArtifactType.DATASET,
      schema: {
        columns: columnsUnknown
          ? 'unknown'
          : (input.schema.columns as Exclude<typeof input.schema.columns, 'unknown'>).map((col) => ({
            ...col,
            name: mapping[col.name] ?? col.name,
          })),
        target: input.schema.target,
      },
      role: input.role,
      task: input.task,
    };
  }

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

  return null;
}

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

function unwrapDeclared(transform: unknown): unknown {
  if (
    typeof transform === 'object' &&
    transform !== null &&
    'declared' in transform &&
    (transform as Record<string, unknown>).declared !== undefined
  ) {
    return (transform as Record<string, unknown>).declared;
  }
  return transform;
}

function getFirstDatasetContract(ctx: NodeContext) {
  return Object.values(ctx.inputContracts).find((c) => c.artifact === PipelineArtifactType.DATASET);
}

function getFirstModelContract(ctx: NodeContext) {
  return Object.values(ctx.inputContracts).find((c) => c.artifact === PipelineArtifactType.MODEL);
}
