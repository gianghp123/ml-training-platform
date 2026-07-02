import { PartialType } from '@nestjs/swagger';
import { CreateModelRegistryDto } from './create-model-registry.dto';

export class UpdateModelRegistryDto extends PartialType(CreateModelRegistryDto) {}
