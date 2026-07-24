import { ConfigService } from '@nestjs/config';
import {
  RunEventType,
  type WorkflowExecutionJob,
} from '@training-ml/contracts';
import type Redis from 'ioredis';
import { RedisStreamsService } from './redis-streams.service';

const runId = '75d9eab3-c44f-4b8b-a585-6c64e8a6f96c';
const blockId = 'f0b692a6-73df-4e01-a535-75e262898e83';

const job: WorkflowExecutionJob = {
  schemaVersion: 1,
  runId,
  userId: 'user_123',
  graph: {
    nodes: [
      {
        id: 'load',
        blockId,
        blockVersion: 1,
        config: {},
      },
    ],
    edges: [],
  },
  blocks: {
    [`${blockId}@1`]: {
      id: blockId,
      version: 1,
      executorKey: 'load_csv',
      name: 'Load CSV',
      ports: {
        inputs: [],
        outputs: [{ id: 'dataset', artifact: 'Dataset' }],
      },
      configSchema: { fields: [] },
      constraints: {},
      outputTransform: { artifact: 'Dataset' },
    },
  },
  datasets: {},
};

describe('RedisStreamsService', () => {
  it('publishes queued before making the job visible', async () => {
    const commands: Array<{ name: string; args: unknown[] }> = [];
    const transaction = {
      xadd: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        [null, 'event-id'],
        [null, 1],
        [null, 'job-id'],
      ]),
    };
    transaction.xadd.mockImplementation((...args: unknown[]) => {
      commands.push({ name: 'xadd', args });
      return transaction;
    });
    transaction.expire.mockImplementation((...args: unknown[]) => {
      commands.push({ name: 'expire', args });
      return transaction;
    });

    const client = {
      multi: jest.fn(() => transaction),
    } as unknown as Redis;
    const service = new RedisStreamsService(client, new ConfigService());

    await expect(
      service.enqueueWorkflow(job, {
        type: RunEventType.RUN_QUEUED,
        runId,
        timestamp: '2026-07-24T00:00:00.000Z',
      }),
    ).resolves.toBe('job-id');

    expect(commands.map((command) => command.name)).toEqual([
      'xadd',
      'expire',
      'xadd',
    ]);
    expect(commands[0].args[0]).toBe(
      `ml:workflow:runs:${runId}:events`,
    );
    expect(commands[2].args[0]).toBe('ml:workflow:jobs');
  });

  it('rejects a queued event for a different run', async () => {
    const client = {
      multi: jest.fn(),
    } as unknown as Redis;
    const service = new RedisStreamsService(client, new ConfigService());

    await expect(
      service.enqueueWorkflow(job, {
        type: RunEventType.RUN_QUEUED,
        runId: 'ef533174-8ea1-46fd-adb3-e12bc39546de',
        timestamp: '2026-07-24T00:00:00.000Z',
      }),
    ).rejects.toThrow('same run ID');
    expect(client.multi).not.toHaveBeenCalled();
  });
});
