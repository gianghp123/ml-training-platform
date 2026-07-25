import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  NodeExecutionDto,
  PaginatedNodeExecutionResponseDto,
} from '../dtos/node-execution.dto';
import { NodeExecutionService } from '../services/node-execution.service';

@Controller('node-executions')
export class NodeExecutionController {
  constructor(
    private readonly nodeExecutionService: NodeExecutionService,
  ) {}

  @Get()
  @ZodResponse({
    status: HttpStatus.OK,
    type: PaginatedNodeExecutionResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.nodeExecutionService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: NodeExecutionDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.nodeExecutionService.findOne(id);
  }
}
