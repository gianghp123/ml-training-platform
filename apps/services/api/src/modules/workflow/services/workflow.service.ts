import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Workflow } from "src/database/entities/workflow.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateWorkflowDto, UpdateWorkflowDto } from "../dtos/workflow.dto";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const query = this.workflowRepository
      .createQueryBuilder('workflow')
      .orderBy('workflow.updatedAt', 'DESC');
    const { items, meta } = await paginate<Workflow>(query, options);
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

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow #${id} not found`);
    }
    return workflow;
  }

  async create(dto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowRepository.create(dto);
    return this.workflowRepository.save(workflow);
  }

  async update(id: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, dto);
    return this.workflowRepository.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.remove(workflow);
  }
}
