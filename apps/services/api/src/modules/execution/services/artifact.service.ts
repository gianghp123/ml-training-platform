import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Artifact } from 'src/database/entities/artifact.entity';
import { CreateArtifactDto, UpdateArtifactDto } from '../dtos/artifact.dto';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private artifactRepository: Repository<Artifact>,
  ) {}

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<Artifact>(this.artifactRepository, options);
    return {
      data: items,
      meta: {
        page: meta.currentPage,
        limit: meta.itemsPerPage,
        total: meta.totalItems,
        totalPages: meta.totalPages,
      },
    };
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
