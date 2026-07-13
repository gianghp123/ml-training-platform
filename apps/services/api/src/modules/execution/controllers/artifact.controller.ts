import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { ArtifactService } from '../services/artifact.service';
import { CreateArtifactDto, UpdateArtifactDto, ArtifactDto } from '../dtos/artifact.dto';

@ApiBearerAuth()
@Controller('artifacts')
export class ArtifactController {
  constructor(
    private readonly artifactService: ArtifactService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [ArtifactDto] })
  async findAll() {
    return this.artifactService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ArtifactDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.artifactService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: ArtifactDto })
  async create(@Body() dto: CreateArtifactDto) {
    return this.artifactService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ArtifactDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArtifactDto) {
    return this.artifactService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.artifactService.remove(id);
  }
}
