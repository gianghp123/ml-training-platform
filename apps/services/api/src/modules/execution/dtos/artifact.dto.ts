import { createZodDto } from 'nestjs-zod';
import {
  CreateArtifactSchema,
  UpdateArtifactSchema,
  ArtifactSchema,
} from '@training-ml/contracts';

export class CreateArtifactDto extends createZodDto(CreateArtifactSchema) {}
export class UpdateArtifactDto extends createZodDto(UpdateArtifactSchema) {}
export class ArtifactDto extends createZodDto(ArtifactSchema) {}
