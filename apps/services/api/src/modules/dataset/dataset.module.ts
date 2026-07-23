import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueueName } from "src/common/queue/types";
import { Dataset } from "src/database/entities/dataset.entity";
import { StorageModule } from "../storage/storage.module";
import { DatasetController } from "./controllers/dataset.controller";
import { DatasetValidationService } from "./services/dataset-validation.service";
import { DatasetService } from "./services/dataset.service";
import { DatasetUploadProcessor } from "./workers/validation.worker";

@Module({
  imports: [
    TypeOrmModule.forFeature([Dataset]),
    StorageModule,
    BullModule.registerQueue({
      name: QueueName.DATASET_UPLOAD
    }),
  ],
  providers: [
    DatasetService,
    DatasetValidationService,
    DatasetUploadProcessor
  ],
  controllers: [DatasetController],
})
export class DatasetModule { }
