import { Module } from '@nestjs/common';
import { MINIO_CLIENT, MinioProvider } from './minio.provider';
import { StorageService } from './storage.service';

@Module({
  providers: [
    MinioProvider,
    StorageService,
  ],
  exports: [
    MINIO_CLIENT,
    StorageService,
  ],
})
export class StorageModule { }
