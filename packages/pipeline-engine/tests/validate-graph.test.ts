import { validateGraph } from '../src/validate-graph';
import {
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
          }
        : b,
    );

    const result = validateGraph(graph, catalog);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SEMANTIC_MISMATCH')).toBe(true);
  });
});
