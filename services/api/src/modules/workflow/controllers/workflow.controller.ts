import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { WorkflowService } from "../services/workflow.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { WorkflowDTO } from "../dtos/responses/workflow.response";
import { CreateWorkflowDto } from "../dtos/requests/create-workflow.dto";
import { UpdateWorkflowDto } from "../dtos/requests/update-workflow.dto";

@ApiBearerAuth()
@Controller('workflows')
@UseInterceptors(ClassSerializerInterceptor)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService
  ) { }

  @Get()
  @SerializeOptions({ type: WorkflowDTO })
  @ApiOkResponse({ type: WorkflowDTO, isArray: true })
  async findAll() {
    return this.workflowService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: WorkflowDTO })
  @ApiOkResponse({ type: WorkflowDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: WorkflowDTO })
  @ApiCreatedResponse({ type: WorkflowDTO })
  async create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: WorkflowDTO })
  @ApiOkResponse({ type: WorkflowDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowService.remove(id);
  }
}
