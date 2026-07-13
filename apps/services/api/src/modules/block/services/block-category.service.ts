import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BlockCategory } from "src/database/entities/block-category.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateBlockCategoryDto, UpdateBlockCategoryDto } from "../dtos/block-category.dto";

@Injectable()
export class BlockCategoryService {
  constructor(
    @InjectRepository(BlockCategory)
    private blockCategoryRepository: Repository<BlockCategory>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<BlockCategory>(this.blockCategoryRepository, options);
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

  async findOne(id: string): Promise<BlockCategory> {
    const category = await this.blockCategoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`BlockCategory #${id} not found`);
    }
    return category;
  }

  async create(dto: CreateBlockCategoryDto): Promise<BlockCategory> {
    const category = this.blockCategoryRepository.create(dto);
    return this.blockCategoryRepository.save(category);
  }

  async update(id: string, dto: UpdateBlockCategoryDto): Promise<BlockCategory> {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    return this.blockCategoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.blockCategoryRepository.remove(category);
  }
}
