import {
  DatasetRole,
  PipelineArtifactType,
  type Contract,
  type ValidationError,
} from '@training-ml/contracts';
import { resolvePath } from '../operators/_resolve-path';
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
      return {
        artifact: PipelineArtifactType.DATASET,
        schema: t.schema !== undefined ? t.schema : { columns: 'unknown' as const, target: null },
        role: t.role !== undefined ? t.role : DatasetRole.FULL,
        task: t.task !== undefined ? t.task : null,
      } as Contract;
    }
  }

  const input = getFirstDatasetContract(ctx);
  if (!input || !isDatasetContract(input)) return null;

  const columnsUnknown = input.schema.columns === 'unknown';

  if ('copyInput' in t && t.copyInput) {
    if ('columnUpdates' in t && Array.isArray(t.columnUpdates)) {
      const cols = columnsUnknown
        ? []
        : (input.schema.columns as Exclude<typeof input.schema.columns, 'unknown'>).map((col) => {
          const match = (t.columnUpdates as Array<Record<string, unknown>>).find((u) =>
            (u.columns as string[]).includes(col.name),
          );
          if (!match) return col;
          return {
            ...col,
            primitive: (match.primitive as string) ?? col.primitive,
            semantic: (match.semantic as string) ?? col.semantic,
            nullable: (match.nullable as boolean | undefined) ?? col.nullable,
          };
        });
      return {
        artifact: PipelineArtifactType.DATASET,
        schema: {
          columns: columnsUnknown ? 'unknown' : cols,
          target: input.schema.target,
        },
        role: input.role,
        task: input.task,
      };
    }

    if ('set' in t && t.set) {
      const set = t.set as Record<string, unknown>;
      const resolveSetValue = (val: unknown): unknown =>
        typeof val === 'string' && val.startsWith('$') ? resolvePath(val, ctx) : val;
      const task = resolveSetValue(set['task']) as string | undefined;
      const target = resolveSetValue(set['schema.target']) as string | undefined;
      const role = resolveSetValue(set['role']) as string | undefined;
      return {
        artifact: PipelineArtifactType.DATASET,
        schema: {
          columns: columnsUnknown ? 'unknown' : input.schema.columns,
          target: target ?? input.schema.target,
        },
        role: role ?? input.role,
        task: task ?? input.task,
      };
    }

    return {
      artifact: PipelineArtifactType.DATASET,
      schema: {
        columns: columnsUnknown ? 'unknown' : input.schema.columns,
        target: input.schema.target,
      },
      role: input.role,
      task: input.task,
    };
  }

  if ('keepColumns' in t && Array.isArray(t.keepColumns)) {
    const keep = t.keepColumns as string[];
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
    const mapping = t.renameColumns as Record<string, string>;
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

  if ('concatColumns' in t && Array.isArray(t.concatColumns)) {
    return {
      artifact: PipelineArtifactType.DATASET,
      schema: {
        columns: columnsUnknown ? 'unknown' : input.schema.columns,
        target: input.schema.target,
      },
      role: input.role,
      task: input.task,
    };
  }

  return null;
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
