import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeormConfig from './configs/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingStrategyInterface } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [typeormConfig],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
