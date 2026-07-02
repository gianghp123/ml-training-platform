import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { NodeExecutionStatus } from 'src/libs/enums';

export class NodeExecutionDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  workflowRunId: string;

  @ApiProperty()
  @Expose()
  nodeId: string;

  @ApiProperty()
  @Expose()
  nodeType: string;

  @ApiProperty({ enum: NodeExecutionStatus })
  @Expose()
  status: NodeExecutionStatus;

  @ApiPropertyOptional()
  @Expose()
  workerId: string;

  @ApiProperty()
  @Expose()
  retryCount: number;

  @ApiPropertyOptional()
  @Expose()
  startedAt: Date;

  @ApiPropertyOptional()
  @Expose()
  finishedAt: Date;
}
