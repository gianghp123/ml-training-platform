import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { ArtifactService } from '../services/artifact.service';
import { CreateArtifactDto, UpdateArtifactDto, ArtifactDto, PaginatedArtifactResponseDto } from '../dtos/artifact.dto';

@ApiBearerAuth()
@Controller('artifacts')
export class ArtifactController {
  constructor(
    private readonly artifactService: ArtifactService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedArtifactResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.artifactService.findAll({ page, limit });
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
