import { PipelineGraphSchema } from '@training-ml/contracts';

const BLOCK_ID = 'f0b692a6-73df-4e01-a535-75e262898e83';

describe('PipelineGraphSchema', () => {
  it('accepts a structurally valid graph', () => {
    const result = PipelineGraphSchema.safeParse({
      nodes: [
        {
          id: 'load',
          blockId: BLOCK_ID,
          blockVersion: 1,
          config: { dataset: '08640a0c-b5c7-449d-9c69-61a8ceee8b3a' },
        },
      ],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate node IDs', () => {
    const result = PipelineGraphSchema.safeParse({
      nodes: [
        {
          id: 'duplicate',
          blockId: BLOCK_ID,
          blockVersion: 1,
          config: {},
        },
        {
          id: 'duplicate',
          blockId: BLOCK_ID,
          blockVersion: 1,
          config: {},
        },
      ],
      edges: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) =>
      issue.message.includes('Duplicate node id'),
    )).toBe(true);
  });

  it('rejects cycles before pipeline-engine topological sorting', () => {
    const result = PipelineGraphSchema.safeParse({
      nodes: [
        {
          id: 'a',
          blockId: BLOCK_ID,
          blockVersion: 1,
          config: {},
        },
        {
          id: 'b',
          blockId: BLOCK_ID,
          blockVersion: 1,
          config: {},
        },
      ],
      edges: [
        {
          id: 'a-to-b',
          sourceNodeId: 'a',
          sourcePortId: 'dataset',
          targetNodeId: 'b',
          targetPortId: 'dataset',
        },
        {
          id: 'b-to-a',
          sourceNodeId: 'b',
          sourcePortId: 'dataset',
          targetNodeId: 'a',
          targetPortId: 'dataset',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) =>
      issue.message.includes('contains a cycle'),
    )).toBe(true);
  });
});
