import {
  CreateWorkerSchema,
  PaginatedWorkerResponseSchema,
  UpdateWorkerSchema,
  WorkerSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkerDto extends createZodDto(CreateWorkerSchema.meta({ id: 'CreateWorker' }), { codec: true }) { }
export class UpdateWorkerDto extends createZodDto(UpdateWorkerSchema.meta({ id: 'UpdateWorker' }), { codec: true }) { }
export class WorkerDto extends createZodDto(WorkerSchema.meta({ id: 'Worker' }), { codec: true }) { }
export class PaginatedWorkerResponseDto extends createZodDto(PaginatedWorkerResponseSchema.meta({ id: 'PaginatedWorkerResponse' }), { codec: true }) { }
