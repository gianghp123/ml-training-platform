import { createZodDto } from 'nestjs-zod';
import {
  CreateArtifactSchema,
  UpdateArtifactSchema,
  ArtifactSchema,
  PaginatedArtifactResponseSchema,
} from '@training-ml/contracts';

export class CreateArtifactDto extends createZodDto(CreateArtifactSchema.meta({ id: 'CreateArtifact' }), { codec: true }) {}
export class UpdateArtifactDto extends createZodDto(UpdateArtifactSchema.meta({ id: 'UpdateArtifact' }), { codec: true }) {}
export class ArtifactDto extends createZodDto(ArtifactSchema.meta({ id: 'Artifact' }), { codec: true }) {}
export class PaginatedArtifactResponseDto extends createZodDto(PaginatedArtifactResponseSchema.meta({ id: 'PaginatedArtifactResponse' }), { codec: true }) {}
