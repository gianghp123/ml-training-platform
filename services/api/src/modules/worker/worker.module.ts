import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Worker } from "src/database/entities/worker.entity";
import { WorkerAdminController } from "./controllers/admin/worker.admin.controller";
import { WorkerService } from "./services/worker.service";

@Module({
  imports: [TypeOrmModule.forFeature([Worker])],
  providers: [WorkerService],
  controllers: [WorkerAdminController],
})
export class WorkerModule {}
