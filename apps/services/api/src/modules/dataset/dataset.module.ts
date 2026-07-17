import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Dataset } from "src/database/entities/dataset.entity";
import { StorageService } from "../storage/storage.service";
import { DatasetController } from "./controllers/dataset.controller";
import { DatasetValidationService } from "./services/dataset-validation.service";
import { DatasetService } from "./services/dataset.service";

@Module({
  imports: [TypeOrmModule.forFeature([Dataset]), StorageService],
  providers: [DatasetService, DatasetValidationService],
  controllers: [DatasetController],
})
export class DatasetModule { }
