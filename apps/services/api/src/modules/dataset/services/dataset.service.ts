import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DatasetStatus, UploadUrlResponse } from "@training-ml/contracts";
import { Queue } from "bullmq";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { DatasetUploadJob, DatasetUploadJobPayload } from "src/common/queue/jobs";
import { QueueName } from "src/common/queue/types";
import { Dataset } from "src/database/entities/dataset.entity";
import { sanitizeFilename } from "src/libs/utils/file.util";
import { StorageService } from "src/modules/storage/storage.service";
import { Repository } from "typeorm";
import { CreateDatasetDto, UpdateDatasetDto } from "../dtos/dataset.dto";

@Injectable()
export class DatasetService {
  constructor(
    @InjectRepository(Dataset)
    private datasetRepository: Repository<Dataset>,
    @InjectQueue(QueueName.DATASET_UPLOAD)
    private readonly queue: Queue,
    private readonly storageService: StorageService,
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

  async createUploadUrl(dto: CreateDatasetDto): Promise<UploadUrlResponse> {
    const dataset = this.datasetRepository.create({
      ...dto,
      status: DatasetStatus.UPLOADING,
      validationOptions: dto.validationOptions ?? null
    });

    const objectKey = this.craftObjectKey(
      dataset.userId,
      dataset.id,
      dto.name,
    );

    dataset.storageUri = objectKey;
    await this.datasetRepository.save(dataset);
    const url = await this.storageService.createUploadUrl(objectKey);

    return {
      datasetId: dataset.id,
      objectKey,
      url: url,
    };
  }

  async completeUpload(datasetId: string): Promise<void> {
    const dataset = await this.findOne(datasetId);
    dataset.status = DatasetStatus.QUEUED;
    await this.datasetRepository.save(dataset);

    await this.queue.add(DatasetUploadJob.VALIDATE_DATASET, {
      datasetId,
    } as DatasetUploadJobPayload);
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

  craftObjectKey(
    userId: string,
    datasetId: string,
    filename: string,
  ) {
    return `users/${userId}/datasets/${datasetId}/raw/${sanitizeFilename(filename)}`;
  }
}
