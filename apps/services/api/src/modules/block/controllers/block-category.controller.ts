import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { BlockCategoryDto, PaginatedBlockCategoryResponseDto } from "../dtos/block-category.dto";
import { BlockCategoryService } from "../services/block-category.service";

@ApiTags('BlockCategory')
@Controller('block-categories')
export class BlockCategoryController {
  constructor(
    private readonly blockCategoryService: BlockCategoryService,
  ) { }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PaginatedBlockCategoryResponseDto })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.blockCategoryService.findAll({ page, limit });
  }

  @Get(':id')
  @ZodResponse({ status: HttpStatus.OK, type: BlockCategoryDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockCategoryService.findOne(id);
  }
}
