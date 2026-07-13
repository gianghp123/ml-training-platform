import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, IPaginationOptions } from 'nestjs-typeorm-paginate';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { CreateNodeExecutionDto, UpdateNodeExecutionDto } from '../dtos/node-execution.dto';

@Injectable()
export class NodeExecutionService {
  constructor(
    @InjectRepository(NodeExecution)
    private nodeExecutionRepository: Repository<NodeExecution>,
  ) {}

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<NodeExecution>(this.nodeExecutionRepository, options);
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
    const nodeExecution = await this.nodeExecutionRepository.findOne({ where: { id } });
    if (!nodeExecution) {
      throw new NotFoundException(`NodeExecution #${id} not found`);
    }
    return nodeExecution;
  }

  async create(dto: CreateNodeExecutionDto): Promise<NodeExecution> {
    const nodeExecution = this.nodeExecutionRepository.create(dto);
    return this.nodeExecutionRepository.save(nodeExecution);
  }

  async update(id: string, dto: UpdateNodeExecutionDto): Promise<NodeExecution> {
    const nodeExecution = await this.findOne(id);
    Object.assign(nodeExecution, dto);
    return this.nodeExecutionRepository.save(nodeExecution);
  }

  async remove(id: string): Promise<void> {
    const nodeExecution = await this.findOne(id);
    await this.nodeExecutionRepository.remove(nodeExecution);
  }
}
