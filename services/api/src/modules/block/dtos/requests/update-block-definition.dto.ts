import { PartialType } from '@nestjs/swagger';
import { CreateBlockDefinitionDto } from './create-block-definition.dto';

export class UpdateBlockDefinitionDto extends PartialType(CreateBlockDefinitionDto) {}
