import type { ConfigService } from '@nestjs/config';
import type { Client } from 'minio';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('signs downloads with an attachment content disposition', async () => {
    const presignedGetObject = jest
      .fn()
      .mockResolvedValue('http://minio/download');
    const client = {
      presignedGetObject,
    } as unknown as Client;
    const config = {
      getOrThrow: jest.fn().mockReturnValue('uploads'),
    } as unknown as ConfigService;
    const service = new StorageService(client, config);

    const url = await service.createDownloadUrl(
      'runs/run-1/artifacts/model.joblib',
      'Iris Model.joblib',
    );

    expect(presignedGetObject).toHaveBeenCalledWith(
      'uploads',
      'runs/run-1/artifacts/model.joblib',
      3600,
      {
        'response-content-disposition':
          'attachment; filename="iris-model.joblib"',
      },
    );
    expect(url).toBe('http://minio/download');
  });
});
