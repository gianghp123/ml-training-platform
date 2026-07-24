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
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { RequestUser } from 'src/modules/auth/interfaces/current-user.interface';
import {
  ArtifactDto,
  PaginatedArtifactResponseDto,
} from '../dtos/artifact.dto';
import { ArtifactService } from '../services/artifact.service';

@ApiBearerAuth()
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
    @CurrentUser() user: RequestUser,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.artifactService.findAll({ page, limit }, user.userId);
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: ArtifactDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.artifactService.findOne(id, user.userId);
  }
}
