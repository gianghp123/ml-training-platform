import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsObject, IsNotEmpty } from 'class-validator';

export class CreateWorkflowVersionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  graphJson: Record<string, unknown>;
}
