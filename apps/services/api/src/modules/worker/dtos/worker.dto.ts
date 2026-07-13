import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkerSchema,
  UpdateWorkerSchema,
  WorkerSchema,
} from '@training-ml/contracts';

export class CreateWorkerDto extends createZodDto(CreateWorkerSchema) {}
export class UpdateWorkerDto extends createZodDto(UpdateWorkerSchema) {}
export class WorkerDto extends createZodDto(WorkerSchema) {}
