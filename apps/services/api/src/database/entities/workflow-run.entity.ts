import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowRunStatus } from '@training-ml/contracts';
import { WorkflowVersion } from './workflow-version.entity';
import { Dataset } from './dataset.entity';
import { NodeExecution } from './node-execution.entity';
import { Artifact } from './artifact.entity';

@Entity('workflow_runs')
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowVersionId: string;

  @Column({ type: 'uuid' })
  datasetId: string;

  @Column({ type: 'varchar', enum: WorkflowRunStatus, default: WorkflowRunStatus.PENDING })
  status: WorkflowRunStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => WorkflowVersion, (version) => version.runs)
  @JoinColumn({ name: 'workflow_version_id' })
  workflowVersion: WorkflowVersion;

  @ManyToOne(() => Dataset, (dataset) => dataset.runs)
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset;

  @OneToMany(() => NodeExecution, (execution) => execution.workflowRun)
  nodeExecutions: NodeExecution[];

  @OneToMany(() => Artifact, (artifact) => artifact.workflowRun)
  artifacts: Artifact[];
}
