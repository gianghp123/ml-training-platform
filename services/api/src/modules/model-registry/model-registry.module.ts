import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModelRegistry } from "src/database/entities/model-registry.entity";
import { ModelRegistryController } from "./controllers/model-registry.controller";
import { ModelRegistryService } from "./services/model-registry.service";

@Module({
  imports: [TypeOrmModule.forFeature([ModelRegistry])],
  providers: [ModelRegistryService],
  controllers: [ModelRegistryController],
})
export class ModelRegistryModule {}
