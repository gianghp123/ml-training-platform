import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { WorkflowService } from "../services/workflow.service";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowDto } from "../dtos/workflow.dto";

@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [WorkflowDto] })
  async findAll() {
    return this.workflowService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: WorkflowDto })
  async create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowService.remove(id);
  }
}
