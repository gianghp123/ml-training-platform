import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ModelRegistryDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  artifactId: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  version: string;

  @ApiPropertyOptional()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  userId: string;
}
