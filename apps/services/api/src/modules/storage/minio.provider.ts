import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

export const MinioProvider: Provider = {
  provide: MINIO_CLIENT,
  inject: [
    ConfigService,
  ],
  useFactory: (
    configService: ConfigService,
  ) => {
    return new Client({
      endPoint:
        configService.getOrThrow<string>(
          'minio.endpoint',
        ),
      port:
        configService.getOrThrow<number>(
          'minio.port',
        ),
      useSSL:
        configService.getOrThrow<boolean>(
          'minio.useSSL',
        ),
      accessKey:
        configService.getOrThrow<string>(
          'minio.accessKey',
        ),
      secretKey:
        configService.getOrThrow<string>(
          'minio.secretKey',
        ),
    });
  },
};
