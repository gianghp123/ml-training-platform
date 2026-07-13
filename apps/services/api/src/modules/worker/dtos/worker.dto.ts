import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkerSchema,
  UpdateWorkerSchema,
  WorkerSchema,
  PaginatedWorkerResponseSchema,
} from '@training-ml/contracts';

export class CreateWorkerDto extends createZodDto(CreateWorkerSchema) {}
export class UpdateWorkerDto extends createZodDto(UpdateWorkerSchema) {}
export class WorkerDto extends createZodDto(WorkerSchema) {}
export class PaginatedWorkerResponseDto extends createZodDto(PaginatedWorkerResponseSchema) {}
