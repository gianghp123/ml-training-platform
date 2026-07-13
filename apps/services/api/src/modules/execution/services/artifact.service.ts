import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artifact } from 'src/database/entities/artifact.entity';
import { CreateArtifactDto } from '../dtos/requests/create-artifact.dto';
import { UpdateArtifactDto } from '../dtos/requests/update-artifact.dto';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private artifactRepository: Repository<Artifact>,
  ) {}

  async findAll(): Promise<Artifact[]> {
    return this.artifactRepository.find();
  }

  async findOne(id: string): Promise<Artifact> {
    const artifact = await this.artifactRepository.findOne({ where: { id } });
    if (!artifact) {
      throw new NotFoundException(`Artifact #${id} not found`);
    }
    return artifact;
  }

  async create(dto: CreateArtifactDto): Promise<Artifact> {
    const artifact = this.artifactRepository.create(dto);
    return this.artifactRepository.save(artifact);
  }

  async update(id: string, dto: UpdateArtifactDto): Promise<Artifact> {
    const artifact = await this.findOne(id);
    Object.assign(artifact, dto);
    return this.artifactRepository.save(artifact);
  }

  async remove(id: string): Promise<void> {
    const artifact = await this.findOne(id);
    await this.artifactRepository.remove(artifact);
  }
}
