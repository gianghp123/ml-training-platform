import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ArtifactType } from 'src/libs/enums';

export class ArtifactDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  workflowRunId: string;

  @ApiProperty()
  @Expose()
  nodeExecutionId: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ enum: ArtifactType })
  @Expose()
  artifactType: ArtifactType;

  @ApiProperty()
  @Expose()
  mimeType: string;

  @ApiProperty()
  @Expose()
  storageUri: string;

  @ApiPropertyOptional()
  @Expose()
  metadata: Record<string, unknown>;
}
