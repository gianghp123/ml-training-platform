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
import { Public } from "src/modules/auth/decorators/public.decorator";
import { BlockDefinitionDto, PaginatedBlockDefinitionResponseDto } from "../dtos/block-definition.dto";
import { BlockDefinitionService } from "../services/block-definition.service";

@Public()
@ApiTags('BlockDefinition')
@Controller('block-definitions')
export class BlockDefinitionController {
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
}
