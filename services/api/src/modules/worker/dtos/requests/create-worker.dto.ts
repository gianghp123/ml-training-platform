import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { WorkerStatus } from 'src/libs/enums';

export class CreateWorkerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostname: string;

  @ApiPropertyOptional({ enum: WorkerStatus })
  @IsEnum(WorkerStatus)
  @IsOptional()
  status?: WorkerStatus;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  capability?: Record<string, unknown>;
}
