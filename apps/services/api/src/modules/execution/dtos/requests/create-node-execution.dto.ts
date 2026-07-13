import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { NodeExecutionStatus } from 'src/libs/enums';

export class CreateNodeExecutionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workflowRunId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nodeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nodeType: string;

  @ApiPropertyOptional({ enum: NodeExecutionStatus })
  @IsEnum(NodeExecutionStatus)
  @IsOptional()
  status?: NodeExecutionStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  workerId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  finishedAt?: Date;
}
