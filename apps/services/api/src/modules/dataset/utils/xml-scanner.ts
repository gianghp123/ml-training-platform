import * as fs from 'fs';
import { SaxesParser } from 'saxes';

export interface XmlScanResult {
  rootElement: string;
  recordElement: string;
  sample: Record<string, unknown>[];
  recordCount: number;
}

export async function scanXml(
  filePath: string,
  recordElementHint: string | undefined,
  sampleSize: number,
): Promise<XmlScanResult> {
  return new Promise((resolve, reject) => {
    const parser = new SaxesParser();
    const sample: Record<string, unknown>[] = [];
    let recordCount = 0;
    let rootElement = '';
    let recordElement = recordElementHint ?? '';
    let depth = 0;
    let currentRecord: Record<string, unknown> | null = null;
    let currentTag = '';
    let currentText = '';
    const tagCountsAtDepth2: Record<string, number> = {};

    parser.on('opentag', (node) => {
      depth++;
      if (depth === 1) rootElement = node.name;

      if (depth === 2) {
        tagCountsAtDepth2[node.name] = (tagCountsAtDepth2[node.name] ?? 0) + 1;
        if (!recordElement && tagCountsAtDepth2[node.name] === 2) {
          recordElement = node.name;
        }
      }
      if (depth === 2 && node.name === recordElement) {
        currentRecord = {};
        recordCount++;
      }
      if (depth === 3 && currentRecord) currentTag = node.name;
      currentText = '';
    });

    parser.on('text', (text) => {
      currentText += text;
    });

    parser.on('closetag', (node) => {
      if (depth === 3 && currentRecord && currentTag) {
        currentRecord[currentTag] = currentText.trim();
      }
      if (depth === 2 && node.name === recordElement && currentRecord) {
        if (sample.length < sampleSize) sample.push(currentRecord);
        currentRecord = null;
      }
      depth--;
    });

    parser.on('end', () => resolve({ rootElement, recordElement, sample, recordCount }));
    parser.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => {
      try {
        parser.write(chunk.toString());
      } catch (err) {
        reject(err);
      }
    });
    stream.on('end', () => parser.close());
    stream.on('error', reject);
  });
}
