import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeormConfig from './configs/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingStrategyInterface } from 'typeorm';
import { BlockModule } from './modules/block/block.module';
import { DatasetModule } from './modules/dataset/dataset.module';
import { WorkerModule } from './modules/worker/worker.module';
import { ModelRegistryModule } from './modules/model-registry/model-registry.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './modules/auth/guards/clerk-auth.guard';
import { RolesGuard } from './modules/auth/guards/role.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [typeormConfig],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('typeorm.host'),
        port: configService.get<number>('typeorm.port'),
        username: configService.get<string>('typeorm.username'),
        password: configService.get<string>('typeorm.password'),
        database: configService.get<string>('typeorm.database'),
        entities: configService.get<string[]>('typeorm.entities'),
        migrations: configService.get<string[]>('typeorm.migrations'),
        synchronize: configService.get<boolean>('typeorm.synchronize'),
        logging: configService.get<boolean>('typeorm.logging'),
        namingStrategy: configService.get<NamingStrategyInterface>(
          'typeorm.namingStrategy',
        ),
      }),
    }),
    BlockModule,
    DatasetModule,
    WorkerModule,
    ModelRegistryModule,
    WorkflowModule,
    ExecutionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ],
})
export class AppModule { }
