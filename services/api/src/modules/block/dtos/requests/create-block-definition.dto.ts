import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateBlockDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  configSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dockerImage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;
}
