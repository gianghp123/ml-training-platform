import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BlockCategory } from './block-category.entity';

@Entity('block_definitions')
export class BlockDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  configSchema: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  inputSchema: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  outputSchema: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  dockerImage: string;

  @Column({ type: 'varchar', nullable: true })
  version: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => BlockCategory, (category) => category.blockDefinitions)
  @JoinColumn({ name: 'category_id' })
  category: BlockCategory;
}
