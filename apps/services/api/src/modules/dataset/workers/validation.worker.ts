import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { InjectRepository } from '@nestjs/typeorm';
import { DatasetStatus } from '@training-ml/contracts';
import { DatasetUploadJobPayload } from 'src/common/queue/jobs';
import { QueueName } from 'src/common/queue/types';
import { Dataset } from 'src/database/entities/dataset.entity';
import { Repository } from 'typeorm';
import { DatasetValidationService } from '../services/dataset-validation.service';

@Processor(QueueName.DATASET_UPLOAD)
export class DatasetUploadProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Dataset)
    private datasetRepository: Repository<Dataset>,
    private readonly datasetValidator: DatasetValidationService,
  ) {
    super();
  }

  async process(job: Job<DatasetUploadJobPayload>) {
    const dataset = await this.updateStatus(job.data.datasetId, DatasetStatus.VALIDATING);
    const profile = await this.datasetValidator.validate(
      dataset.storageUri,
      dataset.validationOptions ?? undefined,
    );

    dataset.profile = profile
    dataset.status = DatasetStatus.READY;

    await this.datasetRepository.save(dataset);
  }

  async updateStatus(datasetId: string, status: DatasetStatus): Promise<Dataset> {
    const dataset = await this.datasetRepository.findOne({ where: { id: datasetId } });
    if (dataset) {
      dataset.status = status;
      await this.datasetRepository.save(dataset);
    }
    return dataset;
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<DatasetUploadJobPayload>) {
    await this.updateStatus(job.data.datasetId, DatasetStatus.FAILED);
  }
}
