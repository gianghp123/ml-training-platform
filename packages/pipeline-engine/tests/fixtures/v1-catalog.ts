import type { BlockDefinition } from '@training-ml/contracts';

export const loadCsvBlock: BlockDefinition = {
  id: 'load-csv',
  version: 1,
  status: 'active',
  metadata: { name: 'Load CSV', category: 'Data Source' },
  ports: {
    inputs: [],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'FileUpload', id: 'file', accept: ['.csv'] },
      { type: 'Select', id: 'delimiter', options: [',', ';', '\\t'], default: ',' },
      { type: 'Boolean', id: 'hasHeader', default: true },
    ],
  },
  constraints: {
    rules: [{ op: 'exists', target: '$config.file', severity: 'error', message: 'A CSV file must be uploaded.' }],
  },
  outputTransform: {
    artifact: 'Dataset',
    schema: { columns: 'unknown', target: null },
    role: 'full',
    task: null,
  },
};

export const selectTargetBlock: BlockDefinition = {
  id: 'select-target',
  version: 1,
  status: 'active',
  metadata: { name: 'Select Target', category: 'Preprocessing' },
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'ColumnSelector', id: 'targetColumn', multiple: false },
      { type: 'Select', id: 'task', options: ['classification', 'regression', 'clustering'] },
    ],
  },
  constraints: {
    rules: [
      {
        op: 'exists',
        target: '$config.targetColumn',
        severity: 'error',
        condition: { field: 'task', in: ['classification', 'regression'] },
        message: 'A target column is required for classification and regression.',
      },
    ],
  },
  outputTransform: {
    copyInput: true,
    set: { 'schema.target': '$config.targetColumn', task: '$config.task' },
  },
};

export const normalizationBlock: BlockDefinition = {
  id: 'normalization',
  version: 1,
  status: 'active',
  metadata: { name: 'Normalization', category: 'Preprocessing' },
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'ColumnSelector', id: 'columns', multiple: true, semantic: ['numeric'] },
      { type: 'Select', id: 'method', options: ['MinMax', 'Standard', 'Robust'] },
    ],
  },
  constraints: {
    rules: [
      {
        op: 'semantic',
        target: '$config.columns',
        severity: 'error',
        expected: ['numeric'],
        message: 'Normalization requires numeric columns.',
      },
    ],
  },
  outputTransform: {
    copyInput: true,
    columnUpdates: [{ columns: '$config.columns', primitive: 'float' }],
  },
};

export const trainTestSplitBlock: BlockDefinition = {
  id: 'train-test-split',
  version: 1,
  status: 'active',
  metadata: { name: 'Train/Test Split', category: 'Data Split' },
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [
      { id: 'train', artifact: 'Dataset' },
      { id: 'test', artifact: 'Dataset' },
    ],
  },
  configSchema: {
    fields: [
      { type: 'Number', id: 'testSize', min: 0.05, max: 0.5, default: 0.2 },
      { type: 'Boolean', id: 'stratify', default: true },
    ],
  },
  constraints: {
    rules: [
      {
        op: 'exists',
        target: '$input.dataset.schema.target',
        severity: 'error',
        message: 'Dataset must have a target selected before splitting.',
      },
    ],
  },
  outputTransform: {
    ports: {
      train: { copyInput: true, set: { role: 'train' } },
      test: { copyInput: true, set: { role: 'test' } },
    },
  },
};

export const randomForestBlock: BlockDefinition = {
  id: 'random-forest',
  version: 1,
  status: 'active',
  metadata: { name: 'Random Forest', category: 'Model' },
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'model', artifact: 'Model' }],
  },
  configSchema: {
    fields: [
      { type: 'Number', id: 'n_estimators', min: 1, default: 100 },
      { type: 'Number', id: 'max_depth', min: 1, default: 10 },
    ],
  },
  constraints: {
    rules: [
      {
        op: 'exists',
        target: '$input.dataset.schema.target',
        severity: 'error',
        message: 'Dataset must have a target column.',
      },
      {
        op: 'eq',
        left: '$input.dataset.role',
        right: 'train',
        severity: 'error',
        message: 'Random Forest must be trained on a train-role dataset.',
      },
    ],
  },
  outputTransform: {
    artifact: 'Model',
    algorithm: 'RandomForest',
    task: '$input.dataset.task',
    featureSchema: '$input.dataset.schema.columns',
    targetSchema: '$input.dataset.schema.target',
  },
};

export const v1Catalog: BlockDefinition[] = [
  loadCsvBlock,
  selectTargetBlock,
  normalizationBlock,
  trainTestSplitBlock,
  randomForestBlock,
];
