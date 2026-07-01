import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Workflow } from './workflow.entity';
import { WorkflowRun } from './workflow-run.entity';

@Entity('workflow_versions')
@Unique('UQ_workflow_version', ['workflowId', 'version'])
export class WorkflowVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  graphJson: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Workflow, (workflow) => workflow.versions)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @OneToMany(() => WorkflowRun, (run) => run.workflowVersion)
  runs: WorkflowRun[];
}
