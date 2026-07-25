import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NodeExecutionService {
  constructor(
    @InjectRepository(NodeExecution)
    private readonly nodeExecutionRepository: Repository<NodeExecution>,
  ) {}

  async findAll(options: IPaginationOptions) {
    const query = this.nodeExecutionRepository
      .createQueryBuilder('execution')
      .innerJoin('execution.workflowRun', 'run')
      .orderBy('execution.started_at', 'DESC', 'NULLS LAST');
    const { items, meta } = await paginate<NodeExecution>(query, options);
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

  async findOne(id: string): Promise<NodeExecution> {
    const nodeExecution = await this.nodeExecutionRepository
      .createQueryBuilder('execution')
      .innerJoin('execution.workflowRun', 'run')
      .where('execution.id = :id', { id })
      .getOne();
    if (!nodeExecution) {
      throw new NotFoundException(`NodeExecution #${id} not found`);
    }
    return nodeExecution;
  }
}
