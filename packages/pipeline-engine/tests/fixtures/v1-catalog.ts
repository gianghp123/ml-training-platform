import type { BlockDefinition } from '@training-ml/contracts';

export const loadCsvBlock: BlockDefinition = {
  id: 'load-csv',
  executorKey: 'load_csv',
  version: 1,
  status: 'active',
  name: 'Load CSV',
  categoryId: 'Data Source',
  ports: {
    inputs: [],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'FileUpload', id: 'file', accept: ['.csv'] },
      { type: 'Select', id: 'delimiter', options: [',', ';', '\t'], default: ',' },
      { type: 'Boolean', id: 'hasHeader', default: true },
    ],
  },
  constraints: {
    rules: [{ op: 'exists', target: '$config.file', severity: 'error', message: 'A CSV file must be uploaded.' }],
  },
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: { columns: 'unknown', target: null },
      role: 'full',
      task: null,
    },
    confirmProvider: 'backend',
  },
};

export const selectTargetBlock: BlockDefinition = {
  id: 'select-target',
  executorKey: 'select_target',
  version: 1,
  status: 'active',
  name: 'Select Target',
  categoryId: 'Preprocessing',
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
      {
        op: 'semantic',
        target: '$config.targetColumn',
        severity: 'error',
        expected: ['categorical'],
        condition: { field: 'task', equals: 'classification' },
        message: 'Classification requires a categorical target column.',
      },
      {
        op: 'semantic',
        target: '$config.targetColumn',
        severity: 'error',
        expected: ['numeric'],
        condition: { field: 'task', equals: 'regression' },
        message: 'Regression requires a numeric target column.',
      },
    ],
  },
  outputTransform: {
    declared: {
      copyInput: true,
      set: { 'schema.target': '$config.targetColumn', task: '$config.task' },
    },
  },
};

export const normalizationBlock: BlockDefinition = {
  id: 'normalization',
  executorKey: 'normalize',
  version: 1,
  status: 'active',
  name: 'Normalization',
  categoryId: 'Preprocessing',
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
    declared: {
      copyInput: true,
      columnUpdates: [{ columns: '$config.columns', primitive: 'float' }],
    },
  },
};

export const trainTestSplitBlock: BlockDefinition = {
  id: 'train-test-split',
  executorKey: 'train_test_split',
  version: 1,
  status: 'active',
  name: 'Train/Test Split',
  categoryId: 'Data Split',
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
  executorKey: 'random_forest',
  version: 1,
  status: 'active',
  name: 'Random Forest',
  categoryId: 'Model',
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
    declared: {
      artifact: 'Model',
      algorithm: 'RandomForest',
      task: '$input.dataset.task',
      featureSchema: '$input.dataset.schema.columns',
      targetSchema: '$input.dataset.schema.target',
    },
  },
};

export const featureSelectionBlock: BlockDefinition = {
  id: 'feature-selection',
  executorKey: 'feature_select',
  version: 1,
  status: 'active',
  name: 'Feature Selection',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [{ type: 'ColumnSelector', id: 'columns', multiple: true }],
  },
  constraints: {
    rules: [
      {
        op: 'subsetOf',
        left: ['$input.dataset.schema.target'],
        right: '$config.columns',
        severity: 'error',
        message: 'The target column must remain among the kept columns.',
      },
    ],
  },
  outputTransform: {
    declared: { keepColumns: '$config.columns' },
  },
};

export const evaluationBlock: BlockDefinition = {
  id: 'evaluation',
  executorKey: 'evaluate',
  version: 1,
  status: 'active',
  name: 'Evaluation',
  categoryId: 'Evaluation',
  ports: {
    inputs: [
      { id: 'model', artifact: 'Model' },
      { id: 'dataset', artifact: 'Dataset' },
    ],
    outputs: [{ id: 'metrics', artifact: 'Metrics' }],
  },
  configSchema: {
    fields: [
      {
        type: 'MultiSelect',
        id: 'metrics',
        optionsFrom: '$input.model.task',
        optionsMap: {
          classification: ['accuracy', 'precision', 'recall', 'f1', 'confusionMatrix'],
          regression: ['mae', 'mse', 'rmse', 'r2'],
          clustering: ['silhouette', 'inertia'],
        },
      },
    ],
  },
  constraints: {
    rules: [
      {
        op: 'eq',
        left: '$input.dataset.role',
        right: 'test',
        severity: 'error',
        message: 'Evaluation should run against a test-role dataset, not the training data.',
      },
      {
        op: 'eq',
        left: '$input.model.task',
        right: '$input.dataset.task',
        severity: 'error',
        message: 'Model and dataset task types must match.',
      },
      {
        op: 'subsetOf',
        left: '$input.model.featureSchema',
        right: '$input.dataset.schema.columns',
        severity: 'error',
        message: 'The dataset must contain every feature column the model was trained on.',
      },
    ],
  },
  outputTransform: {
    declared: {
      artifact: 'Metrics',
      task: '$input.model.task',
      metrics: 'unknown',
    },
    confirmProvider: 'backend',
  },
};

export const v1Catalog: BlockDefinition[] = [
  loadCsvBlock,
  selectTargetBlock,
  normalizationBlock,
  featureSelectionBlock,
  trainTestSplitBlock,
  randomForestBlock,
  evaluationBlock,
];
