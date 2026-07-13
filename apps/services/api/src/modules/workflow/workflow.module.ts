import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Workflow } from "src/database/entities/workflow.entity";
import { WorkflowVersion } from "src/database/entities/workflow-version.entity";
import { WorkflowController } from "./controllers/workflow.controller";
import { WorkflowVersionController } from "./controllers/workflow-version.controller";
import { WorkflowService } from "./services/workflow.service";
import { WorkflowVersionService } from "./services/workflow-version.service";

@Module({
  imports: [TypeOrmModule.forFeature([Workflow, WorkflowVersion])],
  providers: [WorkflowService, WorkflowVersionService],
  controllers: [WorkflowController, WorkflowVersionController],
})
export class WorkflowModule { }
