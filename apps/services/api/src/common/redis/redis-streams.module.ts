import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_STREAM_CLIENT } from './redis.constants';
import { RedisStreamsService } from './redis-streams.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_STREAM_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password:
            configService.get<string | undefined>('redis.password') ||
            undefined,
          db: configService.get<number>('redis.db', 0),
          maxRetriesPerRequest: 3,
        }),
    },
    RedisStreamsService,
  ],
  exports: [RedisStreamsService],
})
export class RedisStreamsModule {}
