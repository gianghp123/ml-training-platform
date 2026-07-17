import { Module } from '@nestjs/common';
import { MinioProvider } from './minio.provider';
import { StorageService } from './storage.service';

@Module({
  providers: [
    MinioProvider,
    StorageService,
  ],
  exports: [
    StorageService,
  ],
})
export class StorageModule { }
