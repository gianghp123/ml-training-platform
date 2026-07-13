import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  SerializeOptions,
  UseInterceptors,
} from "@nestjs/common";
import { BlockDefinitionService } from "../../services/block-definition.service";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { BlockDefinitionDTO } from "../../dtos/responses/block-definition.response";
import { CreateBlockDefinitionDto } from "../../dtos/requests/create-block-definition.dto";
import { UpdateBlockDefinitionDto } from "../../dtos/requests/update-block-definition.dto";
import { Roles } from "src/modules/auth/decorators/role.decorator";
import { UserRole } from "src/libs/enums/user-role.enum";

@ApiTags('Admin-BlockDefinition')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/block-definitions')
@UseInterceptors(ClassSerializerInterceptor)
export class BlockDefinitionAdminController {
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

  @Post()
  @SerializeOptions({ type: BlockDefinitionDTO })
  @ApiCreatedResponse({ type: BlockDefinitionDTO })
  async create(@Body() dto: CreateBlockDefinitionDto) {
    return this.blockDefinitionService.create(dto);
  }

  @Patch(':id')
  @SerializeOptions({ type: BlockDefinitionDTO })
  @ApiOkResponse({ type: BlockDefinitionDTO })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockDefinitionDto,
  ) {
    return this.blockDefinitionService.update(id, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blockDefinitionService.remove(id);
  }
}
