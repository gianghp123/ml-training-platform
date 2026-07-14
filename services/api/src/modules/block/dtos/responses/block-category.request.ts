import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class BlockCategoryDTO {
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
  orderIndex: number;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;
}
