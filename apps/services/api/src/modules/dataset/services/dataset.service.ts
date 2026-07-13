import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Dataset } from "src/database/entities/dataset.entity";
import { Repository } from "typeorm";
import { CreateDatasetDto, UpdateDatasetDto } from "../dtos/dataset.dto";

@Injectable()
export class DatasetService {
  constructor(
    @InjectRepository(Dataset)
    private datasetRepository: Repository<Dataset>,
  ) { }

  async findAll(): Promise<Dataset[]> {
    return this.datasetRepository.find();
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
