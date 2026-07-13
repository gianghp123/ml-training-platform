import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ModelRegistryService } from "../services/model-registry.service";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateModelRegistryDto, UpdateModelRegistryDto, ModelRegistryDto } from "../dtos/model-registry.dto";

@ApiBearerAuth()
@Controller('model-registries')
export class ModelRegistryController {
  constructor(
    private readonly modelRegistryService: ModelRegistryService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [ModelRegistryDto] })
  async findAll() {
    return this.modelRegistryService.findAll();
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
