import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowRunStatus } from 'src/libs/enums';

export class CreateWorkflowRunDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workflowVersionId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  datasetId: string;

  @ApiPropertyOptional({ enum: WorkflowRunStatus })
  @IsEnum(WorkflowRunStatus)
  @IsOptional()
  status?: WorkflowRunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  finishedAt?: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}
