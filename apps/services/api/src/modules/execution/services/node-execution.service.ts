import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { CreateNodeExecutionDto, UpdateNodeExecutionDto } from '../dtos/node-execution.dto';

@Injectable()
export class NodeExecutionService {
  constructor(
    @InjectRepository(NodeExecution)
    private nodeExecutionRepository: Repository<NodeExecution>,
  ) {}

  async findAll(): Promise<NodeExecution[]> {
    return this.nodeExecutionRepository.find();
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
