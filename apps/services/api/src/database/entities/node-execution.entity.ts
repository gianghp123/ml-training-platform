import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { NodeExecutionStatus } from '@training-ml/contracts';
import { WorkflowRun } from './workflow-run.entity';
import { Worker } from './worker.entity';
import { Artifact } from './artifact.entity';

@Entity('node_executions')
@Unique('UQ_node_execution_run_node', ['workflowRunId', 'nodeId'])
export class NodeExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowRunId: string;

  @Column({ type: 'varchar' })
  nodeId: string;

  @Column({ type: 'varchar' })
  nodeType: string;

  @Column({ type: 'varchar', enum: NodeExecutionStatus, default: NodeExecutionStatus.PENDING })
  status: NodeExecutionStatus;

  @Column({ type: 'uuid', nullable: true })
  workerId: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  outputSummary: Record<string, unknown> | null;

  @ManyToOne(() => WorkflowRun, (run) => run.nodeExecutions)
  @JoinColumn({ name: 'workflow_run_id' })
  workflowRun: WorkflowRun;

  @ManyToOne(() => Worker, (worker) => worker.nodeExecutions, { nullable: true })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @OneToMany(() => Artifact, (artifact) => artifact.nodeExecution)
  artifacts: Artifact[];
}
