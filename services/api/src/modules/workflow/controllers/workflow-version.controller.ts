import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { WorkflowVersionService } from "../services/workflow-version.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { WorkflowVersionDTO } from "../dtos/responses/workflow-version.response";
import { CreateWorkflowVersionDto } from "../dtos/requests/create-workflow-version.dto";
import { UpdateWorkflowVersionDto } from "../dtos/requests/update-workflow-version.dto";

@ApiBearerAuth()
@Controller('workflow-versions')
@UseInterceptors(ClassSerializerInterceptor)
export class WorkflowVersionController {
  constructor(
    private readonly workflowVersionService: WorkflowVersionService
  ) { }

  @Get()
  @SerializeOptions({ type: WorkflowVersionDTO })
  @ApiOkResponse({ type: WorkflowVersionDTO, isArray: true })
  async findAll() {
    return this.workflowVersionService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: WorkflowVersionDTO })
  @ApiOkResponse({ type: WorkflowVersionDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowVersionService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: WorkflowVersionDTO })
  @ApiCreatedResponse({ type: WorkflowVersionDTO })
  async create(@Body() dto: CreateWorkflowVersionDto) {
    return this.workflowVersionService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: WorkflowVersionDTO })
  @ApiOkResponse({ type: WorkflowVersionDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowVersionDto) {
    return this.workflowVersionService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowVersionService.remove(id);
  }
}
