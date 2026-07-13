import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, IPaginationOptions } from 'nestjs-typeorm-paginate';
import { WorkflowRun } from 'src/database/entities/workflow-run.entity';
import { CreateWorkflowRunDto, UpdateWorkflowRunDto } from '../dtos/workflow-run.dto';

@Injectable()
export class WorkflowRunService {
  constructor(
    @InjectRepository(WorkflowRun)
    private workflowRunRepository: Repository<WorkflowRun>,
  ) {}

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<WorkflowRun>(this.workflowRunRepository, options);
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

  async findOne(id: string): Promise<WorkflowRun> {
    const workflowRun = await this.workflowRunRepository.findOne({ where: { id } });
    if (!workflowRun) {
      throw new NotFoundException(`WorkflowRun #${id} not found`);
    }
    return workflowRun;
  }

  async create(dto: CreateWorkflowRunDto): Promise<WorkflowRun> {
    const workflowRun = this.workflowRunRepository.create(dto);
    return this.workflowRunRepository.save(workflowRun);
  }

  async update(id: string, dto: UpdateWorkflowRunDto): Promise<WorkflowRun> {
    const workflowRun = await this.findOne(id);
    Object.assign(workflowRun, dto);
    return this.workflowRunRepository.save(workflowRun);
  }

  async remove(id: string): Promise<void> {
    const workflowRun = await this.findOne(id);
    await this.workflowRunRepository.remove(workflowRun);
  }
}
