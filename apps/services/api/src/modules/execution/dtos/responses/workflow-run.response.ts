import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { WorkflowRunStatus } from 'src/libs/enums';

export class WorkflowRunDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  workflowVersionId: string;

  @ApiProperty()
  @Expose()
  datasetId: string;

  @ApiProperty({ enum: WorkflowRunStatus })
  @Expose()
  status: WorkflowRunStatus;

  @ApiPropertyOptional()
  @Expose()
  startedAt: Date;

  @ApiPropertyOptional()
  @Expose()
  finishedAt: Date;

  @ApiProperty()
  @Expose()
  userId: string;
}
