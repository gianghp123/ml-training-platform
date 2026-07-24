import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artifact } from 'src/database/entities/artifact.entity';
import { BlockDefinition } from 'src/database/entities/block-definition.entity';
import { Dataset } from 'src/database/entities/dataset.entity';
import { NodeExecution } from 'src/database/entities/node-execution.entity';
import { WorkflowRun } from 'src/database/entities/workflow-run.entity';
import { WorkflowVersion } from 'src/database/entities/workflow-version.entity';
import { ArtifactController } from './controllers/artifact.controller';
import { NodeExecutionController } from './controllers/node-execution.controller';
import { WorkflowRunController } from './controllers/workflow-run.controller';
import { ArtifactService } from './services/artifact.service';
import { NodeExecutionService } from './services/node-execution.service';
import { WorkflowRunService } from './services/workflow-run.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowRun,
      NodeExecution,
      Artifact,
      BlockDefinition,
      Dataset,
      WorkflowVersion,
    ]),
  ],
  providers: [WorkflowRunService, NodeExecutionService, ArtifactService],
  controllers: [WorkflowRunController, NodeExecutionController, ArtifactController],
})
export class ExecutionModule { }
