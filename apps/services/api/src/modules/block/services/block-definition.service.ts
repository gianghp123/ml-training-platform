import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BlockDefinition } from "src/database/entities/block-definition.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateBlockDefinitionDto, UpdateBlockDefinitionDto } from "../dtos/block-definition.dto";

@Injectable()
export class BlockDefinitionService {
  constructor(
    @InjectRepository(BlockDefinition)
    private blockDefinitionRepository: Repository<BlockDefinition>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<BlockDefinition>(this.blockDefinitionRepository, options);
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

  async findOne(id: string): Promise<BlockDefinition> {
    const definition = await this.blockDefinitionRepository.findOneBy({ id });
    if (!definition) {
      throw new NotFoundException(`BlockDefinition ${id} not found`);
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
