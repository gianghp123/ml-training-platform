import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { WorkflowRunService } from '../services/workflow-run.service';
import { WorkflowRunDTO } from '../dtos/responses/workflow-run.response';
import { CreateWorkflowRunDto } from '../dtos/requests/create-workflow-run.dto';
import { UpdateWorkflowRunDto } from '../dtos/requests/update-workflow-run.dto';

@ApiBearerAuth()
@Controller('workflow-runs')
@UseInterceptors(ClassSerializerInterceptor)
export class WorkflowRunController {
  constructor(
    private readonly workflowRunService: WorkflowRunService,
  ) {}

  @Get()
  @SerializeOptions({ type: WorkflowRunDTO })
  @ApiOkResponse({ type: WorkflowRunDTO, isArray: true })
  async findAll() {
    return this.workflowRunService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: WorkflowRunDTO })
  @ApiOkResponse({ type: WorkflowRunDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowRunService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: WorkflowRunDTO })
  @ApiCreatedResponse({ type: WorkflowRunDTO })
  async create(@Body() dto: CreateWorkflowRunDto) {
    return this.workflowRunService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: WorkflowRunDTO })
  @ApiOkResponse({ type: WorkflowRunDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowRunDto) {
    return this.workflowRunService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowRunService.remove(id);
  }
}
