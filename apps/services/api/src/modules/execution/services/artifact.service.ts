import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ArtifactDownloadResponse } from '@training-ml/contracts';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { Artifact } from 'src/database/entities/artifact.entity';
import { StorageService } from 'src/modules/storage/storage.service';
import { Repository } from 'typeorm';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(options: IPaginationOptions) {
    const query = this.artifactRepository
      .createQueryBuilder('artifact')
      .innerJoin('artifact.workflowRun', 'run')
      .orderBy('artifact.created_at', 'DESC');
    const { items, meta } = await paginate<Artifact>(query, options);
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
    const artifact = await this.artifactRepository
      .createQueryBuilder('artifact')
      .innerJoin('artifact.workflowRun', 'run')
      .where('artifact.id = :id', { id })
      .getOne();
    if (!artifact) {
      throw new NotFoundException(`Artifact #${id} not found`);
    }
    return artifact;
  }

  async createDownloadUrl(id: string): Promise<ArtifactDownloadResponse> {
    const artifact = await this.findOne(id);
    const url = await this.storageService.createDownloadUrl(
      artifact.storageUri,
      artifact.name,
    );
    return { url };
  }
}
