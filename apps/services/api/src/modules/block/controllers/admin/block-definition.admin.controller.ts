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
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { UserRole } from "@training-ml/contracts";
import { Roles } from "src/modules/auth/decorators/role.decorator";
import { BlockDefinitionDto, CreateBlockDefinitionDto, UpdateBlockDefinitionDto, PaginatedBlockDefinitionResponseDto } from "../../dtos/block-definition.dto";
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
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedBlockDefinitionResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.blockDefinitionService.findAll({ page, limit });
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
