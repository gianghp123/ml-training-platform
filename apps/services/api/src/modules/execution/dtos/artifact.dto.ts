import { createZodDto } from 'nestjs-zod';
import {
  CreateArtifactSchema,
  UpdateArtifactSchema,
  ArtifactSchema,
  PaginatedArtifactResponseSchema,
} from '@training-ml/contracts';

export class CreateArtifactDto extends createZodDto(CreateArtifactSchema) {}
export class UpdateArtifactDto extends createZodDto(UpdateArtifactSchema) {}
export class ArtifactDto extends createZodDto(ArtifactSchema) {}
export class PaginatedArtifactResponseDto extends createZodDto(PaginatedArtifactResponseSchema) {}
