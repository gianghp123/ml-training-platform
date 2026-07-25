import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { type PipelineGraph, WorkflowRunStatus } from '@training-ml/contracts';
import { WorkflowVersion } from './workflow-version.entity';
import { Dataset } from './dataset.entity';
import { NodeExecution } from './node-execution.entity';
import { Artifact } from './artifact.entity';

@Entity('workflow_runs')
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  workflowVersionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  datasetId: string | null;

  @Column({ type: 'jsonb' })
  graphSnapshot: PipelineGraph;

  @Column({ type: 'varchar', enum: WorkflowRunStatus, default: WorkflowRunStatus.PENDING })
  status: WorkflowRunStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @ManyToOne(() => WorkflowVersion, (version) => version.runs, {
    nullable: true,
  })
  @JoinColumn({ name: 'workflow_version_id' })
  workflowVersion: WorkflowVersion | null;

  @ManyToOne(() => Dataset, (dataset) => dataset.runs, { nullable: true })
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset | null;

  @ManyToMany(() => Dataset, (dataset) => dataset.workflowRuns)
  @JoinTable({
    name: 'workflow_run_datasets',
    joinColumn: {
      name: 'run_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'dataset_id',
      referencedColumnName: 'id',
    },
  })
  datasets: Dataset[];

  @OneToMany(() => NodeExecution, (execution) => execution.workflowRun)
  nodeExecutions: NodeExecution[];

  @OneToMany(() => Artifact, (artifact) => artifact.workflowRun)
  artifacts: Artifact[];
}
