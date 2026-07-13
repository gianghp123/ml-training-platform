import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { WorkflowVersionService } from "../services/workflow-version.service";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateWorkflowVersionDto, UpdateWorkflowVersionDto, WorkflowVersionDto, PaginatedWorkflowVersionResponseDto } from "../dtos/workflow-version.dto";

@ApiBearerAuth()
@Controller('workflow-versions')
export class WorkflowVersionController {
  constructor(
    private readonly workflowVersionService: WorkflowVersionService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedWorkflowVersionResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.workflowVersionService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowVersionDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowVersionService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: WorkflowVersionDto })
  async create(@Body() dto: CreateWorkflowVersionDto) {
    return this.workflowVersionService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkflowVersionDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowVersionDto) {
    return this.workflowVersionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowVersionService.remove(id);
  }
}
