import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRun } from 'src/database/entities/workflow-run.entity';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { Artifact } from 'src/database/entities/artifact.entity';
import { WorkflowRunService } from './services/workflow-run.service';
import { NodeExecutionService } from './services/node-execution.service';
import { ArtifactService } from './services/artifact.service';
import { WorkflowRunController } from './controllers/workflow-run.controller';
import { NodeExecutionController } from './controllers/node-execution.controller';
import { ArtifactController } from './controllers/artifact.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRun, NodeExecution, Artifact])],
  providers: [WorkflowRunService, NodeExecutionService, ArtifactService],
  controllers: [WorkflowRunController, NodeExecutionController, ArtifactController],
})
export class ExecutionModule {}
