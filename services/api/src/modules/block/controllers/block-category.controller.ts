import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { BlockCategoryService } from "../services/block-category.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { BlockCategoryDTO } from "../dtos/responses/block-category.request";
import { CreateBlockCategoryDto } from "../dtos/requests/create-block-category.dto";
import { UpdateBlockCategoryDto } from "../dtos/requests/update-block-category.dto";

@ApiBearerAuth()
@Controller('block-categories')
@UseInterceptors(ClassSerializerInterceptor)
export class BlockCategoryController {
  constructor(
    private readonly blockCategoryService: BlockCategoryService
  ) { }

  @Get()
  @SerializeOptions({ type: BlockCategoryDTO })
  @ApiOkResponse({ type: BlockCategoryDTO, isArray: true })
  async findAll() {
    return this.blockCategoryService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: BlockCategoryDTO })
  @ApiOkResponse({ type: BlockCategoryDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockCategoryService.findOne(id);
  }

  @Post()
  @SerializeOptions({ type: BlockCategoryDTO })
  @ApiCreatedResponse({ type: BlockCategoryDTO })
  async create(@Body() dto: CreateBlockCategoryDto) {
    return this.blockCategoryService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: BlockCategoryDTO })
  @ApiOkResponse({ type: BlockCategoryDTO })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlockCategoryDto) {
    return this.blockCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blockCategoryService.remove(id);
  }
}
