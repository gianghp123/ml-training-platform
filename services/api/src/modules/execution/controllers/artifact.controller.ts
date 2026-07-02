import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { ArtifactService } from '../services/artifact.service';
import { ArtifactDTO } from '../dtos/responses/artifact.response';
import { CreateArtifactDto } from '../dtos/requests/create-artifact.dto';
import { UpdateArtifactDto } from '../dtos/requests/update-artifact.dto';

@ApiBearerAuth()
@Controller('artifacts')
@UseInterceptors(ClassSerializerInterceptor)
export class ArtifactController {
  constructor(
    private readonly artifactService: ArtifactService,
  ) {}

  @Get()
  @SerializeOptions({ type: ArtifactDTO })
  @ApiOkResponse({ type: ArtifactDTO, isArray: true })
  async findAll() {
    return this.artifactService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: ArtifactDTO })
  @ApiOkResponse({ type: ArtifactDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.artifactService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: ArtifactDTO })
  @ApiCreatedResponse({ type: ArtifactDTO })
  async create(@Body() dto: CreateArtifactDto) {
    return this.artifactService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: ArtifactDTO })
  @ApiOkResponse({ type: ArtifactDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArtifactDto) {
    return this.artifactService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.artifactService.remove(id);
  }
}
