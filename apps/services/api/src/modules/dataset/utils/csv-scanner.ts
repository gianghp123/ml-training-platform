import * as fs from 'fs';
import * as Papa from 'papaparse';

export interface CsvScanResult {
  delimiter: string;
  hasHeader: boolean;
  sample: Record<string, string>[];
  rowCount: number;
}

function looksLikeHeader(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  const numericFirst = row.some((c) => /^-?\d+(\.\d+)?$/.test((c ?? '').trim()));
  if (numericFirst) return false;
  return new Set(row.map((c) => c.trim().toLowerCase())).size === row.length;
}

export async function scanCsv(
  filePath: string,
  encoding: BufferEncoding,
  sampleSize: number,
  overrideDelimiter?: string,
  overrideHasHeader?: boolean,
): Promise<CsvScanResult> {
  return new Promise((resolve, reject) => {
    const sample: Record<string, string>[] = [];
    let headerRow: string[] = [];
    let hasHeader = overrideHasHeader ?? false;
    let isFirstRow = true;
    let rowCount = 0;
    let delimiter = overrideDelimiter ?? ',';

    const stream = fs.createReadStream(filePath, { encoding });

    Papa.parse(stream as any, {
      skipEmptyLines: true,
      delimiter: overrideDelimiter,
      step: (result: Papa.ParseStepResult<string[]>) => {
        const row = result.data;
        if (!overrideDelimiter) delimiter = result.meta.delimiter || delimiter;

        if (isFirstRow) {
          hasHeader = overrideHasHeader ?? looksLikeHeader(row);
          headerRow = hasHeader ? row : row.map((_, i) => `column_${i}`);
          isFirstRow = false;
          if (hasHeader) return; // header row is not a data row
        }

        rowCount++;
        if (sample.length < sampleSize) {
          sample.push(Object.fromEntries(headerRow.map((h, i) => [h, row[i]])));
        }
      },
      complete: () => resolve({ delimiter, hasHeader, sample, rowCount }),
      error: reject,
    });
  });
}
