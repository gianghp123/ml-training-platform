import type { Graph } from '@training-ml/pipeline-engine';
import { isGraphEqual } from '../graph-equality';

const baseGraph: Graph = {
  nodes: [
    { id: 'n1', blockId: 'b1', blockVersion: 1, config: { threshold: 0.5, enabled: true } },
    { id: 'n2', blockId: 'b2', blockVersion: 2, config: {} },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' },
  ],
};

describe('isGraphEqual', () => {
  it('returns true for the same reference', () => {
    expect(isGraphEqual(baseGraph, baseGraph)).toBe(true);
  });

  it('returns true for structurally equal graphs (different references, same content)', () => {
    const copy: Graph = JSON.parse(JSON.stringify(baseGraph));
    expect(isGraphEqual(baseGraph, copy)).toBe(true);
  });

  it('is key-order independent for node config', () => {
    const reordered: Graph = {
      ...baseGraph,
      nodes: [
        { ...baseGraph.nodes[0], config: { enabled: true, threshold: 0.5 } },
        baseGraph.nodes[1],
      ],
    };
    expect(isGraphEqual(baseGraph, reordered)).toBe(true);
  });

  it('returns false when node count differs', () => {
    const fewer: Graph = { ...baseGraph, nodes: [baseGraph.nodes[0]] };
    expect(isGraphEqual(baseGraph, fewer)).toBe(false);
  });

  it('returns false when edge count differs', () => {
    const fewer: Graph = { ...baseGraph, edges: [] };
    expect(isGraphEqual(baseGraph, fewer)).toBe(false);
  });

  it('returns false when a node config value differs', () => {
    const changed: Graph = {
      ...baseGraph,
      nodes: [
        { ...baseGraph.nodes[0], config: { threshold: 0.9, enabled: true } },
        baseGraph.nodes[1],
      ],
    };
    expect(isGraphEqual(baseGraph, changed)).toBe(false);
  });

  it('returns false when a node config key is added', () => {
    const added: Graph = {
      ...baseGraph,
      nodes: [
        { ...baseGraph.nodes[0], config: { threshold: 0.5, enabled: true, extra: 1 } },
        baseGraph.nodes[1],
      ],
    };
    expect(isGraphEqual(baseGraph, added)).toBe(false);
  });

  it('returns false when a node blockId differs', () => {
    const changed: Graph = {
      ...baseGraph,
      nodes: [{ ...baseGraph.nodes[0], blockId: 'b1-changed' }, baseGraph.nodes[1]],
    };
    expect(isGraphEqual(baseGraph, changed)).toBe(false);
  });

  it('returns false when an edge endpoint differs', () => {
    const changed: Graph = {
      ...baseGraph,
      edges: [{ ...baseGraph.edges[0], targetNodeId: 'n3' }],
    };
    expect(isGraphEqual(baseGraph, changed)).toBe(false);
  });
});
