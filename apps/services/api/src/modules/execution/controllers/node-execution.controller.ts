import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { CreateNodeExecutionDto, NodeExecutionDto, PaginatedNodeExecutionResponseDto, UpdateNodeExecutionDto } from '../dtos/node-execution.dto';
import { NodeExecutionService } from '../services/node-execution.service';

@ApiBearerAuth()
@Controller('node-executions')
export class NodeExecutionController {
  constructor(
    private readonly nodeExecutionService: NodeExecutionService,
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedNodeExecutionResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.nodeExecutionService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: NodeExecutionDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodeExecutionService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: NodeExecutionDto })
  async create(@Body() dto: CreateNodeExecutionDto) {
    return this.nodeExecutionService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: NodeExecutionDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNodeExecutionDto) {
    return this.nodeExecutionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.nodeExecutionService.remove(id);
  }
}
