import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { WorkerStatus } from 'src/libs/enums';

export class WorkerDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  hostname: string;

  @ApiProperty({ enum: WorkerStatus })
  @Expose()
  status: WorkerStatus;

  @ApiPropertyOptional()
  @Expose()
  lastHeartbeat: Date;

  @ApiPropertyOptional()
  @Expose()
  capability: Record<string, unknown>;
}
