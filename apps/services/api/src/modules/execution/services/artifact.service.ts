import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { Artifact } from 'src/database/entities/artifact.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
  ) {}

  async findAll(options: IPaginationOptions, userId: string) {
    const query = this.artifactRepository
      .createQueryBuilder('artifact')
      .innerJoin('artifact.workflowRun', 'run')
      .where('run.user_id = :userId', { userId })
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

  async findOne(id: string, userId: string): Promise<Artifact> {
    const artifact = await this.artifactRepository
      .createQueryBuilder('artifact')
      .innerJoin('artifact.workflowRun', 'run')
      .where('artifact.id = :id', { id })
      .andWhere('run.user_id = :userId', { userId })
      .getOne();
    if (!artifact) {
      throw new NotFoundException(`Artifact #${id} not found`);
    }
    return artifact;
  }
}
