import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  SerializeOptions,
  UseInterceptors,
} from "@nestjs/common";
import { BlockDefinitionService } from "../services/block-definition.service";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { BlockDefinitionDTO } from "../dtos/responses/block-definition.response";

@ApiTags('BlockDefinition')
@Controller('block-definitions')
@UseInterceptors(ClassSerializerInterceptor)
export class BlockDefinitionController {
  constructor(
    private readonly blockDefinitionService: BlockDefinitionService,
  ) {}

  @Get()
  @SerializeOptions({ type: BlockDefinitionDTO })
  @ApiOkResponse({ type: BlockDefinitionDTO, isArray: true })
  async findAll() {
    return this.blockDefinitionService.findAll();
  }

  @Get(':id')
  @SerializeOptions({ type: BlockDefinitionDTO })
  @ApiOkResponse({ type: BlockDefinitionDTO })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockDefinitionService.findOne(id);
  }
}
