import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { DatasetFormat } from '../../libs/enums';
import { WorkflowRun } from './workflow-run.entity';

@Entity('datasets')
@Unique('UQ_dataset_user_name_version', ['userId', 'name', 'version'])
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  storageUri: string;

  @Column({ type: 'varchar', enum: DatasetFormat })
  format: DatasetFormat;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', nullable: true })
  checksum: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar' })
  userId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => WorkflowRun, (run) => run.dataset)
  runs: WorkflowRun[];
}
