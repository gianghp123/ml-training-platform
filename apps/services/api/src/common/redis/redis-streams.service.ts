import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type RunEvent,
  RunEventSchema,
  type WorkflowExecutionJob,
  WorkflowExecutionJobSchema,
} from '@training-ml/contracts';
import Redis from 'ioredis';
import { REDIS_STREAM_CLIENT } from './redis.constants';

type RedisStreamResponse = Array<
  [stream: string, entries: Array<[id: string, fields: string[]]>]
>;
type RedisStreamEntries = Array<[id: string, fields: string[]]>;

export type RunStreamItem =
  | { kind: 'event'; id: string; event: RunEvent }
  | { kind: 'keepalive' };

@Injectable()
export class RedisStreamsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStreamsService.name);
  private readonly jobStream: string;
  private readonly consumerGroup: string;
  private readonly eventStreamPrefix: string;
  private readonly eventMaxLength: number;
  private readonly eventTtlSeconds: number;

  constructor(
    @Inject(REDIS_STREAM_CLIENT)
    private readonly client: Redis,
    configService: ConfigService,
  ) {
    this.jobStream =
      configService.get<string>('WORKFLOW_JOB_STREAM') ??
      'ml:workflow:jobs';
    this.consumerGroup =
      configService.get<string>('WORKFLOW_CONSUMER_GROUP') ??
      'python-workers';
    this.eventStreamPrefix =
      configService.get<string>('WORKFLOW_EVENT_STREAM_PREFIX') ??
      'ml:workflow:runs';
    this.eventMaxLength = this.positiveInteger(
      configService.get<string>('EVENT_STREAM_MAXLEN'),
      10_000,
      100,
    );
    this.eventTtlSeconds = this.positiveInteger(
      configService.get<string>('EVENT_STREAM_TTL_SECONDS'),
      86_400,
      60,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.xgroup(
        'CREATE',
        this.jobStream,
        this.consumerGroup,
        '0',
        'MKSTREAM',
      );
    } catch (error) {
      if (!this.isBusyGroupError(error)) {
        throw error;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  async enqueueWorkflow(
    job: WorkflowExecutionJob,
    queuedEvent: RunEvent,
  ): Promise<string> {
    const jobPayload = WorkflowExecutionJobSchema.parse(job);
    const eventPayload = RunEventSchema.parse(queuedEvent);
    if (eventPayload.runId !== jobPayload.runId) {
      throw new Error('Queued event and workflow job must use the same run ID.');
    }

    const transaction = this.client.multi();
    transaction.xadd(
      this.runEventStream(eventPayload.runId),
      'MAXLEN',
      '~',
      this.eventMaxLength,
      '*',
      'payload',
      JSON.stringify(eventPayload),
    );
    transaction.expire(
      this.runEventStream(eventPayload.runId),
      this.eventTtlSeconds,
    );
    transaction.xadd(
      this.jobStream,
      '*',
      'payload',
      JSON.stringify(jobPayload),
    );

    const results = await transaction.exec();
    if (!results) {
      throw new Error('Redis transaction did not return a result.');
    }
    for (const [error] of results) {
      if (error) throw error;
    }

    const jobId = results[2]?.[1];
    if (typeof jobId !== 'string') {
      throw new Error('Redis did not return a workflow job ID.');
    }
    return jobId;
  }

  async publishRunEvent(event: RunEvent): Promise<string> {
    const payload = RunEventSchema.parse(event);
    const stream = this.runEventStream(event.runId);
    const id = await this.client.xadd(
      stream,
      'MAXLEN',
      '~',
      this.eventMaxLength,
      '*',
      'payload',
      JSON.stringify(payload),
    );
    await this.client.expire(stream, this.eventTtlSeconds);
    return id;
  }

  async *readRunEvents(
    runId: string,
    afterId: string,
    signal: AbortSignal,
  ): AsyncGenerator<RunStreamItem> {
    const reader = this.client.duplicate();
    const stream = this.runEventStream(runId);
    let cursor = afterId;

    try {
      while (!signal.aborted) {
        const response = (await reader.xread(
          'COUNT',
          100,
          'BLOCK',
          15_000,
          'STREAMS',
          stream,
          cursor,
        )) as RedisStreamResponse | null;

        if (!response) {
          yield { kind: 'keepalive' };
          continue;
        }

        for (const [, entries] of response) {
          for (const [id, fields] of entries) {
            cursor = id;
            const event = this.parseEvent(id, fields);
            if (event) yield { kind: 'event', id, event };
          }
        }
      }
    } finally {
      reader.disconnect();
    }
  }

  async readAvailableRunEvents(
    runId: string,
    afterId: string,
  ): Promise<Array<{ id: string; event: RunEvent }>> {
    const start = afterId === '0-0' ? '-' : `(${afterId}`;
    const entries = (await this.client.xrange(
      this.runEventStream(runId),
      start,
      '+',
      'COUNT',
      this.eventMaxLength,
    )) as RedisStreamEntries;

    return entries.flatMap(([id, fields]) => {
      const event = this.parseEvent(id, fields);
      return event ? [{ id, event }] : [];
    });
  }

  private runEventStream(runId: string): string {
    return `${this.eventStreamPrefix}:${runId}:events`;
  }

  private findField(fields: string[], name: string): string | undefined {
    for (let index = 0; index < fields.length; index += 2) {
      if (fields[index] === name) {
        return fields[index + 1];
      }
    }
    return undefined;
  }

  private parseEvent(id: string, fields: string[]): RunEvent | undefined {
    const rawPayload = this.findField(fields, 'payload');
    if (!rawPayload) {
      this.logger.warn(`Ignoring run event ${id} without a payload field`);
      return undefined;
    }

    try {
      const parsed = RunEventSchema.safeParse(
        JSON.parse(rawPayload) as unknown,
      );
      if (!parsed.success) {
        this.logger.warn(
          `Ignoring invalid run event ${id}: ${parsed.error.message}`,
        );
        return undefined;
      }
      return parsed.data;
    } catch (error) {
      this.logger.warn(
        `Ignoring malformed run event ${id}: ${this.errorMessage(error)}`,
      );
      return undefined;
    }
  }

  private positiveInteger(
    value: string | undefined,
    fallback: number,
    minimum = 1,
  ) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
  }

  private isBusyGroupError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.toUpperCase().includes('BUSYGROUP')
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
