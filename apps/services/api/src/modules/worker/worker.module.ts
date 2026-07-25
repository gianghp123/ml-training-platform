import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Worker } from "src/database/entities/worker.entity";
import { WorkerService } from "./services/worker.service";

@Module({
  imports: [TypeOrmModule.forFeature([Worker])],
  providers: [WorkerService],
  controllers: [],
})
export class WorkerModule {}
