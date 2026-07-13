import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { BlockDefinitionDto } from "../dtos/block-definition.dto";
import { BlockDefinitionService } from "../services/block-definition.service";

@ApiTags('BlockDefinition')
@Controller('block-definitions')
export class BlockDefinitionController {
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
}
