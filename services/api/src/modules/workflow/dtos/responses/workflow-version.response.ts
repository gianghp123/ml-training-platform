import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WorkflowVersionDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  workflowId: string;

  @ApiProperty()
  @Expose()
  version: number;

  @ApiProperty()
  @Expose()
  graphJson: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
