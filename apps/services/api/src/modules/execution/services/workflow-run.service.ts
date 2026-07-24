import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BlockStatus,
  type BlockDefinition as ContractBlockDefinition,
  type Column,
  DatasetFormat,
  DatasetStatus,
  type ExecuteWorkflowRun,
  NodeExecutionStatus,
  type PipelineGraphNode,
  type PipelineGraph,
  RunEventType,
  type ValidationError,
  type ValidationResult,
  type WorkflowExecutionJob,
  type WorkflowRunAccepted,
  type WorkflowRunDetail,
  WorkflowRunStatus,
} from '@training-ml/contracts';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { RedisStreamsService } from 'src/common/redis/redis-streams.service';
import { Artifact } from 'src/database/entities/artifact.entity';
import { BlockDefinition } from 'src/database/entities/block-definition.entity';
import { Dataset } from 'src/database/entities/dataset.entity';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { WorkflowRun } from 'src/database/entities/workflow-run.entity';
import { WorkflowVersion } from 'src/database/entities/workflow-version.entity';
import { DataSource, In, Repository } from 'typeorm';

const SOURCE_FORMATS: Partial<Record<string, DatasetFormat>> = {
  load_csv: DatasetFormat.CSV,
  load_json: DatasetFormat.JSON,
  load_xml: DatasetFormat.XML,
};

const { validateGraph } = require('@training-ml/pipeline-engine') as {
  validateGraph: (
    graph: PipelineGraph,
    definitions: ContractBlockDefinition[],
    resolveColumns?: (datasetId: string) => Column[] | null,
  ) => ValidationResult & {
    inputContracts: ValidationResult['contracts'];
  };
};

@Injectable()
export class WorkflowRunService {
  private readonly logger = new Logger(WorkflowRunService.name);

