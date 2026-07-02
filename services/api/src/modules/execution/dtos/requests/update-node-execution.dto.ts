import { PartialType } from '@nestjs/swagger';
import { CreateNodeExecutionDto } from './create-node-execution.dto';

export class UpdateNodeExecutionDto extends PartialType(CreateNodeExecutionDto) {}
