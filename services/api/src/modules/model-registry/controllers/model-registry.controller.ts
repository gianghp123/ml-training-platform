import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { ModelRegistryService } from "../services/model-registry.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { ModelRegistryDTO } from "../dtos/responses/model-registry.response";
import { CreateModelRegistryDto } from "../dtos/requests/create-model-registry.dto";
import { UpdateModelRegistryDto } from "../dtos/requests/update-model-registry.dto";

@ApiBearerAuth()
@Controller('model-registries')
@UseInterceptors(ClassSerializerInterceptor)
export class ModelRegistryController {
  constructor(
    private readonly modelRegistryService: ModelRegistryService
  ) { }

  @Get()
  @SerializeOptions({ type: ModelRegistryDTO })
  @ApiOkResponse({ type: ModelRegistryDTO, isArray: true })
  async findAll() {
    return this.modelRegistryService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: ModelRegistryDTO })
  @ApiOkResponse({ type: ModelRegistryDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modelRegistryService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: ModelRegistryDTO })
  @ApiCreatedResponse({ type: ModelRegistryDTO })
  async create(@Body() dto: CreateModelRegistryDto) {
    return this.modelRegistryService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: ModelRegistryDTO })
  @ApiOkResponse({ type: ModelRegistryDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModelRegistryDto) {
    return this.modelRegistryService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.modelRegistryService.remove(id);
  }
}
