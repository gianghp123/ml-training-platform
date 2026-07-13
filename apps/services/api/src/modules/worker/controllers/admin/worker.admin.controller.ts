import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { ZodResponse } from "nestjs-zod";
import { WorkerService } from '../../services/worker.service';
import { CreateWorkerDto, UpdateWorkerDto, WorkerDto } from '../../dtos/worker.dto';
import { Roles } from 'src/modules/auth/decorators/role.decorator';
import { UserRole } from 'src/libs/enums/user-role.enum';

@ApiTags('Admin-Workers')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/workers')
export class WorkerAdminController {
  constructor(
    private readonly workerService: WorkerService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [WorkerDto] })
  async findAll() {
    return this.workerService.findAll();
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
