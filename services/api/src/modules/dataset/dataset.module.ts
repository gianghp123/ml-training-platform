import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Dataset } from "src/database/entities/dataset.entity";
import { DatasetController } from "./controllers/dataset.controller";
import { DatasetService } from "./services/dataset.service";

@Module({
  imports: [TypeOrmModule.forFeature([Dataset])],
  providers: [DatasetService],
  controllers: [DatasetController],
})
export class DatasetModule {}
