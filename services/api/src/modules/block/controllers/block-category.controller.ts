import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  SerializeOptions,
  UseInterceptors,
} from "@nestjs/common";
import { BlockCategoryService } from "../services/block-category.service";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { BlockCategoryDTO } from "../dtos/responses/block-category.request";

@ApiTags('BlockCategory')
@Controller('block-categories')
@UseInterceptors(ClassSerializerInterceptor)
export class BlockCategoryController {
  constructor(
    private readonly blockCategoryService: BlockCategoryService,
  ) {}

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
}
