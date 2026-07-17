import {
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Client } from 'minio';
import * as os from 'os';
import * as path from 'path';
import {
  MINIO_CLIENT,
} from './minio.provider';

@Injectable()
export class StorageService {
  constructor(
    @Inject(MINIO_CLIENT)
    private readonly client: Client,
    private readonly config:
      ConfigService,
  ) { }

  async ensureBucket() {
    const bucket =
      this.config.getOrThrow<string>(
        'minio.bucket',
      );
    const exists =
      await this.client.bucketExists(
        bucket,
      );

    if (!exists) {
      await this.client.makeBucket(
        bucket,
      );
    }
  }

  async createUploadUrl(
    objectKey: string,
  ) {
    return this.client.presignedPutObject(
      this.config.getOrThrow<string>(
        'minio.bucket',
      ),
      objectKey,
      60 * 60,
    );
  }

  async createDownloadUrl(
    objectName: string,
  ) {
    return this.client.presignedGetObject(
      this.config.getOrThrow<string>(
        'minio.bucket',
      ),
      objectName,
      60 * 60,
    );

  }

  async removeObject(
    objectName: string,
  ) {
    return this.client.removeObject(
      this.config.getOrThrow<string>(
        'minio.bucket',
      ),
      objectName,
    );
  }

  /**
     * Streams an object down to a local temp file and returns its path.
     * Caller is responsible for deleting the file when done (see
     * `withTempFile` below for a safe wrapper).
     */
  async downloadToTempFile(objectName: string): Promise<string> {
    const bucket = this.config.getOrThrow<string>('minio.bucket');
    const ext = path.extname(objectName) || '';
    const tempPath = path.join(os.tmpdir(), `${randomUUID()}${ext}`);

    const objectStream = await this.client.getObject(bucket, objectName);

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath);
      objectStream.pipe(writeStream);
      objectStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });

    return tempPath;
  }

  /**
   * Convenience wrapper: downloads an object to a temp file, runs `fn`
   * against the local path, and guarantees cleanup afterward regardless
   * of success or failure.
   */
  async withTempFile<T>(
    objectName: string,
    fn: (localPath: string) => Promise<T>,
  ): Promise<T> {
    const tempPath = await this.downloadToTempFile(objectName);
    try {
      return await fn(tempPath);
    } finally {
      fs.promises.unlink(tempPath).catch(() => {
        // best-effort cleanup; a leftover temp file is a minor leak,
        // not worth failing the caller's result over
      });
    }
  }
}
