import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  ArtifactDto,
  PaginatedArtifactResponseDto,
} from '../dtos/artifact.dto';
import { ArtifactService } from '../services/artifact.service';

@Controller('artifacts')
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Get()
  @ZodResponse({
    status: HttpStatus.OK,
    type: PaginatedArtifactResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.artifactService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ArtifactDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.artifactService.findOne(id);
  }
}
