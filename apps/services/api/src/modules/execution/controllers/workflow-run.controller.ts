import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { WorkflowRunService } from '../services/workflow-run.service';
import { CreateWorkflowRunDto, UpdateWorkflowRunDto, WorkflowRunDto } from '../dtos/workflow-run.dto';

@ApiBearerAuth()
@Controller('workflow-runs')
export class WorkflowRunController {
  constructor(
    private readonly workflowRunService: WorkflowRunService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [WorkflowRunDto] })
  async findAll() {
    return this.workflowRunService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowRunDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowRunService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: WorkflowRunDto })
  async create(@Body() dto: CreateWorkflowRunDto) {
    return this.workflowRunService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowRunDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowRunDto) {
    return this.workflowRunService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowRunService.remove(id);
  }
}
