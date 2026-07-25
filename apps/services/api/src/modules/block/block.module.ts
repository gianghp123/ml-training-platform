import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlockCategory } from "src/database/entities/block-category.entity";
import { BlockDefinition } from "src/database/entities/block-definition.entity";
import { BlockCategoryController } from "./controllers/block-category.controller";
import { BlockDefinitionController } from "./controllers/block-definition.controller";
import { BlockCategoryService } from "./services/block-category.service";
import { BlockDefinitionService } from "./services/block-definition.service";

@Module({
  imports: [TypeOrmModule.forFeature([BlockCategory, BlockDefinition])],
  providers: [BlockCategoryService, BlockDefinitionService],
  controllers: [
    BlockCategoryController,
    BlockDefinitionController,
  ],
})
export class BlockModule { }
