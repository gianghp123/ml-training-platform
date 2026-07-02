import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { DatasetService } from "../services/dataset.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { DatasetDTO } from "../dtos/responses/dataset.response";
import { CreateDatasetDto } from "../dtos/requests/create-dataset.dto";
import { UpdateDatasetDto } from "../dtos/requests/update-dataset.dto";

@ApiBearerAuth()
@Controller('datasets')
@UseInterceptors(ClassSerializerInterceptor)
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService
  ) { }

  @Get()
  @SerializeOptions({ type: DatasetDTO })
  @ApiOkResponse({ type: DatasetDTO, isArray: true })
  async findAll() {
    return this.datasetService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: DatasetDTO })
  @ApiOkResponse({ type: DatasetDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: DatasetDTO })
  @ApiCreatedResponse({ type: DatasetDTO })
  async create(@Body() dto: CreateDatasetDto) {
    return this.datasetService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: DatasetDTO })
  @ApiOkResponse({ type: DatasetDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDatasetDto) {
    return this.datasetService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.datasetService.remove(id);
  }
}
