import { toValidationGraph } from '../graph-transform';
import type { Node, Edge } from '@xyflow/react';
import type { PipelineNode } from '../node-factory';
import type { BlockDefinition } from '@training-ml/contracts';

const mockBlock: BlockDefinition = {
  id: 'test-block',
  version: 1,
  status: 'active',
  name: 'Test Block',
  categoryId: 'data',
  ports: { inputs: [], outputs: [] },
  configSchema: { fields: [] },
  constraints: { rules: [] },
  outputTransform: {},
};

const mockPipelineNode: PipelineNode = {
  id: 'node-1',
  type: 'block',
  position: { x: 0, y: 0 },
  data: {
    blockId: 'test-block',
    blockName: 'Test Block',
    block: mockBlock,
    categoryId: 'data',
    config: {},
    inputs: [],
    outputs: [],
    status: 'idle',
  },
};

const mockGroupNode: Node = {
  id: 'group-1',
  type: 'group',
  position: { x: 0, y: 0 },
  data: { _group: true },
};

describe('toValidationGraph', () => {
  it('converts pipeline nodes to graph nodes', () => {
    const result = toValidationGraph([mockPipelineNode], [], [mockBlock]);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: 'node-1',
      blockId: 'test-block',
      blockVersion: 1,
      config: {},
    });
  });

  it('filters out group nodes', () => {
    const result = toValidationGraph(
      [mockPipelineNode, mockGroupNode],
      [],
      [mockBlock]
    );
    expect(result.nodes).toHaveLength(1);
  });

  it('converts edges to graph edges', () => {
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        sourceHandle: 'output-1',
        target: 'node-2',
        targetHandle: 'input-1',
        type: 'pipeline',
      },
    ];
    const result = toValidationGraph([mockPipelineNode], edges, [mockBlock]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({
      id: 'edge-1',
      sourceNodeId: 'node-1',
      sourcePortId: 'output-1',
      targetNodeId: 'node-2',
      targetPortId: 'input-1',
    });
  });

  it('handles missing handles with empty string', () => {
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'pipeline',
      },
    ];
    const result = toValidationGraph([mockPipelineNode], edges, [mockBlock]);
    expect(result.edges[0].sourcePortId).toBe('');
    expect(result.edges[0].targetPortId).toBe('');
  });
});
