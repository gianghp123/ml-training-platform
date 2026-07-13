import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { BlockCategoryDto } from "../dtos/block-category.dto";
import { BlockCategoryService } from "../services/block-category.service";

@ApiTags('BlockCategory')
@Controller('block-categories')
export class BlockCategoryController {
  constructor(
    private readonly blockCategoryService: BlockCategoryService,
  ) { }

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
}
