import { validateGraph } from '../src/validate-graph';
import type { Graph } from '../src/types';
import {
  customFeatureFormulaBlock,
  featureBlocksCatalog,
  featureUnionBlock,
  filterRowsBlock,
  joinDatasetsBlock,
  stubCustomersBlock,
  stubSourceBlock,
  stubSpendingBlock,
  stubTwoRowsBlock,
  stubThreeRowsBlock,
} from './fixtures/feature-blocks-catalog';

const node = (id: string, def: { id: string; version: number }, config: Record<string, unknown> = {}) => ({
  id,
  blockId: def.id,
  blockVersion: def.version,
  config,
});

const edge = (id: string, from: string, fromPort: string, to: string, toPort: string) => ({
  id,
  sourceNodeId: from,
  sourcePortId: fromPort,
  targetNodeId: to,
  targetPortId: toPort,
});

describe('feature blocks: end-to-end graph validation', () => {
  it('Filter Rows: valid conditions pass, schema preserved', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('filter', filterRowsBlock, {
          conditions: [
            { column: 'Age', op: 'gte', value: 18 },
            { column: 'Country', op: 'eq', value: 'US' },
          ],
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'filter', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['filter']['dataset'];
    expect(out.artifact).toBe('Dataset');
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'Country']);
    } else {
      fail('expected known columns');
    }
  });

  it('Filter Rows: unknown condition column fails', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('filter', filterRowsBlock, { conditions: [{ column: 'Nope', op: 'eq', value: 1 }] }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'filter', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'CONDITION_COLUMN_NOT_FOUND')).toBe(true);
  });

  it('Custom Feature Formula: valid formula appends column', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('formula', customFeatureFormulaBlock, {
          outputColumn: 'IncomePerAge',
          outputType: 'float',
          expression: 'Income / (Age + 1)',
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'formula', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['formula']['dataset'];
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'Country', 'IncomePerAge']);
    } else {
      fail('expected known columns');
    }
  });

  it('Custom Feature Formula: unknown column in formula fails', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('formula', customFeatureFormulaBlock, {
          outputColumn: 'X',
          expression: 'Salary * 2',
        }),
      ],
      edges: [edge('e1', 'src', 'dataset', 'formula', 'dataset')],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'EXPRESSION_UNKNOWN_COLUMN')).toBe(true);
  });

  it('Join Datasets: valid join merges columns', () => {
    const graph: Graph = {
      nodes: [
        node('customers', stubCustomersBlock),
        node('spending', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'], strategy: 'inner' }),
      ],
      edges: [
        edge('e1', 'customers', 'dataset', 'join', 'left'),
        edge('e2', 'spending', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors).toEqual([]);
    const out = result.contracts['join']['dataset'];
    if (out.artifact === 'Dataset' && out.schema.columns !== 'unknown') {
      expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'TotalSpent']);
    } else {
      fail('expected known columns');
    }
  });

  it('Join Datasets: key missing from right input fails', () => {
    const graph: Graph = {
      nodes: [
        node('customers', stubCustomersBlock),
        node('spending', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age', 'Missing'] }),
      ],
      edges: [
        edge('e1', 'customers', 'dataset', 'join', 'left'),
        edge('e2', 'spending', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'KEYS_NOT_FOUND')).toBe(true);
  });

  it('Join Datasets: non-key collision fails', () => {
    const graph: Graph = {
      nodes: [
        node('a', stubCustomersBlock),
        node('b', stubCustomersBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'] }),
      ],
      edges: [
        edge('e1', 'a', 'dataset', 'join', 'left'),
        edge('e2', 'b', 'dataset', 'join', 'right'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true);
  });

  it('Feature Union: overlapping branch columns succeed via first-occurrence-wins dedup', () => {
    const graph: Graph = {
      nodes: [
        node('src', stubSourceBlock),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'Col1', expression: 'Age * 2' }),
        node('f2', customFeatureFormulaBlock, { outputColumn: 'Col2', expression: 'Income + 1' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'src', 'dataset', 'f1', 'dataset'),
        edge('e2', 'src', 'dataset', 'f2', 'dataset'),
        edge('e3', 'f1', 'dataset', 'union', 'datasetA'),
        edge('e4', 'f2', 'dataset', 'union', 'datasetB'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.filter((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toEqual([]);
    const out1 = result.contracts['union']?.['dataset'];
    expect(out1).toBeDefined();
    if (out1?.artifact === 'Dataset' && out1.schema.columns !== 'unknown') {
      expect(out1.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'Country', 'Col1', 'Col2']);
    }
  });

  it('Feature Union: joined + raw branch sharing columns dedup with first-wins', () => {
    const graph: Graph = {
      nodes: [
        node('c1', stubCustomersBlock),
        node('s1', stubSpendingBlock),
        node('join', joinDatasetsBlock, { keys: ['Age'] }),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'Derived', expression: 'TotalSpent / (Age + 1)' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'c1', 'dataset', 'join', 'left'),
        edge('e2', 's1', 'dataset', 'join', 'right'),
        edge('e3', 'join', 'dataset', 'f1', 'dataset'),
        edge('e4', 'f1', 'dataset', 'union', 'datasetA'),
        edge('e5', 's1', 'dataset', 'union', 'datasetB'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.filter((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toEqual([]);
    const out2 = result.contracts['union']?.['dataset'];
    expect(out2).toBeDefined();
    if (out2?.artifact === 'Dataset' && out2.schema.columns !== 'unknown') {
      expect(out2.schema.columns).toHaveLength(4);
      expect(out2.schema.columns.map((c) => c.name).sort()).toEqual(['Age', 'Derived', 'Income', 'TotalSpent']);
    }
  });

  it('Feature Union: truly disjoint 3-branch merge succeeds with no PORT_NOT_CONNECTED on datasetD', () => {
    const graph: Graph = {
      nodes: [
        node('c1', stubCustomersBlock),
        node('s1', stubSpendingBlock),
        node('f1', customFeatureFormulaBlock, { outputColumn: 'D1', expression: 'Age * 2' }),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 'c1', 'dataset', 'f1', 'dataset'),
        edge('e2', 's1', 'dataset', 'union', 'datasetB'),
        edge('e3', 'f1', 'dataset', 'union', 'datasetC'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    const codes = result.errors.map((e) => `${e.fieldId}:${e.code}`);
    expect(codes).toContain('datasetA:PORT_NOT_CONNECTED');
    expect(codes).not.toContain('datasetD:PORT_NOT_CONNECTED');
  });

  it('Feature Union: row count mismatch still fails', () => {
    const graph: Graph = {
      nodes: [
        node('s2', stubTwoRowsBlock),
        node('s3', stubThreeRowsBlock),
        node('union', featureUnionBlock),
      ],
      edges: [
        edge('e1', 's2', 'dataset', 'union', 'datasetA'),
        edge('e2', 's3', 'dataset', 'union', 'datasetB'),
      ],
    };
    const result = validateGraph(graph, featureBlocksCatalog);
    expect(result.errors.filter((e) => e.code === 'ROW_COUNT_MISMATCH')).not.toEqual([]);
  });
});
