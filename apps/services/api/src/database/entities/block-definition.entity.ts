import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type {
  BlockStatus,
  Port,
  ConfigSchema,
  ConstraintSet,
  OutputTransform,
} from '@training-ml/contracts';
import { BlockCategory } from './block-category.entity';

@Entity('block_definitions')
export class BlockDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar' })
  status: BlockStatus;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => BlockCategory, (category) => category.blockDefinitions)
  @JoinColumn({ name: 'category_id' })
  category: BlockCategory;

  @Column({ type: 'jsonb' })
  ports: { inputs: Port[]; outputs: Port[] };

  @Column({ type: 'jsonb' })
  configSchema: ConfigSchema;

  @Column({ type: 'jsonb' })
  constraints: ConstraintSet;

  @Column({ type: 'jsonb' })
  outputTransform: OutputTransform;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
