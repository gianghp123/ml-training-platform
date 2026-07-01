import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { WorkerStatus } from '../../libs/enums';
import { NodeExecution } from './node-execution.entity';

@Entity('workers')
@Unique('UQ_worker_hostname', ['hostname'])
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostname: string;

  @Column({ type: 'enum', enum: WorkerStatus, default: WorkerStatus.IDLE })
  status: WorkerStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastHeartbeat: Date;

  @Column({ type: 'jsonb', nullable: true })
  capability: Record<string, any>;

  @OneToMany(() => NodeExecution, (execution) => execution.worker)
  nodeExecutions: NodeExecution[];
}
