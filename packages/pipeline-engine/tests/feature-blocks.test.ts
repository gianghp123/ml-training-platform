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

  it('Feature Union: overlapping branch columns fail', () => {
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
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true);
  });

  it('Feature Union: joined branch + raw branch sharing columns fail', () => {
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
    expect(result.errors.some((e) => e.code === 'COLUMNS_NOT_DISJOINT')).toBe(true);
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
});
