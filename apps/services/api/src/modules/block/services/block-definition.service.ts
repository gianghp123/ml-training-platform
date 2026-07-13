import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BlockDefinition } from "src/database/entities/block-definition.entity";
import { Repository } from "typeorm";
import { CreateBlockDefinitionDto, UpdateBlockDefinitionDto } from "../dtos/block-definition.dto";

@Injectable()
export class BlockDefinitionService {
  constructor(
    @InjectRepository(BlockDefinition)
    private blockDefinitionRepository: Repository<BlockDefinition>,
  ) { }

  async findAll(): Promise<BlockDefinition[]> {
    return this.blockDefinitionRepository.find({ relations: ['category'] });
  }

  async findOne(id: string): Promise<BlockDefinition> {
    const definition = await this.blockDefinitionRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!definition) {
      throw new NotFoundException(`BlockDefinition #${id} not found`);
    }
    return definition;
  }

  async create(dto: CreateBlockDefinitionDto): Promise<BlockDefinition> {
    const definition = this.blockDefinitionRepository.create(dto);
    return this.blockDefinitionRepository.save(definition);
  }

  async update(id: string, dto: UpdateBlockDefinitionDto): Promise<BlockDefinition> {
    const definition = await this.findOne(id);
    Object.assign(definition, dto);
    return this.blockDefinitionRepository.save(definition);
  }

  async remove(id: string): Promise<void> {
    const definition = await this.findOne(id);
    await this.blockDefinitionRepository.remove(definition);
  }
}
