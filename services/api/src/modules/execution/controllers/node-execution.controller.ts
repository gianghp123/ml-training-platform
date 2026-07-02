import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { NodeExecutionService } from '../services/node-execution.service';
import { NodeExecutionDTO } from '../dtos/responses/node-execution.response';
import { CreateNodeExecutionDto } from '../dtos/requests/create-node-execution.dto';
import { UpdateNodeExecutionDto } from '../dtos/requests/update-node-execution.dto';

@ApiBearerAuth()
@Controller('node-executions')
@UseInterceptors(ClassSerializerInterceptor)
export class NodeExecutionController {
  constructor(
    private readonly nodeExecutionService: NodeExecutionService,
  ) {}

  @Get()
  @SerializeOptions({ type: NodeExecutionDTO })
  @ApiOkResponse({ type: NodeExecutionDTO, isArray: true })
  async findAll() {
    return this.nodeExecutionService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: NodeExecutionDTO })
  @ApiOkResponse({ type: NodeExecutionDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodeExecutionService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: NodeExecutionDTO })
  @ApiCreatedResponse({ type: NodeExecutionDTO })
  async create(@Body() dto: CreateNodeExecutionDto) {
    return this.nodeExecutionService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: NodeExecutionDTO })
  @ApiOkResponse({ type: NodeExecutionDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNodeExecutionDto) {
    return this.nodeExecutionService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.nodeExecutionService.remove(id);
  }
}
