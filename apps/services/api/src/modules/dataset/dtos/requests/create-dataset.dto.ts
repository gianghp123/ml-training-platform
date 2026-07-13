import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { DatasetFormat } from 'src/libs/enums';

export class CreateDatasetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storageUri: string;

  @ApiProperty({ enum: DatasetFormat })
  @IsEnum(DatasetFormat)
  format: DatasetFormat;

  @ApiProperty()
  @IsNumber()
  size: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  checksum?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}
