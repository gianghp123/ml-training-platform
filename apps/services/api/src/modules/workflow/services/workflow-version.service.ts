import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Workflow } from "src/database/entities/workflow.entity";
import { WorkflowVersion } from "src/database/entities/workflow-version.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateWorkflowVersionDto, UpdateWorkflowVersionDto } from "../dtos/workflow-version.dto";

@Injectable()
export class WorkflowVersionService {
  constructor(
    @InjectRepository(WorkflowVersion)
    private workflowVersionRepository: Repository<WorkflowVersion>,
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<WorkflowVersion>(this.workflowVersionRepository, options);
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

  async findOne(id: string): Promise<WorkflowVersion> {
    const workflowVersion = await this.workflowVersionRepository.findOne({
      where: { id },
    });
    if (!workflowVersion) {
      throw new NotFoundException(`WorkflowVersion #${id} not found`);
    }
    return workflowVersion;
  }

  async create(dto: CreateWorkflowVersionDto): Promise<WorkflowVersion> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: dto.workflowId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow #${dto.workflowId} not found`);
    }

    const maxVersion = await this.workflowVersionRepository.maximum('version', {
      workflowId: dto.workflowId,
    });
    const nextVersion = (maxVersion ?? 0) + 1;

    const workflowVersion = this.workflowVersionRepository.create({
      ...dto,
      version: nextVersion,
    });
    return this.workflowVersionRepository.save(workflowVersion);
  }

  async update(id: string, dto: UpdateWorkflowVersionDto): Promise<WorkflowVersion> {
    const workflowVersion = await this.findOne(id);
    Object.assign(workflowVersion, dto);
    return this.workflowVersionRepository.save(workflowVersion);
  }

  async remove(id: string): Promise<void> {
    const workflowVersion = await this.findOne(id);
    await this.workflowVersionRepository.remove(workflowVersion);
  }
}
