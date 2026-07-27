import {
  BlockDefinitionSchema,
  ConfigFieldSchema,
  FilterConditionSchema,
  PortSchema,
} from '@training-ml/contracts';

describe('contracts: feature-block schema extensions', () => {
  it('parses a ConditionList field', () => {
    const field = ConfigFieldSchema.parse({
      type: 'ConditionList',
      id: 'conditions',
      ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
    });
    expect(field.type).toBe('ConditionList');
  });

  it('parses an Expression field', () => {
    expect(ConfigFieldSchema.parse({ type: 'Expression', id: 'expression' }).type).toBe('Expression');
  });

  it('parses a filter condition with and without value', () => {
    expect(FilterConditionSchema.parse({ column: 'Age', op: 'gte', value: 18 }).op).toBe('gte');
    expect(FilterConditionSchema.parse({ column: 'Age', op: 'isNull' }).value).toBeUndefined();
    expect(FilterConditionSchema.parse({ column: 'C', op: 'in', value: ['a', 'b'] }).value).toEqual(['a', 'b']);
  });

  it('rejects an unknown filter op', () => {
    expect(() => FilterConditionSchema.parse({ column: 'Age', op: 'regex' })).toThrow();
  });

  it('parses an optional port', () => {
    const port = PortSchema.parse({ id: 'datasetC', artifact: 'Dataset', optional: true });
    expect(port.optional).toBe(true);
  });

  it('parses copyInput with addColumns', () => {
    const def = BlockDefinitionSchema.parse({
      id: 'custom-feature-formula',
      version: 1,
      status: 'active',
      executorKey: 'custom_feature_formula',
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
    });
    expect(def.executorKey).toBe('custom_feature_formula');
  });

  it('parses joinColumns transform', () => {
    const def = BlockDefinitionSchema.parse({
      id: 'join-datasets',
      version: 1,
      status: 'active',
      executorKey: 'join_datasets',
      name: 'Join Datasets',
      categoryId: 'Preprocessing',
      ports: {
        inputs: [
          { id: 'left', artifact: 'Dataset' },
          { id: 'right', artifact: 'Dataset' },
        ],
        outputs: [{ id: 'dataset', artifact: 'Dataset' }],
      },
      configSchema: { fields: [] },
      constraints: {},
      outputTransform: {
        declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
      },
    });
    expect(def.executorKey).toBe('join_datasets');
  });
});
