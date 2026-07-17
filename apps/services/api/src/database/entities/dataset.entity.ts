import { DatasetFormat, type DatasetProfile, DatasetStatus, type ValidationOptions } from '@training-ml/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
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


  @Column({
    type: 'varchar',
    enum: DatasetStatus,
    default: DatasetStatus.UPLOADING,
  })
  status: DatasetStatus;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  profile: DatasetProfile | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  validationError: string | null;

  @Column({ type: 'jsonb', nullable: true })
  validationOptions: ValidationOptions | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => WorkflowRun, (run) => run.dataset)
  runs: WorkflowRun[];
}
