import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BlockDefinitionDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  code: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  categoryId: string;

  @ApiPropertyOptional()
  @Expose()
  description: string;

  @ApiPropertyOptional()
  @Expose()
  configSchema: Record<string, unknown>;

  @ApiPropertyOptional()
  @Expose()
  inputSchema: Record<string, unknown>;

  @ApiPropertyOptional()
  @Expose()
  outputSchema: Record<string, unknown>;

  @ApiPropertyOptional()
  @Expose()
  dockerImage: string;

  @ApiPropertyOptional()
  @Expose()
  version: string;
}
