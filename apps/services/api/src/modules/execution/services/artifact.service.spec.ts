import type { ArtifactDownloadResponse } from '@training-ml/contracts';
import type { Repository } from 'typeorm';
import { Artifact } from 'src/database/entities/artifact.entity';
import { StorageService } from 'src/modules/storage/storage.service';
import { ArtifactService } from './artifact.service';

describe('ArtifactService', () => {
  it('creates a forced-download URL for the stored artifact', async () => {
    const artifactRepository = {} as Repository<Artifact>;
    const createDownloadUrl = jest
      .fn()
      .mockResolvedValue('http://minio/download');
    const storageService = {
      createDownloadUrl,
    } as unknown as StorageService;
    const service = new ArtifactService(artifactRepository, storageService);
    const artifact = {
      id: '9b19531e-8656-463d-97a7-0bc438c22ca0',
      name: 'model.joblib',
      storageUri: 'runs/run-1/artifacts/model.joblib',
    } as Artifact;
    jest.spyOn(service, 'findOne').mockResolvedValue(artifact);

    const result: ArtifactDownloadResponse = await service.createDownloadUrl(
      artifact.id,
    );

    expect(createDownloadUrl).toHaveBeenCalledWith(
      artifact.storageUri,
      artifact.name,
    );
    expect(result).toEqual({ url: 'http://minio/download' });
  });
});
