import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlockDefinition } from './block-definition.entity';

@Entity('block_categories')
export class BlockCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => BlockDefinition, (definition) => definition.category)
  blockDefinitions: BlockDefinition[];
}
