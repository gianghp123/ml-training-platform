import * as fs from 'fs';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';

export interface JsonArrayScanResult {
  sample: Record<string, unknown>[];
  recordCount: number;
}

export async function scanJsonArray(
  filePath: string,
  arrayPath: string | undefined,
  sampleSize: number,
): Promise<JsonArrayScanResult> {
  return new Promise((resolve, reject) => {
    const sample: Record<string, unknown>[] = [];
    let recordCount = 0;

    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      ...(arrayPath ? [pick({ filter: arrayPath })] : []),
      streamArray(),
    ]);

    pipeline.on('data', ({ value }: { value: Record<string, unknown> }) => {
      recordCount++;
      if (sample.length < sampleSize) sample.push(value);
    });
    pipeline.on('end', () => resolve({ sample, recordCount }));
    pipeline.on('error', reject);
  });
}
