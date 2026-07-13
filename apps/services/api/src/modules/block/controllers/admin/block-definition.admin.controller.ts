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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { UserRole } from "@training-ml/contracts";
import { Roles } from "src/modules/auth/decorators/role.decorator";
import { BlockDefinitionDto, CreateBlockDefinitionDto, UpdateBlockDefinitionDto } from "../../dtos/block-definition.dto";
import { BlockDefinitionService } from "../../services/block-definition.service";

@ApiTags('Admin-BlockDefinition')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/block-definitions')
export class BlockDefinitionAdminController {
  constructor(
    private readonly blockDefinitionService: BlockDefinitionService,
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [BlockDefinitionDto] })
  async findAll() {
    return this.blockDefinitionService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: BlockDefinitionDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockDefinitionService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: BlockDefinitionDto })
  async create(@Body() dto: CreateBlockDefinitionDto) {
    return this.blockDefinitionService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: BlockDefinitionDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockDefinitionDto,
  ) {
    return this.blockDefinitionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blockDefinitionService.remove(id);
  }
}
