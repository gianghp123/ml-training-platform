import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ExecuteWorkflowRunSchema,
  type RunEvent,
  RunEventType,
  WorkflowRunStatus,
} from '@training-ml/contracts';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { RedisStreamsService } from 'src/common/redis/redis-streams.service';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { RequestUser } from 'src/modules/auth/interfaces/current-user.interface';
import {
  ExecuteWorkflowRunDto,
  PaginatedWorkflowRunResponseDto,
  WorkflowRunAcceptedDto,
  WorkflowRunDetailDto,
  WorkflowRunValidationErrorResponseDto,
} from '../dtos/workflow-run.dto';
import { WorkflowRunService } from '../services/workflow-run.service';

@ApiBearerAuth()
@Controller('workflow-runs')
export class WorkflowRunController {
  private readonly logger = new Logger(WorkflowRunController.name);

  constructor(
    private readonly workflowRunService: WorkflowRunService,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  @Post('execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBody({ type: ExecuteWorkflowRunDto })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: WorkflowRunValidationErrorResponseDto,
  })
  @ZodResponse({ status: HttpStatus.ACCEPTED, type: WorkflowRunAcceptedDto })
  async execute(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const result = ExecuteWorkflowRunSchema.safeParse(body);
    if (!result.success) {
      const graph = this.graphValue(body);
      throw new UnprocessableEntityException({
        message: 'Pipeline graph validation failed.',
        errors: result.error.issues.map((issue) => {
          const nodeIndex =
            issue.path[0] === 'graph' &&
            issue.path[1] === 'nodes' &&
            typeof issue.path[2] === 'number'
              ? issue.path[2]
              : undefined;
          return {
            nodeId:
              nodeIndex === undefined
                ? '$graph'
                : (graph?.nodes?.[nodeIndex]?.id ?? '$graph'),
            scope: 'contract' as const,
            fieldId: issue.path.map(String).join('.'),
            code: 'GRAPH_SCHEMA_INVALID',
            severity: 'error' as const,
            message: issue.message,
          };
        }),
      });
    }

    return this.workflowRunService.execute(result.data, user.userId);
  }

  @Get()
  @ZodResponse({
    status: HttpStatus.OK,
    type: PaginatedWorkflowRunResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: RequestUser,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.workflowRunService.findAll({ page, limit }, user.userId);
  }

  @Get(':id/events')
  async events(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('after') after: string | undefined,
    @Headers('last-event-id') lastEventId: string | undefined,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const detail = await this.workflowRunService.findOne(id, user.userId);
    const cursor = this.redisCursor(after ?? lastEventId);

    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    this.writeEvent(response, undefined, {
      type: RunEventType.RUN_SNAPSHOT,
      runId: detail.id,
      timestamp: new Date().toISOString(),
      payload: {
        status: detail.status,
        startedAt: detail.startedAt?.toISOString() ?? null,
        finishedAt: detail.finishedAt?.toISOString() ?? null,
        nodeExecutions: detail.nodeExecutions.map((node) => ({
          id: node.id,
          nodeId: node.nodeId,
          status: node.status,
          startedAt: node.startedAt?.toISOString() ?? null,
          finishedAt: node.finishedAt?.toISOString() ?? null,
          errorMessage: node.errorMessage,
          outputSummary: node.outputSummary,
        })),
        artifacts: detail.artifacts.map((artifact) => ({
          id: artifact.id,
          nodeExecutionId: artifact.nodeExecutionId,
          name: artifact.name,
          artifactType: artifact.artifactType,
          mimeType: artifact.mimeType,
          storageUri: artifact.storageUri,
          metadata: artifact.metadata,
        })),
      },
    });

    if (
      detail.status === WorkflowRunStatus.COMPLETED ||
      detail.status === WorkflowRunStatus.FAILED ||
      detail.status === WorkflowRunStatus.CANCELLED
    ) {
      const availableEvents =
        await this.redisStreams.readAvailableRunEvents(id, cursor);
      for (const item of availableEvents) {
        this.writeEvent(response, item.id, item.event);
      }
      response.end();
      return;
    }

    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    try {
      for await (const item of this.redisStreams.readRunEvents(
        id,
        cursor,
        abortController.signal,
      )) {
        if (response.writableEnded || abortController.signal.aborted) {
          break;
        }
        if (item.kind === 'keepalive') {
          response.write(': keepalive\n\n');
          continue;
        }

        this.writeEvent(response, item.id, item.event);
        if (
          item.event.type === RunEventType.RUN_COMPLETED ||
          item.event.type === RunEventType.RUN_FAILED
        ) {
          break;
        }
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        this.logger.error(
          `SSE stream failed for run ${id}: ${this.errorMessage(error)}`,
        );
      }
    } finally {
      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowRunDetailDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowRunService.findOne(id, user.userId);
  }

  private writeEvent(
    response: Response,
    id: string | undefined,
    event: RunEvent,
  ): void {
    if (id) {
      response.write(`id: ${id}\n`);
    }
    response.write(`event: ${event.type}\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  private redisCursor(value: string | undefined): string {
    return value && /^\d+-\d+$/.test(value) ? value : '0-0';
  }

  private graphValue(
    body: unknown,
  ): { nodes?: Array<{ id?: string }> } | undefined {
    if (!body || typeof body !== 'object' || !('graph' in body)) {
      return undefined;
    }
    const graph = (body as { graph?: unknown }).graph;
    return graph && typeof graph === 'object'
      ? (graph as { nodes?: Array<{ id?: string }> })
      : undefined;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
