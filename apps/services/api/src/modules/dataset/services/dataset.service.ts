import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Dataset } from "src/database/entities/dataset.entity";
import { Repository } from "typeorm";
import { paginate, IPaginationOptions } from "nestjs-typeorm-paginate";
import { CreateDatasetDto, UpdateDatasetDto } from "../dtos/dataset.dto";

@Injectable()
export class DatasetService {
  constructor(
    @InjectRepository(Dataset)
    private datasetRepository: Repository<Dataset>,
  ) { }

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<Dataset>(this.datasetRepository, options);
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

  async findOne(id: string): Promise<Dataset> {
    const dataset = await this.datasetRepository.findOne({
      where: { id },
    });
    if (!dataset) {
      throw new NotFoundException(`Dataset #${id} not found`);
    }
    return dataset;
  }

  async create(dto: CreateDatasetDto): Promise<Dataset> {
    const dataset = this.datasetRepository.create(dto);
    return this.datasetRepository.save(dataset);
  }

  async update(id: string, dto: UpdateDatasetDto): Promise<Dataset> {
    const dataset = await this.findOne(id);
    Object.assign(dataset, dto);
    return this.datasetRepository.save(dataset);
  }

  async remove(id: string): Promise<void> {
    const dataset = await this.findOne(id);
    await this.datasetRepository.remove(dataset);
  }
}
