import { PartialType } from '@nestjs/swagger';
import { CreateBlockCategoryDto } from './create-block-category.dto';

export class UpdateBlockCategoryDto extends PartialType(CreateBlockCategoryDto) {}
