import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkerService } from '../../services/worker.service';
import { WorkerDTO } from '../../dtos/responses/worker.response';
import { CreateWorkerDto } from '../../dtos/requests/create-worker.dto';
import { UpdateWorkerDto } from '../../dtos/requests/update-worker.dto';
import { Roles } from 'src/modules/auth/decorators/role.decorator';
import { UserRole } from 'src/libs/enums/user-role.enum';

@ApiTags('Admin-Workers')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/workers')
@UseInterceptors(ClassSerializerInterceptor)
export class WorkerAdminController {
  constructor(
    private readonly workerService: WorkerService,
  ) {}

  @Get()
  @SerializeOptions({ type: WorkerDTO })
  @ApiOkResponse({ type: WorkerDTO, isArray: true })
  async findAll() {
    return this.workerService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: WorkerDTO })
  @ApiOkResponse({ type: WorkerDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workerService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: WorkerDTO })
  @ApiCreatedResponse({ type: WorkerDTO })
  async create(@Body() dto: CreateWorkerDto) {
    return this.workerService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: WorkerDTO })
  @ApiOkResponse({ type: WorkerDTO })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerDto,
  ) {
    return this.workerService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workerService.remove(id);
  }
}
