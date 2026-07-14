import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZodValidationPipe } from 'nestjs-zod';
import { NamingStrategyInterface } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingZodSerializerInterceptor } from './common/interceptors/logging-zod-serializer';
import typeormConfig from './configs/typeorm.config';
import { ClerkAuthGuard } from './modules/auth/guards/clerk-auth.guard';
import { RolesGuard } from './modules/auth/guards/role.guard';
import { BlockModule } from './modules/block/block.module';
import { DatasetModule } from './modules/dataset/dataset.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { ModelRegistryModule } from './modules/model-registry/model-registry.module';
import { WorkerModule } from './modules/worker/worker.module';
import { WorkflowModule } from './modules/workflow/workflow.module';

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
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingZodSerializerInterceptor,
    },

  ],
})
export class AppModule { }
