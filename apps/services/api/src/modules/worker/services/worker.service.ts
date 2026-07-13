import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Worker } from 'src/database/entities/worker.entity';
import { CreateWorkerDto, UpdateWorkerDto } from '../dtos/worker.dto';

@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(Worker)
    private workerRepository: Repository<Worker>,
  ) {}

  async findAll(options: IPaginationOptions) {
    const { items, meta } = await paginate<Worker>(this.workerRepository, options);
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

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker #${id} not found`);
    }
    return worker;
  }

  async create(dto: CreateWorkerDto): Promise<Worker> {
    const worker = this.workerRepository.create(dto);
    return this.workerRepository.save(worker);
  }

  async update(id: string, dto: UpdateWorkerDto): Promise<Worker> {
    const worker = await this.findOne(id);
    Object.assign(worker, dto);
    return this.workerRepository.save(worker);
  }

  async remove(id: string): Promise<void> {
    const worker = await this.findOne(id);
    await this.workerRepository.remove(worker);
  }
}
