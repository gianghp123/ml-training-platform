import { ArtifactType } from '@training-ml/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ModelRegistry } from './model-registry.entity';
import { NodeExecution } from './node-execution.entity';
import { WorkflowRun } from './workflow-run.entity';

@Entity('artifacts')
export class Artifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowRunId: string;

  @Column({ type: 'uuid' })
  nodeExecutionId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', enum: ArtifactType })
  artifactType: ArtifactType;

  @Column({ type: 'varchar' })
  mimeType: string;

  @Column({ type: 'varchar' })
  storageUri: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => WorkflowRun, (run) => run.artifacts)
  @JoinColumn({ name: 'workflow_run_id' })
  workflowRun: WorkflowRun;

  @ManyToOne(() => NodeExecution, (execution) => execution.artifacts)
  @JoinColumn({ name: 'node_execution_id' })
  nodeExecution: NodeExecution;

  @OneToOne(() => ModelRegistry, (registry) => registry.artifact)
  modelRegistry: ModelRegistry;
}
