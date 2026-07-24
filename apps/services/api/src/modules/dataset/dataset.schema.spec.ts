import { UpdateDatasetSchema } from '@training-ml/contracts';

describe('UpdateDatasetSchema', () => {
  it('accepts metadata-only updates', () => {
    expect(
      UpdateDatasetSchema.parse({
        name: 'Renamed dataset',
        description: 'Safe metadata update',
      }),
    ).toEqual({
      name: 'Renamed dataset',
      description: 'Safe metadata update',
    });
  });

  it.each(['format', 'size', 'validationOptions'])(
    'rejects structural field %s',
    (field) => {
      expect(() =>
        UpdateDatasetSchema.parse({
          [field]:
            field === 'format'
              ? 'json'
              : field === 'size'
                ? 1
                : { sampleSize: 10 },
        }),
      ).toThrow();
    },
  );
});
