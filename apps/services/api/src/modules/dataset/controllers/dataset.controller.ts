import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CurrentUser } from "src/modules/auth/decorators/current-user.decorator";
import type { RequestUser } from "src/modules/auth/interfaces/current-user.interface";
import { CreateDatasetDto, DatasetDto, PaginatedDatasetResponseDto, UpdateDatasetDto, UploadUrlResponseDto } from "../dtos/dataset.dto";
import { DatasetService } from "../services/dataset.service";

@ApiBearerAuth()
@Controller('datasets')
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedDatasetResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.datasetService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: DatasetDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: UploadUrlResponseDto })
  async create(@Body() dto: CreateDatasetDto, @CurrentUser() user: RequestUser) {
    dto.userId = user.userId;
    return this.datasetService.createUploadUrl(dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async completeUpload(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetService.completeUpload(id);
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
