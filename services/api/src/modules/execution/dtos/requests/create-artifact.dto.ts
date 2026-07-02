import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { ArtifactType } from 'src/libs/enums';

export class CreateArtifactDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workflowRunId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  nodeExecutionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ArtifactType })
  @IsEnum(ArtifactType)
  @IsNotEmpty()
  artifactType: ArtifactType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storageUri: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
