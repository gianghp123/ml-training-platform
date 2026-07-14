import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@training-ml/contracts';
import { ZodResponse } from "nestjs-zod";
import { Roles } from 'src/modules/auth/decorators/role.decorator';
import { CreateWorkerDto, PaginatedWorkerResponseDto, UpdateWorkerDto, WorkerDto } from '../../dtos/worker.dto';
import { WorkerService } from '../../services/worker.service';

@ApiTags('Admin-Workers')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/workers')
export class WorkerAdminController {
  constructor(
    private readonly workerService: WorkerService,
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedWorkerResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.workerService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkerDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workerService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: WorkerDto })
  async create(@Body() dto: CreateWorkerDto) {
    return this.workerService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: WorkerDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerDto,
  ) {
    return this.workerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workerService.remove(id);
  }
}
