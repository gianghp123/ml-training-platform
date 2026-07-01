import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { NodeExecutionStatus } from '../../libs/enums';
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

  @Column({ type: 'enum', enum: NodeExecutionStatus, default: NodeExecutionStatus.PENDING })
  status: NodeExecutionStatus;

  @Column({ type: 'uuid', nullable: true })
  workerId: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date;

  @ManyToOne(() => WorkflowRun, (run) => run.nodeExecutions)
  @JoinColumn({ name: 'workflow_run_id' })
  workflowRun: WorkflowRun;

  @ManyToOne(() => Worker, (worker) => worker.nodeExecutions, { nullable: true })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @OneToMany(() => Artifact, (artifact) => artifact.nodeExecution)
  artifacts: Artifact[];
}
