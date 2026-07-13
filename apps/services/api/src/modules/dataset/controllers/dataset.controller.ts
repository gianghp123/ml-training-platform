import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateDatasetDto, DatasetDto, UpdateDatasetDto } from "../dtos/dataset.dto";
import { DatasetService } from "../services/dataset.service";

@ApiBearerAuth()
@Controller('datasets')
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [DatasetDto] })
  async findAll() {
    return this.datasetService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: DatasetDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: DatasetDto })
  async create(@Body() dto: CreateDatasetDto) {
    return this.datasetService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: DatasetDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDatasetDto) {
    return this.datasetService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.datasetService.remove(id);
  }
}
