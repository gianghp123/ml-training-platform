import type { BlockDefinition, BlockCategory } from '@/lib/models';
import { LoadCsvExcel, LoadJsonBlock, LoadXmlBlock } from './definitions/data.blocks';
import {
  DataTypeConversion,
  DropColumns,
  Encoding,
  HandleMissingValues,
  Normalization,
  OutlierHandling,
  RemoveDuplicates,
  RenameColumns,
  TextCleaning,
} from './definitions/preprocessing.block';
import { TrainTestSplitBlock, KFoldSplitBlock, StratifiedSplitBlock } from './definitions/splitting.blocks';
import { FeatureSelectionBlock, PCABlock, CreateNewFeatureBlock } from './definitions/transform.blocks';
import { HyperparametersBlock, LossFunctionBlock, EarlyStoppingBlock } from './definitions/configuration.blocks';
import { LogisticRegressionBlock, DecisionTreeBlock, RandomForestBlock, SVMBlock, LinearRegressionBlock, RidgeRegressionBlock, KMeansBlock, ANNBlock, CNNBlock } from './definitions/model.blocks';
import {
  ClassificationMetricsBlock,
  ClassificationReportBlock,
  ConfusionMatrixBlock,
  CrossValidationBlock,
  PredictionResultBlock,
  RocAucCurveBlock,
} from './definitions/evaluate.blocks';
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
  DataTypeConversion,
  RenameColumns,
  DropColumns,
  OutlierHandling,
  TextCleaning,
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
  ClassificationMetricsBlock,
  ConfusionMatrixBlock,
  RocAucCurveBlock,
  ClassificationReportBlock,
  PredictionResultBlock,
  CrossValidationBlock,
  SaveModelBlock,
  ExportDatasetBlock,
  LogMetricsBlock,

];

export function getBlocksByCategory(categoryId: string): BlockDefinition[] {
  return ALL_BLOCKS.filter((b) => b.categoryId === categoryId);
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { id: 'load_data', code: 'SOURCE', name: 'Load Data', orderIndex: 0 },
  { id: 'preprocess_data', code: 'PREPROCESS', name: 'Preprocess', orderIndex: 10 },
  { id: 'split_data', code: 'SPLIT', name: 'Split Data', orderIndex: 20 },
  { id: 'transform', code: 'TRANSFORM', name: 'Transform', orderIndex: 30 },
  { id: 'config', code: 'CONFIG', name: 'Configuration', orderIndex: 40 },
  { id: 'model', code: 'MODEL', name: 'Model', orderIndex: 50 },
  { id: 'evaluate', code: 'EVALUATE', name: 'Evaluate', orderIndex: 60 },
  { id: 'export', code: 'EXPORT', name: 'Export', orderIndex: 70 },
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