  constructor(
    @InjectRepository(WorkflowRun)
    private readonly workflowRunRepository: Repository<WorkflowRun>,
    @InjectRepository(NodeExecution)
    private readonly nodeExecutionRepository: Repository<NodeExecution>,
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(BlockDefinition)
    private readonly blockDefinitionRepository: Repository<BlockDefinition>,
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>,
    @InjectRepository(WorkflowVersion)
    private readonly workflowVersionRepository: Repository<WorkflowVersion>,
    private readonly dataSource: DataSource,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  async findAll(options: IPaginationOptions, userId: string) {
    const query = this.workflowRunRepository
      .createQueryBuilder('run')
      .where('run.user_id = :userId', { userId })
      .orderBy('run.id', 'DESC');
    const { items, meta } = await paginate<WorkflowRun>(query, options);
    return {
      data: items,
      meta: {
        page: meta.currentPage,
        limit: meta.itemsPerPage,
        total: meta.totalItems,
        totalPages: meta.totalPages,
      },
    };
  }

  async findOne(id: string, userId: string): Promise<WorkflowRunDetail> {
    const run = await this.workflowRunRepository.findOne({
      where: { id, userId },
      relations: {
        datasets: true,
        nodeExecutions: true,
        artifacts: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`WorkflowRun #${id} not found`);
    }

    const nodeOrder = new Map(
      run.graphSnapshot.nodes.map((node, index) => [node.id, index]),
    );
    run.nodeExecutions.sort(
      (left, right) =>
        (nodeOrder.get(left.nodeId) ?? Number.MAX_SAFE_INTEGER) -
        (nodeOrder.get(right.nodeId) ?? Number.MAX_SAFE_INTEGER),
    );

    return {
      id: run.id,
      workflowVersionId: run.workflowVersionId,
      datasetId: run.datasetId,
      graphSnapshot: run.graphSnapshot,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      userId: run.userId,
      datasetIds: run.datasets.map((dataset) => dataset.id),
      nodeExecutions: run.nodeExecutions,
      artifacts: run.artifacts,
    };
  }

  async execute(
    request: ExecuteWorkflowRun,
    userId: string,
  ): Promise<WorkflowRunAccepted> {
    if (request.workflowVersionId) {
      await this.assertWorkflowVersionOwnership(
        request.workflowVersionId,
        userId,
      );
    }

    const definitions = await this.loadDefinitions(request.graph.nodes);
    const definitionByNode = this.definitionByNode(
      request.graph.nodes,
      definitions,
    );
    const errors = this.validateDefinitionsAndPorts(
      request.graph.nodes,
      request.graph.edges,
      definitionByNode,
    );

    if (errors.length > 0) {
      this.throwValidation(errors);
    }

    const datasets = await this.loadAndValidateDatasets(
      request.graph.nodes,
      definitionByNode,
      userId,
    );

    const datasetById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
    const engineResult = validateGraph(
      request.graph,
      definitions,
      (datasetId) => this.resolveDatasetColumns(datasetById.get(datasetId)),
    );
    const blockingErrors = engineResult.errors.filter(
      (error) => (error.severity ?? 'error') === 'error',
    );

    if (blockingErrors.length > 0) {
      this.throwValidation(engineResult.errors);
    }

    const run = await this.dataSource.transaction(async (manager) => {
      const createdRun = manager.create(WorkflowRun, {
        workflowVersionId: request.workflowVersionId ?? null,
        datasetId: datasets[0]?.id ?? null,
        graphSnapshot: request.graph,
        status: WorkflowRunStatus.PENDING,
        startedAt: null,
        finishedAt: null,
        userId,
      });
      const savedRun = await manager.save(WorkflowRun, createdRun);

      if (datasets.length > 0) {
        await manager
          .createQueryBuilder()
          .relation(WorkflowRun, 'datasets')
          .of(savedRun.id)
          .add(datasets.map((dataset) => dataset.id));
      }

      const nodeExecutions = request.graph.nodes.map((node) =>
        manager.create(NodeExecution, {
          workflowRunId: savedRun.id,
          nodeId: node.id,
          nodeType: definitionByNode.get(node.id)!.executorKey,
          status: NodeExecutionStatus.PENDING,
          workerId: null,
          retryCount: 0,
          startedAt: null,
          finishedAt: null,
          errorMessage: null,
          outputSummary: null,
        }),
      );
      await manager.save(NodeExecution, nodeExecutions);
      return savedRun;
    });

    const job = this.buildJob(
      run.id,
      userId,
      request,
      definitions,
      datasets,
    );

    try {
      await this.redisStreams.enqueueWorkflow(job, {
        type: RunEventType.RUN_QUEUED,
        runId: run.id,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Workflow execution queued.',
        payload: {
          nodeCount: request.graph.nodes.length,
          datasetCount: datasets.length,
        },
      });
    } catch (error) {
      await this.markEnqueueFailure(run.id);
      const message = this.errorMessage(error);
      this.logger.error(`Failed to enqueue workflow run ${run.id}: ${message}`);
      try {
        await this.redisStreams.publishRunEvent({
          type: RunEventType.RUN_FAILED,
          runId: run.id,
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Workflow could not be queued.',
          payload: { error: message },
        });
      } catch (eventError) {
        this.logger.error(
          `Failed to publish enqueue error for run ${run.id}: ${this.errorMessage(eventError)}`,
        );
      }
      throw new ServiceUnavailableException({
        message: 'Workflow execution queue is unavailable.',
        runId: run.id,
      });
    }

    return {
      runId: run.id,
      status: WorkflowRunStatus.PENDING,
      eventsUrl: `/v1/workflow-runs/${run.id}/events`,
    };
  }

  private async assertWorkflowVersionOwnership(
    workflowVersionId: string,
    userId: string,
  ): Promise<void> {
    const version = await this.workflowVersionRepository.findOne({
      where: { id: workflowVersionId },
      relations: { workflow: true },
    });
    if (!version || version.workflow.userId !== userId) {
      throw new NotFoundException(
        `WorkflowVersion #${workflowVersionId} not found`,
      );
    }
  }

  private async loadDefinitions(
    nodes: PipelineGraphNode[],
  ): Promise<BlockDefinition[]> {
    const requested = [
      ...new Map(
        nodes.map((node) => [
          `${node.blockId}@${node.blockVersion}`,
          { id: node.blockId, version: node.blockVersion },
        ]),
      ).values(),
    ];
    return this.blockDefinitionRepository.find({
      where: requested,
    });
  }

  private definitionByNode(
    nodes: PipelineGraphNode[],
    definitions: BlockDefinition[],
  ): Map<string, BlockDefinition> {
    const byKey = new Map(
      definitions.map((definition) => [
        `${definition.id}@${definition.version}`,
        definition,
      ]),
    );
    return new Map(
      nodes.flatMap((node) => {
        const definition = byKey.get(
          `${node.blockId}@${node.blockVersion}`,
        );
        return definition ? [[node.id, definition] as const] : [];
      }),
    );
  }

  private validateDefinitionsAndPorts(
    nodes: PipelineGraphNode[],
    edges: ExecuteWorkflowRun['graph']['edges'],
    definitionByNode: Map<string, BlockDefinition>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of nodes) {
      const definition = definitionByNode.get(node.id);
      if (!definition) {
        errors.push({
          nodeId: node.id,
          scope: 'contract',
          code: 'BLOCK_DEFINITION_NOT_FOUND',
          severity: 'error',
          message: `Block definition ${node.blockId}@${node.blockVersion} was not found.`,
        });
      } else if (definition.status !== BlockStatus.ACTIVE) {
        errors.push({
          nodeId: node.id,
          scope: 'contract',
          code: 'BLOCK_DEFINITION_INACTIVE',
          severity: 'error',
          message: `Block definition ${node.blockId}@${node.blockVersion} is not active.`,
        });
      }
    }

    for (const edge of edges) {
      const source = definitionByNode.get(edge.sourceNodeId);
      const target = definitionByNode.get(edge.targetNodeId);

      if (
        source &&
        !source.ports.outputs.some((port) => port.id === edge.sourcePortId)
      ) {
        errors.push({
          nodeId: edge.sourceNodeId,
          scope: 'port',
          fieldId: edge.sourcePortId,
          code: 'SOURCE_PORT_NOT_FOUND',
          severity: 'error',
          message: `Output port "${edge.sourcePortId}" does not exist.`,
          context: { edgeId: edge.id },
        });
      }

      if (
        target &&
        !target.ports.inputs.some((port) => port.id === edge.targetPortId)
      ) {
        errors.push({
          nodeId: edge.targetNodeId,
          scope: 'port',
          fieldId: edge.targetPortId,
          code: 'TARGET_PORT_NOT_FOUND',
          severity: 'error',
          message: `Input port "${edge.targetPortId}" does not exist.`,
          context: { edgeId: edge.id },
        });
      }
    }

    return errors;
  }

  private async loadAndValidateDatasets(
    nodes: PipelineGraphNode[],
    definitionByNode: Map<string, BlockDefinition>,
    userId: string,
  ): Promise<Dataset[]> {
    const references: Array<{
      node: PipelineGraphNode;
      datasetId: string;
      expectedFormat: DatasetFormat;
    }> = [];
    const errors: ValidationError[] = [];

    for (const node of nodes) {
      const definition = definitionByNode.get(node.id);
      const expectedFormat = definition
        ? SOURCE_FORMATS[definition.executorKey]
        : undefined;
      if (!expectedFormat) {
        continue;
      }

      const datasetId = node.config.dataset;
      if (
        typeof datasetId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          datasetId,
        )
      ) {
        errors.push({
          nodeId: node.id,
          scope: 'config',
          fieldId: 'dataset',
          code: 'DATASET_ID_INVALID',
          severity: 'error',
          message: 'A valid dataset ID is required.',
        });
        continue;
      }
      references.push({ node, datasetId, expectedFormat });
    }

    const datasetIds = [...new Set(references.map((item) => item.datasetId))];
    const datasets =
      datasetIds.length === 0
        ? []
        : await this.datasetRepository.find({
            where: { id: In(datasetIds) },
          });
    const datasetById = new Map(
      datasets.map((dataset) => [dataset.id, dataset]),
    );

    for (const reference of references) {
      const dataset = datasetById.get(reference.datasetId);
      if (!dataset || dataset.userId !== userId) {
        errors.push({
          nodeId: reference.node.id,
          scope: 'config',
          fieldId: 'dataset',
          code: 'DATASET_NOT_ACCESSIBLE',
          severity: 'error',
          message: 'The selected dataset was not found.',
        });
        continue;
      }
      if (dataset.status !== DatasetStatus.READY) {
        errors.push({
          nodeId: reference.node.id,
          scope: 'config',
          fieldId: 'dataset',
          code: 'DATASET_NOT_READY',
          severity: 'error',
          message: `Dataset "${dataset.name}" is not ready.`,
          context: { status: dataset.status },
        });
      }
      if (dataset.format !== reference.expectedFormat) {
        errors.push({
          nodeId: reference.node.id,
          scope: 'config',
          fieldId: 'dataset',
          code: 'DATASET_FORMAT_MISMATCH',
          severity: 'error',
          message: `Expected a ${reference.expectedFormat} dataset.`,
          context: {
            expected: reference.expectedFormat,
            actual: dataset.format,
          },
        });
      }
    }

    if (errors.length > 0) {
      this.throwValidation(errors);
    }

    return datasetIds.map((id) => datasetById.get(id)!);
  }

