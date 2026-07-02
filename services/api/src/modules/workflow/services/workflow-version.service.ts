import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkflowVersion } from "src/database/entities/workflow-version.entity";
import { Repository } from "typeorm";
import { CreateWorkflowVersionDto } from "../dtos/requests/create-workflow-version.dto";
import { UpdateWorkflowVersionDto } from "../dtos/requests/update-workflow-version.dto";

@Injectable()
export class WorkflowVersionService {
  constructor(
    @InjectRepository(WorkflowVersion)
    private workflowVersionRepository: Repository<WorkflowVersion>,
  ) { }

  async findAll(): Promise<WorkflowVersion[]> {
    return this.workflowVersionRepository.find();
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
    const workflowVersion = this.workflowVersionRepository.create(dto);
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
