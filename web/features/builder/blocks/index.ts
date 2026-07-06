import type { BlockDefinition, BlockCategory } from '@/lib/models';
import { LoadCsvExcel, LoadJsonBlock, LoadXmlBlock } from './definitions/data.blocks';
import { HandleMissingValues, RemoveDuplicates, Encoding, Normalization, ResizeCropImage, DataAugmentation } from './definitions/preprocessing.block';
import { TrainTestSplitBlock, KFoldSplitBlock, StratifiedSplitBlock } from './definitions/splitting.blocks';
import { FeatureSelectionBlock, PCABlock, CreateNewFeatureBlock } from './definitions/transform.blocks';
import { HyperparametersBlock, LossFunctionBlock, EarlyStoppingBlock } from './definitions/configuration.blocks';
import { LogisticRegressionBlock, DecisionTreeBlock, RandomForestBlock, SVMBlock, LinearRegressionBlock, RidgeRegressionBlock, KMeansBlock, ANNBlock, CNNBlock } from './definitions/model.blocks';
import { EvaluateBlock, CrossValidateBlock } from './definitions/evaluate.blocks';
import { SaveModelBlock, ExportDatasetBlock, LogMetricsBlock } from './definitions/export.blocks';

export { SocketTypes } from './socket-types';
export type { SocketType, SocketDefinition, BlockConfigField } from './socket-types';

export const ALL_BLOCKS: BlockDefinition[] = [
  LoadCsvExcel,
  LoadJsonBlock,
  LoadXmlBlock,
  HandleMissingValues,
  RemoveDuplicates,
  Encoding,
  Normalization,
  ResizeCropImage,
  DataAugmentation,
  TrainTestSplitBlock,
  KFoldSplitBlock,
  StratifiedSplitBlock,
  FeatureSelectionBlock,
  PCABlock,
  CreateNewFeatureBlock,
  HyperparametersBlock,
  LossFunctionBlock,
  EarlyStoppingBlock,
  LogisticRegressionBlock,
  DecisionTreeBlock,
  RandomForestBlock,
  SVMBlock,
  LinearRegressionBlock,
  RidgeRegressionBlock,
  KMeansBlock,
  ANNBlock,
  CNNBlock,
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
  { id: 'load_data', name: 'Load Data' },
  { id: 'preprocess_data', name: 'Preprocess' },
  { id: 'split_data', name: 'Split Data' },
  { id: 'transform', name: 'Transform' },
  { id: 'config', name: 'Configuration' },
  { id: 'model', name: 'Model' },
  { id: 'evaluate', name: 'Evaluate' },
  { id: 'export', name: 'Export' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  load_data: 'bg-blue-500',
  preprocess_data: 'bg-teal-500',
  split_data: 'bg-orange-500',
  transform: 'bg-amber-500',
  config: 'bg-indigo-500',
  model: 'bg-green-500',
  evaluate: 'bg-purple-500',
  export: 'bg-rose-500',
};