  private resolveDatasetColumns(dataset: Dataset | undefined): Column[] | null {
    if (!dataset?.profile) {
      return null;
    }
    if (dataset.profile.format === DatasetFormat.CSV) {
      return dataset.profile.columns;
    }
    return Array.isArray(dataset.profile.schema)
      ? dataset.profile.schema
      : null;
  }

  private buildJob(
    runId: string,
    userId: string,
    request: ExecuteWorkflowRun,
    definitions: BlockDefinition[],
    datasets: Dataset[],
  ): WorkflowExecutionJob {
    return {
      schemaVersion: 1,
      runId,
      userId,
      graph: request.graph,
      blocks: Object.fromEntries(
        definitions.map((definition) => [
          `${definition.id}@${definition.version}`,
          {
            id: definition.id,
            version: definition.version,
            executorKey: definition.executorKey,
            name: definition.name,
            ports: definition.ports,
            configSchema: definition.configSchema,
            constraints: definition.constraints,
            outputTransform: definition.outputTransform,
          },
        ]),
      ),
      datasets: Object.fromEntries(
        datasets.map((dataset) => [
          dataset.id,
          {
            id: dataset.id,
            objectKey: dataset.storageUri,
            name: dataset.name,
            format: dataset.format,
            profile: dataset.profile,
            validationOptions: dataset.validationOptions,
          },
        ]),
      ),
    };
  }

  private async markEnqueueFailure(runId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        WorkflowRun,
        { id: runId },
        {
          status: WorkflowRunStatus.FAILED,
          finishedAt: new Date(),
        },
      );
      await manager.update(
        NodeExecution,
        {
          workflowRunId: runId,
          status: NodeExecutionStatus.PENDING,
        },
        {
          status: NodeExecutionStatus.SKIPPED,
          finishedAt: new Date(),
          errorMessage: 'Workflow execution could not be queued.',
        },
      );
    });
  }

  private throwValidation(errors: ValidationError[]): never {
    throw new UnprocessableEntityException({
      message: 'Pipeline graph validation failed.',
      errors,
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
