import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BlockCategory } from "src/database/entities/block-category.entity";
import { Repository } from "typeorm";
import { CreateBlockCategoryDto } from "../dtos/requests/create-block-category.dto";
import { UpdateBlockCategoryDto } from "../dtos/requests/update-block-category.dto";

@Injectable()
export class BlockCategoryService {
  constructor(
    @InjectRepository(BlockCategory)
    private blockCategoryRepository: Repository<BlockCategory>,
  ) { }

  async findAll(): Promise<BlockCategory[]> {
    return this.blockCategoryRepository.find();
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
