import { validateGraph } from '../src/validate-graph';
import {
  evaluationBlock,
  featureSelectionBlock,
  loadCsvBlock,
  normalizationBlock,
  randomForestBlock,
  selectTargetBlock,
  trainTestSplitBlock,
  v1Catalog,
} from './fixtures/v1-catalog';

describe('validateGraph', () => {
  it('validates a simple valid pipeline', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } },
        { id: 'target', blockId: 'select-target', blockVersion: 1, config: { targetColumn: 'churn', task: 'classification' } },
        { id: 'norm', blockId: 'normalization', blockVersion: 1, config: { columns: ['age'], method: 'Standard' } },
        { id: 'split', blockId: 'train-test-split', blockVersion: 1, config: { testSize: 0.2 } },
        { id: 'rf', blockId: 'random-forest', blockVersion: 1, config: {} },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
        { id: 'e2', sourceNodeId: 'target', sourcePortId: 'dataset', targetNodeId: 'norm', targetPortId: 'dataset' },
        { id: 'e3', sourceNodeId: 'norm', sourcePortId: 'dataset', targetNodeId: 'split', targetPortId: 'dataset' },
        { id: 'e4', sourceNodeId: 'split', sourcePortId: 'train', targetNodeId: 'rf', targetPortId: 'dataset' },
      ],
    };

    // Override Load CSV to declare known columns for this test.
    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.contracts.rf.model).toMatchObject({
      artifact: 'Model',
      algorithm: 'RandomForest',
      task: 'classification',
    });
  });

  it('produces distinct output contracts per port for recursive outputTransform.ports', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } },
        { id: 'target', blockId: 'select-target', blockVersion: 1, config: { targetColumn: 'churn', task: 'classification' } },
        { id: 'split', blockId: 'train-test-split', blockVersion: 1, config: { testSize: 0.2 } },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
        { id: 'e2', sourceNodeId: 'target', sourcePortId: 'dataset', targetNodeId: 'split', targetPortId: 'dataset' },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    expect(result.valid).toBe(true);
    expect(result.contracts.split.train).toMatchObject({
      artifact: 'Dataset',
      role: 'train',
      task: 'classification',
    });
    expect(result.contracts.split.test).toMatchObject({
      artifact: 'Dataset',
      role: 'test',
      task: 'classification',
    });
  });

  it('fails when normalization targets a categorical column', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } },
        { id: 'target', blockId: 'select-target', blockVersion: 1, config: { targetColumn: 'churn', task: 'classification' } },
        { id: 'norm', blockId: 'normalization', blockVersion: 1, config: { columns: ['churn'], method: 'Standard' } },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
        { id: 'e2', sourceNodeId: 'target', sourcePortId: 'dataset', targetNodeId: 'norm', targetPortId: 'dataset' },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SEMANTIC_MISMATCH')).toBe(true);
  });

  it('does not produce contradictory semantic errors for Select Target with classification task', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'iris.csv' } },
        {
          id: 'target',
          blockId: 'select-target',
          blockVersion: 1,
          config: { targetColumn: 'Species', task: 'classification' },
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'SepalLengthCm', primitive: 'float', semantic: 'numeric' },
                    { name: 'Species', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    const targetErrors = result.errors.filter((e) => e.nodeId === 'target');
    const numericMismatch = targetErrors.find(
      (e) => e.code === 'SEMANTIC_MISMATCH' && e.message.includes('numeric'),
    );
    expect(numericMismatch).toBeUndefined();
  });

  it('exposes inputContracts populated from upstream output', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } },
        { id: 'target', blockId: 'select-target', blockVersion: 1, config: { targetColumn: 'churn', task: 'classification' } },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    expect(result.inputContracts['target']).toBeDefined();
    expect(result.inputContracts['target']['dataset']).toMatchObject({
      artifact: 'Dataset',
      schema: {
        columns: [
          { name: 'age', semantic: 'numeric' },
          { name: 'churn', semantic: 'categorical' },
        ],
      },
    });
  });

  it('exposes an empty inputContracts entry for a source node with no incoming edges', () => {
    const graph = {
      nodes: [{ id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } }],
      edges: [],
    };

    const result = validateGraph(graph, v1Catalog);

    expect(result.inputContracts['load']).toEqual({});
  });

  it('validates a Feature Selection block with array-form subsetOf rule (regression: path.startsWith crash)', () => {
    const graph = {
      nodes: [
        {
          id: 'load',
          blockId: 'load-csv',
          blockVersion: 1,
          config: { file: 'data.csv' },
        },
        {
          id: 'target',
          blockId: 'select-target',
          blockVersion: 1,
          config: { targetColumn: 'churn', task: 'classification' },
        },
        {
          id: 'fs',
          blockId: 'feature-selection',
          blockVersion: 1,
          config: { columns: ['age', 'churn'] },
        },
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'load',
          sourcePortId: 'dataset',
          targetNodeId: 'target',
          targetPortId: 'dataset',
        },
        {
          id: 'e2',
          sourceNodeId: 'target',
          sourcePortId: 'dataset',
          targetNodeId: 'fs',
          targetPortId: 'dataset',
        },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    expect(() => validateGraph(graph, catalog)).not.toThrow();
    const result = validateGraph(graph, catalog);
    expect(result.errors.filter((e) => e.nodeId === 'fs' && e.code === 'NOT_SUBSET')).toEqual([]);
  });

  it('flags a NOT_SUBSET error when Feature Selection drops the target column', () => {
    const graph = {
      nodes: [
        {
          id: 'load',
          blockId: 'load-csv',
          blockVersion: 1,
          config: { file: 'data.csv' },
        },
        {
          id: 'target',
          blockId: 'select-target',
          blockVersion: 1,
          config: { targetColumn: 'churn', task: 'classification' },
        },
        {
          id: 'fs',
          blockId: 'feature-selection',
          blockVersion: 1,
          config: { columns: ['age'] },
        },
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'load',
          sourcePortId: 'dataset',
          targetNodeId: 'target',
          targetPortId: 'dataset',
        },
        {
          id: 'e2',
          sourceNodeId: 'target',
          sourcePortId: 'dataset',
          targetNodeId: 'fs',
          targetPortId: 'dataset',
        },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);
    const fsErrors = result.errors.filter((e) => e.nodeId === 'fs' && e.code === 'NOT_SUBSET');
    expect(fsErrors).toHaveLength(1);
    expect(fsErrors[0].context?.missing).toEqual(['churn']);
  });

  it('passes Evaluation model-vs-dataset task check when Select Target task is classification', () => {
    const graph = {
      nodes: [
        { id: 'load', blockId: 'load-csv', blockVersion: 1, config: { file: 'data.csv' } },
        {
          id: 'target',
          blockId: 'select-target',
          blockVersion: 1,
          config: { targetColumn: 'churn', task: 'classification' },
        },
        { id: 'split', blockId: 'train-test-split', blockVersion: 1, config: { testSize: 0.2 } },
        { id: 'rf', blockId: 'random-forest', blockVersion: 1, config: {} },
        { id: 'eval', blockId: 'evaluation', blockVersion: 1, config: { metrics: ['accuracy'] } },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'load', sourcePortId: 'dataset', targetNodeId: 'target', targetPortId: 'dataset' },
        { id: 'e2', sourceNodeId: 'target', sourcePortId: 'dataset', targetNodeId: 'split', targetPortId: 'dataset' },
        { id: 'e3', sourceNodeId: 'split', sourcePortId: 'train', targetNodeId: 'rf', targetPortId: 'dataset' },
        { id: 'e4', sourceNodeId: 'split', sourcePortId: 'test', targetNodeId: 'eval', targetPortId: 'dataset' },
        { id: 'e5', sourceNodeId: 'rf', sourcePortId: 'model', targetNodeId: 'eval', targetPortId: 'model' },
      ],
    };

    const catalog = v1Catalog.map((b) =>
      b.id === 'load-csv'
        ? {
            ...b,
            outputTransform: {
              declared: {
                artifact: 'Dataset',
                schema: {
                  columns: [
                    { name: 'age', primitive: 'int', semantic: 'numeric' },
                    { name: 'churn', primitive: 'string', semantic: 'categorical' },
                  ],
                  target: null,
                },
                role: 'full',
                task: null,
              },
            },
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    const evalErrors = result.errors.filter((e) => e.nodeId === 'eval');
    expect(evalErrors).toEqual([]);
    expect(result.contracts.rf.model).toMatchObject({ task: 'classification' });
    expect(result.contracts.eval.metrics).toMatchObject({ task: 'classification' });
  });
});
