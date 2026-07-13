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
import { BlockCategoryService } from "../../services/block-category.service";
import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { BlockCategoryDto, CreateBlockCategoryDto, UpdateBlockCategoryDto } from "../../dtos/block-category.dto";
import { Roles } from "src/modules/auth/decorators/role.decorator";
import { UserRole } from "@training-ml/contracts";

@ApiTags('Admin-BlockCategory')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/block-categories')
export class BlockCategoryAdminController {
  constructor(
    private readonly blockCategoryService: BlockCategoryService,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: [BlockCategoryDto] })
  async findAll() {
    return this.blockCategoryService.findAll();
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: BlockCategoryDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockCategoryService.findOne(id);
  }

  @Post()
  @ZodResponse({ status: HttpStatus.CREATED, type: BlockCategoryDto })
  async create(@Body() dto: CreateBlockCategoryDto) {
    return this.blockCategoryService.create(dto);
  }

  @Patch(':id')
  @ZodResponse({ status: HttpStatus.OK, type: BlockCategoryDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockCategoryDto,
  ) {
    return this.blockCategoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blockCategoryService.remove(id);
  }
}
