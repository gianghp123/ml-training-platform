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
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { RequestUser } from 'src/modules/auth/interfaces/current-user.interface';
import {
  NodeExecutionDto,
  PaginatedNodeExecutionResponseDto,
} from '../dtos/node-execution.dto';
import { NodeExecutionService } from '../services/node-execution.service';

@ApiBearerAuth()
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
    @CurrentUser() user: RequestUser,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.nodeExecutionService.findAll(
      { page, limit },
      user.userId,
    );
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: NodeExecutionDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.nodeExecutionService.findOne(id, user.userId);
  }
}
