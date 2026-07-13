import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ModelRegistry } from "src/database/entities/model-registry.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateModelRegistryDto, UpdateModelRegistryDto } from "../dtos/model-registry.dto";

@Injectable()
export class ModelRegistryService {
  constructor(
    @InjectRepository(ModelRegistry)
    private modelRegistryRepository: Repository<ModelRegistry>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<ModelRegistry>(this.modelRegistryRepository, options);
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

  async findOne(id: string): Promise<ModelRegistry> {
    const modelRegistry = await this.modelRegistryRepository.findOne({
      where: { id },
    });
    if (!modelRegistry) {
      throw new NotFoundException(`ModelRegistry #${id} not found`);
    }
    return modelRegistry;
  }

  async create(dto: CreateModelRegistryDto): Promise<ModelRegistry> {
    const modelRegistry = this.modelRegistryRepository.create(dto);
    return this.modelRegistryRepository.save(modelRegistry);
  }

  async update(id: string, dto: UpdateModelRegistryDto): Promise<ModelRegistry> {
    const modelRegistry = await this.findOne(id);
    Object.assign(modelRegistry, dto);
    return this.modelRegistryRepository.save(modelRegistry);
  }

  async remove(id: string): Promise<void> {
    const modelRegistry = await this.findOne(id);
    await this.modelRegistryRepository.remove(modelRegistry);
  }
}
