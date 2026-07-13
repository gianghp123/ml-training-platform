import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { WorkflowRunService } from '../services/workflow-run.service';
import { CreateWorkflowRunDto, UpdateWorkflowRunDto, WorkflowRunDto, PaginatedWorkflowRunResponseDto } from '../dtos/workflow-run.dto';

@ApiBearerAuth()
@Controller('workflow-runs')
export class WorkflowRunController {
  constructor(
    private readonly workflowRunService: WorkflowRunService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedWorkflowRunResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.workflowRunService.findAll({ page, limit });
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
