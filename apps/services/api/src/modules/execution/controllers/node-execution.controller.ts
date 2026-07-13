import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { NodeExecutionService } from '../services/node-execution.service';
import { CreateNodeExecutionDto, UpdateNodeExecutionDto, NodeExecutionDto } from '../dtos/node-execution.dto';

@ApiBearerAuth()
@Controller('node-executions')
export class NodeExecutionController {
  constructor(
    private readonly nodeExecutionService: NodeExecutionService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [NodeExecutionDto] })
  async findAll() {
    return this.nodeExecutionService.findAll();
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
