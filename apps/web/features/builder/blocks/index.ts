import type { BlockDefinition, BlockCategory } from '@/lib/models';
import { LoadDatasetBlock, SplitDatasetBlock } from './definitions/data.blocks';
import { NormalizeBlock, AugmentBlock, FilterBlock } from './definitions/transform.blocks';
import { TrainModelBlock, FineTuneBlock } from './definitions/model.blocks';
import { EvaluateBlock, CrossValidateBlock } from './definitions/evaluate.blocks';
import { SaveModelBlock, ExportDatasetBlock, LogMetricsBlock } from './definitions/export.blocks';

export { SocketTypes } from './socket-types';
export type { SocketType, SocketDefinition, BlockConfigField } from './socket-types';

export const ALL_BLOCKS: BlockDefinition[] = [
  LoadDatasetBlock,
  SplitDatasetBlock,
  NormalizeBlock,
  AugmentBlock,
  FilterBlock,
  TrainModelBlock,
  FineTuneBlock,
  EvaluateBlock,
  CrossValidateBlock,
  SaveModelBlock,
  ExportDatasetBlock,
  LogMetricsBlock,
];

export function getBlocksByCategory(categoryId: string): BlockDefinition[] {
  return ALL_BLOCKS.filter((b) => b.categoryId === categoryId);
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { id: 'data', name: 'Data' },
  { id: 'transform', name: 'Transform' },
  { id: 'model', name: 'Model' },
  { id: 'evaluate', name: 'Evaluate' },
  { id: 'export', name: 'Export' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  data: 'bg-blue-500',
  transform: 'bg-amber-500',
  model: 'bg-green-500',
  evaluate: 'bg-purple-500',
  export: 'bg-rose-500',
};
