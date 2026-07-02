import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowVersionDto } from './create-workflow-version.dto';

export class UpdateWorkflowVersionDto extends PartialType(CreateWorkflowVersionDto) {}
