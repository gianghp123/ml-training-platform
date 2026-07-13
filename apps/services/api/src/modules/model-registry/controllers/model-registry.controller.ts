import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ModelRegistryService } from "../services/model-registry.service";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateModelRegistryDto, UpdateModelRegistryDto, ModelRegistryDto, PaginatedModelRegistryResponseDto } from "../dtos/model-registry.dto";

@ApiBearerAuth()
@Controller('model-registries')
export class ModelRegistryController {
  constructor(
    private readonly modelRegistryService: ModelRegistryService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedModelRegistryResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.modelRegistryService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ModelRegistryDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modelRegistryService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: ModelRegistryDto })
  async create(@Body() dto: CreateModelRegistryDto) {
    return this.modelRegistryService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ModelRegistryDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModelRegistryDto) {
    return this.modelRegistryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.modelRegistryService.remove(id);
  }
}
