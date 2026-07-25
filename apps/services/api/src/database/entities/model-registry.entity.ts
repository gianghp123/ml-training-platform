import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Artifact } from './artifact.entity';

@Entity('model_registries')
@Unique('UQ_model_registry_name_version', ['name', 'version'])
export class ModelRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artifactId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToOne(() => Artifact, (artifact) => artifact.modelRegistry)
  @JoinColumn({ name: 'artifact_id' })
  artifact: Artifact;
}
