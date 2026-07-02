import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DatasetFormat } from 'src/libs/enums';

export class DatasetDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  storageUri: string;

  @ApiProperty({ enum: DatasetFormat })
  @Expose()
  format: DatasetFormat;

  @ApiProperty()
  @Expose()
  size: number;

  @ApiPropertyOptional()
  @Expose()
  checksum: string;

  @ApiProperty()
  @Expose()
  version: number;

  @ApiProperty()
  @Expose()
  userId: string;
}
