import type { BlockDefinition } from '@training-ml/contracts';

export const stubSourceBlock: BlockDefinition = {
  id: 'stub-source',
  executorKey: 'stub_source',
  version: 1,
  status: 'active',
  name: 'Stub Source',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: false },
          { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

export const stubCustomersBlock: BlockDefinition = {
  id: 'stub-customers',
  executorKey: 'stub_customers',
  version: 1,
  status: 'active',
  name: 'Stub Customers',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

export const stubSpendingBlock: BlockDefinition = {
  id: 'stub-spending',
  executorKey: 'stub_spending',
  version: 1,
  status: 'active',
  name: 'Stub Spending',
  categoryId: 'Data Source',
  ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
  configSchema: { fields: [] },
  constraints: {},
  outputTransform: {
    declared: {
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
          { name: 'TotalSpent', primitive: 'float', semantic: 'numeric', nullable: false },
        ],
        target: null,
      },
      role: 'full',
      task: null,
    },
  },
};

export const filterRowsBlock: BlockDefinition = {
  id: 'filter-rows',
  executorKey: 'filter_rows',
  version: 1,
  status: 'active',
  name: 'Filter Rows',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      {
        type: 'ConditionList',
        id: 'conditions',
        ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
      },
      { type: 'Select', id: 'combinator', options: ['AND', 'OR'], default: 'AND' },
      { type: 'Boolean', id: 'invert', default: false },
    ],
  },
  constraints: {},
  outputTransform: { declared: { copyInput: true } },
};

export const customFeatureFormulaBlock: BlockDefinition = {
  id: 'custom-feature-formula',
  executorKey: 'custom_feature_formula',
  version: 1,
  status: 'active',
  name: 'Custom Feature Formula',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [{ id: 'dataset', artifact: 'Dataset' }],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'Text', id: 'outputColumn' },
      { type: 'Select', id: 'outputType', options: ['float', 'int', 'boolean'], default: 'float' },
      { type: 'Expression', id: 'expression' },
    ],
  },
  constraints: {},
  outputTransform: {
    declared: {
      copyInput: true,
      addColumns: [{ name: '$config.outputColumn', primitive: '$config.outputType' }],
    },
  },
};

export const joinDatasetsBlock: BlockDefinition = {
  id: 'join-datasets',
  executorKey: 'join_datasets',
  version: 1,
  status: 'active',
  name: 'Join Datasets',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [
      { id: 'left', artifact: 'Dataset' },
      { id: 'right', artifact: 'Dataset' },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: {
    fields: [
      { type: 'ColumnSelector', id: 'keys', multiple: true },
      { type: 'Select', id: 'strategy', options: ['inner', 'left', 'right', 'full'], default: 'inner' },
    ],
  },
  constraints: {
    rules: [
      { op: 'exists', target: '$config.keys', message: 'At least one join key is required.' },
      {
        op: 'columnsExist',
        columns: '$config.keys',
        inputs: ['$input.left', '$input.right'],
        message: 'Every join key must exist in both input datasets.',
      },
      {
        op: 'disjoint',
        left: '$input.left',
        right: '$input.right',
        exclude: '$config.keys',
        message: 'Non-key columns must not collide. Rename them before joining.',
      },
    ],
  },
  outputTransform: {
    declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
  },
};

export const featureUnionBlock: BlockDefinition = {
  id: 'feature-union',
  executorKey: 'feature_union',
  version: 1,
  status: 'active',
  name: 'Feature Union',
  categoryId: 'Preprocessing',
  ports: {
    inputs: [
      { id: 'datasetA', artifact: 'Dataset' },
      { id: 'datasetB', artifact: 'Dataset' },
      { id: 'datasetC', artifact: 'Dataset', optional: true },
      { id: 'datasetD', artifact: 'Dataset', optional: true },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
  configSchema: { fields: [] },
  constraints: {
    rules: [
      {
        op: 'rowCountMatches',
        targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
        message: 'All feature branches must have the same number of rows.',
      },
      {
        op: 'disjoint',
        targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
        message: 'Column names must be unique across all feature branches.',
      },
    ],
  },
  outputTransform: {
    declared: {
      concatColumns: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'],
    },
  },
};

export const featureBlocksCatalog: BlockDefinition[] = [
  stubSourceBlock,
  stubCustomersBlock,
  stubSpendingBlock,
  filterRowsBlock,
  customFeatureFormulaBlock,
  joinDatasetsBlock,
  featureUnionBlock,
];
